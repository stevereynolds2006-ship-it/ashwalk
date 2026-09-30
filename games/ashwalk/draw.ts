import { spriteFrame, type GenerationSprites } from "@rarefriends/friendsdk/sprites";
import type { Ghost } from "./net";
import { PH, PW, birdSpots, comboSet, escapeDy, markSpot, perchPosition, rectsAt, spiderPoses, type Sim } from "./sim";

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
const SHORE_REAL_FAR: Tree[] = Array.from({ length: 18 }, (_, i) => ({
  x: -80 + i * 540,
  ground: 500,
  scale: 1.7 + (i % 3) * 0.32,
  seed: 21 + i * 19,
}));
const SHORE_REAL_NEAR: Tree[] = Array.from({ length: 14 }, (_, i) => ({
  x: 20 + i * 680,
  ground: 530,
  scale: 1.25 + (i % 2) * 0.28,
  seed: 80 + i * 13,
}));

let shoreReal = false;
let latchReal = false;
let mirrorReal = false;
let realLevel: string | null = null;

const REAL_SKY: Record<string, [string, string, string, string]> = {
  shore: ["#1a2422", "#c9cfc6", "#7d8a78", "#15201c"],
  latch: ["#1c1612", "#a08870", "#4a382c", "#120e0c"],
  gale: ["#243444", "#9aafc0", "#4e6474", "#1a242c"],
  choir: ["#5e7088", "#f4f1e8", "#c5d0da", "#3a4654"],
  gear: ["#161412", "#6e665c", "#3a342c", "#100e0c"],
  roof: ["#1a2434", "#d2c2ae", "#5c544c", "#12161c"],
  antler: ["#18241c", "#8ea484", "#3a4a38", "#101610"],
  moon: ["#070814", "#243058", "#101828", "#05060c"],
  hallow: ["#1c1418", "#7a4838", "#2e1c18", "#100c0e"],
  mirror: ["#101816", "#7a8c78", "#243028", "#0c1210"],
  tunnel: ["#12181c", "#465058", "#1e282c", "#0c1014"],
  yule: ["#102030", "#e4eef6", "#7a98b4", "#101820"],
  hoist: ["#1a2018", "#727864", "#2c3226", "#10140e"],
};

export function setRealLook(id: string | null) {
  realLevel = id;
  shoreReal = id === "shore";
  latchReal = id === "latch";
  mirrorReal = id === "mirror";
}

export function realLookId() {
  return realLevel;
}

export function setShoreLook(real: boolean) {
  setRealLook(real ? "shore" : realLevel === "shore" ? null : realLevel);
}

export function setLatchLook(real: boolean) {
  setRealLook(real ? "latch" : realLevel === "latch" ? null : realLevel);
}

export function latchLookOn() {
  return latchReal;
}

export function setMirrorLook(real: boolean) {
  setRealLook(real ? "mirror" : realLevel === "mirror" ? null : realLevel);
}

export function mirrorLookOn() {
  return mirrorReal;
}

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
  roof: ["#4a4c50", "#e4e2de", "#b0aea8", "#3a3c40"],
  antler: ["#2a2c30", "#c8c6c0", "#8a8884", "#1c1e22"],
  moon: ["#050506", "#101218", "#1a1c22", "#050506"],
  mirror: ["#3a3e44", "#d8d8d4", "#a4a8ae", "#2a2e34"],
  tunnel: ["#1e2228", "#7a8088", "#4a5058", "#1a1e24"],
  hoist: ["#2c3036", "#d8d6d0", "#a4a29c", "#24282e"],
  yule: ["#050506", "#9a9894", "#2a2a2c", "#050506"],
  hallow: ["#242228", "#8a8884", "#5a5854", "#1e1c22"],
};

function drawLowerFill(ctx: CanvasRenderingContext2D, camera: Camera, id: string) {
  if (id === "yule" || id === "tunnel" || id === "roof" || id === "mirror") return;
  ctx.save();
  const spacing = id === "moon" ? 360 : id === "hallow" ? 150 : id === "stack" ? 200 : 280;
  const layer = camera.x * 0.7;
  const first = Math.floor((layer - 700) / spacing) * spacing;
  const last = layer + camera.w + 700;
  const ground = camera.y + camera.h + 24;
  for (let x = first; x <= last; x += spacing) {
    const n = Math.abs(Math.round(x / spacing));
    const worldX = camera.x + (x - layer);
    const g = ground + (n % 2) * 24;
    if (id === "hoist") {
      ctx.fillStyle = "rgba(70,74,80,0.55)";
      const h = 520 + (n % 3) * 140;
      ctx.fillRect(worldX, g - h, 90 + (n % 2) * 36, h + 220);
      ctx.fillStyle = "rgba(244,241,234,0.35)";
      ctx.fillRect(worldX, g - h, 90 + (n % 2) * 36, 4);
      ctx.fillRect(worldX + 16, g - h - 70, 12, 74);
    } else if (id === "latch" && latchReal) {
      ctx.fillStyle = "#3a2c22";
      const h = 420 + (n % 3) * 80;
      ctx.fillRect(worldX, g - h, 28, h + 180);
      ctx.fillStyle = "rgba(196, 160, 110, 0.35)";
      ctx.fillRect(worldX + 6, g - h, 3, h + 180);
    } else if (id === "gear" || id === "choir" || id === "latch") {
      ctx.fillStyle = "rgba(8,8,10,0.62)";
      const h = 340 + (n % 3) * 90;
      ctx.fillRect(worldX, g - h, 54 + (n % 2) * 24, h + 180);
      ctx.fillRect(worldX + 16, g - h - 48, 10, 56);
    } else if (id === "gale") {
      ctx.fillStyle = "rgba(16,16,18,0.5)";
      ctx.beginPath();
      ctx.moveTo(worldX - 90, g + 90);
      ctx.quadraticCurveTo(worldX + 20, g - 260 - (n % 3) * 50, worldX + 180, g + 90);
      ctx.fill();
    } else if (id === "moon") {
      ctx.fillStyle = "rgba(16,16,20,0.82)";
      ctx.beginPath();
      ctx.arc(worldX, g + 10, 110 + (n % 3) * 36, Math.PI, 0);
      ctx.lineTo(worldX + 160, g + 180);
      ctx.lineTo(worldX - 160, g + 180);
      ctx.fill();
    } else if (id === "stack") {
      drawAshTree(ctx, { x: worldX + 90, ground: g + 10, scale: 1.65, seed: 80 + n * 7 }, 0.55);
      drawAshTree(ctx, { x: worldX, ground: g + 130, scale: 2.7 + (n % 3) * 0.32, seed: 15 + n * 19 }, 0.96);
    } else if (id === "hallow") {
      ctx.strokeStyle = "rgba(120,116,110,0.9)";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      const top = g - 340 - (n % 4) * 70;
      ctx.moveTo(worldX, g + 260);
      ctx.lineTo(worldX, top);
      for (let k = 0; k < 8; k++) {
        const y = g + 40 - k * 52;
        const dir = k % 2 ? 1 : -1;
        const len = 28 + ((n + k) % 4) * 16;
        ctx.moveTo(worldX, y);
        ctx.lineTo(worldX + dir * len, y - 34);
        ctx.moveTo(worldX + dir * len * 0.45, y - 16);
        ctx.lineTo(worldX + dir * len * 0.45 + dir * 14, y - 36);
      }
      ctx.stroke();
    } else if (id === "shore" && shoreReal) {
      drawShoreTree(ctx, { x: worldX, ground: g, scale: 1.7 + (n % 3) * 0.28, seed: 40 + n * 11 }, 0.8);
    } else if (id === "shore" || id === "antler") {
      drawRealTree(ctx, { x: worldX, ground: g, scale: id === "antler" ? 2.15 + (n % 3) * 0.4 : 1.7 + (n % 3) * 0.28, seed: 40 + n * 11 }, id === "antler" ? 0.55 : 0.86);
    } else {
      drawTree(ctx, { x: worldX, ground: g, scale: 2.6 + (n % 3) * 0.5, seed: 90 + n * 13 }, 0.78);
    }
  }
  ctx.restore();
}

