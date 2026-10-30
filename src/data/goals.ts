// 역할별 개인 목표: 판이 끝나면 자동으로 판정해 1개당 1점을 준다.
// 진범을 맡으면(변형에 따라 달라짐) 진범용 목표로 바뀐다.
import type { GameState, Report, SeatId } from '../engine/types';
import type { CaseData } from './caseData';
import type { CharId } from './types';

export interface GoalContext {
  state: GameState;
  seat: SeatId;
  data: CaseData;
  tally: Record<CharId, number>;
  /** 최다 득표자 (동률이면 여러 명, 표가 없으면 빈 배열) */
  top: CharId[];
  report: Report | undefined;
}

export interface Goal {
  id: string;
  label: string;
  check: (ctx: GoalContext) => boolean;
}

const hidden = (card: string) => ({ state }: GoalContext) => !state.cards[card]?.public;
const notTop = (who: CharId) => ({ top }: GoalContext) => !top.includes(who);
const votedCulprit: Goal = { id: 'vote', label: '최종 보고서에서 진범을 지목한다', check: ({ report, data }) => report?.culprit === data.culprit };

const INNOCENT: Record<CharId, Goal[]> = {
  seongcheol: [
    { id: 'secret', label: '로비 영수증(증거 13)이 끝까지 공개되지 않는다', check: hidden('13') },
    { id: 'safe', label: '이성철이 최다 득표자가 되지 않는다', check: notTop('seongcheol') },
    votedCulprit,
  ],
  yeojin: [
    { id: 'friends', label: '남여진·김아린 모두 최다 득표자가 되지 않는다', check: (c) => notTop('yeojin')(c) && notTop('arin')(c) },
    { id: 'secret', label: '정재우와의 복구된 메시지(증거 30)가 공개되지 않는다', check: hidden('30') },
    votedCulprit,
  ],
  arin: [
    { id: 'photo', label: '00:23 사진(증거 34)이 공용 보드에 공개된다', check: ({ state }) => !!state.cards['34']?.public },
    { id: 'safe', label: '김아린이 최다 득표자가 되지 않는다', check: notTop('arin') },
    votedCulprit,
  ],
  jaegu: [
    { id: 'safe', label: '정재구가 최다 득표자가 되지 않고 1표 이하를 받는다', check: (c) => notTop('jaegu')(c) && c.tally.jaegu <= 1 },
    { id: 'secret', label: '식사 대접 영수증(증거 13)이 공개되지 않는다', check: hidden('13') },
    votedCulprit,
  ],
  seonbin: [
    { id: 'safe', label: '이선빈이 최다 득표자가 되지 않는다', check: notTop('seonbin') },
    { id: 'secret', label: '사의 메모(증거 04)가 공개되지 않는다', check: hidden('04') },
    votedCulprit,
  ],
};

const CULPRIT_GOALS: Goal[] = [
  { id: 'escape', label: '최다 득표자가 되지 않는다', check: ({ top, data }) => !top.includes(data.culprit) },
  { id: 'scapegoat', label: '다른 한 사람이 단독 최다 득표자가 된다', check: ({ top, data }) => top.length === 1 && top[0] !== data.culprit },
  {
    id: 'bury', label: '결정적 증거 중 2장 이상을 끝까지 숨긴다',
    check: ({ state, data }) => data.voteChain.filter((c) => !state.cards[c]?.public).length >= 2,
  },
];

const DETECTIVE: Goal[] = [
  { id: 'confess', label: '진범의 자백을 받아낸다', check: ({ state }) => state.solved },
  {
    id: 'break', label: '모든 용의자의 방어선을 한 번 이상 무너뜨린다',
    check: ({ state }) => Object.values(state.npc).every((m) => (m?.state ?? 0) >= 1),
  },
  { id: 'clean', label: '헛짚은 증거 제시를 3회 이하로 끝낸다', check: ({ state }) => (state.stats?.misses ?? 0) <= 3 },
];

export function goalsFor(seat: SeatId, data: CaseData): Goal[] {
  if (seat === 'detective') return DETECTIVE;
  return seat === data.culprit ? CULPRIT_GOALS : INNOCENT[seat];
}
