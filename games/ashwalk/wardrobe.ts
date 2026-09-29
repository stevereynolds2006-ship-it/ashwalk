const UNIT = 10n ** 18n;

export type Cloth = {
  id: string;
  name: string;
  cost: number;
  rare: boolean;
  note: string;
};

export const CLOTHES: readonly Cloth[] = [
  { id: "cape", name: "Red cape", cost: 15, rare: false, note: "A long red cape behind you." },
  { id: "white", name: "White cape", cost: 15, rare: false, note: "A white cape." },
  { id: "rainbow", name: "Rainbow cape", cost: 15, rare: false, note: "A rainbow cape." },
  { id: "camo", name: "Camo cape", cost: 15, rare: false, note: "A camo cape." },
  { id: "stripes", name: "Striped cape", cost: 15, rare: false, note: "Red, white, and blue." },
  { id: "pink", name: "Pink cape", cost: 15, rare: false, note: "A bright pink cape." },
  { id: "halloween", name: "Halloween cape", cost: 25, rare: false, note: "Orange, purple, and cream." },
  { id: "black", name: "Black cape", cost: 15, rare: false, note: "A dark cape." },
  { id: "gold", name: "Gold cape", cost: 15, rare: false, note: "Gold with a blue band." },
  { id: "ember", name: "Ember cape", cost: 15, rare: false, note: "Torn orange streaks." },
  { id: "scarlet", name: "Scarlet cape", cost: 15, rare: false, note: "Red with a white edge." },
  { id: "blue", name: "Blue cape", cost: 15, rare: false, note: "A bright blue cape." },
  { id: "yule", name: "Yule cape", cost: 15, rare: false, note: "Red, green, and white." },
  { id: "frost", name: "Frost cape", cost: 15, rare: false, note: "Ice blue and white." },
  { id: "gilded", name: "Gilded cape", cost: 15, rare: false, note: "Red with a gold edge." },
  { id: "christmas", name: "Christmas cape", cost: 25, rare: false, note: "Red, with snow on the edge." },
];

/** Locked capes open one per week, starting October 1. */
const CAPE_WEEKS: readonly { id: string; at: Date; label: string }[] = [
  { id: "white", at: new Date(2026, 9, 1), label: "October 1" },
  { id: "rainbow", at: new Date(2026, 9, 8), label: "October 8" },
  { id: "camo", at: new Date(2026, 9, 15), label: "October 15" },
  { id: "stripes", at: new Date(2026, 9, 22), label: "October 22" },
  { id: "pink", at: new Date(2026, 9, 29), label: "October 29" },
  { id: "halloween", at: new Date(2026, 9, 31), label: "October 31" },
  { id: "black", at: new Date(2026, 10, 5), label: "November 5" },
  { id: "gold", at: new Date(2026, 10, 12), label: "November 12" },
  { id: "ember", at: new Date(2026, 10, 19), label: "November 19" },
  { id: "scarlet", at: new Date(2026, 10, 26), label: "November 26" },
  { id: "blue", at: new Date(2026, 11, 3), label: "December 3" },
  { id: "yule", at: new Date(2026, 11, 10), label: "December 10" },
  { id: "frost", at: new Date(2026, 11, 17), label: "December 17" },
  { id: "gilded", at: new Date(2026, 11, 24), label: "December 24" },
  { id: "christmas", at: new Date(2026, 11, 25), label: "December 25" },
];

/** Weekly dates are live. Set true only for a cape tryout. */
export const CAPES_TRY = false;

export function clothOpens(id: string): string | null {
  if (CAPES_TRY) return null;
  return CAPE_WEEKS.find((week) => week.id === id)?.label ?? null;
}

export function clothReleased(id: string, now = new Date()) {
  if (CAPES_TRY) return true;
  const week = CAPE_WEEKS.find((item) => item.id === id);
  if (!week) return true;
  return now >= week.at;
}

export const ALL_FOGS_COST = 20;

const WEEKLY: readonly Cloth[] = [];

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
  road: boolean;
  burned: number;
  owned: string[];
  equipped: string | null;
  opened: string[];
};

export function clothById(id: string | null): Cloth | null {
  if (!id) return null;
  return [...CLOTHES, ...WEEKLY].find((cloth) => cloth.id === id) ?? null;
}

function empty(): Ledger {
  return { spent: 0n, allFogs: false, road: false, burned: 0, owned: [], equipped: null, opened: [] };
}

function storageKey(account: string) {
  return `ashwalk.wardrobe.${account.toLowerCase()}`;
}

