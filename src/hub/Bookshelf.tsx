import { BookOpen, Lock, Power, Settings as SettingsIcon, Sparkles } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { audio } from '../audio/director';
import { APP_VERSION, bridge } from '../client/bridge';
import { display } from '../client/display';
import { Settings } from '../ui/Settings';
import { MenuSound } from '../ui/VolumeControl';
import { EPISODES, lastEpisodeId, rememberEpisode, type Episode } from './episodes';
import './bookshelf.css';

/** 책장 한 칸. 아직 나오지 않은 자리는 봉인된 고서로 채운다 */
type Slot = Episode & { sealed?: boolean };

const SHELF_SIZE = 10;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
/** 봉인된 고서의 바랜 가죽 색 */
const AGED_LEATHER = ['#2e241d', '#232d23', '#332429', '#332b1e'];

const SLOTS: Slot[] = [
  ...EPISODES,
  ...Array.from({ length: Math.max(0, SHELF_SIZE - EPISODES.length) }, (_, i): Slot => ({
    id: `sealed-${i}`,
    no: EPISODES.length + i + 1,
    title: '봉인된 고서',
    genre: '미공개',
    tagline: 'SEALED ARCHIVE',
    blurb: '오래된 먼지 아래 봉인되어 있는 공작소의 옛 기록입니다.',
    meta: ['미공개'],
    cover: { base: AGED_LEATHER[i % AGED_LEATHER.length], edge: '#0d0a08', ink: '#6e6256' },
    sealed: true,
  })),
];

/** 책마다 높이(선반 안쪽 %)와 두께(px)를 조금씩 달리한다 */
const SIZES: [number, number][] = [[92, 68], [88, 66], [90, 60], [84, 56], [94, 64], [86, 58], [89, 62], [93, 64], [85, 56], [91, 60]];

/** 공기 중에 떠다니는 먼지 (고정 배치) */
const DUST = Array.from({ length: 28 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  top: `${(i * 53) % 85}%`,
  size: (i % 3) + 1.5,
  duration: 7 + (i % 6) * 2,
  delay: (i % 5) * -1.5,
}));

const OPEN_MS = 700;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const epNo = (n: number) => String(n).padStart(2, '0');

