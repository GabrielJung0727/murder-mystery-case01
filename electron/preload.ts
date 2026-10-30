import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('gongjakso', {
  isElectron: true,
  hostStart: (port: number) => ipcRenderer.invoke('host:start', port),
  hostStop: () => ipcRenderer.invoke('host:stop'),
  setFullscreen: (on: boolean) => ipcRenderer.invoke('win:fullscreen', on),
  setZoom: (factor: number) => ipcRenderer.invoke('win:zoom', factor),
  quit: () => ipcRenderer.invoke('app:quit'),
});
