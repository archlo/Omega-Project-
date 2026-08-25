MapleClaude TS (Omega Project)

A TypeScript reimplementation of the MapleStory **v95** client, built to run in both the browser and Node.js. It renders with PixiJS, speaks the original binary packet protocol over WebSockets, and reads game assets (UI, maps, characters, items, skills) from WZ data.

> **Target version: GMS v95.** All opcodes, packet layouts, UI geometry, formulas and constants are derived from the original v95 client binary (IDA database) and its WZ assets — not from newer versions and not invented.
>
> This is a personal reverse-engineering / reimplementation project, not affiliated with or endorsed by Nexon. It pairs with our own v95-compatible server emulator (see the server repo).
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

## Not yet implemented / known gaps

Compiled from the full OG-vs-TS audits (all ~1048 original-client classes cross-referenced against `src/`). Everything below is documented from IDB/WZ decompiles — nothing here is guessed. Items marked **no data source** can never trigger until the server sends the field or this WZ set carries it; they were deliberately not invented.

### Protocol / packet layer
- Remote-character pet loop in `UserEnterField` is stubbed (`CPet::Init` body decode TODO) — non-blocking today since our server encodes no pets.
- `CPetTemplate` WZ interaction / food-reaction flavor text unported (no `CPetTemplate` reader) — pet action-command bytes decode correctly, reactions are generic success/fail animations.
- Full `SecondaryStat` remote two-state tail edge cases beyond the ported skip table.
- Nexon Passport auth + Nexon Security Module (opcodes 19/20) intentionally N/A — private server authenticates directly.
- Drop/reward tables cover only ~39 hand-authored Victoria Island mobs; other maps' mobs drop nothing until YAMLs are authored.
- Maple Island tutorial field scripts (`go10000`…`go50000` onUserEnter, tutorial portals/NPC chats) are not executed by the server.
- ConsumeCashItemUseRequest dispatcher: only part of OG's ~28-type cash-item switch is wired (karma scissors, vicious hammer, item protector, Vega, megaphones); remaining types unwired.
- Cash shop per-SN purchase-record map not tracked client-side (already-bought limited goods stay visible instead of being hidden).
- Mastery-book usability checks (`IsUsableMasteryBookItem`) and `nSubJob`-gated item checks unported.

### Sound
- Skill sounds: `Skill.img/{id}/attack1..3`, `use`, `hit`, `summoned`, `delayedHit`, `getoff`.
- Remote-player weapon attack sounds (`Weapon.img/{sSfx}/Attack` for other characters).
- Buff activation (`Game.img/Buff`), portal, and UI click sounds.
- BGM is wired for login/cash-shop/map entry; deeper per-event music transitions not done.
- Many numeric StringPool sound/text ids are unresolvable because this `String.wz` set lacks `NoSound.img` — several texts fall back to hardcoded literals decoded by hand.

### Combat / physics parity
- Knockback uses a stagger timer rather than OG's deferred-Impact system (launch is diagonal-correct; functionally close).
- Damage-number vertical offset is hardcoded (-40) instead of `CAvatar::GetHeight()`.
- Local `walk2`/morph stance variants not fully modeled; remote-hit visual parity (mob-hits-character presentation) partial.
- `CSequencedKeyMan`: Double/Triple Stab tap-window shipped; the large per-job finisher table (`Restore`) and Aran/Mihile specialized finishers missing.
- `CParticleEffect` / `CItemEffectManager`: active-effect-item looping shipped; full particle emitter physics and user-state three-layer start/repeat/end effects open.
- `CAnimationDisplayer` backlog: HookingChain, MotionBlur, FireCracker, NewYear, Teslacoil, AbsorbItem-style field effects remain (fade-out projectiles and Chain Lightning subsets shipped).

