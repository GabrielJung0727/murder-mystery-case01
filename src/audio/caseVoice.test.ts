import { expect, it } from 'vitest';
import { afterwordVoices, endingVoice, truthVoices } from './caseVoice';

it('plays each case record its own ending and truth narration', () => {
  expect(endingVoice('v0', 'A')).toBe('NAR-E-A');
  for (const v of ['v1', 'v2'] as const) {
    for (const e of ['A', 'B', 'C'] as const) expect(endingVoice(v, e)).toBe(`NAR-E-${e}-${v}`);
    expect(endingVoice(v, 'D')).toBe('NAR-E-D'); // 공통 문구는 원작 녹음
    expect(truthVoices(v)).toEqual([`NAR-T-${v}`]); // 후일담(T2)은 아직 녹음 없음
    expect(afterwordVoices(v)).toEqual([]);
  }
  expect(truthVoices('v0')).toEqual(['NAR-T01', 'NAR-T02']);
});
