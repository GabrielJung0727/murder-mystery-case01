import { useEffect, useState } from 'react';
import { audio, type VoiceId } from '../audio/director';
import { ART, ZONE_ART } from '../data/art';
import { CARD_BY_ID, CARDS } from '../data/cards';
import { caseOf } from '../data/caseData';
import { CHARACTERS, TIME_MARKERS } from '../data/characters';
import { goalsFor } from '../data/goals';
import plan from '../data/floorplan.json';
import { CASE_BRIEF, DETECTIVE_BRIEF, ROOM_LAYOUT, ROUND_INFO } from '../data/story';
import type { CardId, ZoneId } from '../data/types';
import { canSee } from '../engine/engine';
import type { GameState, SeatId } from '../engine/types';
import { Polaroid, Stamp } from './bits';
import { FilmViewer, type FilmShot } from './FilmViewer';
import { VoiceButton } from './VolumeControl';

const RULES = [
  '매 라운드 최대 2곳(AP 2)을 조사할 수 있습니다. 이미 누군가 가져간 카드는 다시 조사할 수 없습니다.',
  '가져간 카드는 공개할지 숨길지 선택할 수 있지만, 카드의 문구를 바꾸거나 가짜 증거를 만들 수는 없습니다.',
  '개인 설정의 사실은 역할극을 위해 일부 숨기거나 표현을 바꿀 수 있습니다. 다만 공개된 증거를 부정할 수는 없습니다.',
  '증거는 특정 범인을 자동으로 지목하지 않습니다. 동기, 기회, 진술의 모순을 함께 따져야 합니다.',
];
const INTERRO_TIPS = [
  '조사 단계가 끝나고 토론 단계가 되면 심문실이 열립니다. 우측의 용의자를 누르세요.',
  '증거를 1~3장 골라 제시하세요. 맞는 증거는 용의자의 방어선을 무너뜨리고, 숨기던 카드를 내놓게 합니다.',
  '여러 장을 한 번에 제시해야만 무너지는 거짓말도 있습니다.',
];

type Tab = 'mine' | 'case' | 'people' | 'map' | 'evidence' | 'timeline' | 'rules';
const TABS: { id: Tab; label: string }[] = [
  { id: 'mine', label: '내 신상 기록' },
  { id: 'case', label: '사건 개요' },
  { id: 'people', label: '인물 관계' },
  { id: 'map', label: '방 배치도' },
  { id: 'evidence', label: '증거 목록' },
  { id: 'timeline', label: '타임라인' },
  { id: 'rules', label: '조사 규칙' },
];

/** 사건 당일 밤 기준 분: 23:35 → 1415, 00:10 → 1450 (자정을 넘긴 시각이 뒤로 가도록) */
function nightOrder(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h < 12 ? h + 24 : h) * 60 + m;
}

/** 검열 막대: 아직 드러나지 않은 정보 자리 */
function Redact({ w = 6 }: { w?: number }) {
  return <span className="redact" style={{ width: `${w}em` }} aria-label="검열됨" />;
}

/** 현장 사진(필름 뷰어) 목록: 이번 라운드까지 열린 방들의 실내 사진 */
function sceneShots(state: GameState): FilmShot[] {
  const shots: FilmShot[] = [];
  for (const floor of plan.floors) {
    for (const room of floor.rooms) {
      const src = ZONE_ART[room.zone as ZoneId];
      if (room.unlock > Math.max(1, state.round)) continue;
      const existing = shots.find((s) => s.src === src);
      if (existing) existing.zones.push(room.zone as ZoneId);
      else shots.push({ src, title: room.label, zones: [room.zone as ZoneId] });
    }
  }
  return shots;
}

/**
 * 기밀 서류철: 낡은 가죽 사건 파일. 왼쪽 색인 탭마다 별도의 종이가 넘어가고,
 * 현장 사진은 주변이 암전되는 필름 뷰어로 연다.
 */
