import { GamePanel } from './GamePanel.js';
export declare class MedalQuestInfo extends GamePanel {
    private readonly _log;
    private _nameOf;
    private _medalItems;
    get selectedId(): number;
    set nameOf(fn: (id: number) => string);
    set onSelectQuest(fn: ((id: number) => void) | null);
    constructor();
    Open(groups: {
        name: string;
        quests: number[];
        medalItems?: Record<number, number>;
    }[]): void;
    private _syncNameResolver;
    update(dt: number): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
}
//# sourceMappingURL=MedalQuestInfo.d.ts.map