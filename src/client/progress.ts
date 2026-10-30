// 갤러리 & 다시보기 진행도: 한 번이라도 본 증거 카드와 도달한 엔딩, 도전 과제와 사건별 최고 랭크. PC에 저장된다.
import { ACHIEVEMENTS, type GameSummary } from '../data/achievements';
import type { EndingId } from '../data/story';
import type { VariantId } from '../data/variants';
import type { Rank, SeatId } from '../engine/types';

export interface Progress {
  cards: string[];
  endings: EndingId[];
  /** 도전 과제 id → 달성 시각 (epoch ms) */
  achievements: Record<string, number>;
  /** 진범을 맞힌 사건 기록 */
  solvedCases: VariantId[];
  /** 엔딩까지 본 싱글 시점 */
  clearedViews: SeatId[];
  /** 사건 기록별 최고 랭크 */
  best: Partial<Record<VariantId, Rank>>;
}

const KEY = 'gongjakso.progress';
const EMPTY: Progress = { cards: [], endings: [], achievements: {}, solvedCases: [], clearedViews: [], best: {} };
const RANK_ORDER: Rank[] = ['D', 'C', 'B', 'A', 'S'];

const addSorted = <T extends string>(list: T[], item: T | null | undefined): T[] =>
  item && !list.includes(item) ? [...list, item].sort() : list;

/** 순수 병합: 새로 본 카드·엔딩을 정렬된 집합으로 합친다. 변화가 없으면 같은 객체를 돌려준다 */
export function mergeProgress(prev: Progress, cards: string[], ending?: EndingId | null): Progress {
  const newCards = cards.filter((c) => !prev.cards.includes(c));
  const newEnding = ending && !prev.endings.includes(ending) ? [ending] : [];
  if (newCards.length === 0 && newEnding.length === 0) return prev;
  return {
    ...prev,
    cards: [...prev.cards, ...newCards].sort(),
    endings: [...prev.endings, ...newEnding].sort() as EndingId[],
  };
}

/** 순수 함수: 끝난 한 판을 기록에 반영하고 새로 달성한 도전 과제를 돌려준다 */
export function applyGame(prev: Progress, g: GameSummary, now: number): { next: Progress; unlocked: string[] } {
  const base: Progress = {
    ...prev,
    endings: addSorted(prev.endings, g.ending),
    solvedCases: g.named ? addSorted(prev.solvedCases, g.variant) : prev.solvedCases,
    clearedViews: g.mode === 'single' ? addSorted(prev.clearedViews, g.you) : prev.clearedViews,
    best: RANK_ORDER.indexOf(g.rank) > RANK_ORDER.indexOf(prev.best[g.variant] ?? 'D') || !prev.best[g.variant]
      ? { ...prev.best, [g.variant]: g.rank } : prev.best,
  };
  const unlocked = ACHIEVEMENTS.filter((a) => !base.achievements[a.id] && a.check(g, base)).map((a) => a.id);
  const achievements = { ...base.achievements };
  for (const id of unlocked) achievements[id] = now;
  return { next: { ...base, achievements }, unlocked };
}

function load(): Progress {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Progress> | null;
    return { ...EMPTY, ...raw, cards: raw?.cards ?? [], endings: raw?.endings ?? [] };
  } catch {
    return EMPTY;
  }
}

let current: Progress = load();
const listeners = new Set<() => void>();
/** 같은 판의 결과를 두 번 반영하지 않도록 (React StrictMode 의 이중 실행 포함) */
let lastGame: { key: string; unlocked: string[] } | null = null;

function save(next: Progress): void {
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* 저장 불가 시 이번 실행에만 유지 */
  }
  for (const fn of listeners) fn();
}

export const progress = {
  get: (): Progress => current,
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  record(cards: string[], ending?: EndingId | null): void {
    const next = mergeProgress(current, cards, ending);
    if (next !== current) save(next);
  },
  /** 엔딩 화면에서 한 번 부른다. 같은 key 로 다시 부르면 처음 결과를 그대로 돌려준다 */
  finishGame(summary: GameSummary, key: string): string[] {
    if (lastGame?.key === key) return lastGame.unlocked;
    const { next, unlocked } = applyGame(current, summary, Date.now());
    save(next);
    lastGame = { key, unlocked };
    return unlocked;
  },
};
