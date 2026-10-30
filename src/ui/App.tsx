import { useCallback, useEffect, useState } from 'react';
import { bridge, hasClearedSingle, markSingleCleared, type HostInfo } from '../client/bridge';
import { loadSingle, saveSingle } from '../client/saveGame';
import { useOnline, type OnlineSession } from '../client/useOnline';
import { applyAction, createSingleGame } from '../engine/engine';
import type { Action, GameOptions, GameState, SeatId } from '../engine/types';
import { DEFAULT_PORT } from '../net/protocol';
import { ART, shadedBg } from '../data/art';
import { Atmosphere } from './Atmosphere';
import { Desk, seatName } from './bits';
import { MenuSound } from './VolumeControl';
import { GameView } from './GameView';
import { Lobby } from './Lobby';
import { OnlineSetup, type JoinTarget } from './OnlineSetup';
import { SingleSetup } from './SingleSetup';
import { Title } from './Title';

type Screen =
  | { kind: 'title' }
  | { kind: 'single-setup' }
  | { kind: 'single'; player: SeatId; options?: GameOptions; resume?: GameState }
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
          <SingleSetup
            cleared={hasClearedSingle()}
            save={loadSingle()}
            onBack={toTitle}
            onStart={(player, options) => setScreen({ kind: 'single', player, options })}
            onResume={(save) => setScreen({ kind: 'single', player: save.player, resume: save.state })}
          />
          <Atmosphere intensity={0.7} />
          <MenuSound />
        </>
      );
    case 'single':
      return <SingleGame player={screen.player} options={screen.options} resume={screen.resume} onExit={toTitle} />;
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

function SingleGame({ player, options, resume, onExit }: { player: SeatId; options?: GameOptions; resume?: GameState; onExit: () => void }) {
  const [state, setState] = useState<GameState>(() => resume ?? createSingleGame(player, Date.now(), options));
  const dispatch = useCallback((action: Action) => setState((s) => applyAction(s, action)), []);
  useEffect(() => {
    if (state.phase === 'ending') markSingleCleared();
  }, [state.phase]);
  // 자동 저장 (엔딩에 도달하면 저장을 지운다)
  useEffect(() => saveSingle(player, state), [player, state]);
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
      <RejoinPanel session={session} name={target.name} />
      {session.status !== 'open' && <div className="toast">호스트와 연결이 끊겼습니다. 재접속 중…</div>}
      {session.error && <div className="toast">{session.error}</div>}
    </>
  );
}

/**
 * 진행 중인 판에 자리 없이 들어온 경우(앱을 다시 켜서 접속 ID가 바뀐 경우 등) 끊긴 자리를 이어받는다.
 * 같은 이름으로 끊긴 자리가 하나뿐이면 자동으로, 아니면 직접 고른다.
 */
function RejoinPanel({ session, name }: { session: OnlineSession; name: string }) {
  const { state, you, status, send } = session;
  const open = state && !you && status === 'open' && state.phase !== 'ending'
    ? state.seats.filter((s) => s.kind === 'human' && s.connected === false) : [];
  const mine = open.filter((s) => s.name === name.trim());
  const auto = mine.length === 1 ? mine[0].id : null;
  useEffect(() => {
    if (auto) send({ t: 'rejoin', seat: auto });
  }, [auto, send]);
  if (open.length === 0 || auto) return null;
  return (
    <div className="rejoin">
      <b>연결이 끊긴 자리가 있습니다.</b> 원래 자리였다면 이어서 플레이하세요.
      <div className="row" style={{ marginTop: 8, flexWrap: 'wrap', gap: 6 }}>
        {open.map((s) => (
          <button key={s.id} className="btn sm primary" onClick={() => send({ t: 'rejoin', seat: s.id })}>
            {seatName(s.id)} · {s.name} 자리 이어받기
          </button>
        ))}
      </div>
    </div>
  );
}
