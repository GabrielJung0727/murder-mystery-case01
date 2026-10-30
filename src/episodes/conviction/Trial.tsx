import { ArrowLeft, Gavel, KeyRound, Shield, Swords } from 'lucide-react';
import { useEffect, useState } from 'react';
import { audio } from '../../audio/director';
import { CLOSING, ENDINGS, KEY_ITEMS, RULES, SUSPECTS, roleOf, type KeyItem, type RoleId, type SuspectId } from './data';
import { applyTrial, found, pickBlocked, type Phase, type TrialAction, type TrialState } from './engine';
import { saveTrial } from './save';
import { Scene } from './Scene';

const PHASE_NAME: Record<Phase, string> = {
  evidence: '증거 배분', secret: '비밀 대화', trial: '공개 재판', 'final-qa': '최후 질의', sentence: '구형', verdict: '판결', ending: '엔딩',
};
const ROUND_STEPS: Phase[] = ['evidence', 'secret', 'trial'];
const nameOf = (id: RoleId) => roleOf(id).name;

export function Trial({ initial, onExit }: { initial: TrialState; onExit: () => void }) {
  const [s, setS] = useState(initial);
  const act = (a: TrialAction) => setS((prev) => applyTrial(prev, a));
  useEffect(() => saveTrial(s), [s]);
  const me = roleOf(s.player);
  const inRound = ROUND_STEPS.includes(s.phase);

  return (
    <div className="cv cv-trial">
      <Scene dim />
      <header className="cv-bar">
        <button className="cv-back" onClick={onExit}><ArrowLeft size={16} /> 타이틀</button>
        <div className="cv-bar-mid">
          <span className="cv-kicker">{inRound ? `제${s.round}라운드` : '최종 재판'}</span>
          <ol className="cv-steps">
            {(inRound ? ROUND_STEPS : (['final-qa', 'sentence', 'verdict', 'ending'] as Phase[])).map((p) => (
              <li key={p} className={p === s.phase ? 'on' : ''}>{PHASE_NAME[p]}</li>
            ))}
          </ol>
        </div>
        <span className="cv-me">{me.name} <small>{me.title}</small></span>
      </header>

      <div className="cv-trial-body">
        <aside className="cv-panel cv-hand">
          <h3>내 증거 <small>{s.hands[s.player].length}장</small></h3>
          {s.hands[s.player].length === 0 && <p className="cv-muted">아직 얻은 증거가 없습니다.</p>}
          <ul>
            {s.hands[s.player].map((id) => {
              const c = s.cards[id];
              return (
                <li key={id} className={`cv-card ${c.kind} ${c.key ? 'key' : ''}`}>
                  <span className="cv-card-tag">{c.key ? <><KeyRound size={11} /> 핵심</> : c.kind === 'innocence' ? '무죄' : '공격'} · {nameOf(c.about)}</span>
                  <b>{c.title}</b>
                  <small>{c.text}</small>
                </li>
              );
            })}
          </ul>
        </aside>
        <main className="cv-panel cv-stage">
          <PhaseView s={s} act={act} onExit={onExit} />
        </main>
      </div>
    </div>
  );
}

