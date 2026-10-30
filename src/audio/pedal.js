// The pedal: the tonic in two octaves plus its fifth, as in the 2020 version
// (C1, C2, G2), slowly breathing through a lowpass filter.

import { midiToFrequency } from '../music/melody.js';

export class Pedal {
  constructor(ctx, destination, reverb) {
    this.ctx = ctx;
    this.level = 0.07;
    this.playing = false;
    this.voices = [];

    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 620;
    this.filter.Q.value = 0.8;

    // A very slow breath on the filter.
    this.lfo = ctx.createOscillator();
    this.lfo.frequency.value = 0.045;
    const breath = ctx.createGain();
    breath.gain.value = 240;
    this.lfo.connect(breath).connect(this.filter.frequency);
    this.lfo.start();

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 4096;

    const send = ctx.createGain();
    send.gain.value = 0.4;
    this.filter.connect(this.out);
    this.out.connect(destination);
    this.out.connect(this.analyser);
    this.out.connect(send).connect(reverb);
  }

  setRoot(root) {
    const now = this.ctx.currentTime;
    const base = 24 + (((root % 12) + 12) % 12); // between C1 and B1
    for (const voice of this.voices) {
      voice.gain.gain.setTargetAtTime(0, now, 0.9);
      voice.oscillators.forEach((osc) => osc.stop(now + 6));
    }
    this.voices = [base, base + 12, base + 19].map((pitch, i) => {
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.setTargetAtTime(i === 2 ? 0.55 : 1, now, 1.4);
      gain.connect(this.filter);
      const oscillators = [-7, 7].map((cents) => {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = midiToFrequency(pitch);
        osc.detune.value = cents;
        osc.connect(gain);
        osc.start(now);
        return osc;
      });
      oscillators[0].onended = () => gain.disconnect();
      return { gain, oscillators };
    });
  }

  start() {
    this.playing = true;
    this.out.gain.cancelScheduledValues(this.ctx.currentTime);
    this.out.gain.setTargetAtTime(this.level, this.ctx.currentTime, 1.5);
  }

  stop() {
    this.playing = false;
    this.out.gain.cancelScheduledValues(this.ctx.currentTime);
    this.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.8);
  }

  setLevel(level) {
    this.level = level;
    if (this.playing) this.out.gain.setTargetAtTime(level, this.ctx.currentTime, 0.2);
  }

  // Current waveform in [-1, 1], for drawing.
  waveform(into) {
    this.analyser.getFloatTimeDomainData(into);
    return into;
  }
}
