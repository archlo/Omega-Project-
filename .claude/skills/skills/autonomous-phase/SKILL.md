---
name: autonomous-phase
description: Use when the user explicitly hands off the phase queue and wants Claude to pick the next item from `docs/roadmap.md` and run it to completion, then loop — phrases like "continue with the next phase", "do the next phase", "do the next phase from the readme", "continue with the phases", "continue with the phases to be implemented from the readme", "auto-implement the rest of the phases", "on auto mode dont ask me about anything", "im going to bed", "keep going on the roadmap", "keep going", "auto-run the roadmap". Reads `docs/roadmap.md` for the next un-shipped phase, plans, implements (delegating to `authentic-ui-rebuild`, `ingame-feature`, `wz-audio-bind`, `wz-subsystem-research`, packet skills as needed), tests, and ships via `ship-pr` — which still asks for per-commit approval per CLAUDE.md (no blanket auto-commit). Loops to the next phase until interrupted, roadmap exhausted, or three consecutive failures. Triggers NOT for a single mid-flight task (just keep working) and NOT for short replies like "continue" that mean "continue the current thread", not "start the next phase".
---

# autonomous-phase

For when the user hands off the queue — "im going to bed, do it all", "on auto mode dont
ask me", "continue with the phases". This skill picks up `docs/roadmap.md`, runs the next
un-shipped item end-to-end, and loops.

## What "autonomous" means here

The user gave a blanket authorization to **continue picking phases** without re-asking
"what next?". That is NOT a blanket authorization to skip commit approvals.

| Phase | Auto-bias |
| --- | --- |
| Pick the next phase from the roadmap | YES — don't re-ask |
| Plan the phase | YES — bias toward making reasonable calls |
| Implement | YES |
| Run `tsc --noEmit` + `npx vitest` | YES |
| Drive the live client smoke test | YES (within reason — `npm run dev` / `dev:browser` permitting) |
| **Commit** | **NO — always ask per CLAUDE.md** |
| Push, open PR | YES, immediately after commit lands |
| Merge | YES if the user's hand-off included "and merge" / "auto-merge" / "ship it" |
| Move to the next phase | YES |
| Stop on three consecutive failures | YES — escalate |

The commit-ask is the ONLY hard human-in-the-loop step. Everything else proceeds without
re-asking.

## Procedure

### 1. Read the roadmap

```text
Read docs/roadmap.md
```

Find the lowest-numbered phase that isn't marked done. Phases on the master branch's
recent history are done; phases not yet shipped are candidates.

Sanity-check with `git log --oneline | head -20` — the recent commits announce shipped
phases (`phase-26(ingame-ui): ...`).

### 2. Decide the scope of "next phase"

A phase entry in roadmap.md may be a whole phase (with sub-items) or a single sub-item.
Run the most granular unit that:

- Has a self-contained acceptance criterion.
- Can land as one PR.
- Doesn't require a user-only decision (UI design choice, art direction, asset
  prioritization).

If the next item REQUIRES a user-only decision, stop and ask. Don't guess art direction
or design intent.

### 3. Plan

Use the `Plan` agent for non-trivial phases. For small ones, plan in-thread.

The plan should:

- Name the files that will change.
- Name the skills that will be invoked (`authentic-ui-rebuild`, `ingame-feature`,
  `wz-subsystem-research`, etc.).
- List the acceptance checks.

Don't post the plan to the user for approval — they handed off the queue. Just proceed.
(If the plan reveals a user-only decision, THEN stop and ask.)

### 4. Implement

Delegate per phase shape:

| Phase shape | Skill to use |
| --- | --- |
| Replace placeholder UI with authentic WZ+IDB version | `authentic-ui-rebuild` |
| New player / world feature end-to-end | `ingame-feature` |
| Build a typed model for a whole WZ subsystem | `wz-subsystem-research` |
| Sound binding | `wz-audio-bind` |
| New C→S packet | `client-packet-author` |
| New S→C packet | `server-packet-mirror` |
| Crypto / cipher work | `crypto-validator` |
| WZ format / reader work | `wz-reader` |
| Pure pixel nudge of an already-built screen | `layout-tune` |

If the phase touches multiple, sequence them in the same PR.

### 5. Test

- `tsc --noEmit` (clean).
- `npx vitest` (clean — existing + any new tests added).
- Live client smoke test via `npm run dev` / `npm run dev:browser`.

If any of these fail and a clear fix is in reach, fix it. If the failure mode looks like
the phase scope is wrong (missing assumption, missing dependency), stop and surface to
the user.

### 6. Ship

Invoke `ship-pr`. That skill handles privacy guard + commit-message draft + commit ASK
(yes, even in auto mode) + push + PR template + merge.

### 7. Loop or stop

After the PR is shipped:

- **If the user's hand-off included "go all night" / "keep going" / "im going to bed" / "auto":**
  jump back to step 1 with the next phase.
- **If the user only said "continue with the next phase" (singular):** stop after one phase
  and report back.
- **If three consecutive phases failed** (build / test / unrecoverable design ambiguity):
  stop, escalate to the user with all three failure summaries.
- **If the roadmap has no more un-shipped items:** stop, report "roadmap exhausted".
- **If the user interrupts** with any substantive message (not just "ok"): switch back to
  responsive mode immediately.

## What auto mode does NOT bypass

- **Commit asks** (CLAUDE.md is explicit).
- **Privacy guard hits** (`pr-privacy-guard.local` is non-overridable in auto mode; if it
  hits, surface immediately to the user).
- **Force-push / master-direct push.** Auto mode never force-pushes and never pushes to
  master.
- **`--no-verify` on commits.** Hooks run.
- **User-only decisions** — art / design / scope. Surface and stop.

## Reporting back

After each phase ships, post a short status line:

```
phase-N (<scope>) shipped → PR #M merged. Next: phase-N+1 (<scope>).
```

After three phases (or on stop): post a longer summary with PR links so the user can
review on wake-up.

## Privacy

Auto mode does not relax privacy. Every PR / commit goes through
`pr-privacy-guard.local`. Every IDB lookup respects the no-path-leak rule.

## Related skills

- `ship-pr` — every phase ends here.
- `pr-privacy-guard.local` — fires inside `ship-pr`.
- All implementation skills — called from step 4.
- `Plan` agent — called from step 3.

## Linked memories

`[[concurrent-git-workflow]]` (the user does parallel work on the same repo mid-session
— always re-check branch + status before each commit/push).
