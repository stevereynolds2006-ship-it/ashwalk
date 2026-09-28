import { spriteFrame, type GenerationSprites } from "@rarefriends/friendsdk/sprites";
import type { Ghost } from "./net";
import { PH, PW, birdSpots, perchPosition, rectsAt, spiderPoses, type Sim } from "./sim";

export type Camera = { x: number; y: number; w: number; h: number };

type Mote = { x: number; y: number; vx: number; vy: number; life: number; max: number };
const motes: Mote[] = [];

export function burst(x: number, y: number, n = 8) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 20 + Math.random() * 70;
    motes.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 30,
      life: 0.35 + Math.random() * 0.35,
      max: 0.7,
    });
  }
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Tree = { x: number; ground: number; scale: number; seed: number };
const DISTANT: Tree[] = Array.from({ length: 9 }, (_, i) => ({
  x: 180 + i * 620,
  ground: 470,
  scale: 1.4 + (i % 3) * 0.35,
  seed: 11 + i * 17,
}));
const SHORE_FAR: Tree[] = Array.from({ length: 12 }, (_, i) => ({
  x: -40 + i * 580,
  ground: 500,
  scale: 1.55 + (i % 3) * 0.28,
  seed: 21 + i * 19,
}));
const SHORE_NEAR: Tree[] = Array.from({ length: 8 }, (_, i) => ({
  x: 40 + i * 860,
  ground: 530,
  scale: 1.15 + (i % 2) * 0.22,
  seed: 80 + i * 13,
}));
const MID: Tree[] = Array.from({ length: 7 }, (_, i) => ({
  x: 80 + i * 780,
  ground: 500,
  scale: 1 + (i % 2) * 0.25,
  seed: 40 + i * 9,
}));

const SKY: Record<string, [string, string, string, string]> = {
  shore: ["#141416", "#d9d7d2", "#8e8c88", "#121214"],
  latch: ["#2a2a2e", "#d4d2ce", "#9a9894", "#3a3a3e"],
  gale: ["#121214", "#7a7a7e", "#3c3c40", "#101012"],
  choir: ["#5a5a62", "#f4f2ec", "#ddd9d2", "#4a4a52"],
  gear: ["#16161a", "#c8c8cc", "#7a7a80", "#121214"],
  roof: ["#2a2a2c", "#c8c8c6", "#6a6a6c", "#121214"],
  antler: ["#101114", "#c5c3be", "#6d6b68", "#101114"],
  moon: ["#050506", "#101218", "#1a1c22", "#050506"],
  tunnel: ["#050506", "#101012", "#0c0c0e", "#050506"],
};

