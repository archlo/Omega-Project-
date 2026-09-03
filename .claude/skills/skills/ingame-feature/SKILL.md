---
name: ingame-feature
description: Use when the user wants a player or world feature implemented end-to-end (packets + animation + WZ assets + state) — phrases like "implement [combat / death / drop / pickup / NPC click / emotion / facial expression / damage / attack / knockback / tombstone / revive / collision / aggro / mob movement / loot / level up]", "research how a player dies", "ensure when the player's HP reaches 0 he dies", "we need to be able to hit mobs", "mobs should X when Y", "player should X when Y", "when [event] happens, [response]", "mob death animation", "drop to the ground", "pick it up should fly into the character", "play the mob's sounds when hit", "introduce facial expressions", "we want emotions when F1-F7 is pressed", or similar full-feature requests that cut across the packet layer + the IDB animation logic + the WZ assets + the runtime state. Coordinates calls into `client-packet-author`, `server-packet-mirror`, `ida-lookup`, `wz-audio-bind`, and `wz-subsystem-research`. Triggers NOT for UI windows alone (`authentic-ui-rebuild`) and NOT for a single new packet (`server-packet-mirror` / `client-packet-author`).
---

# ingame-feature

The biggest pattern after "look it up in IDB" — implementing a player or world feature
end-to-end. Examples from recent prompts: "player dies → tombstone → revive UI", "mob
death animation", "mobs hit us and knock us back", "facial expressions on F1-F7", "drop
to ground with spin animation", "pick up flies into the character", "play mob sounds when
hit".

These cut across multiple layers:

1. **Packet layer** — `src/net/packet/OpCodes.ts` + our server's handler/builder + TS encoder/decoder.
2. **IDB animation/state logic** — what the original client does for the visual / state
   transition.
3. **WZ assets** — sprites, sounds, animation timings.
4. **Runtime state** — `src/character/`, `src/map/`, `src/ui/game/`, `src/stages/GameStage.ts`.

This skill coordinates the per-layer skills so all four stay aligned.

## Procedure

### 1. Map the feature to its opcodes

