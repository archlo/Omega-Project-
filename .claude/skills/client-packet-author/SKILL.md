---
name: client-packet-author
description: Use when authoring an outgoing client→server packet in the TS client. Triggers on phrases like "send a packet", "client request for X", "add a C→S packet", or any reference to an InHeader entry. Locates the opcode in `src/net/packet/OpCodes.ts`, finds the matching server-side handler in our own server at `C:\Users\jorge\OneDrive\Desktop\server`, then generates a TS `OutPacket` encoder in `GameSender`/`LoginSender` that writes fields in the order the server reads them.
---

# client-packet-author

When you're writing a packet the client sends to the server, walk through these steps:

## 1. Identify the opcode

Look up the named opcode in `src/net/packet/OpCodes.ts` (the `InHeader` enum).
Values are pinned to the v95 dump — `tests/net/packet/OpCodes.spec.ts` asserts every
entry still matches the reference. If the symbol is missing, add it there first.

## 2. Find the server-side reader

Our own server repo is `C:\Users\jorge\OneDrive\Desktop\server`. Search
`server/src/handlers/` for the matching handler (e.g. `FieldHandler.ts`,
`InventoryHandler.ts`) — the read order there is the order you must write in.

| Server read | TS write |
| ----------- | -------- |
| `packetReader.readByte()` / `decodeByte` | `p.writeByte(x)` / `writeSByte(x)` |
| `packetReader.readShort()` | `p.writeShort(x)` |
| `packetReader.readInt()` | `p.writeInt(x)` |
| `packetReader.readLong()` | `p.writeLong(BigInt(x))` |
| `packetReader.readString()` | `p.writeString(s)` (length-prefixed `short`) |
| `packetReader.readBytes(n)` | `p.writeBytes(buf)` (length is contextual) |

## 3. Write the encoder

Add a static method to `src/net/senders/GameSender.ts` (in-game) or
`LoginSender.ts` (login/world/char-select), or a standalone encoder module in
`src/net/packet/` when the packet is a shared composite:

```typescript
export function buildExample(charId: number, machineId: Uint8Array): OutPacket {
    const p = OutPacket.Of(InHeader.UserCharacterInfoRequest);
    p.writeInt(charId);
    p.writeBytes(machineId);
    p.writeByte(0);
    return p;
}
```

Call `session.send(buildExample(...))` (or the `GameSender.<X>(...)` helper).

## 4. Verify before committing

- Run `tsc --noEmit`.
- Run `npx vitest` if tests exist for the new packet (see `tests/net/packet/`).
- If feasible, smoke-test against our running server (`C:\Users\jorge\OneDrive\Desktop\server`)
  and watch the server logs for a parse error on the new opcode.
- Confirm no local paths or private project names in the file.
- Propose the commit to the user; wait for approval.

## Hand-off

If the C→S packet is part of a multi-step flow (e.g. login → world list → char select),
coordinate the whole sequence with `ingame-feature`.
