// Adaptive Music Director (기획서 7장): 음악 상태 전환, 루프 크로스페이드, 긴장도 믹서, 버스 분리
import manifest from './manifest.json';
import type { CharId } from '../data/types';
import { BLIP_PROFILES } from './blipProfiles';
import type { Scene } from './rules';

type TrackId = keyof typeof manifest.music;
type SfxKind = keyof typeof manifest.sfx;
export type VoiceId = keyof typeof manifest.voice;
/** 녹음 파일이 실제로 들어 있는 나레이션인가 (변형 사건 녹음은 나중에 추가된다) */
export const hasVoice = (id: string): id is VoiceId => id in manifest.voice;

const VOICE_GAP = 0.6; // 연속 나레이션 사이 간격 (초)
const VOICE_DUCK_MUSIC = 0.35; // 나레이션 중 음악 음량 배율
const VOICE_DUCK_AMB = 0.6; // 나레이션 중 빗소리·시계 음량 배율

const SCENE_TRACK: Partial<Record<Scene, TrackId>> = {
  menu: 'ost01_menu',
  explore: 'ost02_explore',
  investigate: 'ost03_investigate',
  interrogate: 'ost04_interrogate',
  accusation: 'ost06_accusation',
  ending: 'ost07_ending',
};

const LOOP_XFADE = 4; // 곡 끝 → 루프 시작 크로스페이드 (초)
const TARGET_RMS = -19; // 곡 간 음량 맞춤 기준 (dBFS)

export interface Volumes { master: number; music: number; ambience: number; sfx: number; voice: number; narration: boolean; blips: boolean; muted: boolean }
const DEFAULT_VOLUMES: Volumes = { master: 0.85, music: 0.85, ambience: 0.6, sfx: 0.8, voice: 1, narration: true, blips: true, muted: false };
const STORE_KEY = 'gongjakso.volumes';

/** 루프 크로스페이드와 음량 맞춤에 필요한 곡 정보 */
interface DeckMeta { id: string; loopStart: number; loopEnd: number; rmsDb: number }
interface Deck { track: string; gain: GainNode; source: AudioBufferSourceNode; timer?: ReturnType<typeof setTimeout> }

/** 다른 에피소드가 자기 manifest 에서 넘기는 곡 */
export interface MusicTrack extends DeckMeta { src: string; title: string; titleEn: string; loop: boolean }
/** 다른 에피소드가 넘기는 대사 한 줄 (id 는 지금 읽는 줄 표시용) */
export interface Line { id: string; src: string }

export interface NowPlaying { title: string; titleEn: string; scene: Scene | null; voice: string | null }

function loadVolumes(): Volumes {
  try {
    return { ...DEFAULT_VOLUMES, ...JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') };
  } catch {
    return DEFAULT_VOLUMES;
  }
}

/** file:// 에서도 동작하도록 fetch 실패 시 XHR로 다시 읽는다 */
function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  return fetch(url).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.arrayBuffer();
  }).catch(() => new Promise<ArrayBuffer>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = 'arraybuffer';
    xhr.onload = () => (xhr.response ? resolve(xhr.response) : reject(new Error('empty')));
    xhr.onerror = () => reject(new Error(`load failed: ${url}`));
    xhr.send();
  }));
}

export class AudioDirector {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private analyser!: AnalyserNode;
  private musicBus!: GainNode;
  private musicDuck!: GainNode;
  private musicFilter!: BiquadFilterNode;
  private ambBus!: GainNode;
  private sfxBus!: GainNode;
  private voiceBus!: GainNode;
  private voiceDuck!: GainNode;
  private ambDuck!: GainNode;
  private voiceSrc: AudioBufferSourceNode | null = null;
  private voiceToken = 0;
  private blipCount = 0;
  private rain?: { source: AudioBufferSourceNode; gain: GainNode };
  private clock?: { source: AudioBufferSourceNode; gain: GainNode };
  private bed?: { src: string; source: AudioBufferSourceNode; gain: GainNode };
  /** 다른 에피소드의 곡을 트는 중: 긴장도 필터를 쓰지 않는다 */
  private flat = false;
  private bedSrc: string | null = null;
  private bedLevel = 0;
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private deck: Deck | null = null;
  private scene: Scene | null = null;
  private sceneToken = 0;
  private rainLevel = 0;
  private clockLevel = 0;
  private baseTension = 10;
  private tension = 10;
  private tensionTimer?: ReturnType<typeof setTimeout>;
  private lastShot: Partial<Record<SfxKind, number>> = {};
  private listeners = new Set<() => void>();
  private now: NowPlaying = { title: '', titleEn: '', scene: null, voice: null };
  volumes: Volumes = loadVolumes();

