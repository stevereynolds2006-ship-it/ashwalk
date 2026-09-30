import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { isAddress, parseAbiItem } from "viem";
import type { ChanceGameDefinition, GameClient, GameSnapshot } from "@rarefriends/friendsdk/game";
import { RF } from "@rarefriends/friendsdk/game";
import { createFriendReader, type GenerationSprites } from "@rarefriends/friendsdk/sprites";
import { createFriendSoundKit, type FriendSoundKit } from "@rarefriends/friendsdk/sounds";
import { createFriendPublicClient } from "@rarefriends/friendsdk/wallet";
import type { PeerInfo } from "@/lib/multiplayer";
import { LEVELS, TRY_ALL, fogHeld, fogPrice, fogReleased, fogTry, fogUnlocked, getLevel, previousFog } from "./challenges";
import { windAccel, chapterAt } from "./level";
import { Online, type NetApi } from "./online";
import type { Ghost } from "./net";
import { comboSet, createSim, setScareLow, step, type Actions, type Sim } from "./sim";
import { burst, frameCamera, realLookId, renderFrame, setRealLook, viewSize } from "./draw";
import { createAshMusic, type AshMusic, type MusicScene } from "./music";
import {
  ALL_FOGS_COST,
  buyCloth,
  CAPES_TRY,
  clothById,
  clothOpens,
  clothReleased,
  equipCloth,
  formatRareCoins,
  grantAllFogs,
  grantCloth,
  grantFog,
  mergeLedger,
  outfitList,
  readLedger,
  spendable,
  type Ledger,
} from "./wardrobe";
import "./ashwalk.css";

type Phase = "title" | "levels" | "real" | "lobby" | "play" | "pause" | "lives" | "rite" | "clear" | "clothes";
type Holds = { left: boolean; right: boolean; jump: boolean; down: boolean; use: boolean };
type Session = { code: string; host: boolean };
type WalletProvider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

const RARE_TOKEN = "0x0779369854d3EcdEA927206718FFD7730C67B71f";
const RARE_CHAIN = 4663;
const PAYOUT_ADDRESS = "0xa93399a2965672dd315a1bd8816fa94c50ef4dd5";
const SHARE_ADDRESS = "0xb7823b2e28484382aa70952a7818712e8ac42a72";
const RARE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
] as const;

function walletProvider(): WalletProvider | null {
  const views: Window[] = [window];
  try {
    if (window.parent !== window) views.push(window.parent);
  } catch {
    /* the frame cannot see the parent */
  }
  for (const view of views) {
    try {
      const eth = (view as Window & { ethereum?: WalletProvider }).ethereum;
      if (eth && typeof eth.request === "function") return eth;
    } catch {
      /* blocked */
    }
  }
  return null;
}

function firstAddress(value: unknown) {
  const list = Array.isArray(value) ? value : [];
  const who = typeof list[0] === "string" ? list[0] : "";
  return isAddress(who) ? who : null;
}

async function readRareBalance(account: string) {
  const client = createFriendPublicClient();
  return client.readContract({
    address: RARE_TOKEN,
    abi: RARE_ABI,
    functionName: "balanceOf",
    args: [account as `0x${string}`],
  });
}

function encodeTransfer(to: string, amount: bigint, tag = "") {
  const addr = to.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const value = amount.toString(16).padStart(64, "0");
  const note = tag
    ? [...new TextEncoder().encode(`ash:${tag}`)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
    : "";
  return `0xa9059cbb${addr}${value}${note}`;
}

function readPurchaseTag(input: string) {
  const data = input.toLowerCase();
  if (!data.startsWith("0xa9059cbb") || data.length <= 138) return "";
  const extra = data.slice(138);
  if (extra.length % 2 !== 0) return "";
  const bytes = extra.match(/../g);
  if (!bytes) return "";
  const text = new TextDecoder().decode(new Uint8Array(bytes.map((byte) => Number.parseInt(byte, 16))));
  return text.startsWith("ash:") ? text.slice(4) : "";
}

async function onRareChain(eth: WalletProvider) {
  const chainId = `0x${RARE_CHAIN.toString(16)}`;
  const current = await eth.request({ method: "eth_chainId" });
  if (typeof current === "string" && Number.parseInt(current, 16) === RARE_CHAIN) return;
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    if (code !== 4902) throw error;
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId,
          chainName: "Robinhood Chain",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://rpc.mainnet.chain.robinhood.com"],
          blockExplorerUrls: ["https://robinhoodchain.blockscout.com"],
        },
      ],
    });
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  }
}

async function sendRare(eth: WalletProvider, from: string, to: string, amount: bigint, tag = "") {
  if (amount <= 0n) return;
  const hash = await eth.request({
    method: "eth_sendTransaction",
    params: [{ from, to: RARE_TOKEN, data: encodeTransfer(to, amount, tag), value: "0x0" }],
  });
  if (typeof hash !== "string" || !hash.startsWith("0x")) throw new Error("The wallet did not return a transaction.");
  const receipt = await createFriendPublicClient().waitForTransactionReceipt({ hash: hash as `0x${string}` });
  if (receipt.status !== "success") throw new Error("The Rare coin transaction failed.");
}

const PURCHASE_EVENT = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");

