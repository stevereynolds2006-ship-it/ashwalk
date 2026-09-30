import { useEffect, useRef, type MutableRefObject } from "react";
import { createFriendReader, type GenerationSprites } from "@rarefriends/friendsdk/sprites";
import { useP2PRoom, type PeerInfo } from "../../src/lib/multiplayer/index";
import { applyShared, snapshotWorld, type Sim } from "./sim";
import { asPose, isRecord, type Ghost } from "./net";

export type NetApi = {
  selfId: string;
  broadcast: (data: unknown) => void;
  send: (data: unknown, peerId?: string) => void;
  peerCount: () => number;
};

type Phase = "title" | "levels" | "real" | "lobby" | "play" | "pause" | "lives" | "rite" | "clear" | "clothes" | "knit";

function inRun(phase: Phase) {
  return phase === "play" || phase === "pause" || phase === "lives" || phase === "rite" || phase === "clear";
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function crumbList(value: unknown) {
  if (!Array.isArray(value)) return [];
  const out: { id: string; timer: number; fall: number; gone: boolean }[] = [];
  for (const row of value) {
    if (!isRecord(row) || typeof row.id !== "string") continue;
    out.push({
      id: row.id,
      timer: typeof row.timer === "number" ? row.timer : 0,
      fall: typeof row.fall === "number" ? row.fall : 0,
      gone: row.gone === true,
    });
  }
  return out;
}

export function Online({
  code,
  name,
  host,
  friendId,
  phaseRef,
  simRef,
  pickRef,
  ghostsRef,
  apiRef,
  hostIdRef,
  onPeers,
  onJoined,
  onPick,
  onBegin,
  onLobby,
}: {
  code: string;
  name: string;
  host: boolean;
  friendId: string;
  phaseRef: MutableRefObject<Phase>;
  simRef: MutableRefObject<Sim>;
  pickRef: MutableRefObject<string>;
  ghostsRef: MutableRefObject<Map<string, Ghost>>;
  apiRef: MutableRefObject<NetApi | null>;
  hostIdRef: MutableRefObject<string>;
  onPeers: (peers: PeerInfo[]) => void;
  onJoined: (joined: boolean) => void;
  onPick: (level: string) => void;
  onBegin: (level: string) => void;
  onLobby: () => void;
}) {
  const room = useP2PRoom({ room: `ash-${code}`.slice(0, 64), name });
  const peersRef = useRef<PeerInfo[]>([]);
  const seenRef = useRef(new Set<string>());
  const spritesRef = useRef(new Map<string, GenerationSprites | null>());
  const loadingRef = useRef(new Set<string>());
  const friendsRef = useRef(new Map<string, string>());
  const onPeersRef = useRef(onPeers);
  const onJoinedRef = useRef(onJoined);
  const onPickRef = useRef(onPick);
  const onBeginRef = useRef(onBegin);
  const onLobbyRef = useRef(onLobby);
  const friendRef = useRef(friendId);
  onPeersRef.current = onPeers;
  onJoinedRef.current = onJoined;
  onPickRef.current = onPick;
  onBeginRef.current = onBegin;
  onLobbyRef.current = onLobby;
  friendRef.current = friendId;
  peersRef.current = room.peers;
  if (host) hostIdRef.current = room.selfId;

  apiRef.current = {
    selfId: room.selfId,
    broadcast: room.broadcast,
    send: room.send,
    peerCount: () => peersRef.current.length,
  };

  useEffect(() => {
    onPeersRef.current(room.peers);
  }, [room.peers]);

  useEffect(() => {
    if (room.joined) onJoinedRef.current(true);
  }, [room.joined]);

  useEffect(() => {
    if (!room.joined) return;
    const announce = () => {
      room.send({ k: "who", friend: friendRef.current });
      if (host) {
        room.send({ k: "host", id: room.selfId });
        room.send({ k: "pick", level: pickRef.current });
      }
    };
    announce();
    const timer = window.setInterval(announce, 3000);
    return () => window.clearInterval(timer);
  }, [room.joined, room.send, room.selfId, host, pickRef]);

  useEffect(() => {
    if (!room.joined) return;
    const known = seenRef.current;
    for (const peer of room.peers) {
      if (known.has(peer.id)) continue;
      const existing = [room.selfId, ...known];
      let smallest = existing[0] ?? room.selfId;
      for (const candidate of existing) if (candidate < smallest) smallest = candidate;
      if (smallest === room.selfId) {
        const sim = simRef.current;
        const started = inRun(phaseRef.current);
        room.send(
          {
            k: "snap",
            hostId: hostIdRef.current,
            level: started ? sim.level.id : pickRef.current,
            started,
            ...snapshotWorld(sim),
          },
          peer.id,
        );
      }
    }
    const alive = new Set(room.peers.map((peer) => peer.id));
    seenRef.current = alive;
    for (const id of [...ghostsRef.current.keys()]) {
      if (!alive.has(id)) ghostsRef.current.delete(id);
    }
  }, [room.peers, room.joined, room.selfId, room.send, ghostsRef, hostIdRef, phaseRef, pickRef, simRef]);

  useEffect(() => {
    const ensureSprite = (friend: string) => {
      if (!/^\d+$/.test(friend)) return;
      if (spritesRef.current.has(friend) || loadingRef.current.has(friend)) return;
      loadingRef.current.add(friend);
      void createFriendReader()
        .read(BigInt(friend))
        .then((sprites) => {
          spritesRef.current.set(friend, sprites);
          for (const ghost of ghostsRef.current.values()) {
            if (ghost.friendId === friend) ghost.sprites = sprites;
          }
        })
        .catch(() => {
          spritesRef.current.set(friend, null);
        });
    };

    return room.onMessage((from, data) => {
      const pose = asPose(data);
      if (pose) {
        const peer = peersRef.current.find((item) => item.id === from);
        const friend = friendsRef.current.get(from) ?? "";
        let ghost = ghostsRef.current.get(from);
        if (!ghost) {
          ghost = {
            id: from,
            name: peer?.name ?? "Friend",
            friendId: friend,
            x: pose.x,
            y: pose.y,
            tx: pose.x,
            ty: pose.y,
            facing: pose.f,
            walking: pose.w === 1,
            anim: pose.a,
            dead: pose.d,
            won: pose.n === 1,
            sprites: friend ? (spritesRef.current.get(friend) ?? null) : null,
          };
          ghostsRef.current.set(from, ghost);
          if (friend) ensureSprite(friend);
        } else {
          ghost.tx = pose.x;
          ghost.ty = pose.y;
          ghost.facing = pose.f;
          ghost.walking = pose.w === 1;
          ghost.anim = pose.a;
          ghost.dead = pose.d;
          ghost.won = pose.n === 1;
          if (peer) ghost.name = peer.name;
        }
        if (inRun(phaseRef.current)) {
          applyShared(simRef.current, {
            rope: pose.r,
            rope2: pose.r2,
            rope3: pose.r3,
            saved: pose.sv,
            moths: pose.m,
            beacons: pose.b,
            crumbles: pose.c.map(([id, fall, gone]) => ({
              id,
              timer: fall > 0 || gone === 1 ? 1 : 0,
              fall,
              gone: gone === 1,
            })),
          });
        }
        return;
      }
      if (!isRecord(data) || typeof data.k !== "string") return;
      if (data.k === "who" && typeof data.friend === "string") {
        friendsRef.current.set(from, data.friend);
        ensureSprite(data.friend);
        const ghost = ghostsRef.current.get(from);
        if (ghost) {
          ghost.friendId = data.friend;
          ghost.sprites = spritesRef.current.get(data.friend) ?? ghost.sprites;
        }
        return;
      }
      if (data.k === "moth" && typeof data.id === "string" && inRun(phaseRef.current)) {
        simRef.current.moths.add(data.id);
        return;
      }
      if (data.k === "beacon" && typeof data.id === "string" && inRun(phaseRef.current)) {
        simRef.current.beacons.add(data.id);
        return;
      }
      if (data.k === "pull" && inRun(phaseRef.current)) {
        simRef.current.pulling = true;
        return;
      }
      if (data.k === "host" && typeof data.id === "string") {
        hostIdRef.current = data.id;
        return;
      }
      if (data.k === "pick" && typeof data.level === "string") {
        if (!host) onPickRef.current(data.level);
        return;
      }
      if (data.k === "begin" && typeof data.level === "string") {
        const leader = hostIdRef.current;
        if (leader && from !== leader) return;
        onBeginRef.current(data.level);
        return;
      }
      if (data.k === "lobby") {
        const leader = hostIdRef.current;
        if (leader && from !== leader) return;
        onLobbyRef.current();
        return;
      }
      if (data.k === "snap") {
        const level = typeof data.level === "string" ? data.level : "";
        const started = data.started === true;
        if (typeof data.hostId === "string" && data.hostId) hostIdRef.current = data.hostId;
        if (!started) {
          if (!host && level) onPickRef.current(level);
          return;
        }
        if (!inRun(phaseRef.current) && level) onBeginRef.current(level);
        const sim = simRef.current;
        if (!level || sim.level.id === level) {
          applyShared(sim, {
            rope: typeof data.rope === "number" ? data.rope : undefined,
            rope2: typeof data.rope2 === "number" ? data.rope2 : undefined,
            rope3: typeof data.rope3 === "number" ? data.rope3 : undefined,
            saved: typeof data.saved === "number" ? data.saved : undefined,
            pulling: data.pulling === true,
            moths: stringList(data.moths),
            beacons: stringList(data.beacons),
            crumbles: crumbList(data.crumbles),
          });
        }
      }
    });
  }, [room.onMessage, ghostsRef, host, hostIdRef, phaseRef, simRef]);

  return null;
}
