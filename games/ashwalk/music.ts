export type MusicScene =
  | "title"
  | "shore"
  | "cages"
  | "white"
  | "latch"
  | "gale"
  | "choir"
  | "chant"
  | "works"
  | "gear"
  | "roof"
  | "tunnel"
  | "hoist"
  | "yule"
  | "hallow"
  | "moon"
  | "mirror"
  | "hunt"
  | "rite"
  | "clear";

type SceneScore = {
  step: number;
  drones: readonly number[];
  pluck: number;
  wave: OscillatorType;
  gain: number;
  /** How long a note rings. Longer notes overlap, like voices. */
  sustain?: number;
  steps: readonly (readonly number[])[];
  noise: number;
};

const SCENES: Record<MusicScene, SceneScore> = {
  title: {
    step: 1.35,
    drones: [38, 50],
    pluck: 62,
    wave: "triangle",
    gain: 0.11,
    steps: [[0], [], [7], [], [3], [10], [], [7]],
    noise: 0,
  },
  shore: {
    step: 1.05,
    drones: [38, 45, 50],
    pluck: 62,
    wave: "triangle",
    gain: 0.14,
    steps: [[0, 7], [], [3], [], [10], [7], [15], []],
    noise: 0,
  },
  cages: {
    step: 1.2,
    drones: [36, 42],
    pluck: 60,
    wave: "triangle",
    gain: 0.1,
    steps: [[0], [1], [], [6], [], [1, 6], [], [7]],
    noise: 0,
  },
  white: {
    step: 0.92,
    drones: [45, 52, 57],
    pluck: 69,
    wave: "sine",
    gain: 0.12,
    steps: [[0], [3], [7], [12], [7], [3], [15], [10]],
    noise: 0,
  },
  latch: {
    step: 0.52,
    drones: [40, 52],
    pluck: 64,
    wave: "square",
    gain: 0.06,
    steps: [[0], [12], [0], [7], [0], [12], [3], [0]],
    noise: 0,
  },
  gale: {
    step: 1.8,
    drones: [31, 38],
    pluck: 50,
    wave: "sine",
    gain: 0.02,
    sustain: 2.6,
    steps: [[], [], [], [0], [], [], [], []],
    noise: 0.18,
  },
  choir: {
    step: 0.98,
    drones: [40, 47, 52, 59],
    pluck: 71,
    wave: "sine",
    gain: 0.11,
    steps: [[0, 7], [4], [7, 12], [11], [12, 16], [7], [4, 12], [0]],
    noise: 0,
  },
  chant: {
    step: 0.86,
    drones: [38, 45, 50],
    pluck: 62,
    wave: "sine",
    gain: 0.07,
    sustain: 2.5,
    steps: [[0], [3], [5], [7], [10], [7], [5], [3]],
    noise: 0,
  },
  works: {
    step: 0.5,
    drones: [36, 43, 48],
    pluck: 60,
    wave: "square",
    gain: 0.08,
    steps: [[0], [], [7], [], [0, 12], [], [5], []],
    noise: 0.05,
  },
  gear: {
    step: 0.36,
    drones: [31, 38, 43],
    pluck: 55,
    wave: "square",
    gain: 0.09,
    steps: [[0, 7], [0], [12], [0], [5, 12], [7], [0], [3]],
    noise: 0.045,
  },
  roof: {
    step: 1.1,
    drones: [40, 47],
    pluck: 64,
    wave: "triangle",
    gain: 0.05,
    sustain: 0.7,
    steps: [[0], [], [7], [], [3], [], [10], []],
    noise: 0.16,
  },
  tunnel: {
    step: 1.7,
    drones: [26, 33, 38],
    pluck: 50,
    wave: "sine",
    gain: 0.1,
    sustain: 3.2,
    steps: [[0], [], [], [7], [], [3], [], [10]],
    noise: 0.08,
  },
  hoist: {
    step: 0.66,
    drones: [44, 51, 56],
    pluck: 68,
    wave: "square",
    gain: 0.075,
    steps: [[0, 12], [], [7], [4], [0], [9], [5], [12]],
    noise: 0.03,
  },
  yule: {
    step: 0.3,
    drones: [60, 64, 67],
    pluck: 72,
    wave: "sine",
    gain: 0.1,
    sustain: 0.46,
    steps: [
      [4], [4], [4], [],
      [4], [4], [4], [],
      [4], [7], [0], [2],
      [4], [], [7, 12], [],
      [7], [7], [7], [],
      [7], [4], [4], [4],
      [0], [0], [2], [0],
      [-5], [], [4, 16], [],
    ],
    noise: 0.05,
  },
  hallow: {
    step: 0.28,
    drones: [34, 41, 46],
    pluck: 70,
    wave: "square",
    gain: 0.085,
    sustain: 0.4,
    steps: [
      [0], [1], [0], [1],
      [0], [1], [0], [8],
      [7], [6], [7], [1],
      [0], [3], [1], [0],
    ],
    noise: 0.035,
  },
  moon: {
    step: 2.2,
    drones: [32, 44, 56, 80],
    pluck: 88,
    wave: "sine",
    gain: 0.04,
    sustain: 4.2,
    steps: [[0], [], [], [], [], [7], [], [], [], [12], [], [], [], [19], [], []],
    noise: 0.02,
  },
  mirror: {
    step: 1.4,
    drones: [34, 41, 46],
    pluck: 58,
    wave: "sine",
    gain: 0.09,
    sustain: 2.2,
    steps: [[0], [], [7], [], [3], [], [10], []],
    noise: 0.02,
  },
  hunt: {
    step: 0.42,
    drones: [32, 39, 46],
    pluck: 58,
    wave: "triangle",
    gain: 0.13,
    steps: [[0], [1], [], [7], [0], [], [3], [1]],
    noise: 0.04,
  },
  rite: {
    step: 1.45,
    drones: [43, 55],
    pluck: 67,
    wave: "sine",
    gain: 0.1,
    steps: [[0, 7, 12], [], [], [12, 19], [], []],
    noise: 0,
  },
  clear: {
    step: 1.05,
    drones: [36, 43, 48],
    pluck: 64,
    wave: "triangle",
    gain: 0.13,
    steps: [[0, 4, 7], [], [12], [4, 16], [7, 12], []],
    noise: 0,
  },
};

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

