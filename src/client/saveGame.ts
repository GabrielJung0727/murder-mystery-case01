// 싱글 플레이 자동 저장: 행동할 때마다 한 칸에 덮어쓰고, 엔딩을 보면 지운다.
import type { GameState, SeatId } from '../engine/types';

const KEY = 'gongjakso.singleSave';
/** 저장 형식이 바뀌면 올린다. 다른 버전의 저장은 버린다(엔진 상태 구조가 다를 수 있음). */
const SCHEMA = 1;

export interface SingleSave {
  schema: number;
  player: SeatId;
  state: GameState;
  savedAt: number;
}

/** 저장 데이터가 이어하기에 쓸 만한지 확인한다 (순수 함수, 테스트 대상) */
export function parseSave(raw: string | null): SingleSave | null {
  if (!raw) return null;
  try {
    const save = JSON.parse(raw) as Partial<SingleSave>;
    if (save.schema !== SCHEMA || !save.player || !save.state || typeof save.savedAt !== 'number') return null;
    const { state } = save;
    if (state.mode !== 'single' || state.phase === 'ending' || !Array.isArray(state.seats) || !state.cards || !Array.isArray(state.log)) return null;
    if (!state.seats.some((s) => s.id === save.player && s.kind === 'human')) return null;
    // v2.1 이전 저장: 진범 변형·난이도가 없던 시절 → 원작·보통으로 이어 간다
    save.state = {
      ...state,
      variant: state.variant ?? 'v0',
      options: state.options ?? { variantMode: 'original', difficulty: 'normal' },
      stats: state.stats ?? { presents: 0, misses: 0 },
      presentsLeft: state.presentsLeft ?? null,
    };
    return save as SingleSave;
  } catch {
    return null;
  }
}

export function loadSingle(): SingleSave | null {
  try {
    return parseSave(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function saveSingle(player: SeatId, state: GameState): void {
  try {
    if (state.phase === 'ending') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify({ schema: SCHEMA, player, state, savedAt: Date.now() } satisfies SingleSave));
  } catch {
    /* 저장 불가 환경에서는 이어하기만 안 될 뿐 */
  }
}

export function clearSingle(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 무시 */
  }
}
