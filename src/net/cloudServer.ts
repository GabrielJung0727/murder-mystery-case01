import { randomBytes, randomInt } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { WebSocketServer } from 'ws';
import { createRoom, type Room } from './room';

export interface CloudServer {
  port: number;
  rooms(): number;
  close(): Promise<void>;
}

/** 헷갈리는 글자(0/O, 1/I)를 뺀 방 코드 문자 */
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 4;
const MAX_ROOMS = 40;
/** 아무도 없는 방은 이 시간이 지나면 닫는다 */
const IDLE_MS = 30 * 60_000;
/** 접속자가 있어도 이보다 오래된 방은 닫는다 (버려진 창 대비) */
const MAX_AGE_MS = 12 * 60 * 60_000;

/**
 * 인터넷 서버 (Render 등): 여러 방을 코드로 나눠 연다.
 * - POST /rooms → { code, token } : 방을 만들고, 만든 사람에게만 호스트 토큰을 준다
 * - GET  /health → 상태 확인 (Render 헬스 체크·잠든 서버 깨우기)
 * - WebSocket /r/<코드> → 그 방에 접속
 */
export function startCloudServer(port: number, opts: { maxRooms?: number } = {}): Promise<CloudServer> {
  const rooms = new Map<string, { room: Room; createdAt: number }>();
  const maxRooms = opts.maxRooms ?? MAX_ROOMS;

  const newCode = (): string => {
    for (;;) {
      const code = Array.from({ length: CODE_LENGTH }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
      if (!rooms.has(code)) return code;
    }
  };

  // 게임은 file:// (Electron) 이나 개발 서버에서 부른다
  const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'cache-control': 'no-store' };
  const json = (res: ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...CORS });
    res.end(JSON.stringify(body));
  };

  const http = createServer((req: IncomingMessage, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS);
      res.end();
      return;
    }
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return json(res, 200, { ok: true, service: 'gongjakso-night', rooms: rooms.size });
    }
    if (req.method === 'POST' && url.pathname === '/rooms') {
      if (rooms.size >= maxRooms) return json(res, 503, { error: '지금은 방이 너무 많습니다. 잠시 뒤에 다시 시도해 주세요.' });
      const code = newCode();
      const token = randomBytes(16).toString('hex');
      rooms.set(code, { room: createRoom(token), createdAt: Date.now() });
      return json(res, 201, { code, token });
    }
    json(res, 404, { error: 'not found' });
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
  http.on('upgrade', (req, socket, head) => {
    const m = /^\/r\/([a-z0-9]{4,8})\/?$/i.exec(new URL(req.url ?? '/', 'http://x').pathname);
    const entry = m && rooms.get(m[1].toUpperCase());
    if (!entry) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => entry.room.attach(ws));
  });

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [code, { room, createdAt }] of rooms) {
      const idle = room.clients() === 0 && now - room.lastActive() > IDLE_MS;
      if (idle || now - createdAt > MAX_AGE_MS) {
        room.close();
        rooms.delete(code);
      }
    }
  }, 60_000);

  return new Promise((resolve, reject) => {
    http.once('error', reject);
    http.listen(port, () =>
      resolve({
        port,
        rooms: () => rooms.size,
        close: () =>
          new Promise<void>((done) => {
            clearInterval(sweep);
            for (const { room } of rooms.values()) room.close();
            rooms.clear();
            wss.close();
            http.close(() => done());
          }),
      }),
    );
  });
}
