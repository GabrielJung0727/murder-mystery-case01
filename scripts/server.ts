// 개발/테스트용 독립 실행 호스트 서버: npm run server
import { startHostServer } from '../src/net/hostServer';
import { DEFAULT_PORT } from '../src/net/protocol';

const port = Number(process.env.PORT ?? DEFAULT_PORT);
const token = process.env.HOST_TOKEN ?? 'dev-host';
startHostServer(port, token).then(() => {
  console.log(`공작소의 밤 호스트 서버: ws://localhost:${port}  (host token: ${token})`);
});
