// EP.02 소리: 음악·환경음·효과음·대사. 녹음 목록은 docs/에셋_요청서.md, 파일은 audio.json (scripts/prepare_conviction_audio.py).
// 녹음이 없는 ID 는 조용히 건너뛴다.
import { useEffect } from 'react';
import { audio, type MusicTrack } from '../../audio/director';
import manifest from './audio.json';
import { KEY_ITEMS, SUSPECTS, type EndingId, type KeyItem, type RoleId, type SuspectId } from './data';
import { suspicion, type Phase, type TrialState } from './engine';

type Sfx = 'CV-SFX-GAVEL' | 'CV-SFX-STAMP' | 'CV-SFX-GUNSHOT' | 'CV-SFX-HOOVES' | 'CV-SFX-CROWD' | 'CV-SFX-CELL' | 'CV-SFX-BOMB' | 'CV-SFX-BOMB-FAR';

const MUSIC = manifest.music as Record<string, Omit<MusicTrack, 'id' | 'title' | 'titleEn'>>;
const VOICE = manifest.voice as Record<string, { src: string; duration: number }>;
const SFX = manifest.sfx as Record<string, { src: string; duration: number }[]>;
const LOOPS = manifest.loops as Record<string, { src: string }>;

/** 지금 재생 중 표시용 곡 이름 */
const TITLES: Record<string, [string, string]> = {
  'CV-OST01': ['흔들리지 않는 신념으로', 'With Unwavering Conviction'],
  'CV-OST02': ['총성', 'The Gunshot'],
  'CV-OST03': ['증거 배분', 'The Evidence'],
  'CV-OST04': ['비밀 대화', 'Whispers'],
  'CV-OST05': ['공개 재판', 'Open Court'],
  'CV-OST06': ['판결', 'The Verdict'],
  'CV-OST07': ['희생', 'Sacrifice'],
  'CV-OST08': ['의거', 'The Uprising'],
  'CV-OST09': ['에필로그', 'Epilogue'],
};

