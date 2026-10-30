// Electron preload 가 노출하는 API (브라우저 개발 모드에서는 없음)
export interface HostInfo {
  port: number;
  token: string;
  addresses: string[];
}

interface Bridge {
  isElectron: true;
  hostStart(port: number): Promise<HostInfo>;
  hostStop(): Promise<void>;
  setFullscreen(on: boolean): Promise<void>;
  setZoom(factor: number): Promise<void>;
  quit(): Promise<void>;
}

export const bridge: Bridge | undefined = typeof window === 'undefined' ? undefined : (window as unknown as { gongjakso?: Bridge }).gongjakso;

declare const __APP_VERSION__: string;
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';

const CLEARED_KEY = 'gongjakso.singleCleared';

export function hasClearedSingle(): boolean {
  try {
    return localStorage.getItem(CLEARED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markSingleCleared(): void {
  try {
    localStorage.setItem(CLEARED_KEY, '1');
  } catch {
    /* 저장 불가 환경에서는 해금이 유지되지 않을 뿐 */
  }
}
