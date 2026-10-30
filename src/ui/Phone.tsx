import { Lock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PHONE, type PhoneEntry } from '../data/phone';
import type { CardId, PhoneApp } from '../data/types';
import { canSee } from '../engine/engine';
import type { GameState, SeatId } from '../engine/types';
import { GalleryThumb } from './Illustrations';
import { GameIcon } from './bits';

const APPS: { id: PhoneApp; label: string }[] = [
  { id: 'messenger', label: '메신저' },
  { id: 'call', label: '통화' },
  { id: 'gallery', label: '갤러리' },
];

export function Phone({ state, you, onOpenCard }: { state: GameState; you: SeatId | null; onOpenCard: (c: CardId) => void }) {
  const [app, setApp] = useState<PhoneApp>('messenger');
  const [seen, setSeen] = useState<Set<CardId>>(new Set());
  const items = useMemo(
    () => Object.entries(PHONE).filter(([id]) => you && canSee(state, you, id)) as [CardId, PhoneEntry][],
    [state, you],
  );
  const current = items.filter(([, e]) => e.app === app);

  useEffect(() => {
    setSeen((prev) => {
      const next = new Set(prev);
      for (const [id] of current) next.add(id);
      return next.size === prev.size ? prev : next;
    });
  }, [current.map(([id]) => id).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="phone">
      <span className="phone-notch" />
      <div className="phone-top"><span>00:58</span><span>펜션 Wi-Fi ▂▄▆</span></div>
      <div className="phone-screen">
        {current.length === 0 && <div className="phone-empty">확보한 {APPS.find((a) => a.id === app)!.label} 기록이 없습니다.</div>}
        {current.map(([id, e]) => {
          if (e.app === 'messenger') {
            const [left] = e.thread.split(/[→↔]/);
            return (
              <div key={id} className="thread" onClick={() => onOpenCard(id)}>
                <h4>{e.thread} · 증거 {id}</h4>
                {e.messages.map((m, i) => (
                  <div key={i} className={`bubble ${m.draft ? 'draft' : left.includes(m.from) ? 'right' : 'left'}`}>
                    <small>{m.from}{m.draft ? ' · 임시저장' : ''}</small>{m.text}
                  </div>
                ))}
                {e.note && <span className="muted" style={{ fontSize: 11 }}>— {e.note}</span>}
              </div>
            );
          }
          if (e.app === 'call') {
            return (
              <div key={id} className="call" onClick={() => onOpenCard(id)}>
                <div className="ico"><GameIcon name="phone" size={22} /></div>
                <div className="grow"><b>{e.who}</b><div className="muted" style={{ fontSize: 12 }}>발신 · {e.status}</div></div>
                <span className="mono">{e.time}</span>
              </div>
            );
          }
          return (
            <div key={id} className="photo" onClick={() => onOpenCard(id)}>
              <GalleryThumb scene={e.scene} />
              <div className="row"><span className="grow" style={{ fontSize: 12 }}>{e.caption}</span><span className="mono muted">{e.time}</span></div>
              {e.memo && <span className="muted" style={{ fontSize: 12 }}>“{e.memo}”</span>}
            </div>
          );
        })}
      </div>
      <div className="phone-lock"><Lock size={12} /> 보안 채널 잠김 · 열람 전용</div>
      <div className="phone-apps">
        {APPS.map((a) => {
          const unread = items.filter(([id, e]) => e.app === a.id && !seen.has(id)).length;
          return (
            <button key={a.id} className={app === a.id ? 'on' : ''} onClick={() => setApp(a.id)}>
              {a.label}{unread > 0 && app !== a.id && <span className="badge">{unread}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
