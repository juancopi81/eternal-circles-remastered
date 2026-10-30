// Seed melodies for each set. Every melody is two bars of 4/4 in sixteenth
// steps (32 steps), written as [midiPitch, startStep, endStep].
// MusicVAE walks from `a` to `b` in eight steps; tools/precompute.html turns
// these seeds into the melodies stored in sets.js.

export const SEEDS = [
  {
    id: 'origin',
    numeral: 'I',
    name: 'Origin',
    note: 'the two seeds of the 2020 version',
    root: 0, // C
    mode: 'minor',
    chord: 'Cm7',
    a: [
      [75, 0, 4], [67, 4, 8], [70, 8, 12], [67, 12, 16],
      [60, 16, 20], [67, 20, 24], [70, 24, 28], [67, 28, 32],
    ],
    b: [
      [82, 0, 8], [80, 8, 16], [79, 16, 20], [80, 20, 24], [82, 24, 28], [84, 28, 32],
    ],
  },
  {
    id: 'cantus',
    numeral: 'II',
    name: 'Cantus',
    note: 'a falling A minor scale, after Pärt',
    root: 9, // A
    mode: 'minor',
    chord: 'Am',
    a: [
      [81, 0, 4], [79, 4, 8], [77, 8, 12], [76, 12, 16],
      [74, 16, 20], [72, 20, 24], [71, 24, 28], [69, 28, 32],
    ],
    b: [
      [69, 0, 6], [72, 6, 8], [76, 8, 14], [74, 14, 16],
      [72, 16, 22], [71, 22, 24], [69, 24, 32],
    ],
  },
  {
    id: 'espiral',
    numeral: 'III',
    name: 'Espiral',
    note: 'a cell that widens around E, after Brouwer',
    root: 4, // E
    mode: 'minor',
    chord: 'Em',
    // E, then neighbours one, two, three and four semitones away.
    a: [64, 65, 64, 63, 64, 66, 64, 62, 64, 67, 64, 61, 64, 68, 64, 60]
      .map((pitch, i) => [pitch, i * 2, i * 2 + 2]),
    // An open E minor arpeggio that climbs and falls.
    b: [64, 71, 76, 79, 83, 79, 76, 71, 64, 67, 71, 76, 78, 76, 71, 67]
      .map((pitch, i) => [pitch, i * 2, i * 2 + 2]),
  },
];
