import type { GameClient } from "@rarefriends/friendsdk/game";
import { Playfield } from "./Playfield";

/** FriendSDK frame. The host supplies the owned Friend and the ledger. */
export default function AshwalkFrame({
  friendId,
  client,
  paused,
}: {
  friendId: bigint;
  client: GameClient;
  paused: boolean;
}) {
  return (
    <Playfield
      friendId={friendId}
      client={client}
      paused={paused}
      identity="Owned Friend · simulated until a live deployment exists"
    />
  );
}
