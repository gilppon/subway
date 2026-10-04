/** 조용한 절제된 사운드: WebAudio 합성만 사용 (외부 에셋 없음) */
export type SoundKey =
  | "scan_start"
  | "cue_strong"
  | "cue_soft"
  | "perfect"
  | "good"
  | "miss"
  | "glare"
  | "announce"
  | "door_open"
  | "door_close"
  | "standup"
  | "step"
  | "sigh"
  | "gameover"
  | "click";

type Voice = {
  freq: number;
  to?: number;
  dur: number;
  type: OscillatorType;
  gain: number;
  delay?: number;
  noise?: boolean;
  filter?: number;
};

const RECIPES: Record<SoundKey, Voice[]> = {
  scan_start: [{ freq: 880, to: 1320, dur: 0.18, type: "sine", gain: 0.05 }],
  cue_strong: [
    { freq: 1320, to: 1760, dur: 0.12, type: "triangle", gain: 0.045 },
    { freq: 1980, dur: 0.09, type: "sine", gain: 0.03, delay: 0.07 },
  ],
  cue_soft: [{ freq: 760, to: 900, dur: 0.1, type: "sine", gain: 0.03 }],
  perfect: [
    { freq: 784, dur: 0.16, type: "sine", gain: 0.05 },
    { freq: 1175, dur: 0.28, type: "sine", gain: 0.045, delay: 0.09 },
  ],
  good: [{ freq: 660, to: 880, dur: 0.14, type: "sine", gain: 0.04 }],
  miss: [{ freq: 300, to: 180, dur: 0.2, type: "square", gain: 0.022, filter: 900 }],
  glare: [{ freq: 180, to: 120, dur: 0.26, type: "sawtooth", gain: 0.02, filter: 600 }],
  announce: [
    { freq: 1046, dur: 0.1, type: "sine", gain: 0.035 },
    { freq: 784, dur: 0.14, type: "sine", gain: 0.03, delay: 0.11 },
  ],
  door_open: [{ freq: 220, to: 420, dur: 0.32, type: "sine", gain: 0.03, noise: true, filter: 1200 }],
  door_close: [{ freq: 420, to: 180, dur: 0.3, type: "sine", gain: 0.03, noise: true, filter: 900 }],
  standup: [{ freq: 520, to: 700, dur: 0.09, type: "triangle", gain: 0.025 }],
  step: [{ freq: 150, to: 110, dur: 0.07, type: "sine", gain: 0.018, noise: true, filter: 500 }],
  sigh: [{ freq: 400, to: 240, dur: 0.42, type: "sine", gain: 0.026 }],
  gameover: [
    { freq: 392, dur: 0.2, type: "sine", gain: 0.04 },
    { freq: 294, dur: 0.3, type: "sine", gain: 0.035, delay: 0.16 },
    { freq: 196, dur: 0.5, type: "sine", gain: 0.03, delay: 0.36 },
  ],
  click: [{ freq: 1200, dur: 0.04, type: "sine", gain: 0.025 }],
};

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmNodes: AudioNode[] = [];
  private volumes = { master: 0.7, sfx: 0.8, bgm: 0.5 };
  private muted = false;

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volumes.master;
    this.master.connect(this.ctx.destination);
  }

  setVolumes(master: number, sfx: number, bgm: number) {
    this.volumes = { master, sfx, bgm };
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : master, this.ctx.currentTime, 0.05);
    if (this.bgmGain && this.ctx) this.bgmGain.gain.setTargetAtTime(this.muted ? 0 : bgm * 0.35, this.ctx.currentTime, 0.1);
  }

  play(key: SoundKey) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || this.muted) return;
    const recipe = RECIPES[key];
    if (!recipe) return;
    const now = ctx.currentTime;
    for (const v of recipe) {
      const start = now + (v.delay ?? 0);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, v.gain * this.volumes.sfx), start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + v.dur);
      let src: AudioScheduledSourceNode;
      if (v.noise) {
        const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * v.dur), ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
        const osc = ctx.createBufferSource();
        osc.buffer = buf;
        src = osc;
      } else {
        const osc = ctx.createOscillator();
        osc.type = v.type;
        osc.frequency.setValueAtTime(v.freq, start);
        if (v.to) osc.frequency.exponentialRampToValueAtTime(Math.max(30, v.to), start + v.dur);
        src = osc;
      }
      if (v.filter) {
        const f = ctx.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = v.filter;
        src.connect(f);
        f.connect(gain);
      } else {
        src.connect(gain);
      }
      gain.connect(master);
      src.start(start);
      src.stop(start + v.dur + 0.05);
    }
  }

  startBgm() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || this.bgmNodes.length > 0) return;
    const gain = ctx.createGain();
    gain.gain.value = this.volumes.bgm * 0.35;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 320;

    // 지하철 주행음: 낮은 삼각파 + 바람 소음
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 58;
    const oscGain = ctx.createGain();
    oscGain.gain.value = 0.35;
    osc.connect(oscGain);

    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.5;
    void noise.start;

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.18;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.25;
    lfo.connect(lfoGain);
    lfoGain.connect(noiseGain.gain);

    oscGain.connect(filter);
    noiseGain.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start();
    noise.start();
    lfo.start();
    this.bgmGain = gain;
    this.bgmNodes = [osc, noise, lfo, filter, gain, oscGain, noiseGain, lfoGain];
  }

  stopBgm() {
    for (const n of this.bgmNodes) {
      const src = n as AudioScheduledSourceNode;
      if (typeof src.stop === "function") {
        try {
          src.stop();
        } catch {
          /* noop */
        }
      }
      n.disconnect();
    }
    this.bgmNodes = [];
    this.bgmGain = null;
  }
}

export const audio = new AudioManager();
