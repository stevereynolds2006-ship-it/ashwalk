import { useMemo, useState } from "react";
import { createGamePreview, maximumPrize, RF, type ChanceGameDefinition } from "@rarefriends/friendsdk/game";
import { GameHost } from "@rarefriends/friendsdk/runtime";
import { Playfield } from "./Playfield";
import "./ashwalk.css";

/** Free shore needs no wallet. Connecting is only for playing as an owned Friend. */
export function AshwalkDoor({ definition, frameUrl }: { definition: ChanceGameDefinition; frameUrl: string }) {
  const [door, setDoor] = useState<"ask" | "free" | "wallet">("ask");
  const client = useMemo(
    () => createGamePreview(definition, { friendId: 1n, stake: maximumPrize(definition) * 10n, rfBalance: 20n * RF }).client,
    [definition],
  );
  if (door === "wallet") return <GameHost definition={definition} frameUrl={frameUrl} />;
  if (door === "free") {
    return <Playfield friendId={1n} client={client} paused={false} identity="Free walk" />;
  }
  return (
    <main className="ash-door">
      <p className="ash-kicker">Rare Friends · the hanging wood</p>
      <h1>Ashwalk</h1>
      <p>The shore is free. You can walk it with no wallet.</p>
      <div className="ash-actions">
        <button type="button" className="ash-btn" onClick={() => setDoor("free")}>
          Play free
        </button>
        <button type="button" className="ash-btn-ghost" onClick={() => setDoor("wallet")}>
          Connect wallet
        </button>
      </div>
    </main>
  );
}
