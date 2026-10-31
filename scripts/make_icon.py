"""
앱 아이콘 생성: python scripts/make_icon.py <원본 PNG>

원본은 모서리가 투명한 둥근 사각형 PNG(1254x1254, 공작소 도서관 고서 그림)다.
작은 크기(16~48px)는 책 둘레를 바짝 잘라 같은 둥근 모서리를 씌우고, 큰 크기는 원본 전체로 만든다.
(작게 줄이면 원본 전체 구도에서는 책이 작아져 알아보기 어렵기 때문)
결과: build/icon.ico (exe·설치 아이콘), build/icon.png (512), public/icon.png (창·작업 표시줄·파비콘)
"""
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# 원본 1254x1254 기준 책 중심과 바짝 자를 한 변
TIGHT = (650, 660, 1000)
# 둥근 모서리 반지름 (한 변에 대한 비율)
RADIUS = 0.25
SMALL = [16, 24, 32, 48]
LARGE = [64, 128, 256]


def rounded(im):
    """모서리를 투명하게 둥글린다 (4배로 그려 줄여 가장자리를 부드럽게)"""
    s = im.width
    big = Image.new('L', (s * 4, s * 4), 0)
    ImageDraw.Draw(big).rounded_rectangle((0, 0, s * 4 - 1, s * 4 - 1), radius=int(s * 4 * RADIUS), fill=255)
    out = im.copy()
    out.putalpha(big.resize((s, s), Image.LANCZOS))
    return out


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    full = Image.open(sys.argv[1]).convert('RGBA')
    k = full.width / 1254
    cx, cy, s = (round(v * k) for v in TIGHT)
    tight = rounded(full.crop((cx - s // 2, cy - s // 2, cx + s // 2, cy + s // 2)))

    frames = [tight.resize((n, n), Image.LANCZOS) for n in SMALL] + [full.resize((n, n), Image.LANCZOS) for n in LARGE]
    os.makedirs(os.path.join(ROOT, 'build'), exist_ok=True)
    biggest = frames[-1]
    # bitmap_format='bmp': Pillow 기본값(PNG 압축)으로 저장하면 NSIS 설치 프로그램이 아이콘을 읽다가 충돌한다(0xC0000005)
    biggest.save(os.path.join(ROOT, 'build', 'icon.ico'), format='ICO', bitmap_format='bmp',
                 sizes=[(f.width, f.height) for f in frames], append_images=frames[:-1])
    full.resize((512, 512), Image.LANCZOS).save(os.path.join(ROOT, 'build', 'icon.png'))
    full.resize((256, 256), Image.LANCZOS).save(os.path.join(ROOT, 'public', 'icon.png'))
    print('build/icon.ico', [f.width for f in frames], '/ build/icon.png / public/icon.png')


if __name__ == '__main__':
    main()
