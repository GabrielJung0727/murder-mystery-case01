import { describe, expect, it } from 'vitest';
import { CARDS, CARD_BY_ID } from '../data/cards';
import { CHAR_IDS } from '../data/characters';
import { NPC_SCRIPTS } from '../data/npcScripts';
import type { CardId, CharId } from '../data/types';
import { applyAction, canSee, claimSeat, createOnlineGame, createSingleGame, reclaimSeat, releaseSeat, viewFor } from './engine';
import { decideEnding } from './scoring';
import type { GameState, Report, SeatId } from './types';

const CORRECT: Report = { culprit: 'seonbin', motive: 'resign', time: 't2', method: 'push', evidence: ['14', '31', '34'] };

function reveal(state: GameState, ...cards: CardId[]): GameState {
  const s = structuredClone(state);
  for (const c of cards) s.cards[c].public = true;
  return s;
}

describe('case data', () => {
  it('has 35 cards split 12/12/11 by round', () => {
    expect(CARDS).toHaveLength(35);
    expect([1, 2, 3].map((r) => CARDS.filter((c) => c.round === r).length)).toEqual([12, 12, 11]);
  });

  it('NPC scripts only reference existing cards', () => {
    for (const script of Object.values(NPC_SCRIPTS)) {
      for (const c of script.hiddenPriority) expect(CARD_BY_ID[c]).toBeDefined();
      for (const r of script.reactions) {
        for (const c of r.cards) expect(CARD_BY_ID[c], `${script.char} ${c}`).toBeDefined();
        if (r.forceReveal) expect(CARD_BY_ID[r.forceReveal]).toBeDefined();
      }
    }
  });
});

describe('single player flow', () => {
  it('rejects 이선빈 as a playable character', () => {
    expect(() => createSingleGame('seonbin')).toThrow();
  });

  it('runs AP-limited investigation then NPC draws', () => {
    let s = createSingleGame('detective', 42);
    expect(s.phase).toBe('prologue');
    s = applyAction(s, { type: 'advance' });
    expect(s.phase).toBe('investigate');
    expect(s.round).toBe(1);
    s = applyAction(s, { type: 'draw', seat: 'detective', card: '01' });
    s = applyAction(s, { type: 'draw', seat: 'detective', card: '02' });
    const blocked = applyAction(s, { type: 'draw', seat: 'detective', card: '03' });
    expect(blocked).toBe(s);
    expect(applyAction(s, { type: 'draw', seat: 'detective', card: '13' })).toBe(s); // 라운드 2 카드
    s = applyAction(s, { type: 'advance' });
    expect(s.phase).toBe('discuss');
    const r1 = CARDS.filter((c) => c.round === 1);
    expect(r1.every((c) => s.cards[c.id].owner)).toBe(true);
    for (const c of r1) {
      const owner = s.cards[c.id].owner as CharId;
      if (owner === 'detective' as never) continue;
      const hidden = NPC_SCRIPTS[owner].hiddenPriority.includes(c.id);
      expect(s.cards[c.id].public).toBe(!hidden);
    }
  });

  it('breaks 이선빈 with 23 then the 14+31+34 combo', () => {
    let s = createSingleGame('detective', 7);
    s = reveal(s, '23', '14', '31', '34');
    s = { ...s, phase: 'discuss', round: 3 };
    const early = applyAction(s, { type: 'present', seat: 'detective', target: 'seonbin', cards: ['14', '31', '34'] });
    expect(early.solved).toBe(false);
    s = applyAction(s, { type: 'present', seat: 'detective', target: 'seonbin', cards: ['23'] });
    expect(s.npc.seonbin?.state).toBe(1);
    s = applyAction(s, { type: 'present', seat: 'detective', target: 'seonbin', cards: ['14', '31', '34'] });
    expect(s.npc.seonbin?.state).toBe(2);
    expect(s.solved).toBe(true);
  });

  it('releases hidden cards when an NPC defence breaks', () => {
    let s = createSingleGame('detective', 1);
    s = { ...s, phase: 'discuss', round: 3 };
    s.cards['17'] = { owner: 'arin', public: false, inspectedBy: [] };
    s.cards['19'] = { owner: null, public: false, inspectedBy: [] };
    s.cards['08'] = { owner: 'detective', public: false, inspectedBy: [] };
    s = applyAction(s, { type: 'present', seat: 'detective', target: 'arin', cards: ['08'] });
    expect(s.npc.arin?.state).toBe(1);
    expect(s.cards['17'].public).toBe(true);
  });

  it('cannot present cards the player has not seen', () => {
    const s = { ...createSingleGame('detective', 3), phase: 'discuss' as const, round: 1 as const };
    expect(applyAction(s, { type: 'present', seat: 'detective', target: 'seonbin', cards: ['04'] })).toBe(s);
  });

  it('scores a correct report and reaches ending A after confession', () => {
    let s = createSingleGame('seongcheol', 9);
    s = reveal(s, '14', '31', '34');
    s = { ...s, phase: 'final', round: 3, solved: true };
    s = applyAction(s, { type: 'submit', seat: 'seongcheol', report: CORRECT });
    expect(s.phase).toBe('ending');
    expect(s.result?.ending).toBe('A');
    // 개인 목표 3개: 증거 13 비공개, 최다 득표 아님, 진범 지목
    expect(s.result?.scores.seongcheol).toMatchObject({ culprit: 2, motive: 1, timeMethod: 1, evidence: 1, bonus: 3, total: 8 });
    expect(s.result?.ranks.seongcheol).toBe('S');
  });
});

