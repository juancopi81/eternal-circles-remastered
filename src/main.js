// Eternal Circles — remastered.
// State, the frame loop and the gestures; audio lives in audio/, drawing in
// render/, the DOM in ui/.

import { Engine } from './audio/engine.js';
import { INSTRUMENTS } from './audio/instruments.js';
import { Floor } from './render/floor.js';
import { Scene, lanternAt } from './render/scene.js';
import { computeLayout } from './render/layout.js';
import { Hud } from './ui/hud.js';
import { SETS } from './music/sets.js';
import { tintinnabuli, triadPitchClasses, T_MODES } from './music/tintinnabuli.js';
import { retrograde, pitchSpan, pitchName, toNotes, STEPS } from './music/melody.js';
import { dream } from './music/dream.js';

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const START_INSTRUMENTS = ['piano', 'piano', 'glass', 'air'];
const RIPPLE_COLORS = { M: [0.62, 0.07, 0.36], T: [0.8, 0.58, 0.24], drop: [0.9, 0.8, 0.62] };
const IDLE_AFTER = 7; // seconds without movement before the interface steps back

const clock = () => performance.now() / 1000;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const approach = (value, target, rate, dt) => value + (target - value) * (1 - Math.exp(-rate * dt));

// State ----------------------------------------------------------------------

const engine = new Engine({ xylophoneUrl: 'assets/xylophone-A6.wav' });
const scene = new Scene(document.getElementById('scene'));
const floorCanvas = document.getElementById('floor');
let floor = null;
try {
  floor = new Floor(floorCanvas);
} catch (error) {
  console.warn('Floor disabled:', error);
}

const state = {
  sets: [...SETS],
  setIndex: 0,
  melodies: [],
  triad: [],
  triadPitches: [],
  span: { low: 55, high: 84 },
  tPosition: 1,
  bpm: 98,
  bellLevel: 0.3,
  pedalLevel: 0.07,
  lanternListening: true,
  started: false,
  playing: false,
  layout: null,
  light: { x: innerWidth * 0.5, y: innerHeight * 0.42, z: 280 },
  pointer: { x: innerWidth * 0.5, y: innerHeight * 0.42, inside: false, overCanvas: false, leftAt: -10 },
  press: null,
  drag: null,
  lastTap: null,
  ripples: [],
  events: [],
  lastMove: clock(),
  idle: false,
  wave: new Float32Array(4096),
  dreams: 0,
  discs: [0, 1, 2, 3].map((index) => ({
    index,
    numeral: NUMERALS[index],
    melodyIndex: null,
    base: [],
    notes: [],
    tNotes: [],
    onsets: null,
    reversed: false,
    instrument: START_INSTRUMENTS[index],
    tMode: 'alternating',
    volumeDb: -3,
    presence: 0,
    glow: 0,
    pulse: 0,
    flashes: [],
    tFlashes: [],
    assignedAt: -10,
    flip: null,
    volumeShown: 0,
    volumeAt: -10,
    dropTarget: 0,
    eyeHover: 0,
    labelHover: null,
    labelRects: null,
    x: 0, y: 0, r: 0, height: 0,
  })),
  seeds: Array.from({ length: 8 }, (_, index) => ({
    index,
    notes: [],
    lift: 0,
    hover: 0,
    appear: 0,
    appearAt: 0,
    listening: null,
    audition: null,
    usedBy: [],
    x: 0, y: 0, r: 0, height: 0,
  })),
};

const pitchToUnit = (pitch) => clamp((pitch - state.span.low) / (state.span.high - state.span.low), 0, 1);

// Music ------------------------------------------------------------------------

function applySet(index) {
  const set = state.sets[index];
  state.setIndex = index;
  state.melodies = set.melodies;
  state.triad = triadPitchClasses(set.root, set.mode);
  const span = pitchSpan(set.melodies);
  // Leave room for bells that sit above the highest or below the lowest note.
  state.span = { low: span.low - 5, high: span.high + 5 };
  state.triadPitches = [];
  for (let pitch = state.span.low; pitch <= state.span.high; pitch++) {
    if (state.triad.includes(((pitch % 12) + 12) % 12)) state.triadPitches.push(pitch);
  }

  const now = clock();
  state.seeds.forEach((seed, i) => {
    seed.notes = set.melodies[i];
    seed.appear = 0;
    seed.appearAt = now + 0.15 + i * 0.07;
  });
  for (const disc of state.discs) {
    if (disc.melodyIndex !== null) assign(disc, disc.melodyIndex, { keepDirection: true, quiet: true });
  }
  if (engine.ctx) engine.pedal.setRoot(set.root);
  hud.setSetLabel(set);
  hud.renderSets(state.sets, index);
  hud.renderSeedChoices(set.root);
}

