// 1920년 겨울 밤 경성: 비 내리는 거리 그림(public/episodes/conviction/title.webp) 위로 꽃잎이 흩날린다.
// 타이틀 밖 화면(프롤로그·배역·재판)에서는 어둡게 깔아 글을 읽기 쉽게 한다.
import { useSyncExternalStore } from 'react';
import { display } from '../../client/display';

/** 문서(index.html) 기준 상대 경로 — 설치본(file://)에서도 열리도록 */
const KEY_ART = 'episodes/conviction/title.webp';

const PETALS = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 41) % 100}%`,
  delay: `${-(i * 1.7) % 14}s`,
  duration: `${11 + (i % 5) * 2}s`,
  size: 8 + (i % 4) * 3,
}));

/** art 를 주면 거리 그림 대신 그 그림을 깐다 (프롤로그 컷, 에필로그). soft 는 덜 어둡게 */
export function Scene({ dim, art }: { dim?: boolean | 'soft'; art?: string }) {
  const { effects } = useSyncExternalStore(display.subscribe, display.get);
  return (
    <div className={`cv-scene ${dim === 'soft' ? 'dim soft' : dim ? 'dim' : ''}`} aria-hidden>
      {/* 그림이 바뀌면 새로 그려 천천히 떠오르게 한다 */}
      <div className={`cv-art ${art ? 'cut' : ''}`} key={art ?? KEY_ART} style={{ backgroundImage: `url(${art ?? KEY_ART})` }} />
      {effects && (
        <div className="cv-petals">
          {PETALS.map((p, i) => <span key={i} style={{ left: p.left, width: p.size, height: p.size * 0.7, animationDelay: p.delay, animationDuration: p.duration }} />)}
        </div>
      )}
      <div className="cv-vignette" />
    </div>
  );
}
