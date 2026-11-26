// Procedural hardcore synthesis engine (browser only). Renders with OfflineAudioContext.
export type SynthOptions = { styleId: string; bpm: number; distortion: number; seconds: number; seed: number };

type Kit = {
  kick: { f0: number; f1: number; sweep: number; decay: number; drive: number; click: number };
  kickSteps: (bar: number, rnd: () => number) => number[];
  snare?: number[];
  hat?: number[];
  bass?: number[]; // offbeat / rolling bass steps
  lead?: "hoover" | "screech" | "orch" | "drone" | null;
  guitar?: (bar: number, rnd: () => number) => { step: number; len: number; mute: boolean }[];
  noise?: boolean;
  metal?: boolean;
};

const four = () => [0, 4, 8, 12];
const KITS: Record<string, Kit> = {
  "early-gabber": { kick: { f0: 420, f1: 52, sweep: 0.05, decay: 0.32, drive: 0.75, click: 0.5 }, kickSteps: four, hat: [2, 6, 10, 14], lead: "hoover" },
  frenchcore: { kick: { f0: 520, f1: 58, sweep: 0.035, decay: 0.22, drive: 0.85, click: 0.7 }, kickSteps: four, hat: [2, 6, 10, 14], bass: [2, 3, 6, 7, 10, 11, 14, 15], lead: "orch" },
  uptempo: { kick: { f0: 900, f1: 62, sweep: 0.06, decay: 0.2, drive: 1, click: 0.9 }, kickSteps: (b, r) => (b % 4 === 3 && r() > 0.4 ? [0, 4, 8, 10, 12, 14] : four()), hat: [2, 6, 10, 14], lead: "screech" },
  industrial: { kick: { f0: 260, f1: 42, sweep: 0.08, decay: 0.55, drive: 0.8, click: 0.3 }, kickSteps: (b, r) => (r() > 0.6 ? [0, 4, 8, 11, 12] : four()), metal: true, lead: "drone" },
  terrorcore: { kick: { f0: 700, f1: 60, sweep: 0.03, decay: 0.14, drive: 1, click: 1 }, kickSteps: (b, r) => [0, 2, 4, 6, 8, 10, 12, 14].concat(r() > 0.5 ? [13, 15] : []), noise: true, hat: [1, 5, 9, 13], lead: "screech" },
  "hardcore-punk": { kick: { f0: 160, f1: 55, sweep: 0.03, decay: 0.18, drive: 0.25, click: 0.4 }, kickSteps: () => [0, 6, 8, 14], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], guitar: () => [0, 2, 4, 6, 8, 10, 12, 14].map((s) => ({ step: s, len: 2, mute: false })) },
  beatdown: { kick: { f0: 150, f1: 48, sweep: 0.04, decay: 0.3, drive: 0.25, click: 0.4 }, kickSteps: () => [0, 3, 6, 11], snare: [8], hat: [0, 4, 8, 12], guitar: (b, r) => [0, 3, 6, 11, 14].map((s, i) => ({ step: s, len: i === 4 ? 2 : 3, mute: r() > 0.3 })) },
  metalcore: { kick: { f0: 170, f1: 55, sweep: 0.025, decay: 0.15, drive: 0.25, click: 0.6 }, kickSteps: (b) => (b % 2 ? Array.from({ length: 16 }, (_, i) => i) : [0, 2, 3, 6, 8, 10, 11, 14]), snare: [4, 12], hat: [0, 4, 8, 12], guitar: (b, r) => Array.from({ length: 16 }, (_, i) => i).filter(() => r() > 0.25).map((s) => ({ step: s, len: 1, mute: r() > 0.35 })) },
};

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function curve(amount: number) {
  const n = 4096, c = new Float32Array(n), k = 1 + amount * 60;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    const y = Math.tanh(k * x + 0.15 * amount * x * x); // asymmetric hard saturation
    c[i] = Math.max(-0.95, Math.min(0.95, y));
  }
  return c;
}

const MINOR = [0, 2, 3, 5, 7, 8, 10];
const hz = (root: number, semi: number) => root * Math.pow(2, semi / 12);