  /** 첫 사용자 입력 시 호출 (브라우저 자동재생 정책) */
  unlock(): void {
    const ctx = this.ensure();
    if (ctx.state === 'suspended') void ctx.resume();
  }

  private ensure(): AudioContext {
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext({ latencyHint: 'playback' });
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.master.connect(this.analyser);
    this.musicFilter = ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.Q.value = 0.5;
    this.musicDuck = ctx.createGain();
    this.voiceDuck = ctx.createGain();
    this.musicBus = ctx.createGain();
    this.musicFilter.connect(this.musicDuck).connect(this.voiceDuck).connect(this.musicBus).connect(this.master);
    this.ambBus = ctx.createGain();
    this.ambDuck = ctx.createGain();
    this.ambBus.connect(this.ambDuck).connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.connect(this.master);
    this.voiceBus = ctx.createGain();
    this.voiceBus.connect(this.master);
    this.applyVolumes(0);
    this.applyTension(0);
    return ctx;
  }

  private load(url: string): Promise<AudioBuffer> {
    let p = this.buffers.get(url);
    if (!p) {
      const ctx = this.ensure();
      p = fetchArrayBuffer(url).then((ab) => ctx.decodeAudioData(ab));
      p.catch(() => this.buffers.delete(url));
      this.buffers.set(url, p);
    }
    return p;
  }

  /** 다음 장면 음원을 미리 디코딩해 전환 지연을 줄인다 */
  preload(scenes: Scene[]): void {
    for (const s of scenes) {
      const t = SCENE_TRACK[s];
      if (t) void this.load(manifest.music[t].src);
    }
  }

