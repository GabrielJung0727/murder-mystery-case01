"""
배치도·전경·실내 이미지를 게임 에셋으로 가공한다 (docs/펜션_배치도_이미지_프롬프트.md 의 A·B·C 묶음).

  python scripts/prepare_art.py <원본 폴더>

평면도는 원본 해상도 그대로(핀 좌표가 src/data/floorplan.json 에 원본 기준으로 저장됨),
전경·실내는 화면에 맞는 크기로 줄여 public/art/*.webp 로 저장한다.
"""
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'art')

# 원본 이름: (결과 이름, 최대 가로, 품질)
ART = {
    'A-1': ('plan-1f', None, 84),
    'A-2': ('plan-2f', None, 84),
    'B-1': ('exterior', 1672, 80),
    'B-2': ('cutaway', 1672, 80),
    'C-1': ('room-jjokbang', 1280, 80),
    'C-2': ('room-living', 1280, 80),
    'C-3': ('room-kitchen', 1280, 80),
    'C-4': ('room-bath', 1280, 80),
    'C-5': ('room-hall', 1280, 80),
    'C-6': ('room-201', 1280, 80),
    'C-7': ('room-veranda', 1280, 80),
    'C-8': ('room-interrogation', 1280, 80),
}


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    src = sys.argv[1]
    os.makedirs(OUT, exist_ok=True)
    for name, (out, max_w, q) in ART.items():
        path = os.path.join(src, f'{name}.png')
        if not os.path.exists(path):
            print('없음:', name)
            continue
        im = Image.open(path).convert('RGB')
        if max_w and im.width > max_w:
            im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
        dst = os.path.join(OUT, f'{out}.webp')
        im.save(dst, quality=q, method=6)
        print(f'{name} -> art/{out}.webp {im.size} {os.path.getsize(dst) // 1024}KB')


if __name__ == '__main__':
    main()