function refreshVoices(disc) {
  disc.notes = disc.reversed ? retrograde(disc.base) : disc.base;
  disc.tNotes = tintinnabuli(disc.notes, state.triad, disc.tMode, state.tPosition);
  disc.flashes = disc.notes.map(() => 0);
  disc.tFlashes = disc.notes.map(() => 0);
  disc.onsets = Array.from({ length: STEPS }, () => []);
  disc.notes.forEach((note, i) => disc.onsets[note.start]?.push(i));
}

function assign(disc, melodyIndex, { keepDirection = false, quiet = false } = {}) {
  disc.melodyIndex = melodyIndex;
  disc.base = state.melodies[melodyIndex].map((note) => ({ ...note }));
  if (!keepDirection) disc.reversed = false;
  refreshVoices(disc);
  disc.flip = null;
  if (!quiet) {
    disc.assignedAt = clock();
    addRipple(disc, 'drop', 1.4);
  }
}

function clearDisc(disc) {
  disc.melodyIndex = null;
  disc.onsets = null;
}

function toggleRetrograde(disc) {
  if (disc.melodyIndex === null) return;
  disc.flip = { at: clock(), notes: disc.notes, tNotes: disc.tNotes };
  disc.reversed = !disc.reversed;
  refreshVoices(disc);
  hud.toast(`${disc.numeral} · ${disc.reversed ? 'retrograde' : 'forwards again'}`);
}

function setVoice(index, change) {
  const disc = state.discs[index];
  Object.assign(disc, change);
  if ('tMode' in change && disc.melodyIndex !== null) refreshVoices(disc);
  if ('volumeDb' in change && engine.ctx) engine.voices[index].setVolume(disc.volumeDb);
  hud.syncVoice(disc);
}

const cycle = (list, value) => list[(list.indexOf(value) + 1) % list.length];

engine.onStep = (step, time, stepDuration) => {
  for (const disc of state.discs) {
    if (disc.melodyIndex === null || !disc.onsets) continue;
    for (const i of disc.onsets[step]) {
      const note = disc.notes[i];
      const accent = note.start % 8 === 0 ? 0.08 : 0;
      const velocity = 0.58 + accent + (Math.random() - 0.5) * 0.08;
      engine.playNote(disc.index, disc.instrument, note.pitch, time, (note.end - note.start) * stepDuration, velocity);
      state.events.push({ time, disc: disc.index, i, kind: 'M', notes: disc.notes });
      const bell = disc.tNotes[i];
      if (bell) {
        engine.playBell(disc.index, bell.pitch, time + 0.003, 0.5 + (Math.random() - 0.5) * 0.06);
        state.events.push({ time, disc: disc.index, i, kind: 'T', notes: disc.notes });
      }
    }
  }
};

// Light ripples on the floor.
function addRipple(disc, kind, strength) {
  state.ripples.push({ x: disc.x, y: disc.y, r0: disc.r, born: clock(), kind, strength });
  if (state.ripples.length > 48) state.ripples.shift();
}

// Gestures -------------------------------------------------------------------

// A fingertip is wider than a cursor, so on touch the small targets reach
// further: the melodies, the words under each disc, and the eye.
function hitTest(x, y, coarse = false) {
  if (state.drag) return null;
  const reach = coarse ? 10 : 0;
  for (const seed of state.seeds) {
    if (seed.appear > 0.5 && Math.hypot(x - seed.x, y - seed.y) < Math.max(seed.r * 1.12, seed.r + reach)) return { type: 'seed', seed };
  }
  for (const disc of state.discs) {
    const rects = disc.labelRects;
    if (rects) {
      for (const [key, rect] of Object.entries(rects)) {
        if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y - reach && y <= rect.y + rect.h + reach) {
          return { type: 'label', disc, key };
        }
      }
    }
    const d = Math.hypot(x - disc.x, y - disc.y);
    if (d < Math.max(disc.r * 0.19, coarse ? 22 : 0) && disc.melodyIndex !== null) return { type: 'eye', disc };
    if (d < disc.r) return { type: 'disc', disc };
  }
  return null;
}

