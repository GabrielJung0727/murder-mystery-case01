import { describe, expect, it } from 'vitest';
import art from './art.json';
import { ASSETS, cutFor, roomFor } from './assets';
import { ENDINGS, EVIDENCE, PROLOGUE } from './data';

describe('EP.02 art', () => {
  it('has a picture for every ending, the epilogue and every courtroom phase', () => {
    for (const e of [...Object.keys(ENDINGS), 'EP'] as (keyof typeof ASSETS.endings)[]) expect(ASSETS.endings[e]).toBeTruthy();
    expect(roomFor('trial', true)).toBe(ASSETS.rooms.court);
    expect(roomFor('secret', true)).toBe(ASSETS.rooms.bench);
    expect(roomFor('secret', false)).toBe(ASSETS.rooms.dock);
    expect(roomFor('final-qa', false)).toBe(ASSETS.rooms.interview);
  });

  it('walks the prologue through the four cuts, the gunshot on its own', () => {
    const shot = PROLOGUE.findIndex((l) => l.shot) + 1;
    expect(cutFor(1)).toBe(ASSETS.cuts[0]);
    expect(cutFor(shot)).toBe(ASSETS.cuts[1]);
    expect(cutFor(PROLOGUE.length)).toBe(ASSETS.cuts[3]);
  });

  it('only has photos for evidence cards that exist', () => {
    const ids = new Set(EVIDENCE.map((e) => e.id));
    for (const id of Object.keys(art.evidence)) expect(ids.has(id)).toBe(true);
  });

  it('puts every cursor tip inside its 32px image', () => {
    for (const c of Object.values(art.cursors)) {
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeLessThan(32);
    }
  });
});