type Drone = { osc: OscillatorNode; gain: GainNode };

export type AshMusic = {
  unlock(): Promise<boolean>;
  sync(options: { scene: MusicScene; reduced: boolean; paused: boolean; hidden: boolean }): void;
  jump(): void;
  setMuted(muted: boolean): void;
  dispose(): void;
};

export function createAshMusic(): AshMusic {
  let muted = false;
  let reduced = false;
  let paused = false;
  let hidden = false;
  let scene: MusicScene = "title";
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let unlocked = false;
  let disposed = false;
  let pending: Promise<boolean> | null = null;
  let timer = 0;
  let nextAt = 0;
  let stepIndex = 0;
  let drones: Drone[] = [];
  let noiseGain: GainNode | null = null;
  let noiseFilter: BiquadFilterNode | null = null;
  let lfoGain: GainNode | null = null;
  let masterLevel = -1;

  function masterTarget() {
    if (muted || hidden) return 0.0001;
    if (paused) return 0.1;
    return 0.9;
  }

  function applyMaster() {
    if (!ctx || !master) return;
    const target = masterTarget();
    if (Math.abs(target - masterLevel) < 0.0001) return;
    masterLevel = target;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(target, now, 0.12);
  }

  function stopDrones() {
    for (const drone of drones) {
      try {
        drone.osc.stop();
      } catch {
        /* already stopped */
      }
      try {
        drone.osc.disconnect();
        drone.gain.disconnect();
      } catch {
        /* already detached */
      }
    }
    drones = [];
  }

  function ensureDrones() {
    if (!ctx || !master || !unlocked) return;
    const score = SCENES[scene];
    if (drones.length === score.drones.length) {
      const now = ctx.currentTime;
      score.drones.forEach((midi, index) => {
        const drone = drones[index];
        if (!drone) return;
        drone.osc.frequency.setTargetAtTime(hz(midi), now, 0.4);
        drone.gain.gain.setTargetAtTime(0.2, now, 0.4);
      });
      return;
    }
    stopDrones();
    const now = ctx.currentTime;
    for (const midi of score.drones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = hz(midi);
      gain.gain.value = 0.0001;
      gain.gain.setTargetAtTime(0.2, now, 0.45);
      if (lfoGain) lfoGain.connect(gain.gain);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      drones.push({ osc, gain });
    }
  }

  function ensureNoise() {
    if (!ctx || !master || noiseGain) return;
    const length = ctx.sampleRate * 2;
    const data = new Float32Array(length);
    let state = 0x5eed;
    for (let i = 0; i < length; i++) {
      state = (state * 16807) % 2147483647;
      data[i] = state / 2147483647 * 2 - 1;
    }
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    buffer.getChannelData(0).set(data);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    noiseFilter = filter;
    noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.0001;
    source.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(master);
    source.start();
  }

  function applyNoise() {
    if (!ctx || !noiseGain) return;
    const level = reduced ? 0.0001 : Math.max(0.0001, SCENES[scene].noise);
    noiseGain.gain.setTargetAtTime(level, ctx.currentTime, 0.4);
    if (!noiseFilter) return;
    if (scene === "gale") {
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setTargetAtTime(520, ctx.currentTime, 0.3);
      noiseFilter.Q.setTargetAtTime(0.55, ctx.currentTime, 0.3);
    } else if (scene === "moon") {
      noiseFilter.type = "highpass";
      noiseFilter.frequency.setTargetAtTime(1800, ctx.currentTime, 0.3);
      noiseFilter.Q.setTargetAtTime(0.45, ctx.currentTime, 0.3);
    } else if (scene === "roof") {
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setTargetAtTime(640, ctx.currentTime, 0.3);
      noiseFilter.Q.setTargetAtTime(0.7, ctx.currentTime, 0.3);
    } else if (scene === "hallow") {
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setTargetAtTime(240, ctx.currentTime, 0.3);
      noiseFilter.Q.setTargetAtTime(0.8, ctx.currentTime, 0.3);
    } else {
      noiseFilter.type = "lowpass";
      noiseFilter.frequency.setTargetAtTime(420, ctx.currentTime, 0.3);
      noiseFilter.Q.setTargetAtTime(0.7, ctx.currentTime, 0.3);
    }
  }

  function pluck(when: number, midi: number, wave: OscillatorType, level: number, dur: number) {
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = wave;
    osc.frequency.value = hz(midi);
    filter.type = "lowpass";
    filter.frequency.value = wave === "square" ? 900 : 1800;
    const attack = dur > 1.2 ? 0.18 : 0.02;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, level), when + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  function schedule() {
    if (!ctx || !master || !unlocked || muted || hidden || disposed) return;
    if (ctx.state !== "running") return;
    const score = SCENES[scene];
    const horizon = ctx.currentTime + 0.28;
    if (nextAt < ctx.currentTime) nextAt = ctx.currentTime + 0.04;
    while (nextAt < horizon) {
      if (!reduced) {
        const chord = score.steps[stepIndex % score.steps.length] ?? [];
        const dur = score.sustain ?? Math.min(score.step * 0.92, 1.1);
        for (const interval of chord) {
          pluck(nextAt, score.pluck + interval, score.wave, score.gain, dur);
        }
      }
      nextAt += score.step;
      stepIndex += 1;
    }
    if (ctx && noiseGain && noiseFilter && !reduced) {
      const t = ctx.currentTime;
      if (scene === "gale") {
        const gust = 0.5 + 0.5 * Math.sin(t * 0.32);
        const burst = Math.pow(Math.max(0, Math.sin(t * 0.85 + Math.sin(t * 0.19))), 2);
        noiseGain.gain.setTargetAtTime(0.05 + gust * 0.08 + burst * 0.2, t, 0.07);
        noiseFilter.frequency.setTargetAtTime(160 + gust * 780 + burst * 1600, t, 0.08);
      } else if (scene === "moon") {
        noiseGain.gain.setTargetAtTime(0.012 + Math.sin(t * 0.11) * 0.006, t, 0.4);
        noiseFilter.frequency.setTargetAtTime(1500 + Math.sin(t * 0.17) * 500, t, 0.4);
        const high = drones[drones.length - 1];
        if (high) high.osc.frequency.setTargetAtTime(hz(80) + Math.sin(t * 0.12) * 8, t, 0.6);
      } else if (scene === "hallow") {
        const wind = 0.45 + 0.55 * Math.sin(t * 0.21);
        const creak = Math.pow(Math.max(0, Math.sin(t * 0.62 + Math.sin(t * 0.17))), 10);
        noiseGain.gain.setTargetAtTime(0.035 + wind * 0.05 + creak * 0.16, t, 0.06);
        noiseFilter.frequency.setTargetAtTime(140 + wind * 220 + creak * 1400, t, 0.08);
        const low = drones[0];
        if (low) low.osc.frequency.setTargetAtTime(hz(31) + Math.sin(t * 0.15) * 1.4, t, 0.5);
      } else if (scene === "roof") {
        const traffic = 0.5 + 0.5 * Math.sin(t * 1.6);
        const horn = Math.pow(Math.max(0, Math.sin(t * 2.8 + Math.sin(t * 0.63))), 8);
        noiseGain.gain.setTargetAtTime(0.05 + traffic * 0.07 + horn * 0.14, t, 0.04);
        noiseFilter.frequency.setTargetAtTime(240 + traffic * 1100 + horn * 1600, t, 0.05);
      }
    }
  }

  function ensureClock() {
    if (timer || typeof window === "undefined") return;
    timer = window.setInterval(schedule, 90);
  }

  function unlock(): Promise<boolean> {
    if (disposed || muted || hidden) return Promise.resolve(false);
    if (unlocked && ctx?.state === "running") return Promise.resolve(true);
    const AudioContextClass =
      typeof globalThis.AudioContext !== "undefined"
        ? globalThis.AudioContext
        : (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return Promise.resolve(false);
    if (ctx && ctx.state !== "running") {
      try {
        void ctx.close();
      } catch {
        /* already closed */
      }
      ctx = null;
      master = null;
      unlocked = false;
      pending = null;
      stopDrones();
      noiseGain = null;
    }
    try {
      if (!ctx || ctx.state === "closed") {
        ctx = new AudioContextClass();
        master = ctx.createGain();
        master.gain.value = 0.0001;
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 2400;
        master.connect(filter);
        filter.connect(ctx.destination);
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.07;
        lfoGain = ctx.createGain();
        lfoGain.gain.value = reduced ? 0 : 0.02;
        lfo.connect(lfoGain);
        lfo.start();
        drones = [];
        noiseGain = null;
        nextAt = 0;
        masterLevel = -1;
      }
    } catch {
      return Promise.resolve(false);
    }
    const active = ctx;
    let resume: Promise<void>;
    try {
      resume = active.state === "running" ? Promise.resolve() : active.resume();
    } catch {
      return Promise.resolve(false);
    }
    const attempt = resume
      .then(() => {
        if (disposed || muted || hidden || ctx !== active || active.state !== "running") return false;
        unlocked = true;
        ensureDrones();
        ensureNoise();
        applyNoise();
        applyMaster();
        ensureClock();
        schedule();
        return true;
      })
      .catch(() => false)
      .finally(() => {
        if (pending === attempt) pending = null;
      });
    pending = attempt;
    return attempt;
  }

  function sync(options: { scene: MusicScene; reduced: boolean; paused: boolean; hidden: boolean }) {
    const sceneChanged = options.scene !== scene;
    scene = options.scene;
    reduced = options.reduced;
    paused = options.paused;
    const hideChanged = options.hidden !== hidden;
    hidden = options.hidden;
    if (lfoGain && ctx) lfoGain.gain.setTargetAtTime(reduced ? 0 : 0.02, ctx.currentTime, 0.2);
    if (!ctx) return;
    if (sceneChanged) {
      stepIndex = 0;
      ensureDrones();
      applyNoise();
    }
    applyMaster();
    if (hidden && ctx.state === "running") void ctx.suspend();
    if (!hidden && !muted && unlocked && ctx.state === "suspended") {
      void ctx.resume().then(() => {
        if (!disposed) schedule();
      });
    } else if (hideChanged && !hidden) {
      schedule();
    }
  }

  function jump() {
    if (!ctx || !master || !unlocked || muted || hidden || ctx.state !== "running") return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(196, now);
    osc.frequency.exponentialRampToValueAtTime(784, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.28, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  function setMuted(next: boolean) {
    muted = next;
    if (!ctx) return;
    applyMaster();
    if (!next && ctx.state === "suspended") void unlock();
  }

  function dispose() {
    disposed = true;
    unlocked = false;
    if (timer) window.clearInterval(timer);
    timer = 0;
    stopDrones();
    try {
      noiseGain?.disconnect();
    } catch {
      /* already detached */
    }
    const previous = ctx;
    ctx = null;
    master = null;
    noiseGain = null;
    if (previous) {
      try {
        void previous.close();
      } catch {
        /* ignore */
      }
    }
  }

  return { unlock, sync, jump, setMuted, dispose };
}
