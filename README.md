MapleClaude TS (Omega Project)

A TypeScript reimplementation of the MapleStory v83-era client, built to run in both the browser and Node.js. It renders with PixiJS, speaks the original binary packet protocol over WebSockets, and reads game assets (UI, maps, characters, items, skills) from WZ data.

> This is a personal reverse-engineering / reimplementation project, not affiliated with or endorsed by Nexon. It targets the legacy v83 client/server protocol.
>
> This project is AI-assisted and built for **educational purposes only** (reverse engineering, protocol/network programming, and game client architecture study). It is not intended for distribution or commercial use.

## What's here

- **Browser client** (`src/main.ts`, `index.html`) — runs in a canvas via Vite + PixiJS, connects to a login server through a WebSocket↔TCP proxy (since browsers can't open raw TCP sockets).
- **Node client** (`src/Program.ts`) — a headless/Node entry point using the same `MapleClaudeGame` core, connecting directly via `ws`.
- **Game core** (`src/MapleClaudeGame.ts`) — wires together the stage director, network session, packet handlers, WZ asset loading, audio, and cursor.

## Architecture

```
src/
├── app/            # PixiJS application bootstrap, stage director
├── character/       # Avatars, mobs, NPCs, pets, skills, drops, damage numbers, look/render logic
├── context/         # Global WvsContext-style shared state
├── debug/           # In-client debug console/launcher
├── domain/           # Plain data models (Account, CharacterData, InventoryItem, WorldInfo, ...)
├── localization/     # String pool / name / list services (from WZ string data)
├── map/               # Field/map rendering, footholds, portals, minimap, camera
├── net/
│   ├── crypto/        # MapleStory packet ciphers (Shanda, AES, IG cipher)
│   ├── handlers/       # Incoming packet handlers (Login, Field, CashShop, ITC, MapleTV, Tournament, Event, BattleRecord)
│   ├── packet/          # In/Out packet readers/writers, move-path/attack encoders & decoders, opcodes
│   ├── senders/          # Outgoing packet builders (login, in-game actions)
│   └── session/           # WebSocket session, handshake, packet routing, channel migration
├── platform/            # Clipboard, custom cursor
├── render/                # Sprite/animation rendering, WZ texture loading, audio playback
├── settings/               # Input system, persisted user settings
├── stages/                  # Screen flow: Splash, Login, Pin, World/Race select, Char select/creation, Game, Cash Shop
├── ui/                        # Widget toolkit (windows, buttons, sliders, overlays, context menus, etc.)
└── util/                       # Misc helpers
```

Supporting content at the repo root:

- `tests/` — Vitest unit tests mirroring the `src/` structure (crypto, packet codecs, movement, character logic, field scenes, stages, session handshake/routing).
- `ida_sse*.ps1` — batch of PowerShell scripts driving IDA Pro sessions, used for reverse-engineering the original client binary (extracting packet handler addresses, UI coordinates, WZ paths, etc.).
- `chatbar-test/` — Playwright screenshot captures from automated UI testing of the login → char select → in-game chat flow.
- `omega_backup/`, `ibdata1_backup` — raw MySQL/MariaDB data files, presumably a snapshot of a private server database.
- `opencode.json` — config for the [OpenCode](https://opencode.ai) CLI, including an IDA Pro MCP server integration.

## Tech stack

| Purpose | Library |
|---|---|
| Rendering | [pixi.js](https://pixijs.com/) 8.x |
| Networking | `ws` (Node WebSocket client/server) |
| Packet crypto | `aes-js`, custom Shanda/IG cipher implementations |
| Asset decompression | `pako` (zlib) |
| Build/dev | Vite 7, TypeScript 5.7, `tsx` |
| Testing | Vitest, Playwright |

## Getting started

```bash
npm install
```

**Browser client:**
```bash
npm run dev:browser
```
Runs Vite. Connect params are read from the URL query string, e.g.:
```
?host=127.0.0.1&port=8484&wzDir=/wz_client&wsProxy=ws://127.0.0.1:8580
```

**Node client:**
```bash
npm run dev
```
Configured via environment variables:
- `MAPLECLAUDE_LOGIN_HOST` / `MAPLECLAUDE_LOGIN_PORT`
- `MAPLECLAUDE_WZ_DIR` (or `MAPLECLAUDE_NX_DIR`)

**WebSocket↔TCP proxy** (required for the browser client to reach a raw TCP login/game server):
```bash
npm run proxy
```

**Tests:**
```bash
npm test          # single run
npm run test:watch
```

**Production build:**
```bash
npm run build          # Node build (tsc)
npm run build:browser  # browser bundle (vite build)
```

## Requirements

- Node.js
- A v83-compatible server emulator (e.g. Cosmic) to connect to
- Your own WZ/NX game assets, pointed to via `wzDir` — **not included in this repo**

## Notes

- `.gitignore` excludes `node_modules`, `dist`, WZ/NX asset directories, and local tooling config (`.agents`, `.claude`, `.codex`, `ida/`, `/tools`, `/docs`, `*.py`, `*.md`, etc.), so several scripts referenced by `package.json` (like `tools/proxy-server.ts`) live locally but aren't committed here.
- The repo currently has no license or repo-level description set on GitHub.
