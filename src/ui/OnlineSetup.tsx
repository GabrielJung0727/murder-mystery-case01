import { useState } from 'react';
import { bridge, type HostInfo } from '../client/bridge';
import { josa } from '../data/josa';
import { ART, shadedBg } from '../data/art';
import { cloudBase, createCloudRoom, DEFAULT_CLOUD_URL, isRoomCode, roomWsUrl, setCloudBase } from '../net/cloud';
import { Desk } from './bits';

export interface JoinTarget {
  url: string;
  name: string;
  hostToken?: string;
  /** 인터넷 서버의 방 코드 (대기실에 크게 보여 준다) */
  room?: string;
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
  const [server, setServer] = useState(cloudBase());
  const [busy, setBusy] = useState<'cloud' | 'lan' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nick = name.trim() || '플레이어';

  const hostCloud = async () => {
    setBusy('cloud');
    setError(null);
    try {
      setCloudBase(server);
      const { code, token: hostToken } = await createCloudRoom(server);
      onReady({ url: roomWsUrl(server, code), name: nick, hostToken, room: code });
    } catch (e) {
      setError(`인터넷 방을 만들 수 없습니다. 인터넷 연결과 서버 주소를 확인해 주세요. (${e instanceof Error ? e.message : String(e)})`);
    } finally {
      setBusy(null);
    }
  };

  const hostLan = async () => {
    if (!bridge) return;
    setBusy('lan');
    setError(null);
    try {
      const info = await bridge.hostStart(Number(port) || defaultPort);
      onReady({ url: `ws://localhost:${info.port}`, name: nick, hostToken: info.token }, info);
    } catch (e) {
      setError(`방을 열 수 없습니다. 포트 ${josa(port, '이/가')} 이미 사용 중일 수 있습니다. (${String(e)})`);
    } finally {
      setBusy(null);
    }
  };

  const join = () => {
    if (isRoomCode(address)) {
      setCloudBase(server);
      onReady({ url: roomWsUrl(server, address), name: nick, room: address.trim().toUpperCase() });
    } else {
      onReady({ url: toWsUrl(address, defaultPort), name: nick, hostToken: token || undefined });
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
              <span className="no">방을 만들고 방 코드를 친구들에게 알려 줍니다</span>
              <h3>방 만들기</h3>
              <p className="fine">인터넷 방은 어디서든 방 코드 4자리로 들어올 수 있습니다. 서버가 쉬고 있으면 처음 한 번은 깨어나는 데 1분 가까이 걸립니다.</p>
              <button className="btn primary" disabled={!!busy} onClick={hostCloud}>
                {busy === 'cloud' ? '서버를 깨우는 중… (최대 1분)' : '인터넷 방 만들기'}
              </button>
              <details className="lan-host">
                <summary>같은 와이파이라면: 이 PC로 방 열기</summary>
                <p className="fine">이 PC가 서버가 됩니다. 같은 공유기의 친구는 대기실에 표시되는 IP로 접속합니다.</p>
                <div className="row" style={{ alignItems: 'flex-end' }}>
                  <div className="field" style={{ maxWidth: 120 }}>
                    <label>포트</label>
                    <input value={port} onChange={(e) => setPort(e.target.value.replace(/\D/g, ''))} />
                  </div>
                  <button className="btn" disabled={!bridge || !!busy} onClick={hostLan}>{busy === 'lan' ? '여는 중…' : '방 열기'}</button>
                </div>
                {!bridge && <p className="fine">브라우저 개발 모드에서는 이 PC로 방을 열 수 없습니다.</p>}
              </details>
              <span className="stamp">HOST</span>
            </div>
          </div>
          <div className="case-file static" style={{ '--tilt': '1deg' } as React.CSSProperties}>
            <span className="tab">JOIN · 참가하기</span>
            <span className="clip" />
            <div className="folder">
              <span className="no">호스트가 알려 준 방 코드나 주소로 접속</span>
              <h3>참가하기</h3>
              <div className="field">
                <label>방 코드 (예: K7QM) 또는 같은 와이파이 주소 (예: 192.168.0.12:{defaultPort})</label>
                <input value={address} placeholder="K7QM" onChange={(e) => setAddress(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && address.trim() && join()} />
              </div>
              {!bridge && !isRoomCode(address) && (
                <div className="field">
                  <label>호스트 토큰 (독립 서버로 진행할 때만)</label>
                  <input value={token} placeholder="dev-host" onChange={(e) => setToken(e.target.value)} />
                </div>
              )}
              <button className="btn primary" disabled={!address.trim()} onClick={join}>접속</button>
              <span className="stamp">JOIN</span>
            </div>
          </div>
        </div>
        <details className="lan-host">
          <summary>인터넷 서버 주소 (직접 서버를 띄웠을 때만 바꾸세요)</summary>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div className="field grow">
              <label>서버 주소</label>
              <input value={server} onChange={(e) => setServer(e.target.value)} />
            </div>
            <button className="btn sm ghost" onClick={() => setServer(DEFAULT_CLOUD_URL)}>기본값</button>
          </div>
        </details>
        <span className="desk-note">— 음성 대화는 디스코드 등을 함께 켜 두세요.</span>
      </Desk>
    </div>
  );
}
