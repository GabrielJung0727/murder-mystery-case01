import { describe, expect, it } from 'vitest';
import { applyAction, createSingleGame } from '../engine/engine';
import type { GameState } from '../engine/types';
import manifest from './manifest.json';
import { diffEvents, sceneFor, tensionSpike } from './rules';

const ui = { interrogating: false, examined: false };

describe('music scenes', () => {
  it('follows the case: explore → investigate → interrogate → accusation → ending', () => {
    let s = createSingleGame('detective', 3);
    expect(sceneFor(s, ui).scene).toBe('explore');
    s = applyAction(s, { type: 'advance' });
    expect(sceneFor(s, ui).scene).toBe('explore');
    expect(sceneFor(s, { ...ui, examined: true }).scene).toBe('investigate');
    s = applyAction(s, { type: 'advance' });
    expect(sceneFor(s, ui).scene).toBe('investigate');
    expect(sceneFor(s, { ...ui, interrogating: true }).scene).toBe('interrogate');
    const final: GameState = { ...s, phase: 'final' };
    expect(sceneFor(final, ui).scene).toBe('accusation');
    expect(sceneFor({ ...s, phase: 'ending' }, ui).scene).toBe('ending');
  });

  it('keeps the clock quiet while investigating and loud while interrogating', () => {
    const s = { ...createSingleGame('detective', 3), phase: 'discuss' as const, round: 1 as const };
    expect(sceneFor(s, ui).clock).toBeLessThan(sceneFor(s, { ...ui, interrogating: true }).clock);
  });

  it('does not let tension alone pick the accusation track', () => {
    const s = { ...createSingleGame('detective', 3), phase: 'discuss' as const, round: 3 as const };
    expect(sceneFor(s, ui).scene).not.toBe('accusation');
  });
});

describe('audio events', () => {
  it('reports a clue when the player investigates and a break when an NPC cracks', () => {
    let s = createSingleGame('detective', 5);
    s = applyAction(s, { type: 'advance' });
    const drawn = applyAction(s, { type: 'draw', seat: 'detective', card: '04' });
    expect(diffEvents(s, drawn, 'detective').map((e) => e.kind)).toContain('clue');

    let d: GameState = { ...drawn, phase: 'discuss', round: 3 };
    d.cards = { ...d.cards, '23': { owner: null, public: true, inspectedBy: [] } };
    const cracked = applyAction(d, { type: 'present', seat: 'detective', target: 'seonbin', cards: ['23'] });
    const events = diffEvents(d, cracked, 'detective');
    expect(events).toContainEqual({ kind: 'break', level: 1 });
    expect(tensionSpike(events.find((e) => e.kind === 'break')!)).toBe(65);
  });

  it('is silent for identical states', () => {
    const s = createSingleGame('detective', 5);
    expect(diffEvents(s, s, 'detective')).toEqual([]);
    expect(diffEvents(null, s, 'detective')).toEqual([]);
  });
});

describe('audio manifest', () => {
  it('has every scene track, both loops and all one-shot kinds', () => {
    expect(Object.keys(manifest.music).sort()).toEqual(['ost01_menu', 'ost02_explore', 'ost03_investigate', 'ost04_interrogate', 'ost06_accusation', 'ost07_ending']);
    for (const t of Object.values(manifest.music)) expect(t.loopEnd).toBeGreaterThan(t.loopStart + 30);
    expect(manifest.clock.tickPeriod).toBeCloseTo(1, 1);
    for (const k of ['paper', 'metal', 'truth'] as const) expect(manifest.sfx[k].length).toBeGreaterThan(0);
  });
});

describe('narration', () => {
  it('has all 20 script IDs from docs/나레이션_대본.md', () => {
    const ids = ['B01', 'B02', 'B03', 'B04', 'B05', 'P01', 'R1', 'R2', 'R3', 'D1', 'D2', 'D3', 'F01', 'S01', 'E-A', 'E-B', 'E-C', 'E-D', 'T01', 'T02'].map((x) => `NAR-${x}`);
    expect(Object.keys(manifest.voice).sort()).toEqual(ids.sort());
  });

  it('reads the right line for each phase and skips discussion openings online', async () => {
    const { phaseNarration } = await import('./useGameAudio');
    let s = createSingleGame('detective', 2);
    expect(phaseNarration(s)).toBe('NAR-P01');
    s = applyAction(s, { type: 'advance' });
    expect(phaseNarration(s)).toBe('NAR-R1');
    s = applyAction(s, { type: 'advance' });
    expect(phaseNarration(s)).toBe('NAR-D1');
    expect(phaseNarration({ ...s, mode: 'online' })).toBeNull();
    expect(phaseNarration({ ...s, phase: 'final' })).toBe('NAR-F01');
    for (const id of ['NAR-P01', 'NAR-R1', 'NAR-D1', 'NAR-F01']) expect(id in manifest.voice).toBe(true);
  });
});
