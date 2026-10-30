import { describe, expect, it } from 'vitest';
import { CARDS, CARD_BY_ID } from '../data/cards';
import { getCase } from '../data/caseData';
import { MOTIVE_OPTIONS } from '../data/story';
import type { CardId, CharId } from '../data/types';
import { VARIANTS, VARIANT_IDS, type VariantId } from '../data/variants';
import { applyAction, canSee, claimSeat, createOnlineGame, createSingleGame, HARD_PRESENTS, pickVariant, setOptions } from './engine';
import { rankOf } from './scoring';
import type { GameState, SeatId } from './types';

function single(player: SeatId, seed: number, variant: VariantId, difficulty: 'normal' | 'hard' = 'normal'): GameState {
  const s = createSingleGame(player, seed, { variantMode: 'original', difficulty });
  return { ...s, variant };
}

function reveal(state: GameState, ...cards: CardId[]): GameState {
  const s = structuredClone(state);
  for (const c of cards) s.cards[c].public = true;
  return s;
}

/** 성실한 플레이어: 가진 카드로 가능한 모든 단독·묶음 제시를 반복한다 */
function playThrough(player: SeatId, seed: number, variant: VariantId): GameState {
  const data = getCase(variant);
  const combos = [...new Set(Object.values(data.scripts).flatMap((sc) => sc.reactions).filter((r) => r.cards.length > 1).map((r) => r.cards.join(',')))]
    .map((k) => k.split(','));
  const priority = [...data.voteChain, '23', '13', '07', '26', '04', '17', '18', '25', '27', '10', '12', '03', '09', '28', '14', '31', '34'];
  const rank = (id: string) => (priority.includes(id) ? priority.indexOf(id) : 99);
  let s = single(player, seed, variant);
  s = applyAction(s, { type: 'advance' });
  for (let round = 1; round <= 3; round++) {
    const pool = CARDS.filter((c) => c.round === round).map((c) => c.id).sort((a, b) => rank(a) - rank(b));
    for (const c of pool.slice(0, 2)) s = applyAction(s, { type: 'draw', seat: player, card: c });
    s = applyAction(s, { type: 'advance' });
    for (let pass = 0; pass < 6; pass++) {
      const before = s.logSeq;
      const visible = CARDS.map((c) => c.id).filter((c) => canSee(s, player, c));
      for (const npc of s.seats.filter((x) => x.kind === 'npc').map((x) => x.id as CharId)) {
        for (const set of [...visible.map((c) => [c]), ...combos.filter((cs) => cs.every((c) => visible.includes(c)))]) {
          const next = applyAction(s, { type: 'present', seat: player, target: npc, cards: set });
          const pub = (g: GameState) => Object.values(g.cards).filter((c) => c.public).length;
          if (next.npc[npc]?.state !== s.npc[npc]?.state || next.solved !== s.solved || pub(next) !== pub(s)) s = next;
        }
      }
      if (s.logSeq === before) break;
    }
    if (round < 3) s = applyAction(s, { type: 'advance' });
  }
  return s;
}

describe('case variants', () => {
  it.each(VARIANT_IDS)('%s references only real cards and options', (id) => {
    const v = VARIANTS[id];
    const data = getCase(id);
    expect(MOTIVE_OPTIONS.some((o) => o.id === v.motive)).toBe(true);
    for (const c of [...v.keyChain, ...v.voteChain, ...Object.keys(v.cards), ...Object.keys(v.suspicion)]) expect(CARD_BY_ID[c], c).toBeDefined();
    for (const script of Object.values(data.scripts)) {
      for (const c of script.hiddenPriority) expect(CARD_BY_ID[c]).toBeDefined();
      for (const r of script.reactions) {
        for (const c of r.cards) expect(CARD_BY_ID[c], `${id} ${script.char} ${c}`).toBeDefined();
        if (r.forceReveal) expect(CARD_BY_ID[r.forceReveal]).toBeDefined();
      }
    }
    // 진범만 자백한다
    const solvers = Object.values(data.scripts).filter((sc) => sc.reactions.some((r) => r.solved)).map((sc) => sc.char);
    expect(solvers).toEqual([v.culprit]);
  });

  it('overrides card text without touching the original', () => {
    expect(getCase('v1').card('23').text).toContain('성철아');
    expect(getCase('v2').card('23').text).toContain('재구야');
    expect(getCase('v0').card('23').text).toContain('선빈아');
    expect(getCase('v1').card('23').round).toBe(CARD_BY_ID['23'].round);
  });

  it('never makes the single player the culprit', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = createSingleGame('seongcheol', seed, { variantMode: 'any', difficulty: 'normal' });
      expect(VARIANTS[s.variant].culprit).not.toBe('seongcheol');
      const j = createSingleGame('jaegu', seed, { variantMode: 'variant', difficulty: 'normal' });
      expect(j.variant).toBe('v1');
    }
  });

  it('picks every variant over many seeds in "any" mode', () => {
    const seen = new Set<VariantId>();
    for (let seed = 1; seed <= 60; seed++) seen.add(createSingleGame('detective', seed, { variantMode: 'any', difficulty: 'normal' }).variant);
    expect([...seen].sort()).toEqual(['v0', 'v1', 'v2']);
  });

  it('online picks the variant only when the game starts', () => {
    let s = createOnlineGame(undefined, 11);
    s = setOptions(s, { variantMode: 'variant', difficulty: 'hard' });
    s = claimSeat(s, 'p1', 'A', 'jaegu');
    expect(s.variant).toBe('v0');
    s = applyAction(s, { type: 'advance' });
    expect(['v1', 'v2']).toContain(s.variant);
    expect(setOptions(s, { variantMode: 'original', difficulty: 'normal' })).toBe(s); // 시작 후에는 못 바꾼다
    expect(pickVariant({ ...s, options: { variantMode: 'original', difficulty: 'normal' } })).toBe('v0');
  });
});

