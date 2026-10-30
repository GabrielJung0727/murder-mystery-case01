import { ScrollText, Users } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { CHAR_BY_ID } from '../data/characters';
import type { CharId } from '../data/types';
import type { GameState, LogEntry, SeatId } from '../engine/types';
import { Avatar, GameIcon, seatName } from './bits';
import { TypedText } from './TypedText';

export function LogLine({ e }: { e: LogEntry }) {
  const who = e.kind === 'narration' || e.kind === 'hint' ? null : e.speaker;
  return (
    <div className={`log-entry ${e.kind}`}>
      {e.kind === 'hint' && <span className="who"><GameIcon name="hint" /> 단서</span>}
      {who && (e.kind === 'line' || e.kind === 'reaction') && <span className="who">{seatName(who)}</span>}
      {e.tone && <span className="tag amber" style={{ marginRight: 6 }}>{e.tone}</span>}
      {e.kind === 'line' || e.kind === 'reaction' ? <TypedText id={e.id} text={e.text} /> : e.text}
    </div>
  );
}

export function SidePanel({ state, you, onInterrogate }: { state: GameState; you: SeatId | null; onInterrogate: (c: CharId) => void }) {
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [state.log.length]);
  const single = state.mode === 'single';
  const canInterrogate = single && !!you && (state.phase === 'discuss' || state.phase === 'final');

  return (
    <div className="side-lower">
      <div className="panel-head">
        <span className="exhibit">EXHIBIT C</span>
        <h3><Users size={15} /> {single ? '용의자 심문' : '참가자'}</h3>
        <span className="grow" />
        {!single && <span className="voice"><i /> 음성은 디스코드로</span>}
      </div>
      {single && (
        canInterrogate
          ? <div className="locked-hint open"><GameIcon name="unlock" size={18} /> 심문실이 열렸습니다. 용의자를 눌러 증거를 제시하세요.</div>
          : <div className="locked-hint"><GameIcon name="lock" size={18} /> 심문실은 조사가 끝나면 열립니다{state.phase === 'investigate' ? ' (상단 [조사 완료])' : ''}.</div>
      )}
      <div className="suspects">
        {state.seats.filter((s) => s.id !== 'detective').map((s) => {
          const char = s.id as CharId;
          const mind = state.npc[char];
          return (
            <button key={s.id} className="suspect" disabled={single ? !canInterrogate || s.kind !== 'npc' : true}
              onClick={() => onInterrogate(char)}
              title={single && !canInterrogate ? '조사 단계가 끝나면 심문할 수 있습니다' : mind ? `방어 단계 ${mind.state}/2` : undefined}>
              <Avatar char={char} />
              <div>
                <div>{CHAR_BY_ID[char].name}{s.id === you ? ' (나)' : ''}</div>
                {single && mind ? (
                  <div className="dots">{[1, 2].map((i) => <i key={i} className={mind.state >= i ? 'on' : ''} />)}</div>
                ) : (
                  <div className="muted" style={{ fontSize: 10 }}>
                    {s.kind === 'human' ? `${s.name}${s.connected === false ? ' · 끊김' : ''}${state.phase === 'final' && s.submitted ? ' · 제출' : ''}` : s.kind === 'empty' ? '빈 자리' : ''}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <div className="panel-head"><span className="exhibit">EXHIBIT D</span><h3><ScrollText size={15} /> 사건 기록</h3></div>
      <div className="log" ref={logRef}>
        {state.log.map((e) => <LogLine key={e.id} e={e} />)}
      </div>
    </div>
  );
}
