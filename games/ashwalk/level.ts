export type Kind = "solid" | "oneway" | "sway" | "rope" | "crumble" | "gate";

export type Platform = {
  id: string;
  kind: Kind;
  x: number;
  y: number;
  w: number;
  h: number;
  terrain?: boolean;
  amp?: number;
  freq?: number;
  phase?: number;
  dip?: number;
  y0?: number;
  y1?: number;
  /** Where a gate rests when a plate is holding it open. */
  openY?: number;
  /** A tooth on a turning gear. The platform rides the rim. */
  gear?: { cx: number; cy: number; r: number; speed: number; phase: number; teeth: number };
};

export type Rect = {
  id: string;
  kind: Kind;
  x: number;
  y: number;
  w: number;
  h: number;
  terrain?: boolean;
};

export type Moth = { id: string; x: number; y: number };
export type Zone = { id: string; x: number; y: number; w: number; h: number };

export type Plate = {
  id: string;
  gate: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Seconds the gate stays open after the last body steps off. */
  latch: number;
  /** The plate ignores you until every bell is lit. */
  whenLit?: boolean;
};

export type Bird = {
  x0: number;
  x1: number;
  y: number;
  amp: number;
  speed: number;
  start?: number;
  kind?: "crow" | "rat" | "turtle";
};

export type Wind = {
  x0: number;
  x1: number;
  strength: number;
  period: number;
  mode: "gust" | "tide";
};

export type Chapter = { x: number; id: string; title: string; kicker: string };

/** Buried until the bells are lit, then it hunts until the cage drops. */
export type Stalker = {
  x: number;
  surface: number;
  cageX0: number;
  cageX1: number;
  plate: Zone;
};

export type Spider = {
  id: string;
  mode: "hang" | "crawl";
  x0: number;
  x1: number;
  /** Body rest. Hang: height before the drop. Crawl: body center. */
  y: number;
  ceil: number;
  speed: number;
  reach: number;
  period: number;
  phase: number;
};

export type Level = {
  id: string;
  title: string;
  kicker: string;
  rule: string;
  together: string;
  clearKicker: string;
  clearTitle: string;
  worldW: number;
  killY: number;
  poster: number;
  introCrow: boolean;
  platforms: readonly Platform[];
  moths: readonly Moth[];
  checkpoints: readonly { id: string; x: number; surface: number }[];
  rope: Zone | null;
  shrines: readonly Zone[];
  /** Shore lanterns. One coin buys five seconds of the normal light. */
  lamps?: readonly Zone[];
  beacons: readonly Zone[];
  plates: readonly Plate[];
  goal: Zone;
  pit: { x0: number; x1: number; y: number } | null;
  wind: Wind | null;
  birds: readonly Bird[];
  spiders: readonly Spider[];
  chapters: readonly Chapter[];
  light: { x: number; y: number };
  stalker?: Stalker;
};

