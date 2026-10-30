// Where everything sits, from the viewport alone, so the composition holds on
// any screen. Landscape: four discs in a row, the eight melodies on the lower
// arc of a great circle centred on that row. Portrait: discs in a 2×2 grid,
// melodies in two rows below.

export function computeLayout(width, height) {
  return height > width * 1.05 ? portrait(width, height) : landscape(width, height);
}

function landscape(width, height) {
  const r = Math.min(width * 0.087, height * 0.16, 150);
  const gap = r * 0.62;
  const rowWidth = 8 * r + 3 * gap;
  const cy = height * 0.42;
  const discs = [0, 1, 2, 3].map((i) => ({
    x: width / 2 - rowWidth / 2 + r + i * (2 * r + gap),
    y: cy,
    r,
  }));

  const seedR = Math.max(17, Math.min(r * 0.27, 38));
  const arcRadius = height * 0.865 - cy;
  const stepAngle = (seedR * 2.9) / arcRadius;
  const seeds = Array.from({ length: 8 }, (_, i) => {
    const angle = Math.PI / 2 + (3.5 - i) * stepAngle;
    return { x: width / 2 + arcRadius * Math.cos(angle), y: cy + arcRadius * Math.sin(angle), r: seedR };
  });

  return {
    width,
    height,
    discs,
    seeds,
    arc: { x: width / 2, y: cy, radius: arcRadius, from: Math.PI / 2 + 3.5 * stepAngle, to: Math.PI / 2 - 3.5 * stepAngle },
    lightHeight: r * 2.3,
    discHeight: r * 0.5,
    seedHeight: seedR * 0.55,
    waveY: height - Math.max(26, height * 0.045),
  };
}

function portrait(width, height) {
  // Melodies first, from the bottom up; the discs take the space that is left.
  const waveY = height - Math.max(22, height * 0.035);
  const seedR = Math.max(16, Math.min(width / 4 / 2 / 1.5, 30));
  const rowY = [waveY - 28 - seedR * 4.3, waveY - 28 - seedR * 1.4];
  const seeds = Array.from({ length: 8 }, (_, i) => ({
    x: width / 2 + ((i % 4) - 1.5) * seedR * 2.9,
    y: rowY[Math.floor(i / 4)],
    r: seedR,
  }));

  const labels = 58; // numeral and tags under each disc
  const top = Math.max(84, height * 0.1);
  const bottom = rowY[0] - seedR - 12;
  const r = Math.max(36, Math.min(width * 0.21, (bottom - top - labels * 2) / 4.15));
  const gapY = labels + r * 0.15;
  const block = 4 * r + gapY + labels;
  const offset = Math.max(0, (bottom - top - block) / 2);
  const gapX = r * 0.35;
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
