import { app, ipcMain, type BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import { appendFileSync } from 'node:fs';
import path from 'node:path';

/** 화면에 보내는 업데이트 상태 (src/client/bridge.ts 의 UpdateStatus 와 같다) */
export type UpdateStatus =
  | { state: 'downloading'; version: string; percent: number }
  | { state: 'ready'; version: string };

/**
 * GitHub 릴리스에서 새 버전을 확인해 뒤에서 받아 둔다.
 * 받은 업데이트는 플레이어가 [지금 재시작]을 누르거나, 게임을 끌 때 설치된다.
 * 설치형(NSIS)에서만 동작한다. 개발 실행·인터넷 없음은 조용히 넘어간다.
 */
export function setupUpdater(getWin: () => BrowserWindow | null): void {
  ipcMain.handle('update:install', () => autoUpdater.quitAndInstall(true, true));
  if (!app.isPackaged) return;

  // 친구들이 문제를 알려 줄 때 볼 수 있게 %APPDATA%/공작소의 밤/update.log 에 남긴다
  const logFile = path.join(app.getPath('userData'), 'update.log');
  const log = (msg: string) => {
    try {
      appendFileSync(logFile, `${new Date().toISOString()} v${app.getVersion()} ${msg}\n`);
    } catch {
      /* 기록 실패는 무시 */
    }
  };
  const send = (status: UpdateStatus) => getWin()?.webContents.send('update:status', status);

  // 테스트용: 다른 주소(로컬 서버 등)에서 업데이트를 받아 본다
  if (process.env.GONGJAKSO_UPDATE_URL) autoUpdater.setFeedURL({ provider: 'generic', url: process.env.GONGJAKSO_UPDATE_URL });

  let pending = '';
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-available', (info) => {
    pending = info.version;
    log(`available ${info.version}`);
    send({ state: 'downloading', version: info.version, percent: 0 });
  });
  autoUpdater.on('update-not-available', () => log('up to date'));
  autoUpdater.on('download-progress', (p) => {
    send({ state: 'downloading', version: pending, percent: Math.round(p.percent) });
  });
  autoUpdater.on('update-downloaded', (info) => {
    log(`downloaded ${info.version}`);
    send({ state: 'ready', version: info.version });
  });
  autoUpdater.on('error', (err) => log(`error ${err?.message ?? err}`));

  // 창이 뜨고 나서 확인한다 (시작을 늦추지 않도록)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => log(`check failed ${err?.message ?? err}`));
  }, 4000);
}
