import { useState } from 'react';
import { CARD_BY_ID, CARDS } from '../data/cards';
import plan from '../data/floorplan.json';
import type { CardId, ZoneId } from '../data/types';
import { canSee, seatOf } from '../engine/engine';
import type { Action, GameState, SeatId } from '../engine/types';
import { iconSrc, seatName } from './bits';

interface Room { zone: string; label: string; x: number; y: number; w: number; h: number; unlock: number; outside?: boolean }

const W = 1182;
const H = 1330;
const PINS = plan.pins as unknown as Record<CardId, [number, number]>;

/** 펜션 평면도(A-1·A-2 일러스트) 위에 라운드별 잠금과 증거 조사 지점을 그린다 */
export function FloorPlan({ state, you, dispatch, onOpenCard }: {
  state: GameState; you: SeatId | null; dispatch: (a: Action) => void; onOpenCard: (c: CardId) => void;
}) {
  const [floor, setFloor] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const seat = you ? seatOf(state, you) : undefined;
  const canDraw = state.phase === 'investigate' && !!seat && seat.kind === 'human' && seat.ap > 0;
  const f = plan.floors[floor];
  const rooms = f.rooms as Room[];
  const zones = new Set(rooms.map((r) => r.zone as ZoneId));

  const pinClass = (id: CardId) => {
    const cs = state.cards[id];
    if (CARD_BY_ID[id].round > state.round) return 'locked';
    if (cs.public) return 'public';
    if (cs.owner && cs.owner === you) return 'mine';
    if (cs.owner) return 'taken';
    return 'avail';
  };

  const clickPin = (id: CardId) => {
    if (pinClass(id) === 'avail' && canDraw && you) {
      dispatch({ type: 'draw', seat: you, card: id });
      onOpenCard(id);
    } else if (you && canSee(state, you, id)) onOpenCard(id);
  };

  return (
    <div className="plan-wrap">
      <div className="row">
        <div className="tabs">
          {plan.floors.map((fl, i) => <button key={fl.id} className={floor === i ? 'on' : ''} onClick={() => setFloor(i)}>{fl.label}</button>)}
        </div>
        <span className="grow" />
        <span className="muted" style={{ fontSize: 12 }}>{hover ?? (canDraw ? '빛나는 지점을 눌러 조사 (1 AP)' : '')}</span>
      </div>
      <svg className="plan plan-img" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin meet">
        <defs>
          <pattern id="hatch" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="22" height="22" fill="rgba(5, 8, 13, .72)" />
            <line x1="0" y1="0" x2="0" y2="22" stroke="rgba(40, 56, 80, .9)" strokeWidth="7" />
          </pattern>
        </defs>
        <image href={f.image} x={0} y={0} width={W} height={H} />
        {rooms.map((room) => {
          const locked = room.unlock > state.round;
          return (
            <g key={room.zone}>
              {locked && <rect className="room-lock" x={room.x} y={room.y} width={room.w} height={room.h} />}
              <rect className={`room-outline ${room.outside ? 'outside' : ''}`} x={room.x} y={room.y} width={room.w} height={room.h} />
              <text className="room-label" x={room.x + 14} y={room.y + 38}>{room.label}</text>
              {locked && <image href={iconSrc('lock')} x={room.x + 12} y={room.y + room.h - 44} width={32} height={32} />}
              {locked && <text className="room-label lock" x={room.x + 50} y={room.y + room.h - 16}>R{room.unlock}</text>}
            </g>
          );
        })}
        {CARDS.filter((c) => zones.has(c.zone)).map((card) => {
          const [x, y] = PINS[card.id];
          const cls = pinClass(card.id);
          const owner = state.cards[card.id].owner;
          const tip = cls === 'locked' ? `${card.location} · 라운드 ${card.round}에 해금`
            : cls === 'avail' ? `${card.location} · 미조사`
            : cls === 'taken' ? `${card.location} · LOCKED (${seatName(owner)} 조사 완료)`
            : `${card.location} · 증거 ${card.id} ${card.title}`;
          return (
            <g key={card.id} className={`pin ${cls}`} transform={`translate(${x} ${y})`} onClick={() => clickPin(card.id)}
              onMouseEnter={() => setHover(tip)} onMouseLeave={() => setHover(null)}>
              <title>{tip}</title>
              {cls === 'avail' && canDraw && <circle className="halo" r={30} />}
              <circle r={30} />
              {cls === 'taken'
                ? <image href={iconSrc('lock')} x={-17} y={-17} width={34} height={34} />
                : <text textAnchor="middle" dy="9">{card.id}</text>}
            </g>
          );
        })}
      </svg>
      <div className="legend">
        <span className="l-avail">미조사</span><span className="l-mine">내 손패</span><span className="l-taken">타인 조사 완료</span><span className="l-public">공개됨</span>
      </div>
    </div>
  );
}
