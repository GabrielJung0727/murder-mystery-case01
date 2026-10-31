"""
EP.02 「흔들리지 않는 신념으로」 음악·효과음·보이스를 게임용으로 가공한다.

  python scripts/prepare_conviction_audio.py <녹음 폴더>

폴더에서 이름이 CV- 로 시작하는 파일만 읽는다 (src/episodes/conviction/docs/에셋_요청서.md 의 ID).
`CV-OST01_최종.wav` 처럼 ID 뒤에 '_' 로 덧붙인 이름도 된다.
폴더에 있는 것만 변환해 기존 manifest 에 덧붙이므로, 나중에 온 녹음만 따로 돌려도 된다.

- 음악 CV-OST01~09: ogg 로 변환, 앞뒤 무음을 재서 루프 구간을 기록한다.
- 효과음: 30초 녹음에서 한 번씩 울린 소리를 잘라 원샷 변형 여러 개로 만든다.
  CV-SFX-RAIN 은 3초 크로스페이드로 이음새 없는 루프를 만든다.
- 보이스(나레이션·인물): 음량을 -18 LUFS 로 맞추고 앞뒤 무음을 줄여 모노 ogg 로 저장한다.
결과: public/episodes/conviction/audio/** 와 src/episodes/conviction/audio.json
"""
import json
import os
import subprocess
import sys

