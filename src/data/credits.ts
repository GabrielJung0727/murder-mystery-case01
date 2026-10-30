// 사건 기록실 (아카이브 크레딧) — 제공받은 원문 그대로
export const CREDITS_TITLE = 'MURDER MYSTERY / CASE 01: 공작소의 밤';
export const CREDITS_SUBTITLE = '[ 기밀 수사 기록실 // 아카이브 크레딧 ]';

export const CREDIT_SECTIONS: { title: string; lines: string[] }[] = [
  { title: '기획', lines: ['강한울 (Hanul Kang) / H&J Workshop AND I-RANG'] },
  { title: '프로그래밍 (Lead Development)', lines: ['정재원 (Gabriel Jung) / DoubleJ'] },
  { title: 'UI/UX 디자인 및 대시보드 인터페이스', lines: ['DoubleJ UI/UX 디자인 팀'] },
  { title: '시나리오 아키텍처 및 FSM 심문 로직 검증', lines: ['시스템 콜라보레이터: US DoubleJ AI & DEvir / DoubleJ Q&A Team'] },
  {
    title: '오디오 디자인 및 앰비언스 BGM',
    lines: ['펜션 현장 음향 디자인: Rodrigo Morales / EA Battlefield & Yeji Jung / Audio Artist at EA, Game Audio Instructor'],
  },
  {
    title: '특별 감사 (Special Thanks)',
    lines: ['숲속 고립된 단독 펜션에서 밤을 지새운 5인의 용의자들', '공작소 규정집을 끝까지 파헤친 모든 수사관 여러분'],
  },
];

export const CREDITS_QUOTE = '"진실은 흐려져도, 의심은 멈추지 않는다."';
export const CREDITS_NEXT = '다음 이야기: 흔들리지 않는 신념';
export const CREDITS_TBC = 'TO BE CONTINUED...';
export const creditsBuildLine = (version: string) => `BUILD v${version}-STABLE // ALL RIGHTS RESERVED`;