function drawTree(ctx: CanvasRenderingContext2D, tree: Tree, alpha: number) {
  const rand = rng(tree.seed);
  const s = tree.scale;
  ctx.save();
  ctx.translate(tree.x, tree.ground);
  ctx.scale(s, s);
  ctx.fillStyle = `rgba(6,6,7,${alpha})`;
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.quadraticCurveTo(-4, -80, 6 + rand() * 10, -210);
  ctx.quadraticCurveTo(10, -80, 14, 0);
  ctx.fill();
  const branches = 5 + Math.floor(rand() * 3);
  ctx.lineCap = "round";
  for (let i = 0; i < branches; i++) {
    const y = -70 - i * 26 - rand() * 16;
    const dir = rand() > 0.5 ? 1 : -1;
    const len = 50 + rand() * 90;
    ctx.strokeStyle = `rgba(6,6,7,${alpha})`;
    ctx.lineWidth = 7 - i * 0.6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(dir * len * 0.4, y - 20 - rand() * 24, dir * len, y - 8 + rand() * 20);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDeadwood(ctx: CanvasRenderingContext2D, tree: Tree, alpha: number) {
  const rand = rng(tree.seed);
  ctx.save();
  ctx.translate(tree.x, tree.ground);
  ctx.scale(tree.scale, tree.scale);
  ctx.fillStyle = `rgba(5,5,6,${alpha})`;
  ctx.strokeStyle = `rgba(5,5,6,${alpha})`;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(-86, 16);
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const x = -84 + t * 168;
    const hump = Math.sin(t * Math.PI) * (22 + rand() * 26);
    ctx.lineTo(x + (rand() - 0.5) * 10, -hump);
  }
  ctx.lineTo(86, 18);
  ctx.closePath();
  ctx.fill();

  for (let i = 0; i < 7; i++) {
    const dir = rand() > 0.5 ? 1 : -1;
    const x0 = dir * (6 + rand() * 16);
    ctx.lineWidth = 2.4 + rand() * 3.2;
    ctx.beginPath();
    ctx.moveTo(x0, -4);
    ctx.quadraticCurveTo(dir * (24 + rand() * 30), 6, dir * (46 + rand() * 36), 12);
    ctx.stroke();
  }

  const spine: { x: number; y: number; w: number }[] = [];
  let x = (rand() - 0.5) * 8;
  let y = -10;
  for (let i = 0; i <= 8; i++) {
    spine.push({ x, y, w: Math.max(2, 18 - i * 1.8) });
    x += (rand() - 0.46) * 16;
    y -= 26 + rand() * 14;
  }
  ctx.beginPath();
  ctx.moveTo(spine[0]!.x - spine[0]!.w, spine[0]!.y);
  for (const point of spine) ctx.lineTo(point.x - point.w * 0.62, point.y);
  for (let i = spine.length - 1; i >= 0; i--) ctx.lineTo(spine[i]!.x + spine[i]!.w * 0.62, spine[i]!.y);
  ctx.closePath();
  ctx.fill();

  const vines: { x: number; y: number; len: number }[] = [];
  for (let i = 3; i < spine.length; i++) {
    const point = spine[i]!;
    const forks = rand() > 0.45 ? 2 : 1;
    for (let fork = 0; fork < forks; fork++) {
      const dir = rand() > 0.5 ? 1 : -1;
      const len = 26 + rand() * 78;
      const rise = -16 - rand() * 58;
      const x2 = point.x + dir * len;
      const y2 = point.y + rise;
      ctx.lineWidth = Math.max(1, 3.6 - i * 0.32);
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.quadraticCurveTo(point.x + dir * len * 0.45, point.y + rise * 0.35, x2, y2);
      ctx.stroke();
      if (rand() > 0.35) {
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 + dir * (8 + rand() * 18), y2 - 6 - rand() * 16);
        ctx.stroke();
      }
      if (rand() > 0.28) vines.push({ x: x2, y: y2, len: 18 + rand() * 54 });
      if (rand() > 0.55) vines.push({ x: (point.x + x2) / 2, y: (point.y + y2) / 2, len: 14 + rand() * 40 });
    }
  }

  ctx.lineWidth = 1.15;
  for (const vine of vines) {
    ctx.beginPath();
    ctx.moveTo(vine.x, vine.y);
    ctx.quadraticCurveTo(
      vine.x + (rand() - 0.5) * 8,
      vine.y + vine.len * 0.55,
      vine.x + (rand() - 0.5) * 5,
      vine.y + vine.len,
    );
    ctx.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const point = spine[2 + Math.floor(rand() * (spine.length - 3))]!;
    const len = 22 + rand() * 60;
    ctx.beginPath();
    ctx.moveTo(point.x + (rand() - 0.5) * 8, point.y);
    ctx.quadraticCurveTo(
      point.x + (rand() - 0.5) * 10,
      point.y + len * 0.6,
      point.x + (rand() - 0.5) * 6,
      point.y + len,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawGearTooth(ctx: CanvasRenderingContext2D, sim: Sim, rect: { id: string; x: number; y: number; w: number; h: number }) {
  const spin = sim.level.platforms.find((item) => item.id === rect.id)?.gear;
  if (!spin) {
    drawPlank(ctx, rect, false, true);
    return;
  }
  const ang = sim.t * spin.speed + spin.phase;
  const hx = spin.cx + Math.cos(ang) * spin.r;
  const hy = spin.cy + Math.sin(ang) * spin.r;
  ctx.strokeStyle = "#e8e6e1";
  ctx.lineWidth = 8;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(spin.cx, spin.cy);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  drawPlank(ctx, rect, false, true);
}

function drawTerrain(ctx: CanvasRenderingContext2D, sim: Sim, reduced: boolean) {
  const bodies = rectsAt(sim, reduced);
  const hubs = new Set<string>();
  for (const plat of sim.level.platforms) {
    const spin = plat.gear;
    if (!spin) continue;
    const key = `${spin.cx}:${spin.cy}`;
    if (hubs.has(key)) continue;
    hubs.add(key);
    ctx.save();
    ctx.translate(spin.cx, spin.cy);
    ctx.rotate(sim.t * (reduced ? spin.speed * 0.35 : spin.speed));
    ctx.fillStyle = "#141418";
    drawCog(ctx, spin.r * 0.72, spin.teeth);
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fillStyle = "#f4f1ea";
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = "#070708";
  for (const rect of bodies) {
    const plat = sim.level.platforms.find((item) => item.id === rect.id);
    if (!plat?.terrain) continue;
    ctx.beginPath();
    ctx.moveTo(rect.x - 8, rect.y + 18);
    const steps = Math.max(2, Math.floor(rect.w / 28));
    for (let i = 0; i <= steps; i++) {
      const px = rect.x + (rect.w * i) / steps;
      const jag = ((i * 37 + rect.x) % 5) - 2;
      ctx.lineTo(px, rect.y + jag);
    }
    ctx.lineTo(rect.x + rect.w + 10, rect.y + 16);
    const deep = sim.level.id === "mirror" || sim.level.id === "antler" || sim.level.id === "tunnel";
    const drop = sim.level.id === "tunnel" ? 1600 : deep ? 1400 : Math.min(rect.h, 420) + 40;
    ctx.lineTo(rect.x + rect.w + 30, rect.y + drop);
    ctx.lineTo(rect.x - 40, rect.y + drop);
    ctx.closePath();
    ctx.fill();
    if (sim.level.id !== "roof" && sim.level.id !== "gale" && sim.level.id !== "choir" && sim.level.id !== "gear") drawGrass(ctx, rect, 26);
  }
  for (const rect of bodies) {
    if (rect.terrain) continue;
    if (rect.id.startsWith("ceil")) continue;
    if (rect.kind === "gate") drawGate(ctx, rect);
    else if (sim.level.platforms.find((item) => item.id === rect.id)?.gear) drawGearTooth(ctx, sim, rect);
    else if (rect.kind === "sway" || rect.kind === "rope") {
      drawCage(ctx, rect, sim.rope < 1 && rect.id === "cageC");
    } else drawPlank(ctx, rect, rect.kind === "crumble" || (sim.crumbles[rect.id]?.timer ?? 0) > 0.9, sim.level.id === "choir");
  }
  if (sim.level.id === "choir") {
    for (const rect of bodies) {
      if (rect.kind === "gate" || rect.id.startsWith("ceil")) continue;
      const glow = ctx.createLinearGradient(rect.x, rect.y - 22, rect.x, rect.y + 6);
      glow.addColorStop(0, "rgba(255,255,255,0)");
      glow.addColorStop(1, "rgba(244,241,234,0.42)");
      ctx.fillStyle = glow;
      ctx.fillRect(rect.x, rect.y - 20, rect.w, 22);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(rect.x, rect.y, rect.w, 2);
    }
  }
  if (sim.level.id === "choir" && sim.y > 720) {
    ctx.fillStyle = "#070708";
    ctx.fillRect(-80, sim.y + PH, sim.level.worldW + 160, 2200);
  }
}

function drawDrainTrash(ctx: CanvasRenderingContext2D, t: number, reduced: boolean) {
  const pile = (x: number, ground: number, kind: number) => {
    ctx.save();
    ctx.translate(x, ground);
    ctx.fillStyle = "#050506";
    if (kind === 0) {
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.quadraticCurveTo(-18, -22, -4, -28);
      ctx.quadraticCurveTo(8, -34, 14, -16);
      ctx.quadraticCurveTo(18, -6, 12, 0);
      ctx.fill();
      ctx.fillRect(-6, -8, 8, 6);
    } else if (kind === 1) {
      ctx.fillRect(-14, -18, 28, 18);
      ctx.fillStyle = "#f4f1ea";
      ctx.fillRect(-14, -18, 28, 2);
      ctx.fillRect(-2, -16, 2, 16);
    } else if (kind === 2) {
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(-6, -16);
      ctx.lineTo(-2, -22);
      ctx.lineTo(2, -16);
      ctx.lineTo(4, 0);
      ctx.fill();
      ctx.fillRect(-7, -8, 3, 8);
    } else if (kind === 3) {
      ctx.beginPath();
      ctx.ellipse(0, -6, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#101114";
      ctx.beginPath();
      ctx.ellipse(0, -6, 6, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(-10, -8);
      ctx.lineTo(2, -3);
      ctx.lineTo(12, -11);
      ctx.lineTo(18, 0);
      ctx.fill();
    }
    ctx.restore();
  };
  const spots: [number, number, number][] = [
    [80, 468, 1],
    [180, 468, 0],
    [280, 468, 4],
    [400, 468, 2],
    [760, 430, 1],
    [860, 430, 3],
    [960, 430, 0],
    [1240, 468, 4],
    [1360, 468, 1],
    [1480, 468, 2],
    [2020, 348, 0],
    [2120, 348, 3],
    [2420, 468, 1],
    [2540, 468, 4],
    [2660, 468, 2],
    [2740, 1180, 4],
    [2800, 1180, 0],
    [2860, 1180, 2],
    [2920, 1180, 1],
    [2980, 1180, 3],
    [3040, 1180, 0],
    [3100, 1180, 4],
    [3160, 1180, 2],
    [3220, 1180, 1],
    [3280, 1180, 0],
    [3340, 1180, 3],
    [3400, 1180, 2],
    [3460, 1180, 4],
    [3520, 1180, 1],
    [3580, 1180, 0],
    [3640, 1180, 2],
    [3700, 1180, 3],
    [3760, 1180, 4],
    [3820, 1180, 1],
    [3880, 1180, 0],
    [3940, 1180, 2],
    [4000, 1180, 4],
    [4060, 1180, 1],
    [4120, 1180, 3],
    [4180, 1180, 0],
    [4240, 1180, 2],
    [4300, 1180, 4],
  ];
  for (const [x, ground, kind] of spots) pile(x, ground, kind);
  if (reduced) return;
  ctx.save();
  for (const [x, ground] of spots) {
    if (ground !== 1180 || (x / 20) % 2 !== 0) continue;
    for (let i = 0; i < 3; i++) {
      const life = (t * 0.32 + i * 0.34 + x * 0.001) % 1;
      const yy = -16 - life * 78;
      const xx = Math.sin(t * 1.6 + i + x) * 10;
      ctx.globalAlpha = (1 - life) * 0.4;
      ctx.fillStyle = "#d5d5d0";
      ctx.beginPath();
      ctx.arc(x + xx, ground + yy, 2.5 + life * 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawGrass(ctx: CanvasRenderingContext2D, rect: RectLike, tall: number) {
  const rand = rng((Math.floor(rect.x) * 13 + Math.floor(rect.y)) >>> 0);
  ctx.fillStyle = "#070708";
  const blades = Math.max(4, Math.floor(rect.w / 6));
  for (let i = 0; i < blades; i++) {
    const x = rect.x + ((i + rand() * 0.6) / blades) * rect.w;
    const h = 5 + rand() * tall;
    const lean = (rand() - 0.45) * h * 0.45;
    const wide = rand() > 0.82 ? 3.4 : 1.6;
    ctx.beginPath();
    ctx.moveTo(x, rect.y + 3);
    ctx.lineTo(x + lean, rect.y - h);
    ctx.lineTo(x + wide, rect.y + 3);
    ctx.closePath();
    ctx.fill();
  }
}

function drawPlank(ctx: CanvasRenderingContext2D, rect: RectLike, rotten: boolean, bright = false) {
  ctx.save();
  ctx.translate(rect.x + rect.w / 2, rect.y);
  if (rotten) ctx.rotate(-0.04);
  ctx.fillStyle = bright ? "#1a1a1c" : "#0c0c0d";
  ctx.fillRect(-rect.w / 2, 0, rect.w, 10);
  ctx.fillStyle = bright ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.18)";
  ctx.fillRect(-rect.w / 2, 0, rect.w, bright ? 2 : 1);
  ctx.restore();
}

type RectLike = { x: number; y: number; w: number; h: number };

function drawCage(ctx: CanvasRenderingContext2D, rect: RectLike, occupied: boolean) {
  const x = rect.x;
  const y = rect.y;
  const w = rect.w;
  const h = 86;
  ctx.strokeStyle = "#0a0a0b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y - 150);
  ctx.stroke();
  ctx.fillStyle = "#070708";
  ctx.fillRect(x, y, w, 8);
  ctx.fillRect(x, y + h, w, 7);
  const bars = 4;
  for (let i = 0; i < bars; i++) {
    const bx = x + 8 + i * ((w - 16) / (bars - 1));
    ctx.fillRect(bx, y, 4, h + 7);
  }
  if (occupied) {
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 48, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + w / 2 - 5, y + 54, 10, 18);
  }
}

function drawGate(ctx: CanvasRenderingContext2D, rect: RectLike) {
  const x = rect.x;
  const y = rect.y;
  ctx.strokeStyle = "#0a0a0b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + rect.w / 2, y);
  ctx.lineTo(x + rect.w / 2, y - 70);
  ctx.stroke();
  ctx.fillStyle = "#070708";
  const bars = 3;
  for (let i = 0; i < bars; i++) {
    const bx = x + (rect.w * (i + 0.5)) / bars - 2;
    ctx.fillRect(bx, y, 4, rect.h);
  }
  ctx.fillStyle = "rgba(243,240,232,0.45)";
  ctx.fillRect(x - 2, y, rect.w + 4, 3);
}

function drawLatchLock(ctx: CanvasRenderingContext2D, sim: Sim) {
  const lock = sim.level.combo;
  if (!lock) return;
  const gates = sim.level.platforms.filter((plat) => plat.kind === "gate");
  ctx.fillStyle = "rgba(243,240,232,0.9)";
  ctx.font = "22px sans-serif";
  ctx.textAlign = "center";
  lock.code.forEach((digit, index) => {
    const gate = gates[index];
    if (!gate) return;
    ctx.fillText(String(digit), gate.x + gate.w / 2, 210);
  });
  const y = lock.y;
  ctx.fillStyle = "#121214";
  ctx.fillRect(lock.x + lock.span / 2 - 16, y - 78, 32, 22);
  ctx.beginPath();
  ctx.arc(lock.x + lock.span / 2, y - 78, 14, Math.PI, 0);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#121214";
  ctx.stroke();
  const slot = lock.span / lock.code.length;
  lock.code.forEach((_, index) => {
    const x = lock.x + slot * index;
    const hot = sim.nearCombo === index;
    ctx.fillStyle = hot ? "#f4f1ea" : "#1a1a1c";
    ctx.fillRect(x + 8, y - 54, slot - 16, 46);
    ctx.fillStyle = hot ? "#121214" : "#f4f1ea";
    ctx.font = "28px sans-serif";
    ctx.fillText(String(sim.combo[index] ?? 0), x + slot / 2, y - 22);
  });
}

function drawPlate(ctx: CanvasRenderingContext2D, plate: RectLike, hot: boolean) {
  const y = plate.y + plate.h - 6;
  ctx.fillStyle = hot ? "rgba(243,240,232,0.95)" : "rgba(243,240,232,0.28)";
  ctx.fillRect(plate.x, y, plate.w, 3);
  if (hot) {
    ctx.fillStyle = "rgba(243,240,232,0.12)";
    ctx.fillRect(plate.x, plate.y, plate.w, plate.h);
  }
}

function drawOutfit(
  ctx: CanvasRenderingContext2D,
  cloth: string,
  center: number,
  bottom: number,
  facing: 1 | -1,
  layer: "back" | "front",
  t = 0,
  vx = 0,
  vy = 0,
) {
  ctx.save();
  ctx.translate(center, bottom);
  ctx.scale(facing === -1 ? -1 : 1, 1);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const ink = "#070708";
  const edge = "#f4f1ea";
  ctx.fillStyle = ink;
  ctx.strokeStyle = edge;

  if (layer === "back" && cloth === "cloak") {
    ctx.beginPath();
    ctx.moveTo(-8, -46);
    ctx.quadraticCurveTo(-20, -28, -18, -4);
    ctx.quadraticCurveTo(-6, 2, 4, -2);
    ctx.quadraticCurveTo(16, 4, 18, -6);
    ctx.quadraticCurveTo(20, -28, 10, -46);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -40);
    ctx.quadraticCurveTo(-2, -20, 2, -4);
    ctx.stroke();
  }

  if (layer === "back" && (cloth === "cape" || cloth === "white")) {
    const rows = [
      "................kkkkkkkkk.....",
      ".............kkrrrrrrrrrrk....",
      "...........kkrrrrdrrrdrrrrk...",
      ".........kkrrrrrrdrrrdrrrrrk..",
      ".......kkrrrrrrrdrrrdrrrrrrrk.",
      "kk...kkrrrrrrrrrdrrrdrrrrrrrrk",
      "krrkrrrrrrrrrrrrdrrrdrrrrrrrrk",
      "krrrrrrrrrrrrrrrdrrrdrrrrrrrrk",
      "krrrrrrrrrrrrrrrdrrrdrrrrrrrk.",
      ".krrrrrrrrrrrrrrdrrrdrrrrrrk..",
      "..krrrrrrrrrrrrrdrrrdrrrrrk...",
      "...krrrrrrkrrrrrdrrrdrrrrk....",
      "....krrrrk.krrrrdrrrdrrrk.....",
      ".....krrk...krrrrrrrrrrk......",
      "......kk.....krrrrrrrrk.......",
      ".............krrrrrrk.........",
      "..............krrrrk..........",
      "...............kkkk...........",
    ];
    const tone: Record<string, string> =
      cloth === "white"
        ? { r: "#f7f7f7", d: "#9a9a9e", k: "#1a1a1c" }
        : { r: "#e10600", d: "#8d0906", k: "#240406" };
    const size = 2;
    const along = vx * facing;
    const run = Math.max(-1, Math.min(1, along / 180));
    const rise = Math.max(-1, Math.min(1, -vy / 520));
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const color = tone[row[x] ?? ""];
        if (!color) continue;
        const back = row.length - x;
        const ripple = Math.sin(t * 8 + back * 0.45 + y * 0.35) * (1.5 + Math.abs(run) * 2.4);
        const trail = back * Math.max(0, run) * 0.9;
        const flip = back * Math.max(0, -run) * 0.75;
        ctx.fillStyle = color;
        ctx.fillRect(-4 - back * size - trail + flip, -50 + y * size + ripple + rise * back * 0.4, size, size);
      }
    });
  }

  if (layer === "back" && cloth === "rainbow") {
    const size = 2.15;
    const along = vx * facing;
    const run = Math.max(-1, Math.min(1, along / 180));
    const rise = Math.max(-1, Math.min(1, -vy / 520));
    const bands = ["#ff2bd6", "#ff3b5c", "#ff6a00", "#ffb000", "#ffe14a", "#7dff3a", "#2ee6a0", "#2ee6ff", "#2f7bff", "#7a4dff"];
    const spot = (back: number, y: number) => {
      const ripple = Math.sin(t * 8 + back * 0.32 + y * 0.4) * (1.6 + Math.abs(run) * 2.2);
      const trail = back * Math.max(0, run) * 0.85;
      const flip = back * Math.max(0, -run) * 0.7;
      return {
        x: -4 - back * size - trail + flip,
        y: -54 + y * size + ripple + rise * back * 0.32,
      };
    };
    for (let y = 0; y < 18; y++) {
      const belly = 1 - Math.abs(y - 7) / 10;
      const span = 8 + Math.round(34 * Math.max(0, belly));
      const drop = y > 10 ? (y - 10) * 3 : 0;
      const skip = y < 3 ? 6 : 0;
      for (let back = skip; back < span + drop; back++) {
        const band = Math.min(bands.length - 1, Math.floor((back / 42) * bands.length));
        ctx.fillStyle = bands[band]!;
        const p = spot(back, y);
        ctx.fillRect(p.x, p.y, size, size);
      }
    }
    const face = [
      "..kkkkkkk..",
      ".krrrrrrrok",
      "koyyyyyygok",
      "kry.kyyk.yk",
      "kryyyyyyyyk",
      "kryyy.kyyyk",
      "kryykkkyyyk",
      "kogggggggok",
      ".kbbbbbbbk.",
      "..kkkkkkk..",
    ];
    const faceTone: Record<string, string> = {
      k: "#070708",
      r: "#ff4d6a",
      o: "#ff8a00",
      y: "#ffe14a",
      g: "#3dff6a",
      b: "#3d7bff",
    };
    const anchor = spot(18, 5);
    face.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const color = faceTone[row[x] ?? ""];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(anchor.x + x * 2.3, anchor.y + y * 2.3, 2.3, 2.3);
      }
    });
  }

  if (layer === "back" && cloth === "camo") {
    const size = 2.2;
    const along = vx * facing;
    const run = Math.max(-1, Math.min(1, along / 180));
    const rise = Math.max(-1, Math.min(1, -vy / 520));
    const bands = ["#6b8f3a", "#c2a15a", "#3d3428", "#2f4a22", "#8a6a3a", "#1c1c18", "#4e6b32", "#d2c08a"];
    for (let y = 0; y < 16; y++) {
      const belly = 1 - Math.abs(y - 6) / 9;
      const span = 10 + Math.round(36 * Math.max(0, belly));
      const drop = y > 9 ? (y - 9) * 3 : 0;
      for (let back = 0; back < span + drop; back++) {
        const ripple = Math.sin(t * 8 + back * 0.3 + y * 0.4) * (1.5 + Math.abs(run) * 2);
        const trail = back * Math.max(0, run) * 0.85;
        const flip = back * Math.max(0, -run) * 0.7;
        const band = (back + y * 3) % bands.length;
        ctx.fillStyle = bands[band]!;
        ctx.fillRect(-4 - back * size - trail + flip, -52 + y * size + ripple + rise * back * 0.3, size, size);
      }
    }
  }

  if (layer === "back" && cloth === "coat") {
    ctx.beginPath();
    ctx.moveTo(-14, -40);
    ctx.lineTo(-16, -8);
    ctx.quadraticCurveTo(-8, -2, 0, -6);
    ctx.quadraticCurveTo(10, -2, 16, -8);
    ctx.lineTo(14, -40);
    ctx.quadraticCurveTo(0, -34, -14, -40);
    ctx.fill();
  }
  if (layer === "front" && cloth === "coat") {
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-10, -38);
    ctx.lineTo(-6, -16);
    ctx.moveTo(10, -38);
    ctx.lineTo(6, -16);
    ctx.stroke();
    ctx.fillRect(-11, -40, 6, 3);
    ctx.fillRect(5, -40, 6, 3);
  }

  if (layer === "front" && cloth === "hood") {
    ctx.beginPath();
    ctx.moveTo(-12, -30);
    ctx.quadraticCurveTo(-16, -52, 0, -56);
    ctx.quadraticCurveTo(16, -52, 12, -30);
    ctx.quadraticCurveTo(0, -36, -12, -30);
    ctx.fill();
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-7, -34);
    ctx.quadraticCurveTo(0, -42, 7, -34);
    ctx.stroke();
  }

  if (layer === "front" && cloth === "cap") {
    const rows = [
      "..kkkkkk..",
      ".krrrrrrk.",
      "krrrrrrrrk",
      "krrrddrrrk",
      "krr.kk.rrk",
      "kr.k..k.rk",
      "kr......rk",
      "krr....rrk",
      ".krrrrrrk.",
    ];
    const tone: Record<string, string> = { r: "#e10600", d: "#8d0906", k: "#240406" };
    const size = 2;
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const color = tone[row[x] ?? ""];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(-10 + x * size, -62 + y * size, size, size);
      }
    });
    ctx.fillStyle = "#f4d0d0";
    ctx.fillRect(-2, -50, 2, 2);
    ctx.fillRect(0, -48, 2, 2);
    ctx.fillRect(2, -46, 2, 2);
  }

  if (layer === "front" && cloth === "scarf") {
    ctx.fillStyle = edge;
    ctx.beginPath();
    ctx.moveTo(-12, -34);
    ctx.quadraticCurveTo(0, -28, 12, -34);
    ctx.quadraticCurveTo(8, -30, 0, -26);
    ctx.quadraticCurveTo(-8, -30, -12, -34);
    ctx.fill();
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.moveTo(-8, -30);
    ctx.quadraticCurveTo(-12, -16, -6, -6);
    ctx.lineTo(-2, -8);
    ctx.quadraticCurveTo(-6, -16, -4, -30);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(6, -30);
    ctx.quadraticCurveTo(10, -12, 4, -2);
    ctx.lineTo(1, -4);
    ctx.quadraticCurveTo(4, -14, 3, -30);
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  if (layer === "front" && cloth === "veil") {
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.moveTo(-11, -50);
    ctx.quadraticCurveTo(-14, -28, -8, -12);
    ctx.lineTo(-3, -14);
    ctx.quadraticCurveTo(-6, -30, -2, -48);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(11, -50);
    ctx.quadraticCurveTo(14, -28, 8, -12);
    ctx.lineTo(3, -14);
    ctx.quadraticCurveTo(6, -30, 2, -48);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-10, -50);
    ctx.quadraticCurveTo(0, -58, 10, -50);
    ctx.stroke();
  }

  if (layer === "front" && cloth === "crown") {
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-13, -48);
    ctx.lineTo(-8, -62);
    ctx.lineTo(-3, -50);
    ctx.lineTo(0, -64);
    ctx.lineTo(3, -50);
    ctx.lineTo(8, -62);
    ctx.lineTo(13, -48);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = edge;
    ctx.fillRect(-1.2, -60, 2.4, 2.4);
  }

  if (layer === "front" && cloth === "wreath") {
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.arc(0, -46, 11, Math.PI * 0.15, Math.PI * 0.85, true);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-8, -52);
    ctx.quadraticCurveTo(-16, -66, -10, -74);
    ctx.moveTo(8, -52);
    ctx.quadraticCurveTo(16, -66, 10, -74);
    ctx.moveTo(-2, -56);
    ctx.lineTo(-6, -64);
    ctx.moveTo(3, -56);
    ctx.lineTo(7, -66);
    ctx.stroke();
  }

  if (layer === "front" && cloth === "cord") {
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -36);
    ctx.quadraticCurveTo(3, -28, 0, -20);
    ctx.stroke();
    ctx.fillStyle = edge;
    ctx.beginPath();
    ctx.arc(0, -18, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(0, -18, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = edge;
    ctx.fillRect(-1, -16, 2, 14);
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.lineTo(0, 4);
    ctx.lineTo(4, -2);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawBoulder(ctx: CanvasRenderingContext2D, sim: Sim, reduced: boolean) {
  const spec = sim.level.boulder;
  if (!spec) return;
  const r = 112;
  const scale = 7;
  const fall = sim.caged ? sim.cage : 0;
  const y = sim.stalkY - r + fall;
  const rows = COIN.length;
  const cols = COIN[0]!.length;
  ctx.save();
  ctx.translate(sim.stalkX, y);
  ctx.rotate(reduced ? 0 : sim.stalkX / r);
  ctx.fillStyle = "#070708";
  ctx.beginPath();
  ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f7f4ee";
  const ox = -(cols * scale) / 2;
  const oy = -(rows * scale) / 2;
  for (let py = 0; py < rows; py++) {
    const row = COIN[py]!;
    for (let px = 0; px < cols; px++) {
      if (row[px] !== "#") continue;
      ctx.fillRect(ox + px * scale, oy + py * scale, scale, scale);
    }
  }
  ctx.restore();
  if (sim.wake >= 1 && !sim.caged && !reduced) {
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#c8c8c4";
    ctx.beginPath();
    ctx.ellipse(sim.stalkX - r, sim.stalkY - 6, 34, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawTwin(
  ctx: CanvasRenderingContext2D,
  sprites: GenerationSprites | null,
  sim: Sim,
  reduced: boolean,
) {
  const spec = sim.level.hunter;
  if (!spec) return;
  const scale = 11;
  const center = sim.wake > 0 ? sim.stalkX : spec.x;
  const bottom = spec.surface;
  if (!sprites) return;
  const facing = sim.stalkDir < 0 ? "left" : "right";
  const walking = sim.wake >= 1 && !reduced;
  const frame = walking ? Math.floor(sim.t / 0.09) % 8 : 0;
  const rows = spriteFrame(sprites, facing, walking, frame, facing).frame.rows;
  const left = Math.round(center - (16 * scale) / 2);
  const top = Math.round(bottom - 16 * scale);
  const pixels: [number, number][] = [];
  rows.forEach((row, py) => {
    for (let px = 0; px < row.length; px++) if (row[px] === "#") pixels.push([px, py]);
  });
  ctx.save();
  ctx.fillStyle = "#f4f1ea";
  for (const [px, py] of pixels) {
    ctx.fillRect(left + px * scale - 3, top + py * scale - 3, scale + 6, scale + 6);
  }
  ctx.fillStyle = "#070708";
  for (const [px, py] of pixels) {
    ctx.fillRect(left + px * scale, top + py * scale, scale, scale);
  }
  const eye = sim.wake >= 1 ? 1 : 0.45 + Math.sin(sim.t * 2) * 0.15;
  ctx.shadowColor = "#f7f4ee";
  ctx.shadowBlur = sim.wake >= 1 ? 16 : 6;
  ctx.fillStyle = `rgba(247,244,238,${eye})`;
  const face = sim.stalkDir < 0 ? 4 : 9;
  ctx.fillRect(left + face * scale, top + 5 * scale, scale * 1.1, scale * 1.1);
  ctx.fillRect(left + (face + 2) * scale, top + 5 * scale, scale * 1.1, scale * 1.1);
  ctx.restore();
}

function drawFriend(
  ctx: CanvasRenderingContext2D,
  sprites: GenerationSprites | null,
  pose: { x: number; y: number; facing: 1 | -1; walking: boolean; anim: number; hurt: number; vx?: number; vy?: number },
  t: number,
  reduced: boolean,
  attract: boolean,
  cloth: string | null = null,
) {
  const body = attract
    ? { x: 2472, y: 368 - PH, facing: -1 as const, walking: false, anim: 0, hurt: 0, vx: 0, vy: 0 }
    : pose;
  const scale = 3;
  const bottom = body.y + PH;
  const center = body.x + PW / 2;
  if (!sprites) {
    ctx.strokeStyle = "rgba(244,241,234,0.8)";
    ctx.strokeRect(center - 8, bottom - 28, 16, 28);
    return;
  }
  const facing = body.facing === -1 ? "left" : "right";
  const frame = reduced || attract ? 0 : Math.floor(body.anim / 0.11) % 8;
  const rows = spriteFrame(sprites, facing, body.walking, frame, facing).frame.rows;
  const left = Math.round(center - (16 * scale) / 2);
  const top = Math.round(bottom - 16 * scale);
  if (cloth) drawOutfit(ctx, cloth, center, bottom, body.facing, "back", t, body.vx ?? 0, body.vy ?? 0);
  ctx.save();
  if (body.hurt > 0 && Math.floor(t * 24) % 2 === 0) ctx.globalAlpha = 0.35;
  const pixels: [number, number][] = [];
  rows.forEach((row, py) => {
    for (let px = 0; px < row.length; px++) if (row[px] === "#") pixels.push([px, py]);
  });
  ctx.fillStyle = "#f4f1ea";
  for (const [px, py] of pixels) {
    ctx.fillRect(left + px * scale - 2, top + py * scale - 2, scale + 4, scale + 4);
  }
  ctx.fillStyle = "#070708";
  for (const [px, py] of pixels) {
    ctx.fillRect(left + px * scale, top + py * scale, scale, scale);
  }
  ctx.restore();
  if (cloth) drawOutfit(ctx, cloth, center, bottom, body.facing, "front", t, body.vx ?? 0, body.vy ?? 0);
}

const COIN = [
  "..........############..........",
  ".........##############.........",
  ".......###............###.......",
  ".......#................#.......",
  "....####................####....",
  "....##....................##....",
  "....##....................##....",
  "....##....####....####....##....",
  "...#.....#####....#####.....#...",
  "...#.....#####....#####.....#...",
  "...#.....##############.....#...",
  "...#.....##############.....#...",
  "...#.....###..####..###.....#...",
  "...#.....###..####..###.....#...",
  "...#.....#####....#####.....#...",
  "...#.....#####....#####.....#...",
  "...#.....##############.....#...",
  "...#.....##############.....#...",
  "...#.........######.........#...",
  "...#..........####..........#...",
  "....##........####........##....",
  "....##....................##....",
  "....##....................##....",
  "....####................####....",
  ".......#................#.......",
  ".......###............###.......",
  ".........##############.........",
  "..........############..........",
];

function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, reduced: boolean) {
  const bob = reduced ? 0 : Math.sin(t * 2.2 + x * 0.01) * 3.5;
  let turn = 1;
  if (!reduced) {
    const cycle = (((t * 0.35 + x * 0.001) % 1) + 1) % 1;
    if (cycle > 0.78) {
      const u = (cycle - 0.78) / 0.22;
      turn = Math.max(0.14, Math.abs(Math.cos(u * Math.PI)));
    }
  }
  const scale = 1;
  const rows = COIN.length;
  const cols = COIN[0]!.length;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(turn, 1);
  ctx.fillStyle = "#070708";
  ctx.beginPath();
  ctx.arc(0, 0, cols * scale * 0.48, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f7f4ee";
  const ox = -(cols * scale) / 2;
  const oy = -(rows * scale) / 2;
  for (let py = 0; py < rows; py++) {
    const row = COIN[py]!;
    for (let px = 0; px < cols; px++) {
      if (row[px] !== "#") continue;
      ctx.fillRect(ox + px * scale, oy + py * scale, scale + 0.25, scale + 0.25);
    }
  }
  ctx.restore();
}

function drawScorpion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: number,
  t: number,
  reduced: boolean,
) {
  const step = reduced ? 0 : Math.sin(t * 14) * 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((dir < 0 ? -1 : 1) * 1.7, 1.7);
  ctx.fillStyle = "#141416";
  ctx.strokeStyle = "#eceae4";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, 2, 7, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1, -1);
  ctx.quadraticCurveTo(-6, -12 + step, 1, -16);
  ctx.quadraticCurveTo(8, -12, 5, -2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1, -16);
  ctx.lineTo(5, -19);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-6, 1);
  ctx.quadraticCurveTo(-12, -4, -14, 2);
  ctx.moveTo(6, 1);
  ctx.quadraticCurveTo(12, -4, 14, 2);
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const lift = reduced ? 0 : Math.sin(t * 16 + i) * 1.5;
    ctx.beginPath();
    ctx.moveTo(-2, 3);
    ctx.lineTo(-8, 6 + lift + i);
    ctx.moveTo(2, 3);
    ctx.lineTo(8, 6 - lift + i);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSpider(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: number,
  ceil: number | null,
  warn: boolean,
  t: number,
  reduced: boolean,
  kind: "spider" | "scorpion" = "spider",
) {
  if (kind === "scorpion") {
    drawScorpion(ctx, x, y, dir, t, reduced);
    return;
  }
  if (ceil != null) {
    ctx.strokeStyle = "rgba(243,240,232,0.72)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, ceil);
    ctx.lineTo(x, y - 8);
    ctx.stroke();
  }
  const twitch = !reduced && warn ? Math.sin(t * 28) * 1.4 : 0;
  const legT = reduced ? 0 : t * (warn ? 26 : 12);
  ctx.save();
  ctx.translate(x, y + twitch);
  ctx.scale((dir < 0 ? -1 : 1) * 1.45, 1.45);
  const legs = (color: string, width: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      const side = i < 2 ? -1 : 1;
      const lift = Math.sin(legT + i * 1.4) * (reduced ? 0 : 3.2);
      const rootX = side > 0 ? 3 : -1;
      ctx.beginPath();
      ctx.moveTo(rootX, 0);
      ctx.quadraticCurveTo(side * 7, -7 - lift, side * (11 + i), 5 + lift);
      ctx.stroke();
    }
  };
  const body = (color: string, swell: number) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(-3, 1, 6.2 + swell, 4.4 + swell, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4.5, -0.5, 3.3 + swell * 0.5, 2.8 + swell * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  legs("#f4f1ea", 3.2);
  body("#f4f1ea", 1.4);
  legs("#070708", 1.35);
  body("#070708", 0);
  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(5.1, -1.6, 1.2, 1.2);
  ctx.fillRect(6.8, -1.6, 1.2, 1.2);
  ctx.restore();
}

function drawGator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: number,
  t: number,
  reduced: boolean,
) {
  const swim = reduced ? 0 : Math.sin(t * 2.4) * 2;
  const snap = !reduced && Math.sin(t * 1.6 + x * 0.01) > 0.72;
  ctx.save();
  ctx.translate(x, y + swim);
  ctx.scale(dir < 0 ? -1.9 : 1.9, 1.9);
  const body = () => {
    ctx.beginPath();
    ctx.ellipse(-8, 3, 24, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, -1);
    ctx.lineTo(42, snap ? -14 : -4);
    ctx.lineTo(42, snap ? 8 : 5);
    ctx.lineTo(8, 7);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-28, 3);
    ctx.quadraticCurveTo(-46, 10, -58, -4);
    ctx.quadraticCurveTo(-44, 8, -28, 8);
    ctx.fill();
  };
  ctx.fillStyle = "#f4f1ea";
  ctx.save();
  ctx.scale(1.08, 1.18);
  body();
  ctx.restore();
  ctx.fillStyle = "#070708";
  body();
  ctx.fillStyle = "#f4f1ea";
  for (let i = 0; i < 6; i++) ctx.fillRect(14 + i * 4, snap ? -2 : 0, 1.3, snap ? 5 : 3);
  ctx.fillRect(4, -5, 2.6, 2.6);
  ctx.fillRect(9, -4, 1.8, 1.8);
  ctx.restore();
}

function drawRocket(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: number,
  t: number,
  reduced: boolean,
) {
  const flame = reduced ? 8 : 8 + Math.sin(t * 28) * 4;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir < 0 ? -1 : 1, 1);
  ctx.fillStyle = "#f4f1ea";
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(-8 - flame, -3);
  ctx.lineTo(-8 - flame * 0.6, 0);
  ctx.lineTo(-8 - flame, 3);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#070708";
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(6, -5);
  ctx.lineTo(-10, -5);
  ctx.lineTo(-10, 5);
  ctx.lineTo(6, 5);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-8, -5);
  ctx.lineTo(-14, -9);
  ctx.lineTo(-4, -5);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-8, 5);
  ctx.lineTo(-14, 9);
  ctx.lineTo(-4, 5);
  ctx.fill();
  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(4, -1.2, 2, 2.4);
  ctx.restore();
}

