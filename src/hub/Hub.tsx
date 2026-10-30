import { Suspense, useState } from 'react';
import { Bookshelf } from './Bookshelf';
import type { Episode } from './episodes';

/** 최상위 화면: 책장에서 에피소드를 고르면 그 에피소드의 루트로 들어간다 */
export function Hub() {
  const [open, setOpen] = useState<Episode | null>(null);
  const Root = open?.Root;
  if (Root) {
    return (
      <Suspense fallback={<div className="screen hub-loading">기록을 펼치는 중…</div>}>
        <Root onShelf={() => setOpen(null)} />
      </Suspense>
    );
  }
  return <Bookshelf onOpen={setOpen} />;
}
