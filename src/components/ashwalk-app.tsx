import { useMemo, useState } from "react";
import { RF, createGamePreview } from "@rarefriends/friendsdk/game";
import { ASHWALK_GAME } from "../../games/ashwalk/definition";
import { Playfield } from "../../games/ashwalk/Playfield";
import { FriendPicker } from "@/components/friend-picker";

export function AshwalkApp() {
  const [friendId, setFriendId] = useState(1n);
  const [identity, setIdentity] = useState("Preview artwork · Friend #1");
  const [account, setAccount] = useState<string | null>(null);
  const [rareBalance, setRareBalance] = useState<bigint | null>(null);
  const [ledgerRev, setLedgerRev] = useState(0);
  const preview = useMemo(
    () =>
      createGamePreview(ASHWALK_GAME, {
        stake: 30n * RF,
        rfBalance: 6n * RF,
        friendId,
      }),
    [friendId],
  );

  return (
    <Playfield
      friendId={friendId}
      client={preview.client}
      paused={false}
      identity={identity}
      account={account}
      rareBalance={rareBalance}
      onWardrobe={() => setLedgerRev((value) => value + 1)}
      picker={
        <FriendPicker
          friendId={friendId}
          ledgerRev={ledgerRev}
          onWallet={(nextAccount, balance) => {
            setAccount(nextAccount);
            setRareBalance(balance);
          }}
          onPick={(id, label) => {
            setFriendId(id);
            setIdentity(label);
            try {
              localStorage.setItem("ashwalk.friend", id.toString());
            } catch {
              /* private mode */
            }
          }}
        />
      }
    />
  );
}
