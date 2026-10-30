// 대사 타자기: 인물 대사를 한 글자씩 보여 주며 캐릭터 블립을 울린다.
// 심문실 말풍선과 사건 기록이 같은 진행도를 읽으므로 한 대사는 한 번만 타이핑된다.
import { display } from '../client/display';
import type { CharId } from '../data/types';
import { BLIP_PROFILES } from './blipProfiles';
import { audio } from './director';

export interface DialogueItem {
  id: number;
  char: CharId;
  text: string;
  /** 방어선이 무너진 뒤의 말투 (빨라지거나 떨림) */
  shaken: boolean;
  /** 나레이션이 끝난 뒤에 시작 (라운드 오프닝 대사) */
  afterVoice: boolean;
}

export interface Step {
  /** 다음 글자 위치 */
  pos: number;
  /** 이번 글자에서 블립을 낼지 */
  blip: boolean;
  /** 다음 글자까지 기다릴 시간 (ms) */
  delay: number;
  /** 문장 끝 직전인지 (음높이를 내릴 때 사용) */
  sentenceEnd: boolean;
}

const SPEAKABLE = /[가-힣A-Za-z0-9]/;

/**
 * 순수 함수: pos 위치의 글자를 하나 보여 준 다음 상태.
 * 괄호 속 지문은 한 번에 건너뛰고(블립 없음), 문장 부호에서 쉰다.
 */
export function step(text: string, pos: number, cps: number, every: number, count: number): Step {
  const base = 1000 / cps;
  if (text[pos] === '(') {
    const close = text.indexOf(')', pos);
    const end = close < 0 ? text.length : close + 1;
    return { pos: end, blip: false, delay: base * 4, sentenceEnd: false };
  }
  const ch = text[pos];
  const next = pos + 1;
  if (ch === '.' && text.slice(pos, pos + 3) === '...') return { pos: pos + 3, blip: false, delay: base * 9, sentenceEnd: false };
  if (ch === '…') return { pos: next, blip: false, delay: base * 9, sentenceEnd: false };
  if ('.!?'.includes(ch)) return { pos: next, blip: false, delay: base * 6, sentenceEnd: false };
  if (',~'.includes(ch)) return { pos: next, blip: false, delay: base * 3, sentenceEnd: false };
  if (!SPEAKABLE.test(ch)) return { pos: next, blip: false, delay: ch === ' ' ? base * 0.6 : base, sentenceEnd: false };
  const sentenceEnd = next >= text.length || '.!?…'.includes(text[next]);
  return { pos: next, blip: count % every === 0, delay: base, sentenceEnd };
}

/** 대사 속도 설정 (display.textSpeed: 0이면 즉시 표시) */
function speedFactor(): number {
  return display.get().textSpeed;
}

class DialogueTyper {
  private queue: DialogueItem[] = [];
  private current: DialogueItem | null = null;
  private pos = 0;
  private count = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private progress = new Map<number, number>();
  private pending = new Set<number>();
  private idleWaiters: (() => void)[] = [];
  private listeners = new Set<() => void>();
  private ver = 0;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  version = (): number => this.ver;

  private emit(): void {
    this.ver++;
    for (const fn of this.listeners) fn();
  }

  /** 지금 보여 줄 부분. 대기 중인 대사는 빈 문자열, 기록에 없던 대사는 전체 */
  visible(id: number, text: string): string {
    if (this.pending.has(id)) return '';
    const p = this.progress.get(id);
    return p === undefined ? text : text.slice(0, p);
  }

  isTyping(id: number): boolean {
    return this.current?.id === id || this.pending.has(id);
  }

  enqueue(item: DialogueItem): void {
    this.pending.add(item.id);
    if (item.afterVoice) {
      this.queue.push(item);
    } else {
      // 플레이어가 일으킨 반응: 읽던 대사와 아직 기다리던 오프닝 대사는 바로 전부 보여 주고,
      // 토론 나레이션을 끊은 뒤 반응부터 타이핑한다
      this.finishCurrent();
      for (const q of this.queue) {
        this.progress.set(q.id, q.text.length);
        this.pending.delete(q.id);
      }
      this.queue = [item];
      audio.stopNarration('NAR-D');
    }
    if (!this.current) this.next();
    this.emit();
  }

  /** 클릭으로 끝까지 보여 주기 */
  skip(id: number): void {
    if (this.current?.id === id) {
      this.finishCurrent();
      this.next();
    }
  }

  /** 대기열이 모두 끝나면 실행 (자백 뒤 나레이션 등) */
  whenIdle(): Promise<void> {
    if (!this.current && this.queue.length === 0) return Promise.resolve();
    return new Promise((resolve) => this.idleWaiters.push(resolve));
  }

  /** 화면을 떠날 때: 남은 대사는 모두 전체 표시 */
  reset(): void {
    clearTimeout(this.timer);
    for (const item of this.queue) this.progress.set(item.id, item.text.length);
    if (this.current) this.progress.set(this.current.id, this.current.text.length);
    this.queue = [];
    this.current = null;
    this.pending.clear();
    this.flushIdle();
    this.emit();
  }

  private finishCurrent(): void {
    if (!this.current) return;
    clearTimeout(this.timer);
    this.progress.set(this.current.id, this.current.text.length);
    this.current = null;
  }

  private flushIdle(): void {
    const waiters = this.idleWaiters;
    this.idleWaiters = [];
    for (const w of waiters) w();
  }

  private next(): void {
    clearTimeout(this.timer);
    const item = this.queue.shift();
    if (!item) {
      this.current = null;
      this.flushIdle();
      this.emit();
      return;
    }
    if (item.afterVoice && audio.getNowPlaying().voice) {
      // 나레이션이 끝날 때까지 기다린다
      this.queue.unshift(item);
      this.current = null;
      this.timer = setTimeout(() => this.next(), 300);
      return;
    }
    this.pending.delete(item.id);
    this.current = item;
    this.pos = 0;
    this.count = 0;
    this.progress.set(item.id, 0);
    if (speedFactor() === 0) {
      this.finishCurrent();
      this.emit();
      this.timer = setTimeout(() => this.next(), 400);
      return;
    }
    this.tick();
  }

  private tick(): void {
    const item = this.current;
    if (!item) return;
    if (this.pos >= item.text.length) {
      this.current = null;
      this.emit();
      this.timer = setTimeout(() => this.next(), 500);
      return;
    }
    const p = BLIP_PROFILES[item.char];
    const cps = (item.shaken ? p.shaken.cps : p.cps) * speedFactor();
    const s = step(item.text, this.pos, cps, p.every, this.count);
    if (s.blip) {
      const variance = item.shaken ? p.shaken.variance : p.variance;
      const semis = (Math.random() * 2 - 1) * variance - (p.drop && s.sentenceEnd ? 3 : 0);
      audio.blip(item.char, semis, item.shaken && p.shaken.tremble);
    }
    if (s.blip || SPEAKABLE.test(item.text[this.pos] ?? '')) this.count++;
    this.pos = s.pos;
    this.progress.set(item.id, this.pos);
    this.emit();
    this.timer = setTimeout(() => this.tick(), s.delay);
  }
}

export const dialogue = new DialogueTyper();
