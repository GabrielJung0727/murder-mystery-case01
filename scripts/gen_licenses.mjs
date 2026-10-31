// 배포판에 함께 들어가는 오픈소스의 라이선스 고지를 만든다: node scripts/gen_licenses.mjs
// 결과: public/THIRD_PARTY_NOTICES.txt (배포 폴더용 전문), src/data/THIRD_PARTY_NOTICES.txt (게임 안 표시용 같은 전문),
//       src/data/licenses.json (사건 기록실 목록)
// 개발 도구(vite, esbuild, ffmpeg-static 등)는 배포판에 들어가지 않으므로 제외한다.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const NOTES = {
  electron: '실행 환경. Chromium 등 내장 구성 요소의 고지는 배포 폴더의 LICENSES.chromium.html 에 있습니다.',
  '@fontsource/special-elite': '글꼴 Special Elite (Astigmatic)',
  '@fontsource/nanum-gothic-coding': '글꼴 나눔고딕코딩 (NAVER)',
  '@fontsource/nanum-myeongjo': '글꼴 나눔명조 (NAVER)',
  '@fontsource/nanum-pen-script': '글꼴 나눔손글씨 펜 (NAVER)',
};

const names = [...Object.keys(pkg.dependencies), 'electron'].sort();
const list = [];
let text = `공작소 도서관 v${pkg.version} — 오픈소스 라이선스 고지\n이 프로그램은 아래 오픈소스 소프트웨어를 포함합니다.\n`;
for (const name of names) {
  const dir = join(root, 'node_modules', name);
  const meta = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const license = typeof meta.license === 'string' ? meta.license : meta.license?.type ?? 'UNKNOWN';
  const body = readFileSync(join(dir, 'LICENSE'), 'utf8').trim();
  list.push({ name, version: meta.version, license, note: NOTES[name] ?? '' });
  text += `\n${'='.repeat(72)}\n${name} ${meta.version} (${license})\n${NOTES[name] ? NOTES[name] + '\n' : ''}${'-'.repeat(72)}\n${body}\n`;
}
writeFileSync(join(root, 'public', 'THIRD_PARTY_NOTICES.txt'), text);
writeFileSync(join(root, 'src', 'data', 'THIRD_PARTY_NOTICES.txt'), text);
writeFileSync(join(root, 'src', 'data', 'licenses.json'), JSON.stringify(list, null, 2) + '\n');
console.log('THIRD_PARTY_NOTICES.txt:', list.map((l) => `${l.name}@${l.version} ${l.license}`).join(', '));
