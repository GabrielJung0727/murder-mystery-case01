"""
돋보기 단서·휴대폰 사진·증거 카드 사진 정리: python scripts/prepare_clues.py <inspect-*.png | photo-*.png | evidence-*.png ...>

가로 1600px(사진은 세로 1200px)로 줄여 public/clues/<이름>.webp 로 저장하고 크기를 출력한다.
단서 위치(hotspot)는 이 크기 기준으로 src/ui/Illustrations.tsx 의 SCENES 에 적는다.
"""
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'clues')


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    os.makedirs(OUT, exist_ok=True)
    for src in sys.argv[1:]:
        im = Image.open(src).convert('RGB')
        name = os.path.splitext(os.path.basename(src))[0]
        k = 1200 / im.height if name.startswith('photo') else 1600 / im.width
        if k < 1:
            im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        im.save(os.path.join(OUT, name + '.webp'), quality=86, method=6)
        print(name, im.size, f'scale {min(k, 1):.4f}')


if __name__ == '__main__':
    main()
