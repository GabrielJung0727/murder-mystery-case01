import { useEffect, useState } from 'react';
import { progress } from '../client/progress';
import { ACHIEVEMENTS } from '../data/achievements';
import { caseOf } from '../data/caseData';
import { CHAR_BY_ID, CHAR_IDS } from '../data/characters';
import { josa } from '../data/josa';
import { summarize } from '../engine/summary';
import type { GameState, Rank, SeatId } from '../engine/types';
import { ART, shadedBg } from '../data/art';
import { Atmosphere } from './Atmosphere';
import { VoiceButton, VolumeControl } from './VolumeControl';
import { afterwordVoices, endingVoice, truthVoices } from '../audio/caseVoice';
import { GameIcon, Polaroid, Stamp, seatName } from './bits';

export const VERDICT = {
  A: { text: 'CASE CLOSED', tone: 'red' },
  B: { text: '입증 미흡', tone: 'amber' },
  C: { text: '오판', tone: 'red' },
  D: { text: 'UNSOLVED', tone: 'gray' },
} as const;

/**
 * 엔딩 본문. 싱글 B 는 득표가 아니라 입증으로 갈리므로(engine/scoring.ts decideSoloEnding)
 * 득표를 말하는 첫 문장을 '당신은 ○○을 지목했다.' 로 바꾼다.
 */
function endingText(state: GameState): string {
  const data = caseOf(state);
  const ending = state.result!.ending;
  const text = data.endings[ending].text;
  if (state.mode !== 'single' || ending !== 'B') return text;
  return `당신은 ${josa(CHAR_BY_ID[data.culprit].name, '을/를')} 지목했다. ${text.slice(text.indexOf('. ') + 2)}`;
}

export const RANK_TONE: Record<Rank, 'red' | 'amber' | 'green' | 'gray'> = { S: 'red', A: 'amber', B: 'green', C: 'gray', D: 'gray' };

