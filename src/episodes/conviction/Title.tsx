import { BookOpen, DoorOpen, FileText, Flower2, Library, Settings as SettingsIcon } from 'lucide-react';
import { useState } from 'react';
import { audio } from '../../audio/director';
import { bridge } from '../../client/bridge';
import { Settings } from '../../ui/Settings';
import { SETTING } from './data';
import { Scene } from './Scene';

interface Props {
  canResume: boolean;
  onStart: () => void;
  onResume: () => void;
  onPrologue: () => void;
  onShelf: () => void;
}

export function Title({ canResume, onStart, onResume, onPrologue, onShelf }: Props) {
  const [settings, setSettings] = useState(false);
  const click = (f: () => void) => () => { audio.sfx('paper', 0.6); f(); };
  const menu = [
    { label: '게임 시작', icon: <Flower2 size={22} />, on: onStart, primary: true },
    { label: '이어하기', icon: <BookOpen size={22} />, on: onResume, disabled: !canResume },
    { label: '프롤로그', icon: <FileText size={22} />, on: onPrologue },
    { label: '설정', icon: <SettingsIcon size={22} />, on: () => setSettings(true) },
    { label: '도서관으로', icon: <Library size={22} />, on: onShelf },
    ...(bridge ? [{ label: '게임 종료', icon: <DoorOpen size={22} />, on: () => { if (window.confirm('게임을 종료할까요?')) void bridge?.quit(); } }] : []),
  ];

  return (
    <div className="cv cv-title-screen">
      <Scene paper />
      <div className="cv-when">
        <span>{SETTING.date}</span>
        {SETTING.place.map((p) => <span key={p}>{p}</span>)}
      </div>
      <header className="cv-head">
        <h1 className="cv-title">
          흔들리지 않는 <em>신념<Splash /></em>으로
        </h1>
        <p className="cv-act"><i />{SETTING.act}<i /></p>
      </header>
      <nav className="cv-menu">
        {menu.map((m) => (
          <button key={m.label} className={`cv-stroke ${m.primary ? 'primary' : ''}`} onClick={click(m.on)} disabled={m.disabled}>
            {m.icon}<span>{m.label}</span>
          </button>
        ))}
      </nav>
      {settings && <Settings onClose={() => setSettings(false)} />}
    </div>
  );
}

/** '신념' 뒤로 튄 핏자국 */
function Splash() {
  return (
    <svg className="cv-splash" viewBox="0 0 200 120" aria-hidden>
      <g fill="#4e0508" filter="url(#cv-rough)">
        <ellipse cx="100" cy="62" rx="62" ry="34" opacity=".75" />
        <circle cx="160" cy="38" r="12" />
        <circle cx="38" cy="86" r="9" />
        <circle cx="178" cy="78" r="5" />
        <circle cx="22" cy="40" r="4" />
        <circle cx="140" cy="104" r="6" />
        <path d="M120 90 q4 22 1 30 q-3 4 -5 0 q-1 -14 0 -30z" />
      </g>
    </svg>
  );
}
