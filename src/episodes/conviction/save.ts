// 「흔들리지 않는 신념으로」 자동 저장. 1막(gongjakso.*)과 키를 나눠 쓴다.
import type { TrialState } from './engine';

const KEY = 'conviction.save';

export function loadTrial(): TrialState | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as TrialState | null;
    if (!(s && s.schema === 1 && s.phase !== 'ending' && s.hands && s.cards)) return null;
    // v2.6 이전 저장: 묵비권·메모가 없던 시절
    return { ...s, silent: s.silent ?? { mazar: [], yun: [], kim: [] }, notes: s.notes ?? '' };
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
