import {
  SHORE,
  placePlayer,
  windAccel,
  type Kind,
  type Level,
  type Rect,
  type Spider,
} from "./level";

export const PW = 14;
export const PH = 36;

const RUN = 196;
const ACCEL = 1600;
const AIR = 980;
const FRICTION = 2000;
const GRAV_UP = 980;
const GRAV_DOWN = 2200;
const GRAV_APEX = 640;
const APEX = 80;
const JUMP = -610;
const JUMP_CUT = 0.46;
const MAX_FALL = 760;
const COYOTE = 0.12;
const BUFFER = 0.14;

export type Actions = {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
  down: boolean;
  interact: boolean;
  interactPressed: boolean;
};

export type StepEvents = {
  jump: boolean;
  land: boolean;
  died: boolean;
  moth: boolean;
  mothId: string | null;
  rope: boolean;
  pull: boolean;
  shrine: string | null;
  lamp: boolean;
  lampId: string | null;
  beacon: string | null;
  goal: boolean;
  checkpoint: string | null;
};

export type Crumble = { timer: number; fall: number; gone: boolean; back: number };

export type RemoteBody = { x: number; y: number; dead: boolean };

export type SharedWorld = {
  rope?: number;
  rope2?: number;
  rope3?: number;
  saved?: number;
  pulling?: boolean;
  moths?: string[];
  beacons?: string[];
  crumbles?: { id: string; timer: number; fall: number; gone: boolean; back?: number }[];
};

export type Sim = {
  level: Level;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  /** Eases toward facing so a turn does not snap the body or the camera. */
  look: number;
  grounded: boolean;
  groundId: string | null;
  groundKind: Kind | null;
  coyote: number;
  jumpBuffer: number;
  cut: boolean;
  drop: number;
  dropId: string | null;
  t: number;
  run: number;
  rope: number;
  rope2: number;
  rope3: number;
  /** Seconds beside the last cage. They follow once this passes 2. */
  saved: number;
  pulling: boolean;
  won: boolean;
  dead: number;
  invuln: number;
  checkpoint: number;
  moths: Set<string>;
  beacons: Set<string>;
  crumbles: Record<string, Crumble>;
  latch: Record<string, number>;
  gateLift: Record<string, number>;
  birds: { x: number; dir: 1 | -1 }[];
  /** Sign roof: the gate has opened, then shut, with you on the far side. */
  sawGate: boolean;
  /** 0 intact, then rising until the last roof is gone. */
  crack: number;
  perch: number;
  hurt: number;
  walking: boolean;
  anim: number;
  nearShrine: string | null;
  nearLamp: boolean;
  nearRope: boolean;
  nearBeacon: string | null;
  nearGoal: boolean;
  doorLocked: boolean;
  plateAsleep: boolean;
  holding: string | null;
  gateSeconds: number;
  wasGrounded: boolean;
  lastRects: Rect[] | null;
  remotes: RemoteBody[];
  /** When friends are linked, fallen planks are not forgiven on your death. */
  linked: boolean;
  /** 0 buried, then rising to 1. Only the antler fog uses this. */
  wake: number;
  stalkX: number;
  /** Boulder floor. It only moves down. */
  stalkY: number;
  stalkDir: 1 | -1;
  caged: boolean;
  /** 0 open, 1 slammed. */
  cage: number;
  nearTrap: boolean;
  combo: number[];
  nearCombo: number | null;
  /** The freed friend. Shore only. */
  palX: number;
  palY: number;
  palFace: 1 | -1;
  /** Seconds after you reach the landed cage. Acid falls. */
  feast: number;
  /** Seconds after you reach the second landed cage. */
  feast2: number;
  /** 0 to 1 while the exit pulls you in. The clear waits until this finishes. */
  suck: number;
  /** Moon lanterns that are currently lit. */
  altars: Set<string>;
  /** Seconds left on each moon lantern. */
  altarLeft: Record<string, number>;
  /** Moon saber is in the hand. */
  saber: boolean;
  /** On a ladder. Use climbs. */
  climbing: boolean;
  /** -1 up, 1 down. Each Use press flips it. */
  climbDir: number;
  nearLadder: boolean;
  /** Bird indexes the saber has cut. */
  /** Presents set under the eve tree. */
  gifts: number;
  /** Where the last present stood, so the room can send you back. */
  hearthX: number;
  hearthY: number;
  /** Seconds left in the room after the last present. */
  hearthLeave: number;
  slain: Set<number>;
};

export function createSim(level: Level = SHORE): Sim {
  const spawn = placePlayer(level.checkpoints[0]!.x, level.checkpoints[0]!.surface, PW, PH);
  const crumbles: Record<string, Crumble> = {};
  const latch: Record<string, number> = {};
  const gateLift: Record<string, number> = {};
  for (const plat of level.platforms) {
    if (!plat.gear && (plat.kind === "crumble" || plat.kind === "oneway" || plat.kind === "sway" || plat.kind === "rope")) {
      crumbles[plat.id] = { timer: 0, fall: 0, gone: false, back: 0 };
    }
    if (plat.kind === "gate") gateLift[plat.id] = 0;
  }
  for (const plate of level.plates) latch[plate.id] = 0;
  return {
    level,
    x: spawn.x,
    y: spawn.y,
    vx: 0,
    vy: 0,
    facing: 1,
    look: 1,
    grounded: true,
    groundId: null,
    groundKind: null,
    coyote: 0,
    jumpBuffer: 0,
    cut: false,
    drop: 0,
    dropId: null,
    t: 0,
    run: 0,
    rope: 0,
    rope2: 0,
    rope3: 0,
    saved: 0,
    pulling: false,
    won: false,
    dead: 0,
    invuln: 0,
    checkpoint: 0,
    moths: new Set(),
    beacons: new Set(),
    crumbles,
    latch,
    gateLift,
    birds: level.birds.map((bird) => ({ x: bird.start ?? bird.x0, dir: 1 })),
    sawGate: false,
    crack: 0,
    perch: 0,
    hurt: 0,
    walking: false,
    anim: 0,
    nearShrine: null,
    nearLamp: false,
    nearRope: false,
    nearBeacon: null,
    nearGoal: false,
    doorLocked: level.beacons.length > 0,
    plateAsleep: false,
    holding: null,
    gateSeconds: 0,
    wasGrounded: false,
    lastRects: null,
    remotes: [],
    linked: false,
    wake: 0,
    stalkX: level.boulder?.x ?? level.hunter?.x ?? level.stalker?.x ?? 0,
    stalkY: level.boulder?.surface ?? 0,
    stalkDir: 1,
    caged: false,
    cage: 0,
    nearTrap: false,
    combo: (level.combo?.code ?? []).map(() => 0),
    nearCombo: null,
    palX: 1670,
    palY: 468 - PH,
    palFace: 1,
    feast: 0,
    feast2: 0,
    suck: 0,
    altars: new Set(),
    altarLeft: {},
    saber: false,
    climbing: false,
    climbDir: -1,
    nearLadder: false,
    slain: new Set(),
    gifts: 0,
    hearthX: 0,
    hearthY: 0,
    hearthLeave: 0,
  };
}

