// 캐릭터 블립 보이스 가이드 + 대사집 생성: npm run blip-script
// 대사는 게임 데이터(src/data)에서 그대로 뽑으므로, 대사를 고친 뒤 다시 실행하면 문서도 맞춰진다.
import { writeFileSync } from 'node:fs';
import { CHAR_BY_ID } from '../src/data/characters';
import { NPC_SCRIPTS, ROUND_OPENINGS, type NpcState } from '../src/data/npcScripts';
import type { CharId } from '../src/data/types';

interface Voice {
  code: string;
  mood: string;
  speech: string;
  blip: { wave: string; pitch: string; speed: string; variance: string; extra: string };
}

/** 캐릭터 설정집·FSM 명세서의 말투를 바탕으로 한 블립 설정 시작값 */
const VOICES: Record<CharId, Voice> = {
  seongcheol: {
    code: 'SEONGCHEOL',
    mood: '운영자 자리를 얻으려 로비까지 한 신흥 인물. 겉으로는 공손하고 성실하지만 늘 초조하다. 들킬수록 식은땀을 흘리며 말이 빨라지고 "제가 왜 죽이겠습니까?!"처럼 억울함을 앞세운다.',
    speech: '깍듯한 존댓말(~습니다). 해명이 길고, 궁지에 몰리면 문장이 길어지며 빨라진다.',
    blip: { wave: '삼각파 (부드럽고 둥근 소리)', pitch: '중저음 남성 (기준 낮음~중간)', speed: '보통 → 상태 1부터 조금씩 빨라짐', variance: '작음 (불안할 때만 살짝 흔들림)', extra: '문장 끝 "?!"에서 피치를 짧게 올리면 억울한 느낌' },
  },
  yeojin: {
    code: 'YEOJIN',
    mood: '말싸움과 협상에 능한 보고자. 당돌하고 머리 회전이 빠르며, 몰리면 오히려 목소리를 높여 반박한다. 친구(김아린)를 감싸려는 의리도 있다.',
    speech: '존댓말과 반말이 섞인 빠른 말투(~잖아요, ~거든요). 반문과 느낌표가 많다.',
    blip: { wave: '사각파 (밝고 또렷한 소리)', pitch: '중고음 여성', speed: '빠름', variance: '큼 (억양이 크게 오르내림)', extra: '느낌표 문장은 음량을 조금 키우고, 반문(~요?)은 끝을 올림' },
  },
  seonbin: {
    code: 'SEONBIN',
    mood: '다툼을 싫어하고 운영자 자리에 지쳐 있는 조용한 인물. 처음엔 여리고 차분하게 발뺌하지만, 증거에 몰릴수록 말끝이 떨리고 마지막에는 무너져 오열한다. (진범 — 스포일러 주의)',
    speech: '부드러운 존댓말(~어요). 말줄임표(...)가 많고, 감정이 터지면 문장이 끊긴다.',
    blip: { wave: '사인파 (가장 부드럽고 여린 소리)', pitch: '고음 여성, 작은 음량', speed: '느림', variance: '상태 0 작음 → 상태 2 큼 (떨림)', extra: '상태 2(자백)에서는 비브라토·불규칙한 멈춤을 넣어 흐느끼는 느낌. 말줄임표에서 길게 쉼' },
  },
  arin: {
    code: 'ARIN',
    mood: '감정 표현이 적은 관찰자. 사실만 짧게 말하고, 감시가 들킬까 봐 말을 아낀다. 결정적 사진을 내놓을 때도 담담하다.',
    speech: '건조한 존댓말(~습니다/~요). 문장이 짧고 감탄사가 거의 없다.',
    blip: { wave: '펄스파 + 약한 로우패스 (건조하고 납작한 소리)', pitch: '중음 여성', speed: '일정한 보통 속도', variance: '거의 없음 (단조로운 억양)', extra: '말줄임표에서만 짧게 멈추고, 감정 변화는 속도 대신 쉼으로 표현' },
  },
  jaegu: {
    code: 'JAEGU',
    mood: '강호연의 10년지기 친구이자 운영자. 책임감이 강하고 우정과 반감 사이에서 괴로워한다. 단호하고 진지하게 해명하며, 오해에는 감정을 실어 반박한다.',
    speech: '무게 있는 존댓말(~습니다). 문장이 단정하고, 강조할 때 힘이 들어간다.',
    blip: { wave: '삼각파 + 약한 사각파 (따뜻하지만 단단한 소리)', pitch: '저음 남성', speed: '보통보다 약간 느림', variance: '중간 (문장 끝에서 피치가 내려감)', extra: '"맞습니다!" 같은 단정에서 음량을 키우고, 문장 끝은 내려 무게감을 줌' },
  },
};

