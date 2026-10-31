import { describe, expect, it } from 'vitest';
import { SUSPECTS } from './data';
import { allowance, applyTrial, createTrial, endingFor, goalResults, pickBlocked, sentenceBlocked, type TrialState } from './engine';

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

  it('makes a player prosecutor sentence everyone, with exactly one guilty for the NPC judge', () => {
    let s = run(createTrial('prosecutor', 5), 10);
    expect(s.phase).toBe('sentence');
    expect(sentenceBlocked(s)).not.toBeNull();
    for (const x of SUSPECTS) s = applyTrial(s, { type: 'sentence', suspect: x, plea: 'innocent' });
    expect(applyTrial(s, { type: 'advance' })).toBe(s);
    s = applyTrial(s, { type: 'sentence', suspect: 'kim', plea: 'guilty' });
    s = applyTrial(s, { type: 'sentence', suspect: 'yun', plea: 'guilty' });
    expect(sentenceBlocked(s)).not.toBeNull();
    s = applyTrial(s, { type: 'sentence', suspect: 'yun', plea: 'innocent' });
    expect(sentenceBlocked(s)).toBeNull();
    s = applyTrial(s, { type: 'advance' });
    expect(s.phase).toBe('verdict');
    s = applyTrial(s, { type: 'advance' });
    expect(s.phase).toBe('ending');
    expect(SUSPECTS).toContain(s.verdict);
  });
});

describe('personal goals', () => {
  it('judges what the game can see and leaves dialogue-only goals open', () => {
    let s = run(createTrial('yun', 4), 12);
    expect(s.phase).toBe('ending');
    const g = goalResults(s);
    expect(g).toHaveLength(2);
    expect(g[0].done).toBe(s.verdict !== 'yun');
    expect(g[1].done).toBe(!s.strong.includes('yun'));
    expect(goalResults(s, 'prosecutor').map((x) => x.done)).toEqual([null, null]);
    expect(goalResults(s, 'judge')[1].done).toBe(s.ending !== 'E2');
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
    // 폭탄은 김익상이 윤치형을 공격할 때, 대학일기는 하세다가 윤치형을 지목할 때, 연락쪽지는 마자르의 무죄 증거에서 나온다
    const draws = (role: 'kim' | 'judge' | 'mazar' | 'prosecutor', kind: 'innocence' | 'attack', about: 'yun' | 'mazar', n: number) => {
      const out = new Set<string | undefined>();
      for (let seed = 1; seed <= n; seed++) {
        const s = applyTrial(createTrial(role, seed), { type: 'pick', role, kind, about });
        out.add(s.cards[s.hands[role][0]].key);
      }
      return out;
    };
    expect(draws('kim', 'attack', 'yun', 60)).toContain('bomb');
    expect(draws('judge', 'attack', 'yun', 60)).toContain('diary');
    expect(draws('mazar', 'innocence', 'mazar', 60)).toContain('note');
    const prosecutor = draws('prosecutor', 'attack', 'yun', 60);
    expect(prosecutor.has('bomb') || prosecutor.has('diary')).toBe(false);
    expect(draws('kim', 'attack', 'yun', 60)).not.toContain('diary');
  });
});
