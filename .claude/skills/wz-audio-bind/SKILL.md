---
name: wz-audio-bind
description: Use when the user wants a sound or music clip from `Sound.wz` wired to a runtime event — phrases like "play [X] sound", "play the BGM", "play the BGM from Sound.wz", "BGM from Sound.wz of maps", "mob sounds when it gets hit", "play the mob's sounds", "audio for [Wizet/Nexon/Title/login]", "Bgm for [Wizet/Nexon]", "play the map's BGM", "Sound.wz/[node]", or any reference to binding a Sound.wz node to a play trigger (map BGM swap on `SetField`, mob hit/die SFX, UI clicks, login map BGM, drop/pickup SFX). Locates the right Sound.wz subtree, identifies the trigger site, wires through the project's audio service in `src/render/WzAudioPlayer.ts` (HTMLAudioElement — NOT a native audio backend). Triggers NOT for WZ binary decode work (that's `wz-reader`) and NOT for inventing new sound effects with no Sound.wz source.
---

# wz-audio-bind

Many MapleClaude prompts ask to play a specific `Sound.wz` node when something happens —
e.g. when a mob gets hit, when a map loads, when a button is clicked, when the Nexon /
Wizet logo splash plays. This skill owns the binding recipe.

## Sound.wz subtree map

The standard GMS v95 Sound.wz layout — find your node here first:

| Subtree | Contents | Typical trigger |
| --- | --- | --- |
| `Sound.wz/Bgm<region>.img/<track>` | Map BGM tracks (one .img per region: `BgmGL`, `BgmJp`, `BgmTW`, `BgmEvent`, …) | `SetField` decode → field's `info/bgm` string changed |
| `Sound.wz/BgmUI.img/{NxLogoMS,WzLogo,Title,SelectChar,SelectWorld,CashShop,…}` | UI BGM | Splash screens, title, login map, char select |
| `Sound.wz/Mob.img/<mobId:D7>/{Damaged,Die,Attack1,Attack2,Skill,…}` | Per-mob SFX | `CMob`-equivalent runtime hit / die / attack states |
| `Sound.wz/UI.img/{BtMouseClick,BtMouseOver,DlgNotice,WorldSelect,CharSelect,ChatBoxClick,…}` | UI SFX | Button click / hover, dialog open, chat send |
| `Sound.wz/Field.img/{Portal,Drop,Pickup,Jump,LevelUp,…}` | Field SFX | Portal use, drop landing, pickup, level-up |
| `Sound.wz/Game.img/{Effect, GameLose, GameWin, …}` | Misc game SFX | Damage skin, KO, victory |
| `Sound.wz/Itemeff.img/<itemId:D8>/{Use,Effect,…}` | Per-item SFX | Consumable / scroll effect |

If you don't see your node here, the `wz-reader` / `wz-explore` skills can decode and dump
the tree structure of a target `.img`.

## Procedure

### 1. Identify the node

State the full WZ path the user wants. If the user said "mob sounds when it gets hit",
that's `Sound.wz/Mob.img/<mobId>/Damaged` (the per-mob image is keyed by the 7-digit mob
id; if the per-mob image is missing, fall back to the global `Sound.wz/Mob.img/Damaged`).

If the trigger is a map BGM, read the map's `info/bgm` string (format `"<region>/<track>"`,
e.g. `"BgmGL/AmorianChallenge"`); the runtime resolves it to `Sound.wz/Bgm<region>.img/<track>`.

### 2. Identify the trigger site in code

Common trigger sites in the project:

| Event | File / class | Pattern |
| --- | --- | --- |
| Map BGM swap | `src/stages/GameStage.ts` / `src/map/FieldScene.ts` | On `SetField` decode, compare new `bgm` string vs current; if changed, stop old, `WzAudioPlayer.PlayLoop(…)` new |
| Mob hit / die | `src/character/MobSoundService.ts` | `MobDamaged` decode → look up `Sound.wz/Mob.img/<id>/Damaged` → `audio.PlayEffect(…)`; `MobSoundService` caches decoded `WzSound`s |
| UI click | `src/ui/game/` widgets | Inside `Button.onClick` — uniform path; the widget already exposes a click callback |
| Login splash BGM | `src/stages/{SplashStage,LoginStage}.ts` | onEnter → `audio.PlayLoop(…)` with the matching `Sound.wz/BgmUI.img/<…>` buffer |
| Drop landing / pickup | `src/character/DropSprite.ts` / `GameStage.ts` | On drop spawn → Field/Drop; on pickup → Field/Pickup |

### 3. Decode the WZ sound node

The decode flow is owned by `src/wz/`:

- `WzPackage.GetItem("Sound.wz/<path>")` returns a `WzSound` (or `WzUol` to resolve).
- `WzSound` exposes the raw audio bytes (MP3/OGG blob) — see `src/wz/WzSound.ts` and
  `src/wz/NxSound.ts` for the canonical accessor.
- `src/character/MobSoundService.ts` already implements the cache + decode pattern —
  copy it for non-mob sound bindings.

### 4. Wire to the TS audio service

Audio integration lives at `src/render/WzAudioPlayer.ts` (HTML5 `AudioElement`-based —
NOT a native backend; do NOT port BASS or XAudio2 calls).

- **BGM (long, looping):** decoded buffer → `audio.PlayLoop(buffer, mimeType)`.
  It sets `audio.loop = true` automatically for map BGM.
- **SFX (short, fire-and-forget):** decoded buffer → `audio.PlayEffect(buffer, mimeType)`.
- **Volume / mute:** `WzAudioPlayer.Volume` (BGM) / `SfxVolume` (SFX) / `Muted`.
- **Stopping:** `audio.Stop()` stops + revokes the object URL (prevents the layered-BGM bug).

### 5. Honor system options

The system options window (`CUISysOpt` in `src/ui/game/`) carries BGM volume / SFX volume /
mute toggles — route them into `WzAudioPlayer.Volume` / `SfxVolume` / `Muted`. Don't bypass
it; if the user has BGM muted, the call must respect that.

### 6. Verify

- `tsc --noEmit` passes.
- Trigger the event in the live client via `npm run dev` / `npm run dev:browser`; the sound
  plays through HTMLAudioElement.
- For BGM, confirm the map change ACTUALLY swaps the track (vs starting a second one
  layered on top — that's the common bug; `PlayLoop` calls `Stop()` first).

## What to avoid

- Inventing sounds with no Sound.wz source. If the user wants a sound the WZ doesn't
  carry, surface that fact instead of synthesizing one.
- Any non-WZ fallback for "I couldn't find the node".
- Polluting the audio service with stage-specific globals; route everything through
  the existing `WzAudioPlayer`.
- Decoding the same buffer twice — cache (see `MobSoundService`).

## Privacy

- No `.i64` paths, no private project names. The same rules from `ship-pr` apply.

## Related skills

- `wz-reader` / `wz-explore` — owns the binary-format decode side (`WzSound`, AES, version
  hash, `.nx`). Call these for any decode-format questions.
- `ida-lookup` — for "what triggers this sound in the original client". The IDB has the
  `CMobSoundMan` / equivalent for mob SFX timing.
- `ingame-feature` — feature implementations often need to bind a sound; that skill
  delegates here.
- `wz-subsystem-research` — for the broader subsystem this sound is part of (e.g. the
  `Mob.wz` sweep already mapped the sound subtree).

## Linked memories

`[[ingame-camera-rendering]]`, `[[mob-wz-attributes]]`, `[[ingame-system-menu]]`,
`[[ingame-ui-windows]]`.
