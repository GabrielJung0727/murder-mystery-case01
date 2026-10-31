// 가운데 경성 재판장: 위에 법대(재판관·검사), 아래 피고인석 세 자리.
// 단계마다 피고인석의 버튼이 바뀐다: 증거 받기 → 묵비권·강력 용의자 지명 → 구형 → 판결.
import { Gavel, Shield, Swords, VolumeX } from 'lucide-react';
import { audio } from '../../audio/director';
import { RULES, SUSPECTS, portrait, roleOf, type SuspectId } from './data';
import { ASSETS } from './assets';
import { pickBlocked, type Phase, type TrialAction, type TrialState } from './engine';

const CAPTION: Record<Exclude<Phase, 'ending'>, { title: string; text: string }> = {
  evidence: { title: '증거 배분', text: '피고인석의 버튼으로 증거를 받습니다.' },
  secret: { title: '비밀 대화', text: '법관석과 피고인석이 따로 이야기합니다.' },
  trial: { title: '공개 재판', text: '검사와 재판관이 심문합니다. 피고인은 묵비권을 쓸 수 있습니다.' },
  'final-qa': { title: '최후 질의', text: '더 이상 증거를 모을 수 없습니다. 검사가 한 사람씩 마지막으로 묻습니다.' },
  sentence: { title: '구형', text: '검사가 피고인마다 유죄와 무죄를 구형합니다.' },
  verdict: { title: '판결', text: '재판관이 판결문을 낭독합니다. 반드시 한 사람은 유죄입니다.' },
};

export function Court({ s, act }: { s: TrialState; act: (a: TrialAction) => void }) {
  const cap = CAPTION[s.phase as Exclude<Phase, 'ending'>];
  const round = s.phase === 'evidence' || s.phase === 'secret' || s.phase === 'trial' ? `제${s.round}라운드` : '최종 재판';
  return (
    <div className={`cv-room phase-${s.phase}`} style={ASSETS.court ? { backgroundImage: `url(${ASSETS.court})` } : undefined}>
      <div className="cv-bench">
        <Officer id="prosecutor" label="檢事" s={s} />
        <Officer id="judge" label="裁判官" s={s} high />
        <div className="cv-bench-emblem" aria-hidden />
      </div>
      <div className="cv-floor">
        <span className="cv-floor-round">{round}</span>
        <h2 key={`${s.phase}${s.round}`}>{cap.title}</h2>
        <p>{cap.text}</p>
      </div>
      <div className="cv-dock">
        {SUSPECTS.map((x) => <Seat key={x} who={x} s={s} act={act} />)}
      </div>
    </div>
  );
}

function Officer({ id, label, s, high }: { id: 'judge' | 'prosecutor'; label: string; s: TrialState; high?: boolean }) {
  const r = roleOf(id);
  const speaking = (id === 'judge' && s.phase === 'verdict') || (id === 'prosecutor' && (s.phase === 'sentence' || s.phase === 'final-qa'));
  return (
    <div className={`cv-officer ${high ? 'high' : ''} ${speaking ? 'speaking' : ''} ${s.player === id ? 'me' : ''}`}>
      <img src={portrait(id)} alt="" />
      <span className="cv-plate"><small>{label}</small>{r.name}{s.player === id && <em>나</em>}</span>
    </div>
  );
}

function Seat({ who, s, act }: { who: SuspectId; s: TrialState; act: (a: TrialAction) => void }) {
  const r = roleOf(who);
  const me = s.player === who;
  const strongRounds = s.strong.map((x, i) => (x === who ? i + 1 : 0)).filter(Boolean);
  const strongNow = s.strong[s.round - 1] === who && s.phase === 'trial';
  const silentNow = s.phase === 'trial' && s.silent[who].includes(s.round);
  const plea = s.phase === 'sentence' || s.phase === 'verdict' ? s.sentence[who] : undefined;
  const showPlea = plea && (s.phase === 'verdict' || s.player === 'prosecutor');

  return (
    <div className={`cv-seat ${me ? 'me' : ''} ${strongNow ? 'strong' : ''}`}>
      <div className="cv-seat-face">
        <img src={portrait(who)} alt="" />
        {silentNow && <span className="cv-silent"><VolumeX size={12} /> 묵비권</span>}
        {strongNow && <Stamp kind="strong" />}
        {showPlea && <Stamp kind={plea === 'guilty' ? 'guilty' : 'innocent'} key={plea} />}
      </div>
      <span className="cv-plate"><small>被告人</small>{r.name}{me && <em>나</em>}</span>
      <span className="cv-seat-sub">{r.title}</span>
      {strongRounds.length > 0 && (
        <span className="cv-seat-marks" title="강력 용의자로 지명된 라운드">
          {strongRounds.map((n) => <i key={n}>{n}</i>)}
        </span>
      )}
      <div className="cv-seat-actions"><SeatActions who={who} s={s} act={act} /></div>
    </div>
  );
}

