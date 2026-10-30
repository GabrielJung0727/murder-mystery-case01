import { CARDS, CARD_BY_ID } from '../data/cards';
import { CHAR_BY_ID, CHAR_IDS, CLAIMS } from '../data/characters';
import { NPC_SCRIPTS, ROUND_OPENINGS } from '../data/npcScripts';
import { OPENING_NARRATION, ROUND_INFO } from '../data/story';
import type { CardId, CharId } from '../data/types';
import { josa } from '../data/josa';
import { pushLog } from './log';
import { npcDraw, npcReact } from './npc';
import { finalize } from './scoring';
import type { Action, GameState, Seat, SeatId, Timers } from './types';

export const AP_PER_ROUND = 2;
export const DEFAULT_TIMERS: Timers = { prologue: 10, investigate: 5, discuss: 15, final: 20 };

function emptyCards(): GameState['cards'] {
  return Object.fromEntries(CARDS.map((c) => [c.id, { owner: null, public: false, inspectedBy: [] }]));
}

function baseState(mode: GameState['mode'], seats: Seat[], seed: number, timers: Timers): GameState {
  return {
    mode, phase: 'lobby', round: 0, seats,
    cards: emptyCards(), strings: [], contradictions: [], npc: {},
    log: [], logSeq: 0, reports: {}, result: null, solved: false,
    seed: seed >>> 0 || 1, phaseEndsAt: null, timers, spotlight: null,
  };
}

/** 1인 싱글플레이: 수사관 모드(detective) 또는 무고한 용의자 1인 시점 */
export function createSingleGame(player: SeatId, seed = Date.now()): GameState {
  if (player === 'seonbin') throw new Error('싱글 플레이에서 이선빈은 선택할 수 없습니다.');
  const seats: Seat[] = [];
  if (player === 'detective') seats.push({ id: 'detective', kind: 'human', name: '수사관', ap: 0, submitted: false });
  for (const id of CHAR_IDS) {
    seats.push({ id, kind: id === player ? 'human' : 'npc', name: CHAR_BY_ID[id].name, ap: 0, submitted: false });
  }
  const s = baseState('single', seats, seed, { prologue: 0, investigate: 0, discuss: 0, final: 0 });
  for (const seat of seats) {
    if (seat.kind === 'npc') s.npc[seat.id as CharId] = { state: 0, flags: [] };
  }
  return applyAction(s, { type: 'advance' });
}

/** 5인 온라인: 로비에서 좌석이 채워진다 */
export function createOnlineGame(timers: Timers = DEFAULT_TIMERS, seed = Date.now()): GameState {
  const seats: Seat[] = CHAR_IDS.map((id) => ({ id, kind: 'empty', ap: 0, submitted: false }));
  return baseState('online', seats, seed, timers);
}

/** 로그에 쓰는 인물명 (온라인 닉네임이 아닌 극중 이름) */
export function seatLabel(id: SeatId): string {
  return id === 'detective' ? '수사관' : CHAR_BY_ID[id].name;
}

export function seatOf(state: GameState, id: SeatId): Seat | undefined {
  return state.seats.find((s) => s.id === id);
}

export function humanSeats(state: GameState): Seat[] {
  return state.seats.filter((s) => s.kind === 'human');
}

export function canSee(state: GameState, seat: SeatId, card: CardId): boolean {
  const c = state.cards[card];
  return !!c && (c.public || c.owner === seat);
}

function setPhaseTimer(state: GameState, now: number): void {
  const minutes = state.phase === 'prologue' ? state.timers.prologue
    : state.phase === 'investigate' ? state.timers.investigate
    : state.phase === 'discuss' ? state.timers.discuss
    : state.phase === 'final' ? state.timers.final : 0;
  state.phaseEndsAt = state.mode === 'online' && minutes > 0 ? now + minutes * 60_000 : null;
}

function startRound(state: GameState, round: 1 | 2 | 3): void {
  state.round = round;
  state.phase = 'investigate';
  for (const seat of state.seats) seat.ap = seat.kind === 'empty' ? 0 : AP_PER_ROUND;
  pushLog(state, { kind: 'narration', text: `[라운드 ${round} · ${ROUND_INFO[round].area}] ${ROUND_INFO[round].narration}` });
}