/** 자막으로 띄우는 인물 대사. orig 는 일본어·헝가리어 원문 (text 는 우리말). 나레이션은 화면 글과 같아 띄우지 않는다 */
export const LINES: Record<string, { who: RoleId; text: string; orig?: string }> = {
  'CV-HASEDA-01': { who: 'judge', text: '지금부터 조선 총독 암살 미수 사건의 재판을 시작하겠소. 개정.' },
  'CV-HASEDA-02': { who: 'judge', text: '정숙. 법정에서는 묻는 말에만 답하시오.' },
  'CV-HASEDA-03': { who: 'judge', text: '피고인, 묵비권을 행사하겠소? …좋소. 기록하시오.' },
  'CV-HASEDA-04': { who: 'judge', text: '검사, 구형하시오.' },
  'CV-HASEDA-05': { who: 'judge', text: '본 재판관은 검사의 구형과 제출된 증거를 종합하여, 다음과 같이 판결한다.' },
  'CV-HASEDA-V-KIM': { who: 'judge', text: '피고인 김익상에게 유죄를 선고한다.' },
  'CV-HASEDA-V-YUN': { who: 'judge', text: '피고인 윤치형에게 유죄를 선고한다.' },
  'CV-HASEDA-V-MAZAR': { who: 'judge', text: '피고인 초머 마자르에게 유죄를 선고한다.' },
  'CV-HASEDA-VJ': { who: 'judge', orig: '被告人を有罪とする。', text: '피고인을 유죄로 한다.' },
  'CV-HASEDA-06': { who: 'judge', text: '이것으로 폐정한다.' },
  'CV-HASEDA-07': { who: 'judge', text: '…이 이름은. 설마, 자네였나.' },
  'CV-HASEDA-08': { who: 'judge', text: '…미안하네. 친구.' },
  'CV-HASEDA-09': { who: 'judge', text: '누가 날 죽이려 하든, 이 재판은 끝까지 간다.' },
  'CV-YOSHI-01': { who: 'prosecutor', text: '검사 하네즈가와 요시입니다. 조선총독부의 명에 따라 이 사건의 진상을 밝히겠습니다.' },
  'CV-YOSHI-02': { who: 'prosecutor', text: '증거를 제출합니다.' },
  'CV-YOSHI-03': { who: 'prosecutor', text: '피고인, 그날 밤 어디에 있었습니까.' },
  'CV-YOSHI-04': { who: 'prosecutor', text: '대답하지 않는 것도 대답입니다.' },
  // 이름 자리를 비운 원본 녹음. 게임에서는 이름이 든 아래 세 줄을 쓴다
  'CV-YOSHI-05': { who: 'prosecutor', text: '본 검사는 이번 라운드의 강력 용의자로 피고인 ○○○를 지명합니다.' },
  'CV-YOSHI-05-KIM': { who: 'prosecutor', text: '…강력 용의자로 피고인 김익상을 지명합니다.' },
  'CV-YOSHI-05-YUN': { who: 'prosecutor', text: '…강력 용의자로 피고인 윤치형을 지명합니다.' },
  'CV-YOSHI-05-MAZAR': { who: 'prosecutor', text: '…강력 용의자로 피고인 초머 마자르를 지명합니다.' },
  'CV-YOSHI-06': { who: 'prosecutor', text: '일대일로 묻겠습니다. 일 분입니다.' },
  'CV-YOSHI-07': { who: 'prosecutor', text: '지금부터 공개 재판을 선언합니다. 본 검사는 수집한 증거와 진술을 종합하여 구형하겠습니다.' },
  'CV-YOSHI-G': { who: 'prosecutor', text: '유죄를 구형합니다.' },
  'CV-YOSHI-I': { who: 'prosecutor', text: '무죄를 구형합니다.' },
  'CV-YOSHI-07J': { who: 'prosecutor', orig: '検察官として、有罪を求刑いたします。', text: '검사로서 유죄를 구형합니다.' },
  'CV-YOSHI-08': { who: 'prosecutor', text: '…조선어로 꿈을 꾼 게 언제였더라.' },
  'CV-YOSHI-09': { who: 'prosecutor', text: '위에서 뭐라 하든, 저는 공정하게 하겠습니다.' },
  'CV-KIM-01': { who: 'kim', text: '김익상. 교사입니다.' },
  'CV-KIM-02': { who: 'kim', text: '저는 그날, 죽으려고 했습니다. 총은 그래서 가지고 있었던 겁니다.' },
  'CV-KIM-03': { who: 'kim', text: '…묵비권을 행사하겠습니다.' },
  'CV-KIM-04': { who: 'kim', text: '저는 조선인을 때리던 자를 막았을 뿐입니다. 총독은 쏘지 않았습니다.' },
  'CV-KIM-05': { who: 'kim', text: '마음대로 하십시오.' },
  'CV-KIM-06': { who: 'kim', text: '…감사합니다.' },
  'CV-KIM-07': { who: 'kim', text: '(…)' },
  'CV-KIM-08': { who: 'kim', text: '대한 독립 만세!' },
  'CV-KIM-09': { who: 'kim', text: '…이거다.' },
  'CV-MAZAR-01': { who: 'mazar', text: '저는 초머 마자르. 헝가리 기자입니다.' },
  'CV-MAZAR-02': { who: 'mazar', text: '저는 사진을 찍었을 뿐입니다. 카메라는 총이 아닙니다.' },
  'CV-MAZAR-03': { who: 'mazar', text: '제가 총독을 쏘아서 얻는 게 무엇입니까? 아무것도 없습니다.' },
  'CV-MAZAR-04': { who: 'mazar', text: '…묵비권. 맞습니까, 이 말? 그것을 쓰겠습니다.' },
  'CV-MAZAR-05': { who: 'mazar', text: '이것은… 불공정합니다.' },
  'CV-MAZAR-06': { who: 'mazar', text: '고맙습니다. 세상은 이 재판을 기억할 겁니다.' },
  'CV-MAZAR-07': { who: 'mazar', orig: 'Éljen a szabad Korea!', text: '자유 대한 만세!' },
  'CV-MAZAR-08': { who: 'mazar', text: '김원봉… 아직 끝나지 않았어.' },
  'CV-YUN-01': { who: 'yun', text: '장사꾼 윤치형이올시다.' },
  'CV-YUN-02': { who: 'yun', text: '그 자리에 있었던 것뿐이오. 장사하던 사람이 좌판을 정리하는 게 죄요?' },
  'CV-YUN-03': { who: 'yun', text: '허허, 돈으로 풀려난 게 어디 나 하나뿐이겠소.' },
  'CV-YUN-04': { who: 'yun', text: '…묵비권을 행사하겠소.' },
  'CV-YUN-05': { who: 'yun', text: '…하필 나를.' },
  'CV-YUN-06': { who: 'yun', text: '고맙소. 정의가 아직 이 땅에 조금은 남았구려.' },
  'CV-YUN-07': { who: 'yun', text: '…그렇게 되었구먼.' },
  'CV-YUN-08': { who: 'yun', text: '…자네, 혹시. 아니오. 아무것도 아니오.' },
};

