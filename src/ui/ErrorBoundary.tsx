import { Component, type ReactNode } from 'react';
import { APP_VERSION } from '../client/bridge';
import { clearSingle, loadSingle } from '../client/saveGame';
import { ART, shadedBg } from '../data/art';
import { Desk } from './bits';

interface State {
  error: Error | null;
  /** 복구할 때마다 올려서 App 을 처음부터 다시 그린다 */
  generation: number;
}

/**
 * 화면을 그리다 예상하지 못한 오류가 나면 까만 화면 대신 복구 화면을 보여 준다.
 * 싱글 플레이는 자동 저장이 남아 있으므로 타이틀에서 이어서 할 수 있다.
 */
export class ErrorBoundary extends Component<{ children: (generation: number) => ReactNode }, State> {
  state: State = { error: null, generation: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('[공작소의 밤] 화면 오류', error, info.componentStack);
  }

  private recover = (dropSave: boolean) => {
    if (dropSave) clearSingle();
    this.setState((s) => ({ error: null, generation: s.generation + 1 }));
  };

  render() {
    const { error, generation } = this.state;
    if (!error) return this.props.children(generation);
    const hasSave = !!loadSingle();
    return (
      <div className="screen" style={shadedBg(ART.cutaway, 0.78, 0.94)}>
        <Desk tab="ERROR · 기록 손상" kicker={`BUILD v${APP_VERSION}`} title="사건 기록이 훼손되었습니다">
          <p>예상하지 못한 오류로 화면을 이어 그릴 수 없습니다. 타이틀로 돌아가 다시 시작해 주세요.</p>
          {hasSave && <p className="muted">싱글 플레이는 마지막 행동까지 자동 저장되어 있어 [싱글 플레이 → 이어서 수사하기]로 이어 갈 수 있습니다.</p>}
          <details className="error-detail">
            <summary>오류 내용 (제보할 때 함께 보내 주세요)</summary>
            <pre data-selectable>{`${error.name}: ${error.message}\n${error.stack ?? ''}`}</pre>
          </details>
          <div className="row" style={{ gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {hasSave && (
              <button className="btn ghost" onClick={() => window.confirm('저장된 싱글 플레이 기록을 지울까요? 같은 오류가 계속 날 때만 사용하세요.') && this.recover(true)}>
                저장 지우고 타이틀로
              </button>
            )}
            <button className="btn primary" onClick={() => this.recover(false)}>타이틀로 돌아가기</button>
          </div>
        </Desk>
      </div>
    );
  }
}
