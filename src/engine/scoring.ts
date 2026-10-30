import { KEY_CHAIN } from '../data/cards';
import { CHAR_IDS, CULPRIT } from '../data/characters';
import { METHOD_OPTIONS, MOTIVE_OPTIONS, TIME_OPTIONS, type EndingId } from '../data/story';
import type { CharId } from '../data/types';
import { npcVote } from './npc';
import type { GameState, Report, ScoreBreakdown, SeatId } from './types';

const correct = (opts: { id: string; correct?: boolean }[], id: string | null) =>
  !!id && !!opts.find((o) => o.id === id)?.correct;

export function scoreReport(report: Report | undefined): Omit<ScoreBreakdown, 'bonus' | 'total'> {
  if (!report) return { culprit: 0, motive: 0, timeMethod: 0, evidence: 0 };
  return {
    culprit: report.culprit === CULPRIT ? 2 : 0,
    motive: correct(MOTIVE_OPTIONS, report.motive) ? 1 : 0,
    timeMethod: correct(TIME_OPTIONS, report.time) && correct(METHOD_OPTIONS, report.method) ? 1 : 0,
    evidence: report.evidence.filter((c) => KEY_CHAIN.includes(c)).length >= 2 ? 1 : 0,
  };
}

/** 개인 목표 달성 보너스 (자동 판정 기준은 캐릭터 시트 goal 에 명시) */
export function personalGoal(state: GameState, seat: SeatId, tally: Record<CharId, number>, top: CharId[]): boolean {
  switch (seat) {
    case 'seongcheol': return !state.cards['13'].public;
    case 'yeojin': return !top.includes('yeojin') && !top.includes('arin');
    case 'seonbin': return !top.includes('seonbin');
    case 'arin': return state.cards['34'].public && !top.includes('arin');
    case 'jaegu': return !top.includes('jaegu') && tally.jaegu <= 1;
    default: return false;
  }
}

export function decideEnding(tally: Record<CharId, number>, voters: number): { ending: EndingId; top: CharId[] } {
  const max = Math.max(...CHAR_IDS.map((c) => tally[c]));
  const top = max > 0 ? CHAR_IDS.filter((c) => tally[c] === max) : [];
  if (top.length !== 1) return { ending: 'D', top };
  if (top[0] !== CULPRIT) return { ending: 'C', top };
  const majority = Math.floor(voters / 2) + 1;
  return { ending: tally[CULPRIT] >= majority ? 'A' : 'B', top };
}

export function finalize(state: GameState): void {
  const votes: Partial<Record<SeatId, CharId | null>> = {};
  for (const seat of state.seats) {
    if (seat.kind === 'human') votes[seat.id] = state.reports[seat.id]?.culprit ?? null;
    else if (seat.kind === 'npc') votes[seat.id] = npcVote(state, seat.id as CharId);
  }
  const tally = Object.fromEntries(CHAR_IDS.map((c) => [c, 0])) as Record<CharId, number>;
  let voters = 0;
  for (const v of Object.values(votes)) {
    if (v) { tally[v] += 1; voters += 1; }
  }
  const { ending, top } = decideEnding(tally, voters);
  const scores: Partial<Record<SeatId, ScoreBreakdown>> = {};
  for (const seat of state.seats) {
    if (seat.kind !== 'human') continue;
    const base = scoreReport(state.reports[seat.id]);
    const bonus = personalGoal(state, seat.id, tally, top) ? 1 : 0;
    scores[seat.id] = { ...base, bonus, total: base.culprit + base.motive + base.timeMethod + base.evidence + bonus };
  }
  state.result = { votes, tally, top, ending, scores };
  state.phaseEndsAt = null;
}
