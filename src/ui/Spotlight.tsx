import { useEffect, useState } from 'react';
import { CARD_BY_ID } from '../data/cards';
import type { GameState } from '../engine/types';
import { seatName } from './bits';

/** 온라인: 누군가 [제시!]를 누르면 모든 화면 중앙에 증거가 클로즈업된다 */
export function Spotlight({ state }: { state: GameState }) {
  const [shown, setShown] = useState<number | null>(null);
  const s = state.spotlight;

  useEffect(() => {
    if (!s || s.at === shown) return;
    setShown(s.at);
    const t = setTimeout(() => setShown(-1), 3600);
    return () => clearTimeout(t);
  }, [s?.at]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!s || shown !== s.at) return null;
  return (
    <div className="spotlight">
      <div className="col" style={{ alignItems: 'center', gap: 22 }}>
        <div className="shout">증거 제시!</div>
        <div className="muted" style={{ color: '#fff' }}>{seatName(s.seat)}</div>
        <div className="row" style={{ gap: 14 }}>
          {s.cards.map((c) => (
            <div key={c} className="card-sheet" style={{ width: 340 }}>
              <div className="meta">증거 {c} / {CARD_BY_ID[c].location}</div>
              <h3>{CARD_BY_ID[c].title}</h3>
              <p style={{ fontSize: 13 }}>{CARD_BY_ID[c].text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
