---
name: ship-pr
description: Use when the user wants the current branch's work shipped through the full commit → push → PR → merge sequence — phrases like "commit, pr, merge", "commit, push, PR, merge", "go ahead commit pr and merge", "go ahead push pr and merge", "commit and push everything", "create the PR and merge", "open a PR", "ship it", "auto merge", "auto-merge", "commit, push, open a PR, and merge to master", "go ahead push open a pr and merge". Runs the privacy guard first, drafts the standard MapleClaude PR template (Summary / Test plan / Risk assessment / Recommendation), and ALWAYS asks for explicit commit-message approval before running `git commit` per CLAUDE.md. Triggers NOT for read-only inspection (`git status` / `git log` / `git diff`) and NOT for force-pushes or master-direct pushes.
---

# ship-pr

The MapleClaude project ships every phase through a commit → push → PR → merge sequence
with hard rules baked in:

- **Never commit on master** (CLAUDE.md). Master only receives merge commits.
- **Always ask the user for permission before each commit.** Auto-committing is forbidden.
- **PR description follows a standard template** (Summary / Test plan / Risk / Recommendation).
- **The `pr-privacy-guard.local` skill MUST run** before any `gh pr create` / `gh pr edit`
  / `gh pr comment` / `git push` of a new branch.

This skill owns the sequence. It is sequential — never skip a step.

## Procedure

### Step 0 — Confirm we're not on master

```powershell
git rev-parse --abbrev-ref HEAD
```

If output is `master` or `main`: STOP. Tell the user we cannot commit on master and ask
them to cut a `phase-N/<slug>` branch. Do not auto-create the branch — let the user pick
the name.

### Step 1 — Show current state

Run in parallel:

```powershell
git status
git diff --cached
git log --oneline -10
```

This gives:

- What's staged (`git status`).
- What the staged changes look like (`git diff --cached`).
- Recent commit message style to match (`git log --oneline -10`).

### Step 2 — Draft the commit message

Format per CLAUDE.md:

```
phase-N(scope): imperative subject

Body explains the *why*, not the *what*. The diff already tells the reader
the what. The body should answer: what problem did this solve, what was the
constraint, what was rejected and why.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

`N` matches the current phase from `docs/roadmap.md`. `scope` is a short tag (`ingame`,
`combat`, `login`, `ui`, `audio`, `net`, `crypto`, `wz`, `render`, `tests`, `build`).
Subject is imperative, no trailing period, under 70 chars.

### Step 3 — Run the privacy guard

`pr-privacy-guard.local` scans the title + body + included commit messages for forbidden
tokens. If it returns hits, follow its prompts (auto-scrub / show cleaned draft for
approval / explicit override). DO NOT commit until the guard reports zero hits or the
user explicitly overrides.

### Step 4 — ASK for commit approval (NON-NEGOTIABLE)

Present:

- The staged files list.
- The drafted commit message.

Wait for **explicit user approval** ("yes", "go", "commit it", etc.). Don't proceed on a
silent reply. CLAUDE.md is explicit: "auto-committing is forbidden".

If the user says "wait, change X" — update the message, re-run the privacy guard, ask
again.

### Step 5 — Commit

```powershell
git commit -m @'
phase-N(scope): subject

Body...

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
'@
```

Use a single-quoted PowerShell here-string (the closing `'@` MUST be at column 0). If a
pre-commit hook fails: do NOT `--amend` (the commit didn't happen yet; amend would
overwrite the previous commit). Fix the issue, re-stage, draft again, commit fresh.

### Step 6 — Push

First push on a new branch:

```powershell
git push -u origin <branch>
```

Subsequent pushes:

```powershell
git push
```

Never `--force` unless the user explicitly asked. Never push to master.

### Step 7 — Open the PR

Use the MapleClaude standard template via `gh pr create`:

```powershell
gh pr create --title "phase-N(scope): subject" --body @'
## Summary

- bullet 1
- bullet 2
- bullet 3

## Test plan

- [ ] `tsc --noEmit` clean
- [ ] `npx vitest` clean
- [ ] Live client smoke test (drove the feature manually)
- [ ] (any feature-specific checks)

## Risk assessment

- **Protocol:** does this change packet wire format? (yes/no — and what)
- **Cipher:** does this touch the AES/Shanda/IGCipher path? (yes/no)
- **Asset:** does this change WZ reading? (yes/no)
- **Future-compat:** does this lock in any decision that's hard to undo? (yes/no)

## Recommendation

`ACCEPT` / `ACCEPT WITH CHANGES` / `HOLD`
'@
```

