---
name: server-packet-mirror
description: Use when implementing a server→client opcode handler in the TS client. Triggers on phrases like "implement opcode X", "handle a new server packet", "add a S→C handler", or any reference to an OutHeader entry. Locates the opcode in `src/net/packet/OpCodes.ts`, finds the matching packet builder in our own server at `C:\Users\jorge\OneDrive\Desktop\server`, then generates a matching TS `InPacket` decoder in `src/net/handlers/` that reads fields in the same order the server writes them.
---

# server-packet-mirror

When you're adding a handler for a packet the server sends to the client, walk through these steps:

## 1. Identify the opcode

Look up the named opcode in `src/net/packet/OpCodes.ts` (the `OutHeader` enum).
Values are pinned to the v95 dump — `tests/net/packet/OpCodes.spec.ts` asserts every
entry still matches the reference. Add the symbol there if missing.

## 2. Find the builder

Our own server repo is `C:\Users\jorge\OneDrive\Desktop\server`. Search
`server/src/server/channel/` or `server/src/.../packet/` for a method that writes
`OutHeader.<YourOpcode>` — the body of that method is the wire encoding, in field
order, with the exact write calls:

| Server write | TS read |
| ------------ | ------- |
| `encodeByte(x)` / `writeByte(x)` | `p.readByte()` (signed/unsigned per usage) |
| `encodeShort(x)` / `writeShort(x)` | `p.readShort()` |
| `encodeInt(x)` / `writeInt(x)` | `p.readInt()` |
| `encodeLong(x)` / `writeLong(x)` | `p.readLong()` (returns `bigint`) |
| `encodeString(s)` / `writeString(s)` | `p.readString()` (length-prefixed `short`) |
| `encodeArray(buf)` | `p.readBytes(len)` (length is contextual; check the builder) |
| `encodeFT(time)` | `p.readLong()` (FileTime as 64-bit LE) |

## 3. Generate the handler

Create or extend a handler in `src/net/handlers/` named after the flow (e.g.
`LoginHandlers`, `FieldHandlers`, `CashShopHandlers`). Match the field order **exactly**.

```typescript
export function handleExample(session: ClientSession, p: InPacket): void {
    const someByte = p.readByte();
    const someInt  = p.readInt();
    const someStr  = p.readString();
    // dispatch to stage / domain
    session.stage.onExample(someByte, someInt, someStr);
}
```

## 4. Register it

Wire it into the handler class's `register(router: PacketRouter)` method
(see the existing `*Handlers.ts` for the pattern), and ensure the class is
instantiated + registered in `src/MapleClaudeGame.ts`. Confirm via a unit test
that captures a real packet against our server (`tests/net/handlers/`).

## 5. Verify before committing

- `git grep` for `// TODO` and remove or convert to issues.
- Run `tsc --noEmit`.
- Run `npx vitest` on `tests/` if tests exist.
- Confirm no local paths or private project names slipped into the file.
- Propose the commit to the user; wait for approval (see `CLAUDE.md` git workflow).

## Hand-off

For deeper work (a flow that spans many packets), coordinate with `ingame-feature`
instead — it loads the full server→client flow and the matching handler chain.
