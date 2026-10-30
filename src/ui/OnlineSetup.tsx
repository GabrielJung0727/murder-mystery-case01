import { useState } from 'react';
import { bridge, type HostInfo } from '../client/bridge';
import { josa } from '../data/josa';
import { ART, shadedBg } from '../data/art';
import { Desk } from './bits';

export interface JoinTarget {
  url: string;
  name: string;
  hostToken?: string;
}

function toWsUrl(address: string, defaultPort: number): string {
  const a = address.trim().replace(/^wss?:\/\//, '');
  return `ws://${a.includes(':') ? a : `${a}:${defaultPort}`}`;
}

export function OnlineSetup({ defaultPort, onBack, onReady }: {
  defaultPort: number;
  onBack: () => void;
  onReady: (target: JoinTarget, host?: HostInfo) => void;
}) {
  const [name, setName] = useState('');
  const [port, setPort] = useState(String(defaultPort));
  const [address, setAddress] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nick = name.trim() || '플레이어';

  const host = async () => {
    if (!bridge) return;
    setBusy(true);
    setError(null);
    try {
      const info = await bridge.hostStart(Number(port) || defaultPort);
      onReady({ url: `ws://localhost:${info.port}`, name: nick, hostToken: info.token }, info);
    } catch (e) {
      setError(`방을 열 수 없습니다. 포트 ${josa(port, '이/가')} 이미 사용 중일 수 있습니다. (${String(e)})`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen" style={shadedBg(ART.cutaway, 0.72, 0.9)}>
      <Desk tab="CASE FILE · ONLINE" kicker="No. 01-B / 합동 수사 · 수사팀 소집" title="펜션으로 모일 수사팀을 꾸려라" onBack={onBack} wide>
        <div className="field" style={{ maxWidth: 360 }}>
          <label>수사관 서명 (닉네임)</label>
          <input value={name} maxLength={16} placeholder="플레이어" onChange={(e) => setName(e.target.value)} />
        </div>
        {error && <div className="error-banner">{error}</div>}
        <div className="menu">
          <div className="case-file static" style={{ '--tilt': '-1deg' } as React.CSSProperties}>
            <span className="tab">HOST · 방 만들기</span>
            <span className="clip" />
            <div className="folder">
              <span className="no">이 PC가 수사 본부(서버)가 됩니다</span>
              <h3>방 만들기</h3>
              <p className="fine">같은 공유기의 친구는 대기실에 표시되는 IP로 접속합니다. 외부 친구와는 공유기 포트포워딩이나 Tailscale·ZeroTier 같은 가상 LAN이 필요합니다.</p>
              <div className="field" style={{ maxWidth: 160 }}>
                <label>포트</label>
                <input value={port} onChange={(e) => setPort(e.target.value.replace(/\D/g, ''))} />
              </div>
              <button className="btn primary" disabled={!bridge || busy} onClick={host}>{busy ? '여는 중…' : '방 열기'}</button>
              {!bridge && <p className="fine">브라우저 개발 모드에서는 방을 열 수 없습니다. 터미널에서 npm run server 로 서버를 띄운 뒤 오른쪽에서 접속하세요.</p>}
              <span className="stamp">HOST</span>
            </div>
          </div>
          <div className="case-file static" style={{ '--tilt': '1deg' } as React.CSSProperties}>
            <span className="tab">JOIN · 참가하기</span>
            <span className="clip" />
            <div className="folder">
              <span className="no">호스트가 알려준 주소로 접속</span>
              <h3>참가하기</h3>
              <div className="field">
                <label>호스트 주소 (예: 192.168.0.12:{defaultPort})</label>
                <input value={address} placeholder={`localhost:${defaultPort}`} onChange={(e) => setAddress(e.target.value)} />
              </div>
              {!bridge && (
                <div className="field">
                  <label>호스트 토큰 (독립 서버로 진행할 때만)</label>
                  <input value={token} placeholder="dev-host" onChange={(e) => setToken(e.target.value)} />
                </div>
              )}
              <button
                className="btn primary"
                disabled={!address.trim()}
                onClick={() => onReady({ url: toWsUrl(address, defaultPort), name: nick, hostToken: token || undefined })}
              >
                접속
              </button>
              <span className="stamp">JOIN</span>
            </div>
          </div>
        </div>
        <span className="desk-note">— 음성 대화는 디스코드 등을 함께 켜 두세요.</span>
      </Desk>
    </div>
  );
}
