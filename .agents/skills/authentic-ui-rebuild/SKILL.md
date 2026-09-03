---
name: authentic-ui-rebuild
description: Use when the user wants a placeholder/custom UI overlay replaced with the authentic v95 client version sourced from the WZ assets + IDA database — phrases like "not the custom overlay", "not the placeholder", "we have a custom overlay right now, but it's not authentic", "authentic v95", "authentic [stat/inventory/equip/chat/skill/quest/family/system menu/NPC dialog/channel select/character profile/key config/buddy/party/guild/alliance/blacklist] window", "rebuild [UI] 1:1 from the IDB", "look up CUI[X] and rebuild it 1:1", "fix [UI screen] to match the IDB", "look into the proper IDB implementation", "use the natural UI and proper icons", "should reuse the [UIWindow*.img/...]", "look into the IDB for the proper [UI]". Walks the WZ subtree identification → `CUI*` class decompile via `ida-lookup` → coordinate extraction → TS rebuild loop. For full-screen rebuilds it escalates to the `v95-ui-rebuilder` skill; for origin extraction to the `ui-origin-finder` agent. Triggers ONLY for UI that exists in the original v95 client; NOT for inventing new UI (no IDB authority) and NOT for pixel-level nudges (use `layout-tune`).
---

# authentic-ui-rebuild

The MapleClaude codebase has converted many UI screens from custom placeholders to
WZ-textured + IDB-coordinate-authentic versions: stat window, system menu, key config,
channel/world/char select, skill window, quest log, NPC dialog, social/community window,
item tooltip, chat window, minimap, etc. The pattern is well-established. This skill owns
the recipe for the next conversion.

## When this fires vs adjacent skills

| Pattern | Skill |
| --- | --- |
| "Not the custom overlay, the authentic v95 X" | THIS skill |
| "Look up CXxx in the IDB" (single symbol) | `ida-lookup` |
| "Move it 3px down" (already authentic) | `layout-tune` |
| "Build a typed model for all of Mob.wz" (data, not UI) | `wz-subsystem-research` |
| "Implement the player death flow" (gameplay) | `ingame-feature` (which may call into this) |

## Procedure

### 1. Identify the WZ subtree

The window's name maps to a `UIWindow.img/<X>` or `UIWindow2.img/<X>` subtree. Common ones:

| Window | WZ path | IDB class |
| --- | --- | --- |
| Stat | `UIWindow2.img/Stat` | `CUIStat`, `CUIStatDetail` |
| Inventory | `UIWindow.img/Item` | `CUIItemInven`, `CUIInvenDlg` |
| Equipment | `UIWindow.img/EquipSlot` | `CUIEquip`, `CUIEquipSlot` |
| Character profile | `UIWindow2.img/UserInfo/character` | `CUIUserInfo` |
| Skill | `UIWindow.img/Skill` | `CUISkill` |
| Quest log | `UIWindow2.img/QuestInfo` | `CUIQuestInfo` |
| NPC dialog | `UIWindow2.img/UtilDlgEx` | `CUtilDlgEx`, `CUtilNpcChat` |
| System menu (ESC) | `UIWindow.img/GameMenu` | `CUIGameMenu` |
| System options | `UIWindow.img/SysOpt` (NOT `OptionMenu`) | `CUISysOpt` |
| Channel shift | `UIWindow2.img/ChannelShift` | `CUIChannelShift` |
| Channel select | UI.wz (login) | `CUIChannelSelect` |
| World select | UI.wz (login) | `CUIWorldSelect` |
| Character select | UI.wz (login) | `CUICharSelect` |
| Character creation | UI.wz (login) | `CUICharCreate`, `CUIRaceSelect` |
| Key config | `UIWindow2.img/KeyConfig` (NOT UIWindow) | `CFuncKeyManager`, `CUIKeyConfig` |
| Quick slot | `StatusBar2.img/quickSlot` (NOT `quickSlot` popout in HD) | `CUIQuickSlot` |
| Status bar HUD | `StatusBar2.img/...` (HD) / `StatusBar.img` (legacy) | `CUIStatusBar` |
| Minimap | `UIWindow.img/MiniMap` (frame) + `Map.wz/MapHelper.img/minimap` (icons) | `CUIMiniMap` |
| Tooltip (item/equip) | `UIWindow2.img/ToolTip/Equip` (NOT custom) | `CUIToolTip`, `CUIItemTip` |
| Chat / chatbox | `UIWindow2.img/ChatBalloon` + status bar chat | `CUIChat`, `CUIChatBox` |
| Buddy / Party / Guild / Alliance / Blacklist | `UIWindow2.img/UserList/Main` (6-tab) | `CUIUserList` |
| Family | `UIWindow2.img/Family` | `CUIFamily` |
| Storage / Trunk | `UIWindow.img/Trunk` | `CUITrunk` |
| Messenger | `UIWindow.img/Messenger` | `CUIMessenger` |
| Cash shop | `UIWindow.img/CashShop` | `CUICashShop` |
| Revive / Tombstone | `UIWindow2.img/Revive` + tombstone canvas | `CUIRevive`, `CUITombstone` |

When the mapping isn't obvious, run `lookup_funcs CUI` and grep the results for the window
the user named. Search the existing memory entries first — many windows are already mapped
(see `[[ingame-ui-windows]]`).

### 2. Identify the matching `CUI*` class

Delegate to `ida-lookup`:

