"""
앱 아이콘 생성: python scripts/make_icon.py <원본 PNG>

작은 크기(16~48px)는 오두막 둘레를 바짝 자른 이미지로, 큰 크기는 원본 전체로 만든다.
(작게 줄이면 원본 전체 구도에서는 오두막이 점처럼 사라지기 때문)
결과: build/icon.ico (exe·설치 아이콘), build/icon.png (512), public/icon.png (창·작업 표시줄·파비콘)
"""
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# 원본 1254x1254 기준 오두막 중심과 바짝 자를 한 변
TIGHT = (627, 660, 820)
SMALL = [16, 24, 32, 48]
LARGE = [64, 128, 256]


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    full = Image.open(sys.argv[1]).convert('RGBA')
    k = full.width / 1254
    cx, cy, s = (round(v * k) for v in TIGHT)
    tight = full.crop((cx - s // 2, cy - s // 2, cx + s // 2, cy + s // 2))

    frames = [tight.resize((n, n), Image.LANCZOS) for n in SMALL] + [full.resize((n, n), Image.LANCZOS) for n in LARGE]
    os.makedirs(os.path.join(ROOT, 'build'), exist_ok=True)
    biggest = frames[-1]
    biggest.save(os.path.join(ROOT, 'build', 'icon.ico'), format='ICO',
                 sizes=[(f.width, f.height) for f in frames], append_images=frames[:-1])
    full.resize((512, 512), Image.LANCZOS).save(os.path.join(ROOT, 'build', 'icon.png'))
    full.resize((256, 256), Image.LANCZOS).save(os.path.join(ROOT, 'public', 'icon.png'))
    print('build/icon.ico', [f.width for f in frames], '/ build/icon.png / public/icon.png')


if __name__ == '__main__':
    main()
