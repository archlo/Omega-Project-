import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
export interface CashTradeItem {
    itemId: number;
    quantity: number;
    name: string;
    icon: WzSprite | null;
}
export declare class CashTradingRoom extends GamePanel {
    OnPutItem: ((index: number, itemId: number, quantity: number) => void) | null;
    OnPutMoney: ((amount: number) => void) | null;
    OnTrade: (() => void) | null;
    OnCancel: (() => void) | null;
    OnChat: ((message: string) => void) | null;
    private _myItems;
    private _theirItems;
    private _myMoney;
    private _theirMoney;
    private _myConfirmed;
    private _theirConfirmed;
    private _partnerName;
    private _bg;
    private _dynamicChildren;
    private _allButtons;
    private _btTrade;
    private _btPutMoney;
    private _itemNameOf;
    private _itemIconOf;
    constructor(loader: WzTextureLoader, ui: WzPackage | null);
    /** Set name/icon resolvers. */
    setResolvers(itemNameOf: (id: number) => string, itemIconOf: (id: number) => WzSprite | null): void;
    /** Open the trading room. */
    open(partnerName: string): void;
    /** OG: CCashTradingRoomDlg::OnPutItem (0x49CDD0) — partner placed an item. */
    putTheirItem(slot: number, itemId: number, quantity: number): void;
    /** OG: CCashTradingRoomDlg::OnPutMoney (0x49C9D0) — partner put money. */
    setTheirMoney(amount: number): void;
    /** OG: CCashTradingRoomDlg::OnTrade (0x49CFD0) — trade confirmation. */
    setTradeConfirmed(theirConfirmed: boolean): void;
    /** Place an item in my grid. */
    putMyItem(slot: number, itemId: number, quantity: number): void;
    /** Remove an item from my grid. */
    removeMyItem(slot: number): void;
    private _promptMoney;
    private _loadButton;
    private _rebuildBg;
    update(_dt: number): void;
    draw(): void;
    private _drawGrid;
    handleMouseButton(mx: number, my: number, down: boolean): boolean;
    onMouseMove(_mx: number, _my: number): void;
    onKeyPress(key: string): boolean;
    onResize(w: number, h: number): void;
}
//# sourceMappingURL=CashTradingRoom.d.ts.map