import type { HostInfo } from '../client/bridge';
import type { OnlineSession } from '../client/useOnline';
import { CHARACTERS } from '../data/characters';
import { ART, shadedBg } from '../data/art';
import type { Timers } from '../engine/types';
import { Desk, Folder, Polaroid, Stamp } from './bits';
import { OptionsPicker } from './OptionsPicker';

const TIMER_FIELDS: { key: keyof Timers; label: string }[] = [
  { key: 'prologue', label: '역할 숙지' },
  { key: 'investigate', label: '라운드 조사' },
  { key: 'discuss', label: '라운드 토론' },
  { key: 'final', label: '최종 추리' },
];
const TILTS = [-1.2, 0.8, -0.5, 1.1, -0.9];

export function Lobby({ session, host, onExit }: { session: OnlineSession; host?: HostInfo; onExit: () => void }) {
  const state = session.state!;
  const humans = state.seats.filter((s) => s.kind === 'human').length;

  return (
    <div className="screen" style={shadedBg(ART.cutaway, 0.72, 0.9)}>
      <Desk
        tab="BRIEFING ROOM"
        kicker={`대기실 · 인물 배정 ${humans} / 5`}
        title="누가 어떤 인물을 맡을 것인가"
        wide
        aside={<button className="btn ghost" onClick={onExit}>나가기</button>}
      >
        {host && (
          <div className="paper" style={{ transform: 'rotate(-.4deg)' }}>
            <h4>친구에게 알려줄 주소</h4>
            <div className="row" style={{ flexWrap: 'wrap', margin: '6px 0' }}>
              {host.addresses.length
                ? host.addresses.map((a) => <span key={a} className="mono" style={{ fontSize: 20, fontWeight: 700, color: '#1c140a' }}>{a}:{host.port}</span>)
                : <span className="muted">네트워크 주소를 찾지 못했습니다.</span>}
            </div>
            <p className="muted" style={{ fontSize: 12 }}>Windows 방화벽 허용 창이 뜨면 "허용"을 눌러야 다른 PC에서 접속할 수 있습니다.</p>
          </div>
        )}
        <p className="muted">각자 맡을 인물의 파일을 고르세요. 개인 설정은 게임이 시작되면 본인에게만 공개됩니다.</p>
        <div className="folder-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '34px 14px' }}>
          {CHARACTERS.map((c, i) => {
            const seat = state.seats.find((s) => s.id === c.id)!;
            const mine = session.you === c.id;
            const taken = seat.kind === 'human' && !mine;
            return (
              <Folder
                key={c.id}
                tab={`PERSONNEL 0${i + 1}`}
                title={c.name}
                tilt={TILTS[i]}
                compact
                selected={mine}
                stamp={mine ? '나' : undefined}
                disabled={taken}
                onClick={() => session.send({ t: 'seat', char: c.id })}
              >
                <Polaroid char={c.id} tilt={i % 2 ? 3 : -3} />
                <span className="no">{c.mbti} · {c.gender} · 21세</span>
                <p className="fine" style={{ fontSize: 12 }}>{c.tagline}</p>
                {seat.kind === 'human'
                  ? <div className="row"><span className="signed">{seat.name}</span><Stamp tilt={-6}>배정</Stamp></div>
                  : <span className="no">— 비어 있음 —</span>}
              </Folder>
            );
          })}
        </div>
        <OptionsPicker
          value={state.options}
          disabled={!session.isHost}
          onChange={session.isHost ? (options) => session.send({ t: 'options', options }) : undefined}
        />
        {!session.isHost && <p className="muted" style={{ fontSize: 12, marginTop: -8 }}>사건 선택과 난이도는 호스트가 정합니다. 변형 사건이면 누가 진범 역할을 받을지는 시작할 때 정해집니다.</p>}
        {session.isHost ? (
          <div className="col">
            <div className="row" style={{ flexWrap: 'wrap', gap: 18 }}>
              {TIMER_FIELDS.map((f) => (
                <div className="field" key={f.key} style={{ width: 140 }}>
                  <label>{f.label} (분, 0=무제한)</label>
                  <input
                    type="number" min={0} max={60} value={state.timers[f.key]}
                    onChange={(e) => session.send({ t: 'timers', timers: { ...state.timers, [f.key]: Math.max(0, Number(e.target.value) || 0) } })}
                  />
                </div>
              ))}
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              {humans < 5 && <span className="muted" style={{ fontSize: 12 }}>5명이 모이지 않아도 시작할 수 있지만, 빈 인물은 조사·투표에 참여하지 않습니다.</span>}
              <button className="btn primary" disabled={humans === 0} onClick={() => session.dispatch({ type: 'advance' })}>게임 시작</button>
            </div>
          </div>
        ) : (
          <span className="desk-note">— 호스트가 수사를 개시하기를 기다리는 중…</span>
        )}
        {session.error && <div className="error-banner">{session.error}</div>}
      </Desk>
    </div>
  );
}
