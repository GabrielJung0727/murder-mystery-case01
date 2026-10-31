// EP.02 도전 과제와 기록: 판이 끝날 때 플레이어 기준으로 판정한다. 1막 기록(gongjakso.progress)과 키를 나눠 쓴다.
import { ENDINGS, ROLES, SUSPECTS, type EndingId, type RoleId, type SuspectId } from './data';
import { found, goalResults, type TrialState } from './engine';

/** 여러 판에 걸친 기록 */
export interface Records {
  endings: EndingId[];
  /** 엔딩까지 플레이한 역할 */
  roles: RoleId[];
  /** 도전 과제 id → 달성 시각 (epoch ms) */
  achievements: Record<string, number>;
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  check: (s: TrialState, r: Records) => boolean;
}

const isSuspect = (r: RoleId): r is SuspectId => (SUSPECTS as RoleId[]).includes(r);

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_trial', title: '첫 공판', desc: '재판을 끝까지 마친다.', check: () => true },
  { id: 'all_endings', title: '여섯 개의 판결', desc: '엔딩 여섯 개를 모두 본다.', check: (_s, r) => r.endings.length >= Object.keys(ENDINGS).length },
  { id: 'e2', title: '대한 독립 만세', desc: '법정 의거 엔딩을 본다.', check: (s) => s.ending === 'E2' },
  { id: 'e6', title: '담장 너머', desc: '서대문형무소 구출 엔딩을 본다.', check: (s) => s.ending === 'E6' },
  { id: 'e4', title: '오랜 벗', desc: '우정과 특별사면 엔딩을 본다.', check: (s) => s.ending === 'E4' },
  { id: 'bomb', title: '짐 꾸러미 속 쇳덩이', desc: '김익상으로 폭탄을 찾는다.', check: (s) => s.player === 'kim' && found(s, 'bomb') },
  { id: 'diary', title: '낡은 대학일기', desc: '오미하라 하세다로 대학일기를 찾는다.', check: (s) => s.player === 'judge' && found(s, 'diary') },
  { id: 'note', title: '호텔 객실의 쪽지', desc: '초머 마자르로 연락쪽지를 찾는다.', check: (s) => s.player === 'mazar' && found(s, 'note') },
  {
    id: 'goals', title: '흔들리지 않는 신념', desc: '한 판에서 판정되는 개인 목표를 모두 이룬다.',
    check: (s) => {
      const judged = goalResults(s).filter((g) => g.done !== null);
      return judged.length > 0 && judged.every((g) => g.done);
    },
  },
  {
    id: 'silence', title: '침묵은 금', desc: '세 라운드 모두 묵비권을 쓰고도 유죄를 피한다.',
    check: (s) => isSuspect(s.player) && [1, 2, 3].every((n) => s.silent[s.player as SuspectId].includes(n)) && s.verdict !== s.player,
  },
  { id: 'unnamed', title: '이름 없는 상인', desc: '윤치형으로 한 번도 강력 용의자로 지명되지 않는다.', check: (s) => s.player === 'yun' && !s.strong.includes('yun') },
  {
    id: 'fair', title: '공정한 구형', desc: '검사로 유죄를 구형한 바로 그 사람이 유죄 판결을 받는다.',
    check: (s) => s.player === 'prosecutor' && !!s.verdict && s.sentence[s.verdict] === 'guilty',
  },
  { id: 'all_roles', title: '다섯 개의 자리', desc: '다섯 역할로 모두 재판을 마친다.', check: (_s, r) => ROLES.every((x) => r.roles.includes(x.id)) },
];

const KEY = 'conviction.records';
const EMPTY: Records = { endings: [], roles: [], achievements: {} };

const addSorted = <T extends string>(list: T[], item: T | null | undefined): T[] =>
  item && !list.includes(item) ? [...list, item].sort() : list;

/** 순수 함수: 끝난 한 판을 기록에 반영하고 새로 달성한 도전 과제를 돌려준다 */
export function applyTrialRecord(prev: Records, s: TrialState, now: number): { next: Records; unlocked: string[] } {
  const base: Records = { ...prev, endings: addSorted(prev.endings, s.ending), roles: addSorted(prev.roles, s.player) };
  const unlocked = ACHIEVEMENTS.filter((a) => !base.achievements[a.id] && a.check(s, base)).map((a) => a.id);
  const achievements = { ...base.achievements };
  for (const id of unlocked) achievements[id] = now;
  return { next: { ...base, achievements }, unlocked };
}

function load(): Records {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Records> | null;
    return { endings: raw?.endings ?? [], roles: raw?.roles ?? [], achievements: raw?.achievements ?? {} };
  } catch {
    return EMPTY;
  }
}

let current: Records = load();
/** 같은 판을 두 번 반영하지 않도록 (React StrictMode 의 이중 실행 포함) */
let lastGame: { key: string; unlocked: string[] } | null = null;

export const records = {
  get: (): Records => current,
  /** 엔딩 화면에서 한 번 부른다. 같은 판(seed)으로 다시 부르면 처음 결과를 그대로 돌려준다 */
  finish(s: TrialState): string[] {
    const key = `${s.seed}-${s.player}`;
    if (lastGame?.key === key) return lastGame.unlocked;
    const { next, unlocked } = applyTrialRecord(current, s, Date.now());
    current = next;
    try {
      localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
      /* 저장 불가 시 이번 실행에만 유지 */
    }
    lastGame = { key, unlocked };
    return unlocked;
  },
};