export function readLedger(account: string | null): Ledger {
  if (!account || typeof localStorage === "undefined") return empty();
  try {
    const raw = localStorage.getItem(storageKey(account));
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as {
      spent?: string;
      allFogs?: boolean;
      road?: boolean;
      burned?: number;
      owned?: unknown;
      equipped?: unknown;
      opened?: unknown;
    };
    return {
      spent: BigInt(parsed.spent ?? "0"),
      allFogs: parsed.allFogs === true,
      road: parsed.road === true,
      burned: typeof parsed.burned === "number" && parsed.burned > 0 ? Math.floor(parsed.burned) : 0,
      owned: Array.isArray(parsed.owned)
        ? parsed.owned.filter((id): id is string => typeof id === "string" && clothById(id) != null)
        : [],
      equipped:
        typeof parsed.equipped === "string" && clothById(parsed.equipped) && clothReleased(parsed.equipped)
          ? parsed.equipped
          : null,
      opened: Array.isArray(parsed.opened) ? parsed.opened.filter((id): id is string => typeof id === "string") : [],
    };
  } catch {
    return empty();
  }
}

function writeLedger(account: string, ledger: Ledger) {
  try {
    localStorage.setItem(
      storageKey(account),
      JSON.stringify({
        spent: ledger.spent.toString(),
        allFogs: ledger.allFogs,
        road: ledger.road,
        burned: ledger.burned,
        owned: ledger.owned,
        equipped: ledger.equipped,
        opened: ledger.opened,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function mergeLedger(
  account: string,
  extra: { opened?: readonly string[]; owned?: readonly string[]; allFogs?: boolean },
) {
  const ledger = readLedger(account);
  for (const id of extra.opened ?? []) {
    if (!ledger.opened.includes(id)) ledger.opened.push(id);
  }
  for (const id of extra.owned ?? []) {
    if (clothById(id) && !ledger.owned.includes(id)) ledger.owned.push(id);
  }
  if (extra.allFogs) ledger.allFogs = true;
  writeLedger(account, ledger);
  return ledger;
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
  ledger.burned += burnedHalf(whole);
  writeLedger(account, ledger);
  return true;
}

/** Half of a spend is burned. Odd amounts burn the extra coin. */
export function burnedHalf(whole: number) {
  return whole - Math.floor(whole / 2);
}

export function recordBurn(account: string, whole: number) {
  const burned = burnedHalf(whole);
  if (burned <= 0) return 0;
  const ledger = readLedger(account);
  ledger.burned += burned;
  writeLedger(account, ledger);
  return burned;
}

export function buyCloth(account: string, balance: bigint, id: string, now = new Date()) {
  const cloth = clothById(id);
  if (!cloth) return false;
  if (!clothReleased(id, now)) return false;
  if (cloth.cost > 0 && !rareOnOffer(id, now)) return false;
  const ledger = readLedger(account);
  if (ledger.owned.includes(id)) {
    ledger.equipped = id;
    writeLedger(account, ledger);
    return true;
  }
  if (cloth.cost > 0 && !CAPES_TRY && !pay(account, balance, cloth.cost)) return false;
  const next = readLedger(account);
  next.owned = [...next.owned, id];
  next.equipped = id;
  writeLedger(account, next);
  return true;
}

export function equipCloth(account: string, id: string | null) {
  const ledger = readLedger(account);
  if (id && (!ledger.owned.includes(id) || !clothReleased(id))) return;
  ledger.equipped = id;
  writeLedger(account, ledger);
}

export const ROAD_COST = 10;

export function grantFog(account: string, id: string, cost: number) {
  const ledger = readLedger(account);
  if (!ledger.opened.includes(id)) ledger.opened = [...ledger.opened, id];
  ledger.burned += cost / 2;
  writeLedger(account, ledger);
  return true;
}

export function grantCloth(account: string, id: string, cost: number, now = new Date()) {
  const cloth = clothById(id);
  if (!cloth || !clothReleased(id, now)) return false;
  const ledger = readLedger(account);
  if (!ledger.owned.includes(id)) ledger.owned = [...ledger.owned, id];
  ledger.equipped = id;
  ledger.burned += cost / 2;
  writeLedger(account, ledger);
  return true;
}

export function grantAllFogs(account: string, cost: number) {
  const ledger = readLedger(account);
  ledger.allFogs = true;
  ledger.burned += cost / 2;
  writeLedger(account, ledger);
  return true;
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