function PhaseView({ s, act, onExit }: { s: TrialState; act: (a: TrialAction) => void; onExit: () => void }) {
  const next = (label = '다음 단계로') => (
    <button className="cv-stroke primary cv-next" onClick={() => { audio.sfx('paper', 0.6); act({ type: 'advance' }); }}><Gavel size={18} /><span>{label}</span></button>
  );

  switch (s.phase) {
    case 'evidence':
      return (
        <>
          <PhaseHead title="증거 배분" text={evidenceRule(s.player)} />
          <EvidencePicker s={s} act={act} />
          {next('배분 마치기')}
        </>
      );
    case 'secret':
      return (
        <>
          <PhaseHead title="비밀 대화" text="검사와 판사가 증거를 두고 따로 이야기합니다. 피고인 세 사람에게도 따로 이야기할 시간이 주어집니다." />
          <Countdown key={`${s.phase}${s.round}`} seconds={RULES.secretSeconds} />
          <p className="cv-muted">컴퓨터가 맡은 인물과의 대화는 아직 집필 중입니다.</p>
          {next('공개 재판으로')}
        </>
      );
    case 'trial':
      return (
        <>
          <PhaseHead title="공개 재판" text="검사와 판사가 피고인에게 질문합니다. 피고인은 누구나 묵비권을 쓸 수 있습니다." />
          <Countdown key={`${s.phase}${s.round}`} seconds={RULES.trialSeconds} />
          <StrongSuspect s={s} act={act} />
          {next(s.round < RULES.rounds ? '다음 라운드로' : '최종 재판으로')}
        </>
      );
    case 'final-qa':
      return (
        <>
          <PhaseHead title="최후 질의" text="더 이상 증거를 모을 수 없습니다. 검사가 피고인 한 사람씩 1분 동안 마지막으로 묻습니다." />
          <Countdown key={`${s.phase}${s.round}`} seconds={RULES.finalQaSecondsEach * SUSPECTS.length} />
          {next('구형으로')}
        </>
      );
    case 'sentence':
      return (
        <>
          <PhaseHead title="구형" text="검사가 공개 재판을 선언하고, 피고인마다 유죄와 무죄를 구형합니다. 모두 유죄나 모두 무죄도 가능합니다." />
          {s.player === 'prosecutor' ? <SentenceForm s={s} act={act} /> : <p className="cv-muted">하네즈가와 요시 검사가 구형을 준비합니다.</p>}
          {next('판결로')}
        </>
      );
    case 'verdict':
      return (
        <>
          <PhaseHead title="판결" text="재판관은 검사의 구형과 증거를 합쳐 판결문을 낭독합니다. 반드시 한 사람에게는 유죄를 선고해야 합니다." />
          <SentenceList s={s} />
          {s.player === 'judge' ? <VerdictForm act={act} /> : next('판결문 낭독')}
        </>
      );
    case 'ending': {
      const e = ENDINGS[s.ending!];
      return (
        <div className="cv-ending">
          <span className="cv-kicker">판결 · {nameOf(s.verdict!)} 유죄</span>
          <h2>{e.title}</h2>
          <p>{e.text}</p>
          <ul className="cv-keys">
            {(Object.keys(KEY_ITEMS) as KeyItem[]).map((k) => (
              <li key={k} className={found(s, k) ? 'on' : ''}><KeyRound size={12} /> {KEY_ITEMS[k].name} — {nameOf(KEY_ITEMS[k].finder)} {found(s, k) ? '발견' : '못 찾음'}</li>
            ))}
          </ul>
          <blockquote>{CLOSING}</blockquote>
          <button className="cv-stroke primary" onClick={onExit}><span>타이틀로</span></button>
        </div>
      );
    }
  }
}

function PhaseHead({ title, text }: { title: string; text: string }) {
  return (
    <header className="cv-phase-head">
      <h2>{title}</h2>
      <p>{text}</p>
    </header>
  );
}

function evidenceRule(role: RoleId): string {
  if (role === 'prosecutor') return `용의자 한 명을 지목해 공격 증거를 ${RULES.prosecutorPicks}장 얻습니다.`;
  if (role === 'judge') return `용의자 한 명을 지목해 공격 증거를 ${RULES.judgePicks}장 얻습니다.`;
  return `${RULES.suspectPicks}번 고릅니다. 내가 무죄라는 증거, 또는 다른 피고인을 공격할 증거.`;
}

