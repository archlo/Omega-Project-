---
name: wz-reader
description: Use when editing files under src/wz/ or answering any question about the GMS v95 WZ binary format — PKG1 header, version hash, AES string crypt (cryptAscii / cryptUnicode), compressed-int encoding, UOL nodes, canvas decompression (LZ4 / Deflate). Cross-references the TS port against the upstream Kinoko Java reader and the .nx (PKG4) reader in src/wz/NxFile.ts.
---

# wz-reader

GMS v95 WZ files are mmapped binary blobs with a tiny header, a node tree, and
images / sounds / strings packed in a custom format. The TS port lives in
`src/wz/` (the `.nx`/PKG4 reader is `src/wz/NxFile.ts`; the client prefers `.nx`
files in `wz_client/`).

## Reference implementation

Upstream Kinoko's WZ reader (Java) is the authoritative reference:

- <https://github.com/iw2d/kinoko/tree/main/src/main/java/kinoko/provider/wz>
- Key files: `WzPackage.java`, `WzReader.java`, `WzCrypto.java`, `WzImage.java`,
  `WzCanvas.java`, `WzDirectory.java`, `WzUol.java`.

When porting or modifying a WZ subsystem, **diff against the Java reference**
field-by-field. Differences are usually bugs.

## Format quick reference

### PKG1 header

```
"PKG1" magic (4 bytes)
data_size (8 bytes, LE)
header_size (4 bytes, LE) = offset of node tree
copyright (header_size - 16 bytes, ASCII)
version_hash + encryption (after header)
```

The version hash validates the WZ was packed by the expected client version.
For GMS v95: `0x4F69` derived from `"95"`. See Kinoko's `WzPackage.from()` for
the exact derivation.

### Compressed int

Single byte. If `0x80` (sbyte.MinValue), read the next 4 bytes as int32. Else
the byte itself is the int.

### Strings

Length-prefixed compressed-int. If the prefix is negative, ASCII (XOR with
incrementing mask byte starting at `0xAA`). If positive, UTF-16LE (XOR with
incrementing mask short starting at `0xAAAA`). The mask tables are seeded by
WzCrypto.

### Canvas

Compressed byte stream (LZ4 or Deflate depending on format tag), then
AES-128-ECB decrypted with the WZ IV. Output is raw BGRA32 (or one of the
A4R4G4B4 / R5G6B5 formats — convert to BGRA32 on load).

### UOL

A node that's effectively a symlink to another node path. Resolve lazily
during traversal; cache the resolution.

## Edits you might make

| Change | Touch |
| ------ | ----- |
| New pixel format support | `src/wz/WzCanvas.ts` + a test fixture |
| Asynchronous read | `src/wz/WzPackage.ts` open path; keep mmap |
| Version detection | `src/wz/WzPackage.ts` (cross-check `WzPackage.java`) |
| Path resolver tweak | `src/wz/WzPath.ts` |

## Verify before committing

- Run `npx vitest` on WZ-related tests.
- If you added a new pixel format, add a binary test fixture under `tests/Fixtures/`
  with a known SHA256 in the test.
- Confirm no local paths or private project names in the file.
- Propose the commit to the user; wait for approval.
