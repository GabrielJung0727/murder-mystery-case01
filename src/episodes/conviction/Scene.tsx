// 1920년 겨울 밤 경성 거리: 총독부 건물, 가로등, 젖은 전찻길, 흩날리는 꽃잎.
// 실제 배경 그림이 들어오기 전까지 쓰는 CSS·SVG 배경이다.
import { useSyncExternalStore } from 'react';
import { display } from '../../client/display';
import { SETTING } from './data';

const PETALS = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 41) % 100}%`,
  delay: `${-(i * 1.7) % 14}s`,
  duration: `${11 + (i % 5) * 2}s`,
  size: 8 + (i % 4) * 3,
}));

/** 건물 창문 격자 (층, 칸) */
const WINDOWS = Array.from({ length: 4 }, (_, row) => Array.from({ length: 14 }, (_, col) => ({ row, col }))).flat();

export function Scene({ paper, dim }: { paper?: boolean; dim?: boolean }) {
  const { effects } = useSyncExternalStore(display.subscribe, display.get);
  return (
    <div className={`cv-scene ${dim ? 'dim' : ''}`} aria-hidden>
      <svg className="cv-defs">
        <filter id="cv-rough">
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" />
          <feDisplacementMap in="SourceGraphic" scale="9" />
        </filter>
      </svg>
      <div className="cv-sky" />
      <svg className="cv-city" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
        <defs>
          <radialGradient id="cv-lamp">
            <stop offset="0%" stopColor="rgba(255, 196, 110, .9)" />
            <stop offset="35%" stopColor="rgba(255, 170, 70, .28)" />
            <stop offset="100%" stopColor="rgba(255, 150, 50, 0)" />
          </radialGradient>
        </defs>
        {/* 좌우 거리 건물 */}
        <path d="M0 900 V180 L120 150 V120 H260 V900 Z M1600 900 V140 L1460 110 V90 H1330 V900 Z" fill="#0c0807" />
        {/* 총독부 건물: 돔, 중앙부, 양 날개 */}
        <g fill="#1a110c">
          <path d="M800 300 q-70 0 -82 70 h164 q-12 -70 -82 -70z" />
          <rect x="792" y="276" width="16" height="26" />
          <rect x="704" y="368" width="192" height="40" />
          <rect x="560" y="404" width="480" height="236" />
          <rect x="430" y="470" width="740" height="170" />
          <path d="M540 404 l40 -26 h440 l40 26z" />
        </g>
        {WINDOWS.map(({ row, col }) => (
          <rect key={`${row}-${col}`} x={455 + col * 50} y={488 + row * 36} width="14" height="20" fill="#f3b45a" opacity={(row * 7 + col * 3) % 5 === 0 ? 0.25 : 0.75} />
        ))}
        <path d="M772 640 v-52 a28 28 0 0 1 56 0 v52z" fill="#f6c06a" opacity=".45" />
        {/* 가로등 */}
        {[260, 420, 1180, 1340].map((x, i) => (
          <g key={x}>
            <rect x={x - 3} y={i % 3 === 0 ? 470 : 520} width="6" height="300" fill="#0a0706" />
            <circle cx={x} cy={i % 3 === 0 ? 466 : 516} r="70" fill="url(#cv-lamp)" />
          </g>
        ))}
        {/* 전차 */}
        <g fill="#140e0a">
          <rect x="250" y="640" width="260" height="120" rx="10" />
          <rect x="1110" y="650" width="200" height="96" rx="8" />
        </g>
        {Array.from({ length: 6 }, (_, i) => <rect key={i} x={266 + i * 40} y="660" width="28" height="34" fill="#e8a24c" opacity=".65" />)}
        {Array.from({ length: 4 }, (_, i) => <rect key={i} x={1124 + i * 44} y="668" width="30" height="28" fill="#e8a24c" opacity=".6" />)}
      </svg>
      <div className="cv-street" />
      {effects && (
        <div className="cv-petals">
          {PETALS.map((p, i) => <span key={i} style={{ left: p.left, width: p.size, height: p.size * 0.7, animationDelay: p.delay, animationDuration: p.duration }} />)}
        </div>
      )}
      {paper && (
        <div className="cv-paper">
          <b>{SETTING.headline}</b>
          <span />
          <span />
          <span />
        </div>
      )}
      <div className="cv-vignette" />
    </div>
  );
}
