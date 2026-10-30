import { Lock } from 'lucide-react';
import { useState } from 'react';
import { CHAR_BY_ID } from '../data/characters';
import { ART, shadedBg } from '../data/art';
import { DETECTIVE_BRIEF } from '../data/story';
import type { CharId } from '../data/types';
import type { SingleSave } from '../client/saveGame';
import type { SeatId } from '../engine/types';
import { Desk, Folder, Polaroid, seatName } from './bits';

/** 1회차 클리어 후 해금되는 시점. 이선빈(진범)은 싱글에서 제공하지 않는다. */
const UNLOCKABLE: CharId[] = ['jaegu', 'yeojin', 'arin'];
const TILTS = [-1.4, 1, -0.6, 1.3, -1];

const PHASE: Record<string, string> = { prologue: '프롤로그', investigate: '조사', discuss: '심문', final: '최종 추리' };

export function SingleSetup({ cleared, save, onBack, onStart, onResume }: {
  cleared: boolean; save: SingleSave | null; onBack: () => void; onStart: (p: SeatId) => void; onResume: (s: SingleSave) => void;
}) {
  const [pick, setPick] = useState<SeatId>('detective');
  const options: SeatId[] = ['detective', 'seongcheol', ...(cleared ? UNLOCKABLE : [])];

  return (
    <div className="screen" style={shadedBg(ART.cutaway, 0.72, 0.9)}>
      <Desk tab="CASE FILE · SOLO" kicker="No. 01-A / 단독 수사 · 수사 시점 지정" title="누구의 눈으로 그날 밤을 볼 것인가" onBack={onBack} wide>
        {save && (
          <div className="resume-bar">
            <div className="grow">
              <div className="kicker-type">SAVED CASE · 자동 저장</div>
              <b>{seatName(save.player)} 시점 · {save.state.round > 0 ? `라운드 ${save.state.round} ` : ''}{PHASE[save.state.phase] ?? ''}</b>
              <span className="muted"> — {new Date(save.savedAt).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 저장</span>
            </div>
            <button className="btn primary" onClick={() => onResume(save)}>이어서 수사하기 →</button>
          </div>
        )}
        <div className="folder-grid">
          {options.map((id, i) => {
            const c = id === 'detective' ? null : CHAR_BY_ID[id];
            return (
              <Folder
                key={id}
                tab={c ? `PERSONNEL · ${c.mbti}` : 'INVESTIGATOR'}
                no={c ? `시점 0${i + 1} / 용의자 본인` : '시점 01 / 외부 수사관'}
                title={c ? `${c.name} 시점` : '중립 수사관 모드'}
                stamp="지정됨"
                tilt={TILTS[i % TILTS.length]}
                selected={pick === id}
                compact
                onClick={() => setPick(id)}
              >
                <div className="row-photo">
                  <Polaroid char={c?.id} detective={!c} caption={c ? c.name : '수사관'} tilt={i % 2 ? 3 : -3} />
                  <p>
                    {c
                      ? id === 'seongcheol' ? '시신을 처음 발견한 사람. 자신의 로비를 숨기며 나머지 4명을 심문합니다.' : `${c.tagline}. 자신의 비밀을 지키며 나머지 4명을 심문합니다.`
                      : DETECTIVE_BRIEF.split('.').slice(0, 2).join('.') + '.'}
                  </p>
                </div>
              </Folder>
            );
          })}
          {!cleared && (
            <Folder tab="SEALED" no="미공개 시점" title={<><Lock size={18} /> 봉인된 파일</>} tilt={1.2} locked compact>
              <p>엔딩을 한 번 보면 다른 용의자의 시점이 열립니다.</p>
              <div className="seal"><span>엔딩 클리어 시 해금</span></div>
            </Folder>
          )}
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="desk-note">— 모두가 무언가를 숨기고 있다.</span>
          <button
            className={`btn ${save ? '' : 'primary'}`}
            onClick={() => {
              if (save && !window.confirm('새로 시작하면 저장된 수사 기록이 지워집니다. 계속할까요?')) return;
              onStart(pick);
            }}
          >
            {save ? '새 수사 시작 →' : '사건 현장으로 →'}
          </button>
        </div>
      </Desk>
    </div>
  );
}