function drawRat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: number,
  t: number,
  reduced: boolean,
) {
  const step = reduced ? 0 : Math.sin(t * 16) * 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((dir < 0 ? -1 : 1) * 1.8, 1.8);
  ctx.fillStyle = "#070708";
  ctx.beginPath();
  ctx.ellipse(0, 4, 9, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(8, 2, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(13, -2);
  ctx.lineTo(11, 2);
  ctx.fill();
  ctx.strokeStyle = "#070708";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-8, 5);
  ctx.quadraticCurveTo(-16, 8 + step, -20, 2);
  ctx.stroke();
  ctx.fillRect(-4, 6, 1.4, 4 + step);
  ctx.fillRect(2, 6, 1.4, 4 - step);
  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(10, 1, 1.4, 1.4);
  ctx.restore();
}

function drawTurtle(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, t: number) {
  const limp = Math.sin(t * 3) * 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir < 0 ? -1 : 1, 1);
  ctx.fillStyle = "#070708";
  ctx.beginPath();
  ctx.ellipse(0, 8, 16, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(2, 4, 11, 7, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(12, 6 + limp, 12, 4);
  ctx.beginPath();
  ctx.ellipse(24, 6 + limp, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-6, 14, 3, 6);
  ctx.fillRect(6, 14, 3, 6);
  ctx.strokeStyle = "rgba(244,241,234,0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-4, 6);
  ctx.lineTo(4, 2);
  ctx.lineTo(2, 10);
  ctx.stroke();
  ctx.fillStyle = "#f4f1ea";
  ctx.beginPath();
  ctx.arc(23, 5 + limp, 1.3, 0, Math.PI * 2);
  ctx.arc(26, 5 + limp, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHunt(ctx: CanvasRenderingContext2D, sim: Sim, reduced: boolean) {
  const spec = sim.level.stalker;
  if (!spec) return;
  const ground = spec.surface;
  ctx.fillStyle = "#070708";
  ctx.beginPath();
  ctx.moveTo(spec.x - 58, ground + 8);
  ctx.quadraticCurveTo(spec.x, ground - 22, spec.x + 62, ground + 8);
  ctx.fill();

  if (sim.wake > 0) {
    ctx.save();
    const top = ground - 230 * sim.wake;
    ctx.beginPath();
    ctx.rect(sim.stalkX - 140, top, 280, ground - top + 10);
    ctx.clip();
    drawBeast(ctx, sim.stalkX, ground, sim.stalkDir, sim.t, reduced, sim.caged, sim.wake);
    ctx.restore();
  }

  ctx.fillStyle = "#070708";
  ctx.fillRect(spec.cageX0, ground - 156, 8, 156);
  ctx.fillRect(spec.cageX1, ground - 156, 8, 156);
  ctx.save();
  ctx.translate(0, (1 - sim.cage) * -176);
  const span = spec.cageX1 - spec.cageX0;
  for (let i = 0; i <= 7; i++) ctx.fillRect(spec.cageX0 + (span * i) / 7, ground - 150, 4, 150);
  ctx.fillRect(spec.cageX0, ground - 156, span + 8, 8);
  ctx.restore();

  ctx.fillStyle = sim.caged ? "rgba(243,240,232,0.92)" : "rgba(243,240,232,0.4)";
  ctx.fillRect(spec.plate.x, ground - 5, spec.plate.w, 4);
}

function drawBeast(
  ctx: CanvasRenderingContext2D,
  x: number,
  ground: number,
  dir: number,
  t: number,
  reduced: boolean,
  caged: boolean,
  rise: number,
) {
  const step = reduced || caged ? 0 : Math.sin(t * 7) * 12;
  const swing = reduced ? 0 : Math.sin(t * (caged ? 2.4 : 5.5));
  const swingBack = reduced ? 0 : Math.sin(t * (caged ? 2.4 : 5.5) + 1.7);
  ctx.save();
  ctx.translate(x, ground);
  ctx.scale(dir < 0 ? -1 : 1, 1);
  ctx.fillStyle = "#070708";
  ctx.strokeStyle = "#070708";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-10, -82);
  ctx.lineTo(-22, -40 + step);
  ctx.lineTo(-4, -10);
  ctx.lineTo(-18, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(14, -74);
  ctx.lineTo(30, -28 - step);
  ctx.lineTo(8, -8);
  ctx.lineTo(24, 0);
  ctx.lineTo(36, -4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-18, -74);
  ctx.quadraticCurveTo(-24, -124, 8, -138);
  ctx.quadraticCurveTo(48, -126, 34, -80);
  ctx.quadraticCurveTo(8, -66, -18, -74);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-6, -108);
  ctx.quadraticCurveTo(-34 + swingBack * 14, -86, -62 + swingBack * 22, -64 + swingBack * 16);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(20, -112);
  ctx.quadraticCurveTo(48 + swing * 12, -94, 72 + swing * 20, -70 + swing * 18);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(6, -142, 15, 18, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2.3;
  const antlers: [number, number, number, number, number, number][] = [
    [-8, -154, -36, -196, -62, -214],
    [2, -160, -8, -206, -16, -236],
    [14, -162, 34, -204, 52, -230],
    [18, -154, 54, -190, 88, -204],
    [8, -158, 18, -190, 6, -220],
  ];
  for (const [x0, y0, x1, y1, x2, y2] of antlers) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(x1, y1, x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo((x1 + x2) / 2, (y1 + y2) / 2);
    ctx.lineTo((x1 + x2) / 2 + 7, (y1 + y2) / 2 - 14);
    ctx.stroke();
  }
  ctx.lineWidth = 1.15;
  for (let i = 0; i < 5; i++) {
    const vineX = -10 + i * 11;
    ctx.beginPath();
    ctx.moveTo(vineX, -108);
    ctx.quadraticCurveTo(vineX + 4, -74, vineX - 2, -42);
    ctx.stroke();
  }
  if (rise > 0.55) {
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(16, -146, 2.4, 2.4);
  }
  ctx.restore();
}

function drawCrow(ctx: CanvasRenderingContext2D, x: number, y: number, flap: number, face: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  ctx.fillStyle = "#070708";
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(8, -1);
  ctx.lineTo(16, 1);
  ctx.lineTo(8, 3);
  ctx.fill();
  ctx.beginPath();
  const lift = Math.sin(flap) * 10;
  ctx.moveTo(-2, -2);
  ctx.quadraticCurveTo(-16, -14 - lift, -24, -2);
  ctx.quadraticCurveTo(-12, -4, -2, 0);
  ctx.fill();
  ctx.restore();
}

function drawShrine(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.fillStyle = "#070708";
  ctx.fillRect(x, y, 8, 46);
  const g = ctx.createRadialGradient(x + 4, y, 1, x + 4, y, 18 + Math.sin(t * 2) * 2);
  g.addColorStop(0, "rgba(244,241,234,0.95)");
  g.addColorStop(1, "rgba(244,241,234,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x + 4, y, 18, 0, Math.PI * 2);
  ctx.fill();
}

function bellSurface(sim: Sim, x: number, hint: number) {
  let best: number | null = null;
  let bestDist = 90;
  for (const plat of sim.level.platforms) {
    if (plat.kind === "gate" || plat.kind === "rope" || plat.gear) continue;
    if (x < plat.x + 4 || x > plat.x + plat.w - 4) continue;
    const dist = Math.abs(plat.y - hint);
    if (dist < bestDist) {
      bestDist = dist;
      best = plat.y;
    }
  }
  return best ?? hint;
}

function drawBell(ctx: CanvasRenderingContext2D, x: number, ground: number, lit: boolean, t: number) {
  ctx.fillStyle = "#070708";
  ctx.fillRect(x - 8, ground - 3, 16, 5);
  ctx.fillRect(x - 2, ground - 34, 4, 32);
  ctx.beginPath();
  ctx.arc(x, ground - 36, 8, Math.PI, 0);
  ctx.lineTo(x + 8, ground - 26);
  ctx.lineTo(x - 8, ground - 26);
  ctx.fill();
  if (!lit) return;
  const pulse = 28 + Math.sin(t * 3) * 3;
  const g = ctx.createRadialGradient(x, ground - 34, 2, x, ground - 34, pulse);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.45, "rgba(244,241,234,0.45)");
  g.addColorStop(1, "rgba(244,241,234,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, ground - 34, pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f7f4ee";
  ctx.beginPath();
  ctx.arc(x, ground - 36, 8, Math.PI, 0);
  ctx.lineTo(x + 8, ground - 26);
  ctx.lineTo(x - 8, ground - 26);
  ctx.fill();
  ctx.fillRect(x - 1.5, ground - 24, 3, 8);
}

function drawJungle(ctx: CanvasRenderingContext2D, t: number, reduced: boolean) {
  ctx.fillStyle = "rgba(5,5,6,0.5)";
  for (let i = 0; i < 20; i++) {
    const x = -120 + i * 250;
    const y = 150 + (i % 4) * 28;
    ctx.beginPath();
    ctx.ellipse(x, y, 170, 78, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 50, y + 16, 70, 18, -0.5, 0, Math.PI * 2);
    ctx.ellipse(x - 40, y + 22, 64, 14, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(5,5,6,0.75)";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    const vines = 4;
    for (let v = 0; v < vines; v++) {
      const vx = x - 70 + v * 42;
      const sway = reduced ? 0 : Math.sin(t * 0.7 + i + v) * 10;
      const drop = 140 + ((i + v) % 3) * 36;
      ctx.beginPath();
      ctx.moveTo(vx, y + 10);
      ctx.quadraticCurveTo(vx + sway, y + drop * 0.55, vx + sway * 0.3, y + drop);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(vx + sway * 0.3, y + drop, 10, 4, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (let i = 0; i < 16; i++) {
    const x = i * 300;
    ctx.save();
    ctx.translate(x, 490);
    ctx.fillStyle = "rgba(5,5,6,0.72)";
    for (let f = 0; f < 6; f++) {
      const a = -1.15 + f * 0.42;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 34, Math.sin(a) * 16 - 8, 30, 7, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawCave(ctx: CanvasRenderingContext2D, camera: Camera, t: number, reduced: boolean, lit: boolean) {
  const world = 6600;
  const roof = (x: number) => 20 + x * 0.28;
  ctx.fillStyle = lit ? "#4a4c50" : "#050506";
  ctx.beginPath();
  ctx.moveTo(-120, -400);
  ctx.lineTo(world + 160, -400);
  ctx.lineTo(world + 160, roof(world));
  for (let x = world; x >= -120; x -= 36) {
    const tooth = (x * 17) % 46;
    ctx.lineTo(x, roof(x) - tooth);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#070708";
  for (let x = -40; x < world; x += 28) {
    const top = roof(x) - 20;
    const h = 30 + ((x * 19) % 84);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + 5, top + h);
    ctx.lineTo(x + 12, top);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(camera.x * 0.28, camera.y * 0.08);
  ctx.fillStyle = "rgba(6,6,8,0.85)";
  for (let i = 0; i < 8; i++) {
    const x = i * 680;
    const y = roof(x) + 80;
    ctx.beginPath();
    ctx.moveTo(x, y + 220);
    ctx.quadraticCurveTo(x + 40, y - 20, x + 180, y + 30);
    ctx.quadraticCurveTo(x + 300, y + 70, x + 340, y + 240);
    ctx.lineTo(x, y + 240);
    ctx.fill();
  }
  ctx.restore();

  if (lit) {
    const wash = ctx.createLinearGradient(0, 280, 0, 1100);
    wash.addColorStop(0, "rgba(214,216,220,0.62)");
    wash.addColorStop(0.18, "rgba(120,126,134,0.38)");
    wash.addColorStop(1, "rgba(18,20,24,0.15)");
    ctx.fillStyle = wash;
  } else {
    ctx.fillStyle = "#0c1014";
  }
  ctx.fillRect(-40, 300, world + 80, 2100);
  const ripples = lit ? 18 : 12;
  if (!reduced) {
    for (let i = 0; i < ripples; i++) {
      const y = 312 + i * (lit ? 16 : 22);
      const alpha = lit ? Math.max(0.05, 0.34 - i * 0.016) : Math.max(0.03, 0.12 - i * 0.008);
      ctx.strokeStyle = `rgba(230,232,236,${alpha})`;
      ctx.lineWidth = lit ? 1.4 : 1;
      ctx.beginPath();
      for (let x = -40; x <= world; x += 28) {
        const wave = Math.sin(t * (lit ? 1.8 : 1.3) + x * 0.02 + i) * (lit ? 4 : 3);
        if (x === -40) ctx.moveTo(x, y + wave);
        else ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }
  }

  ctx.save();
  ctx.fillStyle = "#070708";
  for (let x = 40; x < world; x += 64) {
    const h = 18 + ((x * 13) % 54);
    const base = 360 + x * 0.22;
    ctx.beginPath();
    ctx.moveTo(x, base + h);
    ctx.lineTo(x + 7, base);
    ctx.lineTo(x + 16, base + h);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(camera.x * 0.4, camera.y * 0.1);
  drawCaveBats(ctx, t, reduced, roof);
  ctx.restore();

  const shades = [
    { x: -80, w: 1800, c: lit ? "rgba(186,188,192,0.2)" : "rgba(28,28,32,0.2)" },
    { x: 1720, w: 1700, c: lit ? "rgba(86,130,64,0.32)" : "rgba(16,36,14,0.38)" },
    { x: 3420, w: 1700, c: lit ? "rgba(150,96,52,0.3)" : "rgba(42,22,12,0.4)" },
    { x: 5120, w: 1600, c: lit ? "rgba(72,92,168,0.32)" : "rgba(8,12,36,0.48)" },
  ];
  for (const shade of shades) {
    ctx.fillStyle = shade.c;
    ctx.fillRect(shade.x, -240, shade.w, 2800);
  }

  if (!reduced) {
    ctx.lineWidth = 1;
    for (let i = 0; i < 36; i++) {
      const x = (i * 149) % world;
      const top = roof(x) + 28 + ((i * 11) % 24);
      const cycle = ((t * 0.55 + i * 0.13) % 1 + 1) % 1;
      const drop = top + cycle * 180;
      ctx.strokeStyle = lit ? "rgba(236,238,242,0.75)" : "rgba(190,192,196,0.28)";
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + 22);
      ctx.stroke();
      ctx.fillStyle = lit ? "rgba(244,246,248,0.9)" : "rgba(210,212,216,0.4)";
      ctx.fillRect(x - 1, drop, 2, 4);
    }
  }

  if (lit) {
    ctx.fillStyle = "rgba(232,234,238,0.22)";
    ctx.fillRect(-120, -400, world + 280, 2600);
  }
}

function drawCaveBats(
  ctx: CanvasRenderingContext2D,
  t: number,
  reduced: boolean,
  roof: (x: number) => number,
) {
  ctx.save();
  ctx.fillStyle = "#070708";
  ctx.shadowColor = "#f4f1ea";
  ctx.shadowBlur = 8;
  for (let i = 0; i < 32; i++) {
    const x = 80 + i * 160;
    const hang = roof(x) + 8;
    ctx.fillRect(x, hang, 2, 12);
    ctx.beginPath();
    ctx.moveTo(x + 1, hang + 12);
    ctx.lineTo(x - 8, hang + 18);
    ctx.lineTo(x + 1, hang + 15);
    ctx.lineTo(x + 10, hang + 18);
    ctx.closePath();
    ctx.fill();
  }
  for (let i = 0; i < 22; i++) {
    const base = 80 + i * 230;
    const x = base + (reduced ? 0 : Math.sin(t * 0.35 + i) * 70 + ((t * 22 + i * 30) % 160) - 80);
    const y = roof(base) + 70 + (i % 3) * 24 + (reduced ? 0 : Math.sin(t * 2 + i) * 10);
    const flap = reduced ? 0.4 : Math.sin(t * 9 + i) * 0.8;
    const face = i % 2 === 0 ? 1 : -1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(face, 1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-10, -12 - flap * 10, -22, -1);
    ctx.quadraticCurveTo(-8, 3, 0, 1);
    ctx.quadraticCurveTo(8, 3, 22, -1);
    ctx.quadraticCurveTo(10, -12 - flap * 10, 0, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 1.5, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawMirrorFog(ctx: CanvasRenderingContext2D, camera: Camera, sim: Sim, reduced: boolean) {
  ctx.save();
  ctx.translate(camera.x * 0.62, camera.y * 0.2);
  drawJungle(ctx, sim.t, reduced);
  ctx.restore();

  const wash = ctx.createLinearGradient(0, 360, 0, 520);
  wash.addColorStop(0, "rgba(8,8,10,0)");
  wash.addColorStop(0.55, "rgba(196,196,192,0.16)");
  wash.addColorStop(1, "rgba(8,8,10,0)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 340, sim.level.worldW, 200);

  ctx.fillStyle = "#101114";
  ctx.fillRect(0, 500, sim.level.worldW, 1400);
  if (!reduced) {
    ctx.strokeStyle = "rgba(220,220,216,0.12)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 18; i++) {
      const y = 512 + i * 28 + Math.sin(sim.t * 0.6 + i) * 1.5;
      const fade = Math.max(0.04, 0.14 - i * 0.006);
      ctx.strokeStyle = `rgba(220,220,216,${fade})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(sim.level.worldW, y + 2);
      ctx.stroke();
    }
  }

}

function drawMoonFog(ctx: CanvasRenderingContext2D, camera: Camera, t: number, reduced: boolean) {
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.fillStyle = "#f4f6f8";
  for (let i = 0; i < 240; i++) {
    const sx = ((i * 137) % Math.max(1, Math.floor(camera.w))) + (i % 5);
    const sy = ((i * 89) % Math.max(1, Math.floor(camera.h))) + (i % 3);
    ctx.fillRect(sx, sy, i % 11 === 0 ? 2 : 1, i % 11 === 0 ? 2 : 1);
  }
  const sx = camera.w * 0.62;
  const sy = camera.h * 0.22;
  const star = ctx.createRadialGradient(sx, sy, 4, sx, sy, 180);
  star.addColorStop(0, "rgba(255,255,255,0.95)");
  star.addColorStop(0.2, "rgba(255,255,255,0.35)");
  star.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = star;
  ctx.beginPath();
  ctx.arc(sx, sy, 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(sx, sy, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx - 90, sy);
  ctx.lineTo(sx + 90, sy);
  ctx.moveTo(sx, sy - 70);
  ctx.lineTo(sx, sy + 70);
  ctx.stroke();
  ctx.fillStyle = "#d5d7dc";
  ctx.beginPath();
  ctx.arc(camera.w * 0.28, camera.h * 0.16, 16, 0.5, Math.PI + 0.4);
  ctx.lineTo(camera.w * 0.28 + 6, camera.h * 0.16);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(camera.w * 0.84, camera.h * 0.38, 8, 0.6, Math.PI + 0.2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(camera.x * 0.35, camera.y * 0.35);
  ctx.fillStyle = "#14161a";
  for (let i = 0; i < 8; i++) {
    const y = -200 + i * 280;
    ctx.beginPath();
    ctx.moveTo(-40, y);
    ctx.lineTo(280, y + 40);
    ctx.lineTo(340, y + 160);
    ctx.lineTo(40, y + 210);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(1180, y + 80);
    ctx.lineTo(1680, y + 20);
    ctx.lineTo(1720, y + 240);
    ctx.lineTo(1100, y + 280);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#0c0c0e";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(180, y + 90);
    ctx.lineTo(160, y + 220);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(150, y + 250, 36, 28, 0.2, 0, Math.PI * 2);
    ctx.fill();
    const drift = reduced ? 0 : Math.sin(t * 0.4 + i) * 8;
    ctx.beginPath();
    ctx.ellipse(620 + drift, y + 140, 70, 16, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHangFrame(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, bird: boolean) {
  const swing = Math.sin(t) * 3;
  ctx.save();
  ctx.translate(x + swing, y);
  ctx.strokeStyle = "#141416";
  ctx.fillStyle = "#121214";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 78);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.strokeRect(-30, 78, 60, 86);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-38, 118);
  ctx.lineTo(38, 118);
  ctx.stroke();
  ctx.fillRect(-36, 72, 10, 10);
  ctx.fillRect(26, 72, 10, 10);
  ctx.fillRect(-36, 156, 10, 10);
  ctx.fillRect(26, 156, 10, 10);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 176, 7, Math.PI, 0);
  ctx.stroke();
  ctx.fillRect(-8, 176, 16, 20);
  if (bird) drawCrow(ctx, -8, 70, t * 6, 1);
  ctx.restore();
}

function drawLatchFog(ctx: CanvasRenderingContext2D, camera: Camera, t: number, reduced: boolean) {
  ctx.save();
  ctx.translate(camera.x * 0.62, camera.y * 0.18);
  ctx.fillStyle = "rgba(28,28,30,0.72)";
  for (let x = -300; x < 6400; x += 980) {
    ctx.beginPath();
    ctx.moveTo(x, 460);
    ctx.lineTo(x + 30, 300);
    ctx.lineTo(x + 70, 360);
    ctx.lineTo(x + 120, 210);
    ctx.lineTo(x + 160, 340);
    ctx.lineTo(x + 230, 160);
    ctx.lineTo(x + 280, 390);
    ctx.lineTo(x + 360, 240);
    ctx.lineTo(x + 430, 470);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 700, 190);
    ctx.lineTo(x + 760, 470);
    ctx.lineTo(x + 960, 490);
    ctx.lineTo(x + 930, 230);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(camera.x * 0.3, 0);
  ctx.fillStyle = "rgba(210,208,204,0.22)";
  ctx.fillRect(-200, 250, 7600, 90);
  ctx.fillRect(-200, 360, 7600, 70);
  ctx.restore();

  ctx.save();
  ctx.translate(camera.x * 0.22, camera.y * 0.04);
  ctx.strokeStyle = "#161618";
  ctx.lineCap = "round";
  for (let x = -200; x < 6800; x += 1200) {
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(x, 36);
    ctx.quadraticCurveTo(x + 480, -16, x + 1040, 58);
    ctx.stroke();
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 70 + i * 110, 28 + (i % 3) * 8);
      ctx.quadraticCurveTo(x + 30 + i * 100, 90, x + 10 + i * 108, 160);
      ctx.stroke();
    }
    drawHangFrame(ctx, x + 220, 24, reduced ? 0 : t * 0.6, true);
    drawHangFrame(ctx, x + 620, 40, reduced ? 0.4 : t * 0.6 + 1.2, false);
  }
  ctx.restore();
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  sim: Sim,
  sprites: GenerationSprites | null,
  camera: Camera,
  reduced: boolean,
  dt: number,
  attract: boolean,
  ghosts: readonly Ghost[] = [],
  lamp = false,
  gloom = 0,
  cloth: string | null = null,
) {
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  const canvas = ctx.canvas;
  const bw = Math.max(1, Math.floor(cssW * dpr));
  const bh = Math.max(1, Math.floor(cssH * dpr));
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const skyStops = SKY[sim.level.id] ?? SKY.shore!;
  const sky = ctx.createLinearGradient(0, 0, 0, cssH);
  sky.addColorStop(0, skyStops[0]);
  sky.addColorStop(0.42, skyStops[1]);
  sky.addColorStop(0.72, skyStops[2]);
  sky.addColorStop(1, skyStops[3]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, cssW, cssH);

  const lightWorldX = sim.level.light.x;
  const lightWorldY = sim.level.light.y;
  const lx = ((lightWorldX - camera.x) / camera.w) * cssW;
  const ly = ((lightWorldY - camera.y) / camera.h) * cssH;
  const glow = ctx.createRadialGradient(lx, ly, 10, lx, ly, cssW * 0.55);
  glow.addColorStop(0, "rgba(255,255,255,0.92)");
  glow.addColorStop(0.25, "rgba(230,230,226,0.45)");
  glow.addColorStop(1, "rgba(230,230,226,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, cssW, cssH);

  const scale = cssW / camera.w;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-camera.x, -camera.y);

  if (sim.level.id === "roof") {
    drawSkyline(ctx, camera);
    drawRareSign(ctx, sim.t, reduced);
  } else if (sim.level.id === "shore" || sim.level.id === "antler") {
    ctx.save();
    ctx.translate(camera.x * 0.72, camera.y * 0.4);
    for (const tree of SHORE_FAR) drawDeadwood(ctx, tree, 0.42);
    ctx.restore();
    drawBranch(ctx);
    ctx.save();
    ctx.translate(camera.x * 0.4, camera.y * 0.15);
    for (const tree of SHORE_NEAR) drawDeadwood(ctx, tree, 0.88);
    ctx.restore();
  } else if (sim.level.id === "moon") {
    drawMoonFog(ctx, camera, sim.t, reduced);
  } else if (sim.level.id === "mirror") {
    drawMirrorFog(ctx, camera, sim, reduced);
  } else if (sim.level.id === "tunnel") {
    drawCave(ctx, camera, sim.t, reduced, gloom <= 0);
  } else if (sim.level.id === "latch") {
    drawLatchFog(ctx, camera, sim.t, reduced);
  } else if (sim.level.id === "gale") {
    drawGaleStorm(ctx, camera, sim.t, reduced);
  } else if (sim.level.id === "choir") {
    drawChoirGear(ctx, camera, sim.t, reduced);
  } else if (sim.level.id === "gear") {
    drawGearHall(ctx, camera, sim, reduced);
  } else {
    ctx.save();
    ctx.translate(camera.x * 0.72, camera.y * 0.4);
    for (const tree of DISTANT) drawTree(ctx, tree, 0.28);
    ctx.restore();

    ctx.save();
    ctx.translate(camera.x * 0.4, camera.y * 0.15);
    for (const tree of MID) drawTree(ctx, tree, 0.55);
    ctx.restore();
  }

  drawTerrain(ctx, sim, reduced);
  if (sim.level.id === "roof") drawDrainTrash(ctx, sim.t, reduced);
  if (sim.level.combo) drawLatchLock(ctx, sim);

  for (const plate of sim.level.plates) {
    const hot = (sim.latch[plate.id] ?? 0) > 0;
    drawPlate(ctx, plate, hot);
  }

  for (const pose of spiderPoses(sim, reduced)) {
    if (sim.level.id === "tunnel") {
      ctx.save();
      ctx.shadowColor = "#f7f4ee";
      ctx.shadowBlur = 14;
      drawSpider(ctx, pose.x, pose.y, pose.dir, pose.ceil, pose.warn, sim.t, reduced, pose.kind);
      ctx.restore();
    } else {
      drawSpider(ctx, pose.x, pose.y, pose.dir, pose.ceil, pose.warn, sim.t, reduced, pose.kind);
    }
  }

  for (const moth of sim.level.moths) {
    if (!sim.moths.has(moth.id)) drawCoin(ctx, moth.x, moth.y, sim.t, reduced);
  }

  for (const zone of sim.level.shrines) {
    drawShrine(ctx, zone.x + zone.w / 2 - 4, zone.y + zone.h - 8, sim.t);
  }
  for (const stand of sim.level.lamps ?? []) {
    drawLantern(ctx, stand.x + stand.w / 2, stand.y + 18, sim.t);
  }
  for (const bell of sim.level.beacons) {
    const x = bell.x + bell.w / 2;
    drawBell(ctx, x, bellSurface(sim, x, bell.y + bell.h), sim.beacons.has(bell.id), sim.t);
  }

  if (sim.level.pit && sim.level.id !== "tunnel" && camera.x < sim.level.pit.x1 && camera.x + camera.w > sim.level.pit.x0) {
    drawThorns(ctx, sim.level.pit);
  }

  if (sim.level.introCrow) {
    const perch = perchPosition(sim);
    if (!perch.gone) drawCrow(ctx, perch.x, perch.y, sim.t * 9, 1);
  }
  for (const bird of birdSpots(sim, reduced)) {
    if (bird.kind === "rat") drawRat(ctx, bird.x, bird.y, bird.dir, sim.t, reduced);
    else if (bird.kind === "turtle") drawTurtle(ctx, bird.x, bird.y, bird.dir, sim.t);
    else if (bird.kind === "gator") drawGator(ctx, bird.x, bird.y, bird.dir, sim.t, reduced);
    else if (bird.kind === "rocket") drawRocket(ctx, bird.x, bird.y, bird.dir, sim.t, reduced);
    else drawCrow(ctx, bird.x, bird.y, sim.t * 14, bird.dir);
  }

  if (sim.level.stalker) drawHunt(ctx, sim, reduced);
  if (sim.level.hunter) drawTwin(ctx, sprites, sim, reduced);
  if (sim.level.boulder) drawBoulder(ctx, sim, reduced);

  const goal = sim.level.goal;
  const doorX = goal.x + goal.w / 2 - 9;
  const locked = sim.doorLocked;
  const door = ctx.createLinearGradient(doorX, goal.y, doorX, goal.y + goal.h);
  door.addColorStop(0, "rgba(255,255,255,0)");
  door.addColorStop(0.5, locked ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.85)");
  door.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = door;
  ctx.fillRect(doorX, goal.y, 18, goal.h);
  if (sim.level.beacons.length > 0) {
    const lit = sim.beacons.size;
    for (let i = 0; i < sim.level.beacons.length; i++) {
      ctx.fillStyle = i < lit ? "rgba(243,240,232,0.9)" : "rgba(243,240,232,0.25)";
      ctx.fillRect(doorX - 10, goal.y + 28 + i * 14, 5, 5);
    }
  }

  if (!attract) {
    for (const ghost of ghosts) {
      ctx.save();
      ctx.globalAlpha = ghost.dead > 0 ? 0.35 : 0.92;
      drawFriend(
        ctx,
        ghost.sprites,
        {
          x: ghost.x,
          y: ghost.y,
          facing: ghost.facing,
          walking: ghost.walking,
          anim: ghost.anim,
          hurt: 0,
        },
        sim.t,
        reduced,
        false,
      );
      ctx.globalAlpha = 0.8;
      ctx.font = "14px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#f3f0e8";
      ctx.fillText(ghost.name, ghost.x + PW / 2, ghost.y - 10);
      ctx.restore();
    }
  }

  if (lamp && !attract && gloom <= 0) drawLamp(ctx, sim);

  drawFriend(
    ctx,
    sprites,
    {
      x: sim.x,
      y: sim.y,
      facing: sim.facing,
      walking: sim.walking,
      anim: sim.anim,
      hurt: sim.hurt,
      vx: sim.vx,
      vy: sim.vy,
    },
    sim.t,
    reduced,
    attract,
    cloth,
  );

  for (let i = motes.length - 1; i >= 0; i--) {
    const mote = motes[i]!;
    mote.life -= dt;
    mote.x += mote.vx * dt;
    mote.y += mote.vy * dt;
    if (mote.life <= 0) {
      motes.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = Math.max(0, mote.life / mote.max);
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(mote.x, mote.y, 2, 2);
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  const lampInDark = gloom > 0 && lamp && !attract;
  if (!lampInDark) {
    const vig = ctx.createRadialGradient(
      cssW * 0.5,
      cssH * 0.45,
      cssW * 0.2,
      cssW * 0.5,
      cssH * 0.5,
      cssW * 0.72,
    );
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, sim.level.id === "choir" ? "rgba(0,0,0,0.16)" : "rgba(0,0,0,0.72)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, cssW, cssH);
  }

  if (gloom > 0) {
    if (lampInDark) darkExceptBeam(ctx, cssW, cssH, sim, camera, gloom);
    else {
      ctx.fillStyle = `rgba(0,0,0,${gloom})`;
      ctx.fillRect(0, 0, cssW, cssH);
    }
  }

  if (gloom > 0 && sim.level.id === "roof") paintNeonSign(ctx, camera, cssW);
  paintLitBells(ctx, cssW, sim, camera);
  if (sim.level.id === "tunnel") paintTunnelPlanks(ctx, cssW, sim, camera, reduced);

  if (lamp && !attract && !lampInDark) {
    cutFog(ctx, cssW, cssH, sim, camera);
    paintWhiteBeam(ctx, cssW, cssH, sim, camera);
  }

  if (gloom > 0) paintDarkMarks(ctx, cssW, cssH, sim, camera, lampInDark);

  if (!reduced) {
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 40; i++) {
      const gx = (i * 97 + sim.t * 40) % cssW;
      const gy = (i * 53 * 13) % cssH;
      ctx.fillStyle = i % 2 ? "#fff" : "#000";
      ctx.fillRect(gx, gy, 2, 1);
    }
    ctx.globalAlpha = 1;
  }
}

function paintTunnelPlanks(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  sim: Sim,
  camera: Camera,
  reduced: boolean,
) {
  const scale = cssW / camera.w;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-camera.x, -camera.y);
  for (const rect of rectsAt(sim, reduced)) {
    if (rect.kind === "gate") continue;
    const glow = ctx.createLinearGradient(rect.x, rect.y - 30, rect.x, rect.y + 6);
    glow.addColorStop(0, "rgba(255,255,255,0)");
    glow.addColorStop(1, "rgba(244,241,234,0.7)");
    ctx.fillStyle = glow;
    ctx.fillRect(rect.x - 2, rect.y - 28, rect.w + 4, 30);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillRect(rect.x, rect.y, rect.w, 3);
  }
  ctx.restore();
}

function paintLitBells(ctx: CanvasRenderingContext2D, cssW: number, sim: Sim, camera: Camera) {
  if (sim.beacons.size === 0) return;
  const scale = cssW / camera.w;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-camera.x, -camera.y);
  for (const bell of sim.level.beacons) {
    if (!sim.beacons.has(bell.id)) continue;
    const x = bell.x + bell.w / 2;
    const ground = bellSurface(sim, x, bell.y + bell.h);
    const glow = ctx.createRadialGradient(x, ground - 34, 4, x, ground - 34, 46);
    glow.addColorStop(0, "rgba(255,255,255,0.85)");
    glow.addColorStop(0.4, "rgba(255,255,255,0.28)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, ground - 34, 46, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function paintNeonSign(ctx: CanvasRenderingContext2D, camera: Camera, cssW: number) {
  const letter = SIGN.find((item) => item.neon);
  if (!letter) return;
  const scale = cssW / camera.w;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-camera.x, -camera.y);
  const gx = letter.x + 90;
  const gy = 210;
  const halo = ctx.createRadialGradient(gx, gy, 8, gx, gy, 170);
  halo.addColorStop(0, "rgba(255,255,255,0.7)");
  halo.addColorStop(0.45, "rgba(255,255,255,0.22)");
  halo.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(gx, gy, 170, 0, Math.PI * 2);
  ctx.fill();
  drawBlockLetter(ctx, letter.ch, letter.x, 128, true, letter.tilt ?? 0);
  ctx.restore();
}

function darkExceptBeam(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  sim: Sim,
  camera: Camera,
  gloom: number,
) {
  const scale = cssW / camera.w;
  const ox = (sim.x + PW / 2 - camera.x) * scale;
  const oy = (sim.y + 14 - camera.y) * scale;
  const reach = Math.min(cssW * 0.78, 820);
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${gloom})`;
  ctx.beginPath();
  ctx.rect(0, 0, cssW, cssH);
  ctx.translate(ox, oy);
  ctx.scale(sim.facing, 1);
  ctx.moveTo(16, 0);
  ctx.lineTo(reach, -reach * 0.36);
  ctx.lineTo(reach, reach * 0.5);
  ctx.lineTo(16, 20);
  ctx.closePath();
  ctx.fill("evenodd");
  ctx.restore();
}

function drawLantern(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.fillStyle = "#070708";
  ctx.fillRect(x - 1, y - 16, 2, 16);
  ctx.fillRect(x - 8, y, 16, 18);
  ctx.fillRect(x - 6, y + 18, 12, 3);
  const pulse = 16 + Math.sin(t * 3) * 2;
  const glow = ctx.createRadialGradient(x, y + 8, 1, x, y + 8, pulse);
  glow.addColorStop(0, "rgba(255,255,255,0.95)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y + 8, pulse, 0, Math.PI * 2);
  ctx.fill();
}

function paintDarkMarks(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  sim: Sim,
  camera: Camera,
  lamp: boolean,
) {
  const scale = cssW / camera.w;
  const ox = (sim.x + PW / 2 - camera.x) * scale;
  const oy = (sim.y + 14 - camera.y) * scale;
  const reach = Math.min(cssW * 0.78, 820);
  const facing = sim.facing > 0 ? 1 : -1;
  const lit = (sx: number, sy: number) => {
    if (!lamp) return false;
    const dx = (sx - ox) * facing;
    const dy = sy - oy;
    if (dx < 18 || dx > reach) return false;
    const half = 8 + dx * 0.42;
    return dy < half && dy > -dx * 0.36;
  };
  const project = (x: number, y: number) => ({
    x: (x - camera.x) * scale,
    y: (y - camera.y) * scale,
  });
  for (const stand of sim.level.lamps ?? []) {
    const p = project(stand.x + stand.w / 2, stand.y + 26);
    if (lit(p.x, p.y)) continue;
    const glow = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 16);
    glow.addColorStop(0, "rgba(255,255,255,0.95)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(p.x - 3, p.y - 4, 6, 8);
  }
  for (const moth of sim.level.moths) {
    if (sim.moths.has(moth.id)) continue;
    const p = project(moth.x, moth.y);
    if (lit(p.x, p.y)) continue;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
  const feet = project(sim.x + PW / 2, sim.y + 20);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillRect(feet.x - 2, feet.y - 2, 4, 4);
}

function drawLamp(ctx: CanvasRenderingContext2D, sim: Sim) {
  const ox = sim.x + PW / 2;
  const oy = sim.y + 16;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(sim.facing, 1);
  const cone = ctx.createRadialGradient(18, 0, 0, 170, 0, 150);
  cone.addColorStop(0, "rgba(255,255,255,0.95)");
  cone.addColorStop(0.28, "rgba(255,255,255,0.55)");
  cone.addColorStop(0.62, "rgba(255,255,255,0.18)");
  cone.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.arc(8, 0, 240, -0.62, 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(9, -2, 5, 4);
  ctx.restore();
}

function paintWhiteBeam(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  sim: Sim,
  camera: Camera,
) {
  const scale = cssW / camera.w;
  const ox = (sim.x + PW / 2 - camera.x) * scale;
  const oy = (sim.y + 16 - camera.y) * scale;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(sim.facing, 1);
  const beam = ctx.createRadialGradient(16, 0, 0, 160, 0, 130);
  beam.addColorStop(0, "rgba(255,255,255,0.92)");
  beam.addColorStop(0.35, "rgba(255,255,255,0.42)");
  beam.addColorStop(0.7, "rgba(255,255,255,0.12)");
  beam.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(22, -6);
  ctx.lineTo(200, -78);
  ctx.lineTo(200, 78);
  ctx.lineTo(22, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function cutFog(
  ctx: CanvasRenderingContext2D,
  cssW: number,
  cssH: number,
  sim: Sim,
  camera: Camera,
) {
  const scale = cssW / camera.w;
  const ox = (sim.x + PW / 2 - camera.x) * scale;
  const oy = (sim.y + 16 - camera.y) * scale;
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.translate(ox, oy);
  ctx.scale(sim.facing, 1);
  const beam = ctx.createRadialGradient(8, 0, 6, 150, 0, 120);
  beam.addColorStop(0, "rgba(0,0,0,0.85)");
  beam.addColorStop(0.45, "rgba(0,0,0,0.4)");
  beam.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, 200, -0.7, 0.7);
  ctx.closePath();
  ctx.fill();
  const pool = ctx.createRadialGradient(0, 0, 4, 0, 0, 54);
  pool.addColorStop(0, "rgba(0,0,0,0.7)");
  pool.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = pool;
  ctx.beginPath();
  ctx.arc(0, 0, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSkyline(ctx: CanvasRenderingContext2D, camera: Camera) {
  ctx.save();
  ctx.translate(camera.x * 0.45, 40);
  ctx.fillStyle = "rgba(12,12,14,0.55)";
  const far: [number, number, number][] = [
    [0, 220, 180],
    [260, 140, 260],
    [430, 300, 150],
    [780, 180, 240],
    [1000, 90, 320],
    [1140, 260, 170],
    [1460, 200, 280],
    [1720, 160, 190],
    [1940, 240, 150],
    [2240, 120, 300],
    [2420, 280, 160],
    [2760, 180, 220],
  ];
  for (const [x, w, h] of far) {
    ctx.fillRect(x, 520 - h, w, h + 80);
    ctx.fillRect(x + w * 0.4, 520 - h - 28, 4, 28);
  }
  ctx.restore();

  ctx.save();
  ctx.translate(camera.x * 0.2, 0);
  ctx.fillStyle = "rgba(8,8,9,0.72)";
  const near: [number, number, number][] = [
    [-40, 360, 220],
    [400, 200, 160],
    [680, 280, 240],
    [1040, 160, 180],
    [1280, 340, 140],
    [1700, 220, 260],
    [2000, 180, 150],
    [2280, 300, 210],
    [2660, 240, 170],
    [2980, 200, 230],
  ];
  for (const [x, w, h] of near) ctx.fillRect(x, 500 - h, w, h + 40);
  ctx.restore();
}

const SIGN: { ch: string; x: number; neon?: boolean; tilt?: number }[] = [
  { ch: "R", x: 220 },
  { ch: "A", x: 400 },
  { ch: "R", x: 580 },
  { ch: "E", x: 760 },
  { ch: "F", x: 1020 },
  { ch: "R", x: 1200 },
  { ch: "I", x: 1380 },
  { ch: "E", x: 1540, neon: true },
  { ch: "N", x: 1720 },
  { ch: "D", x: 1920, tilt: -0.2 },
  { ch: "S", x: 2140 },
];

const GLYPHS: Record<string, [number, number, number, number][]> = {
  R: [
    [0, 0, 28, 100],
    [0, 0, 72, 20],
    [52, 0, 26, 50],
    [0, 40, 68, 18],
    [38, 52, 28, 48],
  ],
  A: [
    [0, 18, 26, 82],
    [74, 18, 26, 82],
    [0, 0, 100, 20],
    [8, 46, 84, 16],
  ],
  E: [
    [0, 0, 26, 100],
    [0, 0, 86, 20],
    [0, 40, 68, 16],
    [0, 80, 86, 20],
  ],
  F: [
    [0, 0, 26, 100],
    [0, 0, 86, 20],
    [0, 40, 66, 16],
  ],
  I: [[34, 0, 28, 100]],
  N: [
    [0, 0, 24, 100],
    [76, 0, 24, 100],
    [20, 8, 28, 36],
    [44, 36, 32, 40],
  ],
  D: [
    [0, 0, 26, 100],
    [0, 0, 64, 20],
    [0, 80, 64, 20],
    [58, 18, 30, 64],
  ],
  S: [
    [14, 0, 74, 20],
    [0, 0, 26, 48],
    [14, 40, 68, 16],
    [62, 48, 26, 52],
    [0, 80, 88, 20],
  ],
};

function drawRareSign(ctx: CanvasRenderingContext2D, time: number, reduced: boolean) {
  ctx.save();
  ctx.strokeStyle = "rgba(10,10,12,0.9)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(140, 118);
  ctx.lineTo(2420, 118);
  ctx.moveTo(140, 340);
  ctx.lineTo(2420, 340);
  ctx.stroke();
  ctx.lineWidth = 2;
  for (let x = 180; x < 2400; x += 150) {
    ctx.beginPath();
    ctx.moveTo(x, 340);
    ctx.lineTo(x + 75, 118);
    ctx.moveTo(x + 75, 340);
    ctx.lineTo(x, 118);
    ctx.stroke();
  }
  for (const letter of SIGN) {
    drawBlockLetter(ctx, letter.ch, letter.x, 128, letter.neon === true, letter.tilt ?? 0);
    ctx.strokeStyle = "rgba(10,10,12,0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(letter.x + 40, 340);
    ctx.lineTo(letter.x + 70, 430);
    ctx.stroke();
  }
  if (!reduced) {
    const spark = (Math.sin(time * 6) + 1) / 2;
    ctx.fillStyle = `rgba(255,255,255,${0.25 + spark * 0.55})`;
    ctx.fillRect(1988, 250, 2, 2);
    ctx.fillRect(2050, 180, 2, 2);
    ctx.fillRect(1910, 210, 1, 2);
  }
  ctx.restore();
}

function drawBlockLetter(
  ctx: CanvasRenderingContext2D,
  ch: string,
  x: number,
  y: number,
  neon: boolean,
  tilt: number,
) {
  const parts = GLYPHS[ch];
  if (!parts) return;
  const scale = 1.85;
  ctx.save();
  ctx.translate(x + 50 * scale, y + 50 * scale);
  if (tilt) ctx.rotate(tilt);
  ctx.scale(scale, scale);
  ctx.translate(-50, -50);
  ctx.fillStyle = "#070708";
  for (const [rx, ry, rw, rh] of parts) ctx.fillRect(rx, ry, rw, rh);
  if (neon) {
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 4;
    ctx.shadowColor = "rgba(255,255,255,0.9)";
    ctx.shadowBlur = 16;
    for (const [rx, ry, rw, rh] of parts) ctx.strokeRect(rx + 1, ry + 1, rw - 2, rh - 2);
  }
  ctx.restore();
}

const ASH: { x: number; y: number; s: number; scrap: boolean; w: number; h: number; spin: number }[] = (() => {
  const bits = [];
  let seed = 19;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 240; i++) {
    const scrap = rnd() > 0.84;
    bits.push({
      x: rnd() * 4800,
      y: rnd() * 640 - 30,
      s: 0.35 + rnd() * 1.15,
      scrap,
      w: scrap ? 8 + rnd() * 16 : 1 + rnd() * 2.4,
      h: scrap ? 3 + rnd() * 7 : 1 + rnd() * 1.5,
      spin: rnd() * Math.PI,
    });
  }
  return bits;
})();

function drawCog(ctx: CanvasRenderingContext2D, r: number, teeth: number) {
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const step = (Math.PI * 2) / teeth;
    const a0 = i * step;
    const tip0 = a0 + step * 0.18;
    const tip1 = a0 + step * 0.42;
    const valley = a0 + step * 0.72;
    const rim = r * 0.78;
    const point = (ang: number, rad: number) => {
      ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
    };
    if (i === 0) ctx.moveTo(Math.cos(a0) * rim, Math.sin(a0) * rim);
    point(tip0, r);
    point(tip1, r);
    point(valley, rim);
  }
  ctx.closePath();
  ctx.fill();
}

function drawGearHall(ctx: CanvasRenderingContext2D, camera: Camera, sim: Sim, reduced: boolean) {
  ctx.save();
  ctx.translate(camera.x * 0.7, camera.y * 0.12);
  ctx.fillStyle = "#070708";
  ctx.fillRect(-120, -30, 340, 280);
  ctx.strokeStyle = "#101014";
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(30 + i * 36, 70);
    ctx.quadraticCurveTo(10 + i * 20, 220, 24 + i * 14, 460);
    ctx.stroke();
  }
  ctx.fillRect(-20, 250, 90, 18);
  ctx.restore();

  ctx.save();
  ctx.translate(camera.x * 0.4, camera.y * 0.08);
  ctx.fillStyle = "#121214";
  ctx.strokeStyle = "#1c1c20";
  ctx.lineWidth = 4;
  for (let x = -180; x < 5400; x += 720) {
    ctx.fillRect(x, 20, 16, 560);
    ctx.fillRect(x + 560, 20, 16, 560);
    ctx.beginPath();
    ctx.moveTo(x, 70);
    ctx.lineTo(x + 280, 8);
    ctx.lineTo(x + 560, 70);
    ctx.moveTo(x + 40, 70);
    ctx.lineTo(x + 280, 36);
    ctx.lineTo(x + 520, 70);
    ctx.stroke();
    ctx.fillRect(x + 16, 160, 544, 8);
    ctx.fillRect(x + 16, 300, 544, 6);
    ctx.strokeRect(x + 70, 190, 84, 48);
    ctx.strokeRect(x + 90, 206, 44, 16);
    ctx.fillRect(x + 250, 78, 3, 48);
    ctx.fillStyle = "#f3f3f0";
    ctx.fillRect(x + 240, 124, 22, 14);
    ctx.fillStyle = "#121214";
  }
  ctx.restore();

  const lx = 2200 - camera.x * 0.35;
  const ly = 90;
  ctx.save();
  ctx.translate(camera.x * 0.35, camera.y * 0.08);
  const glow = ctx.createRadialGradient(lx, ly, 6, lx, ly, 340);
  glow.addColorStop(0, "rgba(255,255,255,0.95)");
  glow.addColorStop(0.18, "rgba(230,230,228,0.4)");
  glow.addColorStop(1, "rgba(230,230,228,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(lx - 360, ly - 200, 720, 560);
  ctx.save();
  ctx.translate(lx, ly);
  ctx.fillStyle = "rgba(255,255,255,0.09)";
  for (let i = 0; i < 7; i++) {
    ctx.rotate(Math.PI / 7);
    ctx.fillRect(18, -10, 280, 20);
  }
  ctx.restore();
  ctx.fillStyle = "#f7f7f4";
  ctx.fillRect(lx - 18, ly - 18, 36, 36);
  ctx.restore();

  const specks = Array.from({ length: 28 }, (_, i) => ({
    x: 40 + i * 190 + (i % 3) * 24,
    y: 120 + (i % 5) * 58,
    r: 22 + (i % 4) * 12,
    speed: (i % 2 === 0 ? 0.35 : -0.28) + (i % 5) * 0.04,
    teeth: 6 + (i % 3),
  }));
  for (const wheel of specks) {
    ctx.save();
    ctx.translate(wheel.x, wheel.y);
    ctx.rotate(sim.t * (reduced ? wheel.speed * 0.35 : wheel.speed));
    ctx.fillStyle = "rgba(12,12,14,0.72)";
    drawCog(ctx, wheel.r, wheel.teeth);
    ctx.restore();
  }

  const wheels = [
    { x: 900, y: 780, r: 340, speed: 0.22, teeth: 10 },
    { x: 1900, y: 820, r: 400, speed: -0.16, teeth: 11 },
    { x: 2900, y: 790, r: 360, speed: 0.18, teeth: 9 },
    { x: 3900, y: 840, r: 380, speed: -0.2, teeth: 10 },
    { x: 4800, y: 800, r: 300, speed: 0.24, teeth: 8 },
  ];
  for (const wheel of wheels) {
    ctx.save();
    ctx.translate(wheel.x, wheel.y);
    ctx.rotate(sim.t * (reduced ? wheel.speed * 0.35 : wheel.speed));
    ctx.fillStyle = "rgba(8,8,10,0.94)";
    drawCog(ctx, wheel.r, wheel.teeth);
    ctx.beginPath();
    ctx.arc(0, 0, wheel.r * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = "#2c2c30";
    ctx.fill();
    ctx.restore();
  }
}

function drawPixelCrowd(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = "#f4f4f2";
  ctx.fillRect(x + s, y, s * 2, s * 2);
  ctx.fillRect(x, y, s, s);
  ctx.fillRect(x + s * 3, y, s, s);
  ctx.fillRect(x + s, y + s * 2, s * 2, s * 3);
  ctx.fillRect(x, y + s * 3, s, s * 2);
  ctx.fillRect(x + s * 3, y + s * 3, s, s * 2);
  ctx.fillRect(x + s, y + s * 5, s, s * 2);
  ctx.fillRect(x + s * 2, y + s * 5, s, s * 2);
}

function drawChoirGear(ctx: CanvasRenderingContext2D, camera: Camera, t: number, reduced: boolean) {
  ctx.save();
  ctx.translate(camera.x * 0.62, camera.y * 0.15);

  ctx.fillStyle = "#070708";
  ctx.fillRect(-80, -40, 280, 340);
  ctx.strokeStyle = "rgba(20,20,22,0.9)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(40 + i * 28, 80);
    ctx.lineTo(20 + i * 18, 420);
    ctx.stroke();
  }

  const glow = ctx.createRadialGradient(620, 70, 4, 620, 70, 220);
  glow.addColorStop(0, "rgba(255,255,255,0.95)");
  glow.addColorStop(0.2, "rgba(220,220,216,0.35)");
  glow.addColorStop(1, "rgba(220,220,216,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(380, -80, 480, 360);
  ctx.fillStyle = "#f7f7f4";
  ctx.fillRect(602, 52, 36, 36);

  ctx.fillStyle = "#0a0a0c";
  ctx.beginPath();
  ctx.moveTo(280, 560);
  const teeth = 16;
  for (let i = 0; i <= teeth; i++) {
    const x = 280 + i * 62;
    const high = i % 2 === 0;
    ctx.lineTo(x, high ? 300 : 390);
    if (i < teeth) ctx.lineTo(x + 31, high ? 390 : 300);
  }
  ctx.lineTo(280 + teeth * 62, 640);
  ctx.lineTo(280, 640);
  ctx.closePath();
  ctx.fill();

  for (let i = 0; i <= teeth; i += 2) {
    const x = 292 + i * 62;
    const y = 300;
    drawPixelCrowd(ctx, x, y - 28, 4);
    if (i % 4 === 0) drawPixelCrowd(ctx, x + 16, y - 8, 3);
    if (i > 2 && i < teeth - 2) drawPixelCrowd(ctx, x - 8, y - 52, 3);
  }

  if (!reduced) {
    ctx.fillStyle = "rgba(230,230,226,0.55)";
    for (let i = 0; i < 40; i++) {
      const x = ((i * 173 + t * 18) % 1400) - 40;
      const y = 40 + ((i * 97) % 480);
      ctx.fillRect(x, y, i % 5 === 0 ? 3 : 1.2, i % 5 === 0 ? 2 : 1.2);
    }
  }
  ctx.restore();
}

function drawGaleStorm(ctx: CanvasRenderingContext2D, camera: Camera, t: number, reduced: boolean) {
  const gust = Math.sin(t * 1.7);
  const blow = gust > 0.35 ? (gust - 0.35) / 0.65 : 0;
  const drift = reduced ? 0 : t * (70 + blow * 460);

  ctx.save();
  ctx.translate(camera.x * 0.2, camera.y * 0.08);
  for (let i = 0; i < 6; i++) {
    const cx = ((i * 540 + drift * 0.2) % 2800) - 200;
    const cloud = ctx.createRadialGradient(cx, 180 + i * 36, 8, cx, 210, 300);
    cloud.addColorStop(0, "rgba(214,214,210,0.2)");
    cloud.addColorStop(1, "rgba(214,214,210,0)");
    ctx.fillStyle = cloud;
    ctx.fillRect(cx - 320, 20, 640, 420);
  }
  ctx.restore();

  for (const bit of ASH) {
    const span = 5000;
    let x = bit.x - drift * bit.s;
    x = ((x % span) + span) % span - 180;
    if (x < camera.x - 60 || x > camera.x + camera.w + 60) continue;
    const y = bit.y + (reduced ? 0 : Math.sin(t * 0.8 + bit.spin) * 12 * bit.s);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(bit.spin + (reduced ? 0 : -t * bit.s * (0.15 + blow)));
    ctx.fillStyle = bit.scrap ? "rgba(236,236,232,0.88)" : "rgba(226,226,222,0.75)";
    ctx.fillRect(-bit.w / 2, -bit.h / 2, bit.w, bit.h);
    ctx.restore();
  }

  if (blow > 0.04 && !reduced) {
    ctx.strokeStyle = `rgba(236,236,232,${0.12 + blow * 0.4})`;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 16; i++) {
      const y = camera.y + 24 + i * 32;
      const x = camera.x + ((((i * 97 - drift) % camera.w) + camera.w) % camera.w);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 24 - blow * 90, y + 1);
      ctx.stroke();
    }
  }
}

function drawBranch(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "rgba(8,8,9,0.9)";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(1500, 150);
  ctx.quadraticCurveTo(1900, 90, 2300, 170);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(1680, 120);
  ctx.quadraticCurveTo(1600, 80, 1500, 40);
  ctx.stroke();
}

function drawThorns(ctx: CanvasRenderingContext2D, pit: { x0: number; x1: number }) {
  ctx.fillStyle = "#070708";
  for (let x = pit.x0 + 20; x < pit.x1 - 20; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, 640);
    ctx.lineTo(x + 9, 590);
    ctx.lineTo(x + 18, 640);
    ctx.fill();
  }
}

export function frameCamera(
  sim: Sim,
  viewW: number,
  viewH: number,
  started: boolean,
  reduced: boolean,
  huntPull = 0,
): Camera {
  const worldH = sim.level.id === "tunnel" ? 2800 : 1680;
  let x: number;
  let y: number;
  if (!started) {
    const drift = reduced ? 0 : Math.sin(sim.t * 0.15) * 24;
    if (sim.level.id === "shore") {
      x = (viewW < 640 ? 2040 : 1680) + drift;
      y = viewW < 640 ? 48 : 70;
    } else {
      x = sim.level.poster - viewW * 0.32 + drift;
      y = 48;
    }
  } else {
    x = sim.x + PW / 2 + sim.look * 70 - viewW * 0.38;
    y = sim.y + PH / 2 - viewH * 0.58;
    if (huntPull > 0) {
      x -= viewW * 0.26 * huntPull;
      y -= 36 * huntPull;
    }
  }
  const yMin = sim.level.id === "moon" ? -1400 : sim.level.id === "choir" ? -820 : -40;
  x = Math.max(0, Math.min(Math.max(0, sim.level.worldW - viewW), x));
  y = Math.max(yMin, Math.min(worldH - viewH, y));
  return { x, y, w: viewW, h: viewH };
}

export function viewSize(cssW: number, cssH: number) {
  const aspect = cssW / Math.max(1, cssH);
  let viewH = 540;
  let viewW = viewH * aspect;
  if (viewW < 430) {
    viewW = 430;
    viewH = viewW / aspect;
  }
  if (viewW > 1100) {
    viewW = 1100;
    viewH = viewW / aspect;
  }
  return { viewW, viewH };
}
