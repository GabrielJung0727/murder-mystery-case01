import { useState } from 'react';
import { APP_VERSION } from '../client/bridge';
import { CREDIT_SECTIONS, CREDITS_NEXT, CREDITS_QUOTE, CREDITS_SUBTITLE, CREDITS_TBC, CREDITS_TITLE, creditsBuildLine } from '../data/credits';
import LICENSES from '../data/licenses.json';
import { GameIcon, Modal, Stamp } from './bits';

/** 사건 기록실: 타자기로 친 기밀 문서 형태의 크레딧 */
export function Credits({ onClose }: { onClose: () => void }) {
  const [full, setFull] = useState<string | null>(null);
  const showFull = () => {
    // file:// 에서는 fetch 가 막히므로 번들 조각으로 불러온다
    import('../data/THIRD_PARTY_NOTICES.txt?raw').then((m) => setFull(m.default)).catch(() => setFull('라이선스 전문을 불러오지 못했습니다.'));
  };
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
      {/* 제공받은 크레딧 원문과 섞지 않도록 별도 문서로 둔다 */}
      <details className="paper licenses">
        <summary>오픈소스 라이선스 고지</summary>
        <p className="muted">이 게임은 아래 오픈소스 소프트웨어와 글꼴을 사용합니다. 각 라이선스의 전문은 함께 제공됩니다.</p>
        <ul>
          {LICENSES.map((l) => (
            <li key={l.name}><b>{l.name}</b> {l.version} · {l.license}{l.note && <span className="muted"> — {l.note}</span>}</li>
          ))}
        </ul>
        {full === null
          ? <button className="btn sm" onClick={showFull}>라이선스 전문 보기</button>
          : <pre className="license-text">{full}</pre>}
      </details>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn" onClick={onClose}>기록실 닫기</button>
      </div>
    </Modal>
  );
}
