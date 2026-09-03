import { GamePanel } from './GamePanel.js';
export declare class StatusMessenger extends GamePanel {
    position: {
        x: number;
        y: number;
    };
    private _msgContainer;
    private _messages;
    constructor();
    showLoot(item: string): void;
    showEXP(amount: number): void;
    showBuff(name: string): void;
    showLevelUp(level: number): void;
    showTip(text: string): void;
    update(dt: number): void;
    private _addMsg;
}
//# sourceMappingURL=StatusMessenger.d.ts.map