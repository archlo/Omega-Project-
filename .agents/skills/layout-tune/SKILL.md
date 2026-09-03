---
name: layout-tune
description: Use when the user wants to nudge an already-rendered UI element by a small amount — phrases like "move it [N]px [direction]", "move it 3px down", "lower it like 3px", "move it 2 pixels to the right, 4 down", "icon too high", "icon too low", "the [element] is wrong [direction]", "needs to be a bit higher", "needs to be a bit lower", "nudge [element]", "position is wrong", "the position is off", "needs to be [N]px [direction]". Makes the smallest single-constant edit in the right Stage/UI file. The drag-knob debug overlay is scaffolding only (`src/debug/` — `DebugLauncher.launch()` is not wired, no knobs registered), so pixel tuning goes through code edits, not an overlay. Triggers ONLY for nudging an existing element; NOT for adding new UI (use `authentic-ui-rebuild`) and NOT for reading WZ origins from scratch (use `ida-lookup` or the `ui-origin-finder` agent).
---

# layout-tune

In this TS client there is **no live drag overlay yet**. `MAPLECLAUDE_DEBUG=1` is read by
`src/debug/DebugLauncher.ts`, but `DebugLauncher.launch()` is never called and no `DebugItem`
is registered, so the "drag the knob in the overlay" workflow from earlier versions of this
skill does not apply. Every pixel-level nudge is a single-constant code edit in the file that
owns the position.

## Procedure

### 1. Confirm how the client is running (affects validation only)

| Mode | Command | After editing `src/` |
| --- | --- | --- |
| Desktop | `npm run dev` (tsx, Node) | restart to see the change |
| Browser | `npm run dev:browser` (vite) | HMR picks it up live, no restart |

This only changes how *fast* the user sees the result — the edit itself is identical.

### 2. Locate the constant

The position lives in one of:

| Layer | Where to look | Pattern |
| --- | --- | --- |
| Screen-level layout | `src/stages/<X>Stage.ts` (e.g. `GameStage.ts`, `CharCreationStage.ts`) | A constant near the top of the stage class |
| Reusable widget | `src/ui/game/<Widget>.ts` (e.g. `GamePanel.ts`, `ChatBar.ts`, `MiniMap.ts`) | An `_offset`, `_origin`, `_padding`, etc. field, or a `position.set(...)` call |
| WZ-origin-relative | wherever `canvas.origin` is consumed | `const pos = origin + new Vector2(dx, dy)` — change `(dx, dy)` |

Use `Grep` for the existing numeric values the user references (e.g. if the icon is at
y=12 and they want y=16, grep for `12` near the relevant class).

### 3. Apply a single-constant change

Make the smallest possible edit — change just the numeric constant. Don't refactor the
layout, don't extract new helpers, don't rename anything. Three example shapes:

```typescript
// before
_iconOffset = new Vector2(12, 4);
// after
_iconOffset = new Vector2(12, 8);   // +4 y per user request
```

```typescript
const MINIMAP_ICON_Y = 14;
// →
const MINIMAP_ICON_Y = 18;
```

```typescript
const pos = canvas.origin + new Vector2(2, 6);
// →
const pos = canvas.origin + new Vector2(4, 10);
```

### 4. Validate

`tsc --noEmit` (required after every `src/` edit), and run `npm test` (vitest) when
`src/` or `tests/` changed.

### 5. Promote to overlay if churn is high

If the same element has been nudged 3+ times in the recent history, suggest:

> "We've moved this 4 times. Want me to wire up the debug-overlay knob system
> (`src/debug/`) so you can drag-tune it next time without rebuilds?"

The scaffolding already exists:
- `src/debug/DebugItem.ts` — `category`, `name`, `get()`, `set()`, optional
  `getScreenPos`/`setFromScreen`, `draggable`
- `src/debug/DebugRegistry.ts` — `register(item)`, `unregister(...)`, `snapshot()`, `dragMode`
- `src/debug/DebugLauncher.ts` — enabled by `MAPLECLAUDE_DEBUG=1`, exposes the registry on
  `window.__debugRegistry`

A knob registration is a one-liner:

```typescript
registry.register(new DebugItem('EquipPanel', 'name', () => ({ x, y }), (v) => { x = v.x; y = v.y; }));
```

Note the blocker before this becomes usable: `DebugLauncher.launch()` must be called from the
game bootstrap (it currently isn't), and the overlay UI (drag handles + click-to-drag) has to
be built — `src/debug/DebugWindow.ts` only polls the log sink today. Until then, single-constant
edits (steps 2–4) are the whole workflow.

## What to avoid

- Hand-eyeballing a "good enough" value when the WZ canvas carries an authoritative
  origin. If the value is wrong systematically (not just one pixel off), the issue is
  probably an `origin` not being honored — that's a `ui-origin-finder` job, not this
  skill.
- Changing more than one constant per request. Resist "fix the whole layout while you're
  in there" — the user asked for a 3px nudge.
- Re-rebuilding the screen from scratch. If the user is in pixel-tuning mode, they've
  already chosen the WZ-authentic layout; respect it.

## Related skills

- `authentic-ui-rebuild` — for "the whole UI is wrong" (not a per-pixel nudge).
- `ida-lookup` — for "where does the original client put this element". The IDB has the
  authoritative coordinate.
- `ui-origin-finder` (agent) — for full-screen origin extraction.

## Linked memories

`[[ui-origin-tooling]]`, `[[ingame-ui-windows]]`, `[[avatar-rendering]]`,
`[[minimap-system]]`, `[[keyconfig-1to1]]`.
