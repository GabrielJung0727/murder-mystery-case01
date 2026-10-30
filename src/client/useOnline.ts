import { useCallback, useEffect, useRef, useState } from 'react';
import type { Action, GameState, SeatId } from '../engine/types';
import type { ClientMsg, ServerMsg } from '../net/protocol';

export type ConnStatus = 'connecting' | 'open' | 'closed' | 'error';

function playerId(): string {
  const key = 'gongjakso.playerId';
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export interface OnlineSession {
  status: ConnStatus;
  state: GameState | null;
  you: SeatId | null;
  isHost: boolean;
  error: string | null;
  send: (msg: ClientMsg) => void;
  dispatch: (action: Action) => void;
}

/** 호스트 서버에 접속해 필터링된 상태를 받는다. 끊기면 자동 재접속한다. */
export function useOnline(url: string, name: string, hostToken?: string): OnlineSession {
  const [status, setStatus] = useState<ConnStatus>('connecting');
  const [state, setState] = useState<GameState | null>(null);
  const [you, setYou] = useState<SeatId | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let disposed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const open = () => {
      setStatus('connecting');
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onopen = () => {
        setStatus('open');
        ws.send(JSON.stringify({ t: 'hello', playerId: playerId(), name, hostToken } satisfies ClientMsg));
      };
      ws.onmessage = (ev) => {
        const msg = JSON.parse(String(ev.data)) as ServerMsg;
        if (msg.t === 'state') {
          setState(msg.state);
          setYou(msg.you);
          setIsHost(msg.isHost);
        } else if (msg.t === 'welcome') {
          setIsHost(msg.isHost);
        } else if (msg.t === 'error') {
          setError(msg.message);
          setTimeout(() => setError(null), 3000);
        }
      };
      ws.onerror = () => setStatus('error');
      ws.onclose = () => {
        if (disposed) return;
        setStatus('closed');
        retry = setTimeout(open, 2000);
      };
    };
    open();
    return () => {
      disposed = true;
      clearTimeout(retry);
      wsRef.current?.close();
    };
  }, [url, name, hostToken]);

  const send = useCallback((msg: ClientMsg) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);
  const dispatch = useCallback((action: Action) => send({ t: 'action', action }), [send]);

  return { status, state, you, isHost, error, send, dispatch };
}