export function applyShared(sim: Sim, world: SharedWorld) {
  if (world.pulling) sim.pulling = true;
  if (typeof world.rope === "number" && world.rope > sim.rope) {
    sim.rope = world.rope;
    if (world.rope > 0) sim.pulling = true;
  }
  if (typeof world.rope2 === "number" && world.rope2 > sim.rope2) {
    sim.rope2 = world.rope2;
    if (world.rope2 > 0) sim.pulling = true;
  }
  if (typeof world.rope3 === "number" && world.rope3 > sim.rope3) {
    sim.rope3 = world.rope3;
    if (world.rope3 > 0) sim.pulling = true;
  }
  if (typeof world.saved === "number" && world.saved > sim.saved) sim.saved = world.saved;
  for (const id of world.moths ?? []) sim.moths.add(id);
  for (const id of world.beacons ?? []) {
    if (sim.level.beacons.some((beacon) => beacon.id === id)) sim.beacons.add(id);
  }
  for (const crumb of world.crumbles ?? []) {
    const cur = sim.crumbles[crumb.id];
    if (!cur) continue;
    if (!crumb.gone && crumb.fall === 0 && crumb.timer === 0) {
      cur.gone = false;
      cur.fall = 0;
      cur.timer = 0;
      cur.back = 0;
      continue;
    }
    if (crumb.gone || crumb.fall > cur.fall) {
      cur.gone = crumb.gone || cur.gone;
      cur.fall = Math.max(cur.fall, crumb.fall);
      cur.timer = Math.max(cur.timer, crumb.timer);
      if (crumb.gone) cur.back = cur.back > 0 ? Math.min(cur.back, crumb.back ?? 4) : (crumb.back ?? 4);
    } else if (crumb.timer > cur.timer) cur.timer = crumb.timer;
  }
}

export function snapshotWorld(sim: Sim): SharedWorld {
  return {
    rope: sim.rope,
    rope2: sim.rope2,
    rope3: sim.rope3,
    saved: sim.saved,
    pulling: sim.pulling,
    moths: [...sim.moths],
    beacons: [...sim.beacons],
    crumbles: Object.entries(sim.crumbles).map(([id, crumb]) => ({ id, ...crumb })),
  };
}

export function comboSet(sim: Sim) {
  const code = sim.level.combo?.code;
  if (!code) return true;
  return code.every((digit, index) => sim.combo[index] === digit);
}

function saberHits(sim: Sim, x: number, y: number) {
  const swing = Math.sin(sim.t * 7) * 0.18;
  const ang = sim.facing === 1 ? -0.4 + swing : Math.PI + 0.4 - swing;
  const x0 = sim.x + PW / 2 + sim.facing * 4;
  const y0 = sim.y + 16;
  const x1 = x0 + Math.cos(ang) * 58;
  const y1 = y0 + Math.sin(ang) * 58;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / len2));
  const ox = x - (x0 + dx * t);
  const oy = y - (y0 + dy * t);
  return ox * ox + oy * oy < 32 * 32;
}

function emptyEvents(): StepEvents {
  return {
    jump: false,
    land: false,
    died: false,
    moth: false,
    mothId: null,
    rope: false,
    pull: false,
    shrine: null,
    lamp: false,
    lampId: null,
    beacon: null,
    goal: false,
    checkpoint: null,
  };
}

function openHole(level: Level, x: number, w: number, fromY: number) {
  for (const plat of level.platforms) {
    if (plat.kind !== "solid" || !plat.terrain) continue;
    if (plat.y <= fromY + 8 || plat.y >= level.killY) continue;
    if (x < plat.x + plat.w - 10 && x + w > plat.x + 10) return false;
  }
  return true;
}

function choirSafeDrop(sim: Sim, id: string, restY: number, x: number, w: number) {
  if (sim.level.id !== "choir") return false;
  const state = sim.crumbles[id];
  if (!state || state.fall <= 0) return false;
  return !openHole(sim.level, x, w, restY);
}

function bodyOn(x: number, y: number, zone: { x: number; y: number; w: number; h: number }) {
  return x < zone.x + zone.w && x + PW > zone.x && y < zone.y + zone.h && y + PH > zone.y;
}

export function rectsAt(sim: Sim, reduced: boolean): Rect[] {
  const out: Rect[] = [];
  for (const plat of sim.level.platforms) {
    if (plat.gear) {
      const spin = plat.gear;
      const ang = sim.t * spin.speed + spin.phase;
      out.push({
        id: plat.id,
        kind: plat.kind,
        x: spin.cx + Math.cos(ang) * spin.r - plat.w / 2,
        y: spin.cy + Math.sin(ang) * spin.r,
        w: plat.w,
        h: plat.h,
      });
      continue;
    }
    if (plat.id === "r5" && sim.crack > 0.55) continue;
    if (sim.level.hunter && sim.wake >= 1 && (plat.id === "c4" || plat.id === "c4b" || plat.id === "c5")) continue;
    const crackShake = plat.id === "r5" && sim.crack > 0 ? Math.sin(sim.t * 46) * 5 : 0;
    const rest = sim.crumbles[plat.id];
    if (rest?.gone) continue;
    const drop = rest?.fall ?? 0;
    const shake = rest && rest.timer > 0.95 && rest.fall === 0 ? Math.sin(rest.timer * 48) * 3 : 0;
    if (plat.kind === "sway") {
      const amp = reduced ? 0 : (plat.amp ?? 0);
      const dip = reduced ? 0 : (plat.dip ?? 0);
      const s = Math.sin(sim.t * (plat.freq ?? 1) + (plat.phase ?? 0));
      out.push({
        id: plat.id,
        kind: plat.kind,
        x: plat.x + s * amp + shake + crackShake,
        y: plat.y + Math.abs(s) * dip + drop,
        w: plat.w,
        h: plat.h,
      });
      continue;
    }
    if (plat.kind === "ladder") continue;
    if (plat.kind === "rope") {
      const y0 = plat.y0 ?? plat.y;
      const y1 = plat.y1 ?? plat.y;
      out.push({
        id: plat.id,
        kind: plat.kind,
        x: plat.x + shake + crackShake,
        y: y0 + (y1 - y0) * sim.rope + drop,
        w: plat.w,
        h: plat.h,
      });
      continue;
    }
    if (plat.kind === "gate") {
      const lift = sim.gateLift[plat.id] ?? 0;
      const openY = plat.openY ?? plat.y;
      out.push({
        id: plat.id,
        kind: plat.kind,
        x: plat.x,
        y: plat.y + (openY - plat.y) * lift,
        w: plat.w,
        h: plat.h,
      });
      continue;
    }
    out.push({
      id: plat.id,
      kind: plat.kind,
      x: plat.x + shake + crackShake,
      y: plat.y + drop,
      w: plat.w,
      h: plat.h,
      terrain: plat.terrain,
    });
  }
  const stalk = sim.level.stalker;
  if (stalk && sim.cage > 0.72) {
    out.push({
      id: "cage-door",
      kind: "solid",
      x: stalk.cageX1 - 8,
      y: stalk.surface - 168,
      w: 16,
      h: 168,
    });
  }
  return out;
}