const ORDER: CharId[] = ['seongcheol', 'yeojin', 'seonbin', 'arin', 'jaegu'];
const STATE_NAME: Record<NpcState, string> = { 0: '상태 0 · 초기 방어', 1: '상태 1 · 1차 균열', 2: '상태 2 · 최종 해명/자백' };

const q = (t: string) => `> ${t}`;
const stateRange = (min?: number, max?: number) =>
  min === undefined && max === undefined ? '모든 상태' : min === max ? `상태 ${min}` : `상태 ${min ?? 0}~${max ?? 2}`;
const len = (t: string) => t.replace(/\([^)]*\)/g, '').replace(/\s/g, '').length;

const out: string[] = [];
out.push(`# 공작소의 밤 — 캐릭터 블립 보이스 가이드 & 대사집

인물 대사는 실제 목소리 대신 **BlipTalk Studio 전자음(블립)**으로 표현합니다. 이 문서는 인물마다 **분위기와 블립 설정 시작값**을 정리하고, 게임에서 그 인물이 말하는 **모든 대사**를 ID와 함께 모았습니다.

- 대사는 게임 데이터(\`src/data/npcScripts.ts\`, \`src/data/characters.ts\`)에서 자동으로 뽑았습니다. 원문을 고친 뒤 \`npm run blip-script\`를 실행하면 이 문서도 새로 만들어집니다.
- **블립 설정은 시작값입니다.** 파형, 음높이, 속도, 흔들림은 BlipTalk Studio에서 들어 보며 조정하세요. 다섯 명이 서로 확실히 구분되도록 음높이(저음 ↔ 고음)와 파형(사인 · 삼각 · 사각 · 펄스)을 서로 다르게 잡았습니다.
- **괄호 속 지문**(예: "(입술을 떨며)")은 대사가 아니므로 블립 없이 처리하는 것을 권장합니다. 각 대사의 "글자 수"는 지문과 공백을 뺀 값으로, 블립 개수를 가늠할 때 씁니다.
- 나레이션은 실제 목소리로 녹음했으므로 여기 없습니다(\`docs/나레이션_대본.md\`). 피해자 강호연과 불참한 정재우는 대사가 없습니다.
- ⚠ 이선빈 항목에는 진범 스포일러가 들어 있습니다.

### 게임 연결 상태
- 싱글 플레이의 인물 대사(심문 반응, 라운드 토론 오프닝)는 한 글자씩 나타나며 블립이 울립니다. 지금 울리는 소리는 아래 시작값으로 **합성한 임시 블립**입니다(\`src/audio/blipProfiles.ts\`).
- BlipTalk Studio에서 만든 소리로 바꾸려면, 인물별로 **블립 한 번 분량의 짧은 파일**을 \`BLIP_이성철.wav\`, \`BLIP_남여진.wav\`처럼 이름을 붙여 원본 폴더에 넣고 \`python scripts/prepare_audio.py <폴더>\`를 실행하세요. 그 인물은 합성음 대신 그 파일을 쓰고, 글자마다 음높이만 조금씩 바꿔 재생합니다.
- 대사를 통째로 렌더링한 파일을 쓰는 방식은 아직 연결되어 있지 않습니다. 그렇게 만들 경우 아래 대사 ID(예: \`SEONBIN-RE01\`)를 파일 이름으로 보내 주시면 연결할 수 있습니다.
- 설정에서 블립 켜기/끄기와 대사 표시 속도(느리게·보통·빠르게·즉시)를 바꿀 수 있습니다. 타이핑 중인 대사를 누르면 끝까지 바로 보여 줍니다.

## 한눈에 보기

| 인물 | 성향 | 파형 | 음높이 | 속도 | 흔들림 |
|---|---|---|---|---|---|
${ORDER.map((id) => { const c = CHAR_BY_ID[id]; const v = VOICES[id].blip; return `| ${c.name} | ${c.mbti} · ${c.tagline} | ${v.wave.split(' (')[0]} | ${v.pitch} | ${v.speed} | ${v.variance} |`; }).join('\n')}
`);

