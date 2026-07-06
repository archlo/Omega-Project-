import { InPacket } from '../packet/InPacket.js';
import { OutHeader } from '../packet/OpCodes.js';
import { PacketRouter } from '../session/PacketRouter.js';
import { ClientSession } from '../session/ClientSession.js';

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
export class TournamentHandlers {
  onTournamentInfo: ((args: TournamentInfoArgs) => void) | null = null;
  /** TournamentMatchTable (375) — CField_Tournament::OnTournamentMatchTable
   *  (decompile/5630D0.c) only allocates a `CMatchTableDlg` and hands the raw
   *  packet to its constructor for further decode; that constructor body
   *  does not exist anywhere in this decompile export (confirmed: zero hits
   *  for `CMatchTableDlg` in function_index.txt beyond this one call site).
   *  Field shape is unconfirmable — exposes the raw remaining payload only. */
  onTournamentMatchTable: ((rawPayload: Uint8Array) => void) | null = null;
  onTournamentSetPrize: ((args: TournamentSetPrizeArgs) => void) | null = null;
  onTournamentUEW: ((args: TournamentUEWArgs) => void) | null = null;

  clear(): void {
    this.onTournamentInfo = null;
    this.onTournamentMatchTable = null;
    this.onTournamentSetPrize = null;
    this.onTournamentUEW = null;
  }

  register(router: PacketRouter): void {
    router.register(OutHeader.TournamentInfo, (p: InPacket, _s: ClientSession) => this._handleTournamentInfo(p));
    router.register(OutHeader.TournamentMatchTable, (p: InPacket, _s: ClientSession) => this._handleTournamentMatchTable(p));
    router.register(OutHeader.TournamentSetPrize, (p: InPacket, _s: ClientSession) => this._handleTournamentSetPrize(p));
    router.register(OutHeader.TournamentUEW, (p: InPacket, _s: ClientSession) => this._handleTournamentUEW(p));
    // TODO_AUDIT.md Hundred-and-fifty-sixth pass: opcode 378 confirmed dead in CField_Tournament::OnPacket (decompile/563780.c — return;). Registered as no-op to close audit gap.
    router.register(OutHeader.TournamentNop378, (_p: InPacket) => {});
  }

  // CField_Tournament::OnTournament (decompile/5631A0.c) — reads exactly two
  // bytes regardless of which branch the (client-internal, non-packet) gate
  // takes: `flag = Decode1()` first, then `mode = Decode1()` second.
  private _handleTournamentInfo(p: InPacket): void {
    const flag = p.readByte();
    const mode = p.readByte();
    this.onTournamentInfo?.({ flag, mode });
  }

  private _handleTournamentMatchTable(p: InPacket): void {
    this.onTournamentMatchTable?.(p.readBytes(p.remaining));
  }

  // CField_Tournament::OnTournamentSetPrize (decompile/5633A0.c) —
  // `flag = Decode1()`, `hasItems = Decode1()`; if hasItems, `itemId1 =
  // Decode4()` then `itemId2 = Decode4()` (each resolved to an item name via
  // CItemInfo::GetItemName for the notice text); otherwise no further read.
  private _handleTournamentSetPrize(p: InPacket): void {
    const flag = p.readByte();
    const hasItems = p.readBool();
    let itemId1: number | null = null;
    let itemId2: number | null = null;
    if (hasItems) {
      itemId1 = p.readInt();
      itemId2 = p.readInt();
    }
    this.onTournamentSetPrize?.({ flag, hasItems, itemId1, itemId2 });
  }

  // CField_Tournament::OnTournamentUEW (decompile/563620.c) — single
  // `mode = Decode1()`, switched 2/4/8/16/default with no further read.
  private _handleTournamentUEW(p: InPacket): void {
    const mode = p.readByte();
    this.onTournamentUEW?.({ mode });
  }
}