function overlaps(ax: number, ay: number, aw: number, ah: number, b: Rect, yPad = 0) {
  return ax < b.x + b.w && ax + aw > b.x && ay + yPad < b.y + b.h && ay + ah - yPad > b.y;
}

function zoneHit(x: number, y: number, z: { x: number; y: number; w: number; h: number }) {
  return bodyOn(x, y, z);
}

function kill(sim: Sim, events: StepEvents) {
  if (sim.invuln > 0 || sim.dead > 0 || sim.won) return;
  const floor = boneFloor(sim);
  sim.x = floor.x;
  sim.y = floor.y - PH;
  sim.vx = 0;
  sim.vy = 0;
  sim.dead = 1.05;
  sim.hurt = 0.45;
  events.died = true;
}

function boneFloor(sim: Sim) {
  const foot = sim.y + PH;
  let bestX = sim.x;
  let bestY = foot;
  let bestDist = 1e9;
  for (const plat of sim.level.platforms) {
    if (plat.kind === "ladder" || plat.kind === "gate") continue;
    if (sim.x + PW < plat.x || sim.x > plat.x + plat.w) continue;
    if (plat.y + 12 < foot) continue;
    const dist = Math.abs(plat.y - foot);
    if (dist < bestDist) {
      bestDist = dist;
      bestY = plat.y;
      bestX = Math.max(plat.x, Math.min(plat.x + plat.w - PW, sim.x));
    }
  }
  if (bestDist > 280) {
    const cp = sim.level.checkpoints[sim.checkpoint] ?? sim.level.checkpoints[0];
    if (cp) return { x: cp.x, y: cp.surface };
  }
  return { x: bestX, y: bestY };
}

function gearPerch(sim: Sim, hintX: number) {
  let best: { x: number; y: number } | null = null;
  for (const plat of sim.level.platforms) {
    const spin = plat.gear;
    if (!spin) continue;
    const ang = sim.t * spin.speed + spin.phase;
    const cx = spin.cx + Math.cos(ang) * spin.r;
    const top = spin.cy + Math.sin(ang) * spin.r;
    if (Math.abs(cx - hintX) > 240) continue;
    if (!best || top < best.y) best = { x: cx - PW / 2, y: top - PH };
  }
  return best;
}

function palSupported(sim: Sim, x: number, y: number) {
  const feet = y + PH;
  for (const plat of rectsAt(sim, false)) {
    if (plat.kind === "gate") continue;
    if (x + 8 < plat.x || x + PW - 8 > plat.x + plat.w) continue;
    if (Math.abs(plat.y - feet) < 22) return true;
  }
  return false;
}

function stepPal(sim: Sim, dt: number) {
  if (sim.level.id !== "shore" || sim.saved <= 2 || sim.dead > 0 || sim.won || sim.suck > 0) return;
  if (!sim.grounded) return;
  const behind = sim.x - sim.facing * 38;
  const apart = Math.abs(sim.x - sim.palX) > 72 || Math.abs(sim.y - sim.palY) > 28;
  if (apart) {
    sim.palX = palSupported(sim, behind, sim.y) ? behind : sim.x;
    sim.palY = sim.y;
    sim.palFace = sim.facing;
    return;
  }
  const dx = behind - sim.palX;
  const step = Math.max(-150 * dt, Math.min(150 * dt, dx));
  const next = sim.palX + step;
  if (!palSupported(sim, next, sim.y)) {
    sim.palFace = sim.facing;
    return;
  }
  sim.palX = next;
  sim.palY = sim.y;
  if (Math.abs(dx) > 6) sim.palFace = dx > 0 ? 1 : -1;
}

function respawn(sim: Sim) {
  const cp = sim.level.checkpoints[sim.checkpoint] ?? sim.level.checkpoints[0]!;
  const spot = placePlayer(cp.x, cp.surface, PW, PH);
  const perch = gearPerch(sim, cp.x);
  sim.x = perch?.x ?? spot.x;
  sim.y = perch?.y ?? spot.y;
  sim.vx = 0;
  sim.vy = 0;
  sim.grounded = false;
  sim.groundId = null;
  sim.groundKind = null;
  sim.dead = 0;
  sim.invuln = 0.7;
  sim.cut = false;
  sim.drop = 0;
  sim.cage = 0;
  sim.suck = 0;
  sim.climbing = false;
  sim.climbDir = -1;
  sim.nearLadder = false;
  if (sim.level.id === "gale") sim.palY = 0;
  sim.lastRects = null;
  const stalk = sim.level.stalker;
  if (stalk && !sim.caged && sim.beacons.size >= sim.level.beacons.length && sim.level.beacons.length > 0) {
    sim.wake = 1;
    sim.stalkX = Math.min(spot.x - 340, stalk.cageX0 - 80);
    sim.stalkDir = 1;
  }
  const hunter = sim.level.hunter;
  if (hunter && sim.wake > 0) {
    sim.wake = 1;
    sim.stalkX = spot.x + PW / 2 + 420;
    sim.stalkDir = -1;
  }
  const rock = sim.level.boulder;
  if (rock) {
    sim.caged = false;
    sim.cage = 0;
    if (spot.x + PW / 2 >= rock.wakeX) {
      sim.wake = 1;
      sim.stalkX = spot.x - 280;
      sim.stalkY = cp.surface - 220;
    } else {
      sim.wake = 0;
      sim.stalkX = rock.x;
      sim.stalkY = rock.surface;
    }
  }
  if (sim.level.id === "shore" && sim.saved > 2) {
    sim.palX = sim.x - sim.facing * 40;
    sim.palY = sim.y;
    sim.palFace = sim.facing;
  }
  if (!sim.linked) {
    for (const id of Object.keys(sim.crumbles)) {
      sim.crumbles[id] = { timer: 0, fall: 0, gone: false, back: 0 };
    }
  }
}

function stepPlates(sim: Sim, dt: number) {
  sim.holding = null;
  sim.plateAsleep = false;
  const lit = sim.level.beacons.length === 0 || sim.beacons.size >= sim.level.beacons.length;
  let soonest = 0;
  for (const plate of sim.level.plates) {
    let held = bodyOn(sim.x, sim.y, plate);
    if (!held) {
      for (const remote of sim.remotes) {
        if (remote.dead) continue;
        if (bodyOn(remote.x, remote.y, plate)) {
          held = true;
          break;
        }
      }
    }
    if (plate.id === "pOut" && sim.rope < 1) {
      if (bodyOn(sim.x, sim.y, plate)) sim.plateAsleep = true;
      held = false;
    } else if (plate.whenLit && !lit) {
      if (bodyOn(sim.x, sim.y, plate)) sim.plateAsleep = true;
      held = false;
    } else if (held && bodyOn(sim.x, sim.y, plate)) {
      sim.holding = plate.id;
    }
    const current = sim.latch[plate.id] ?? 0;
    sim.latch[plate.id] = held ? plate.latch : Math.max(0, current - dt);
    const target = (sim.latch[plate.id] ?? 0) > 0 ? 1 : 0;
    const lift = sim.gateLift[plate.gate] ?? 0;
    const step = Math.min(1, dt * 2.6);
    sim.gateLift[plate.gate] = lift + (target - lift) * step;
    const left = sim.latch[plate.id] ?? 0;
    if (left > 0 && (soonest === 0 || left < soonest)) soonest = left;
  }
  sim.gateSeconds = soonest;
}

