import type { CharId } from '../data/types';
import type { Action, GameOptions, GameState, SeatId, Timers } from '../engine/types';

export const DEFAULT_PORT = 4777;

export type ClientMsg =
  | { t: 'hello'; playerId: string; name: string; hostToken?: string }
  | { t: 'seat'; char: CharId }
  | { t: 'leave' }
  | { t: 'rejoin'; seat: SeatId }
  | { t: 'timers'; timers: Timers }
  | { t: 'options'; options: GameOptions }
  | { t: 'action'; action: Action };

export type ServerMsg =
  | { t: 'welcome'; playerId: string; isHost: boolean }
  | { t: 'state'; state: GameState; you: SeatId | null; isHost: boolean }
  | { t: 'error'; message: string };