> Look up `CUIStat::OnCreate`, `CUIStat::Init`, `CUIStat::Draw`, `CUIStat::PaintRect`,
> `CUIStat::UpdateRect`. Decompile each and report the WZ canvas frame ids, exact (x, y)
> offsets per element, origin frame / coordinate space, and mouse-hit rectangles.

For full-screen rebuilds where the IDB walk is complex (lots of sub-classes, lots of
state), escalate to the `v95-ui-rebuilder` skill — same handoff pattern as
`wz-subsystem-research` uses for its sweep agent:

```text
Skill({ name: "v95-ui-rebuilder", prompt: "Rebuild the v95 <X> window 1:1 from the WZ
       assets + IDB. WZ path: <…>. IDB class: CUI<X>. Produce a working stage/widget in
       src/stages/ or src/ui/game/ that matches the original positions, mouse-hit rects,
       and tab/button behavior. Match the depth of the CUIStat conversion — see memory
       [[stat-window-cuistat]]." })
```

For origin extraction (a known sticking point), the `ui-origin-finder` agent specializes:

```text
Agent({
  description: "<X> UI origin table",
  subagent_type: "ui-origin-finder",
  prompt: "Extract the authentic on-screen position / origin / layout of the v95 <X>
           window. Return a table of element → (x, y) + origin + WZ asset + coordinate
           space, ready to drop into the TS stage."
})
```

### 3. Extract the layout from the IDB output

From the decompile, you should leave with:

- WZ canvas frame ids the element uses (`backgrnd`, `Bt*`, `icon`, etc.).
- Per-element (x, y) offsets — usually relative to the window's origin frame, not screen.
- The origin frame itself (the WZ canvas's `origin` node, often `(0, 0)` but not always).
- Mouse-hit rectangles (`PtInRect` calls; their bounds = the click region).
- StringPool ids for any labels — resolve via the IDA MCP (`ida_get_strings` /
  `ida_find_code_by_string`) or by xref-ing the numeric id.
- Font / color picks (often `WzComparerR`-style: font face id, font size, color RGBA).
- Tab navigation: which sub-classes get pushed/popped on tab clicks.

### 4. Implement in ts

Place files where the rest of the converted windows live:

| File | Purpose |
| --- | --- |
| `src/ui/game/<X>.ts` (or `src/stages/<X>Stage.ts` for a full-screen one) | Top-level widget |
| `src/ui/game/<X>Tab.ts` (per tab) | Sub-widgets |
| `src/ui/...` | Reusable components |
| `src/net/handlers/<X>Handlers.ts` | Any new packet decoders |
| `src/net/senders/<X>Sender.ts` | Any new packet encoders |

Use the existing PixiJS `Container` + `Sprite` + WZ canvas loading plumbing — don't reinvent
canvas loading. The canonical worked example is `CUIStat` (see `[[stat-window-cuistat]]`);
copy its style.

### 5. Hard rules — what authentic means

- **No custom-drawn rectangles** when a `Bt*` (button) or `backgrnd` canvas already exists.
- **No hand-picked font / color** when the WZ node carries them.
- **No hand-eyeballed coordinates** when the IDB has them — that's just a delayed bug.
- **No `OptionMenu`** — the v95 system options window is `SysOpt` (common mistake).
- **No UIWindow icons for the v95 key config** — it's `UIWindow2.img/KeyConfig` (don't
  pull `MonsterBook` etc.; v95 doesn't have it).
- **Tabs hidden when not applicable.** E.g. skill window tab for job advance 2 hidden if
  the character hasn't reached 2nd-job yet.

### 6. Verify

- `tsc --noEmit` passes (TypeScript type-check).
- `npx vitest` passes.
- Launch via `npm run dev` (desktop) or `npm run dev:browser` (vite, HMR), with
  `MAPLECLAUDE_DEBUG=1` if any position needs final tuning.
- Visually compare against a reference screenshot or the IDB-derived layout table.
- Confirm no privacy-token leak in committed files (`pr-privacy-guard.local`).

### 7. Memory

After a non-trivial conversion, save a memory entry summarizing what the IDB analysis
revealed — what WZ paths drive what, integer constants discovered, off-by-one quirks. See
existing entries for the format: `[[stat-window-cuistat]]`, `[[ingame-system-menu]]`,
`[[npc-quest-dialog]]`, `[[skill-window-system]]`, `[[social-community-ui]]`.

## Privacy

- Same rules as `ida-lookup` — no `.i64` paths, no private project names, no raw decompile
  blocks in committed files. Translated coordinates / constants / canvas paths are fine.
- Keep forbidden-token lists in mind while writing commit messages.

## Related skills / agents

- `ida-lookup` — single-class decompile lookup; this skill calls it per `CUI*`.
- `layout-tune` — for the inevitable pixel-level nudge after the rebuild lands.
- `wz-reader` — for WZ canvas decode questions.
- `client-packet-author` / `server-packet-mirror` — for any packets the window needs.

## Linked memories

`[[ingame-ui-windows]]`, `[[stat-window-cuistat]]`, `[[ingame-system-menu]]`,
`[[social-community-ui]]`, `[[skill-window-system]]`, `[[quest-system]]`,
`[[npc-quest-dialog]]`, `[[ui-origin-tooling]]`, `[[keyconfig-1to1]]`,
`[[minimap-system]]`, `[[drops-portals-rendering]]`.
