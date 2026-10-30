// 화면 설정: 전체 화면, UI 배율, 화면 효과(비·노이즈). PC에 저장하고 실행 시 다시 적용한다.
import { bridge } from './bridge';

export interface DisplaySettings {
  fullscreen: boolean;
  zoom: number;
  effects: boolean;
  /** 대사 표시 속도 배율. 0이면 즉시 표시 */
  textSpeed: number;
}

const KEY = 'gongjakso.display';
const DEFAULTS: DisplaySettings = { fullscreen: false, zoom: 1, effects: true, textSpeed: 1 };
export const TEXT_SPEEDS: { value: number; label: string }[] = [
  { value: 0.7, label: '느리게' }, { value: 1, label: '보통' }, { value: 1.6, label: '빠르게' }, { value: 0, label: '즉시' },
];
export const ZOOM_STEPS = [0.9, 1, 1.1, 1.25];

let current: DisplaySettings = (() => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return DEFAULTS;
  }
})();
const listeners = new Set<() => void>();

function apply(s: DisplaySettings): void {
  if (bridge) {
    void bridge.setFullscreen(s.fullscreen);
    void bridge.setZoom(s.zoom);
  } else {
    // 브라우저 개발 모드: 전체 화면은 사용자 제스처가 필요하므로 배율만 적용
    (document.documentElement.style as CSSStyleDeclaration & { zoom: string }).zoom = String(s.zoom);
  }
}

export const display = {
  get: (): DisplaySettings => current,
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  set(patch: Partial<DisplaySettings>): void {
    current = { ...current, ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
      /* 저장 불가 시 이번 실행에만 적용 */
    }
    apply(current);
    for (const fn of listeners) fn();
  },
  /** 앱 시작 시 저장된 설정을 창에 반영 */
  restore(): void {
    apply(current);
  },
};
