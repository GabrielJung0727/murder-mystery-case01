import { useEffect, useRef, useState } from 'react';
import { CARD_BY_ID, CARDS } from '../data/cards';
import { ART, shadedBg } from '../data/art';
import { CHAR_BY_ID, DEFENSE } from '../data/characters';
import { NPC_SCRIPTS } from '../data/npcScripts';
import type { CardId, CharId } from '../data/types';
import { canSee } from '../engine/engine';
import type { Action, GameState, SeatId } from '../engine/types';
import { GameIcon, Modal, Polaroid, Stamp, portraitSrc } from './bits';
import { LogLine } from './SidePanel';
import { TypedText } from './TypedText';

const STATE_STAMP: { text: string; tone: 'gray' | 'amber' | 'red' }[] = [
  { text: '방어 중', tone: 'gray' },
  { text: '1차 균열', tone: 'amber' },
  { text: '방어선 붕괴', tone: 'red' },
];

function Mugshot({ char, no }: { char: CharId; no: number }) {
  const c = CHAR_BY_ID[char];
  return (
    <div className="mugshot" data-no={`No. 0${no} · ${c.name}`}>
      <img className="mug-photo" src={portraitSrc(char)} alt={c.name} draggable={false} />
      <span className="mug-lines" />
    </div>
  );
}

/** 용의자 시점일 때: 내가 지켜야 할 비밀이 지금 얼마나 드러났는지 */
function DefenseBar({ state, you }: { state: GameState; you: SeatId }) {
  if (you === 'detective') return null;
  return (
    <div className="defense">
      <span className="lbl">내 비밀 방어 · {CHAR_BY_ID[you].name}</span>
      {DEFENSE[you].map((d) => {
        const exposed = d.cards.some((c) => state.cards[c].public);
        const holding = d.cards.filter((c) => state.cards[c].owner === you && !state.cards[c].public);
        return (
          <span key={d.label} className={`def-chip ${exposed ? 'exposed' : 'safe'}`}
            title={exposed ? '공용 보드에 공개되었습니다' : holding.length ? `내 손패에 숨겨 둠: 증거 ${holding.join(', ')}` : '아직 드러나지 않음'}>
            <GameIcon name={exposed ? 'exposed' : 'defense'} />{d.label}{holding.length > 0 && !exposed ? ' · 손패' : ''}{exposed ? ' · 노출' : ''}
          </span>
        );
      })}
    </div>
  );
}

export function Interrogation({ state, you, dispatch, initial, onOpenCard, onClose }: {
  state: GameState; you: SeatId; dispatch: (a: Action) => void;
  initial: { target: CharId; cards: CardId[] }; onOpenCard: (c: CardId) => void; onClose: () => void;
}) {
  const [target, setTarget] = useState<CharId>(initial.target);
  const [picked, setPicked] = useState<CardId[]>(initial.cards);
  const logRef = useRef<HTMLDivElement>(null);
  const npcs = state.seats.filter((s) => s.kind === 'npc').map((s) => s.id as CharId);
  const mind = state.npc[target]!;
  const script = NPC_SCRIPTS[target];
  const visible = CARDS.filter((c) => canSee(state, you, c.id)).map((c) => c.id);
  const canPresent = state.phase === 'discuss' || state.phase === 'final';

  const dialog = state.log.filter((e) =>
    (e.kind === 'present' && e.target === target) || (e.kind === 'hint' && e.target === target)
    || (e.speaker === target && (e.kind === 'reaction' || e.kind === 'line' || e.kind === 'reveal' || e.kind === 'system')));
  const lastReaction = [...dialog].reverse().find((e) => e.kind === 'reaction');

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [dialog.length, target]);

  const toggle = (id: CardId) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 3 ? p : [...p, id]));

  return (
    <Modal onClose={onClose} wide tab="INTERROGATION ROOM · 심문실">
      <div className="modal-head">
        <h2>심문실</h2>
        <span className="muted">증거를 최대 3장까지 함께 제시할 수 있습니다.</span>
        <span className="grow" />
        <button className="btn sm ghost" onClick={onClose}>닫기 <GameIcon name="close" /></button>
      </div>
      <DefenseBar state={state} you={you} />
      <div className="interro">
        <div className="interro-list">
          {npcs.map((id, i) => {
            const st = STATE_STAMP[state.npc[id]!.state];
            return (
              <button key={id} className={`susp ${id === target ? 'on' : ''}`} onClick={() => setTarget(id)}>
                <Polaroid char={id} tilt={i % 2 ? 3 : -3} />
                <div className="col" style={{ gap: 4 }}>
                  <b>{CHAR_BY_ID[id].name}</b>
                  <Stamp tone={st.tone} tilt={-4}>{st.text}</Stamp>
                </div>
              </button>
            );
          })}
        </div>
        <div className="interro-main with-art" style={shadedBg(ART.interrogation, 0.72, 0.9)}>
          <div className="row" style={{ gap: 18, alignItems: 'flex-end' }}>
            <Mugshot char={target} no={npcs.indexOf(target) + 1} />
            <div className="col" style={{ gap: 6 }}>
              <span className="kicker-type">SUSPECT · {CHAR_BY_ID[target].mbti}</span>
              <span className="suspect-name">{CHAR_BY_ID[target].name}</span>
              <span className="muted">{script.states[mind.state].label}</span>
            </div>
            <span className="grow" />
            <Stamp tone={STATE_STAMP[mind.state].tone} tilt={-12}>{STATE_STAMP[mind.state].text}</Stamp>
          </div>
          <div className="speech">
            {lastReaction?.tone && <div className="tone">{lastReaction.tone}</div>}
            <div>“{lastReaction ? <TypedText id={lastReaction.id} text={lastReaction.text} /> : script.states[mind.state].line}”</div>
          </div>
          {lastReaction && <div className="muted" style={{ fontSize: 13 }}>현재 입장: “{script.states[mind.state].line}”</div>}
          <div className="dialog-log" ref={logRef}>
            {dialog.filter((e) => e !== lastReaction).map((e) => <LogLine key={e.id} e={e} />)}
          </div>
          <div className="col" style={{ gap: 6 }}>
            <div className="row">
              <span className="kicker-type grow" style={{ fontSize: 11 }}>제시할 증거 ({picked.length}/3)</span>
              {picked.length > 0 && <button className="btn sm ghost" onClick={() => setPicked([])}>선택 해제</button>}
            </div>
            <div className="picker">
              {visible.length === 0 && <span className="muted" style={{ fontSize: 12 }}>제시할 수 있는 증거가 없습니다.</span>}
              {visible.map((id) => (
                <button key={id} className={picked.includes(id) ? 'on' : ''} onClick={() => toggle(id)} onDoubleClick={() => onOpenCard(id)} title="더블클릭: 카드 보기">
                  {id} {CARD_BY_ID[id].title}
                </button>
              ))}
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              {!canPresent && <span className="muted" style={{ fontSize: 12 }}>조사 단계가 끝나면 증거를 제시할 수 있습니다.</span>}
              <button
                className="btn danger"
                disabled={!canPresent || picked.length === 0}
                onClick={() => {
                  dispatch({ type: 'present', seat: you, target, cards: picked });
                  setPicked([]);
                }}
              >
                증거 제시!
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