describe('ending decision', () => {
  const t = (o: Partial<Record<CharId, number>>) => Object.fromEntries(CHAR_IDS.map((c) => [c, o[c] ?? 0])) as Record<CharId, number>;
  it('A on majority, B on plurality, C on wrong, D on tie', () => {
    expect(decideEnding(t({ seonbin: 3, jaegu: 2 }), 5, 'seonbin').ending).toBe('A');
    expect(decideEnding(t({ seonbin: 2, jaegu: 1, arin: 1, yeojin: 1 }), 5, 'seonbin').ending).toBe('B');
    expect(decideEnding(t({ jaegu: 3, seonbin: 2 }), 5, 'seonbin').ending).toBe('C');
    expect(decideEnding(t({ jaegu: 2, seonbin: 2, arin: 1 }), 5, 'seonbin').ending).toBe('D');
  });
});

describe('online flow', () => {
  it('seats players, hides private reports, ends when all submit', () => {
    let s = createOnlineGame({ prologue: 0, investigate: 0, discuss: 0, final: 0 }, 5);
    s = claimSeat(s, 'p1', 'A', 'seonbin');
    s = claimSeat(s, 'p2', 'B', 'arin');
    expect(claimSeat(s, 'p3', 'C', 'arin')).toBe(s);
    s = applyAction(s, { type: 'advance' }); // prologue
    s = applyAction(s, { type: 'advance' }); // round 1
    s = applyAction(s, { type: 'draw', seat: 'arin', card: '04' });
    expect(canSee(s, 'arin', '04')).toBe(true);
    expect(canSee(s, 'seonbin', '04')).toBe(false);
    s = applyAction(s, { type: 'reveal', seat: 'arin', card: '04' });
    expect(canSee(s, 'seonbin', '04')).toBe(true);
    for (let i = 0; i < 6; i++) s = applyAction(s, { type: 'advance' });
    expect(s.phase).toBe('final');
    s = applyAction(s, { type: 'submit', seat: 'arin', report: CORRECT });
    expect(viewFor(s, 'seonbin').reports.arin).toBeUndefined();
    s = applyAction(s, { type: 'submit', seat: 'seonbin', report: { ...CORRECT, culprit: 'jaegu' } });
    expect(s.phase).toBe('ending');
    expect(s.result?.ending).toBe('D');
  });

  it('lets a dropped player take back their seat mid-game, but never a live one', () => {
    let s = createOnlineGame({ prologue: 0, investigate: 0, discuss: 0, final: 0 }, 5);
    s = claimSeat(s, 'p1', 'A', 'seonbin');
    s = claimSeat(s, 'p2', 'B', 'arin');
    expect(reclaimSeat(s, 'p9', 'A', 'seonbin')).toBe(s); // 로비에서는 불가
    s = applyAction(s, { type: 'advance' });
    s = applyAction(s, { type: 'advance' });
    s = applyAction(s, { type: 'draw', seat: 'seonbin', card: '04' });
    expect(reclaimSeat(s, 'p9', 'A', 'seonbin')).toBe(s); // 주인이 접속 중
    s = releaseSeat(s, 'p1'); // 진행 중에는 자리를 비우지 않고 '끊김'으로 둔다
    expect(reclaimSeat(s, 'p2', 'B', 'seonbin')).toBe(s); // 이미 다른 자리에 앉은 사람
    s = reclaimSeat(s, 'p9', 'A', 'seonbin');
    const seat = s.seats.find((x) => x.id === 'seonbin')!;
    expect(seat.playerId).toBe('p9');
    expect(seat.connected).toBe(true);
    expect(canSee(s, 'seonbin', '04')).toBe(true); // 손패도 그대로
  });

  it('auto-advances when the phase timer expires', () => {
    let s = createOnlineGame({ prologue: 1, investigate: 1, discuss: 1, final: 1 }, 5);
    s = claimSeat(s, 'p1', 'A', 'jaegu');
    s = applyAction(s, { type: 'advance' }, 0);
    expect(s.phaseEndsAt).toBe(60_000);
    expect(applyAction(s, { type: 'tick' }, 59_999).phase).toBe('prologue');
    expect(applyAction(s, { type: 'tick' }, 60_000).phase).toBe('investigate');
  });
});

