import type { PublicClient } from "viem";

/** First Generations block. Nothing before it can be a Friend transfer. */
const DEPLOY_BLOCK = 63_100_099n;
/** Stay far under the public node's 10 million block cap. */
const MAX_RANGE = 200_000n;
const MIN_RANGE = 10_000n;

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
      let from = typeof call.fromBlock === "bigint" ? call.fromBlock : 0n;
      if (from < DEPLOY_BLOCK) from = DEPLOY_BLOCK;
      if (head < from) return [];
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
  return /block range|too many|exceed|response size|log query|timeout|limit|10[,_ ]?000[,_ ]?000/i.test(text);
}
