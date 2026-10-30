// The DOM around the canvas: intro, transport, hint, toast, help and the
// settings drawer. It only reflects state and reports what the person did;
// main.js decides what that means.

import { INSTRUMENTS } from '../audio/instruments.js';
import { T_MODES } from '../music/tintinnabuli.js';
import { keyName, pitchName } from '../music/melody.js';

const $ = (selector) => document.querySelector(selector);

const T_LABELS = { off: 'off', alternating: 'alt', superior: 'above', inferior: 'below' };

function segmented(name, options, current, labels = {}) {
  const group = document.createElement('div');
  group.className = 'segmented';
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', name);
  for (const option of options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'radio');
    button.dataset.value = option;
    button.textContent = labels[option] ?? option;
    button.setAttribute('aria-checked', String(option === current));
    group.append(button);
  }
  return group;
}

function check(group, value) {
  for (const button of group.querySelectorAll('button')) {
    button.setAttribute('aria-checked', String(button.dataset.value === String(value)));
  }
}

export class Hud {
  constructor(on) {
    this.on = on;
    this.hint = $('#hint');
    this.toastEl = $('#toast');
    this.settings = $('#settings');
    this.help = $('#help');
    this.intro = $('#intro');
    this.playButton = $('#play');
    this.voiceRows = [];

    document.body.classList.add('intro-open');
    $('#enter').addEventListener('click', () => on.enter());
    this.playButton.addEventListener('click', () => on.togglePlay());
    $('#help-button').addEventListener('click', () => this.toggleHelp());
    $('#settings-button').addEventListener('click', () => this.toggleSettings());
    for (const button of document.querySelectorAll('[data-tempo]')) {
      button.addEventListener('click', () => on.tempo(Number(button.dataset.tempo)));
    }
    for (const close of document.querySelectorAll('[data-close]')) {
      close.addEventListener('click', () => this.closePanels());
    }
    this.help.addEventListener('click', (event) => {
      if (event.target === this.help) this.closePanels();
    });

    $('#t-position').addEventListener('click', (event) => {
      const value = event.target.closest('button')?.dataset.value;
      if (!value) return;
      check($('#t-position'), value);
      on.tPosition(Number(value));
    });
    $('#bell-level').addEventListener('input', (e) => on.bellLevel(Number(e.target.value)));
    $('#pedal-level').addEventListener('input', (e) => on.pedalLevel(Number(e.target.value)));
    $('#room-level').addEventListener('input', (e) => on.room(Number(e.target.value)));
    $('#lantern-listening').addEventListener('change', (e) => on.lanternListening(e.target.checked));

    this.temperature = 0.9;
    $('#temperature').addEventListener('click', (event) => {
      const value = event.target.closest('button')?.dataset.value;
      if (!value) return;
      this.temperature = Number(value);
      check($('#temperature'), value);
    });
    $('#dream').addEventListener('click', () => on.dream({
      seedA: Number($('#seed-a').value),
      seedB: Number($('#seed-b').value),
      temperature: this.temperature,
    }));
  }

  // Intro and panels -------------------------------------------------------

  leaveIntro() {
    this.intro.classList.add('leaving');
    document.body.classList.remove('intro-open');
    setTimeout(() => { this.intro.hidden = true; }, 1500);
  }

  get panelOpen() {
    return !this.settings.hidden || !this.help.hidden;
  }

  toggleSettings(force) {
    const open = force ?? this.settings.hidden;
    this.help.hidden = true;
    this.settings.hidden = !open;
  }

  toggleHelp(force) {
    const open = force ?? this.help.hidden;
    this.settings.hidden = true;
    this.help.hidden = !open;
  }

  closePanels() {
    this.settings.hidden = true;
    this.help.hidden = true;
  }

  // Transport ---------------------------------------------------------------

  setPlaying(playing) {
    this.playButton.classList.toggle('paused', !playing);
    this.playButton.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }

