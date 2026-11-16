export interface PointerState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  active: boolean;
}

export interface WaveRgb {
  r: number;
  g: number;
  b: number;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function getWaveColor(u: number, isUpperWave: boolean): WaveRgb {
  if (isUpperWave) {
    const t = Math.max(0, Math.min(1, u * 1.35));
    const r = Math.round(lerp(168, 236, t));
    const g = Math.round(lerp(65, 72, t));
    const b = Math.round(lerp(225, 163, t));
    return { r, g, b };
  }

  const clampedU = Math.max(0, Math.min(1, u));
  if (clampedU < 0.48) {
    const t = clampedU / 0.48;
    const r = Math.round(lerp(192, 236, t));
    const g = Math.round(lerp(56, 72, t));
    const b = Math.round(lerp(211, 145, t));
    return { r, g, b };
  } else if (clampedU < 0.78) {
    const t = (clampedU - 0.48) / 0.3;
    const r = Math.round(lerp(236, 249, t));
    const g = Math.round(lerp(72, 125, t));
    const b = Math.round(lerp(145, 32, t));
    return { r, g, b };
  } else {
    const t = (clampedU - 0.78) / 0.22;
    const r = Math.round(lerp(249, 234, t));
    const g = Math.round(lerp(125, 179, t));
    const b = Math.round(lerp(32, 12, t));
    return { r, g, b };
  }
}

export function drawAsciiWaveFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timestamp: number,
  pointer: PointerState,
): void {
  const animationTime = timestamp * 0.00075;

  pointer.x = lerp(pointer.x, pointer.targetX, 0.08);
  pointer.y = lerp(pointer.y, pointer.targetY, 0.08);

  ctx.fillStyle = "#0a0a0c";
  ctx.fillRect(0, 0, width, height);

  const cellW = width < 640 ? 13 : 16;
  const cellH = width < 640 ? 14 : 16;
  const cols = Math.ceil(width / cellW) + 1;
  const rows = Math.ceil(height / cellH) + 1;

  const fontSize = width < 640 ? 10 : 11.5;
  ctx.font = `500 ${fontSize}px "JetBrains Mono", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const centerX = width * 0.5;
  const centerY = height * 0.47;
  const rx = Math.max(220, width * 0.34);
  const ry = Math.max(115, height * 0.2);

  for (let r = 0; r < rows; r++) {
    const y = r * cellH + cellH * 0.5;
    const v = y / height;

    if (v > 0.885) continue;

    for (let c = 0; c < cols; c++) {
      const x = c * cellW + cellW * 0.5;
      const u = x / width;

      // Ribbon 1: Upper-left to center-top braided sinusoidal wave
      let intensity1 = 0;
      if (u < 0.78 && v < 0.52) {
        const wave1CenterV =
          0.2 +
          0.085 * Math.sin(u * 6.2 - animationTime * 1.15) +
          0.035 * Math.cos(u * 12.5 + animationTime * 0.9);

        const strandOffset1 = 0.028 * Math.sin(u * 15.0 + animationTime * 1.6);
        const dist1A = Math.abs(v - (wave1CenterV + strandOffset1));
        const dist1B = Math.abs(v - (wave1CenterV - strandOffset1 * 0.85));
        const dist1 = Math.min(dist1A, dist1B);

        const bandwidth1 = 0.068 + 0.022 * Math.sin(u * 4.5 + animationTime);
        if (dist1 < bandwidth1) {
          const raw1 = 1 - dist1 / bandwidth1;
          const horizontalEnvelope1 =
            u < 0.06
              ? u / 0.06
              : Math.max(0, 1 - Math.pow(Math.max(0, (u - 0.15) / 0.58), 1.6));
          intensity1 = Math.pow(raw1, 1.45) * horizontalEnvelope1;
        }
      }

      // Ribbon 2: Sweeping lower-left to mid-right sinusoidal wave
      let intensity2 = 0;
      if (v > 0.3) {
        const baseline2V =
          0.62 +
          0.155 * Math.sin(u * 3.85 - 0.35 - animationTime * 0.95) -
          0.19 * Math.pow(u, 1.45) +
          0.03 * Math.cos(u * 9.5 + animationTime * 1.2);

        const strandOffset2 = 0.032 * Math.cos(u * 13.0 - animationTime * 1.4);
        const dist2A = Math.abs(v - (baseline2V + strandOffset2));
        const dist2B = Math.abs(v - (baseline2V - strandOffset2 * 0.9));
        const dist2 = Math.min(dist2A, dist2B);

        const bandwidth2 =
          0.078 + 0.025 * Math.cos(u * 5.2 - animationTime * 0.8);
        if (dist2 < bandwidth2) {
          const raw2 = 1 - dist2 / bandwidth2;
          const horizontalEnvelope2 =
            u < 0.04 ? u / 0.04 : u > 0.94 ? (1 - u) / 0.06 : 1.0;
          intensity2 = Math.pow(raw2, 1.35) * horizontalEnvelope2;
        }
      }

      const isUpperDominant = intensity1 > intensity2;
      let totalIntensity = Math.max(intensity1, intensity2);

      if (pointer.active) {
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const distSq = dx * dx + dy * dy;
        const maxRadiusSq = 150 * 150;
        if (distSq < maxRadiusSq) {
          const prox = 1 - Math.sqrt(distSq) / 150;
          const ripple =
            0.28 *
            prox *
            (0.65 + 0.35 * Math.sin(distSq * 0.0025 - animationTime * 4.5));
          totalIntensity = Math.min(1, totalIntensity + ripple);
        }
      }

      if (totalIntensity > 0.07) {
        const shimmer =
          0.86 + 0.14 * Math.sin(c * 0.65 + r * 0.45 + animationTime * 2.4);
        totalIntensity *= shimmer;

        const normDx = (x - centerX) / rx;
        const normDy = (y - centerY) / ry;
        const ellipseDist = normDx * normDx + normDy * normDy;
        if (ellipseDist < 1.0) {
          totalIntensity *= Math.pow(ellipseDist, 1.65);
        }
      }

      if (totalIntensity <= 0.085) continue;

      let char = ".";
      if (totalIntensity > 0.66) {
        char = "+";
      } else if (totalIntensity > 0.44) {
        char = ":";
      } else if (totalIntensity > 0.24) {
        char = "·";
      }

      const rgb = getWaveColor(u, isUpperDominant);
      const alpha = Math.min(0.92, Math.max(0.14, totalIntensity * 0.95));

      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(3)})`;
      ctx.fillText(char, x, y);
    }
  }
}
