// Everything that floats above the floor, drawn on a 2D canvas: the discs as
// circular scores (angle is time, distance from the centre is pitch), the
// eight melodies, the pedal's waveform, dust in the lantern light, and the
// lantern itself.

import { STEPS } from '../music/melody.js';

const TAU = Math.PI * 2;
const SERIF = '"Instrument Serif", "Iowan Old Style", Georgia, serif';
const MONO = '"DM Mono", ui-monospace, "SF Mono", Menlo, monospace';

export const PALETTE = {
  cream: [255, 236, 204],
  magenta: [150, 18, 98],
  gold: [196, 152, 64],
  ember: [255, 76, 46],
  porcelain: { hi: [252, 245, 231], mid: [234, 219, 195], lo: [186, 165, 136] },
  smoke: { hi: [58, 53, 50], mid: [34, 31, 30], lo: [18, 17, 17] },
};

const rgba = ([r, g, b], a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (t) => 1 - (1 - clamp01(t)) ** 3;
const stepAngle = (step) => -Math.PI / 2 + (step / STEPS) * TAU;

// Same falloff as the floor shader, without shadows.
export function lanternAt(light, x, y, z = 0) {
  const dz = Math.max(light.z - z, 1);
  const dist = Math.hypot(light.x - x, light.y - y, dz);
  return (dz / dist) / (1 + (dist / (light.z * 1.3)) ** 2.6);
}

export class Scene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dust = [];
  }

  resize(width, height, pixelRatio) {
    this.width = width;
    this.height = height;
    this.pixelRatio = pixelRatio;
    this.canvas.width = Math.round(width * pixelRatio);
    this.canvas.height = Math.round(height * pixelRatio);
    const count = Math.round(Math.min(220, Math.max(70, (width * height) / 8000)));
    this.dust = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: 15 + Math.random() * 320,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      phase: Math.random() * TAU,
      size: 0.5 + Math.random() * 1.1,
    }));
  }

  render(state, dt) {
    const { ctx } = this;
    ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawWave(state);
    this.drawArc(state);
    state.seeds.forEach((seed, i) => {
      if (state.drag?.index !== i) this.drawSeed(seed, state);
    });
    state.discs.forEach((disc) => this.drawDisc(disc, state));
    if (state.drag) this.drawSeed(state.seeds[state.drag.index], state, true);
    this.drawDust(state, dt);
    this.drawLantern(state);
  }

  // The pedal, as a thin horizon of light, like the red waveform of 2020.
  // Its three tones (root, octave, and the fifth above it: frequencies 1, 2
  // and 3) are drawn as a slowly drifting standing wave whose height follows
  // the pedal's actual loudness.
  drawWave({ wave, layout, time }) {
    if (!wave) return;
    let sum = 0;
    for (let i = 0; i < wave.length; i += 4) sum += wave[i] * wave[i];
    const energy = Math.min(1, Math.sqrt(sum / (wave.length / 4)) * 16);
    if (energy < 0.01) return;

    const { ctx } = this;
    const margin = this.width * 0.08;
    const span = this.width - margin * 2;
    const y = layout.waveY;
    const points = 200;
    const gradient = ctx.createLinearGradient(margin, 0, margin + span, 0);
    gradient.addColorStop(0, rgba(PALETTE.ember, 0));
    gradient.addColorStop(0.5, rgba(PALETTE.ember, 0.2 + 0.45 * energy));
    gradient.addColorStop(1, rgba(PALETTE.ember, 0));

    ctx.save();
    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
      const u = i / points;
      const x = margin + u * span;
      const height = Math.sin(u * TAU * 2.5 + time * 0.7) * 0.62
        + Math.sin(u * TAU * 5 - time * 1.05) * 0.3
        + Math.sin(u * TAU * 7.5 + time * 1.6) * 0.2;
      const yy = y + height * 9 * energy * Math.sin(Math.PI * u);
      if (i === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1;
    ctx.shadowColor = rgba(PALETTE.ember, 0.7 * energy);
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();
  }

  // The path the melodies sit on: eight stations through MusicVAE's latent space.
  drawArc({ layout, light }) {
    const { ctx } = this;
    const { arc, seeds } = layout;
    if (!arc) return;
    const extra = (arc.from - arc.to) / 14;
    const lit = clamp01(lanternAt(light, arc.x, arc.y + arc.radius) * 1.4);

    ctx.save();
    ctx.setLineDash([1.2, 7]);
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(PALETTE.cream, 0.1 + 0.12 * lit);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(arc.x, arc.y, arc.radius, arc.to - extra, arc.from + extra);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = rgba(PALETTE.cream, 0.42);
    ctx.font = `italic ${Math.round(seeds[0].r * 0.62)}px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const [label, angle] of [['A', arc.from + extra * 1.9], ['B', arc.to - extra * 1.9]]) {
      ctx.fillText(label, arc.x + arc.radius * Math.cos(angle), arc.y + arc.radius * Math.sin(angle));
    }

    const captionY = arc.y + arc.radius + seeds[0].r + 24;
    if (captionY < layout.height - 12) {
      ctx.font = `400 10px ${MONO}`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0.18em';
      ctx.fillStyle = rgba(PALETTE.cream, 0.26);
      ctx.fillText('EIGHT STEPS THROUGH THE LATENT SPACE OF MUSICVAE', arc.x, captionY);
    }
    ctx.restore();
  }

  drawSeed(seed, state, dragged = false) {
    const { ctx } = this;
    const { light, pitchToUnit } = state;
    const lift = seed.lift;
    const r = seed.r * (1 + 0.14 * lift);
    const x = dragged ? state.drag.x : seed.x;
    const y = dragged ? state.drag.y : seed.y - lift * 4;
    const lit = clamp01(lanternAt(light, x, y, seed.height) * 1.3);
    const appear = ease(seed.appear);
    if (appear <= 0.001) return;

    ctx.save();
    ctx.globalAlpha = appear;

    const body = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    body.addColorStop(0, rgba(mix([44, 40, 39], [70, 63, 58], lit)));
    body.addColorStop(1, rgba([14, 13, 13]));
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = body;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(PALETTE.cream, 0.2 + 0.35 * Math.max(seed.hover, lift) + 0.25 * lit);
    ctx.stroke();

    // The melody, as a small circular score.
    const inner = r * 0.26;
    const outer = r * 0.84;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.2, r * 0.055);
    for (const note of seed.notes) {
      const radius = inner + (outer - inner) * pitchToUnit(note.pitch);
      const a0 = stepAngle(note.start) + 0.06;
      const a1 = Math.max(a0 + 0.02, stepAngle(note.end) - 0.06);
      ctx.strokeStyle = rgba(PALETTE.cream, 0.55 + 0.35 * Math.max(seed.hover, lift));
      ctx.beginPath();
      ctx.arc(x, y, radius, a0, a1);
      ctx.stroke();
    }

    if (seed.listening != null) {
      const a = stepAngle(seed.listening * STEPS);
      ctx.strokeStyle = rgba(PALETTE.ember, 0.8);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * inner * 0.6, y + Math.sin(a) * inner * 0.6);
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      ctx.stroke();
    }

    // Which discs are playing this melody.
    if (!dragged && seed.usedBy.length) {
      ctx.fillStyle = rgba(PALETTE.cream, 0.6);
      seed.usedBy.forEach((_, k) => {
        ctx.beginPath();
        ctx.arc(x + (k - (seed.usedBy.length - 1) / 2) * 7, y + r + 8, 1.5, 0, TAU);
        ctx.fill();
      });
    }
    ctx.restore();
  }

  drawDisc(disc, state) {
    const { ctx } = this;
    const { light, time, position, pitchToUnit, triadPitches } = state;
    const { x, y, r } = disc;
    const presence = ease(disc.presence);
    const lit = clamp01(lanternAt(light, x, y, disc.height) * 1.25);
    const eyeR = r * 0.17;
    const innerR = eyeR * 1.45;
    const outerR = r * 0.9;
    const radiusOf = (pitch) => innerR + (outerR - innerR) * pitchToUnit(pitch);

    // Body: smoked glass when empty, lamp-lit porcelain when playing.
    const toLight = Math.hypot(light.x - x, light.y - y) || 1;
    const reach = Math.min(1, toLight / (r * 3.5)) * 0.42;
    const hx = x + ((light.x - x) / toLight) * r * reach;
    const hy = y + ((light.y - y) / toLight) * r * reach;
    const warm = 0.76 + 0.22 * lit + 0.06 * disc.glow;
    const hi = mix(PALETTE.smoke.hi.map((v) => v * (0.7 + 0.8 * lit)), PALETTE.porcelain.hi.map((v) => Math.min(255, v * warm)), presence);
    const mid = mix(PALETTE.smoke.mid.map((v) => v * (0.8 + 0.5 * lit)), PALETTE.porcelain.mid.map((v) => v * warm), presence);
    const lo = mix(PALETTE.smoke.lo, PALETTE.porcelain.lo.map((v) => v * warm), presence);
    const body = ctx.createRadialGradient(hx, hy, r * 0.05, x, y, r * 1.05);
    body.addColorStop(0, rgba(hi, 0.92 + 0.08 * presence));
    body.addColorStop(0.6, rgba(mid, 0.9 + 0.1 * presence));
    body.addColorStop(1, rgba(lo, 0.95));

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = body;
    ctx.fill();
    if (presence > 0.01) {
      // The glaze darkens towards the rim and catches the lantern.
      const rim = ctx.createRadialGradient(x, y, r * 0.72, x, y, r);
      rim.addColorStop(0, 'rgba(70,46,24,0)');
      rim.addColorStop(1, `rgba(70,46,24,${0.26 * presence})`);
      ctx.fillStyle = rim;
      ctx.fill();
      const gx = x + ((light.x - x) / toLight) * r * Math.min(0.55, reach * 1.4);
      const gy = y + ((light.y - y) / toLight) * r * Math.min(0.55, reach * 1.4);
      const glaze = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * 0.42);
      glaze.addColorStop(0, `rgba(255,253,246,${0.45 * lit * presence})`);
      glaze.addColorStop(1, 'rgba(255,253,246,0)');
      ctx.fillStyle = glaze;
      ctx.fill();
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(PALETTE.cream, 0.14 + 0.32 * lit + 0.2 * presence);
    ctx.stroke();
    // A thin bevel so the disc reads as an object with an edge.
    ctx.beginPath();
    ctx.arc(x, y, r - 2.5, 0, TAU);
    ctx.strokeStyle = presence > 0.01 ? rgba([90, 70, 50], 0.18 * presence) : rgba(PALETTE.cream, 0.05);
    ctx.stroke();

    if (presence > 0.01) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r - 1, 0, TAU);
      ctx.clip();

      // The playhead's wake, like a lighthouse beam.
      const angle = stepAngle(position);
      if (ctx.createConicGradient) {
        const wake = ctx.createConicGradient(angle - 0.9, x, y);
        wake.addColorStop(0, rgba(PALETTE.ember, 0));
        wake.addColorStop(0.9 / TAU, rgba(PALETTE.ember, 0.1 * presence));
        wake.addColorStop(0.9 / TAU + 0.0001, rgba(PALETTE.ember, 0));
        wake.addColorStop(1, rgba(PALETTE.ember, 0));
        ctx.fillStyle = wake;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }

      // The triad's circles: where the bells may ring.
      ctx.lineWidth = 0.8;
      for (const pitch of triadPitches) {
        ctx.strokeStyle = rgba(PALETTE.gold, 0.34 * presence);
        ctx.beginPath();
        ctx.arc(x, y, radiusOf(pitch), 0, TAU);
        ctx.stroke();
      }

      // The melody (M) and the bells that answer it (T). During a retrograde
      // the face turns over like a coin: mirrored time is a mirrored circle.
      const flip = disc.flip ? clamp01((time - disc.flip.at) / 0.55) : 1;
      const flipping = flip < 1;
      const notes = flipping ? disc.flip.notes : disc.notes;
      const tNotes = flipping ? disc.flip.tNotes : disc.tNotes;
      ctx.translate(x, y);
      if (flipping) ctx.scale(Math.cos(Math.PI * ease(flip)), 1);
      this.drawVoices(notes, tNotes, disc, state, radiusOf, presence, flipping);
      ctx.restore();

      // Playhead.
      ctx.strokeStyle = rgba(PALETTE.ember, 0.6 * presence);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * eyeR * 1.15, y + Math.sin(angle) * eyeR * 1.15);
      ctx.lineTo(x + Math.cos(angle) * r * 0.985, y + Math.sin(angle) * r * 0.985);
      ctx.stroke();
      ctx.fillStyle = rgba(PALETTE.ember, 0.95 * presence);
      ctx.shadowColor = rgba(PALETTE.ember, 0.9);
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(x + Math.cos(angle) * r * 0.985, y + Math.sin(angle) * r * 0.985, 2.3, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // The eye: click it to hear the melody backwards.
    const eye = ctx.createRadialGradient(x, y - eyeR * 0.3, eyeR * 0.1, x, y, eyeR);
    eye.addColorStop(0, '#1c1918');
    eye.addColorStop(1, '#070606');
    ctx.beginPath();
    ctx.arc(x, y, eyeR, 0, TAU);
    ctx.fillStyle = eye;
    ctx.fill();
    ctx.strokeStyle = rgba(PALETTE.cream, 0.12 + 0.2 * presence);
    ctx.lineWidth = 1;
    ctx.stroke();
    if (presence > 0.01) this.drawRetrogradeGlyph(x, y, eyeR, disc, presence);

    this.drawDiscChrome(disc, state, lit);
    ctx.restore();
  }

  drawVoices(notes, tNotes, disc, state, radiusOf, presence, flipping) {
    const { ctx } = this;
    const { r } = disc;
    const sinceAssigned = state.time - disc.assignedAt;
    ctx.lineCap = 'round';

    notes.forEach((note, i) => {
      const grow = flipping ? 1 : ease((sinceAssigned - i * 0.045) / 0.5);
      if (grow <= 0) return;
      const flash = flipping ? 0 : disc.flashes[i] || 0;
      const radius = radiusOf(note.pitch);
      const a0 = stepAngle(note.start) + 0.035;
      const a1 = Math.max(a0 + 0.02, stepAngle(note.end) - 0.035);

      const t = tNotes[i];
      if (t) {
        const tFlash = flipping ? 0 : disc.tFlashes[i] || 0;
        const rt = radiusOf(t.pitch);
        const ca = Math.cos(a0);
        const sa = Math.sin(a0);
        ctx.strokeStyle = rgba(PALETTE.gold, (0.4 + 0.4 * tFlash) * presence * grow);
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(ca * radius, sa * radius);
        ctx.lineTo(ca * rt, sa * rt);
        ctx.stroke();
        ctx.fillStyle = rgba(PALETTE.gold, 0.95 * presence * grow);
        ctx.beginPath();
        ctx.arc(ca * rt, sa * rt, r * 0.022 * (1 + 0.9 * tFlash), 0, TAU);
        ctx.fill();
        if (tFlash > 0.02) {
          ctx.strokeStyle = rgba(PALETTE.gold, 0.7 * tFlash * presence);
          ctx.beginPath();
          ctx.arc(ca * rt, sa * rt, r * (0.03 + 0.09 * (1 - tFlash)), 0, TAU);
          ctx.stroke();
        }
      }

      ctx.strokeStyle = rgba(PALETTE.magenta, 0.9 * presence);
      ctx.lineWidth = r * 0.034 * (1 + 0.55 * flash);
      if (flash > 0.02) {
        ctx.shadowColor = rgba([214, 40, 140], 0.85 * flash);
        ctx.shadowBlur = 16 * flash;
      }
      ctx.beginPath();
      ctx.arc(0, 0, radius, a0, a0 + (a1 - a0) * grow);
      ctx.stroke();
      ctx.shadowBlur = 0;
    });
  }

  drawRetrogradeGlyph(x, y, eyeR, disc, presence) {
    const { ctx } = this;
    const radius = eyeR * 0.45;
    const direction = disc.reversed ? -1 : 1;
    const start = -Math.PI / 2 - direction * 0.35;
    const end = start + direction * Math.PI * 1.45;
    ctx.save();
    ctx.strokeStyle = rgba(PALETTE.cream, (0.3 + 0.55 * disc.eyeHover) * presence);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(x, y, radius, start, end, direction < 0);
    ctx.stroke();
    const tipX = x + Math.cos(end) * radius;
    const tipY = y + Math.sin(end) * radius;
    const heading = end + direction * Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(tipX + Math.cos(heading) * 3.2, tipY + Math.sin(heading) * 3.2);
    ctx.lineTo(tipX + Math.cos(heading + 2.4) * 3, tipY + Math.sin(heading + 2.4) * 3);
    ctx.lineTo(tipX + Math.cos(heading - 2.4) * 3, tipY + Math.sin(heading - 2.4) * 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Numeral, labels, volume ring and the drop highlight.
  drawDiscChrome(disc, state, lit) {
    const { ctx } = this;
    const { x, y, r } = disc;

    if (disc.dropTarget > 0.01) {
      ctx.strokeStyle = rgba(PALETTE.cream, 0.75 * disc.dropTarget);
      ctx.lineWidth = 1.4;
      ctx.shadowColor = rgba(PALETTE.cream, 0.8);
      ctx.shadowBlur = 14 * disc.dropTarget;
      ctx.beginPath();
      ctx.arc(x, y, r + 7 + 3 * Math.sin(state.time * 5), 0, TAU);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    if (disc.volumeShown > 0.01) {
      const amount = (disc.volumeDb + 40) / 40;
      const start = Math.PI * 0.75;
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = rgba(PALETTE.cream, 0.15 * disc.volumeShown);
      ctx.beginPath();
      ctx.arc(x, y, r + 11, start, start + Math.PI * 1.5);
      ctx.stroke();
      ctx.strokeStyle = rgba(PALETTE.cream, 0.8 * disc.volumeShown);
      ctx.beginPath();
      ctx.arc(x, y, r + 11, start, start + Math.PI * 1.5 * amount);
      ctx.stroke();
      ctx.font = `400 10px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = rgba(PALETTE.cream, 0.7 * disc.volumeShown);
      ctx.fillText(`${Math.round(disc.volumeDb)} dB`, x, y - r - 22);
    }

    const labelY = y + r + 26;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `italic ${Math.round(Math.max(15, r * 0.15))}px ${SERIF}`;
    ctx.fillStyle = rgba(PALETTE.cream, 0.42 + 0.3 * lit);
    ctx.fillText(disc.numeral, x, labelY);

    ctx.font = `400 10px ${MONO}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0.16em';
    const instrument = disc.instrument.toUpperCase();
    const tLabel = disc.tMode === 'off' ? 'BELLS OFF' : `BELLS ${disc.tMode.slice(0, 3).toUpperCase()}`;
    const gap = 16;
    const wInstrument = ctx.measureText(instrument).width;
    const wT = ctx.measureText(tLabel).width;
    const left = x - (wInstrument + gap + wT) / 2;
    const tagY = labelY + 21;
    ctx.textAlign = 'left';
    ctx.fillStyle = rgba(PALETTE.cream, 0.32 + 0.5 * (disc.labelHover === 'instrument'));
    ctx.fillText(instrument, left, tagY);
    ctx.fillStyle = rgba(PALETTE.cream, 0.18);
    ctx.fillText('·', left + wInstrument + gap / 2 - 3, tagY);
    ctx.fillStyle = disc.tMode === 'off'
      ? rgba(PALETTE.cream, 0.25 + 0.5 * (disc.labelHover === 'tMode'))
      : rgba(PALETTE.gold, 0.6 + 0.4 * (disc.labelHover === 'tMode'));
    ctx.fillText(tLabel, left + wInstrument + gap, tagY);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

    disc.labelRects = {
      instrument: { x: left - 6, y: tagY - 10, w: wInstrument + 12, h: 20 },
      tMode: { x: left + wInstrument + gap - 6, y: tagY - 10, w: wT + 12, h: 20 },
    };
  }

  drawDust({ light, time }, dt) {
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const mote of this.dust) {
      mote.x += (mote.vx + Math.sin(time * 0.13 + mote.phase) * 4) * dt;
      mote.y += (mote.vy + Math.cos(time * 0.11 + mote.phase) * 4) * dt;
      if (mote.x < -10) mote.x += this.width + 20;
      if (mote.x > this.width + 10) mote.x -= this.width + 20;
      if (mote.y < -10) mote.y += this.height + 20;
      if (mote.y > this.height + 10) mote.y -= this.height + 20;
      const glow = lanternAt(light, mote.x, mote.y, mote.z) * (0.55 + 0.45 * Math.sin(time * 1.3 + mote.phase * 3));
      if (glow < 0.03) continue;
      ctx.fillStyle = rgba(PALETTE.cream, Math.min(0.85, glow * 0.9));
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.size * (0.7 + mote.z / 350), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawLantern({ light, pointer, hovering }) {
    const { ctx } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, 170);
    halo.addColorStop(0, 'rgba(255,242,220,0.22)');
    halo.addColorStop(0.07, 'rgba(255,230,196,0.09)');
    halo.addColorStop(0.35, 'rgba(255,214,170,0.025)');
    halo.addColorStop(1, 'rgba(255,214,170,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(light.x - 170, light.y - 170, 340, 340);
    ctx.fillStyle = 'rgba(255,248,236,0.95)';
    ctx.beginPath();
    ctx.arc(light.x, light.y, 2.2, 0, TAU);
    ctx.fill();
    ctx.restore();

    if (pointer.overCanvas) {
      ctx.strokeStyle = rgba(PALETTE.cream, hovering ? 0.6 : 0.28);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, hovering ? 13 : 9, 0, TAU);
      ctx.stroke();
    }
  }
}