async function purchasesOnChain(account: string) {
  const client = createFriendPublicClient();
  const latest = await client.getBlockNumber();
  const span = 800_000n;
  const start = latest > span ? latest - span : 0n;
  const opened: string[] = [];
  const owned: string[] = [];
  let allFogs = false;
  const chunk = 200_000n;
  for (const destination of [PAYOUT_ADDRESS, SHARE_ADDRESS] as const) {
  for (let from = start; from <= latest; from += chunk) {
    const toBlock = from + chunk - 1n > latest ? latest : from + chunk - 1n;
    const logs = await client.getLogs({
      address: RARE_TOKEN,
      event: PURCHASE_EVENT,
      args: { from: account as `0x${string}`, to: destination },
      fromBlock: from,
      toBlock,
    });
    for (const log of logs) {
      if (!log.transactionHash) continue;
      const tx = await client.getTransaction({ hash: log.transactionHash });
      const tag = readPurchaseTag(tx.input);
      if (tag.startsWith("fog:")) {
        const id = tag.slice(4);
        if (LEVELS.some((level) => level.id === id) && !opened.includes(id)) opened.push(id);
      } else if (tag.startsWith("real:")) {
        const id = tag.slice(5);
        const key = `real:${id}`;
        if (LEVELS.some((level) => level.id === id) && !opened.includes(key)) opened.push(key);
      } else if (tag.startsWith("cape:")) {
        const id = tag.slice(5);
        if (clothById(id) && !owned.includes(id)) owned.push(id);
      } else if (tag === "all") allFogs = true;
    }
  }
  }
  return { opened, owned, allFogs };
}

const REAL_PRICE = 10;
const REAL_TRY = true;
const LAMP_PRICE = 5;
const LIGHT_PRICE = 1;
const LIGHT_SECONDS = 13;
const SHORE_COINS = 2;
const LIFE_PRICE = 10;
const LIVES = 3;
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

const REAL_NOTE: Record<string, string> = {
  shore: "Earth, water, and fuller trees.",
  latch: "A timber hall and iron gates.",
  gale: "A storm over rock.",
  choir: "Stone under a brighter sky.",
  gear: "A rusted works.",
  roof: "Brick roofs and a lit city.",
  antler: "A fuller wood.",
  moon: "A deeper sky and planets.",
  hallow: "A darker yard.",
  mirror: "Glass over a jungle.",
  tunnel: "A wet cave.",
  yule: "Snow and pines.",
  hoist: "Concrete and rust.",
};

