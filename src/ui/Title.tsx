import { FileText, Images, Library, Power, Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { audio } from '../audio/director';
import { APP_VERSION, bridge } from '../client/bridge';
import { ART, shadedBg } from '../data/art';
import { CASE_BRIEF, SUBTITLE, TITLE } from '../data/story';
import { Credits } from './Credits';
import { Gallery } from './Gallery';
import { Settings } from './Settings';

/** 기계식 단말기가 수사 기록을 불러오는 듯한 타이핑 효과 */
function useTypewriter(text: string, speed = 70, delay = 400): string {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(text.length);
      return;
    }
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const step = () => {
      i += 1;
      setN(i);
      if (i < text.length) t = setTimeout(step, speed + Math.random() * 60);
    };
    t = setTimeout(step, delay);
    return () => clearTimeout(t);
  }, [text, speed, delay]);
  return text.slice(0, n);
}

const DRIPS = [{ left: '18%', delay: '0s' }, { left: '57%', delay: '2.1s' }, { left: '83%', delay: '3.7s' }];

export function Title({ onSingle, onOnline, onShelf }: { onSingle: () => void; onOnline: () => void; onShelf: () => void }) {
  const kicker = useTypewriter(`${SUBTITLE} · 수사 기록 열람`);
  const [modal, setModal] = useState<'settings' | 'gallery' | 'credits' | null>(null);
  const open = (m: 'settings' | 'gallery' | 'credits') => {
    audio.sfx('paper', 0.6);
    setModal(m);
  };

  return (
    <div className="screen" style={shadedBg(ART.exterior, 0.35, 0.82)}>
      <div className="title-card">
        <div className="terminal"><span className="rec" />{kicker}<span className="cursor" /></div>
        <h1>
          {TITLE}
          {DRIPS.map((d) => <span key={d.left} className="drip" style={{ left: d.left, animationDelay: d.delay }} />)}
        </h1>
        <p className="synopsis">
          {CASE_BRIEF}
          <span className="hand">— 그날 밤, 쪽방 문은 누가 마지막으로 닫았을까.</span>
        </p>
        <div className="menu">
          <button className="case-file" style={{ '--tilt': '-1.6deg' } as React.CSSProperties} onClick={onSingle}>
            <span className="tab">CASE FILE · SOLO</span>
            <span className="clip" />
            <div className="folder">
              <span className="no">No. 01-A / 단독 수사</span>
              <h3>싱글 플레이</h3>
              <p>용의자들을 직접 심문하고 증거를 들이밀어 거짓말을 무너뜨리세요.</p>
              <div className="meta"><span>1 PLAYER</span><span>NPC 심문</span><span>3 ROUNDS</span></div>
              <span className="stamp">열람 대기</span>
            </div>
          </button>
          <button className="case-file" style={{ '--tilt': '1.2deg' } as React.CSSProperties} onClick={onOnline}>
            <span className="tab">CASE FILE · ONLINE</span>
            <span className="clip" />
            <div className="folder">
              <span className="no">No. 01-B / 합동 수사</span>
              <h3>온라인 멀티플레이</h3>
              <p>한 명이 방을 열고 나머지는 IP로 접속합니다. 음성은 디스코드 등을 함께 사용하세요.</p>
              <div className="meta"><span>5 PLAYERS</span><span>심리전</span><span>3 ROUNDS</span></div>
              <span className="stamp">CLASSIFIED</span>
            </div>
          </button>
        </div>
        <div className="title-actions">
          <button className="file-tab" onClick={() => { audio.sfx('paper', 0.6); onShelf(); }}><Library size={15} /> 도서관으로</button>
          <button className="file-tab" onClick={() => open('settings')}><SettingsIcon size={15} /> 설정</button>
          <button className="file-tab" onClick={() => open('gallery')}><Images size={15} /> 갤러리 & 다시보기</button>
          <button className="file-tab" onClick={() => open('credits')}><FileText size={15} /> 사건 기록실</button>
          {bridge && (
            <button className="file-tab danger" onClick={() => { if (window.confirm('게임을 종료할까요?')) void bridge?.quit(); }}>
              <Power size={15} /> 게임 종료
            </button>
          )}
        </div>
        <p className="title-foot">PLAYERS 5 · EVIDENCE 35 · CASES 3 · ENDINGS 4</p>
      </div>
      <div className="build-line">BUILD v{APP_VERSION}-STABLE // {bridge ? 'STANDALONE .EXE' : 'WEB PREVIEW'}</div>
      {modal === 'settings' && <Settings onClose={() => setModal(null)} />}
      {modal === 'gallery' && <Gallery onClose={() => setModal(null)} />}
      {modal === 'credits' && <Credits onClose={() => setModal(null)} />}
    </div>
  );
}
