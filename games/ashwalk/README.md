# Ashwalk

A Limbo-like fog platformer for the Rare Friends vibeathon. The player is a Generations Friend: the original 16×16 chain bitmap, drawn pixel-for-pixel with the FriendSDK white halo. The wood around them is silhouette, mist, and hanging cages.

FriendSDK **v0.1.2**. Economy is **simulated**. There is no live deployment and no wallet transaction in this build.

## Run in this app

The TanStack app on the site root is the playable build. Enter a Friend number to load that token’s public artwork from Robinhood Chain, or connect a wallet that holds a hardwired Generations NFT (generation 1+) and pick one you own.

## Run as a FriendSDK game

From a project that depends on `@rarefriends/friendsdk`:

```bash
npx friendsdk dev ./games/ashwalk
npx friendsdk check ./games/ashwalk
```

`games/ashwalk/index.tsx` is the frame component (`friendId`, `client`, `paused`). `host.css` widens the frame to 16:9.

## Controls

- A / left arrow, or the Left button: move left
- D / right arrow, or the Right button: move right
- W / up arrow / space / Jump: jump (hold for a higher leap)
- S / down arrow / Down: drop through a cage or thin ledge
- E / Enter / Use: pull the rope, light a bell, or buy a lantern
- F, or Buy light: a flashlight costs 5 coins and throws a beam through the dark
- Stand on a plank, cage, or ledge too long and it falls. It comes back after 4 seconds, so you can cross again.
- The coins you spend are the Rare coins in the connected wallet. 5 Rare coins starts a walk and does not give you any. Collect coins on the board. 20 Rare coins opens every fog. Three lives. A death burns half the coins you collected on that walk.
- Esc: pause

Keyboard and touch are both supported. Hold buttons ignore the phone’s long-press magnifier so a walk does not break mid-press. A score starts with the first touch and changes with the scene: the shore, the cages, the white, and each other fog. The Sound button mutes the score and the cues. Motion can be reduced; the game also follows `prefers-reduced-motion`.

## Rules

Four fogs. Each one is a different challenge, and each can be walked alone or with friends who share a four-letter code.

- **The shore.** The board is a little brighter than pitch black. Lanterns along the walk cost 1 coin and bring the normal light back for 10 seconds, then the dark returns. A flashlight still cuts a white beam. Cross the hanging cages and the white. Pull the rope on the second cage to lower the third. A spider hangs over the cages and others walk the wood. A crow in the wind is fatal. Thorns under the rotten planks are fatal. After the wind, a gap opens onto the lock: light three bells, one of them up on the ledges, and the plate will open the last gate. The door stays shut until every bell is lit. Checkpoints remember the last safe ground. With friends, the rope, the coins, and the bells are shared.
- **The latch.** Plates open gates, then the gates close. Cross before the latch runs out. A friend who stays on the plate keeps that gate up. The last plate stays asleep until the bell beside it is lit.
- **The gale.** One wind shoves every body. Jump when it is behind you. Friends feel the same gust. The wind dies on the last roof: light three bells, then the plate opens the way out.
- **The choir.** Three bells on three paths. The fog is a little brighter. The high door stays shut until the last bell is lit. Friends can split up; a lit bell stays lit for everyone.
- **The sign.** The roofs are nearly black, like the shore, and there is no grass on them. Lanterns cost 1 coin and last 10 seconds. Light three letters, then the plate opens the gate. When that gate shuts behind you, the last roof cracks and drops you into the drain. Rats and dead-eyed turtles walk the sewer. Climb back out.
- **The antler.** Opens after the sign. Light three bells. The thing under the mound climbs out behind you and hunts. It is slower than a full run, and a high jump can clear it. Its arms swing as it runs. Lead it into the cage and stand on the plate. The door stays shut until the cage holds.

A crow in the wind is fatal. Falling into the white below a wood is fatal. Checkpoints remember the last safe ground.

Friends connect directly. The fog trusts everyone in the room — it is for people who chose to walk together, not a ranked race. A strict network can block the line; the room says so.

## Lantern rite (simulated)

| | |
| --- | --- |
| Consumable | Lantern |
| Price | 1 RF (`1000000000000000000` base units) |
| Ash mote | 62% · returns 0.25 RF |
| Cage splinter | 28% · returns 0.80 RF |
| White moth | 10% · returns 3.00 RF |

Weights total 10,000 bps. Expected return is about 0.68 RF per 1 RF spent, so the rite is a sink. The preview ledger starts at 6 RF with 30 RF of stake. Opening a lantern buys if needed, calls `play` + `settle`, then `redeem`s the prize straight back to the simulated balance. Label this as simulated everywhere. Do not describe it as a mainnet burn.

## Artwork

Friend pixels come from the Generations registry via `createFriendReader()` (`@rarefriends/friendsdk/sprites`). They are not recolored. Black pixel, bone-white halo, matching the SDK world view. Coins use that same bone-and-black token. World silhouettes, including the spiders, are original to this game. Cues use `createFriendSoundKit()`. The scene score is synthesized in the browser: no samples, and it stays quiet until a touch.
