import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { BuiltInFont } from '../BuiltInFont.js';
export interface ShopItemSlot {
    index: number;
    itemId: number;
    name: string;
    setCount: number;
    setSize: number;
    price: number;
}
export declare class PersonalShop extends GamePanel {
    OnBuyItem: ((index: number, count: number) => void) | null;
    OnChat: ((text: string) => void) | null;
    OnLeave: (() => void) | null;
    OnPutItem: ((invType: number, position: number, setCount: number, setSize: number, price: number) => void) | null;
    OnBalloonOpen: ((open: boolean) => void) | null;
    /** OG: CPersonalShopDlg::OnSoldItemResult (0x69a670). */
    OnSoldItem: ((itemIndex: number, quantity: number, buyerName: string) => void) | null;
    /** Set by GameStage when an inventory item is selected while this panel is
        open as owner — consumed (and cleared) on the next empty-slot click. */
    pendingItem: {
        invType: number;
        position: number;
    } | null;
    private _background;
    private _font;
    private _allButtons;
    private _title;
    private _isOwner;
    private _items;
    private _visitorIndex;
    private _statusLine;
    private _dynamicChildren;
    private _balloonOpen;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null);
    OpenAsOwner(title: string, items: ShopItemSlot[]): void;
    OpenAsVisitor(title: string, items: ShopItemSlot[], visitorIndex: number): void;
    Refresh(items: ShopItemSlot[]): void;
    AcceptBuyResult(_result: number): void;
    SetShopStatus(message: string): void;
    NotifySoldItem(itemIndex: number, multiplier: number, buyerName: string): void;
    update(_dt: number): void;
    draw(): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    private _promptAndPutItem;
    onKeyPress(key: string): boolean;
}
//# sourceMappingURL=PersonalShop.d.ts.map