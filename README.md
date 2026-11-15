# Emberkeep

[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/denyafr14/makefun-best-game-01/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/denyafr14/makefun-best-game-01/reward.svg)](https://make.fun/bounty/best-game-01)

**Emberkeep** — a top-down arena defence game for the [best-game-01](https://make.fun/bounty/best-game-01) bounty. You are the keeper of a hearth in a night garden. Waves of shadows come for its flame: slay them, gather ember shards, and choose a blessing between waves. Survive all 10 waves and the dawn returns.

## How to play

- **Move** — WASD or arrow keys
- **Aim** — mouse; **hold click** to fire
- **Dash** — Space (brief burst of speed, recharges)
- **Pause** — P or Esc; **mute** — M; **restart** — R on the end screens
- Shadows that reach the hearth burn its flame; shadows that touch you hurt you. If the flame or you fall, the dark wins.
- Between waves, pick one of three blessings (faster fire, more damage, extra bullets, piercing shots, hearth repairs, and more). Shards you collect also add to your score.

## Play it

Serve `game/` with any static server — for example `node serve.ts`, then open http://localhost:8080 — and it plays offline in desktop Chrome with no network request. All art is drawn in canvas code and all sound is synthesized with WebAudio; there are no external files.

## Layout

- `game/index.html` — the page; `game/src/main.js` — boot and the game loop
- `game/src/world.js` — state, waves, enemies, bullets, shards, upgrades
- `game/src/render.js` — all canvas drawing, HUD and menus
- `game/src/config.js` — tuning numbers and palette
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesized WebAudio sounds and music
- `game/src/random.js` — seeded generator (deterministic `?seed=` runs)
- `game/src/shots.js` — deterministic screenshot scenes (`?shot=start|play|upgrade|end`)

Screenshots are real renders of the game staged with `?shot=` and a fixed seed. The entrypoint `main.ts` copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with `vendor/makefun-game.ts`.

## License

MIT — see [LICENSE](LICENSE).
