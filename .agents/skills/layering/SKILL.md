---
name: layering
description: Use when the user reports — or wants to enforce — that an NPC, mob, character, or drop is rendering on the wrong z-layer relative to a map's tiles/objs/trees — phrases like "layering", "z-index", "z-order", "z order", "render order", "the player goes behind/in front of [the tree/the object/the platform]", "draw order is wrong", "entity is in the wrong layer", "obj covers the player", "tree is behind the mob", "foothold layer", "make NPCs/mobs/characters layer-aware", "honor the v95 layer model", "draw on the correct layer", "behind the [obj/wall/decoration]". Owns the 8-layer + per-layer-z draw model documented in `docs/map-wz.md`, the foothold→entity-layer mapping, and the canonical per-layer entity draw order used by `GameStage.DrawEntitiesAtLayer`. Triggers NOT for parallax-back sort order (that's the `back/front` flag inside `FieldScene.DrawBacks`) and NOT for shader depth-buffer questions (we are 2D — no real depth buffer).
---

# layering

The v95 client renders a field as **8 numbered visual layers (0..7)** plus parallax backs
and fronts. Inside each numbered layer, the layer's tiles + objs draw first (sorted by their
own `z` sub-key), then every dynamic entity (NPC / mob / remote char / local player / drop)
**whose foothold belongs to that layer** draws above them. This means a player standing on a
foothold in layer 2 visibly walks BEHIND a tree obj in layer 4, while a mob standing on a
layer-5 foothold draws IN FRONT of the same tree.

This skill owns the recipe for fixing layering bugs and for adding layer awareness to a new
entity type.

## Reference

- `docs/map-wz.md` — the Map.wz schema, including how foothold/tile/obj are keyed by layer
  and which fields drive the sub-z sort inside a layer.
- `src/map/FieldScene.ts` — owns the 8-layer model and exposes the helpers:
  - `layerOfFoothold(id, fallback = 7)` — direct dict lookup by foothold id.
  - `layerAt(x, y, fallback = 7)` — closest standable floor below the point.
  - `draw(sb, white, w, h, drawEntitiesForLayer?)` — the per-layer callback hook.
- `src/stages/GameStage.ts` → `drawEntitiesAtLayer(sb, w, h, layer)` — the
  canonical per-layer entity draw order.

## The model in one diagram

```
parallax backs
└─ layer 0:  tiles → objs → NPCs(L=0) → mobs(L=0) → remote(L=0) → [player+tomb if L=0] → drops(L=0)
└─ layer 1:  tiles → objs → NPCs(L=1) → mobs(L=1) → remote(L=1) → [player+tomb if L=1] → drops(L=1)
└─ …
└─ layer 7:  tiles → objs → NPCs(L=7) → mobs(L=7) → remote(L=7) → [player+tomb if L=7] → drops(L=7)
parallax fronts
portal swirls
debug overlays (foothold lines if MAPLECLAUDE_DEBUG)
screen-locked overlays: chat balloons, damage numbers, emotion bubbles, UI panels, fade
```

`Foothold.Layer` is parsed from the WZ path (`.../foothold/<N>/<group>/<id>` → layer N).
Each dynamic entity inherits its layer from the foothold it is grounded on.

## Procedure

### 1. Diagnose

Reproduce the bug under the live debug overlay so the layer assignment is visible:

```powershell
$env:MAPLECLAUDE_DEBUG = '1'
npm run dev   # or npm run dev:browser (vite, HMR)
```

`FieldScene.Draw` renders the foothold lines with the blue channel encoding the layer index
(`blue = layer × 60` per `src/map/FieldScene.ts`). Confirm which layer each player/mob/NPC is
standing on. If the foothold is the wrong layer, the bug is in the WZ — not our code. If the
foothold layer looks right but the entity draws on the wrong layer, our entity's `Layer`
field is stale (didn't update on a move, or wasn't set at spawn).

### 2. Confirm the entity's `Layer` is being set

The five entity look classes that carry `int Layer`:

| Type | File | Where it gets set |
| --- | --- | --- |
| Local player | `src/character/CharLook.ts` | `GameStage.update` per-tick: `_player.layer = _field.layerOfFoothold(_physics.currentFoothold, _player.layer)` |
| Remote player | `src/character/OtherCharLook.ts` | `onUserEnter` (spawn) + `onUserMove` (each move packet) |
| Mob | `src/character/MobLook.ts` | `onMobEnter` (from `args.fhId`) + `onMobMove` (from new position via `layerAt`) |
| NPC | `src/character/NpcLook.ts` | `onNpcEnter` + `spawnNpc` (set once at spawn via `layerAt`) |
| Drop | `src/character/DropSprite.ts` | `onDropEnter` (from landing point via `layerAt`) |

The local player keeps the last grounded layer while airborne — that's intentional, mirrors
the v95 client's behavior where a jump sustains the takeoff layer until landing.

### 3. Adding layer awareness to a NEW entity type

When you introduce a new dynamic entity (pet, mount, summon, reactor visual, …):

1. Add `layer: number = 7` to the look/sprite class. Default 7 = always
   visible until the spawn site sets the real value.
2. Set the layer at spawn — prefer the server's foothold id when the packet carries one
   (`_field.layerOfFoothold(fhId)`); fall back to `_field.layerAt(x, y)` for entities that
   only carry a world position.
3. Update the layer on every move handler (`other.layer = _field.layerAt(args.x, args.y, other.layer)`).
4. Add the entity to `GameStage.drawEntitiesAtLayer` in the slot that matches its visual
   priority (see the canonical order above). Filter by `entity.layer === layer` inside
   the loop body.

The pre-game/title fallback path (`_field == null`) renders every entity once across all 8
layer indices to keep the demo working — `DrawEntitiesAtLayer` is called in a 0..7 loop in
that branch.

### 4. Common bugs

- **Entity always on layer 7.** It was constructed but the spawn site never assigned `Layer`,
  so it's stuck on the default. Find the `new <X>Look(...)` site and add `Layer = _field.LayerAt(...)`.
- **Entity layer doesn't follow its movement.** The move handler updates `Position` but not
  `Layer`. Add the `_field.LayerAt(args.X, args.Y, entity.Layer)` sync alongside the position
  update.
- **Foothold has the wrong layer.** Re-check the WZ path. `FieldScene.LoadFootholds`
  reads the layer index directly from the path key, so the only way this is wrong is if the
  WZ itself is wrong (rare) or if the foothold was constructed manually (test code).
- **Player goes behind a foreground parallax (front=true `back`).** That's not a layer
  issue — `front=true` backs draw above all 8 layers by design. The user means the obj
  shouldn't be in `back` with `front=1` at all; check the WZ.

### 5. Not for

- **Pixel nudges of an already-correctly-layered element.** Use `layout-tune` instead.
- **Parallax sort order between two `back` entries.** That's not the per-foothold layer
  system — those entries draw in WZ declaration order, optionally filtered by
  `front=true/false`. Read `FieldScene.LoadBackgrounds` / `DrawBackground` for that path.
- **A z-fighting symptom on a 3D engine.** MapleClaude is 2D (PixiJS `Container` z-order,
  no depth buffer). All sort order is explicit by draw-call order.
