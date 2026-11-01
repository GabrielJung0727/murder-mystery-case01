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
 * 싱글 엔딩. 싱글은 플레이어 한 표에 NPC 표가 증거 공개·자백에 따라 한꺼번에 움직여,
 * 득표만으로는 B·D가 거의 나오지 않는다. 그래서 플레이어의 보고서와 NPC 다수 의견을 함께 본다.
 * - A 진범 지목 + 시각·수법 + 핵심 증거 2장 이상을 모두 맞히고, NPC 다수도 진범을 지목
 * - B 진범은 지목했지만 시각·수법이나 핵심 증거가 모자람 (입증 미흡)
 * - C 플레이어도 NPC 다수도 진범이 아닌 사람을 지목
 * - D 플레이어와 NPC 다수가 엇갈림: 끝까지 입증하고도 NPC를 설득하지 못했거나, NPC는 진범을 짚었는데 나는 틀림
 */
export function decideSoloEnding(report: Report | undefined, npcVotes: CharId[], data: CaseData): EndingId {
  const p = scoreReport(report, data);
  const count = (c: CharId) => npcVotes.filter((v) => v === c).length;
  const max = Math.max(...CHAR_IDS.map(count));
  const top = CHAR_IDS.filter((c) => count(c) === max);
  const roomRight = top.length === 1 && top[0] === data.culprit;
  if (p.culprit === 0) return roomRight ? 'D' : 'C';
  if (!p.timeMethod || !p.evidence) return 'B';
  return roomRight ? 'A' : 'D';
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
  const byVote = decideEnding(tally, voters, data.culprit);
  const top = byVote.top;
  const player = state.seats.find((s) => s.kind === 'human')!.id;
  const npcVotes = state.seats.filter((s) => s.kind === 'npc').map((s) => votes[s.id]).filter((v): v is CharId => !!v);
  const ending = state.mode === 'single' ? decideSoloEnding(state.reports[player], npcVotes, data) : byVote.ending;
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