describe('variant confessions', () => {
  it('v1: 이성철 breaks with 13, then 10+12+23', () => {
    let s = reveal(single('detective', 3, 'v1'), '13', '10', '12', '23');
    s = { ...s, phase: 'discuss', round: 3 };
    expect(applyAction(s, { type: 'present', seat: 'detective', target: 'seongcheol', cards: ['10', '12', '23'] }).solved).toBe(false);
    s = applyAction(s, { type: 'present', seat: 'detective', target: 'seongcheol', cards: ['13'] });
    s = applyAction(s, { type: 'present', seat: 'detective', target: 'seongcheol', cards: ['10', '12', '23'] });
    expect(s.solved).toBe(true);
  });

  it('v1: the blue trail only gets 이선빈 to admit her walk, not a confession', () => {
    let s = reveal(single('detective', 3, 'v1'), '04', '14', '31', '34');
    s = { ...s, phase: 'discuss', round: 3 };
    s = applyAction(s, { type: 'present', seat: 'detective', target: 'seonbin', cards: ['04'] });
    s = applyAction(s, { type: 'present', seat: 'detective', target: 'seonbin', cards: ['14', '31', '34'] });
    expect(s.npc.seonbin?.state).toBe(2);
    expect(s.solved).toBe(false);
    expect(s.log.some((e) => e.kind === 'hint' && e.text.includes('거실 소파'))).toBe(true);
  });

  it('v2: 정재구 breaks with 07, then 03+09+28', () => {
    let s = reveal(single('detective', 5, 'v2'), '07', '03', '09', '28');
    s = { ...s, phase: 'discuss', round: 3 };
    s = applyAction(s, { type: 'present', seat: 'detective', target: 'jaegu', cards: ['07'] });
    s = applyAction(s, { type: 'present', seat: 'detective', target: 'jaegu', cards: ['03', '09', '28'] });
    expect(s.solved).toBe(true);
  });

  it('scores against the variant answer', () => {
    let s = reveal(single('arin', 9, 'v2'), '03', '09', '28');
    s = { ...s, phase: 'final', round: 3 };
    s = applyAction(s, { type: 'submit', seat: 'arin', report: { culprit: 'jaegu', motive: 'friendship', time: 't2', method: 'push', evidence: ['03', '09'] } });
    expect(s.result?.scores.arin).toMatchObject({ culprit: 2, motive: 1, timeMethod: 1, evidence: 1 });
    const wrong = applyAction({ ...reveal(single('arin', 9, 'v2'), '14', '31'), phase: 'final', round: 3 }, {
      type: 'submit', seat: 'arin', report: { culprit: 'seonbin', motive: 'resign', time: 't2', method: 'push', evidence: ['14', '31'] },
    });
    expect(wrong.result?.scores.arin).toMatchObject({ culprit: 0, motive: 0, evidence: 0 });
  });
});