export function Bookshelf({ onOpen }: { onOpen: (ep: Episode) => void }) {
  const [sel, setSel] = useState(() => Math.max(0, SLOTS.findIndex((e) => e.id === lastEpisodeId())));
  const [opening, setOpening] = useState(false);
  const [settings, setSettings] = useState(false);
  const { effects } = useSyncExternalStore(display.subscribe, display.get);
  const slot = SLOTS[sel];

  const pick = (i: number) => {
    if (i === sel || opening) return;
    audio.sfx('paper', 0.5);
    setSel(i);
  };

  const open = () => {
    if (!slot.Root || opening) return;
    audio.sfx('paper', 0.8);
    rememberEpisode(slot.id);
    if (reducedMotion()) return onOpen(slot);
    setOpening(true);
    setTimeout(() => onOpen(slot), OPEN_MS);
  };

  useEffect(() => {
    if (settings) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') pick((sel + 1) % SLOTS.length);
      else if (e.key === 'ArrowLeft') pick((sel - 1 + SLOTS.length) % SLOTS.length);
      else if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) open();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className={`screen hub ${opening ? 'opening' : ''}`}>
      <svg className="hub-defs" aria-hidden>
        <filter id="hub-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.08 0" />
        </filter>
      </svg>

      <div className="hub-bg" aria-hidden>
        <svg className="hub-hall" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="hub-moon" cx="50%" cy="12%" r="65%">
              <stop offset="0%" stopColor="rgba(196, 154, 82, 0.24)" />
              <stop offset="40%" stopColor="rgba(74, 48, 28, 0.12)" />
              <stop offset="100%" stopColor="rgba(5, 4, 3, 0.98)" />
            </radialGradient>
            <linearGradient id="hub-pillar" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#050403" />
              <stop offset="45%" stopColor="#1c1510" />
              <stop offset="55%" stopColor="#241b14" />
              <stop offset="100%" stopColor="#050403" />
            </linearGradient>
          </defs>
          <rect width="1920" height="1080" fill="url(#hub-moon)" />
          <rect x="60" width="140" height="1080" fill="url(#hub-pillar)" />
          <rect x="1720" width="140" height="1080" fill="url(#hub-pillar)" />
          {/* 고딕 첨두아치 창틀 */}
          <g stroke="#3d2c1e" strokeWidth="2" fill="none" opacity="0.55">
            <path d="M560,500 L560,180 Q760,20 960,180 L960,500" />
            <path d="M960,500 L960,180 Q1160,20 1360,180 L1360,500" />
            <path d="M360,520 Q960,-40 1560,520" strokeWidth="4" stroke="#2b1e14" />
            <line x1="760" y1="95" x2="760" y2="450" strokeDasharray="6 6" />
            <line x1="1160" y1="95" x2="1160" y2="450" strokeDasharray="6 6" />
          </g>
        </svg>
        <div className="hub-ray" />
        {effects && (
          <div className="hub-dust">
            {DUST.map((d, i) => (
              <span key={i} style={{ left: d.left, top: d.top, width: d.size, height: d.size, animationDuration: `${d.duration}s`, animationDelay: `${d.delay}s` }} />
            ))}
          </div>
        )}
        <div className="hub-grain" />
        <div className="hub-vignette" />
      </div>

      <div className="hub-wrap">
        <header className="hub-head">
          <span className="hub-kicker"><i />THE GONGJAKSO LIBRARY<i /></span>
          <h1>공작소 도서관</h1>
          <p className="hub-sub"><Sparkles size={12} /> 어느 기록을 펼치시겠습니까</p>
        </header>

        <div className="stage">
          <div className="case">
            <div className="case-crown">
              <span className="plaque">ARCHIVUM SECRETUM · ANNO MMXXVI</span>
            </div>
            <div className="case-back" />
            <div className="case-side l" />
            <div className="case-side r" />
            <div className="case-floor" />
            <div className="case-row">
              {SLOTS.map((s, i) => {
                const [h, w] = SIZES[i % SIZES.length];
                const state = s.sealed ? 'sealed' : s.Root ? '' : 'soon';
                return (
                  <button
                    key={s.id}
                    className={`book3d ${i === sel ? 'on' : ''} ${state}`}
                    style={{ height: `${h}%`, width: w, '--base': s.cover.base, '--edge': s.cover.edge, '--ink': s.cover.ink } as React.CSSProperties}
                    onClick={() => pick(i)}
                    onDoubleClick={() => i === sel && open()}
                    aria-pressed={i === sel}
                    aria-label={`에피소드 ${s.no} ${s.title}${s.sealed ? ' (봉인)' : s.Root ? '' : ' (집필 중)'}`}
                  >
                    <span className="b-pages" aria-hidden />
                    <span className="b-spine">
                      <span className="b-bands" aria-hidden />
                      <span className="spine-no">EP.{epNo(s.no)}</span>
                      <span className={`spine-title ${s.title.length > 7 && !s.sealed ? 'long' : ''}`}>
                        {s.sealed ? '봉인기록' : s.title}
                      </span>
                      <span className="spine-genre">{s.sealed ? <Lock size={12} /> : s.genre}</span>
                      {state === 'soon' && <span className="spine-band">집필 중</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="case-lip">
              {SLOTS.map((s, i) => <span key={s.id} className={i === sel ? 'on' : ''}>{ROMAN[i]}</span>)}
            </div>
          </div>
        </div>

        <section
          key={slot.id}
          className={`brief ${slot.sealed ? 'sealed' : ''}`}
          style={{ '--base': slot.cover.base, '--edge': slot.cover.edge, '--ink': slot.cover.ink } as React.CSSProperties}
        >
          <div className="brief-face">
            <span className="brief-tag">EPISODE {epNo(slot.no)} · {slot.tagline}</span>
            <h2>{slot.title}</h2>
            <p>{slot.blurb}</p>
            <div className="brief-meta">{slot.meta.map((m) => <span key={m}>{m}</span>)}</div>
          </div>
          <div className="brief-side">
            <button className="btn primary brief-open" onClick={open} disabled={!slot.Root || opening}>
              {slot.Root ? <BookOpen size={16} /> : <Lock size={16} />}
              {slot.Root ? '기록 펼치기' : slot.sealed ? '봉인된 기록' : '집필 중인 기록'}
            </button>
            <span className="brief-hint">← → 로 고르고 Enter 로 펼치기</span>
          </div>
        </section>

        <div className="title-actions">
          <button className="file-tab" onClick={() => { audio.sfx('paper', 0.6); setSettings(true); }}><SettingsIcon size={15} /> 설정</button>
          {bridge && (
            <button className="file-tab danger" onClick={() => { if (window.confirm('게임을 종료할까요?')) void bridge?.quit(); }}>
              <Power size={15} /> 게임 종료
            </button>
          )}
        </div>
      </div>
      <div className="build-line">BUILD v{APP_VERSION}-STABLE // {bridge ? 'STANDALONE .EXE' : 'WEB PREVIEW'}</div>
      <MenuSound />
      {settings && <Settings onClose={() => setSettings(false)} />}
    </div>
  );
}
