// 게임 상태 → 음악 상태·환경음 믹스·이벤트 판정 (순수 함수, 테스트 대상)
import type { GameState, SeatId } from '../engine/types';

/** 기획서 7-2의 MusicState. 균열(SUSPENSE)은 별도 곡 없이 긴장도로 표현한다. */
export type Scene = 'menu' | 'explore' | 'investigate' | 'interrogate' | 'accusation' | 'silence' | 'ending';

export interface SceneMix {
  scene: Scene;
  rain: number;
  clock: number;
  /** 0~100. 레이어 강도의 기준값 (이벤트 스파이크 후 이 값으로 돌아온다) */
  tension: number;
}

export interface UiContext {
  /** 싱글 심문실이 열려 있는가 */
  interrogating: boolean;
  /** 이번 라운드에 증거·서류를 열람했는가 (탐색 → 조사 음악 전환) */
  examined: boolean;
}

export const MENU_MIX: SceneMix = { scene: 'menu', rain: 0.55, clock: 0, tension: 10 };

export function sceneFor(state: GameState, ui: UiContext): SceneMix {
  switch (state.phase) {
    case 'lobby':
      return MENU_MIX;
    case 'prologue':
      return { scene: 'explore', rain: 0.5, clock: 0.08, tension: 15 };
    case 'investigate':
      return { scene: ui.examined ? 'investigate' : 'explore', rain: 0.5, clock: 0.12, tension: 25 };
    case 'discuss':
      return ui.interrogating
        ? { scene: 'interrogate', rain: 0.3, clock: 0.55, tension: 50 }
        : { scene: 'investigate', rain: 0.45, clock: 0.18, tension: 35 };
    case 'final':
      return ui.interrogating
        ? { scene: 'interrogate', rain: 0.25, clock: 0.55, tension: 60 }
        : { scene: 'accusation', rain: 0.25, clock: 0.35, tension: 70 };
    case 'ending':
      return { scene: 'ending', rain: 0.35, clock: 0, tension: 20 };
  }
}

export type AudioEvent =
  | { kind: 'clue' }           // 새 단서 획득·돋보기 단서 발견 → 진실 발견 스팅
  | { kind: 'paper' }          // 카드 공개·보고서 제출 → 종이
  | { kind: 'break'; level: number } // 용의자 방어선 붕괴 → 금속 공명 + 균열
  | { kind: 'contradiction' }  // 타임라인 모순 발견 → 금속 공명 + 균열
  | { kind: 'confession' }     // 진범 자백 → 진실 발견 + 금속
  | { kind: 'present' };       // 온라인 증거 제시 → 금속(약하게)

/** 이전 상태와 비교해 소리를 낼 사건을 뽑는다 */
export function diffEvents(prev: GameState | null, next: GameState, you: SeatId | null): AudioEvent[] {
  if (!prev || prev === next) return [];
  const out: AudioEvent[] = [];
  let drew = false;
  let revealed = 0;
  for (const [id, cs] of Object.entries(next.cards)) {
    const before = prev.cards[id];
    if (!before) continue;
    if (you && cs.owner === you && before.owner !== you) drew = true;
    if (you && cs.inspectedBy.includes(you) && !before.inspectedBy.includes(you)) drew = true;
    if (cs.public && !before.public) revealed++;
  }
  if (drew) out.push({ kind: 'clue' });
  for (const [char, mind] of Object.entries(next.npc)) {
    const was = prev.npc[char as keyof typeof prev.npc];
    if (mind && was && mind.state > was.state) out.push({ kind: 'break', level: mind.state });
  }
  const okBefore = prev.contradictions.filter((c) => c.ok).length;
  if (next.contradictions.filter((c) => c.ok).length > okBefore) out.push({ kind: 'contradiction' });
  if (next.solved && !prev.solved) out.push({ kind: 'confession' });
  if (next.spotlight && next.spotlight.at !== prev.spotlight?.at) out.push({ kind: 'present' });
  const submitted = you && next.seats.find((s) => s.id === you)?.submitted && !prev.seats.find((s) => s.id === you)?.submitted;
  if ((revealed > 0 && !out.some((e) => e.kind === 'break' || e.kind === 'confession')) || submitted) out.push({ kind: 'paper' });
  return out;
}

/** 이벤트가 끌어올리는 긴장도 (기획서 7-3: 모순 75, 결정적 증거 85) */
export function tensionSpike(e: AudioEvent): number | null {
  switch (e.kind) {
    case 'clue': return 45;
    case 'break': return e.level >= 2 ? 80 : 65;
    case 'contradiction': return 75;
    case 'confession': return 90;
    default: return null;
  }
}
