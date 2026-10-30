import { useEffect, useState } from 'react';
import { ROUND_INFO } from '../data/story';
import type { GameState } from '../engine/types';
import { Stamp } from './bits';

interface Banner { key: string; kicker: string; title: string; guide: string; stamp: string }

/** 라운드·단계가 바뀔 때 화면 중앙에 사건 파일 띠지를 잠깐 띄워 다음 할 일을 알린다 */
function describe(state: GameState): Banner | null {
  const single = state.mode === 'single';
  const key = `${state.phase}-${state.round}`;
  switch (state.phase) {
    case 'investigate': {
      const r = state.round as 1 | 2 | 3;
      return { key, kicker: `ROUND ${r} · ${ROUND_INFO[r].area}`, title: '조사 단계', stamp: `R${r} OPEN`,
        guide: single ? '평면도에서 빛나는 지점 2곳을 조사하세요. 조사를 마치면 심문실이 열립니다.' : '평면도에서 2곳을 조사하고, 카드를 공개할지 숨길지 정하세요.' };
    }
    case 'discuss':
      return { key, kicker: `ROUND ${state.round} · 토론`, title: single ? '심문실 개방' : '토론 단계', stamp: single ? 'INTERROGATE' : 'DEBATE',
        guide: single ? '우측의 용의자를 눌러 증거를 제시하세요. 거짓말이 무너지면 숨긴 카드가 나옵니다.' : '증거를 [제시!]로 모두에게 보여 주며 토론하세요.' };
    case 'final':
      return { key, kicker: 'FINAL · 최종 추리', title: '결론을 내릴 시간', stamp: 'VERDICT', guide: '범인, 동기, 사망 시각과 수법, 근거 증거를 보고서에 적으세요.' };
    default:
      return null;
  }
}

export function PhaseBanner({ state }: { state: GameState }) {
  const info = describe(state);
  const [shown, setShown] = useState<Banner | null>(null);

  useEffect(() => {
    if (!info) return;
    setShown(info);
    const t = setTimeout(() => setShown(null), 2900);
    return () => clearTimeout(t);
  }, [info?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!shown) return null;
  return (
    <div className="phase-banner" key={shown.key}>
      <div className="strip">
        <Stamp tilt={10}>{shown.stamp}</Stamp>
        <div className="kicker-type">{shown.kicker}</div>
        <h2>{shown.title}</h2>
        <p>{shown.guide}</p>
      </div>
    </div>
  );
}
