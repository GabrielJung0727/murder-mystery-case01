import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';
import type { CardId, ZoneId } from '../data/types';

export interface FilmShot {
  src: string;
  title: string;
  zones: ZoneId[];
}

/**
 * 필름 뷰어: 주변을 암전시키고 현장 사진과 그 장소의 단서만 남긴다.
 * 확보한 단서는 이름이, 아직 못 찾은 단서는 자리만 보인다.
 */
export function FilmViewer({ shots, index, onIndex, onClose, cards, onOpenCard, round }: {
  shots: FilmShot[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  cards: (zones: ZoneId[]) => { id: CardId; known: boolean; title: string; round: number }[];
  onOpenCard?: (c: CardId) => void;
  round: number;
}) {
  const shot = shots[index];
  const list = cards(shot.zones);
  const go = (d: number) => onIndex((index + d + shots.length) % shots.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="film" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="film-stage" key={shot.src}>
        <div className="film-photo">
          <img src={shot.src} alt={shot.title} />
          <span className="film-grain" />
          <span className="film-vignette" />
          <span className="film-rec">● REC · {shot.title.toUpperCase()} · 01:03</span>
        </div>
        <aside className="film-clues">
          <span className="kicker-type">SCENE · 현장 기록</span>
          <h2>{shot.title}</h2>
          <ul>
            {list.map((c) =>
              c.known ? (
                <li key={c.id}>
                  <button onClick={() => onOpenCard?.(c.id)} disabled={!onOpenCard}>
                    <span className="ev-no">#{c.id}</span> {c.title}
                  </button>
                </li>
              ) : (
                <li key={c.id} className="unknown">
                  <span className="ev-no">#{c.id}</span> {c.round > round ? `라운드 ${c.round}에 해금` : '미확보 단서'}
                </li>
              ),
            )}
          </ul>
          <p className="film-hint">← → 사진 넘기기 · Esc 닫기</p>
        </aside>
      </div>
      <div className="film-strip">
        <button className="film-nav" onClick={() => go(-1)} aria-label="이전"><ChevronLeft size={22} /></button>
        {shots.map((s, i) => (
          <button key={s.src} className={`film-thumb ${i === index ? 'on' : ''}`} onClick={() => onIndex(i)}>
            <img src={s.src} alt={s.title} />
          </button>
        ))}
        <button className="film-nav" onClick={() => go(1)} aria-label="다음"><ChevronRight size={22} /></button>
      </div>
    </div>
  );
}
