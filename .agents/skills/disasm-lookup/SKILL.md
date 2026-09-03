---
name: disasm-lookup
description: Use when an answer would benefit from looking up an original v95 client function or class by name. Resolves the symbol through a machine-local, gitignored reference index defined in CLAUDE.local.md. Never prints, quotes, or commits the local absolute paths it reads from. Surfaces only the conceptual content of the resolved snippet (paraphrased), never the path or filename.
---

# disasm-lookup

A machine-local reference index for original v95 client functions may exist on
the developer's machine. The locations are recorded in `CLAUDE.local.md`,
which is gitignored. Those locations must never appear in any committed file,
PR description, commit message, or chat output.

## How to resolve a symbol

1. Read the user's `CLAUDE.local.md` to find which reference resources are
   configured locally and where. Two kinds may be present: static pseudocode/asm
   dumps, and/or a live IDA Pro database exposed through an `idalib` MCP server
   (headless — bind it by opening the local `.i64`, with the IDA GUI closed). When
   the live database is available, prefer it: it has demangled names and lets you
   decompile, resolve StringPool ids, and read struct offsets on demand.
2. If a reference index is configured, use it to resolve the symbol you were
   asked about.
3. Surface the resolved content **paraphrased**, never as a copy-paste. Frame
   it as "here's how the equivalent flow is structured" rather than a verbatim
   excerpt.
4. If no reference is configured locally, say so — do not invent.

## Acceptable use

- Translating logic from a resolved snippet into MapleClaude's modern ts
  equivalent (modernize and fix up; never line-by-line port).
- Explaining in chat how the equivalent flow worked in the original.

## Forbidden — applies to every output

- Pasting absolute paths from the local reference into any file or message.
- Pasting short filenames, hashes, or directory names from the local index
  into any committed file or PR body.
- Quoting more than a few lines verbatim in chat; prefer a paraphrase.
- Referencing any private project name in committed files.

## Verify before committing

After using this skill, scan your diff with `git diff` and confirm no path
fragment from `CLAUDE.local.md` appears in the staged changes. Abort the
commit if any do.
