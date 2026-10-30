import { describe, expect, it } from 'vitest';
import { SUSPECTS } from './data';
import { allowance, applyTrial, createTrial, endingFor, found, pickBlocked, type TrialState } from './engine';

const run = (s: TrialState, n: number) => {
  for (let i = 0; i < n; i++) s = applyTrial(s, { type: 'advance' });
  return s;
};

describe('round allowances', () => {
  it('gives suspects 3 picks, prosecutor 2, judge 1, and +1 innocence after a strong designation', () => {
    expect(allowance('kim', null)).toEqual({ picks: 3, bonus: 0 });
    expect(allowance('kim', 'kim')).toEqual({ picks: 3, bonus: 1 });
    expect(allowance('yun', 'kim')).toEqual({ picks: 3, bonus: 0 });
    expect(allowance('prosecutor', 'kim')).toEqual({ picks: 2, bonus: 0 });
    expect(allowance('judge', null)).toEqual({ picks: 1, bonus: 0 });
  });

  it('keeps suspects to their own innocence and court roles to one target per round', () => {
    const s = createTrial('prosecutor', 1);
    expect(pickBlocked(s, 'kim', 'innocence', 'yun')).not.toBeNull();
    expect(pickBlocked(s, 'kim', 'attack', 'kim')).not.toBeNull();
    expect(pickBlocked(s, 'prosecutor', 'innocence', 'kim')).not.toBeNull();
    const a = applyTrial(s, { type: 'pick', role: 'prosecutor', kind: 'attack', about: 'kim' });
    expect(pickBlocked(a, 'prosecutor', 'attack', 'yun')).not.toBeNull();
    const b = applyTrial(a, { type: 'pick', role: 'prosecutor', kind: 'attack', about: 'kim' });
    expect(b.hands.prosecutor).toHaveLength(2);
    expect(applyTrial(b, { type: 'pick', role: 'prosecutor', kind: 'attack', about: 'kim' })).toBe(b);
  });
});

describe('trial flow', () => {
  it('runs 3 rounds of evidence → secret → trial, then final Q&A, sentence, verdict', () => {
    let s = createTrial('judge', 7);
    const seen: string[] = [];
    for (let i = 0; i < 11; i++) {
      seen.push(`${s.phase}${s.round}`);
      s = applyTrial(s, { type: 'advance' });
    }
    expect(seen).toEqual(['evidence1', 'secret1', 'trial1', 'evidence2', 'secret2', 'trial2', 'evidence3', 'secret3', 'trial3', 'final-qa3', 'sentence3']);
    expect(s.phase).toBe('verdict');
    // NPC 피고인·검사가 모든 선택을 썼다
    for (const x of SUSPECTS) expect(s.hands[x].length).toBeGreaterThanOrEqual(9);
    expect(s.hands.prosecutor).toHaveLength(6);
    // 판사가 플레이어면 직접 판결해야 넘어간다
    expect(applyTrial(s, { type: 'advance' })).toBe(s);
    s = applyTrial(s, { type: 'verdict', suspect: 'yun' });
    expect(s.phase).toBe('ending');
    expect(s.verdict).toBe('yun');
    expect(['E3', 'E4']).toContain(s.ending);
  });

  it('gives the strong suspect an extra innocence pick next round', () => {
    let s = run(createTrial('prosecutor', 3), 2);
    expect(s.phase).toBe('trial');
    s = applyTrial(s, { type: 'designate', suspect: 'mazar' });
    expect(applyTrial(s, { type: 'designate', suspect: 'kim' })).toBe(s);
    s = applyTrial(s, { type: 'advance' });
    expect(s.round).toBe(2);
    expect(s.bonus.mazar).toBe(1);
    expect(s.bonus.kim).toBe(0);
  });

  it('lets an NPC judge find exactly one suspect guilty', () => {
    const s = run(createTrial('kim', 11), 12);
    expect(s.phase).toBe('ending');
    expect(SUSPECTS).toContain(s.verdict);
    expect(s.ending).not.toBeNull();
  });

  it('makes a player prosecutor sentence everyone before the verdict', () => {
    let s = run(createTrial('prosecutor', 5), 10);
    expect(s.phase).toBe('sentence');
    expect(applyTrial(s, { type: 'advance' })).toBe(s);
    for (const x of SUSPECTS) s = applyTrial(s, { type: 'sentence', suspect: x, plea: 'innocent' });
    s = applyTrial(s, { type: 'advance' });
    expect(s.phase).toBe('verdict');
    // 모두 무죄를 구형해도 NPC 판사는 반드시 한 사람을 유죄로 판결한다
    s = applyTrial(s, { type: 'advance' });
    expect(s.phase).toBe('ending');
    expect(SUSPECTS).toContain(s.verdict);
  });
});

describe('ending matrix', () => {
  const none = { bomb: false, diary: false, note: false };
  it('follows the ending book', () => {
    expect(endingFor('kim', none)).toBe('E1');
    expect(endingFor('kim', { ...none, bomb: true })).toBe('E2');
    expect(endingFor('yun', none)).toBe('E3');
    expect(endingFor('yun', { ...none, diary: true })).toBe('E4');
    expect(endingFor('mazar', none)).toBe('E5');
    expect(endingFor('mazar', { ...none, note: true })).toBe('E6');
  });

  it('counts a key item only in its finder’s hands', () => {
    let s = createTrial('kim', 2);
    s = applyTrial(s, { type: 'pick', role: 'kim', kind: 'innocence', about: 'kim' });
    expect(found(s, 'bomb')).toBe(true);
    let j = createTrial('judge', 2);
    j = applyTrial(j, { type: 'pick', role: 'judge', kind: 'attack', about: 'yun' });
    expect(found(j, 'diary')).toBe(true);
    let p = createTrial('prosecutor', 2);
    p = applyTrial(p, { type: 'pick', role: 'prosecutor', kind: 'attack', about: 'yun' });
    expect(p.cards[p.hands.prosecutor[0]].key).toBeUndefined();
  });
});
