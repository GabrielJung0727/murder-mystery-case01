import { useState } from 'react';
import { CARD_BY_ID, CARDS } from '../data/cards';
import { CHAR_BY_ID, CHAR_IDS, CLAIMS, TIME_MARKERS } from '../data/characters';
import type { CardId } from '../data/types';
import { canSee } from '../engine/engine';
import type { Action, GameState, SeatId } from '../engine/types';
import { Avatar, GameIcon } from './bits';

const START = 23 * 60 + 30; // 23:30
const END = 25 * 60 + 5; // 01:05

function minutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h < 12 ? h + 24 : h) * 60 + m;
}
const pct = (t: string) => `${((minutes(t) - START) / (END - START)) * 100}%`;
const TICKS = ['23:30', '23:45', '00:00', '00:15', '00:30', '00:45', '01:00'];

export function Timeline({ state, you, dispatch }: { state: GameState; you: SeatId | null; dispatch: (a: Action) => void }) {
  const [picked, setPicked] = useState<CardId | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [spark, setSpark] = useState<string | null>(null);
  const visible = you ? CARDS.filter((c) => canSee(state, you, c.id)).map((c) => c.id) : [];

  const tryClaim = (claimId: string, card: CardId | null) => {
    if (!card || !you) return;
    const claim = CLAIMS.find((c) => c.id === claimId)!;
    dispatch({ type: 'contradict', seat: you, claimId, card });
    if (claim.contradictedBy.includes(card)) {
      setSpark(claimId);
      setTimeout(() => setSpark(null), 900);
    }
    setPicked(null);
  };

  return (
    <div className="timeline">
      <p className="muted" style={{ fontSize: 12 }}>
        각 인물이 주장하는 알리바이 블록 위에 증거 카드를 끌어다 놓거나, 카드를 고른 뒤 블록을 클릭하세요. 진술과 어긋나면 모순으로 표시됩니다.
      </p>
      <div className="tl-grid">
        <div />
        <div className="tl-axis">{TICKS.map((t) => <span key={t} style={{ left: pct(t) }}>{t}</span>)}</div>
        {CHAR_IDS.map((char) => {
          const claim = CLAIMS.find((c) => c.char === char)!;
          const marks = state.contradictions.filter((c) => c.claimId === claim.id);
          const contradicted = marks.some((m) => m.ok);
          const verified = marks.some((m) => claim.verifiedBy.includes(m.card));
          const color = CHAR_BY_ID[char].color;
          return (
            <div key={char} style={{ display: 'contents' }}>
              <div className="tl-row-label"><Avatar char={char} /> {CHAR_BY_ID[char].name}</div>
              <div className="tl-track">
                {TIME_MARKERS.filter((m) => state.cards[m.card].public).map((m) =>
                  m.until ? <div key={m.label} className="tl-band" style={{ left: pct(m.time), width: `calc(${pct(m.until)} - ${pct(m.time)})` }} />
                    : <div key={m.label} className="tl-marker" style={{ left: pct(m.time) }} />)}
                <div
                  className={`tl-claim ${over === claim.id ? 'drop' : ''} ${contradicted ? 'contradicted' : ''} ${verified ? 'verified' : ''}`}
                  style={{ left: pct(claim.from), width: `calc(${pct(claim.to)} - ${pct(claim.from)})`, borderColor: color, background: `${color}22` }}
                  title={`${claim.label}${marks.length ? `\n대조한 증거: ${marks.map((m) => m.card).join(', ')}` : ''}`}
                  onClick={() => tryClaim(claim.id, picked)}
                  onDragOver={(e) => { e.preventDefault(); setOver(claim.id); }}
                  onDragLeave={() => setOver(null)}
                  onDrop={(e) => { setOver(null); tryClaim(claim.id, e.dataTransfer.getData('text/card')); }}
                >
                  {contradicted ? <><GameIcon name="contradiction" /> 모순 · </> : verified ? <><GameIcon name="check" /> </> : ''}{claim.label}
                  {spark === claim.id && <span className="spark" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
        {TIME_MARKERS.filter((m) => state.cards[m.card].public).map((m) => (
          <span key={m.label} className={`tag ${m.until ? 'red' : 'amber'}`}>{m.time}{m.until ? `~${m.until}` : ''} {m.label}</span>
        ))}
      </div>
      <div className="col">
        <span className="muted" style={{ fontSize: 12 }}>대조할 증거 (내가 볼 수 있는 카드)</span>
        <div className="tl-chips">
          {visible.length === 0 && <span className="muted" style={{ fontSize: 12 }}>아직 확보한 증거가 없습니다.</span>}
          {visible.map((id) => (
            <span key={id} className={`chip ${picked === id ? 'on' : ''}`} draggable
              onDragStart={(e) => e.dataTransfer.setData('text/card', id)}
              onClick={() => setPicked(picked === id ? null : id)}>
              {id} {CARD_BY_ID[id].title}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
