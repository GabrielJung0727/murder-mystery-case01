// 판마다 쓰는 사건 데이터: 원작 데이터 위에 진범 변형(variants.ts)을 덮어쓴 결과.
// 엔진과 화면은 CARDS·CHARACTERS 대신 이 함수로 본문·비밀·대사·정답을 읽는다.
// (카드 번호·라운드·장소·제목은 모든 변형에서 같으므로 기존 CARD_BY_ID 를 그대로 써도 된다.)
import { CARDS, CARD_BY_ID } from './cards';
import { CHARACTERS, CLAIMS, DEFENSE, SUSPICION } from './characters';
import { NPC_SCRIPTS, type NpcScript } from './npcScripts';
import { AFTERWORD, ENDINGS, METHOD_OPTIONS, TIME_OPTIONS, TRUTH_SUMMARY, TRUTH_TIMELINE, type EndingId } from './story';
import type { Card, CardId, CharId, Character, Claim } from './types';
import { VARIANTS, type CaseVariant, type DefenseItem, type VariantId } from './variants';

export interface CaseData {
  variant: CaseVariant;
  cards: Card[];
  card: (id: CardId) => Card;
  chars: Character[];
  char: (id: CharId) => Character;
  scripts: Record<CharId, NpcScript>;
  claims: Claim[];
  defense: Record<CharId, DefenseItem[]>;
  suspicion: Record<CardId, CharId>;
  culprit: CharId;
  keyChain: CardId[];
  voteChain: CardId[];
  endings: Record<EndingId, { title: string; text: string }>;
  truthSummary: string;
  truthTimeline: { time: string; event: string; cards: string }[];
  afterword: string;
  /** 엔딩·진상 나레이션 녹음이 이 판의 본문과 같은가 (원작만 녹음됨) */
  voiced: boolean;
  isCorrect: (kind: 'motive' | 'time' | 'method', id: string | null) => boolean;
}

function build(v: CaseVariant): CaseData {
  const cards = CARDS.map((c) => (v.cards[c.id] ? { ...c, ...v.cards[c.id] } : c));
  const cardById = Object.fromEntries(cards.map((c) => [c.id, c])) as Record<CardId, Card>;
  const chars = CHARACTERS.map((c) => (v.characters[c.id] ? { ...c, ...v.characters[c.id] } : c));
  const charById = Object.fromEntries(chars.map((c) => [c.id, c])) as Record<CharId, Character>;
  return {
    variant: v,
    cards,
    card: (id) => cardById[id] ?? CARD_BY_ID[id],
    chars,
    char: (id) => charById[id],
    scripts: { ...NPC_SCRIPTS, ...v.scripts } as Record<CharId, NpcScript>,
    claims: CLAIMS.map((c) => (v.claims[c.id] ? { ...c, ...v.claims[c.id] } : c)),
    defense: { ...DEFENSE, ...v.defense } as Record<CharId, DefenseItem[]>,
    suspicion: { ...SUSPICION, ...v.suspicion } as Record<CardId, CharId>,
    culprit: v.culprit,
    keyChain: v.keyChain,
    voteChain: v.voteChain,
    endings: { ...ENDINGS, ...v.endings },
    truthSummary: v.truthSummary ?? TRUTH_SUMMARY,
    truthTimeline: v.truthTimeline ?? TRUTH_TIMELINE,
    afterword: v.afterword ?? AFTERWORD,
    voiced: v.id === 'v0',
    isCorrect: (kind, id) => {
      if (!id) return false;
      if (kind === 'motive') return id === v.motive;
      return !!(kind === 'time' ? TIME_OPTIONS : METHOD_OPTIONS).find((o) => o.id === id)?.correct;
    },
  };
}

const cache = new Map<VariantId, CaseData>();

export function getCase(id: VariantId = 'v0'): CaseData {
  let c = cache.get(id);
  if (!c) cache.set(id, (c = build(VARIANTS[id] ?? VARIANTS.v0)));
  return c;
}

/** 게임 상태에 맞는 사건 데이터 (예전 저장처럼 variant 가 없으면 원작) */
export const caseOf = (state: { variant?: VariantId }): CaseData => getCase(state.variant ?? 'v0');
