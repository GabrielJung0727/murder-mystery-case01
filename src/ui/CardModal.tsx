import { useRef, useState } from 'react';
import { CARD_BY_ID } from '../data/cards';
import { EVIDENCE_PHOTO, ZONE_ART } from '../data/art';
import { josa } from '../data/josa';
import type { CardId } from '../data/types';
import { canSee } from '../engine/engine';
import type { Action, GameState, SeatId } from '../engine/types';
import { SCENES } from './Illustrations';
import { GameIcon, Modal, seatName } from './bits';

const ZOOM = 2.2;
const LENS = 150; // 렌즈 지름 (px), styles.css .lens-ring 과 같게

function Inspector({ card, found, onFound }: { card: CardId; found: boolean; onFound: () => void }) {
  const scene = SCENES[card];
  const ref = useRef<HTMLDivElement>(null);
  const [m, setM] = useState<{ px: number; py: number; w: number; h: number } | null>(null);

  const move = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    setM({ px: e.clientX - r.left, py: e.clientY - r.top, w: r.width, h: r.height });
  };
  // 이미지 픽셀 → 화면 px 로 바꿔 렌즈 중심과의 거리를 잰다 (렌즈가 걸치기만 해도 조금 봐준다)
  const k = m ? m.w / scene.w : 0;
  const near = !!m && Math.hypot(m.px - scene.hotspot.x * k, m.py - scene.hotspot.y * k) < scene.hotspot.r * k + 12;

  return (
    <div className="col">
      <div ref={ref} className={`inspector ${found ? 'found' : ''}`} onMouseMove={move} onMouseLeave={() => setM(null)} onClick={() => near && !found && onFound()}>
        <img src={scene.src} alt="" draggable={false} style={{ aspectRatio: `${scene.w} / ${scene.h}` }} />
        {m && (
          <div
            className="lens-ring"
            style={{
              left: m.px, top: m.py, borderColor: near ? '#5bd08a' : undefined,
              backgroundImage: `url(${scene.src})`,
              backgroundSize: `${m.w * ZOOM}px ${m.h * ZOOM}px`,
              backgroundPosition: `${LENS / 2 - m.px * ZOOM}px ${LENS / 2 - m.py * ZOOM}px`,
            }}
          />
        )}
      </div>
      {found
        ? <div className="found-tag"><GameIcon name="magnifier" /> 단서 태그 획득: {CARD_BY_ID[card].inspectTag}</div>
        : <span className="muted" style={{ fontSize: 12 }}>돋보기를 움직여 수상한 부분을 찾고 클릭하세요.</span>}
    </div>
  );
}

export function CardModal({ card, state, you, dispatch, onPresent, onClose }: {
  card: CardId; state: GameState; you: SeatId | null; dispatch: (a: Action) => void;
  onPresent: (c: CardId) => void; onClose: () => void;
}) {
  const c = CARD_BY_ID[card];
  const cs = state.cards[card];
  const visible = you ? canSee(state, you, card) : cs.public;
  const mine = cs.owner === you && !!you;
  const [inspect, setInspect] = useState(false);
  const found = !!you && cs.inspectedBy.includes(you);
  const canPresent = !!you && visible && ['investigate', 'discuss', 'final'].includes(state.phase)
    && (state.mode === 'online' || state.phase !== 'investigate');

  return (
    <Modal onClose={onClose} tab={`EVIDENCE No.${c.id}`}>
      <div className="modal-head">
        <span className={`tag ${cs.public ? 'red' : 'amber'}`}>{cs.public ? '공개 증거' : mine ? '내 손패 · 비공개' : '비공개'}</span>
        <span className="tag">ROUND {c.round}</span>
        {cs.owner && <span className="tag">조사: {seatName(cs.owner)}</span>}
        <span className="grow" />
        <button className="btn sm ghost" onClick={onClose}>닫기 <GameIcon name="close" /></button>
      </div>
      {visible ? (
        <>
          {inspect && SCENES[card]
            ? <Inspector card={card} found={found} onFound={() => you && dispatch({ type: 'inspect', seat: you, card })} />
            : (
              <>
              <div className={`room-banner ${EVIDENCE_PHOTO[card] ? 'evidence' : ''}`} style={{ backgroundImage: `url(${EVIDENCE_PHOTO[card] ?? ZONE_ART[c.zone]})` }}>
                <span>{EVIDENCE_PHOTO[card] ? `EVIDENCE ${c.id} · ${c.location}` : c.location}</span>
              </div>
              <div className="card-sheet">
                <div className="meta">증거 {c.id} / ROUND {c.round} / {c.location}</div>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
                {found && <p style={{ marginTop: 10, color: '#2f7a4c', fontWeight: 700 }}><GameIcon name="magnifier" /> {c.inspectTag}</p>}
              </div>
              </>
            )}
          <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {c.inspectTag && <button className="btn" onClick={() => setInspect(!inspect)}>{inspect ? '카드 보기' : <><GameIcon name="magnifier" /> 돋보기 조사</>}</button>}
            {mine && !cs.public && (
              <button className="btn" onClick={() => you && dispatch({ type: 'reveal', seat: you, card })}>전체 공개 (보드에 꽂기)</button>
            )}
            {canPresent && (
              <button className="btn danger" onClick={() => onPresent(card)}>
                {state.mode === 'single' ? '용의자에게 제시!' : '화면 중앙에 제시!'}
              </button>
            )}
          </div>
          {mine && !cs.public && <p className="muted" style={{ fontSize: 12 }}>공개하지 않은 카드는 나만 볼 수 있습니다. 카드의 존재 자체를 거짓으로 꾸밀 수는 없습니다.</p>}
        </>
      ) : (
        <div className="card-sheet"><p>{josa(seatName(cs.owner), '이/가')} 조사한 비공개 카드입니다.</p></div>
      )}
    </Modal>
  );
}
