import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { BuiltInFont } from '../BuiltInFont.js';
export interface TrunkItem {
    name: string;
    itemId: number;
    quantity: number;
    invType: number;
    position: number;
}
export declare class Trunk extends GamePanel {
    OnWithdraw: ((invType: number, position: number) => void) | null;
    OnDeposit: ((position: number, itemId: number, count: number) => void) | null;
    OnSort: (() => void) | null;
    OnClosed: (() => void) | null;
    OnWithdrawMoney: ((amount: number) => void) | null;
    OnDepositMoney: ((amount: number) => void) | null;
    private _background;
    private _btClose;
    private _font;
    private _allButtons;
    private _tab;
    private _scroll;
    private _selected;
    private _money;
    private _trunkItems;
    private _invItems;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null);
    Open(money: number, trunkItems: TrunkItem[], invItems: TrunkItem[]): void;
    Refresh(money: number, trunkItems: TrunkItem[], invItems: TrunkItem[]): void;
    private _refresh;
    SetMoney(money: number): void;
    private get _currentList();
    private _close;
    private _promptMoney;
    private _applyLayout;
    update(_dt: number): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    private _clampScrollToSelected;
    private _makeButton;
}
//# sourceMappingURL=Trunk.d.ts.map