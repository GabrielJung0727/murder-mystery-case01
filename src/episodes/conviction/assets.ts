// EP.02 에셋 자리. docs/에셋_요청서.md 의 ID 로 파일이 오면 여기에 경로를 채운다.
// 비어 있는 자리는 CSS 그림과 브라우저 기본 커서로 대신한다. 경로는 문서(index.html) 기준 상대 경로.
import type { CSSProperties } from 'react';
import type { EndingId } from './data';

type Cursor = { src: string; x: number; y: number };
export type CursorKind = 'default' | 'pointer' | 'wait' | 'disabled' | 'pick' | 'stamp' | 'gavel' | 'text';

export const ASSETS: {
  /** CV-BG-COURT 공개 재판 법정 */
  court: string | null;
  /** CV-END-E1 ~ E6 엔딩 일러스트 */
  endings: Partial<Record<EndingId, string>>;
  /** CV-ICON-STRONG / GUILTY / INNOCENT 도장 */
  stamps: Partial<Record<'strong' | 'guilty' | 'innocent', string>>;
  /** CV-CUR-* 마우스 커서 (x, y 는 클릭되는 끝점) */
  cursors: Partial<Record<CursorKind, Cursor>>;
} = {
  court: null,
  endings: {},
  stamps: {},
  cursors: {},
};

/** 커서 그림을 CSS 변수로 넘긴다. conviction.css 가 var(--cv-cur-*, 기본값) 으로 쓴다 */
export function cursorVars(): CSSProperties {
  const vars: Record<string, string> = {};
  for (const [kind, c] of Object.entries(ASSETS.cursors)) vars[`--cv-cur-${kind}`] = `url(${c.src}) ${c.x} ${c.y}`;
  return vars as CSSProperties;
}
