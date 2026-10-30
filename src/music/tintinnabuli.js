// Tintinnabuli, after Arvo Pärt: a melodic voice (M) wanders freely, and a
// second voice (T) answers each M note with a note of the tonic triad.
//
// superior   — the nearest triad note above the M note
// inferior   — the nearest triad note below it
// alternating — superior, inferior, superior, … note by note
//
// "Position" counts triad notes away from the melody: first position is the
// nearest one, second position skips one. A triad note is never answered by
// itself; the T voice always moves to a different pitch.

export const T_MODES = ['off', 'alternating', 'superior', 'inferior'];

const pitchClass = (pitch) => ((pitch % 12) + 12) % 12;

export function triadPitchClasses(root, mode = 'minor') {
  const third = mode === 'major' ? 4 : 3;
  return [root, root + third, root + 7].map(pitchClass);
}

// The `position`-th triad pitch strictly above (direction 1) or below (-1) `pitch`.
export function triadNeighbor(pitch, triad, direction, position = 1) {
  let candidate = pitch;
  for (let found = 0; found < position;) {
    candidate += direction;
    if (triad.includes(pitchClass(candidate))) found++;
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