export function Ending({ state, you, onExit }: { state: GameState; you: SeatId | null; onExit: () => void }) {
  const [archive, setArchive] = useState(false);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const result = state.result!;
  const data = caseOf(state);
  const ending = data.endings[result.ending];
  const humans = state.seats.filter((s) => s.kind === 'human');
  const myGoals = you ? result.goals[you] ?? [] : [];
  const myRank = you ? result.ranks[you] : undefined;
  const single = state.mode === 'single';

  // 이 판의 기록과 도전 과제를 한 번 반영한다
  useEffect(() => {
    const summary = summarize(state, you);
    if (!summary) return;
    const key = `${state.variant}:${state.logSeq}:${JSON.stringify(result.votes)}:${you}`;
    setUnlocked(progress.finishGame(summary, key));
  }, [state, you, result.votes]);

  return (
    <div className="ending" style={shadedBg(ART.exterior, 0.7, 0.95)}>
      <Atmosphere intensity={0.6} />
      <div className="ending-inner">
        <div className="row">
          <span className="kicker-type grow">
            CASE 01 · {data.variant.code} 「{data.variant.title}」 · ENDING {result.ending}{state.options.difficulty === 'hard' ? ' · 어려움' : ''}
          </span>
          <VolumeControl />
          <button className="btn" onClick={() => setArchive(!archive)}>{archive ? '결과로 돌아가기' : '사후 복기 · 진상 아카이브'}</button>
          <button className="btn ghost" onClick={onExit}>타이틀로</button>
        </div>

        {!archive ? (
          <>
            <div className="verdict-head">
              <h1 className="grow">{ending.title}</h1>
              {myRank && <div className="rank-badge" data-rank={myRank}><span>RANK</span><b>{myRank}</b></div>}
              <Stamp tone={VERDICT[result.ending].tone} tilt={-8}><span className="verdict-stamp-text">{VERDICT[result.ending].text}</span></Stamp>
            </div>
            <div className="story">
              {endingText(state)}
              {endingVoice(state.variant, result.ending, single) && (
                <div style={{ marginTop: 10 }}><VoiceButton ids={[endingVoice(state.variant, result.ending, single)!]} label="엔딩 다시 듣기" /></div>
              )}
            </div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              <span className="tag red">진범: {CHAR_BY_ID[data.culprit].name}</span>
              {state.mode === 'single' && state.solved && <span className="tag green">진범의 자백을 받아냈다</span>}
              {state.mode === 'single' && <span className="tag">증거 제시 {state.stats.presents}회 · 헛짚음 {state.stats.misses}회</span>}
            </div>

            {(myGoals.length > 0 || unlocked.length > 0) && (
              <div className="ending-cols">
                {myGoals.length > 0 && (
                  <div className="paper">
                    <h4>개인 목표 · {myGoals.filter((g) => g.done).length}/{myGoals.length}</h4>
                    <ul className="goal-result">
                      {myGoals.map((g) => (
                        <li key={g.id} className={g.done ? 'done' : ''}><GameIcon name={g.done ? 'check' : 'close'} /> {g.label}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {unlocked.length > 0 && (
                  <div className="paper achv-new">
                    <h4>새로 달성한 도전 과제</h4>
                    {ACHIEVEMENTS.filter((a) => unlocked.includes(a.id)).map((a) => (
                      <div key={a.id} className="achv"><b>{a.title}</b><span className="muted">{a.desc}</span></div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <h3>투표 결과</h3>
            <div className="tally">
              {CHAR_IDS.map((c) => (
                <div key={c} className={`tally-item ${result.top.includes(c) ? 'top' : ''}`}>
                  <Polaroid char={c} tilt={CHAR_IDS.indexOf(c) % 2 ? 3 : -3} />
                  <div>{CHAR_BY_ID[c].name}{c === data.culprit ? ' · 진범' : ''}</div>
                  <b>{result.tally[c]}</b>
                  <div className="muted" style={{ fontSize: 11 }}>
                    {Object.entries(result.votes).filter(([, v]) => v === c).map(([s]) => seatName(s as SeatId)).join(', ')}
                  </div>
                </div>
              ))}
            </div>
            <h3>점수</h3>
            <div className="paper score-paper"><table className="score-table">
              <thead><tr><th>플레이어</th><th>범인 (2)</th><th>동기 (1)</th><th>시각·수법 (1)</th><th>증거 연결 (1)</th><th>개인 목표 (3)</th><th>합계</th><th>랭크</th></tr></thead>
              <tbody>
                {humans.map((s) => {
                  const sc = result.scores[s.id];
                  if (!sc) return null;
                  const rank = result.ranks[s.id];
                  return (
                    <tr key={s.id} style={s.id === you ? { color: 'var(--neon)' } : undefined}>
                      <td>{seatName(s.id)}{s.name && s.id !== 'detective' && state.mode === 'online' ? ` (${s.name})` : ''}{s.id === data.culprit ? ' · 진범 역할' : ''}</td>
                      <td>{sc.culprit}</td><td>{sc.motive}</td><td>{sc.timeMethod}</td><td>{sc.evidence}</td><td>{sc.bonus}</td><td><b>{sc.total}</b></td>
                      <td>{rank && <b className={`rank-cell r-${rank}`}>{rank}</b>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
            <p className="muted" style={{ fontSize: 12 }}>
              랭크: 수사하는 쪽은 보고서와 개인 목표 합계(8점 만점, 어려움 +1)로, 진범 역할은 개인 목표 달성 수로 매깁니다. S·A는 진범을 맞혀야 받을 수 있습니다.
            </p>
          </>
        ) : (
          <>
            <h1>진상 · {data.variant.code} 「{data.variant.title}」</h1>
            <div className="story">
              {data.truthSummary}
              {truthVoices(state.variant).length > 0 && <div style={{ marginTop: 10 }}><VoiceButton ids={truthVoices(state.variant)} label="진상·후일담 듣기" /></div>}
            </div>
            <h3>실제 시간표</h3>
            <div className="paper">
              {data.truthTimeline.map((t) => (
                <div key={t.time} className="truth-row"><span className="mono" style={{ color: '#8b1f24', fontWeight: 700 }}>{t.time}</span><span>{t.event}</span><span className="muted mono">증거 {t.cards}</span></div>
              ))}
            </div>
            <h3>각 인물의 진짜 비밀</h3>
            <div className="archive-cards">
              {data.chars.map((c) => (
                <div key={c.id} className="archive-card">
                  <div className="row"><Polaroid char={c.id} tilt={-3} /><b style={{ fontSize: 18 }}>{c.name}{c.id === data.culprit ? ' · 진범' : ''}</b></div>
                  <p>{c.secret}</p>
                </div>
              ))}
            </div>
            <h3>증거 카드 해설 (35장)</h3>
            <div className="archive-cards">
              {data.cards.map((c) => {
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
            <div className="story">
              {data.afterword}
              {afterwordVoices(state.variant).length > 0 && <div style={{ marginTop: 10 }}><VoiceButton ids={afterwordVoices(state.variant)} label="후일담 듣기" /></div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
