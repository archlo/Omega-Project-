import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { BuiltInFont } from '../BuiltInFont.js';
export interface TradeItem {
    invType: number;
    itemId: number;
    quantity: number;
}
export declare class TradingRoom extends GamePanel {
    OnPutItem: ((index: number, invType: number, position: number, quantity: number) => void) | null;
    OnPutMoney: ((amount: number) => void) | null;
    OnTrade: (() => void) | null;
    OnCancel: (() => void) | null;
    private _background;
    private _font;
    private _allButtons;
    private _btTrade;
    private _btPutMoney;
    private _myItems;
    private _theirItems;
    private _myMoney;
    private _theirMoney;
    private _myConfirmed;
    private _theirConfirmed;
    private _partnerName;
    /** Set by GameStage when an inventory item is selected while this panel is
        open — consumed (and cleared) on the next "my" slot click. */
    pendingItem: {
        invType: number;
        position: number;
        itemId: number;
        quantity: number;
    } | null;
    private _bg;
    private _myBg;
    private _theirBg;
    private _mySlotBgs;
    private _theirSlotBgs;
    private _mySlotLabels;
    private _theirSlotLabels;
    private _myLabel;
    private _theirLabel;
    private _myMoneyLabel;
    private _theirMoneyLabel;
    private _noticeLabel;
    private _title;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null);
    private _slotPos;
    Open(partnerName: string, myIndex: number): void;
    OnPartnerPutItem(index: number, item: TradeItem): void;
    OnPartnerPutMoney(amount: number): void;
    OnPartnerTrade(): void;
    OnPartnerLeave(): void;
    SetTradeMoneyLimit(limitType: number): void;
    update(_dt: number): void;
    private _promptMoney;
    /** Click on one of my own 9 slots — consumes `pendingItem` (set by GameStage
        from an inventory selection) if present. */
    private _handleMySlotClick;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
}
//# sourceMappingURL=TradingRoom.d.ts.map