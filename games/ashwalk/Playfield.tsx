import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { ChanceGameDefinition, GameClient, GameSnapshot } from "@rarefriends/friendsdk/game";
import { RF } from "@rarefriends/friendsdk/game";
import { createFriendReader, type GenerationSprites } from "@rarefriends/friendsdk/sprites";
import { createFriendSoundKit, type FriendSoundKit } from "@rarefriends/friendsdk/sounds";
import type { PeerInfo } from "@/lib/multiplayer";
import { LEVELS, fogReleased, fogUnlocked, getLevel, previousFog } from "./challenges";
import { windAccel, chapterAt } from "./level";
import { Online, type NetApi } from "./online";
import type { Ghost } from "./net";
import { comboSet, createSim, step, type Actions, type Sim } from "./sim";
import { burst, frameCamera, renderFrame, viewSize } from "./draw";
import { createAshMusic, type AshMusic, type MusicScene } from "./music";
import {
  buyCloth,
  equipCloth,
  formatRareCoins,
  hasWhole,
  outfitList,
  readLedger,
  spendWhole,
  spendable,
  unlockAllFogs,
  type Ledger,
} from "./wardrobe";
import "./ashwalk.css";

type Phase = "title" | "levels" | "lobby" | "play" | "pause" | "rite" | "clear" | "clothes";
type Holds = { left: boolean; right: boolean; jump: boolean; down: boolean; use: boolean };
type Session = { code: string; host: boolean };

const LAMP_PRICE = 5;
const LIGHT_PRICE = 1;
const LIGHT_SECONDS = 10;
const STAKE = 5;
const UNLOCK_COST = 20;
const LIVES = 3;
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function dimBoard(id: string) {
  return id === "shore" || id === "roof" || id === "choir";
}

function makeCode() {
  let code = "";
  for (let i = 0; i < 4; i++) code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]!;
  return code;
}

function prettyCode(code: string) {
  return code.toUpperCase().split("").join(" ");
}

