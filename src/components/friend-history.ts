import type { PublicClient } from "viem";

/** Robinhood rejects one eth_getLogs once the span passes 10 million blocks. */
const MAX_RANGE = 9_000_000n;
const MIN_RANGE = 50_000n;

type LogArgs = {
  fromBlock?: bigint | string;
  toBlock?: bigint | string;
};

/** Split an owner-filtered Friend history query into ranges the public RPC will accept. */
export function withOwnedHistory<T extends PublicClient>(client: T): T {
  const getLogs = client.getLogs.bind(client);
  return Object.assign(client, {
    getLogs: async (args: Parameters<T["getLogs"]>[0]) => {
      const call = args as LogArgs;
      const head = typeof call.toBlock === "bigint" ? call.toBlock : await client.getBlockNumber();
      const from = typeof call.fromBlock === "bigint" ? call.fromBlock : 0n;
      if (head < from || head - from < MAX_RANGE) return getLogs(args);
      const logs = [];
      for (let start = from; start <= head; start += MAX_RANGE) {
        const end = start + MAX_RANGE - 1n;
        const to = end > head ? head : end;
        logs.push(...(await rangeLogs(getLogs, args, start, to)));
      }
      return logs;
    },
  });
}

async function rangeLogs(
  getLogs: PublicClient["getLogs"],
  args: Parameters<PublicClient["getLogs"]>[0],
  from: bigint,
  to: bigint,
): Promise<Awaited<ReturnType<PublicClient["getLogs"]>>> {
  try {
    return await getLogs({ ...args, fromBlock: from, toBlock: to } as Parameters<PublicClient["getLogs"]>[0]);
  } catch (cause) {
    if (to - from < MIN_RANGE || !rangeRejected(cause)) throw cause;
    const mid = from + (to - from) / 2n;
    const left = await rangeLogs(getLogs, args, from, mid);
    const right = mid < to ? await rangeLogs(getLogs, args, mid + 1n, to) : [];
    return [...left, ...right];
  }
}

function rangeRejected(cause: unknown) {
  const text = `${cause instanceof Error ? cause.message : ""} ${cause instanceof Error && cause.cause instanceof Error ? cause.cause.message : ""}`;
  return /10[,_ ]?000[,_ ]?000|block range|too many blocks|query returned more than|exceed|response size|log query/i.test(text);
}
