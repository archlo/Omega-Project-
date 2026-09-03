import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzSprite } from '../../render/WzSprite.js';
/** Shop item from server packet (SetShopDlg 0x6EAB00). */
export interface ShopItem {
    itemId: number;
    price: number;
    discountRate: number;
    tokenId: number;
    tokenPrice: number;
    itemPeriod: number;
    levelLimited: number;
    quantity: number;
    maxPerSlot: number;
    unitPrice: number;
    name: string;
    icon: WzSprite | null;
    stock: number;
}
/** Player inventory item for sell tab. */
export interface SellItem {
    slot: number;
    itemId: number;
    quantity: number;
    name: string;
    icon: WzSprite | null;
}
export declare class Shop extends GamePanel {
    OnBuy: ((shopSlot: number, itemId: number, count: number, price: number) => void) | null;
    OnSell: ((invSlot: number, itemId: number, count: number) => void) | null;
    OnRecharge: ((invSlot: number) => void) | null;
    OnClose: (() => void) | null;
    private _npcTemplateId;
    private _buyItems;
    private _rechargeItems;
    private _recommendedItems;
    private _recommendedIndices;
    private _sellItems;
    private _activeTab;
    private _buySelected;
    private _sellSelected;
    private _buyScrollOffset;
    private _sellScrollOffset;
    private _meso;
    private _bg;
    private _wzBg;
    private _dynamicChildren;
    private _prevWheel;
    private _btExit;
    private _btBuy;
    private _btSell;
    private _buyScrollBar;
    private _sellScrollBar;
    private _canvasSelect;
    private _canvasMeso;
    private _itemNameOf;
    private _itemIconOf;
    constructor(loader: WzTextureLoader, ui: WzPackage | null);
    /** Set name/icon resolvers (called from GameStage). */
    setResolvers(itemNameOf: (id: number) => string, itemIconOf: (id: number) => WzSprite | null): void;
    /** Set player meso count (for display). */
    setMeso(meso: number): void;
    /**
     * OG: CShopDlg::SetShopDlg (0x6EAB00) — populate shop from server packet.
     * Already decoded by FieldHandlers.handleShopOpen; this takes the structured data.
     */
    setShopData(npcTemplateId: number, items: ShopItem[]): void;
    /**
     * OG: CShopDlg::SetSellItems (0x6E9790) — populate sell tab from player inventory.
     */
    setSellItems(items: SellItem[]): void;
    private _loadButton;
    private _doBuy;
    private _doSell;
    private _doRecharge;
    private _updateBuyScrollRange;
    private _updateSellScrollRange;
    update(_dt: number): void;
    draw(): void;
    /** OG: Tab rendering — 3 tabs: Buy, Recommended, Sell */
    private _drawTabs;
    /** OG: CShopDlg::DrawBuyItem (0x6E8600) — buy/recommended item list */
    private _drawBuyList;
    /** OG: CShopDlg::DrawSellItem (0x6E56F0) — sell item list (player inventory) */
    private _drawSellList;
    /** Detail panel (right side) — shows selected item info */
    private _drawDetail;
    /** OG: CShopDlg::DrawMoney (0x6E6FE0) — meso display */
    private _drawMoney;
    private _rebuildBg;
    handleMouseButton(mx: number, my: number, down: boolean): boolean;
    onMouseMove(_mx: number, _my: number): void;
    handleWheel(_dx: number, dy: number): void;
    private _pollWheel;
    onKeyPress(key: string): boolean;
    setPosition(x: number, y: number): void;
    onResize(w: number, h: number): void;
}
//# sourceMappingURL=Shop.d.ts.map