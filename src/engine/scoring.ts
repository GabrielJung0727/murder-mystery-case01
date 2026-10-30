import { caseOf, type CaseData } from '../data/caseData';
import { CHAR_IDS } from '../data/characters';
import { goalsFor } from '../data/goals';
import type { EndingId } from '../data/story';
import type { CharId } from '../data/types';
import { npcVote } from './npc';
import type { GameState, GoalResult, Rank, Report, ScoreBreakdown, SeatId } from './types';

export function scoreReport(report: Report | undefined, data: CaseData): Omit<ScoreBreakdown, 'bonus' | 'total'> {
  if (!report) return { culprit: 0, motive: 0, timeMethod: 0, evidence: 0 };
  return {
    culprit: report.culprit === data.culprit ? 2 : 0,
    motive: data.isCorrect('motive', report.motive) ? 1 : 0,
    timeMethod: data.isCorrect('time', report.time) && data.isCorrect('method', report.method) ? 1 : 0,
    evidence: report.evidence.filter((c) => data.keyChain.includes(c)).length >= 2 ? 1 : 0,
  };
}

export function decideEnding(tally: Record<CharId, number>, voters: number, culprit: CharId): { ending: EndingId; top: CharId[] } {
  const max = Math.max(...CHAR_IDS.map((c) => tally[c]));
  const top = max > 0 ? CHAR_IDS.filter((c) => tally[c] === max) : [];
  if (top.length !== 1) return { ending: 'D', top };
  if (top[0] !== culprit) return { ending: 'C', top };
  const majority = Math.floor(voters / 2) + 1;
  return { ending: tally[culprit] >= majority ? 'A' : 'B', top };
}

/**
 * 판 결과 랭크.
 * - 수사하는 쪽: 보고서(최대 5) + 개인 목표(최대 3) = 8점 만점. 어려움 모드 +1, 싱글에서 헛짚은 제시 8회 이상 -1.
 *   S는 8점 이상, A는 6점 이상이면서 진범을 맞혀야 한다.
 * - 진범 역할: 개인 목표(최대 3)만 본다. 3개 S, 2개 A, 1개 B, 0개 C.
 */
export function rankOf(p: { score: ScoreBreakdown; isCulprit: boolean; hard: boolean; misses: number; single: boolean }): Rank {
  if (p.isCulprit) return (['C', 'B', 'A', 'S'] as const)[Math.min(3, p.score.bonus)];
  const pts = p.score.total + (p.hard ? 1 : 0) - (p.single && p.misses >= 8 ? 1 : 0);
  const right = p.score.culprit > 0;
  if (pts >= 8 && right) return 'S';
  if (pts >= 6 && right) return 'A';
  if (pts >= 4) return 'B';
  if (pts >= 2) return 'C';
  return 'D';
}

export function finalize(state: GameState): void {
  const data = caseOf(state);
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
  const { ending, top } = decideEnding(tally, voters, data.culprit);
  const scores: Partial<Record<SeatId, ScoreBreakdown>> = {};
  const goals: Partial<Record<SeatId, GoalResult[]>> = {};
  const ranks: Partial<Record<SeatId, Rank>> = {};
  for (const seat of state.seats) {
    if (seat.kind !== 'human') continue;
    const report = state.reports[seat.id];
    const done = goalsFor(seat.id, data).map((g) => ({ id: g.id, label: g.label, done: g.check({ state, seat: seat.id, data, tally, top, report }) }));
    const base = scoreReport(report, data);
    const bonus = done.filter((g) => g.done).length;
    const score = { ...base, bonus, total: base.culprit + base.motive + base.timeMethod + base.evidence + bonus };
    scores[seat.id] = score;
    goals[seat.id] = done;
    ranks[seat.id] = rankOf({
      score, isCulprit: seat.id === data.culprit, hard: state.options.difficulty === 'hard',
      misses: state.stats.misses, single: state.mode === 'single',
    });
  }
  state.result = { votes, tally, top, ending, scores, goals, ranks };
  state.phaseEndsAt = null;
}
