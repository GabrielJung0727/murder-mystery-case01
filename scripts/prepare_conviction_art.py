"""
EP.02 「흔들리지 않는 신념으로」 그림을 게임용으로 가공한다.

  python scripts/prepare_conviction_art.py <그림 폴더>

폴더에서 이름이 CV- 로 시작하는 png/jpg/webp 만 읽는다 (src/episodes/conviction/docs/에셋_요청서.md 의 ID).
폴더에 있는 것만 변환해 기존 목록에 덧붙이므로, 나중에 온 그림만 따로 돌려도 된다.

- 배경·프롤로그 컷·엔딩 (CV-BG-*, CV-CUT-*, CV-END-*): 가로 1920 이하 webp
- 증거 사진 (CV-EV-<카드 번호>): 가로 960 webp
- 도장 (CV-ICON-*): 투명 영역을 잘라 256×256 webp
- 마우스 커서 (CV-CUR-*): 투명 영역을 잘라 32×32 png. 끝점(클릭되는 곳)은 그림에서 가장 왼쪽 위의 점,
  도장 모양(DISABLED)은 가운데
- 로고 (CV-LOGO): 투명 영역을 잘라 가로 1200 webp, 도서관 표지 (CV-COVER): 512×768 webp
결과: public/episodes/conviction/art/** 와 src/episodes/conviction/art.json
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'episodes', 'conviction', 'art')
REL = 'episodes/conviction/art'
MANIFEST = os.path.join(ROOT, 'src', 'episodes', 'conviction', 'art.json')
CURSOR = 32
CENTER_CURSORS = {'disabled', 'wait'}


def save_webp(im, sub, name, quality=82):
    rel = f'{sub}/{name}.webp' if sub else f'{name}.webp'
    path = os.path.join(OUT, *rel.split('/'))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, 'WEBP', quality=quality, method=6)
    return f'{REL}/{rel}'


def fit_width(im, width):
    if im.width <= width:
        return im
    return im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)


def trim(im, pad=0):
    """투명한 가장자리를 잘라낸다 (거의 투명한 얼룩은 무시)"""
    box = im.getchannel('A').point(lambda v: 255 if v > 16 else 0).getbbox()
    l, t, r, b = box
    return im.crop((max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad)))


def square(im, anchor_top_left):
    """정사각형 투명 캔버스에 올린다. 커서는 끝점이 왼쪽 위에 남도록 왼쪽 위에 붙인다"""
    side = max(im.size)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    pos = (0, 0) if anchor_top_left else ((side - im.width) // 2, (side - im.height) // 2)
    canvas.paste(im, pos)
    return canvas


def tip(im):
    """불투명한 점 중 가장 왼쪽 위 (x + y 가 가장 작은 점)"""
    a = im.getchannel('A').load()
    best = None
    for y in range(im.height):
        for x in range(im.width):
            if a[x, y] > 128 and (best is None or x + y < best[0] + best[1]):
                best = (x, y)
    return best


def make_cursor(kind, im):
    im = trim(im, pad=1)
    centered = kind in CENTER_CURSORS
    im = square(im, anchor_top_left=not centered).resize((CURSOR, CURSOR), Image.LANCZOS)
    x, y = (CURSOR // 2, CURSOR // 2) if centered else tip(im)
    os.makedirs(os.path.join(OUT, 'cursors'), exist_ok=True)
    im.save(os.path.join(OUT, 'cursors', f'{kind}.png'), optimize=True)
    return {'src': f'{REL}/cursors/{kind}.png', 'x': x, 'y': y}


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    src = sys.argv[1]
    try:
        with open(MANIFEST, encoding='utf-8') as f:
            manifest = json.load(f)
    except FileNotFoundError:
        manifest = {}
    for key in ('scenes', 'evidence', 'stamps', 'cursors', 'logo', 'cover'):
        manifest.setdefault(key, {} if key not in ('logo', 'cover') else None)

    for name in sorted(os.listdir(src)):
        if not name.upper().startswith('CV-') or not name.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            continue
        tid = os.path.splitext(name)[0].split('_')[0].upper()
        im = Image.open(os.path.join(src, name))
        if tid.startswith(('CV-BG-', 'CV-CUT-', 'CV-END-')):
            key = tid[3:].lower()  # bg-court, cut-p1, end-e1 ...
            manifest['scenes'][tid] = save_webp(fit_width(im.convert('RGB'), 1920), 'scenes', key)
        elif tid.startswith('CV-EV-'):
            card = tid[6:]
            manifest['evidence'][card] = save_webp(fit_width(im.convert('RGB'), 960), 'evidence', card, quality=80)
        elif tid in ('CV-ICON-STRONG', 'CV-ICON-GUILTY', 'CV-ICON-INNOCENT'):
            kind = tid[8:].lower()
            stamp = square(trim(im.convert('RGBA'), pad=4), anchor_top_left=False).resize((256, 256), Image.LANCZOS)
            manifest['stamps'][kind] = save_webp(stamp, 'stamps', kind, quality=90)
        elif tid.startswith('CV-CUR-'):
            kind = tid[7:].lower()
            manifest['cursors'][kind] = make_cursor(kind, im.convert('RGBA'))
        elif tid == 'CV-LOGO':
            manifest['logo'] = save_webp(fit_width(trim(im.convert('RGBA'), pad=8), 1200), '', 'logo', quality=90)
        elif tid == 'CV-COVER':
            manifest['cover'] = save_webp(im.convert('RGB').resize((512, 768), Image.LANCZOS), '', 'cover', quality=85)
        else:
            print('건너뜀 (쓰는 곳이 정해지지 않은 그림)', name)
            continue
        print('art', tid)

    for key in ('scenes', 'evidence', 'stamps', 'cursors'):
        manifest[key] = dict(sorted(manifest[key].items()))
    with open(MANIFEST, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write('\n')


if __name__ == '__main__':
    main()
