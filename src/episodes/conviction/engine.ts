// 「흔들리지 않는 신념으로」 재판 진행 엔진. 순수 함수: (상태, 행동) → 새 상태.
// 흐름: [증거 배분 → 비밀 대화 → 공개 재판] × 3라운드 → 최후 질의 → 구형 → 판결 → 엔딩
import { EVIDENCE, KEY_ITEMS, ROLES, RULES, SUSPECTS, type EndingId, type Evidence, type KeyItem, type RoleId, type SuspectId } from './data';

export type Phase = 'evidence' | 'secret' | 'trial' | 'final-qa' | 'sentence' | 'verdict' | 'ending';
export type Plea = 'guilty' | 'innocent';

export interface TrialState {
  schema: 1;
  seed: number;
  /** 지금까지 뽑은 횟수 (난수 진행용) */
  draws: number;
  player: RoleId;
  phase: Phase;
  round: number;
  /** 뽑힌 증거 카드 (미정 카드 포함) */
  cards: Record<string, Evidence>;
  hands: Record<RoleId, string[]>;
  /** 이번 라운드에 남은 선택 횟수 / 강력 용의자 보너스(무죄 증거만) */
  picks: Record<RoleId, number>;
  bonus: Record<RoleId, number>;
  /** 이번 라운드 검사·판사가 지목한 용의자 */
  targets: Partial<Record<RoleId, SuspectId>>;
  /** 라운드별 강력 용의자 (인덱스 = 라운드-1) */
  strong: (SuspectId | null)[];
  sentence: Partial<Record<SuspectId, Plea>>;
  verdict: SuspectId | null;
  ending: EndingId | null;
  log: string[];
}

export type TrialAction =
  | { type: 'pick'; role: RoleId; kind: Evidence['kind']; about: SuspectId }
  | { type: 'designate'; suspect: SuspectId }
  | { type: 'sentence'; suspect: SuspectId; plea: Plea }
  | { type: 'verdict'; suspect: SuspectId }
  | { type: 'advance' };

const ROLE_IDS = ROLES.map((r) => r.id);
const isSuspect = (r: RoleId): r is SuspectId => (SUSPECTS as RoleId[]).includes(r);
const byRole = <T>(f: (r: RoleId) => T) => Object.fromEntries(ROLE_IDS.map((r) => [r, f(r)])) as Record<RoleId, T>;

