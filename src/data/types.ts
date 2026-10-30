export type CharId = 'seongcheol' | 'yeojin' | 'seonbin' | 'arin' | 'jaegu';
export type CardId = string; // '01' ~ '35'
export type Round = 1 | 2 | 3;
export type ZoneId =
  | 'jjokbang' | 'living' | 'entrance' | 'kitchen' | 'bath1' | 'hall' | 'storage'
  | 'r201' | 'r202' | 'r203' | 'stairs' | 'common2' | 'bath2' | 'veranda' | 'yard';

export type PhoneApp = 'messenger' | 'call' | 'gallery';

export interface Card {
  id: CardId;
  round: Round;
  location: string;
  zone: ZoneId;
  title: string;
  text: string;
  /** 스마트폰 에뮬레이터에 표시되는 디지털 증거 */
  phone?: PhoneApp;
  /** 돋보기 인스펙터 대상 카드: 확대 조사 시 해금되는 태그 */
  inspectTag?: string;
  /** 진행자 해설 (엔딩 후 복기 화면에서만 공개) */
  note: string;
}

export interface Character {
  id: CharId;
  name: string;
  mbti: string;
  gender: string;
  tagline: string;
  publicInfo: string;
  secret: string;
  alibi: string;
  knows: string[];
  hide: string[];
  goal: string;
  firstLine: string;
  /** 인게임 대표 색 */
  color: string;
}

export interface Claim {
  id: string;
  char: CharId;
  from: string; // HH:MM
  to: string;
  label: string;
  contradictedBy: CardId[];
  verifiedBy: CardId[];
}
