// Tintinnabuli, after Arvo Pärt: a melodic voice (M) wanders freely, and a
// second voice (T) answers each M note with a note of the tonic triad.
//
// superior   — the nearest triad note above the M note
// inferior   — the nearest triad note below it
// alternating — superior, inferior, superior, … note by note
//
// "Position" counts triad notes away from the melody: first position is the
// nearest one, second position skips one. A triad note is never answered by
// itself; the T voice always moves to a different pitch. And, as in Pärt, the
// rule is diatonic: a triad note spelled with the melody note's own letter does
// not count, so in E minor a G♯ is answered by B above or E below, never by the
// G a semitone away.

export const T_MODES = ['off', 'alternating', 'superior', 'inferior'];

const pitchClass = (pitch) => ((pitch % 12) + 12) % 12;

export function triadPitchClasses(root, mode = 'minor') {
  const third = mode === 'major' ? 4 : 3;
  return [root, root + third, root + 7].map(pitchClass);
}

// The letter a pitch is spelled with, as steps up from the tonic (octaves
// included). The twelve semitones of a key share seven letters the usual way:
// 1, ♭2 2, ♭3 3, 4 ♯4, 5, ♭6 6, ♭7 7. So in E minor G♯ and G share a letter,
// while in C minor A♭ and G do not.
const LETTERS = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];

export function letterStep(pitch, root) {
  const above = pitch - root;
  return Math.floor(above / 12) * 7 + LETTERS[pitchClass(above)];
}

// The `position`-th triad pitch strictly above (direction 1) or below (-1)
// `pitch`, skipping any spelled with the same letter as `pitch`. The triad
// lists its root first, which sets the spelling.
export function triadNeighbor(pitch, triad, direction, position = 1) {
  const root = triad[0];
  const letter = letterStep(pitch, root);
  let candidate = pitch;
  for (let found = 0; found < position;) {
    candidate += direction;
    if (triad.includes(pitchClass(candidate)) && letterStep(candidate, root) !== letter) found++;
  }
  return candidate;
}

export function tintinnabuli(notes, triad, mode, position = 1) {
  if (mode === 'off') return [];
  return notes.map((note, i) => {
    const direction =
      mode === 'superior' ? 1
        : mode === 'inferior' ? -1
          : i % 2 === 0 ? 1 : -1;
    return { ...note, pitch: triadNeighbor(note.pitch, triad, direction, position) };
  });
}
