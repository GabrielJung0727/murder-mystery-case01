// 에피소드 목록. 공작소 도서관의 책장(src/hub/Bookshelf.tsx)에 꽂히는 책 한 권이 에피소드 하나다.
// 새 에피소드는 여기에 한 줄 추가하고, Root 에 그 에피소드의 첫 화면 컴포넌트를 붙인다.
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/** 모든 에피소드 루트가 받는 props. 책장으로 돌아갈 때 onShelf 를 부른다 */
export interface EpisodeProps {
  onShelf: () => void;
}

export interface Episode {
  id: string;
  no: number;
  title: string;
  /** 책등 아래 짧은 장르 */
  genre: string;
  /** 표지 위쪽 영문 표기 */
  tagline: string;
  blurb: string;
  meta: string[];
  /** 표지·책등 색 */
  cover: { base: string; edge: string; ink: string };
  /** 고를 때의 연출. blood: 책등에 핏물이 흐르고 브리핑에 혈흔이 번진다 */
  mood?: 'blood';
  /** 없으면 '집필 중'으로 꽂혀만 있다 */
  Root?: LazyExoticComponent<ComponentType<EpisodeProps>>;
}

export const EPISODES: Episode[] = [
  {
    id: 'gongjakso',
    no: 1,
    title: '공작소의 밤',
    genre: '살인 추리',
    tagline: 'MURDER MYSTERY',
    blurb: '새벽 1시 03분, 펜션 쪽방에서 누군가가 쓰러진 채 발견됐다. 남은 다섯 사람 모두 무언가를 숨기고 있다.',
    meta: ['1~5인', '약 1시간', '사건 기록 3'],
    cover: { base: '#5a1518', edge: '#2e0a0c', ink: '#e9d9c0' },
    mood: 'blood',
    Root: lazy(() => import('../ui/App').then((m) => ({ default: m.App }))),
  },
  {
    id: 'conviction',
    no: 2,
    title: '흔들리지 않는 신념으로',
    genre: '법정',
    tagline: 'COURTROOM DRAMA',
    blurb: '1920년 12월 16일, 경성. 조선 총독을 향한 단 한 발의 총성. 암살 미수 혐의로 기소된 세 사람의 재판이 열린다.',
    meta: ['혼자 하기', '재판 3라운드', '엔딩 6'],
    cover: { base: '#1d2f4a', edge: '#0d1626', ink: '#d9dfe8' },
    Root: lazy(() => import('../episodes/conviction/App').then((m) => ({ default: m.App }))),
  },
];

const LAST_KEY = 'hub.lastEpisode';

export function lastEpisodeId(): string | null {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}

export function rememberEpisode(id: string): void {
  try {
    localStorage.setItem(LAST_KEY, id);
  } catch {
    /* 저장 불가 시 첫 책을 고른 상태로 시작한다 */
  }
}
