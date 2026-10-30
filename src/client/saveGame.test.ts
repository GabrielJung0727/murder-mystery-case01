import { describe, expect, it } from 'vitest';
import { applyAction, createOnlineGame, createSingleGame } from '../engine/engine';
import { parseSave } from './saveGame';

const wrap = (o: object) => JSON.stringify({ schema: 1, savedAt: 1, ...o });

describe('single save', () => {
  it('round-trips a game in progress', () => {
    let state = createSingleGame('detective', 7);
    state = applyAction(state, { type: 'advance' });
    state = applyAction(state, { type: 'draw', seat: 'detective', card: '01' });
    const save = parseSave(wrap({ player: 'detective', state }));
    expect(save?.state).toEqual(state);
  });

  it('rejects broken, finished, online or mismatched saves', () => {
    const state = createSingleGame('seongcheol', 7);
    expect(parseSave(null)).toBeNull();
    expect(parseSave('{not json')).toBeNull();
    expect(parseSave(JSON.stringify({ schema: 0, savedAt: 1, player: 'seongcheol', state }))).toBeNull();
    expect(parseSave(wrap({ player: 'seongcheol', state: { ...state, phase: 'ending' } }))).toBeNull();
    expect(parseSave(wrap({ player: 'seongcheol', state: createOnlineGame() }))).toBeNull();
    expect(parseSave(wrap({ player: 'detective', state }))).toBeNull(); // 수사관 자리가 없는 판
  });
});
