// 갤러리 & 다시보기 진행도: 한 번이라도 본 증거 카드와 도달한 엔딩. PC에 저장된다.
import type { EndingId } from '../data/story';

export interface Progress {
  cards: string[];
  endings: EndingId[];
}

const KEY = 'gongjakso.progress';
const EMPTY: Progress = { cards: [], endings: [] };

/** 순수 병합: 새로 본 카드·엔딩을 정렬된 집합으로 합친다. 변화가 없으면 같은 객체를 돌려준다 */
export function mergeProgress(prev: Progress, cards: string[], ending?: EndingId | null): Progress {
  const newCards = cards.filter((c) => !prev.cards.includes(c));
  const newEnding = ending && !prev.endings.includes(ending) ? [ending] : [];
  if (newCards.length === 0 && newEnding.length === 0) return prev;
  return {
    cards: [...prev.cards, ...newCards].sort(),
    endings: [...prev.endings, ...newEnding].sort() as EndingId[],
  };
}

let current: Progress = (() => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Progress> | null;
    return { cards: raw?.cards ?? [], endings: raw?.endings ?? [] };
  } catch {
    return EMPTY;
  }
})();
const listeners = new Set<() => void>();

export const progress = {
  get: (): Progress => current,
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  record(cards: string[], ending?: EndingId | null): void {
    const next = mergeProgress(current, cards, ending);
    if (next === current) return;
    current = next;
    try {
      localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
      /* 저장 불가 시 이번 실행에만 유지 */
    }
    for (const fn of listeners) fn();
  },
};
