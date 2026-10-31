// 기록 화면: 본 엔딩, 재판을 마친 역할, 도전 과제
import { ArrowLeft, Award } from 'lucide-react';
import { ENDINGS, ROLES, portrait, type EndingId } from './data';
import { ACHIEVEMENTS, records } from './records';
import { Scene } from './Scene';

export function RecordsView({ onBack }: { onBack: () => void }) {
  const r = records.get();
  const got = Object.keys(r.achievements).length;
  return (
    <div className="cv cv-records">
      <Scene dim />
      <div className="cv-panel cv-records-panel">
        <header className="cv-panel-head">
          <button className="cv-back" onClick={onBack}><ArrowLeft size={16} /> 타이틀</button>
          <span className="cv-kicker">公判 記錄</span>
          <h2>재판 기록</h2>
        </header>

        <section className="cv-records-sec">
          <h3>판결 · {r.endings.length}/{Object.keys(ENDINGS).length}</h3>
          <ul className="cv-records-endings">
            {(Object.keys(ENDINGS) as EndingId[]).map((id) => {
              const seen = r.endings.includes(id);
              return (
                <li key={id} className={seen ? 'seen' : ''}>
                  <small>{id}</small>
                  <b>{seen ? ENDINGS[id].tag : '봉인된 판결'}</b>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="cv-records-sec">
          <h3>선 자리 · {r.roles.length}/{ROLES.length}</h3>
          <ul className="cv-records-roles">
            {ROLES.map((x) => (
              <li key={x.id} className={r.roles.includes(x.id) ? 'done' : ''}>
                <img src={portrait(x.id)} alt="" />
                <span>{x.name}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="cv-records-sec">
          <h3><Award size={14} /> 도전 과제 · {got}/{ACHIEVEMENTS.length}</h3>
          <ul className="cv-achv-grid">
            {ACHIEVEMENTS.map((a) => {
              const at = r.achievements[a.id];
              return (
                <li key={a.id} className={at ? 'got' : ''}>
                  <b>{at ? a.title : '???'}</b>
                  <span>{a.desc}</span>
                  {at && <small>{new Date(at).toLocaleDateString('ko-KR')}</small>}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
