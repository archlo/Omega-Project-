# v95 Scrollbar and ChatBalloon Audit

## Scope

This document records the remaining work for the shared scrollbar and chat-balloon systems.
The reference is the v95 client export at `Maplestory95.exe_export_for_ai`, together with the
current TypeScript implementation:

- `src/ui/game/ScrollBar.ts`
- `src/ui/game/GamePanel.ts`
- `src/ui/game/ChatBalloon.ts`
- `src/stages/GameStage.ts`
- Every panel that constructs `ScrollBar`

The audit is intentionally implementation-oriented. It separates behavior already present from
work still required for a closer v95 match.

## Current Status

### Implemented

- Shared scrollbar WZ asset registration from `GameStage._initMenu`.
- Late replacement of fallback scrollbar assets after WZ loading.
- WZ enabled and disabled scrollbar states.
- Fixed-size v95-style 12px default thumb/grid geometry.
- Arrow, track, page, drag, wheel, and hold-repeat support in the shared scrollbar.
- Shared `GamePanel` wheel routing to nested scrollbars.
- ChatBalloon WZ nine-piece assets, including the center canvas asset.
- ChatBalloon WZ `fontColor` support.
- NPC sprite-derived head anchor.
- Local normal-chat balloon with matching server-echo suppression.
- NPC balloon type selection path in the current Stage wiring.

## ScrollBar Findings

### 1. Consumer input coverage is incomplete

The following consumers create scrollbars but need explicit input forwarding verification:

- `src/ui/game/CharInfo.ts`
- `src/ui/game/EntrustedShop.ts`
- `src/ui/game/UserInfoDetail.ts`
- `src/ui/game/UserInfoWishList.ts`
- `src/ui/game/UserInfoExceptionList.ts`
- `src/ui/game/MonsterCarnival.ts`
- `src/ui/game/Shop.ts`
- `src/ui/game/SkillMacro.ts`
- `src/ui/game/SkillIncDec.ts`
- `src/ui/game/UserList.ts`
- `src/ui/game/UtilDlgEx.ts`
- `src/stages/CashShopStage.ts`

Each consumer must verify all three paths:

1. Mouse-down and mouse-up are translated into scrollbar-local coordinates.
2. Mouse movement is forwarded while dragging and while hovering.
3. Global mouse-up clears capture even when the pointer leaves the panel.

The shared `GamePanel` wheel fallback does not replace explicit mouse-down/mouse-move forwarding.

### 2. Exact `SetScrollRange` semantics need normalization

The original `CCtrlScrollBar::SetScrollRange(nRange)` stores the supplied range and clamps the
current position to:

```text
0 .. nRange - 1
```

Values `nRange <= 1` disable scrolling and reset the current position to zero.

The TypeScript consumers currently mix two conventions:

- Passing the maximum position directly.
- Passing `maximum position + 1` to compensate for the shared component.

This is fragile. The future API should expose one clear method, preferably:

```ts
setScrollRange(rangeCount: number): void
```

and optionally a separate helper:

```ts
setMaxPosition(maxPosition: number): void
```

All consumers should use one convention and have tests for zero, one, and two visible overflow
positions.

### 3. Scrollbar variants are not fully supported

The original client selects a scrollbar UOL from multiple variants:

- `VScr`
- `VScr2`
- `VScr3`
- `VScr4`
- `VScr5`
- `VScr6`
- `VScr7`
- `VScr8`
- `VScr9`
- `VScr10`

These variants have different widths, heights, and artwork dimensions. The implementation still
uses default constants for hit testing and layout. Required work:

- Read the selected variant's actual base/arrow/thumb dimensions.
- Derive `grid`, width, and track length from the selected WZ canvases.
- Use those dimensions in hit tests, thumb travel, fallback rendering, and wheel bounds.
- Pass the correct variant from each panel instead of defaulting every panel to `VScr`.

### 4. WZ track composition is still approximate

The original `CCtrlScrollBar::Draw` copies the base canvas, arrow canvas, and thumb canvas into
the scrollbar canvas. The current implementation stretches the base sprite vertically.

Required work:

- Tile or copy the base track without distorting its pixels.
- Keep arrow and thumb artwork at native size.
- Use the selected enabled/disabled/hover canvas according to hit state.
- Preserve the original alpha/translucency behavior.

### 5. Auto-repeat needs exact hit-state tracking

The original `CCtrlScrollBar::Update` repeats only while the current `ScrHitTest` result still
matches the pressed region. Moving the pointer away from the original arrow or page region stops
the repeat.

