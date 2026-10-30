import { WebSocketServer, type WebSocket } from 'ws';
import { applyAction, claimSeat, createOnlineGame, reclaimSeat, releaseSeat, setConnected, setOptions, viewFor } from '../engine/engine';
import type { GameState, SeatId } from '../engine/types';
import type { ClientMsg, ServerMsg } from './protocol';

interface Client {
  playerId: string | null;
  name: string;
  isHost: boolean;
}

export interface HostServer {
  port: number;
  close(): Promise<void>;
}

/**
 * 방장 PC에서 실행되는 권위 서버. 모든 액션은 여기서 엔진을 거쳐 검증되고,
 * 각 접속자에게는 자기 좌석 시야로 필터링된 상태가 전송된다.
 */
export function startHostServer(port: number, hostToken: string): Promise<HostServer> {
  let state: GameState = createOnlineGame();
  const clients = new Map<WebSocket, Client>();
  const wss = new WebSocketServer({ port });

  const seatOfPlayer = (playerId: string | null): SeatId | null =>
    (playerId && state.seats.find((s) => s.playerId === playerId)?.id) || null;

  const send = (ws: WebSocket, msg: ServerMsg) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  };

  const broadcast = () => {
    for (const [ws, c] of clients) {
      const you = seatOfPlayer(c.playerId);
      send(ws, { t: 'state', state: viewFor(state, you), you, isHost: c.isHost });
    }
  };

  const update = (next: GameState): boolean => {
    if (next === state) return false;
    state = next;
    broadcast();
    return true;
  };

  const handle = (ws: WebSocket, client: Client, msg: ClientMsg) => {
    if (msg.t === 'hello') {
      client.playerId = String(msg.playerId).slice(0, 64);
      client.name = String(msg.name ?? '').trim().slice(0, 16) || '플레이어';
      client.isHost = !!hostToken && msg.hostToken === hostToken;
      send(ws, { t: 'welcome', playerId: client.playerId, isHost: client.isHost });
      if (!update(setConnected(state, client.playerId, true))) broadcast();
      return;
    }
    if (!client.playerId) return;
    switch (msg.t) {
      case 'seat':
        if (!update(claimSeat(state, client.playerId, client.name, msg.char))) {
          send(ws, { t: 'error', message: '선택할 수 없는 인물입니다.' });
        }
        return;
      case 'rejoin':
        if (!update(reclaimSeat(state, client.playerId, client.name, msg.seat))) {
          send(ws, { t: 'error', message: '이어받을 수 없는 자리입니다.' });
        }
        return;
      case 'leave':
        update(releaseSeat(state, client.playerId));
        return;
      case 'timers':
        if (client.isHost && state.phase === 'lobby') update({ ...state, timers: msg.timers });
        return;
      case 'options':
        if (client.isHost) update(setOptions(state, msg.options));
        return;
      case 'action': {
        const action = msg.action;
        if (action.type === 'advance' || action.type === 'tick') {
          if (client.isHost) update(applyAction(state, action));
          return;
        }
        const seat = seatOfPlayer(client.playerId);
        if (seat) update(applyAction(state, { ...action, seat }));
        return;
      }
    }
  };

  wss.on('connection', (ws) => {
    const client: Client = { playerId: null, name: '', isHost: false };
    clients.set(ws, client);
    ws.on('message', (raw) => {
      try {
        handle(ws, client, JSON.parse(String(raw)) as ClientMsg);
      } catch {
        send(ws, { t: 'error', message: '잘못된 요청입니다.' });
      }
    });
    ws.on('close', () => {
      clients.delete(ws);
      const stillHere = [...clients.values()].some((c) => c.playerId === client.playerId);
      if (client.playerId && !stillHere) update(releaseSeat(state, client.playerId));
    });
  });

  const timer = setInterval(() => update(applyAction(state, { type: 'tick' })), 1000);

  return new Promise((resolve, reject) => {
    wss.once('error', (err) => {
      clearInterval(timer);
      reject(err);
    });
    wss.once('listening', () =>
      resolve({
        port,
        close: () =>
          new Promise<void>((done) => {
            clearInterval(timer);
            for (const ws of clients.keys()) ws.terminate();
            wss.close(() => done());
          }),
      }),
    );
  });
}
