import { describe, expect, it } from 'vitest';
import { channelOf, partnersLine, withParticle } from './Court';

describe('secret talk partners', () => {
  it('pairs the judge and prosecutor, and the three defendants', () => {
    expect(channelOf('judge').members).toEqual(['prosecutor', 'judge']);
    expect(channelOf('yun').members).toEqual(['mazar', 'yun', 'kim']);
  });

  it('names who you are talking with, with the right particle', () => {
    expect(partnersLine('judge')).toBe('하네즈가와 요시와');
    expect(partnersLine('prosecutor')).toBe('오미하라 하세다와');
    expect(partnersLine('yun')).toBe('초머 마자르 · 김익상과');
    expect(withParticle('윤치형')).toBe('윤치형과');
  });
});