export function step(sim: Sim, input: Actions, dt: number, reduced = false): StepEvents {
  const events = emptyEvents();
  const level = sim.level;
  sim.t += dt;
  if (sim.hurt > 0) sim.hurt = Math.max(0, sim.hurt - dt);
  if (sim.invuln > 0) sim.invuln = Math.max(0, sim.invuln - dt);
  if (sim.won) return events;

  if (sim.dead > 0) {
    sim.dead -= dt;
    if (sim.dead <= 0) respawn(sim);
    return events;
  }

  sim.run += dt;
  const prevRects = sim.lastRects;

  stepPlates(sim, dt);

  if (level.id === "roof" && sim.crack < 1) {
    const lift = sim.gateLift.gSign ?? 0;
    if (lift > 0.35) sim.sawGate = true;
    if (sim.crack === 0 && sim.sawGate && lift < 0.05 && sim.x > 2920) sim.crack = 0.001;
    if (sim.crack > 0) sim.crack = Math.min(1, sim.crack + dt / 0.45);
  }

  for (const id of Object.keys(sim.crumbles)) {
    const state = sim.crumbles[id]!;
    if (state.gone) {
      state.back -= dt;
      if (state.back <= 0) {
        state.timer = 0;
        state.fall = 0;
        state.gone = false;
        state.back = 0;
      }
      continue;
    }
    const standing = (!sim.linked || sim.groundId === id) && sim.groundId === id;
    if (id === "lid") {
      const inHole = sim.x + PW > 2048 && sim.x < 2418 && sim.y > 700;
      if (inHole && sim.rope <= 0) state.timer = 1;
      const dropped = state.timer > 0 || state.fall > 0 || sim.rope > 0;
      const target = !dropped ? 0 : 268 * (1 - sim.rope);
      if (state.fall < target) state.fall = Math.min(target, state.fall + 420 * dt);
      else if (state.fall > target) state.fall = Math.max(target, state.fall - 160 * dt);
      const lidY = 180 + state.fall;
      const caught =
        state.fall > 16 &&
        sim.rope < 0.85 &&
        sim.x + PW > 2060 &&
        sim.x < 2400 &&
        sim.y < lidY + 48 &&
        sim.y + PH > lidY;
      if (caught) kill(sim, events);
      continue;
    }
    if (standing) state.timer += dt;
    else if (state.fall === 0) state.timer = 0;
    if (state.timer > 1.45) state.fall += 420 * dt;
    if (state.fall > 180) {
      state.gone = true;
      state.back = 4;
    }
  }

  const nextBodies = rectsAt(sim, reduced);
  sim.lastRects = nextBodies;
  if (sim.groundId && prevRects) {
    const before = prevRects.find((rect) => rect.id === sim.groundId);
    const after = nextBodies.find((rect) => rect.id === sim.groundId);
    if (before && after) {
      const state = sim.crumbles[sim.groundId];
      const restY = state ? after.y - state.fall : after.y;
      const safeDrop = choirSafeDrop(sim, sim.groundId, restY, before.x, before.w) && after.y > before.y + 1;
      sim.x += after.x - before.x;
      if (safeDrop) {
        sim.grounded = false;
        sim.groundId = null;
        sim.groundKind = null;
      } else {
        sim.y += after.y - before.y;
      }
    }
  }

  let dir = 0;
  if (input.left) dir -= 1;
  if (input.right) dir += 1;
  if (input.left && input.right) dir = 0;
  const accel = sim.grounded ? ACCEL : AIR;
  const reversing = dir !== 0 && sim.vx !== 0 && Math.sign(sim.vx) !== dir;
  if (dir !== 0) {
    sim.vx += dir * accel * (reversing ? 0.62 : 1) * dt;
    if (Math.sign(sim.vx) === dir || Math.abs(sim.vx) < 36) sim.facing = dir < 0 ? -1 : 1;
  } else {
    const drag = (sim.grounded ? FRICTION : AIR * 0.3) * dt;
    if (Math.abs(sim.vx) <= drag) sim.vx = 0;
    else sim.vx -= Math.sign(sim.vx) * drag;
  }
  const clock = level.wind?.mode === "tide" ? Date.now() / 1000 : sim.t;
  if (!sim.grounded) sim.vx += windAccel(level.wind, sim.x + PW / 2, clock) * dt;
  sim.vx = Math.max(-RUN, Math.min(RUN, sim.vx));
  sim.look += (sim.facing - sim.look) * Math.min(1, dt * 7);

  let gravity = sim.vy < 0 ? GRAV_UP : GRAV_DOWN;
  if (Math.abs(sim.vy) < APEX) gravity = GRAV_APEX;
  const shaft = ladderHit(sim);
  sim.nearLadder = shaft != null;
  if (shaft && (input.interact || input.down)) sim.climbing = true;
  if (!shaft) sim.climbing = false;
  if (sim.climbing && shaft && (input.left || input.right) && !input.interact && !input.down) sim.climbing = false;
  if (sim.climbing && input.jumpPressed) sim.climbing = false;
  if (sim.climbing && shaft) {
    sim.x = shaft.x + shaft.w / 2 - PW / 2;
    sim.vx = 0;
    sim.facing = 1;
    if (input.down) {
      sim.climbDir = 1;
      sim.vy = 150;
      sim.anim += dt;
    } else if (input.interact) {
      sim.climbDir = -1;
      sim.vy = -120;
      sim.anim += dt;
    } else sim.vy = 0;
    sim.grounded = false;
    sim.groundId = null;
    sim.groundKind = null;
    input.interactPressed = false;
  } else {
    sim.vy = Math.min(MAX_FALL, sim.vy + gravity * dt);
  }

  if (sim.grounded) sim.coyote = COYOTE;
  else sim.coyote = Math.max(0, sim.coyote - dt);
  if (input.jumpPressed) sim.jumpBuffer = BUFFER;
  else sim.jumpBuffer = Math.max(0, sim.jumpBuffer - dt);
  if (sim.climbing) sim.jumpBuffer = 0;
  if (sim.drop > 0) sim.drop = Math.max(0, sim.drop - dt);

  if (input.down && sim.grounded && sim.groundKind && sim.groundKind !== "solid" && sim.groundKind !== "gate") {
    sim.drop = 0.18;
    sim.dropId = sim.groundId;
    sim.grounded = false;
    sim.groundId = null;
    sim.groundKind = null;
    sim.coyote = 0;
  }

  const canJump = !sim.climbing && sim.jumpBuffer > 0 && (sim.grounded || sim.coyote > 0);
  if (canJump) {
    sim.vy = JUMP;
    sim.grounded = false;
    sim.groundId = null;
    sim.groundKind = null;
    sim.coyote = 0;
    sim.jumpBuffer = 0;
    sim.cut = false;
    events.jump = true;
  } else if (!input.jumpHeld && sim.vy < 0 && !sim.cut) {
    sim.vy *= JUMP_CUT;
    sim.cut = true;
  }

  sim.walking = Math.abs(sim.vx) > 18 && sim.grounded;
  if (sim.walking) sim.anim += dt;
  const prevX = sim.x;
  const prevY = sim.y;
  sim.x += sim.vx * dt;
  if (!sim.climbing) resolveX(sim, prevX, prevY, nextBodies);
  const midY = sim.y;
  sim.y += sim.vy * dt;
  if (sim.climbing && shaft && sim.vy > 0) {
    const floor = shaft.y + shaft.h;
    if (sim.y + PH > floor) {
      sim.y = floor - PH;
      sim.vy = 0;
    }
  }
  const landed = resolveY(sim, prevX, midY, nextBodies);
  if (landed && !sim.wasGrounded) events.land = true;
  sim.wasGrounded = sim.grounded;

  const bottom = sim.y + PH;
  const center = sim.x + PW / 2;
  if (bottom > level.killY) kill(sim, events);
  const pit = level.pit;
  if (pit && sim.invuln <= 0 && center > pit.x0 && center < pit.x1 && bottom > pit.y) {
    kill(sim, events);
  }

  for (let i = 0; i < level.birds.length; i++) {
    const spec = level.birds[i]!;
    const bird = sim.birds[i]!;
    if (sim.slain.has(i)) continue;
    bird.x += bird.dir * spec.speed * dt;
    if (bird.x > spec.x1) bird.dir = -1;
    if (bird.x < spec.x0) bird.dir = 1;
    const birdY = spec.y + birdLift(spec, sim.t, i, reduced);
    if (spec.kind === "alien" && sim.saber && saberHits(sim, bird.x + 8, birdY + 16)) {
      sim.slain.add(i);
      continue;
    }
    const deer = spec.kind === "deer";
    const hitW = deer ? 72 : spec.kind === "gator" ? 86 : spec.kind === "ship" ? 52 : spec.kind === "alien" ? 26 : spec.kind === "rocket" ? 48 : spec.kind === "turtle" ? 34 : spec.kind === "rat" ? 28 : 22;
    const hitH = deer ? 40 : spec.kind === "gator" ? 30 : spec.kind === "ship" ? 22 : spec.kind === "alien" ? 40 : spec.kind === "rocket" ? 18 : spec.kind === "turtle" ? 26 : spec.kind === "rat" ? 20 : 14;
    const top = deer ? birdY - hitH : birdY;
    const bot = deer ? birdY : birdY + hitH;
    if (
      sim.invuln <= 0 &&
      sim.x < bird.x + hitW &&
      sim.x + PW > bird.x - 8 &&
      sim.y < bot &&
      sim.y + PH > top
    ) {
      kill(sim, events);
    }
  }

  for (const pose of spiderPoses(sim, reduced)) {
    if (
      sim.invuln <= 0 &&
      sim.x < pose.x + 11 &&
      sim.x + PW > pose.x - 11 &&
      sim.y < pose.y + 8 &&
      sim.y + PH > pose.y - 8
    ) {
      kill(sim, events);
    }
  }

  if (level.introCrow && sim.x > 1580) sim.perch = Math.min(1, sim.perch + dt * 0.45);

  for (const moth of level.moths) {
    if (sim.moths.has(moth.id)) continue;
    const dx = center - moth.x;
    const dy = sim.y + PH * 0.4 - moth.y;
    if (dx * dx + dy * dy < 26 * 26) {
      sim.moths.add(moth.id);
      events.moth = true;
      events.mothId = moth.id;
    }
  }

  if (level.id === "yule" && sim.dead <= 0 && sim.cage <= 0 && sim.suck <= 0) {
    const needRoom = sim.moths.has("p4") && sim.gifts < level.moths.length;
    const inRoom = sim.x > 11200;
    if (needRoom && !inRoom) {
      if (sim.hearthX === 0) {
        sim.hearthX = sim.x;
        sim.hearthY = sim.y;
      }
      sim.x = 11540;
      sim.y = 640 - PH;
      sim.vx = 0;
      sim.vy = 0;
      sim.climbing = false;
    } else if (inRoom && sim.hearthLeave > 0) {
      sim.hearthLeave -= dt;
      if (sim.hearthLeave <= 0 && sim.hearthX > 0) {
        sim.hearthLeave = 0;
        sim.x = sim.hearthX;
        sim.y = sim.hearthY;
        sim.vx = 0;
        sim.vy = 0;
      }
    } else if (inRoom && input.interactPressed) {
      const tree = sim.x > 11940 && sim.x < 12180 && sim.y + PH > 590;
      if (tree && sim.gifts < sim.moths.size) {
        sim.gifts += 1;
        sim.feast = 1.2;
        if (sim.gifts >= level.moths.length) sim.hearthLeave = 5;
      }
    }
    if (inRoom && sim.feast > 0) sim.feast = Math.max(0, sim.feast - dt);
  }

  for (let i = 0; i < level.checkpoints.length; i++) {
    const cp = level.checkpoints[i]!;
    if (i <= sim.checkpoint) continue;
    if (Math.abs(center - cp.x) < 48 && Math.abs(bottom - cp.surface) < 22 && sim.grounded) {
      sim.checkpoint = i;
      events.checkpoint = cp.id;
    }
  }

  sim.nearRope = false;
  if (level.rope) {
    sim.nearRope = sim.rope < 1 && zoneHit(sim.x, sim.y, level.rope);
    if (level.id === "shore" || level.id === "latch") {
      if (sim.nearRope && input.interact && sim.rope < 1) {
        const before = sim.rope;
        if (!sim.pulling) events.pull = true;
        sim.pulling = true;
        sim.rope = Math.min(1, sim.rope + dt / 1.7);
        if (before < 1 && sim.rope === 1) events.rope = true;
      }
      if (level.id === "shore" && sim.rope >= 1) {
        const nearCage = Math.abs(sim.x - 2460) < 200 && sim.y < 420;
        if (sim.feast > 0 || nearCage) sim.feast += dt;
      }
      if (level.id === "shore") {
        const flyCrank = { id: "rope-fly", x: 4760, y: 336, w: 100, h: 130 };
        const atFly = sim.rope2 < 1 && zoneHit(sim.x, sim.y, flyCrank);
        if (atFly) sim.nearRope = true;
        if (atFly && input.interact) {
          const before = sim.rope2;
          if (!sim.pulling) events.pull = true;
          sim.pulling = true;
          sim.rope2 = Math.min(1, sim.rope2 + dt / 1.7);
          if (before < 1 && sim.rope2 === 1) events.rope = true;
        }
        if (sim.rope2 >= 1) {
          const nearFly = Math.abs(sim.x - 4788) < 180 && sim.y < 520;
          if (sim.feast2 > 0 || nearFly) sim.feast2 += dt;
        }
        const endCrank = { id: "rope-end", x: 7360, y: 350, w: 110, h: 140 };
        const atEnd = sim.rope3 < 1 && zoneHit(sim.x, sim.y, endCrank);
        if (atEnd) sim.nearRope = true;
        if (atEnd && input.interact) {
          const before = sim.rope3;
          if (!sim.pulling) events.pull = true;
          sim.pulling = true;
          sim.rope3 = Math.min(1, sim.rope3 + dt / 1.7);
          if (before < 1 && sim.rope3 === 1) events.rope = true;
        }
        if (sim.rope3 >= 1) {
          const nearEnd = Math.abs(sim.x - 7600) < 160 && sim.y < 530;
          if (sim.saved > 0 || nearEnd) {
            const before = sim.saved;
            sim.saved += dt;
            if (before <= 2 && sim.saved > 2) {
              sim.palX = 7588;
              sim.palY = 480 - PH;
              sim.palFace = 1;
            }
          }
        }
      }
    } else if (input.interactPressed && sim.nearRope && !sim.pulling) {
      sim.pulling = true;
      events.pull = true;
    }
  }

  sim.nearBeacon = null;
  for (const beacon of level.beacons) {
    if (sim.beacons.has(beacon.id)) continue;
    if (!zoneHit(sim.x, sim.y, beacon)) continue;
    sim.nearBeacon = beacon.id;
    if (input.interactPressed) {
      sim.beacons.add(beacon.id);
      events.beacon = beacon.id;
    }
  }

  sim.nearCombo = null;
  const lock = level.combo;
  if (lock && !comboSet(sim)) {
    const px = sim.x + PW / 2;
    const lifted = level.id === "latch" && sim.cage > 0.05;
    const onIt =
      px >= lock.x &&
      px <= lock.x + lock.span &&
      (lifted || (sim.y + PH > lock.y - 28 && sim.y < lock.y + 8));
    if (onIt) {
      const slot = lock.span / lock.code.length;
      const index = Math.min(lock.code.length - 1, Math.max(0, Math.floor((px - lock.x) / slot)));
      sim.nearCombo = index;
      if (input.interactPressed && !events.beacon) {
        sim.combo[index] = ((sim.combo[index] ?? 0) + 1) % 10;
        events.beacon = "lock";
      }
    }
  }

  sim.nearShrine = null;
  sim.nearLamp = false;
  if (!events.beacon) {
    for (const zone of level.shrines) {
      if (zoneHit(sim.x, sim.y, zone)) {
        sim.nearShrine = zone.id;
        if (input.interactPressed) events.shrine = zone.id;
      }
    }
  }
  if (!events.beacon && !events.shrine && !events.pull) {
    for (const lamp of level.lamps ?? []) {
      if (!zoneHit(sim.x, sim.y, lamp)) continue;
      sim.nearLamp = true;
      if (input.interactPressed) {
        events.lamp = true;
        events.lampId = level.id === "moon" || level.id === "hoist" ? lamp.id : null;
      }
      break;
    }
  }

  if (level.id === "moon" || level.id === "hoist") {
    for (const id of [...sim.altars]) {
      sim.altarLeft[id] = (sim.altarLeft[id] ?? 0) - dt;
      if (sim.altarLeft[id] <= 0) {
        sim.altars.delete(id);
        delete sim.altarLeft[id];
      }
    }
  }

  stepStalker(sim, dt, events);
  stepHunter(sim, dt, events);
  stepBoulder(sim, dt, events);

  if (level.id === "mirror" && sim.wake >= 1 && !sim.won && sim.suck <= 0 && sim.dead <= 0) {
    const inBucket = sim.x > 1980 && sim.x < 2160 && sim.y < 190 && sim.y + PH > 120;
    if (sim.cage > 0 || inBucket) {
      if (sim.cage <= 0) sim.cage = 0.02;
      sim.cage = Math.min(1, sim.cage + dt / 4.5);
      const u = sim.cage;
      sim.vx = 0;
      sim.vy = 0;
      sim.climbing = false;
      sim.x = 2040 + (120 - 2040) * u;
      sim.y = 160 - PH + (468 - 160) * u;
    }
  }

  if (level.id === "moon" && !sim.won && sim.suck <= 0) {
    const pad = sim.x > 1480 && sim.y < -600 && sim.y > -780;
    if (sim.cage > 0 || pad) {
      if (sim.cage <= 0) {
        sim.palX = sim.x - 260;
        sim.palY = sim.y + 30;
      }
      sim.cage = Math.min(1, sim.cage + dt / 8);
      const rush = sim.cage * sim.cage;
      sim.vx = 0;
      sim.vy = 0;
      sim.x = 1520 + rush * 2320;
      sim.y = -696 + rush * -124;
      const gap = 220 - sim.cage * 90;
      sim.palX += (sim.x - gap - sim.palX) * Math.min(1, dt * 2.4);
      sim.palY += (sim.y + 24 - sim.palY) * Math.min(1, dt * 2.4);
    }
  }

  if (level.id === "yule" && !sim.won && sim.suck <= 0) {
    const presents = sim.moths.size >= level.moths.length && sim.gifts >= level.moths.length;
    const onCrest =
      presents &&
      sim.x + PW > 5240 &&
      sim.x < 5600 &&
      sim.y + PH > 400 &&
      sim.y + PH < 500;
    if (sim.cage > 0 || onCrest) {
      if (sim.cage <= 0) sim.cage = 0.04;
      sim.cage = Math.min(1, sim.cage + dt / 8.5);
      const u = sim.cage;
      sim.vx = 0;
      sim.vy = 0;
      sim.climbing = false;
      sim.grounded = true;
      const rideX = 5360 + u * 3720;
      const slope = rideX < 5600 ? 440 : 440 + ((rideX - 5600) / 3800) * 420;
      sim.x = rideX;
      sim.y = slope - PH;
      const ballX = sim.x - 280;
      sim.stalkX = ballX;
      sim.stalkY = ballX < 5600 ? 440 : 440 + ((ballX - 5600) / 3800) * 420;
      sim.wake = 1;
    }
  }

  if (level.id === "gale" && !sim.won && sim.suck <= 0) {
    const lip = sim.x > 4240 && sim.y > 360 && sim.y < 520;
    if (sim.cage > 0 || lip) {
      if (sim.cage <= 0) sim.palY = 0;
      sim.cage = Math.min(1, sim.cage + dt / 8);
      if (input.jumpHeld) sim.palY -= 78 * dt;
      if (input.down) sim.palY += 78 * dt;
      sim.palY = Math.max(-78, Math.min(78, sim.palY));
      const u = sim.cage;
      const steer = sim.palY * (1 - u * u);
      sim.vx = 0;
      sim.vy = 0;
      sim.x = 4320 + u * 1200;
      sim.y = 400 + u * 240 + Math.sin(u * Math.PI) * -30 + steer;
    }
  }

  if (level.id === "choir" && comboSet(sim) && sim.beacons.size >= level.beacons.length && !sim.won && sim.suck <= 0) {
    const onCrown = sim.x > 2200 && sim.x < 2520 && sim.y < -220;
    if (onCrown || sim.cage > 0) {
      sim.cage = Math.min(1, sim.cage + dt * 0.28);
      sim.vx = 0;
      sim.vy = 0;
      sim.x += (2588 - sim.x) * Math.min(1, dt * 0.7);
      sim.y += (-690 - sim.y) * Math.min(1, dt * 0.7);
    }
  }

  if (level.id === "latch" && !sim.won) {
    const px = sim.x + PW / 2;
    const nearExit = px > 5010 && px < 5150 && sim.y + PH > 400 && sim.y < 530;
    if (!comboSet(sim) && (sim.cage > 0 || nearExit)) {
      sim.cage = Math.min(1, sim.cage + dt * 1.5);
      sim.vy = 0;
      sim.y = 468 - PH - 156 * sim.cage;
      sim.x = Math.min(5132, Math.max(4992, sim.x));
    } else if (sim.cage > 0) {
      sim.cage = Math.max(0, sim.cage - dt * 1.8);
      sim.vy = 0;
      sim.y = 468 - PH - 156 * sim.cage;
    }
  }

  if (events.beacon === "lock") events.beacon = null;
  stepPal(sim, dt);
  sim.doorLocked =
    (level.id === "shore" && (sim.rope < 1 || sim.rope2 < 1 || sim.saved <= 2)) ||
    (level.id === "yule" && sim.gifts < level.moths.length) ||
    (level.id !== "yule" && level.beacons.length > 0 && sim.beacons.size < level.beacons.length) ||
    (!!level.stalker && !sim.caged) ||
    (!!level.hunter && sim.wake < 1) ||
    !comboSet(sim);
  sim.nearGoal = zoneHit(sim.x, sim.y, level.goal);
  if (!sim.won && !sim.doorLocked && (sim.nearGoal || sim.suck > 0)) {
    sim.suck = Math.min(1, sim.suck + dt / 1.15);
    sim.vx = 0;
    sim.vy = 0;
    const gx = level.goal.x + level.goal.w / 2 - PW / 2;
    const gy = level.goal.y + level.goal.h * 0.42 - PH / 2;
    sim.x += (gx - sim.x) * Math.min(1, dt * 4);
    sim.y += (gy - sim.y) * Math.min(1, dt * 4);
    if (level.id === "shore" && sim.saved > 2) {
      sim.palX += (gx - 22 - sim.palX) * Math.min(1, dt * 4);
      sim.palY += (gy - sim.palY) * Math.min(1, dt * 4);
    }
    if (sim.suck >= 1) {
      sim.won = true;
      events.goal = true;
    }
  }

  if (sim.x < 0) {
    sim.x = 0;
    sim.vx = 0;
  }
  if (sim.x > level.worldW - PW) {
    sim.x = level.worldW - PW;
    sim.vx = 0;
  }
  return events;
}