  setBpm(bpm) {
    $('#bpm').textContent = bpm;
  }

  setSetLabel(set) {
    $('#set-label').textContent = `${set.numeral} · ${set.name} — ${keyName(set.root, set.mode)}`;
  }

  // Hint and toast -----------------------------------------------------------

  showHint(html, x, y) {
    if (this.hintHtml !== html) {
      this.hint.innerHTML = html;
      this.hintHtml = html;
    }
    const width = this.hint.offsetWidth;
    const left = Math.min(x + 18, window.innerWidth - width - 12);
    this.hint.style.transform = `translate(${left}px, ${y + 20}px)`;
    this.hint.classList.add('show');
  }

  hideHint() {
    this.hint.classList.remove('show');
  }

  toast(html, ms = 2600) {
    this.toastEl.innerHTML = html;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), ms);
  }

  // Settings: melody sets ----------------------------------------------------

  renderSets(sets, active) {
    const container = $('#sets');
    container.replaceChildren(...sets.map((set, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'set';
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', String(i === active));
      button.innerHTML = `
        <span class="numeral">${set.numeral}</span>
        <span class="name">${set.name}</span>
        <span class="key">${keyName(set.root, set.mode)}</span>
        <span class="about">${set.note}</span>`;
      button.addEventListener('click', () => this.on.selectSet(i));
      return button;
    }));
  }

  // Settings: the four voices -------------------------------------------------

  renderVoices(discs) {
    const container = $('#voices');
    this.voiceRows = discs.map((disc) => {
      const row = document.createElement('div');
      row.className = 'voice';
      const numeral = document.createElement('span');
      numeral.className = 'numeral';
      numeral.textContent = disc.numeral;
      const volume = document.createElement('input');
      volume.type = 'range';
      volume.min = '-40';
      volume.max = '0';
      volume.step = '0.5';
      volume.value = String(disc.volumeDb);
      volume.setAttribute('aria-label', `Voice ${disc.numeral} volume`);
      const instruments = segmented(`Voice ${disc.numeral} instrument`, INSTRUMENTS, disc.instrument, { xylophone: 'xylo' });
      const bells = segmented(`Voice ${disc.numeral} bells`, T_MODES, disc.tMode, T_LABELS);
      bells.classList.add('gold');

      volume.addEventListener('input', () => this.on.voice(disc.index, { volumeDb: Number(volume.value) }));
      instruments.addEventListener('click', (event) => {
        const value = event.target.closest('button')?.dataset.value;
        if (value) this.on.voice(disc.index, { instrument: value });
      });
      bells.addEventListener('click', (event) => {
        const value = event.target.closest('button')?.dataset.value;
        if (value) this.on.voice(disc.index, { tMode: value });
      });

      row.append(numeral, volume, instruments, bells);
      return { row, volume, instruments, bells };
    });
    container.replaceChildren(...this.voiceRows.map((v) => v.row));
  }

  syncVoice(disc) {
    const row = this.voiceRows[disc.index];
    if (!row) return;
    row.volume.value = String(disc.volumeDb);
    check(row.instruments, disc.instrument);
    check(row.bells, disc.tMode);
  }

  // Settings: dreaming -------------------------------------------------------

  renderSeedChoices(root) {
    const options = [];
    for (let pitch = 55; pitch <= 86; pitch++) options.push(pitch);
    const a = 60 + root;
    const b = a + 19 <= 86 ? a + 19 : a + 7;
    for (const [selector, value] of [['#seed-a', a], ['#seed-b', b]]) {
      const select = $(selector);
      select.replaceChildren(...options.map((pitch) => {
        const option = document.createElement('option');
        option.value = String(pitch);
        option.textContent = pitchName(pitch);
        option.selected = pitch === value;
        return option;
      }));
    }
  }

  setDreaming(busy, status = '', isError = false) {
    $('#dream').disabled = busy;
    const line = $('#dream-status');
    line.textContent = status;
    line.classList.toggle('error', isError);
  }
}