The TypeScript implementation needs to:

- Re-run hit testing during repeat.
- Stop repeating when the region changes.
- Use the original initial delay and 50ms repeat cadence.
- Preserve separate arrow and page repeat actions.

### 6. Mouse capture needs a scrollbar-owned path

The original calls `SetCaptureWnd` on mouse-down and releases it on mouse-up. The TypeScript
implementation relies on panel dispatch and global release hooks.

Required work:

- Track the active scrollbar globally.
- Route mouse movement to the active scrollbar regardless of panel bounds.
- Route mouse-up to the active scrollbar before ordinary panel dispatch.
- Clear capture if a panel closes, becomes hidden, or is destroyed.

### 7. Wheel bounds are narrower than v95

The original wheel handler uses a configured wheel rectangle that can be wider than the 12px
scrollbar itself. The current implementation only consumes wheel input while the pointer is over
the scrollbar column.

Required work:

- Add a configurable wheel rectangle per scrollbar.
- Support vertical and horizontal orientation fields, even if only vertical panels currently use
  it.
- Configure the wheel rectangle from each panel's visible content area.
- Verify Cash Shop inventory and locker wheel behavior separately.

### 8. Panel-specific range and row-step formulas need verification

The following panels use custom formulas that should be checked against their v95 `SetScrollBar`
or `SetScrollRange` logic:

- `ItemInventory`
- `UserList`
- `SkillBook`
- `SkillIncDec`
- `SkillMacro`
- `UtilDlgEx`
- `CashShopStage`

Do not assume the visible row count equals the scrollbar range. Some original controls use item
counts, page counts, or special offsets.

### 9. Scrollbar tests are insufficient

Add tests for:

- Range `0`, `1`, `2`, and large ranges.
- Thumb position at first and last position.
- Native variant widths and heights.
- Disabled artwork selection.
- Arrow hold-repeat and pointer exit.
- Page click movement.
- Drag start offset and drag end behavior.
- Wheel rectangle behavior.
- Global mouse-up after leaving a panel.
- Every consumer's local-coordinate translation.

## ChatBalloon Findings

### 1. Exact OG path dispatch is still unresolved

The original `CChatBalloon::MakeBalloon` selects its resource path using distinct StringPool
entries for balloon types `1000` through `1003`. The suffix behavior is not equivalent to simply
loading `ChatBalloon.img/0`, `ChatBalloon.img/1`, and so on.

Required work:

- Resolve the StringPool entries used by the original path builder.
- Document the resulting paths in code and tests.
- Pass both the OG balloon type and index through `ChatBalloonLayer.Set`.
- Use the correct type for normal chat, NPC speech, mob speech, pet speech, and indexed variants.

### 2. Mob speech bypasses `ChatBalloonLayer`

`MobLook` still owns a separate speech-bubble renderer. The original client uses
`CChatBalloon::MakeMobBalloon`.

Required work:

- Route mob speech into `ChatBalloonLayer` or create a shared typed balloon service.
- Preserve mob-specific template balloon type and fade delay.
- Anchor mob balloons to the real mob head/action origin.
- Remove the duplicate custom bubble once parity is verified.

### 3. `CreateCanvas` is not fully reproduced

The original creates a generated WZ canvas from the nine pieces and inserts it into a WZ layer.
It also reads WZ properties such as delay rate and actual generated height.

The current implementation renders individual Pixi sprites and scales them to the target box.
This is visually close but not pixel-identical.

Required work:

- Implement a reusable nine-slice WZ canvas compositor.
- Preserve native corner sizes.
- Tile center and edge regions instead of scaling them where the source canvas expects tiling.
- Use generated canvas dimensions for vertical placement.
- Support animated canvas frames and delay rate.

### 4. `AdjustCoordY` behavior is simplified

The original performs vertical adjustment using:

```text
layerY = originY - canvasHeight - adjustY - 5
```

The current implementation calculates the complete bubble rectangle in Pixi space. It needs to
accept the original adjustment value per speaker type and use the generated canvas height.

Required work:

- Add `adjustCoordY` to the balloon request.
- Add NPC-specific balloon offsets from NPC template/action data.
- Add character and mob action-origin offsets.
- Test tall, short, animated, and multi-line speakers.

### 5. Timeout and fade state need separate fields

The original stores chat start time, timeout, and fade delay independently. The current code uses
a simplified lifetime value and a fixed fade window.