function dropTargetAt(x, y) {
  return state.discs.find((disc) => Math.hypot(x - disc.x, y - disc.y) < disc.r * 1.12) ?? null;
}

function hintFor(target) {
  if (state.drag) {
    return dropTargetAt(state.pointer.x, state.pointer.y)
      ? '<b>release</b> to play it here'
      : 'release over a circle';
  }
  if (!target) return null;
  switch (target.type) {
    case 'seed':
      return `<b>listen</b><span class="sep">/</span>drag onto a circle`;
    case 'eye':
      return target.disc.reversed ? '<b>forwards</b> again' : '<b>retrograde</b><span class="sep">/</span>play it backwards';
    case 'label':
      return target.key === 'instrument'
        ? `instrument<span class="sep">→</span><b>${cycle(INSTRUMENTS, target.disc.instrument)}</b>`
        : `bells<span class="sep">→</span><b>${cycle(T_MODES, target.disc.tMode)}</b>`;
    case 'disc':
      return target.disc.melodyIndex === null
        ? 'drop a melody here'
        : `<b>scroll</b> volume<span class="sep">/</span><b>double-click</b> let it go`;
    default:
      return null;
  }
}

const canvas = scene.canvas;

// The lantern follows the pointer anywhere in the window, even over the
// controls; only the canvas answers to clicks and drags.
window.addEventListener('pointermove', (event) => {
  state.pointer.x = event.clientX;
  state.pointer.y = event.clientY;
  state.pointer.inside = true;
  state.pointer.overCanvas = event.target === canvas;
  wake();
  const press = state.press;
  const slop = event.pointerType === 'mouse' ? 5 : 10; // fingers wobble more than mice
  if (press?.target?.type === 'seed' && !state.drag && Math.hypot(event.clientX - press.x, event.clientY - press.y) > slop) {
    state.drag = { index: press.target.seed.index, x: event.clientX, y: event.clientY };
  }
  if (state.drag) {
    state.drag.x = event.clientX;
    state.drag.y = event.clientY;
  }
});

canvas.addEventListener('pointerdown', (event) => {
  if (!state.started) return;
  canvas.setPointerCapture(event.pointerId);
  state.pointer.x = event.clientX;
  state.pointer.y = event.clientY;
  state.press = { x: event.clientX, y: event.clientY, target: hitTest(event.clientX, event.clientY, event.pointerType !== 'mouse') };
});

canvas.addEventListener('pointerup', (event) => {
  const press = state.press;
  state.press = null;
  if (!press) return;

  if (state.drag) {
    const disc = dropTargetAt(event.clientX, event.clientY);
    if (disc) {
      assign(disc, state.drag.index);
      hud.toast(`${disc.numeral} · melody ${state.drag.index + 1} of 8`);
    }
    state.drag = null;
    return;
  }

  const target = press.target;
  if (!target) return;
  if (target.type === 'seed') {
    audition(target.seed);
  } else if (target.type === 'eye') {
    toggleRetrograde(target.disc);
  } else if (target.type === 'label') {
    const disc = target.disc;
    if (target.key === 'instrument') {
      setVoice(disc.index, { instrument: cycle(INSTRUMENTS, disc.instrument) });
      hud.toast(`${disc.numeral} · ${disc.instrument}`);
    } else {
      setVoice(disc.index, { tMode: cycle(T_MODES, disc.tMode) });
      hud.toast(disc.tMode === 'off' ? `${disc.numeral} · bells off` : `${disc.numeral} · bells <b>${disc.tMode}</b>`);
    }
  } else if (target.type === 'disc') {
    // Our own double-click, so it works for touch too.
    const now = clock();
    if (state.lastTap && state.lastTap.disc === target.disc && now - state.lastTap.at < 0.34) {
      if (target.disc.melodyIndex !== null) {
        clearDisc(target.disc);
        hud.toast(`${target.disc.numeral} · quiet`);
      }
      state.lastTap = null;
    } else {
      state.lastTap = { disc: target.disc, at: now };
    }
  }
});

