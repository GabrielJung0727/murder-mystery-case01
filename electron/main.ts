import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron';
import { randomBytes } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { startHostServer, type HostServer } from '../src/net/hostServer';

let win: BrowserWindow | null = null;
let server: HostServer | null = null;

function lanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((n): n is NonNullable<typeof n> => !!n && n.family === 'IPv4' && !n.internal)
    .map((n) => n.address);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: '#0b0f17',
    title: '공작소의 밤',
    icon: path.join(__dirname, '../dist/icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) void win.loadURL(devUrl);
  else void win.loadFile(path.join(__dirname, '../dist/index.html'));
}

ipcMain.handle('host:start', async (_e, port: number) => {
  if (server) await server.close();
  const token = randomBytes(16).toString('hex');
  server = await startHostServer(port, token);
  return { port: server.port, token, addresses: lanAddresses() };
});

ipcMain.handle('host:stop', async () => {
  await server?.close();
  server = null;
});

ipcMain.handle('win:fullscreen', (e, on: boolean) => {
  BrowserWindow.fromWebContents(e.sender)?.setFullScreen(!!on);
});

ipcMain.handle('win:zoom', (e, factor: number) => {
  e.sender.setZoomFactor(Math.min(1.5, Math.max(0.75, Number(factor) || 1)));
});

ipcMain.handle('app:quit', async () => {
  await server?.close();
  server = null;
  app.quit();
});

app.whenReady().then(() => {
  // 배포판: 기본 메뉴(새로고침·개발자 도구 단축키 포함)를 없앤다. 새로고침하면 진행 중인 판이 끊긴다.
  if (app.isPackaged) Menu.setApplicationMenu(null);
  createWindow();
});
app.on('window-all-closed', async () => {
  await server?.close();
  app.quit();
});
