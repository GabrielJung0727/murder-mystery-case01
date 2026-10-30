// 에피소드 2 「흔들리지 않는 신념으로」 원본 데이터.
// 출처: [작업공작소] 흔들리지 않는 신념으로 — 개발 기획서 및 진행 가이드 v2 (2026-10-31 받음)
// 증거 카드 본문은 아직 없다. EVIDENCE 가 비어 있으면 엔진이 '미정 증거'로 자리를 채운다.

export type SuspectId = 'mazar' | 'yun' | 'kim';
export type RoleId = SuspectId | 'prosecutor' | 'judge';

export const SETTING = {
  date: '1920년 12월 16일',
  place: ['대일본제국 산하', '조선, 경성'],
  act: '작업공작소 머더 프로젝트 2막',
  footer: 'WORKSHOP GONGJAKSO // PROJECT ACT 2',
};

export const PROLOGUE = [
  '늦은 저녁, 경성 중앙.',
  '일본 순사들의 호위를 받으며 제복 차림의 현임 조선 총독 사이토 마코토가 모습을 드러냈다.',
  '그 순간, 단 한 발의 총알이 마코토의 복부를 관통했다. 범인은 군중 속으로 사라졌다.',
  '며칠 후, 조선총독부는 암살 미수 혐의로 세 명의 용의자를 재판에 공식 기소한다.',
];

/** 엔딩 뒤에 나오는 맺음말 (기획서 6장 '프롤로그 메시지') */
export const CLOSING =
  '끝내 누가 총독을 향해 총알을 발사했는지는 알 수 없었다. 하지만 그로 인해 세 명의 독립운동가가 위기에 처했었고, 결국 그들 중 누군가의 희생으로 재판을 넘길 수 있었다. ' +
  '어떤 결과가 있었던 그들은 모두 대한의 독립을 위한 여정을 지속해야만 했다. 모든 것이 캄캄하고, 암담하던 그 시절을 흔들리지 않는 신념으로 끝까지 독립을 향한 열정을 보인 그들의 노력은 지금의 대한을 있게 만들어주었다.';

export interface Role {
  id: RoleId;
  name: string;
  title: string;
  side: 'suspect' | 'court';
  brief: string;
}

export const ROLES: Role[] = [
  { id: 'mazar', name: '초머 마자르', title: '헝가리 출신 기자', side: 'suspect', brief: '용의자. 이방인의 눈으로 경성을 기록해 온 기자.' },
  { id: 'yun', name: '윤치형', title: '조선인 상인', side: 'suspect', brief: '용의자. 경성의 물건과 사람을 잇는 상인.' },
  { id: 'kim', name: '김익상', title: '조선인 교사', side: 'suspect', brief: '용의자. 아이들을 가르치는 교사.' },
  { id: 'prosecutor', name: '하네즈가와 요시', title: '담당 검사', side: 'court', brief: '조선총독부가 배정한 검사. 진상 규명과 즉시 처결을 지시받았다.' },
  { id: 'judge', name: '오미하라 하세다', title: '재판관', side: 'court', brief: '최종 판결을 내린다. 반드시 한 사람에게는 유죄를 선고해야 한다.' },
];

export const SUSPECTS: SuspectId[] = ['mazar', 'yun', 'kim'];
export const roleOf = (id: RoleId): Role => ROLES.find((r) => r.id === id)!;

/** 진행 규칙 (기획서 3·4장) */
export const RULES = {
  rounds: 3,
  /** 용의자: 매 라운드 무죄 증거 / 상대 공격 증거 중 고르는 횟수 */
  suspectPicks: 3,
  /** 검사: 매 라운드 용의자 1명을 지목해 공격 증거 2장 */
  prosecutorPicks: 2,
  /** 판사: 매 라운드 용의자 1명을 지목해 공격 증거 1장 */
  judgePicks: 1,
  /** 강력 용의자로 지명되면 다음 라운드 무죄 증거 +1 */
  strongBonus: 1,
  /** 화면에 보여 주는 권장 시간(초) */
  secretSeconds: 5 * 60,
  trialSeconds: 10 * 60,
  finalQaSecondsEach: 60,
};

