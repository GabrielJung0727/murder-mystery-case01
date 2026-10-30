import { Lock } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { ACHIEVEMENTS } from '../data/achievements';
import { getCase } from '../data/caseData';
import { VARIANT_IDS, type VariantId } from '../data/variants';
import { audio, type VoiceId } from '../audio/director';
import { VoiceButton } from './VolumeControl';
import { progress } from '../client/progress';
import { EVIDENCE_PHOTO, ZONE_ART } from '../data/art';
import { CARD_BY_ID, CARDS } from '../data/cards';
import { CHARACTERS } from '../data/characters';
import { PHONE } from '../data/phone';
import { AFTERWORD, ENDINGS, ROUND_INFO, TRUTH_SUMMARY, TRUTH_TIMELINE, type EndingId } from '../data/story';
import type { CardId } from '../data/types';
import { VERDICT } from './Ending';
import { GalleryThumb, SCENES } from './Illustrations';
import { Folder, GameIcon, Modal, Polaroid, Stamp } from './bits';

const ENDING_IDS: EndingId[] = ['A', 'B', 'C', 'D'];
/** 미도달 엔딩의 조건 힌트 (범인을 드러내지 않는 선에서) */
const ENDING_HINT: Record<EndingId, string> = {
  A: '과반이 같은 진실을 가리켰을 때',
  B: '진실을 짚었지만 과반을 설득하지 못했을 때',
  C: '다른 사람을 범인으로 몰았을 때',
  D: '최다 득표가 갈렸을 때',
};
const tilt = (id: string) => ((Number(id) * 37) % 7) - 3;

function CardDetail({ id, notes, onBack }: { id: CardId; notes: boolean; onBack: () => void }) {
  const c = CARD_BY_ID[id];
  const scene = SCENES[id];
  const phone = PHONE[id];
  return (
    <div className="col" style={{ gap: 12 }}>
      <button className="btn sm ghost" style={{ alignSelf: 'flex-start' }} onClick={onBack}>← 카드 목록</button>
      <div className="gallery-detail">
        <div className="gallery-art">
          {scene
            ? <img src={scene.src} alt={c.title} style={{ display: 'block', width: '100%' }} />
            : phone?.app === 'gallery' ? <GalleryThumb scene={phone.scene} />
            : <img src={EVIDENCE_PHOTO[id] ?? ZONE_ART[c.zone]} alt={c.location} style={{ display: 'block', width: '100%' }} />}
        </div>
        <div className="card-sheet grow">
          <div className="meta">증거 {c.id} / ROUND {c.round} / {c.location}</div>
          <h3>{c.title}</h3>
          <p>{c.text}</p>
          {c.inspectTag && <p style={{ marginTop: 10, color: '#2f7a4c', fontWeight: 700 }}><GameIcon name="magnifier" /> {c.inspectTag}</p>}
        </div>
      </div>
      <div className="paper">
        <h4>진행자 해설</h4>
        {notes ? <p className="first-line" style={{ color: '#8b1f24' }}>{c.note}</p>
          : <p className="muted">엔딩을 한 번 보면 이 증거의 진짜 의미가 열립니다.</p>}
      </div>
    </div>
  );
}

