import { APP_VERSION } from '../client/bridge';
import { CREDIT_SECTIONS, CREDITS_NEXT, CREDITS_QUOTE, CREDITS_SUBTITLE, CREDITS_TBC, CREDITS_TITLE, creditsBuildLine } from '../data/credits';
import { GameIcon, Modal, Stamp } from './bits';

/** 사건 기록실: 타자기로 친 기밀 문서 형태의 크레딧 */
export function Credits({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} tab="ARCHIVE · 사건 기록실">
      <div className="modal-head">
        <h2>사건 기록실</h2>
        <span className="grow" />
        <button className="btn sm ghost" onClick={onClose}>닫기 <GameIcon name="close" /></button>
      </div>
      <div className="paper credits">
        <Stamp tilt={-12}>CLASSIFIED</Stamp>
        <div className="rule double" />
        <div className="c-title">{CREDITS_TITLE}</div>
        <div className="c-sub">{CREDITS_SUBTITLE}</div>
        <div className="rule double" />
        {CREDIT_SECTIONS.map((s) => (
          <section key={s.title} className="c-sec">
            <div className="c-head">■ {s.title}</div>
            {s.lines.map((l) => <div key={l} className="c-line">- {l}</div>)}
          </section>
        ))}
        <div className="rule" />
        <div className="c-quote">{CREDITS_QUOTE}</div>
        <div className="c-next">{CREDITS_NEXT}</div>
        <div className="c-tbc">{CREDITS_TBC}</div>
        <div className="rule" />
        <div className="c-build">{creditsBuildLine(APP_VERSION)}</div>
        <div className="rule double" />
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn" onClick={onClose}>기록실 닫기</button>
      </div>
    </Modal>
  );
}
