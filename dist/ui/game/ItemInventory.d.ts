import { Container, Texture } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import type { DragTarget } from '../DragController.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { ItemIconLoader } from '../../character/ItemIconLoader.js';
import type { InventoryOpArg } from '../../net/handlers/PacketArgs.js';
import type { EquipStats } from '../../domain/InventoryItem.js';
import { ItemInfoService } from '../../character/ItemInfoService.js';
import { StringPoolService } from '../../localization/StringPoolService.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
export declare class InvItem {
    id: number;
    name: string;
    quantity: number;
    tab: number;
    slot: number;
    constructor(id: number, name?: string, quantity?: number, tab?: number, slot?: number);
    petLevel?: number;
    petTameness?: number;
    petRepleteness?: number;
    petRemainLife?: number;
    equipStats?: EquipStats;
    /** OG: CItemInfo::IsCashItem — true for cash items (info/cash != 0) */
    cash: boolean;
}
export interface ItemDragPayload {
    itemId: number;
    slotPos: number;
    invType: number;
}
export declare class ItemInventory extends GamePanel implements DragTarget {
    private _items;
    private _slots;
    private _bg;
    private _wzBg1;
    private _wzBg2;
    private _wzBg3;
    private _wzFullBg1;
    private _wzFullBg2;
    private _wzFullBg3;
    private _wzDisabled;
    private _wzActiveIcon;
    private _titleText;
    private _tabBgs;
    private _tabSprites;
    private _wzTabEnabled;
    private _wzTabDisabled;
    private _tabWidths;
    private _tabLabels;
    private _slotBgs;
    private _slotLabels;
    private _slotQtys;
    private _activeTab;
    private _extended;
    private _activeUseSlot;
    private _activeProjectileWeaponType;
    private _arrangeState;
    private _scrollOffset;
    private _itemScrollPos;
    private _hoverItem;
    private _lastClickKey;
    private _lastClickTime;
    private _mouseX;
    private _mouseY;
    private _viewW;
    private _viewH;
    private _tooltip;
    private _btFull;
    private _btSmall;
    private _btCashshop;
    private _btCoin;
    private _btGather;
    private _btSort;
    private _allButtons;
    private _effectLayer;
    private _newTabOther;
    private _newTabCurrent;
    private _newInventory;
    private _loader;
    private _uiWz;
    private _releaseEffectNode;
    private _latestItem;
    private _releaseEffects;
    private _scrollBar;
    private _itemWzRoot;
    private _arrangeWzRoot;
    private _mesoText;
    private _mesoAmount;
    private _tryToReleaseItem;
    private _releaseUseSlot;
    private _imgFontDigits;
    private _qtyDigitSprites;
    /** Resolves an item id to a display name. Called when adding items. */
    nameOf: (id: number) => string;
    /** Double-clicked an item in the Cash tab — caller equips/activates the item (pets, etc.). */
    onActivateCashItem: ((item: InvItem) => void) | null;
    /** Double-clicked an item in the Equip tab — caller sends ChangeSlotPosition with newPos<0. */
    onEquipItem: ((item: InvItem) => void) | null;
    /** Double-clicked an item in the Use tab — caller sends UseItem. */
    onUseItem: ((item: InvItem) => void) | null;
    /** Double-clicked an item in the Setup tab (visual tab 2, server TI=4). */
    onSetupItem: ((item: InvItem) => void) | null;
    /** Double-clicked an item in the Etc tab (visual tab 3, server TI=3). */
    onEtcItem: ((item: InvItem) => void) | null;
    /** Single-clicked any item — used by other panels (e.g. TradingRoom) that
        want a "select here, click destination there" cross-panel flow. */
    onItemSelected: ((item: InvItem) => void) | null;
    onCashShop: ((itemTI: number) => void) | null;
    onDropMoney: (() => void) | null;
    onGather: ((invType: number) => void) | null;
    onSort: ((invType: number) => void) | null;
    /** OG: CUIItem::ItemRelease → CWvsContext::SendItemReleaseRequest(useSlot, equipSlot) */
    onItemRelease: ((useSlot: number, equipSlot: number) => void) | null;
    onCursorChange: ((state: number) => void) | null;
    /** Shift+click on stackable item → split off `qty` items to an empty slot. */
    onSplitItem: ((item: InvItem, qty: number) => void) | null;
    onDragStart: ((payload: ItemDragPayload, texture: Texture, x: number, y: number) => void) | null;
    private _icons;
    constructor(opts?: {
        loader?: WzTextureLoader;
        uiWz?: WzPackage | null;
        font?: BuiltInFont | null;
        icons?: ItemIconLoader | null;
        descOf?: (itemId: number) => string | null;
        setItemOf?: (itemId: number) => {
            name: string;
            effects: Array<{
                threshold: number;
                effect: Record<string, number>;
            }>;
        } | null;
        optionOf?: (optionId: number, level: number) => Record<string, number> | null;
        itemInfo?: ItemInfoService | null;
        strings?: StringPoolService | null;
    });
    private _makeButton;
    private _rebuildArrangeButton;
    private _setExtended;
    private _rebuildBackgroundSprite;
    get activeTab(): number;
    FindPortableChair(): InvItem | null;
    SetPlayerStats(level: number, str: number, dex: number, intt: number, luk: number, jobId: number): void;
    /** The tooltip's display container — add to a screen-space parent (e.g. game.uiRoot) so
        the tooltip renders in absolute screen coordinates. May be null if no font/icons supplied. */
    get tooltipContainer(): Container | null;
    onResize(viewW: number, viewH: number): void;
    onMouseMove(x: number, y: number): void;
    addItem(item: InvItem): void;
    removeItem(id: number): void;
    clear(): void;
    /** Item id currently at `(tab, pos)` (0-based tab, matching `firstFreeSlot`'s
        convention), or 0 if the slot is empty. Used to resolve which item just
        moved into a negative (equipped) slot after a Move op, since the op itself
        only carries position numbers, not the item id at the destination. */
    itemIdAt(tab: number, pos: number): number;
    itemAt(tab: number, pos: number): InvItem | undefined;
    /** Total quantity of all items with the given itemId across all tabs. */
    countItem(itemId: number): number;
    setActiveUseSlot(slot: number): void;
    setMeso(amount: number): void;
    getMeso(): number;
    setActiveProjectileWeaponType(weaponType: number): void;
    showItemReleaseEffect(slot: number): void;
    setTryToReleaseItem(bTry: boolean, useSlot: number): void;
    setArrangeState(invType: number, state: 0 | 1): void;
    /** First free 1-based position in the given tab (default 96 slots), or -1 if full. */
    firstFreeSlot(tab: number, max?: number): number;
    applyOps(ops: InventoryOpArg[]): void;
    private _findSlot;
    private _deleteSlot;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    private _handleSlotClick;
    onKeyPress(key: string): boolean;
    onUnequipToInventory: ((invType: number, bodyPart: number, invSlot: number) => void) | null;
    onMoveItemSlot: ((invType: number, fromSlot: number, toSlot: number) => void) | null;
    tryAcceptDrag(payload: unknown, x: number, y: number): boolean;
    update(_dt: number): void;
    private _rebuild;
    private _rebuildGrid;
    private _rebuildBg;
    private _getBackgroundUOLs;
    private get _panelW();
    /** OG: CCtrlTab stores tab items with their canvas widths. Tab i starts at
     *  TAB_X + sum(widths[0..i-1]) + i * TAB_GAP. */
    private _tabX;
    /** Which tab index was clicked, or -1 if none. Mirrors CCtrlTab hit-test. */
    private _tabIndexAtPoint;
    private _slotPositionForCell;
    private _slotPositionFromPoint;
    private _updateActiveUseSlot;
    private _updateEffects;
    private _slotRectForPosition;
}
//# sourceMappingURL=ItemInventory.d.ts.map