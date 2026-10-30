import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('gongjakso', {
  isElectron: true,
  hostStart: (port: number) => ipcRenderer.invoke('host:start', port),
  hostStop: () => ipcRenderer.invoke('host:stop'),
  setFullscreen: (on: boolean) => ipcRenderer.invoke('win:fullscreen', on),
  setZoom: (factor: number) => ipcRenderer.invoke('win:zoom', factor),
  quit: () => ipcRenderer.invoke('app:quit'),
  onUpdate: (fn: (status: unknown) => void) => {
    const listener = (_e: unknown, status: unknown) => fn(status);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  },
  installUpdate: () => ipcRenderer.invoke('update:install'),
});
