import * as THREE from "three";
import { hslToHex, type Dna } from "@shared/dna";

const cache = new Map<string, THREE.CanvasTexture>();

function rng(seed: string) {
  let s = parseInt(seed.slice(24, 32), 16) >>> 0 || 11;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Procedural skin texture derived from the genome – every creature's pattern is unique. */
export function patternTexture(dna: Dna): THREE.CanvasTexture {
  const key = `${dna.seed}:${dna.pattern}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const rand = rng(dna.seed);
  const primary = hslToHex(dna.primary);
  const secondary = hslToHex(dna.secondary);
  const accent = hslToHex(dna.accent);

  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, size, size);

  switch (dna.pattern) {
    case "solid":
      break;
    case "spots": {
      ctx.fillStyle = secondary;
      const n = 18 + Math.floor(rand() * 20);
      for (let i = 0; i < n; i++) {
        const r = 12 + rand() * 34;
        ctx.beginPath();
        ctx.ellipse(rand() * size, rand() * size, r, r * (0.7 + rand() * 0.5), rand() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "stripes": {
      ctx.fillStyle = secondary;
      const w = 22 + rand() * 30;
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate((rand() - 0.5) * 0.8);
      for (let x = -size; x < size; x += w * 2) {
        ctx.beginPath();
        ctx.moveTo(x, -size);
        ctx.bezierCurveTo(x + w * 0.6, -size / 3, x - w * 0.6, size / 3, x, size);
        ctx.lineTo(x + w, size);
        ctx.bezierCurveTo(x + w - w * 0.6, size / 3, x + w + w * 0.6, -size / 3, x + w, -size);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case "gradient": {
      const g = ctx.createLinearGradient(0, 0, size, size);
      g.addColorStop(0, primary);
      g.addColorStop(0.55, secondary);
      g.addColorStop(1, accent);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      break;
    }
    case "galaxy": {
      const g = ctx.createRadialGradient(size * 0.4, size * 0.4, 10, size * 0.5, size * 0.5, size * 0.8);
      g.addColorStop(0, secondary);
      g.addColorStop(0.6, primary);
      g.addColorStop(1, "#0a0a16");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 260; i++) {
        ctx.fillStyle = i % 9 === 0 ? accent : "#ffffff";
        ctx.globalAlpha = 0.4 + rand() * 0.6;
        const r = rand() < 0.1 ? 2.5 : 1.2;
        ctx.beginPath();
        ctx.arc(rand() * size, rand() * size, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "circuit": {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      for (let i = 0; i < 26; i++) {
        let x = rand() * size;
        let y = rand() * size;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 4; k++) {
          if (rand() > 0.5) x += (rand() - 0.5) * 220;
          else y += (rand() - 0.5) * 220;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.fillStyle = secondary;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "marble": {
      ctx.strokeStyle = secondary;
      ctx.lineWidth = 6;
      ctx.globalAlpha = 0.55;
      for (let i = 0; i < 14; i++) {
        ctx.beginPath();
        let x = rand() * size;
        let y = 0;
        ctx.moveTo(x, y);
        while (y < size) {
          y += 20 + rand() * 40;
          x += (rand() - 0.5) * 90;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
  }
  // Subtle noise for realism
  ctx.globalAlpha = 0.07;
  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = rand() > 0.5 ? "#000" : "#fff";
    ctx.fillRect(rand() * size, rand() * size, 3, 3);
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}
