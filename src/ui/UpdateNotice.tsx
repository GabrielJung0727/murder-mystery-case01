import { useEffect, useState } from 'react';
import { bridge, type UpdateStatus } from '../client/bridge';

/** 새 버전을 뒤에서 받는 중이거나 다 받았을 때 화면 구석에 띄우는 쪽지 */
export function UpdateNotice() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [hidden, setHidden] = useState(false);
  useEffect(() => bridge?.onUpdate?.(setStatus), []);
  if (!status || hidden) return null;

  if (status.state === 'downloading') {
    return (
      <div className="update-note">
        <div className="kicker-type">UPDATE</div>
        새 버전 v{status.version} 받는 중… {status.percent > 0 ? `${status.percent}%` : ''}
      </div>
    );
  }
  return (
    <div className="update-note ready">
      <div className="kicker-type">UPDATE READY</div>
      <b>새 버전 v{status.version}이 준비됐습니다.</b>
      <div className="muted">지금 재시작하거나, 게임을 끌 때 자동으로 설치됩니다.</div>
      <div className="row" style={{ gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
        <button className="btn sm ghost" onClick={() => setHidden(true)}>나중에</button>
        <button
          className="btn sm primary"
          onClick={() => {
            if (window.confirm('게임을 재시작해 업데이트를 설치합니다. 진행 중인 온라인 방은 닫힙니다. 계속할까요?')) void bridge?.installUpdate();
          }}
        >
          지금 재시작
        </button>
      </div>
    </div>
  );
}
