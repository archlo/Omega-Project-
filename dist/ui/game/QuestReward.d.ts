import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { BuiltInFont } from '../BuiltInFont.js';
export interface QuestRewardEntry {
    index: number;
    itemId: number;
    name: string;
}
export declare class QuestReward extends GamePanel {
    OnSelect: ((index: number, itemId: number) => void) | null;
    private _background;
    private _btOk;
    private _allButtons;
    private _itemContainers;
    private _selectedIndex;
    private _entries;
    private _questId;
    private _titleText;
    private _noticeText;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, _font: BuiltInFont | null);
    Show(questId: number, _npcId: number, text: string): void;
    private _parseRewards;
    private _rebuildItems;
    private _doSelect;
    update(_dt: number): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
}
//# sourceMappingURL=QuestReward.d.ts.map