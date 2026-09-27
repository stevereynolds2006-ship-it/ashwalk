const UNIT = 10n ** 18n;

export type Cloth = {
  id: string;
  name: string;
  cost: number;
  rare: boolean;
  note: string;
};

export const CLOTHES: readonly Cloth[] = [
  { id: "cape", name: "Red cape", cost: 0, rare: false, note: "A long red cape behind you." },
];

const WEEKLY: readonly Cloth[] = [];

export const ALL_FOGS_COST = 20;

export type WeekKey = { year: number; week: number };

/** Monday-based calendar week. The same rare stays up until the next Monday UTC. */
export function weekKey(now = new Date()): WeekKey {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const year = date.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / 86400000 + 1) / 7);
  return { year, week };
}

function mix(n: number) {
  let x = n >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

function yearOrder(year: number) {
  const items = WEEKLY.map((_, index) => index);
  for (let i = items.length - 1; i > 0; i--) {
    const j = mix(year * 97 + i * 13) % (i + 1);
    const swap = items[i]!;
    items[i] = items[j]!;
    items[j] = swap;
  }
  return items;
}

export function outfitList(): readonly Cloth[] {
  return [...CLOTHES, ...WEEKLY];
}

export function weekRare(now = new Date()): Cloth {
  void now;
  return CLOTHES[0]!;
}

export function rareOnOffer(id: string, now = new Date()) {
  if (CLOTHES.some((cloth) => cloth.id === id)) return true;
  return weekRare(now).id === id;
}

export type Ledger = {
  spent: bigint;
  allFogs: boolean;
  color: boolean;
  owned: string[];
  equipped: string | null;
};

export function clothById(id: string | null): Cloth | null {
  if (!id) return null;
  return [...CLOTHES, ...WEEKLY].find((cloth) => cloth.id === id) ?? null;
}

function empty(): Ledger {
  return { spent: 0n, allFogs: false, color: false, owned: [], equipped: null };
}

function storageKey(account: string) {
  return `ashwalk.wardrobe.${account.toLowerCase()}`;
}

export function readLedger(account: string | null): Ledger {
  if (!account || typeof localStorage === "undefined") return empty();
  try {
    const raw = localStorage.getItem(storageKey(account));
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as { spent?: string; allFogs?: boolean; color?: boolean; owned?: unknown; equipped?: unknown };
    return {
      spent: BigInt(parsed.spent ?? "0"),
      allFogs: parsed.allFogs === true,
      color: parsed.color === true,
      owned: Array.isArray(parsed.owned)
        ? parsed.owned.filter((id): id is string => typeof id === "string" && clothById(id) != null)
        : [],
      equipped:
        typeof parsed.equipped === "string" && clothById(parsed.equipped) ? parsed.equipped : null,
    };
  } catch {
    return empty();
  }
}

function writeLedger(account: string, ledger: Ledger) {
  localStorage.setItem(
    storageKey(account),
    JSON.stringify({
      spent: ledger.spent.toString(),
      allFogs: ledger.allFogs,
      color: ledger.color,
      owned: ledger.owned,
      equipped: ledger.equipped,
    }),
  );
}

export function spendable(balance: bigint | null, account: string | null) {
  if (balance == null) return null;
  const spent = readLedger(account).spent;
  return balance > spent ? balance - spent : 0n;
}

export function spendWhole(account: string, balance: bigint, whole: number) {
  return pay(account, balance, whole);
}

export function hasWhole(balance: bigint | null, account: string | null, whole: number) {
  const have = spendable(balance, account);
  if (have == null) return false;
  return have >= BigInt(whole) * UNIT;
}

export function formatRareCoins(value: bigint) {
  const whole = value / UNIT;
  const frac = (value % UNIT) / 10n ** 16n;
  const text = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (frac === 0n) return text;
  return `${text}.${frac.toString().padStart(2, "0")}`;
}

function pay(account: string, balance: bigint, whole: number) {
  const cost = BigInt(whole) * UNIT;
  const ledger = readLedger(account);
  const have = balance > ledger.spent ? balance - ledger.spent : 0n;
  if (have < cost) return false;
  ledger.spent += cost;
  writeLedger(account, ledger);
  return true;
}

export function buyCloth(account: string, balance: bigint, id: string, now = new Date()) {
  const cloth = clothById(id);
  if (!cloth) return false;
  if (cloth.cost > 0 && !rareOnOffer(id, now)) return false;
  const ledger = readLedger(account);
  if (ledger.owned.includes(id)) {
    ledger.equipped = id;
    writeLedger(account, ledger);
    return true;
  }
  if (cloth.cost > 0 && !pay(account, balance, cloth.cost)) return false;
  const next = readLedger(account);
  next.owned = [...next.owned, id];
  next.equipped = id;
  writeLedger(account, next);
  return true;
}

export function equipCloth(account: string, id: string | null) {
  const ledger = readLedger(account);
  if (id && !ledger.owned.includes(id)) return;
  ledger.equipped = id;
  writeLedger(account, ledger);
}

export function unlockAllFogs(account: string, balance: bigint) {
  const ledger = readLedger(account);
  if (ledger.allFogs) return true;
  if (!pay(account, balance, ALL_FOGS_COST)) return false;
  const next = readLedger(account);
  next.allFogs = true;
  writeLedger(account, next);
  return true;
}

export function unlockColor(account: string, balance: bigint) {
  const ledger = readLedger(account);
  if (ledger.color) return true;
  if (!pay(account, balance, 100)) return false;
  const next = readLedger(account);
  next.color = true;
  writeLedger(account, next);
  return true;
}

export function setBoardColor(account: string, on: boolean) {
  const ledger = readLedger(account);
  ledger.color = on;
  writeLedger(account, ledger);
}
