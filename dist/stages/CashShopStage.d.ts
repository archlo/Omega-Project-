import { Stage, MouseButton } from '../app/Stage.js';
import { MapleClaudeGame } from '../MapleClaudeGame.js';
import { WzPackage } from '../wz/WzPackage.js';
export declare class CashShopStage extends Stage {
    private _ui;
    private _loader;
    private _icons;
    private _root;
    private _staticRoot;
    private _g;
    private _prevW;
    private _commodities;
    private _bestItems;
    private _modifiedCommodities;
    private _discountRates;
    private _notSaleSNs;
    private _stockStates;
    private _limitGoods;
    private _zeroGoods;
    private _activeTab;
    private _page;
    private _nxCredit;
    private _nxPrepaid;
    private _maplePoints;
    private _cashShopAuthorized;
    private _statusMessage;
    private _couponVisible;
    private _couponValue;
    private _selectedPlate;
    private _focusedPlate;
    private _buyPending;
    private _playerLevel;
    private _playerJob;
    private _playerGender;
    private _playerFame;
    private _isPremium;
    private _confirmBuyVisible;
    private _confirmBuyItem;
    private _confirmBuyPaymentType;
    private _charLook;
    private _charWz;
    private _itemWz;
    private _baseWz;
    private _itemInfo;
    private _outfitTab;
    private _outfitScrollbar;
    private _searchActive;
    private _searchQuery;
    private _searchResults;
    private _giftItem;
    private _giftVisible;
    private _giftReceiver;
    private _giftMessage;
    private _giftEditingField;
    private _selectedInvCell;
    private _lastInventoryClickCell;
    private _lastInventoryClickAt;
    private _invItemTI;
    private _invFirstPosition;
    private _invSlotCount;
    private _characterData;
    private _lockerItems;
    private _lockerScroll;
    private _cashInventoryItems;
    private _wishlist;
    private _giftRecords;
    private _nameChangeVisible;
    private _nameChangeItem;
    private _nameChangeNewName;
    private _worldTransferVisible;
    private _worldTransferItem;
    private _worldTransferNames;
    private _worldTransferSelected;
    private _coupleNameVisible;
    private _coupleNameItem;
    private _coupleNameValue;
    private _friendNameVisible;
    private _friendNameItem;
    private _friendNameValue;
    private _equipSlotExtVisible;
    private _equipSlotExtItem;
    private _equipSlotExtBodyPart;
    private _activeDialog;
    private _oneADayItemSN;
    private _oneADayItemDate;
    private _oneADayPrevItems;
    private _oneADayTimer;
    private _oneADayTimerAccum;
    private _oneADaySelected;
    private _oneADayMode;
    private _bg;
    private _bgList;
    private _tabSprites;
    private _previewBgs;
    private _previewOn;
    private _previewOff;
    private _previewEnabled;
    private _btBuyAvatar;
    private _btDefaultAvatar;
    private _btTakeoffAvatar;
    private _btCharge;
    private _btChargeOver;
    private _btCheck;
    private _btCheckOver;
    private _btCoupon;
    private _btCouponOver;
    private _btExit;
    private _btExitOver;
    private _btBuy;
    private _btBuyOver;
    private _btGift;
    private _btGiftOver;
    private _btRebate;
    private _btSearch;
    private _btSearchBuy;
    private _btSearchCancel;
    private _searchPopup;
    private _oneADayBase;
    private _oneADayItemBox;
    private _oneADayBuy;
    private _oneADayGift;
    private _btExConsume;
    private _btExEquip;
    private _btExEtc;
    private _btExInstall;
    private _btExTrunk;
    private _inventoryScrollbar;
    private _lockerScrollbar;
    private _effectHot;
    private _effectNew;
    private _effectSale;
    private _discountDigits;
    private _discountBg;
    private _discountBonus;
    private _discountLine;
    private _discountTotal;
    private _plateStateNormal;
    private _plateStateHover;
    private _plateStatePressed;
    private _plateStateDisabled;
    private _bgLocker;
    private _bgInventory;
    private _bgStatus;
    private _bgBest;
    private _bgGift;
    private _bgGiftWide;
    private _btGiftBuddy;
    private _btGiftGuild;
    private _btGiftHide;
    private _bgNameChange;
    private _bgTransferWorld;
    private _bgNameChangeNotice;
    private _bgTransferWorldNotice;
    private _btNameCheck;
    private _confirmNotice;
    private _confirmOk;
    private _confirmNo;
    private _hoveredBtn;
    private _dynamicTexts;
    private _dynamicIcons;
    constructor(ui: WzPackage | null, prevW?: number);
    onEnter(game: MapleClaudeGame): void;
    onExit(): void;
    private _requestInitialData;
    private _wireHandlers;
    private _unwireHandlers;
    /**
     * Get category from itemId prefix (OG category system).
     * Tab 0: New/Best (all items)
     * Tab 1: Character (equip 1xx)
     * Tab 2: Equip (use 2xx)
     * Tab 3: Hair/Face (setup 3xx)
     * Tab 4: Pet (etc 4xx)
     * Tab 5: Others (cash 5xx)
     * Tab 6-8: Event, Package, Popular
     * Tab 9: One-a-Day
     */
    private _getCategoryFromItemId;
    /** Get discount rate for a category and item index. */
    private _getDiscountRate;
    /** Get a human-readable item name from the itemId. */
    private _getItemName;
    private _tryBuildCharacterPreview;
    private _buildStaticLayer;
    private _getSalePrice;
    private _isCommodityUsable;
    private _decodeSaleTables;
    private _getLimitGoodsState;
    private _saleTimeMatches;
    private _isSaleAvailable;
    update(_dt: number): void;
    draw(): void;
    onResize(windowW: number, _windowH: number): void;
    private _drawCharacterPreview;
    /** OG: determines Preview canvas index from job category. */
    private _getPreviewIndex;
    private _drawStatusBar;
    private _drawTabBar;
    private _drawItemGrid;
    private _drawOneADay;
    private _drawBestPanel;
    private _drawLockerPanel;
    /** OG CCSWnd_Locker::OnCreate — job-dependent scrollbar X position */
    private _getLockerScrollbarX;
    private _drawInventoryPanel;
    /** Get items for the current inventory tab from CharacterData */
    private _getInvItems;
    /** Decode the fixed-size GW_CashItemInfo payload used by the OG client. */
    private _parseCashItem;
    private _appendCashItem;
    private _drawSearchButton;
    private _drawStatusMessage;
    private _drawGiftDialog;
    private _drawConfirmBuy;
    private _drawNameChangeDialog;
    private _drawWorldTransferDialog;
    private _drawCoupleNameDialog;
    private _drawFriendNameDialog;
    private _drawEquipSlotExtDialog;
    onKeyPress(key: string): void;
    onMouseMove(x: number, y: number): void;
    onMouseButton(x: number, y: number, down: boolean, _button: MouseButton): void;
    private _handleActiveDialogClick;
    private _handleOneADayClick;
    private _buyItem;
    private _onGiftClick;
    private _executeGift;
    private _confirmNameChange;
    private _confirmWorldTransfer;
    private _confirmCoupleName;
    private _confirmFriendName;
    private _confirmEquipSlotExt;
    /** Called when the user clicks OK or presses Enter on the confirm dialog. */
    private _executeBuy;
    /**
     * OG: CCashShop::ProcessBuy — 12-way dispatcher based on itemId.
     * Routes the purchase to the correct packet sender.
     */
    private _processBuy;
    /** Check if a commodity is a package (has packageSnList in modified data). */
    private _isPackage;
    /** Friendship equip items: itemId/10000 == 193. */
    private _isFriendshipEquip;
    /** Character slot increment: itemId == 5000047. */
    private _isCharSlotInc;
    /** Character sale items. */
    private _isCharSale;
    /** Equip slot extension: itemId/10000 == 506. */
    private _isEquipSlotExt;
    /** Slot increment: itemId/10000 == 504. */
    private _isSlotInc;
    private _handleCashItemResult;
    /** OG NoticeFailReason — maps server error codes to user-friendly messages.
     *  69 cases from decompile/499370.c → string table. */
    private _noticeFailReason;
    private _getCurrentPageItems;
    private _getTotalPages;
    private _exit;
    private _clearDynamic;
    private _addText;
    private _createIcon;
    private _drawWzSprite;
    private _loadAssets;
}
//# sourceMappingURL=CashShopStage.d.ts.map