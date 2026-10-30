// 캐릭터별 블립 음색 (docs/캐릭터_블립_보이스_가이드.md 의 시작값을 수치로 옮김)
import type { CharId } from '../data/types';

export interface BlipProfile {
  wave: OscillatorType;
  /** 기준 음높이 (Hz) */
  base: number;
  /** 고역 차단 (Hz). 펄스파처럼 건조한 소리를 만들 때 낮춘다 */
  lowpass: number;
  gain: number;
  /** 초당 글자 수 */
  cps: number;
  /** 몇 글자마다 블립을 낼지 (1이면 매 글자) */
  every: number;
  /** 블립마다 무작위로 흔드는 음높이 폭 (반음) */
  variance: number;
  /** 문장 끝 직전 블립의 음높이를 내린다 */
  drop: boolean;
  /** 방어선이 무너졌을 때(상태 1 이상) 말투 변화 */
  shaken: { cps: number; variance: number; tremble: boolean };
}

export const BLIP_PROFILES: Record<CharId, BlipProfile> = {
  // 공손하지만 초조: 둥근 삼각파, 몰리면 빨라진다
  seongcheol: { wave: 'triangle', base: 175, lowpass: 3200, gain: 0.5, cps: 20, every: 2, variance: 1, drop: false, shaken: { cps: 26, variance: 2, tremble: false } },
  // 당돌하고 빠름: 밝은 사각파, 억양 큼
  yeojin: { wave: 'square', base: 470, lowpass: 3800, gain: 0.22, cps: 28, every: 2, variance: 4, drop: false, shaken: { cps: 31, variance: 5, tremble: false } },
  // 여리고 조용함: 사인파, 느림. 무너지면 떨림
  seonbin: { wave: 'sine', base: 620, lowpass: 6000, gain: 0.45, cps: 15, every: 2, variance: 0.5, drop: false, shaken: { cps: 13, variance: 3, tremble: true } },
  // 건조하고 단조로움: 펄스(사각파 + 로우패스), 억양 없음
  arin: { wave: 'square', base: 380, lowpass: 1500, gain: 0.3, cps: 21, every: 2, variance: 0.2, drop: false, shaken: { cps: 21, variance: 0.6, tremble: false } },
  // 단호하고 무게 있음: 저음 삼각파, 문장 끝이 내려간다
  jaegu: { wave: 'triangle', base: 135, lowpass: 2600, gain: 0.6, cps: 17, every: 2, variance: 1.5, drop: true, shaken: { cps: 18, variance: 2, tremble: false } },
};
