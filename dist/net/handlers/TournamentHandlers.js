import { OutHeader } from '../packet/OpCodes.js';
/** CField_Tournament::OnPacket (decompile/563780.c). Dispatches opcodes
 *  374-377 to one dedicated sub-function each; 378 is an explicit
 *  `return;` no-op in the real switch, not a missing case. */
export class TournamentHandlers {
    onTournamentInfo = null;
    /** TournamentMatchTable (375) — CField_Tournament::OnTournamentMatchTable
     *  (decompile/5630D0.c) only allocates a `CMatchTableDlg` and hands the raw
     *  packet to its constructor for further decode; that constructor body
     *  does not exist anywhere in this decompile export (confirmed: zero hits
     *  for `CMatchTableDlg` in function_index.txt beyond this one call site).
     *  Field shape is unconfirmable — exposes the raw remaining payload only. */
    onTournamentMatchTable = null;
    onTournamentSetPrize = null;
    onTournamentUEW = null;
    clear() {
        this.onTournamentInfo = null;
        this.onTournamentMatchTable = null;
        this.onTournamentSetPrize = null;
        this.onTournamentUEW = null;
    }
    register(router) {
        router.register(OutHeader.TournamentInfo, (p, _s) => this._handleTournamentInfo(p));
        router.register(OutHeader.TournamentMatchTable, (p, _s) => this._handleTournamentMatchTable(p));
        router.register(OutHeader.TournamentSetPrize, (p, _s) => this._handleTournamentSetPrize(p));
        router.register(OutHeader.TournamentUEW, (p, _s) => this._handleTournamentUEW(p));
        // TODO_AUDIT.md Hundred-and-fifty-sixth pass: opcode 378 confirmed dead in CField_Tournament::OnPacket (decompile/563780.c — return;). Registered as no-op to close audit gap.
        router.register(OutHeader.TournamentNop378, (_p) => { });
    }
    // CField_Tournament::OnTournament (decompile/5631A0.c) — reads exactly two
    // bytes regardless of which branch the (client-internal, non-packet) gate
    // takes: `flag = Decode1()` first, then `mode = Decode1()` second.
    _handleTournamentInfo(p) {
        const flag = p.readByte();
        const mode = p.readByte();
        this.onTournamentInfo?.({ flag, mode });
    }
    _handleTournamentMatchTable(p) {
        this.onTournamentMatchTable?.(p.readBytes(p.remaining));
    }
    // CField_Tournament::OnTournamentSetPrize (decompile/5633A0.c) —
    // `flag = Decode1()`, `hasItems = Decode1()`; if hasItems, `itemId1 =
    // Decode4()` then `itemId2 = Decode4()` (each resolved to an item name via
    // CItemInfo::GetItemName for the notice text); otherwise no further read.
    _handleTournamentSetPrize(p) {
        const flag = p.readByte();
        const hasItems = p.readBool();
        let itemId1 = null;
        let itemId2 = null;
        if (hasItems) {
            itemId1 = p.readInt();
            itemId2 = p.readInt();
        }
        this.onTournamentSetPrize?.({ flag, hasItems, itemId1, itemId2 });
    }
    // CField_Tournament::OnTournamentUEW (decompile/563620.c) — single
    // `mode = Decode1()`, switched 2/4/8/16/default with no further read.
    _handleTournamentUEW(p) {
        const mode = p.readByte();
        this.onTournamentUEW?.({ mode });
    }
}
//# sourceMappingURL=TournamentHandlers.js.map