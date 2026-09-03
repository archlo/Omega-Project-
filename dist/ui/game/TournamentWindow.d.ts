import { GamePanel } from './GamePanel.js';
/** Minimal status panel for the Tournament opcode family (374-377,
 *  `CField_Tournament::OnPacket`, decompile/563780.c). No `Tournament.img`
 *  WZ panel art is confirmed anywhere in this client's asset pipeline, and
 *  two of the four real sub-handlers (`OnTournament`/`OnTournamentSetPrize`/
 *  `OnTournamentUEW`) are pure one-shot client-side notice strings rather
 *  than persistent state — so, same pattern as `WorldMap.ts`/`FamilyWindow`'s
 *  no-WZ-art fallback, this renders a plain-Graphics panel that just stacks
 *  the most recent notice/result line from each opcode rather than building
 *  speculative bracket/standings UI nothing in this decompile confirms the
 *  shape of (`TournamentMatchTable`'s own field shape is unconfirmed — see
 *  TODO_AUDIT.md). */
export declare class TournamentWindow extends GamePanel {
    private _bg;
    private _lines;
    private _lastInfo;
    private _lastMatchTable;
    private _lastSetPrize;
    private _lastUew;
    constructor();
    setInfo(text: string): void;
    setMatchTable(text: string): void;
    setSetPrize(text: string): void;
    setUew(text: string): void;
    private _redrawLines;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
}
//# sourceMappingURL=TournamentWindow.d.ts.map