/** 결정적 난수 (seed, n번째) → [0, 1) */
function rand(seed: number, n: number): number {
  let t = (seed + n * 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** 라운드 시작 시 각 역할의 선택 횟수 */
export function allowance(role: RoleId, strongLastRound: SuspectId | null): { picks: number; bonus: number } {
  if (role === 'prosecutor') return { picks: RULES.prosecutorPicks, bonus: 0 };
  if (role === 'judge') return { picks: RULES.judgePicks, bonus: 0 };
  return { picks: RULES.suspectPicks, bonus: strongLastRound === role ? RULES.strongBonus : 0 };
}

function startRound(s: TrialState, round: number): void {
  const last = s.strong[round - 2] ?? null;
  s.round = round;
  s.phase = 'evidence';
  s.targets = {};
  for (const r of ROLE_IDS) {
    const a = allowance(r, last);
    s.picks[r] = a.picks;
    s.bonus[r] = a.bonus;
  }
  s.log.push(`제${round}라운드 — 증거 배분`);
}

export function createTrial(player: RoleId, seed = Date.now()): TrialState {
  const s: TrialState = {
    schema: 1, seed: seed >>> 0, draws: 0, player, phase: 'evidence', round: 1,
    cards: {}, hands: byRole(() => []), picks: byRole(() => 0), bonus: byRole(() => 0),
    targets: {}, strong: [], sentence: {}, verdict: null, ending: null, log: [],
  };
  startRound(s, 1);
  return s;
}

/** 이 역할이 지금 이 증거를 고를 수 있는지 (이유 문자열, 가능하면 null) */
export function pickBlocked(s: TrialState, role: RoleId, kind: Evidence['kind'], about: SuspectId): string | null {
  if (s.phase !== 'evidence') return '증거 배분 시간이 아닙니다';
  if (isSuspect(role)) {
    if (kind === 'innocence' && about !== role) return '무죄 증거는 자신에 대한 것만 고를 수 있습니다';
    if (kind === 'attack' && about === role) return '자신을 공격할 수는 없습니다';
    if (kind === 'innocence' && s.bonus[role] > 0) return null;
    return s.picks[role] > 0 ? null : '이번 라운드 선택을 모두 썼습니다';
  }
  if (kind !== 'attack') return '검사와 판사는 공격 증거만 얻습니다';
  const target = s.targets[role];
  if (target && target !== about) return '이번 라운드에는 한 용의자만 지목할 수 있습니다';
  return s.picks[role] > 0 ? null : '이번 라운드 선택을 모두 썼습니다';
}

function draw(s: TrialState, role: RoleId, kind: Evidence['kind'], about: SuspectId): string {
  const taken = new Set(Object.keys(s.cards));
  const pool = EVIDENCE.filter((e) => e.kind === kind && e.about === about && !taken.has(e.id));
  // 핵심 증거는 그것을 찾아야 할 사람에게만 나온다
  const fit = pool.filter((e) => !e.key || KEY_ITEMS[e.key].finder === role);
  s.draws += 1;
  if (fit.length > 0) {
    const card = fit[Math.floor(rand(s.seed, s.draws) * fit.length)];
    s.cards[card.id] = card;
    return card.id;
  }
  const n = Object.keys(s.cards).filter((id) => id.startsWith(`stub-${kind}-${about}`)).length + 1;
  const id = `stub-${kind}-${about}-${n}`;
  const name = ROLES.find((r) => r.id === about)!.name;
  s.cards[id] = { id, kind, about, title: `${kind === 'innocence' ? '무죄' : '공격'} 증거 · ${name}`, text: '증거 카드 본문 집필 중' };
  return id;
}

function pick(s: TrialState, role: RoleId, kind: Evidence['kind'], about: SuspectId): void {
  if (isSuspect(role) && kind === 'innocence' && s.bonus[role] > 0) s.bonus[role] -= 1;
  else s.picks[role] -= 1;
  if (!isSuspect(role)) s.targets[role] = about;
  s.hands[role].push(draw(s, role, kind, about));
}

/** 용의자 한 사람에 대한 혐의 점수: 공격 증거 수 − 무죄 증거 수 */
export function suspicion(s: TrialState, who: SuspectId): number {
  let n = 0;
  for (const id of Object.values(s.hands).flat()) {
    const c = s.cards[id];
    if (c.about === who) n += c.kind === 'attack' ? 1 : -1;
  }
  return n;
}

/** 가장 의심스러운 용의자. 검사가 유죄를 구형한 사람에게 무게를 더 둔다 (판사는 구형과 증거를 함께 본다) */
const mostSuspected = (s: TrialState): SuspectId => {
  const weight = (x: SuspectId) => suspicion(s, x) + (s.sentence[x] === 'guilty' ? 2 : 0);
  return [...SUSPECTS].sort((a, b) => weight(b) - weight(a))[0];
};

/** 플레이어가 아닌 역할은 남은 선택을 정해진 방식으로 쓴다 */
function npcPicks(s: TrialState): void {
  for (const role of ROLE_IDS) {
    if (role === s.player) continue;
    if (isSuspect(role)) {
      const others = SUSPECTS.filter((x) => x !== role);
      while (s.bonus[role] > 0) pick(s, role, 'innocence', role);
      while (s.picks[role] > 0) {
        s.draws += 1;
        const attack = rand(s.seed, s.draws) < 1 / 3;
        if (attack) pick(s, role, 'attack', others[Math.floor(rand(s.seed, s.draws + 7) * others.length)]);
        else pick(s, role, 'innocence', role);
      }
    } else {
      s.draws += 1;
      const target = s.targets[role] ?? SUSPECTS[Math.floor(rand(s.seed, s.draws) * SUSPECTS.length)];
      while (s.picks[role] > 0) pick(s, role, 'attack', target);
    }
  }
}

/**
 * 검사가 구형을 마칠 수 있는지 (이유 문자열, 가능하면 null).
 * 혼자 하기에서 검사가 플레이어면 판사는 컴퓨터이므로, 반드시 한 명만 유죄로 구형해야 한다 (07 진행서 'NPC 판사 진행 규칙').
 */
export function sentenceBlocked(s: TrialState): string | null {
  if (s.phase !== 'sentence' || s.player !== 'prosecutor') return null;
  if (SUSPECTS.some((x) => !s.sentence[x])) return '세 피고인 모두에게 구형해야 합니다';
  if (SUSPECTS.filter((x) => s.sentence[x] === 'guilty').length !== 1) return '판사가 컴퓨터일 때는 한 명만 유죄로 구형해야 합니다';
  return null;
}

/** 개인 목표 판정. null 은 대화로만 드러나 게임이 판정할 수 없는 목표 */
export function goalResults(s: TrialState, role: RoleId = s.player): { label: string; done: boolean | null; note?: string }[] {
  const labels = ROLES.find((r) => r.id === role)!.goals;
  const acquitted = (x: SuspectId) => s.phase === 'ending' && s.verdict !== x;
  const results: Record<RoleId, (boolean | null)[]> = {
    // '범인을 찾는다'는 끝내 알 수 없는 진상이므로 판정하지 않는다
    judge: [null, s.ending !== 'E2'],
    prosecutor: [null, null],
    kim: [acquitted('kim'), found(s, 'bomb')],
    // 피고인 셋은 모두 의열단원이다. 마자르가 풀려나면 함께 풀려난 동지가 반드시 한 명 있다
    mazar: [acquitted('mazar'), acquitted('mazar')],
    yun: [acquitted('yun'), !s.strong.includes('yun')],
  };
  const notes: Partial<Record<RoleId, (string | undefined)[]>> = {
    judge: ['진범은 끝내 알 수 없었다'],
    prosecutor: ['진범은 끝내 알 수 없었다', '대화로 정해지는 목표'],
  };
  return labels.map((label, i) => ({ label, done: results[role][i], note: notes[role]?.[i] }));
}

/** 핵심 증거를 찾아야 할 사람이 손에 넣었는지 */
export function found(s: TrialState, item: KeyItem): boolean {
  const finder = KEY_ITEMS[item].finder;
  return s.hands[finder].some((id) => s.cards[id]?.key === item);
}

/** 기획서 5장 엔딩 매트릭스 */
export function endingFor(guilty: SuspectId, has: Record<KeyItem, boolean>): EndingId {
  if (guilty === 'kim') return has.bomb ? 'E2' : 'E1';
  if (guilty === 'yun') return has.diary ? 'E4' : 'E3';
  return has.note ? 'E6' : 'E5';
}

function finish(s: TrialState, guilty: SuspectId): void {
  s.verdict = guilty;
  s.ending = endingFor(guilty, { bomb: found(s, 'bomb'), diary: found(s, 'diary'), note: found(s, 'note') });
  s.phase = 'ending';
  s.log.push(`판결 — ${ROLES.find((r) => r.id === guilty)!.name} 유죄`);
}

export function applyTrial(prev: TrialState, action: TrialAction): TrialState {
  const s: TrialState = structuredClone(prev);
  switch (action.type) {
    case 'pick':
      if (pickBlocked(s, action.role, action.kind, action.about)) return prev;
      pick(s, action.role, action.kind, action.about);
      return s;
    case 'designate':
      if (s.phase !== 'trial' || s.strong[s.round - 1]) return prev;
      s.strong[s.round - 1] = action.suspect;
      s.log.push(`강력 용의자 지명 — ${ROLES.find((r) => r.id === action.suspect)!.name}`);
      return s;
    case 'sentence':
      if (s.phase !== 'sentence') return prev;
      s.sentence[action.suspect] = action.plea;
      return s;
    case 'verdict':
      if (s.phase !== 'verdict') return prev;
      finish(s, action.suspect);
      return s;
    case 'advance':
      return advance(s) ? s : prev;
  }
}

function advance(s: TrialState): boolean {
  switch (s.phase) {
    case 'evidence':
      npcPicks(s);
      s.phase = 'secret';
      s.log.push('비밀 대화');
      return true;
    case 'secret':
      s.phase = 'trial';
      s.log.push('공개 재판');
      return true;
    case 'trial':
      // 검사가 NPC면 가장 의심스러운 용의자를 강력 용의자로 지명한다
      if (s.player !== 'prosecutor' && !s.strong[s.round - 1]) s.strong[s.round - 1] = mostSuspected(s);
      s.strong[s.round - 1] ??= null;
      if (s.round < RULES.rounds) startRound(s, s.round + 1);
      else {
        s.phase = 'final-qa';
        s.log.push('최후 질의 — 더 이상 증거를 모을 수 없습니다');
      }
      return true;
    case 'final-qa':
      s.phase = 'sentence';
      s.log.push('구형');
      return true;
    case 'sentence':
      if (s.player !== 'prosecutor') {
        const top = mostSuspected(s);
        for (const x of SUSPECTS) s.sentence[x] = x === top ? 'guilty' : 'innocent';
      } else if (sentenceBlocked(s)) return false;
      s.phase = 'verdict';
      s.log.push('판결');
      return true;
    case 'verdict':
      // 판사가 NPC면 반드시 한 사람만 유죄로 판결한다
      if (s.player === 'judge') return false;
      finish(s, mostSuspected(s));
      return true;
    case 'ending':
      return false;
  }
}