canvas.addEventListener('pointercancel', () => {
  state.press = null;
  state.drag = null;
});

document.documentElement.addEventListener('pointerleave', () => {
  state.pointer.inside = false;
  state.pointer.leftAt = clock();
});

// Any touch wakes the interface. A phone sends no pointer moves between
// touches, so this is what keeps the controls from fading while in use.
window.addEventListener('pointerdown', () => {
  wake();
  resumeAudio();
}, true);
window.addEventListener('pointerup', resumeAudio, true);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) resumeAudio();
});

canvas.addEventListener('wheel', (event) => {
  const target = hitTest(event.clientX, event.clientY);
  if (!target || !('disc' in target)) return;
  const disc = target.disc;
  setVoice(disc.index, { volumeDb: clamp(disc.volumeDb - event.deltaY * 0.02, -40, 0) });
  disc.volumeAt = clock();
  wake();
}, { passive: true });

window.addEventListener('keydown', (event) => {
  if (event.target.closest?.('input, select, textarea')) return;
  if (event.key === ' ' && state.started) {
    event.preventDefault();
    togglePlay();
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    changeTempo(event.key === 'ArrowLeft' ? -2 : 2);
  } else if (event.key === 's' || event.key === 'S') {
    hud.toggleSettings();
  } else if (event.key === 'h' || event.key === 'H' || event.key === '?') {
    hud.toggleHelp();
  } else if (event.key === 'Escape') {
    hud.closePanels();
  }
  wake();
  resumeAudio();
});

function wake() {
  state.lastMove = clock();
  if (state.idle) {
    state.idle = false;
    document.body.classList.remove('idle');
  }
}

// Phones suspend the audio clock when the screen locks, the page is hidden or a
// call comes in, and iOS lets it run again only from a gesture: a touch counts
// as it lifts, a mouse press or a key as it goes down.
function resumeAudio() {
  if (state.started) engine.resume();
}

function audition(seed) {
  if (!engine.ctx) return;
  const { start, duration } = engine.audition(seed.notes, 'piano');
  seed.audition = { start, duration };
}

// Transport and settings -----------------------------------------------------------

function togglePlay() {
  if (!state.started) return;
  state.playing = !state.playing;
  if (state.playing) {
    engine.start();
    engine.pedal.start();
  } else {
    engine.stop();
    engine.pedal.stop();
  }
  hud.setPlaying(state.playing);
}

function changeTempo(delta) {
  state.bpm = clamp(state.bpm + delta, 52, 144);
  engine.bpm = state.bpm;
  hud.setBpm(state.bpm);
}

async function enter() {
  try {
    await engine.init();
  } catch (error) {
    console.error(error);
    hud.toast('this browser would not start audio', 6000);
    return;
  }
  engine.bpm = state.bpm;
  engine.pedal.setRoot(state.sets[state.setIndex].root);
  engine.pedal.setLevel(state.pedalLevel);
  state.discs.forEach((disc) => engine.voices[disc.index].setVolume(disc.volumeDb));
  state.started = true;
  hud.leaveIntro();
  togglePlay();
  // Begin with one voice already turning, so the idea is heard at once.
  setTimeout(() => {
    assign(state.discs[1], 0);
    hud.toast('drag another melody onto a circle', 4200);
  }, 900);
}

async function dreamNewPair({ seedA, seedB, temperature }) {
  const set = state.sets[state.setIndex];
  hud.setDreaming(true, 'waking up…');
  try {
    const walk = await dream({
      seedA, seedB, temperature, chord: set.chord,
      onStatus: (status) => hud.setDreaming(true, status),
    });
    state.dreams += 1;
    state.sets.push({
      id: `dream-${state.dreams}`,
      numeral: NUMERALS[state.sets.length] ?? String(state.sets.length + 1),
      name: state.dreams === 1 ? 'Dream' : `Dream ${state.dreams}`,
      note: `from ${pitchName(seedA)} and ${pitchName(seedB)}, temperature ${temperature}`,
      root: set.root,
      mode: set.mode,
      chord: set.chord,
      melodies: walk.map(toNotes),
    });
    applySet(state.sets.length - 1);
    hud.setDreaming(false, 'eight new melodies');
    hud.toast('eight new melodies');
  } catch (error) {
    console.error(error);
    hud.setDreaming(false, `the dream failed: ${error.message}`, true);
  }
}

