import { PacketRouter } from '../session/PacketRouter.js';
export interface TournamentInfoArgs {
    /** Decode1 — opaque flag, only used by the real client to pick a notice
     *  string (no further packet read either way). */
    flag: number;
    /** Decode1 — message selector, 0-2 when `flag` is 0/the gate is closed,
     *  1/2/other when the gate is open. Real meaning of the two branches is a
     *  client-state check this export can't resolve further (see TODO_AUDIT). */
    mode: number;
}
export interface TournamentSetPrizeArgs {
    /** Decode1 — used only by the no-prize-awarded branch (`mode === 0`) to
     *  pick between two notice strings; otherwise unused. */
    flag: number;
    /** Decode1 — true selects the "you received 2 items" branch with two
     *  item ids to follow; false selects the no-item notice branch. */
    hasItems: boolean;
    /** Decode4, only present when `hasItems`. */
    itemId1: number | null;
    /** Decode4, only present when `hasItems`. */
    itemId2: number | null;
}
export interface TournamentUEWArgs {
    /** Decode1 — mode selecting which notice to show (2/4/8/16; anything else
     *  is a silent no-op in the real client). */
    mode: number;
}
/** CField_Tournament::OnPacket (decompile/563780.c). Dispatches opcodes
 *  374-377 to one dedicated sub-function each; 378 is an explicit
 *  `return;` no-op in the real switch, not a missing case. */
export declare class TournamentHandlers {
    onTournamentInfo: ((args: TournamentInfoArgs) => void) | null;
    /** TournamentMatchTable (375) — CField_Tournament::OnTournamentMatchTable
     *  (decompile/5630D0.c) only allocates a `CMatchTableDlg` and hands the raw
     *  packet to its constructor for further decode; that constructor body
     *  does not exist anywhere in this decompile export (confirmed: zero hits
     *  for `CMatchTableDlg` in function_index.txt beyond this one call site).
     *  Field shape is unconfirmable — exposes the raw remaining payload only. */
    onTournamentMatchTable: ((rawPayload: Uint8Array) => void) | null;
    onTournamentSetPrize: ((args: TournamentSetPrizeArgs) => void) | null;
    onTournamentUEW: ((args: TournamentUEWArgs) => void) | null;
    clear(): void;
    register(router: PacketRouter): void;
    private _handleTournamentInfo;
    private _handleTournamentMatchTable;
    private _handleTournamentSetPrize;
    private _handleTournamentUEW;
}
//# sourceMappingURL=TournamentHandlers.d.ts.map