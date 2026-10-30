import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { createRoom } from './room';

export interface HostServer {
  port: number;
  close(): Promise<void>;
}

/** 방장 PC(Electron)에서 여는 같은 네트워크용 서버: 방 하나, 주소 경로는 따지지 않는다 */
export function startHostServer(port: number, hostToken: string): Promise<HostServer> {
  const room = createRoom(hostToken);
  const http = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('공작소의 밤 호스트 서버');
  });
  const wss = new WebSocketServer({ server: http, maxPayload: 64 * 1024 });
  wss.on('connection', (ws) => room.attach(ws));

  return new Promise((resolve, reject) => {
    http.once('error', (err) => {
      room.close();
      reject(err);
    });
    http.listen(port, () =>
      resolve({
        port,
        close: () =>
          new Promise<void>((done) => {
            room.close();
            wss.close();
            http.close(() => done());
          }),
      }),
    );
  });
}
