import { Suspense, useEffect, useState } from 'react';
import { Bookshelf } from './Bookshelf';
import type { Episode } from './episodes';

/** 최상위 화면: 책장에서 에피소드를 고르면 그 에피소드의 루트로 들어간다 */
export function Hub() {
  const [open, setOpen] = useState<Episode | null>(null);
  const Root = open?.Root;
  // 창 제목: 책장에서는 도서관 이름, 에피소드 안에서는 그 에피소드 이름
  useEffect(() => {
    document.title = open ? open.title : '공작소 도서관';
  }, [open]);
  if (Root) {
    return (
      <Suspense fallback={<div className="screen hub-loading">기록을 펼치는 중…</div>}>
        <Root onShelf={() => setOpen(null)} />
      </Suspense>
    );
  }
  return <Bookshelf onOpen={setOpen} />;
}
