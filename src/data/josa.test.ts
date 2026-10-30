import { expect, it } from 'vitest';
import { josa } from './josa';

it('picks particles by final consonant', () => {
  expect(josa('이선빈', '이/가')).toBe('이선빈이');
  expect(josa('정재구', '이/가')).toBe('정재구가');
  expect(josa('쪽방', '을/를')).toBe('쪽방을');
  expect(josa('1층 거실 충전 선반', '을/를')).toBe('1층 거실 충전 선반을');
  expect(josa('현관 옆', '을/를')).toBe('현관 옆을');
  expect(josa('34', '은/는')).toBe('34는');
  expect(josa('31', '은/는')).toBe('31은');
});