/** 성실한 플레이어가 가진 카드로 가능한 모든 제시를 반복했을 때 진범 자백에 도달하는지 */
function playThrough(player: SeatId, seed: number): GameState {
  const PRIORITY = ['23', '14', '31', '34', '13', '17', '18', '07', '25', '27', '24', '28', '33', '29', '04', '19'];
  const combos: CardId[][] = [['14', '31', '34'], ['28', '29', '33']];
  let s = createSingleGame(player, seed);
  s = applyAction(s, { type: 'advance' });
  for (let round = 1; round <= 3; round++) {
    const pool = CARDS.filter((c) => c.round === round).map((c) => c.id)
      .sort((a, b) => (PRIORITY.indexOf(a) + 100) % 100 - (PRIORITY.indexOf(b) + 100) % 100);
    for (const c of pool.slice(0, 2)) s = applyAction(s, { type: 'draw', seat: player, card: c });
    s = applyAction(s, { type: 'advance' });
    for (let pass = 0; pass < 6; pass++) {
      const before = s.logSeq;
      const visible = CARDS.map((c) => c.id).filter((c) => canSee(s, player, c));
      for (const npc of s.seats.filter((x) => x.kind === 'npc').map((x) => x.id as CharId)) {
        for (const set of [...visible.map((c) => [c]), ...combos.filter((cs) => cs.every((c) => visible.includes(c)))]) {
          const next = applyAction(s, { type: 'present', seat: player, target: npc, cards: set });
          if (next.npc[npc]?.state !== s.npc[npc]?.state || next.solved !== s.solved
            || Object.values(next.cards).filter((c) => c.public).length !== Object.values(s.cards).filter((c) => c.public).length) s = next;
        }
      }
      if (s.logSeq === before) break;
    }
    if (round < 3) s = applyAction(s, { type: 'advance' });
  }
  return s;
}

describe('single player solvability', () => {
  it.each(['detective', 'seongcheol', 'jaegu', 'yeojin', 'arin'] as SeatId[])('a thorough %s can extract the confession', (player) => {
    let solved = 0;
    const runs = 40;
    for (let seed = 1; seed <= runs; seed++) if (playThrough(player, seed).solved) solved++;
    expect(solved / runs).toBeGreaterThanOrEqual(0.95);
  });
});
