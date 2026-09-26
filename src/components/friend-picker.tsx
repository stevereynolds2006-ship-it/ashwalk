import { useEffect, useState } from "react";
import {
  createFriendPublicClient,
  createFriendWalletSession,
  type FriendWalletSession,
  type FriendWalletSnapshot,
} from "@rarefriends/friendsdk/wallet";
import { readOwnedFriends, type OwnedFriend } from "@rarefriends/friendsdk/owned";
import { readGenerationEligibility } from "@rarefriends/friendsdk/identity";
import { formatRareCoins, spendable } from "../../games/ashwalk/wardrobe";

export function FriendPicker({
  friendId,
  onPick,
  onWallet,
  ledgerRev = 0,
}: {
  friendId: bigint;
  onPick: (id: bigint, identity: string) => void;
  onWallet?: (account: string | null, balance: bigint | null) => void;
  ledgerRev?: number;
}) {
  const [text, setText] = useState(friendId.toString());
  const [session, setSession] = useState<FriendWalletSession | null>(null);
  const [snap, setSnap] = useState<FriendWalletSnapshot | null>(null);
  const [friends, setFriends] = useState<readonly OwnedFriend[]>([]);
  const [hidden, setHidden] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rareCoins, setRareCoins] = useState<bigint | null>(null);
  const [rareCoinsError, setRareCoinsError] = useState("");
  void ledgerRev;

  useEffect(() => {
    const wallet = createFriendWalletSession();
    setSession(wallet);
    setSnap(wallet.getSnapshot());
    const stop = wallet.subscribe(() => setSnap(wallet.getSnapshot()));
    return () => {
      stop();
      wallet.dispose();
    };
  }, []);

  useEffect(() => {
    setText(friendId.toString());
  }, [friendId]);

  useEffect(() => {
    if (!snap || snap.status !== "connected" || !snap.account) {
      setRareCoins(null);
      setRareCoinsError("");
      onWallet?.(null, null);
      return;
    }
    const account = snap.account;
    const revision = snap.revision;
    let cancel = false;
    setBusy(true);
    setError("");
    const client = createFriendPublicClient();
    void readOwnedFriends(client, account)
      .then((result) => {
        if (cancel) return;
        setFriends(result.friends);
        setHidden(result.hiddenCount);
      })
      .catch((cause: unknown) => {
        if (!cancel) setError(cause instanceof Error ? cause.message : "Could not list Friends.");
      })
      .finally(() => {
        if (!cancel) setBusy(false);
      });
    void client
      .readContract({
        address: RF_TOKEN,
        abi: RF_BALANCE_ABI,
        functionName: "balanceOf",
        args: [account],
      })
      .then((value) => {
        if (!cancel) {
          setRareCoins(value);
          setRareCoinsError("");
          onWallet?.(account, value);
        }
      })
      .catch(() => {
        if (!cancel) setRareCoinsError("Rare coins could not be read.");
      });
    return () => {
      cancel = true;
      void revision;
    };
  }, [snap?.status, snap?.account, snap?.revision]);

  function commitText(value: string) {
    if (!/^[0-9]+$/.test(value)) return;
    try {
      const id = BigInt(value);
      if (id < 1n) return;
      onPick(id, `Preview artwork · Friend #${id.toString()}`);
    } catch {
      setError("That Friend number is not valid.");
    }
  }

  async function choose(friend: OwnedFriend) {
    if (!snap?.account || !session) return;
    setBusy(true);
    setError("");
    try {
      const client = createFriendPublicClient();
      const eligibility = await readGenerationEligibility(client, friend.id, snap.account);
      if (!eligibility.eligible) {
        setError(
          eligibility.hardwired
            ? "That Friend is not held by the connected wallet."
            : "That token is not a hardwired Generations Friend.",
        );
        return;
      }
      onPick(
        friend.id,
        `Owned · generation ${eligibility.generation} · simulated rewards`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not verify that Friend.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="ash-kicker" htmlFor="friend-number">
        Friend number
      </label>
      <div className="ash-row">
        <input
          id="friend-number"
          inputMode="numeric"
          autoComplete="off"
          suppressHydrationWarning
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            commitText(event.target.value);
          }}
        />
      </div>
      <p className="ash-note">
        Any number loads that Friend’s public pixels from Robinhood. Owning one is only required for
        the wallet path.
      </p>
      {snap?.status === "connected" && snap.account ? (
        <div>
          <p className="ash-note">
            {snap.account.slice(0, 6)}…{snap.account.slice(-4)}
            {busy ? " · looking up Friends" : ` · ${friends.length} owned`}
          </p>
          <p className="ash-note">
            {rareCoinsError
              ? rareCoinsError
              : rareCoins == null
                ? "Reading Rare coins…"
                : `You have ${formatRareCoins(spendable(rareCoins, snap.account) ?? 0n)} Rare coins.`}
          </p>
          <div className="ash-friends">
            {friends.map((friend) => (
              <button
                key={friend.id.toString()}
                type="button"
                className="ash-friend"
                aria-current={friend.id === friendId}
                disabled={busy}
                onClick={() => void choose(friend)}
              >
                <span>#{friend.id.toString()}</span>
                <span>Gen {friend.generation}</span>
              </button>
            ))}
          </div>
          {hidden > 0 && <p className="ash-note">{hidden} more could not be listed.</p>}
          <button type="button" className="ash-btn-ghost" onClick={() => session?.disconnect()}>
            Disconnect
          </button>
        </div>
      ) : (
        <div className="ash-actions">
          {snap?.status === "wrong-network" ? (
            <button type="button" className="ash-btn-ghost" onClick={() => void session?.switchNetwork()}>
              Switch to Robinhood
            </button>
          ) : (
            <button
              type="button"
              className="ash-btn-ghost"
              disabled={!session || snap?.status === "connecting" || snap?.status === "unavailable"}
              onClick={() => void session?.connect().catch((cause: unknown) => {
                setError(cause instanceof Error ? cause.message : "Wallet connection failed.");
              })}
            >
              {snap?.status === "unavailable"
                ? "No wallet in this browser"
                : snap?.status === "connecting"
                  ? "Connecting…"
                  : "Use a Friend I own"}
            </button>
          )}
        </div>
      )}
      {snap?.status === "unavailable" && (
        <p className="ash-note">Open this in a Robinhood wallet to pick a Friend you own. A number works here too.</p>
      )}
      {error && (
        <p className="ash-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const RF_TOKEN = "0x0779369854d3EcdEA927206718FFD7730C67B71f" as const;
const RF_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
] as const;

