import { Monitor, Volume2 } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import { audio } from '../audio/director';
import { bridge } from '../client/bridge';
import { display, TEXT_SPEEDS, ZOOM_STEPS } from '../client/display';
import { GameIcon, Modal } from './bits';
import { AudioSliders, useNowPlaying } from './VolumeControl';

/** 시스템 설정: 소리(버스별 음량)와 화면(전체 화면·UI 배율·화면 효과) */
export function Settings({ onClose }: { onClose: () => void }) {
  const d = useSyncExternalStore(display.subscribe, display.get);
  const now = useNowPlaying();
  const [narration, setNarrationState] = useState(audio.volumes.narration);
  const [blips, setBlipsState] = useState(audio.volumes.blips);
  const setBlips = (on: boolean) => {
    audio.setVolumes({ blips: on });
    setBlipsState(on);
    if (on) audio.blip('arin');
  };
  const setNarration = (on: boolean) => {
    audio.setVolumes({ narration: on });
    if (!on) audio.stopNarration();
    setNarrationState(on);
  };

  return (
    <Modal onClose={onClose} tab="SYSTEM · 시스템 설정">
      <div className="modal-head">
        <h2>설정</h2>
        <span className="grow" />
        <button className="btn sm ghost" onClick={onClose}>닫기 <GameIcon name="close" /></button>
      </div>
      <div className="paper settings-paper">
        <h4><Volume2 size={13} /> 소리</h4>
        {now.title && <p className="muted" style={{ fontSize: 12 }}>지금 흐르는 곡: <GameIcon name="music" /> {now.title} · {now.titleEn}</p>}
        <div className="col" style={{ gap: 8 }}><AudioSliders /></div>
        <div className="set-row">
          <span>나레이션 음성</span>
          <div className="seg">
            <button className={narration ? 'on' : ''} onClick={() => setNarration(true)}>켜기</button>
            <button className={!narration ? 'on' : ''} onClick={() => setNarration(false)}>끄기</button>
          </div>
        </div>
        <div className="set-row">
          <span>캐릭터 블립 (대사 전자음)</span>
          <div className="seg">
            <button className={blips ? 'on' : ''} onClick={() => setBlips(true)}>켜기</button>
            <button className={!blips ? 'on' : ''} onClick={() => setBlips(false)}>끄기</button>
          </div>
        </div>
        <div className="set-row">
          <span>대사 표시 속도</span>
          <div className="seg">
            {TEXT_SPEEDS.map((t) => (
              <button key={t.label} className={d.textSpeed === t.value ? 'on' : ''} onClick={() => display.set({ textSpeed: t.value })}>{t.label}</button>
            ))}
          </div>
        </div>

        <h4 style={{ marginTop: 18 }}><Monitor size={13} /> 화면</h4>
        <div className="set-row">
          <span>디스플레이 모드</span>
          <div className="seg">
            <button className={!d.fullscreen ? 'on' : ''} onClick={() => display.set({ fullscreen: false })}>창 모드</button>
            <button className={d.fullscreen ? 'on' : ''} disabled={!bridge} onClick={() => display.set({ fullscreen: true })}>전체 화면</button>
          </div>
        </div>
        <div className="set-row">
          <span>UI 배율</span>
          <div className="seg">
            {ZOOM_STEPS.map((z) => (
              <button key={z} className={d.zoom === z ? 'on' : ''} onClick={() => display.set({ zoom: z })}>{Math.round(z * 100)}%</button>
            ))}
          </div>
        </div>
        <div className="set-row">
          <span>화면 효과 (빗줄기·필름 노이즈)</span>
          <div className="seg">
            <button className={d.effects ? 'on' : ''} onClick={() => display.set({ effects: true })}>켜기</button>
            <button className={!d.effects ? 'on' : ''} onClick={() => display.set({ effects: false })}>끄기</button>
          </div>
        </div>
        {!bridge && <p className="muted" style={{ fontSize: 12 }}>전체 화면은 데스크톱 앱(.exe)에서만 바꿀 수 있습니다.</p>}
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn primary" onClick={onClose}>설정 저장 및 닫기</button>
      </div>
    </Modal>
  );
}
