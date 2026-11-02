// Where everything sits, from the viewport alone, so the composition holds on
// any screen. Landscape: four discs in a row, the eight melodies on the lower
// arc of a great circle centred on that row. Portrait: discs in a 2×2 grid,
// melodies in two rows below.

// Room under each disc for its numeral and tags, and the narrowest spacing
// between discs that keeps the widest tag line ("XYLOPHONE · BELLS ALT",
// about 153px) clear of its neighbour's.
const LABELS = 58;
const LABEL_PITCH = 168;

export function computeLayout(width, height) {
  return height > width * 1.05 ? portrait(width, height) : landscape(width, height);
}

function landscape(width, height) {
  const r = Math.min(width * 0.087, height * 0.16, 150);
  const gap = Math.max(r * 0.62, LABEL_PITCH - 2 * r);
  const rowWidth = 8 * r + 3 * gap;
  const cy = height * 0.42;
  const discs = [0, 1, 2, 3].map((i) => ({
    x: width / 2 - rowWidth / 2 + r + i * (2 * r + gap),
    y: cy,
    r,
  }));

  const seedR = Math.max(17, Math.min(r * 0.27, 38));
  const spacing = seedR * 2.9;
  const lowest = Math.min(height * 0.865, height - seedR - 38); // the caption goes below
  let radius = lowest - cy;
  let seeds = arcSeeds(width, lowest, radius, spacing, seedR);

  // On short screens the ends of that arc climb into the tags under the inner
  // discs. Then the circle grows, its centre rising above the row, until the
  // ends pass just below them.
  const labelsBottom = cy + r + LABELS;
  const collides = seeds.some((seed) => seed.y - seedR < labelsBottom
    && discs.some((disc) => Math.abs(seed.x - disc.x) < LABEL_PITCH / 2 + seedR / 2));
  if (collides) {
    const sag = Math.max(6, lowest - (labelsBottom + 6 + seedR));
    const half = 3.5 * spacing;
    radius = (half * half) / (2 * sag) + sag / 2;
    seeds = arcSeeds(width, lowest, radius, spacing, seedR);
  }
  const stepAngle = spacing / radius;

  return {
    width,
    height,
    discs,
    seeds,
    arc: { x: width / 2, y: lowest - radius, radius, from: Math.PI / 2 + 3.5 * stepAngle, to: Math.PI / 2 - 3.5 * stepAngle },
    lightHeight: r * 2.3,
    discHeight: r * 0.5,
    seedHeight: seedR * 0.55,
    waveY: height - Math.max(26, height * 0.045),
  };
}

// Eight melodies spaced evenly along the bottom of a circle whose lowest point is `lowest`.
function arcSeeds(width, lowest, radius, spacing, r) {
  const step = spacing / radius;
  return Array.from({ length: 8 }, (_, i) => {
    const angle = Math.PI / 2 + (3.5 - i) * step;
    return { x: width / 2 + radius * Math.cos(angle), y: lowest - radius + radius * Math.sin(angle), r };
  });
}

function portrait(width, height) {
  // Melodies first, from the bottom up; the discs take the space that is left.
  // On short screens the melodies shrink too, so they never outgrow the discs.
  const waveY = height - Math.max(22, height * 0.035);
  const seedR = Math.max(16, Math.min(width / 4 / 2 / 1.5, height * 0.04, 30));
  const rowY = [waveY - 28 - seedR * 4.3, waveY - 28 - seedR * 1.4];
  const seeds = Array.from({ length: 8 }, (_, i) => ({
    x: width / 2 + ((i % 4) - 1.5) * seedR * 2.9,
    y: rowY[Math.floor(i / 4)],
    r: seedR,
  }));

  const top = Math.max(84, height * 0.1);
  const bottom = rowY[0] - seedR - 12;
  const r = Math.max(36, Math.min(width * 0.21, (bottom - top - LABELS * 2) / 4.15));
  const gapY = LABELS + r * 0.15;
  const block = 4 * r + gapY + LABELS;
  const offset = Math.max(0, (bottom - top - block) / 2);
  const gapX = Math.max(r * 0.35, LABEL_PITCH - 2 * r);
  const discs = [0, 1, 2, 3].map((i) => ({
    x: width / 2 + (i % 2 === 0 ? -1 : 1) * (r + gapX / 2),
    y: top + offset + r + Math.floor(i / 2) * (2 * r + gapY),
    r,
  }));

  return {
    width,
    height,
    discs,
    seeds,
    arc: null,
    lightHeight: r * 2.3,
    discHeight: r * 0.5,
    seedHeight: seedR * 0.55,
    waveY,
  };
}