function stepStalker(sim: Sim, dt: number, events: StepEvents) {
  const spec = sim.level.stalker;
  sim.nearTrap = false;
  if (!spec) return;
  const lit = sim.level.beacons.length > 0 && sim.beacons.size >= sim.level.beacons.length;
  if (!lit) return;
  const passed = sim.x + PW / 2 > spec.x + 260;
  if (sim.wake <= 0 && !passed) return;
  if (sim.wake < 1) {
    sim.wake = Math.min(1, sim.wake + dt / 1.15);
    return;
  }
  if (sim.cage > 0 && sim.cage < 1) sim.cage = Math.min(1, sim.cage + dt / 0.28);
  if (sim.caged) {
    sim.stalkX = Math.max(spec.cageX0 + 24, Math.min(spec.cageX1 - 24, sim.stalkX));
    return;
  }
  const speed = 172;
  const prey = sim.x + PW / 2;
  if (sim.stalkX < prey - 6) {
    sim.stalkX += speed * dt;
    sim.stalkDir = 1;
  } else if (sim.stalkX > prey + 6) {
    sim.stalkX -= speed * dt;
    sim.stalkDir = -1;
  }
  if (
    sim.invuln <= 0 &&
    Math.abs(prey - sim.stalkX) < 30 &&
    sim.y < spec.surface &&
    sim.y + PH > spec.surface - 108
  ) {
    kill(sim, events);
  }
  const onPlate = zoneHit(sim.x, sim.y, spec.plate);
  const inside = sim.stalkX > spec.cageX0 && sim.stalkX < spec.cageX1;
  if (onPlate && inside) {
    sim.caged = true;
    sim.cage = 0.04;
    sim.stalkX = Math.max(spec.cageX0 + 36, Math.min(spec.cageX1 - 36, sim.stalkX));
    return;
  }
  if (onPlate) sim.nearTrap = true;
}

