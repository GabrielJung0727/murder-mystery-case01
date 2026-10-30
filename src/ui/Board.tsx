import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CARD_BY_ID, CARDS } from '../data/cards';
import type { CardId } from '../data/types';
import type { Action, GameState, SeatId } from '../engine/types';
import { seatColor } from './bits';

const W = 150;
const GAP_X = 16;
const ROW_H = 122;

/** 공개된 순서대로 정렬된 공개 카드 */
export function publicOrder(state: GameState): CardId[] {
  const order: CardId[] = [];
  for (const e of state.log) {
    if (e.kind === 'reveal') for (const c of e.cards ?? []) if (!order.includes(c) && state.cards[c].public) order.push(c);
  }
  for (const c of CARDS) if (state.cards[c.id].public && !order.includes(c.id)) order.push(c.id);
  return order;
}

export function myHand(state: GameState, you: SeatId | null): CardId[] {
  return CARDS.filter((c) => state.cards[c.id].owner === you && !state.cards[c.id].public).map((c) => c.id);
}

const tilt = (id: string) => ((Number(id) * 37) % 7) - 3;

export function Board({ state, you, dispatch, onOpenCard }: {
  state: GameState; you: SeatId | null; dispatch: (a: Action) => void; onOpenCard: (c: CardId) => void;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(700);
  const [drag, setDrag] = useState<{ from: CardId; x: number; y: number } | null>(null);
  const [dropping, setDropping] = useState(false);

  useLayoutEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cards = publicOrder(state);
  const cols = Math.max(1, Math.floor((width - 20) / (W + GAP_X)));
  const pos = useMemo(() => {
    const m: Record<CardId, { x: number; y: number }> = {};
    cards.forEach((id, i) => { m[id] = { x: 16 + (i % cols) * (W + GAP_X), y: 18 + Math.floor(i / cols) * ROW_H }; });
    return m;
  }, [cards.join(','), cols]); // eslint-disable-line react-hooks/exhaustive-deps
  const height = 40 + Math.ceil(cards.length / cols) * ROW_H;
  const pinOf = (id: CardId) => ({ x: pos[id].x + W / 2, y: pos[id].y + 11 });
  const hand = myHand(state, you);
  const canReveal = !!you && state.phase !== 'prologue';

  const local = (e: React.MouseEvent) => {
    const r = boardRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left + boardRef.current!.scrollLeft, y: e.clientY - r.top + boardRef.current!.scrollTop };
  };

  return (
    <>
      <div
        ref={boardRef}
        className={`board ${dropping ? 'dragover' : ''}`}
        onMouseMove={(e) => drag && setDrag({ ...drag, ...local(e) })}
        onMouseUp={() => setDrag(null)}
        onMouseLeave={() => setDrag(null)}
        onDragOver={(e) => { if (canReveal) { e.preventDefault(); setDropping(true); } }}
        onDragLeave={() => setDropping(false)}
        onDrop={(e) => {
          setDropping(false);
          const id = e.dataTransfer.getData('text/card');
          if (id && you) dispatch({ type: 'reveal', seat: you, card: id });
        }}
      >
        <div className="board-inner" style={{ height: Math.max(height, 200) }}>
          {cards.length === 0 && (
            <div className="board-empty">아직 공개된 증거가 없습니다.<br />손패의 카드를 이 보드로 끌어다 놓으면 모두에게 공개됩니다.</div>
          )}
          <svg className="strings" width="100%" height={Math.max(height, 200)}>
            {state.strings.filter(([a, b]) => pos[a] && pos[b]).map(([a, b]) => {
              const p = pinOf(a), q = pinOf(b);
              return (
                <line key={`${a}-${b}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y}
                  onClick={() => you && dispatch({ type: 'string', seat: you, a, b })}>
                  <title>클릭하면 연결 해제: 증거 {a} ── 증거 {b}</title>
                </line>
              );
            })}
            {drag && pos[drag.from] && <line className="ghost" x1={pinOf(drag.from).x} y1={pinOf(drag.from).y} x2={drag.x} y2={drag.y} />}
          </svg>
          {cards.map((id) => {
            const c = CARD_BY_ID[id];
            return (
              <div
                key={id}
                className="note-card"
                style={{ left: pos[id].x, top: pos[id].y, transform: `rotate(${tilt(id)}deg)` }}
                onClick={() => !drag && onOpenCard(id)}
                onMouseUp={(e) => {
                  if (drag && drag.from !== id && you) {
                    e.stopPropagation();
                    dispatch({ type: 'string', seat: you, a: drag.from, b: id });
                    setDrag(null);
                  }
                }}
              >
                <span
                  className="pushpin"
                  title="끌어서 다른 카드와 붉은 실로 연결"
                  onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); if (you) setDrag({ from: id, ...local(e) }); }}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="num">증거 {id} · {c.location}</div>
                <div className="ttl">{c.title}</div>
                <div className="who" style={{ background: seatColor(state.cards[id].owner) }} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="dock">
        <span className="label">내 손패</span>
        {hand.length === 0 && <span className="muted" style={{ fontSize: 12 }}>비공개로 보관 중인 카드가 없습니다. 평면도에서 조사하면 이곳에 들어옵니다.</span>}
        {hand.map((id) => (
          <button
            key={id}
            className="hand-card"
            draggable={canReveal}
            onDragStart={(e) => e.dataTransfer.setData('text/card', id)}
            onClick={() => onOpenCard(id)}
            title="클릭: 자세히 보기 · 보드로 끌기: 전체 공개"
          >
            <div className="num">증거 {id} · 비공개</div>
            <div>{CARD_BY_ID[id].title}</div>
          </button>
        ))}
      </div>
    </>
  );
}