describe('variant solvability', () => {
  const viewpoints: SeatId[] = ['detective', 'seongcheol', 'jaegu', 'yeojin', 'arin'];
  for (const v of ['v1', 'v2'] as VariantId[]) {
    it.each(viewpoints.filter((p) => p !== VARIANTS[v].culprit))(`${v}: a thorough %s can extract the confession`, (player) => {
      let solved = 0;
      const runs = 40;
      for (let seed = 1; seed <= runs; seed++) if (playThrough(player, seed, v).solved) solved++;
      expect(solved / runs).toBeGreaterThanOrEqual(0.95);
    });
  }
});

describe('hard mode', () => {
  it('limits presentations per discussion and gives no hints', () => {
    let s = createSingleGame('detective', 4, { variantMode: 'original', difficulty: 'hard' });
    s = applyAction(s, { type: 'advance' });
    s = applyAction(s, { type: 'draw', seat: 'detective', card: '01' });
    s = applyAction(s, { type: 'draw', seat: 'detective', card: '04' });
    s = applyAction(s, { type: 'advance' });
    expect(s.presentsLeft).toBe(HARD_PRESENTS);
    for (let i = 0; i < HARD_PRESENTS; i++) s = applyAction(s, { type: 'present', seat: 'detective', target: 'seonbin', cards: ['01'] });
    expect(s.presentsLeft).toBe(0);
    expect(applyAction(s, { type: 'present', seat: 'detective', target: 'seonbin', cards: ['04'] })).toBe(s);
    expect(s.log.some((e) => e.kind === 'hint')).toBe(false);
    expect(s.stats.misses).toBe(HARD_PRESENTS);
  });

  it('hides the timeline verdict until the ending', () => {
    let s = createOnlineGame(undefined, 2);
    s = setOptions(s, { variantMode: 'original', difficulty: 'hard' });
    s = claimSeat(s, 'p1', 'A', 'arin');
    s = reveal({ ...s, phase: 'discuss', round: 3 }, '25');
    s = applyAction(s, { type: 'contradict', seat: 'arin', claimId: 'c_yeojin', card: '25' });
    expect(s.log.at(-1)?.text).toContain('판정은 사건 종결 후 공개');
  });
});

describe('ranks and goals', () => {
  const score = (o: Partial<{ culprit: number; total: number; bonus: number }>) => ({ culprit: 2, motive: 1, timeMethod: 1, evidence: 1, bonus: 3, total: 8, ...o });
  it('ranks investigators by points and culprits by goals', () => {
    expect(rankOf({ score: score({}), isCulprit: false, hard: false, misses: 0, single: true })).toBe('S');
    expect(rankOf({ score: score({ total: 7, bonus: 2 }), isCulprit: false, hard: true, misses: 0, single: true })).toBe('S');
    expect(rankOf({ score: score({ total: 8 }), isCulprit: false, hard: false, misses: 9, single: true })).toBe('A');
    expect(rankOf({ score: score({ culprit: 0, total: 6 }), isCulprit: false, hard: false, misses: 0, single: false })).toBe('B');
    expect(rankOf({ score: score({ total: 0, culprit: 0, bonus: 0 }), isCulprit: false, hard: false, misses: 0, single: false })).toBe('D');
    expect(rankOf({ score: score({ bonus: 2, total: 2, culprit: 0 }), isCulprit: true, hard: false, misses: 0, single: false })).toBe('A');
  });

  it('gives the culprit seat culprit goals in an online variant', () => {
    let s = createOnlineGame({ prologue: 0, investigate: 0, discuss: 0, final: 0 }, 21);
    s = claimSeat(s, 'p1', 'A', 'seongcheol');
    s = claimSeat(s, 'p2', 'B', 'arin');
    s = { ...applyAction(s, { type: 'advance' }), variant: 'v1' };
    for (let i = 0; i < 7; i++) s = applyAction(s, { type: 'advance' });
    expect(s.phase).toBe('final');
    s = applyAction(s, { type: 'submit', seat: 'seongcheol', report: { culprit: 'seonbin', motive: null, time: null, method: null, evidence: [] } });
    s = applyAction(s, { type: 'submit', seat: 'arin', report: { culprit: 'seonbin', motive: null, time: null, method: null, evidence: [] } });
    const goals = s.result?.goals.seongcheol ?? [];
    expect(goals.map((g) => g.id)).toEqual(['escape', 'scapegoat', 'bury']);
    expect(goals.every((g) => g.done)).toBe(true); // 이선빈에게 2표, 결정적 증거 비공개
    expect(s.result?.ranks.seongcheol).toBe('S');
    expect(s.result?.ending).toBe('C');
  });
});
