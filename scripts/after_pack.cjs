// electron-builder afterPack: 게임 실행 파일에 아이콘과 버전 정보를 넣는다.
// signAndEditExecutable 을 끈 상태(winCodeSign 압축 해제가 심볼릭 링크 권한 문제로 실패)라
// electron-builder 가 직접 하지 않으므로, 설치 후 바로가기 아이콘이 Electron 기본 아이콘이 되는 것을 막는다.
const path = require('node:path');
const rcedit = require('rcedit');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;
  const info = context.packager.appInfo;
  const productFilename = info.productFilename;
  const exe = path.join(context.appOutDir, `${productFilename}.exe`);
  await rcedit(exe, {
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    'file-version': info.version,
    'product-version': info.version,
    'version-string': {
      ProductName: info.productName,
      FileDescription: info.productName,
      CompanyName: 'DoubleJ',
      LegalCopyright: `© ${new Date().getFullYear()} DoubleJ`,
      OriginalFilename: `${productFilename}.exe`,
    },
  });
  console.log(`  • afterPack: 아이콘·버전 정보 적용 ${path.basename(exe)} v${info.version}`);
};