function startDiscussion(state: GameState): void {
  state.phase = 'discuss';
  for (const seat of state.seats) seat.ap = 0;
  if (state.mode !== 'single') return;
  npcDraw(state);
  const opening = ROUND_OPENINGS[state.round as 1 | 2 | 3];
  pushLog(state, { kind: 'narration', text: opening.narration });
  for (const line of opening.lines) {
    if (seatOf(state, line.char)?.kind === 'npc') pushLog(state, { kind: 'line', speaker: line.char, text: line.text });
  }
}

function advance(state: GameState, now: number): void {
  state.spotlight = null;
  switch (state.phase) {
    case 'lobby':
      if (humanSeats(state).length === 0) return;
      state.phase = 'prologue';
      pushLog(state, { kind: 'narration', text: OPENING_NARRATION });
      break;
    case 'prologue':
      startRound(state, 1);
      break;
    case 'investigate':
      startDiscussion(state);
      break;
    case 'discuss':
      if (state.round < 3) startRound(state, (state.round + 1) as 2 | 3);
      else {
        state.phase = 'final';
        pushLog(state, { kind: 'narration', text: '[최종 추리] 모든 조사가 끝났다. 범인, 동기, 사망 시각과 수법, 그리고 근거가 된 증거를 사건 최종 결론 보고서에 정리하라.' });
      }
      break;
    case 'final':
      finalize(state);
      state.phase = 'ending';
      break;
    case 'ending':
      return;
  }
  setPhaseTimer(state, now);
}

function isVisibleToSeat(state: GameState, seat: SeatId, cards: CardId[]): boolean {
  return cards.length > 0 && cards.every((c) => canSee(state, seat, c));
}

/**
 * 순수 상태 전이 함수. 입력 상태는 변경하지 않는다.
 * 유효하지 않은 액션은 상태를 그대로 돌려준다.
 */
