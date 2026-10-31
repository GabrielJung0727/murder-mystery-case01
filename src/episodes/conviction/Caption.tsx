// 인물 대사 자막: 지금 읽는 녹음이 인물 대사이면 화면 아래에 이름과 문장을 띄운다
import { useSyncExternalStore } from 'react';
import { audio } from '../../audio/director';
import { roleOf } from './data';
import { LINES } from './sound';

export function Caption() {
  const voice = useSyncExternalStore(audio.subscribe, () => audio.getNowPlaying().voice);
  const line = voice ? LINES[voice] : undefined;
  if (!line) return null;
  return (
    <div className={`cv-caption ${line.who}`} key={voice} role="status">
      <b>{roleOf(line.who).name}</b>
      <span>{line.text}</span>
    </div>
  );
}
