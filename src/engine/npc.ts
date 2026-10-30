import { CARD_BY_ID, CARDS } from '../data/cards';
import { CHAR_BY_ID, CULPRIT, SUSPICION } from '../data/characters';
import { NPC_SCRIPTS, type Reaction } from '../data/npcScripts';
import type { CardId, CharId } from '../data/types';
import { josa } from '../data/josa';
import { pushLog } from './log';
import type { GameState, SeatId } from './types';

/** mulberry32: 상태에 시드를 저장해 재현 가능한 난수를 만든다 */
export function nextRandom(state: GameState): number {
  let t = (state.seed = (state.seed + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function revealCard(state: GameState, card: CardId, by: CharId, why: string): void {
  const cs = state.cards[card];
  if (cs.public) return;
  if (!cs.owner) cs.owner = by;
  cs.public = true;
  pushLog(state, {
    kind: 'reveal', speaker: by, cards: [card],
    text: `${josa(CHAR_BY_ID[by].name, '이/가')} 증거 ${card} 「${CARD_BY_ID[card].title}」${josa(CARD_BY_ID[card].title, '을/를').slice(-1)} ${why}.`,
  });
}

/** 플레이어 조사 후, NPC들이 남은 카드에서 각 2장씩 가져간다. 불리한 카드는 숨기고 나머지는 공개한다. */
export function npcDraw(state: GameState): void {
  for (const seat of state.seats) {
    if (seat.kind !== 'npc') continue;
    const char = seat.id as CharId;
    for (let i = 0; i < 2; i++) {
      const pool = CARDS.filter((c) => c.round === state.round && !state.cards[c.id].owner);
      if (pool.length === 0) break;
      const card = pool[Math.floor(nextRandom(state) * pool.length)];
      state.cards[card.id].owner = char;
      if (NPC_SCRIPTS[char].hiddenPriority.includes(card.id)) {
        pushLog(state, { kind: 'system', speaker: char, text: `${josa(CHAR_BY_ID[char].name, '이/가')} ${josa(card.location, '을/를')} 조사했지만 아무것도 공개하지 않았다.` });
      } else {
        revealCard(state, card.id, char, '공용 보드에 공개했다');
      }
    }
  }
}

function matches(r: Reaction, cards: CardId[], state: number, flags: string[]): boolean {
  if (!r.cards.every((c) => cards.includes(c))) return false;
  if (r.minState !== undefined && state < r.minState) return false;
  if (r.maxState !== undefined && state > r.maxState) return false;
  if (r.requiresFlags && !r.requiresFlags.every((f) => flags.includes(f))) return false;
  return true;
}

/** 가장 구체적인(카드 수가 많은) 반응을 고른다. 동률이면 스크립트 순서. */
export function findReaction(char: CharId, cards: CardId[], npcState: number, flags: string[]): Reaction | null {
  let best: Reaction | null = null;
  for (const r of NPC_SCRIPTS[char].reactions) {
    if (matches(r, cards, npcState, flags) && (!best || r.cards.length > best.cards.length)) best = r;
  }
  return best;
}

export function npcReact(state: GameState, presenter: SeatId, target: CharId, cards: CardId[]): void {
  const mind = state.npc[target]!;
  const script = NPC_SCRIPTS[target];
  const reaction = findReaction(target, cards, mind.state, mind.flags);
  for (const c of cards) if (!mind.flags.includes(`presented_${c}`)) mind.flags.push(`presented_${c}`);

  if (!reaction) {
    pushLog(state, { kind: 'reaction', speaker: target, text: script.fallback });
    return;
  }
  pushLog(state, { kind: 'reaction', speaker: target, tone: reaction.tone, text: reaction.text });
  for (const f of reaction.setFlags ?? []) if (!mind.flags.includes(f)) mind.flags.push(f);

  const transitioned = reaction.next !== undefined && reaction.next > mind.state;
  if (transitioned) {
    mind.state = reaction.next!;
    pushLog(state, { kind: 'system', speaker: target, text: `${CHAR_BY_ID[target].name}의 방어선이 무너졌다 → 「${script.states[mind.state].label}」` });
  }
  if (transitioned || reaction.releaseHidden) {
    for (const [id, cs] of Object.entries(state.cards)) {
      if (cs.owner === target && !cs.public) revealCard(state, id, target, '더는 숨기지 못하고 내놓았다');
    }
  }
  if (reaction.forceReveal) {
    const card = reaction.forceReveal;
    const cs = state.cards[card];
    const owner = cs.owner ? state.seats.find((s) => s.id === cs.owner) : null;
    const reachable = CARD_BY_ID[card].round <= state.round;
    if (!cs.public && reachable && (!owner || owner.kind === 'npc') && cs.owner !== presenter) {
      revealCard(state, card, (owner?.id as CharId) ?? target, '공용 보드에 내놓았다');
    }
  }
  if (reaction.hint) pushLog(state, { kind: 'hint', target, text: reaction.hint });
  if (reaction.solved) {
    state.solved = true;
    pushLog(state, { kind: 'narration', text: '진범의 자백을 받아냈다. 최종 결론 보고서로 사건을 정리하라.' });
  }
}

/** 공개된 증거 기준, 자신을 제외하고 가장 의심스러운 인물 */
function mostSuspicious(state: GameState, self: CharId): CharId {
  const score: Partial<Record<CharId, number>> = {};
  for (const [id, cs] of Object.entries(state.cards)) {
    const who = SUSPICION[id];
    if (cs.public && who && who !== self) score[who] = (score[who] ?? 0) + 1;
  }
  const order: CharId[] = ['seongcheol', 'jaegu', 'yeojin', 'arin', 'seonbin'];
  let best: CharId = order.find((c) => c !== self)!;
  for (const c of order) if (c !== self && (score[c] ?? 0) > (score[best] ?? 0)) best = c;
  return best;
}

/** NPC 최종 투표 규칙 (명세서 미기재 → 개발 측 결정) */
export function npcVote(state: GameState, char: CharId): CharId {
  if (state.solved) return CULPRIT;
  if (char === CULPRIT) return mostSuspicious(state, char);
  const mind = state.npc[char];
  const culpritMind = state.npc[CULPRIT];
  if (mind?.state === 2 && (culpritMind?.state ?? 0) >= 1) return CULPRIT;
  const chain = ['14', '31', '34'].filter((c) => state.cards[c].public).length;
  if (chain >= 2) return CULPRIT;
  return mostSuspicious(state, char);
}
