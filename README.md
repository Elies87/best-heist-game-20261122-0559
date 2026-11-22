# best-heist-game-20261122-0559

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Elies87/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Elies87/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

**The Night Ledger** — an original top-down stealth heist game that plays
offline in a desktop browser from static files. You are Wren, a thief inside
the Meridian Museum at closing time: cross three floors of galleries,
archives and a vault chamber, read the guards' flashlight cones and the
cameras' sweeps, and get out to the van before the alarm meter hits 100%.

- Guards patrol, scan, investigate noises and chase what they fully see;
  suspicion fills slower while you sneak or stand in shadow.
- Cameras sweep teal cones that heat the alarm; an EMP burst (Q) or a wall
  panel takes them dark — the EMP's noise costs you alarm.
- A tossed coin (F or click) pulls guards off their patrol; locked doors
  pick open slowly with E; laser grids blink on a cycle and bite.
- Every floor has one main target (the Sun Mask, the Tide Pearl, the Night
  Ledger itself) plus optional loot for score and a floor rating — finish
  unseen for GHOST.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no
network: `game/index.html` and its ES modules are the whole game. Controls:
WASD/arrows move, Shift sneaks, hold E to take loot / pick locks / kill
cameras, Q fires the EMP, F or a click tosses a coin, P pauses, M mutes,
R retries a floor.

`main.ts` is the hand-in program for the bounty: it copies `game/` and
`screenshots/` to the output directory and writes `dossier.json` with the
vendored library in `vendor/makefun-game.ts`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=elies87&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
