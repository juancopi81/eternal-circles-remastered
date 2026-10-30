// Walk MusicVAE's latent space from melody `a` to melody `b` in eight stations.
// Melodies are arrays of [midiPitch, startStep, endStep] spanning 32 steps.
//
// The ends are the seeds themselves. The six stations in between are decoded
// greedily from a straight line between the two latent codes. Near the seeds
// the decoder often reproduces a seed (or a previous station) exactly, so a
// repeated station is nudged: we add a little Gaussian noise to its latent code
// and decode again, widening the nudge until the melody is new. Greedy decoding
// keeps every station on the decoder's most likely path, so no stray notes.

const STATIONS = 8;
const LOWEST = 45;
const HIGHEST = 96;

export function toSequence(melody) {
  return {
    notes: melody.map(([pitch, start, end]) => ({
      pitch,
      quantizedStartStep: start,
      quantizedEndStep: end,
    })),
    totalQuantizedSteps: 32,
    quantizationInfo: { stepsPerQuarter: 4 },
  };
}

export function fromSequence(sequence) {
  return sequence.notes
    .map((n) => [n.pitch, n.quantizedStartStep, n.quantizedEndStep])
    .sort((x, y) => x[1] - y[1]);
}

const inRange = (melody) =>
  melody.length > 0 && melody.every(([pitch]) => pitch >= LOWEST && pitch <= HIGHEST);

export async function walk(mm, vae, a, b) {
  const { tf } = mm;
  const z = await vae.encode([toSequence(a), toSequence(b)]);
  const za = z.slice([0, 0], [1, -1]);
  const zb = z.slice([1, 0], [1, -1]);

  const stations = [a];
  const seen = new Set([JSON.stringify(a), JSON.stringify(b)]);

  for (let k = 1; k < STATIONS - 1; k++) {
    const t = k / (STATIONS - 1);
    const zt = tf.tidy(() => za.mul(1 - t).add(zb.mul(t)));
    let melody = fromSequence((await vae.decode(zt))[0]);

    for (let attempt = 1; attempt <= 40 && (seen.has(JSON.stringify(melody)) || !inRange(melody)); attempt++) {
      const nudged = tf.tidy(() => zt.add(tf.randomNormal(zt.shape).mul(0.08 * attempt)));
      melody = fromSequence((await vae.decode(nudged))[0]);
      nudged.dispose();
    }

    seen.add(JSON.stringify(melody));
    stations.push(melody);
    zt.dispose();
  }

  stations.push(b);
  tf.dispose([z, za, zb]);
  return stations;
}
