// 오른쪽 공판 기록: 진행 순서, 이번 단계의 규칙과 시간, 밀담 채널·1:1 독대, 메모, 다음 단계 버튼
import { Check, Gavel } from 'lucide-react';
import { useEffect, useState } from 'react';
import { RULES, SUSPECTS, roleOf, type RoleId } from './data';
import { picksLine } from './Court';
import { sentenceBlocked, type Phase, type TrialAction, type TrialState } from './engine';
import { say } from './sound';

const STEPS: { phase: Phase; label: string }[] = [
  { phase: 'evidence', label: '증거 배분' },
  { phase: 'secret', label: '비밀 대화' },
  { phase: 'trial', label: '공개 재판' },
];
const FINAL: { phase: Phase; label: string }[] = [
  { phase: 'final-qa', label: '최후 질의' },
  { phase: 'sentence', label: '구형' },
  { phase: 'verdict', label: '판결' },
];
const ORDER: Phase[] = ['evidence', 'secret', 'trial', 'final-qa', 'sentence', 'verdict', 'ending'];

const NEXT_LABEL: Partial<Record<Phase, string>> = {
  evidence: '배분 마치기', secret: '공개 재판으로', 'final-qa': '구형으로', sentence: '판결로', verdict: '판결문 낭독',
};

export function Docket({ s, act }: { s: TrialState; act: (a: TrialAction) => void }) {
  const inRound = s.phase === 'evidence' || s.phase === 'secret' || s.phase === 'trial';
  const stepState = (round: number, phase: Phase) => {
    if (!inRound) return 'done';
    if (round < s.round) return 'done';
    if (round > s.round) return '';
    const a = ORDER.indexOf(phase);
    const b = ORDER.indexOf(s.phase);
    return a < b ? 'done' : a === b ? 'on' : '';
  };
  const finalState = (phase: Phase) => {
    if (inRound) return '';
    const a = ORDER.indexOf(phase);
    const b = ORDER.indexOf(s.phase);
    return a < b ? 'done' : a === b ? 'on' : '';
  };
  const blocked = sentenceBlocked(s);
  // 이번 단계에서 할 일을 다 했으면 법봉 버튼이 붉게 빛나 다음으로 넘기라고 알린다
  const ready = s.phase === 'evidence' ? s.picks[s.player] + s.bonus[s.player] === 0 : s.phase === 'sentence' && s.player === 'prosecutor';
  const waitsForJudge = s.phase === 'verdict' && s.player === 'judge';
  const label = s.phase === 'trial' ? (s.round < RULES.rounds ? '다음 라운드로' : '최종 재판으로') : NEXT_LABEL[s.phase] ?? '다음';

  return (
    <div className="cv-docket-paper">
      <header>
        <span className="cv-docket-kicker">公判記錄</span>
        <h3>공판 기록</h3>
      </header>

      <ol className="cv-docket-steps">
        {[1, 2, 3].map((n) => (
          <li key={n}>
            <b>제{n}라운드</b>
            <span>{STEPS.map((st) => <i key={st.phase} className={stepState(n, st.phase)}>{st.label}</i>)}</span>
          </li>
        ))}
        <li>
          <b>최종 재판</b>
          <span>{FINAL.map((st) => <i key={st.phase} className={finalState(st.phase)}>{st.label}</i>)}</span>
        </li>
      </ol>

      <section className="cv-docket-now">
        <PhaseDetail s={s} />
      </section>

      <label className="cv-memo">
        <span>메모</span>
        <textarea value={s.notes} placeholder="떠오른 생각을 적어 두세요." onChange={(e) => act({ type: 'note', text: e.target.value })} />
      </label>

      {blocked && <p className="cv-warn">{blocked}</p>}
      {waitsForJudge && <p className="cv-warn">피고인석에서 유죄를 선고할 한 사람을 고르세요.</p>}
      {!blocked && !waitsForJudge && (
        <button className={`cv-gavel ${ready ? 'ready' : ''}`} onClick={() => act({ type: 'advance' })}>
          <Gavel size={18} /> {label}
        </button>
      )}
    </div>
  );
}