const KEY: Record<SuspectId, string> = { kim: 'KIM', mazar: 'MAZAR', yun: 'YUN' };
/** 배역 고를 때 그 인물의 첫 마디 */
export const ROLE_INTRO: Record<RoleId, string> = {
  judge: 'CV-HASEDA-02', prosecutor: 'CV-YOSHI-01', kim: 'CV-KIM-01', mazar: 'CV-MAZAR-01', yun: 'CV-YUN-01',
};
const SILENCE: Record<SuspectId, string> = { kim: 'CV-KIM-03', mazar: 'CV-MAZAR-04', yun: 'CV-YUN-04' };
const STRONG_REACT: Record<SuspectId, string> = { kim: 'CV-KIM-05', mazar: 'CV-MAZAR-05', yun: 'CV-YUN-05' };
/** 공개 재판에서 컴퓨터 피고인이 하는 변론 (라운드마다 번갈아) */
const DEFENSE: Record<SuspectId, [string, string]> = {
  kim: ['CV-KIM-02', 'CV-KIM-04'], mazar: ['CV-MAZAR-02', 'CV-MAZAR-03'], yun: ['CV-YUN-02', 'CV-YUN-03'],
};
/** 비밀 대화 때 플레이어 인물의 속마음 (라운드 → 대사) */
const INNER: Partial<Record<RoleId, Record<number, string>>> = {
  judge: { 2: 'CV-HASEDA-09' }, prosecutor: { 2: 'CV-YOSHI-08', 3: 'CV-YOSHI-09' }, yun: { 2: 'CV-YUN-08' },
};
/** 핵심 증거를 손에 넣은 사람의 속마음 */
const FOUND: Record<KeyItem, string> = { bomb: 'CV-KIM-09', diary: 'CV-HASEDA-07', note: 'CV-MAZAR-08' };

// ------------------------------------------------------------------ 재생

export const has = (id: string) => id in VOICE;

/** 재판 단계 → 곡 */
export function phaseTrack(phase: Phase): string {
  if (phase === 'evidence') return 'CV-OST03';
  if (phase === 'secret') return 'CV-OST04';
  if (phase === 'trial') return 'CV-OST05';
  return 'CV-OST06';
}

/** 엔딩 → 곡 (희생 엔딩 E1·E3·E5 는 애도곡, 나머지는 의거·해방곡) */
export const endingTrack = (e: EndingId) => (e === 'E1' || e === 'E3' || e === 'E5' ? 'CV-OST07' : 'CV-OST08');

export function music(id: string | null, fade = 3): void {
  const t = id ? MUSIC[id] : undefined;
  if (!id || !t) return audio.playTrack(null, fade);
  const [title, titleEn] = TITLES[id] ?? [id, id];
  audio.playTrack({ ...t, id, title, titleEn }, fade);
}

