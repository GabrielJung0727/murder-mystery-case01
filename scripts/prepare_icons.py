"""
UI 아이콘 정리: python scripts/prepare_icons.py <icon-*.png ...>

투명 여백을 잘라 정사각형 가운데에 놓고 128px로 줄여 public/ui/<이름>.png 로 저장한다.
(게임에서는 14~32px로 쓰므로 128px면 고해상도 화면에서도 충분하다)
"""
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'ui')
SIZE = 128
PAD = 0.04  # 가장자리 여백 비율


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    os.makedirs(OUT, exist_ok=True)
    for src in sys.argv[1:]:
        im = Image.open(src).convert('RGBA')
        box = im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
        im = im.crop(box)
        side = round(max(im.size) * (1 + PAD * 2))
        sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        sq.alpha_composite(im, ((side - im.width) // 2, (side - im.height) // 2))
        name = os.path.basename(src)
        sq.resize((SIZE, SIZE), Image.LANCZOS).save(os.path.join(OUT, name), optimize=True)
        print(name)


if __name__ == '__main__':
    main()
