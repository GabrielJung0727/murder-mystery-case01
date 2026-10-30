import { expect, it } from 'vitest';
import { mergeProgress } from './progress';

it('merges seen cards and endings without duplicates', () => {
  const a = mergeProgress({ cards: [], endings: [] }, ['14', '04'], null);
  expect(a).toEqual({ cards: ['04', '14'], endings: [] });
  const b = mergeProgress(a, ['04', '31'], 'C');
  expect(b).toEqual({ cards: ['04', '14', '31'], endings: ['C'] });
  expect(mergeProgress(b, ['14'], 'C')).toBe(b);
  expect(mergeProgress(b, [], 'A').endings).toEqual(['A', 'C']);
});
