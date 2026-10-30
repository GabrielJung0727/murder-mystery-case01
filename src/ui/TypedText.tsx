import { useSyncExternalStore } from 'react';
import { dialogue } from '../audio/dialogue';

/** 대사 타자기 출력. 타이핑 중에 누르면 끝까지 보여 준다 */
export function TypedText({ id, text }: { id: number; text: string }) {
  useSyncExternalStore(dialogue.subscribe, dialogue.version);
  const shown = dialogue.visible(id, text);
  const typing = dialogue.isTyping(id);
  if (typing && shown === '') return <span className="typed waiting">…</span>;
  return (
    <span className={`typed ${typing ? 'typing' : ''}`} onClick={typing ? () => dialogue.skip(id) : undefined} title={typing ? '눌러서 끝까지 보기' : undefined}>
      {shown}
      {typing && <span className="type-caret" />}
    </span>
  );
}