function stepBoulder(sim: Sim, dt: number, events: StepEvents) {
  const spec = sim.level.boulder;
  if (!spec || sim.won) return;
  if (sim.caged) {
    sim.cage = Math.min(480, sim.cage + 540 * dt);
    return;
  }
  const prey = sim.x + PW / 2;
  if (sim.wake <= 0) {
    sim.stalkX = spec.x;
    sim.stalkY = spec.surface;
    if (prey >= spec.wakeX) sim.wake = 1;
    return;
  }
  sim.stalkX += spec.speed * dt;
  sim.stalkDir = 1;
  const feet = sim.y + PH;
  if (feet > sim.stalkY + 6) sim.stalkY = Math.min(feet, sim.stalkY + 340 * dt);
  if (sim.stalkX >= spec.pitX) {
    sim.caged = true;
    sim.cage = 0;
    return;
  }
  const dx = prey - sim.stalkX;
  const dy = sim.y + PH / 2 - (sim.stalkY - 112);
  if (sim.invuln <= 0 && sim.dead <= 0 && dx * dx + dy * dy < 120 * 120) kill(sim, events);
}

function stepHunter(sim: Sim, dt: number, events: StepEvents) {
  const spec = sim.level.hunter;
  if (!spec || sim.won) return;
  const prey = sim.x + PW / 2;
  if (sim.wake <= 0) {
    if (prey >= spec.wakeX) sim.wake = 0.02;
    return;
  }
  if (sim.wake < 1) {
    sim.wake = Math.min(1, sim.wake + dt / 0.7);
    sim.stalkX = spec.x;
    sim.stalkY = spec.surface;
    sim.stalkDir = -1;
    return;
  }
  if (sim.stalkY < 40) sim.stalkY = spec.surface;
  const speed = 148;
  const ladderX = 2154;
  const top = 196;
  const onClimb = sim.y + PH < spec.surface - 24 && sim.x > 1900 && sim.x < 2400;
  const followUp = sim.cage > 0 || onClimb || sim.stalkY < spec.surface - 16;
  if (followUp && (sim.x < 2500 || sim.cage > 0 || sim.stalkY < spec.surface - 16)) {
    if (Math.abs(sim.stalkX - ladderX) > 16 && sim.stalkY > spec.surface - 20) {
      sim.stalkDir = sim.stalkX > ladderX ? -1 : 1;
      sim.stalkX += (sim.stalkDir * speed) * dt;
    } else {
      sim.stalkX += (ladderX - sim.stalkX) * Math.min(1, dt * 4);
      const goalY = sim.cage > 0 ? top : Math.max(top, sim.y + PH + 10);
      const step = 72 * dt;
      if (sim.stalkY > goalY + 2) sim.stalkY = Math.max(goalY, sim.stalkY - step);
      sim.stalkDir = -1;
    }
  } else if (sim.stalkX > prey + 28) {
    sim.stalkX -= speed * dt;
    sim.stalkDir = -1;
    sim.stalkY += (spec.surface - sim.stalkY) * Math.min(1, dt * 3);
  }
  if (sim.cage > 0) return;
  const feet = sim.stalkY;
  if (
    sim.invuln <= 0 &&
    sim.dead <= 0 &&
    prey > sim.stalkX - 70 &&
    prey < sim.stalkX + 36 &&
    sim.y < feet &&
    sim.y + PH > feet - 90
  ) {
    kill(sim, events);
  }
}

