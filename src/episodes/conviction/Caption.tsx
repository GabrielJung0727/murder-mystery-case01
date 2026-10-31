// 인물 대사 자막. Caption: 화면 위에 잠깐 띄우는 자막 (배역 고르기·엔딩).
// DialogueBar: 재판 화면 가운데 칸 맨 아래에 붙은 대사창. 피고인석과 줄을 나눠 버튼을 가리지 않는다.
import { Volume2 } from 'lucide-react';
import { useRef, useSyncExternalStore } from 'react';
import { audio } from '../../audio/director';
import { roleOf } from './data';
import { LINES } from './sound';

const useVoice = () => useSyncExternalStore(audio.subscribe, () => audio.getNowPlaying().voice);

export function Caption() {
  const voice = useVoice();
  const line = voice ? LINES[voice] : undefined;
  if (!line) return null;
  return (
    <div className={`cv-caption ${line.who}`} key={voice} role="status">
      <b>{roleOf(line.who).name}</b>
      <span>{line.orig && <i>{line.orig}</i>}{line.text}</span>
    </div>
  );
}

/** 마지막 인물 대사를 남겨 두고, 목소리가 나오는 동안 파형을 움직인다 */
export function DialogueBar() {
  const voice = useVoice();
  const last = useRef<string | null>(null);
  if (voice && LINES[voice]) last.current = voice;
  const id = last.current;
  const line = id ? LINES[id] : undefined;
  const speaking = !!voice;
  return (
    <div className={`cv-dialogue ${speaking ? 'speaking' : ''} ${line && voice !== id ? 'idle' : ''}`} role="status">
      {line ? (
        <>
          <div className="cv-dialogue-who" key={id}>
            <b>{roleOf(line.who).name}</b>
            <small>{roleOf(line.who).title}</small>
          </div>
          <div className="cv-dialogue-text" key={`${id}-t`}>
            {line.orig && <i>「{line.orig}」</i>}
            <p>{line.text}</p>
          </div>
        </>
      ) : (
        <p className="cv-dialogue-empty">법정이 고요합니다.</p>
      )}
      <div className="cv-wave" aria-label={speaking ? '음성 재생 중' : '음성 없음'}>
        <Volume2 size={14} />
        {[0, 1, 2, 3, 4].map((i) => <span key={i} style={{ animationDelay: `${i * -0.17}s` }} />)}
      </div>
    </div>
  );
}
