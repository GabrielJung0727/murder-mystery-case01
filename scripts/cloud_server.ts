// 인터넷 서버 (Render): npm run build:cloud && npm run start:cloud
// Render 는 PORT 환경 변수로 포트를 알려 준다.
import { startCloudServer } from '../src/net/cloudServer';

const port = Number(process.env.PORT ?? 10000);
startCloudServer(port).then(() => {
  console.log(`공작소의 밤 인터넷 서버: http://localhost:${port}  (방 만들기 POST /rooms, 접속 ws /r/<코드>)`);
});