Privacy guard runs again here on the PR body. Branch name must match `phase-N/<slug>`.

### Step 8 — Ask about merging

The user often says "commit, pr, merge" in one breath — that counts as merge authorization
for THIS PR.

If they said "merge" — proceed to step 9.
If they did NOT say "merge" — stop after PR creation; surface the PR URL.

### Step 9 — Merge

Match the merge style already in use on this repo. Check recent merges:

```powershell
git log --oneline --merges -5
```

The repo currently uses standard merge commits via PR. The default safe call:

```powershell
gh pr merge <num> --merge --delete-branch
```

Alternatives (only if the user / repo convention prefers them):

```powershell
gh pr merge <num> --squash --delete-branch    # squash
gh pr merge <num> --rebase --delete-branch    # rebase
```

After merge: `git checkout master && git pull` so the local workspace stays current.

## Concurrent-work tricks (memory: [[concurrent-git-workflow]])

The user routinely has tens of unstaged files from in-progress work when they ask you to
ship a focused change. **Never** `git add .` / `git add -A` / `git add <whole-tracked-file>`
when the file you touched also has user edits — you'll pull in their work-in-progress.

Recipe to stage just your own hunk inside a file the user has also modified:

1. Find your hunk in HEAD's coordinates: `git show HEAD:<file> | grep -n <unique-token>`,
   then `git show HEAD:<file> | sed -n '<lo>,<hi>p'` for context.
2. Write a HEAD-relative patch to a temp file (`@@ -X,Y +X,Y @@` with `git show HEAD:<file>`
   line numbers, **not** working-tree line numbers).
3. `git apply --cached <patch>` then `rm <patch>`. The patch applies to the index without
   touching the working tree, so the user's other edits stay where they are.
4. For files you're the only author on, plain `git add <file>` is fine.
5. Verify with `git diff --cached --stat` and `git diff --cached` before drafting the
   commit message — confirm only your bytes are staged.

## Bash-tool here-string trap

The MapleClaude environment is PowerShell, but the Bash tool runs through Git Bash. PowerShell
here-strings (`@'...'@`) are NOT bash heredocs — bash takes the leading `@` literally and you
end up with stray `@` lines as the commit subject. **Inside the Bash tool, always use a real
heredoc:**

```bash
git commit -F - <<'EOF'
phase-N(scope): subject

Body.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
```

If you accidentally commit with stray `@`s, `git reset --soft HEAD~1` (the new branch is
local-only at that point, no `--amend` controversy) and recommit with a proper heredoc.
Verify with `git log -1 --pretty=full` before pushing.

## `gh pr merge` with a dirty working tree

`gh pr merge <num> --merge --delete-branch` merges remotely FIRST, then tries to do a local
`git checkout master && git pull`. If the working tree is dirty (which it usually is when the
user has parallel work), the local checkout fails with:

```
error: Your local changes to the following files would be overwritten by checkout:
```

**The remote merge still succeeded.** Don't retry, don't reset, don't stash the user's work.
Confirm with `gh pr view <num> --json state,mergedAt,mergeCommit` (expect `MERGED`), then run
`git fetch origin --prune` to update local refs without touching the working tree. Tell the
user the merge succeeded and that they can switch to master themselves once they handle their
WIP.

## Hard rules (never break)

- Never commit on master.
- Never skip Step 4 (ask before commit).
- Never `--no-verify` or `--no-gpg-sign` unless explicitly instructed.
- Never `--force` push without explicit instruction.
- Never auto-merge a PR the user did not authorize.
- Never include forbidden tokens (privacy guard catches but DON'T rely on it alone — read
  the diff first).

## Common failure modes

| Symptom | Cause | Fix |
| --- | --- | --- |
| `git commit` exits 1, pre-commit hook failed | Hook found an issue | Fix the issue, re-stage, NEW commit (no `--amend`). |
| `gh pr create` complains "no commits on branch" | Forgot to push | `git push -u origin <branch>` first. |
| Privacy guard fires repeatedly on same line | Auto-scrub didn't catch a variant | Hand-edit the line, re-run guard. |
| User asks to revise commit message after push | Commit already on origin | New commit on top is safest; only `--amend` + force-push if user explicitly OKs it. |

## Related skills

- `pr-privacy-guard.local` — mandatory pre-publish scan (this skill calls it).
- `autonomous-phase` — calls this skill at end of each phase.
- All implementation skills (`ingame-feature`, `authentic-ui-rebuild`, etc.) end by
  invoking this skill.
