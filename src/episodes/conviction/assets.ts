// EP.02 그림 자리. docs/에셋_요청서.md 의 ID 로 온 그림을 scripts/prepare_conviction_art.py 가 art.json 에 적는다.
// 비어 있는 자리는 CSS 그림과 브라우저 기본 커서로 대신한다. 경로는 문서(index.html) 기준 상대 경로.
import type { CSSProperties } from 'react';
import art from './art.json';
import type { EndingId } from './data';
import type { Phase } from './engine';

type Cursor = { src: string; x: number; y: number };
export type CursorKind = 'default' | 'pointer' | 'wait' | 'disabled' | 'pick' | 'stamp' | 'gavel' | 'text';
type Room = 'court' | 'bench' | 'dock' | 'interview' | 'evidence';

const scene = (id: string): string | undefined => (art.scenes as Record<string, string>)[id];

export const ASSETS: {
  /** CV-BG-* 재판 장소 */
  rooms: Partial<Record<Room, string>>;
  /** CV-CUT-P1 ~ P4 프롤로그 컷 */
  cuts: string[];
  /** CV-END-E1 ~ E6 엔딩 일러스트, CV-END-EP 에필로그 */
  endings: Partial<Record<EndingId | 'EP', string>>;
  /** CV-ICON-STRONG / GUILTY / INNOCENT 도장 */
  stamps: Partial<Record<'strong' | 'guilty' | 'innocent', string>>;
  /** CV-EV-<카드 번호> 증거 사진 */
  evidence: Record<string, string>;
  /** CV-CUR-* 마우스 커서 (x, y 는 클릭되는 끝점) */
  cursors: Partial<Record<CursorKind, Cursor>>;
  /** CV-LOGO 타이틀 로고, CV-COVER 도서관 표지 */
  logo: string | null;
  cover: string | null;
} = {
  rooms: {
    court: scene('CV-BG-COURT'), bench: scene('CV-BG-BENCH'), dock: scene('CV-BG-DOCK'),
    interview: scene('CV-BG-INTERVIEW'), evidence: scene('CV-BG-EVIDENCE'),
  },
  cuts: ['CV-CUT-P1', 'CV-CUT-P2', 'CV-CUT-P3', 'CV-CUT-P4'].map(scene).filter((x): x is string => !!x),
  endings: Object.fromEntries(['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'EP'].map((e) => [e, scene(`CV-END-${e}`)]).filter(([, v]) => v)),
  // 무죄 도장 그림은 두 글자가 한 글자로 뭉쳐 나와 글자 도장을 쓴다 (art.json 에는 들어 있다)
  stamps: { strong: art.stamps.strong, guilty: art.stamps.guilty },
  evidence: art.evidence,
  cursors: art.cursors,
  logo: art.logo,
  cover: art.cover,
};

/** 재판 단계 → 배경 장소. 비밀 대화는 내가 앉은 쪽(법관석·피고인석) */
export function roomFor(phase: Phase, judgeSide: boolean): string | undefined {
  const r = ASSETS.rooms;
  if (phase === 'evidence') return r.evidence ?? r.court;
  if (phase === 'secret') return (judgeSide ? r.bench : r.dock) ?? r.court;
  if (phase === 'final-qa') return r.interview ?? r.court;
  return r.court;
}

/** 프롤로그 몇 번째 줄(1부터)에 어떤 컷을 까는가: 총독 행차 → 총성 → 사라진 범인 → 법정 */
export function cutFor(line: number): string | undefined {
  const i = line <= 3 ? 0 : line === 4 ? 1 : line === 5 ? 2 : 3;
  return ASSETS.cuts[i];
}

const FALLBACK: Record<CursorKind, string> = {
  default: 'auto', pointer: 'pointer', wait: 'progress', disabled: 'not-allowed', pick: 'pointer', stamp: 'pointer', gavel: 'pointer', text: 'text',
};

/**
 * 커서 그림을 CSS 변수로 넘긴다. conviction.css 가 var(--cv-cur-*, 기본값) 으로 쓴다.
 * 사용자 정의 속성 안의 url() 은 쓰이는 곳 기준으로 풀릴 수 있어 절대 주소로 바꿔 둔다.
 */
export function cursorVars(): CSSProperties {
  const vars: Record<string, string> = {};
  for (const [kind, c] of Object.entries(ASSETS.cursors) as [CursorKind, Cursor][]) {
    vars[`--cv-cur-${kind}`] = `url("${new URL(c.src, document.baseURI).href}") ${c.x} ${c.y}, ${FALLBACK[kind]}`;
  }
  return vars as CSSProperties;
}
