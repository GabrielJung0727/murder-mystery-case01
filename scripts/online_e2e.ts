// 온라인 5인 한 판 전체를 실제 호스트 서버로 돌려 보는 통합 테스트: npm run e2e:online
// 착석 → 3라운드 조사·공개·제시 → 진행 중 끊김과 재접속 → 최종 보고서 → 엔딩 A 까지 확인한다.
import WebSocket from 'ws';
import { CARDS } from '../src/data/cards';
import { startHostServer } from '../src/net/hostServer';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const CHARS = ['seonbin', 'seongcheol', 'jaegu', 'yeojin', 'arin'] as const;
const CORRECT = { culprit: 'seonbin', motive: 'resign', time: 't2', method: 'push', evidence: ['14', '31', '34'] };
type C = { ws: WebSocket; last: any; err: string | null; name: string };
function client(id: string, name: string, token?: string): Promise<C> {
  return new Promise((res) => {
    const ws = new WebSocket('ws://localhost:4798');
    const c: C = { ws, last: null, err: null, name };
    ws.on('message', (d) => { const m = JSON.parse(String(d)); if (m.t === 'state') c.last = m; if (m.t === 'error') c.err = m.message; });
    ws.on('open', () => { ws.send(JSON.stringify({ t: 'hello', playerId: id, name, hostToken: token })); setTimeout(() => res(c), 150); });
  });
}
const send = (c: C, m: object) => c.ws.send(JSON.stringify(m));
const act = (c: C, action: object) => send(c, { t: 'action', action });
let fails = 0;
const check = (ok: boolean, label: string) => { console.log(ok ? 'PASS' : 'FAIL', label); if (!ok) fails++; };

(async () => {
  const srv = await startHostServer(4798, 'tok');
  const cs: C[] = [];
  for (let i = 0; i < 5; i++) cs.push(await client('p' + i, '플레이어' + i, i === 0 ? 'tok' : undefined));
  cs.forEach((c, i) => send(c, { t: 'seat', char: CHARS[i] }));
  await wait(300);
  check(cs[0].last.state.seats.filter((s: any) => s.kind === 'human').length === 5, '5명 모두 착석');
  act(cs[0], { type: 'advance' }); await wait(150); // prologue
  check(cs[0].last.state.phase === 'prologue', '프롤로그 시작');
  for (let r = 1; r <= 3; r++) {
    act(cs[0], { type: 'advance' }); await wait(200);
    const st = cs[0].last.state;
    check(st.phase === 'investigate' && st.round === r, `라운드 ${r} 조사 시작`);
    const pool = CARDS.filter((c) => c.round === r).map((c) => c.id);
    let k = 0;
    for (const c of cs) for (let n = 0; n < 2 && k < pool.length; n++) { act(c, { type: 'draw', card: pool[k++] }); await wait(40); }
    await wait(200);
    const taken = Object.values(cs[0].last.state.cards).filter((x: any) => x.owner).length;
    check(taken >= Math.min(10, pool.length) , `라운드 ${r} 카드 조사됨 (누적 ${taken})`);
    // 남의 비공개 카드는 안 보여야 한다: 클라이언트 0의 상태에서 다른 사람 카드 owner는 보이지만 공개 여부 확인
    act(cs[1], { type: 'reveal', card: pool[2] }); await wait(150);
    check(cs[3].last.state.cards[pool[2]].public === true, `라운드 ${r} 공개 카드가 모두에게 공유`);
    if (r === 2) {
      cs[2].ws.close(); await wait(300);
      const jaegu = cs[0].last.state.seats.find((s: any) => s.id === 'jaegu');
      check(jaegu.connected === false && jaegu.kind === 'human', '진행 중 끊김 → 자리 유지');
      cs[2] = await client('p2-restarted', '플레이어2');
      send(cs[2], { t: 'rejoin', seat: 'jaegu' }); await wait(250);
      check(cs[2].last.you === 'jaegu', '재접속 후 같은 자리(정재구)로 복귀');
    }
    act(cs[0], { type: 'advance' }); await wait(200);
    check(cs[0].last.state.phase === 'discuss', `라운드 ${r} 토론 단계`);
    act(cs[3], { type: 'present', cards: [pool[2]] }); await wait(100);
  }
  act(cs[0], { type: 'advance' }); await wait(200);
  check(cs[0].last.state.phase === 'final', '최종 추리 단계');
  // 일반 참가자는 진행(advance)을 못 한다
  act(cs[4], { type: 'advance' }); await wait(150);
  check(cs[0].last.state.phase === 'final', '호스트가 아니면 단계 진행 불가');
  for (let i = 0; i < 4; i++) { act(cs[i], { type: 'submit', report: CORRECT }); await wait(80); }
  await wait(150);
  check(cs[4].last.state.reports.seonbin === undefined, '제출 전에는 남의 보고서가 안 보임');
  act(cs[4], { type: 'submit', report: { ...CORRECT, culprit: 'jaegu' } }); await wait(300);
  check(cs.every((c) => c.last.state.phase === 'ending'), '5명 모두 엔딩 화면 수신');
  console.log('엔딩:', cs[0].last.state.result?.ending);
  check(cs[0].last.state.result?.ending === 'A', '과반이 진범 지목 → 엔딩 A');
  check(Object.keys(cs[4].last.state.reports).length === 5, '엔딩에서 전원 보고서 공개');
  cs.forEach((c) => c.ws.close());
  await srv.close();
  console.log(fails ? `${fails}개 실패` : '전부 통과');
  process.exit(fails ? 1 : 0);
})();
