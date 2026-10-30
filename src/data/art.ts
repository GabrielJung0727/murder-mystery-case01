// 배치도·전경·실내 일러스트 (scripts/prepare_art.py 가 만든 public/art/*.webp)
import type { ZoneId } from './types';

export const ART = {
  exterior: 'art/exterior.webp',
  cutaway: 'art/cutaway.webp',
  interrogation: 'art/room-interrogation.webp',
};

/** 증거 장소(구역) → 그 공간의 실내 일러스트 */
export const ZONE_ART: Record<ZoneId, string> = {
  jjokbang: 'art/room-jjokbang.webp',
  living: 'art/room-living.webp',
  entrance: 'art/room-living.webp',
  kitchen: 'art/room-kitchen.webp',
  bath1: 'art/room-bath.webp',
  bath2: 'art/room-bath.webp',
  hall: 'art/room-hall.webp',
  storage: 'art/room-hall.webp',
  stairs: 'art/room-hall.webp',
  common2: 'art/room-hall.webp',
  r201: 'art/room-201.webp',
  r202: 'art/room-201.webp',
  r203: 'art/room-201.webp',
  veranda: 'art/room-veranda.webp',
  yard: 'art/room-veranda.webp',
};

/**
 * 주요 증거의 클로즈업 사진 (scripts/prepare_clues.py → public/clues). 카드 상단에 방 그림 대신 쓴다.
 * 돋보기 카드(02·14·31·34)는 단서가 미리 보이지 않도록 방 그림을 유지한다.
 */
export const EVIDENCE_PHOTO: Partial<Record<string, string>> = {
  '01': 'clues/evidence-01.webp',
  '04': 'clues/evidence-04.webp',
  '06': 'clues/evidence-06.webp',
  '15': 'clues/evidence-15.webp',
  '21': 'clues/evidence-21.webp',
  '23': 'clues/evidence-23.webp',
  '35': 'clues/evidence-35.webp',
};

/** 어두운 그라데이션을 얹은 배경 이미지 스타일 (상대 경로라 file:// 에서도 동작) */
export function shadedBg(src: string, top = 0.55, bottom = 0.88): React.CSSProperties {
  return {
    backgroundImage: `linear-gradient(rgba(7, 9, 14, ${top}), rgba(7, 9, 14, ${bottom})), url(${src})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
}