/** 빗소리 (0 이면 끈다) */
export function rain(level: number, seconds = 3): void {
  const loop = LOOPS['CV-SFX-RAIN'];
  audio.setBed(level > 0 && loop ? loop.src : null, level, seconds);
}

const lastShot: Record<string, number> = {};
export function sfx(id: Sfx, gain = 1, duck = false): void {
  const list = SFX[id];
  if (!list?.length) return;
  let i = Math.floor(Math.random() * list.length);
  if (list.length > 1 && i === lastShot[id]) i = (i + 1) % list.length;
  lastShot[id] = i;
  audio.oneShot(list[i].src, gain, duck ? list[i].duration : 0);
}

/** 대사를 순서대로 읽는다. 녹음이 없는 줄은 건너뛰고, 읽을 줄이 하나도 없으면 읽던 것을 끊지 않는다 */
export function say(ids: string[], delay = 0, onEnd?: () => void): void {
  const lines = ids.filter(has).map((id) => ({ id, src: VOICE[id].src }));
  if (lines.length === 0) return onEnd?.();
  audio.speak(lines, delay, onEnd);
}

/** 에피소드에 들어와 있는 동안: 1막 환경음을 끄고, 나갈 때 2막 소리를 모두 정리한다 */
export function useEpisodeSound(): void {
  useEffect(() => {
    audio.setAmbience(0, 0, 1.5);
    return () => {
      audio.stopNarration();
      music(null, 1.5);
      rain(0, 1.5);
    };
  }, []);
}

// ------------------------------------------------------------------ 재판 신호

export interface Cue { lines: string[]; sfx: Sfx[] }

/**
 * 재판 상태가 바뀔 때 울릴 대사와 효과음 (순수 함수).
 * prev 가 null 이면 재판 화면에 막 들어온 것이다 (새 재판이면 개정 선언, 이어하기면 조용히).
 */
export function trialCue(prev: TrialState | null, next: TrialState): Cue {
  const lines: string[] = [];
  const fx: Sfx[] = [];
  const me = next.player;
  if (!prev) {
    const fresh = next.round === 1 && next.phase === 'evidence' && Object.keys(next.cards).length === 0;
    return fresh ? { lines: ['CV-HASEDA-01', 'CV-YOSHI-01', 'CV-NAR-R1'], sfx: ['CV-SFX-GAVEL'] } : { lines: [], sfx: [] };
  }

  // 컴퓨터 검사가 라운드를 넘기며 강력 용의자를 지명했거나, 플레이어 검사가 지명했다
  const r = prev.round - 1;
  const named = !prev.strong[r] && next.strong[r];
  if (named) {
    lines.push(`CV-YOSHI-05-${KEY[named]}`, STRONG_REACT[named]);
    fx.push('CV-SFX-STAMP');
  }

  // 핵심 증거를 찾아야 할 사람이 플레이어이고, 방금 손에 넣었다
  const newCards = next.hands[me].slice(prev.hands[me].length);
  for (const id of newCards) {
    const key = next.cards[id]?.key;
    if (key && KEY_ITEMS[key].finder === me) lines.push(FOUND[key]);
  }

  if (prev.phase !== next.phase) {
    if (next.phase !== 'ending') fx.push('CV-SFX-GAVEL');
    switch (next.phase) {
      case 'evidence':
        lines.push(`CV-NAR-R${next.round}`);
        break;
      case 'secret': {
        lines.push('CV-NAR-S1');
        const inner = INNER[me]?.[next.round];
        if (inner) lines.push(inner);
        break;
      }
      case 'trial': {
        lines.push('CV-NAR-J1', next.round === 2 ? 'CV-HASEDA-02' : 'CV-YOSHI-03');
        const npc = SUSPECTS.filter((x) => x !== me);
        const quiet = npc.filter((x) => next.silent[x].includes(next.round));
        for (const x of quiet) lines.push(SILENCE[x]);
        if (quiet.length) lines.push('CV-YOSHI-04');
        // 묵비권을 쓰지 않은 컴퓨터 피고인 중 혐의가 가장 무거운 사람이 변론한다
        const speaker = npc.filter((x) => !quiet.includes(x)).sort((a, b) => suspicion(next, b) - suspicion(next, a))[0];
        if (speaker) lines.push(DEFENSE[speaker][(next.round - 1) % 2]);
        break;
      }
      case 'final-qa':
        lines.push('CV-NAR-Q1');
        break;
      case 'sentence':
        lines.push('CV-HASEDA-04', 'CV-YOSHI-07');
        break;
      case 'verdict':
        // 컴퓨터 검사의 구형은 이때 정해진다
        if (me !== 'prosecutor') {
          lines.push('CV-YOSHI-07J');
          fx.push('CV-SFX-STAMP');
        }
        lines.push('CV-NAR-V1', 'CV-HASEDA-05');
        break;
      default:
        break;
    }
    return { lines, sfx: fx };
  }

  // 같은 단계 안에서: 플레이어의 묵비권, 플레이어 검사의 구형
  if (next.phase === 'trial' && SUSPECTS.includes(me as SuspectId)) {
    const x = me as SuspectId;
    if (next.silent[x].length > prev.silent[x].length) lines.push(SILENCE[x], 'CV-HASEDA-03');
  }
  if (next.phase === 'sentence') {
    for (const x of SUSPECTS) {
      const plea = next.sentence[x];
      if (plea && plea !== prev.sentence[x]) {
        lines.push(plea === 'guilty' ? 'CV-YOSHI-G' : 'CV-YOSHI-I');
        fx.push('CV-SFX-STAMP');
      }
    }
  }
  return { lines, sfx: fx };
}

