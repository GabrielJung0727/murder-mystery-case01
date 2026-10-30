import { useState } from 'react';
import { CARDS } from '../data/cards';
import { CHAR_BY_ID, CHAR_IDS, CHARACTERS } from '../data/characters';
import { AFTERWORD, ENDINGS, TRUTH_SUMMARY, TRUTH_TIMELINE } from '../data/story';
import type { GameState, SeatId } from '../engine/types';
import { ART, shadedBg } from '../data/art';
import { Atmosphere } from './Atmosphere';
import { VoiceButton, VolumeControl } from './VolumeControl';
import type { VoiceId } from '../audio/director';
import { Polaroid, Stamp, seatName } from './bits';

export const VERDICT = {
  A: { text: 'CASE CLOSED', tone: 'red' },
  B: { text: '입증 미흡', tone: 'amber' },
  C: { text: '오판', tone: 'red' },
  D: { text: 'UNSOLVED', tone: 'gray' },
} as const;

export function Ending({ state, you, onExit }: { state: GameState; you: SeatId | null; onExit: () => void }) {
  const [archive, setArchive] = useState(false);
  const result = state.result!;
  const ending = ENDINGS[result.ending];
  const humans = state.seats.filter((s) => s.kind === 'human');

  return (
    <div className="ending" style={shadedBg(ART.exterior, 0.7, 0.95)}>
      <Atmosphere intensity={0.6} />
      <div className="ending-inner">
        <div className="row">
          <span className="kicker-type grow">CASE 01 · ENDING {result.ending} · 수사 종결 보고</span>
          <VolumeControl />
          <button className="btn" onClick={() => setArchive(!archive)}>{archive ? '결과로 돌아가기' : '사후 복기 · 진상 아카이브'}</button>
          <button className="btn ghost" onClick={onExit}>타이틀로</button>
        </div>

        {!archive ? (
          <>
            <div className="verdict-head">
              <h1 className="grow">{ending.title}</h1>
              <Stamp tone={VERDICT[result.ending].tone} tilt={-8}><span className="verdict-stamp-text">{VERDICT[result.ending].text}</span></Stamp>
            </div>
            <div className="story">{ending.text}<div style={{ marginTop: 10 }}><VoiceButton ids={[`NAR-E-${result.ending}` as VoiceId]} label="엔딩 다시 듣기" /></div></div>
            {state.mode === 'single' && state.solved && <span className="tag green">진범의 자백을 받아냈다</span>}
            <h3>투표 결과</h3>
            <div className="tally">
              {CHAR_IDS.map((c) => (
                <div key={c} className={`tally-item ${result.top.includes(c) ? 'top' : ''}`}>
                  <Polaroid char={c} tilt={CHAR_IDS.indexOf(c) % 2 ? 3 : -3} />
                  <div>{CHAR_BY_ID[c].name}</div>
                  <b>{result.tally[c]}</b>
                  <div className="muted" style={{ fontSize: 11 }}>
                    {Object.entries(result.votes).filter(([, v]) => v === c).map(([s]) => seatName(s as SeatId)).join(', ')}
                  </div>
                </div>
              ))}
            </div>
            <h3>점수</h3>
            <div className="paper score-paper"><table className="score-table">
              <thead><tr><th>플레이어</th><th>범인 (2)</th><th>동기 (1)</th><th>시각·수법 (1)</th><th>증거 연결 (1)</th><th>개인 목표 (+1)</th><th>합계</th></tr></thead>
              <tbody>
                {humans.map((s) => {
                  const sc = result.scores[s.id];
                  if (!sc) return null;
                  return (
                    <tr key={s.id} style={s.id === you ? { color: 'var(--neon)' } : undefined}>
                      <td>{seatName(s.id)}{s.name && s.id !== 'detective' && state.mode === 'online' ? ` (${s.name})` : ''}</td>
                      <td>{sc.culprit}</td><td>{sc.motive}</td><td>{sc.timeMethod}</td><td>{sc.evidence}</td><td>{sc.bonus}</td><td><b>{sc.total}</b></td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          </>
        ) : (
          <>
            <h1>진상</h1>
            <div className="story">{TRUTH_SUMMARY}<div style={{ marginTop: 10 }}><VoiceButton ids={['NAR-T01', 'NAR-T02']} label="진상·후일담 듣기" /></div></div>
            <h3>실제 시간표</h3>
            <div className="paper">
              {TRUTH_TIMELINE.map((t) => (
                <div key={t.time} className="truth-row"><span className="mono" style={{ color: '#8b1f24', fontWeight: 700 }}>{t.time}</span><span>{t.event}</span><span className="muted mono">증거 {t.cards}</span></div>
              ))}
            </div>
            <h3>각 인물의 진짜 비밀</h3>
            <div className="archive-cards">
              {CHARACTERS.map((c) => (
                <div key={c.id} className="archive-card">
                  <div className="row"><Polaroid char={c.id} tilt={-3} /><b style={{ fontSize: 18 }}>{c.name}</b></div>
                  <p>{c.secret}</p>
                </div>
              ))}
            </div>
            <h3>증거 카드 해설 (35장)</h3>
            <div className="archive-cards">
              {CARDS.map((c) => {
                const cs = state.cards[c.id];
                return (
                  <div key={c.id} className="archive-card">
                    <div className="row">
                      <b className="grow">{c.id} · {c.title}</b>
                      <span className={`tag ${cs.public ? 'red' : cs.owner ? 'amber' : ''}`}>{cs.public ? '공개됨' : cs.owner ? `${seatName(cs.owner)} 은폐` : '미조사'}</span>
                    </div>
                    <span className="muted">{c.text}</span>
                    <span className="note">해설: {c.note}</span>
                  </div>
                );
              })}
            </div>
            <div className="story">{AFTERWORD}<div style={{ marginTop: 10 }}><VoiceButton ids={['NAR-T02']} label="후일담 듣기" /></div></div>
          </>
        )}
      </div>
    </div>
  );
}
