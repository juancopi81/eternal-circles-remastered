import { test } from 'node:test';
import assert from 'node:assert/strict';

import { triadPitchClasses, triadNeighbor, tintinnabuli } from '../src/music/tintinnabuli.js';
import { retrograde } from '../src/music/melody.js';

const C_MINOR = triadPitchClasses(0, 'minor');

test('triad pitch classes', () => {
  assert.deepEqual(C_MINOR, [0, 3, 7]);
  assert.deepEqual(triadPitchClasses(9, 'minor'), [9, 0, 4]);
  assert.deepEqual(triadPitchClasses(2, 'major'), [2, 6, 9]);
});

test('first position neighbours never answer a triad note with itself', () => {
  assert.equal(triadNeighbor(60, C_MINOR, 1), 63); // C4 -> E♭4
  assert.equal(triadNeighbor(60, C_MINOR, -1), 55); // C4 -> G3
  assert.equal(triadNeighbor(63, C_MINOR, 1), 67); // E♭4 -> G4
  assert.equal(triadNeighbor(62, C_MINOR, 1), 63); // D4 -> E♭4
  assert.equal(triadNeighbor(62, C_MINOR, -1), 60); // D4 -> C4
});

test('second position skips one triad note', () => {
  assert.equal(triadNeighbor(62, C_MINOR, 1, 2), 67); // D4 -> G4
  assert.equal(triadNeighbor(62, C_MINOR, -1, 2), 55); // D4 -> G3
});

test('alternating tintinnabuli voice', () => {
  const notes = [60, 62, 63, 65].map((pitch, i) => ({ pitch, start: i * 4, end: i * 4 + 4 }));
  const t = tintinnabuli(notes, C_MINOR, 'alternating');
  assert.deepEqual(t.map((n) => n.pitch), [63, 60, 67, 63]);
  assert.deepEqual(t.map((n) => n.start), [0, 4, 8, 12]);
  assert.deepEqual(tintinnabuli(notes, C_MINOR, 'off'), []);
});

test('retrograde keeps rests where they belong', () => {
  const notes = [
    { pitch: 60, start: 0, end: 4 },
    { pitch: 62, start: 8, end: 12 },
  ];
  assert.deepEqual(retrograde(notes), [
    { pitch: 62, start: 20, end: 24 },
    { pitch: 60, start: 28, end: 32 },
  ]);
  assert.deepEqual(retrograde(retrograde(notes)), notes);
});