export function Playfield({
  friendId,
  client,
  paused,
  picker,
  identity = "Preview artwork",
  account = null,
  rareBalance = null,
  onWardrobe,
}: {
  friendId: bigint;
  client: GameClient;
  paused: boolean;
  picker?: ReactNode;
  identity?: string;
  account?: string | null;
  rareBalance?: bigint | null;
  onWardrobe?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Sim>(createSim());
  const keysRef = useRef(new Set<string>());
  const ignoreKeysRef = useRef(new Set<string>());
  const holdsRef = useRef<Holds>({ left: false, right: false, jump: false, down: false, use: false });
  const edgeRef = useRef({ jump: false, interact: false });
  const phaseRef = useRef<Phase>("title");
  const pausedRef = useRef(paused);
  const reducedRef = useRef(false);
  const spritesRef = useRef<GenerationSprites | null>(null);
  const soundRef = useRef<FriendSoundKit | null>(null);
  const musicRef = useRef<AshMusic | null>(null);
  const friendRef = useRef(friendId);
  const promptRef = useRef<HTMLParagraphElement>(null);
  const ghostsRef = useRef(new Map<string, Ghost>());
  const apiRef = useRef<NetApi | null>(null);
  const clothRef = useRef<string | null>(null);
  const allOpenRef = useRef(false);
  const accountRef = useRef(account);
  const rareRef = useRef(rareBalance);
  const hostIdRef = useRef("");
  const pickRef = useRef("shore");
  const startRef = useRef<(id: string) => void>(() => {});
  const [phase, setPhase] = useState<Phase>("title");
  const [family, setFamily] = useState("");
  const [spriteError, setSpriteError] = useState("");
  const [chapter, setChapter] = useState("The shore");
  const [kicker, setKicker] = useState("Something hung in the fog.");
  const [muted, setMuted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const motionTouchedRef = useRef(false);
  const [snap, setSnap] = useState<GameSnapshot | null>(null);
  const [rite, setRite] = useState("");
  const [riteError, setRiteError] = useState("");
  const [busy, setBusy] = useState(false);
  const [runLabel, setRunLabel] = useState("0:00");
  const [session, setSession] = useState<Session | null>(null);
  const [pickId, setPickId] = useState("shore");
  const [codeInput, setCodeInput] = useState("");
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [joined, setJoined] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const [company, setCompany] = useState(0);
  const companyRef = useRef(0);
  const windRef = useRef("");
  const purseRef = useRef(0);
  const [purse, setPurse] = useState(0);
  const livesRef = useRef(LIVES);
  const [lives, setLives] = useState(LIVES);
  const [stakeMsg, setStakeMsg] = useState("");
  const clearedRef = useRef(new Set<string>());
  const [cleared, setCleared] = useState<string[]>([]);
  const [ledger, setLedger] = useState<Ledger>({ spent: 0n, allFogs: true, owned: [], equipped: null });
  const markClearRef = useRef<(id: string) => void>(() => {});
  const shoreGlowRef = useRef(0);
  const huntZoomRef = useRef(0);
  const lampOnRef = useRef(false);
  const lampActionRef = useRef<() => void>(() => {});
  const buyingLamp = useRef(false);
  const touchUnbind = useRef<(() => void) | null>(null);
  const bindTouch = useRef((node: HTMLDivElement | null) => {
    touchUnbind.current?.();
    touchUnbind.current = null;
    if (!node) return;
    const stop = (event: Event) => {
      event.preventDefault();
    };
    node.addEventListener("touchstart", stop, { passive: false });
    node.addEventListener("touchmove", stop, { passive: false });
    node.addEventListener("contextmenu", stop);
    node.addEventListener("gesturestart", stop);
    touchUnbind.current = () => {
      node.removeEventListener("touchstart", stop);
      node.removeEventListener("touchmove", stop);
      node.removeEventListener("contextmenu", stop);
      node.removeEventListener("gesturestart", stop);
    };
  }).current;
  const [lampOwned, setLampOwned] = useState(false);
  const [lampOn, setLampOn] = useState(false);
  const [shopError, setShopError] = useState("");

  pausedRef.current = paused;
  reducedRef.current = reduced;
  friendRef.current = friendId;
  pickRef.current = pickId;

  function go(next: Phase) {
    phaseRef.current = next;
    setPhase(next);
  }

  function clearRun() {
    purseRef.current = 0;
    setPurse(0);
  }

  accountRef.current = account;
  rareRef.current = rareBalance;
  clothRef.current = ledger.equipped;
  allOpenRef.current = true;

  function fogOpen(id: string) {
    if (!fogReleased(id)) return false;
    return allOpenRef.current || fogUnlocked(id, clearedRef.current);
  }

  function refreshLedger(nextAccount = accountRef.current) {
    const next = readLedger(nextAccount);
    next.allFogs = true;
    setLedger(next);
    allOpenRef.current = true;
    clothRef.current = next.equipped;
  }

  function buyOutfit(id: string) {
    const who = accountRef.current ?? "guest";
    const balance = rareRef.current ?? 0n;
    if (!buyCloth(who, balance, id)) {
      setStakeMsg("The cape wants 10 Rare coins.");
      return;
    }
    setStakeMsg("");
    refreshLedger(who);
    onWardrobe?.();
  }

  function wearOutfit(id: string | null) {
    const who = accountRef.current ?? "guest";
    equipCloth(who, id);
    refreshLedger(who);
    onWardrobe?.();
  }

  function buyEveryFog() {
    if (allOpenRef.current) return;
    const who = accountRef.current;
    const balance = rareRef.current;
    if (!who || balance == null) {
      setStakeMsg("Connect a wallet. Every fog costs 20 Rare coins.");
      return;
    }
    if (!unlockAllFogs(who, balance)) {
      setStakeMsg("You need 20 Rare coins.");
      return;
    }
    setStakeMsg("");
    refreshLedger(who);
    onWardrobe?.();
  }

  markClearRef.current = (id: string) => {
    if (clearedRef.current.has(id)) return;
    const next = new Set(clearedRef.current);
    next.add(id);
    clearedRef.current = next;
    const list = [...next];
    setCleared(list);
    try {
      localStorage.setItem("ashwalk.cleared", JSON.stringify(list));
    } catch {
      /* private mode */
    }
  };

  function startLevel(id: string) {
    if (!fogReleased(id)) {
      setStakeMsg("The moon opens October 1. Coming soon.");
      return;
    }
    if (!fogOpen(id)) {
      const prev = previousFog(id);
      setStakeMsg(prev ? `Beat ${getLevel(prev).title} before this fog.` : "That fog is still shut.");
      return;
    }
    const fee = allOpenRef.current || id === "shore" ? 0 : STAKE;
    if (fee > 0) {
      const who = accountRef.current;
      const balance = rareRef.current;
      if (!who || balance == null) {
        setStakeMsg("Connect a wallet. A walk costs 5 Rare coins.");
        return;
      }
      if (!spendWhole(who, balance, fee)) {
        setStakeMsg("You need 5 Rare coins to start.");
        return;
      }
      refreshLedger(who);
      onWardrobe?.();
    }
    livesRef.current = LIVES;
    setLives(LIVES);
    purseRef.current = STAKE;
    setPurse(STAKE);
    setStakeMsg("");
    setShopError("");
    const level = getLevel(id);
    const sim = createSim(level);
    sim.linked = (apiRef.current?.peerCount() ?? 0) > 0;
    simRef.current = sim;
    setPickId(id);
    pickRef.current = id;
    shoreGlowRef.current = 0;
    setRunLabel("0:00");
    setChapter(level.chapters[0]?.title ?? level.title);
    setKicker(level.chapters[0]?.kicker ?? level.kicker);
    windRef.current = "";
    ignoreKeysRef.current = new Set(keysRef.current);
    holdsRef.current = { left: false, right: false, jump: false, down: false, use: false };
    go("play");
  }
  startRef.current = startLevel;

  useEffect(() => {
    setClientReady(true);
    try {
      const raw = localStorage.getItem("ashwalk.cleared");
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      const list = Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
      clearedRef.current = new Set(list);
      setCleared(list);
    } catch {
      /* private mode */
    }
    refreshLedger(account);
  }, [account]);

  useEffect(() => {
    const kit = createFriendSoundKit({ muted: false });
    const music = createAshMusic();
    soundRef.current = kit;
    musicRef.current = music;
    kit.setMuted(false);
    music.setMuted(false);
    const startAudio = () => {
      void kit.unlock();
      void music.unlock();
    };
    const onGesture = () => startAudio();
    window.addEventListener("pointerdown", onGesture, true);
    window.addEventListener("touchstart", onGesture, { capture: true, passive: true });
    window.addEventListener("keydown", onGesture, true);
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      if (!motionTouchedRef.current) {
        reducedRef.current = preference.matches;
        setReduced(preference.matches);
      }
    };
    apply();
    preference.addEventListener("change", apply);
    return () => {
      window.removeEventListener("pointerdown", onGesture, true);
      window.removeEventListener("touchstart", onGesture, { capture: true });
      window.removeEventListener("keydown", onGesture, true);
      kit.dispose();
      music.dispose();
      soundRef.current = null;
      musicRef.current = null;
      preference.removeEventListener("change", apply);
    };
  }, []);

  useEffect(() => {
    let cancel = false;
    setSpriteError("");
    setFamily("");
    spritesRef.current = null;
    const reader = createFriendReader();
    void reader
      .read(friendId)
      .then((sprites) => {
        if (cancel) return;
        spritesRef.current = sprites;
        setFamily(sprites.familyName);
      })
      .catch((cause: unknown) => {
        if (cancel) return;
        setSpriteError(cause instanceof Error ? cause.message : "Could not read that Friend.");
      });
    return () => {
      cancel = true;
    };
  }, [friendId]);

  useEffect(() => {
    let cancel = false;
    lampOnRef.current = false;
    setLampOwned(false);
    setLampOn(false);
    setShopError("");
    void client.read().then((value) => {
      if (!cancel) setSnap(value);
    });
    return () => {
      cancel = true;
    };
  }, [client]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let last = performance.now();
    let acc = 0;
    let frame = 0;
    let lastSent = 0;
    const shake = { v: 0 };
    const chapterId = { current: "" };

    const sample = () => {
      const keys = keysRef.current;
      const holds = holdsRef.current;
      const live = (code: string) => keys.has(code) && !ignoreKeysRef.current.has(code);
      const left = live("ArrowLeft") || live("KeyA") || holds.left;
      const right = live("ArrowRight") || live("KeyD") || holds.right;
      const jumpHeld = live("Space") || live("ArrowUp") || live("KeyW") || holds.jump;
      const down = live("ArrowDown") || live("KeyS") || holds.down;
      const interact = live("KeyE") || live("Enter") || holds.use;
      return { left, right, jumpHeld, down, interact };
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const sim = simRef.current;
      const phaseNow = phaseRef.current;
      const playing = phaseNow === "play" && !pausedRef.current && document.visibilityState !== "hidden";
      sim.linked = (apiRef.current?.peerCount() ?? 0) > 0;
      sim.remotes = [...ghostsRef.current.values()].map((ghost) => ({
        x: ghost.tx,
        y: ghost.ty,
        dead: ghost.dead > 0,
      }));
      let mothId: string | null = null;
      let beaconId: string | null = null;
      let pulled = false;
      if (!playing) {
        sim.t += dt;
      } else {
        acc += dt;
        const held = sample();
        let jumpPressed = held.jumpHeld && !edgeRef.current.jump;
        let interactPressed = held.interact && !edgeRef.current.interact;
        edgeRef.current = { jump: held.jumpHeld, interact: held.interact };
        let guard = 0;
        while (acc >= 1 / 60 && guard++ < 5) {
          acc -= 1 / 60;
          const actions: Actions = {
            left: held.left,
            right: held.right,
            jumpHeld: held.jumpHeld,
            jumpPressed,
            down: held.down,
            interactPressed,
          };
          jumpPressed = false;
          interactPressed = false;
          const events = step(sim, actions, 1 / 60, reducedRef.current);
          if (events.mothId) mothId = events.mothId;
          if (events.beacon) beaconId = events.beacon;
          if (events.pull) pulled = true;
          const sound = soundRef.current;
          if (events.jump) sound?.play("action-start");
          if (events.land && sim.run > 0.35) {
            sound?.play("impact");
            burst(sim.x, sim.y + 36, 5);
          }
          if (events.moth) {
            sound?.play("reward");
            burst(sim.x + 7, sim.y, 10);
            const next = purseRef.current + 1;
            purseRef.current = next;
            setPurse(next);
          }
          if (events.beacon) {
            sound?.play("action-ready");
            burst(sim.x + 7, sim.y, 8);
          }
          if (events.rope) sound?.play("action-ready");
          if (events.died) {
            sound?.play("anticipation");
            shake.v = 12;
            burst(sim.x + 7, sim.y + 10, 14);
            const before = purseRef.current;
            const halved = Math.floor(before / 2);
            const burned = before - halved;
            purseRef.current = halved;
            setPurse(halved);
            const left = Math.max(0, livesRef.current - 1);
            livesRef.current = left;
            setLives(left);
            const burnNote =
              burned > 0 ? `Burned ${burned} coin${burned === 1 ? "" : "s"}.` : "No coins left to burn.";
            if (left <= 0) {
              clearRun();
              setStakeMsg(`Three lives are gone. ${burnNote} The shore is free. Every fog after it costs 5 Rare coins.`);
              go("title");
            } else {
              setShopError(`${left} ${left === 1 ? "life" : "lives"} left. ${burnNote}`);
            }
          }
          if (events.shrine) go("rite");
          if (events.lamp) {
            if (purseRef.current < LIGHT_PRICE) {
              setShopError("A lantern wants 1 coin.");
            } else {
              const next = purseRef.current - LIGHT_PRICE;
              purseRef.current = next;
              setPurse(next);
              shoreGlowRef.current = LIGHT_SECONDS;
              setShopError("");
              sound?.play("purchase");
            }
          }
          if (playing && dimBoard(sim.level.id) && shoreGlowRef.current > 0) {
            shoreGlowRef.current = Math.max(0, shoreGlowRef.current - 1 / 60);
          }
          if (events.goal) {
            markClearRef.current(sim.level.id);
            sound?.play("reward");
            setRunLabel(formatTime(sim.run));
            go("clear");
          }
        }
        if (acc > 0.2) acc = 0;
      }

      const api = apiRef.current;
      if (api && (phaseNow === "play" || phaseNow === "pause")) {
        if (mothId) api.send({ k: "moth", id: mothId });
        if (beaconId) api.send({ k: "beacon", id: beaconId });
        if (pulled) api.send({ k: "pull" });
        if (now - lastSent >= 50) {
          lastSent = now;
          const q = (n: number) => Math.round(n * 10) / 10;
          api.broadcast({
            k: "p",
            x: q(sim.x),
            y: q(sim.y),
            f: sim.facing,
            w: sim.walking ? 1 : 0,
            a: q(sim.anim),
            d: q(sim.dead),
            n: sim.won ? 1 : 0,
            r: q(sim.rope),
            c: Object.entries(sim.crumbles)
              .filter(([, crumb]) => crumb.timer > 0 || crumb.fall > 0 || crumb.gone)
              .map(([id, crumb]) => [id, q(crumb.fall), crumb.gone ? 1 : 0]),
            m: [...sim.moths],
            b: [...sim.beacons],
          });
        }
      }

      for (const ghost of ghostsRef.current.values()) {
        const blend = Math.min(1, dt * 14);
        ghost.x += (ghost.tx - ghost.x) * blend;
        ghost.y += (ghost.ty - ghost.y) * blend;
      }

      const nextChapter = chapterAt(sim.level, sim.x + 7);
      let nextKicker = nextChapter.kicker;
      if (sim.level.beacons.length > 0) {
        nextKicker = `${sim.beacons.size} of ${sim.level.beacons.length} bells`;
      } else if (sim.level.wind?.mode === "tide" && phaseNow === "play") {
        const accel = windAccel(sim.level.wind, sim.x + 7, Date.now() / 1000);
        nextKicker =
          accel > 120
            ? "The wind is behind a rightward jump."
            : accel < -120
              ? "The wind is behind a leftward jump."
              : "The wind is turning.";
      }
      const inDrain = sim.level.id === "roof" && sim.y > 860;
      if (inDrain) {
        if (chapterId.current !== "drain") {
          chapterId.current = "drain";
          setChapter("The drain");
        }
        nextKicker = "Larger rats in the dark. Climb out.";
      } else if (sim.level.id === "roof" && sim.crack > 0 && sim.crack < 1) {
        nextKicker = "The last roof is cracking.";
      }
      if (sim.level.stalker && sim.wake > 0 && !sim.caged) {
        nextKicker = sim.wake < 1 ? "The ground is opening." : "It is out. Lead it to the cage.";
      } else if (sim.caged) {
        nextKicker = "The cage holds. The door is ahead.";
      }
      if (nextChapter.id !== chapterId.current && !inDrain) {
        chapterId.current = nextChapter.id;
        setChapter(nextChapter.title);
      }
      if (nextKicker !== windRef.current) {
        windRef.current = nextKicker;
        setKicker(nextKicker);
      }
      if (phaseNow === "clear") {
        const left = [...ghostsRef.current.values()].filter((ghost) => !ghost.won).length;
        if (left !== companyRef.current) {
          companyRef.current = left;
          setCompany(left);
        }
      }

      const prompt = promptFor(sim, phaseRef.current);
      const shown =
        prompt ||
        (shoreGlowRef.current > 0 && dimBoard(sim.level.id) && phaseNow === "play"
          ? `Light ${Math.ceil(shoreGlowRef.current)}s`
          : "");
      const node = promptRef.current;
      if (node && node.textContent !== shown) {
        node.textContent = shown;
        node.hidden = shown.length === 0;
      }

      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      const sized = viewSize(cssW, cssH);
      const caught = Boolean(sim.level.stalker && sim.caged && sim.cage >= 1);
      if (sim.level.stalker && sim.wake > 0 && !caught) huntZoomRef.current = 1;
      else huntZoomRef.current = Math.max(0, huntZoomRef.current - dt * 0.35);
      const zoom = 1 + 0.75 * huntZoomRef.current;
      const follow = phaseNow === "play" || phaseNow === "pause" || phaseNow === "rite" || phaseNow === "clear";
      const camera = frameCamera(
        sim,
        sized.viewW * zoom,
        sized.viewH * zoom,
        follow,
        reducedRef.current,
        huntZoomRef.current,
      );
      if (shake.v > 0.2 && !reducedRef.current) {
        camera.x += (Math.random() - 0.5) * shake.v;
        camera.y += (Math.random() - 0.5) * shake.v;
        shake.v *= 0.86;
      }
      const ghosts = follow ? [...ghostsRef.current.values()] : [];
      musicRef.current?.sync({
        scene: musicScene(phaseNow, sim),
        reduced: reducedRef.current,
        paused: phaseNow === "pause" || pausedRef.current,
        hidden: document.visibilityState === "hidden",
      });
      renderFrame(
        ctx,
        cssW,
        cssH,
        sim,
        spritesRef.current,
        camera,
        reducedRef.current,
        dt,
        phaseNow === "title",
        ghosts,
        lampOnRef.current && phaseNow !== "title" && phaseNow !== "levels" && phaseNow !== "lobby",
        dimBoard(sim.level.id) &&
          phaseNow !== "title" &&
          phaseNow !== "levels" &&
          phaseNow !== "lobby" &&
          shoreGlowRef.current <= 0
          ? 0.86
          : 0,
        clothRef.current,
      );
    };
    frame = requestAnimationFrame(tick);

    const probe = {
      getX: () => simRef.current.x,
      getY: () => simRef.current.y,
      getPhase: () => phaseRef.current,
      setKeys: (codes: string[]) => {
        keysRef.current = new Set(codes);
      },
    };
    window.__controlsTest = probe;

    return () => {
      cancelAnimationFrame(frame);
      if (window.__controlsTest === probe) delete window.__controlsTest;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const gameKeys = new Set([
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Space",
        "KeyA",
        "KeyD",
        "KeyW",
        "KeyS",
        "KeyE",
        "Enter",
        "KeyF",
      ]);
      if (gameKeys.has(event.code) || event.code === "Escape") event.preventDefault();
      if (event.code === "KeyF") {
        if (event.type === "keydown" && !event.repeat) lampActionRef.current();
        return;
      }
      if (event.code === "Escape") {
        const current = phaseRef.current;
        if (current === "play") go("pause");
        else if (current === "pause" || current === "rite") go("play");
        else if (current === "levels" || current === "clothes") go("title");
        else if (current === "lobby" && !session) go("title");
        return;
      }
      if (event.repeat) return;
      if (event.type === "keydown") {
        if (!ignoreKeysRef.current.has(event.code)) keysRef.current.add(event.code);
      } else {
        keysRef.current.delete(event.code);
        ignoreKeysRef.current.delete(event.code);
      }
    };
    const clear = () => {
      keysRef.current.clear();
      ignoreKeysRef.current.clear();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", clear);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", clear);
    };
  }, [session]);

  function armAudio() {
    soundRef.current?.setMuted(muted);
    musicRef.current?.setMuted(muted);
    if (!muted) {
      void soundRef.current?.unlock();
      void musicRef.current?.unlock();
    }
  }

  function beginShore() {
    armAudio();
    startLevel("shore");
  }

  function restart() {
    const id = simRef.current.level.id;
    if (session?.host) apiRef.current?.send({ k: "begin", level: id });
    startLevel(id);
  }

  function chooseLevel(id: string) {
    setPickId(id);
    pickRef.current = id;
    if (session?.host) apiRef.current?.send({ k: "pick", level: id });
  }

  function openFog() {
    armAudio();
    apiRef.current?.send({ k: "begin", level: pickId });
    startLevel(pickId);
  }

  function returnToLobby() {
    if (session?.host) apiRef.current?.send({ k: "lobby" });
    go("lobby");
  }

  function leaveRoom() {
    clearRun();
    ghostsRef.current.clear();
    setPeers([]);
    setJoined(false);
    setSession(null);
    hostIdRef.current = "";
    simRef.current = createSim();
    go("title");
  }

  async function lightLantern() {
    if (busy) return;
    setBusy(true);
    setRiteError("");
    setRite("");
    armAudio();
    try {
      let value = await client.read();
      if (value.consumables < 1n) {
        if (value.rfBalance < RF) throw new Error("Not enough simulated RF.");
        await client.buy(1n);
      }
      const [play] = await client.play(1n);
      if (!play) throw new Error("The lantern did not open.");
      const settled = await client.settle(play.id);
      if (!settled.outcomeId) throw new Error("The lantern stayed dark.");
      const outcome = client.definition.outcomes[settled.outcomeId - 1];
      if (!outcome) throw new Error("Unknown lantern outcome.");
      await client.redeem(settled.outcomeId, 1n);
      value = await client.read();
      setSnap(value);
      setRite(`${outcome.name} · ${formatRf(outcome.reward)} RF returned to the simulated balance.`);
      soundRef.current?.play(settled.outcomeId === 3 ? "reveal-legendary" : "reveal-common");
    } catch (cause) {
      setRiteError(cause instanceof Error ? cause.message : "The rite failed.");
    } finally {
      setBusy(false);
    }
  }

  async function buyFlashlight() {
    if (lampOwned || buyingLamp.current) return;
    buyingLamp.current = true;
    setShopError("");
    try {
      const have = purseRef.current;
      if (have < LAMP_PRICE) {
        setShopError(`The flashlight wants ${LAMP_PRICE} coins.`);
        return;
      }
      const next = have - LAMP_PRICE;
      purseRef.current = next;
      setPurse(next);
      lampOnRef.current = true;
      setLampOwned(true);
      setLampOn(true);
      void soundRef.current?.unlock();
      soundRef.current?.play("purchase");
    } finally {
      buyingLamp.current = false;
    }
  }

  function toggleLamp() {
    if (!lampOwned) {
      void buyFlashlight();
      return;
    }
    setShopError("");
    setLampOn((value) => {
      lampOnRef.current = !value;
      return !value;
    });
  }
  lampActionRef.current = toggleLamp;

  const hold = (key: keyof Holds) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      holdsRef.current[key] = true;
    },
    onContextMenu: (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
    },
    onPointerUp: () => {
      holdsRef.current[key] = false;
    },
    onPointerCancel: () => {
      holdsRef.current[key] = false;
    },
  });

  const picked = getLevel(pickId);
  const clearLevel = phase === "clear" ? simRef.current.level : picked;
  const linked = peers.filter((peer) => peer.connectionState === "connected").length;

  return (
    <div
      className="ash-root"
      onPointerDown={() => {
        if (muted) return;
        void soundRef.current?.unlock();
        void musicRef.current?.unlock();
      }}
    >
      <canvas ref={canvasRef} aria-label="Ashwalk, a fog platformer" />
      {session && clientReady && (
        <Online
          key={`${session.code}:${session.host ? "host" : "guest"}`}
          code={session.code}
          name={identity.replace(/^Preview artwork · /, "").slice(0, 64) || "Friend"}
          host={session.host}
          friendId={friendId.toString()}
          phaseRef={phaseRef}
          simRef={simRef}
          pickRef={pickRef}
          ghostsRef={ghostsRef}
          apiRef={apiRef}
          hostIdRef={hostIdRef}
          onPeers={setPeers}
          onJoined={setJoined}
          onPick={(id) => {
            setPickId(id);
            pickRef.current = id;
          }}
          onBegin={(id) => startRef.current(id)}
          onLobby={() => go("lobby")}
        />
      )}
      {phase !== "title" && phase !== "levels" && phase !== "lobby" && (
        <div className="ash-hud">
          <div>
            <p className="ash-kicker">{identity}</p>
            <p className="ash-chapter">{chapter}</p>
            <p className="ash-sub">{kicker}</p>
            {shopError && <p className="ash-sub">{shopError}</p>}
          </div>
          <div className="ash-hud-actions">
            {session && (
              <span className="ash-count">
                {linked + 1} in the fog
                <span className="sr-only"> including you</span>
              </span>
            )}
            <span className="ash-count">{purse} coins</span>
            <span className="ash-count">
              {lives} {lives === 1 ? "life" : "lives"}
            </span>
            <button
              type="button"
              className="ash-icon"
              aria-pressed={lampOwned ? lampOn : undefined}
              onClick={() => toggleLamp()}
            >
              {lampOwned ? (lampOn ? "Light on" : "Light off") : `Buy light · ${LAMP_PRICE}`}
            </button>
            <button
              type="button"
              className="ash-icon"
              aria-pressed={!muted}
              onClick={() => {
                const next = !muted;
                setMuted(next);
                soundRef.current?.setMuted(next);
                musicRef.current?.setMuted(next);
                if (!next) {
                  void soundRef.current?.unlock();
                  void musicRef.current?.unlock();
                }
              }}
            >
              {muted ? "Sound off" : "Sound on"}
            </button>
            <button
              type="button"
              className="ash-icon"
              aria-pressed={reduced}
              onClick={() => {
                motionTouchedRef.current = true;
                setReduced((value) => {
                  reducedRef.current = !value;
                  return !value;
                });
              }}
            >
              {reduced ? "Motion off" : "Motion on"}
            </button>
            {phase === "play" && (
              <button type="button" className="ash-icon" onClick={() => go("pause")}>
                Pause
              </button>
            )}
          </div>
        </div>
      )}
      <p className="ash-prompt" ref={promptRef} hidden />
      {phase === "title" && (
        <section className="ash-card" aria-label="Begin Ashwalk">
          <p className="ash-kicker">Rare Friends · the hanging wood</p>
          <h1>Ashwalk</h1>
          <p>Your Friend is the small one. The fog is everything else.</p>
          <p>
            {!account
              ? "Connect a wallet. The coins you spend are the Rare coins in that wallet."
              : rareBalance == null
                ? "Reading Rare coins…"
                : `You have ${formatRareCoins(spendable(rareBalance, account) ?? 0n)} Rare coins.`}
          </p>
          <p>The shore is free. You start that walk with 5 coins. Every fog after it costs 5 Rare coins. 20 Rare coins opens every fog.</p>
          <p>Every month a new map opens, and a new cape is there to own. The moon opens October 1. Coming soon.</p>
          {stakeMsg && (
            <p className="ash-error" role="alert">
              {stakeMsg}
            </p>
          )}
          <p>
            Friend #{friendId.toString()}
            {family ? ` · ${family}` : spriteError ? "" : " · reading the chain"}
          </p>
          {spriteError && (
            <p className="ash-error" role="alert">
              {spriteError} Try another Friend number.
            </p>
          )}
          {picker}
          <div className="ash-actions">
            <button type="button" className="ash-btn" onClick={beginShore}>
              Walk into the fog
            </button>
            <button type="button" className="ash-btn-ghost" onClick={() => go("levels")}>
              Other fogs
            </button>
            <button type="button" className="ash-btn-ghost" onClick={() => go("clothes")}>
              Clothes
            </button>
            <button
              type="button"
              className="ash-btn-ghost"
              onClick={() => {
                setCodeInput("");
                go("lobby");
              }}
            >
              With friends
            </button>
          </div>
          <p className="ash-note">
            A and D, or the left and right arrow keys, move. W, up, or space jumps. S drops through a cage.
            E pulls, lights a bell, or buys a lantern. A lantern lasts 10 seconds. Stand on a plank too long and it falls.
            It comes back after 4 seconds. Three lives to a board. A death burns half the coins you are carrying.
            The shore is free. Every fog after it costs 5 Rare coins.
          </p>
        </section>
      )}
      {phase === "clothes" && (
        <section className="ash-panel" aria-label="Clothes">
          <p className="ash-kicker">Wardrobe</p>
          <h2>Clothes</h2>
          {stakeMsg && (
            <p className="ash-error" role="alert">
              {stakeMsg}
            </p>
          )}
          <p className="ash-note">
            {!account
              ? "The cape is free to try."
              : rareBalance == null
                ? "Reading Rare coins…"
                : `You have ${formatRareCoins(spendable(rareBalance, account) ?? 0n)} Rare coins.`}
          </p>
          <p className="ash-note">The red cape is free to try. Press it to wear it.</p>
          <div className="ash-levels">
            {outfitList().map((cloth) => {
              const owned = ledger.owned.includes(cloth.id);
              const wearing = ledger.equipped === cloth.id;
              return (
                <button
                  key={cloth.id}
                  type="button"
                  className="ash-level"
                  aria-current={wearing ? "true" : undefined}
                  onClick={() => (owned ? wearOutfit(wearing ? null : cloth.id) : buyOutfit(cloth.id))}
                >
                  <span>{cloth.name}</span>
                  <small>
                    {owned
                      ? wearing
                        ? "Wearing. Press to take it off."
                        : `${cloth.note} Press to wear.`
                      : `${cloth.note} Free to try.`}
                  </small>
                </button>
              );
            })}
          </div>
          <div className="ash-actions">
            <button type="button" className="ash-btn-ghost" onClick={() => go("title")}>
              Back
            </button>
          </div>
        </section>
      )}
      {phase === "levels" && (
        <section className="ash-panel" aria-label="Choose a fog">
          <p className="ash-kicker">Four woods</p>
          <h2>Choose a fog</h2>
          {stakeMsg && (
            <p className="ash-error" role="alert">
              {stakeMsg}
            </p>
          )}
          <p className="ash-note">
            {!account
              ? "Connect a wallet when you are ready to pay. The shore is free. Later fogs cost 5 Rare coins."
              : rareBalance == null
                ? "Reading Rare coins…"
                : `You have ${formatRareCoins(spendable(rareBalance, account) ?? 0n)} Rare coins. The shore is free. Every fog after it costs 5.`}
          </p>
          <p className="ash-note">
            {ledger.allFogs
              ? "Every fog is open."
              : "The shore is free. Each fog after it opens when you beat the one before, and costs 5 Rare coins. Or pay 20 Rare coins for all of them."}
          </p>
          {!ledger.allFogs && (
            <div className="ash-actions">
              <button
                type="button"
                className="ash-btn"
                onClick={buyEveryFog}
                disabled={!hasWhole(rareBalance, account, UNLOCK_COST)}
              >
                Open every fog · {UNLOCK_COST} Rare coins
              </button>
            </div>
          )}
          <LevelList
            current={pickId}
            cleared={cleared}
            allOpen={ledger.allFogs}
            onPick={(id) => {
              armAudio();
              startLevel(id);
            }}
          />
          <div className="ash-actions">
            <button type="button" className="ash-btn-ghost" onClick={() => go("title")}>
              Back
            </button>
          </div>
        </section>
      )}
      {phase === "lobby" && !session && (
        <section className="ash-panel" aria-label="Walk with friends">
          <p className="ash-kicker">A private fog</p>
          <h2>With friends</h2>
          <p>Share a four-letter code. Up to four Friends in one wood. The fog trusts everyone in the room.</p>
          <div className="ash-actions">
            <button
              type="button"
              className="ash-btn"
              onClick={() => {
                setJoined(false);
                setPeers([]);
                setSession({ code: makeCode(), host: true });
              }}
            >
              Host a walk
            </button>
          </div>
          <form
            className="ash-row"
            onSubmit={(event) => {
              event.preventDefault();
              const code = codeInput
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "")
                .slice(0, 4);
              if (code.length < 4) return;
              setJoined(false);
              setPeers([]);
              setSession({ code, host: false });
            }}
          >
            <input
              aria-label="Room code"
              inputMode="text"
              autoCapitalize="none"
              autoCorrect="off"
              maxLength={7}
              placeholder="Code"
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value)}
            />
            <button type="submit" className="ash-btn">
              Join
            </button>
          </form>
          <div className="ash-actions">
            <button type="button" className="ash-btn-ghost" onClick={() => go("title")}>
              Back
            </button>
          </div>
        </section>
      )}
      {phase === "lobby" && session && (
        <section className="ash-panel" aria-label="Fog room">
          <p className="ash-kicker">{session.host ? "You are hosting" : "You joined"}</p>
          <h2 className="ash-code">{prettyCode(session.code)}</h2>
          <p>{joined ? "The line is open." : "Opening a line through the fog…"}</p>
          <PeerList peers={peers} />
          {session.host ? (
            <>
              <p className="ash-note">{picked.together}</p>
              <LevelList current={pickId} cleared={cleared} allOpen={ledger.allFogs} onPick={chooseLevel} />
              <div className="ash-actions">
                <button
                  type="button"
                  className="ash-btn"
                  disabled={!fogReleased(pickId) || (!ledger.allFogs && !fogUnlocked(pickId, new Set(cleared)))}
                  onClick={openFog}
                >
                  Open this fog
                </button>
                <button type="button" className="ash-btn-ghost" onClick={leaveRoom}>
                  Leave
                </button>
              </div>
            </>
          ) : (
            <>
              <p>
                {picked.title}. {picked.rule}
              </p>
              <p className="ash-note">{picked.together}</p>
              <p className="ash-note">Waiting for the host to open the fog.</p>
              <div className="ash-actions">
                <button type="button" className="ash-btn-ghost" onClick={leaveRoom}>
                  Leave
                </button>
              </div>
            </>
          )}
        </section>
      )}
      {phase === "pause" && (
        <section className="ash-panel" aria-label="Paused">
          <p className="ash-kicker">Paused</p>
          <h2>The fog waits</h2>
          {session && <p className="ash-note">{simRef.current.level.together}</p>}
          <p className="ash-note">
            {snap ? `${formatRf(snap.rfBalance)} RF simulated.` : "Balance still loading."} A flashlight costs{" "}
            {LAMP_PRICE} coins you have picked up. It does not enter the lantern rite.
          </p>
          {shopError && (
            <p className="ash-error" role="alert">
              {shopError}
            </p>
          )}
          <div className="ash-actions">
            <button type="button" className="ash-btn" onClick={() => go("play")}>
              Resume
            </button>
            <button type="button" className="ash-btn-ghost" onClick={() => toggleLamp()}>
              {lampOwned ? (lampOn ? "Flashlight on" : "Flashlight off") : `Buy a flashlight · ${LAMP_PRICE} coins`}
            </button>
            <button type="button" className="ash-btn-ghost" onClick={() => go("rite")}>
              Lantern rite
            </button>
            {session?.host && (
              <button type="button" className="ash-btn-ghost" onClick={returnToLobby}>
                Back to the room
              </button>
            )}
            {session && !session.host && (
              <button type="button" className="ash-btn-ghost" onClick={leaveRoom}>
                Leave
              </button>
            )}
            {!session && (
              <button type="button" className="ash-btn-ghost" onClick={() => { clearRun(); go("title"); }}>
                Title
              </button>
            )}
          </div>
        </section>
      )}
      {phase === "rite" && (
        <Rite
          definition={client.definition}
          snap={snap}
          busy={busy}
          result={rite}
          error={riteError}
          onLight={() => void lightLantern()}
          onClose={() => go(simRef.current.won ? "clear" : "play")}
        />
      )}
      {phase === "clear" && (
        <section className="ash-panel" aria-label="Ending">
          <p className="ash-kicker">{clearLevel.clearKicker}</p>
          <h2>{clearLevel.clearTitle}</h2>
          <p>
            {purse} coins · {lives} {lives === 1 ? "life" : "lives"} · {runLabel}.
            {stakeMsg ? ` ${stakeMsg}` : ""}
            {session && company > 0 ? ` ${company} still in the fog.` : ""}
            {session && company === 0 && peers.length > 0 ? " Everyone is through." : ""} The lantern rite is
            simulated. One lantern costs 1 RF and returns less, on average, than it takes.
          </p>
          <div className="ash-actions">
            <button type="button" className="ash-btn" onClick={() => go("rite")}>
              Light a lantern
            </button>
            {(!session || session.host) && (
              <button type="button" className="ash-btn-ghost" onClick={restart}>
                Walk again
              </button>
            )}
            {session?.host && (
              <button type="button" className="ash-btn-ghost" onClick={returnToLobby}>
                Other fogs
              </button>
            )}
            {!session && (() => {
              const next = LEVELS[LEVELS.findIndex((level) => level.id === clearLevel.id) + 1];
              if (!next || !fogReleased(next.id)) {
                return next ? (
                  <button type="button" className="ash-btn" disabled>
                    {next.title} · coming soon
                  </button>
                ) : null;
              }
              return (
                <button type="button" className="ash-btn" onClick={() => startLevel(next.id)}>
                  {ledger.allFogs ? `Continue to ${next.title}` : `Continue · ${STAKE} Rare coins`}
                </button>
              );
            })()}
            {!session && (
              <button type="button" className="ash-btn-ghost" onClick={() => go("levels")}>
                Other fogs
              </button>
            )}
            {session && !session.host && (
              <button type="button" className="ash-btn-ghost" onClick={leaveRoom}>
                Leave
              </button>
            )}
          </div>
        </section>
      )}
      {phase === "play" && (
        <div className="ash-touch" ref={bindTouch}>
          <div>
            <button type="button" aria-label="Move left" draggable={false} {...hold("left")}>
              Left
            </button>
            <button type="button" aria-label="Move right" draggable={false} {...hold("right")}>
              Right
            </button>
          </div>
          <div>
            <button type="button" aria-label="Use" draggable={false} {...hold("use")}>
              Use
            </button>
            <button type="button" aria-label="Jump" draggable={false} {...hold("jump")}>
              Jump
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LevelList({
  current,
  cleared,
  allOpen,
  onPick,
}: {
  current: string;
  cleared: readonly string[];
  allOpen: boolean;
  onPick: (id: string) => void;
}) {
  const done = new Set(cleared);
  return (
    <div className="ash-levels">
      {LEVELS.map((level) => {
        const soon = !fogReleased(level.id);
        const open = !soon && (allOpen || fogUnlocked(level.id, done));
        const prev = previousFog(level.id);
        return (
          <button
            key={level.id}
            type="button"
            className="ash-level"
            aria-current={level.id === current ? "true" : undefined}
            disabled={!open}
            onClick={() => onPick(level.id)}
          >
            <span>{soon ? `${level.title} · coming soon` : level.title}</span>
            <small>{soon ? "Coming soon. Opens October 1." : open ? level.rule : `Beat ${prev ? getLevel(prev).title : "the fog before"} first.`}</small>
          </button>
        );
      })}
    </div>
  );
}

function PeerList({ peers }: { peers: PeerInfo[] }) {
  if (peers.length === 0) return <p className="ash-note">No one else yet. Share the code.</p>;
  return (
    <ul className="ash-peers">
      {peers.map((peer) => (
        <li key={peer.id} className="ash-peer" data-state={peer.connectionState}>
          <span>{peer.name || "Friend"}</span>
          <span>{linkLabel(peer.connectionState)}</span>
        </li>
      ))}
    </ul>
  );
}

function linkLabel(state: RTCPeerConnectionState) {
  if (state === "connected") return "in the fog";
  if (state === "failed") return "blocked";
  if (state === "disconnected") return "fading";
  return "reaching";
}

function Rite({
  definition,
  snap,
  busy,
  result,
  error,
  onLight,
  onClose,
}: {
  definition: ChanceGameDefinition;
  snap: GameSnapshot | null;
  busy: boolean;
  result: string;
  error: string;
  onLight: () => void;
  onClose: () => void;
}) {
  return (
    <section className="ash-panel" role="dialog" aria-label="Lantern rite">
      <p className="ash-kicker">Simulated · {snap?.mode === "preview" ? "preview ledger" : "session"}</p>
      <h2>Light a lantern</h2>
      <p>
        Balance {snap ? formatRf(snap.rfBalance) : "…"} RF · lanterns {snap ? snap.consumables.toString() : "…"}.
        Buying spends 1 simulated RF. Opening rolls the table, then the prize is redeemed back. No wallet
        popup. No live burn.
      </p>
      {definition && (
        <table className="ash-odds">
          <thead>
            <tr>
              <th>Relic</th>
              <th>Chance</th>
              <th>Returns</th>
            </tr>
          </thead>
          <tbody>
            {definition.outcomes.map((outcome) => (
              <tr key={outcome.name}>
                <td>{outcome.name}</td>
                <td>{(outcome.chanceBps / 100).toFixed(0)}%</td>
                <td>{formatRf(outcome.reward)} RF</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {result && <p role="status">{result}</p>}
      {error && (
        <p className="ash-error" role="alert">
          {error}
        </p>
      )}
      <div className="ash-actions">
        <button type="button" className="ash-btn" disabled={busy || !snap} onClick={onLight}>
          {busy ? "Waiting…" : "Spend 1 RF and open"}
        </button>
        <button type="button" className="ash-btn-ghost" disabled={busy} onClick={onClose}>
          Close
        </button>
      </div>
    </section>
  );
}

function musicScene(phase: Phase, sim: Sim): MusicScene {
  if (phase === "rite") return "rite";
  if (phase === "clear") return "clear";
  if (phase === "title" || phase === "levels" || phase === "lobby" || phase === "clothes") return "title";
  if (sim.level.id === "moon") return "moon";
  if (sim.level.id === "antler") return "hunt";
  if (sim.level.id === "choir") return "chant";
  if (sim.level.id === "gear") return "works";
  const id = chapterAt(sim.level, sim.x + 7).id;
  if (id === "lock") return "white";
  if (id === "gust") return "gale";
  if (id === "roof" || id === "letters") return "choir";
  if (
    id === "cages" ||
    id === "white" ||
    id === "latch" ||
    id === "gale" ||
    id === "choir" ||
    id === "shore"
  ) {
    return id;
  }
  return "shore";
}

function promptFor(sim: Sim, phase: Phase) {
  if (phase !== "play" || sim.won || sim.dead > 0) return "";
  if (sim.nearBeacon) return "E · light the bell";
  if (sim.plateAsleep) return "Light every bell. The plate is asleep.";
  if (sim.nearRope) return "E · pull the rope";
  if (sim.nearShrine) return "E · light a lantern";
  if (sim.nearLamp) return "E · buy light · 1 coin";
  if (sim.nearCombo != null) return comboSet(sim) ? "The lock is open" : "E · turn this wheel";
  if (sim.holding) return "Holding the gate";
  if (sim.gateSeconds > 0) return `Gate ${sim.gateSeconds.toFixed(1)}`;
  if (sim.nearGoal && sim.doorLocked) {
    if (sim.level.combo && !comboSet(sim)) return "The lock is not the code";
    if (sim.level.stalker && sim.beacons.size >= sim.level.beacons.length) return "Trap it in the cage first";
    return "The door wants every bell";
  }
  if (sim.nearTrap) return "Wait until it is inside";
  if (sim.caged && sim.cage < 1) return "The cage is falling";
  return "";
}

function formatRf(value: bigint) {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / 10n ** 18n;
  const frac = (abs % 10n ** 18n).toString().padStart(18, "0").slice(0, 2);
  return `${negative ? "-" : ""}${whole.toString()}.${frac}`;
}

function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

declare global {
  interface Window {
    __controlsTest?: {
      getX: () => number;
      getY: () => number;
      getPhase: () => string;
      setKeys: (codes: string[]) => void;
    };
  }
}