export type Step = { say: string[] } | { sfx: Sfx; wait: number };

/** 엔딩 화면의 소리 순서: 판결 선고 → 엔딩마다 다른 효과음과 대사 → 엔딩 낭독 */
export function endingSteps(guilty: SuspectId, ending: EndingId): Step[] {
  const verdict: Step = { say: [`CV-HASEDA-V-${KEY[guilty]}`, 'CV-HASEDA-VJ', 'CV-HASEDA-06'] };
  const nar = `CV-NAR-${ending}`;
  switch (ending) {
    case 'E1': return [verdict, { sfx: 'CV-SFX-CELL', wait: 1.5 }, { say: ['CV-KIM-07', nar] }];
    case 'E2': return [verdict, { say: ['CV-KIM-08'] }, { sfx: 'CV-SFX-BOMB', wait: 4 }, { say: [nar] }];
    case 'E3': return [verdict, { sfx: 'CV-SFX-CELL', wait: 1.5 }, { say: ['CV-YUN-07', nar] }];
    case 'E4': return [verdict, { say: ['CV-HASEDA-08', nar] }];
    case 'E5': return [verdict, { say: ['CV-MAZAR-07'] }, { sfx: 'CV-SFX-CELL', wait: 1.5 }, { say: [nar] }];
    case 'E6': return [verdict, { sfx: 'CV-SFX-BOMB-FAR', wait: 2.5 }, { say: ['CV-MAZAR-07', nar] }];
  }
}

/** 순서대로 재생한다. 돌려준 함수를 부르면 멈춘다 */
export function playSteps(steps: Step[]): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = (i: number) => {
    if (stopped || i >= steps.length) return;
    const st = steps[i];
    if ('say' in st) say(st.say, i === 0 ? 0.4 : 0.3, () => run(i + 1));
    else {
      sfx(st.sfx, 0.9, true);
      timer = setTimeout(() => run(i + 1), st.wait * 1000);
    }
  };
  run(0);
  return () => {
    stopped = true;
    clearTimeout(timer);
    audio.stopNarration();
  };
}
