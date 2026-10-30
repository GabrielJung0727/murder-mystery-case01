"""
인물 초상화를 게임 에셋으로 가공한다.

  python scripts/prepare_portraits.py <원본 폴더>

원본: <이름>.png (1024x1536). 결과: public/portraits/<id>-face.webp (정사각 얼굴), <id>-full.webp (2:3 전신)
"""
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'portraits')

# 이름: (게임 ID, 얼굴 중심 x, y, 정사각 크롭 한 변) — 원본 1024x1536 기준, 미리보기로 맞춘 값
PORTRAITS = {
    '이성철': ('seongcheol', 470, 430, 760),
    '남여진': ('yeojin', 560, 470, 760),
    '이선빈': ('seonbin', 520, 450, 760),
    '김아린': ('arin', 620, 460, 760),
    '정재구': ('jaegu', 500, 440, 760),
    '강호연': ('hoyeon', 560, 410, 760),
    '정재우': ('jaewoo', 400, 560, 760),
    '수사관': ('detective', 500, 420, 760),
}
FACE = 384
FULL = (640, 960)


def clamp_box(cx, cy, size, w, h):
    x0 = min(max(0, cx - size // 2), w - size)
    y0 = min(max(0, cy - size // 2), h - size)
    return x0, y0, x0 + size, y0 + size


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    src = sys.argv[1]
    os.makedirs(OUT, exist_ok=True)
    for name, (pid, cx, cy, size) in PORTRAITS.items():
        path = os.path.join(src, f'{name}.png')
        if not os.path.exists(path):
            print('없음:', name)
            continue
        im = Image.open(path).convert('RGB')
        face = im.crop(clamp_box(cx, cy, size, *im.size)).resize((FACE, FACE), Image.LANCZOS)
        face.save(os.path.join(OUT, f'{pid}-face.webp'), quality=86, method=6)
        im.resize(FULL, Image.LANCZOS).save(os.path.join(OUT, f'{pid}-full.webp'), quality=84, method=6)
        print(pid, 'ok')


if __name__ == '__main__':
    main()