export function Gallery({ onClose }: { onClose: () => void }) {
  const p = useSyncExternalStore(progress.subscribe, progress.get);
  const [tab, setTab] = useState<'cards' | 'endings' | 'truth' | 'records'>('cards');
  const [card, setCard] = useState<CardId | null>(null);
  const [ending, setEnding] = useState<EndingId | null>(null);
  const opened = p.endings.length > 0;
  useEffect(() => () => audio.stopNarration(), []);

  return (
    <Modal onClose={onClose} wide tab="GALLERY · 갤러리 & 다시보기">
      <div className="modal-head">
        <h2>갤러리 & 다시보기</h2>
        <div className="tabs">
          <button className={tab === 'cards' ? 'on' : ''} onClick={() => { setTab('cards'); setCard(null); }}>증거 카드 {p.cards.length}/35</button>
          <button className={tab === 'endings' ? 'on' : ''} onClick={() => { setTab('endings'); setEnding(null); }}>엔딩 {p.endings.length}/4</button>
          <button className={tab === 'truth' ? 'on' : ''} onClick={() => setTab('truth')}>사건의 진상</button>
          <button className={tab === 'records' ? 'on' : ''} onClick={() => setTab('records')}>
            기록·도전 과제 {Object.keys(p.achievements).length}/{ACHIEVEMENTS.length}
          </button>
        </div>
        <span className="grow" />
        <button className="btn sm ghost" onClick={onClose}>닫기 <GameIcon name="close" /></button>
      </div>

      {tab === 'records' && <Records p={p} />}

      {tab === 'cards' && (card
        ? <CardDetail id={card} notes={opened} onBack={() => setCard(null)} />
        : (
          <div className="col" style={{ gap: 18 }}>
            {p.cards.length === 0 && <p className="desk-note">— 아직 확보한 증거가 없습니다. 사건 현장을 조사하면 이곳에 기록됩니다.</p>}
            {([1, 2, 3] as const).map((r) => {
              const list = CARDS.filter((c) => c.round === r);
              const got = list.filter((c) => p.cards.includes(c.id)).length;
              return (
                <section key={r}>
                  <div className="kicker-type" style={{ marginBottom: 10 }}>ROUND {r} · {ROUND_INFO[r].area} · {got}/{list.length}</div>
                  <div className="gallery-grid">
                    {list.map((c) => p.cards.includes(c.id) ? (
                      <button key={c.id} className="g-card" style={{ transform: `rotate(${tilt(c.id) * 0.6}deg)` }} onClick={() => setCard(c.id)}>
                        <span className="pushpin" />
                        <span className="num">증거 {c.id} · {c.location}</span>
                        <b>{c.title}</b>
                      </button>
                    ) : (
                      <div key={c.id} className="g-card sealed" title="아직 확보하지 못한 증거">
                        <Lock size={14} />
                        <span className="num">증거 {c.id}</span>
                        <span>{c.location}</span>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ))}

      {tab === 'endings' && (ending
        ? (
          <div className="col" style={{ gap: 12 }}>
            <button className="btn sm ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setEnding(null)}>← 엔딩 목록</button>
            <div className="verdict-head">
              <h2 className="grow" style={{ fontFamily: 'var(--serif)', fontSize: 34, color: '#efe6d6' }}>ENDING {ending} · {ENDINGS[ending].title}</h2>
              <Stamp tone={VERDICT[ending].tone} tilt={-8}><span className="verdict-stamp-text" style={{ fontSize: 24 }}>{VERDICT[ending].text}</span></Stamp>
            </div>
            <div className="paper"><p style={{ fontFamily: 'var(--serif)', fontSize: 17, lineHeight: 2 }}>{ENDINGS[ending].text}</p><VoiceButton ids={[`NAR-E-${ending}` as VoiceId]} label="엔딩 듣기" /></div>
          </div>
        )
        : (
          <div className="folder-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {ENDING_IDS.map((id, i) => p.endings.includes(id) ? (
              <Folder key={id} tab={`ENDING ${id}`} title={ENDINGS[id].title} tilt={i % 2 ? 1 : -1} compact stamp={VERDICT[id].text} selected onClick={() => setEnding(id)}>
                <p>{ENDING_HINT[id]}</p>
                <span className="no">다시보기 →</span>
              </Folder>
            ) : (
              <Folder key={id} tab={`ENDING ${id}`} title={<><Lock size={18} /> 봉인된 결말</>} tilt={i % 2 ? 1 : -1} compact locked>
                <p>{ENDING_HINT[id]}</p>
                <div className="seal"><span>미도달</span></div>
              </Folder>
            ))}
          </div>
        ))}

      {tab === 'truth' && (opened ? (
        <div className="col" style={{ gap: 14 }}>
          <div className="paper"><h4>진상 <VoiceButton ids={['NAR-T01', 'NAR-T02']} compact /></h4><p style={{ fontFamily: 'var(--serif)', fontSize: 16, lineHeight: 1.9 }}>{TRUTH_SUMMARY}</p></div>
          <div className="paper">
            <h4>실제 시간표</h4>
            {TRUTH_TIMELINE.map((t) => (
              <div key={t.time} className="truth-row"><span className="mono" style={{ color: '#8b1f24', fontWeight: 700 }}>{t.time}</span><span>{t.event}</span><span className="muted mono">증거 {t.cards}</span></div>
            ))}
          </div>
          <div className="archive-cards">
            {CHARACTERS.map((c) => (
              <div key={c.id} className="archive-card">
                <div className="row"><Polaroid char={c.id} tilt={-3} /><b style={{ fontSize: 18 }}>{c.name}</b></div>
                <p>{c.secret}</p>
              </div>
            ))}
          </div>
          <div className="paper"><h4>후일담 <VoiceButton ids={['NAR-T02']} compact /></h4><p style={{ fontFamily: 'var(--serif)', lineHeight: 1.9 }}>{AFTERWORD}</p></div>
        </div>
      ) : (
        <div className="paper" style={{ textAlign: 'center', padding: 40 }}>
          <Stamp tilt={-8}>SEALED</Stamp>
          <p className="first-line" style={{ marginTop: 16 }}>— 사건의 진상은 엔딩을 한 번 본 뒤에 열람할 수 있습니다.</p>
        </div>
      ))}
    </Modal>
  );
}

/** 사건 기록(진범 변형)별 해결 여부·최고 랭크와 도전 과제 */
function Records({ p }: { p: ReturnType<typeof progress.get> }) {
  const [open, setOpen] = useState<VariantId | null>(null);
  return (
    <div className="col" style={{ gap: 18 }}>
      <section>
        <div className="kicker-type" style={{ marginBottom: 10 }}>사건 기록 · {p.solvedCases.length}/{VARIANT_IDS.length} 해결</div>
        <div className="folder-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {VARIANT_IDS.map((v, i) => {
            const data = getCase(v);
            const solved = p.solvedCases.includes(v);
            return (
              <Folder key={v} tab={data.variant.code} title={solved ? `「${data.variant.title}」` : '「 ??? 」'} tilt={i % 2 ? 1 : -1}
                compact selected={open === v} stamp={solved ? `해결 · ${p.best[v] ?? '-'}` : undefined} onClick={() => solved && setOpen(open === v ? null : v)}>
                <p className="fine" style={{ fontSize: 12 }}>
                  {solved ? '진범을 밝혀낸 사건. 눌러서 진상을 다시 봅니다.' : v === 'v0' ? '원작 사건. 진범을 지목하면 열립니다.' : '변형 사건. 진범을 지목하면 부제와 진상이 열립니다.'}
                </p>
                {!solved && p.best[v] && <span className="no">최고 랭크 {p.best[v]}</span>}
              </Folder>
            );
          })}
        </div>
        {open && (
          <div className="paper" style={{ marginTop: 14 }}>
            <h4>{getCase(open).variant.code} 「{getCase(open).variant.title}」 · 진상</h4>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 16, lineHeight: 1.9 }}>{getCase(open).truthSummary}</p>
          </div>
        )}
      </section>
      <section>
        <div className="kicker-type" style={{ marginBottom: 10 }}>도전 과제 · {Object.keys(p.achievements).length}/{ACHIEVEMENTS.length}</div>
        <div className="achv-grid">
          {ACHIEVEMENTS.map((a) => {
            const at = p.achievements[a.id];
            return (
              <div key={a.id} className={`achv-card ${at ? 'got' : ''}`}>
                <b>{at ? a.title : '???'}</b>
                <span>{a.desc}</span>
                {at && <span className="when">{new Date(at).toLocaleDateString('ko-KR')}</span>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
