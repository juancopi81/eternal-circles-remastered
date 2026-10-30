// Dreaming new melodies with Magenta, as the 2020 version did: MusicRNN grows
// two seed melodies from single notes over a chord, then MusicVAE walks
// between them. Magenta and its checkpoints load only when someone asks.

import { walk, fromSequence } from './latent-walk.js';

const MAGENTA = 'https://cdn.jsdelivr.net/npm/@magenta/music@1.23.1/dist/magentamusic.js';
const CHECKPOINTS = 'https://storage.googleapis.com/magentadata/js/checkpoints';

let models = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error('could not load Magenta'));
    document.head.append(script);
  });
}

async function loadModels(onStatus) {
  if (models) return models;
  onStatus('loading Magenta…');
  if (!window.mm) await loadScript(MAGENTA);
  const { mm } = window;
  onStatus('loading MusicRNN and MusicVAE…');
  const rnn = new mm.MusicRNN(`${CHECKPOINTS}/music_rnn/chord_pitches_improv`);
  const vae = new mm.MusicVAE(`${CHECKPOINTS}/music_vae/mel_2bar_small`);
  await Promise.all([rnn.initialize(), vae.initialize()]);
  models = { mm, rnn, vae };
  return models;
}

// One seed note, continued by MusicRNN to two bars.
async function improvise({ mm, rnn }, pitch, steps, temperature, chord) {
  const seed = {
    notes: [{ pitch, quantizedStartStep: 0, quantizedEndStep: steps }],
    totalQuantizedSteps: steps,
    quantizationInfo: { stepsPerQuarter: 4 },
  };
  const continuation = await rnn.continueSequence(seed, 32 - steps, temperature, [chord]);
  return fromSequence(mm.sequences.concatenate([seed, continuation]))
    .filter(([, start]) => start < 32)
    .map(([p, start, end]) => [p, start, Math.min(end, 32)]);
}

export async function dream({ seedA, seedB, temperature, chord, onStatus = () => {} }) {
  const m = await loadModels(onStatus);
  onStatus('improvising two seeds…');
  const a = await improvise(m, seedA, 4, temperature, chord);
  const b = await improvise(m, seedB, 8, temperature, chord);
  onStatus('walking the latent space…');
  return walk(m.mm, m.vae, a, b);
}