export function Dossier({ state, you, onClose, onOpenCard }: {
  state: GameState; you: SeatId | null; onClose: () => void; onOpenCard?: (c: CardId) => void;
}) {
  const data = caseOf(state);
  const me = you && you !== 'detective' ? data.char(you) : null;
  const myGoals = you ? goalsFor(you, data) : [];
  const isCulprit = !!me && me.id === data.culprit;
  const tabs = TABS.filter((t) => t.id !== 'mine' || me);
  const [tab, setTab] = useState<Tab>(me ? 'mine' : 'case');
  const [film, setFilm] = useState<number | null>(null);
  const shots = sceneShots(state);
  // 브리핑 낭독 순서: 수사관 브리핑(수사관 모드) → 사건 개요 → 방 배치 → 조사 규칙 → 심문 요령(싱글)
  const briefing: VoiceId[] = [...(you === 'detective' ? ['NAR-B01' as const] : []), 'NAR-B02', 'NAR-B03', 'NAR-B04', ...(state.mode === 'single' ? ['NAR-B05' as const] : [])];
  const seen = (c: CardId) => (you ? canSee(state, you, c) : state.cards[c].public);

  useEffect(() => () => audio.stopNarration('NAR-B'), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && film === null) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [film, onClose]);

  const turn = (t: Tab) => {
    if (t === tab) return;
    audio.sfx('paper', 0.7);
    setTab(t);
  };
  const openCard = (c: CardId) => {
    if (!onOpenCard) return;
    onClose();
    onOpenCard(c);
  };

  return (
    <div className="cf-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="casefile" role="dialog" aria-label="기밀 서류철">
        <aside className="cf-index">
          <div className="cf-label">
            <span className="kicker-type">CASE 01</span>
            <h2>공작소 사건</h2>
            <span className="cf-docno">기록번호 GJ-0101 · 담당 <Redact w={3.5} /></span>
          </div>
          <nav className="cf-tabs">
            {tabs.map((t) => (
              <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => turn(t.id)}>{t.label}</button>
            ))}
          </nav>
          <button className="cf-close" onClick={onClose}>서류철 닫기 <kbd>Esc</kbd></button>
        </aside>

        <section className="cf-desk">
          <div className="cf-page" key={tab}>
            {tab === 'mine' && me && (
              <article className="sheet tilt-l">
                <span className="clip" />
                <div className="sheet-head">
                  <Polaroid char={me.id} caption={me.name} tilt={-4} />
                  <div className="grow">
                    <span className="kicker-type">PERSONNEL FILE · 본인 외 열람 금지</span>
                    <h1>{me.name}</h1>
                    <p className="typed-meta">{me.tagline} / {me.mbti} / {me.gender} / 21세</p>
                  </div>
                  <Stamp tilt={-12}>{isCulprit ? '범인 역할' : 'CONFIDENTIAL'}</Stamp>
                </div>
                {isCulprit && <p className="ink-note">당신은 범인입니다. 거짓과 정치를 통해 지목을 회피하십시오. — 이 기록은 본인에게만 보입니다.</p>}
                <div className="sheet-cols">
                  <section><h4>겉으로 알려진 정보</h4><p>{me.publicInfo}</p></section>
                  <section className="secret"><h4>당신만 아는 비밀</h4><p>{me.secret}</p></section>
                  <section><h4>알리바이와 시간표</h4><p>{me.alibi}</p></section>
                  <section><h4>알고 있는 사실</h4><ul>{me.knows.map((k) => <li key={k}>{k}</li>)}</ul></section>
                  <section><h4>숨기고 싶은 사실</h4><ul>{me.hide.map((k) => <li key={k}>{k}</li>)}</ul></section>
                  <section>
                    <h4>개인 목표 (달성할 때마다 +1점)</h4>
                    <p>{me.goal}</p>
                    <ul className="goal-list">{myGoals.map((g) => <li key={g.id}>{g.label}</li>)}</ul>
                  </section>
                </div>
                <p className="hand-memo">{me.firstLine}</p>
              </article>
            )}

            {tab === 'case' && (
              <>
                <article className="sheet tilt-l">
                  <div className="sheet-photo" style={{ backgroundImage: `url(${ART.exterior})` }}><span className="paperclip" /></div>
                  <span className="kicker-type">CASE 01 · 사건 접수 기록</span>
                  <h1>사건 개요 <VoiceButton ids={['NAR-B02']} compact /></h1>
                  <p className="typed">{CASE_BRIEF}</p>
                  <dl className="facts">
                    <dt>사건 장소</dt><dd>숲속 대형 단독펜션 · 1층 쪽방</dd>
                    <dt>발견 시각</dt><dd>새벽 1시경 · 발견자 이성철</dd>
                    <dt>피해자</dt><dd>강호연 (21) · 공작소 소장</dd>
                    <dt>사인</dt><dd>{seen('35') ? '뒤통수의 강한 충격 (증거 35)' : <Redact w={9} />}</dd>
                    <dt>목격자</dt><dd><Redact w={5} /></dd>
                  </dl>
                  <div className="row" style={{ marginTop: 12 }}><VoiceButton ids={briefing} label="브리핑 전체 듣기" /></div>
                  <Stamp tilt={-14}>수사 중</Stamp>
                </article>
                {you === 'detective' && (
                  <article className="sheet slip tilt-r">
                    <span className="tape" />
                    <div className="sheet-head">
                      <Polaroid char="detective" caption="수사관" tilt={-4} />
                      <div className="grow">
                        <h3>수사관 브리핑 <VoiceButton ids={['NAR-B01']} compact /></h3>
                        <p className="typed">{DETECTIVE_BRIEF}</p>
                        <h4 style={{ marginTop: 10 }}>수사관 목표 (달성할 때마다 +1점)</h4>
                        <ul className="goal-list">{myGoals.map((g) => <li key={g.id}>{g.label}</li>)}</ul>
                      </div>
                    </div>
                  </article>
                )}
                <div className="sticky">누가 거짓말을<br />하고 있는가?</div>
              </>
            )}

            {tab === 'people' && (
              <article className="sheet wide">
                <span className="kicker-type">SUSPECT ROSTER · 용의자 명단</span>
                <h1>인물 관계</h1>
                <div className="roster">
                  {CHARACTERS.map((c, i) => (
                    <div key={c.id} className={`suspect-card ${c.id === you ? 'self' : ''}`}>
                      <span className="paperclip" />
                      <Polaroid char={c.id} tilt={i % 2 ? 3 : -3} caption={c.name} />
                      <div className="grow">
                        <b>{c.name}</b> <span className="typed-meta">{c.mbti} · {c.gender} · 21세</span>
                        <p className="typed-meta">{c.tagline}</p>
                        <p>{c.publicInfo}</p>
                      </div>
                      {c.id === you && <Stamp tone="amber" tilt={-8}>본인</Stamp>}
                    </div>
                  ))}
                  <div className="suspect-card victim">
                    <Polaroid char="hoyeon" tilt={-2} caption="강호연" />
                    <div className="grow">
                      <b>강호연</b> <span className="typed-meta">ENFP · 남성 · 21세 · 공작소 소장</span>
                      <p>규정집 발표를 추진하다 쪽방에서 사망한다.</p>
                    </div>
                    <Stamp tilt={-10}>사망</Stamp>
                  </div>
                  <div className="suspect-card">
                    <Polaroid char="jaewoo" tilt={2} caption="정재우" />
                    <div className="grow">
                      <b>정재우</b> <span className="typed-meta">남성 · 21세 · 공작소 동업자</span>
                      <p>강호연의 고등학교 친구이자 공작소 동업자. 여행에는 오지 못했지만, 이번 사건의 당사자들과 연락을 주고받았다.</p>
                    </div>
                    <Stamp tone="gray" tilt={-8}>불참</Stamp>
                  </div>
                </div>
              </article>
            )}

            {tab === 'map' && (
              <article className="sheet wide">
                <span className="kicker-type">SITE PLAN · 현장 배치</span>
                <h1>방 배치도 <VoiceButton ids={['NAR-B03']} compact /></h1>
                <p className="typed">{ROOM_LAYOUT}</p>
                <div className="plans">
                  {plan.floors.map((f, i) => (
                    <figure key={f.id} className={`plan-sheet ${i ? 'tilt-r' : 'tilt-l'}`}>
                      <img src={f.image} alt={f.label} />
                      <figcaption>{f.label}</figcaption>
                    </figure>
                  ))}
                </div>
                <h3 className="film-head">현장 사진 <span className="typed-meta">— 눌러서 확대 · 라운드가 진행되면 더 열립니다</span></h3>
                <div className="filmstrip">
                  {shots.map((s, i) => (
                    <button key={s.src} className="frame" onClick={() => { audio.sfx('paper', 0.5); setFilm(i); }}>
                      <img src={s.src} alt={s.title} />
                      <span>{s.title}</span>
                    </button>
                  ))}
                </div>
              </article>
            )}

            {tab === 'evidence' && (
              <article className="sheet wide">
                <span className="kicker-type">EVIDENCE LOG · 증거 대장</span>
                <h1>증거 목록</h1>
                {([1, 2, 3] as const).map((r) => (
                  <section key={r} className="ev-round">
                    <h4>ROUND {r} · {ROUND_INFO[r].area}</h4>
                    <div className="ev-grid">
                      {CARDS.filter((c) => c.round === r).map((c) => {
                        const known = seen(c.id);
                        const sealed = r > state.round;
                        return known ? (
                          <button key={c.id} className="ev-tag" onClick={() => openCard(c.id)}>
                            <span className="ev-no">EVIDENCE #{c.id}</span>
                            <b>{c.title}</b>
                            <span className="typed-meta">{c.location}{!state.cards[c.id].public ? ' · 비공개' : ''}</span>
                          </button>
                        ) : (
                          <div key={c.id} className={`ev-tag unknown ${sealed ? 'sealed' : ''}`}>
                            <span className="ev-no">EVIDENCE #{c.id}</span>
                            <Redact w={7} />
                            <span className="typed-meta">{sealed ? `봉인 · 라운드 ${r}` : c.location}</span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </article>
            )}

            {tab === 'timeline' && (
              <article className="sheet tilt-r">
                <span className="kicker-type">TIMELINE · 시간 재구성</span>
                <h1>타임라인</h1>
                <p className="typed-meta">확인된 시각만 기록. 나머지는 증거로 채워 넣을 것.</p>
                <ol className="time-list">
                  {[
                    ...TIME_MARKERS.map((m) => ({ time: m.until ? `${m.time}~${m.until}` : m.time, label: m.label, card: m.card as CardId | null, sort: m.time })),
                    { time: '01:00', label: '이성철·강호연 운영자 임명 약속 (진술)', card: null, sort: '01:00' },
                    { time: '01:03', label: '이성철, 쪽방에서 강호연 발견', card: null, sort: '01:03' },
                  ]
                    .sort((a, b) => nightOrder(a.sort) - nightOrder(b.sort))
                    .map((t) => {
                      const known = !t.card || seen(t.card);
                      return (
                        <li key={t.time + t.label} className={known ? '' : 'unknown'}>
                          <span className="t">{known ? t.time : '██:██'}</span>
                          <span>{known ? t.label : <Redact w={10} />}</span>
                          {t.card && known && <button className="ev-link" onClick={() => openCard(t.card!)}>증거 {t.card}</button>}
                        </li>
                      );
                    })}
                </ol>
                <p className="hand-memo">00:10 ~ 00:40 사이, 누가 쪽방 근처에 있었나?</p>
              </article>
            )}

            {tab === 'rules' && (
              <article className="sheet tilt-l">
                <span className="kicker-type">PROCEDURE · 수사 지침</span>
                <h1>조사 규칙 <VoiceButton ids={['NAR-B04']} compact /></h1>
                <ol className="rule-list">{RULES.map((r) => <li key={r} className="typed">{r}</li>)}</ol>
                {state.mode === 'single' && (
                  <>
                    <h3>심문 요령 <VoiceButton ids={['NAR-B05']} compact /></h3>
                    <ol className="rule-list">{INTERRO_TIPS.map((r) => <li key={r} className="typed">{r}</li>)}</ol>
                  </>
                )}
                <p className="hand-memo">진술보다 물증. 한 장으로 안 되면 세 장을 같이.</p>
              </article>
            )}
          </div>
          <div className="cf-flicker" key={`f-${tab}`} />
        </section>

        <div className="cf-edge">
          {tabs.map((t, i) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => turn(t.id)} title={t.label}>{String(i + 1).padStart(2, '0')}</button>
          ))}
        </div>
      </div>

      {film !== null && (
        <FilmViewer
          shots={shots}
          index={film}
          onIndex={setFilm}
          onClose={() => setFilm(null)}
          cards={(zones) => CARDS.filter((c) => zones.includes(c.zone)).map((c) => ({ id: c.id, known: seen(c.id), title: CARD_BY_ID[c.id].title, round: c.round }))}
          onOpenCard={onOpenCard ? openCard : undefined}
          round={state.round}
        />
      )}
    </div>
  );
}
