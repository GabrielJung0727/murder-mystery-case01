import { ArrowLeft, Gavel, Scale, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { audio } from '../../audio/director';
import { PROLOGUE, ROLES, SETTING, portrait, type RoleId } from './data';
import { Dossier } from './Dossier';
import { Scene } from './Scene';

/** 프롤로그: 한 줄씩 넘긴다 (클릭·Enter·Space) */
export function Prologue({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(1);
  const next = () => (n < PROLOGUE.length ? setN(n + 1) : onDone());
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') next();
      else if (e.key === 'Escape') onDone();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <div className="cv cv-prologue" onClick={next}>
      <Scene dim />
      <div className="cv-prologue-text">
        <span className="cv-kicker">{SETTING.caseNo} · 사건 개요 · {SETTING.date}</span>
        {/* 화면에는 최근 네 줄만 남긴다 */}
        {PROLOGUE.slice(Math.max(0, n - 4), n).map((line) => <p key={line.text} className={line.shot ? 'shot' : ''}>{line.text}</p>)}
        <span className="cv-hint">{n < PROLOGUE.length ? '클릭하여 계속' : '클릭하여 시작'}</span>
      </div>
      <button className="cv-skip" onClick={(e) => { e.stopPropagation(); onDone(); }}>건너뛰기</button>
    </div>
  );
}

/** 배역 고르기: 피고인 셋, 법정 둘 */
export function RoleSelect({ onBack, onPick }: { onBack: () => void; onPick: (role: RoleId) => void }) {
  const [sel, setSel] = useState<RoleId>('prosecutor');
  const role = ROLES.find((r) => r.id === sel)!;
  const group = (side: 'suspect' | 'court') => ROLES.filter((r) => r.side === side);
  return (
    <div className="cv cv-roles">
      <Scene dim />
      <div className="cv-panel cv-roles-panel">
        <header className="cv-panel-head">
          <button className="cv-back" onClick={onBack}><ArrowLeft size={16} /> 타이틀</button>
          <span className="cv-kicker">배역 배부</span>
          <h2>누구의 자리에 서시겠습니까</h2>
        </header>
        {(['suspect', 'court'] as const).map((side) => (
          <section key={side} className="cv-role-group">
            <h3>{side === 'suspect' ? <><UserRound size={14} /> 피고인</> : <><Scale size={14} /> 법정</>}</h3>
            <div className="cv-role-row">
              {group(side).map((r) => (
                <button key={r.id} className={`cv-role ${sel === r.id ? 'on' : ''} ${r.side}`} onClick={() => { audio.sfx('paper', 0.5); setSel(r.id); }}>
                  <img src={portrait(r.id)} alt="" />
                  <b>{r.name}</b>
                  <span>{r.title}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
        <div className="cv-role-detail" key={role.id}>
          <img className="cv-poster" src={portrait(role.id, 'poster')} alt={`${role.name} 인물 포스터`} />
          <Dossier role={role} />
        </div>
        <footer className="cv-role-foot">
          <p className="cv-note">나만 아는 정보와 개인 목표는 재판 중 '내 기록'에서 볼 수 있습니다. 나머지 네 사람은 컴퓨터가 맡습니다.</p>
          <button className="cv-stroke primary" onClick={() => onPick(sel)}><Gavel size={18} /><span>재판 시작</span></button>
        </footer>
      </div>
    </div>
  );
}
