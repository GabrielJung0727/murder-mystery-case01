// 인터넷 서버(Render)에 방을 만들고 접속 주소를 만든다. 서버 쪽은 src/net/cloudServer.ts
const KEY = 'gongjakso.cloudUrl';

/** Render 블루프린트(render.yaml)의 서비스 이름으로 정해지는 기본 주소 */
export const DEFAULT_CLOUD_URL = 'https://gongjakso-night.onrender.com';

export function cloudBase(): string {
  try {
    return localStorage.getItem(KEY) || DEFAULT_CLOUD_URL;
  } catch {
    return DEFAULT_CLOUD_URL;
  }
}

export function setCloudBase(url: string): void {
  try {
    const clean = url.trim().replace(/\/+$/, '');
    if (!clean || clean === DEFAULT_CLOUD_URL) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, clean);
  } catch {
    /* 저장 불가 시 기본 주소를 쓴다 */
  }
}

/** 방 코드처럼 보이는 입력 (영문·숫자 4자) */
export const isRoomCode = (s: string): boolean => /^[A-Za-z0-9]{4}$/.test(s.trim());

export function roomWsUrl(base: string, code: string): string {
  return `${base.replace(/^http/, 'ws').replace(/\/+$/, '')}/r/${code.trim().toUpperCase()}`;
}

/**
 * 방을 만든다. 무료 서버는 쉬고 있으면 깨어나는 데 1분 가까이 걸리므로 넉넉히 기다린다.
 */
export async function createCloudRoom(base: string): Promise<{ code: string; token: string }> {
  const res = await fetch(`${base.replace(/\/+$/, '')}/rooms`, { method: 'POST', signal: AbortSignal.timeout(90_000) });
  const body = (await res.json().catch(() => ({}))) as { code?: string; token?: string; error?: string };
  if (!res.ok || !body.code || !body.token) throw new Error(body.error ?? `서버 응답 ${res.status}`);
  return { code: body.code, token: body.token };
}
