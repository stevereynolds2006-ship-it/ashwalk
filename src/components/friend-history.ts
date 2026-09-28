import type { PublicClient } from "viem";

const GENERATIONS = "0x14C49e6118F46525dE9ab41a51cBAA3c6EBF181D";
const ZERO = "0x0000000000000000000000000000000000000000";

type LogArgs = {
  address?: string;
  args?: { to?: string; from?: string };
  toBlock?: bigint;
};

/** The public Robinhood RPC rejects full-range owner filters. Blockscout already has them. */
export function withOwnedHistory<T extends PublicClient>(client: T): T {
  const getLogs = client.getLogs.bind(client);
  return Object.assign(client, {
    getLogs: async (args: Parameters<T["getLogs"]>[0]) => {
      const call = args as LogArgs;
      const to = call.args?.to;
      const from = call.args?.from;
      const onGenerations = call.address?.toLowerCase() === GENERATIONS.toLowerCase();
      if (!onGenerations || (!to && !from) || (to && from)) return getLogs(args);
      try {
        return await getLogs(args);
      } catch (cause) {
        if (from && !to) return [];
        try {
          const block = typeof call.toBlock === "bigint" ? call.toBlock : await client.getBlockNumber();
          const ids = await heldIds(to!);
          return ids.map((tokenId, logIndex) => ({
            address: GENERATIONS,
            blockNumber: block,
            logIndex,
            removed: false,
            args: { from: ZERO, to, tokenId },
          }));
        } catch {
          throw cause;
        }
      }
    },
  });
}

async function heldIds(account: string) {
  const ids: bigint[] = [];
  let page: Record<string, string> | null = null;
  for (let i = 0; i < 40; i++) {
    const url = new URL(`https://robinhoodchain.blockscout.com/api/v2/tokens/${GENERATIONS}/instances`);
    url.searchParams.set("holder_address_hash", account);
    if (page) {
      for (const [key, value] of Object.entries(page)) url.searchParams.set(key, value);
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error("Explorer history failed.");
    const body = (await response.json()) as {
      items?: { id?: string }[];
      next_page_params?: Record<string, string | number> | null;
    };
    for (const item of body.items ?? []) {
      if (item.id && /^\d+$/.test(item.id)) ids.push(BigInt(item.id));
    }
    if (!body.next_page_params) break;
    page = Object.fromEntries(Object.entries(body.next_page_params).map(([key, value]) => [key, String(value)]));
  }
  return ids;
}
