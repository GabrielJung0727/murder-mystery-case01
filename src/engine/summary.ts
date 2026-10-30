import type { GameSummary } from '../data/achievements';
import { caseOf } from '../data/caseData';
import type { GameState, SeatId } from './types';

/** 엔딩에 도달한 판을 한 플레이어 기준으로 요약한다 (도전 과제·기록용). 결과가 없거나 관전자면 null */
export function summarize(state: GameState, you: SeatId | null): GameSummary | null {
  const result = state.result;
  if (!result || !you || !result.scores[you]) return null;
  const data = caseOf(state);
  const score = result.scores[you]!;
  const goals = result.goals[you] ?? [];
  const isCulprit = you === data.culprit;
  return {
    variant: state.variant,
    mode: state.mode,
    hard: state.options.difficulty === 'hard',
    you,
    ending: result.ending,
    isCulprit,
    named: !isCulprit && state.reports[you]?.culprit === data.culprit,
    escaped: isCulprit && !result.top.includes(data.culprit),
    solved: state.solved,
    rank: result.ranks[you] ?? 'D',
    reportPoints: score.culprit + score.motive + score.timeMethod + score.evidence,
    goalsDone: goals.filter((g) => g.done).length,
    goalsTotal: goals.length,
    misses: state.stats.misses,
    publicCards: Object.values(state.cards).filter((c) => c.public).length,
    inspected: Object.values(state.cards).filter((c) => c.inspectedBy.includes(you)).length,
    contradictions: state.contradictions.filter((c) => c.seat === you && c.ok).length,
  };
}
