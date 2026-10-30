// A synthetic impulse response: stereo noise that decays and grows darker as
// it fades, like a large stone room. Generated at start-up, so no files.

export function createImpulse(ctx, seconds = 5.5, decay = 2.6) {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * seconds);
  const buffer = ctx.createBuffer(2, length, rate);
  const fadeIn = Math.floor(rate * 0.012);

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let smooth = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      // A one-pole lowpass that closes over time; the gain keeps the
      // loudness steady while the colour darkens.
      const k = 0.15 + 0.8 * t;
      smooth = smooth * k + (Math.random() * 2 - 1) * (1 - k);
      const envelope = (1 - t) ** decay * Math.min(1, i / fadeIn);
      data[i] = smooth * Math.sqrt((1 + k) / (1 - k)) * envelope;
    }
  }
  return buffer;
}