for (const id of ORDER) {
  const c = CHAR_BY_ID[id];
  const v = VOICES[id];
  const s = NPC_SCRIPTS[id];
  out.push(`\n---\n\n## ${c.name} (${c.mbti} · ${c.gender} · 21세)\n`);
  out.push(`**분위기** — ${v.mood}\n`);
  out.push(`**말투** — ${v.speech}\n`);
  out.push(`| 블립 설정 | 시작값 |\n|---|---|\n| 파형 | ${v.blip.wave} |\n| 음높이 | ${v.blip.pitch} |\n| 속도 | ${v.blip.speed} |\n| 흔들림 | ${v.blip.variance} |\n| 연출 | ${v.blip.extra} |\n`);

  out.push(`### 1. 첫 발언 (기밀 서류철 · 온라인 역할극 참고용)\n`);
  out.push(`**${v.code}-FIRST** · 글자 수 ${len(c.firstLine)}\n${q(c.firstLine.replace(/^“|”$/g, ''))}\n`);

  const openings = ([1, 2, 3] as const).flatMap((r) => ROUND_OPENINGS[r].lines.filter((l) => l.char === id).map((l) => ({ r, text: l.text })));
  if (openings.length) {
    out.push(`### 2. 라운드 토론 오프닝 (싱글 · 토론 단계 시작 시)\n`);
    for (const o of openings) out.push(`**${v.code}-OP${o.r}** · 라운드 ${o.r} · 글자 수 ${len(o.text)}\n${q(o.text)}\n`);
  }

  out.push(`### 3. 심문실 기본 입장 (증거를 제시하기 전 화면에 보이는 대사)\n`);
  for (const st of [0, 1, 2] as NpcState[]) {
    out.push(`**${v.code}-ST${st}** · ${STATE_NAME[st]} — 「${s.states[st].label}」 · 글자 수 ${len(s.states[st].line)}\n${q(s.states[st].line)}\n`);
  }

  out.push(`### 4. 증거 제시 반응\n`);
  // 같은 대사를 쓰는 반응(예: 수사 교란)은 하나로 묶는다
  const groups: { text: string; tone: string; triggers: string[] }[] = [];
  for (const r of s.reactions) {
    const trig = `증거 ${r.cards.join('+')} · ${stateRange(r.minState, r.maxState)}${r.next !== undefined ? ` → 상태 ${r.next}` : ''}${r.solved ? ' · **사건 해결**' : ''}`;
    const g = groups.find((x) => x.text === r.text);
    if (g) g.triggers.push(trig);
    else groups.push({ text: r.text, tone: r.tone, triggers: [trig] });
  }
  groups.forEach((g, i) => {
    const n = String(i + 1).padStart(2, '0');
    out.push(`**${v.code}-RE${n}** · 톤: ${g.tone} · 글자 수 ${len(g.text)}\n- 조건: ${g.triggers.join(' / ')}\n${q(g.text)}\n`);
  });

  out.push(`### 5. 관계없는 증거를 제시했을 때\n`);
  out.push(`**${v.code}-NONE** · 글자 수 ${len(s.fallback)}\n${q(s.fallback)}\n`);
}

const total = ORDER.reduce((n, id) => {
  const s = NPC_SCRIPTS[id];
  return n + 1 + 3 + 1 + new Set(s.reactions.map((r) => r.text)).size + ([1, 2, 3] as const).reduce((k, r) => k + ROUND_OPENINGS[r].lines.filter((l) => l.char === id).length, 0);
}, 0);
out.push(`\n---\n\n총 ${total}개 대사 (첫 발언 5 · 기본 입장 15 · 반응·오프닝·무반응 포함).\n`);

writeFileSync(new URL('../docs/캐릭터_블립_보이스_가이드.md', import.meta.url), out.join('\n'), 'utf-8');
console.log('docs/캐릭터_블립_보이스_가이드.md 생성:', total, '개 대사');
