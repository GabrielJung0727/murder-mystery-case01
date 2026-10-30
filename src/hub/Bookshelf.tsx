import { BookOpen, Lock, Power, Settings as SettingsIcon, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { audio } from '../audio/director';
import { APP_VERSION, bridge } from '../client/bridge';
import { display } from '../client/display';
import { Settings } from '../ui/Settings';
import { MenuSound } from '../ui/VolumeControl';
import { EPISODES, lastEpisodeId, rememberEpisode, type Episode } from './episodes';
import './bookshelf.css';

/** 책장 한 칸. 아직 나오지 않은 자리는 봉인된 책으로 채운다 */
type Slot = Episode & { sealed?: boolean };

const SHELF_SIZE = 10;
const SLOTS: Slot[] = [
  ...EPISODES,
  ...Array.from({ length: Math.max(0, SHELF_SIZE - EPISODES.length) }, (_, i): Slot => ({
    id: `sealed-${i}`,
    no: EPISODES.length + i + 1,
    title: '봉인된 기록서',
    genre: '미공개',
    tagline: 'CLASSIFIED ARCHIVE',
    blurb: '아직 서고 깊은 곳에 봉인되어 있는 기록입니다.',
    meta: ['미공개'],
    cover: { base: '#1c1917', edge: '#0b0908', ink: '#6f665d' },
    sealed: true,
  })),
];

/** 책마다 높이(선반 안쪽 %)와 두께(px)를 조금씩 달리한다 */
const SIZES: [number, number][] = [[90, 64], [86, 62], [88, 56], [81, 52], [92, 60], [84, 54], [87, 58], [91, 62], [82, 50], [89, 56]];

const OPEN_MS = 700;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const epNo = (n: number) => String(n).padStart(2, '0');

export function Bookshelf({ onOpen }: { onOpen: (ep: Episode) => void }) {
  const [sel, setSel] = useState(() => Math.max(0, SLOTS.findIndex((e) => e.id === lastEpisodeId())));
  const [opening, setOpening] = useState(false);
  const [settings, setSettings] = useState(false);
  const { effects } = useSyncExternalStore(display.subscribe, display.get);
  const root = useRef<HTMLDivElement>(null);
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

  // 마우스를 따라 서가 전체가 살짝 기운다 (렌더 없이 CSS 변수만 바꾼다)
  const tilt = (x: number, y: number) => {
    root.current?.style.setProperty('--tx', x.toFixed(2));
    root.current?.style.setProperty('--ty', y.toFixed(2));
  };
  const parallax = effects && !reducedMotion();

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
    <div
      ref={root}
      className={`screen hub ${opening ? 'opening' : ''}`}
      onMouseMove={parallax ? (e) => tilt((e.clientX / window.innerWidth - 0.5) * 8, (e.clientY / window.innerHeight - 0.5) * -5) : undefined}
      onMouseLeave={parallax ? () => tilt(0, 0) : undefined}
    >
      <div className="hub-bg" aria-hidden>
        <div className="hub-stacks" />
        <svg className="hub-hall" viewBox="0 0 1920 1080" preserveAspectRatio="none">
          <defs>
            <linearGradient id="hub-pillar" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#080504" />
              <stop offset="50%" stopColor="#261810" />
              <stop offset="100%" stopColor="#080504" />
            </linearGradient>
            <radialGradient id="hub-arch-glow" cx="50%" cy="20%" r="60%">
              <stop offset="0%" stopColor="rgba(229, 169, 60, 0.28)" />
              <stop offset="50%" stopColor="rgba(140, 65, 20, 0.08)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <rect width="1920" height="1080" fill="url(#hub-arch-glow)" />
          <rect x="0" width="170" height="1080" fill="url(#hub-pillar)" />
          <rect x="1750" width="170" height="1080" fill="url(#hub-pillar)" />
          <rect x="165" width="6" height="1080" fill="#5c3d24" opacity="0.4" />
          <rect x="1749" width="6" height="1080" fill="#5c3d24" opacity="0.4" />
          <path d="M0,0 L1920,0 L1920,260 Q960,80 0,260 Z" fill="#090605" stroke="#4a321f" strokeWidth="3" />
          <path d="M140,0 L1780,0 L1780,210 Q960,55 140,210 Z" fill="none" stroke="#855c38" strokeWidth="1.5" strokeDasharray="8 6" opacity="0.45" />
        </svg>
        <div className="hub-ray" />
        <div className="hub-floor" />
        {effects && <div className="hub-dust">{Array.from({ length: 14 }, (_, i) => <span key={i} />)}</div>}
        <div className="hub-vignette" />
      </div>

      <div className="hub-wrap">
        <header className="hub-head">
          <span className="hub-kicker">THE GONGJAKSO LIBRARY</span>
          <h1>공작소 도서관</h1>
          <p className="hub-sub"><Sparkles size={12} /> 어느 기록을 펼치시겠습니까</p>
        </header>

        <div className="stage">
          <div className="case">
            <div className="case-crown" />
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
                    <span className="b-spine">
                      <span className="spine-no">EP.{epNo(s.no)}</span>
                      <span className={`spine-title ${s.title.length > 7 && !s.sealed ? 'long' : ''}`}>
                        {s.sealed ? '봉인기록' : s.title}
                      </span>
                      <span className="spine-genre">{s.sealed ? <Lock size={12} /> : s.genre}</span>
                      {state === 'soon' && <span className="spine-band">집필 중</span>}
                    </span>
                    {/* 표지 글씨는 꺼낸 책에만 그린다 (꽂힌 책은 틈새로 글씨가 비치지 않게) */}
                    <span className="b-cover" aria-hidden>
                      {i === sel && (
                        <span className="b-cover-in">
                          <small>EP.{epNo(s.no)} ARCHIVE</small>
                          <b>{s.title}</b>
                          <small>GONGJAKSO</small>
                        </span>
                      )}
                    </span>
                    <span className="b-pages" aria-hidden />
                  </button>
                );
              })}
            </div>
            <div className="case-lip" />
          </div>
        </div>

        <div className="brief-stage">
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
        </div>

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
