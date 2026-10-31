// 재판 화면: 왼쪽 증거 문서함, 가운데 경성 재판장(법대와 피고인석), 오른쪽 공판 기록 (종합 기획서 5.1 '3단 법정 대시보드')
import { ArrowLeft, KeyRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ROLES, SETTING, portrait, roleOf, type RoleId } from './data';
import { cursorVars } from './assets';
import { Caption } from './Caption';
import { Court } from './Court';
import { Docket } from './Docket';
import { Dossier } from './Dossier';
import { applyTrial, type TrialAction, type TrialState } from './engine';
import { EndingView } from './EndingView';
import { saveTrial } from './save';
import { Scene } from './Scene';
import { music, phaseTrack, rain, say, sfx, trialCue } from './sound';

export const nameOf = (id: RoleId) => roleOf(id).name;

export function Trial({ initial, onExit }: { initial: TrialState; onExit: () => void }) {
  const [s, setS] = useState(initial);
  const act = (a: TrialAction) => setS((prev) => applyTrial(prev, a));
  useEffect(() => saveTrial(s), [s]);
  useTrialSound(s);

  if (s.phase === 'ending') return <EndingView s={s} onExit={onExit} />;

  const me = roleOf(s.player);
  return (
    <div className="cv cv-trial" style={cursorVars()}>
      <Scene dim />
      <header className="cv-bar">
        <button className="cv-back" onClick={onExit}><ArrowLeft size={16} /> 타이틀</button>
        <span className="cv-bar-case">京城地方法院 · 公判廷 <small>{SETTING.caseNo}</small></span>
        <span className="cv-me">
          <img src={portrait(s.player)} alt="" />
          {me.name} <small>{me.title}</small>
        </span>
      </header>
      <div className="cv-court-grid">
        <aside className="cv-files"><Files s={s} /></aside>
        <main className="cv-courtroom"><Court s={s} act={act} /></main>
        <aside className="cv-docket"><Docket s={s} act={act} /></aside>
      </div>
      <Caption />
    </div>
  );
}

/** 단계마다 곡을 바꾸고, 상태가 바뀔 때마다 대사와 효과음을 울린다 (엔딩 소리는 EndingView 가 맡는다) */
function useTrialSound(s: TrialState) {
  const prev = useRef<TrialState | null>(null);
  useEffect(() => {
    if (s.phase !== 'ending') {
      music(phaseTrack(s.phase), prev.current ? 2.5 : 3);
      rain(0, 2);
    }
    const cue = trialCue(prev.current, s);
    prev.current = s;
    cue.sfx.forEach((id, i) => setTimeout(() => sfx(id, 0.85), i * 220));
    if (cue.lines.length) say(cue.lines, 0.5);
  }, [s]);
}

type Tab = 'evidence' | 'me' | 'files';

/** 왼쪽 증거 문서함: 내 증거 / 내 기록(비밀·개인 기록·목표) / 다른 인물의 공개 파일 */
function Files({ s }: { s: TrialState }) {
  const [tab, setTab] = useState<Tab>('evidence');
  const hand = s.hands[s.player];
  return (
    <>
      <nav className="cv-tabs">
        {([['evidence', `증거 ${hand.length}`], ['me', '내 기록'], ['files', '인물 파일']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>
      <div className="cv-files-body">
        {tab === 'evidence' && (
          <>
            {hand.length === 0 && <p className="cv-muted">아직 얻은 증거가 없습니다. 증거 배분 때 피고인석의 버튼으로 증거를 받습니다.</p>}
            <ul className="cv-slips">
              {[...hand].reverse().map((id) => {
                const c = s.cards[id];
                return (
                  <li key={id} className={`cv-slip ${c.kind} ${c.key ? 'key' : ''}`}>
                    <span className="cv-slip-no">證 {c.id}</span>
                    <span className="cv-slip-tag">{c.key ? <><KeyRound size={11} /> 핵심 증거</> : c.kind === 'innocence' ? '무죄 증거' : '공격 증거'} · {nameOf(c.about)}</span>
                    <b>{c.title}</b>
                    <p>{c.text}</p>
                    <i className="cv-slip-seal">押收</i>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        {tab === 'me' && <Dossier role={roleOf(s.player)} full />}
        {tab === 'files' && ROLES.filter((r) => r.id !== s.player).map((r) => <Dossier key={r.id} role={r} />)}
      </div>
    </>
  );
}