function ladderHit(sim: Sim) {
  const cx = sim.x + PW / 2;
  for (const plat of sim.level.platforms) {
    if (plat.kind !== "ladder") continue;
    if (cx < plat.x + 2 || cx > plat.x + plat.w - 2) continue;
    if (sim.y + PH < plat.y - 10 || sim.y > plat.y + plat.h) continue;
    return plat;
  }
  return null;
}

function blocksSide(kind: Kind) {
  return kind === "solid" || kind === "gate";
}

function resolveX(sim: Sim, prevX: number, prevY: number, bodies: Rect[]) {
  const prevRight = prevX + PW;
  const bottom = prevY + PH;
  for (const plat of bodies) {
    if (!blocksSide(plat.kind)) continue;
    if (!overlaps(sim.x, sim.y, PW, PH, plat, 6)) continue;
    if (plat.y >= bottom - 12) continue;
    if (sim.vx > 0 && prevRight <= plat.x + 1) {
      sim.x = plat.x - PW;
      sim.vx = 0;
    } else if (sim.vx < 0 && prevX >= plat.x + plat.w - 1) {
      sim.x = plat.x + plat.w;
      sim.vx = 0;
    } else if (sim.vx >= 0 && sim.x + PW > plat.x && prevRight <= plat.x + plat.w / 2) {
      sim.x = plat.x - PW;
      sim.vx = 0;
    } else if (sim.vx <= 0) {
      sim.x = plat.x + plat.w;
      sim.vx = 0;
    }
  }
}