function dimBoard(id: string) {
  return id === "shore" || id === "roof" || id === "choir" || id === "tunnel";
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
  const [guide, setGuide] = useState(false);
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
  const [walletCoins, setWalletCoins] = useState<bigint | null>(rareBalance ?? null);
  const [linkedAccount, setLinkedAccount] = useState<string | null>(account && isAddress(account) ? account : null);
  const [hudOpen, setHudOpen] = useState(false);
  const hudOpenRef = useRef(false);
  hudOpenRef.current = hudOpen;
  const purseRef = useRef(0);
  const [purse, setPurse] = useState(0);
  const livesRef = useRef(LIVES);
  const [lives, setLives] = useState(LIVES);
  const [stakeMsg, setStakeMsg] = useState("");
  const clearedRef = useRef(new Set<string>());
  const [cleared, setCleared] = useState<string[]>([]);
  const [ledger, setLedger] = useState<Ledger>({
    spent: 0n,
    allFogs: false,
    road: false,
    burned: 0,
    owned: [],
    equipped: null,
    opened: [],
  });
  const roadRef = useRef(false);
  const openedRef = useRef(new Set<string>());
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

  const payingAccount = account && isAddress(account) ? account : linkedAccount;
  accountRef.current = payingAccount;
  rareRef.current = payingAccount ? (rareBalance ?? walletCoins) : null;
  clothRef.current = ledger.equipped;

  function fogOpen(id: string) {
    if (TRY_ALL || fogTry(id)) return !fogHeld(id);
    if (id === "shore") return true;
    if (fogHeld(id) || !fogReleased(id)) return false;
    if (!clearedRef.current.has(previousFog(id) ?? "shore") && id !== "shore") return false;
    if (!openedRef.current.has(id)) return false;
    return fogUnlocked(id, clearedRef.current);
  }

  function refreshLedger(nextAccount = accountRef.current) {
    const next = readLedger(nextAccount ?? "guest");
    setLedger(next);
    allOpenRef.current = next.allFogs;
    roadRef.current = next.road;
    openedRef.current = new Set(next.opened);
    clothRef.current = next.equipped;
  }

  async function recallPurchases(who: string) {
    if (!isAddress(who)) return;
    try {
      const found = await purchasesOnChain(who);
      if (found.opened.length === 0 && found.owned.length === 0 && !found.allFogs) return;
      mergeLedger(who, found);
      if (accountRef.current?.toLowerCase() === who.toLowerCase()) refreshLedger(who);
    } catch {
      /* the browser copy still applies if the chain read fails */
    }
  }

  async function connectRareWallet() {
    const eth = walletProvider();
    if (!eth) {
      setStakeMsg("Connect a wallet to buy a board with Rare coins.");
      return false;
    }
    try {
      const who = firstAddress(await eth.request({ method: "eth_requestAccounts" }));
      if (!who) {
        setStakeMsg("Connect a wallet to buy a board with Rare coins.");
        return false;
      }
      const balance = await readRareBalance(who);
      accountRef.current = who;
      rareRef.current = balance;
      setLinkedAccount(who);
      setWalletCoins(balance);
      refreshLedger(who);
      void recallPurchases(who);
      setStakeMsg("");
      return true;
    } catch {
      setStakeMsg("Connect a wallet to buy a board with Rare coins.");
      return false;
    }
  }

  async function ensureWallet() {
    if (accountRef.current && isAddress(accountRef.current) && rareRef.current != null) return true;
    return connectRareWallet();
  }

  async function chargeRare(whole: number, tag: string) {
    if (whole <= 0) return true;
    const eth = walletProvider();
    if (!eth) {
      setStakeMsg("Connect a wallet. This spend is a transaction.");
      return false;
    }
    if (!(await ensureWallet())) return false;
    const who = accountRef.current;
    if (!who || !isAddress(who)) return false;
    setStakeMsg("Confirm the Rare coin payment in your wallet.");
    try {
      await onRareChain(eth);
      const balance = await readRareBalance(who);
      const cost = BigInt(whole) * 10n ** 18n;
      rareRef.current = balance;
      setWalletCoins(balance);
      if (balance < cost) {
        setStakeMsg(`You need ${whole} Rare coins.`);
        return false;
      }
      await sendRare(eth, who, SHARE_ADDRESS, cost, tag);
      const next = await readRareBalance(who);
      rareRef.current = next;
      setWalletCoins(next);
      setStakeMsg("");
      return true;
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
      setStakeMsg(
        code === 4001 ? "The wallet declined the transaction." : "The Rare coin transaction did not finish.",
      );
      return false;
    }
  }

  async function payFog(id: string) {
    const who = accountRef.current;
    const balance = rareRef.current;
    const price = fogPrice(id);
    if (!who || !isAddress(who) || balance == null) {
      setStakeMsg(`Connect a wallet. ${getLevel(id).title} is ${price} Rare coins.`);
      return false;
    }
    if (openedRef.current.has(id)) return true;
    if (!(await chargeRare(price, `fog:${id}`))) return false;
    grantFog(who, id, price);
    openedRef.current.add(id);
    refreshLedger(who);
    onWardrobe?.();
    setShopError(`Sent ${price} Rare coins.`);
    return true;
  }

  async function payReal(id: string) {
    const who = accountRef.current;
    const balance = rareRef.current;
    const key = `real:${id}`;
    if (!who || !isAddress(who) || balance == null) {
      setStakeMsg(`Connect a wallet. The realistic ${getLevel(id).title} is ${REAL_PRICE} Rare coins.`);
      return false;
    }
    if (openedRef.current.has(key)) return true;
    if (!(await chargeRare(REAL_PRICE, key))) return false;
    grantFog(who, key, REAL_PRICE);
    openedRef.current.add(key);
    refreshLedger(who);
    onWardrobe?.();
    setShopError(`Sent ${REAL_PRICE} Rare coins.`);
    return true;
  }

  async function buyOutfit(id: string) {
    const cloth = clothById(id);
    if (!clothReleased(id)) {
      const when = clothOpens(id);
      setStakeMsg(when ? `${cloth?.name ?? "That cape"} opens ${when}. Coming soon.` : "That cape is locked.");
      return;
    }
    if (CAPES_TRY) {
      const who = accountRef.current && isAddress(accountRef.current) ? accountRef.current : "guest";
      if (!buyCloth(who, 0n, id)) {
        setStakeMsg("That cape stayed shut.");
        return;
      }
      setStakeMsg(`${cloth?.name ?? "Cape"} is on.`);
      refreshLedger(who);
      onWardrobe?.();
      return;
    }
    if (cloth && cloth.cost > 0 && !(await ensureWallet())) return;
    const who = accountRef.current;
    const balance = rareRef.current;
    if (!who || !isAddress(who) || balance == null) {
      if (cloth && cloth.cost === 0) {
        if (!buyCloth("guest", 0n, id)) {
          setStakeMsg("That cape stayed shut.");
          return;
        }
        setStakeMsg(`${cloth.name} is on.`);
        refreshLedger("guest");
        onWardrobe?.();
        return;
      }
      setStakeMsg("Connect a wallet. The red cape is 15 Rare coins.");
      return;
    }
    if (cloth && cloth.cost > 0 && !readLedger(who).owned.includes(id)) {
      if (!(await chargeRare(cloth.cost, `cape:${id}`))) return;
      if (!grantCloth(who, id, cloth.cost)) {
        setStakeMsg("The cape was paid, but this browser could not save it.");
        return;
      }
      setStakeMsg(`Sent ${cloth.cost} Rare coins.`);
      refreshLedger(who);
      onWardrobe?.();
      return;
    }
    if (!buyCloth(who, balance, id)) {
      setStakeMsg(cloth && cloth.cost > 0 ? `${cloth.name} wants ${cloth.cost} Rare coins.` : "That cape stayed shut.");
      return;
    }
    setStakeMsg(cloth ? `${cloth.name} is on.` : "");
    refreshLedger(who);
    onWardrobe?.();
  }

  async function buyLife() {
    if (!(await ensureWallet())) return;
    const who = accountRef.current;
    const balance = rareRef.current;
    if (!who || !isAddress(who) || balance == null) {
      setStakeMsg("Connect a wallet. A life is 10 Rare coins.");
      return;
    }
    if (!(await chargeRare(LIFE_PRICE, "life"))) return;
    refreshLedger(who);
    onWardrobe?.();
    livesRef.current = 1;
    setLives(1);
    setStakeMsg("");
    setShopError(`Sent ${LIFE_PRICE} Rare coins.`);
    go("play");
  }

  function wearOutfit(id: string | null) {
    const who = accountRef.current ?? "guest";
    equipCloth(who, id);
    refreshLedger(who);
    onWardrobe?.();
  }

  async function buyEveryFog() {
    if (allOpenRef.current) return;
    if (!(await ensureWallet())) return;
    const who = accountRef.current;
    const balance = rareRef.current;
    if (!who || balance == null) {
      setStakeMsg("Connect a wallet. Every fog costs 20 Rare coins.");
      return;
    }
    if (!(await chargeRare(ALL_FOGS_COST, "all"))) return;
    grantAllFogs(who, ALL_FOGS_COST);
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

  async function startLevel(id: string, trial = false) {
    if (!trial && fogHeld(id)) {
      setStakeMsg("The mirror stays shut.");
      return;
    }
    if (!trial && !fogReleased(id)) {
      setStakeMsg(
        id === "mirror"
          ? "The mirror opens November 1. Coming soon."
          : id === "tunnel"
            ? "The tunnel opens December 1. Coming soon."
            : id === "hoist"
              ? "The hoist opens January 1st. Coming soon."
              : id === "hallow"
                ? "The hallow opens October 31. Coming soon."
                : id === "yule"
                  ? "The eve opens December 25. Coming soon."
                  : "The moon opens October 1. Coming soon.",
      );
      return;
    }
    if (!trial && !TRY_ALL && id !== "shore" && !fogTry(id)) {
      const prev = previousFog(id);
      if (prev && !clearedRef.current.has(prev)) {
        setStakeMsg(`Beat ${getLevel(prev).title} before you can open this fog.`);
        return;
      }
      if (!openedRef.current.has(id)) {
        if (!(await ensureWallet())) return;
        if (!(await payFog(id))) return;
      }
    }
    livesRef.current = LIVES;
    setLives(LIVES);
    purseRef.current = id === "shore" ? SHORE_COINS : 0;
    setPurse(id === "shore" ? SHORE_COINS : 0);
    setStakeMsg("");
    if (id === "shore") setShopError("");
    const level = getLevel(id);
    const sim = createSim(level);
    setScareLow(realLookId() === "hallow" && id === "hallow");
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
    refreshLedger(account && isAddress(account) ? account : "guest");
    if (account && isAddress(account)) void recallPurchases(account);
  }, [account, friendId]);

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
      if (cancel) return;
      setSnap(value);
    });
    return () => {
      cancel = true;
    };
  }, [client]);

  useEffect(() => {
    if (account && isAddress(account)) {
      setLinkedAccount(account);
      if (rareBalance != null) setWalletCoins(rareBalance);
      return;
    }
    let cancel = false;
    const eth = walletProvider();
    if (!eth) return;
    void eth
      .request({ method: "eth_accounts" })
      .then(async (value) => {
        const who = firstAddress(value);
        if (!who || cancel) return;
        const balance = await readRareBalance(who);
        if (cancel) return;
        setLinkedAccount(who);
        setWalletCoins(balance);
      })
      .catch(() => {
        /* the wallet is not connected yet */
      });
    return () => {
      cancel = true;
    };
  }, [account, rareBalance]);

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
        if (hudOpenRef.current && (held.left || held.right || held.jumpHeld || held.down)) {
          hudOpenRef.current = false;
          setHudOpen(false);
        }
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
            interact: held.interact,
            interactPressed,
          };
          jumpPressed = false;
          interactPressed = false;
          sim.saber = sim.level.id === "moon" && lampOnRef.current;
          const events = step(sim, actions, 1 / 60, reducedRef.current);
          if (events.mothId) mothId = events.mothId;
          if (events.beacon) beaconId = events.beacon;
          if (events.pull) pulled = true;
          const sound = soundRef.current;
          if (events.jump) musicRef.current?.jump();
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
              burned > 0 ? `Burned ${burned} stage coin${burned === 1 ? "" : "s"}.` : "No stage coins left to burn.";
            if (left <= 0) {
              setStakeMsg(`${burnNote} Buy one more life for ${LIFE_PRICE} Rare coins.`);
              go("lives");
            } else {
              setShopError(`${left} ${left === 1 ? "life" : "lives"} left. ${burnNote}`);
            }
          }
          if (events.shrine) {
            const span = sim.level.platforms.find((plat) => plat.bridge === events.shrine);
            if (span) {
              if (purseRef.current < LIGHT_PRICE) {
                setShopError("The shrine wants 1 coin you picked up.");
              } else {
                purseRef.current -= LIGHT_PRICE;
                setPurse(purseRef.current);
                sim.bridgeLeft[span.id] = 999;
                sim.bridgeHold[span.id] = true;
                sim.bridgeStood[span.id] = false;
                shoreGlowRef.current = LIGHT_SECONDS;
                setShopError("The long plank is up. It falls once you step off.");
                sound?.play("purchase");
              }
            } else go("rite");
          }
          if (events.lamp) {
            if (purseRef.current < LIGHT_PRICE) {
              setShopError("A lantern wants 1 coin you picked up.");
            } else {
              const next = purseRef.current - LIGHT_PRICE;
              purseRef.current = next;
              setPurse(next);
              const span = sim.level.platforms.find((plat) => plat.bridge === events.lampId);
              if (span) {
                sim.bridgeLeft[span.id] = LIGHT_SECONDS;
                sim.bridgeHold[span.id] = false;
                sim.bridgeStood[span.id] = false;
              }
              if ((sim.level.id === "moon" || sim.level.id === "hoist") && events.lampId) {
                sim.altars.add(events.lampId);
                sim.altarLeft[events.lampId] = sim.level.id === "hoist" ? LIGHT_SECONDS : 10;
                setShopError(
                  sim.level.id === "hoist"
                    ? "Spent 1 coin. The yard is brighter for 13 seconds."
                    : "Spent 1 coin. The moon stays bright for 10 seconds.",
                );
              } else if (span) {
                shoreGlowRef.current = LIGHT_SECONDS;
                setShopError("Spent 1 coin. The plank lasts 13 seconds.");
              } else {
                shoreGlowRef.current = LIGHT_SECONDS;
                setShopError("Spent 1 coin you picked up.");
              }
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
            r2: q(sim.rope2),
            r3: q(sim.rope3),
            sv: q(sim.saved),
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
      if (sim.level.id === "mirror") {
        nextKicker =
          sim.wake >= 1 ? "Run. The door is behind you." : sim.wake > 0 ? "He is waking." : "Walk to him. Then you run.";
      } else if (sim.level.boulder) {
        nextKicker = sim.caged
          ? "It fell. The door is ahead."
          : sim.wake >= 1
            ? "It is following you down. Do not stop."
            : "Run. The rock is waiting.";
      } else if (sim.level.id === "yule") {
        nextKicker =
          sim.gifts >= sim.level.moths.length
            ? "All 4 presents. The sled will go."
            : `${Math.min(sim.moths.size, 4)} of 4 presents`;
      } else if (sim.level.beacons.length > 0) {
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
      const boulderHot = Boolean(sim.level.boulder && sim.wake > 0 && !sim.caged);
      const inLatchPit = sim.level.id === "latch" && sim.y > 680 && sim.x > 1900 && sim.x < 2520;
      const sledding = sim.level.id === "yule" && sim.cage > 0 && sim.suck <= 0;
      if ((sim.level.stalker || sim.level.hunter) && sim.wake > 0 && !caught) huntZoomRef.current = 1;
      else if (boulderHot) huntZoomRef.current = 1;
      else if (inLatchPit) huntZoomRef.current = 1;
      else if (sledding) huntZoomRef.current = 1;
      else huntZoomRef.current = Math.max(0, huntZoomRef.current - dt * 0.35);
      const pull = sledding ? 0.38 : inLatchPit ? 0.62 : sim.level.hunter ? 0.5 : sim.level.boulder ? 0.28 : 0.75;
      const zoom = 1 + pull * huntZoomRef.current;
      const follow = phaseNow === "play" || phaseNow === "pause" || phaseNow === "lives" || phaseNow === "rite" || phaseNow === "clear";
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
        paused: phaseNow === "pause" || phaseNow === "lives" || pausedRef.current,
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
        lampOnRef.current &&
          phaseNow !== "title" &&
          phaseNow !== "levels" &&
          phaseNow !== "lobby" &&
          sim.level.id !== "moon",
        dimBoard(sim.level.id) &&
          phaseNow !== "title" &&
          phaseNow !== "levels" &&
          phaseNow !== "lobby" &&
          shoreGlowRef.current <= 0
          ? sim.level.id === "choir"
            ? 0.58
            : sim.level.id === "shore"
              ? 0.72
              : sim.level.id === "roof"
                ? 0.38
                : sim.level.id === "tunnel"
                  ? 0.4
                  : 0.86
          : sim.level.id === "hoist"
            ? Math.max(0.08, 0.46 - (sim.altars.size / Math.max(1, sim.level.lamps?.length ?? 1)) * 0.38) *
              (sim.altars.size > 0 ? 0.55 : 1)
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
        else if (current === "levels" || current === "clothes" || current === "real") go("title");
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

  async function beginReal(id: string) {
    if (!REAL_TRY && id !== "shore") {
      if (!clearedRef.current.has(id)) {
        setStakeMsg(`Beat ${getLevel(id).title} before you can open this look.`);
        return;
      }
      if (!openedRef.current.has(`real:${id}`)) {
        if (!(await ensureWallet())) return;
        if (!(await payReal(id))) return;
      }
    }
    setStakeMsg("");
    setRealLook(id);
    armAudio();
    void startLevel(id, true);
  }

  function restart() {
    const id = simRef.current.level.id;
    if (session?.host) apiRef.current?.send({ k: "begin", level: id });
    void startLevel(id, realLookId() === id);
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
        setShopError(
          simRef.current.level.id === "moon"
            ? `The saber wants ${LAMP_PRICE} coins you picked up.`
            : `The flashlight wants ${LAMP_PRICE} coins you picked up.`,
        );
        return;
      }
      const next = have - LAMP_PRICE;
      purseRef.current = next;
      setPurse(next);
      setShopError(
        simRef.current.level.id === "moon"
          ? `Spent ${LAMP_PRICE} coins. The saber is in your hand.`
          : `Spent ${LAMP_PRICE} coins you picked up.`,
      );
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
      if (key === "left" || key === "right" || key === "jump" || key === "down") setHudOpen(false);
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
      {phase !== "title" && phase !== "levels" && phase !== "real" && phase !== "lobby" && (
        <div className="ash-hud">
          <div>
            <p className="ash-kicker">{identity}</p>
            <p className="ash-chapter">{chapter}</p>
            <p className="ash-sub">{kicker}</p>
            {shopError && <p className="ash-sub">{shopError}</p>}
          </div>
          <div className="ash-hud-actions">
            {hudOpen && (
              <button type="button" className="ash-pop-back" aria-label="Close menu" onClick={() => setHudOpen(false)} />
            )}
            <button
              type="button"
              className="ash-icon"
              aria-expanded={hudOpen}
              aria-haspopup="menu"
              aria-controls="ash-hud-menu"
              onClick={() => setHudOpen((open) => !open)}
            >
              {hudOpen ? "Close" : "Menu"}
            </button>
            {hudOpen && (
              <div className="ash-drop" id="ash-hud-menu" role="menu">
                {session && (
                  <span className="ash-count">
                    {linked + 1} in the fog
                    <span className="sr-only"> including you</span>
                  </span>
                )}
                <span className="ash-count">{purse} in this stage</span>
                <span className="ash-count">
                  {payingAccount && (rareBalance ?? walletCoins) != null
                    ? `${formatRareCoins(spendable(rareBalance ?? walletCoins, payingAccount) ?? 0n)} Rare`
                    : "No wallet"}
                </span>
                <span className="ash-count">{ledger.burned} sent</span>
                <span className="ash-count">
                  {lives} {lives === 1 ? "life" : "lives"}
                </span>
                <button
                  type="button"
                  className="ash-icon"
                  aria-pressed={lampOwned ? lampOn : undefined}
                  onClick={() => toggleLamp()}
                >
                  {simRef.current.level.id === "moon"
                    ? lampOwned
                      ? lampOn
                        ? "Saber on"
                        : "Saber off"
                      : `Buy saber · ${LAMP_PRICE} picked up`
                    : lampOwned
                      ? lampOn
                        ? "Light on"
                        : "Light off"
                      : `Buy light · ${LAMP_PRICE} picked up`}
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
            {payingAccount && (rareBalance ?? walletCoins) != null
              ? `You have ${formatRareCoins(spendable(rareBalance ?? walletCoins, payingAccount) ?? 0n)} Rare coins.`
              : "Connect a wallet to buy boards with Rare coins."}
          </p>
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
            <button type="button" className="ash-btn" onClick={() => go("levels")}>
              Fog Levels
            </button>
            <button type="button" className="ash-btn-ghost" onClick={() => go("real")}>
              Realistic fog
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
            <button
              type="button"
              className="ash-btn-ghost"
              aria-expanded={guide}
              onClick={() => setGuide((open) => !open)}
            >
              {guide ? "Hide guide" : "Guide"}
            </button>
          </div>
          {guide && (
            <div className="ash-guide">
              <p>The shore is free. You start it with 2 coins. Coins you pick up only turn things on inside the stage. Rare coins pay to open the next fog and to buy a cape. Beat a fog, then the next one is 25 Rare coins. You cannot buy the next one until the one before it is beaten.</p>
              <p>Every month a new map opens. A new cape opens each week, starting October 1. Capes are 15 Rare coins. The Halloween cape and the Christmas cape are 25. Only the red cape is open now. The hallow opens October 31. The eve opens December 25. The hoist opens January 1st.</p>
              <p>
                A and D, or the arrow keys, move. W, up, or space jumps. S drops through a thin plank. On the hoist, Use climbs up and Down climbs down.
                E pulls, lights a bell, or buys a lantern. A lantern costs 1 coin you picked up in the stage and lasts 13 seconds. The flashlight costs 5 of those coins. On the moon that buy is a saber, not a flashlight. Stand on a plank too long and it falls.
                It comes back after 4 seconds. Three lives to a board. After that, one more life is 10 Rare coins.
                A death takes half the coins you picked up in the stage. Rare coins you spend are sent in one payment. Confirm it in your wallet.
              </p>
            </div>
          )}
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
            {payingAccount && (rareBalance ?? walletCoins) != null
              ? `You have ${formatRareCoins(spendable(rareBalance ?? walletCoins, payingAccount) ?? 0n)} Rare coins. Only the red cape is open.`
              : "Connect a wallet to buy a cape with Rare coins."}
          </p>
          <p className="ash-note">Only the red cape is open, at 15 Rare coins. Then one a week, each 15 Rare coins, except Halloween and Christmas at 25: white October 1, rainbow October 8, camo October 15, stripes October 22, pink October 29, the Halloween cape October 31, black November 5, gold November 12, ember November 19, scarlet November 26, blue December 3, yule December 10, frost December 17, gilded December 24, and the Christmas cape December 25.</p>
          <div className="ash-levels">
            {outfitList().map((cloth) => {
              const locked = !clothReleased(cloth.id);
              const when = clothOpens(cloth.id);
              const soon = locked && when != null;
              const owned = ledger.owned.includes(cloth.id);
              const wearing = ledger.equipped === cloth.id;
              return (
                <button
                  key={cloth.id}
                  type="button"
                  className="ash-level"
                  aria-current={wearing ? "true" : undefined}
                  disabled={locked}
                  onClick={() => (owned ? wearOutfit(wearing ? null : cloth.id) : buyOutfit(cloth.id))}
                >
                  <span>{soon ? `${cloth.name} · coming soon` : locked ? `${cloth.name} · locked` : cloth.name}</span>
                  <small>
                    {soon
                      ? `Coming soon. Opens ${when}. ${cloth.cost} Rare coins.`
                      : locked
                        ? "Locked."
                        : owned
                          ? wearing
                            ? "Wearing. Press to take it off."
                            : `${cloth.note} Press to wear.`
                          : CAPES_TRY
                            ? `${cloth.note} Open to try.`
                            : `${cloth.note} ${cloth.cost} Rare coins.`}
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
      {phase === "real" && (
        <section className="ash-panel" aria-label="Realistic fog">
          <p className="ash-kicker">A closer look</p>
          <h2>Realistic fog</h2>
          {stakeMsg && (
            <p className="ash-error" role="alert">
              {stakeMsg}
            </p>
          )}
          <p className="ash-note">
            {REAL_TRY
              ? "Open to try. The shore stays free. After this, beat a fog, then its realistic look is 10 Rare coins."
              : "The shore is free. Beat a fog, then its realistic look is 10 Rare coins. It stays open on this wallet."}
          </p>
          <div className="ash-levels">
            {LEVELS.map((level) => {
              const free = level.id === "shore" || REAL_TRY;
              const beaten = free || cleared.includes(level.id);
              const owned = free || ledger.opened.includes(`real:${level.id}`);
              return (
                <button
                  key={level.id}
                  type="button"
                  className="ash-level"
                  disabled={!beaten}
                  onClick={() => void beginReal(level.id)}
                >
                  <span>{beaten ? (owned ? level.title : `${level.title} · ${REAL_PRICE} Rare coins`) : `${level.title} · locked`}</span>
                  <small>
                    {beaten
                      ? owned
                        ? `${REAL_NOTE[level.id] ?? level.kicker} Open.`
                        : `${REAL_NOTE[level.id] ?? level.kicker} ${REAL_PRICE} Rare coins.`
                      : `Beat ${level.title} first.`}
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
          <p className="ash-kicker">The woods</p>
          <h2>Fog Levels</h2>
          {stakeMsg && (
            <p className="ash-error" role="alert">
              {stakeMsg}
            </p>
          )}
          <p className="ash-note">
            {payingAccount && (rareBalance ?? walletCoins) != null
              ? `You have ${formatRareCoins(spendable(rareBalance ?? walletCoins, payingAccount) ?? 0n)} Rare coins.`
              : "Connect a wallet to buy a board with Rare coins."}
          </p>
          <p className="ash-note">
            The shore is free. Beat a fog before you can buy the next one. Every board after the shore is 25 Rare coins. The moon opens October 1, the hallow October 31, the mirror November 1, the tunnel December 1, the eve December 25, and the hoist January 1st.
          </p>
          <LevelList
            current={pickId}
            cleared={cleared}
            allOpen={false}
            opened={ledger.opened}
            onPick={(id) => {
              armAudio();
              setRealLook(null);
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
              <LevelList current={pickId} cleared={cleared} allOpen={false} opened={ledger.opened} onPick={chooseLevel} />
              <div className="ash-actions">
                <button
                  type="button"
                  className="ash-btn"
                  disabled={!fogOpen(pickId)}
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
      {phase === "lives" && (
        <section className="ash-panel" aria-label="Buy a life">
          <p className="ash-kicker">No lives left</p>
          <h2>Buy one more</h2>
          <p>Three lives are gone. One more is {LIFE_PRICE} Rare coins.</p>
          {stakeMsg && (
            <p className="ash-error" role="alert">
              {stakeMsg}
            </p>
          )}
          <div className="ash-actions">
            <button type="button" className="ash-btn" onClick={buyLife}>
              Buy a life · {LIFE_PRICE} Rare coins
            </button>
            <button
              type="button"
              className="ash-btn-ghost"
              onClick={() => {
                clearRun();
                setStakeMsg("Three lives are gone. The shore is free.");
                go("title");
              }}
            >
              Leave
            </button>
          </div>
        </section>
      )}
      {phase === "pause" && (
        <section className="ash-panel" aria-label="Paused">
          <p className="ash-kicker">Paused</p>
          <h2>The fog waits</h2>
          {session && <p className="ash-note">{simRef.current.level.together}</p>}
          <p className="ash-note">
            {snap ? `${formatRf(snap.rfBalance)} RF simulated.` : "Balance still loading."}{" "}
            {simRef.current.level.id === "moon"
              ? `A lightsaber costs ${LAMP_PRICE} coins you have picked up. It cuts the aliens.`
              : `A flashlight costs ${LAMP_PRICE} coins you have picked up. It does not enter the lantern rite.`}
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
              {simRef.current.level.id === "moon"
                ? lampOwned
                  ? lampOn
                    ? "Saber on"
                    : "Saber off"
                  : `Buy a saber · ${LAMP_PRICE} picked up`
                : lampOwned
                  ? lampOn
                    ? "Flashlight on"
                    : "Flashlight off"
                  : `Buy a flashlight · ${LAMP_PRICE} picked up`}
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
          {clearLevel.id !== "shore" || !TRY_ALL ? (
            <p className="ash-note">The next fog is 25 Rare coins, and only after this one is beaten.</p>
          ) : null}
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
              if (!next) return null;
              if (!TRY_ALL && !fogReleased(next.id)) {
                return (
                  <button type="button" className="ash-btn" disabled>
                    {next.title} · coming soon
                  </button>
                );
              }
              if (!TRY_ALL && !ledger.opened.includes(next.id)) {
                return (
                  <button type="button" className="ash-btn" onClick={() => startLevel(next.id)}>
                    Continue · {fogPrice(next.id)} Rare coins
                  </button>
                );
              }
              if (!TRY_ALL && !fogUnlocked(next.id, new Set(cleared))) {
                const prev = previousFog(next.id);
                return (
                  <button type="button" className="ash-btn" disabled>
                    {prev ? `Beat ${getLevel(prev).title} first` : `${next.title} · locked`}
                  </button>
                );
              }
              return (
                <button type="button" className="ash-btn" onClick={() => startLevel(next.id)}>
                  Continue to {next.title}
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
        <div
          className={
            pickId === "hoist" ? "ash-touch ash-touch-hoist" : pickId === "yule" ? "ash-touch ash-touch-eve" : pickId === "tunnel" ? "ash-touch ash-touch-tunnel" : pickId === "roof" ? "ash-touch ash-touch-sign" : pickId === "gale" || pickId === "hallow" ? "ash-touch ash-touch-gale" : "ash-touch"
          }
          ref={bindTouch}
        >
          <div>
            <button type="button" aria-label="Move left" draggable={false} {...hold("left")}>
              Left
            </button>
            <button type="button" aria-label="Move right" draggable={false} {...hold("right")}>
              Right
            </button>
          </div>
          <div>
            {(pickId === "hoist" || pickId === "yule" || pickId === "antler" || pickId === "roof" || pickId === "tunnel" || pickId === "gale" || pickId === "hallow") && (
              <button type="button" aria-label="Climb down" draggable={false} {...hold("down")}>
                Down
              </button>
            )}
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
  opened,
  onPick,
}: {
  current: string;
  cleared: readonly string[];
  allOpen: boolean;
  opened: readonly string[];
  onPick: (id: string) => void;
}) {
  return (
    <div className="ash-levels">
      {LEVELS.map((level) => {
        const opens =
          level.id === "moon" ? "October 1" : level.id === "hallow" ? "October 31" : level.id === "mirror" ? "November 1" : level.id === "tunnel" ? "December 1" : level.id === "yule" ? "December 25" : level.id === "hoist" ? "January 1st" : null;
        const soon = !TRY_ALL && opens != null && !fogReleased(level.id);
        const price = fogPrice(level.id);
        const prev = previousFog(level.id);
        const beaten = prev == null || cleared.includes(prev);
        const bought = allOpen || opened.includes(level.id);
        const open = TRY_ALL || level.id === "shore" || fogTry(level.id) || (!soon && bought && beaten);
        const canBuy = !open && !soon && beaten && !bought;
        const note = soon
          ? `Coming ${opens}. ${price} Rare coins.`
          : open
            ? level.rule
            : canBuy
              ? `Beat the one before it, then ${price} Rare coins.`
              : prev
                ? `Beat ${getLevel(prev).title} before you can buy this.`
                : "Locked.";
        return (
          <button
            key={level.id}
            type="button"
            className="ash-level"
            aria-current={level.id === current ? "true" : undefined}
            disabled={!open && !canBuy}
            onClick={() => onPick(level.id)}
          >
            <span>
              {soon ? `${level.title} · coming ${opens}` : canBuy ? `${level.title} · ${price} Rare coins` : open ? level.title : `${level.title} · locked`}
            </span>
            <small>{note}</small>
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
  if (sim.level.id === "hallow") return "hallow";
  if (sim.level.id === "yule") return "yule";
  if (sim.level.id === "hoist") return "hoist";
  if (sim.level.id === "tunnel") return "tunnel";
  if (sim.level.id === "mirror") return "mirror";
  if (sim.level.id === "moon") return "moon";
  if (sim.level.id === "antler") return "hunt";
  if (sim.level.id === "choir") return "choir";
  if (sim.level.id === "gear") return "gear";
  if (sim.level.id === "roof") return "roof";
  if (sim.level.id === "gale") return "gale";
  if (sim.level.id === "latch") return "latch";
  return "shore";
}

function promptFor(sim: Sim, phase: Phase) {
  if (phase !== "play" || sim.won || sim.dead > 0) return "";
  if (sim.level.id === "hallow" && sim.beacons.size < sim.level.beacons.length) {
    return `Walk over a pumpkin. ${sim.beacons.size} of ${sim.level.beacons.length}.`;
  }
  if (sim.level.id === "gale" && sim.cage > 0) return "Jump rises. Down drops. 8 seconds to the hole.";
  if (sim.level.id === "yule" && sim.x > 11200 && sim.hearthLeave > 0) return "The tree keeps them.";
  if (sim.level.id === "yule" && sim.x > 11200 && sim.gifts < sim.level.moths.length) {
    return sim.x > 11940 && sim.x < 12180
      ? `Use · set a present under the tree · ${sim.gifts} of ${sim.moths.size}`
      : "Carry them to the tree.";
  }
  if (sim.level.id === "yule" && sim.cage <= 0 && sim.x > 5200 && sim.x < 5640 && sim.y < 500) {
    return sim.moths.size < sim.level.moths.length || sim.gifts < sim.level.moths.length
      ? "Climb the trees. The last present opens the room."
      : "The sled takes the hill.";
  }
  if (sim.level.id === "yule" && sim.cage > 0 && sim.cage < 1) return "The snowball is behind you.";
  if (sim.level.id === "moon" && sim.cage > 0) return "Light speed. Eight seconds.";
  if (sim.climbing) return sim.climbDir > 0 ? "Down · climbing down" : "Use · climbing up";
  if (sim.nearLadder) return "Use climbs up. Down climbs down.";
  if (sim.plateAsleep && sim.level.id === "latch" && sim.rope < 1) return "Pull the pulley. Then the plate.";
  if (sim.plateAsleep) return "Light every bell. The plate is asleep.";
  if (sim.nearRope) return sim.level.id === "shore" ? "Hold E · crank them down" : "Hold E · wind the pulley";
  if (sim.nearShrine) {
    const span = sim.level.platforms.some((plat) => plat.bridge === sim.nearShrine);
    return span ? "E · raise the long plank · 1 coin" : "E · light a lantern";
  }
  if (sim.nearLamp) {
    const span = sim.level.platforms.some((plat) => plat.bridge === sim.nearLampId);
    if (span) {
      const id = sim.level.platforms.find((plat) => plat.bridge === sim.nearLampId)?.id;
      const left = id ? (sim.bridgeLeft[id] ?? 0) : 0;
      return left > 0 ? `The plank falls in ${Math.ceil(left)}s` : "E · raise the plank · 1 coin · 13 seconds";
    }
    return sim.level.id === "moon"
      ? "E · light the moon · 1 coin · 10 seconds"
      : sim.level.id === "hoist"
        ? "E · light the yard · 1 coin · 13 seconds"
        : "E · buy light · 1 coin you picked up";
  }
  if (sim.nearCombo != null) {
    if (sim.level.id === "latch" && sim.cage > 0.4) return comboSet(sim) ? "The cage is opening" : "E · enter the number";
    return comboSet(sim) ? "The lock is open" : "E · turn this wheel";
  }
  if (sim.holding) return "Holding the gate";
  if (sim.gateSeconds > 0) return `Gate ${sim.gateSeconds.toFixed(1)}`;
  if (sim.nearGoal && sim.doorLocked) {
    if (sim.level.id === "shore" && sim.saved <= 2) return "Lower the last cage. They leave with you.";
    if (sim.level.combo && !comboSet(sim)) return "The lock is not the code";
    if (sim.level.hunter && sim.wake < 1) return "Reach him. Then the door opens behind you.";
    if (sim.level.id === "yule") return "Get all 4 presents";
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