/**
 * 엔딩을 가르는 핵심 증거 세 가지. 누가 손에 넣었는지로 판정한다.
 * (어느 증거 더미에서 나오는지는 기획서에 없어 아래 EVIDENCE 의 key 로 둔다 — 카드 확정 시 조정)
 */
export const KEY_ITEMS = {
  bomb: { name: '폭탄', finder: 'kim' as RoleId },
  diary: { name: '대학일기', finder: 'judge' as RoleId },
  note: { name: '연락쪽지', finder: 'mazar' as RoleId },
};
export type KeyItem = keyof typeof KEY_ITEMS;

export interface Evidence {
  id: string;
  /** innocence: 그 용의자가 무죄라는 증거 / attack: 그 용의자를 공격하는 증거 */
  kind: 'innocence' | 'attack';
  about: SuspectId;
  title: string;
  text: string;
  key?: KeyItem;
}

/**
 * 증거 카드 (집필 중). 지금은 엔딩을 가르는 핵심 증거 세 장만 자리를 잡아 두었다.
 * 해당 더미가 비면 엔진이 '미정 증거'로 채운다.
 */
export const EVIDENCE: Evidence[] = [
  { id: 'key-bomb', kind: 'innocence', about: 'kim', key: 'bomb', title: '폭탄', text: '카드 본문 집필 중' },
  { id: 'key-diary', kind: 'attack', about: 'yun', key: 'diary', title: '대학일기', text: '카드 본문 집필 중' },
  { id: 'key-note', kind: 'innocence', about: 'mazar', key: 'note', title: '연락쪽지', text: '카드 본문 집필 중' },
];

export type EndingId = 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6';

export const ENDINGS: Record<EndingId, { title: string; text: string }> = {
  E1: {
    title: '이름 없는 묘',
    text: '하세다는 김익상에게 유죄를 선고했다. 김익상은 모진 고문 끝에 숨을 거두었다. 먼 훗날 윤치형은 김원봉, 마자르와 함께 그의 묘를 찾아, 의열단의 목적이 같았음을 기렸다.',
  },
  E2: {
    title: '대한 독립 만세',
    text: '하세다는 김익상에게 유죄를 선고했다. 그 순간 김익상은 "대한 독립 만세"를 외치며 재판석에 폭탄을 던졌고, 그 자리에서 사살되었다. 1945년 8월 15일, 해방된 경성에서 윤치형은 마자르와 함께 김익상을 추모했다.',
  },
  E3: {
    title: '멈추지 않는 발걸음',
    text: '하세다는 대학일기를 끝내 보지 못한 채 윤치형에게 유죄를 선고했다. 윤치형은 모든 고문을 견디다 숨을 거두었다. 그러나 의열단의 움직임은 멈추지 않았다. 김익상의 총독부 폭탄 투척과 마자르의 폭탄 제조로 이어졌다.',
  },
  E4: {
    title: '재판관의 눈물',
    text: '대학일기를 읽은 하세다는 윤치형에게 유죄를 선고한 뒤 눈물을 흘리며 총독부에 특별 사면을 요청했다. 석방된 윤치형은 상해로 건너가 임시정부 요인을 만나 의열단에 다시 들어갔다. 하세다는 독립운동가를 도운 일본인으로 기록되었다.',
  },
  E5: {
    title: '이방인의 희생',
    text: '하세다는 마자르를 범인으로 지목했다. 마자르는 알 수 없는 말을 남기고 끌려갔다. 윤치형과 김익상은 총독부에 폭탄을 던지며 싸움을 이어 갔고, 해방 후 대한민국 정부는 마자르의 희생을 기억하며 그에게 독립운동가 칭호를 주었다.',
  },
  E6: {
    title: '세 사람의 의열',
    text: '하세다는 마자르를 범인으로 지목했다. 그러나 마자르는 감옥에서 대사관 직원을 통해 의열단 단장 김원봉에게 연락쪽지를 전했다. 김익상이 서대문형무소에 폭탄을 던져 마자르를 구해 냈고, 마자르가 만들고 윤치형이 옮기고 김익상이 던지는 체제로 세 사람 모두 독립운동가로 역사에 남았다.',
  },
};
