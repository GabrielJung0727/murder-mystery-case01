import { describe, expect, it } from 'vitest';
import manifest from './audio.json';
import { ENDINGS, SUSPECTS, type EndingId } from './data';
import { applyTrial, createTrial, type TrialState } from './engine';
import { LINES, ROLE_INTRO, endingSteps, endingTrack, phaseTrack, trialCue } from './sound';

const advance = (s: TrialState) => applyTrial(s, { type: 'advance' });

describe('EP.02 audio manifest', () => {
  it('has a track for every phase and ending, looping where the music sits under play', () => {
    const phases = ['evidence', 'secret', 'trial', 'final-qa', 'sentence', 'verdict'] as const;
    for (const id of [...phases.map(phaseTrack), 'CV-OST01']) {
      const t = manifest.music[id as keyof typeof manifest.music];
      expect(t.loop).toBe(true);
      expect(t.loopEnd).toBeGreaterThan(t.loopStart + 10);
    }
    for (const e of Object.keys(ENDINGS) as EndingId[]) expect(manifest.music[endingTrack(e) as keyof typeof manifest.music].loop).toBe(false);
    expect(manifest.music['CV-OST02'].loop).toBe(false);
  });

  it('names every recording after a script ID (narration or a known character line)', () => {
    for (const id of Object.keys(manifest.voice)) expect(id.startsWith('CV-NAR-') || id in LINES).toBe(true);
    for (const id of Object.values(ROLE_INTRO)) expect(LINES[id]).toBeDefined();
  });

  it('has the one-shot sounds the trial uses', () => {
    for (const id of ['CV-SFX-GAVEL', 'CV-SFX-STAMP', 'CV-SFX-GUNSHOT']) expect(manifest.sfx[id as keyof typeof manifest.sfx].length).toBeGreaterThan(0);
    expect(manifest.loops['CV-SFX-RAIN'].duration).toBeGreaterThan(10);
  });
});

describe('trial cues', () => {
  it('opens a new trial with the judge and prosecutor, and stays quiet on resume', () => {
    const s = createTrial('kim', 1);
    expect(trialCue(null, s).lines.slice(0, 2)).toEqual(['CV-HASEDA-01', 'CV-YOSHI-01']);
    const picked = applyTrial(s, { type: 'pick', role: 'kim', kind: 'innocence', about: 'kim' });
    expect(trialCue(null, picked)).toEqual({ lines: [], sfx: [] });
  });

  it('strikes the gavel on each phase change and reads the round', () => {
    const s = advance(advance(createTrial('kim', 1)));
    const next = advance(s);
    const cue = trialCue(s, next);
    expect(cue.sfx).toContain('CV-SFX-GAVEL');
    expect(cue.lines).toContain('CV-NAR-R2');
  });

  it('names the strong suspect with a stamp when the computer prosecutor picks one', () => {
    const s = advance(advance(createTrial('kim', 3)));
    const next = advance(s);
    const named = next.strong[0]!;
    const cue = trialCue(s, next);
    expect(cue.lines.slice(0, 1)).toEqual([`CV-YOSHI-05-${named.toUpperCase()}`]);
    expect(cue.sfx).toContain('CV-SFX-STAMP');
  });

  it('answers the player prosecutor sentence with a plea line and a stamp', () => {
    let s = createTrial('prosecutor', 2);
    for (let i = 0; i < 10; i++) s = advance(s);
    expect(s.phase).toBe('sentence');
    const next = applyTrial(s, { type: 'sentence', suspect: 'kim', plea: 'guilty' });
    expect(trialCue(s, next)).toEqual({ lines: ['CV-YOSHI-G'], sfx: ['CV-SFX-STAMP'] });
  });

  it('has the player suspect claim silence and the judge record it', () => {
    let s = createTrial('mazar', 4);
    s = advance(advance(s));
    const next = applyTrial(s, { type: 'silence', suspect: 'mazar' });
    expect(trialCue(s, next).lines).toEqual(['CV-MAZAR-04', 'CV-HASEDA-03']);
  });

  it('does nothing when only the memo changes', () => {
    const s = createTrial('yun', 5);
    expect(trialCue(s, applyTrial(s, { type: 'note', text: '메모' }))).toEqual({ lines: [], sfx: [] });
  });
});

describe('ending sound', () => {
  it('reads the verdict for the guilty suspect first, then each ending its own way', () => {
    for (const x of SUSPECTS) {
      const steps = endingSteps(x, x === 'kim' ? 'E2' : x === 'yun' ? 'E3' : 'E6');
      expect(steps[0]).toEqual({ say: [`CV-HASEDA-V-${x.toUpperCase()}`, 'CV-HASEDA-VJ', 'CV-HASEDA-06'] });
    }
    expect(endingSteps('kim', 'E2')).toContainEqual({ say: ['CV-KIM-08'] });
    expect(endingSteps('kim', 'E2').findIndex((s) => 'sfx' in s && s.sfx === 'CV-SFX-BOMB'))
      .toBeGreaterThan(endingSteps('kim', 'E2').findIndex((s) => 'say' in s && s.say[0] === 'CV-KIM-08'));
  });
});
