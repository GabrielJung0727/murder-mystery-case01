import type { CardId, CharId } from '../data/types';
import type { NpcState } from '../data/npcScripts';
import type { EndingId } from '../data/story';
import type { VariantId } from '../data/variants';

export type SeatId = CharId | 'detective';
export type Mode = 'online' | 'single';
export type Phase = 'lobby' | 'prologue' | 'investigate' | 'discuss' | 'final' | 'ending';
export type Difficulty = 'normal' | 'hard';
/** 사건 선택: 원작 / 변형 중 무작위 / 원작 포함 무작위 */
export type VariantMode = 'original' | 'variant' | 'any';
export type Rank = 'S' | 'A' | 'B' | 'C' | 'D';

export interface GameOptions {
  variantMode: VariantMode;
  difficulty: Difficulty;
}

export interface CardState {
  owner: SeatId | null;
  public: boolean;
  /** 돋보기 확대 조사를 마친 좌석 */
  inspectedBy: SeatId[];
}

export interface Seat {
  id: SeatId;
  kind: 'human' | 'npc' | 'empty';
  name?: string;
  playerId?: string;
  connected?: boolean;
  ap: number;
  submitted: boolean;
}

export type LogKind = 'narration' | 'line' | 'system' | 'reveal' | 'present' | 'reaction' | 'hint' | 'contradiction';

export interface LogEntry {
  id: number;
  kind: LogKind;
  speaker?: SeatId;
  /** 심문 대상 (제시/힌트 로그) */
  target?: CharId;
  text: string;
  tone?: string;
  cards?: CardId[];
  round: number;
}

export interface NpcMind {
  state: NpcState;
  flags: string[];
}

export interface Report {
  culprit: CharId | null;
  motive: string | null;
  time: string | null;
  method: string | null;
  evidence: CardId[];
}

export interface ScoreBreakdown {
  culprit: number;
  motive: number;
  timeMethod: number;
  evidence: number;
  bonus: number;
  total: number;
}

export interface GoalResult {
  id: string;
  label: string;
  done: boolean;
}

export interface Result {
  votes: Partial<Record<SeatId, CharId | null>>;
  tally: Record<CharId, number>;
  top: CharId[];
  ending: EndingId;
  /** bonus = 달성한 개인 목표 수 */
  scores: Partial<Record<SeatId, ScoreBreakdown>>;
  goals: Partial<Record<SeatId, GoalResult[]>>;
  ranks: Partial<Record<SeatId, Rank>>;
}

export interface Contradiction {
  claimId: string;
  card: CardId;
  seat: SeatId;
  ok: boolean;
}

export interface Spotlight {
  seat: SeatId;
  cards: CardId[];
  target?: CharId;
  at: number;
}

export interface Timers {
  prologue: number;
  investigate: number;
  discuss: number;
  final: number;
}

export interface GameState {
  mode: Mode;
  phase: Phase;
  round: 0 | 1 | 2 | 3;
  seats: Seat[];
  cards: Record<CardId, CardState>;
  strings: [CardId, CardId][];
  contradictions: Contradiction[];
  npc: Partial<Record<CharId, NpcMind>>;
  log: LogEntry[];
  logSeq: number;
  reports: Partial<Record<SeatId, Report>>;
  result: Result | null;
  solved: boolean;
  seed: number;
  /** 온라인 페이즈 타이머 (epoch ms) */
  phaseEndsAt: number | null;
  /** 페이즈별 제한 시간 (분). 0 이면 무제한 */
  timers: Timers;
  spotlight: Spotlight | null;
  /** 이 판의 진범 변형 (data/variants.ts). 온라인은 로비를 떠날 때 정해진다 */
  variant: VariantId;
  options: GameOptions;
  /** 싱글: 증거 제시 횟수와 헛짚은(반응 없는) 제시 횟수 */
  stats: { presents: number; misses: number };
  /** 어려움 모드 싱글: 이번 심문 단계에 남은 증거 제시 횟수 (그 외에는 null = 무제한) */
  presentsLeft: number | null;
}

export type Action =
  | { type: 'advance' }
  | { type: 'draw'; seat: SeatId; card: CardId }
  | { type: 'reveal'; seat: SeatId; card: CardId }
  | { type: 'inspect'; seat: SeatId; card: CardId }
  | { type: 'string'; seat: SeatId; a: CardId; b: CardId }
  | { type: 'contradict'; seat: SeatId; claimId: string; card: CardId }
  | { type: 'present'; seat: SeatId; cards: CardId[]; target?: CharId }
  | { type: 'submit'; seat: SeatId; report: Report }
  | { type: 'tick' };
