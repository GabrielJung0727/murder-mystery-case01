import { BookOpen, Power, Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { audio } from '../audio/director';
import { APP_VERSION, bridge } from '../client/bridge';
import { Atmosphere } from '../ui/Atmosphere';
import { Settings } from '../ui/Settings';
import { MenuSound } from '../ui/VolumeControl';
import { EPISODES, lastEpisodeId, rememberEpisode, type Episode } from './episodes';
import './bookshelf.css';

/** 아직 나오지 않은 책 자리 (장식용, 고를 수 없다) */
const BLANKS = [
  { h: 86, w: 44, c: '#2c2620' },
  { h: 92, w: 38, c: '#22262c' },
  { h: 80, w: 50, c: '#30241e' },
  { h: 88, w: 40, c: '#262a22' },
];

const OPEN_MS = 650;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Bookshelf({ onOpen }: { onOpen: (ep: Episode) => void }) {
  const [sel, setSel] = useState(() => Math.max(0, EPISODES.findIndex((e) => e.id === lastEpisodeId())));
  const [opening, setOpening] = useState(false);
  const [settings, setSettings] = useState(false);
  const ep = EPISODES[sel];

  const pick = (i: number) => {
    if (i === sel || opening) return;
    audio.sfx('paper', 0.5);
    setSel(i);
  };

  const open = () => {
    if (!ep.Root || opening) return;
    audio.sfx('paper', 0.8);
    rememberEpisode(ep.id);
    if (reducedMotion()) return onOpen(ep);
    setOpening(true);
    setTimeout(() => onOpen(ep), OPEN_MS);
  };

  useEffect(() => {
    if (settings) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') pick(Math.min(EPISODES.length - 1, sel + 1));
      else if (e.key === 'ArrowLeft') pick(Math.max(0, sel - 1));
      else if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) open();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className={`screen hub ${opening ? 'opening' : ''}`}>
      <div className="hub-lamp" />
      <div className="hub-wrap">
        <header className="hub-head">
          <span className="hub-kicker">ARCHIVE · 사건 서재</span>
          <h1>어느 기록을 펼치시겠습니까</h1>
        </header>

        <div className="shelf">
          <div className="shelf-row">
            <span className="bookend" />
            {EPISODES.map((e, i) => (
              <button
                key={e.id}
                className={`book ${i === sel ? 'on' : ''} ${e.Root ? '' : 'soon'}`}
                style={{ '--base': e.cover.base, '--edge': e.cover.edge, '--ink': e.cover.ink } as React.CSSProperties}
                onClick={() => pick(i)}
                onDoubleClick={() => i === sel && open()}
                aria-pressed={i === sel}
                aria-label={`에피소드 ${e.no} ${e.title}${e.Root ? '' : ' (집필 중)'}`}
              >
                <span className="spine-no">EP.{String(e.no).padStart(2, '0')}</span>
                <span className="spine-title" style={{ fontSize: e.title.length > 7 ? 14 : undefined }}>{e.title}</span>
                <span className="spine-genre">{e.genre}</span>
                {!e.Root && <span className="spine-band">집필 중</span>}
              </button>
            ))}
            {BLANKS.map((b, i) => (
              <span key={i} className="book blank" aria-hidden style={{ height: `${b.h}%`, width: b.w, background: b.c }} />
            ))}
            <span className="bookend right" />
          </div>
          <div className="shelf-board" />
        </div>

        <section
          key={ep.id}
          className="cover"
          style={{ '--base': ep.cover.base, '--edge': ep.cover.edge, '--ink': ep.cover.ink } as React.CSSProperties}
        >
          <div className="cover-face">
            <span className="cover-tag">EPISODE {String(ep.no).padStart(2, '0')} · {ep.tagline}</span>
            <h2>{ep.title}</h2>
            <p>{ep.blurb}</p>
            <div className="cover-meta">{ep.meta.map((m) => <span key={m}>{m}</span>)}</div>
          </div>
          <div className="cover-side">
            {ep.Root ? (
              <button className="btn primary cover-open" onClick={open} disabled={opening}>
                <BookOpen size={16} /> 기록 펼치기
              </button>
            ) : (
              <span className="cover-stamp">집필 중</span>
            )}
            <span className="muted cover-hint">← → 로 고르고 Enter 로 펼치기</span>
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
      <Atmosphere intensity={0.45} />
      <MenuSound />
      {settings && <Settings onClose={() => setSettings(false)} />}
    </div>
  );
}
