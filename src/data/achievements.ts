// 도전 과제: 판이 끝날 때 플레이어 한 명 기준으로 판정한다 (진행도는 client/progress.ts 에 저장).
import type { EndingId } from './story';
import type { Rank, SeatId } from '../engine/types';
import type { VariantId } from './variants';

/** 한 판의 요약 (엔딩 화면에서 만든다) */
export interface GameSummary {
  variant: VariantId;
  mode: 'single' | 'online';
  hard: boolean;
  you: SeatId;
  ending: EndingId;
  isCulprit: boolean;
  /** 진범을 맞혔는가 (진범 역할이면 false) */
  named: boolean;
  /** 진범 역할로 최다 득표를 피했는가 */
  escaped: boolean;
  solved: boolean;
  rank: Rank;
  reportPoints: number;
  goalsDone: number;
  goalsTotal: number;
  misses: number;
  publicCards: number;
  inspected: number;
  contradictions: number;
}

/** 여러 판에 걸친 기록 (도전 과제 판정용) */
export interface Records {
  endings: EndingId[];
  /** 진범을 맞힌 사건 기록 */
  solvedCases: VariantId[];
  /** 엔딩까지 본 싱글 시점 */
  clearedViews: SeatId[];
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  check: (g: GameSummary, r: Records) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_night', title: '첫 번째 밤', desc: '사건을 끝까지 마친다.', check: () => true },
  { id: 'truth', title: '진상 도달', desc: '최종 보고서에서 진범을 지목한다.', check: (g) => g.named },
  { id: 'case_a', title: '사건 기록 A', desc: '사건 기록 A의 진범을 밝힌다.', check: (_g, r) => r.solvedCases.includes('v0') },
  { id: 'case_b', title: '사건 기록 B', desc: '사건 기록 B의 진범을 밝힌다.', check: (_g, r) => r.solvedCases.includes('v1') },
  { id: 'case_c', title: '사건 기록 C', desc: '사건 기록 C의 진범을 밝힌다.', check: (_g, r) => r.solvedCases.includes('v2') },
  { id: 'all_cases', title: '세 개의 진실', desc: '모든 사건 기록의 진범을 밝힌다.', check: (_g, r) => ['v0', 'v1', 'v2'].every((v) => r.solvedCases.includes(v as VariantId)) },
  { id: 'hard', title: '어려운 밤', desc: '어려움 모드에서 진범을 지목한다.', check: (g) => g.hard && g.named },
  { id: 'rank_s', title: 'S 랭크', desc: '한 판에서 S 랭크를 받는다.', check: (g) => g.rank === 'S' },
  { id: 'perfect', title: '완벽한 보고서', desc: '최종 보고서 5점 만점을 받는다.', check: (g) => g.reportPoints === 5 },
  { id: 'goals', title: '숨은 목적', desc: '개인 목표를 모두 달성한다.', check: (g) => g.goalsTotal > 0 && g.goalsDone === g.goalsTotal },
  { id: 'confession', title: '무너진 방어선', desc: '싱글 플레이에서 진범의 자백을 받아낸다.', check: (g) => g.mode === 'single' && g.solved },
  { id: 'flawless', title: '헛짚지 않는다', desc: '싱글 플레이에서 헛짚은 제시 없이 진범을 지목한다.', check: (g) => g.mode === 'single' && g.named && g.misses === 0 },
  { id: 'minimal', title: '최소한의 증거', desc: '공개된 증거가 12장 이하인 채로 진범을 지목한다.', check: (g) => g.named && g.publicCards <= 12 },
  { id: 'magnifier', title: '돋보기의 눈', desc: '한 판에서 돋보기 단서를 3개 이상 찾는다.', check: (g) => g.inspected >= 3 },
  { id: 'timeline', title: '모순 사냥꾼', desc: '한 판에서 진술의 모순을 3개 이상 찾아낸다.', check: (g) => g.contradictions >= 3 },
  { id: 'escape', title: '완전 범죄', desc: '진범 역할을 맡아 지목을 피한다.', check: (g) => g.isCulprit && g.escaped },
  { id: 'endings', title: '네 개의 결말', desc: '엔딩 A·B·C·D를 모두 본다.', check: (_g, r) => r.endings.length >= 4 },
  {
    id: 'viewpoints', title: '다섯 개의 시선', desc: '싱글 플레이의 다섯 시점을 모두 엔딩까지 플레이한다.',
    check: (_g, r) => (['detective', 'seongcheol', 'jaegu', 'yeojin', 'arin'] as SeatId[]).every((v) => r.clearedViews.includes(v)),
  },
];
