// 돋보기 인스펙터와 휴대폰 갤러리 사진 (scripts/prepare_clues.py 가 만든 public/clues/*.webp)
export interface Scene {
  src: string;
  /** 이미지 픽셀 크기 */
  w: number;
  h: number;
  /** 결정적 디테일의 위치 (이미지 픽셀) */
  hotspot: { x: number; y: number; r: number };
}

export const SCENES: Record<string, Scene> = {
  '02': { src: 'clues/inspect-02.webp', w: 1600, h: 621, hotspot: { x: 1005, y: 350, r: 65 } },
  '14': { src: 'clues/inspect-14.webp', w: 1555, h: 1011, hotspot: { x: 920, y: 640, r: 60 } },
  '31': { src: 'clues/inspect-31.webp', w: 1555, h: 1011, hotspot: { x: 1035, y: 715, r: 60 } },
  '34': { src: 'clues/inspect-34.webp', w: 1600, h: 621, hotspot: { x: 1300, y: 175, r: 90 } },
};

const PHOTOS: Record<'docs' | 'yard' | 'reflection', string> = {
  docs: 'clues/photo-19.webp',
  yard: 'clues/photo-33.webp',
  reflection: 'clues/inspect-34.webp',
};

export function GalleryThumb({ scene }: { scene: 'docs' | 'yard' | 'reflection' }) {
  return <img className="gallery-photo" src={PHOTOS[scene]} alt="" draggable={false} />;
}
