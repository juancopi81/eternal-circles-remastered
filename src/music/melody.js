// Melodies are two bars of sixteenth steps. In the app a note is
// { pitch, start, end } with start/end in steps.

export const STEPS = 32;

export const toNotes = (melody) =>
  melody.map(([pitch, start, end]) => ({ pitch, start, end }));

export const toTriples = (notes) => notes.map(({ pitch, start, end }) => [pitch, start, end]);

// True retrograde: the melody played backwards in time, rests included.
export function retrograde(notes, steps = STEPS) {
  return notes
    .map((note) => ({ ...note, start: steps - note.end, end: steps - note.start }))
    .sort((a, b) => a.start - b.start);
}

export function pitchSpan(melodies) {
  let low = Infinity;
  let high = -Infinity;
  for (const notes of melodies) {
    for (const { pitch } of notes) {
      low = Math.min(low, pitch);
      high = Math.max(high, pitch);
    }
  }
  return { low, high };
}

const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

export const pitchName = (pitch) => `${NAMES[((pitch % 12) + 12) % 12]}${Math.floor(pitch / 12) - 1}`;

export const keyName = (root, mode) => `${NAMES[root]} ${mode}`;

export const midiToFrequency = (pitch) => 440 * 2 ** ((pitch - 69) / 12);
