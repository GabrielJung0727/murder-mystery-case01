import { Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { seatOf } from '../engine/engine';
import type { GameProps } from './GameView';
import { Avatar, seatName } from './bits';
import { VolumeControl } from './VolumeControl';

const PHASE_LABEL: Record<string, string> = {
  prologue: '프롤로그 · 역할 숙지',
  investigate: '조사 단계',
  discuss: '토론 · 심문 단계',
  final: '최종 추리',
};

function nextLabel(props: GameProps): string {
  const { state } = props;
  switch (state.phase) {
    case 'prologue': return '조사 시작 →';
    case 'investigate': return state.mode === 'single' ? '조사 완료 →' : '토론으로 →';
    case 'discuss': return state.round < 3 ? `라운드 ${state.round + 1} →` : '최종 추리 →';
    case 'final': return state.mode === 'single' ? '' : '투표 마감 →';
    default: return '';
  }
}

function useCountdown(endsAt: number | null): number | null {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [endsAt]);
  return endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : null;
}

export function Header(props: GameProps & { onDossier: () => void; onReport: () => void }) {
  const { state, you, isHost, dispatch } = props;
  const left = useCountdown(state.phaseEndsAt);
  const seat = you ? seatOf(state, you) : undefined;
  const label = nextLabel(props);
  const canAdvance = state.mode === 'single' || isHost;
  const confirmText = state.phase === 'investigate' && seat && seat.ap > 0 && state.mode === 'single'
    ? `아직 조사 기회가 ${seat.ap}번 남았습니다. 그래도 조사를 마칠까요?` : null;

  return (
    <header className="header">
      <div className="brand">공작소의 밤<small>CASE 01 · {state.mode === 'single' ? 'SOLO' : 'ONLINE'}</small></div>
      <div className="rounds">
        {[1, 2, 3].map((r) => (
          <span key={r} className={state.round === r ? 'on' : state.round > r ? 'done' : ''}>R{r}</span>
        ))}
        <span className={state.phase === 'final' ? 'on' : ''}>FINAL</span>
      </div>
      <span className="live-badge"><i />{state.round > 0 ? `ROUND ${state.round} · ` : ''}{PHASE_LABEL[state.phase]}</span>
      {state.options.difficulty === 'hard' && <span className="tag red" title="단서 힌트 없음 · 심문마다 증거 제시 5회 · 타임라인 판정 비공개">어려움</span>}
      {left !== null && (
        <span className="clock">
          <Clock size={15} />
          <span className={`timer ${left <= 30 ? 'low' : ''}`}>{String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}</span>
        </span>
      )}
      {seat && state.phase === 'investigate' && (
        <div className="ap" title="행동력: 라운드마다 2곳 조사">
          <span className="muted" style={{ fontSize: 12 }}>AP</span>
          {[0, 1].map((i) => <i key={i} className={i < seat.ap ? 'full' : ''} />)}
        </div>
      )}
      <span className="grow" />
      {you && <span className="me-tag"><Avatar char={you} />{seatName(you)}</span>}
      {!you && <span className="tag amber">관전 중</span>}
      {you && <button className="btn sm" onClick={props.onDossier}>기밀 서류철</button>}
      {you && state.phase === 'final' && (
        <button className="btn sm primary" onClick={props.onReport} disabled={seat?.submitted}>{seat?.submitted ? '보고서 제출 완료' : '최종 보고서'}</button>
      )}
      {canAdvance && label && (
        <button
          className="btn sm primary"
          onClick={() => {
            if (confirmText && !window.confirm(confirmText)) return;
            dispatch({ type: 'advance' });
          }}
        >
          {label}
        </button>
      )}
      <VolumeControl />
      <button
        className="btn sm ghost"
        onClick={() => {
          if (window.confirm('게임을 나가시겠습니까?' + (props.online && isHost ? ' 호스트가 나가면 방이 닫힙니다.' : ''))) props.onExit();
        }}
      >
        나가기
      </button>
    </header>
  );
}