### UI panels & windows
- `CUIEnchantDlg` (enchant-skill window) not built — enchant-buff scrolls show a notice only.
- Messenger avatars/chat balloons (member packets carry no AvatarLook).
- World map: quest-toggle mob scoring (`ScoreLinkMap`), `npcPos*` quest-state markers, WZ border chrome (Graphics fallback today); hover tooltip partially wired.
- Tooltips: ring image + couple/friend/marriage record matching, bundle karma/NewYearCard/cash-title canvas rows, skill swallow/pet-dead-icon sections, growth dual-set digits.
- MiniMap zoom level (`_mag`) not fed from map `Mag_*` data; battlefield sheep/wolves/partner/marriage icons have no data flow; real 8-direction remote-name edge arrows only cover stalkees.
- Chat target combo uses legacy label names vs the real WZ canvases (`friend`/`association`/`expedition`).
- Option menu video-quality/tremble/minimap/windowed settings stored client-side only (not applied to rendering); button tooltips (StatAuto) not wired.
- Medal window (`CUIMedalQuestInfo`): `/medals` subset shipped; full OG medal layout, worn-medal display, state buttons, series gauges, timer text missing.
- Skill guide (`CWndSkillGuide`): opcode-262 display panel shipped; detailed payload/content unconfirmed.
- Restore-family field re-entry state: several `Restore*` functions (seat/clock/etc.) beyond the ported ones.
- Legacy custom `NpcTalk.ts` panel still constructed (dead code since `CUtilDlgEx` took over script messages — safe to delete).
- Omok / Memory game board logic deliberately skipped (room create/join/leave wired; boards = standalone large features).
- Embedded web window (`CWebWnd`), event/promo browser windows — not applicable/not built.
- Generic control polish: tab-focus cycling (`CDialog::OnKey`) and some `CCtrlEditEx` behaviors unported.

### Field types / subgames
- `CField_Dojang` (Mu Lung Dojo): floor progression, special-arts restriction, monster waves — HUD only.
- `CField_Wedding`: ceremony opcodes (ceremony end/progress/bless effect) beyond the wishlist panel.
- `CField_Battlefield` (PvP): senders exist, no scoreboard/clock display panel.
- `CField_Coconut` / `CField_ContiMove`: ContiMove intentionally not guessed (opcode evidence maps 359–362 to boss timers); Coconut HUD-only.
- Ariant Arena: raw-payload HUD only (exact field layout unconfirmed).

### No data source (blocked by wire/WZ content)
- Per-instance equip trade flags (tradeBlock / quest / only / accountSharable / karma / enchantCategory / epic quality) — neither on the item wire nor in this WZ set's equip info nodes.
- Quest completion by meso demand (`QuestReq` parses no meso requirement).
- Slip/warm footwear tooltip rows (no `preventSlip`/`warm` info fields in this WZ set).
- Broad NPC ambient idle speech — only 2 of 1838 NPCs carry `speak` data; those two resolve through `String.nx/Npc.img`.
- Couple-chair heart overlay asset absent from v95 WZ (pairing logic itself is implemented).
- Passive skill aggregate critical (`PassiveSkillData.nCr`) has no client-side data source — contributes 0.

### Server-side gaps (our companion emulator)
- Character sale create-form fields, admin-shop per-item tail, store-bank item listing tails undecoded — panels show decoded state only, no guessed interactions.
- Monster Carnival summon/skill request buttons (no verified sender exists yet).
- Mocha test runner hangs environment-wide at times; new server tests verified via `tsc` when that happens.

### Environment / tooling
- e2e Playwright suite needs `npm i -D @playwright/test` (currently fails to load).
- `CashCommodityTable` NX-gated test expects >12k Commodity entries; some environments parse 0 from `Etc.nx` (WzPackage existence-check fix landed, env-dependent).
- Several roadmap phases (13–30) are marked "ported, needs browser test" — unit-tested but not visually verified end-to-end.

## Requirements

- Node.js
- A v95-compatible server emulator (e.g. Cosmic) to connect to
- Your own WZ/NX game assets, pointed to via `wzDir` — **not included in this repo**

## Notes

- `.gitignore` excludes `node_modules`, `dist`, WZ/NX asset directories, and local tooling config (`.agents`, `.claude`, `.codex`, `ida/`, `/tools`, `/docs`, `*.py`, `*.md`, etc.), so several scripts referenced by `package.json` (like `tools/proxy-server.ts`) live locally but aren't committed here.
- The repo currently has no license or repo-level description set on GitHub.
