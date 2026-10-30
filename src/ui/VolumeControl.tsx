import { Music2, Play, Square, Volume2, VolumeX } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import { audio, type VoiceId, type Volumes } from '../audio/director';
import { GameIcon } from './bits';
import { useMenuAudio } from '../audio/useGameAudio';

type Level = 'master' | 'music' | 'ambience' | 'sfx' | 'voice';
const SLIDERS: { key: Level; label: string }[] = [
  { key: 'master', label: '전체' },
  { key: 'music', label: '음악' },
  { key: 'ambience', label: '환경음 (비·시계)' },
  { key: 'sfx', label: '효과음' },
  { key: 'voice', label: '목소리 (나레이션·블립)' },
];

/** 버스별 음량 슬라이더 + 음소거 (팝오버와 설정 창이 함께 쓴다) */
export function AudioSliders() {
  const [v, setV] = useState<Volumes>(audio.volumes);
  const update = (patch: Partial<Volumes>) => {
    audio.setVolumes(patch);
    setV(audio.volumes);
  };
  return (
    <>
      {SLIDERS.map((s) => (
        <label key={s.key} className="vol-row">
          <span>{s.label}</span>
          <input type="range" min={0} max={1} step={0.05} value={v[s.key]} onChange={(e) => update({ [s.key]: Number(e.target.value) })} />
          <span className="mono">{Math.round(v[s.key] * 100)}</span>
        </label>
      ))}
      <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => update({ muted: !v.muted })}>{v.muted ? '음소거 해제' : '음소거'}</button>
    </>
  );
}

export function useNowPlaying() {
  return useSyncExternalStore(audio.subscribe, audio.getNowPlaying);
}

/** 음량 조절 + 지금 흐르는 곡 표시 */
export function VolumeControl({ floating }: { floating?: boolean }) {
  const now = useNowPlaying();
  const [open, setOpen] = useState(false);

  return (
    <div className={`vol ${floating ? 'floating' : ''}`}>
      <button className="btn sm ghost vol-btn" onClick={() => { audio.unlock(); setOpen(!open); }} title="소리 설정">
        {audio.volumes.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        {now.title && <span className="vol-now"><Music2 size={12} /> {now.title}</span>}
      </button>
      {open && (
        <div className="vol-pop" onMouseLeave={() => setOpen(false)}>
          <div className="kicker-type" style={{ fontSize: 10 }}>SOUND · 음향</div>
          {now.title && <div className="vol-track"><GameIcon name="music" /> {now.title}<small>{now.titleEn}</small></div>}
          <AudioSliders />
        </div>
      )}
    </div>
  );
}

/** 타이틀·설정·대기실 화면에 놓는 메뉴 음악 + 우상단 음량 버튼 */
export function MenuSound() {
  useMenuAudio();
  return <VolumeControl floating />;
}

/** 나레이션 재생/정지 버튼. ids 중 하나를 읽는 중이면 정지 버튼이 된다 */
export function VoiceButton({ ids, label, compact }: { ids: VoiceId[]; label?: string; compact?: boolean }) {
  const now = useNowPlaying();
  const playing = !!now.voice && ids.includes(now.voice);
  return (
    <button
      className={`voice-btn ${playing ? 'on' : ''} ${compact ? 'compact' : ''}`}
      title={playing ? '나레이션 정지' : '나레이션 듣기'}
      onClick={(e) => {
        e.stopPropagation();
        audio.unlock();
        if (playing) audio.stopNarration();
        else audio.narrate(ids);
      }}
    >
      {playing ? <Square size={11} /> : <Play size={11} />}
      {label && <span>{playing ? '정지' : label}</span>}
    </button>
  );
}
