import { InPacket } from '../packet/InPacket.js';
import { OutHeader } from '../packet/OpCodes.js';
import { PacketRouter } from '../session/PacketRouter.js';
import { ClientSession } from '../session/ClientSession.js';

export interface ITCItemInfo {
  itemId: number;
  price: number;
  count: number;
  seller: string;
}

/** ITC (the standalone in-town-cab "ITC.exe" sub-client that
 *  `CWvsContext::SendMigrateToITCRequest`, decompile/9DEF50.c, migrates the
 *  player into) is a SEPARATE EXECUTABLE from the main game client this
 *  decompile dump covers. `CWvsContext::OnPacket` (decompile/9E5830.c) only
 *  dispatches opcodes 28-140; ITCNormalItemResult/ITCChargeParamResult/
 *  ITCQueryCashResult (410/411/412) are far outside that range and no
 *  ITC-side `OnPacket`/`OnItcNormalItemResult`-style class exists anywhere
 *  in this export — confirmed by grepping function_index.txt for "ITC":
 *  the only hit is the migrate-request sender itself. Real per-opcode field
 *  shapes are therefore UNCONFIRMED and architecturally unverifiable from
 *  this decompile; do not trust the field layouts below as decompile-exact.
 *
 *  What WAS a confirmed, fixable bug (independent of the unknown field
 *  shapes): the previous version routed all 3 of these opcodes through one
 *  shared `_handle` keyed on a fabricated leading `nType` byte (1/3/4), as
 *  if they were sub-cases of a single dispatch — the exact same fabricated-
 *  shared-subtype-byte mistake pass 8 already found and fixed in
 *  `CashShopHandlers.ts` ("no shared subtype byte across opcodes — that was
 *  fabricated too") and `MapleTVHandlers.ts` ("three independently-shaped
 *  opcodes, no shared subtype byte — the 405/406/407 split IS the
 *  dispatch"). 410/411/412 are three separate, independently-routed
 *  `OutHeader` values exactly like every other opcode family in this
 *  codebase's `PacketRouter` — there is no decompiled or in-codebase
 *  precedent anywhere for one packet body carrying an extra internal type
 *  byte on top of its own distinct opcode. Reading that phantom byte
 *  desynced every field after it on every single ITC packet, and the
 *  blanket try/catch-and-skip wrapper silently swallowed the resulting
 *  decode failure — same "total feature outage, never logged" bug class as
 *  pass 10's IncSp/IncFame findings. Fixed by giving each opcode its own
 *  handler with no shared type byte. Left ITCNormalItemResult's per-item
 *  field shape (itemId/price/count/seller) as the existing best-effort guess
 *  since it has no decompile to confirm or refute it either way (same
 *  category as `CashShopCashItemResult`'s opaque-payload precedent would
 *  apply if even the count-prefix shape were unconfirmed — here at least
 *  the outer split is now correct, which is what's actually checkable).
 *  No UI consumes any of these three callbacks (confirmed: zero references
 *  outside this file and `MapleClaudeGame.ts`'s construction/registration) —
 *  same "wired but nothing listens yet" gap as before, not new. */
export class ITCHandlers {
  onItemList: ((items: ITCItemInfo[]) => void) | null = null;
  onChargeResult: ((nxCredit: number, nxPrepaid: number) => void) | null = null;
  onQueryCashResult: ((nxCredit: number, nxPrepaid: number) => void) | null = null;

  clear(): void {
    this.onItemList = null;
    this.onChargeResult = null;
    this.onQueryCashResult = null;
  }

  register(router: PacketRouter): void {
    router.register(OutHeader.ITCNormalItemResult, (p, s) => this._handleItemList(p));
    router.register(OutHeader.ITCChargeParamResult, (p, s) => this._handleChargeResult(p));
    router.register(OutHeader.ITCQueryCashResult, (p, s) => this._handleQueryCashResult(p));
  }

  private _handleItemList(p: InPacket): void {
    try {
      const count = p.readShort();
      const items: ITCItemInfo[] = [];
      for (let i = 0; i < count; i++) {
        items.push({
          itemId: p.readInt(),
          price: p.readInt(),
          count: p.readInt(),
          seller: p.readString(),
        });
      }
      this.onItemList?.(items);
    } catch { /* unconfirmed shape — see class doc comment */ }
  }

  private _handleChargeResult(p: InPacket): void {
    try {
      const nxCredit = p.readInt();
      const nxPrepaid = p.readInt();
      this.onChargeResult?.(nxCredit, nxPrepaid);
    } catch { /* unconfirmed shape — see class doc comment */ }
  }

  private _handleQueryCashResult(p: InPacket): void {
    try {
      const nxCredit = p.readInt();
      const nxPrepaid = p.readInt();
      this.onQueryCashResult?.(nxCredit, nxPrepaid);
    } catch { /* unconfirmed shape — see class doc comment */ }
  }
}
