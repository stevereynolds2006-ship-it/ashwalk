import { defineChanceGame, RF } from "@rarefriends/friendsdk/game";

/** Simulated lantern rite. Weights total 10_000 bps. Expected return is under the 1 RF price. */
export const ASHWALK_GAME = defineChanceGame({
  name: "Ashwalk",
  consumable: "Lantern",
  price: RF,
  outcomes: [
    { name: "Ash mote", chanceBps: 6200, reward: (25n * RF) / 100n },
    { name: "Cage splinter", chanceBps: 2800, reward: (8n * RF) / 10n },
    { name: "White moth", chanceBps: 1000, reward: 3n * RF },
  ],
});
