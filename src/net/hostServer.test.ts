import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { startHostServer, type HostServer } from './hostServer';
import type { ClientMsg, ServerMsg } from './protocol';

let server: HostServer | null = null;
afterEach(async () => {
  await server?.close();
  server = null;
});

function connect(port: number) {
  const ws = new WebSocket(`ws://localhost:${port}`);
  const inbox: ServerMsg[] = [];
  ws.on('message', (raw) => inbox.push(JSON.parse(String(raw))));
  const send = (m: ClientMsg) => ws.send(JSON.stringify(m));
  const until = async (pred: (m: ServerMsg) => boolean) => {
    for (let i = 0; i < 100; i++) {
      const hit = [...inbox].reverse().find(pred);
      if (hit) return hit;
      await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error('timeout');
  };
  return new Promise<{ ws: WebSocket; send: typeof send; until: typeof until }>((resolve) =>
    ws.on('open', () => resolve({ ws, send, until })),
  );
}

describe('host server', () => {
  it('lets the host start a game and keeps hands private', async () => {
    server = await startHostServer(47123, 'secret');
    const host = await connect(47123);
    const guest = await connect(47123);
    host.send({ t: 'hello', playerId: 'h', name: '방장', hostToken: 'secret' });
    guest.send({ t: 'hello', playerId: 'g', name: '손님', hostToken: 'wrong' });
    await host.until((m) => m.t === 'welcome' && m.isHost);
    await guest.until((m) => m.t === 'welcome' && !m.isHost);

    host.send({ t: 'seat', char: 'arin' });
    guest.send({ t: 'seat', char: 'arin' });
    await guest.until((m) => m.t === 'error');
    guest.send({ t: 'seat', char: 'jaegu' });
    await guest.until((m) => m.t === 'state' && m.you === 'jaegu');

    // 손님은 진행할 수 없다
    guest.send({ t: 'action', action: { type: 'advance' } });
    host.send({ t: 'action', action: { type: 'advance' } });
    host.send({ t: 'action', action: { type: 'advance' } });
    await guest.until((m) => m.t === 'state' && m.state.phase === 'investigate');

    // 좌석은 서버가 결정한다: 다른 좌석을 사칭해도 자기 좌석으로 처리된다
    guest.send({ t: 'action', action: { type: 'draw', seat: 'arin', card: '05' } });
    const s = (await host.until((m) => m.t === 'state' && m.state.cards['05'].owner !== null)) as Extract<ServerMsg, { t: 'state' }>;
    expect(s.state.cards['05'].owner).toBe('jaegu');
    expect(s.state.cards['05'].public).toBe(false);

    host.ws.close();
    guest.ws.close();
  });
});
