import { useState } from 'react';
import { CARD_BY_ID, CARDS } from '../data/cards';
import { CHAR_IDS, CHAR_BY_ID } from '../data/characters';
import { josa, type JosaPair } from '../data/josa';
import { METHOD_OPTIONS, MOTIVE_OPTIONS, TIME_OPTIONS } from '../data/story';
import type { CardId, CharId } from '../data/types';
import { canSee, seatOf } from '../engine/engine';
import type { Action, GameState, Report, SeatId } from '../engine/types';
import { GameIcon, Modal } from './bits';

type Slot = 'culprit' | 'motive' | 'time' | 'method' | 'e0' | 'e1' | 'e2';

/** 빈칸 채우기 추리 노트 (기획서 4.3) */
export function FinalReport({ state, you, dispatch, onClose }: {
  state: GameState; you: SeatId; dispatch: (a: Action) => void; onClose: () => void;
}) {
  const [r, setR] = useState<Report>({ culprit: null, motive: null, time: null, method: null, evidence: [] });
  const [active, setActive] = useState<Slot>('culprit');
  const submitted = !!seatOf(state, you)?.submitted;
  const visible = CARDS.filter((c) => canSee(state, you, c.id)).map((c) => c.id);
  const evidenceIndex = active.startsWith('e') ? Number(active[1]) : -1;

  const label = (slot: Slot): string | null => {
    switch (slot) {
      case 'culprit': return r.culprit ? CHAR_BY_ID[r.culprit].name : null;
      case 'motive': return MOTIVE_OPTIONS.find((o) => o.id === r.motive)?.label ?? null;
      case 'time': return TIME_OPTIONS.find((o) => o.id === r.time)?.label ?? null;
      case 'method': return METHOD_OPTIONS.find((o) => o.id === r.method)?.label ?? null;
      default: {
        const c = r.evidence[Number(slot[1])];
        return c ? `증거 ${c} ${CARD_BY_ID[c].title}` : null;
      }
    }
  };
  const S = ({ slot, ph }: { slot: Slot; ph: string }) => (
    <span className={`slot ${label(slot) ? '' : 'empty'} ${active === slot ? 'active' : ''}`} onClick={() => setActive(slot)}>
      {label(slot) ?? ph}
    </span>
  );

  const setEvidence = (card: CardId) => {
    const ev = [...r.evidence];
    const existing = ev.indexOf(card);
    if (existing >= 0) ev.splice(existing, 1);
    ev[Math.min(evidenceIndex, ev.length)] = card;
    setR({ ...r, evidence: ev.filter(Boolean).slice(0, 3) });
    if (evidenceIndex < 2) setActive(`e${Math.min(evidenceIndex + 1, ev.length)}` as Slot);
  };
  const ready = !!(r.culprit && r.motive && r.time && r.method);
  /** 채워진 빈칸 뒤에 맞는 조사를 붙인다 */
  const P = (word: string | null, pair: JosaPair) => (word ? josa(word, pair).slice(word.length) : pair.replace('/', '(') + ')');
  const lastEvidence = r.evidence.length ? CARD_BY_ID[r.evidence[r.evidence.length - 1]].title : null;

  return (
    <Modal onClose={onClose} wide tab="FINAL REPORT · 사건 최종 결론">
      <div className="modal-head">
        <h2>사건 최종 결론 보고서</h2>
        <span className="muted">빈칸을 눌러 선택하세요. 제출 후에는 수정할 수 없습니다.</span>
        <span className="grow" />
        <button className="btn sm ghost" onClick={onClose}>닫기 <GameIcon name="close" /></button>
      </div>
      {submitted ? (
        <div className="sheet-section"><h4>제출 완료</h4><p>다른 플레이어의 제출을 기다리는 중입니다. 모두 제출하면 투표 결과와 엔딩이 공개됩니다.</p></div>
      ) : (
        <>
          <div className="report">
            <S slot="culprit" ph="인물" />{P(label('culprit'), '은/는')} <S slot="motive" ph="동기" /> 때문에 피해자와 다투다 범행을 저질렀다.
            <br />사망 추정 시각은 <S slot="time" ph="시간" /> 사이이며, 피해자는 <S slot="method" ph="수법" /> 사망했다.
            <br />범인이 현장을 빠져나와 흔적을 정리했다는 사실은 <S slot="e0" ph="증거 1" />, <S slot="e1" ph="증거 2" />, <S slot="e2" ph="증거 3 (선택)" />{P(lastEvidence, '을/를')} 통해 입증된다.
          </div>
          <div className="options">
            {active === 'culprit' && CHAR_IDS.map((c: CharId) => (
              <button key={c} className={r.culprit === c ? 'on' : ''} onClick={() => { setR({ ...r, culprit: c }); setActive('motive'); }}>{CHAR_BY_ID[c].name}</button>
            ))}
            {active === 'motive' && MOTIVE_OPTIONS.map((o) => (
              <button key={o.id} className={r.motive === o.id ? 'on' : ''} onClick={() => { setR({ ...r, motive: o.id }); setActive('time'); }}>{o.label}</button>
            ))}
            {active === 'time' && TIME_OPTIONS.map((o) => (
              <button key={o.id} className={r.time === o.id ? 'on' : ''} onClick={() => { setR({ ...r, time: o.id }); setActive('method'); }}>{o.label}</button>
            ))}
            {active === 'method' && METHOD_OPTIONS.map((o) => (
              <button key={o.id} className={r.method === o.id ? 'on' : ''} onClick={() => { setR({ ...r, method: o.id }); setActive('e0'); }}>{o.label}</button>
            ))}
            {evidenceIndex >= 0 && visible.map((c) => (
              <button key={c} className={r.evidence.includes(c) ? 'on' : ''} onClick={() => setEvidence(c)}>{c} {CARD_BY_ID[c].title}</button>
            ))}
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            {!ready && <span className="muted" style={{ fontSize: 12 }}>범인·동기·시간·수법을 채워야 제출할 수 있습니다.</span>}
            {ready && r.evidence.length < 2 && <span className="muted" style={{ fontSize: 12 }}>증거를 2장 이상 연결해야 증거 점수(1점)를 받을 수 있습니다.</span>}
            <button className="btn primary" disabled={!ready}
              onClick={() => { if (window.confirm('이 내용으로 최종 보고서를 제출할까요?')) dispatch({ type: 'submit', seat: you, report: r }); }}>
              제출
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
