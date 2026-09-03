---
name: wz-gap-implement
description: Use when the user wants to actually wire up WZ nodes/fields/actions that the ts client doesn't read yet — phrases like "implement the missing wz nodes", "wire up the `jump` node for mobs", "add `chase` to MobInfo", "implement the missing nodes that aren't being used", "now implement the gaps", "add the unread fields we found", "fix the missing wz capabilities", "expose `<field>` on `<X>Info`". Expects either a specific gap (e.g. "implement `info/jump` on MobInfo") or a list from a prior `wz-gap-audit` run. Wires the WZ node into the typed TS model + service + any runtime consumer, builds, and runs the relevant tests. Triggers NOT for the audit pass itself (use `wz-gap-audit`) and NOT for inventing new fields with no WZ source.
---

# wz-gap-implement

Turns a `wz-gap-audit` finding into wired-up code: typed property on the
`<X>Info`, parse call in `<X>InfoService`, and a runtime consumer where one
makes sense.

## When to use

- Right after a `wz-gap-audit` produced a punch list, and the user says
  "implement those" / "wire those up" / "now do them".
- When the user names a specific WZ node and asks for it to be exposed
  ("add `info/jump` to MobInfo").
- When you've discovered mid-task that a WZ-driven behaviour is unread and
  the user wants it fixed before continuing.

## When NOT to use

- Inventing fields that don't exist in any WZ — out of scope.
- Greenfield typed-model creation for a new subsystem → `wz-subsystem-research`.
- UI-only work (rendering an unread action animation but with no behavioural
  hook) → `authentic-ui-rebuild` + this skill in tandem.
- Editing the WZ binary reader itself → `wz-reader`.

## Inputs

Either:

- One specific gap: `(<wz>, <node path>, <reader file>)`.
- A list of gaps from a prior audit.

If the user is vague, run `wz-gap-audit` first OR ask which gap to start with.

## Workflow per gap

1. **Reproduce the node.** Pick one entry that has the gap and run `dump --json`
   on it via the explorer:

   ```bash
   python nx-tools/nxtools.py dump wz_client/<Subsystem>.nx <entry>/<node> --json
   ```

   That gives you the leaf shape — primitive type, default value, whether
   it's a scalar / vector / sub-property / canvas. Decide the TS type.

2. **Confirm the meaning.** Read the matching server-side loader at
   `C:\Users\jorge\OneDrive\Desktop\server\src\provider\<subsystem>\<X>Template.ts`
   for the server-side meaning. For client-only semantics, drive `ida-lookup` for
   the matching C++ struct (`CMob::*`, `CItem::*`, `CSkill::*` etc.). One
   sentence is enough.

3. **Edit the typed model.** Add the property to
   `src/<area>/<X>Info.ts`. Naming convention: camelCase
   (private field) or PascalCase (public getter), sensible default that
   matches "node absent". For action subtrees (e.g. `jump`), the model
   usually holds a presence bool (`hasJump`) and the animation lives in
   the canvas cache, not in `<X>Info`. Match the style of nearby existing
   properties.

4. **Edit the service.** Add the parse call in
   `src/<area>/<X>InfoService.ts`. Use the existing read helpers.
   For action presence:

   ```typescript
   hasJump: root.get("jump") instanceof WzProperty,
   ```

   For nested sub-properties, decide whether to inflate into a nested class
   (`MobAttack`-style) or keep a couple of scalar properties. Prefer the
   simpler shape unless the audit shows the node has 3+ fields.

5. **Wire the consumer.** This is the step gap-audit can't do for you. Find
   where the *runtime* would want the new field. Examples:
   - `hasJump` → `MobController.ts` consults it before triggering a jump.
   - `info/chargeCount` → already in `MobInfo`; consumer is the attack
     selection in `MobController.ts`.
   - Sound nodes → `MobSoundService` and the hit/die handler in
     `GameStage.ts`.

   If no consumer obviously fits, leave the field exposed but unused, and
   call that out in the report. Don't fabricate gameplay logic.

6. **Build.** `npx tsc --noEmit`. Fix warnings/errors before moving on.

7. **Test what's testable.** If tests exist under `tests/` that exercise
   the area, run `npx vitest` for that project. If not, add a tiny fixture
   only if the parse is non-trivial (don't add tests for one-line property
   reads).

8. **Report.** One line per gap implemented:

   ```
   - info/jump → MobInfo.hasJump (added; consumer wired in MobController.ts:271)
   - info/chase → MobInfo.hasChase (added; no runtime consumer yet)
   ```

   Plus a small "deferred" list if any gap couldn't be wired safely (e.g.
   requires animation system changes beyond this skill's scope).

## Conventions

- **One commit per gap (or per cohesive small batch).** Per CLAUDE.md, ask
  the user before each commit; don't auto-commit.
- **No backwards-compat shims.** Add the field cleanly; defaults make
  pre-existing call sites continue to work.
- **No premature abstractions.** A presence bool is fine for actions; only
  inflate into a record type when the node has multiple fields the consumer
  will read.
- **No invented behaviour.** If you don't know what `info/escortType` does,
  expose it as `escortType: number` and stop. Document the unknown in the
  property's comment.

## Output

- Show the diff in the report (one block per modified file).
- Report `npx tsc --noEmit` result.
- If a test was added or run, report its outcome.
- DO NOT push or open a PR — that's `ship-pr`.

## Privacy

- WZ node paths and public server paths may be quoted.
- IDB-derived semantics must be paraphrased, never pasted verbatim.
- Never write a local absolute path, or any of the private-reference tokens listed in CLAUDE.local.md, anywhere in committed files.
