// Audio graph, the four voice buses and a sample-accurate transport.
//
//   voice i:  M notes ─┐
//             T bells ─┴─ volume ─ lantern lowpass ─ focus ─ pan ─┬─ master
//                                                                 └─ reverb
//   pedal ───────────────────────────────────────────────────────┬─ master
//                                                                 └─ reverb

import { createImpulse } from './reverb.js';
import { Piano, Xylophone, glass, air, bell } from './instruments.js';
import { Pedal } from './pedal.js';
import { STEPS } from '../music/melody.js';

const PANS = [-0.6, -0.2, 0.2, 0.6];
const LOOKAHEAD = 0.14; // seconds scheduled ahead of the audio clock

export const dbToGain = (db) => 10 ** (db / 20);

class VoiceBus {
  constructor(ctx, master, reverb, pan) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.bells = ctx.createGain();
    this.volume = ctx.createGain();
    this.lowpass = ctx.createBiquadFilter();
    this.focus = ctx.createGain();
    this.panner = ctx.createStereoPanner();
    const send = ctx.createGain();
    const bellSend = ctx.createGain();

    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = 18000;
    this.lowpass.Q.value = 0.5;
    this.panner.pan.value = pan;
    this.bells.gain.value = 0.3;
    send.gain.value = 0.3;
    bellSend.gain.value = 0.45; // bells bathe in more room

    this.input.connect(this.volume);
    this.bells.connect(this.volume);
    this.volume.connect(this.lowpass).connect(this.focus).connect(this.panner);
    this.panner.connect(master);
    this.panner.connect(send).connect(reverb);
    this.bells.connect(bellSend).connect(reverb);
  }

  setVolume(db) {
    this.volume.gain.setTargetAtTime(dbToGain(db), this.ctx.currentTime, 0.04);
  }

  // How close the lantern is, 0..1: far voices are softer and duller.
  setFocus(amount) {
    const now = this.ctx.currentTime;
    this.focus.gain.setTargetAtTime(0.74 + 0.26 * amount, now, 0.15);
    this.lowpass.frequency.setTargetAtTime(2400 * (18000 / 2400) ** amount, now, 0.15);
  }

  clearFocus() {
    this.setFocus(1);
  }
}

// setInterval in a worker keeps ticking when the tab is in the background.
function createTicker(onTick) {
  const source = 'let id; onmessage = (e) => { clearInterval(id); if (e.data) id = setInterval(() => postMessage(0), e.data); };';
  try {
    const worker = new Worker(URL.createObjectURL(new Blob([source], { type: 'text/javascript' })));
    worker.onmessage = onTick;
    return { start: (ms) => worker.postMessage(ms), stop: () => worker.postMessage(0) };
  } catch {
    let id;
    return {
      start: (ms) => { clearInterval(id); id = setInterval(onTick, ms); },
      stop: () => clearInterval(id),
    };
  }
}

export class Engine {
  constructor({ xylophoneUrl }) {
    this.xylophoneUrl = xylophoneUrl;
    this.ctx = null;
    this.bpm = 98;
    this.playing = false;
    this.step = 0;
    this.anchors = [];
    this.lastPosition = 0;
    this.onStep = null;
    this.ticker = createTicker(() => this.tick());
  }

  async init() {
    if (this.ctx) {
      await this.ctx.resume();
      return;
    }
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.85;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.knee.value = 10;
    limiter.ratio.value = 4;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.3;
    this.master.connect(limiter).connect(ctx.destination);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = createImpulse(ctx);
    this.reverbReturn = ctx.createGain();
    this.reverbReturn.gain.value = 0.85;
    this.reverb.connect(this.reverbReturn).connect(this.master);

    this.voices = PANS.map((pan) => new VoiceBus(ctx, this.master, this.reverb, pan));
    this.auditionBus = new VoiceBus(ctx, this.master, this.reverb, 0);
    this.pedal = new Pedal(ctx, this.master, this.reverb);

    this.piano = new Piano(ctx);
    this.xylophone = new Xylophone(ctx, this.xylophoneUrl);
    this.pianoLoaded = this.piano.load().catch(() => false);
    this.xylophone.load().catch(() => {});

    await ctx.resume();
  }

  get stepDuration() {
    return 60 / this.bpm / 4;
  }

  get now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  // Transport ---------------------------------------------------------------

  start() {
    if (this.playing || !this.ctx) return;
    this.playing = true;
    this.nextTime = this.ctx.currentTime + 0.06;
    this.anchors = [];
    this.tick();
    this.ticker.start(25);
  }

  stop() {
    if (!this.playing) return;
    this.lastPosition = this.position();
    this.playing = false;
    this.ticker.stop();
    this.step = Math.ceil(this.lastPosition) % STEPS;
  }

  tick() {
    if (!this.playing) return;
    const horizon = this.ctx.currentTime + LOOKAHEAD;
    while (this.nextTime < horizon) {
      const duration = this.stepDuration;
      this.anchors.push({ time: this.nextTime, step: this.step, duration });
      if (this.anchors.length > 32) this.anchors.shift();
      this.onStep?.(this.step, this.nextTime, duration);
      this.nextTime += duration;
      this.step = (this.step + 1) % STEPS;
    }
  }

  // Fractional step currently sounding, for drawing playheads.
  position() {
    if (!this.playing || this.anchors.length === 0) return this.lastPosition;
    const now = this.ctx.currentTime;
    let anchor = null;
    for (const candidate of this.anchors) {
      if (candidate.time <= now) anchor = candidate;
    }
    if (!anchor) return this.anchors[0].step;
    return (anchor.step + Math.min(1, (now - anchor.time) / anchor.duration)) % STEPS;
  }

  // Notes -------------------------------------------------------------------

  play(bus, instrument, pitch, time, duration, velocity) {
    const { ctx } = this;
    switch (instrument) {
      case 'glass': glass(ctx, bus.input, pitch, time, duration, velocity); break;
      case 'air': air(ctx, bus.input, pitch, time, duration, velocity); break;
      case 'xylophone': this.xylophone.play(bus.input, pitch, time, duration, velocity); break;
      default: this.piano.play(bus.input, pitch, time, duration, velocity);
    }
  }

  playNote(voice, instrument, pitch, time, duration, velocity) {
    this.play(this.voices[voice], instrument, pitch, time, duration, velocity);
  }

  playBell(voice, pitch, time, velocity) {
    bell(this.ctx, this.voices[voice].bells, pitch, time, velocity);
  }

  // Play a melody once, in the middle of the stereo field. Returns its start time.
  audition(notes, instrument = 'piano') {
    const start = this.ctx.currentTime + 0.05;
    const step = this.stepDuration;
    for (const note of notes) {
      this.play(this.auditionBus, instrument, note.pitch, start + note.start * step,
        (note.end - note.start) * step, 0.55);
    }
    return { start, duration: STEPS * step };
  }
}