export const SHORE: Level = {
  id: "shore",
  title: "The shore",
  kicker: "Something hung in the fog.",
  rule: "The shore is nearly black. A lantern costs 1 coin and brings the light back for 10 seconds.",
  together: "The rope, the coins, and the bells are shared. Either of you can pull.",
  clearKicker: "The white",
  clearTitle: "It kept your outline",
  worldW: 6700,
  killY: 720,
  poster: 1880,
  introCrow: true,
  platforms: [
    { id: "shore", kind: "solid", terrain: true, x: 0, y: 468, w: 560, h: 420 },
    { id: "ledge", kind: "oneway", x: 690, y: 428, w: 136, h: 12 },
    { id: "isle", kind: "solid", terrain: true, x: 900, y: 468, w: 250, h: 420 },
    { id: "pillar", kind: "solid", terrain: true, x: 1230, y: 392, w: 72, h: 500 },
    { id: "lip", kind: "solid", terrain: true, x: 1390, y: 408, w: 250, h: 480 },
    {
      id: "cageA",
      kind: "sway",
      x: 1760,
      y: 400,
      w: 84,
      h: 12,
      amp: 18,
      freq: 0.85,
      phase: 0.2,
      dip: 8,
    },
    {
      id: "cageB",
      kind: "sway",
      x: 1968,
      y: 448,
      w: 84,
      h: 12,
      amp: 16,
      freq: 1.05,
      phase: 1.4,
      dip: 6,
    },
    { id: "cageC", kind: "rope", x: 2168, y: 0, w: 84, h: 12, y0: 214, y1: 392 },
    { id: "cliff", kind: "solid", terrain: true, x: 2390, y: 368, w: 520, h: 520 },
    { id: "mothstep", kind: "oneway", x: 2560, y: 292, w: 74, h: 10 },
    { id: "down", kind: "oneway", x: 2932, y: 440, w: 180, h: 12 },
    { id: "low", kind: "solid", terrain: true, x: 3140, y: 496, w: 180, h: 400 },
    { id: "cr1", kind: "crumble", x: 3460, y: 454, w: 96, h: 12 },
    { id: "cr2", kind: "crumble", x: 3660, y: 400, w: 96, h: 12 },
    { id: "safe", kind: "solid", terrain: true, x: 3860, y: 476, w: 200, h: 420 },
    { id: "wind1", kind: "oneway", x: 4140, y: 430, w: 90, h: 12 },
    { id: "wind2", kind: "oneway", x: 4320, y: 362, w: 90, h: 12 },
    { id: "wind3", kind: "oneway", x: 4500, y: 418, w: 90, h: 12 },
    { id: "porch", kind: "solid", terrain: true, x: 4680, y: 456, w: 200, h: 440 },
    { id: "hall", kind: "solid", terrain: true, x: 5030, y: 480, w: 680, h: 420 },
    { id: "h1", kind: "oneway", x: 5280, y: 392, w: 110, h: 12 },
    { id: "h2", kind: "oneway", x: 5460, y: 278, w: 130, h: 12 },
    { id: "gDoor", kind: "gate", x: 5704, y: 262, w: 24, h: 218, openY: 28 },
    { id: "sanctum", kind: "solid", terrain: true, x: 5728, y: 480, w: 820, h: 420 },
  ],
  moths: [
    { id: "m1", x: 410, y: 332 },
    { id: "m2", x: 760, y: 356 },
    { id: "m3", x: 1266, y: 318 },
    { id: "m4", x: 1802, y: 300 },
    { id: "m5", x: 2210, y: 300 },
    { id: "m6", x: 2596, y: 248 },
    { id: "m7", x: 3708, y: 328 },
    { id: "m8", x: 5520, y: 248 },
    { id: "m9", x: 748, y: 360 },
    { id: "m10", x: 3010, y: 370 },
    { id: "m11", x: 4788, y: 390 },
  ],
  checkpoints: [
    { id: "shore", x: 96, surface: 468 },
    { id: "lip", x: 1480, surface: 408 },
    { id: "cliff", x: 2520, surface: 368 },
    { id: "safe", x: 3940, surface: 476 },
    { id: "hall", x: 5100, surface: 480 },
  ],
  rope: { id: "rope", x: 1988, y: 360, w: 78, h: 110 },
  shrines: [
    { id: "shrine-cliff", x: 2688, y: 250, w: 86, h: 130 },
    { id: "shrine-end", x: 6080, y: 350, w: 90, h: 140 },
  ],
  lamps: [
    { id: "l-shore", x: 490, y: 378, w: 56, h: 92 },
    { id: "l-isle", x: 910, y: 378, w: 56, h: 92 },
    { id: "l-lip", x: 1540, y: 318, w: 56, h: 92 },
    { id: "l-cliff", x: 2460, y: 278, w: 56, h: 92 },
    { id: "l-porch", x: 4740, y: 366, w: 56, h: 92 },
    { id: "l-safe", x: 3960, y: 386, w: 56, h: 92 },
    { id: "l-sanctum", x: 5900, y: 390, w: 56, h: 92 },
  ],
  beacons: [
    { id: "b1", x: 5080, y: 390, w: 80, h: 100 },
    { id: "b2", x: 5500, y: 188, w: 80, h: 100 },
    { id: "b3", x: 5496, y: 390, w: 70, h: 100 },
  ],
  plates: [{ id: "pDoor", gate: "gDoor", x: 5600, y: 400, w: 90, h: 84, latch: 3.2, whenLit: true }],
  goal: { id: "goal", x: 6320, y: 310, w: 90, h: 170 },
  pit: { x0: 3320, x1: 3940, y: 560 },
  wind: { x0: 4080, x1: 4680, strength: 240, period: 1.25, mode: "gust" },
  birds: [{ x0: 4160, x1: 4620, y: 338, amp: 16, speed: 92, start: 4200 }],
  spiders: [
    {
      id: "isle",
      mode: "crawl",
      x0: 980,
      x1: 1100,
      y: 446,
      ceil: 0,
      speed: 34,
      reach: 0,
      period: 1,
      phase: 0.2,
    },
    {
      id: "cages",
      mode: "hang",
      x0: 1906,
      x1: 1906,
      ceil: 108,
      y: 188,
      speed: 0,
      reach: 200,
      period: 4.2,
      phase: 0.8,
    },
    {
      id: "hall",
      mode: "crawl",
      x0: 5180,
      x1: 5420,
      y: 458,
      ceil: 0,
      speed: 46,
      reach: 0,
      period: 1,
      phase: 0.4,
    },
  ],
  chapters: [
    { x: 0, id: "shore", title: "The shore", kicker: "A coin buys ten seconds of light." },
    { x: 1640, id: "cages", title: "The hanging wood", kicker: "The cages remember every name." },
    { x: 3000, id: "white", title: "The white", kicker: "Walk until the light has a door." },
    { x: 5000, id: "lock", title: "The lock", kicker: "Three bells. Then the plate." },
  ],
  light: { x: 2680, y: 180 },
};

export function windAccel(wind: Wind | null, x: number, time: number): number {
  if (!wind || x < wind.x0 || x > wind.x1) return 0;
  const gust = Math.sin(time * wind.period);
  if (wind.mode === "gust") {
    if (gust < 0.35) return 0;
    return -wind.strength * (gust - 0.35);
  }
  return gust * wind.strength;
}

export function chapterAt(level: Level, x: number): Chapter {
  let current = level.chapters[0]!;
  for (const chapter of level.chapters) {
    if (x >= chapter.x) current = chapter;
  }
  return current;
}

export function placePlayer(surfaceX: number, surfaceY: number, w: number, h: number) {
  return { x: surfaceX - w / 2, y: surfaceY - h };
}
