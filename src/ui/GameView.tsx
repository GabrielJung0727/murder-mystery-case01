import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { OPENING_NARRATION } from '../data/story';
import { audio } from '../audio/director';
import { progress } from '../client/progress';
import { CARDS } from '../data/cards';
import { canSee } from '../engine/engine';
import { useGameAudio } from '../audio/useGameAudio';
import { Atmosphere } from './Atmosphere';
import { Stamp } from './bits';
import { PhaseBanner } from './PhaseBanner';
import { VoiceButton } from './VolumeControl';
import type { CardId, CharId } from '../data/types';
import type { Action, GameState, SeatId } from '../engine/types';
import { Board } from './Board';
import { CardModal } from './CardModal';
import { Dossier } from './Dossier';
import { Ending } from './Ending';
import { FinalReport } from './FinalReport';
import { FloorPlan } from './FloorPlan';
import { Header } from './Header';
import { Interrogation } from './Interrogation';
import { Phone } from './Phone';
import { SidePanel } from './SidePanel';
import { Spotlight } from './Spotlight';
import { Timeline } from './Timeline';

export interface GameProps {
  state: GameState;
  you: SeatId | null;
  isHost: boolean;
  dispatch: (a: Action) => void;
  onExit: () => void;
  online?: boolean;
}

export function GameView(props: GameProps) {
  const { state, you, dispatch } = props;
  const [openCard, setOpenCard] = useState<CardId | null>(null);
  const [dossier, setDossier] = useState(false);
  const [interro, setInterro] = useState<{ target: CharId; cards: CardId[] } | null>(null);
  const [center, setCenter] = useState<'board' | 'timeline'>('board');
  const [report, setReport] = useState(false);
  const [examinedRound, setExaminedRound] = useState(0);
  const single = state.mode === 'single';

  // 증거·서류를 열람하면 이번 라운드는 '기록되지 않은 진실'로 넘어간다
  useEffect(() => {
    if (state.phase === 'investigate' && (openCard || dossier || center === 'timeline')) setExaminedRound(state.round);
  }, [openCard, dossier, center, state.phase, state.round]);
  useGameAudio(state, you, { interrogating: single && !!interro, examined: examinedRound === state.round });
  useEffect(() => {
    if (openCard || dossier || report) audio.sfx('paper', 0.55);
  }, [openCard, dossier, report]);
  // 갤러리 & 다시보기: 이 판에서 본 카드와 도달한 엔딩을 기록
  useEffect(() => {
    if (!you) return;
    const seen = CARDS.filter((c) => canSee(state, you, c.id)).map((c) => c.id);
    progress.record(seen, state.phase === 'ending' ? state.result?.ending : null);
  }, [state, you]);

  // 프롤로그에는 기밀 서류철, 최종 추리에는 보고서를 자동으로 연다
  useEffect(() => {
    if (state.phase === 'prologue' && you) setDossier(true);
    if (state.phase === 'final' && you) setReport(true);
  }, [state.phase, you]);

  if (state.phase === 'ending') return <Ending state={state} you={you} onExit={props.onExit} />;

  const presentFromCard = (card: CardId) => {
    if (!you) return;
    if (single) {
      const first = state.seats.find((s) => s.kind === 'npc')!.id as CharId;
      setInterro({ target: interro?.target ?? first, cards: [card] });
      setOpenCard(null);
    } else {
      dispatch({ type: 'present', seat: you, cards: [card] });
      setOpenCard(null);
    }
  };

  return (
    <div className="dash">
      <Header {...props} onDossier={() => setDossier(true)} onReport={() => setReport(true)} />
      <div className="body3">
        <section className="panel">
          <div className="panel-head"><span className="exhibit">EXHIBIT A</span><h3><MapPin size={15} /> 펜션 건축 평면도</h3></div>
          <FloorPlan state={state} you={you} dispatch={dispatch} onOpenCard={setOpenCard} />
        </section>
        <section className="panel">
          {state.phase === 'prologue' ? (
            <div className="prologue">
              <div className="paper memo">
                <h4>PROLOGUE · 사건 접수 기록 <VoiceButton ids={['NAR-P01']} compact /></h4>
                <Stamp tilt={-12}>01:03 접수</Stamp>
                <p className="narr" style={{ marginTop: 10 }}>{OPENING_NARRATION}</p>
                <p className="first-line" style={{ marginTop: 12 }}>
                  — 기밀 서류철에서 비밀·알리바이·목표를 먼저 확인할 것. {single || props.isHost ? '준비되면 상단 [조사 시작].' : '호스트가 조사를 시작하면 라운드 1이 열린다.'}
                </p>
                {you && <button className="btn primary" style={{ marginTop: 14 }} onClick={() => setDossier(true)}>기밀 서류철 열기</button>}
              </div>
            </div>
          ) : (
            <>
              <div className="panel-head">
                <span className="exhibit">EXHIBIT B</span>
                <div className="tabs">
                  <button className={center === 'board' ? 'on' : ''} onClick={() => setCenter('board')}>수사 보드</button>
                  <button className={center === 'timeline' ? 'on' : ''} onClick={() => setCenter('timeline')}>타임라인 교차 검증</button>
                </div>
                <span className="grow" />
                {center === 'board' && <span className="muted" style={{ fontSize: 11 }}>압정을 끌어 다른 카드에 놓으면 붉은 실로 연결</span>}
              </div>
              {center === 'board'
                ? <Board state={state} you={you} dispatch={dispatch} onOpenCard={setOpenCard} />
                : <Timeline state={state} you={you} dispatch={dispatch} />}
            </>
          )}
        </section>
        <section className="panel">
          <Phone state={state} you={you} onOpenCard={setOpenCard} />
          <SidePanel state={state} you={you} onInterrogate={(target) => setInterro({ target, cards: [] })} />
        </section>
      </div>

      {openCard && <CardModal card={openCard} state={state} you={you} dispatch={dispatch} onPresent={presentFromCard} onClose={() => setOpenCard(null)} />}
      {dossier && <Dossier state={state} you={you} onClose={() => setDossier(false)} onOpenCard={setOpenCard} />}
      {interro && you && (
        <Interrogation state={state} you={you} dispatch={dispatch} initial={interro} onOpenCard={setOpenCard} onClose={() => setInterro(null)} />
      )}
      {report && you && state.phase === 'final' && <FinalReport state={state} you={you} dispatch={dispatch} onClose={() => setReport(false)} />}
      {!single && <Spotlight state={state} />}
      <PhaseBanner state={state} />
      <Atmosphere intensity={0.3} />
    </div>
  );
}