function SeatActions({ who, s, act }: { who: SuspectId; s: TrialState; act: (a: TrialAction) => void }) {
  const me = s.player;
  const name = roleOf(who).name;
  // 도장·법봉 소리는 상태 변화에 맞춰 sound.ts 의 trialCue 가 낸다
  const sfx = () => audio.sfx('paper', 0.7);

  if (s.phase === 'evidence') {
    const kind = me === who ? 'innocence' : 'attack';
    if ((SUSPECTS as string[]).includes(me) || kind === 'attack') {
      const blocked = pickBlocked(s, me, kind, who);
      return (
        <button className={`cv-act ${kind}`} disabled={!!blocked} title={blocked ?? ''} onClick={() => { sfx(); act({ type: 'pick', role: me, kind, about: who }); }}>
          {kind === 'innocence' ? <Shield size={14} /> : <Swords size={14} />}
          {kind === 'innocence' ? '무죄 증거 받기' : me === 'prosecutor' || me === 'judge' ? '지목 · 공격 증거' : '공격 증거 받기'}
        </button>
      );
    }
    return null;
  }
  if (s.phase === 'trial') {
    if (me === who) {
      const done = s.silent[who].includes(s.round);
      return <button className="cv-act" disabled={done} onClick={() => act({ type: 'silence', suspect: who })}><VolumeX size={14} /> {done ? '묵비권 행사 중' : '묵비권'}</button>;
    }
    if (me === 'prosecutor') {
      const chosen = s.strong[s.round - 1];
      return (
        <button className="cv-act attack" disabled={!!chosen} onClick={() => act({ type: 'designate', suspect: who })}>
          {chosen === who ? '강력 용의자' : '강력 용의자 지명'}
        </button>
      );
    }
    return null;
  }
  if (s.phase === 'sentence' && me === 'prosecutor') {
    return (
      <span className="cv-plea-pair">
        {(['guilty', 'innocent'] as const).map((p) => (
          <button key={p} className={`cv-plea ${p} ${s.sentence[who] === p ? 'on' : ''}`} onClick={() => act({ type: 'sentence', suspect: who, plea: p })}>
            {p === 'guilty' ? '유죄' : '무죄'}
          </button>
        ))}
      </span>
    );
  }
  if (s.phase === 'verdict' && me === 'judge') {
    return (
      <button className="cv-act attack" onClick={() => { if (window.confirm(`${name}에게 유죄를 선고합니까?`)) act({ type: 'verdict', suspect: who }); }}>
        <Gavel size={14} /> 유죄 선고
      </button>
    );
  }
  return null;
}

/** 붉은 인장. 그림이 오면 그림을, 없으면 글자 도장을 찍는다 */
function Stamp({ kind }: { kind: 'strong' | 'guilty' | 'innocent' }) {
  const text = { strong: '強力容疑者', guilty: '有罪', innocent: '無罪' }[kind];
  const src = ASSETS.stamps[kind];
  return (
    <span className={`cv-stamp ${kind}`} aria-label={text}>
      {src ? <img src={src} alt="" /> : text}
    </span>
  );
}

/** 공판 기록용: 이번 라운드 남은 선택 */
export function picksLine(s: TrialState): string {
  const me = s.player;
  const parts = [`남은 선택 ${s.picks[me]}`];
  if (s.bonus[me] > 0) parts.push(`강력 용의자 보너스 무죄 +${s.bonus[me]}`);
  if (s.targets[me]) parts.push(`지목: ${roleOf(s.targets[me]!).name}`);
  if (me === 'prosecutor') parts.push(`검사는 한 명을 지목해 ${RULES.prosecutorPicks}장`);
  if (me === 'judge') parts.push(`재판관은 한 명을 지목해 ${RULES.judgePicks}장`);
  return parts.join(' · ');
}

