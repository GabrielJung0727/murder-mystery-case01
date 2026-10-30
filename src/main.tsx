import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/special-elite/400.css';
import '@fontsource/nanum-gothic-coding/400.css';
import '@fontsource/nanum-gothic-coding/700.css';
import '@fontsource/nanum-myeongjo/400.css';
import '@fontsource/nanum-myeongjo/800.css';
import '@fontsource/nanum-pen-script/400.css';
import { audio } from './audio/director';
import { display } from './client/display';
import { protectContent } from './client/protect';
import { Hub } from './hub/Hub';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { UpdateNotice } from './ui/UpdateNotice';
import './ui/styles.css';
import './ui/casefile.css';
import './ui/casefolder.css';

// 자동재생 정책: 첫 입력에서 오디오 컨텍스트를 깨운다 (Electron은 정책을 꺼 두어 바로 재생)
for (const ev of ['pointerdown', 'keydown'] as const) window.addEventListener(ev, () => audio.unlock(), { once: true });
display.restore();
protectContent();
// 개발 모드에서만 콘솔에서 오디오 상태를 볼 수 있게 노출한다 (__gongjaksoAudio.debug())
if (import.meta.env.DEV) (window as unknown as { __gongjaksoAudio: typeof audio }).__gongjaksoAudio = audio;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>{(generation) => <Hub key={generation} />}</ErrorBoundary>
    <UpdateNotice />
  </StrictMode>,
);