  // ---------------------------------------------------------------- 볼륨
  setVolumes(v: Partial<Volumes>): void {
    this.volumes = { ...this.volumes, ...v };
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(this.volumes));
    } catch {
      /* 저장 불가 시 이번 실행에만 적용 */
    }
    if (this.ctx) this.applyVolumes(0.15);
    this.emit();
  }

  private applyVolumes(seconds: number): void {
    const v = this.volumes;
    const t = this.ctx!.currentTime;
    const set = (g: GainNode, val: number) => g.gain.setTargetAtTime(val, t, Math.max(0.01, seconds / 3));
    set(this.master, v.muted ? 0 : v.master);
    set(this.musicBus, v.music);
    set(this.ambBus, v.ambience);
    set(this.sfxBus, v.sfx);
    set(this.voiceBus, v.voice);
  }

  // ---------------------------------------------------------------- 음악 상태
  setScene(scene: Scene, opts: { fade?: number; variant?: 'truth' | 'false' } = {}): void {
    if (scene === this.scene && scene !== 'ending') return;
    const ctx = this.ensure();
    this.scene = scene;
    this.flat = false;
    const token = ++this.sceneToken;
    const fade = opts.fade ?? 4;

    if (scene === 'silence') {
      // 기획서 5장: 범인 확정 순간 모든 소리를 0.15초 만에 끊는다
      this.fadeOutDeck(0.15);
      this.setAmbience(0, 0, 0.15);
      this.setNow(null);
      return;
    }
    const track = SCENE_TRACK[scene]!;
    const meta = { id: track, ...manifest.music[track] };
    if (this.deck?.track === track && scene !== 'ending') {
      this.setNow(meta);
      return;
    }
    void this.load(manifest.music[track].src).then((buffer) => {
      if (token !== this.sceneToken) return;
      this.fadeOutDeck(fade);
      const ending = scene === 'ending';
      const falseEnd = ending && opts.variant === 'false';
      this.startDeck(meta, buffer, {
        fade: ending ? 2.5 : fade,
        offset: manifest.music[track].loopStart,
        loop: !ending,
        // 오답 엔딩: 반음 가까이 낮고 느리게, 고역을 깎아 탁하게
        rate: falseEnd ? 0.94 : 1,
      });
      if (ending) this.musicFilter.frequency.setTargetAtTime(falseEnd ? 2400 : 20000, ctx.currentTime, 0.5);
      this.setNow(meta);
    }).catch(() => {
      /* 음원 로드 실패 시 무음으로 진행 */
    });
  }

  /**
   * 다른 에피소드의 곡을 튼다 (null 이면 음악을 끈다). 1막 장면 음악과 같은 버스와 볼륨을 쓰고,
   * 루프 곡은 1막처럼 루프 구간을 크로스페이드로 잇는다.
   */
  playTrack(t: MusicTrack | null, fade = 3): void {
    const ctx = this.ensure();
    this.scene = null;
    this.flat = true;
    const token = ++this.sceneToken;
    this.musicFilter.frequency.setTargetAtTime(20000, ctx.currentTime, 0.3);
    if (!t) {
      this.fadeOutDeck(fade);
      this.setNow(null);
      return;
    }
    if (this.deck?.track === t.id) return;
    void this.load(t.src).then((buffer) => {
      if (token !== this.sceneToken) return;
      this.fadeOutDeck(fade);
      this.startDeck(t, buffer, { fade, offset: t.loop ? t.loopStart : 0, loop: t.loop, rate: 1 });
      this.setNow(t);
    }).catch(() => {
      /* 음원 로드 실패 시 무음으로 진행 */
    });
  }

  private startDeck(meta: DeckMeta, buffer: AudioBuffer, o: { fade: number; offset: number; loop: boolean; rate: number }): void {
    const ctx = this.ctx!;
    const track = meta.id;
    const gain = ctx.createGain();
    const level = Math.min(2, Math.pow(10, (TARGET_RMS - meta.rmsDb) / 20));
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(level, ctx.currentTime + o.fade);
    gain.connect(this.musicFilter);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = o.rate;
    source.connect(gain);
    source.start(ctx.currentTime, o.offset);
    const deck: Deck = { track, gain, source };
    if (o.loop) {
      // 루프 끝에 다다르기 전에 새 덱을 루프 시작점에서 띄워 크로스페이드한다
      const playable = (meta.loopEnd - o.offset) / o.rate - LOOP_XFADE;
      deck.timer = setTimeout(() => {
        if (this.deck !== deck) return;
        this.fadeOutDeck(LOOP_XFADE);
        this.startDeck(meta, buffer, { ...o, fade: LOOP_XFADE, offset: meta.loopStart });
      }, Math.max(5, playable) * 1000);
    }
    this.deck = deck;
  }

  private fadeOutDeck(seconds: number): void {
    const d = this.deck;
    if (!d || !this.ctx) return;
    clearTimeout(d.timer);
    const t = this.ctx.currentTime;
    d.gain.gain.cancelScheduledValues(t);
    d.gain.gain.setValueAtTime(d.gain.gain.value, t);
    d.gain.gain.linearRampToValueAtTime(0, t + seconds);
    d.source.stop(t + seconds + 0.05);
    this.deck = null;
  }

  // ---------------------------------------------------------------- 환경음
  setAmbience(rain: number, clock: number, seconds = 3): void {
    this.rainLevel = rain;
    this.clockLevel = clock;
    this.ensure();
    this.applyAmbience(seconds);
    if (rain > 0) void this.ensureLoop('rain', manifest.rain.src).then(() => this.applyAmbience(seconds)).catch(() => undefined);
    if (clock > 0) void this.ensureLoop('clock', manifest.clock.src).then(() => this.applyAmbience(seconds)).catch(() => undefined);
  }

  /** 다른 에피소드의 환경음 루프 (null 이면 끈다). 1막 빗소리·시계와 같은 환경음 버스를 쓴다 */
  setBed(src: string | null, level = 1, seconds = 3): void {
    const ctx = this.ensure();
    const tc = Math.max(0.01, seconds / 3);
    if (this.bed && this.bed.src !== src) {
      const old = this.bed;
      this.bed = undefined;
      old.gain.gain.setTargetAtTime(0, ctx.currentTime, tc);
      old.source.stop(ctx.currentTime + seconds + 0.1);
    }
    this.bedSrc = src;
    this.bedLevel = level;
    if (!src) return;
    if (this.bed) {
      this.bed.gain.gain.setTargetAtTime(level, ctx.currentTime, tc);
      return;
    }
    void this.load(src).then((buffer) => {
      // 불러오는 동안 다른 루프로 바뀌었거나 꺼졌으면 틀지 않는다
      if (this.bed || this.bedSrc !== src) return;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.gain.setTargetAtTime(this.bedLevel, ctx.currentTime, tc);
      gain.connect(this.ambBus);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);
      source.start();
      this.bed = { src, source, gain };
    }).catch(() => undefined);
  }

  /** 엔딩: 비가 서서히 그친다 */
  rainFadeOut(seconds: number): void {
    this.rainLevel = 0;
    if (this.rain && this.ctx) this.rain.gain.gain.setTargetAtTime(0, this.ctx.currentTime, seconds / 4);
  }

  private async ensureLoop(kind: 'rain' | 'clock', url: string): Promise<void> {
    if (this[kind]) return;
    const buffer = await this.load(url);
    if (this[kind]) return;
    const ctx = this.ctx!;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.ambBus);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    source.start();
    this[kind] = { source, gain };
  }

  private applyAmbience(seconds: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const tc = Math.max(0.01, seconds / 3);
    // 긴장도가 오를수록 시계 초침의 존재감이 커진다
    const clockBoost = 0.7 + (this.tension / 100) * 0.9;
    this.rain?.gain.gain.setTargetAtTime(this.rainLevel * 0.9, t, tc);
    this.clock?.gain.gain.setTargetAtTime(this.clockLevel * clockBoost, t, tc);
  }

  // ---------------------------------------------------------------- 긴장도
  /** 장면 기준 긴장도. 이벤트 스파이크 후 이 값으로 돌아온다 */
  setBaseTension(v: number): void {
    this.baseTension = v;
    if (!this.tensionTimer) this.rampTension(v, 3);
  }

  /** 균열(OST-05 대체): 긴장도를 끌어올렸다가 hold 초 뒤 기준값으로 천천히 복귀 */
  spike(v: number, hold = 18): void {
    if (v <= this.tension && this.tensionTimer) return;
    this.rampTension(Math.max(v, this.tension), 1.5);
    clearTimeout(this.tensionTimer);
    this.tensionTimer = setTimeout(() => {
      this.tensionTimer = undefined;
      this.rampTension(this.baseTension, 10);
    }, hold * 1000);
  }

  private rampTension(v: number, seconds: number): void {
    this.tension = v;
    this.applyTension(seconds);
  }

  private applyTension(seconds: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // 평온할수록 음악이 멀고 먹먹하게, 긴장할수록 가까이 선명하게
    const cutoff = this.flat ? 20000 : 1800 * Math.pow(20000 / 1800, Math.min(1, this.tension / 70));
    if (this.scene !== 'ending') this.musicFilter.frequency.setTargetAtTime(cutoff, t, Math.max(0.01, seconds / 3));
    this.applyAmbience(seconds);
  }

  // ---------------------------------------------------------------- 효과음
  sfx(kind: SfxKind, gain = 1): void {
    const list = manifest.sfx[kind];
    if (!list.length) return;
    let i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === this.lastShot[kind]) i = (i + 1) % list.length;
    this.lastShot[kind] = i;
    const shot = list[i];
    this.oneShot(shot.src, gain, kind === 'paper' ? 0 : shot.duration);
  }

  /** 효과음 한 번. duckSeconds 를 주면 그동안 음악을 잠깐 낮춘다 */
  oneShot(url: string, gain = 1, duckSeconds = 0): void {
    this.ensure();
    void this.load(url).then((buffer) => {
      const ctx = this.ctx!;
      const g = ctx.createGain();
      g.gain.value = gain;
      g.connect(this.sfxBus);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(g);
      src.start();
      if (duckSeconds > 0) this.duck(0.55, duckSeconds);
    }).catch(() => undefined);
  }

  /** 스팅이 울리는 동안 음악을 잠깐 낮춘다 */
  private duck(level: number, seconds: number): void {
    const t = this.ctx!.currentTime;
    const g = this.musicDuck.gain;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(level, t, 0.08);
    g.setTargetAtTime(1, t + Math.min(seconds, 3), 0.6);
  }

  // ---------------------------------------------------------------- 나레이션
  /**
   * 나레이션을 순서대로 읽는다. 새 요청은 읽던 나레이션을 끊고 대신한다.
   * 읽는 동안 음악과 환경음을 낮춘다 (사이드체인 더킹).
   */
  narrate(ids: VoiceId | VoiceId[], delay = 0): void {
    const lines = (Array.isArray(ids) ? ids : [ids]).filter(hasVoice).map((id) => ({ id, src: manifest.voice[id].src }));
    this.speak(lines, delay);
  }

  /**
   * 다른 에피소드의 대사·나레이션을 narrate 와 같은 규칙으로 순서대로 읽는다.
   * onEnd 는 끝까지 읽었을 때 부른다 (나레이션이 꺼져 있거나 읽을 줄이 없으면 바로, 중간에 끊기면 부르지 않는다).
   */
  speak(queue: Line[], delay = 0, onEnd?: () => void): void {
    this.stopNarration();
    if (!this.volumes.narration || queue.length === 0) {
      onEnd?.();
      return;
    }
    const token = ++this.voiceToken;
    // 음원을 불러오는 동안에도 '읽는 중'으로 표시해, 뒤따르는 인물 대사가 끝까지 기다리게 한다
    this.setVoice(queue[0].id);
    const playNext = (i: number, wait: number) => {
      if (token !== this.voiceToken) return;
      if (i >= queue.length) {
        this.endVoice();
        onEnd?.();
        return;
      }
      const { id, src: url } = queue[i];
      void this.load(url).then((buffer) => {
        if (token !== this.voiceToken) return;
        const ctx = this.ctx!;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(this.voiceBus);
        this.duckForVoice(true);
        src.start(ctx.currentTime + wait);
        src.onended = () => {
          if (this.voiceSrc === src) this.voiceSrc = null;
          playNext(i + 1, VOICE_GAP);
        };
        this.voiceSrc = src;
        this.setVoice(id);
      }).catch(() => playNext(i + 1, 0));
    };
    playNext(0, delay);
  }

  /** prefix를 주면 그 ID로 시작하는 나레이션을 읽는 중일 때만 멈춘다 */
  stopNarration(prefix?: string): void {
    if (prefix && !(this.now.voice ?? '').startsWith(prefix)) return;
    this.voiceToken++;
    const src = this.voiceSrc;
    this.voiceSrc = null;
    if (src) {
      src.onended = null;
      try {
        src.stop();
      } catch {
        /* 아직 시작 전이면 무시 */
      }
    }
    this.endVoice();
  }

  private endVoice(): void {
    this.duckForVoice(false);
    if (this.now.voice) this.setVoice(null);
  }

  private duckForVoice(on: boolean): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.voiceDuck.gain.setTargetAtTime(on ? VOICE_DUCK_MUSIC : 1, t, on ? 0.15 : 0.6);
    this.ambDuck.gain.setTargetAtTime(on ? VOICE_DUCK_AMB : 1, t, on ? 0.15 : 0.6);
  }

  private setVoice(id: string | null): void {
    this.now = { ...this.now, voice: id };
    this.emit();
  }

  // ---------------------------------------------------------------- 캐릭터 블립
  /**
   * 대사 한 글자분의 블립. BlipTalk Studio 샘플(manifest.blip)이 있으면 그 소리를,
   * 없으면 캐릭터 음색 설정으로 합성한 소리를 낸다.
   * semitones: 음높이 이동, tremble: 떨림(비브라토)
   */
  blip(char: CharId, semitones = 0, tremble = false): void {
    // 블립 때문에 오디오를 새로 깨우지는 않는다 (메뉴 음악과 함께 이미 켜져 있다)
    const ctx = this.ctx;
    if (!this.volumes.blips || !ctx || ctx.state !== 'running') return;
    this.blipCount++;
    const p = BLIP_PROFILES[char];
    const t = ctx.currentTime;
    const ratio = Math.pow(2, semitones / 12);
    const sample = (manifest.blip as Partial<Record<CharId, { src: string }>>)[char];
    if (sample) {
      void this.load(sample.src).then((buffer) => {
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.playbackRate.value = ratio;
        src.connect(this.voiceBus);
        src.start();
      }).catch(() => undefined);
      return;
    }
    const osc = ctx.createOscillator();
    osc.type = p.wave;
    osc.frequency.setValueAtTime(p.base * ratio, t);
    if (tremble) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = 9;
      depth.gain.value = p.base * ratio * 0.05;
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + 0.09);
    }
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = p.lowpass;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(p.gain * 0.35, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
    osc.connect(filter).connect(env).connect(this.voiceBus);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  /** 진단용: 실제 출력 레벨과 현재 믹스 상태 */
  debug() {
    let outDb = -Infinity;
    if (this.analyser) {
      const buf = new Float32Array(this.analyser.fftSize);
      this.analyser.getFloatTimeDomainData(buf);
      const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
      outDb = Math.round(20 * Math.log10(rms + 1e-9) * 10) / 10;
    }
    return {
      ctx: this.ctx?.state ?? 'none', scene: this.scene, track: this.deck?.track ?? null,
      rate: this.deck?.source.playbackRate.value ?? null, filterHz: Math.round(this.musicFilter?.frequency.value ?? 0),
      rain: this.rainLevel, clock: this.clockLevel, tension: this.tension, voice: this.now.voice, blips: this.blipCount, outDb,
    };
  }

  // ---------------------------------------------------------------- 표시용 구독
  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getNowPlaying = (): NowPlaying => this.now;

  private setNow(meta: { title: string; titleEn: string } | null): void {
    this.now = { ...this.now, title: meta?.title ?? '', titleEn: meta?.titleEn ?? '', scene: this.scene };
    this.emit();
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }
}

export const audio = new AudioDirector();