Find the involved opcodes from `src/net/packet/OpCodes.ts` + the matching handler in
our server repo (`C:\Users\jorge\OneDrive\Desktop\server\src\handlers\`).
Standard table (expand as features land):

| Feature | C→S opcodes | S→C opcodes |
| --- | --- | --- |
| Player melee attack | `UserMeleeAttack` (47) | `UserMeleeAttack` (remote, 184), `MobDamaged` |
| Mob hit you | (none — server-pushed) | `UserHit` (48 in/out variant), `UserStatChange` (HP) |
| Mob move | (controller pushes back) | `MobMove` (231), `MobMoveCtrlAck` |
| Mob die | (none) | `MobDamaged` w/ death flag, `MobLeaveField` |
| Player move | `UserMove` (44/0x2C) | `UserMove` remote (210) |
| NPC click → dialog | `UserSelectNpc`, `UserQuestRequest`, `UserScriptMessageAnswer` | `ScriptMessage`, `OpenShopDlg` |
| Drop appears | (none) | `DropEnterField`, `DropLeaveField` |
| Drop pickup | `DropPickUpRequest` | `InventoryOperation` (28), `MoneyOperation`, `DropLeaveField` |
| Drop to ground from inventory | `UserChangeSlotPositionRequest` (77/0x4D, `newPos=0`) | `InventoryOperation`, `DropEnterField` |
| Emotion (facial expression) | `UserEmotion` (56/0x38) | `UserEmotion` remote |
| Player death | (server-side detection) | `UserHP` to 0, `MigrateCommand` to tomb / town |
| Revive | `UserReviveRequest` / via dialog | `ReviveResult`, `SetField` to revive map |
| Skill cast | `UserSkillUseRequest` | `UserSkillEffect` (remote), `MobAffected` |
| Stat change | (server-only) | `UserStatChange` (30 — dual-decode), `Message` (38 — money/loot popups) |
| Portal use | `UserTransferFieldRequest` (41/0x29) | `SetField` (141/0x8D) |

Use the `server-packet-mirror` skill for any S→C opcode the project doesn't yet decode,
and `client-packet-author` for any C→S opcode it doesn't yet emit.

### 2. Look up the IDB animation / state logic

Delegate to `ida-lookup` for the relevant runtime class(es):

| Feature | IDB class / method |
| --- | --- |
| Mob hit | `CMob::OnDamaged`, `CMob::Hit`, `CMob::DoSkill` |
| Mob die | `CMob::OnDead`, removeAfter timing |
| Mob sounds | `CMobSoundMan`, `CMob::PlaySound`, `Sound.wz/Mob.img/<id>/<state>` |
| Mob touch / collision damage | `CMob::CheckTouchEvil`, `CUserLocal::OnTouchMob` |
| Mob aggro | `CMob::Update`, `CMob::IsAggroed`, look for `aggro` xrefs |
| Player attack | `CUserLocal::TryDoingMeleeAttack`, `CUserLocal::DoAttack` |
| Player hit / knockback | `CUserLocal::OnHit`, knockback velocity computation |
| Player die | `CUserLocal::OnDead`, `CUITombstone`, `CUIRevive` |
| Player emotion | `CUserLocal::SetEmotion`, `CAvatarLook::SetEmotion`, expression duration |
| Drop appear | `CDropPool::Create`, `CDrop::Init` (toss-fall-bob anim) |
| Drop pickup | `CUserLocal::TryPickUpDrop`, `CDrop::OnPickUp` (fade + move toward body) |
| NPC click | `CNpc::OnTouch`, `CWvsContext::OnSelectNpc` |

### 3. Look up the WZ assets

Common asset paths:

| Feature | WZ assets |
| --- | --- |
| Mob actions | `Mob.wz/<mobId:D7>.img/{stand,move,attack1..N,hit1,die1,fly,…}` (frames + delays) |
| Mob sounds | `Sound.wz/Mob.img/<mobId>/{Damaged,Die,Attack1,…}` |
| Drop visual | `Item.wz/...` icon, `Map.wz/MapHelper.img/drop` for shadow/anim |
| Drop sound | `Sound.wz/Field.img/Drop`, `Sound.wz/Field.img/Pickup` |
| NPC sprite | `Npc.wz/<npcId:D7>.img/<state>` |
| NPC dialog frame | `UIWindow2.img/UtilDlgEx` |
| Emotion face | `Character.wz/Face/<faceId:D8>.img/<emote>` (smile, blink, cry, …) |
| Tombstone | tombstone canvas (find via `ida-lookup` for `CUITombstone`) |
| Revive UI | `UIWindow2.img/Revive` |

Delegate to `wz-audio-bind` for any Sound.wz binding. For a brand-new subsystem the
project hasn't typed yet, delegate to `wz-subsystem-research`.

### 4. Implement in ts

Layered file placement:

```
src/net/senders/         <- packet encoders (GameSender.ts, LoginSender.ts)
src/net/handlers/        <- packet decoders (handlers)
src/character/           <- player + mob runtime
src/map/                 <- foothold, portals, drops, field state
src/ui/game/             <- HUD, dialogs, popups
src/stages/GameStage.ts  <- wiring + per-feature glue
```

The project already has many half-built feature files (e.g. `MobInfo.ts`, `MobAttack.ts`,
`Revive.ts`, `TombstoneEffect.ts`); prefer extending those over creating parallel ones.

### 5. Test it live

- `tsc --noEmit` + `npx vitest`.
- Drive the feature in the live client via `npm run dev` (desktop) or
  `npm run dev:browser` (vite, HMR).
- For network features, the running server's logs (`C:\Users\jorge\OneDrive\Desktop\server`)
  are the ground truth — match the packet bytes the server sends/receives.

### 6. Save a memory entry

If the implementation made a non-obvious decision (e.g. "drops fall via VR clamp", "mob
sounds bind via MobSoundService cache", "right-Ctrl needs separate scancode binding"),
save a memory entry. See `[[mob-wz-attributes]]`, `[[drops-portals-rendering]]`,
`[[foothold-physics-idb]]`, `[[keyconfig-1to1]]` for examples.

## Feature → asset / opcode quick reference

The most-requested in-game features in this project, with everything you need to start:

| Feature | Opcodes | IDB | WZ | Memory |
| --- | --- | --- | --- | --- |
| Mob hit / die / sound | `MobDamaged` (236), `MobMove` (231) | `CMob::OnDamaged`, `CMob::OnDead`, `CMobSoundMan` | `Mob.wz/<id>/{hit,die}`, `Sound.wz/Mob.img/<id>` | `[[mob-wz-attributes]]` |
| Collision damage | (S-pushed `UserHit`) | `CMob::CheckTouchEvil`, `CUserLocal::OnTouchMob` | mob `bodyAttack` flag | — |
| Drops ground anim | `DropEnterField` | `CDropPool`, `CDrop::Update` toss-fall-bob | `Item.wz/...`, `Map.wz/MapHelper.img/drop` | `[[drops-portals-rendering]]` |
| Drop to ground | `UserChangeSlotPositionRequest` newPos=0 | `CUIItemInven::DropItem` | — | — |
| Pickup fly-to-body | `DropPickUpRequest` | `CUserLocal::TryPickUpDrop`, `CDrop::OnPickUp` | — | `[[drops-portals-rendering]]` |
| NPC click / dialog | `UserSelectNpc`, `ScriptMessage` | `CNpc::OnTouch`, `CUtilDlgEx` | `Npc.wz/<id>`, `UIWindow2.img/UtilDlgEx`, `String.wz/Npc.img/<id>` | `[[npc-quest-dialog]]` |
| NPC ambient bubble | (none) | `CNpc::DoSay` | `Npc.wz/<id>.img/info/speak`, `String.wz/Npc.img/<id>` | `[[quest-system]]` |
| Player emotion | `UserEmotion` (56) | `CUserLocal::SetEmotion`, `CAvatarLook::SetEmotion` (3+ second duration before blink resumes) | `Character.wz/Face/<id>.img/<emote>` | (new) |
| Player death | server detects HP=0 | `CUserLocal::OnDead`, `CUITombstone`, `CUIRevive` | `UIWindow2.img/Revive`, tombstone canvas | (new) |
| Revive | `UserReviveRequest` | `CUIRevive`, `CWvsContext::OnReviveResult` | revive dialog canvas | (new) |
| Skill cast | `UserSkillUseRequest` | `CUserLocal::DoSkill`, `CSkillEffect`, `CCharLook::PlayAction` | Skill.wz cast/effect anims | `[[skill-window-system]]` |
| Stat change | (S-only) | dual-decode `StatChanged(30)` + `Message(38)` | — | `[[statchanged-dual-decode]]` |
| Foothold / wall | (S-only) | `CFoothold::*`, `m_lZMass`, `BoundPosMapRange` | `Map.wz/<map>/foothold` | `[[foothold-physics-idb]]` |
| Body action / climbing | (none) | `CCharLook` clock-driven delays, ladder/rope 2-frame back | `Character.wz/<body>/<action>` | `[[body-animation-actions]]` |

## Privacy / safety

- All the standard `pr-privacy-guard.local` forbidden tokens apply.
- IDB lookups go through `ida-lookup`, which enforces no path leakage.
- v83 reference patterns are read-only; never name the v83 client in committed text.

## Verification

Before declaring a feature done:

1. `tsc --noEmit` clean.
2. `npx vitest` clean (existing tests + any new ones you added).
3. Live client demo: trigger the feature, watch the right packets fly, see the right
   animation play.
4. Logs are clean (no exceptions, no "unhandled opcode").
5. Memory entry saved if the feature taught us something non-obvious.
## Related skills

- `client-packet-author` — for new C→S packets.
- `server-packet-mirror` — for new S→C handlers.
- `ida-lookup` — for every IDB query in steps 2 and 3.
- `wz-audio-bind` — for sounds.
- `wz-subsystem-research` — for new typed models.
- `authentic-ui-rebuild` — for any UI surfaces the feature adds.
- `layout-tune` — for inevitable pixel nudges.
- `ship-pr` — for shipping the feature.
