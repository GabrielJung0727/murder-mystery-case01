import { expect, it } from 'vitest';
import { mergeProgress } from './progress';

it('merges seen cards and endings without duplicates', () => {
  const a = mergeProgress({ cards: [], endings: [], achievements: {}, solvedCases: [], clearedViews: [], best: {} }, ['14', '04'], null);
  expect(a).toMatchObject({ cards: ['04', '14'], endings: [] });
  const b = mergeProgress(a, ['04', '31'], 'C');
  expect(b).toMatchObject({ cards: ['04', '14', '31'], endings: ['C'] });
  expect(mergeProgress(b, ['14'], 'C')).toBe(b);
  expect(mergeProgress(b, [], 'A').endings).toEqual(['A', 'C']);
});

it('records a finished game and unlocks achievements once', async () => {
  const { applyGame } = await import('./progress');
  const empty = { cards: [], endings: [], achievements: {}, solvedCases: [], clearedViews: [], best: {} };
  const game = {
    variant: 'v1' as const, mode: 'single' as const, hard: true, you: 'detective' as const, ending: 'A' as const,
    isCulprit: false, named: true, escaped: false, solved: true, rank: 'S' as const, reportPoints: 5,
    goalsDone: 3, goalsTotal: 3, misses: 0, publicCards: 20, inspected: 1, contradictions: 0,
  };
  const first = applyGame(empty, game, 100);
  expect(first.unlocked).toEqual(expect.arrayContaining(['first_night', 'truth', 'case_b', 'hard', 'rank_s', 'perfect', 'goals', 'confession', 'flawless']));
  expect(first.unlocked).not.toContain('case_a');
  expect(first.next.best.v1).toBe('S');
  expect(first.next.clearedViews).toEqual(['detective']);
  const again = applyGame(first.next, { ...game, rank: 'B' }, 200);
  expect(again.unlocked).toEqual([]);
  expect(again.next.best.v1).toBe('S'); // 최고 기록 유지
});
