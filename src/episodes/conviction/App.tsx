import '@fontsource/nanum-brush-script/400.css';
import { useState } from 'react';
import type { EpisodeProps } from '../../hub/episodes';
import type { RoleId } from './data';
import { createTrial, type TrialState } from './engine';
import { Prologue, RoleSelect } from './Intro';
import { loadTrial } from './save';
import { useEpisodeSound } from './sound';
import { Title } from './Title';
import { Trial } from './Trial';
import './conviction.css';

type Screen = { kind: 'title' } | { kind: 'prologue'; next?: 'roles' } | { kind: 'roles' } | { kind: 'trial'; state: TrialState };

/** 에피소드 2 「흔들리지 않는 신념으로」의 루트 (src/hub/episodes.ts) */
export function App({ onShelf }: EpisodeProps) {
  const [screen, setScreen] = useState<Screen>({ kind: 'title' });
  const toTitle = () => setScreen({ kind: 'title' });
  useEpisodeSound();

  switch (screen.kind) {
    case 'title':
      return (
        <Title
          canResume={!!loadTrial()}
          onStart={() => setScreen({ kind: 'prologue', next: 'roles' })}
          onResume={() => { const s = loadTrial(); if (s) setScreen({ kind: 'trial', state: s }); }}
          onPrologue={() => setScreen({ kind: 'prologue' })}
          onShelf={onShelf}
        />
      );
    case 'prologue':
      return <Prologue onDone={() => setScreen(screen.next ? { kind: 'roles' } : { kind: 'title' })} />;
    case 'roles':
      return <RoleSelect onBack={toTitle} onPick={(role: RoleId) => setScreen({ kind: 'trial', state: createTrial(role) })} />;
    case 'trial':
      return <Trial initial={screen.state} onExit={toTitle} />;
  }
}
