// 「흔들리지 않는 신념으로」 자동 저장. 1막(gongjakso.*)과 키를 나눠 쓴다.
import type { TrialState } from './engine';

const KEY = 'conviction.save';

export function loadTrial(): TrialState | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as TrialState | null;
    return s && s.schema === 1 && s.phase !== 'ending' && s.hands && s.cards ? s : null;
  } catch {
    return null;
  }
}

export function saveTrial(s: TrialState): void {
  try {
    if (s.phase === 'ending') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 저장 불가 시 이어하기만 빠진다 */
  }
}