Required work:

- Store `startedAt`, `timeoutMs`, and `fadeDelayMs` separately.
- Implement the original alpha transition.
- Support `SetFadeDelay` for mob/pet/NPC callers.
- Preserve balloons during fade instead of destroying them at the timeout boundary.
- Test timeout, fade start, halfway fade, and final removal.

### 6. Text rendering is not fully native

The current text uses `BuiltInFont` and a cloned Pixi `TextStyle`. The original uses the client WZ
font/rendering path and the balloon property's font color.

Required work:

- Resolve the original chat font face and size.
- Read all relevant balloon text properties from WZ.
- Match line height, baseline, and anti-alias behavior.
- Preserve per-balloon font color without mutating the shared font.

### 7. Long unbroken text is not wrapped

Current wrapping breaks only at spaces. Long item names, URLs, or strings without spaces can exceed
the generated balloon width.

Required work:

- Implement character-level fallback wrapping.
- Measure using the same font style used for rendering.
- Preserve item-link and markup boundaries.
- Add tests for a single token longer than the maximum width.

### 8. Local speech coverage is incomplete

Local normal public chat gets an immediate balloon and suppresses its matching server echo.
Whisper, party, guild, alliance, expedition, pet, and slash-command speech still have separate
paths and need explicit policy.

Required work:

- Decide which targets should create world balloons in v95.
- Do not show balloons for private/system-only messages unless the original does.
- Add deduplication for delayed or reordered server echoes.
- Handle item-link text consistently between immediate and echoed speech.

### 9. NPC offsets and mob head anchors need data-backed values

NPCs now use the current frame's sprite origin, but the original also applies
`m_ptBalloonOffset.y`. Mobs have action-specific head points and template balloon settings.

Required work:

- Add NPC balloon offset data to `NpcLook`.
- Use mob action head anchors instead of a fixed fallback.
- Keep anchor updates synchronized with animation frame changes.
- Add tests for NPCs/mobs with different heights.

### 10. Layering and screen-space ownership need verification

Balloon containers are screen-space overlays and should draw above field entities but below modal UI
and fade overlays. This needs an explicit ordering contract rather than relying only on `uiRoot`
child insertion order.

Required work:

- Create a named `chatBalloonLayer` in the overlay ordering.
- Verify it is above field/entity layers.
- Verify it is below modal windows and full-screen fade overlays.
- Verify multiple simultaneous balloons do not reorder unpredictably.

### 11. ChatBalloon tests cover only no-asset behavior

Current tests do not validate loaded WZ assets, typed paths, color, composition, positioning, or
local/remote/NPC/mob integration.

Add tests for:

- Each balloon type/path.
- Missing type fallback.
- WZ font color.
- Center canvas and nine-piece dimensions.
- Arrow alignment.
- Multi-line and unbroken text wrapping.
- NPC, mob, local, and remote anchors.
- Immediate local speech plus server echo deduplication.
- Timeout and fade lifecycle.
- Multiple active balloons.

## Recommended Waterfall

### Phase 1: Scrollbar input correctness

1. Add explicit forwarding to every consumer.
2. Add global active-scrollbar capture.
3. Add missing mouse-move and mouse-up paths.
4. Add consumer tests.

### Phase 2: Scrollbar geometry and variants

1. Normalize range semantics.
2. Resolve actual `VScr` variant dimensions.
3. Implement native-size/tiled WZ composition.
4. Add wheel rectangles.
5. Add repeat hit-state checks.

### Phase 3: Balloon dispatch

1. Resolve StringPool balloon path strings.
2. Add typed request data with OG type and index.
3. Route NPC, mob, pet, local, and remote speech through one service.

### Phase 4: Balloon composition and positioning

1. Implement WZ canvas composition.
2. Apply actual generated height.
3. Add `adjustCoordY` and speaker-specific offsets.
4. Match font metrics and colors.

### Phase 5: Lifecycle and verification

1. Separate timeout and fade delay.
2. Add local echo deduplication for all eligible targets.
3. Add full asset-backed tests.
4. Run visual verification with real WZ assets.

## Verification Commands

```powershell
npx tsc --noEmit
npx vitest run
```

Visual verification should be performed with real UI assets loaded and with at least:

- An NPC with a tall sprite and speech.
- A short NPC with speech.
- A local player speaking.
- A remote player speaking.
- A mob with template speech.
- A panel with zero scroll range.
- A panel with one page of overflow.
- A panel with a large range and a dragged thumb.
