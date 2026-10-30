import { useCallback, useEffect, useState } from 'react';
import { bridge, hasClearedSingle, markSingleCleared, type HostInfo } from '../client/bridge';
import { useOnline } from '../client/useOnline';
import { applyAction, createSingleGame } from '../engine/engine';
import type { Action, GameState, SeatId } from '../engine/types';
import { DEFAULT_PORT } from '../net/protocol';
import { ART, shadedBg } from '../data/art';
import { Atmosphere } from './Atmosphere';
import { Desk } from './bits';
import { MenuSound } from './VolumeControl';
import { GameView } from './GameView';
import { Lobby } from './Lobby';
import { OnlineSetup, type JoinTarget } from './OnlineSetup';
import { SingleSetup } from './SingleSetup';
import { Title } from './Title';

type Screen =
  | { kind: 'title' }
  | { kind: 'single-setup' }
  | { kind: 'single'; player: SeatId }
  | { kind: 'online-setup' }
  | { kind: 'online'; target: JoinTarget; host?: HostInfo };

export function App() {
  const [screen, setScreen] = useState<Screen>({ kind: 'title' });
  const toTitle = useCallback(() => setScreen({ kind: 'title' }), []);

  switch (screen.kind) {
    case 'title':
      return (
        <>
          <Title onSingle={() => setScreen({ kind: 'single-setup' })} onOnline={() => setScreen({ kind: 'online-setup' })} />
          <Atmosphere intensity={1} lightning />
          <MenuSound />
        </>
      );
    case 'single-setup':
      return (
        <>
          <SingleSetup cleared={hasClearedSingle()} onBack={toTitle} onStart={(player) => setScreen({ kind: 'single', player })} />
          <Atmosphere intensity={0.7} />
          <MenuSound />
        </>
      );
    case 'single':
      return <SingleGame player={screen.player} onExit={toTitle} />;
    case 'online-setup':
      return (
        <>
          <OnlineSetup
            defaultPort={DEFAULT_PORT}
            onBack={toTitle}
            onReady={(target, host) => setScreen({ kind: 'online', target, host })}
          />
          <Atmosphere intensity={0.7} />
          <MenuSound />
        </>
      );
    case 'online':
      return (
        <OnlineGame
          target={screen.target}
          host={screen.host}
          onExit={() => {
            if (screen.host) void bridge?.hostStop();
            toTitle();
          }}
        />
      );
  }
}

function SingleGame({ player, onExit }: { player: SeatId; onExit: () => void }) {
  const [state, setState] = useState<GameState>(() => createSingleGame(player));
  const dispatch = useCallback((action: Action) => setState((s) => applyAction(s, action)), []);
  useEffect(() => {
    if (state.phase === 'ending') markSingleCleared();
  }, [state.phase]);
  return <GameView state={state} you={player} isHost dispatch={dispatch} onExit={onExit} />;
}

function OnlineGame({ target, host, onExit }: { target: JoinTarget; host?: HostInfo; onExit: () => void }) {
  const session = useOnline(target.url, target.name, target.hostToken);
  const { state } = session;
  if (!state) {
    return (
      <div className="screen" style={shadedBg(ART.cutaway, 0.72, 0.9)}>
        <Atmosphere intensity={0.7} />
        <MenuSound />
        <Desk tab="CONNECTING" kicker={target.url} title="수사 본부에 연결 중…" aside={<button className="btn ghost" onClick={onExit}>취소</button>}>
          <p className="muted">상태: {session.status === 'closed' || session.status === 'error' ? '연결 실패 — 2초마다 다시 시도하는 중' : '신호를 찾는 중'}</p>
          <span className="desk-note">— 호스트가 방을 열었는지, 주소가 맞는지 확인하세요.</span>
        </Desk>
      </div>
    );
  }
  if (state.phase === 'lobby') {
    return (
      <>
        <Lobby session={session} host={host} onExit={onExit} />
        <Atmosphere intensity={0.7} />
        <MenuSound />
      </>
    );
  }
  return (
    <>
      <GameView state={state} you={session.you} isHost={session.isHost} dispatch={session.dispatch} onExit={onExit} online />
      {session.status !== 'open' && <div className="toast">호스트와 연결이 끊겼습니다. 재접속 중…</div>}
      {session.error && <div className="toast">{session.error}</div>}
    </>
  );
}