function PhaseDetail({ s }: { s: TrialState }) {
  switch (s.phase) {
    case 'evidence':
      return (
        <>
          <p>{rule(s.player)}</p>
          <p className="cv-docket-em">{picksLine(s)}</p>
        </>
      );
    case 'secret':
      return (
        <>
          <Countdown key={`secret${s.round}`} seconds={RULES.secretSeconds} />
          <Channel title="법관석 채널" who={['prosecutor', 'judge']} me={s.player} />
          <Channel title="피고인석 채널" who={SUSPECTS} me={s.player} />
          <p className="cv-muted">컴퓨터가 맡은 인물과의 대화는 집필 중입니다.</p>
        </>
      );
    case 'trial':
      return (
        <>
          <Countdown key={`trial${s.round}`} seconds={RULES.trialSeconds} />
          <p>{s.player === 'prosecutor'
            ? '피고인 한 명을 강력 용의자로 지명할 수 있습니다. 지명된 피고인은 다음 라운드에 무죄 증거를 1장 더 받습니다.'
            : '라운드가 끝나면 검사가 강력 용의자를 지명합니다.'}</p>
        </>
      );
    case 'final-qa':
      return <Interviews s={s} />;
    case 'sentence':
      return <p>{s.player === 'prosecutor' ? '피고인석에서 한 사람씩 유죄·무죄를 구형하세요. 재판관이 컴퓨터이므로 유죄는 한 명뿐입니다.' : '하네즈가와 요시 검사가 구형을 준비합니다.'}</p>;
    case 'verdict':
      return <p>{s.player === 'judge' ? '검사의 구형과 내 증거를 합쳐, 유죄를 선고할 한 사람을 고르세요.' : '오미하라 하세다 재판관이 판결문을 낭독합니다.'}</p>;
    default:
      return null;
  }
}

function rule(role: RoleId): string {
  if (role === 'prosecutor') return `피고인 한 명을 지목해 공격 증거를 ${RULES.prosecutorPicks}장 받습니다.`;
  if (role === 'judge') return `피고인 한 명을 지목해 공격 증거를 ${RULES.judgePicks}장 받습니다.`;
  return `${RULES.suspectPicks}번 고릅니다. 내 자리에서 무죄 증거를, 다른 피고인 자리에서 공격 증거를 받습니다.`;
}

function Channel({ title, who, me }: { title: string; who: RoleId[]; me: RoleId }) {
  const mine = who.includes(me);
  return (
    <div className={`cv-channel ${mine ? 'mine' : ''}`}>
      <b>{title}{mine && <em>내 채널</em>}</b>
      <span>{who.map((id) => roleOf(id).name).join(' · ')}</span>
    </div>
  );
}

/** 최후 질의: 검사가 피고인을 한 명씩 불러 1분씩 묻는다 */
function Interviews({ s }: { s: TrialState }) {
  const [called, setCalled] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  return (
    <>
      <p>검사가 피고인을 한 명씩 불러 1분씩 마지막으로 묻습니다.</p>
      <ul className="cv-interviews">
        {SUSPECTS.map((x) => (
          <li key={x} className={called === x ? 'on' : done.includes(x) ? 'done' : ''}>
            <span>{roleOf(x).name}{s.player === x && ' (나)'}</span>
            {called === x
              ? <Countdown seconds={RULES.finalQaSecondsEach} small onEnd={() => { setDone((d) => [...d, x]); setCalled(null); }} />
              : done.includes(x)
                ? <Check size={14} />
                : <button className="cv-act" disabled={!!called} onClick={() => { setCalled(x); say(['CV-YOSHI-06']); }}>호출</button>}
          </li>
        ))}
      </ul>
    </>
  );
}

/** 권장 시간 표시 (시간이 다 돼도 단계는 저절로 넘어가지 않는다) */
function Countdown({ seconds, small, onEnd }: { seconds: number; small?: boolean; onEnd?: () => void }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const t = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (left === 0) onEnd?.();
  }, [left, onEnd]);
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return <span className={`cv-clock ${small ? 'small' : ''} ${left === 0 ? 'over' : ''}`}>{mm}:{ss}</span>;
}
