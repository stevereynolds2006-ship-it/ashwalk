# Ashwalk

A Limbo-style fog platformer for the Rare Friends vibeathon. You play as your own Rare Friend.

FriendSDK v0.1.2. The economy is simulated. Starting a walk and opening fogs spend Rare coins from the connected wallet balance shown in the game. That spend is stored on this device. It is not an on-chain transfer.

## Run

You need Node.js 22 or newer, and a browser wallet that holds a hardwired Generations NFT (generation 1 or higher) on Robinhood mainnet.

```bash
git clone https://github.com/stevereynolds2006-ship-it/ashwalk.git
cd ashwalk
npm ci
npm run dev
```

Open the printed URL.

## Play

- A and D, or the arrow keys, move. W, up, or space jumps. S drops through a cage. E pulls, lights a bell, or buys a lantern.
- On a phone, use the buttons along the bottom.
- The shore is free. You start that walk with 5 coins. Beating a fog opens the next one, and every fog after the shore costs 5 Rare coins. 20 Rare coins opens every fog.
- A death burns half the coins you are carrying. Three lives, then you return to the menu. The shore is still free.
- Clothes are on the start menu. One rare piece changes each Monday (UTC).

Keyboard, touch, mute, and reduced motion are in the game. With friends, one person opens a room code and the other joins it.