function EvidencePicker({ s, act }: { s: TrialState; act: (a: TrialAction) => void }) {
  const me = s.player;
  const take = (kind: 'innocence' | 'attack', about: SuspectId) => {
    audio.sfx('paper', 0.7);
    act({ type: 'pick', role: me, kind, about });
  };
  const btn = (kind: 'innocence' | 'attack', about: SuspectId) => {
    const blocked = pickBlocked(s, me, kind, about);
    return (
      <button key={`${kind}-${about}`} className={`cv-pick ${kind}`} disabled={!!blocked} title={blocked ?? ''} onClick={() => take(kind, about)}>
        {kind === 'innocence' ? <Shield size={16} /> : <Swords size={16} />}
        <span>{kind === 'innocence' ? '나의 무죄 증거' : `${nameOf(about)} 공격`}</span>
      </button>
    );
  };
  const suspect = (SUSPECTS as RoleId[]).includes(me);
  return (
    <div className="cv-picker">
      <p className="cv-left">
        남은 선택 <b>{s.picks[me]}</b>
        {s.bonus[me] > 0 && <> · 강력 용의자 보너스 <b>무죄 +{s.bonus[me]}</b></>}
        {s.targets[me] && <> · 이번 라운드 지목: <b>{nameOf(s.targets[me]!)}</b></>}
      </p>
      <div className="cv-pick-row">
        {suspect ? [btn('innocence', me as SuspectId), ...SUSPECTS.filter((x) => x !== me).map((x) => btn('attack', x))] : SUSPECTS.map((x) => btn('attack', x))}
      </div>
    </div>
  );
}

function StrongSuspect({ s, act }: { s: TrialState; act: (a: TrialAction) => void }) {
  const chosen = s.strong[s.round - 1];
  if (s.player !== 'prosecutor') {
    return <p className="cv-muted">라운드가 끝나면 검사가 강력 용의자를 지명합니다. 지명된 피고인은 다음 라운드에 무죄 증거를 1장 더 얻습니다.</p>;
  }
  return (
    <div className="cv-strong">
      <p>강력 용의자 지명 <small>(라운드마다 한 명 · 지명된 피고인은 다음 라운드에 무죄 증거 +1)</small></p>
      <div className="cv-pick-row">
        {SUSPECTS.map((x) => (
          <button key={x} className={`cv-pick attack ${chosen === x ? 'on' : ''}`} disabled={!!chosen} onClick={() => act({ type: 'designate', suspect: x })}>
            <span>{nameOf(x)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SentenceForm({ s, act }: { s: TrialState; act: (a: TrialAction) => void }) {
  return (
    <div className="cv-sentence">
      {SUSPECTS.map((x) => (
        <div key={x} className="cv-sentence-row">
          <b>{nameOf(x)}</b>
          {(['guilty', 'innocent'] as const).map((p) => (
            <button key={p} className={`cv-plea ${p} ${s.sentence[x] === p ? 'on' : ''}`} onClick={() => act({ type: 'sentence', suspect: x, plea: p })}>
              {p === 'guilty' ? '유죄' : '무죄'}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function SentenceList({ s }: { s: TrialState }) {
  return (
    <ul className="cv-sentence-list">
      {SUSPECTS.map((x) => (
        <li key={x}><b>{nameOf(x)}</b> <span className={s.sentence[x]}>{s.sentence[x] === 'guilty' ? '유죄 구형' : '무죄 구형'}</span></li>
      ))}
    </ul>
  );
}

function VerdictForm({ act }: { act: (a: TrialAction) => void }) {
  return (
    <div className="cv-verdict">
      <p>유죄를 선고할 한 사람</p>
      <div className="cv-pick-row">
        {SUSPECTS.map((x) => (
          <button key={x} className="cv-stroke" onClick={() => { if (window.confirm(`${nameOf(x)}에게 유죄를 선고합니까?`)) act({ type: 'verdict', suspect: x }); }}>
            <Gavel size={18} /><span>{nameOf(x)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** 권장 시간 표시 (시간이 다 돼도 자동으로 넘어가지 않는다) */
function Countdown({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const t = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return <div className={`cv-clock ${left === 0 ? 'over' : ''}`}>{mm}:{ss}</div>;
}

