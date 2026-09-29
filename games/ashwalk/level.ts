export type Kind = "solid" | "oneway" | "sway" | "rope" | "crumble" | "gate" | "ladder";

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
  /** This plank exists only while that lantern or shrine is lit. */
  bridge?: string;
  /** Stays up until you land off it. */
  bridgeHold?: boolean;
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
  kind?: "crow" | "rat" | "turtle" | "gator" | "rocket" | "alien" | "ship" | "deer" | "eagle" | "scare" | "shade";
};

export type Wind = {
  x0: number;
  x1: number;
  strength: number;
  period: number;
  mode: "gust" | "tide";
};

export type Saw = {
  x: number;
  y: number;
  len: number;
  swing: number;
  speed: number;
  phase: number;
};

export type Drip = {
  x: number;
  y0: number;
  y1: number;
  period: number;
  phase: number;
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

/** Stands until you reach wakeX, then hunts you back to the door. */
export type Hunter = {
  x: number;
  surface: number;
  wakeX: number;
};

/** Rolls once you pass wakeX. Falls and stops after pitX. */
export type Boulder = {
  x: number;
  surface: number;
  wakeX: number;
  pitX: number;
  speed: number;
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
  kind?: "spider" | "scorpion";
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
  hunter?: Hunter;
  boulder?: Boulder;
  saws?: readonly Saw[];
  drips?: readonly Drip[];
  /** Exit lock. The code is the marks on the gates. */
  combo?: { code: readonly number[]; x: number; span: number; y: number };
};

export const SHORE: Level = {
  id: "shore",
  title: "The shore",
  kicker: "Something hung in the fog.",
  rule: "The shore is nearly black. A lantern costs 1 coin and lasts 13 seconds. After the cages, two planks appear only while that light is on. A shrine raises one long plank. It falls once you step off. Two friends hang in cages. Turn each crank and lower them. When you arrive, acid dumps and leaves a skeleton. At the end, one more hangs. Lower that cage and they leave with you.",
  together: "The rope, the coins, and the bells are shared. Either of you can pull.",
  clearKicker: "The white",
  clearTitle: "It kept your outline",
  worldW: 9100,
  killY: 720,
  poster: 1880,
  introCrow: true,
  platforms: [
    { id: "shore", kind: "solid", terrain: true, x: 0, y: 468, w: 560, h: 420 },
    { id: "ledge", kind: "crumble", x: 690, y: 428, w: 96, h: 12 },
    { id: "ledge2", kind: "crumble", x: 820, y: 400, w: 70, h: 12 },
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
    { id: "cell", kind: "solid", terrain: true, x: 1630, y: 468, w: 140, h: 420 },
    { id: "cliff", kind: "solid", terrain: true, x: 2390, y: 368, w: 520, h: 520 },
    { id: "mothstep", kind: "oneway", x: 2560, y: 292, w: 74, h: 10 },
    { id: "down", kind: "oneway", x: 2932, y: 440, w: 180, h: 12 },
    { id: "low", kind: "solid", terrain: true, x: 3140, y: 496, w: 180, h: 400 },
    { id: "glowPit", kind: "oneway", x: 3340, y: 468, w: 500, h: 12, bridge: "shrine-pit", bridgeHold: true },
    { id: "safe", kind: "solid", terrain: true, x: 3860, y: 476, w: 200, h: 420 },
    { id: "wind1", kind: "oneway", x: 4140, y: 430, w: 80, h: 12 },
    { id: "wind2", kind: "crumble", x: 4300, y: 372, w: 78, h: 12 },
    { id: "wind3", kind: "crumble", x: 4460, y: 424, w: 78, h: 12 },
    { id: "porch", kind: "solid", terrain: true, x: 4680, y: 456, w: 200, h: 440 },
    { id: "gateStep", kind: "solid", terrain: true, x: 4860, y: 456, w: 180, h: 440 },
    { id: "gRun", kind: "gate", x: 4988, y: 36, w: 24, h: 420, openY: -140 },
    { id: "s1", kind: "crumble", x: 5000, y: 438, w: 74, h: 12 },
    { id: "s2", kind: "crumble", x: 5180, y: 388, w: 66, h: 12 },
    { id: "s3", kind: "oneway", x: 5360, y: 448, w: 72, h: 12 },
    { id: "s4", kind: "crumble", x: 5540, y: 396, w: 64, h: 12 },
    { id: "midlong", kind: "solid", terrain: true, x: 5720, y: 468, w: 240, h: 420 },
    { id: "glow1", kind: "oneway", x: 6000, y: 468, w: 210, h: 12, bridge: "l-span1" },
    { id: "span", kind: "solid", terrain: true, x: 6220, y: 468, w: 120, h: 420 },
    { id: "glow2", kind: "oneway", x: 6360, y: 468, w: 220, h: 12, bridge: "l-span2" },
    { id: "hall", kind: "solid", terrain: true, x: 6600, y: 480, w: 680, h: 420 },
    { id: "h1", kind: "oneway", x: 6850, y: 392, w: 110, h: 12 },
    { id: "h2", kind: "oneway", x: 7030, y: 278, w: 130, h: 12 },
    { id: "gDoor", kind: "gate", x: 7274, y: 60, w: 24, h: 420, openY: -120 },
    { id: "after", kind: "solid", terrain: true, x: 7298, y: 480, w: 200, h: 420 },
    { id: "swing1", kind: "sway", x: 7620, y: 456, w: 86, h: 12, amp: 20, freq: 0.82, phase: 0.1, dip: 6 },
    { id: "swing2", kind: "sway", x: 7832, y: 412, w: 80, h: 12, amp: 18, freq: 1.08, phase: 1.3, dip: 8 },
    { id: "swing3", kind: "sway", x: 8036, y: 468, w: 86, h: 12, amp: 22, freq: 0.74, phase: 0.5, dip: 4 },
    { id: "swing4", kind: "sway", x: 8248, y: 424, w: 80, h: 12, amp: 16, freq: 1.18, phase: 2, dip: 7 },
    { id: "sanctum", kind: "solid", terrain: true, x: 8456, y: 480, w: 520, h: 420 },
  ],
  moths: [
    { id: "m1", x: 410, y: 332 },
    { id: "m2", x: 760, y: 356 },
    { id: "m3", x: 1266, y: 318 },
    { id: "m4", x: 1802, y: 300 },
    { id: "m5", x: 2210, y: 300 },
    { id: "m6", x: 2596, y: 248 },
    { id: "m7", x: 3708, y: 328 },
    { id: "m8", x: 7090, y: 248 },
    { id: "m12", x: 5210, y: 340 },
    { id: "m13", x: 6270, y: 328 },
    { id: "m9", x: 748, y: 360 },
    { id: "m10", x: 3010, y: 370 },
    { id: "m11", x: 4788, y: 390 },
    { id: "m14", x: 7868, y: 340 },
    { id: "m15", x: 8688, y: 400 },
  ],
  checkpoints: [
    { id: "shore", x: 96, surface: 468 },
    { id: "lip", x: 1480, surface: 408 },
    { id: "cliff", x: 2520, surface: 368 },
    { id: "safe", x: 3940, surface: 476 },
    { id: "midlong", x: 5820, surface: 468 },
    { id: "span", x: 6260, surface: 468 },
    { id: "hall", x: 6680, surface: 480 },
    { id: "after", x: 7360, surface: 480 },
    { id: "sanctum", x: 8560, surface: 480 },
  ],
  rope: { id: "rope", x: 1708, y: 348, w: 80, h: 120 },
  shrines: [
    { id: "shrine-cliff", x: 2688, y: 250, w: 86, h: 130 },
    { id: "shrine-pit", x: 3188, y: 400, w: 86, h: 96 },
    { id: "shrine-end", x: 8720, y: 350, w: 90, h: 140 },
  ],
  lamps: [
    { id: "l-shore", x: 490, y: 378, w: 56, h: 92 },
    { id: "l-isle", x: 910, y: 378, w: 56, h: 92 },
    { id: "l-lip", x: 1540, y: 318, w: 56, h: 92 },
    { id: "l-cliff", x: 2460, y: 278, w: 56, h: 92 },
    { id: "l-porch", x: 4740, y: 366, w: 56, h: 92 },
    { id: "l-safe", x: 3960, y: 386, w: 56, h: 92 },
    { id: "l-span1", x: 5864, y: 376, w: 56, h: 92 },
    { id: "l-span2", x: 6252, y: 376, w: 56, h: 92 },
    { id: "l-sanctum", x: 7380, y: 388, w: 56, h: 92 },
    { id: "l-swing", x: 8580, y: 388, w: 56, h: 92 },
  ],
  beacons: [
    { id: "b1", x: 6660, y: 390, w: 80, h: 100 },
    { id: "b2", x: 7080, y: 188, w: 80, h: 100 },
    { id: "b3", x: 7060, y: 390, w: 70, h: 100 },
  ],
  plates: [
    { id: "pRun", gate: "gRun", x: 4700, y: 372, w: 90, h: 84, latch: 2.4 },
    { id: "pDoor", gate: "gDoor", x: 7100, y: 400, w: 90, h: 84, latch: 3.2, whenLit: true },
  ],
  goal: { id: "goal", x: 8780, y: 310, w: 90, h: 170 },
  pit: { x0: 3320, x1: 3940, y: 560 },
  wind: { x0: 4080, x1: 4680, strength: 240, period: 1.25, mode: "gust" },
  birds: [
    { x0: 4160, x1: 4620, y: 338, amp: 16, speed: 92, start: 4200 },
    { x0: 4180, x1: 4560, y: 410, amp: 8, speed: 120, start: 4400 },
  ],
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
      id: "gap",
      mode: "hang",
      x0: 760,
      x1: 760,
      ceil: 140,
      y: 240,
      speed: 0,
      reach: 120,
      period: 3.8,
      phase: 0.2,
    },
    {
      id: "pit",
      mode: "hang",
      x0: 3560,
      x1: 3560,
      ceil: 160,
      y: 260,
      speed: 0,
      reach: 150,
      period: 3.4,
      phase: 1,
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
      id: "narrow",
      mode: "crawl",
      x0: 5760,
      x1: 5920,
      y: 446,
      ceil: 0,
      speed: 58,
      reach: 0,
      period: 1,
      phase: 0.3,
    },
    {
      id: "hall",
      mode: "crawl",
      x0: 6760,
      x1: 7080,
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
    { x: 3000, id: "white", title: "The white", kicker: "The shrine raises the long plank." },
    { x: 5720, id: "span", title: "The light", kicker: "The plank lasts as long as the lantern." },
    { x: 4680, id: "run", title: "The gate", kicker: "Hold the plate, then run." },
    { x: 6600, id: "lock", title: "The bells", kicker: "Three bells. Then the plate." },
    { x: 7500, id: "swing", title: "The swing", kicker: "Four cages. Then the last friend." },
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