function drawAshTree(ctx: CanvasRenderingContext2D, tree: Tree, alpha: number) {
  const rand = rng(tree.seed);
  ctx.save();
  ctx.translate(tree.x, tree.ground);
  ctx.scale(tree.scale, tree.scale);
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const bark = "#4a4742";
  const ridge = "#b7b2a8";
  const dark = "#2a2826";
  const leaf = "#8a8680";
  const pale = "#d8d4cc";
  ctx.strokeStyle = dark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-8, 6);
  ctx.quadraticCurveTo(-36, 14, -58, 26);
  ctx.moveTo(9, 6);
  ctx.quadraticCurveTo(34, 16, 56, 24);
  ctx.moveTo(-3, 8);
  ctx.quadraticCurveTo(-6, 20, -14, 28);
  ctx.stroke();
  ctx.fillStyle = bark;
  ctx.beginPath();
  ctx.moveTo(-13, 22);
  ctx.quadraticCurveTo(-16, -40, -8, -150);
  ctx.quadraticCurveTo(-4, -178, 0, -186);
  ctx.quadraticCurveTo(6, -176, 9, -140);
  ctx.quadraticCurveTo(14, -30, 14, 22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = ridge;
  ctx.lineWidth = 1;
  for (let i = 0; i < 9; i++) {
    const y = 8 - i * 18;
    ctx.beginPath();
    ctx.moveTo(-6 + (i % 2) * 4, y);
    ctx.quadraticCurveTo(0, y - 8, 6 - (i % 2) * 3, y - 16);
    ctx.stroke();
  }
  const spray = (x: number, y: number, dir: number, len: number) => {
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + dir * len * 0.45, y - 10, x + dir * len, y - 4);
    ctx.stroke();
    for (let k = 0; k < 5; k++) {
      const u = 0.28 + k * 0.15;
      const px = x + dir * len * u;
      const py = y - 8 * u;
      const side = k % 2 === 0 ? 1 : -1;
      ctx.fillStyle = k % 2 === 0 ? leaf : pale;
      ctx.beginPath();
      ctx.ellipse(px + dir * 4, py + side * 7, 8, 3.4, dir * 0.5 + side * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  for (let i = 0; i < 7; i++) {
    const y = -36 - i * 20 - rand() * 6;
    const dir = i % 2 === 0 ? 1 : -1;
    const len = 54 + rand() * 48;
    ctx.strokeStyle = bark;
    ctx.lineWidth = Math.max(1.6, 4.2 - i * 0.4);
    ctx.beginPath();
    ctx.moveTo(dir * 3, y);
    ctx.quadraticCurveTo(dir * len * 0.4, y - 16, dir * len, y - 28 - rand() * 10);
    ctx.stroke();
    spray(dir * len * 0.72, y - 18, dir, 28 + rand() * 16);
    if (i % 2 === 0) spray(dir * len * 0.4, y - 6, -dir, 18 + rand() * 10);
  }
  ctx.fillStyle = "rgba(216, 212, 204, 0.55)";
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI - 0.1;
    ctx.beginPath();
    ctx.ellipse(Math.cos(ang) * (30 + rand() * 24) * (i % 2 ? 1 : -1), -168 - rand() * 22, 22 + rand() * 10, 12, (rand() - 0.5) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawShoreTree(ctx: CanvasRenderingContext2D, tree: Tree, alpha: number) {
  const rand = rng(tree.seed);
  ctx.save();
  ctx.translate(tree.x, tree.ground);
  ctx.scale(tree.scale, tree.scale);
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#3a3228";
  ctx.fillStyle = "#3a3228";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-7, 8);
  ctx.quadraticCurveTo(-28, 10, -46, 18);
  ctx.moveTo(8, 8);
  ctx.quadraticCurveTo(26, 12, 44, 16);
  ctx.moveTo(-2, 4);
  ctx.quadraticCurveTo(-8, 16, -18, 22);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-11, 16);
  ctx.quadraticCurveTo(-8, -40, -4, -92);
  ctx.quadraticCurveTo(-2, -130, 2, -150);
  ctx.quadraticCurveTo(6, -120, 8, -70);
  ctx.quadraticCurveTo(11, -20, 12, 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(214, 196, 168, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-2, -10);
  ctx.quadraticCurveTo(1, -70, 0, -130);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 1.3 - 0.3;
    const rad = 46 + rand() * 28;
    const x = Math.cos(ang) * rad * (i % 2 === 0 ? 1 : 0.72);
    const y = -108 - Math.sin(ang) * 36 - rand() * 24;
    ctx.fillStyle = i % 3 === 0 ? "#2c3824" : i % 3 === 1 ? "#3e5230" : "#56703c";
    ctx.beginPath();
    ctx.ellipse(x, y, 28 + rand() * 18, 16 + rand() * 12, (rand() - 0.5) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(196, 214, 160, 0.45)";
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.ellipse((rand() - 0.5) * 70, -150 - rand() * 30, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#4a5a34";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 7; i++) {
    const x = (rand() - 0.5) * 80;
    const y = -130 - rand() * 30;
    const drop = 40 + rand() * 70;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + (rand() - 0.5) * 10, y + drop * 0.5, x + (rand() - 0.5) * 6, y + drop);
    ctx.stroke();
  }
  ctx.restore();
}

function drawShoreWater(ctx: CanvasRenderingContext2D, camera: Camera, t: number) {
  const x0 = camera.x - 80;
  const x1 = camera.x + camera.w + 80;
  const surface = 528;
  const deep = camera.y + camera.h + 120;
  const water = ctx.createLinearGradient(0, surface - 20, 0, deep);
  water.addColorStop(0, "#6e8a78");
  water.addColorStop(0.08, "#2a4036");
  water.addColorStop(1, "#0c1412");
  ctx.fillStyle = water;
  ctx.fillRect(x0, surface, x1 - x0, deep - surface);
  ctx.strokeStyle = "rgba(214, 226, 206, 0.35)";
  ctx.lineWidth = 1.5;
  for (let row = 0; row < 5; row++) {
    const y = surface + 8 + row * 14;
    ctx.globalAlpha = 0.35 - row * 0.05;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 16) {
      const wave = Math.sin(x * 0.02 + t * 0.8 + row) * (3 + row);
      if (x === x0) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const mist = ctx.createLinearGradient(0, surface - 36, 0, surface + 24);
  mist.addColorStop(0, "rgba(210, 216, 206, 0)");
  mist.addColorStop(1, "rgba(210, 216, 206, 0.28)");
  ctx.fillStyle = mist;
  ctx.fillRect(x0, surface - 36, x1 - x0, 60);
}

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

function drawRealCap(ctx: CanvasRenderingContext2D, id: string, rect: RectLike) {
  if (id === "yule") {
    ctx.fillStyle = "#f4f7fa";
    ctx.fillRect(rect.x, rect.y - 6, rect.w, 10);
    return;
  }
  if (id === "roof") {
    const rows = 3;
    for (let row = 0; row < rows; row++) {
      ctx.fillStyle = row % 2 ? "#6a4034" : "#7a4c3c";
      ctx.fillRect(rect.x, rect.y + row * 6, rect.w, 5);
    }
    return;
  }
  if (id === "moon") {
    ctx.fillStyle = "#4a4e58";
    ctx.fillRect(rect.x, rect.y - 2, rect.w, 12);
    ctx.fillStyle = "rgba(220,224,230,0.45)";
    ctx.fillRect(rect.x, rect.y, rect.w, 2);
    return;
  }
  if (id === "gear" || id === "hoist") {
    ctx.fillStyle = "#4e524c";
    ctx.fillRect(rect.x, rect.y - 2, rect.w, 14);
    ctx.fillStyle = "#8a6238";
    ctx.fillRect(rect.x, rect.y, rect.w, 3);
    return;
  }
  if (id === "hallow") {
    ctx.fillStyle = "#3a2820";
    ctx.fillRect(rect.x, rect.y - 2, rect.w, 14);
    return;
  }
  ctx.fillStyle = id === "tunnel" ? "#3a4448" : "#4a5248";
  ctx.fillRect(rect.x, rect.y - 2, rect.w, 14);
  ctx.fillStyle = "rgba(214, 210, 198, 0.4)";
  ctx.fillRect(rect.x, rect.y, rect.w, 2);
}

function drawMetal(ctx: CanvasRenderingContext2D, rect: RectLike) {
  ctx.fillStyle = "#4a4e52";
  ctx.fillRect(rect.x, rect.y, rect.w, 8);
  ctx.fillStyle = "#8a6a40";
  ctx.fillRect(rect.x, rect.y, rect.w, 2);
}

function drawRealBackdrop(ctx: CanvasRenderingContext2D, camera: Camera, id: string, t: number) {
  ctx.save();
  ctx.translate(camera.x * 0.35, camera.y * 0.08);
  if (id === "gale" || id === "choir") {
    ctx.fillStyle = id === "choir" ? "rgba(244,246,248,0.55)" : "rgba(180,196,208,0.35)";
    for (let i = 0; i < 8; i++) {
      const x = -200 + i * 780;
      ctx.beginPath();
      ctx.ellipse(x, 120 + (i % 3) * 30, 180, 36, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === "gear" || id === "roof") {
    for (let x = -300; x < 9000; x += 180) {
      ctx.fillStyle = id === "roof" ? "#2a3038" : "#3a3028";
      ctx.fillRect(x, 40, 70, 520);
      ctx.fillStyle = "rgba(230, 190, 120, 0.35)";
      for (let w = 0; w < 3; w++) ctx.fillRect(x + 12, 80 + w * 48, 16, 22);
    }
  } else if (id === "moon") {
    const planets: [number, number, string, number][] = [
      [400, 80, "#c46a4a", 28],
      [1600, 40, "#d8c07a", 18],
      [2800, 110, "#6a8cb4", 36],
    ];
    for (const [x, y, color, r] of planets) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y + Math.sin(t * 0.2 + x) * 6, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === "hallow" || id === "antler") {
    for (let i = 0; i < 12; i++) drawShoreTree(ctx, { x: -80 + i * 640, ground: 540, scale: 1.4, seed: 12 + i * 9 }, id === "hallow" ? 0.45 : 0.75);
  } else if (id === "tunnel") {
    ctx.fillStyle = "rgba(40,48,52,0.8)";
    for (let x = -200; x < 8000; x += 220) {
      ctx.beginPath();
      ctx.moveTo(x, 80);
      ctx.lineTo(x + 30, 260);
      ctx.lineTo(x + 70, 80);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawRealTree(ctx: CanvasRenderingContext2D, tree: Tree, alpha: number) {
  const rand = rng(tree.seed);
  ctx.save();
  ctx.translate(tree.x, tree.ground);
  ctx.scale(tree.scale, tree.scale);
  const ink = `rgba(108,110,106,${Math.min(0.78, alpha * 0.7)})`;
  const leaf = `rgba(132,136,128,${Math.min(0.62, alpha * 0.55)})`;
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-8, -4);
  ctx.quadraticCurveTo(-34, 6, -52, 14);
  ctx.moveTo(6, -4);
  ctx.quadraticCurveTo(32, 8, 50, 14);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-12, 12);
  ctx.quadraticCurveTo(-9, -70, -5, -128);
  ctx.lineTo(6, -126);
  ctx.quadraticCurveTo(10, -62, 13, 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(244,241,234,${Math.min(0.7, alpha * 0.55)})`;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-1, -16);
  ctx.quadraticCurveTo(2, -60, -1, -110);
  ctx.stroke();
  ctx.strokeStyle = ink;
  const tips: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const y0 = -48 - i * 14;
    const dir = i % 2 === 0 ? 1 : -1;
    const len = 46 + rand() * 62;
    const y2 = y0 - 28 - rand() * 42;
    const x2 = dir * len;
    ctx.lineWidth = Math.max(1.6, 5.2 - i * 0.6);
    ctx.beginPath();
    ctx.moveTo(dir * 2, y0);
    ctx.quadraticCurveTo(dir * len * 0.45, y0 - 8, x2, y2);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x2 * 0.62, (y0 + y2) * 0.5);
    ctx.quadraticCurveTo(x2 * 0.85, y2 - 12, x2 + dir * 10, y2 - 26);
    ctx.stroke();
    tips.push({ x: x2, y: y2 });
  }
  ctx.fillStyle = leaf;
  for (const tip of tips) {
    ctx.beginPath();
    ctx.ellipse(tip.x, tip.y - 8, 26 + rand() * 16, 16 + rand() * 10, (rand() - 0.5) * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(tip.x * 0.72, tip.y - 18, 16 + rand() * 8, 11 + rand() * 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(0, -158, 34, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(244,241,234,${Math.min(0.45, alpha * 0.32)})`;
  for (const tip of tips) {
    ctx.beginPath();
    ctx.ellipse(tip.x - 8, tip.y - 16, 10, 6, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.15;
  for (let i = 0; i < 5; i++) {
    const tip = tips[i % tips.length]!;
    const drop = 36 + rand() * 64;
    const sway = (rand() - 0.5) * 14;
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.quadraticCurveTo(tip.x + sway, tip.y + drop * 0.55, tip.x + sway * 0.4, tip.y + drop);
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
    if (sim.level.id === "mirror" && mirrorReal) {
      ctx.fillStyle = "#24302c";
      ctx.fillRect(rect.x, rect.y - 2, rect.w, 14);
      ctx.fillStyle = "rgba(186, 210, 200, 0.45)";
      ctx.fillRect(rect.x, rect.y, rect.w, 2);
      drawReeds(ctx, rect);
    } else if (sim.level.id === "latch" && latchReal) {
      const boards = Math.max(4, Math.floor(rect.w / 22));
      for (let i = 0; i < boards; i++) {
        ctx.fillStyle = i % 2 === 0 ? "#5a4030" : "#3e2c20";
        const bx = rect.x + (rect.w * i) / boards;
        ctx.fillRect(bx, rect.y, rect.w / boards - 1.5, 16);
      }
      ctx.fillStyle = "rgba(214, 186, 140, 0.4)";
      ctx.fillRect(rect.x, rect.y, rect.w, 2);
    } else if (sim.level.id === "shore" && shoreReal) {
      const soil = ctx.createLinearGradient(rect.x, rect.y - 8, rect.x, rect.y + 70);
      soil.addColorStop(0, "#6a6256");
      soil.addColorStop(0.18, "#3e382f");
      soil.addColorStop(1, "#161412");
      ctx.fillStyle = soil;
      ctx.fillRect(rect.x, rect.y - 6, rect.w, 78);
      ctx.fillStyle = "rgba(214, 206, 188, 0.55)";
      ctx.fillRect(rect.x, rect.y, rect.w, 3);
      const pebbles = rng((Math.floor(rect.x) * 3) >>> 0);
      ctx.fillStyle = "#8a8174";
      for (let i = 0; i < rect.w / 36; i++) {
        const px = rect.x + 8 + pebbles() * (rect.w - 16);
        ctx.beginPath();
        ctx.ellipse(px, rect.y + 10 + pebbles() * 8, 3 + pebbles() * 4, 2 + pebbles() * 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      drawReeds(ctx, rect);
    } else if (sim.level.id === "shore") {
      const lip = ctx.createLinearGradient(rect.x, rect.y - 16, rect.x, rect.y + 4);
      lip.addColorStop(0, "rgba(255,255,255,0)");
      lip.addColorStop(1, "rgba(244,241,234,0.55)");
      ctx.fillStyle = lip;
      ctx.fillRect(rect.x, rect.y - 14, rect.w, 16);
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fillRect(rect.x, rect.y, rect.w, 2);
    } else if (realLevel === sim.level.id) {
      drawRealCap(ctx, sim.level.id, rect);
    }
    if (sim.level.id === "shore") drawGrass(ctx, rect, 44, 2, shoreReal ? "#3f4c32" : "#070708");
    else if (realLevel === "antler" && sim.level.id === "antler") drawGrass(ctx, rect, 36, 2, "#3f4c32");
    else if (realLevel === "hallow" && sim.level.id === "hallow") drawGrass(ctx, rect, 28, 2, "#3a4a28");
    else if (realLevel === "yule" && sim.level.id === "yule") drawGrass(ctx, rect, 18, 1, "#e8eef2");
    else if (sim.level.id !== "roof" && sim.level.id !== "gale" && sim.level.id !== "choir" && sim.level.id !== "gear" && sim.level.id !== "hoist" && sim.level.id !== "hallow") drawGrass(ctx, rect, 26);
  }
  for (const rect of bodies) {
    if (rect.terrain) continue;
    if (rect.id.startsWith("ceil")) continue;
    if (rect.kind === "gate") drawGate(ctx, rect, sim.level.id === "latch" && latchReal);
    else if (rect.id.startsWith("trap")) drawTrapDoor(ctx, sim, rect);
    else if (sim.level.platforms.find((item) => item.id === rect.id)?.gear) drawGearTooth(ctx, sim, rect);
    else if (rect.kind === "sway" || rect.kind === "rope") {
      drawCage(ctx, rect, sim.rope < 1 && rect.id === "cageC", sim.t * (rect.id === "cageC" ? 1.4 : 0.65));
    } else if (rect.id.startsWith("glow")) drawLightPlank(ctx, sim, rect);
    else {
      if (shoreReal && sim.level.id === "shore" && (rect.kind === "crumble" || rect.kind === "oneway") && !rect.id.startsWith("glow")) {
        drawWood(ctx, rect);
        drawGrass(ctx, rect, 30, 2, "#3f4c32");
      } else if (latchReal && sim.level.id === "latch" && (rect.kind === "crumble" || rect.kind === "oneway")) {
        drawWood(ctx, rect);
      } else if (
        realLevel === sim.level.id &&
        (sim.level.id === "gale" || sim.level.id === "choir" || sim.level.id === "roof" || sim.level.id === "hallow" || sim.level.id === "yule" || sim.level.id === "antler") &&
        (rect.kind === "crumble" || rect.kind === "oneway")
      ) {
        drawWood(ctx, rect);
      } else if (realLevel === sim.level.id && (sim.level.id === "gear" || sim.level.id === "hoist") && (rect.kind === "crumble" || rect.kind === "oneway")) {
        drawMetal(ctx, rect);
      } else {
        drawPlank(ctx, rect, rect.kind === "crumble" || (sim.crumbles[rect.id]?.timer ?? 0) > 0.9, sim.level.id === "choir" || sim.level.id === "shore");
        if (sim.level.id === "shore" && (rect.kind === "crumble" || rect.kind === "oneway") && !rect.id.startsWith("glow")) drawGrass(ctx, rect, 30, 2);
      }
    }
  }
  drawLightGaps(ctx, sim);
  for (const plat of sim.level.platforms) {
    if (plat.kind === "ladder") {
      const shown = { ...plat, y: plat.y + escapeDy(sim, plat.id) };
      if (plat.id.startsWith("line")) drawRopeLine(ctx, shown);
      else drawLadder(ctx, shown);
    }
  }
  drawSaws(ctx, sim);
  drawBlood(ctx, sim);
  drawPumpkins(ctx, sim);
  if (sim.level.id === "hallow") drawHallowFog(ctx, sim.t);
  if (sim.level.id === "hoist") drawHoistHangs(ctx, sim);
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
  const lid = bodies.find((rect) => rect.id === "lid");
  if (lid) {
    ctx.fillStyle = "#070708";
    for (let x = lid.x + 6; x < lid.x + lid.w - 10; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, lid.y + lid.h);
      ctx.lineTo(x + 8, lid.y + lid.h + 28);
      ctx.lineTo(x + 16, lid.y + lid.h);
      ctx.fill();
    }
  }
}

function drawCagedFriend(
  ctx: CanvasRenderingContext2D,
  sprites: GenerationSprites | null,
  sim: Sim,
  reduced: boolean,
  cloth: string | null,
  spec: {
    rope: number;
    feast: number;
    startX: number;
    landX: number;
    hangTop: number;
    landTop: number;
    floor: number;
    axleX: number;
    wireY: number;
    empty?: boolean;
  },
) {
  const free = spec.rope >= 1;
  const startX = spec.startX;
  const landX = spec.landX;
  const cageW = 84;
  const cageH = 100;
  const hangTop = spec.hangTop;
  const landTop = spec.landTop;
  const floor = spec.floor;
  const back = spec.feast < 4.9 ? 0 : Math.min(1, (spec.feast - 4.9) / 1.5);
  const ride = spec.rope * (1 - back);
  const cageX = startX + (landX - startX) * ride;
  const dropTop = hangTop + (landTop - hangTop) * ride;
  const home = ride < 0.04;
  const sway = (!free || home) && !reduced ? Math.sin(sim.t * 1.3) * 6 : 0;
  const top = dropTop;
  const cheer = free && spec.feast < 3 && !reduced ? Math.abs(Math.sin(sim.t * 7)) * 10 : 0;
  const melt = free ? Math.min(1, Math.max(0, (spec.feast - 3) / 0.85)) : 0;
  const x = cageX + 22 + sway;
  const y = top + cageH - PH - cheer;
  const hookX = cageX + cageW / 2 + sway;
  ctx.strokeStyle = "#c8c6c0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(spec.axleX, spec.wireY);
  ctx.lineTo(hookX, spec.wireY);
  ctx.lineTo(hookX, top);
  ctx.stroke();
  const turn = spec.rope * Math.PI * 6 + sim.t * 0.4;
  drawSheave(ctx, spec.axleX, spec.wireY, 10, turn);
  drawSheave(ctx, hookX, spec.wireY, 10, -turn);
  if (melt < 1 && !spec.empty) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 24, y + melt * 46, 70, 80);
    ctx.clip();
    drawFriend(
      ctx,
      sprites,
      { x, y, facing: sim.facing, walking: false, anim: 0, hurt: 0, vx: sim.vx, vy: 0 },
      sim.t,
      reduced,
      false,
      cloth,
    );
    ctx.restore();
  }
  if (melt > 0.4) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (melt - 0.4) / 0.45);
    drawCageBones(ctx, cageX + cageW / 2 + sway, top + cageH - 10);
    ctx.restore();
  }
  ctx.save();
  ctx.translate(sway, 0);
  ctx.fillStyle = "#070708";
  ctx.fillRect(cageX, top, cageW, 7);
  ctx.fillRect(cageX, top + cageH - 7, cageW, 7);
  for (let i = 0; i < 5; i++) ctx.fillRect(cageX + 6 + i * 18, top, 4, cageH);
  ctx.restore();
  if (free && spec.feast < 3 && !spec.empty) {
    ctx.strokeStyle = "#f4f1ea";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 14);
    ctx.lineTo(x - 10, y);
    ctx.moveTo(x + 16, y + 14);
    ctx.lineTo(x + 28, y);
    ctx.stroke();
  }
  if (free && back === 0 && spec.feast > 3 && spec.feast < 4.7) {
    drawAcidDump(ctx, landX + cageW / 2, landTop, sim.t, Math.min(1, (spec.feast - 3) / 0.35));
  }

  const axleX = spec.axleX;
  const axleY = floor - 46;
  const spin = spec.rope * Math.PI * 6;
  const r = 26;
  ctx.strokeStyle = "#c8c6c0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(axleX, floor);
  ctx.lineTo(axleX, axleY);
  ctx.stroke();
  drawSheave(ctx, axleX, axleY, r, spin);
  const hx = axleX + Math.cos(spin) * (r + 8);
  const hy = axleY + Math.sin(spin) * (r + 8);
  ctx.strokeStyle = "#f4f1ea";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(axleX + Math.cos(spin) * r * 0.2, axleY + Math.sin(spin) * r * 0.2);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(hx, hy, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#f4f1ea";
  ctx.fill();
  ctx.strokeStyle = "#c8c6c0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(axleX, axleY - r);
  ctx.lineTo(axleX, spec.wireY);
  ctx.stroke();
}

function drawAcidDump(ctx: CanvasRenderingContext2D, x: number, cageTop: number, t: number, open: number) {
  ctx.save();
  ctx.translate(x, cageTop - 6);
  ctx.fillStyle = "#14160e";
  ctx.fillRect(-22, -10, 44, 12);
  ctx.strokeStyle = "#d7e86a";
  ctx.lineWidth = 2;
  ctx.strokeRect(-22, -10, 44, 12);
  const len = 78 * open;
  ctx.strokeStyle = "rgba(198, 226, 74, 0.92)";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(Math.sin(t * 9) * 2, len);
  ctx.stroke();
  ctx.fillStyle = "#d2ee55";
  for (let i = 0; i < 6; i++) {
    const dy = (t * 110 + i * 19) % Math.max(8, len);
    ctx.fillRect(-8 + i * 3, dy, 2, 7);
  }
  ctx.restore();
  ctx.fillStyle = "rgba(190, 214, 60, 0.55)";
  ctx.fillRect(x - 28, cageTop + 86, 56, 6 + open * 4);
}

function drawSheave(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, spin: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = "#101114";
  ctx.fill();
  ctx.lineWidth = Math.max(4, r * 0.22);
  ctx.strokeStyle = "#f4f1ea";
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
  ctx.fillStyle = "#2c2c30";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#c8c4bc";
  ctx.stroke();
  ctx.strokeStyle = "#f4f1ea";
  ctx.lineWidth = Math.max(2, r * 0.07);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2);
    ctx.lineTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = "#f4f1ea";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(1.5, r * 0.05), 0, Math.PI * 2);
  ctx.fillStyle = "#111114";
  ctx.fill();
  ctx.restore();
}

const PUDDLE = [
  "........######..................",
  "......##..##..##................",
  "......#...##...#................",
  "......##..##..##.....###........",
  "........######....########......",
  "...####..##.##.##.#####..##.....",
  ".######.....##.....##.....###...",
  "###..##.....##......#....#####..",
  ".##.........##............###...",
  "..###...................####....",
];

function drawCageBones(ctx: CanvasRenderingContext2D, x: number, floorY: number, scale = 1.55) {
  const row = PUDDLE[0]!.length;
  const w = row * scale;
  const h = PUDDLE.length * scale;
  const left = x - w / 2;
  const top = floorY - h;
  ctx.fillStyle = "rgba(198, 220, 70, 0.45)";
  ctx.beginPath();
  ctx.ellipse(x, floorY - 3, w * 0.42, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f7f4ee";
  PUDDLE.forEach((line, py) => {
    for (let px = 0; px < line.length; px++) {
      if (line[px] === "#") ctx.fillRect(left + px * scale, top + py * scale, scale, scale);
    }
  });
}

function drawPulley(ctx: CanvasRenderingContext2D, sim: Sim) {
  const rope = sim.level.rope;
  if (!rope) return;
  const fall = sim.crumbles.lid?.fall ?? 0;
  const lidY = 180 + fall;
  const wall = 2012;
  const crankY = 948;
  const crown = 36;
  const lidX = 2064;
  const spin = sim.rope * Math.PI * 8;
  ctx.save();
  ctx.strokeStyle = "#f4f1ea";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(wall, crankY - 34);
  ctx.lineTo(wall, crown);
  ctx.lineTo(lidX, crown);
  ctx.lineTo(lidX, lidY);
  ctx.stroke();
  drawSheave(ctx, wall, crown, 16, spin);
  drawSheave(ctx, lidX, crown, 16, -spin);
  drawSheave(ctx, wall, crankY, 32, spin);
  const hx = wall + Math.cos(spin) * 40;
  const hy = crankY + Math.sin(spin) * 40;
  ctx.beginPath();
  ctx.moveTo(wall, crankY);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  ctx.fillStyle = "#f4f1ea";
  ctx.beginPath();
  ctx.arc(hx, hy, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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

function drawGrass(ctx: CanvasRenderingContext2D, rect: RectLike, tall: number, dense = 1, color = "#070708") {
  const rand = rng((Math.floor(rect.x) * 13 + Math.floor(rect.y)) >>> 0);
  const blades = Math.max(6, Math.floor(rect.w / (dense > 1 ? 3 : 6)));
  for (let i = 0; i < blades; i++) {
    const x = rect.x + ((i + rand() * 0.6) / blades) * rect.w;
    const h = 6 + rand() * tall;
    const lean = (rand() - 0.45) * h * 0.45;
    const wide = rand() > 0.82 ? 3.4 : 1.6;
    ctx.fillStyle = (color === "#3f4c32" || color === "#3a4a28") && rand() > 0.72 ? "#6d7d4a" : color;
    ctx.beginPath();
    ctx.moveTo(x, rect.y + 3);
    ctx.lineTo(x + lean, rect.y - h);
    ctx.lineTo(x + wide, rect.y + 3);
    ctx.closePath();
    ctx.fill();
  }
}

function drawReeds(ctx: CanvasRenderingContext2D, rect: RectLike) {
  const rand = rng((Math.floor(rect.x) * 7 + 19) >>> 0);
  ctx.strokeStyle = "#5c6a48";
  ctx.lineCap = "round";
  const clumps = Math.max(1, Math.floor(rect.w / 90));
  for (let i = 0; i < clumps; i++) {
    const x = rect.x + 16 + rand() * (rect.w - 32);
    for (let k = 0; k < 4; k++) {
      const h = 18 + rand() * 28;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + k * 3, rect.y + 6);
      ctx.quadraticCurveTo(x + k * 3 + (rand() - 0.5) * 8, rect.y - h * 0.6, x + k * 3 + (rand() - 0.5) * 10, rect.y - h);
      ctx.stroke();
    }
  }
}

function drawWood(ctx: CanvasRenderingContext2D, rect: RectLike) {
  const boards = Math.max(1, Math.floor(rect.w / 18));
  const bw = rect.w / boards;
  for (let i = 0; i < boards; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#5a4636" : "#3e3126";
    ctx.fillRect(rect.x + i * bw, rect.y, bw - 1.5, 10);
    ctx.strokeStyle = "rgba(214, 186, 146, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rect.x + i * bw + 3, rect.y + 3);
    ctx.lineTo(rect.x + (i + 1) * bw - 5, rect.y + 7);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(232, 224, 206, 0.45)";
  ctx.fillRect(rect.x, rect.y, rect.w, 2);
}

function drawLightPlank(ctx: CanvasRenderingContext2D, sim: Sim, rect: RectLike & { id: string }) {
  const left = sim.bridgeLeft[rect.id] ?? 0;
  const held = sim.bridgeHold[rect.id];
  ctx.save();
  ctx.fillStyle = "#f7f4ee";
  ctx.shadowColor = "#f7f4ee";
  ctx.shadowBlur = 16;
  ctx.fillRect(rect.x, rect.y, rect.w, 8);
  ctx.shadowBlur = 0;
  if (!held && left > 0) {
    ctx.fillStyle = "#c43838";
    ctx.fillRect(rect.x, rect.y + 8, rect.w * Math.min(1, left / 13), 3);
  }
  ctx.restore();
}

function drawLightGaps(ctx: CanvasRenderingContext2D, sim: Sim) {
  for (const plat of sim.level.platforms) {
    if (!plat.bridge || (sim.bridgeLeft[plat.id] ?? 0) > 0) continue;
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = "#f7f4ee";
    ctx.fillRect(plat.x, plat.y, plat.w, 6);
    ctx.restore();
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

function drawCage(ctx: CanvasRenderingContext2D, rect: RectLike, occupied: boolean, spin = 0) {
  const x = rect.x;
  const y = rect.y;
  const w = rect.w;
  const h = 86;
  const axleY = y - 168;
  const left = x + 14;
  const right = x + w - 14;
  ctx.strokeStyle = "#1a1c20";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(left - 8, axleY);
  ctx.lineTo(right + 8, axleY);
  ctx.stroke();
  ctx.strokeStyle = "#c8c4bc";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(left, y);
  ctx.lineTo(left, axleY);
  ctx.moveTo(right, y);
  ctx.lineTo(right, axleY);
  ctx.stroke();
  drawSheave(ctx, left, axleY, 9, spin);
  drawSheave(ctx, right, axleY, 9, -spin);
  ctx.strokeStyle = "#0a0a0b";
  ctx.lineWidth = 2;
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

function drawGate(ctx: CanvasRenderingContext2D, rect: RectLike, iron = false) {
  const x = rect.x;
  const y = rect.y;
  if (iron) {
    ctx.fillStyle = "#2c241c";
    ctx.fillRect(x - 6, y, rect.w + 12, 12);
    ctx.fillRect(x - 6, y + rect.h - 10, rect.w + 12, 10);
    ctx.fillStyle = "#6e5a48";
    const bars = 4;
    for (let i = 0; i < bars; i++) {
      const bx = x + (rect.w * (i + 0.5)) / bars - 2;
      ctx.fillRect(bx, y, 4, rect.h);
      ctx.fillStyle = "rgba(196, 140, 80, 0.55)";
      ctx.fillRect(bx, y + 18 + (i % 2) * 26, 4, 6);
      ctx.fillStyle = "#6e5a48";
    }
    ctx.fillStyle = "rgba(232, 210, 170, 0.7)";
    ctx.fillRect(x - 6, y, rect.w + 12, 3);
    return;
  }
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
  const lift = sim.level.id === "latch" ? sim.cage * 156 : 0;
  ctx.textAlign = "center";
  lock.code.forEach((digit, index) => {
    const gate = gates[index];
    if (!gate) return;
    const gx = gate.x + gate.w / 2;
    ctx.save();
    ctx.shadowColor = "#f7f4ee";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "#f7f4ee";
    ctx.fillRect(gx - 18, 168, 36, 40);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#111114";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText(String(digit), gx, 198);
    ctx.restore();
  });
  const y = lock.y - lift;
  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(lock.x + lock.span / 2 - 18, y - 86, 36, 24);
  ctx.beginPath();
  ctx.arc(lock.x + lock.span / 2, y - 86, 16, Math.PI, 0);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#f4f1ea";
  ctx.stroke();
  const slot = lock.span / lock.code.length;
  lock.code.forEach((_, index) => {
    const x = lock.x + slot * index;
    const hot = sim.nearCombo === index;
    ctx.fillStyle = hot ? "#f7f4ee" : "#f4f1ea";
    ctx.fillRect(x + 6, y - 58, slot - 12, 50);
    ctx.fillStyle = "#111114";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText(String(sim.combo[index] ?? 0), x + slot / 2, y - 22);
  });
}

function drawBlackHole(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, locked: boolean) {
  ctx.save();
  ctx.translate(x, y);
  const spin = t * 0.85;
  const count = 640;
  for (let i = 0; i < count; i++) {
    const u = i / count;
    const arm = i % 4;
    const ang = spin + u * Math.PI * 9 + arm * 1.57 + Math.sin(i * 12.3) * 0.15;
    const wave = Math.sin(ang * 2.4 + u * 8) * (6 + u * 16);
    const rad = 16 + Math.pow(u, 0.85) * 86 + wave;
    const px = Math.cos(ang) * rad * 1.25;
    const py = Math.sin(ang) * rad * 0.78;
    const fade = locked ? 0.28 : 0.2 + (1 - u) * 0.8;
    ctx.fillStyle = `rgba(244,241,234,${fade})`;
    const s = u < 0.2 ? 1.8 : u < 0.55 ? 1.25 : 0.85;
    ctx.fillRect(px, py, s, s);
  }
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.restore();
}

function drawChoirMarks(ctx: CanvasRenderingContext2D) {
  const marks: [number, number, number][] = [
    [3, 700, 430],
    [8, 180, 748],
    [5, 2340, 250],
  ];
  ctx.textAlign = "center";
  for (const [digit, x, y] of marks) {
    ctx.save();
    ctx.shadowColor = "#f7f4ee";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#f7f4ee";
    ctx.fillRect(x - 16, y - 30, 32, 38);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#111114";
    ctx.font = "bold 26px sans-serif";
    ctx.fillText(String(digit), x, y);
    ctx.restore();
  }
}

function drawHoistHangs(ctx: CanvasRenderingContext2D, sim: Sim) {
  const hangs: { id: string; x: number; lamp: string }[] = [
    { id: "arm", x: 240, lamp: "l-arm" },
    { id: "arm", x: 760, lamp: "l-arm" },
    { id: "high", x: 180, lamp: "l-high" },
    { id: "high", x: 640, lamp: "l-high" },
    { id: "exit", x: 1680, lamp: "l-gantry" },
    { id: "exit", x: 1980, lamp: "l-gantry" },
    { id: "gantry", x: 2140, lamp: "l-gantry" },
    { id: "beam3", x: 2480, lamp: "l-crane" },
    { id: "beam3", x: 2700, lamp: "l-crane" },
    { id: "crane2", x: 3220, lamp: "l-crane" },
    { id: "crane2", x: 3580, lamp: "l-crane" },
    { id: "nest", x: 4360, lamp: "l-nest" },
    { id: "loft", x: 4520, lamp: "l-nest" },
    { id: "lockdeck", x: 4920, lamp: "l-lock" },
    { id: "lockdeck", x: 5180, lamp: "l-lock" },
  ];
  for (const hang of hangs) {
    const plat = sim.level.platforms.find((item) => item.id === hang.id);
    if (!plat || hang.x < plat.x + 8 || hang.x > plat.x + plat.w - 8) continue;
    const y = plat.y + plat.h;
    const on = sim.altars.has(hang.lamp);
    ctx.fillStyle = "#141418";
    ctx.fillRect(hang.x - 8, y - 3, 16, 6);
    ctx.fillRect(hang.x - 1, y, 2, 18);
    if (on) {
      const glow = ctx.createRadialGradient(hang.x, y + 30, 2, hang.x, y + 36, 117);
      glow.addColorStop(0, "rgba(255,255,255,0.98)");
      glow.addColorStop(0.4, "rgba(244,241,234,0.55)");
      glow.addColorStop(1, "rgba(244,241,234,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(hang.x, y + 36, 117, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f7f4ee";
    } else ctx.fillStyle = "#2c2c30";
    ctx.beginPath();
    ctx.arc(hang.x, y + 22, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(hang.x - 7, y + 20, 14, 3);
  }
}

function drawHoistMarks(ctx: CanvasRenderingContext2D) {
  const marks: [number, number, number][] = [
    [6, 420, 78],
    [1, 160, 518],
    [9, 3360, 38],
  ];
  ctx.textAlign = "center";
  for (const [digit, x, y] of marks) {
    ctx.save();
    ctx.shadowColor = "#f7f4ee";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#f7f4ee";
    ctx.fillRect(x - 16, y - 30, 32, 38);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#111114";
    ctx.font = "bold 26px sans-serif";
    ctx.fillText(String(digit), x, y);
    ctx.restore();
  }
}

function drawChoirBalloon(ctx: CanvasRenderingContext2D, sim: Sim) {
  const flying = sim.cage > 0;
  const x = flying ? sim.x + PW / 2 : 2455;
  const foot = flying ? sim.y + PH : -312;
  const basketTop = foot - 26;
  const y = basketTop - 36;
  ctx.save();
  ctx.fillStyle = "#f4f1ea";
  ctx.beginPath();
  ctx.moveTo(x, y + 8);
  ctx.bezierCurveTo(x - 62, y - 10, x - 48, y - 96, x, y - 108);
  ctx.bezierCurveTo(x + 48, y - 96, x + 62, y - 10, x, y + 8);
  ctx.fill();
  ctx.fillStyle = "#111114";
  ctx.fillRect(x - 3, y - 96, 6, 88);
  ctx.beginPath();
  ctx.moveTo(x - 22, y - 20);
  ctx.lineTo(x, y - 70);
  ctx.lineTo(x + 22, y - 20);
  ctx.fill();
  ctx.strokeStyle = "#3a3a3e";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 16, y + 6);
  ctx.lineTo(x - 18, basketTop);
  ctx.moveTo(x + 16, y + 6);
  ctx.lineTo(x + 18, basketTop);
  ctx.stroke();
  ctx.fillStyle = "#050506";
  ctx.fillRect(x - 22, basketTop, 44, 28);
  ctx.strokeStyle = "#0a0a0c";
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 22, basketTop, 44, 28);
  ctx.restore();
}

function drawGlider(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  const flap = Math.sin(t * 2.2) * 2;
  ctx.beginPath();
  ctx.moveTo(-78, 10 + flap);
  ctx.quadraticCurveTo(-30, -2, 18, -2);
  ctx.quadraticCurveTo(52, 0, 86, -18);
  ctx.quadraticCurveTo(74, -6, 46, 8);
  ctx.quadraticCurveTo(8, 14, -78, 16 + flap);
  ctx.closePath();
  ctx.fillStyle = "#5a6a32";
  ctx.fill();
  ctx.fillStyle = "#2a2418";
  for (let i = -60; i < 70; i += 14) ctx.fillRect(i, 2 + (i % 3), 7, 6);
  ctx.fillStyle = "#8a7040";
  for (let i = -50; i < 60; i += 18) ctx.fillRect(i + 4, 6, 6, 4);
  ctx.fillStyle = "#1c1c14";
  ctx.fillRect(-8, 0, 10, 8);
  ctx.strokeStyle = "#d0ccc4";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-6, 6);
  ctx.lineTo(2, 34);
  ctx.lineTo(12, 6);
  ctx.moveTo(-16, 32);
  ctx.lineTo(20, 32);
  ctx.stroke();
  ctx.restore();
}

function drawMark(ctx: CanvasRenderingContext2D, sim: Sim) {
  const spot = markSpot(sim.level);
  const x = spot.x;
  const y = spot.surface;
  ctx.fillStyle = "#141418";
  ctx.fillRect(x - 8, y - 28, 16, 28);
  ctx.strokeStyle = sim.kept ? "#f4f1ea" : "#8a8680";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 8, y - 28, 16, 28);
  ctx.fillStyle = sim.kept ? "#f4f1ea" : "#c8c4bc";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(sim.kept ? "•" : "2", x, y - 10);
}

function drawEscapeToll(ctx: CanvasRenderingContext2D, sim: Sim) {
  const x = 4048;
  const y = 1040;
  const top = 740 + escapeDy(sim, "e1");
  ctx.strokeStyle = "#c8c4bc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 18, y - 28);
  ctx.lineTo(4411, top);
  ctx.stroke();
  ctx.fillStyle = "#141418";
  ctx.fillRect(x, y - 36, 40, 36);
  ctx.strokeStyle = "#f4f1ea";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y - 36, 40, 36);
  ctx.fillStyle = sim.toll > 0 ? "#3a3a3e" : "#f4f1ea";
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(sim.toll > 0 ? "" : "3", x + 20, y - 12);
  ctx.fillStyle = "#2a2a2e";
  ctx.fillRect(x + 14, y - 8, 12, 3);
}

function drawExitSnare(ctx: CanvasRenderingContext2D, sim: Sim) {
  if (sim.cage <= 0) return;
  const x = 4984;
  const w = 180;
  const lift = sim.cage * 156;
  const floor = 468 - lift;
  const top = floor - 108;
  ctx.strokeStyle = "#f4f1ea";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, 28);
  ctx.lineTo(x + w / 2, top);
  ctx.stroke();
  drawSheave(ctx, x + w / 2, 28, 12, sim.t * sim.cage * 3);
  const pour = !comboSet(sim) ? Math.max(0, Math.min(1, (sim.feast - 17) / 3)) : 0;
  drawAcidDump(ctx, x + w / 2, top, sim.t, pour);
  ctx.fillStyle = "#070708";
  ctx.fillRect(x, top, w, 7);
  ctx.fillRect(x, floor - 7, w, 7);
  for (let i = 0; i < 6; i++) ctx.fillRect(x + 8 + i * 32, top, 4, floor - top);
  if (!comboSet(sim) && sim.dead <= 0) {
    const left = Math.max(0, Math.ceil(20 - sim.feast));
    ctx.fillStyle = left <= 5 ? "#d2ee55" : "#f7f4ee";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(left), x + w / 2, floor - 40);
  }
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

const CAPE_DRAPE = [
  "...............................k....",
  "..............................knn...",
  ".............................knnnd..",
  "............................kbnknn..",
  "...........................kknnknn..",
  "...........................knnnkknk.",
  "...........................nnnkddnn.",
  "..........................knnndd.dn.",
  ".........................knnnkdd.knk",
  ".........................knnkddk..nk",
  "........................kbndkddk...k",
  ".......................kkbdknddk....",
  ".......................kbnnkbddd....",
  "......................kkbnndbdbk....",
  "......................kdnndbbnnk....",
  "......................bbnndbbnbk....",
  ".....................kdnnddbnnbk....",
  "....................knnnddbbnnndk...",
  "....................kbnndbbbnnndk...",
  "...................knnnnbbnnnnndk...",
  "..................knnnndbnnnnnkdk...",
  "..................knnnndnnnnnkkndk..",
  ".................knnnnddnnnnkkkndk..",
  ".................bnnnddnnkkkkkkndk..",
  "...............kdnnbdddnnkkkkddnnk..",
  "...............nnnddddnnkkknndnnnn..",
  "..............bnnkdddddnkknnnndnnd..",
  ".............bnnndddddnkknnnnndnnd..",
  "............nnnnddddkknnnnndddddddd.",
  "..........kknnnddddkknnnddndddddddd.",
  ".........kdnkkdddkkknnndddddddddddd.",
  "........knddddddkkknddddddddkdddddd.",
  ".......nnkdddddddddddddddnnnkdddddd.",
  "......nkkddddddddddddddbbbnnnkdddnk.",
  ".....nnnndddnnddddkddbnbbbbnnkkkdn..",
  "....ndnnnndnnddddnnbbbnbbbnnnnkknk..",
  "...knnnnnnnnddkdnnbbbbnnbnnkknnknk..",
  "..bbknnnnnnnndknnbbbnnnnnnnk.knnnk..",
  "..bnnnnnnnnnnnnnbdddnnnnnnk...kn....",
  ".bnnnnnnnknnnnnnddddnnnnnkk.........",
  ".bnnnnnnkkknddkddddnnnnnnkk.........",
  "kbddnddnnnnnddddddddnnnnnk..........",
  "kbddnddbknnndddddddddnnndd..........",
  "kbddddk...kdnddddddddnnddk..........",
  "kdndnk......dbndddddddddd...........",
  "kdndk........kdbndddnddk............",
  "kdnk...........dddbnk.d.............",
  "kndk.............kk.k...............",
  "knk.................................",
  "kn..................................",
  ".k..................................",
  ".k..................................",
];

const CAPE_RIDGE: number[] = [];
CAPE_DRAPE.forEach((row, y) => {
  for (let x = 0; x < row.length; x++) {
    if ((row[x] ?? ".") !== "." && CAPE_RIDGE[x] === undefined) CAPE_RIDGE[x] = y;
  }
});

function drawDrapedCape(
  ctx: CanvasRenderingContext2D,
  cloth: string,
  t: number,
  vx: number,
  facing: number,
) {
  const size = 0.88;
  const tipX = 31;
  const run = Math.max(-1, Math.min(1, (vx * facing) / 180));
  const bands = ["#ff2bd6", "#ff3b5c", "#ff6a00", "#ffb000", "#ffe14a", "#7dff3a", "#2ee6a0", "#2ee6ff", "#2f7bff", "#7a4dff"];
  const tone: Record<string, string> =
    cloth === "white"
      ? { k: "#1a1a1c", n: "#f4f4f4", d: "#8e8e94", b: "#ffffff" }
      : cloth === "pink"
        ? { k: "#3a0418", n: "#ff3d9a", d: "#c21868", b: "#ff8ec6" }
        : cloth === "blue"
        ? { k: "#061433", n: "#1a6dff", d: "#0c3a8a", b: "#5aa6ff" }
        : cloth === "scarlet"
          ? { k: "#f7f7f7", n: "#d01218", d: "#8a0c12", b: "#ffffff" }
        : cloth === "frost"
          ? { k: "#0a2a55", n: "#7ec8f0", d: "#2f7ec4", b: "#f4fbff" }
          : cloth === "gilded"
            ? { k: "#e2b007", n: "#c01018", d: "#7a0a10", b: "#f0c014" }
            : cloth === "camo"
          ? { k: "#14120e", n: "#6a4e28", d: "#2c2618", b: "#c4a56a" }
          : { k: "#240406", n: "#e10600", d: "#7a0906", b: "#ff5a42" };
  const stripes = ["#d01218", "#f7f7f7", "#1a3fbf"];
  const stripeShade = ["#8e0c12", "#c8c8ce", "#0d226e"];
  CAPE_DRAPE.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const mark = row[x] ?? ".";
      if (mark === ".") continue;
      const gust = Math.sin(t * 1.7) * 3.2 + Math.sin(t * 4.3 + y * 0.15) * 1.4;
      const back = Math.max(0, tipX - x);
      const ripple = Math.sin(t * 6.2 + y * 0.28 + back * 0.2) * (0.7 + Math.abs(run) * 1.6);
      const trail = back * (0.7 + Math.max(0, run) * 1.25);
      let color = tone[mark] ?? tone.n;
      if (cloth === "rainbow") color = mark === "k" ? "#141416" : bands[Math.min(bands.length - 1, Math.floor((y / CAPE_DRAPE.length) * bands.length))]!;
      if (cloth === "halloween") {
        const band = Math.floor((x + y) / 5) % 4;
        const colors = ["#f08a14", "#6a2ca8", "#f3d7b0", "#7a3cc0"];
        const shades = ["#c45a08", "#3d1468", "#d8c0a0", "#4a1878"];
        color = mark === "k" ? "#1a0a14" : mark === "d" ? shades[band]! : colors[band]!;
      }
      if (cloth === "yule") {
        const band = Math.floor((x + y) / 4) % 3;
        const colors = ["#d01218", "#0d7a32", "#f7f7f7"];
        const shades = ["#8a0c12", "#064a1e", "#c8c8c8"];
        color = mark === "k" ? "#062010" : mark === "d" ? shades[band]! : colors[band]!;
      }
      if (cloth === "christmas") {
        const top = CAPE_RIDGE[x] ?? y;
        const snow = y <= top + 2;
        const flake = (x * 13 + y * 7) % 17 === 0;
        color = snow || flake ? (mark === "d" ? "#d0d0d4" : "#f7f7f7") : mark === "k" ? "#3a0608" : mark === "d" ? "#8a0c12" : "#e10600";
      }
      if (cloth === "stripes") {
        const band = Math.floor((x + y) / 5) % 3;
        color = mark === "k" ? "#12060a" : mark === "d" ? stripeShade[band]! : stripes[band]!;
      }
      if (cloth === "gold") {
        const band = Math.floor((x * 0.45 + y) / 6) % 2;
        color = mark === "k" ? "#1a1404" : band === 0 ? (mark === "d" ? "#c4920a" : "#f2c014") : mark === "d" ? "#0c226e" : "#1d4ed8";
      }
      if (cloth === "black") {
        color = mark === "k" ? "#050505" : mark === "b" ? "#4a4a4a" : mark === "d" ? "#141414" : "#2c2c2c";
      }
      if (cloth === "ember") {
        const streak = (x * 2 + y) % 6;
        if (streak > 2) continue;
        color = streak === 0 ? "#ff6a00" : streak === 1 ? "#ff3d00" : "#1a0a04";
      }
      ctx.fillStyle = color!;
      ctx.fillRect((x - tipX) * size - trail - gust * (back / 34) - 18, -34 + y * size + ripple, size, size);
    }
  });
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

  const draped = cloth === "cape" || cloth === "white" || cloth === "rainbow" || cloth === "camo" || cloth === "stripes" || cloth === "pink" || cloth === "halloween" || cloth === "black" || cloth === "gold" || cloth === "ember" || cloth === "scarlet" || cloth === "blue" || cloth === "yule" || cloth === "frost" || cloth === "gilded" || cloth === "christmas";
  if (layer === "back" && draped) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-120, -36, 240, 140);
    ctx.clip();
    drawDrapedCape(ctx, cloth, t, vx, facing);
    ctx.restore();
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
  const bottom = sim.wake > 0 && sim.stalkY > 40 ? sim.stalkY : spec.surface;
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
  pose: { x: number; y: number; facing: 1 | -1; walking: boolean; anim: number; hurt: number; vx?: number; vy?: number; climbing?: boolean },
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
  if (body.climbing) {
    if (cloth) drawOutfit(ctx, cloth, center, bottom, 1, "back", t, 0, body.vy ?? 0);
    drawClimber(ctx, center, bottom, body.anim, body.vy ?? 0, body.hurt, t);
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

const CLIMB_STILL = [
  "..####....####..",
  ".##############.",
  ".##############.",
  ".##############.",
  ".##############.",
  "..############..",
  "....########....",
  "....########....",
  "...##########...",
  "..############..",
  ".#.##########.#.",
  ".##.########.##.",
  ".##.########.##.",
  "..#.########.#..",
  "....###..###....",
  "....###..###....",
  "....##....##....",
  "...###....###...",
  "...###....###...",
];

const CLIMB_LEFT = [
  "..####....####..",
  ".##############.",
  ".##############.",
  ".##############.",
  ".##############.",
  "..############..",
  "....########....",
  "#...########....",
  "#...########....",
  "#..##########...",
  "....##########..",
  "....########.#..",
  "....########.##.",
  "....########..#.",
  ".....###..###...",
  "....###..###....",
  "....##....##....",
  "...###....##....",
  "...###....###...",
];

const CLIMB_RIGHT = [
  "..####....####..",
  ".##############.",
  ".##############.",
  ".##############.",
  ".##############.",
  "..############..",
  "....########....",
  "....########...#",
  "....########...#",
  "...##########..#",
  "..##########....",
  "..#.########....",
  ".##.########....",
  ".#..########....",
  "...###..###.....",
  "....###..###....",
  "....##....##....",
  "....##....###...",
  "...###....###...",
];

function drawClimber(
  ctx: CanvasRenderingContext2D,
  center: number,
  bottom: number,
  anim: number,
  vy: number,
  hurt: number,
  t: number,
) {
  const moving = Math.abs(vy) > 8;
  const step = moving ? Math.floor(anim * 8) % 2 : 0;
  const rows = !moving ? CLIMB_STILL : step === 0 ? CLIMB_LEFT : CLIMB_RIGHT;
  const scale = 2;
  const width = rows[0]!.length * scale;
  const height = rows.length * scale;
  const left = Math.round(center - width / 2);
  const top = Math.round(bottom - height);
  ctx.save();
  if (hurt > 0 && Math.floor(t * 24) % 2 === 0) ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#f4f1ea";
  rows.forEach((row, py) => {
    for (let px = 0; px < row.length; px++) {
      if (row[px] !== "#") continue;
      ctx.fillRect(left + px * scale - 1, top + py * scale - 1, scale + 2, scale + 2);
    }
  });
  ctx.fillStyle = "#070708";
  rows.forEach((row, py) => {
    for (let px = 0; px < row.length; px++) {
      if (row[px] !== "#") continue;
      ctx.fillRect(left + px * scale, top + py * scale, scale, scale);
    }
  });
  ctx.restore();
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

const ALIEN = [
  "...##............##...",
  ".....#..........#.....",
  ".....##.######.##.....",
  "......##########......",
  ".....############.....",
  "....##############....",
  "...################...",
  "...####.######.####...",
  "...###...####...###...",
  "...####..####..####...",
  "....##############....",
  "....##############....",
  ".....####....####.....",
  "......##########......",
  ".......########.......",
  "........######........",
  ".........####.........",
  ".........####.........",
  "......##########......",
  ".....############.....",
  ".....############.....",
  "....##############....",
  "....##.########.##....",
  "...##..########..##...",
  "...##..########..##...",
  "..###..########..###..",
  "..##...########...##..",
  "..##....#######...##..",
  "#####...#######..#####",
  "###.##..##..###.##.###",
  "#.#....###..###....#.#",
  ".......##....##.......",
  ".......##....##.......",
  ".......##....##.......",
  ".....####....####.....",
  "....######..######....",
];

const SHIP = [
  ".........#............#.........",
  "..........#....##....#..........",
  "..........##.######.##..........",
  "...........##########...........",
  "...........##########...........",
  "..........############..........",
  "..........############..........",
  ".........##############.........",
  "......#####..######..#####......",
  "....####.##############.####....",
  "..####.....##########.....####..",
  "###..........................###",
  "##.#........................#.##",
  "###.....#..............#.....###",
  "######....................######",
  ".##.########################.##.",
  "...#####.##############.#####...",
  "......####################......",
  ".......####....##....####.......",
  "......##..####.##.####..##......",
  "......###......##......###......",
  ".....###.......##.......###.....",
  "....#####.....####.....#####....",
  ".....###......####......###.....",
];

function blitWhite(ctx: CanvasRenderingContext2D, rows: readonly string[], scale: number) {
  const w = rows[0]!.length * scale;
  const left = -w / 2;
  ctx.fillStyle = "#f7f4ee";
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === "#") ctx.fillRect(left + x * scale, y * scale, scale, scale);
    }
  });
}

function drawSaber(ctx: CanvasRenderingContext2D, sim: Sim) {
  const swing = Math.sin(sim.t * 7) * 0.18;
  const ang = sim.facing === 1 ? -0.4 + swing : Math.PI + 0.4 - swing;
  const x0 = sim.x + PW / 2 + sim.facing * 4;
  const y0 = sim.y + 16;
  ctx.save();
  ctx.translate(x0, y0);
  ctx.rotate(ang);
  ctx.fillStyle = "#2a2a2c";
  ctx.fillRect(-2, -3, 10, 6);
  ctx.fillStyle = "#8d8d92";
  ctx.fillRect(6, -2.5, 8, 5);
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#f7f7f7";
  ctx.fillRect(14, -2, 46, 4);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(16, -1, 42, 2);
  ctx.restore();
}

function drawAlien(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, t: number) {
  ctx.save();
  ctx.translate(x, y - 20);
  ctx.scale(dir < 0 ? -1 : 1, 1);
  const scale = 1.15;
  const left = (-ALIEN[0]!.length * scale) / 2;
  const step = Math.sin(t * 9);
  ctx.fillStyle = "#f7f4ee";
  ALIEN.forEach((row, py) => {
    for (let px = 0; px < row.length; px++) {
      if (row[px] !== "#") continue;
      let ox = 0;
      let oy = 0;
      if (py >= 31) {
        const leg = px < 11 ? -1 : 1;
        const stride = leg * step;
        ox = stride * 3.2;
        oy = stride > 0 ? -2.4 : 1.6;
      }
      ctx.fillRect(left + px * scale + ox, py * scale + oy, scale, scale);
    }
  });
  ctx.restore();
}

function drawShip(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number) {
  ctx.save();
  ctx.translate(x, y - 16);
  ctx.scale(dir < 0 ? -1.2 : 1.2, 1.2);
  blitWhite(ctx, SHIP, 1.15);
  ctx.restore();
}

function drawBoost(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, rush: number, ridden = false) {
  ctx.save();
  ctx.translate(x, y);
  const flame = 48 + rush * 340 + Math.sin(t * 40) * 12;
  ctx.globalAlpha = 0.45 + rush * 0.5;
  ctx.fillStyle = "#f7f4ee";
  ctx.beginPath();
  ctx.moveTo(-48, -8);
  ctx.lineTo(-48 - flame, 0);
  ctx.lineTo(-48, 8);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#070708";
  ctx.beginPath();
  ctx.moveTo(86, 0);
  ctx.lineTo(30, -30);
  ctx.lineTo(-52, -30);
  ctx.lineTo(-52, 30);
  ctx.lineTo(30, 30);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-36, -30);
  ctx.lineTo(-70, -52);
  ctx.lineTo(-16, -30);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-36, 30);
  ctx.lineTo(-70, 52);
  ctx.lineTo(-16, 30);
  ctx.fill();
  ctx.fillStyle = "#d7d4cc";
  ctx.fillRect(16, -14, 26, 28);
  if (ridden) {
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(19, -11, 20, 20);
    ctx.fillStyle = "#070708";
    ctx.fillRect(23, -5, 4.5, 4.5);
    ctx.fillRect(31, -5, 4.5, 4.5);
  }
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

function drawDeer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: number,
  t: number,
  reduced: boolean,
) {
  const gallop = reduced ? 0 : Math.sin(t * 16) * 7;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir < 0 ? -1 : 1, 1);
  ctx.fillStyle = "#070708";
  ctx.beginPath();
  ctx.ellipse(0, -18, 24, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14, -22);
  ctx.quadraticCurveTo(34, -42, 40, -30);
  ctx.lineTo(36, -16);
  ctx.quadraticCurveTo(24, -12, 14, -12);
  ctx.fill();
  ctx.strokeStyle = "#f7f4ee";
  ctx.lineWidth = 1.7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(34, -36);
  ctx.lineTo(28, -62);
  ctx.moveTo(30, -50);
  ctx.lineTo(16, -58);
  ctx.moveTo(31, -46);
  ctx.lineTo(42, -64);
  ctx.moveTo(36, -34);
  ctx.lineTo(48, -56);
  ctx.moveTo(44, -46);
  ctx.lineTo(56, -52);
  ctx.stroke();
  ctx.fillStyle = "#070708";
  ctx.fillRect(-16, -12, 3, 14 + gallop);
  ctx.fillRect(-6, -12, 3, 14 - gallop);
  ctx.fillRect(8, -12, 3, 14 + gallop * 0.6);
  ctx.fillRect(16, -12, 3, 14 - gallop);
  ctx.fillStyle = "#f7f4ee";
  ctx.fillRect(38, -28, 2.2, 2.2);
  ctx.beginPath();
  ctx.arc(42, -24, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCandle(ctx: CanvasRenderingContext2D, x: number, ground: number, lit: boolean, t: number) {
  const h = lit ? 36 : 28;
  ctx.fillStyle = "#070708";
  ctx.fillRect(x - 2, ground - h, 4, h);
  const fy = ground - h - 4 + Math.sin(t * 8 + x) * 1.5;
  if (lit) {
    const glow = ctx.createRadialGradient(x, fy, 2, x, fy, 46);
    glow.addColorStop(0, "rgba(255,236,200,0.7)");
    glow.addColorStop(0.35, "rgba(255,220,160,0.28)");
    glow.addColorStop(1, "rgba(255,220,160,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, fy, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fffef8";
    ctx.fillRect(x - 1.5, fy - 14, 3, 16);
  } else {
    ctx.fillStyle = "#3a3a3e";
    ctx.fillRect(x - 1, fy - 4, 2, 5);
  }
}

function drawYuleSky(ctx: CanvasRenderingContext2D, camera: Camera, t: number, reduced: boolean) {
  ctx.save();
  ctx.translate(camera.x * 0.15, 0);
  const beam = ctx.createLinearGradient(40, -80, 520, 780);
  beam.addColorStop(0, "rgba(244,241,234,0.42)");
  beam.addColorStop(1, "rgba(244,241,234,0)");
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(-40, -120);
  ctx.lineTo(340, -120);
  ctx.lineTo(860, 860);
  ctx.lineTo(160, 860);
  ctx.fill();
  if (!reduced) {
    ctx.fillStyle = "rgba(247,244,238,0.8)";
    for (let i = 0; i < 28; i++) {
      const x = 80 + ((i * 37) % 420);
      const y = 40 + ((i * 53 + t * 12) % 520);
      ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
    }
  }
  ctx.restore();
  ctx.save();
  const spacing = 280;
  const layer = camera.x * 0.7;
  const first = Math.floor((layer - 500) / spacing) * spacing;
  const last = layer + camera.w + 500;
  for (let x = first; x <= last; x += spacing) {
    const n = Math.round(x / spacing);
    const scale = 3.35 + (Math.abs(n) % 3) * 0.4;
    const ground = camera.y + camera.h * 0.9 + (Math.abs(n) % 2) * 28;
    drawPine(ctx, camera.x + (x - layer), ground, scale, true, t);
  }
  ctx.restore();
}

function drawYuleHill(ctx: CanvasRenderingContext2D, sim: Sim, reduced: boolean) {
  ctx.fillStyle = "rgba(244,241,234,0.88)";
  for (const plat of sim.level.platforms) {
    if (plat.kind === "ladder" || plat.kind === "gate") continue;
    ctx.fillRect(plat.x, plat.y - 3, plat.w, 3);
  }
  const candles = sim.level.beacons.map((bell) => bell.x + bell.w / 2);
  for (const plat of sim.level.platforms) {
    if (!plat.terrain || plat.id === "hearth") continue;
    for (let x = plat.x + 48; x < plat.x + plat.w - 28; x += 84) {
      if (candles.some((mark) => Math.abs(mark - x) < 46)) continue;
      drawCandle(ctx, x, plat.y, true, sim.t);
    }
  }
  ctx.fillStyle = "#070708";
  ctx.beginPath();
  ctx.moveTo(5600, 440);
  ctx.lineTo(9400, 860);
  ctx.lineTo(9400, 1600);
  ctx.lineTo(5600, 1600);
  ctx.fill();
  ctx.fillStyle = "rgba(244,241,234,0.88)";
  ctx.beginPath();
  ctx.moveTo(5600, 438);
  ctx.lineTo(9400, 858);
  ctx.lineTo(9400, 866);
  ctx.lineTo(5600, 446);
  ctx.fill();
  const trees: [number, number, number][] = [
    [444, 760, 2.5],
    [1494, 860, 3.25],
    [3234, 700, 2.7],
    [4474, 760, 2.8],
  ];
  for (const [x, ground, scale] of trees) drawPine(ctx, x, ground, scale, true, sim.t);
  for (const plat of sim.level.platforms) {
    if (plat.kind === "ladder") drawLadder(ctx, plat, sim.level.id === "yule");
  }
  drawHearth(ctx, sim);
  if (reduced) return;
  ctx.fillStyle = "#f7f4ee";
  for (let i = 0; i < 90; i++) {
    const x = (i * 97 + sim.t * 26) % (sim.level.worldW + 80) - 40;
    const y = (i * 53 + sim.t * 42) % 760;
    ctx.globalAlpha = 0.28 + (i % 5) * 0.12;
    ctx.fillRect(x, y, i % 6 === 0 ? 2.4 : 1.3, i % 6 === 0 ? 2.4 : 1.3);
  }
  ctx.globalAlpha = 1;
}

function drawHearth(ctx: CanvasRenderingContext2D, sim: Sim) {
  if (sim.level.id !== "yule") return;
  ctx.fillStyle = "#120e0c";
  ctx.fillRect(11380, 160, 980, 480);
  ctx.fillStyle = "#1c1612";
  ctx.fillRect(11380, 160, 980, 70);
  ctx.fillStyle = "#2a211c";
  for (let y = 520; y < 640; y += 16) ctx.fillRect(11380, y, 980, 7);
  ctx.fillStyle = "#3a2c24";
  ctx.fillRect(11380, 628, 980, 12);
  ctx.fillStyle = "#0c1016";
  ctx.fillRect(11500, 230, 150, 110);
  ctx.strokeStyle = "#d9d3c8";
  ctx.lineWidth = 4;
  ctx.strokeRect(11500, 230, 150, 110);
  ctx.fillStyle = "rgba(247,244,238,0.7)";
  for (let i = 0; i < 8; i++) ctx.fillRect(11516 + (i % 4) * 28, 250 + Math.floor(i / 4) * 36, 2, 2);
  ctx.fillStyle = "#6a5a4c";
  ctx.fillRect(11420, 500, 200, 140);
  ctx.fillStyle = "#3a3028";
  ctx.fillRect(11440, 530, 160, 70);
  ctx.fillStyle = "#8a7058";
  ctx.fillRect(11640, 400, 210, 16);
  ctx.fillStyle = "#4a4038";
  ctx.fillRect(11660, 416, 170, 224);
  ctx.fillStyle = "#1a120e";
  ctx.fillRect(11690, 470, 110, 170);
  ctx.fillStyle = "#5a4636";
  ctx.fillRect(11700, 600, 90, 12);
  const flick = Math.sin(sim.t * 9) * 10;
  const fire = ctx.createRadialGradient(11745, 560, 4, 11745, 580, 100);
  fire.addColorStop(0, "rgba(255,210,120,0.9)");
  fire.addColorStop(0.4, "rgba(255,90,30,0.4)");
  fire.addColorStop(1, "rgba(255,60,20,0)");
  ctx.fillStyle = fire;
  ctx.beginPath();
  ctx.arc(11745, 580, 100, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd24a";
  ctx.beginPath();
  ctx.moveTo(11745, 610);
  ctx.quadraticCurveTo(11705, 540, 11745, 490 + flick);
  ctx.quadraticCurveTo(11785, 540, 11745, 610);
  ctx.fill();
  ctx.fillStyle = "#ff3b3b";
  ctx.beginPath();
  ctx.moveTo(11745, 608);
  ctx.quadraticCurveTo(11725, 560, 11745, 530);
  ctx.quadraticCurveTo(11765, 560, 11745, 608);
  ctx.fill();
  drawPine(ctx, 12080, 628, 1.35, true, sim.t);
  const wraps = ["#c43838", "#2f8f4e", "#e2b23a", "#3a6fd4"];
  for (let i = 0; i < sim.gifts; i++) {
    const slotX = 11970 + i * 34;
    const slotY = 616;
    const settling = i === sim.gifts - 1 && sim.feast > 0;
    const u = settling ? Math.min(1, 1 - sim.feast / 1.2) : 1;
    const fromX = sim.x + PW / 2;
    const fromY = sim.y + 8;
    const x = settling ? fromX + (slotX - fromX) * u : slotX;
    const y = settling ? fromY + (slotY - fromY) * u - Math.sin(u * Math.PI) * 84 : slotY;
    drawPresent(ctx, x, y, sim.t + i, wraps[i % wraps.length], !settling);
  }
}

function drawPine(
  ctx: CanvasRenderingContext2D,
  x: number,
  ground: number,
  scale: number,
  lights = false,
  t = 0,
) {
  ctx.save();
  ctx.translate(x, ground);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#070708";
  ctx.fillRect(-6, 8, 12, 28);
  ctx.beginPath();
  ctx.moveTo(0, -168);
  ctx.lineTo(42, -36);
  ctx.lineTo(-42, -36);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -108);
  ctx.lineTo(64, 8);
  ctx.lineTo(-64, 8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -48);
  ctx.lineTo(78, 70);
  ctx.lineTo(-78, 70);
  ctx.fill();
  ctx.fillStyle = "rgba(247,244,238,0.9)";
  ctx.beginPath();
  ctx.moveTo(0, -168);
  ctx.lineTo(12, -142);
  ctx.lineTo(-10, -146);
  ctx.fill();
  if (lights) {
    const bulbs: [number, number, string][] = [
      [0, -150, "#ff3b3b"],
      [-16, -128, "#3dff7a"],
      [14, -118, "#ffd24a"],
      [-22, -90, "#4aa3ff"],
      [20, -78, "#ff3b3b"],
      [-8, -62, "#ffd24a"],
      [10, -48, "#3dff7a"],
      [-28, -30, "#ff4fa3"],
      [26, -18, "#4aa3ff"],
      [0, -24, "#ffd24a"],
    ];
    for (const [bx, by, color] of bulbs) {
      const glow = 0.55 + 0.45 * Math.abs(Math.sin(t * 3 + bx + by));
      ctx.globalAlpha = 0.28 * glow;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(bx, by, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = glow;
      ctx.beginPath();
      ctx.arc(bx, by, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawSled(ctx: CanvasRenderingContext2D, x: number, y: number, deep = false) {
  ctx.save();
  ctx.translate(x, y);
  const rim = deep ? -30 : -18;
  ctx.strokeStyle = "#f7f4ee";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-46, 2);
  ctx.quadraticCurveTo(-20, 10, 50, 4);
  ctx.moveTo(-42, 4);
  ctx.quadraticCurveTo(-16, 12, 46, 6);
  ctx.moveTo(-18, rim + 10);
  ctx.lineTo(-18, 6);
  ctx.moveTo(22, rim + 10);
  ctx.lineTo(22, 6);
  ctx.stroke();
  ctx.fillStyle = "#1c1c20";
  ctx.strokeStyle = "#f7f4ee";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.rect(-40, rim, 80, deep ? 24 : 14);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawSnowball(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const r = 92;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(247,244,238,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 2, 54, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(0, -r);
  ctx.rotate(x / r);
  ctx.fillStyle = "#f7f4ee";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(7,7,8,0.28)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r - 4, 0.4, 1.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, 2.4, 4.4);
  ctx.stroke();
  ctx.restore();
  void t;
}

function drawPresent(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, color = "#c43838", still = false) {
  const bob = still ? 0 : Math.sin(t * 3 + x) * 4;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = color;
  ctx.fillRect(-11, -8, 22, 18);
  ctx.strokeStyle = "#f4f1ea";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(0, 10);
  ctx.moveTo(-11, 0);
  ctx.lineTo(11, 0);
  ctx.moveTo(-6, -8);
  ctx.quadraticCurveTo(0, -16, 6, -8);
  ctx.stroke();
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

  if (sim.wake > 0 && !(sim.caged && sim.cage > 0.82)) {
    ctx.save();
    const top = ground - 230 * sim.wake;
    ctx.beginPath();
    ctx.rect(sim.stalkX - 140, top, 280, ground - top + 10);
    ctx.clip();
    drawBeast(ctx, sim.stalkX, ground, sim.stalkDir, sim.t, reduced, sim.caged, sim.wake);
    ctx.restore();
  }
  if (sim.caged && sim.cage > 0.72) {
    drawAntlerBones(ctx, (spec.cageX0 + spec.cageX1) / 2, ground, Math.min(1, (sim.cage - 0.72) / 0.22));
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

function drawAntlerBones(ctx: CanvasRenderingContext2D, x: number, ground: number, alpha: number) {
  const heap = [
    "................######................................",
    "..............##..##..##..........####................",
    ".............#....##....#........##..##...............",
    "..............##..##..##........########..............",
    "......####......######......###############...........",
    "...########..##.##.##.##.######################.......",
    ".#####..#####...##...##...######....#####....###......",
    "###..##...##....##....##....##........##....######....",
    ".##........##...##.....##.................########....",
    "..###............................##############.......",
    "....#####......................######....#####........",
    "......###....................####..........###........",
  ];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, ground);
  ctx.strokeStyle = "#f7f4ee";
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  const antlers: [number, number, number, number, number, number][] = [
    [-50, -30, -90, -78, -140, -96],
    [-16, -40, -28, -100, -64, -132],
    [24, -38, 70, -96, 118, -78],
    [40, -32, 96, -64, 150, -42],
    [4, -36, 8, -88, -8, -124],
  ];
  for (const [x0, y0, x1, y1, x2, y2] of antlers) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(x1, y1, x2, y2);
    ctx.stroke();
  }
  const scale = 6;
  const row = heap[0]!.length;
  const left = (-row * scale) / 2;
  const top = -heap.length * scale;
  ctx.fillStyle = "#f7f4ee";
  heap.forEach((line, py) => {
    for (let px = 0; px < line.length; px++) {
      if (line[px] === "#") ctx.fillRect(left + px * scale, top + py * scale, scale, scale);
    }
  });
  ctx.restore();
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

function drawScarecrow(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, face: number) {
  ctx.save();
  ctx.translate(x + 16, y);
  ctx.scale(face < 0 ? -1 : 1, 1);
  const sway = Math.sin(t * 2.2) * 1.6;
  ctx.strokeStyle = "#4a3828";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.lineTo(0, -86);
  ctx.moveTo(-28, -54 + sway);
  ctx.lineTo(28, -54 - sway);
  ctx.stroke();
  ctx.strokeStyle = "#d2b07a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = -9; i <= 9; i++) {
    ctx.moveTo(i * 1.7, -78);
    ctx.lineTo(i * 2.6, -16 + (i % 3) * 2);
  }
  for (let i = 0; i < 8; i++) {
    ctx.moveTo(-26 + i * 2, -54);
    ctx.lineTo(-34 + i * 1.2, -30 - (i % 3) * 5);
    ctx.moveTo(26 - i * 2, -54);
    ctx.lineTo(34 - i * 1.2, -30 - (i % 3) * 5);
  }
  ctx.stroke();
  ctx.fillStyle = "#1a140e";
  ctx.beginPath();
  ctx.ellipse(0, -72, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-9, -74);
  ctx.lineTo(0, -100);
  ctx.lineTo(11, -74);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -68, 10, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff8a1e";
  ctx.fillRect(-6, -70, 3, 3);
  ctx.fillRect(3, -70, 3, 3);
  ctx.restore();
}

function drawSaws(ctx: CanvasRenderingContext2D, sim: Sim) {
  const saws = sim.level.saws ?? [];
  for (const saw of saws) {
    const ang = Math.sin(sim.t * saw.speed + saw.phase) * saw.swing;
    const bx = saw.x + Math.sin(ang) * saw.len;
    const by = saw.y + Math.cos(ang) * saw.len;
    ctx.save();
    ctx.strokeStyle = "#d0ccc4";
    ctx.lineWidth = 2.5;
    const links = 8;
    for (let i = 0; i < links; i++) {
      const a = i / links;
      const b = (i + 0.62) / links;
      ctx.beginPath();
      ctx.moveTo(saw.x + (bx - saw.x) * a, saw.y + (by - saw.y) * a);
      ctx.lineTo(saw.x + (bx - saw.x) * b, saw.y + (by - saw.y) * b);
      ctx.stroke();
    }
    drawSheave(ctx, saw.x, saw.y, 14, -sim.t * saw.speed * 2);
    ctx.translate(bx, by);
    ctx.rotate(sim.t * 16);
    ctx.fillStyle = "#b7bcc2";
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8eaee";
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.1) * 12, Math.sin(a - 0.1) * 12);
      ctx.lineTo(Math.cos(a) * 25, Math.sin(a) * 25);
      ctx.lineTo(Math.cos(a + 0.1) * 12, Math.sin(a + 0.1) * 12);
      ctx.fill();
    }
    ctx.fillStyle = "#141618";
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f4f1ea";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawBlood(ctx: CanvasRenderingContext2D, sim: Sim) {
  if (sim.level.id !== "hallow") return;
  ctx.save();
  ctx.strokeStyle = "rgba(140, 16, 22, 0.85)";
  ctx.fillStyle = "#8a1018";
  ctx.lineWidth = 2;
  for (let i = 0; i < 18; i++) {
    const x = 3520 + i * 110;
    const hang = 18 + (i % 4) * 14;
    const drop = ((sim.t * 40 + i * 37) % (hang + 80));
    ctx.beginPath();
    ctx.moveTo(x, 150);
    ctx.lineTo(x, 150 + hang);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, 150 + hang + drop * 0.35, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  const drips = sim.level.drips ?? [];
  for (const drip of drips) {
    const u = ((sim.t + drip.phase) % drip.period) / drip.period;
    const y = drip.y0 + u * (drip.y1 - drip.y0);
    ctx.fillStyle = "#c41822";
    ctx.beginPath();
    ctx.moveTo(drip.x, drip.y0);
    ctx.lineTo(drip.x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(drip.x, y, 5, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHallow(ctx: CanvasRenderingContext2D, sim: Sim, reduced: boolean) {
  ctx.save();
  const moon = ctx.createRadialGradient(520, 40, 8, 520, 40, 280);
  moon.addColorStop(0, "rgba(230,230,226,0.55)");
  moon.addColorStop(1, "rgba(230,230,226,0)");
  ctx.fillStyle = moon;
  ctx.fillRect(-200, -400, 1400, 700);
  ctx.fillStyle = "#f4f1ea";
  ctx.beginPath();
  ctx.arc(520, 40, 28, 0, Math.PI * 2);
  ctx.fill();
  if (!reduced) {
    ctx.fillStyle = "#0a0a0c";
    for (let i = 0; i < 6; i++) {
      const bx = ((i * 380 + sim.t * 28) % 2400) + 40;
      const by = 80 + (i % 3) * 36 + Math.sin(sim.t * 3 + i) * 8;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx - 8, by - 7, bx - 14, by);
      ctx.quadraticCurveTo(bx - 8, by - 2, bx, by);
      ctx.quadraticCurveTo(bx + 8, by - 2, bx + 14, by);
      ctx.quadraticCurveTo(bx + 8, by - 7, bx, by);
      ctx.fill();
    }
  }
  if (!reduced) {
    ctx.fillStyle = "rgba(8,8,10,0.35)";
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(200 + i * 420, 180 + (i % 2) * 40, 180, 40, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const trees = [80, 420, 760, 1100, 1480, 1820, 2100, 2460, 2900, 5900, 6300, 6600];
  ctx.strokeStyle = "#6e6a64";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  for (const x of trees) {
    const h = 220 + (x % 5) * 28;
    ctx.moveTo(x, 980);
    ctx.lineTo(x, 500 - h);
    for (let i = 0; i < 6; i++) {
      const y = 460 - i * (h / 7);
      const dir = i % 2 ? 1 : -1;
      const len = 36 + (i % 3) * 18;
      ctx.moveTo(x, y);
      ctx.lineTo(x + dir * len, y - 32);
      ctx.moveTo(x + dir * len * 0.5, y - 14);
      ctx.lineTo(x + dir * (len * 0.5 + 16), y - 34);
    }
  }
  ctx.stroke();
  ctx.fillStyle = "#161418";
  const stones: [number, number, number][] = [
    [180, 500, 28],
    [250, 500, 36],
    [330, 500, 24],
    [1040, 500, 30],
    [1160, 500, 22],
  ];
  for (const [x, y, h] of stones) {
    ctx.beginPath();
    ctx.roundRect(x, y - h, 22, h, 8);
    ctx.fill();
  }
  drawHauntedHouse(ctx, sim.t);
  ctx.strokeStyle = "#6a6840";
  ctx.lineWidth = 2;
  for (const plat of sim.level.platforms) {
    if (plat.kind === "ladder" || plat.kind === "gate") continue;
    for (let x = plat.x + 6; x < plat.x + plat.w - 4; x += 14) {
      const h = 8 + ((x / 14) % 4) * 3;
      ctx.beginPath();
      ctx.moveTo(x, plat.y);
      ctx.lineTo(x + 1, plat.y - h);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawPumpkins(ctx: CanvasRenderingContext2D, sim: Sim) {
  if (sim.level.id !== "hallow") return;
  ctx.save();
  for (const bell of sim.level.beacons) {
    const lit = sim.beacons.has(bell.id);
    if (sim.level.id === "hallow" && lit) continue;
    const x = bell.x + bell.w / 2;
    const y = bellSurface(sim, x, bell.y + bell.h);
    ctx.fillStyle = lit ? "#ff8a1a" : "#c45a10";
    ctx.beginPath();
    ctx.ellipse(x, y - 14, 22, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a2410";
    ctx.fillRect(x - 3, y - 32, 6, 8);
    ctx.fillStyle = lit ? "#ffe08a" : "#ffb45a";
    ctx.fillRect(x - 10, y - 18, 4, 4);
    ctx.fillRect(x + 5, y - 18, 4, 4);
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 8);
    ctx.lineTo(x, y - 2);
    ctx.lineTo(x + 7, y - 8);
    ctx.fill();
    const glow = ctx.createRadialGradient(x, y - 14, 4, x, y - 14, lit ? 56 : 28);
    glow.addColorStop(0, lit ? "rgba(255,160,40,0.9)" : "rgba(255,120,30,0.45)");
    glow.addColorStop(1, "rgba(255,120,30,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y - 14, lit ? 56 : 28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTrapDoor(ctx: CanvasRenderingContext2D, sim: Sim, rect: { id: string; x: number; y: number; w: number }) {
  const state = sim.crumbles[rect.id];
  const warn = Math.min(1, (state?.timer ?? 0) / 1.45);
  const open = state?.gone ? 1 : Math.min(1, (state?.fall ?? 0) / 150);
  const reach = 0.35 + open * 0.65;
  ctx.fillStyle = "#050506";
  ctx.fillRect(rect.x + 2, rect.y + 4, rect.w - 4, 110);
  drawCrawler(ctx, rect.x + rect.w * 0.32, rect.y + 108, sim.t, reach);
  drawCrawler(ctx, rect.x + rect.w * 0.7, rect.y + 112, sim.t + 1.4, reach * 0.85);
  ctx.save();
  ctx.translate(rect.x, rect.y);
  ctx.rotate(open * 1.2 + warn * 0.06);
  ctx.fillStyle = warn > 0.35 ? "#6a3428" : "#4a4036";
  ctx.fillRect(0, -7, rect.w, 9);
  ctx.strokeStyle = "#1a1612";
  ctx.lineWidth = 1;
  for (let x = 10; x < rect.w; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, -7);
    ctx.lineTo(x, 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#c8c4bc";
  ctx.beginPath();
  ctx.arc(4, -2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHauntedHouse(ctx: CanvasRenderingContext2D, t: number) {
  ctx.save();
  ctx.fillStyle = "#14121a";
  ctx.fillRect(3460, 170, 980, 330);
  ctx.fillRect(4440, 210, 1080, 290);
  ctx.fillStyle = "#0e0c12";
  ctx.beginPath();
  ctx.moveTo(3380, 190);
  ctx.lineTo(3940, -70);
  ctx.lineTo(4500, 190);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(4360, 230);
  ctx.lineTo(4980, 20);
  ctx.lineTo(5580, 220);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#100e14";
  ctx.fillRect(5060, 20, 86, 480);
  ctx.beginPath();
  ctx.moveTo(5030, 30);
  ctx.lineTo(5103, -80);
  ctx.lineTo(5176, 30);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#3a3030";
  ctx.fillRect(4180, -30, 26, 180);
  ctx.fillRect(4168, -38, 50, 12);
  ctx.strokeStyle = "rgba(90, 84, 96, 0.4)";
  ctx.lineWidth = 1;
  for (let y = 200; y < 490; y += 14) {
    ctx.beginPath();
    ctx.moveTo(3480, y);
    ctx.lineTo(4420, y + 2);
    ctx.stroke();
  }
  const windows: [number, number, number][] = [
    [3580, 230, 0],
    [3760, 250, 1],
    [4020, 220, 2],
    [4560, 270, 3],
    [4780, 250, 4],
    [5088, 140, 5],
    [5088, 280, 6],
  ];
  for (const [x, y, i] of windows) {
    const flick = 0.25 + 0.55 * Math.abs(Math.sin(t * 2.4 + i));
    ctx.fillStyle = `rgba(255, 130, 30, ${flick})`;
    ctx.fillRect(x, y, 34, 50);
    ctx.strokeStyle = "#08080c";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 34, 50);
    ctx.beginPath();
    ctx.moveTo(x + 17, y);
    ctx.lineTo(x + 17, y + 50);
    ctx.moveTo(x, y + 25);
    ctx.lineTo(x + 34, y + 25);
    ctx.stroke();
  }
  ctx.strokeStyle = "#6a5840";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(4280, 300);
  ctx.lineTo(4340, 360);
  ctx.moveTo(4340, 300);
  ctx.lineTo(4280, 360);
  ctx.stroke();
  ctx.fillStyle = "#07060a";
  ctx.fillRect(3524, 380, 42, 120);
  ctx.fillStyle = "#d4b05a";
  ctx.fillRect(3554, 436, 4, 4);
  ctx.fillStyle = "#24222a";
  ctx.fillRect(3468, 300, 12, 170);
  ctx.fillRect(3608, 300, 12, 170);
  ctx.strokeStyle = "#3a4a32";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(3680, 160);
  ctx.quadraticCurveTo(3620, 320, 3700, 500);
  ctx.moveTo(4900, 80);
  ctx.quadraticCurveTo(4840, 280, 4920, 500);
  ctx.stroke();
  ctx.fillStyle = "#2a2628";
  ctx.fillRect(3440, 470, 2140, 30);
  ctx.fillStyle = "#1a181c";
  ctx.beginPath();
  ctx.moveTo(3440, 310);
  ctx.lineTo(3640, 268);
  ctx.lineTo(3640, 286);
  ctx.lineTo(3440, 328);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#0c0c10";
  ctx.lineWidth = 3;
  for (const [x, y] of [[3580, 230], [4020, 220], [4560, 270]] as [number, number][]) {
    ctx.strokeRect(x - 6, y + 4, 8, 42);
    ctx.strokeRect(x + 32, y + 6, 8, 40);
  }
  ctx.strokeStyle = "#1a181c";
  ctx.lineWidth = 2;
  for (let x = 3280; x < 3480; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, 500);
    ctx.lineTo(x + 4, 456);
    ctx.lineTo(x + 9, 444);
    ctx.lineTo(x + 14, 456);
    ctx.lineTo(x + 18, 500);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCrawler(ctx: CanvasRenderingContext2D, x: number, floor: number, t: number, reach: number) {
  const up = floor - 22 - reach * 52 + Math.sin(t * 2.1) * 3;
  ctx.save();
  ctx.fillStyle = "#07080c";
  ctx.beginPath();
  ctx.ellipse(x, floor - 6, 15, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, up, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#07080c";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 5, up + 8);
  ctx.lineTo(x - 14, up - 14 - reach * 10);
  ctx.moveTo(x + 5, up + 8);
  ctx.lineTo(x + 15, up - 18 - reach * 12);
  ctx.stroke();
  ctx.fillStyle = "#f7f4ee";
  ctx.fillRect(x - 4, up - 2, 2, 2);
  ctx.fillRect(x + 2, up - 2, 2, 2);
  ctx.restore();
}

function drawShade(ctx: CanvasRenderingContext2D, x: number, y: number, face: number, seed: number, look: "mask" | "beard" | "suit" | "jacket" = "mask", t = 0) {
  ctx.save();
  ctx.translate(x + 12, y);
  ctx.scale(face < 0 ? -1 : 1, 1);
  const tall = seed % 3 === 0;
  const h = tall ? 78 : 60;
  const suit = look === "suit";
  const jacket = look === "jacket";
  const cloth = suit ? "#c45512" : jacket ? "#d9d3c6" : "#07080c";
  const step = Math.sin(t * 8 + seed * 1.7);
  ctx.translate(0, -Math.abs(step) * 2);
  const leg = (hip: number, swing: number) => {
    ctx.save();
    ctx.translate(hip, -16);
    ctx.rotate(swing);
    ctx.fillStyle = cloth;
    ctx.fillRect(-2, 0, 4, 16);
    ctx.beginPath();
    ctx.ellipse(0, 17, 5, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    if (suit) {
      ctx.fillStyle = "#1a1c20";
      ctx.fillRect(-2.2, 12, 4.4, 3);
      ctx.fillStyle = "#d6a31a";
      ctx.fillRect(-1.5, 1, 3, 10);
    }
    ctx.restore();
  };
  leg(-5, step * 0.55);
  leg(6, -step * 0.55);
  ctx.fillStyle = suit ? "#d26518" : jacket ? "#cfc8b8" : "#07080c";
  ctx.beginPath();
  ctx.moveTo(-13, -h + 18);
  ctx.quadraticCurveTo(-18, -28, -11, -16);
  ctx.lineTo(12, -16);
  ctx.quadraticCurveTo(18, -28, 13, -h + 18);
  ctx.closePath();
  ctx.fill();
  if (jacket) {
    ctx.strokeStyle = "#6a645c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-12, -h + 28);
    ctx.quadraticCurveTo(0, -h + 18, 12, -h + 34);
    ctx.moveTo(12, -h + 26);
    ctx.quadraticCurveTo(0, -h + 40, -12, -h + 32);
    ctx.stroke();
    ctx.fillStyle = "#2a2826";
    ctx.fillRect(-3, -h + 30, 6, 5);
    ctx.fillRect(-8, -h + 38, 5, 4);
    ctx.fillRect(3, -h + 22, 5, 4);
  }
  if (suit) {
    ctx.fillStyle = "#1a1c20";
    ctx.fillRect(-12, -h + 34, 24, 4);
    ctx.fillStyle = "#e8c24a";
    ctx.fillRect(-12, -h + 28, 24, 2);
  }
  ctx.fillStyle = suit ? "#d26518" : jacket ? "#d9d3c6" : "#07080c";
  ctx.beginPath();
  ctx.arc(0, -h + 8, tall ? 11 : 9, 0, Math.PI * 2);
  ctx.fill();
  if (look === "beard") {
    ctx.fillStyle = "#c4a48a";
    ctx.beginPath();
    ctx.ellipse(0, -h + 10, 6.2, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#07080c";
    ctx.fillRect(-2.4, -h + 8, 1.6, 1.6);
    ctx.fillRect(1.2, -h + 8, 1.6, 1.6);
    ctx.fillStyle = "#f7f4ee";
    ctx.beginPath();
    ctx.moveTo(-8, -h + 14);
    ctx.quadraticCurveTo(-9, -h + 30, 0, -h + 38);
    ctx.quadraticCurveTo(9, -h + 30, 8, -h + 14);
    ctx.quadraticCurveTo(0, -h + 18, -8, -h + 14);
    ctx.fill();
  } else if (suit || jacket) {
    ctx.fillStyle = "#c4a48a";
    ctx.beginPath();
    ctx.ellipse(0, -h + 10, 6.4, 7.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#07080c";
    ctx.fillRect(-2.6, -h + 8, 1.5, 1.5);
    ctx.fillRect(1.4, -h + 8, 1.5, 1.5);
    ctx.fillRect(-1.2, -h + 13, 2.4, 1.2);
    if (suit) {
      ctx.fillStyle = "#f0c24a";
      ctx.fillRect(-9, -h + 2, 18, 3);
    }
  } else {
    ctx.fillStyle = "#e4e0d8";
    ctx.beginPath();
    ctx.ellipse(0, -h + 10, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#07080c";
    ctx.beginPath();
    ctx.ellipse(-3, -h + 10, 2.3, 2.8, 0, 0, Math.PI * 2);
    ctx.ellipse(3.2, -h + 10, 2.3, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f7f4ee";
    ctx.fillRect(-3.6, -h + 9, 1.3, 1.3);
    ctx.fillRect(2.8, -h + 9, 1.3, 1.3);
  }
  if (!suit && !jacket && seed % 2 === 0) {
    ctx.strokeStyle = "#07080c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(8, -h + 26);
    ctx.lineTo(24, -h + 6);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHallowFog(ctx: CanvasRenderingContext2D, t: number) {
  ctx.save();
  for (let i = 0; i < 9; i++) {
    const x = ((i * 820 + t * 16) % 7800) - 300;
    const y = 220 + (i % 4) * 70;
    ctx.fillStyle = i % 2 ? "rgba(186, 186, 190, 0.14)" : "rgba(210, 210, 214, 0.1)";
    ctx.beginPath();
    ctx.ellipse(x, y, 320, 34, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const mist = ctx.createLinearGradient(0, 420, 0, 620);
  mist.addColorStop(0, "rgba(200, 200, 204, 0)");
  mist.addColorStop(1, "rgba(200, 200, 204, 0.22)");
  ctx.fillStyle = mist;
  ctx.fillRect(-200, 420, 7400, 220);
  ctx.restore();
}

function drawRopeLine(ctx: CanvasRenderingContext2D, plat: { x: number; y: number; w: number; h: number }) {
  const x = plat.x + plat.w / 2;
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = "#d7d3cb";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, plat.y - 8);
  ctx.lineTo(x, plat.y + plat.h);
  ctx.stroke();
  ctx.strokeStyle = "#141416";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#f4f1ea";
  for (let y = plat.y + 16; y < plat.y + plat.h - 4; y += 26) {
    ctx.beginPath();
    ctx.arc(x, y, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEagle(ctx: CanvasRenderingContext2D, x: number, y: number, flap: number, face: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face < 0 ? -1.7 : 1.7, 1.7);
  const wing = Math.sin(flap) * 14;
  ctx.fillStyle = "#f4f1ea";
  ctx.beginPath();
  ctx.moveTo(2, 0);
  ctx.quadraticCurveTo(-8, -22 - wing, -36, -4);
  ctx.quadraticCurveTo(-18, -6, 2, 2);
  ctx.fill();
  ctx.fillStyle = "#1a1a1e";
  ctx.beginPath();
  ctx.ellipse(0, 2, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(22, -2);
  ctx.lineTo(10, 4);
  ctx.fill();
  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(6, -2, 2, 2);
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

function drawLadder(ctx: CanvasRenderingContext2D, plat: { x: number; y: number; w: number; h: number }, snow = false) {
  ctx.strokeStyle = snow ? "#d9d6d0" : "#1c1c20";
  ctx.lineWidth = snow ? 4 : 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(plat.x + 3, plat.y);
  ctx.lineTo(plat.x + 3, plat.y + plat.h);
  ctx.moveTo(plat.x + plat.w - 3, plat.y);
  ctx.lineTo(plat.x + plat.w - 3, plat.y + plat.h);
  ctx.stroke();
  if (snow) {
    ctx.strokeStyle = "#f7f4ee";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(plat.x + 2, plat.y);
    ctx.lineTo(plat.x + 2, plat.y + plat.h);
    ctx.moveTo(plat.x + plat.w - 2, plat.y);
    ctx.lineTo(plat.x + plat.w - 2, plat.y + plat.h);
    ctx.stroke();
  }
  for (let y = plat.y + 12; y < plat.y + plat.h - 6; y += 16) {
    ctx.fillStyle = snow ? "#9a9690" : "#141418";
    ctx.fillRect(plat.x + 3, y, plat.w - 6, 3);
    if (snow) {
      ctx.fillStyle = "#f7f4ee";
      ctx.fillRect(plat.x + 1, y - 2, plat.w - 2, 2.5);
    }
  }
}

function drawHoistFog(ctx: CanvasRenderingContext2D, camera: { x: number; y: number; w: number; h: number }, t: number, reduced: boolean) {
  const full = realLevel === "hoist";
  ctx.save();
  const spacing = full ? 86 : 220;
  const layer = camera.x * (full ? 0.28 : 0.45);
  const first = Math.floor((layer - 500) / spacing) * spacing;
  const last = layer + camera.w + 500;
  const top = camera.y - (full ? 200 : 80);
  const bottom = camera.y + camera.h + (full ? 220 : 80);
  for (let x = first; x <= last; x += spacing) {
    const n = Math.abs(Math.round(x / spacing));
    const worldX = camera.x + (x - layer);
    const col = full ? 70 : 36;
    ctx.fillStyle = full ? (n % 2 ? "#3a4038" : "#2a3028") : n % 2 ? "rgba(92,96,102,0.55)" : "rgba(120,124,128,0.42)";
    ctx.fillRect(worldX, top, col, bottom - top);
    ctx.fillStyle = full ? "rgba(214, 186, 120, 0.35)" : "rgba(244,241,234,0.45)";
    const rows = full ? 8 : 1;
    for (let row = 0; row < rows; row++) {
      ctx.fillRect(worldX + 8, top + 36 + row * 72 + (n % 3) * 8, col - 16, full ? 16 : 3);
    }
    if (full) {
      ctx.fillStyle = "rgba(244,241,234,0.28)";
      ctx.fillRect(worldX, top, col, 4);
    }
  }
  if (full) {
    ctx.fillStyle = "rgba(18, 20, 16, 0.55)";
    for (let y = top; y < bottom; y += 64) ctx.fillRect(camera.x - 40, y, camera.w + 80, 10);
  }
  ctx.restore();
  if (reduced) return;
  ctx.fillStyle = full ? "rgba(90, 98, 80, 0.28)" : "rgba(255,255,255,0.08)";
  for (let i = 0; i < (full ? 18 : 10); i++) {
    const x = camera.x + ((i * 140 + t * 8) % (camera.w + 120)) - 40;
    ctx.fillRect(x, camera.y + 20 + (i % 5) * 78, full ? 110 : 70, full ? 180 : 120);
  }
}

function drawToxic(ctx: CanvasRenderingContext2D, sim: Sim, camera: Camera) {
  ctx.save();
  ctx.lineCap = "round";
  const drips: { x: number; y: number; len: number }[] = [];
  for (const plat of sim.level.platforms) {
    if (plat.kind === "ladder" || plat.kind === "gate" || plat.terrain) continue;
    if (plat.y > 640) continue;
    if (plat.x > camera.x + camera.w + 20 || plat.x + plat.w < camera.x - 20) continue;
    const count = Math.max(1, Math.floor(plat.w / 180));
    for (let i = 0; i < count; i++) {
      drips.push({
        x: plat.x + 14 + ((i * 61 + plat.x) % Math.max(8, plat.w - 20)),
        y: plat.y + Math.max(10, plat.h),
        len: 12 + ((i * 17) % 22),
      });
    }
  }
  for (const drip of drips) {
    const cycle = ((sim.t * 0.45 + drip.x * 0.01) % 1 + 1) % 1;
    const hang = drip.len * (0.35 + cycle * 0.45);
    ctx.strokeStyle = "rgba(150, 220, 50, 0.9)";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(drip.x, drip.y);
    ctx.lineTo(drip.x, drip.y + hang);
    ctx.stroke();
    ctx.fillStyle = "rgba(190, 255, 80, 0.95)";
    ctx.beginPath();
    ctx.arc(drip.x, drip.y + hang + 3, 3.2, 0, Math.PI * 2);
    ctx.fill();
    if (cycle > 0.72) {
      ctx.beginPath();
      ctx.arc(drip.x, drip.y + hang + (cycle - 0.72) * 90, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawZip(ctx: CanvasRenderingContext2D, sim: Sim, over = false) {
  const riding = sim.cage > 0 && sim.suck <= 0;
  const x0 = 2140;
  const y0 = -250;
  const x1 = 160;
  const y1 = 380;
  const cableY = (x: number) => y0 + ((x0 - x) / (x0 - x1)) * (y1 - y0);
  if (!over) {
    ctx.save();
    ctx.strokeStyle = "rgba(244,241,234,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    const spin = sim.t * (riding ? 7 : 0.6);
    drawSheave(ctx, x0, y0, 14, spin);
    drawSheave(ctx, x1, y1, 14, -spin);
    ctx.restore();
    if (riding || sim.wake < 1) return;
  } else if (!riding) return;
  const x = riding ? sim.x + PW / 2 : 2060;
  const py = cableY(x);
  const rim = py + 78;
  ctx.save();
  drawSheave(ctx, x, py, 11, sim.t * (riding ? -9 : 0.8));
  ctx.strokeStyle = "#f4f1ea";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, py + 11);
  ctx.lineTo(x, py + 28);
  ctx.moveTo(x - 28, py + 28);
  ctx.lineTo(x + 28, py + 28);
  ctx.moveTo(x - 28, py + 28);
  ctx.lineTo(x - 28, rim + 6);
  ctx.moveTo(x + 28, py + 28);
  ctx.lineTo(x + 28, rim + 6);
  ctx.moveTo(x - 28, rim + 6);
  ctx.lineTo(x + 28, rim + 6);
  ctx.stroke();
  ctx.translate(x, rim);
  ctx.fillStyle = "#121418";
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.arc(0, 2, 16, Math.PI * 1.05, -0.05 * Math.PI, true);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-22, 6);
  ctx.lineTo(-16, 36);
  ctx.quadraticCurveTo(0, 44, 16, 36);
  ctx.lineTo(22, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 6, 22, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#2a2e34";
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-18, 20);
  ctx.quadraticCurveTo(0, 24, 18, 20);
  ctx.stroke();
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
    if (plat.kind === "gate" || plat.kind === "rope" || plat.kind === "ladder" || plat.gear) continue;
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
  const roof = (x: number) => {
    if (x < 3300) return -20 + x * 0.24;
    const t = Math.min(1, (x - 3300) / 1400);
    const low = -20 + 3300 * 0.24;
    return low + (-220 - low) * t;
  };
  ctx.fillStyle = lit ? "#8a9098" : "#4a525c";
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
  ctx.fillStyle = lit ? "#c8ccd0" : "#8a929a";
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
  ctx.fillStyle = lit ? "rgba(90,98,108,0.55)" : "rgba(40,48,56,0.7)";
  for (let i = 0; i < 14; i++) {
    const x = i * 420;
    const y = roof(x) + 40;
    const foot = camera.y + camera.h + 80;
    ctx.beginPath();
    ctx.moveTo(x, foot);
    ctx.quadraticCurveTo(x + 30, y - 10, x + 140, y + 20);
    ctx.quadraticCurveTo(x + 260, y + 50, x + 300, foot);
    ctx.closePath();
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
    const wash = ctx.createLinearGradient(0, 200, 0, camera.y + camera.h);
    wash.addColorStop(0, "rgba(120,132,144,0.35)");
    wash.addColorStop(1, "rgba(36,46,54,0.4)");
    ctx.fillStyle = wash;
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

function drawMirrorFog(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  sim: Sim,
  sprites: GenerationSprites | null,
  reduced: boolean,
  cloth: string | null,
) {
  if (mirrorReal) {
    ctx.save();
    ctx.translate(camera.x * 0.35, camera.y * 0.08);
    for (let i = 0; i < 14; i++) {
      drawShoreTree(ctx, { x: -120 + i * 520, ground: 560, scale: 1.5 + (i % 3) * 0.25, seed: 30 + i * 17 }, 0.7);
    }
    ctx.restore();
  }
  ctx.save();
  const spacing = 190;
  const layer = camera.x * 0.78;
  const first = Math.floor((layer - 400) / spacing) * spacing;
  const last = layer + camera.w + 400;
  const top = mirrorReal ? -120 : camera.y - 40;
  const bottom = mirrorReal ? 1100 : camera.y + camera.h + 80;
  for (let x = first; x <= last; x += spacing) {
    const n = Math.abs(Math.round(x / spacing));
    const worldX = camera.x + (x - layer);
    const w = 150 + (n % 3) * 16;
    const pane = bottom - top;
    if (mirrorReal) {
      ctx.fillStyle = "rgba(18, 28, 26, 0.35)";
      ctx.fillRect(worldX, top, w, pane);
      ctx.fillStyle = "#3a2c22";
      ctx.fillRect(worldX - 6, top, 8, pane);
      ctx.fillRect(worldX + w - 2, top, 8, pane);
      ctx.fillRect(worldX - 6, top, w + 14, 8);
      ctx.fillStyle = "rgba(196, 168, 110, 0.7)";
      ctx.fillRect(worldX + 4, top + 10, 2, pane - 20);
    } else {
      ctx.fillStyle = n % 2 ? "rgba(214,216,220,0.42)" : "rgba(186,190,196,0.5)";
      ctx.fillRect(worldX, top, w, pane);
      ctx.strokeStyle = "rgba(244,241,234,0.85)";
      ctx.lineWidth = 3;
      ctx.strokeRect(worldX, top, w, pane);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(worldX + 10, top + 16);
    ctx.lineTo(worldX + w * 0.42, top + pane * 0.55);
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.22;
  drawFriend(
    ctx,
    sprites,
    {
      x: camera.x * 0.62 + sim.x * 0.38,
      y: sim.y - 30,
      facing: sim.facing,
      walking: Math.abs(sim.vx) > 8,
      anim: sim.anim,
      hurt: 0,
      vx: sim.vx,
      vy: 0,
    },
    sim.t,
    reduced,
    false,
    cloth,
  );
  ctx.restore();
  if (sim.level.hunter && sim.wake > 0) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    const home = sim.stalkX;
    ctx.translate(camera.x * 0.55 + home * 0.2 - home, -50);
    drawTwin(ctx, sprites, sim, reduced);
    ctx.restore();
  }
  const waterTop = 500;
  const waterBottom = camera.y + camera.h + 60;
  const wash = ctx.createLinearGradient(0, waterTop, 0, waterBottom);
  if (mirrorReal) {
    wash.addColorStop(0, "rgba(120, 150, 120, 0.45)");
    wash.addColorStop(0.16, "rgba(18, 42, 32, 0.82)");
    wash.addColorStop(1, "rgba(6, 14, 12, 0.94)");
  } else {
    wash.addColorStop(0, "rgba(150,190,200,0.55)");
    wash.addColorStop(0.2, "rgba(24,48,56,0.72)");
    wash.addColorStop(1, "rgba(8,18,22,0.88)");
  }
  ctx.fillStyle = wash;
  ctx.fillRect(camera.x - 80, waterTop, camera.w + 160, Math.max(120, waterBottom - waterTop));
  ctx.fillStyle = "rgba(220,236,240,0.7)";
  ctx.fillRect(camera.x - 80, waterTop, camera.w + 160, 3);
  if (!reduced) {
    ctx.strokeStyle = "rgba(200,220,226,0.35)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const y = waterTop + 16 + i * 18;
      ctx.beginPath();
      for (let x = camera.x - 40; x < camera.x + camera.w + 40; x += 24) {
        const wave = mirrorReal ? 0 : Math.sin(sim.t * 1.6 + x * 0.02 + i) * 3;
        if (x <= camera.x - 40) ctx.moveTo(x, y + wave);
        else ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }
  }
}

function drawMoonFog(ctx: CanvasRenderingContext2D, camera: Camera, t: number, reduced: boolean, light: number) {
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.fillStyle = "#f4f6f8";
  for (let i = 0; i < 70; i++) {
    const sx = ((i * 311) % Math.max(1, Math.floor(camera.w * 1.4))) - camera.w * 0.2;
    const sy = ((i * 197) % Math.max(1, Math.floor(camera.h * 1.3))) - camera.h * 0.1;
    const big = i % 9 === 0;
    ctx.globalAlpha = 0.35 + light * 0.65;
    ctx.fillRect(sx, sy, big ? 2 : 1, big ? 2 : 1);
  }
  ctx.globalAlpha = 1;
  const sx = camera.w * 0.72;
  const sy = camera.h * 0.18;
  const radius = 90 + light * 150;
  const glow = radius * 3.4;
  const star = ctx.createRadialGradient(sx, sy, radius * 0.2, sx, sy, glow);
  star.addColorStop(0, `rgba(255,255,255,${0.7 + light * 0.3})`);
  star.addColorStop(0.35, `rgba(255,255,255,${0.28 + light * 0.55})`);
  star.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = star;
  ctx.beginPath();
  ctx.arc(sx, sy, glow, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${0.62 + light * 0.38})`;
  ctx.beginPath();
  ctx.arc(sx, sy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(camera.x * 0.35, camera.y * 0.35);
  const planets: [number, number, number, string][] = [
    [220, 80, 22, "#c45a3a"],
    [980, 260, 34, "#7f93b8"],
    [540, 640, 16, "#d2b46a"],
  ];
  for (const [px, py, r, color] of planets) {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.35 + light * 0.55;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    if (r > 20) {
      ctx.strokeStyle = "rgba(244,241,234,0.55)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(px, py, r + 14, r * 0.28, -0.4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
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

function drawLatchHall(ctx: CanvasRenderingContext2D, camera: Camera, t: number, reduced: boolean) {
  ctx.save();
  ctx.translate(camera.x * 0.5, camera.y * 0.08);
  for (let x = -500; x < 6400; x += 26) {
    ctx.fillStyle = Math.floor(x / 26) % 2 === 0 ? "#4a382c" : "#2e241c";
    ctx.fillRect(x, -120, 24, 980);
    ctx.fillStyle = "rgba(196, 154, 108, 0.18)";
    ctx.fillRect(x + 3, -120, 2, 980);
  }
  ctx.fillStyle = "#1a120e";
  for (let x = -240; x < 6400; x += 240) {
    ctx.fillRect(x, 20, 42, 280);
    ctx.fillStyle = "#6a5040";
    ctx.fillRect(x, 20, 42, 8);
    ctx.fillStyle = "#1a120e";
    ctx.fillRect(x - 80, 70, 200, 16);
  }
  if (!reduced) {
    ctx.fillStyle = "rgba(230, 206, 160, 0.35)";
    for (let i = 0; i < 48; i++) {
      const x = (i * 181 + t * 14) % 6200;
      const y = 60 + ((i * 53) % 360) + Math.sin(t * 0.8 + i) * 8;
      ctx.fillRect(x, y, 2, 2);
    }
  }
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

  const skyStops = (realLevel === sim.level.id ? REAL_SKY[sim.level.id] : undefined) ?? SKY[sim.level.id] ?? SKY.shore!;
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
    if (realLevel !== "roof") drawRareSign(ctx, sim.t, reduced);
  } else if (sim.level.id === "shore") {
    const far = shoreReal ? SHORE_REAL_FAR : SHORE_FAR;
    const near = shoreReal ? SHORE_REAL_NEAR : SHORE_NEAR;
    const paint = shoreReal ? drawShoreTree : drawRealTree;
    ctx.save();
    ctx.translate(camera.x * 0.72, camera.y * 0.4);
    for (const tree of far) paint(ctx, tree, shoreReal ? 0.72 : 0.55);
    ctx.restore();
    drawBranch(ctx);
    ctx.save();
    ctx.translate(camera.x * 0.4, camera.y * 0.15);
    for (const tree of near) paint(ctx, tree, shoreReal ? 0.95 : 0.92);
    ctx.restore();
  } else if (sim.level.id === "antler") {
    const paint = realLevel === "antler" ? drawShoreTree : drawRealTree;
    ctx.save();
    ctx.translate(camera.x * 0.55, camera.y * 0.2);
    for (const tree of SHORE_FAR) {
      paint(ctx, { ...tree, scale: tree.scale + 0.9, ground: tree.ground + 40 }, realLevel === "antler" ? 0.7 : 0.42);
    }
    ctx.restore();
    ctx.save();
    ctx.translate(camera.x * 0.32, camera.y * 0.08);
    for (const tree of SHORE_NEAR) {
      paint(ctx, { ...tree, scale: tree.scale + 1.15, ground: tree.ground + 80 }, realLevel === "antler" ? 0.9 : 0.58);
    }
    ctx.restore();
  } else if (sim.level.id === "moon") {
    drawMoonFog(
      ctx,
      camera,
      sim.t,
      reduced,
      sim.altars.size / Math.max(1, sim.level.lamps?.length ?? 1),
    );
  } else if (sim.level.id === "mirror") {
    drawMirrorFog(ctx, camera, sim, sprites, reduced, cloth);
  } else if (sim.level.id === "tunnel") {
    drawCave(ctx, camera, sim.t, reduced, gloom <= 0);
  } else if (sim.level.id === "latch") {
    if (latchReal) drawLatchHall(ctx, camera, sim.t, reduced);
    else drawLatchFog(ctx, camera, sim.t, reduced);
  } else if (sim.level.id === "gale") {
    drawGaleStorm(ctx, camera, sim.t, reduced);
    drawGaleSky(ctx);
  } else if (sim.level.id === "choir") {
    drawChoirGear(ctx, camera, sim.t, reduced);
  } else if (sim.level.id === "gear") {
    drawGearHall(ctx, camera, sim, reduced);
  } else if (sim.level.id === "hoist") {
    drawHoistFog(ctx, camera, sim.t, reduced);
  } else if (sim.level.id === "yule") {
    drawYuleSky(ctx, camera, sim.t, reduced);
  } else if (sim.level.id === "hallow") {
    drawHallow(ctx, sim, reduced);
  } else if (sim.level.id === "stack") {
    drawGaleStorm(ctx, camera, sim.t, reduced);
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

  drawLowerFill(ctx, camera, sim.level.id);
  if (realLevel === sim.level.id && sim.level.id !== "shore" && sim.level.id !== "latch" && sim.level.id !== "mirror") {
    drawRealBackdrop(ctx, camera, sim.level.id, sim.t);
  }
  if (sim.level.id === "shore" && shoreReal) drawShoreWater(ctx, camera, sim.t);
  if (sim.level.id === "gear") drawWorksGears(ctx, sim, reduced);
  if (sim.level.id === "roof" && realLevel === "roof") drawRareSign(ctx, sim.t, reduced);

  drawTerrain(ctx, sim, reduced);
  if (sim.level.id === "hoist") drawToxic(ctx, sim, camera);
  if (sim.level.id === "mirror") drawZip(ctx, sim);
  if (sim.level.id === "yule") drawYuleHill(ctx, sim, reduced);
  if (sim.level.id === "shore") {
    drawCagedFriend(ctx, sprites, sim, reduced, cloth, {
      rope: sim.rope,
      feast: sim.feast,
      startX: 1644,
      landX: 2410,
      hangTop: 150,
      landTop: 268,
      floor: 468,
      axleX: 1752,
      wireY: 110,
    });
    drawCagedFriend(ctx, sprites, sim, reduced, cloth, {
      rope: sim.rope2,
      feast: sim.feast2,
      startX: 4280,
      landX: 4748,
      hangTop: 148,
      landTop: 356,
      floor: 456,
      axleX: 4840,
      wireY: 96,
    });
    drawCagedFriend(ctx, sprites, sim, reduced, cloth, {
      rope: sim.rope3,
      feast: 0,
      startX: 8646,
      landX: 8718,
      hangTop: 160,
      landTop: 380,
      floor: 480,
      axleX: 8568,
      wireY: 110,
      empty: sim.saved > 2,
    });
  }
  if (sim.level.id === "roof") drawEscapeToll(ctx, sim);
  drawMark(ctx, sim);
  if (sim.level.id === "latch") drawPulley(ctx, sim);
  if (sim.level.id === "roof") drawDrainTrash(ctx, sim.t, reduced);
  if (sim.level.combo) drawLatchLock(ctx, sim);
  if (sim.level.id === "choir") drawChoirMarks(ctx);
  if (sim.level.id === "hoist") drawHoistMarks(ctx);

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

  const wraps = ["#c43838", "#2f8f4e", "#e2b23a", "#3a6fd4"];
  sim.level.moths.forEach((moth, index) => {
    if (sim.moths.has(moth.id)) return;
    if (sim.level.id === "yule") drawPresent(ctx, moth.x, moth.y, sim.t, wraps[index % wraps.length]);
    else drawCoin(ctx, moth.x, moth.y, sim.t, reduced);
  });

  for (const zone of sim.level.shrines) {
    drawShrine(ctx, zone.x + zone.w / 2 - 4, zone.y + zone.h - 8, sim.t);
  }
  for (const stand of sim.level.lamps ?? []) {
    const lit =
      sim.level.id === "moon" || sim.level.id === "hoist" ? sim.altars.has(stand.id) : true;
    drawLantern(ctx, stand.x + stand.w / 2, stand.y + 18, sim.t, lit);
  }
  for (const bell of sim.level.beacons) {
    const x = bell.x + bell.w / 2;
    const ground = bellSurface(sim, x, bell.y + bell.h);
    if (sim.level.id === "yule") drawCandle(ctx, x, ground, sim.beacons.has(bell.id), sim.t);
    else drawBell(ctx, x, ground, sim.beacons.has(bell.id), sim.t);
  }

  if (sim.level.pit && sim.level.id !== "tunnel" && camera.x < sim.level.pit.x1 && camera.x + camera.w > sim.level.pit.x0) {
    drawThorns(ctx, sim.level.pit);
  }

  if (sim.level.introCrow) {
    const perch = perchPosition(sim);
    if (!perch.gone) drawCrow(ctx, perch.x, perch.y, sim.t * 9, 1);
  }
  for (const bird of birdSpots(sim, reduced)) {
    if (bird.kind === "alien" && sim.slain.has(bird.index)) continue;
    if (bird.kind === "rat") drawRat(ctx, bird.x, bird.y, bird.dir, sim.t, reduced);
    else if (bird.kind === "deer") drawDeer(ctx, bird.x, bird.y, bird.dir, sim.t, reduced);
    else if (bird.kind === "turtle") drawTurtle(ctx, bird.x, bird.y, bird.dir, sim.t);
    else if (bird.kind === "gator") drawGator(ctx, bird.x, bird.y, bird.dir, sim.t, reduced);
    else if (bird.kind === "rocket") drawRocket(ctx, bird.x, bird.y, bird.dir, sim.t, reduced);
    else if (bird.kind === "alien") drawAlien(ctx, bird.x, bird.y, bird.dir, sim.t);
    else if (bird.kind === "ship") drawShip(ctx, bird.x, bird.y, bird.dir);
    else if (bird.kind === "eagle") drawEagle(ctx, bird.x, bird.y, sim.t * 8, bird.dir);
    else if (bird.kind === "scare") drawScarecrow(ctx, bird.x, bird.y, sim.t, bird.dir);
    else if (bird.kind === "shade") {
      const look =
        sim.level.id === "yule" ? "beard" : sim.level.id === "gear" || sim.level.id === "hoist" ? "suit" : sim.level.id === "latch" ? "jacket" : "mask";
      drawShade(ctx, bird.x, bird.y, bird.dir, bird.index, look, reduced ? 0 : sim.t);
    }
    else drawCrow(ctx, bird.x, bird.y, sim.t * 14, bird.dir);
  }

  if (sim.level.stalker) drawHunt(ctx, sim, reduced);
  if (sim.level.hunter) drawTwin(ctx, sprites, sim, reduced);
  if (sim.level.boulder) drawBoulder(ctx, sim, reduced);

  const goal = sim.level.goal;
  drawBlackHole(ctx, goal.x + goal.w / 2, goal.y + goal.h * 0.45, sim.t * (1 + sim.suck * 7), sim.doorLocked && sim.suck <= 0);

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

  if (lamp && !attract && gloom <= 0 && sim.level.id !== "moon") drawLamp(ctx, sim);

  if (sim.suck > 0) {
    const cx = sim.x + PW / 2;
    const cy = sim.y + PH / 2;
    const scale = Math.max(0.05, 1 - sim.suck * 0.95);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(sim.suck * 9);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    ctx.globalAlpha = 1 - sim.suck * 0.9;
  }
  if (sim.level.id === "shore" && sim.saved > 2) {
    const walking = sim.suck <= 0 && Math.abs(sim.x - sim.facing * 38 - sim.palX) > 8;
    drawFriend(
      ctx,
      sprites,
      {
        x: sim.palX,
        y: sim.palY,
        facing: sim.palFace,
        walking,
        anim: walking ? sim.t * 8 : 0,
        hurt: 0,
        vx: sim.facing * 40,
        vy: 0,
      },
      sim.t,
      reduced,
      false,
      cloth,
    );
  }
  const sledding = sim.level.id === "yule" && sim.cage > 0 && sim.suck <= 0 && sim.dead <= 0;
  if (sim.level.id === "yule" && sim.suck <= 0 && sim.dead <= 0) {
    if (sledding) drawSnowball(ctx, sim.stalkX, sim.stalkY, sim.t);
    if (sim.cage > 0) drawSled(ctx, sim.x + PW / 2, sim.y + PH, true);
    else drawSled(ctx, 5420, 440);
  }
  if (sim.dead > 0) {
    drawCageBones(ctx, sim.x + PW / 2, sim.y + PH, 3.4);
  } else {
    const seated = sledding;
    if (seated) {
      const top = sim.y + PH - 48;
      ctx.save();
      ctx.beginPath();
      ctx.rect(sim.x - 40, top - 10, 100, 30);
      ctx.clip();
    }
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
        climbing: sim.climbing,
      },
      sim.t,
      reduced,
      attract,
      cloth,
    );
    if (seated) ctx.restore();
  }
  if (sim.level.id === "mirror") drawZip(ctx, sim, true);
  if (sim.saber && sim.suck <= 0 && sim.cage <= 0 && !attract) drawSaber(ctx, sim);
  if (sim.suck > 0) {
    ctx.restore();
  }
  if (sim.level.id === "choir" && sim.suck <= 0) drawChoirBalloon(ctx, sim);
  if (sim.level.id === "gale" && sim.suck <= 0) {
    if (sim.cage > 0) drawGlider(ctx, sim.x + PW / 2, sim.y - 6, sim.t);
    else drawGlider(ctx, 4320, -430, sim.t);
  }
  if (sim.level.id === "moon" && sim.suck <= 0 && sim.cage <= 0) drawBoost(ctx, 1560, -684, sim.t, 0);
  if (sim.level.id === "latch") drawExitSnare(ctx, sim);

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

  if (sim.level.id === "yule" && sim.x > 11200) {
    const rx = 11370;
    const ry = 140;
    const rw = 1000;
    const rh = 530;
    const left = camera.x - 80;
    const top = camera.y - 80;
    const right = camera.x + camera.w + 80;
    const bottom = camera.y + camera.h + 80;
    ctx.fillStyle = "#050506";
    ctx.fillRect(left, top, Math.max(0, rx - left), bottom - top);
    ctx.fillRect(rx + rw, top, Math.max(0, right - (rx + rw)), bottom - top);
    ctx.fillRect(rx, top, rw, Math.max(0, ry - top));
    ctx.fillRect(rx, ry + rh, rw, Math.max(0, bottom - (ry + rh)));
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
    vig.addColorStop(1, sim.level.id === "choir" ? "rgba(0,0,0,0.16)" : sim.level.id === "moon" ? `rgba(0,0,0,${0.28 * (1 - sim.altars.size / Math.max(1, sim.level.lamps?.length ?? 1))})` : "rgba(0,0,0,0.72)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, cssW, cssH);
  }

  if (sim.level.id === "moon") {
    const open = sim.altars.size / Math.max(1, sim.level.lamps?.length ?? 1);
    ctx.fillStyle = `rgba(0,0,0,${0.22 * (1 - open)})`;
    ctx.fillRect(0, 0, cssW, cssH);
    if (open > 0) {
      ctx.fillStyle = `rgba(255,255,255,${open * 0.28})`;
      ctx.fillRect(0, 0, cssW, cssH);
    }
  }

  if (sim.level.id === "moon" && sim.cage > 0 && sim.suck <= 0) {
    const rush = sim.cage * sim.cage;
    ctx.save();
    ctx.fillStyle = `rgba(255,255,255,${0.2 + rush * 0.75})`;
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 56; i++) {
      const y = (i * 47 + sim.t * (500 + rush * 2800)) % cssH;
      ctx.globalAlpha = 0.35 + rush * 0.65;
      ctx.fillRect(0, y, cssW, rush > 0.4 ? 3 : 1);
    }
    ctx.restore();
    ctx.save();
    ctx.scale(scale, scale);
    drawShip(ctx, sim.palX - camera.x, sim.palY - camera.y, 1);
    drawBoost(ctx, sim.x + PW / 2 - camera.x, sim.y + 16 - camera.y, sim.t, rush, true);
    ctx.restore();
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

function drawLantern(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, lit = true) {
  ctx.fillStyle = "#070708";
  ctx.fillRect(x - 1, y - 16, 2, 16);
  ctx.fillRect(x - 8, y, 16, 18);
  ctx.fillRect(x - 6, y + 18, 12, 3);
  if (!lit) return;
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
  const spacing = 200;
  const layer = camera.x * 0.62;
  const first = Math.floor((layer - 500) / spacing) * spacing;
  const last = layer + camera.w + 500;
  const floor = camera.y + camera.h + 30;
  for (let x = first; x <= last; x += spacing) {
    const n = Math.abs(Math.round(x / spacing));
    const worldX = camera.x + (x - layer) + (n % 2) * 8;
    const w = 150 + (n % 4) * 22;
    const h = 260 + (n % 5) * 78;
    const top = floor - h;
    ctx.fillStyle = n % 2 ? "rgba(92,94,98,0.78)" : "rgba(122,124,128,0.7)";
    ctx.fillRect(worldX, top, w, h + 60);
    ctx.fillStyle = "rgba(244,241,234,0.82)";
    ctx.fillRect(worldX, top, w, 4);
    ctx.fillStyle = n % 3 === 0 ? "rgba(255,214,140,0.45)" : "rgba(244,241,234,0.28)";
    for (let wy = top + 18; wy < floor - 24; wy += 24) {
      for (let wx = worldX + 12; wx < worldX + w - 14; wx += 18) {
        if ((n + wx + wy) % 7 === 0) continue;
        ctx.fillRect(wx, wy, 7, 10);
      }
    }
  }
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
}

function drawWorksGears(ctx: CanvasRenderingContext2D, sim: Sim, reduced: boolean) {
  const ink = realLevel === "gear";
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
    if (ink) drawStippleGear(ctx, wheel.r, wheel.teeth, wheel.x);
    else {
      ctx.fillStyle = "rgba(12,12,14,0.72)";
      drawCog(ctx, wheel.r, wheel.teeth);
    }
    ctx.restore();
  }

  const wheels = [
    { x: 900, y: 780, r: 340, speed: 0.22, teeth: 16 },
    { x: 1900, y: 820, r: 400, speed: -0.16, teeth: 18 },
    { x: 2900, y: 790, r: 360, speed: 0.18, teeth: 15 },
    { x: 3900, y: 840, r: 380, speed: -0.2, teeth: 17 },
    { x: 4800, y: 800, r: 300, speed: 0.24, teeth: 14 },
  ];
  for (const wheel of wheels) {
    ctx.save();
    ctx.translate(wheel.x, wheel.y);
    ctx.rotate(sim.t * (reduced ? wheel.speed * 0.35 : wheel.speed));
    if (ink) drawStippleGear(ctx, wheel.r, wheel.teeth, wheel.x);
    else {
      ctx.fillStyle = "rgba(8,8,10,0.94)";
      drawCog(ctx, wheel.r, wheel.teeth);
      ctx.beginPath();
      ctx.arc(0, 0, wheel.r * 0.16, 0, Math.PI * 2);
      ctx.fillStyle = "#2c2c30";
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawStippleGear(ctx: CanvasRenderingContext2D, r: number, teeth: number, seed: number) {
  const phase = (seed % 360) * 0.02;
  ctx.save();
  ctx.strokeStyle = "rgba(244,241,234,0.92)";
  ctx.lineJoin = "miter";
  ctx.lineWidth = Math.max(1.1, r * 0.014);
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const step = (Math.PI * 2) / teeth;
    const a0 = i * step;
    const rim = r * 0.78;
    const at = (ang: number, rad: number, first: boolean) => {
      const x = Math.cos(ang) * rad;
      const y = Math.sin(ang) * rad;
      if (first) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    };
    at(a0, rim, i === 0);
    at(a0 + step * 0.16, r, false);
    at(a0 + step * 0.42, r, false);
    at(a0 + step * 0.7, rim, false);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.save();
  ctx.translate(r * 0.012, r * 0.018);
  ctx.globalAlpha = 0.4;
  ctx.stroke();
  ctx.restore();

  const bands = Math.max(6, Math.min(14, Math.floor(r / 26)));
  ctx.setLineDash(r > 80 ? [1.4, 2.2] : [1, 2]);
  ctx.lineWidth = r > 80 ? 1.15 : 0.8;
  for (let b = 0; b < bands; b++) {
    const u = b / bands;
    const base = r * (0.2 + u * 0.54);
    const amp = r * (0.045 + u * 0.05);
    const steps = r > 80 ? 90 : 36;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const warp =
        Math.sin(a * 3 + phase + b * 0.55) * amp + Math.sin(a * 5 - b * 0.8 + phase) * amp * 0.38;
      const rad = Math.max(r * 0.18, base + warp);
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
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

function drawGaleSky(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.fillStyle = "rgba(236,236,232,0.62)";
  for (let i = 0; i < 10; i++) {
    const x = 2800 + i * 280;
    const y = -10 + (i % 3) * 20;
    ctx.beginPath();
    ctx.ellipse(x, y, 150, 32, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 70, y + 10, 90, 24, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const sun = ctx.createRadialGradient(4260, -520, 8, 4260, -520, 200);
  sun.addColorStop(0, "rgba(255,250,232,0.98)");
  sun.addColorStop(0.25, "rgba(255,244,214,0.55)");
  sun.addColorStop(1, "rgba(255,244,214,0)");
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(4260, -520, 200, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff6e4";
  ctx.beginPath();
  ctx.arc(4260, -520, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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

function drawThorns(ctx: CanvasRenderingContext2D, pit: { x0: number; x1: number; y?: number }) {
  const base = pit.y ?? 640;
  ctx.fillStyle = "#070708";
  for (let x = pit.x0 + 20; x < pit.x1 - 20; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.lineTo(x + 9, base - 50);
    ctx.lineTo(x + 18, base);
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
  const yMin = sim.level.id === "moon" ? -1400 : sim.level.id === "choir" ? -820 : sim.level.id === "tunnel" ? -280 : sim.level.id === "mirror" ? -560 : sim.level.id === "roof" ? -200 : sim.level.id === "gale" ? -760 : sim.level.id === "hallow" ? -280 : sim.level.id === "stack" ? -280 : -40;
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
