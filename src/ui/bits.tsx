import { CHAR_BY_ID } from '../data/characters';
import type { CharId } from '../data/types';
import type { SeatId } from '../engine/types';

/** 초상화가 있는 인물: 용의자 5명 + 피해자 강호연 + 불참한 정재우 + 수사관(플레이어) */
export type PortraitId = CharId | 'hoyeon' | 'jaewoo' | 'detective';

const EXTRA_PEOPLE: Record<'hoyeon' | 'jaewoo' | 'detective', { name: string; color: string }> = {
  hoyeon: { name: '강호연', color: '#8a93a3' },
  jaewoo: { name: '정재우', color: '#5c6574' },
  detective: { name: '수사관', color: '#8d97a8' },
};

export function personOf(id: PortraitId): { name: string; color: string } {
  return id === 'hoyeon' || id === 'jaewoo' || id === 'detective' ? EXTRA_PEOPLE[id] : CHAR_BY_ID[id];
}

/** scripts/prepare_portraits.py 가 만든 초상화 (face: 정사각 얼굴, full: 2:3) */
export const portraitSrc = (id: PortraitId, kind: 'face' | 'full' = 'face') => `portraits/${id}-${kind}.webp`;

export function Avatar({ char, size }: { char: PortraitId; size?: 'lg' }) {
  const p = personOf(char);
  return (
    <div className={`avatar ${size ?? ''}`} style={{ borderColor: p.color, background: p.color }} title={p.name}>
      <img src={portraitSrc(char)} alt={p.name} draggable={false} />
    </div>
  );
}

/** 사건 파일에 클립으로 꽂힌 즉석 사진 */
export function Polaroid({ char: who, caption, tilt = -3, detective }: { char?: PortraitId; caption?: string; tilt?: number; detective?: boolean }) {
  const char = who ?? (detective ? 'detective' : undefined);
  return (
    <div className="polaroid" style={{ transform: `rotate(${tilt}deg)` }}>
      <div className="photo-face" style={char ? undefined : { background: 'radial-gradient(circle at 50% 50%, #8d97a8 0 30%, #1c1a18 31% 100%)' }}>
        {char ? <img src={portraitSrc(char)} alt={personOf(char).name} draggable={false} /> : <span>{detective ? '?' : ''}</span>}
      </div>
      {caption && <div className="photo-cap">{caption}</div>}
    </div>
  );
}

export function Stamp({ children, tone = 'red', tilt = -10 }: { children: React.ReactNode; tone?: 'red' | 'amber' | 'green' | 'gray'; tilt?: number }) {
  return <span className={`rstamp ${tone}`} style={{ transform: `rotate(${tilt}deg)` }}>{children}</span>;
}

/** 설정·대기실 화면의 공통 틀: 펼쳐 놓은 사건 서류철 */
export function Desk({ tab, kicker, title, onBack, wide, aside, children }: {
  tab: string; kicker: string; title: string; onBack?: () => void; wide?: boolean; aside?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className={`desk ${wide ? 'wide' : ''}`}>
      <span className="desk-tab">{tab}</span>
      <div className="desk-head">
        <div className="grow">
          <div className="kicker-type">{kicker}</div>
          <h2>{title}</h2>
        </div>
        {aside}
        {onBack && <button className="btn ghost" onClick={onBack}>← 돌아가기</button>}
      </div>
      {children}
    </div>
  );
}

/** 크라프트지 사건 파일 카드 (타이틀 메뉴와 같은 디자인) */
export function Folder({ tab, no, title, stamp, tilt = 0, selected, locked, compact, disabled, onClick, children }: {
  tab: string; no?: string; title: React.ReactNode; stamp?: string; tilt?: number;
  selected?: boolean; locked?: boolean; compact?: boolean; disabled?: boolean; onClick?: () => void; children?: React.ReactNode;
}) {
  return (
    <button
      className={`case-file ${selected ? 'selected' : ''} ${locked ? 'locked' : ''} ${compact ? 'compact' : ''}`}
      style={{ '--tilt': `${tilt}deg` } as React.CSSProperties}
      disabled={disabled || locked}
      onClick={onClick}
    >
      <span className="tab">{tab}</span>
      {!locked && <span className="clip" />}
      <div className="folder">
        {no && <span className="no">{no}</span>}
        <h3>{title}</h3>
        {children}
        {stamp && <span className="stamp">{stamp}</span>}
      </div>
    </button>
  );
}

export function seatName(seat: SeatId | undefined | null): string {
  if (!seat) return '';
  return seat === 'detective' ? '수사관' : CHAR_BY_ID[seat].name;
}

export function seatColor(seat: SeatId | undefined | null): string {
  if (!seat) return '#3b4b66';
  return seat === 'detective' ? '#8d97a8' : CHAR_BY_ID[seat].color;
}

export function Modal({ onClose, wide, tab, children }: { onClose: () => void; wide?: boolean; tab?: string; children: React.ReactNode }) {
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog">
        {tab && <span className="modal-tab">{tab}</span>}
        {children}
      </div>
    </div>
  );
}

/** 손그림 UI 아이콘 (public/ui, scripts/prepare_icons.py) — 이모지 대신 쓴다 */
export type IconName = 'close' | 'music' | 'phone' | 'check' | 'contradiction' | 'exposed' | 'defense' | 'hint' | 'unlock' | 'lock' | 'magnifier';
export const iconSrc = (name: IconName) => `ui/icon-${name}.png`;

export function GameIcon({ name, size }: { name: IconName; size?: number }) {
  return <img className="gicon" src={iconSrc(name)} alt="" draggable={false} style={size ? { width: size, height: size } : undefined} />;
}
