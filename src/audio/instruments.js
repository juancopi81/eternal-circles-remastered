// The voices of the piece. Every function schedules one note at `time`
// (AudioContext seconds) into `destination` and cleans up after itself.

import { midiToFrequency } from '../music/melody.js';

export const INSTRUMENTS = ['piano', 'glass', 'xylophone', 'air'];

// Salamander Grand Piano (Alexander Holm, CC BY 3.0), hosted by Tone.js.
const SALAMANDER = 'https://tonejs.github.io/audio/salamander/';
const SAMPLE_NAMES = { C: 0, Ds: 3, Fs: 6, A: 9 };

const releaseWhenDone = (source, ...nodes) => {
  source.onended = () => nodes.forEach((node) => node.disconnect());
};

export class Piano {
  constructor(ctx) {
    this.ctx = ctx;
    this.samples = [];
  }

  get ready() {
    return this.samples.length > 0;
  }

  async load() {
    const wanted = [];
    for (let octave = 2; octave <= 6; octave++) {
      for (const name of Object.keys(SAMPLE_NAMES)) wanted.push([name, octave]);
    }
    wanted.push(['C', 7]);

    const loaded = await Promise.allSettled(wanted.map(async ([name, octave]) => {
      const response = await fetch(`${SALAMANDER}${name}${octave}.mp3`);
      if (!response.ok) throw new Error(`${name}${octave}: ${response.status}`);
      const buffer = await this.ctx.decodeAudioData(await response.arrayBuffer());
      return { pitch: 12 * (octave + 1) + SAMPLE_NAMES[name], buffer };
    }));

    const samples = loaded.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    // A few missing samples are fine; the nearest neighbour is stretched further.
    if (samples.length >= wanted.length / 2) this.samples = samples.sort((a, b) => a.pitch - b.pitch);
    return this.ready;
  }

  play(destination, pitch, time, duration, velocity) {
    if (!this.ready) {
      feltPiano(this.ctx, destination, pitch, time, duration, velocity);
      return;
    }
    let sample = this.samples[0];
    for (const candidate of this.samples) {
      if (Math.abs(candidate.pitch - pitch) < Math.abs(sample.pitch - pitch)) sample = candidate;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = sample.buffer;
    source.playbackRate.value = 2 ** ((pitch - sample.pitch) / 12);

    const gain = this.ctx.createGain();
    const end = time + Math.max(duration, 0.45);
    gain.gain.setValueAtTime(velocity, time);
    gain.gain.setTargetAtTime(0, end, 0.45);

    source.connect(gain).connect(destination);
    source.start(time);
    source.stop(end + 3);
    releaseWhenDone(source, gain);
  }
}

// Used until the piano samples arrive, or if they never do.
function feltPiano(ctx, destination, pitch, time, duration, velocity) {
  const frequency = midiToFrequency(pitch);
  const out = ctx.createGain();
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.setValueAtTime(Math.min(9000, frequency * 7), time);
  tone.frequency.exponentialRampToValueAtTime(Math.max(400, frequency * 1.6), time + 1.8);

  const end = time + Math.max(duration, 0.4);
  out.gain.setValueAtTime(0.0001, time);
  out.gain.exponentialRampToValueAtTime(velocity * 0.5, time + 0.006);
  out.gain.exponentialRampToValueAtTime(velocity * 0.12, time + 1.2);
  out.gain.setTargetAtTime(0, end, 0.35);

  tone.connect(out).connect(destination);
  [[1, 1], [2, 0.32], [3, 0.11], [4, 0.05]].forEach(([ratio, level], i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = i === 0 ? 'triangle' : 'sine';
    osc.frequency.value = frequency * ratio;
    gain.gain.value = level;
    osc.connect(gain).connect(tone);
    osc.start(time);
    osc.stop(end + 2);
    releaseWhenDone(osc, gain, ...(i === 0 ? [tone, out] : []));
  });
}

// FM with a harmonic modulator two octaves up: a bright strike that melts
// into a pure tone, like a celesta or a wet glass rim.
export function glass(ctx, destination, pitch, time, duration, velocity) {
  const frequency = midiToFrequency(pitch);
  const carrier = ctx.createOscillator();
  const modulator = ctx.createOscillator();
  const depth = ctx.createGain();
  const amp = ctx.createGain();
  const end = time + Math.max(duration, 0.3) + 2.2;

  carrier.frequency.value = frequency;
  modulator.frequency.value = frequency * 4;
  depth.gain.setValueAtTime(frequency * 2.4, time);
  depth.gain.exponentialRampToValueAtTime(frequency * 0.04, time + 0.35);
  amp.gain.setValueAtTime(0.0001, time);
  amp.gain.exponentialRampToValueAtTime(velocity * 0.42, time + 0.004);
  amp.gain.exponentialRampToValueAtTime(velocity * 0.1, time + 0.9);
  amp.gain.exponentialRampToValueAtTime(0.0001, end);

  modulator.connect(depth).connect(carrier.frequency);
  carrier.connect(amp).connect(destination);
  carrier.start(time);
  modulator.start(time);
  carrier.stop(end + 0.05);
  modulator.stop(end + 0.05);
  releaseWhenDone(carrier, amp, depth);
}

// Two soft, slightly detuned triangles: a breath rather than a strike.
export function air(ctx, destination, pitch, time, duration, velocity) {
  const frequency = midiToFrequency(pitch);
  const filter = ctx.createBiquadFilter();
  const amp = ctx.createGain();
  const hold = Math.max(duration, 0.35);

  filter.type = 'lowpass';
  filter.frequency.value = Math.min(5000, frequency * 3.5);
  filter.Q.value = 0.4;
  amp.gain.setValueAtTime(0.0001, time);
  amp.gain.linearRampToValueAtTime(velocity * 0.26, time + 0.14);
  amp.gain.setTargetAtTime(velocity * 0.18, time + 0.14, 0.3);
  amp.gain.setTargetAtTime(0, time + hold, 0.5);
  filter.connect(amp).connect(destination);

  [-6, 6].forEach((cents, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = frequency;
    osc.detune.value = cents;
    osc.connect(filter);
    osc.start(time);
    osc.stop(time + hold + 3.5);
    if (i === 0) releaseWhenDone(osc, filter, amp);
  });
}

// The xylophone of the 2020 version: one sample recorded at A6, stretched
// down to every other pitch, which is what gives it its dark, gong-like tail.
export class Xylophone {
  constructor(ctx, url) {
    this.ctx = ctx;
    this.url = url;
    this.buffer = null;
  }

