---
name: crypto-validator
description: Use when editing any file under src/net/crypto/ or when investigating a packet desync. Triggers on references to AES, Shanda, IV, IGCipher, InnoHash, packet cipher, or header XOR. Ensures the TS pipeline produces byte-identical output to the v95 protocol using the known-vector tests in tests/net/crypto/.
---

# crypto-validator

The cipher pipeline is the most fragile part of the protocol layer. A
single-byte divergence anywhere makes the entire session unrecoverable. Every
change to `src/net/crypto/` must pass byte-exact round-trips against the known
vectors.

## Pipeline (must match upstream)

```
encrypt(body, iv):
    body = ShandaCrypto.encrypt(body)            // 3-pass byte shuffle
    body = MapleCrypto.crypt(body, iv)           // AES-128 ECB, expanded-IV, 1456-byte blocks
    iv   = IgCipher.innoHash(iv)                 // 4-byte IV rotation

decrypt(body, iv):
    body = MapleCrypto.crypt(body, iv)           // same call (XOR / ECB symmetric)
    body = ShandaCrypto.decrypt(body)
    iv   = IgCipher.innoHash(iv)
```

Header (4 bytes, LE):

```
rawSeq  = (iv[2] | (iv[3] << 8)) ^ (0xFFFF - GAME_VERSION)   // GAME_VERSION = 95
dataLen = payloadLen ^ rawSeq
```

## Reference

- `src/net/crypto/IgCipher.ts`, `MapleCrypto.ts`, `ShandaCrypto.ts`, `AesUserKey.ts`,
  `PacketCipher.ts` — the TS port, in `src/net/crypto/`.
- Known vectors are pinned in the tests under `tests/net/crypto/`
  (`IgCipher.spec.ts`, `MapleCrypto.spec.ts`, `ShandaCrypto.spec.ts`,
  `PacketCipher.spec.ts`).
- The upstream Kinoko Java implementations are public references:
  - <https://github.com/iw2d/kinoko/blob/main/src/main/java/kinoko/util/crypto/IGCipher.java>
  - <https://github.com/iw2d/kinoko/blob/main/src/main/java/kinoko/util/crypto/MapleCrypto.java>
  - <https://github.com/iw2d/kinoko/blob/main/src/main/java/kinoko/util/crypto/ShandaCrypto.java>

## Validation checklist

For every change in `src/net/crypto/`:

1. `npx vitest` with crypto tests is green.
2. Each cipher has at least one **known-vector test** with a fixed input and
   expected output (capture the expected from a quick Java run against the
   same input, or from the v95 dump).
3. `MapleCrypto.Crypt(MapleCrypto.Crypt(buf, iv), iv)` returns `buf` unchanged
   (symmetry test).
4. `ShandaCrypto.Decrypt(ShandaCrypto.Encrypt(buf))` returns `buf` unchanged.
5. `IgCipher.InnoHash` over a known 4-byte seed produces the expected 4-byte
   output for 256 successive iterations.
6. The 4-byte header round-trips: build with `PacketCipher.BuildHeader(payload.length, iv, dest)`,
   parse with `PacketCipher.ParseHeader(header, iv)`, and the parsed length matches.

## Common failure modes

- **Wrong endianness on the header** — always little-endian.
- **IV not rotated** between packets — every encrypt AND every decrypt.
- **Block-boundary off-by-one in `MapleCrypto`** — the 1456-byte rule means
  the IV is "expanded" (4 bytes × 4 = 16) and re-keyed each block.
- **Wrong AES key** — must match Kinoko's `MapleCrypto.AES_USER_KEY`.

## Verify before committing

- All cipher tests pass.
- No console writes left in `src/net/crypto/`.
- No local paths or private project names in the file.
- Propose the commit to the user; wait for approval.

## Hand-off

For desync bugs at runtime, trace the IV state divergence across
`PacketCipher` and the suspect handlers — compare our `src/net/crypto/`
against the v95 packet decode sequence (see `tests/net/crypto/PacketCipher.spec.ts`).
