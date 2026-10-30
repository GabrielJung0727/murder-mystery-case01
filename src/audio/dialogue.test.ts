import { describe, expect, it } from 'vitest';
import { applyAction, createSingleGame } from '../engine/engine';
import type { GameState } from '../engine/types';
import { dialogue, step } from './dialogue';
import { enqueueNewLines } from './useGameAudio';

describe('typewriter step', () => {
  it('skips stage directions in parentheses without a blip', () => {
    const t = '(입술을 떨며) 아니에요';
    const s = step(t, 0, 20, 2, 0);
    expect(t.slice(0, s.pos)).toBe('(입술을 떨며)');
    expect(s.blip).toBe(false);
  });

  it('pauses on ellipses and sentence ends, blips every other letter', () => {
    expect(step('...네', 0, 20, 2, 0)).toMatchObject({ pos: 3, blip: false, delay: 450 });
    expect(step('네!', 1, 20, 2, 0).delay).toBe(300);
    expect(step('가나', 0, 20, 2, 0).blip).toBe(true);
    expect(step('가나', 1, 20, 2, 1).blip).toBe(false);
    expect(step('가나.', 1, 20, 2, 2).sentenceEnd).toBe(true);
    expect(step('a b', 1, 20, 2, 0)).toMatchObject({ blip: false, delay: 30 });
  });
});

describe('dialogue queue', () => {
  it('queues NPC reactions from the game log and hides them until typed', () => {
    let s: GameState = { ...createSingleGame('detective', 4), phase: 'discuss', round: 2 };
    s.cards = { ...s.cards, '23': { owner: null, public: true, inspectedBy: [] } };
    const next = applyAction(s, { type: 'present', seat: 'detective', target: 'seonbin', cards: ['23'] });
    enqueueNewLines(s, next);
    const reaction = next.log.find((e) => e.kind === 'reaction' && e.id > s.logSeq)!;
    expect(dialogue.isTyping(reaction.id)).toBe(true);
    expect(dialogue.visible(reaction.id, reaction.text).length).toBeLessThan(reaction.text.length);
    dialogue.reset();
    expect(dialogue.visible(reaction.id, reaction.text)).toBe(reaction.text);
  });
});

describe('reaction cuts in front of waiting opening lines', () => {
  it('shows waiting lines in full and types the reaction first', () => {
    dialogue.reset();
    dialogue.enqueue({ id: 9001, char: 'jaegu', text: '오프닝 대사입니다.', shaken: false, afterVoice: true });
    dialogue.enqueue({ id: 9002, char: 'arin', text: '반응 대사입니다.', shaken: false, afterVoice: false });
    expect(dialogue.visible(9001, '오프닝 대사입니다.')).toBe('오프닝 대사입니다.');
    expect(dialogue.isTyping(9002)).toBe(true);
    expect(dialogue.isTyping(9001)).toBe(false);
    dialogue.reset();
  });
});