import numpy as np
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FF = os.path.join(ROOT, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe' if os.name == 'nt' else 'ffmpeg')
OUT = os.path.join(ROOT, 'public', 'episodes', 'conviction', 'audio')
REL = 'episodes/conviction/audio'
MANIFEST = os.path.join(ROOT, 'src', 'episodes', 'conviction', 'audio.json')
SR = 48000

# 반복해서 까는 곡. 나머지(프롤로그·엔딩·에필로그)는 한 번만 튼다
LOOPING = {'CV-OST01', 'CV-OST03', 'CV-OST04', 'CV-OST05', 'CV-OST06'}

# 효과음: (방식, 최대 변형 수, 최대 길이 초, 최소 간격 초)
#   slice  여러 번 울린 녹음에서 한 번씩 잘라낸다
#   window 이어지는 소리에서 가장 큰 구간 하나를 잘라낸다 (군중)
#   head   앞부분을 잘라 끝을 길게 줄인다 (말발굽이 지나가는 소리)
SFX = {
    'CV-SFX-GAVEL': ('slice', 4, 1.0, 0.5),
    'CV-SFX-STAMP': ('slice', 4, 1.0, 0.5),
    'CV-SFX-GUNSHOT': ('slice', 3, 4.0, 1.5),
    'CV-SFX-BOMB': ('slice', 2, 9.0, 3.0),
    'CV-SFX-BOMB-FAR': ('slice', 2, 12.0, 3.0),
    'CV-SFX-CELL': ('slice', 3, 4.0, 1.5),
    'CV-SFX-CROWD': ('window', 1, 5.0, 0),
    'CV-SFX-HOOVES': ('head', 1, 8.0, 0),
}
ALIASES = {'CV-SFX-HOOVE': 'CV-SFX-HOOVES'}
LOOPS = {'CV-SFX-RAIN'}


def decode(path):
    raw = subprocess.run([FF, '-v', 'error', '-i', path, '-map', '0:a', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)


def write_ogg(x, path, quality=5):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.tmp.wav'
    wavfile.write(tmp, SR, x.astype(np.float32))
    subprocess.run([FF, '-v', 'error', '-y', '-i', tmp, '-c:a', 'libvorbis', '-q:a', str(quality), path], check=True)
    os.remove(tmp)


def rms_db(x):
    return float(20 * np.log10(np.sqrt(np.mean(x.astype(np.float64) ** 2)) + 1e-12))


def frame_db(x, win):
    mono = x.mean(axis=1)
    n = len(mono) // win
    f = mono[: n * win].reshape(n, win)
    return 20 * np.log10(np.sqrt((f.astype(np.float64) ** 2).mean(axis=1)) + 1e-12)


def normalize_peak(x, target_db=-3.0):
    peak = np.abs(x).max() + 1e-12
    return x * (10 ** (target_db / 20) / peak)


def content_bounds(x, rel_db=-45):
    win = SR // 20
    db = frame_db(x, win)
    idx = np.where(db > db.max() + rel_db)[0]
    return idx[0] * win / SR, (idx[-1] + 1) * win / SR


def fades(x, fin=0.005, fout=0.08):
    x = x.copy()
    a, b = int(fin * SR), int(fout * SR)
    if a:
        x[:a] *= np.linspace(0, 1, a)[:, None]
    if b:
        x[-b:] *= np.linspace(1, 0, b)[:, None] ** 2
    return x


def file_id(name):
    stem = os.path.splitext(name)[0].split('_')[0].upper()
    return ALIASES.get(stem, stem)


def make_music(tid, path):
    x = decode(path)
    start, end = content_bounds(x, -45)
    loop = tid in LOOPING
    rel = f'{REL}/music/{tid}.ogg'
    write_ogg(x, os.path.join(OUT, 'music', f'{tid}.ogg'), quality=4)  # 약 128kbps: 게임 배경음으로 충분하고 설치 파일을 줄인다
    return {
        'src': rel, 'source': os.path.basename(path), 'duration': round(len(x) / SR, 3), 'loop': loop,
        # 루프 구간: 시작 무음 뒤 ~ 마지막 음이 잦아들기 전
        'loopStart': round(start + 0.05, 3), 'loopEnd': round(max(start + 10, end - 1.5), 3),
        'rmsDb': round(rms_db(x[int(start * SR): int(end * SR)]), 1),
    }


def make_loop(tid, path):
    x = decode(path)
    start, _ = content_bounds(x, -40)
    x = x[int(start * SR):]
    xf = 3 * SR
    t = np.linspace(0, np.pi / 2, xf)[:, None]
    blended = x[-xf:] * np.cos(t) + x[:xf] * np.sin(t)  # 등전력 크로스페이드
    loop = normalize_peak(np.concatenate([blended, x[xf:-xf]]), -3)
    name = tid.lower().replace('cv-sfx-', '')
    write_ogg(loop, os.path.join(OUT, 'sfx', f'{name}_loop.ogg'), quality=4)
    return {'src': f'{REL}/sfx/{name}_loop.ogg', 'source': os.path.basename(path), 'duration': round(len(loop) / SR, 3),
            'rmsDb': round(rms_db(loop), 1)}


def cut_events(x, max_n, max_len, min_gap):
    """녹음 안에서 소리가 새로 시작하는 지점마다 잘라, 큰 소리 순으로 돌려준다"""
    win = SR // 100  # 10ms
    db = frame_db(x, win)
    floor = np.percentile(db, 20)
    thr = max(db.max() - 30, floor + 12)
    events = [0] if db[0] > thr else []
    for i in range(1, len(db)):
        if db[i] > thr and db[i - 1] <= thr and (not events or (i - events[-1]) * win / SR > min_gap):
            events.append(i)
    shots = []
    for j, e in enumerate(events):
        start = max(0, e * win - int(0.01 * SR))
        hard_end = events[j + 1] * win - int(0.01 * SR) if j + 1 < len(events) else len(x)
        seg = x[start: min(hard_end, start + int(max_len * SR))]
        sdb = frame_db(seg, win)
        if len(sdb) == 0:
            continue
        above = np.where(sdb > sdb.max() - 42)[0]
        seg = seg[: (above[-1] + 1) * win + int(0.05 * SR)] if len(above) else seg
        if len(seg) < 0.15 * SR:
            continue
        shots.append((float(sdb.max()), seg))
    shots.sort(key=lambda s: -s[0])
    return [seg for _, seg in shots[:max_n]]


def make_sfx(tid, path):
    mode, max_n, max_len, min_gap = SFX[tid]
    x = decode(path)
    if mode == 'slice':
        segs = cut_events(x, max_n, max_len, min_gap)
        segs = [fades(s, 0.004, min(0.25, len(s) / SR / 3)) for s in segs]
    elif mode == 'window':
        n = int(max_len * SR)
        mono = (x.mean(axis=1) ** 2)
        energy = np.convolve(mono, np.ones(SR // 10), 'valid')[:: SR // 10]
        sums = np.convolve(energy, np.ones(int(max_len * 10)), 'valid')
        start = int(np.argmax(sums)) * (SR // 10)
        segs = [fades(x[start: start + n], 0.3, 1.2)]
    else:  # head
        start, _ = content_bounds(x, -40)
        segs = [fades(x[int(start * SR): int((start + max_len) * SR)], 0.2, 2.5)]
    name = tid.lower().replace('cv-sfx-', '')
    out = []
    for n, seg in enumerate(segs, start=1):
        seg = normalize_peak(seg, -3)
        write_ogg(seg, os.path.join(OUT, 'sfx', f'{name}_{n}.ogg'), quality=4)
        out.append({'src': f'{REL}/sfx/{name}_{n}.ogg', 'duration': round(len(seg) / SR, 3), 'rmsDb': round(rms_db(seg), 1)})
    return out


def make_voice(tid, path):
    dst = os.path.join(OUT, 'voice', f'{tid}.ogg')
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    filt = ('silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.1,'
            'areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.15,areverse,'
            'loudnorm=I=-18:TP=-1.5:LRA=11')
    subprocess.run([FF, '-v', 'error', '-y', '-i', path, '-map', '0:a', '-af', filt,
                    '-ac', '1', '-ar', '48000', '-c:a', 'libvorbis', '-q:a', '4', dst], check=True)
    return {'src': f'{REL}/voice/{tid}.ogg', 'duration': round(len(decode(dst)) / SR, 2), 'source': os.path.basename(path)}


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    src = sys.argv[1]
    try:
        with open(MANIFEST, encoding='utf-8') as f:
            manifest = json.load(f)
    except FileNotFoundError:
        manifest = {}
    for key in ('music', 'loops', 'sfx', 'voice'):
        manifest.setdefault(key, {})

    for name in sorted(os.listdir(src)):
        if not name.upper().startswith('CV-') or not name.lower().endswith(('.wav', '.mp3', '.ogg', '.flac', '.m4a')):
            continue
        tid = file_id(name)
        path = os.path.join(src, name)
        if tid.startswith('CV-OST'):
            manifest['music'][tid] = make_music(tid, path)
            print('music', tid, manifest['music'][tid]['duration'], 's')
        elif tid in LOOPS:
            manifest['loops'][tid] = make_loop(tid, path)
            print('loop', tid, manifest['loops'][tid]['duration'], 's')
        elif tid in SFX:
            manifest['sfx'][tid] = make_sfx(tid, path)
            print('sfx', tid, [s['duration'] for s in manifest['sfx'][tid]])
        elif tid.startswith('CV-SFX-'):
            print('sfx: 쓰는 곳이 정해지지 않은 효과음이라 건너뜀', name)
        else:
            manifest['voice'][tid] = make_voice(tid, path)
            print('voice', tid, manifest['voice'][tid]['duration'], 's')

    for key in manifest:
        manifest[key] = dict(sorted(manifest[key].items()))
    with open(MANIFEST, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write('\n')


if __name__ == '__main__':
    main()