const hud = new Hud({
  enter,
  togglePlay,
  tempo: changeTempo,
  selectSet: (index) => applySet(index),
  voice: setVoice,
  tPosition: (position) => {
    state.tPosition = position;
    state.discs.filter((d) => d.melodyIndex !== null).forEach(refreshVoices);
  },
  bellLevel: (level) => {
    state.bellLevel = level;
    engine.voices?.forEach((voice) => voice.bells.gain.setTargetAtTime(level, engine.now, 0.05));
  },
  pedalLevel: (level) => {
    state.pedalLevel = level;
    engine.pedal?.setLevel(level);
  },
  room: (level) => engine.reverbReturn?.gain.setTargetAtTime(level, engine.now, 0.1),
  lanternListening: (on) => { state.lanternListening = on; },
  dream: dreamNewPair,
});

// Layout -------------------------------------------------------------------------

function resize() {
  const width = innerWidth;
  const height = innerHeight;
  const pixelRatio = Math.min(devicePixelRatio || 1, 2);
  const layout = computeLayout(width, height);
  state.layout = layout;
  layout.discs.forEach((place, i) => Object.assign(state.discs[i], place, { height: layout.discHeight }));
  layout.seeds.forEach((place, i) => Object.assign(state.seeds[i], place, { height: layout.seedHeight }));
  state.light.z = layout.lightHeight;
  scene.resize(width, height, pixelRatio);
  floor?.resize(width, height, Math.min(pixelRatio, 1.5));
}

window.addEventListener('resize', resize);

// Frame loop -------------------------------------------------------------------------

let last = clock();

