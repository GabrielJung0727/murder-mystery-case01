import type { GameOptions, VariantMode } from '../engine/types';

const CASES: { id: VariantMode; label: string; desc: string }[] = [
  { id: 'original', label: '원작 사건', desc: '처음 하는 분께. 설정집 그대로의 진상입니다.' },
  { id: 'variant', label: '변형 사건', desc: '진범과 동기가 바뀐 사건 기록 중 하나. 이미 원작을 풀어 봤다면.' },
  { id: 'any', label: '완전 무작위', desc: '원작을 포함한 모든 사건 기록 중 하나. 무엇이 나올지 모릅니다.' },
];

/** 사건 선택(진범 변형)과 난이도. 싱글 설정과 온라인 대기실에서 같이 쓴다 */
export function OptionsPicker({ value, onChange, disabled }: { value: GameOptions; onChange?: (o: GameOptions) => void; disabled?: boolean }) {
  const set = (o: Partial<GameOptions>) => onChange?.({ ...value, ...o });
  return (
    <div className="opts">
      <div className="opt-group">
        <span className="kicker-type">사건 선택</span>
        <div className="seg">
          {CASES.map((c) => (
            <button key={c.id} className={value.variantMode === c.id ? 'on' : ''} disabled={disabled} onClick={() => set({ variantMode: c.id })}>{c.label}</button>
          ))}
        </div>
        <span className="muted">{CASES.find((c) => c.id === value.variantMode)!.desc}</span>
      </div>
      <div className="opt-group">
        <span className="kicker-type">난이도</span>
        <div className="seg">
          <button className={value.difficulty === 'normal' ? 'on' : ''} disabled={disabled} onClick={() => set({ difficulty: 'normal' })}>보통</button>
          <button className={value.difficulty === 'hard' ? 'on' : ''} disabled={disabled} onClick={() => set({ difficulty: 'hard' })}>어려움</button>
        </div>
        <span className="muted">
          {value.difficulty === 'hard'
            ? '단서 힌트 없음 · 심문마다 증거 제시 5회 · 용의자가 불리한 증거를 더 숨김 · 타임라인 판정은 엔딩에서 공개 · 랭크 +1'
            : '막히면 심문 중에 다음 단서를 귀띔해 줍니다.'}
        </span>
      </div>
    </div>
  );
}
