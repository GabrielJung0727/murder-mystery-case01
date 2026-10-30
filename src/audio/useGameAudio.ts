import { useEffect, useRef } from 'react';
import { endingVoice } from './caseVoice';
import type { GameState, SeatId } from '../engine/types';
import type { CharId } from '../data/types';
import { dialogue } from './dialogue';
import { audio, type VoiceId } from './director';
import { diffEvents, MENU_MIX, sceneFor, tensionSpike, type AudioEvent, type UiContext } from './rules';

const SILENCE_BEFORE_REVEAL = 1500; // 기획서 5장: 1.5초 정적 후 엔딩 음악
const ENDING_VOICE_DELAY = 2.5; // 엔딩 음악이 깔린 뒤 나레이션 시작 (초)

/** 단계 진입 시 읽을 나레이션 (docs/나레이션_대본.md) */
export function phaseNarration(state: GameState): VoiceId | null {
  switch (state.phase) {
    case 'prologue': return 'NAR-P01';
    case 'investigate': return `NAR-R${state.round}` as VoiceId;
    case 'discuss': return state.mode === 'single' ? (`NAR-D${state.round}` as VoiceId) : null;
    case 'final': return 'NAR-F01';
    default: return null;
  }
}

/** 타이틀·설정·대기실: OST-01 + 빗소리 */
export function useMenuAudio(): void {
  useEffect(() => {
    audio.stopNarration();
    audio.setScene('menu', { fade: 3 });
    audio.setAmbience(MENU_MIX.rain, MENU_MIX.clock, 3);
    audio.setBaseTension(MENU_MIX.tension);
    audio.preload(['explore']);
  }, []);
}

function play(e: AudioEvent): void {
  switch (e.kind) {
    case 'clue':
      audio.sfx('truth', 0.75);
      break;
    case 'paper':
      audio.sfx('paper', 0.9);
      break;
    case 'break':
      audio.sfx('metal', e.level >= 2 ? 1 : 0.75);
      break;
    case 'contradiction':
      audio.sfx('metal', 0.9);
      break;
    case 'confession':
      audio.sfx('truth', 1);
      setTimeout(() => audio.sfx('metal', 0.6), 700);
      // 자백 대사가 끝까지 타이핑된 뒤 나레이션
      void dialogue.whenIdle().then(() => audio.narrate('NAR-S01', 0.8));
      break;
    case 'present':
      audio.sfx('metal', 0.5);
      break;
  }
  const spike = tensionSpike(e);
  if (spike !== null) audio.spike(spike);
}

/** 게임 화면: 단계·심문 여부로 음악 상태를, 상태 변화로 효과음·긴장도를 제어한다 */
export function useGameAudio(state: GameState, you: SeatId | null, ui: UiContext): void {
  const mix = sceneFor(state, ui);
  const ending = state.result?.ending;

  useEffect(() => {
    if (mix.scene === 'ending') {
      audio.setScene('silence');
      const t = setTimeout(() => {
        audio.setScene('ending', { variant: ending === 'A' ? 'truth' : 'false' });
        // 변형 사건은 그 변형의 녹음이 있을 때만 읽는다 (audio/caseVoice.ts)
        const voice = ending ? endingVoice(state.variant, ending) : null;
        if (voice) audio.narrate(voice, ENDING_VOICE_DELAY);
        audio.setAmbience(0.35, 0, 2);
        audio.setBaseTension(mix.tension);
        setTimeout(() => audio.rainFadeOut(45), 4000);
      }, SILENCE_BEFORE_REVEAL);
      return () => clearTimeout(t);
    }
    audio.setScene(mix.scene, { fade: mix.scene === 'accusation' ? 2 : mix.scene === 'investigate' ? 3 : 4 });
    audio.setAmbience(mix.rain, mix.clock, 3);
    audio.setBaseTension(mix.tension);
    audio.preload(mix.scene === 'explore' ? ['investigate', 'interrogate'] : ['accusation', 'ending']);
    return undefined;
  }, [mix.scene, mix.rain, mix.clock, mix.tension, ending]);

  // 단계가 바뀔 때마다 해당 나레이션 (판결 순간에는 정적을 위해 끊는다)
  const narrationKey = `${state.phase}-${state.round}`;
  useEffect(() => {
    const id = phaseNarration(state);
    if (id) audio.narrate(id, 0.8);
    else if (state.phase === 'ending') audio.stopNarration();
  }, [narrationKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const prev = useRef<GameState | null>(null);
  useEffect(() => {
    if (prev.current) enqueueNewLines(prev.current, state);
    for (const e of diffEvents(prev.current, state, you)) play(e);
    prev.current = state;
  }, [state, you]);

  // 게임 화면을 떠나면 타이핑 중인 대사를 정리
  useEffect(() => () => dialogue.reset(), []);
}

/** 새로 추가된 인물 대사(싱글 NPC)를 타자기에 넣는다 */
export function enqueueNewLines(prev: GameState, next: GameState): void {
  if (next.mode !== 'single' || next.logSeq <= prev.logSeq) return;
  for (const e of next.log) {
    if (e.id <= prev.logSeq || (e.kind !== 'line' && e.kind !== 'reaction') || !e.speaker || e.speaker === 'detective') continue;
    const char = e.speaker as CharId;
    const mind = next.npc[char];
    dialogue.enqueue({
      id: e.id,
      char,
      text: e.text,
      // 이선빈은 자백 단계(2)에서, 나머지는 첫 균열(1)부터 말투가 흔들린다
      shaken: (mind?.state ?? 0) >= (char === 'seonbin' ? 2 : 1),
      afterVoice: e.kind === 'line',
    });
  }
}
