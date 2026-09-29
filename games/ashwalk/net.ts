import type { GenerationSprites } from "@rarefriends/friendsdk/sprites";

export type Ghost = {
  id: string;
  name: string;
  friendId: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  facing: 1 | -1;
  walking: boolean;
  anim: number;
  dead: number;
  won: boolean;
  sprites: GenerationSprites | null;
};

export type PoseMsg = {
  k: "p";
  x: number;
  y: number;
  f: 1 | -1;
  w: 0 | 1;
  a: number;
  d: number;
  n: 0 | 1;
  r: number;
  r2?: number;
  r3?: number;
  sv?: number;
  c: [string, number, number][];
  m: string[];
  b: string[];
};

export function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === "object" && data !== null;
}

export function asPose(data: unknown): PoseMsg | null {
  if (!isRecord(data) || data.k !== "p") return null;
  if (typeof data.x !== "number" || typeof data.y !== "number") return null;
  const c = Array.isArray(data.c) ? data.c : [];
  const crumbles: [string, number, number][] = [];
  for (const row of c) {
    if (!Array.isArray(row) || row.length < 3) continue;
    if (typeof row[0] !== "string" || typeof row[1] !== "number" || typeof row[2] !== "number") continue;
    crumbles.push([row[0], row[1], row[2]]);
  }
  return {
    k: "p",
    x: data.x,
    y: data.y,
    f: data.f === -1 ? -1 : 1,
    w: data.w === 1 ? 1 : 0,
    a: typeof data.a === "number" ? data.a : 0,
    d: typeof data.d === "number" ? data.d : 0,
    n: data.n === 1 ? 1 : 0,
    r: typeof data.r === "number" ? data.r : 0,
    r2: typeof data.r2 === "number" ? data.r2 : 0,
    r3: typeof data.r3 === "number" ? data.r3 : 0,
    sv: typeof data.sv === "number" ? data.sv : 0,
    c: crumbles,
    m: strings(data.m),
    b: strings(data.b),
  };
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}