function resolveY(sim: Sim, prevX: number, prevY: number, bodies: Rect[]) {
  let landed = false;
  const prevBottom = prevY + PH;
  sim.grounded = false;
  sim.groundId = null;
  sim.groundKind = null;
  for (const plat of bodies) {
    if (sim.climbing) continue;
    if (choirSafeDrop(sim, plat.id, plat.y - (sim.crumbles[plat.id]?.fall ?? 0), plat.x, plat.w)) continue;
    if (!overlaps(sim.x, sim.y, PW, PH, plat, 0)) continue;
    const topOnly = plat.kind !== "solid" && plat.kind !== "gate";
    if (sim.climbing && plat.kind === "solid" && sim.vy < 0) continue;
    if (topOnly) {
      if (sim.drop > 0 && sim.dropId === plat.id) continue;
      if (sim.vy < 0) continue;
      if (prevBottom > plat.y + 3) continue;
      sim.y = plat.y - PH;
      sim.vy = 0;
      sim.grounded = true;
      sim.groundId = plat.id;
      sim.groundKind = plat.kind;
      landed = true;
      continue;
    }
    if (sim.vy >= 0 && prevBottom <= plat.y + 4) {
      sim.y = plat.y - PH;
      sim.vy = 0;
      sim.grounded = true;
      sim.groundId = plat.id;
      sim.groundKind = plat.kind;
      landed = true;
    } else if (sim.vy < 0 && prevY >= plat.y + plat.h - 2) {
      sim.y = plat.y + plat.h;
      sim.vy = 0;
    }
  }
  void prevX;
  return landed;
}

export function birdSpots(sim: Sim, reduced: boolean) {
  return sim.level.birds.map((spec, index) => {
    const bird = sim.birds[index]!;
    return {
      x: bird.x,
      y: spec.y + birdLift(spec, sim.t, index, reduced),
      dir: bird.dir,
      kind: spec.kind ?? "crow",
      index,
    };
  });
}

function birdLift(spec: { amp: number; kind?: string }, t: number, index: number, reduced: boolean) {
  if (reduced || spec.amp === 0) return 0;
  if (spec.kind === "deer") return -Math.abs(Math.sin(t * 3.6 + index * 1.7)) * spec.amp;
  return Math.sin(t * 2.1) * spec.amp;
}

export type SpiderPose = {
  id: string;
  mode: Spider["mode"];
  kind: "spider" | "scorpion";
  x: number;
  y: number;
  dir: 1 | -1;
  ceil: number | null;
  warn: boolean;
};

export function spiderPoses(sim: Sim, reduced: boolean): SpiderPose[] {
  return sim.level.spiders.map((spec) => poseSpider(spec, sim.t, reduced));
}

function poseSpider(spec: Spider, t: number, reduced: boolean): SpiderPose {
  if (spec.mode === "crawl") {
    const span = Math.max(8, spec.x1 - spec.x0);
    const speed = Math.max(8, spec.speed);
    const cycle = (span * 2) / speed;
    const local = (((t + spec.phase) % cycle) + cycle) % cycle;
    const dist = local * speed;
    const going = dist <= span;
    return {
      id: spec.id,
      mode: "crawl",
      kind: spec.kind ?? "spider",
      x: going ? spec.x0 + dist : spec.x1 - (dist - span),
      y: spec.y,
      dir: going ? 1 : -1,
      ceil: null,
      warn: false,
    };
  }
  const period = Math.max(2.4, spec.period);
  const phase = (((t + spec.phase) % period) + period) % period;
  const warnLead = 0.42;
  const fall = 0.22;
  const hold = 0.7;
  const climb = 0.9;
  let drop = 0;
  if (phase < warnLead) drop = 0;
  else if (phase < warnLead + fall) {
    const u = (phase - warnLead) / fall;
    drop = spec.reach * u * u;
  } else if (phase < warnLead + fall + hold) drop = spec.reach;
  else if (phase < warnLead + fall + hold + climb) {
    const u = (phase - warnLead - fall - hold) / climb;
    drop = spec.reach * (1 - u);
  }
  const sway = reduced ? 0 : Math.sin(t * 1.15 + spec.phase) * 8;
  return {
    id: spec.id,
    mode: "hang",
    kind: spec.kind ?? "spider",
    x: (spec.x0 + spec.x1) / 2 + sway,
    y: spec.y + drop,
    dir: sway >= 0 ? 1 : -1,
    ceil: spec.ceil,
    warn: phase < warnLead,
  };
}

export function perchPosition(sim: Sim) {
  const t = sim.perch;
  const x = 1788 + t * t * 420;
  const y = 336 - Math.sin(Math.min(1, t) * Math.PI) * 160 - t * 40;
  return { x, y, gone: t >= 1 };
}