export async function renderTrack(o: SynthOptions): Promise<AudioBuffer> {
  const sr = 44100;
  const ctx = new OfflineAudioContext(2, Math.ceil(o.seconds * sr), sr);
  const kit = KITS[o.styleId] ?? KITS["early-gabber"]!;
  const r = rng(o.seed);
  const d = o.distortion / 100;
  const step = 60 / o.bpm / 4;
  const barLen = step * 16;
  const bars = Math.max(4, Math.floor(o.seconds / barLen));
  const root = [41.2, 43.65, 46.25, 49, 51.9, 55][Math.floor(r() * 6)]!;

  // master: comp -> clipper
  const master = ctx.createGain(); master.gain.value = 0.8;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = 0.002; comp.release.value = 0.08;
  const clip = ctx.createWaveShaper(); clip.curve = curve(0.05 + d * 0.15); clip.oversample = "4x";
  master.connect(comp).connect(clip).connect(ctx.destination);

  const kickBus = ctx.createGain();
  const kShape = ctx.createWaveShaper(); kShape.curve = curve(kit.kick.drive * (0.3 + d)); kShape.oversample = "4x";
  const kLp = ctx.createBiquadFilter(); kLp.type = "lowpass"; kLp.frequency.value = 3500 + d * 5000;
  const kOut = ctx.createGain(); kOut.gain.value = 0.55;
  kickBus.connect(kShape).connect(kLp).connect(kOut).connect(master);

  const synthBus = ctx.createGain(); synthBus.gain.value = 0.35;
  const sShape = ctx.createWaveShaper(); sShape.curve = curve(0.2 + d * 0.6);
  synthBus.connect(sShape).connect(master);

  const gtrBus = ctx.createGain(); gtrBus.gain.value = 0.22;
  const gShape = ctx.createWaveShaper(); gShape.curve = curve(0.7 + d * 0.3); gShape.oversample = "4x";
  const gLp = ctx.createBiquadFilter(); gLp.type = "lowpass"; gLp.frequency.value = 4200;
  const gHp = ctx.createBiquadFilter(); gHp.type = "highpass"; gHp.frequency.value = 80;
  gtrBus.connect(gHp).connect(gShape).connect(gLp).connect(master);

  const noiseBuf = ctx.createBuffer(1, sr, sr);
  const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = r() * 2 - 1;

  const env = (g: GainNode, t: number, peak: number, dec: number) => {
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
  };
  const kick = (t: number) => {
    const k = kit.kick, os = ctx.createOscillator(), g = ctx.createGain();
    os.frequency.setValueAtTime(k.f0, t); os.frequency.exponentialRampToValueAtTime(k.f1, t + k.sweep);
    env(g, t, 1, k.decay); os.connect(g).connect(kickBus); os.start(t); os.stop(t + k.decay + 0.02);
    noise(t, k.click * 0.6, 0.012, "highpass", 2500, kickBus);
  };
  const noise = (t: number, amp: number, dec: number, type: BiquadFilterType, f: number, dest: AudioNode = master, q = 0.7) => {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = 0.8 + r() * 0.4;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain(); env(g, t, amp, dec);
    s.connect(fl).connect(g).connect(dest); s.start(t, r() * 0.5); s.stop(t + dec + 0.02);
  };
  const saws = (t: number, f: number, len: number, amp: number, detune: number[], dest: AudioNode, glide = 0, filt?: [BiquadFilterType, number, number, number?]) => {
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(amp, t + 0.005);
    g.gain.setValueAtTime(amp, t + len * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    let out: AudioNode = g;
    if (filt) { const fl = ctx.createBiquadFilter(); fl.type = filt[0]; fl.Q.value = filt[2];
      fl.frequency.setValueAtTime(filt[1], t); if (filt[3]) fl.frequency.exponentialRampToValueAtTime(filt[3], t + len);
      g.connect(fl); out = fl; }
    out.connect(dest);
    for (const dt of detune) { const os = ctx.createOscillator(); os.type = "sawtooth"; os.detune.value = dt;
      if (glide) { os.frequency.setValueAtTime(f * glide, t); os.frequency.exponentialRampToValueAtTime(f, t + 0.08); } else os.frequency.value = f;
      os.connect(g); os.start(t); os.stop(t + len + 0.02); }
  };

  const riff = Array.from({ length: 4 }, () => MINOR[Math.floor(r() * 5)]! );
  const breakStart = Math.floor(bars * 0.5), breakEnd = breakStart + Math.max(2, Math.floor(bars / 8));

  for (let b = 0; b < bars; b++) {
    const t0 = b * barLen;
    const intro = b < Math.min(4, bars / 4), brk = b >= breakStart && b < breakEnd, outro = b >= bars - 2;
    const deg = riff[b % 4]!;
    if (!brk) for (const s of kit.kickSteps(b, r)) kick(t0 + s * step);
    if (!intro && !brk) {
      kit.snare?.forEach((s) => { noise(t0 + s * step, 0.7, 0.18, "bandpass", 1800, master, 0.8); const os = ctx.createOscillator(), g = ctx.createGain(); os.frequency.value = 190; env(g, t0 + s * step, 0.5, 0.08); os.connect(g).connect(master); os.start(t0 + s * step); os.stop(t0 + s * step + 0.1); });
      kit.bass?.forEach((s) => saws(t0 + s * step, hz(root, deg), step * 0.9, 0.6, [0, 12], synthBus, 0, ["lowpass", 900 + d * 1500, 4]));
      if (kit.guitar) for (const n of kit.guitar(b, r)) {
        const f = hz(root * 2, deg), t = t0 + n.step * step, len = n.len * step * 0.95;
        saws(t, f, len, 0.5, [-8, 8], gtrBus, 0, n.mute ? ["lowpass", 700, 1] : ["lowpass", 5000, 0.5]);
        saws(t, f * 1.4983, len, 0.35, [5], gtrBus, 0, n.mute ? ["lowpass", 700, 1] : ["lowpass", 5000, 0.5]);
      }
      if (kit.noise && r() > 0.55) noise(t0 + Math.floor(r() * 16) * step, 0.5, step * 2, "bandpass", 400 + r() * 3000, synthBus, 3);
    }
    if (!brk) kit.hat?.forEach((s) => noise(t0 + s * step, intro ? 0.25 : 0.35, 0.04, "highpass", 8000));
    if (kit.metal && !brk) [3, 7, 13].forEach((s) => r() > 0.3 && noise(t0 + s * step, 0.45, 0.12, "bandpass", 3200 + r() * 2000, master, 18));
    // leads
    const leadOn = brk || (!intro && !outro && b % 2 === 1);
    if (leadOn) {
      const f = hz(root * 4, deg + (r() > 0.5 ? 12 : 0));
      if (kit.lead === "hoover") saws(t0, f, barLen * 0.5, 0.35, [-25, 0, 25], synthBus, 0.5, ["lowpass", 2200, 2]);
      if (kit.lead === "screech") [0, 6, 12].forEach((s) => saws(t0 + s * step, f * 2, step * 3, 0.25, [0, 30], synthBus, 1.5, ["bandpass", 600, 14, 6000]));
      if (kit.lead === "orch") saws(t0, f, barLen, 0.28, [-12, 0, 12, 1200], synthBus, 0, ["lowpass", 1400, 1, 4000]);
      if (kit.lead === "drone") saws(t0, f / 4, barLen, 0.4, [-6, 6], synthBus, 0, ["lowpass", 300, 6, 1200]);
    }
  }
  return ctx.startRendering();
}

export function normalize(buf: AudioBuffer) {
  let peak = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) for (const v of buf.getChannelData(c)) peak = Math.max(peak, Math.abs(v));
  const g = peak > 0 ? 0.97 / peak : 1;
  for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i]! *= g; }
}

export async function encodeMp3(buf: AudioBuffer): Promise<Blob> {
  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const enc = new Mp3Encoder(2, buf.sampleRate, 192);
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  const toI16 = (a: Float32Array, s: number, e: number) => { const o = new Int16Array(e - s); for (let i = s; i < e; i++) o[i - s] = Math.max(-1, Math.min(1, a[i]!)) * 32767; return o; };
  const parts: BlobPart[] = [];
  for (let i = 0; i < L.length; i += 1152) {
    const e = Math.min(L.length, i + 1152);
    const chunk = enc.encodeBuffer(toI16(L, i, e), toI16(R, i, e)); if (chunk.length) parts.push(new Uint8Array(chunk));
    if (i % (1152 * 200) === 0) await new Promise((r) => setTimeout(r, 0));
  }
  parts.push(new Uint8Array(enc.flush()));
  return new Blob(parts, { type: "audio/mpeg" });
}

export async function forge(o: SynthOptions) {
  const buf = await renderTrack(o);
  normalize(buf);
  return encodeMp3(buf);
}