export function applyAction(prev: GameState, action: Action, now = Date.now()): GameState {
  const state: GameState = structuredClone(prev);
  switch (action.type) {
    case 'advance':
      advance(state, now);
      return state;

    case 'tick':
      if (state.phaseEndsAt !== null && now >= state.phaseEndsAt) advance(state, now);
      return state;

    case 'draw': {
      const seat = seatOf(state, action.seat);
      const card = CARD_BY_ID[action.card];
      const cs = state.cards[action.card];
      if (state.phase !== 'investigate' || !seat || seat.kind !== 'human' || seat.ap <= 0) return prev;
      if (!card || card.round !== state.round || cs.owner) return prev;
      cs.owner = seat.id;
      seat.ap -= 1;
      pushLog(state, { kind: 'system', speaker: seat.id, text: `${josa(seatLabel(seat.id), '이/가')} ${josa(card.location, '을/를')} 조사했다.` });
      return state;
    }

    case 'reveal': {
      const cs = state.cards[action.card];
      if (!cs || cs.owner !== action.seat || cs.public || state.phase === 'lobby' || state.phase === 'ending') return prev;
      cs.public = true;
      const title = CARD_BY_ID[action.card].title;
      pushLog(state, { kind: 'reveal', speaker: action.seat, cards: [action.card], text: `${josa(seatLabel(action.seat), '이/가')} 증거 ${action.card} 「${title}」${josa(title, '을/를').slice(title.length)} 공개했다.` });
      return state;
    }

    case 'inspect': {
      const card = CARD_BY_ID[action.card];
      const cs = state.cards[action.card];
      if (!card?.inspectTag || !canSee(state, action.seat, action.card) || cs.inspectedBy.includes(action.seat)) return prev;
      cs.inspectedBy.push(action.seat);
      return state;
    }

    case 'string': {
      const { a, b } = action;
      if (a === b || !state.cards[a]?.public || !state.cards[b]?.public) return prev;
      const idx = state.strings.findIndex(([x, y]) => (x === a && y === b) || (x === b && y === a));
      if (idx >= 0) state.strings.splice(idx, 1);
      else state.strings.push([a, b]);
      return state;
    }

    case 'contradict': {
      const claim = CLAIMS.find((c) => c.id === action.claimId);
      if (!claim || !canSee(state, action.seat, action.card)) return prev;
      if (state.contradictions.some((c) => c.claimId === claim.id && c.card === action.card)) return prev;
      const ok = claim.contradictedBy.includes(action.card);
      const verified = claim.verifiedBy.includes(action.card);
      state.contradictions.push({ claimId: claim.id, card: action.card, seat: action.seat, ok });
      const who = CHAR_BY_ID[claim.char].name;
      pushLog(state, {
        kind: 'contradiction', speaker: action.seat, cards: [action.card],
        text: ok ? `모순 발견! 증거 ${josa(action.card, '은/는')} ${who}의 진술 「${claim.label}」과 어긋난다.`
          : verified ? `증거 ${josa(action.card, '은/는')} ${who}의 진술 「${claim.label}」을 뒷받침한다.`
          : `증거 ${action.card}만으로는 ${who}의 진술과의 모순을 찾을 수 없다.`,
      });
      return state;
    }

    case 'present': {
      const cards = [...new Set(action.cards)];
      if (!isVisibleToSeat(state, action.seat, cards)) return prev;
      if (state.phase === 'lobby' || state.phase === 'prologue' || state.phase === 'ending') return prev;
      const target = action.target;
      pushLog(state, {
        kind: 'present', speaker: action.seat, target, cards,
        text: `${seatLabel(action.seat)}: ${target ? `${CHAR_BY_ID[target].name}에게 ` : ''}증거 ${cards.join(' + ')} 제시!`,
      });
      if (state.mode === 'single') {
        if (!target || seatOf(state, target)?.kind !== 'npc' || !NPC_SCRIPTS[target]) return prev;
        npcReact(state, action.seat, target, cards);
      } else {
        state.spotlight = { seat: action.seat, cards, target, at: now };
      }
      return state;
    }

    case 'submit': {
      const seat = seatOf(state, action.seat);
      if (state.phase !== 'final' || !seat || seat.kind !== 'human' || seat.submitted) return prev;
      const evidence = [...new Set(action.report.evidence)].filter((c) => canSee(state, action.seat, c)).slice(0, 3);
      state.reports[seat.id] = { ...action.report, evidence };
      seat.submitted = true;
      pushLog(state, { kind: 'system', speaker: seat.id, text: `${josa(seatLabel(seat.id), '이/가')} 최종 결론 보고서를 제출했다.` });
      if (humanSeats(state).every((s) => s.submitted)) {
        finalize(state);
        state.phase = 'ending';
        state.phaseEndsAt = null;
      }
      return state;
    }
  }
}

/** 온라인 좌석 배정 (로비 전용) */
export function claimSeat(prev: GameState, playerId: string, name: string, seatId: CharId): GameState {
  if (prev.phase !== 'lobby') return prev;
  const target = seatOf(prev, seatId);
  if (!target || (target.kind === 'human' && target.playerId !== playerId)) return prev;
  const state = structuredClone(prev);
  for (const s of state.seats) {
    if (s.playerId === playerId) Object.assign(s, { kind: 'empty', playerId: undefined, name: undefined, connected: undefined });
  }
  Object.assign(seatOf(state, seatId)!, { kind: 'human', playerId, name, connected: true });
  return state;
}

export function releaseSeat(prev: GameState, playerId: string): GameState {
  if (prev.phase !== 'lobby') return setConnected(prev, playerId, false);
  const state = structuredClone(prev);
  for (const s of state.seats) {
    if (s.playerId === playerId) Object.assign(s, { kind: 'empty', playerId: undefined, name: undefined, connected: undefined });
  }
  return state;
}

export function setConnected(prev: GameState, playerId: string, connected: boolean): GameState {
  const state = structuredClone(prev);
  for (const s of state.seats) if (s.playerId === playerId) s.connected = connected;
  return state;
}

/**
 * 좌석별 시야 필터. 다른 플레이어의 보고서는 엔딩 전까지 숨긴다.
 * (카드 원문은 클라이언트 데이터에 포함되어 있으므로 손패 은폐는 UI 규칙으로 보장한다.)
 */
export function viewFor(state: GameState, seat: SeatId | null): GameState {
  if (state.phase === 'ending') return state;
  const reports: GameState['reports'] = {};
  if (seat && state.reports[seat]) reports[seat] = state.reports[seat];
  return { ...state, reports, npc: state.mode === 'single' ? state.npc : {} };
}