function frame() {
  const now = clock();
  const dt = Math.min(0.05, now - last);
  last = now;
  const { layout, light, pointer } = state;

  // Idle: the interface steps back and the lantern wanders on its own, on
  // the kind of Lissajous orbit the notes followed in 2020.
  if (!state.idle && state.started && now - state.lastMove > IDLE_AFTER && !hud.panelOpen && !state.drag) {
    state.idle = true;
    document.body.classList.add('idle');
  }
  const wandering = state.idle || (!pointer.inside && now - pointer.leftAt > 2.5);
  let target = pointer;
  if (wandering) {
    const t = now * 0.09;
    target = {
      x: layout.width / 2 + layout.width * 0.33 * Math.sin(t + 0.4),
      y: layout.height * 0.47 + layout.height * 0.24 * Math.sin(t * 1.618),
    };
  }
  const follow = wandering ? 1.2 : 9;
  light.x = approach(light.x, target.x, follow, dt);
  light.y = approach(light.y, target.y, follow, dt);

  // Sounding notes become flashes and ripples, exactly when they are heard.
  const audioNow = engine.now;
  while (state.events.length && state.events[0].time <= audioNow) {
    const event = state.events.shift();
    const disc = state.discs[event.disc];
    if (disc.notes !== event.notes) continue;
    if (event.kind === 'M') {
      disc.flashes[event.i] = 1;
      disc.pulse = 1;
      if (!disc.tNotes.length) addRipple(disc, 'M', 0.5);
    } else {
      disc.tFlashes[event.i] = 1;
      addRipple(disc, 'T', 0.9);
    }
  }

  const position = engine.position();
  const hovered = state.started && pointer.overCanvas ? hitTest(pointer.x, pointer.y) : null;

  for (const disc of state.discs) {
    disc.presence = approach(disc.presence, disc.melodyIndex !== null ? 1 : 0, 4, dt);
    if (disc.melodyIndex === null && disc.presence < 0.005) {
      disc.notes = [];
      disc.tNotes = [];
    }
    disc.pulse = approach(disc.pulse, 0, 3, dt);
    disc.glow = disc.presence * (0.5 + 0.3 * disc.pulse) * (state.playing ? 1 : 0.6);
    disc.flashes.forEach((f, i) => { disc.flashes[i] = f * Math.exp(-dt * 4.5); });
    disc.tFlashes.forEach((f, i) => { disc.tFlashes[i] = f * Math.exp(-dt * 3); });
    disc.volumeShown = approach(disc.volumeShown, now - disc.volumeAt < 1.4 ? 1 : 0, 6, dt);
    const dropping = state.drag && dropTargetAt(state.drag.x, state.drag.y) === disc;
    disc.dropTarget = approach(disc.dropTarget, dropping ? 1 : 0, 10, dt);
    disc.eyeHover = approach(disc.eyeHover, hovered?.type === 'eye' && hovered.disc === disc ? 1 : 0, 10, dt);
    disc.labelHover = hovered?.type === 'label' && hovered.disc === disc ? hovered.key : null;
    if (disc.flip && now - disc.flip.at > 0.6) disc.flip = null;
  }

  for (const seed of state.seeds) {
    seed.appear = now < seed.appearAt ? 0 : approach(seed.appear, 1, 3.5, dt);
    const dragging = state.drag?.index === seed.index;
    const isHovered = hovered?.type === 'seed' && hovered.seed === seed;
    seed.lift = approach(seed.lift, dragging ? 1 : isHovered ? 0.35 : 0, 10, dt);
    seed.hover = approach(seed.hover, isHovered ? 1 : 0, 10, dt);
    seed.height = layout.seedHeight * (1 + seed.lift * 7);
    seed.usedBy = state.discs.filter((d) => d.melodyIndex === seed.index).map((d) => d.index);
    if (seed.audition) {
      const progress = (audioNow - seed.audition.start) / seed.audition.duration;
      seed.listening = progress >= 0 && progress <= 1 ? progress : null;
      if (progress > 1) seed.audition = null;
    }
  }

  // The lantern decides which voices sound near and which far.
  if (engine.ctx && (!state.lastFocus || now - state.lastFocus > 0.06)) {
    state.lastFocus = now;
    for (const disc of state.discs) {
      const distance = Math.hypot(light.x - disc.x, light.y - disc.y) / Math.max(layout.width, layout.height);
      engine.voices[disc.index].setFocus(state.lanternListening ? Math.exp(-((distance / 0.32) ** 2)) : 1);
    }
  }

  // Ripples expand and fade.
  state.ripples = state.ripples.filter((ripple) => now - ripple.born < 2.8);
  const ripples = state.ripples.map((ripple) => {
    const age = now - ripple.born;
    const speed = ripple.kind === 'drop' ? 170 : 85;
    return {
      x: ripple.x,
      y: ripple.y,
      radius: ripple.r0 + age * speed,
      intensity: ripple.strength * Math.exp(-age * 1.6) * 0.26,
      color: RIPPLE_COLORS[ripple.kind],
    };
  });

  if (engine.ctx) engine.pedal.waveform(state.wave);

  const hint = hintFor(hovered);
  if (hint && pointer.overCanvas && !hud.panelOpen) hud.showHint(hint, pointer.x, pointer.y);
  else hud.hideHint();

  floor?.render({
    time: now,
    light,
    lightPower: 2.1,
    lightSize: layout.lightHeight * 0.2,
    discs: state.discs,
    seeds: state.seeds.map((seed) => {
      const dragged = state.drag?.index === seed.index;
      return {
        x: dragged ? state.drag.x : seed.x,
        y: dragged ? state.drag.y : seed.y,
        r: seed.r * (1 + 0.14 * seed.lift) * seed.appear,
        height: seed.height,
      };
    }),
    ripples,
  });

  scene.render({
    time: now,
    layout,
    light,
    pointer,
    hovering: Boolean(hovered) || Boolean(state.drag),
    discs: state.discs,
    seeds: state.seeds,
    drag: state.drag,
    position,
    pitchToUnit,
    triadPitches: state.triadPitches,
    wave: engine.ctx ? state.wave : null,
  }, dt);

  requestAnimationFrame(frame);
}

resize();
hud.renderVoices(state.discs);
hud.setBpm(state.bpm);
hud.setPlaying(false);
applySet(0);
requestAnimationFrame(frame);

// Handy for poking at the piece from the console.
window.eternalCircles = { state, engine };
