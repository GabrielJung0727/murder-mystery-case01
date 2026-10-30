import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { isRoomCode, roomWsUrl } from './cloud';
import { startCloudServer, type CloudServer } from './cloudServer';
import type { ServerMsg } from './protocol';

let server: CloudServer | null = null;
afterEach(async () => {
  await server?.close();
  server = null;
});

const base = (port: number) => `http://127.0.0.1:${port}`;

function connect(url: string, hello: object): Promise<{ ws: WebSocket; last: () => ServerMsg | null }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let last: ServerMsg | null = null;
    ws.on('message', (d) => { last = JSON.parse(String(d)) as ServerMsg; });
    ws.on('error', reject);
    ws.on('open', () => {
      ws.send(JSON.stringify({ t: 'hello', ...hello }));
      setTimeout(() => resolve({ ws, last: () => last }), 150);
    });
  });
}

describe('cloud server', () => {
  it('creates rooms with a host token and keeps rooms apart', async () => {
    server = await startCloudServer(47801);
    const health = await fetch(`${base(47801)}/health`).then((r) => r.json());
    expect(health).toMatchObject({ ok: true, rooms: 0 });

    const res = await fetch(`${base(47801)}/rooms`, { method: 'POST' });
    expect(res.status).toBe(201);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    const { code, token } = await res.json();
    expect(isRoomCode(code)).toBe(true);
    const other = await fetch(`${base(47801)}/rooms`, { method: 'POST' }).then((r) => r.json());
    expect(other.code).not.toBe(code);

    const host = await connect(roomWsUrl(base(47801), code), { playerId: 'h', name: '호스트', hostToken: token });
    const guest = await connect(roomWsUrl(base(47801), code.toLowerCase()), { playerId: 'g', name: '손님', hostToken: other.token });
    host.ws.send(JSON.stringify({ t: 'seat', char: 'arin' }));
    await new Promise((r) => setTimeout(r, 150));
    const hs = host.last();
    const gs = guest.last();
    expect(hs?.t === 'state' && hs.isHost).toBe(true);
    expect(gs?.t === 'state' && gs.isHost).toBe(false); // 다른 방의 토큰으로는 호스트가 될 수 없다
    expect(gs?.t === 'state' && gs.state.seats.find((s) => s.id === 'arin')?.kind).toBe('human');

    const lonely = await connect(roomWsUrl(base(47801), other.code), { playerId: 'x', name: '혼자' });
    const ls = lonely.last();
    expect(ls?.t === 'state' && ls.state.seats.every((s) => s.kind === 'empty')).toBe(true); // 방끼리 섞이지 않는다
    for (const c of [host, guest, lonely]) c.ws.close();
  });

  it('rejects unknown rooms and caps the number of rooms', async () => {
    server = await startCloudServer(47802, { maxRooms: 1 });
    await expect(connect(roomWsUrl(base(47802), 'ZZZZ'), { playerId: 'a', name: 'a' })).rejects.toThrow();
    expect((await fetch(`${base(47802)}/rooms`, { method: 'POST' })).status).toBe(201);
    expect((await fetch(`${base(47802)}/rooms`, { method: 'POST' })).status).toBe(503);
  });
});
