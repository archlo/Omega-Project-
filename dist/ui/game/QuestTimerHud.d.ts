import { GamePanel } from './GamePanel.js';
export declare class QuestTimerHud extends GamePanel {
    private _bg;
    private _entries;
    nameOf: (questId: number) => string;
    constructor();
    SetTimer(questId: number, endEpochMs: number): void;
    SetTimerFromFiletime(questId: number, endFiletime: bigint): void;
    ClearTimer(questId: number): void;
    update(_dt: number): void;
    private _rebuildBg;
}
//# sourceMappingURL=QuestTimerHud.d.ts.map