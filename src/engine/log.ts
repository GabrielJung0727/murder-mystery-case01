import type { GameState, LogEntry } from './types';

export function pushLog(state: GameState, e: Omit<LogEntry, 'id' | 'round'>): void {
  state.logSeq += 1;
  state.log.push({ ...e, id: state.logSeq, round: state.round });
}
