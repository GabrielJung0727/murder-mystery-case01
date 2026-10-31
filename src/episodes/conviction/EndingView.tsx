// 엔딩 화면 (전체 화면): 엔딩 일러스트 자리, 판결 인장, 엔딩집 본문, 핵심 증거, 개인 목표, 공통 에필로그
import { Check, KeyRound, Minus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { audio } from '../../audio/director';
import { CLOSING, ENDINGS, KEY_ITEMS, roleOf, type KeyItem } from './data';
import { ASSETS, cursorVars } from './assets';
import { found, goalResults, type TrialState } from './engine';
import { Caption } from './Caption';
import { Scene } from './Scene';
import { endingSteps, endingTrack, music, playSteps, say } from './sound';

export function EndingView({ s, onExit }: { s: TrialState; onExit: () => void }) {
  const e = ENDINGS[s.ending!];
  const art = ASSETS.endings[s.ending!];
  const [epilogue, setEpilogue] = useState(false);
  // 판결 선고 → 엔딩마다 다른 소리 → 엔딩 낭독. 에필로그에서는 맺음말 곡과 낭독
  useEffect(() => {
    if (epilogue) {
      music('CV-OST09', 2.5);
      say(['CV-NAR-EP'], 1);
      return () => audio.stopNarration();
    }
    music(endingTrack(s.ending!), 2);
    return playSteps(endingSteps(s.verdict!, s.ending!));
  }, [epilogue, s.ending, s.verdict]);

  return (
    <div className="cv cv-end" style={cursorVars()}>
      {art ? <div className="cv-end-art" style={{ backgroundImage: `url(${art})` }} /> : <Scene dim />}
      <div className="cv-end-shade" />
      {epilogue ? (
        <div className="cv-end-epilogue" onClick={onExit}>
          <p>{CLOSING}</p>
          <span className="cv-hint">흔들리지 않는 신념으로 · 끝 — 클릭하여 타이틀로</span>
        </div>
      ) : (
        <div className="cv-end-body">
          <span className="cv-end-seal">判決</span>
          <span className="cv-kicker">피고인 {roleOf(s.verdict!).name} 유죄 · {e.tag}</span>
          <h2>{e.title}</h2>
          <p className="cv-end-text">{e.text}</p>
          <div className="cv-end-meta">
            <ul className="cv-keys">
              {(Object.keys(KEY_ITEMS) as KeyItem[]).map((k) => (
                <li key={k} className={found(s, k) ? 'on' : ''}><KeyRound size={12} /> {KEY_ITEMS[k].name} — {roleOf(KEY_ITEMS[k].finder).name} {found(s, k) ? '발견' : '못 찾음'}</li>
              ))}
            </ul>
            <section className="cv-goals">
              <h3>{roleOf(s.player).name}의 개인 목표</h3>
              <ul>
                {goalResults(s).map((g) => (
                  <li key={g.label} className={g.done === null ? 'open' : g.done ? 'done' : 'fail'}>
                    {g.done === null ? <Minus size={14} /> : g.done ? <Check size={14} /> : <X size={14} />}
                    <span>{g.label}</span>
                    <small>{g.note ?? (g.done ? '달성' : '실패')}</small>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <div className="cv-end-actions">
            <button className="cv-stroke primary" onClick={() => setEpilogue(true)}><span>에필로그</span></button>
            <button className="cv-back" onClick={onExit}>타이틀로</button>
          </div>
        </div>
      )}
      <Caption />
    </div>
  );
}