  async load() {
    const response = await fetch(this.url);
    this.buffer = await this.ctx.decodeAudioData(await response.arrayBuffer());
  }

  play(destination, pitch, time, duration, velocity) {
    if (!this.buffer) {
      glass(this.ctx, destination, pitch, time, duration, velocity);
      return;
    }
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    const end = time + Math.max(duration, 0.5) + 1.6;
    source.buffer = this.buffer;
    source.playbackRate.value = 2 ** ((pitch - 93) / 12);
    gain.gain.setValueAtTime(velocity * 0.7, time);
    gain.gain.setTargetAtTime(0, end - 1, 0.35);
    source.connect(gain).connect(destination);
    source.start(time);
    source.stop(end + 0.5);
    releaseWhenDone(source, gain);
  }
}

// The tintinnabulum: a small bell with the inharmonic partials of a struck bar.
const BELL_PARTIALS = [
  // ratio, level, decay (s)
  [1, 1, 3.8],
  [2, 0.36, 2.3],
  [2.76, 0.2, 1.6],
  [5.4, 0.08, 0.8],
  [8.93, 0.035, 0.4],
];

export function bell(ctx, destination, pitch, time, velocity) {
  const frequency = midiToFrequency(pitch);
  const out = ctx.createGain();
  // Higher bells ring shorter.
  const shorten = Math.min(1.2, Math.max(0.45, 1.25 - (pitch - 60) / 50));
  out.gain.value = velocity;
  out.connect(destination);

  let longest = null;
  let longestEnd = 0;
  for (const [ratio, level, decay] of BELL_PARTIALS) {
    const partial = frequency * ratio;
    if (partial > ctx.sampleRate * 0.45) continue;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const end = time + decay * shorten;
    osc.frequency.value = partial;
    osc.detune.value = (Math.random() - 0.5) * 8;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(level, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain).connect(out);
    osc.start(time);
    osc.stop(end + 0.05);
    releaseWhenDone(osc, gain);
    if (end > longestEnd) {
      longestEnd = end;
      longest = osc;
    }
  }
  if (longest) {
    const previous = longest.onended;
    longest.onended = () => {
      previous?.();
      out.disconnect();
    };
  }
}
