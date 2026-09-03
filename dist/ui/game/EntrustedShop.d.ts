import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
/** Shop item in the entrusted shop. */
export interface EntrustedShopItem {
    index: number;
    itemId: number;
    quantity: number;
    price: number;
    name: string;
    icon: WzSprite | null;
}
export declare class EntrustedShop extends GamePanel {
    OnClose: (() => void) | null;
    OnWithdrawMoney: (() => void) | null;
    OnArrange: (() => void) | null;
    OnBlackList: (() => void) | null;
    OnVisitList: (() => void) | null;
    OnBuyItem: ((index: number, count: number) => void) | null;
    private _isOwner;
    private _money;
    private _items;
    private _selectedItem;
    private _scrollOffset;
    private _enterTime;
    private _elapsedMs;
    private _bg;
    private _dynamicChildren;
    private _allButtons;
    private _scrollBar;
    private _btGoOut;
    private _btArrange;
    private _btCoin;
    private _btBlackList;
    private _btVisitList;
    private _itemNameOf;
    private _itemIconOf;
    constructor(loader: WzTextureLoader, ui: WzPackage | null);
    /** Set name/icon resolvers. */
    setResolvers(itemNameOf: (id: number) => string, itemIconOf: (id: number) => WzSprite | null): void;
    /**
     * OG: CEntrustedShopDlg::Open — open the shop.
     * @param isOwner — true if the player owns this shop
     * @param money — accumulated mesos (owner only)
     * @param items — shop items
     * @param enterTime — timestamp when the shop was placed (for remaining time calc)
     */
    Open(isOwner: boolean, money: number, items: EntrustedShopItem[], enterTime?: number): void;
    /** Update money display (owner: accumulated mesos). */
    setMoney(money: number): void;
    /** Update items (from server refresh). */
    setItems(items: EntrustedShopItem[]): void;
    private _updateScrollRange;
    private _loadButton;
    private _rebuildBg;
    update(dt: number): void;
    draw(): void;
    /** OG: DrawRemainingTime (0x51E6B0) — shows remaining merchant duration.
     * OG formula: 1439 - (m_tPass - m_tEnter + timeGetTime()) / 60000
     * Renders at (370, 12) with size (120, 12). */
    private _drawRemainingTime;
    /** OG: CEntrustedShopDlg::Draw — item list rendering. */
    private _drawItemList;
    handleMouseButton(mx: number, my: number, down: boolean): boolean;
    onMouseMove(_mx: number, _my: number): void;
    handleWheel(_dx: number, dy: number): void;
    onKeyPress(key: string): boolean;
    onResize(w: number, h: number): void;
}
//# sourceMappingURL=EntrustedShop.d.ts.map