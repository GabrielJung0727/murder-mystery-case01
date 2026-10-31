import { describe, expect, it } from 'vitest';
import { ROLES, SUSPECTS } from './data';
import { applyTrial, createTrial, type TrialState } from './engine';
import { ACHIEVEMENTS, applyTrialRecord, type Records } from './records';

const EMPTY: Records = { endings: [], roles: [], achievements: {} };
const advance = (s: TrialState) => applyTrial(s, { type: 'advance' });
/** 플레이어가 판사가 아니면 법봉만 두드려 엔딩까지 간다 */
function playThrough(s: TrialState, each?: (s: TrialState) => TrialState): TrialState {
  for (let i = 0; i < 20 && s.phase !== 'ending'; i++) {
    if (each) s = each(s);
    s = advance(s);
  }
  return s;
}

describe('EP.02 achievements', () => {
  it('have unique ids', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });

  it('unlock the first trial once and remember the ending and role', () => {
    const s = playThrough(createTrial('kim', 1));
    const { next, unlocked } = applyTrialRecord(EMPTY, s, 1000);
    expect(unlocked).toContain('first_trial');
    expect(next.endings).toEqual([s.ending]);
    expect(next.roles).toEqual(['kim']);
    expect(applyTrialRecord(next, s, 2000).unlocked).not.toContain('first_trial');
  });

  it('need all six endings and all five roles across games', () => {
    const r: Records = { endings: ['E1', 'E2', 'E3', 'E4', 'E5'], roles: ['judge', 'kim', 'mazar', 'yun'], achievements: { first_trial: 1 } };
    const s = { ...playThrough(createTrial('prosecutor', 2)), ending: 'E6' as const };
    const { unlocked } = applyTrialRecord(r, s, 1);
    expect(unlocked).toEqual(expect.arrayContaining(['all_endings', 'all_roles', 'e6']));
    expect(ROLES.length).toBe(5);
  });

  it('reward silence in all three rounds only when acquitted', () => {
    for (let seed = 1; seed < 30; seed++) {
      const s = playThrough(createTrial('mazar', seed), (x) => (x.phase === 'trial' ? applyTrial(x, { type: 'silence', suspect: 'mazar' }) : x));
      expect(s.silent.mazar).toEqual([1, 2, 3]);
      expect(applyTrialRecord(EMPTY, s, 1).unlocked.includes('silence')).toBe(s.verdict !== 'mazar');
    }
  });

  it('call a sentence fair when the judge convicts the same person', () => {
    let s = createTrial('prosecutor', 7);
    while (s.phase !== 'sentence') s = advance(s);
    for (const x of SUSPECTS) s = applyTrial(s, { type: 'sentence', suspect: x, plea: x === 'yun' ? 'guilty' : 'innocent' });
    s = advance(advance(s));
    expect(applyTrialRecord(EMPTY, s, 1).unlocked.includes('fair')).toBe(s.verdict === 'yun');
  });
});
