"""
원본 OST·효과음을 게임용 에셋으로 가공한다.

  python scripts/prepare_audio.py <원본 폴더>
  python scripts/prepare_audio.py --voice <새 나레이션 폴더>   (나레이션만 추가)

- 음악(Suno mp3): 커버 이미지를 떼고 ogg(vorbis q4, 약 128kbps)로 다시 담는다. 앞뒤 무음을 재서 루프 구간을 manifest에 기록.
- RAIN-01: 앞 무음을 잘라내고 3초 크로스페이드로 이음새 없는 루프 생성.
- CLOCK-01: 초침 위치를 찾아 정수 개의 똑딱 단위로 잘라 루프 생성.
- 나레이션: 녹음 파일명(원문 상수 이름)으로 대본 ID를 찾아 음량을 맞추고 모노 ogg로 저장.
- PAPER-01 / METAL-01 / 진실 발견: 30초 믹스다운에서 개별 소리를 잘라 원샷 변형 여러 개로 분리.
결과: public/audio/** 와 src/audio/manifest.json
"""
import json
import os
import subprocess
import sys

import numpy as np
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FF = os.path.join(ROOT, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe' if os.name == 'nt' else 'ffmpeg')
OUT = os.path.join(ROOT, 'public', 'audio')
SR = 48000

# 기획서 트랙 ID ↔ 원본 파일 (파일명과 실제 음향 분석으로 대응)
MUSIC = {
    'ost01_menu': ('Midnight Motif', '공작소의 밤', 'Night at the Workshop'),
    'ost02_explore': ('Abandoned Workshop', '닫힌 공작소', 'The Locked Workshop'),
    'ost03_investigate': ('The D Minor Motif', '기록되지 않은 진실', 'The Unwritten Truth'),
    'ost04_interrogate': ('Confession Room', '다섯 번째 의심', 'The Fifth Suspect'),
    'ost06_accusation': ('The Accusation', '마지막 지목', 'The Final Accusation'),
    'ost07_ending': ('The Final Four Notes', '비가 그친 뒤', 'After the Rain'),
}
RAIN = 'Midnight-Rain-Workshop'
CLOCK = 'Clockwork-Interrogation'
ONESHOTS = {
    # id: (원본 접두사, 최대 변형 수, 최대 길이 초, 최소 간격 초)
    'paper': ('Cold-Case-Files', 6, 1.6, 0.35),
    'metal': ('Iron-Echo', 4, 6.5, 2.0),
    'truth': ('Dark-Glass-Sting', 4, 5.0, 1.5),
}


def find(src, prefix):
    for name in os.listdir(src):
        if name.startswith(prefix):
            return os.path.join(src, name)
    raise SystemExit(f'원본 파일을 찾을 수 없습니다: {prefix}*')


def decode(path):
    raw = subprocess.run([FF, '-v', 'error', '-i', path, '-map', '0:a', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


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
    thr = db.max() + rel_db
    idx = np.where(db > thr)[0]
    return idx[0] * win / SR, (idx[-1] + 1) * win / SR


def fades(x, fin=0.005, fout=0.08):
    x = x.copy()
    a, b = int(fin * SR), int(fout * SR)
    if a:
        x[:a] *= np.linspace(0, 1, a)[:, None]
    if b:
        x[-b:] *= np.linspace(1, 0, b)[:, None] ** 2
    return x


def make_rain(src):
    x = decode(find(src, RAIN))
    start, _ = content_bounds(x, -40)
    x = x[int(start * SR) + SR // 10:]  # 시작 무음 + 여유 0.1초 제거
    xf = 3 * SR
    head, tail = x[:xf], x[-xf:]
    t = np.linspace(0, np.pi / 2, xf)[:, None]
    blended = tail * np.cos(t) + head * np.sin(t)  # 등전력 크로스페이드
    loop = np.concatenate([blended, x[xf:-xf]])
    loop = normalize_peak(loop, -3)
    write_ogg(loop, os.path.join(OUT, 'ambience', 'rain_loop.ogg'))
    return {'src': 'audio/ambience/rain_loop.ogg', 'duration': round(len(loop) / SR, 3), 'rmsDb': round(rms_db(loop), 1)}


def make_clock(src):
    x = decode(find(src, CLOCK))
    win = SR // 200  # 5ms
    db = frame_db(x, win)
    thr = db.max() - 20
    onsets = []
    for i in range(1, len(db)):
        if db[i] > thr and db[i - 1] <= thr and (not onsets or (i - onsets[-1]) * win > SR * 0.3):
            onsets.append(i)
    onsets = np.array(onsets) * win
    period = int(np.median(np.diff(onsets)))
    first = onsets[0] - int(0.03 * SR)
    count = (len(x) - first) // period - 1
    seg = x[first: first + count * period]
    edge = int(0.02 * SR)
    seg = seg.copy()
    seg[:edge] *= np.linspace(0, 1, edge)[:, None]
    seg[-edge:] *= np.linspace(1, 0, edge)[:, None]
    seg = normalize_peak(seg, -3)
    write_ogg(seg, os.path.join(OUT, 'ambience', 'clock_loop.ogg'))
    return {'src': 'audio/ambience/clock_loop.ogg', 'duration': round(len(seg) / SR, 3), 'tickPeriod': round(period / SR, 3),
            'ticks': int(count), 'rmsDb': round(rms_db(seg), 1)}


def slice_oneshots(src, key):
    prefix, max_n, max_len, min_gap = ONESHOTS[key]
    x = decode(find(src, prefix))
    win = SR // 100  # 10ms
    db = frame_db(x, win)
    floor = np.percentile(db, 20)
    thr = max(db.max() - 30, floor + 12)
    events = []
    for i in range(1, len(db)):
        if db[i] > thr and db[i - 1] <= thr and (not events or (i - events[-1]) * win / SR > min_gap):
            events.append(i)
    shots = []
    for j, e in enumerate(events):
        start = max(0, e * win - int(0.01 * SR))
        hard_end = events[j + 1] * win - int(0.01 * SR) if j + 1 < len(events) else len(x)
        end = min(hard_end, start + int(max_len * SR))
        seg = x[start:end]
        sdb = frame_db(seg, win)
        if len(sdb) == 0:
            continue
        above = np.where(sdb > sdb.max() - 42)[0]
        seg = seg[: (above[-1] + 1) * win + int(0.05 * SR)] if len(above) else seg
        if len(seg) < 0.15 * SR:
            continue
        shots.append((float(sdb.max()), seg))
    shots.sort(key=lambda s: -s[0])
    out = []
    for n, (_, seg) in enumerate(shots[:max_n], start=1):
        seg = normalize_peak(fades(seg, 0.004, min(0.25, len(seg) / SR / 3)), -3)
        rel = f'audio/sfx/{key}_{n}.ogg'
        write_ogg(seg, os.path.join(OUT, 'sfx', f'{key}_{n}.ogg'))
        out.append({'src': rel, 'duration': round(len(seg) / SR, 3), 'rmsDb': round(rms_db(seg), 1)})
    return out


def make_music(src):
    tracks = {}
    for tid, (prefix, ko, en) in MUSIC.items():
        path = find(src, prefix)
        rel = f'audio/music/{tid}.ogg'
        dst = os.path.join(OUT, 'music', f'{tid}.ogg')
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        # 설치 파일을 줄이려 192kbps mp3 를 vorbis q4 로 담는다 (배경음으로 충분한 음질)
        subprocess.run([FF, '-v', 'error', '-y', '-i', path, '-map', '0:a', '-c:a', 'libvorbis', '-q:a', '4', '-map_metadata', '-1', dst], check=True)
        x = decode(dst)
        start, end = content_bounds(x, -45)
        tracks[tid] = {
            'src': rel, 'title': ko, 'titleEn': en, 'source': os.path.basename(path),
            'duration': round(len(x) / SR, 3),
            # 루프 구간: 시작 무음 뒤 ~ 곡이 페이드아웃하기 전
            'loopStart': round(start + 0.5, 3), 'loopEnd': round(max(start + 30, end - 8), 3),
            'rmsDb': round(rms_db(x[int(start * SR): int(end * SR)]), 1),
        }
        print('music', tid, tracks[tid]['duration'], 's')
    return tracks


# 나레이션 (docs/나레이션_대본.md 의 ID ↔ 녹음 파일명 접두사)
VOICE = [
    ('NAR-B01', 'DETECTIVE_BRIEF'), ('NAR-B02', 'CASE_BRIEF'), ('NAR-B03', 'ROOM_LAYOUT'), ('NAR-B04', 'RULES'),
    ('NAR-B05', '심문_요령_목록'), ('NAR-P01', 'OPENING_NARRATION'),
    ('NAR-R1', 'ROUND_INFO[1]'), ('NAR-R2', 'ROUND_INFO[2]'), ('NAR-R3', 'ROUND_INFO[3]'),
    ('NAR-D1', 'ROUND_OPENINGS[1]'), ('NAR-D2', 'ROUND_OPENINGS[2]'), ('NAR-D3', 'ROUND_OPENINGS[3]'),
    ('NAR-F01', 'advance'), ('NAR-S01', 'npcReact_solved'),
    ('NAR-E-A', 'ENDINGS[E-A]'), ('NAR-E-B', 'ENDINGS[E-B]'), ('NAR-E-C', 'ENDINGS[E-C]'), ('NAR-E-D', 'ENDINGS[E-D]'),
    ('NAR-T01', 'TRUTH_SUMMARY'), ('NAR-T02', 'AFTERWORD'),
    # 변형 사건 (docs/나레이션_변형_대본.md). 파일 이름이 ID 로 시작하면 된다: NAR-E-A-v1.mp3
    ('NAR-E-A-v1', 'NAR-E-A-v1'), ('NAR-E-C-v1', 'NAR-E-C-v1'), ('NAR-T-v1', 'NAR-T-v1'),
    ('NAR-E-A-v2', 'NAR-E-A-v2'), ('NAR-E-C-v2', 'NAR-E-C-v2'), ('NAR-T-v2', 'NAR-T-v2'),
    ('NAR-E-B-v1', 'NAR-E-B-v1'), ('NAR-E-B-v2', 'NAR-E-B-v2'), ('NAR-T2-v1', 'NAR-T2-v1'), ('NAR-T2-v2', 'NAR-T2-v2'),
]


def make_voice(src):
    """음량을 -18 LUFS로 맞추고 앞뒤 무음을 0.1초만 남겨 모노 ogg로 저장"""
    out = {}
    names = os.listdir(src)
    for nid, prefix in VOICE:
        name = next((n for n in names if n.startswith(prefix) and n.lower().endswith('.mp3')), None)
        if not name:
            print('voice missing', nid, prefix)
            continue
        dst = os.path.join(OUT, 'voice', f'{nid}.ogg')
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        filt = ('silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.1,'
                'areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.15,areverse,'
                'loudnorm=I=-18:TP=-1.5:LRA=11')
        subprocess.run([FF, '-v', 'error', '-y', '-i', os.path.join(src, name), '-map', '0:a', '-af', filt,
                        '-ac', '1', '-ar', '48000', '-c:a', 'libvorbis', '-q:a', '4', dst], check=True)
        dur = len(decode(dst)) / SR
        out[nid] = {'src': f'audio/voice/{nid}.ogg', 'duration': round(dur, 2), 'source': name}
        print('voice', nid, round(dur, 1), 's')
    return out


# BlipTalk Studio 블립 샘플: 원본 폴더의 BLIP_<인물 이름>.(wav|mp3|ogg) → audio/blip/<id>.ogg
BLIP_NAMES = {'이성철': 'seongcheol', '남여진': 'yeojin', '이선빈': 'seonbin', '김아린': 'arin', '정재구': 'jaegu'}


def make_blips(src):
    out = {}
    for name in os.listdir(src):
        if not name.startswith('BLIP_'):
            continue
        stem = os.path.splitext(name)[0][5:]
        cid = BLIP_NAMES.get(stem) or (stem if stem in BLIP_NAMES.values() else None)
        if not cid:
            print('blip: 인물 이름을 알 수 없음', name)
            continue
        x = decode(os.path.join(src, name))
        start, end = content_bounds(x, -40)
        seg = normalize_peak(fades(x[int(start * SR): int(end * SR) + int(0.01 * SR)], 0.002, 0.01), -6)
        write_ogg(seg, os.path.join(OUT, 'blip', f'{cid}.ogg'))
        out[cid] = {'src': f'audio/blip/{cid}.ogg', 'duration': round(len(seg) / SR, 3), 'source': name}
        print('blip', cid, out[cid]['duration'], 's')
    return out


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    if sys.argv[1] == '--voice':
        # 나레이션만 추가: python scripts/prepare_audio.py --voice <새 녹음 폴더>
        # 폴더에 있는 녹음만 변환해 기존 manifest 에 덧붙인다 (음악·효과음 원본이 없어도 된다)
        path = os.path.join(ROOT, 'src', 'audio', 'manifest.json')
        with open(path, encoding='utf-8') as f:
            manifest = json.load(f)
        manifest['voice'].update(make_voice(sys.argv[2]))
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
        return
    src = sys.argv[1]
    manifest = {'music': make_music(src), 'rain': make_rain(src), 'clock': make_clock(src), 'sfx': {}, 'voice': make_voice(src), 'blip': make_blips(src)}
    for key in ONESHOTS:
        manifest['sfx'][key] = slice_oneshots(src, key)
        print('sfx', key, [s['duration'] for s in manifest['sfx'][key]])
    print('rain', manifest['rain'])
    print('clock', manifest['clock'])
    with open(os.path.join(ROOT, 'src', 'audio', 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)


if __name__ == '__main__':
    main()
