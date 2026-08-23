import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { Stage, MouseButton } from '../app/Stage.js';
import { MapleClaudeGame } from '../MapleClaudeGame.js';
import { WzPackage } from '../wz/WzPackage.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzSprite } from '../render/WzSprite.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { GameSender } from '../net/senders/GameSender.js';
import { ItemIconLoader } from '../character/ItemIconLoader.js';
import { ItemInfoService } from '../character/ItemInfoService.js';
import { CashShopDecoder } from '../net/packet/CashShopDecoder.js';
import { WzSound } from '../wz/WzSound.js';
import { CharLook } from '../character/CharLook.js';
import { AvatarCodec } from '../net/handlers/AvatarCodec.js';
import { AvatarLook } from '../domain/AvatarLook.js';
import { ScrollBar } from '../ui/game/ScrollBar.js';
import type { ModifiedCommodityEntry, SetCashShopArgs } from '../domain/CashShopData.js';
import { CashCommodityTable } from '../domain/CashCommodityTable.js';
import type {
  CashShopCashAmount,
  CashShopGachaponResult,
  CashShopOneADayResult,
  CashShopTransferWorldResult,
  CashItemResult,
  OneADayPrevItem,
} from '../net/handlers/CashShopHandlers.js';

// ── OG v95 Cash Shop Layout Constants ──
// From IDA: CCashShop::Init CreateWnd calls (bScreenCoord=1)
// All positions are absolute screen pixels on the v95 800×600 canvas.
const CS_W = 800;
const CS_H = 600;

// Character preview / background (m_pLayer) — LEFT COLUMN
const CHAR_X = 0;
const CHAR_Y = 0;
const CHAR_W = 256;
const CHAR_H = 316;

// Tab bar (CCSWnd_Tab) — HORIZONTAL, top center
// OG: CreateWnd L=272, T=17, W=508, H=78
const TAB_X = 272;
const TAB_Y = 17;
const TAB_W = 508;
const TAB_H = 78;
const TAB_COUNT = 9;

// Item grid (CCSWnd_List) — center, 2 columns × 5 rows = 10 plates
// OG: CreateWnd L=275, T=95, W=412, H=430
export const LIST_X = 275;
export const LIST_Y = 95;
const LIST_W = 412;
const LIST_H = 430;
// OG: GetPlateRect — column offset 0xCE=206, row offset 0x51=81
export const PLATE_W = 200;
export const PLATE_H = 81;
export const PLATE_COL_W = 206; // 0xCE
export const PLATE_ROW_H = 81;  // 0x51
const PLATE_COLS = 2;
const PLATE_ROWS = 5;
const PLATES_PER_PAGE = PLATE_COLS * PLATE_ROWS; // 10

// Status bar (CCSWnd_Status) — bottom center
// OG: CreateWnd L=254, T=530, W=545, H=56
const STATUS_X = 254;
const STATUS_Y = 530;
const STATUS_W = 545;
const STATUS_H = 56;

// Best items (CCSWnd_Best) — right column
// OG: CreateWnd L=690, T=157, W=90, H=358
const BEST_X = 690;
const BEST_Y = 157;
const BEST_W = 90;
const BEST_H = 358;
const BEST_STEP = 69; // 0x45 per item

// Search button (CCSWnd_ItemSearch) — right column top
// OG: CreateWnd L=690, T=97, W=89, H=22
const SEARCH_X = 690;
const SEARCH_Y = 97;
const SEARCH_W = 89;
const SEARCH_H = 22;

// Locker (CCSWnd_Locker) — left column, below character preview
// OG: CreateWnd L=-1, T=318, W=256, H=104
export const LOCKER_X = -1;
const LOCKER_W = 256;
const LOCKER_H = 104;
const LOCKER_Y = 318;
const LOCKER_CELL = 32;
const LOCKER_COL_STEP = 35; // 0x23
const LOCKER_COLS = 6;
const LOCKER_ROWS = 2;

// Inventory (CCSWnd_Inventory) — bottom left
// OG: CreateWnd L=0, T=426, W=246, H=163
const INV_X = 0;
const INV_Y = 426;
const INV_W = 246;
const INV_H = 163;
const INV_CELL = 32;      // cells are 32x32 inside the 35px pitch
const INV_COL_STEP = 35;
const INV_COLS = 4;
const INV_ROWS = 3;
// Vertical tab control on the LEFT edge (args 4,17,28,156)
const INV_TAB_X = 4;
const INV_TAB_Y = 17;
const INV_TAB_W = 28;
const INV_TAB_H = 156;

// Text colors used for server-backed values and OG text overlays.
const COL_BG = 0x0E1226;
const COL_PANEL = 0x10142A;
const COL_PLATE = 0x14182A;
const COL_PLATE_BORDER = 0x373C5F;
const COL_TAB_ACTIVE = 0x28324F;
const COL_TAB_BORDER_ACTIVE = 0x6482C8;
const COL_TAB_INACTIVE = 0x16192C;
const COL_TAB_BORDER_INACTIVE = 0x2D3250;
const COL_TEXT_WHITE = 0xFFFFFF;
const COL_TEXT_DIM = 0xA0A5BE;
const COL_TEXT_GOLD = 0xDCC868;
const COL_TEXT_GREEN = 0x9FE0A0;
// Red-violet price font for commodities in the [80000000..89999999] SN window
const COL_PRICE_RANDOM = 0xCC44AA;
const COL_SEPARATOR = 0x373C5F;

interface CashCommodity {
  sn: number;
  itemId: number;
  count: number;
  name: string;
  price: number;
  priority: number;
  period: number;
  bonus: boolean;
  reqPop: number;
  category: number;
  categorySub: number;
  discountRate: number;
  onSale: boolean;
  gender: number;
  onSaleFlag: number;
  classField: number;   // 0=none, 1=warrior, 2=mage, 3=bowman, 4=thief
  reqLevel: number;
  forPremiumUser: boolean;
  limit: number;        // 0=unlimited, 1=limited, 2=no maple point
  maplePoint: number;
  meso: number;
  pbCash: number;
  pbPoint: number;
  pbGift: number;
  packageSnList: number[];
  stockState: number;
  limitState: number;
}

export class CashShopStage extends Stage {
  private _ui: WzPackage | null;
  private _loader: WzTextureLoader | null = null;
  private _icons: ItemIconLoader | null = null;
  private _root: Container;
  private _staticRoot: Container;
  private _g: Graphics;
  private _prevW: number;

  // ── Commodity data (from server) ──
  private _commodities: CashCommodity[] = [];
  private _bestItems: { category: number; gender: number; sn: number }[] = [];
  private _modifiedCommodities: ModifiedCommodityEntry[] = [];
  private _discountRates: Map<string, number> = new Map(); // key: "category:index" → rate%
  private _notSaleSNs: Set<number> = new Set();
  private _stockStates = new Map<number, number>();
  // OG m_mPurchaseRecord / m_nPurchaseRecord — CCashShop::GetCashPurchaseRecord
  // @0x482450. Keyed by SN (key 0 = the global once-per-account flag);
  // unknown keys default to "purchased" until the server responds.
  private _purchaseRecords = new Map<number, boolean>();
  private _purchaseRecordGlobal = -1;
  private _purchaseRecordRequested = new Set<number>();
  private _limitGoods: Array<{ sns: number[]; count: number; state: number; condition: number; dateStart: number; dateEnd: number; hourStart: number; hourEnd: number; weekdays: number[] }> = [];
  private _zeroGoods: Array<{ startSN: number; endSN: number; eventSN: number; condition: number; dateStart: number; dateEnd: number; hourStart: number; hourEnd: number; weekdays: number[] }> = [];

  // ── UI state ──
  // OG CCashShop::Init @0x484920 — m_nCurCategory starts at 1
  private _activeTab = 1;
  // OG m_bIsOneADay — the OneADay window opens on category 1 / sub-category 2
  private _oneADayActive = false;
  private _page = 0;
  // OG m_nCurCategorySub — sub-category within the active tab (Category.img row)
  private _subCategory = 0;
  // OG m_nCurSortType (OnChangedSortType @0x481810): 0=priority, 1=price desc, 2=SN
  private _sortType = 0;
  private _nxCredit = 0;
  private _nxPrepaid = 0;
  private _maplePoints = 0;
  private _cashShopAuthorized = false;
  private _statusMessage = '';
  private _couponVisible = false;
  // OG CCouponUseSelectDlg::OnCreate @0x48C810 — UIWindow2.img/Coupon chrome,
  // edit field at (12,53) 200x15, BtOK/BtCancle buttons.
  private _couponBg: WzSprite | null = null;
  private _couponOk: WzSprite | null = null;
  private _couponCancel: WzSprite | null = null;
  // OG CCSWnd_List shortcut-help button (id 4000, list-relative (150,380),
  // shown on category 8 sub 0) + its modal (close button at (130,328))
  private _shortcutHelpVisible = false;
  private _couponValue = '';
  private _selectedPlate = -1;
  private _focusedPlate = -1;
  // OG m_nButtonFocus — when ≥0 the plate's Buy/Gift/Wish buttons hold key focus
  private _buttonFocus = -1;
  private _buyPending = false;
  private _playerLevel = 1;
  private _playerJob = 0;
  private _playerGender = 0;
  private _playerFame = 0;
  private _isPremium = false;

  // ── Confirm buy dialog (OG: CConfirmPurchaseDlg) ──
  private _confirmBuyVisible = false;
  private _confirmBuyItem: CashCommodity | null = null;
  private _confirmBuyPaymentType = 0; // 0=NX Credit, 1=Maple Point, 2=Prepaid NX

  // ── Generic Yes/No confirm (OG: CUtilDlg::YesNo, e.g. ProcessBuy's
  //    one-a-day / mesobag gate for sn/100000==210 || sn==5640000) ──
  private _yesNoVisible = false;
  private _yesNoMessage = '';
  private _yesNoCallback: (() => void) | null = null;
  private _yesNoConfirmed = false;

  // ── Character preview ──
  private _charLook: CharLook | null = null;
  // OG CCSWnd_Char try-on state: m_avatarLookInitial (server look snapshot)
  // and m_aWearInfo[60] — body part → tried-on {itemId, sn}.
  private _initialLook: AvatarLook | null = null;
  private _wearInfo = new Map<number, { itemId: number; sn: number }>();
  private _charWz: WzPackage | null = null;
  private _itemWz: WzPackage | null = null;
  private _baseWz: WzPackage | null = null;
  private _itemInfo: ItemInfoService | null = null;

  // ── CCSWnd_Char outfit tabs (OG: tab control for outfit categories) ──
  // OG: OnTabChanged switches between equip/cash/other outfit categories
  private _outfitTab = 0; // 0=equip, 1=cash
  private _outfitScrollbar = 0;

  // ── Search state ──
  private _searchActive = false;
  private _searchQuery = '';
  private _searchResults: CashCommodity[] | null = null;

  // ── Gift dialog state ──
  private _giftItem: CashCommodity | null = null;
  private _giftVisible = false;
  private _giftReceiver = '';
  private _giftMessage = '';
  private _giftEditingField: 0 | 1 | 2 = 0; // 0=none, 1=receiver, 2=message
  // OG CUISendGifts::SetState @0x79F030 — 0=manual entry, 1=buddy list, 2=guild
  private _giftState: 0 | 1 | 2 = 0;
  private _giftListSelected = -1;
  /** Recipient name providers (wire from GameStage buddy/guild data). */
  buddyNames: string[] = [];
  guildNames: string[] = [];

  /** OG CUISendGifts::OnButtonClicked — id1003→state1, id1004→state2,
   *  id1005 (BtHide)→state0. */
  private _setGiftState(state: 0 | 1 | 2): void {
    if (this._giftState === state) return;
    this._giftState = state;
    this._giftListSelected = -1;
  }

  // ── Inventory click state ──
  private _selectedInvCell = -1;
  private _lastInventoryClickCell = -1;
  private _lastInventoryClickAt = 0;
  private _invItemTI = 0; // OG m_nItemTI — current inventory tab (0=equip, 1=use, 2=setup, 3=etc, 4=cash)
  private _invFirstPosition = 0; // OG m_nFirstPosition — scroll offset for inventory grid
  private _invSlotCount = 0; // total items in current inventory tab

  // ── Character data (for inventory rendering) ──
  private _characterData: any = null;

  // ── Locker state ──
  private _lockerItems: { sn: number; itemId: number; name: string }[] = [];
  private _lockerScroll = 0;
  private _selectedLockerCell = -1;
  private _cashInventoryItems: { sn: number; itemId: number; count: number }[] = [];
  private _wishlist: number[] = new Array(10).fill(0);
  private _giftRecords = new Uint8Array(0);
  // OG: client-owned CS_COMMODITY table from Etc.wz/Commodity.img + Category.img
  private _commTable: CashCommodityTable | null = null;

  // ── Dialog states (OG: CConfirmPurchaseDlg / CUINameChangeDlg / etc) ──
  private _nameChangeVisible = false;
  private _nameChangeItem: CashCommodity | null = null;
  private _nameChangeNewName = '';

  private _worldTransferVisible = false;
  private _worldTransferItem: CashCommodity | null = null;
  private _worldTransferNames: string[] = [];
  private _worldTransferSelected = -1;

  private _coupleNameVisible = false;
  private _coupleNameItem: CashCommodity | null = null;
  private _coupleNameValue = '';

  private _friendNameVisible = false;
  private _friendNameItem: CashCommodity | null = null;
  private _friendNameValue = '';

  private _equipSlotExtVisible = false;
  private _equipSlotExtItem: CashCommodity | null = null;
  private _equipSlotExtBodyPart = 0;

  // ── Active dialog type ──
  private _activeDialog: 'none' | 'nameChange' | 'worldTransfer' | 'coupleName' | 'friendName' | 'equipSlotExt' = 'none';

  // ── One-a-Day state ──
  private _oneADayItemSN = 0;
  private _oneADayItemDate = 0;
  private _oneADayPrevItems: OneADayPrevItem[] = [];
  private _oneADayTimer = { hours: 0, minutes: 0, seconds: 0 };
  private _oneADayTimerAccum = 0;
  private _oneADaySelected = -1;
  private _oneADayMode: 0 | 1 = 0;

  // ── WZ assets (loaded from UI.nx/CashShop.img) ──
  private _bg: WzSprite | null = null;
  private _bgList: WzSprite | null = null;
  private _tabSprites: (WzSprite | null)[] = new Array(TAB_COUNT).fill(null);
  // NX coin icons (OG CashItem/0..3, PrepaidCashItem/0) drawn next to price rows
  private _cashCoinIcons: (WzSprite | null)[] = [null, null, null, null];
  private _prepaidCoinIcon: WzSprite | null = null;
  // OG Init @0x484920 picks the background canvas by job family
  // (StringPool 0x53E/0x53F/0x540/0x1970/0x1A72/0x1A73 → Base/backgrnd..backgrnd5)
  private _bgVariants: (WzSprite | null)[] = [];
  private _bgSprite: Sprite | null = null;
  // PicturePlate/NoItem — shown when the current page has no items
  private _noItemImage: WzSprite | null = null;

  // Character preview backgrounds — 3 variants by job category
  // OG: Preview/0 = normal job, Preview/1 = Cygnus Knights, Preview/2 = Aran/Evan
  private _previewBgs: (WzSprite | null)[] = [null, null, null];
  private _previewOn: WzSprite | null = null;
  private _previewOff: WzSprite | null = null;
  private _previewEnabled = true;
  private _btBuyAvatar: WzSprite | null = null;
  private _btDefaultAvatar: WzSprite | null = null;
  private _btTakeoffAvatar: WzSprite | null = null;

  // Status bar buttons — 4 states each
  private _btCharge: WzSprite | null = null;
  private _btChargeOver: WzSprite | null = null;
  private _btCheck: WzSprite | null = null;
  private _btCheckOver: WzSprite | null = null;
  private _btCoupon: WzSprite | null = null;
  private _btCouponOver: WzSprite | null = null;
  private _btExit: WzSprite | null = null;
  private _btExitOver: WzSprite | null = null;

  // Buy/Gift buttons — 4 states each
  private _btBuy: WzSprite | null = null;
  private _btBuyOver: WzSprite | null = null;
  private _btGift: WzSprite | null = null;
  private _btGiftOver: WzSprite | null = null;
  private _btWish: WzSprite | null = null;
  private _btWishOver: WzSprite | null = null;
  private _shortcutHelpBg: WzSprite | null = null;

  // Locker buttons
  private _btRebate: WzSprite | null = null;

  // Item search buttons
  private _btSearch: WzSprite | null = null;
  private _btSearchBuy: WzSprite | null = null;
  private _btSearchCancel: WzSprite | null = null;
  private _searchPopup: WzSprite | null = null;

  // UI/OneADay.img/CSOneADay assets.
  private _oneADayBase: WzSprite | null = null;
  private _oneADayItemBox: WzSprite | null = null;
  // OG OneADay big-plate canvas (SP 0x16A5) + countdown digit glyphs (SP 0x16A7)
  private _oneADayPlateBig: WzSprite | null = null;
  private _oneADayDigits: (WzSprite | null)[] = new Array(10).fill(null);
  // OG keyFocus plate overlay (SP 0x4EA) for the keyboard-focused plate
  private _plateStateFocus: WzSprite | null = null;
  // Price-band table from UI/CashShop.img/CSItemSearch/Price ({i}: {0}=low {1}=high)
  private _searchPriceBands: Array<{ low: number; high: number }> = [];
  private _searchBandIndex = -1; // -1 = all
  private _oneADayBuy: WzSprite | null = null;
  private _oneADayGift: WzSprite | null = null;

  // Inventory expansion buttons
  private _btExConsume: WzSprite | null = null;
  private _btExEquip: WzSprite | null = null;
  private _btExEtc: WzSprite | null = null;
  private _btExInstall: WzSprite | null = null;
  private _btExTrunk: WzSprite | null = null;
  private _inventoryScrollbar: ScrollBar | null = null;
  private _lockerScrollbar: ScrollBar | null = null;

  // Effect badges (animated — multiple frames)
  private _effectHot: WzSprite | null = null;
  private _effectNew: WzSprite | null = null;
  private _effectSale: WzSprite | null = null;

  // Optional Best-panel event banner (replaces entry index 4 when present)
  private _bestEventBanner: WzSprite | null = null;

  // Discount digits 0-9 + bonus/line/arrow/backgrnd/total
  private _discountDigits: (WzSprite | null)[] = new Array(10).fill(null);
  private _discountBg: WzSprite | null = null;
  private _discountBonus: WzSprite | null = null;
  private _discountLine: WzSprite | null = null;
  private _discountTotal: WzSprite | null = null;

  // PicturePlate states (normal, mouseOver, pressed, disabled, noItem)
  private _plateStateNormal: WzSprite | null = null;
  private _plateStateHover: WzSprite | null = null;
  private _plateStatePressed: WzSprite | null = null;
  private _plateStateDisabled: WzSprite | null = null;

  // Panel backgrounds
  private _bgLocker: WzSprite | null = null;
  private _bgInventory: WzSprite | null = null;
  private _bgStatus: WzSprite | null = null;
  private _bgBest: WzSprite | null = null;
  private _bgGift: WzSprite | null = null;
  private _bgGiftWide: WzSprite | null = null;
  private _btGiftBuddy: WzSprite | null = null;
  private _btGiftGuild: WzSprite | null = null;
  private _btGiftHide: WzSprite | null = null;
  private _bgNameChange: WzSprite | null = null;
  private _bgTransferWorld: WzSprite | null = null;
  private _bgNameChangeNotice: WzSprite | null = null;
  private _bgTransferWorldNotice: WzSprite | null = null;
  private _btNameCheck: WzSprite | null = null;
  private _confirmNotice: WzSprite | null = null;
  private _confirmOk: WzSprite | null = null;
  private _confirmNo: WzSprite | null = null;

  // Hover state tracking
  private _hoveredBtn: string | null = null;

  // ── Dynamic text (recreated each frame) ──
  private _dynamicTexts: Text[] = [];
  private _dynamicIcons: Sprite[] = [];

  constructor(ui: WzPackage | null, prevW = 800) {
    super();
    this._ui = ui;
    this._prevW = prevW;
    this._root = new Container();
    this._staticRoot = new Container();
    this._g = new Graphics();
    this._root.addChild(this._g);
  }

  onEnter(game: MapleClaudeGame): void {
    super.onEnter(game);
    this._loader = new WzTextureLoader();
    this._icons = new ItemIconLoader(this._loader, game.wz.character, game.wz.item);
    this._loadAssets();
    this._buildStaticLayer();
    this._inventoryScrollbar = new ScrollBar(INV_X, INV_Y + 160, 102, pos => {
      this._invFirstPosition = pos;
    }, { loader: this._loader, uiWz: this._ui });
    this._root.addChild(this._inventoryScrollbar.container);
    this._lockerScrollbar = new ScrollBar(0, 229, 67, pos => {
      this._lockerScroll = pos;
    }, { loader: this._loader, uiWz: this._ui });
    this._root.addChild(this._lockerScrollbar.container);
    this._wireHandlers(game);
    this._requestInitialData();
    // OG: the cash shop is frame-space UI (800x600) — render into uiRoot,
    // NOT the camera-transformed world container, or clicks (frame coords)
    // land away from the visuals.
    this.uiRoot.addChild(this._staticRoot);
    this.uiRoot.addChild(this._root);
    // Mouse coords arrive as 800x600 FRAME coords (_canvasToFrame) � the OG
    // shop fills the whole frame, so no manual horizontal centering.
    this._root.x = 0;
    this._staticRoot.x = 0;

    // Load WZ packages for character rendering
    const dir = game.wzDir ?? '/wz_client';
    const open = (name: string) => WzPackage.OpenBaseAsync(dir, name);
    const loadWz = async () => {
      try {
        this._charWz = game.wz.character ?? await open('Character');
        this._itemWz = game.wz.item ?? await open('Item');
        this._baseWz = game.wz.base ?? await open('Base');
        this._itemInfo = new ItemInfoService(this._charWz, this._itemWz);
        // OG: CWvsContext::LoadCommodity — client-side CS_COMMODITY table
        const etc = game.wz.etc ?? await WzPackage.OpenBaseAsync(dir, 'Etc');
        this._commTable = await CashCommodityTable.LoadAsync(etc);
        if (this._modifiedCommodities.length > 0) this._rebuildCommodities();
        for (const commodity of this._commodities) commodity.name = this._getItemName(commodity.itemId);
        for (const item of this._lockerItems) item.name = this._getItemName(item.itemId);
        this._tryBuildCharacterPreview();
      } catch (ex) { console.warn('CashShopStage: failed to load WZ for character preview', ex); }
    };
    loadWz();
  }

  onExit(): void {
    this._unwireHandlers();
    this._charLook?.container.removeFromParent();
    this._clearDynamic();
    for (const s of this._dynamicIcons) s.destroy();
    this._dynamicIcons = [];
    this._icons = null;
    this._loader?.Dispose();
    this._loader = null;
    this._inventoryScrollbar = null;
    this._lockerScrollbar = null;
    this._root.removeFromParent();
    this._root.destroy({ children: true });
    this._staticRoot.removeFromParent();
    this._staticRoot.destroy({ children: true });
    this._charLook = null;
    this._charWz = null;
    this._itemWz = null;
    this._baseWz = null;
    this._itemInfo = null;
    super.onExit();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Server data wiring
  // ═══════════════════════════════════════════════════════════════════════════

  private _requestInitialData(): void {
    if (!this.game) return;
    // OG Init @0x484920: CSoundMan::PlayBGM(StringPool 1290) — the cash shop
    // loop lives at Sound.wz/BgmUI.img/ShopBgm.
    const shopBgm = this.game.wz.sound?.GetItem('BgmUI.img/ShopBgm');
    if (shopBgm instanceof WzSound) this.game.audioPlayer.PlayLoop(shopBgm.AudioBytes);
    // OG: CCashShop constructor calls QueryCash + LoadLocker + LoadGift + LoadWish
    this.game.session.send(GameSender.CashShopQueryCash());
    this.game.session.send(GameSender.CashShopLoadLocker());
    this.game.session.send(GameSender.CashShopLoadGift());
    this.game.session.send(GameSender.CashShopLoadWish());
  }

  private _wireHandlers(game: MapleClaudeGame): void {
    const h = game.cashShopHandlers;
    h.onQueryCashResult = (amount: CashShopCashAmount) => {
      this._nxCredit = amount.nexonCash;
      this._maplePoints = amount.maplePoint;
      this._nxPrepaid = amount.prepaidNxCash;
    };
    h.onCashItemResult = (args: CashItemResult) => {
      this._handleCashItemResult(args);
    };
    h.onNoticeFreeCashItem = () => {
      this._statusMessage = 'You have a free item waiting in your Cash Inventory.';
    };
    h.onOneADay = (args: CashShopOneADayResult) => {
      this._oneADayItemSN = args.itemSn;
      this._oneADayItemDate = args.itemDate;
      this._oneADayPrevItems = args.prevItems;
      // Start countdown: assume ~23h59m remaining until midnight reset
      this._oneADayTimer = { hours: 23, minutes: 59, seconds: 59 };
      this._oneADayTimerAccum = 0;
      this._oneADaySelected = -1;
      this._oneADayMode = 0;
      this._statusMessage = args.count > 0 ? `One-a-day: item SN ${args.itemSn}` : 'No one-a-day item today.';
    };
    h.onChargeParamResult = (nexonClubId: string) => {
      this._statusMessage = `Nexon Club: ${nexonClubId}`;
    };
    h.onCashItemGachaponResult = (args: CashShopGachaponResult) => {
      this._statusMessage = args.isSuccess ? 'Gachapon roll complete!' : 'Gachapon failed.';
    };
    h.onCheckDuplicatedIDResult = (name: string, result: number) => {
      this._statusMessage = result === 0 ? `"${name}" available` : `"${name}" taken`;
    };
    h.onCheckNameChangePossibleResult = (result: number) => {
      this._statusMessage = result === 0 ? 'Name change available' : 'Name change unavailable';
    };
    h.onCheckTransferWorldPossibleResult = (args: CashShopTransferWorldResult) => {
      if (args.result === 0 && this._activeDialog === 'worldTransfer') {
        this._worldTransferNames = args.worldNames;
        this._worldTransferSelected = args.worldNames.length > 0 ? 0 : -1;
        this._statusMessage = `Transfer available (${args.worldNames.length} worlds)`;
      } else {
        this._statusMessage = args.result === 0 ? 'Transfer available' : 'Transfer unavailable';
      }
    };
    h.onPurchaseExpChanged = (v: number) => { this._statusMessage = `Purchase EXP: ${v}`; };
    h.onGiftMateInfoResult = (args) => {
      this._statusMessage = args.success ? `Gift to ${args.giveTo}` : 'Gift failed';
    };
    h.onGachaponStampResult = (success, stampCount) => {
      this._statusMessage = success ? `Gachapon stamp: ${stampCount} stamps` : 'Gachapon stamp failed';
    };
    // Wire FieldHandlers.onSetCashShop to receive commodity data
    const fh = game.fieldHandlers;
    fh.onSetCashShop = (args: SetCashShopArgs) => {
      // Store authorization state (OG: m_bCashShopAuthorized)
      this._cashShopAuthorized = args.cashShopAuthorized;
      this._playerLevel = args.highestCharacterLevelInAccount;
      this._playerJob = args.characterData?.characterStat?.job ?? 0;
      this._playerGender = args.characterData?.characterStat?.gender ?? 0;
      this._playerFame = args.characterData?.characterStat?.pop ?? 0;
      this._characterData = args.characterData ?? null;
      this._selectBackground();

      // Build character preview from character data
      const stat = args.characterData?.characterStat;
      if (stat && args.characterData?.equipped) {
        const look = AvatarCodec.FromCharacterData(
          stat,
          args.characterData.equipped,
          args.characterData.equippedCash,
        );
        if (!this._charLook) {
          if (this._charWz && this._itemWz && this._baseWz && this._loader) {
            this._charLook = new CharLook(stat.skin);
            this._charLook.Load(this._charWz, this._itemWz, this._baseWz, this._loader);
          }
        }
        this._charLook?.SetAvatar(look);
        this._charLook?.StartAction('stand1');
      }
      this._tryBuildCharacterPreview();

      // Decode best array
      this._bestItems = CashShopDecoder.decodeBestArray(args.best);

      // Store discount rates in a lookup map
      this._discountRates.clear();
      for (const dr of args.discountRates) {
        this._discountRates.set(`${dr.category}:${dr.index}`, dr.rate);
      }

      // Store not-sale serial numbers
      this._notSaleSNs = new Set(args.notSaleSNs);
      this._decodeSaleTables(args.stock ?? new Uint8Array(0), args.limitGoods ?? new Uint8Array(0), args.zeroGoods ?? new Uint8Array(0));

      // Build commodity list from modified data, excluding not-for-sale items
      this._modifiedCommodities = args.modifiedCommodities;
      this._rebuildCommodities();
    };
  }

  /** OG model: the client owns the full CS_COMMODITY table (Etc.wz/
   *  Commodity.img) and the server's SetCashShop modifies entries on top of it.
   *  When the WZ table is loaded we start from its base data; otherwise we
   *  degrade to server-data-only (legacy behavior). */
  private _rebuildCommodities(): void {
    this._commodities = [];
    const categoryCounters: Record<number, number> = {};
    const push = (
      sn: number,
      d: {
        itemId?: number; count?: number; price?: number; bonus?: boolean;
        priority?: number; period?: number; reqPop?: number; reqLevel?: number;
        maplePoint?: number; meso?: number; forPremiumUser?: boolean;
        gender?: number; onSale?: boolean; classField?: number; limit?: number;
        pbCash?: number; pbPoint?: number; pbGift?: number;
        packageSnList?: number[];
      },
      idx: number,
    ) => {
      if (this._notSaleSNs.has(sn)) return;
      const itemId = d.itemId ?? 0;
      const category = this._getCategoryFromItemId(itemId);
      const catIdx = categoryCounters[category] ?? 0;
      const discountRate = this._getDiscountRate(category, catIdx);
      categoryCounters[category] = catIdx + 1;
      this._commodities.push({
        sn,
        itemId,
        count: d.count ?? 1,
        name: this._getItemName(itemId),
        price: d.price ?? 0,
        priority: d.priority ?? idx,
        period: d.period ?? 0,
        bonus: d.bonus ?? false,
        reqPop: d.reqPop ?? 0,
        category,
        categorySub: 0,
        discountRate,
        onSale: d.onSale !== false,
        gender: d.gender ?? 0,
        onSaleFlag: 0,
        classField: d.classField ?? 0,
        reqLevel: d.reqLevel ?? 0,
        forPremiumUser: d.forPremiumUser ?? false,
        limit: d.limit ?? 0,
        maplePoint: d.maplePoint ?? 0,
        meso: d.meso ?? 0,
        pbCash: d.pbCash ?? 0,
        pbPoint: d.pbPoint ?? 0,
        pbGift: d.pbGift ?? 0,
        packageSnList: d.packageSnList ?? [],
        stockState: this._stockStates.get(sn) ?? 0,
        limitState: this._getLimitGoodsState(sn),
      });
    };

    let i = 0;
    for (const m of this._modifiedCommodities) {
      const sn = m.sn ?? i;
      const base = this._commTable?.Get(sn);
      if (base) {
        // OG: WZ base entry with server modification overlaid
        push(sn, {
          itemId: m.data?.itemId ?? base.itemId,
          count: m.data?.count ?? base.count,
          price: m.data?.price ?? base.price,
          bonus: m.data?.bonus ?? base.bonus,
          priority: m.data?.priority ?? base.priority,
          period: m.data?.period ?? base.period,
          reqPop: m.data?.reqPop ?? base.reqPop,
          reqLevel: m.data?.reqLevel ?? base.reqLevel,
          maplePoint: m.data?.maplePoint ?? base.maplePoint,
          meso: m.data?.meso ?? base.meso,
          forPremiumUser: m.data?.forPremiumUser ?? base.forPremiumUser,
          gender: m.data?.gender ?? base.gender,
          onSale: m.data?.onSale ?? base.onSale,
          classField: m.data?.classField ?? base.classField,
          limit: m.data?.limit ?? base.limit,
          packageSnList: m.data?.packageSnList,
        }, i);
      } else {
        push(sn, m.data ?? {}, i);
      }
      i++;
    }
    // Include unmodified WZ commodities that the server didn't mention
    if (this._commTable && this._commTable.BySn.size > 0) {
      for (const [sn, base] of this._commTable.BySn) {
        if (this._modifiedCommodities.some((m) => (m.sn ?? -1) === sn)) continue;
        if (!base.onSale) continue;
        push(sn, base, i++);
      }
    }
    this._commodities.sort((a, b) => a.priority - b.priority || a.sn - b.sn);

    // OG CCashShop::LoadData @0x492EA0 — a commodity's category comes from its
    // SN digits: category = sn/10000000 % 10, categorySub = sn/100000 % 100.
    for (const c of this._commodities) {
      c.category = Math.floor(c.sn / 10000000) % 10;
      c.categorySub = Math.floor(c.sn / 100000) % 100;
    }
    this._applySortType();
    if (this._commTable) this._applyCategoryRows();
  }

  /** OG CCashShop::LoadData @0x492EA0 row model: commodities whose
   *  (category, categorySub) maps to a Category.img row are grouped in
   *  Category.img order (nStart/nCount), and every ON-SALE commodity in the
   *  [80000000..89999999] window is removed and re-inserted at a RANDOM
   *  position inside a random non-empty row. Runs only when the client-side
   *  Commodity table is loaded and every SN maps to a row (OG throws otherwise). */
  private _applyCategoryRows(): void {
    const cats = this._commTable?.Categories ?? [];
    if (cats.length === 0) return;
    const rowIndex = new Map<string, number>();
    cats.forEach((r, i) => rowIndex.set(`${r.category}_${r.categorySub}`, i));

    const isRandomWindow = (c: CashCommodity) => c.sn >= 80000000 && c.sn <= 89999999;
    for (const c of this._commodities) {
      if (isRandomWindow(c)) continue;
      if (!rowIndex.has(`${c.category}_${c.categorySub}`)) return; // OG: throw
    }

    const main = this._commodities.filter((c) => !isRandomWindow(c));
    const cmp = (a: CashCommodity, b: CashCommodity) =>
      a.priority - b.priority || a.sn - b.sn;
    // Group in Category.img order; within a row keep the current sort.
    main.sort((a, b) =>
      (rowIndex.get(`${a.category}_${a.categorySub}`) ?? 1 << 30)
        - (rowIndex.get(`${b.category}_${b.categorySub}`) ?? 1 << 30) || cmp(a, b));

    // Random distribution of the 80M-SN on-sale window into non-empty rows.
    const randoms = this._commodities.filter((c) => isRandomWindow(c) && c.onSale);
    for (const c of randoms) {
      // Collect row boundaries present in `main` with count > 0
      const bounds: { start: number; len: number }[] = [];
      for (let i = 0; i < main.length;) {
        const k = `${main[i].category}_${main[i].categorySub}`;
        let j = i;
        while (j < main.length && `${main[j].category}_${main[j].categorySub}` === k) j++;
        bounds.push({ start: i, len: j - i });
        i = j;
      }
      if (bounds.length === 0) { main.push(c); continue; }
      const row = bounds[Math.floor(Math.random() * bounds.length)];
      main.splice(row.start + Math.floor(Math.random() * (row.len + 1)), 0, c);
    }
    // Off-sale random-window items stay appended (OG leaves them out of rows).
    for (const c of this._commodities) {
      if (isRandomWindow(c) && !c.onSale) main.push(c);
    }
    this._commodities = main;
  }

  /** OG CCashShop::OnChangedSortType @0x481810 — per-category-row sort of the
   *  ON-SALE entries: 0 = priority ascending, 1 = price descending, 2 = SN
   *  ascending. Off-sale entries keep their positions (OG skips them). */
  SetSortType(sortType: number): void {
    this._sortType = Math.max(0, Math.min(2, sortType));
    this._applySortType();
  }

  private _applySortType(): void {
    const rowKey = (c: CashCommodity) => c.category * 1000 + c.categorySub;
    const cmp = (a: CashCommodity, b: CashCommodity): number => {
      switch (this._sortType) {
        case 1: return b.price - a.price;            // price, most expensive first
        case 2: return a.sn - b.sn;                  // SN ascending
        default: return a.priority - b.priority || a.sn - b.sn; // priority asc
      }
    };
    // Stable per-row sort; rows ordered by their Category.img appearance.
    this._commodities.sort((a, b) => {
      const ra = rowKey(a);
      const rb = rowKey(b);
      if (ra !== rb) return ra - rb;
      return cmp(a, b);
    });
  }

  private _unwireHandlers(): void {
    if (!this.game) return;
    this.game.cashShopHandlers.clear();
    this.game.fieldHandlers.onSetCashShop = null;
  }



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
  private _getCategoryFromItemId(itemId: number): number {
    const prefix = Math.floor(itemId / 1000000);
    switch (prefix) {
      case 1: return 1;
      case 2: return 2;
      case 3: return 3;
      case 4: return 4;
      case 5: return 5;
      default: return 0;
    }
  }

  /** Get discount rate for a category and item index. */
  private _getDiscountRate(category: number, index: number): number {
    const key = `${category}:${index}`;
    if (this._discountRates.has(key)) return this._discountRates.get(key)!;
    const wildcard = `${category}:*`;
    if (this._discountRates.has(wildcard)) return this._discountRates.get(wildcard)!;
    return 0;
  }

  /** Get a human-readable item name from the itemId. */
  private _getItemName(itemId: number): string {
    return this._itemInfo?.GetItemName(itemId) ?? '';
  }

  private _tryBuildCharacterPreview(): void {
    const data = this._characterData as any;
    const stat = data?.characterStat;
    if (!stat || !data?.equipped || !this._charWz || !this._itemWz || !this._baseWz || !this._loader) return;
    const look = AvatarCodec.FromCharacterData(stat, data.equipped, data.equippedCash);
    if (!this._charLook) {
      this._charLook = new CharLook(stat.skin);
      this._charLook.Load(this._charWz, this._itemWz, this._baseWz, this._loader);
    }
    // OG m_avatarLookInitial — snapshot for try-on restore (OnTakeOff/OnDefaultAvatar)
    this._initialLook = AvatarCodec.FromCharacterData(stat, data.equipped, data.equippedCash);
    this._wearInfo.clear();
    this._charLook.SetAvatar(look);
    this._charLook.StartAction('stand1');
  }

  /** OG get_bodypart_from_item @0x46FBE0 — equip itemId → avatar body part. */
  private _bodyPartFromItem(itemId: number): number {
    const cat = Math.floor(itemId / 10000);
    switch (cat) {
      case 100: return 1;   // hat
      case 101: return 2;   // face accessory
      case 102: return 3;   // eye accessory
      case 103: return 4;   // earrings
      case 104:
      case 105: return 5;   // top / overall
      case 106: return 6;   // pants
      case 107: return 7;   // shoes
      case 108: return 8;   // gloves
      case 110: return 9;   // cape
      case 109:
      case 119:
      case 134: return 10;  // weapon
      case 111: return 12;  // ring
      case 112: return 17;  // pendant
      case 113: return 50;  // belt
      case 114: return 49;  // medal
      case 115: return 51;  // shoulder
      default: return -1;
    }
  }

  /** OG CCSWnd_List::WearCommodity @0x4C85E0 → CCashShop::OnWear @0x4C5A60 —
   *  dress the preview character in the commodity (toggle off when the same
   *  item is clicked again). */
  WearCommodity(comm: CashCommodity | null): void {
    if (!comm || !this._initialLook || !this._charLook) return;
    const itemId = comm.itemId;
    if (itemId === 0) return;
    // OG: cash weapon sticker (/100000==17) rides slot 11; /100000==16 rejected
    const isWeaponSticker = Math.floor(itemId / 100000) === 17;
    if (!isWeaponSticker && Math.floor(itemId / 100000) === 16) return;
    const bp = isWeaponSticker ? 11 : this._bodyPartFromItem(itemId);
    if (bp < 0) return;
    // gender gate (GetCommodityGender != -1/2/self)
    if (!(comm.gender === -1 || comm.gender === 2 || comm.gender === this._playerGender)) return;

    // Toggle: same item worn again → take it off
    const worn = this._wearInfo.get(bp);
    if (worn && worn.itemId === itemId) {
      this._wearInfo.delete(bp);
    } else {
      // Overall/pants exclusivity (wearing /10000==105 clears pants, and back)
      if (bp === 5 && Math.floor(itemId / 10000) === 105) this._wearInfo.delete(6);
      if (bp === 6) {
        const top = this._wearInfo.get(5);
        if (top && Math.floor(top.itemId / 10000) === 105) this._wearInfo.delete(5);
      }
      this._wearInfo.set(bp, { itemId, sn: comm.sn });
    }
    this._applyWearInfo();
  }

  /** Rebuild the preview look from the initial snapshot + try-on overlay. */
  private _applyWearInfo(): void {
    if (!this._initialLook || !this._charLook) return;
    const look = new AvatarLook();
    look.gender = this._initialLook.gender;
    look.skin = this._initialLook.skin;
    look.face = this._initialLook.face;
    look.hair = this._initialLook.hair;
    look.petIds = [...this._initialLook.petIds];
    look.weaponStickerId = this._initialLook.weaponStickerId;
    for (const [slot, id] of this._initialLook.hairEquip) look.hairEquip.set(slot, id);
    for (const [bp, w] of this._wearInfo) {
      if (bp === 11) {
        look.weaponStickerId = w.itemId;
      } else {
        look.hairEquip.set(bp, w.itemId);
      }
    }
    this._charLook.SetAvatar(look);
    this._charLook.RebuildDisplay();
  }

  /** OG CCashShop::OnTakeOff — clear every tried-on item (no packet). */
  private _onTakeOffAvatar(): void {
    if (!this._initialLook || !this._charLook) return;
    this._wearInfo.clear();
    this._applyWearInfo();
    this._statusMessage = 'Removed all items from your avatar.';
  }

  /** OG CCashShop::OnDefaultAvatar — restore the server-equipped look. */
  private _onDefaultAvatar(): void {
    this._onTakeOffAvatar();
    this._statusMessage = 'Avatar restored to default.';
  }

  /** OG CCashShop::OnBuyAvatar @0x48D030 — buy every tried-on item that
   *  differs from the initial look (one buy packet per changed slot). */
  private _onBuyAvatar(): void {
    if (!this.game) return;
    if (!this._cashShopAuthorized) { this._statusMessage = 'Not authorized for Cash Shop.'; return; }
    let count = 0;
    for (const [, w] of this._wearInfo) {
      this.game.session.send(GameSender.CashShopBuy(w.sn));
      count++;
    }
    this._statusMessage = count > 0 ? `Buying ${count} avatar item(s)...` : 'No avatar items selected.';
  }

  private _buildStaticLayer(): void {
    this._staticRoot.removeChildren().forEach(child => child.destroy());
    if (!this._bg) return;
    this._bgSprite = this._bg.ToPixi();
    this._staticRoot.addChild(this._bgSprite);
  }

  /** OG Init @0x484920 — background canvas by job family:
   *  Cygnus(job/1000==1)→backgrnd1, Aran(/100==21‖2000)→backgrnd4,
   *  Evan(/100==22‖2001)→backgrnd5, Legendary(/1000==3)→backgrnd3, else backgrnd. */
  private _selectBackground(): void {
    const job = this._playerJob;
    let idx = 0;
    if (Math.floor(job / 1000) === 1) idx = 1;
    else if (Math.floor(job / 100) === 21 || job === 2000) idx = 4;
    else if (Math.floor(job / 100) === 22 || job === 2001) idx = 5;
    else if (Math.floor(job / 1000) === 3) idx = 3;
    const variant = this._bgVariants[idx];
    if (!variant || !this._loader) return;
    const old = this._bgSprite;
    this._bgSprite = variant.ToPixi();
    this._staticRoot.addChildAt(this._bgSprite, 0);
    if (old && old !== this._bgSprite) {
      old.removeFromParent();
      old.destroy();
    }
  }

  private _getSalePrice(item: CashCommodity): number {
    return item.discountRate > 0 ? Math.floor(item.price * (100 - item.discountRate) / 100) : item.price;
  }

  private _isCommodityUsable(item: CashCommodity): boolean {
    if (item.reqLevel > 0 && this._playerLevel < item.reqLevel) return false;
    if (item.reqPop > 0 && this._playerFame < item.reqPop) return false;
    // OG IsUsableItemCheckFirst @0x486820 rule 1: Evan-only dragon boxes
    // (5620006/5620007/5620008) — non-Evan characters get SP 0x162A.
    const isEvan = Math.floor(this._playerJob / 100) === 22 || this._playerJob === 2001;
    if (!isEvan && (item.itemId === 5620006 || item.itemId === 5620007 || item.itemId === 5620008)) return false;
    if (item.gender !== 0 && item.gender !== 2 && item.gender !== this._playerGender) return false;
    if (item.classField !== 0) {
      const jobClass = Math.floor(this._playerJob / 100);
      const classMatches = [1, 2, 3, 4].includes(item.classField) && jobClass === item.classField;
      if (!classMatches) return false;
    }
    return true;
  }

  private _decodeSaleTables(stock: Uint8Array, limitGoods: Uint8Array, zeroGoods: Uint8Array): void {
    this._stockStates.clear();
    const stockView = new DataView(stock.buffer, stock.byteOffset, stock.byteLength);
    for (let off = 0; off + 8 <= stock.byteLength; off += 8) {
      this._stockStates.set(stockView.getInt32(off, true), stockView.getInt32(off + 4, true));
    }

    this._limitGoods = [];
    const limitView = new DataView(limitGoods.buffer, limitGoods.byteOffset, limitGoods.byteLength);
    for (let off = 0; off + 104 <= limitGoods.byteLength; off += 104) {
      const values = Array.from({ length: 26 }, (_, i) => limitView.getInt32(off + i * 4, true));
      this._limitGoods.push({
        sns: values.slice(1, 11).filter(sn => sn !== 0),
        count: values[13],
        state: values[12],
        condition: values[14],
        dateStart: values[15],
        dateEnd: values[16],
        hourStart: values[17],
        hourEnd: values[18],
        weekdays: values.slice(19, 26),
      });
    }

    this._zeroGoods = [];
    const zeroView = new DataView(zeroGoods.buffer, zeroGoods.byteOffset, zeroGoods.byteLength);
    for (let off = 0; off + 68 <= zeroGoods.byteLength; off += 68) {
      const values = Array.from({ length: 17 }, (_, i) => zeroView.getInt32(off + i * 4, true));
      this._zeroGoods.push({
        startSN: values[0], endSN: values[1], eventSN: values[2], condition: values[3],
        dateStart: values[4], dateEnd: values[5], hourStart: values[6], hourEnd: values[7],
        weekdays: values.slice(8, 15),
      });
    }
  }

  private _getLimitGoodsState(sn: number): number {
    return this._limitGoods.find(entry => entry.sns.includes(sn))?.state ?? 0;
  }

  private _saleTimeMatches(condition: number, dateStart: number, dateEnd: number, hourStart: number, hourEnd: number, weekdays: number[]): boolean {
    const now = new Date();
    const date = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    if ((condition & 2) !== 0 && (date < dateStart || date > dateEnd)) return false;
    if ((condition & 4) !== 0 && !weekdays[now.getDay()]) return false;
    if ((condition & 8) !== 0 && (now.getHours() < hourStart || now.getHours() >= hourEnd)) return false;
    return true;
  }

  private _isSaleAvailable(item: CashCommodity): boolean {
    if (item.stockState === 2 || item.limitState === 2) return false;
    const limit = this._limitGoods.find(entry => entry.sns.includes(item.sn));
    if (limit && (limit.count <= 0 || limit.state === 2 || !this._saleTimeMatches(limit.condition, limit.dateStart, limit.dateEnd, limit.hourStart, limit.hourEnd, limit.weekdays))) return false;
    const zero = this._zeroGoods.find(entry => item.sn >= entry.startSN && item.sn <= entry.endSN);
    if (zero && !this._saleTimeMatches(zero.condition, zero.dateStart, zero.dateEnd, zero.hourStart, zero.hourEnd, zero.weekdays)) return false;
    return true;
  }

  /** OG CCSWnd_List::SetPlateNo @0x4C9B40 — per-plate button availability.
   *  OG creates 3 buttons per plate — Buy (id 3i+2000), Gift (3i+2001) and a
   *  third (3i+2002) — then disables each by the rule table below. The TS
   *  plate renders Buy+Gift: buy follows every rule that disables OG's [0],
   *  gift every rule that disables OG's [1]. Stock/limit-exhausted entries
   *  stay VISIBLE (OG ChangePage keeps them in the list); only their buttons
   *  are disabled. */
  /** OG CCSWnd_List::SetPlateNo @0x4C9B40 — per-plate button availability.
   *  OG creates 3 buttons per plate — Buy (id 3i+2000), Gift (3i+2001) and
   *  Wish (3i+2002; OnSetWish / OnRemoveWish on category 9, see
   *  OnButtonClicked @0x4C71D0 case 2) — then disables each by rule groups:
   *  [Buy,Wish] = gender + level gates; [Buy,Gift] = premium/stock/off-sale;
   *  [Gift,Wish] = free / random-window / one-a-day / limit(2|3);
   *  [Gift] = rings and non-giftable coupons. */
  _plateButtons(item: CashCommodity): { buy: boolean; gift: boolean; wish: boolean } {
    let buy = true;
    let gift = true;
    let wish = true;
    const noBuyPair = () => { buy = false; wish = false; };  // [0]+[2]
    const noBoth = () => { buy = false; gift = false; };      // [0]+[1]
    const noGiftPair = () => { gift = false; wish = false; }; // [1]+[2]
    const noGift = () => { gift = false; };                   // [1]

    // Sold-out stock / exhausted limit goods → Buy+Gift off ([0]+[1])
    if (!this._isSaleAvailable(item) || item.stockState === 1 || item.limitState === 1) noBoth();
    // Premium-only items for non-premium characters → Buy+Gift off
    if (!this._isPremium && item.forPremiumUser) noBoth();
    // Off-sale → Buy+Gift off
    if (!item.onSale) noBoth();

    // Gender mismatch → Buy+Wish off. GetCommodityGender != -1/2/self.
    if (!(item.gender === -1 || item.gender === 2 || item.gender === this._playerGender)) noBuyPair();
    // Level/account-gated categories → Buy+Wish off
    const cat10k = Math.floor(item.itemId / 10000);
    const newAccount = false; // OG CWvsContext::IsNewAccount — not tracked client-side
    if (cat10k === 507 && this._playerLevel <= 10) noBuyPair(); // megaphones
    if ((cat10k === 514 || cat10k === 503) && (this._playerLevel <= 15 || newAccount)) noBuyPair();
    if (cat10k === 504 && this._playerLevel < 7) noBuyPair();
    if (cat10k === 539 && (this._playerLevel <= 10 || newAccount)) noBuyPair(); // name-change family
    if (cat10k === 520 && this._playerLevel <= 15) noBuyPair(); // pet-name tags
    if (item.itemId === 5200009 || item.itemId === 5200010) noBuyPair();

    // Non-giftable coupons → Gift off ([1] only)
    const id100 = Math.floor(item.itemId / 100);
    if ((id100 === 11120 && item.itemId !== 1112000)
      || (id100 === 11128 && item.itemId % 10 <= 2)) noGift(); // couple/friendship rings
    if (item.itemId === 5400000 || item.itemId === 5401000) noGift(); // name change / world transfer
    if (item.itemId === 5220012 || item.itemId === 5222000
      || item.itemId === 5220016 || item.itemId === 5220017 || item.itemId === 5220018) noGift();
    const cat1k = Math.floor(item.itemId / 1000);
    if (Math.floor(item.itemId / 10000) === 911 || cat1k === 5430
      || item.itemId === 5431000 || item.itemId === 5432000) noGift(); // slot increase
    if (Math.floor(item.itemId / 10000) === 555) noGift(); // equip slot extension

    // Free / random-window / one-a-day / purchase-limited → Gift+Wish off ([1]+[2])
    if (item.price === 0) noGiftPair();
    if (item.sn >= 80000000 && item.sn <= 89999999) noGiftPair();
    if (Math.floor(item.sn / 100000) === 210 || item.sn === 5640000) noGiftPair();
    if (item.limit === 2 || item.limit === 3) noGiftPair();

    return { buy, gift, wish };
  }

  /** OG CCashShop::GetCashPurchaseRecord @0x482450 — purchase state for a
   *  limit(2|3) commodity. Unknown SNs default to PURCHASED (hidden) while a
   *  lazy RequestCashPurchaseRecord @0x4823C0 (sub-action 0x2C) is in flight;
   *  OnCashItemResPurchaseRecord @0x495B50 fills the map and refreshes. */
  private _getPurchaseRecord(key: number): boolean {
    if (key !== 0) {
      const rec = this._purchaseRecords.get(key);
      if (rec === undefined) {
        this._requestPurchaseRecord(key);
        return true;
      }
      return rec;
    }
    if (this._purchaseRecordGlobal === -1) this._requestPurchaseRecord(0);
    return this._purchaseRecordGlobal !== 0;
  }

  private _requestPurchaseRecord(key: number): void {
    if (!this.game?.session.isConnected) return;
    if (this._purchaseRecordRequested.has(key)) return; // OG re-requests per query; we guard
    this._purchaseRecordRequested.add(key);
    this.game.session.send(GameSender.CashShopPurchaseRecord(key));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Rendering — OG-faithful layout
  // ═══════════════════════════════════════════════════════════════════════════

  update(_dt: number): void {
    // One-a-Day countdown timer
    if (this._oneADayItemSN > 0 && (this._oneADayTimer.hours > 0 || this._oneADayTimer.minutes > 0 || this._oneADayTimer.seconds > 0)) {
      this._oneADayTimerAccum += _dt;
      while (this._oneADayTimerAccum >= 1000) {
        this._oneADayTimerAccum -= 1000;
        if (this._oneADayTimer.seconds > 0) {
          this._oneADayTimer.seconds--;
        } else if (this._oneADayTimer.minutes > 0) {
          this._oneADayTimer.minutes--;
          this._oneADayTimer.seconds = 59;
        } else if (this._oneADayTimer.hours > 0) {
          this._oneADayTimer.hours--;
          this._oneADayTimer.minutes = 59;
          this._oneADayTimer.seconds = 59;
        }
      }
    }

    this._clearDynamic();
    this._g.clear();

    this._drawCharacterPreview();
    this._drawTabBar();
    this._drawSubCategoryBar();
    if (this._oneADayActive && this._oneADayItemSN > 0) this._drawOneADay();
    else this._drawItemGrid();
    this._drawShortcutHelp();
    this._drawBestPanel();
    this._drawLockerPanel();
    this._drawInventoryPanel();
    this._drawStatusBar();
    this._drawSearchButton();
    this._drawCouponDialog();
    this._drawStatusMessage();
    if (this._giftVisible) this._drawGiftDialog();
    if (this._yesNoVisible) this._drawYesNoDialog();
    if (this._confirmBuyVisible) this._drawConfirmBuy();
    if (this._activeDialog === 'nameChange') this._drawNameChangeDialog();
    if (this._activeDialog === 'worldTransfer') this._drawWorldTransferDialog();
    if (this._activeDialog === 'coupleName') this._drawCoupleNameDialog();
    if (this._activeDialog === 'friendName') this._drawFriendNameDialog();
    if (this._activeDialog === 'equipSlotExt') this._drawEquipSlotExtDialog();
  }

  draw(): void {}

  onResize(windowW: number, _windowH: number): void {
    this._prevW = windowW;
    this._root.x = 0;
    this._staticRoot.x = this._root.x;
  }

  // ── Character preview (m_pLayer) — LEFT COLUMN ──
  // OG: L=0, T=0, W=256, H=316 — background + character rendering area
  // Background selected by job category:
  //   job/1000==1 (Cygnus) → Preview/1
  //   job/100==21 or job==2000 (Aran) → Preview/2
  //   job/100==22 or job==2001 (Evan) → Preview/2
  //   job/1000==3 (Legendary) → Preview/0
  //   else → Preview/0
  // CCSWnd_Char::OnCreate creates outfit category tabs and scrollbar
  private _drawCharacterPreview(): void {
    // Select preview background by job category
    const previewIdx = this._getPreviewIndex();
    const previewBg = this._previewBgs[previewIdx];

    if (previewBg) {
      this._drawWzSprite(previewBg, CHAR_X, CHAR_Y);
    }

    if (this._charLook && this._previewEnabled) {
      this._charLook.Update(1 / 60, { x: 0, y: 0 }, false, false);
      this._charLook.RebuildDisplay();
      const container = this._charLook.container;
      container.position.set(CHAR_X + CHAR_W / 2, CHAR_Y + CHAR_H - 30);
      this._root.addChild(container);
    }

    // PreviewOnOff toggle button — OG SetUserPreviewControl layers:
    // UserCtrlOn at (130,120), UserCtrlOff at (119,17), char-window relative.
    const previewToggle = this._previewEnabled ? this._previewOn : this._previewOff;
    if (previewToggle) {
      const tx = this._previewEnabled ? CHAR_X + 130 : CHAR_X + 119;
      const ty = this._previewEnabled ? CHAR_Y + 120 : CHAR_Y + 17;
      this._drawWzSprite(previewToggle, tx, ty);
    }

    const avatarButtons = [
      [this._btBuyAvatar, 17, 83, 'btBuyAvatar'],
      [this._btDefaultAvatar, 101, 83, 'btDefaultAvatar'],
      [this._btTakeoffAvatar, 187, 55, 'btTakeoffAvatar'],
    ] as const;
    for (const [sprite, x, w, hoverKey] of avatarButtons) {
      if (sprite) this._drawWzSprite(sprite, CHAR_X + x, CHAR_Y + 237);
      // OG CCtrlButton mouseOver highlight
      if (this._hoveredBtn === hoverKey) {
        this._g.rect(CHAR_X + x, CHAR_Y + 236, w, 20).stroke({ color: COL_TEXT_GOLD, width: 1 });
      }
    }
  }

  /** OG: determines Preview canvas index from job category. */
  private _getPreviewIndex(): number {
    const job = this._playerJob;
    if (Math.floor(job / 1000) === 1) return 1; // Cygnus Knights
    if (Math.floor(job / 100) === 21 || job === 2000) return 2; // Aran
    if (Math.floor(job / 100) === 22 || job === 2001) return 2; // Evan
    return 0; // Normal / Legendary
  }

  // ── Status bar (CCSWnd_Status) — BOTTOM CENTER ──
  // OG: L=254, T=530, W=545, H=56
  // Draw (0x4CBCD0): 3 separator blocks at Y=11/25/40, W=107 at X=120.
  // The NX labels are baked into Base/backgrnd; only the gold values are drawn,
  // right-aligned at x = 220 - valueWidth, at y = 9 (NexonCash), 23 (PrepaidNX),
  // 38 (MaplePoint) — all relative to the status window.
  /** OG format_integer(v, 1): thousands-grouped decimal string. */
  private _formatInteger(v: number): string {
    return Math.max(0, Math.floor(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  private _drawStatusBar(): void {
    // Background — use WZ sprite if available
    if (this._bgStatus) {
      this._drawWzSprite(this._bgStatus, STATUS_X, STATUS_Y);
    }

    // Separator blocks (OG: raw_DrawRectangle filled 107x11 at X=120, Y=11/25/40)
    const lineX = STATUS_X + 120; // 0x78
    const lineW = 107; // 0x6B
    for (const ly of [11, 25, 40]) {
      this._g.rect(lineX, STATUS_Y + ly, lineW, 11).fill({ color: 0xF3F4F5, alpha: 0.15 });
    }

    // Values — right-aligned at x = 220 - width, y = 9/23/38 (OG order).
    // OG: format_integer(v, groupThousands) then DrawTextA right-aligned;
    // NexonCash/Prepaid use FONT_NO_BLACK, MaplePoint uses FONT_NO_RED.
    const values: Array<[number, number, string, number]> = [
      [this._nxCredit, 9, 'NexonCash', COL_TEXT_WHITE],
      [this._nxPrepaid, 23, 'PrepaidNXCash', COL_TEXT_WHITE],
      [this._maplePoints, 38, 'MaplePoint', 0xE84C4C],
    ];
    for (const [amount, dy, _label, color] of values) {
      const s = this._formatInteger(amount);
      const w = s.length * 7; // monospace 11px ≈ 7px/char
      this._addText(s, STATUS_X + 220 - w, STATUS_Y + dy, color, 11);
    }

    // OG button IDs: 1000=Charge, 1001=Check, 1002=Coupon, 1003=Exit
    // Buttons positioned at right side of status bar, y offset +13 (CreateCtrl_2
    // y=13 relative to the status window at y=530) — use mouseOver on hover.
    const btnY = STATUS_Y + 13;
    const statusBtns = [
      { normal: this._btCharge, over: this._btChargeOver, x: STATUS_X + 248, key: 'charge' },
      { normal: this._btCheck, over: this._btCheckOver, x: STATUS_X + 289, key: 'check' },
      { normal: this._btCoupon, over: this._btCouponOver, x: STATUS_X + 330, key: 'coupon' },
    ];
    for (const btn of statusBtns) {
      const isHovered = this._hoveredBtn === btn.key;
      const sprite = isHovered ? (btn.over ?? btn.normal) : btn.normal;
      if (sprite) {
        this._drawWzSprite(sprite, btn.x, btnY);
      }
    }

    // Exit button (BtExit id 1003 sits at y offset +15)
    const exitX = STATUS_X + 378;
    const exitY = STATUS_Y + 15;
    const exitHovered = this._hoveredBtn === 'exit';
    const exitSprite = exitHovered ? (this._btExitOver ?? this._btExit) : this._btExit;
    if (exitSprite) {
      this._drawWzSprite(exitSprite, exitX, exitY);
    }
  }

  // ── Tab bar (CCSWnd_Tab) — HORIZONTAL, TOP CENTER ──
  // OG: L=272, T=17, W=508, H=78
  // Uses CCtrlSelector (horizontal), NOT CCtrlTab
  // Each tab has a pre-rendered WZ canvas from CSTab/Tab/1-9
  private _drawTabBar(): void {
    // Each CSTab/Tab/N canvas is the complete 508x78 selector for category N.
    // The OG client draws one canvas blit at (2,0) inside the tab window,
    // not nine overlaid tab fragments. Canvas index map (CCSWnd_Tab::Draw):
    // category 8 and 10 → canvas 1, category 9 → canvas 9, else category+1.
    let idx: number;
    if (this._activeTab === 8 || this._activeTab === 10) idx = 0;
    else if (this._activeTab === 9) idx = 8;
    else idx = this._activeTab;
    const tabSprite = this._tabSprites[idx];
    if (tabSprite) this._drawWzSprite(tabSprite, TAB_X + 2, TAB_Y);
  }

  // ── Item grid (CCSWnd_List) — CENTER, 2 columns × 5 rows ──
  // OG: L=275, T=95, W=412, H=430
  // 10 PICTURE_PLATE entries with (nX, nY, sUOL)
  // Each plate: 64×64 item icon area + name + price
  /** OG CCSWnd_List::GetPlateRect(n): left=206*(n%2), top=81*(n/2)+2;
   *  plate is 200x81 (pitch 206x81, 2 cols × 5 rows). */
  _getPlateRect(n: number): { left: number; top: number } {
    return {
      left: LIST_X + PLATE_COL_W * (n % PLATE_COLS),
      top: LIST_Y + PLATE_ROW_H * Math.floor(n / PLATE_COLS) + 2,
    };
  }

  private _drawItemGrid(): void {
    const items = this._searchResults ?? this._getCurrentPageItems();
    const offset = this._page * PLATES_PER_PAGE;

    // OG: white background strip behind the plates
    this._g.rect(LIST_X, LIST_Y, LIST_W, 410).fill({ color: 0xFFFFFF });

    // OG: PicturePlate/NoItem — empty page placeholder (406×242)
    if (items.length === 0 && !this._searchResults && this._noItemImage) {
      this._drawWzSprite(this._noItemImage, LIST_X + 3, LIST_Y + 94);
      return;
    }

    for (let row = 0; row < PLATE_ROWS; row++) {
      for (let col = 0; col < PLATE_COLS; col++) {
        const plateIdx = row * PLATE_COLS + col;
        const absIdx = offset + plateIdx;
        const px = LIST_X + col * PLATE_COL_W;
        const py = LIST_Y + row * PLATE_ROW_H + 2;

        // CSList/Base is the authentic plate background, including empty plates.
        if (this._bgList) this._drawWzSprite(this._bgList, px, py);

        if (absIdx < items.length) {
          const item = items[absIdx];
          const isSelected = plateIdx === this._selectedPlate;
          const isFocused = plateIdx === this._focusedPlate;

          // Plate background — use WZ state canvas if available, else Graphics fallback
          const plateBg = isSelected ? (this._plateStateHover ?? this._plateStateNormal) : this._plateStateNormal;
          if (plateBg && plateBg !== this._bgList) this._drawWzSprite(plateBg, px, py);

          // Keyboard focus indicator — dotted border around focused plate
          if (isFocused && !isSelected) {
            this._g.rect(px + 1, py + 4, PLATE_W - 4, PLATE_H - 4)
              .stroke({ color: COL_TEXT_GOLD, width: 1 });
          }

          // Item icon (OG CCSWnd_List::Draw @0x4CDA10: DrawItemIconForSlot at
          // rect.left+7, rect.top+73 — anchored by the icon's origin so the
          // picture renders at the plate's top-left).
          const icon = this._icons?.LoadIcon(item.itemId);
          if (icon) {
            const sp = this._createIcon(icon);
            sp.position.set(px + 7, py + 73);
          }

          // Item name (OG: DrawTextA at rect.left+82, rect.top+6)
          this._addText(item.name.slice(0, 14), px + 82, py + 6, COL_TEXT_WHITE, 11);

          // Price (OG: comma-formatted digits plus a TEXT currency suffix —
          // no coin sprite in v95). Red-violet font inside the random SN window.
          const price = this._getSalePrice(item);
          const currency = item.maplePoint > 0 ? ' MP' : ' NX';
          const countSuffix = (item.count ?? 1) > 1 ? ` x${item.count}` : '';
          const priceColor = (item.sn >= 80000000 && item.sn <= 89999999)
            ? COL_PRICE_RANDOM
            : COL_TEXT_GOLD;
          this._addText(`${this._formatInteger(price)}${currency}${countSuffix}`, px + 78, py + 32, priceColor, 11);

          // Discount badge — base glyph at (left+44, top+64), digit children
          // step +5px each
          if (item.discountRate > 0) {
            if (this._discountBg) {
              this._drawWzSprite(this._discountBg, px + 44, py + 64);
            }
            let dx = px + 44;
            for (const ch of String(item.discountRate)) {
              const di = ch.charCodeAt(0) - 48;
              const digit = di >= 0 && di <= 9 ? this._discountDigits[di] : null;
              if (digit) this._drawWzSprite(digit, dx, py + 64);
              dx += 5;
            }
          }

          // Buy/Gift buttons (OG: CSList/BtBuy + BtGift — 4 states each;
          // SetPlateNo @0x4C9B40 disables them per commodity, drawn dimmed)
          const btns = this._plateButtons(item);
          const buyX = px + PLATE_W - 40;
          const buyY = py + 52;
          const buyHovered = btns.buy && this._hoveredBtn === `buy_${plateIdx}`;
          const buySprite = buyHovered ? (this._btBuyOver ?? this._btBuy) : this._btBuy;
          if (buySprite) {
            const sp = this._drawWzSprite(buySprite, buyX, buyY);
            if (!btns.buy) (sp as Sprite).alpha = 0.35;
          }

          // Gift button
          const giftX = px + PLATE_W - 40;
          const giftY = py + 26;
          const giftHovered = btns.gift && this._hoveredBtn === `gift_${plateIdx}`;
          const giftSprite = giftHovered ? (this._btGiftOver ?? this._btGift) : this._btGift;
          if (giftSprite) {
            const sp = this._drawWzSprite(giftSprite, giftX, giftY);
            if (!btns.gift) (sp as Sprite).alpha = 0.35;
          }

          // Wish toggle button (OG third plate button, id 3i+2002 —
          // OnSetWish / OnRemoveWish via OnButtonClicked @0x4C71D0 case 2)
          const inWish = this._wishlist.includes(item.sn);
          const wishHovered = btns.wish && this._hoveredBtn === `wish_${plateIdx}`;
          this._drawWishButton(
            px + PLATE_W - 40,
            py,
            wishHovered,
            !btns.wish,
            inWish,
          );

          // Effect badges (OG: CSEffect — hot/new/sale). X offset by class;
          // skipped for category 9 or limited goods.
          if (!(item.category === 9 || item.limit !== 0)) {
            const badgeXTable: Record<number, number> = { 0: 17, 1: 2, 2: 17, 3: 9 };
            const bx = px + (badgeXTable[item.classField] ?? 17);
            if (item.discountRate > 0 && this._effectSale) {
              this._drawWzSprite(this._effectSale, bx, py + 2);
            } else if (this._effectHot) {
              this._drawWzSprite(this._effectHot, bx, py + 2);
            } else if (this._effectNew) {
              this._drawWzSprite(this._effectNew, bx, py + 2);
            }
          }
        }
      }
    }
  }

  /** Third plate button — wishlist add/remove toggle. WZ sprite when
   *  available, else a small labeled box ("Wish" / "Del", the OG
   *  StringPool 1265/1266 label pair). */
  private _drawWishButton(x: number, y: number, hovered: boolean, disabled: boolean, inWish: boolean): void {
    const sprite = hovered ? (this._btWishOver ?? this._btWish) : this._btWish;
    if (sprite) {
      const sp = this._drawWzSprite(sprite, x, y + 2);
      sp.alpha = disabled ? 0.35 : 1;
      return;
    }
    const w = 36;
    const h = 16;
    this._g.rect(x, y, w, h)
      .fill({ color: disabled ? COL_TAB_INACTIVE : hovered ? 0x3A4A78 : COL_TAB_ACTIVE });
    this._g.rect(x, y, w, h).stroke({ color: COL_TAB_BORDER_ACTIVE, width: 1 });
    this._addText(inWish ? 'Del' : 'Wish', x + 6, y + 2, disabled ? COL_TEXT_DIM : COL_TEXT_WHITE, 9);
  }

  // ── One-a-Day panel (CCSWnd_OneADay) — CENTER, replaces item grid on tab 9 ──
  // Today's big plate is LIST-relative (4,93)-(398,158); the previous-items
  // grid reuses the main list plate geometry (206x81 pitch, 200x80 plates);
  // action buttons at (165,202) and (246,202); countdown digits at
  // x=145/182 (hh), 232/269 (mm), 319/356 (ss), y=264.
  private _drawOneADay(): void {
    // Panel background — same area as item grid
    if (this._oneADayBase) this._drawWzSprite(this._oneADayBase, LIST_X + 3, LIST_Y + 3);

    // Title
    this._addText('One-a-Day', LIST_X + 140, LIST_Y + 8, COL_TEXT_GOLD, 13);

    // ── Today's item (large plate, LIST-relative 4,93 394x65) ──
    const todayX = LIST_X + 4;
    const todayY = LIST_Y + 93;

    const todayPlate = this._oneADayPlateBig ?? this._oneADayItemBox;
    if (todayPlate) this._drawWzSprite(todayPlate, todayX, todayY);

    this._addText('Today\'s Item', todayX + 8, todayY + 4, COL_TEXT_DIM, 10);

    if (this._oneADayItemSN > 0) {
      // Look up commodity by SN
      const comm = this._commodities.find(c => c.sn === this._oneADayItemSN);
      if (comm) {
        // Item icon
        const icon = this._icons?.LoadIcon(comm.itemId);
        if (icon) {
          const sp = this._createIcon(icon);
          sp.position.set(todayX + 50, todayY + 32);
          sp.scale.set(icon.Width > 48 ? 48 / icon.Width : 1);
        }
        // Item name + price
        this._addText(comm.name, todayX + 80, todayY + 16, COL_TEXT_WHITE, 12);
        this._addText(`${this._formatInteger(comm.price)} NX`, todayX + 80, todayY + 34, COL_TEXT_GOLD, 11);
      } else {
        // SN exists but commodity not loaded yet
        this._addText(`Item SN: ${this._oneADayItemSN}`, todayX + 80, todayY + 24, COL_TEXT_DIM, 11);
      }
    } else {
      this._addText('No item available today.', todayX + 80, todayY + 24, COL_TEXT_DIM, 11);
    }

    // ── Action buttons — list-relative (165,202) and (246,202) ──
    const btnY = LIST_Y + 202;
    if (this._oneADayBuy) this._drawWzSprite(this._oneADayBuy, LIST_X + 165, btnY);
    if (this._oneADayGift) this._drawWzSprite(this._oneADayGift, LIST_X + 246, btnY);

    // ── Previous items grid — same plate geometry as the main list ──
    this._addText('Previous Items', LIST_X + 4, LIST_Y + 170, COL_TEXT_DIM, 10);

    for (let i = 0; i < PLATES_PER_PAGE; i++) {
      const px = LIST_X + PLATE_COL_W * (i % PLATE_COLS) + 2;
      const py = LIST_Y + PLATE_ROW_H * Math.floor(i / PLATE_COLS) + 2;

      if (i < this._oneADayPrevItems.length) {
        const prev = this._oneADayPrevItems[i];
        const isSelected = i === this._oneADaySelected;

        // Plate background — OG uses the CSList/Base plate canvas
        if (this._bgList) this._drawWzSprite(this._bgList, px, py);
        else {
          this._g.rect(px, py, PLATE_W, PLATE_H)
            .fill({ color: isSelected ? 0x1E2845 : COL_PLATE });
          this._g.rect(px, py, PLATE_W, PLATE_H)
            .stroke({ color: isSelected ? COL_TAB_BORDER_ACTIVE : COL_PLATE_BORDER, width: isSelected ? 2 : 1 });
        }
        if (isSelected) {
          this._g.rect(px + 1, py + 1, PLATE_W - 2, PLATE_H - 2)
            .stroke({ color: COL_TEXT_GOLD, width: 2 });
        }

        // Look up commodity
        const comm = this._commodities.find(c => c.sn === prev.sn);
        if (comm) {
          const icon = this._icons?.LoadIcon(comm.itemId);
          if (icon) {
            const sp = this._createIcon(icon);
            sp.position.set(px + 7, py + 73);
            sp.scale.set(icon.Width > 40 ? 40 / icon.Width : 0.6);
          }
          this._addText(comm.name.slice(0, 14), px + 82, py + 6, COL_TEXT_WHITE, 9);
        } else {
          this._addText(`SN: ${prev.sn}`, px + 82, py + 20, COL_TEXT_DIM, 9);
        }

        // Date label
        if (prev.date > 0) {
          const d = new Date(prev.date * 1000);
          const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
          this._addText(dateStr, px + PLATE_W - 36, py + 4, COL_TEXT_DIM, 8);
        }
      } else {
        // Empty plate
        this._g.rect(px, py, PLATE_W, PLATE_H)
          .fill({ color: 0x0E112A, alpha: 0.5 });
        this._g.rect(px, py, PLATE_W, PLATE_H)
          .stroke({ color: COL_PLATE_BORDER, width: 1 });
      }
    }

    // ── Countdown digits — hh at x=145/182, mm at x=232/269, ss at x=319/356,
    // y=264 (list-relative). OG draws SP 0x16A7 digit glyph canvases; fall back
    // to Text when the glyphs are unavailable.
    const timerY = LIST_Y + 264;
    const drawDigitPair = (value: number, x0: number, x1: number): void => {
      const tens = Math.floor(value / 10) % 10;
      const ones = value % 10;
      const t = this._oneADayDigits[tens];
      const o = this._oneADayDigits[ones];
      if (t && o) {
        this._drawWzSprite(t, LIST_X + x0, timerY);
        this._drawWzSprite(o, LIST_X + x1, timerY);
      } else {
        this._addText(String(value).padStart(2, '0'), LIST_X + x0, timerY, COL_TEXT_GREEN, 11);
      }
    };
    drawDigitPair(this._oneADayTimer.hours % 100, 145, 182);
    drawDigitPair(this._oneADayTimer.minutes % 100, 232, 269);
    drawDigitPair(this._oneADayTimer.seconds % 100, 319, 356);
  }

  // ── Best items (CCSWnd_Best) — RIGHT COLUMN ──
  // OG: L=690, T=157, W=90, H=358
  // 5 items vertically stacked, each 90×68, step 69 (0x45)
  // GetBestRect: top=69*nBest, left=0, right=90, bottom=69*nBest+68
  // OG Draw: icon at (52, 69*i+34), name at (8, 69*i+36), price at (8, 69*i+53)
  // Uses CS3thEvent/0 canvas for event items (i==4 && eventOn)
  private _drawBestPanel(): void {
    if (this._bgBest) {
      this._drawWzSprite(this._bgBest, BEST_X, BEST_Y);
    }

    for (let i = 0; i < 5; i++) {
      // OG GetBestRect: each item is 90×68 at step 69
      const itemTop = i * BEST_STEP; // relative to panel top
      const by = BEST_Y + itemTop;

      // Optional event banner replaces entry index 4 when present
      if (i === 4 && this._bestEventBanner) {
        this._drawWzSprite(this._bestEventBanner, BEST_X + 6, BEST_Y + 276);
        continue;
      }

      if (i < this._bestItems.length) {
        const best = this._bestItems[i];
        const comm = this._commodities.find(c => c.sn === best.sn);
        if (comm) {
          // OG Draw: icon at x=52, y=69*i+34 (relative to panel)
          const icon = this._icons?.LoadIcon(comm.itemId);
          if (icon) {
            const sp = this._createIcon(icon);
            // OG: DrawItemIconForSlot at (52, itemTop+34)
            sp.position.set(BEST_X + 52, by + 34);
            const scale = Math.min(1, 40 / Math.max(icon.Width, icon.Height));
            sp.scale.set(scale);
          }
          // OG Draw: name at (8, itemTop+36), black font
          this._addText(comm.name.slice(0, 10), BEST_X + 8, by + 36, 0x000000, 8);
          // OG Draw: price at (8, itemTop+53), WHITE font
          const price = this._getSalePrice(comm);
          this._addText(`${this._formatInteger(price)} NX`, BEST_X + 8, by + 53, COL_TEXT_WHITE, 8);
        }
      }
    }
  }

  // ── Locker (CCSWnd_Locker) — CENTERED BELOW PREVIEW ──
  // OG: L=-1 (centered), T=318, W=256, H=104
  // OG CCSWnd_Locker::OnCreate: scrollbar X is job-dependent
  //   job/1000==1 (Cygnus): X=5
  //   job/100==21 || job==2000 (Aran): X=6
  //   job/1000==3 (Legendary): X=9
  //   else (Normal): X=0
  // Scrollbar at (X, 229), size 29×67, nWheelRange=208
  /** Cell-selection highlight: translucent fill plus 4 thin edge bars. */
  private _drawCellSelection(x: number, y: number, w: number, h: number): void {
    const color = 0x10B0FF;
    this._g.rect(x, y, w, h).fill({ color, alpha: 0.2 });
    this._g.rect(x, y, w, 1).fill({ color });
    this._g.rect(x, y + h - 1, w, 1).fill({ color });
    this._g.rect(x, y, 1, h).fill({ color });
    this._g.rect(x + w - 1, y, 1, h).fill({ color });
  }

  private _drawLockerPanel(): void {
    if (this._bgLocker) {
      this._drawWzSprite(this._bgLocker, LOCKER_X, LOCKER_Y);
    }
    this._addText('Cash Locker', LOCKER_X + 80, LOCKER_Y + 4, COL_TEXT_GOLD, 11);

    const startIdx = this._lockerScroll * LOCKER_COLS;
    for (let row = 0; row < LOCKER_ROWS; row++) {
      for (let col = 0; col < LOCKER_COLS; col++) {
        const idx = startIdx + row * LOCKER_COLS + col;
        const cx = LOCKER_X + 21 + col * LOCKER_COL_STEP;
        const cy = LOCKER_Y + 30 + row * LOCKER_COL_STEP;

        if (idx === this._selectedLockerCell) {
          this._drawCellSelection(cx, cy, LOCKER_CELL, LOCKER_CELL);
        }

        if (idx < this._lockerItems.length) {
          const item = this._lockerItems[idx];
          const icon = this._icons?.LoadIcon(item.itemId);
          if (icon) {
            const sp = this._createIcon(icon);
            sp.position.set(cx + 16, cy + 16);
            sp.scale.set(0.45);
          }
        }
      }
    }

    // OG scrollbar: job-dependent X position, at Y=229 (relative to panel), size 29×67
    const scrollbarX = this._getLockerScrollbarX();
    const maxScroll = Math.max(0, Math.ceil(Math.max(0, this._lockerItems.length - LOCKER_COLS * LOCKER_ROWS) / LOCKER_COLS));
    if (this._lockerScrollbar) {
      this._lockerScrollbar.container.x = scrollbarX;
      this._lockerScrollbar.setRange(maxScroll + 1);
    }
  }

  /** OG CCSWnd_Locker::OnCreate — job-dependent scrollbar X position */
  private _getLockerScrollbarX(): number {
    const job = this._playerJob;
    if (Math.floor(job / 1000) === 1) return 5;  // Cygnus Knights
    if (Math.floor(job / 100) === 21 || job === 2000) return 6;  // Aran
    if (Math.floor(job / 1000) === 3) return 9;  // Legendary (Aran/Evan job families)
    return 0;  // Normal
  }

  // ── Inventory (CCSWnd_Inventory) — BOTTOM LEFT ──
  // OG: L=0, T=426, W=246, H=163
  // CCSWnd_Inventory::Draw iterates CharacterData::aaItemSlot[m_nItemTI]
  // starting from m_nFirstPosition, renders item icons via CItemInfo::DrawItemIconForSlot
  // Non-equip items (TI==2,3,4) show quantity via draw_number_by_image
  // Non-cash items get a semi-transparent overlay (color 0x724320F6)
  // Selected item gets highlight border (color 0x4010B0FF)
  private _drawInventoryPanel(): void {
    if (this._bgInventory) {
      this._drawWzSprite(this._bgInventory, INV_X, INV_Y);
    }
    this._addText('Inventory', INV_X + 80, INV_Y + 4, COL_TEXT_GOLD, 11);

    // OG: vertical tab control on the LEFT edge (args 4,17,28,156)
    const tabNames = ['Equip', 'Use', 'Setup', 'Etc', 'Cash'];
    const tabX = INV_X + INV_TAB_X;
    const tabY = INV_Y + INV_TAB_Y;
    const tabH = Math.floor(INV_TAB_H / tabNames.length);
    for (let i = 0; i < tabNames.length; i++) {
      const ty = tabY + i * tabH;
      const isActive = i === this._invItemTI;
      this._g.rect(tabX, ty, INV_TAB_W, tabH).fill({ color: isActive ? COL_TAB_ACTIVE : COL_TAB_INACTIVE });
      this._g.rect(tabX, ty, INV_TAB_W, tabH).stroke({ color: isActive ? COL_TAB_BORDER_ACTIVE : COL_PLATE_BORDER, width: 1 });
      this._addText(tabNames[i].slice(0, 3), tabX + 2, ty + 4, isActive ? COL_TEXT_WHITE : COL_TEXT_DIM, 8);
    }

    const expansionButtons = [
      [this._btExEquip, 176, 27],
      [this._btExConsume, 176, 54],
      [this._btExInstall, 176, 81],
      [this._btExEtc, 176, 108],
      [this._btExTrunk, 176, 135],
    ] as const;
    for (const [sprite, x, y] of expansionButtons) {
      if (sprite) this._drawWzSprite(sprite, INV_X + x, INV_Y + y);
    }

    // 4×3 grid of 35×35 cells — render actual items from CharacterData
    const items = this._getInvItems();
    const startIdx = this._invFirstPosition;

    for (let row = 0; row < INV_ROWS; row++) {
      for (let col = 0; col < INV_COLS; col++) {
        const cellIdx = row * INV_COLS + col;
        const slotIdx = startIdx + cellIdx;
         const cx = INV_X + 22 + col * INV_COL_STEP;
         const cy = INV_Y + 55 + row * INV_COL_STEP;
        const isSelected = cellIdx === this._selectedInvCell;

        // Cell background
        this._g.rect(cx, cy, INV_CELL, INV_CELL).fill({ color: isSelected ? 0x1E2845 : COL_PLATE });
        this._g.rect(cx, cy, INV_CELL, INV_CELL).stroke({ color: isSelected ? COL_TAB_BORDER_ACTIVE : COL_PLATE_BORDER, width: isSelected ? 2 : 1 });

        // Draw item if available
        if (slotIdx < items.length) {
          const item = items[slotIdx];
          if (item && item.itemId > 0) {
            const icon = this._icons?.LoadIcon(item.itemId);
            if (icon) {
              const sp = this._createIcon(icon);
              sp.position.set(cx + INV_CELL / 2, cy + INV_CELL / 2);
              const scale = Math.min(1, (INV_CELL - 4) / Math.max(icon.Width, icon.Height));
              sp.scale.set(scale);
            }
            // Show quantity for non-equip items (TI 1-4)
            if (this._invItemTI >= 1 && item.count > 1) {
              this._addText(String(item.count), cx + 20, cy + 24, COL_TEXT_WHITE, 8);
            }
            // OG: non-cash items get a semi-transparent overlay
            if (this._invItemTI !== 4 && item.itemId >= 2000000 && item.itemId < 6000000) {
              this._g.rect(cx, cy, INV_CELL, INV_CELL).fill({ color: 0x724320F6 });
            }
          }
        }

        // Selected item highlight border (OG: color 0x4010B0FF)
        if (isSelected) {
          this._g.rect(cx, cy, INV_CELL, INV_CELL).stroke({ color: 0x4010B0FF, width: 2 });
        }
      }
    }
    if (this._btRebate) this._drawWzSprite(this._btRebate, LOCKER_X + 160, LOCKER_Y + 82);
    // OG scroll range = ceil(slotCount / 4) + 1
    this._inventoryScrollbar?.setRange(Math.ceil(items.length / INV_COLS) + 1);
  }

  /** Get items for the current inventory tab from CharacterData */
  private _getInvItems(): { itemId: number; count: number; cashSN: number }[] {
    if (this._invItemTI === 4) {
      return this._cashInventoryItems.map(item => ({
        itemId: item.itemId,
        count: item.count,
        cashSN: item.sn,
      }));
    }
    if (!this._characterData) return [];
    const cd = this._characterData as any;
    // OG: aaItemSlot is an array of arrays indexed by inventory type
    // aaItemSlot[0] = equip, [1] = use, [2] = setup, [3] = etc, [4] = cash
    const slotArrays = cd.aaItemSlot ?? cd.itemSlot ?? [];
    const slots = slotArrays[this._invItemTI] ?? [];
    const result: { itemId: number; count: number; cashSN: number }[] = [];
    for (const slot of slots) {
      if (!slot) continue;
      const itemId = slot.nItemId ?? slot.itemId ?? 0;
      const count = slot.nNumber ?? slot.count ?? 1;
      const cashSN = slot.liCashItemSN?.lowPart ?? slot.cashSN ?? 0;
      if (itemId > 0) {
        result.push({ itemId, count, cashSN });
      }
    }
    return result;
  }

  /** Decode the fixed-size GW_CashItemInfo payload used by the OG client. */
  private _parseCashItem(bytes: Uint8Array): { sn: number; itemId: number; count: number } | null {
    if (bytes.byteLength < 8) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const itemId = view.getInt32(0, true);
    const sn = view.getInt32(4, true);
    if (itemId <= 0 || sn <= 0) return null;
    const count = bytes.byteLength >= 12 ? Math.max(1, view.getInt16(8, true)) : 1;
    return { sn, itemId, count };
  }

  private _appendCashItem(bytes: Uint8Array): void {
    const item = this._parseCashItem(bytes);
    if (!item) return;
    const existing = this._cashInventoryItems.findIndex(value => value.sn === item.sn);
    if (existing >= 0) this._cashInventoryItems[existing] = item;
    else this._cashInventoryItems.push(item);
  }

  // ── Search button (CCSWnd_ItemSearch) — RIGHT COLUMN TOP ──
  // OG: L=690, T=97, W=89, H=22
  // CCSWnd_ItemSearch::OnCreate creates a full search UI with:
  // - Text input field
  // - Search/Cancel buttons (WZ canvases from CSItemSearch)
  // - Price filter controls
  // - PopUp canvases for search results display
  private _drawSearchButton(): void {
    if (this._btSearch) this._drawWzSprite(this._btSearch, SEARCH_X, SEARCH_Y);

    // Search overlay — input field when search is active
    if (this._searchActive) {
      const overlayY = SEARCH_Y + SEARCH_H + 4;

      if (this._searchPopup) this._drawWzSprite(this._searchPopup, SEARCH_X - 10, overlayY - 4);

      // Input field label
      this._addText('Name:', SEARCH_X - 6, overlayY + 2, COL_TEXT_DIM, 9);

      this._addText(this._searchQuery + '_', SEARCH_X + 22, overlayY + 2, COL_TEXT_WHITE, 10);

      if (this._btSearchBuy) this._drawWzSprite(this._btSearchBuy, SEARCH_X - 6, overlayY + 20);
      if (this._btSearchCancel) this._drawWzSprite(this._btSearchCancel, SEARCH_X + 38, overlayY + 20);
      // mouseOver highlight for the fallback buttons
      if (this._hoveredBtn === 'searchFind') {
        this._g.rect(SEARCH_X - 6, overlayY + 19, 40, 18).stroke({ color: COL_TEXT_GOLD, width: 1 });
      } else if (this._hoveredBtn === 'searchCancel') {
        this._g.rect(SEARCH_X + 38, overlayY + 19, 40, 18).stroke({ color: COL_TEXT_GOLD, width: 1 });
      }

      // Price-band selector (OG CItemSearchDlg combo id 2000 at (103,52) 140x16;
      // bands from CSItemSearch/Price, index 0 = "all")
      if (this._searchPriceBands.length > 0) {
        const bandY = overlayY + 38;
        this._g.rect(SEARCH_X - 10, bandY - 3, 100, 14).fill({ color: 0x10142A });
        this._g.rect(SEARCH_X - 10, bandY - 3, 100, 14).stroke({ color: COL_PLATE_BORDER, width: 1 });
        const label = this._searchBandIndex < 0
          ? 'All prices'
          : `${this._formatInteger(this._searchPriceBands[this._searchBandIndex].low)}~${this._formatInteger(this._searchPriceBands[this._searchBandIndex].high)}`;
        this._addText(label, SEARCH_X - 6, bandY, COL_TEXT_WHITE, 9);
        this._addText('<', SEARCH_X + 92, bandY, COL_TEXT_GOLD, 9);
        this._addText('>', SEARCH_X + 102, bandY, COL_TEXT_GOLD, 9);
      }

      // Result count
      if (this._searchResults) {
        this._addText(`${this._searchResults.length} found`, SEARCH_X - 6, overlayY + 56, COL_TEXT_GREEN, 9);
      }
    }
  }

  /** Cycle the price-band selection (< / > arrows under the search field).
   *  Index range is -1 (= all prices) .. bands.length-1. */
  private _cycleSearchBand(dir: number): void {
    const n = this._searchPriceBands.length;
    if (n === 0) return;
    const shifted = this._searchBandIndex + 1; // 0..n
    this._searchBandIndex = ((shifted + dir) % (n + 1) + n + 1) % (n + 1) - 1;
  }

  /** OG CCouponUseSelectDlg — centered coupon input dialog (224x100). */
  private _couponRect(): { x: number; y: number; w: number; h: number } {
    const w = this._couponBg ? this._couponBg.width : 224;
    const h = this._couponBg ? this._couponBg.height : 100;
    return { x: Math.floor((CS_W - w) / 2), y: Math.floor((CS_H - h) / 2), w, h };
  }

  private _drawCouponDialog(): void {
    if (!this._couponVisible) return;
    this._g.rect(0, 0, CS_W, CS_H).fill({ color: 0x000000, alpha: 0.5 });
    const r = this._couponRect();
    if (this._couponBg) {
      this._drawWzSprite(this._couponBg, r.x, r.y);
    } else {
      this._g.rect(r.x, r.y, r.w, r.h).fill({ color: COL_PANEL });
      this._g.rect(r.x, r.y, r.w, r.h).stroke({ color: COL_TAB_BORDER_ACTIVE, width: 2 });
      this._addText('Coupon', r.x + 80, r.y + 10, COL_TEXT_GOLD, 12);
    }
    // Input field at dialog-relative (12,53) 200x15
    const fx = r.x + 12;
    const fy = r.y + 53;
    this._g.rect(fx, fy, 200, 15).fill({ color: 0xFFFFFF });
    this._g.rect(fx, fy, 200, 15).stroke({ color: COL_PLATE_BORDER, width: 1 });
    this._addText(this._couponValue + '_', fx + 4, fy + 2, 0x111111, 10);
    // Buttons — bottom row inside the window
    const by = r.y + r.h - 26;
    if (this._couponOk) {
      this._drawWzSprite(this._couponOk, r.x + 40, by);
      if (this._hoveredBtn === 'couponOk') {
        this._g.rect(r.x + 38, by - 2, this._couponOk.width + 4, this._couponOk.height + 4)
          .stroke({ color: COL_TEXT_GOLD, width: 1 });
      }
    } else {
      this._g.rect(r.x + 40, by, 64, 18).fill({ color: COL_TAB_ACTIVE });
      this._g.rect(r.x + 40, by, 64, 18).stroke({ color: COL_TAB_BORDER_ACTIVE, width: 1 });
      this._addText('OK', r.x + 60, by + 3, COL_TEXT_WHITE, 10);
    }
    if (this._couponCancel) {
      this._drawWzSprite(this._couponCancel, r.x + 120, by);
      if (this._hoveredBtn === 'couponCancel') {
        this._g.rect(r.x + 118, by - 2, this._couponCancel.width + 4, this._couponCancel.height + 4)
          .stroke({ color: COL_TEXT_GOLD, width: 1 });
      }
    } else {
      this._g.rect(r.x + 120, by, 64, 18).fill({ color: 0x3C1A1A });
      this._g.rect(r.x + 120, by, 64, 18).stroke({ color: 0x8B4444, width: 1 });
      this._addText('Cancel', r.x + 134, by + 3, COL_TEXT_WHITE, 10);
    }
  }

  /** Returns true when the click was consumed by the coupon modal. */
  private _handleCouponClick(lx: number, ly: number): boolean {
    if (!this._couponVisible) return false;
    const r = this._couponRect();
    const by = r.y + r.h - 26;
    const okHit = lx >= r.x + 40 && lx < r.x + (this._couponOk ? 40 + this._couponOk.width : 104) && ly >= by && ly < by + 20;
    const cancelHit = lx >= r.x + 120 && lx < r.x + (this._couponCancel ? 120 + this._couponCancel.width : 184) && ly >= by && ly < by + 20;
    if (okHit) {
      if (this._couponValue.length > 0) this.game?.session.send(GameSender.CashShopUseCoupon(this._couponValue));
      this._couponVisible = false;
      return true;
    }
    if (cancelHit) {
      this._couponVisible = false;
      this._couponValue = '';
      return true;
    }
    return true; // modal swallows all other clicks (typing goes through onKeyPress)
  }

  /** OG CItemSearchDlg::GetResult @0x4C8860 → CCSWnd_ItemSearch::OnButtonClicked
   *  @0x4CD640 — client-side filter by name substring + price band, then show
   *  the results as virtual category 10. */
  private _executeSearch(): void {
    const q = this._searchQuery.toLowerCase();
    if (q.length > 0) {
      let results = this._commodities.filter(c =>
        c.onSale && c.name.toLowerCase().includes(q),
      );
      const band = this._searchPriceBands[this._searchBandIndex];
      if (band) {
        results = results.filter(c => {
          const price = this._getSalePrice(c);
          return price >= band.low && price <= band.high;
        });
      }
      this._searchResults = results;
      this._activeTab = 10; // keep the results (SetCategory would clear)
      this._setSubCategory(0);
      this._page = 0;
      this._selectedPlate = -1;
      this._statusMessage = `Found ${results.length} items`;
    } else {
      this._searchResults = null;
    }
    this._searchActive = false;
  }

  /** OG CCSWnd_List::SetPlateNo — shortcut-help button (id 4000) at
   *  list-relative (150,380), created only on category 8 sub 0. */
  private _drawShortcutHelp(): void {
    if (this._activeTab !== 8 || this._subCategory !== 0) return;
    if (this._shortcutHelpVisible) {
      // Modal — WZ resource (StringPool UOL) when available, else a panel.
      this._g.rect(0, 0, CS_W, CS_H).fill({ color: 0x000000, alpha: 0.5 });
      const w = 260;
      const h = 356;
      const x = Math.floor((CS_W - w) / 2);
      const y = Math.floor((CS_H - h) / 2);
      if (this._shortcutHelpBg) {
        this._drawWzSprite(this._shortcutHelpBg, x, y);
      } else {
        this._g.rect(x, y, w, h).fill({ color: COL_PANEL });
        this._g.rect(x, y, w, h).stroke({ color: COL_TAB_BORDER_ACTIVE, width: 2 });
        this._addText('Shortcut Help', x + 70, y + 12, COL_TEXT_GOLD, 13);
        this._addText('Wheel / PgUp-PgDn: change page', x + 24, y + 60, COL_TEXT_WHITE, 11);
        this._addText('Arrows: move plate focus', x + 24, y + 90, COL_TEXT_WHITE, 11);
        this._addText('Enter: wear selected item', x + 24, y + 120, COL_TEXT_WHITE, 11);
      }
      // Close button at (130,328), dialog-relative
      this._g.rect(x + 130, y + 328, 56, 20).fill({ color: COL_TAB_ACTIVE });
      this._g.rect(x + 130, y + 328, 56, 20).stroke({ color: COL_TAB_BORDER_ACTIVE, width: 1 });
      this._addText('Close', x + 140, y + 332, COL_TEXT_WHITE, 10);
      return;
    }
    this._g.rect(LIST_X + 150, LIST_Y + 380, 60, 20).fill({ color: COL_TAB_ACTIVE });
    this._g.rect(LIST_X + 150, LIST_Y + 380, 60, 20).stroke({ color: COL_TAB_BORDER_ACTIVE, width: 1 });
    this._addText('Shortcuts', LIST_X + 156, LIST_Y + 384, COL_TEXT_WHITE, 10);
  }

  private _handleShortcutHelpClick(lx: number, ly: number): boolean {
    if (this._activeTab !== 8 || this._subCategory !== 0) return false;
    if (this._shortcutHelpVisible) {
      const x = Math.floor((CS_W - 260) / 2);
      const y = Math.floor((CS_H - 356) / 2);
      if (lx >= x + 130 && lx < x + 186 && ly >= y + 328 && ly < y + 348) {
        this._shortcutHelpVisible = false;
        return true;
      }
      return true; // modal swallows all clicks
    }
    if (lx >= LIST_X + 150 && lx < LIST_X + 210 && ly >= LIST_Y + 380 && ly < LIST_Y + 400) {
      this._shortcutHelpVisible = true;
      return true;
    }
    return false;
  }

  // ── Status message ──
  private _drawStatusMessage(): void {
    if (this._statusMessage) {
      this._g.rect(STATUS_X, STATUS_Y + STATUS_H + 4, STATUS_W, 20).fill({ color: 0x0A0E1A });
      this._addText(this._statusMessage, STATUS_X + 10, STATUS_Y + STATUS_H + 8, COL_TEXT_GREEN, 11);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Gift Dialog
  // ═══════════════════════════════════════════════════════════════════════════

  private _drawGiftDialog(): void {
    if (!this._giftItem) return;

    // Semi-transparent overlay
    this._g.rect(0, 0, CS_W, CS_H).fill({ color: 0x000000, alpha: 0.5 });

    // Dialog box centered — OG CUISendGifts (buttons at y139, Hide at x439)
    const dlgW = 473;
    const dlgH = 169;
    const dlgX = Math.floor((CS_W - dlgW) / 2);
    const dlgY = Math.floor((CS_H - dlgH) / 2);

    // Dialog background — use WZ if available
    if (this._bgGift) {
      this._drawWzSprite(this._bgGiftWide ?? this._bgGift, dlgX, dlgY);
    }

    // Title
    this._addText('Gift Item', dlgX + 160, dlgY + 12, COL_TEXT_GOLD, 14);

    // Item name and price
    this._addText(`Item: ${this._giftItem.name}`, dlgX + 20, dlgY + 30, COL_TEXT_WHITE, 11);
    const price = this._getSalePrice(this._giftItem);
    this._addText(`Price: ${price} NX`, dlgX + 20, dlgY + 44, COL_TEXT_GOLD, 11);

    // Receiver name field — OG edit id1000 at (84,52) 122x13
    this._addText('To:', dlgX + 26, dlgY + 53, COL_TEXT_WHITE, 10);
    const recvX = dlgX + 84;
    const recvY = dlgY + 52;
    this._g.rect(recvX, recvY, 122, 13).fill({ color: 0xFFFFFF });
    this._g.rect(recvX, recvY, 122, 13).stroke({ color: this._giftEditingField === 1 ? COL_TAB_BORDER_ACTIVE : COL_PLATE_BORDER, width: 1 });
    this._addText(this._giftReceiver + (this._giftEditingField === 1 ? '_' : ''), recvX + 3, recvY + 2, 0x111111, 9);

    // Message field — OG edits id1001/1002 at (26,76)/(26,92) 210x13
    this._g.rect(dlgX + 26, dlgY + 76, 210, 13).fill({ color: 0xFFFFFF });
    this._g.rect(dlgX + 26, dlgY + 76, 210, 13).stroke({ color: this._giftEditingField === 2 ? COL_TAB_BORDER_ACTIVE : COL_PLATE_BORDER, width: 1 });
    this._addText(this._giftMessage + (this._giftEditingField === 2 ? '_' : ''), dlgX + 29, dlgY + 78, 0x111111, 9);

    // Recipient list panel (buddy/guild mode) — OG list layer at (336,54),
    // "None" placeholder when empty
    if (this._giftState !== 0) {
      const names = this._giftState === 1 ? this.buddyNames : this.guildNames;
      this._g.rect(dlgX + 300, dlgY + 40, 150, 90).fill({ color: 0x10142A });
      this._g.rect(dlgX + 300, dlgY + 40, 150, 90).stroke({ color: COL_PLATE_BORDER, width: 1 });
      if (names.length === 0) {
        this._addText('None', dlgX + 337, dlgY + 56, COL_TEXT_DIM, 10);
      } else {
        for (let i = 0; i < names.length && i < 6; i++) {
          const ny = dlgY + 46 + i * 14;
          const sel = i === this._giftListSelected;
          if (sel) this._g.rect(dlgX + 302, ny - 2, 146, 13).fill({ color: COL_TAB_ACTIVE });
          this._addText(names[i], dlgX + 306, ny, sel ? COL_TEXT_GOLD : COL_TEXT_WHITE, 10);
        }
      }
    }

    // Button row y139 — OG ids: Guild(1004) x56, Buddy(1003) x110,
    // OK(168), Cancel(210), Hide(1005) x439 only in list modes
    const btnY = dlgY + 139;
    if (this._btGiftGuild) this._drawWzSprite(this._btGiftGuild, dlgX + 56, btnY);
    else {
      this._g.rect(dlgX + 56, btnY, 48, 18).fill({ color: COL_TAB_ACTIVE });
      this._addText('Guild', dlgX + 62, btnY + 4, COL_TEXT_WHITE, 9);
    }
    if (this._btGiftBuddy) this._drawWzSprite(this._btGiftBuddy, dlgX + 110, btnY);
    else {
      this._g.rect(dlgX + 110, btnY, 48, 18).fill({ color: COL_TAB_ACTIVE });
      this._addText('Buddy', dlgX + 116, btnY + 4, COL_TEXT_WHITE, 9);
    }
    if (this._btGiftHide && this._giftState !== 0) {
      this._drawWzSprite(this._btGiftHide, dlgX + 439, btnY);
    } else if (this._giftState !== 0) {
      this._g.rect(dlgX + 439, btnY, 28, 18).fill({ color: 0x3C1A1A });
      this._addText('X', dlgX + 450, btnY + 4, COL_TEXT_WHITE, 9);
    }
    const okX = dlgX + 168;
    this._g.rect(okX, btnY, 36, 18).fill({ color: COL_TAB_ACTIVE });
    this._g.rect(okX, btnY, 36, 18).stroke({ color: COL_TAB_BORDER_ACTIVE, width: 1 });
    this._addText('OK', okX + 11, btnY + 4, COL_TEXT_WHITE, 9);

    const cancelX = dlgX + 210;
    this._g.rect(cancelX, btnY, 48, 18).fill({ color: 0x3C1A1A });
    this._g.rect(cancelX, btnY, 48, 18).stroke({ color: 0x8B4444, width: 1 });
    this._addText('Cancel', cancelX + 7, btnY + 4, COL_TEXT_WHITE, 9);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Confirm Purchase Dialog (OG: CConfirmPurchaseDlg)
  // ═══════════════════════════════════════════════════════════════════════════

  private _drawConfirmBuy(): void {
    if (!this._confirmBuyItem) return;

    const commodity = this._confirmBuyItem;
    const price = this._getSalePrice(commodity);

    // Semi-transparent overlay
    this._g.rect(0, 0, CS_W, CS_H).fill({ color: 0x000000, alpha: 0.5 });

    // Dialog box centered
    const dlgW = 305;
    const dlgH = 157;
    const dlgX = Math.floor((CS_W - dlgW) / 2);
    const dlgY = Math.floor((CS_H - dlgH) / 2);

    if (this._confirmNotice) this._drawWzSprite(this._confirmNotice, dlgX, dlgY);

    // Title
    this._addText('Confirm Purchase', dlgX + 100, dlgY + 10, COL_TEXT_GOLD, 14);

    // Item name
    this._addText(`Item: ${commodity.name}`, dlgX + 20, dlgY + 40, COL_TEXT_WHITE, 11);

    // Price
    this._addText(`Price: ${price} NX`, dlgX + 20, dlgY + 58, COL_TEXT_GOLD, 11);

    // Separator line
    this._g.moveTo(dlgX + 20, dlgY + 76).lineTo(dlgX + dlgW - 20, dlgY + 76).stroke({ color: COL_SEPARATOR, width: 1 });

    // Payment type buttons
    const acceptsMaplePoint = commodity.limit !== 2;
    const payX = dlgX + 30;
    const payW = dlgW - 60;
    const payH = 15;
    const payStartY = dlgY + 58;
    const payStep = 15;

    const payLabels = ['NX Credit', 'Maple Point', 'Prepaid NX'];
    const payAvail = [
      price <= this._nxCredit,                                                // NX Credit
      acceptsMaplePoint && price <= this._maplePoints,                        // Maple Point
      price <= this._nxPrepaid,                                               // Prepaid NX
    ];
    const payBalances = [this._nxCredit, this._maplePoints, this._nxPrepaid];

    for (let i = 0; i < 3; i++) {
      const py = payStartY + i * payStep;
      const isSelected = i === this._confirmBuyPaymentType;
      const isAvail = payAvail[i];

      // Button background
      const bgColor = !isAvail ? 0x1A1010 : isSelected ? 0x1E3A2A : 0x16192C;
      const borderColor = !isAvail ? 0x3A2020 : isSelected ? 0x4A8A4A : COL_PLATE_BORDER;
      this._g.rect(payX, py, payW, payH).fill({ color: bgColor });
      this._g.rect(payX, py, payW, payH).stroke({ color: borderColor, width: isSelected ? 2 : 1 });

      // Radio indicator
      const radioX = payX + 6;
      const radioY = py + 5;
      this._g.circle(radioX, radioY, 4).stroke({ color: isAvail ? COL_TEXT_WHITE : 0x666666, width: 1 });
      if (isSelected) {
        this._g.circle(radioX, radioY, 2).fill({ color: isAvail ? COL_TEXT_GREEN : 0x666666 });
      }

      // Label
      const textColor = !isAvail ? 0x666666 : isSelected ? COL_TEXT_GREEN : COL_TEXT_WHITE;
      this._addText(payLabels[i], payX + 14, py + 2, textColor, 9);

      // Balance display on right side
      this._addText(`${payBalances[i]}`, payX + payW - 60, py + 2, isAvail ? COL_TEXT_DIM : 0x555555, 9);
    }

    // OK button
    const okX = dlgX + 40;
    const okY = dlgY + dlgH - 37;
    if (this._confirmOk) this._drawWzSprite(this._confirmOk, dlgX + 157, okY);

    // Cancel button
    if (this._confirmNo) this._drawWzSprite(this._confirmNo, dlgX + 207, okY);
  }

  // ── Name Change Dialog (OG: CUINameChangeDlg) ──
  private _drawNameChangeDialog(): void {
    const dlgW = 266; const dlgH = 124;
    const dlgX = (CS_W - dlgW) / 2; const dlgY = (CS_H - dlgH) / 2;
    if (this._bgNameChange) this._drawWzSprite(this._bgNameChange, dlgX, dlgY);
    this._addText('Name Change', dlgX + 100, dlgY + 10, COL_TEXT_GOLD, 14);
    this._addText('Enter new name:', dlgX + 20, dlgY + 40, COL_TEXT_WHITE, 11);
    // Input field
    this._g.rect(dlgX + 20, dlgY + 60, dlgW - 40, 24).fill({ color: 0x0A0E1A });
    this._g.rect(dlgX + 20, dlgY + 60, dlgW - 40, 24).stroke({ color: COL_SEPARATOR, width: 1 });
    this._addText(this._nameChangeNewName + '_', dlgX + 26, dlgY + 66, COL_TEXT_WHITE, 12);
    // OK/Cancel
    this._g.rect(dlgX + 40, dlgY + dlgH - 40, 100, 28).fill({ color: COL_TAB_ACTIVE });
    this._g.rect(dlgX + 40, dlgY + dlgH - 40, 100, 28).stroke({ color: COL_TAB_BORDER_ACTIVE, width: 1 });
    this._addText('OK', dlgX + 76, dlgY + dlgH - 33, COL_TEXT_WHITE, 12);
    this._g.rect(dlgX + dlgW - 140, dlgY + dlgH - 40, 100, 28).fill({ color: 0x3C1A1A });
    this._g.rect(dlgX + dlgW - 140, dlgY + dlgH - 40, 100, 28).stroke({ color: 0x8B4444, width: 1 });
    this._addText('Cancel', dlgX + dlgW - 116, dlgY + dlgH - 33, COL_TEXT_WHITE, 12);
  }

  // ── World Transfer Dialog (OG: CUIWorldTransferDlg) ──
  private _drawWorldTransferDialog(): void {
    const dlgW = this._worldTransferNames.length > 0 ? 406 : 209;
    const dlgH = this._worldTransferNames.length > 0 ? 424 : 101;
    const dlgX = (CS_W - dlgW) / 2; const dlgY = (CS_H - dlgH) / 2;
    const background = this._worldTransferNames.length > 0 ? this._bgTransferWorldNotice : this._bgTransferWorld;
    if (background) this._drawWzSprite(background, dlgX, dlgY);
    this._addText('World Transfer', dlgX + 90, dlgY + 10, COL_TEXT_GOLD, 14);
    this._addText('Select target world:', dlgX + 20, dlgY + 40, COL_TEXT_WHITE, 11);
    for (let i = 0; i < this._worldTransferNames.length; i++) {
      const wy = dlgY + 60 + i * 22;
      const isSelected = i === this._worldTransferSelected;
      this._g.rect(dlgX + 20, wy, dlgW - 40, 20).fill({ color: isSelected ? COL_TAB_ACTIVE : 0x0A0E1A });
      this._g.rect(dlgX + 20, wy, dlgW - 40, 20).stroke({ color: isSelected ? COL_TAB_BORDER_ACTIVE : COL_SEPARATOR, width: 1 });
      this._addText(this._worldTransferNames[i], dlgX + 30, wy + 4, isSelected ? COL_TEXT_GREEN : COL_TEXT_WHITE, 11);
    }
    this._g.rect(dlgX + 40, dlgY + dlgH - 40, 100, 28).fill({ color: COL_TAB_ACTIVE });
    this._g.rect(dlgX + 40, dlgY + dlgH - 40, 100, 28).stroke({ color: COL_TAB_BORDER_ACTIVE, width: 1 });
    this._addText('OK', dlgX + 76, dlgY + dlgH - 33, COL_TEXT_WHITE, 12);
    this._g.rect(dlgX + dlgW - 140, dlgY + dlgH - 40, 100, 28).fill({ color: 0x3C1A1A });
    this._g.rect(dlgX + dlgW - 140, dlgY + dlgH - 40, 100, 28).stroke({ color: 0x8B4444, width: 1 });
    this._addText('Cancel', dlgX + dlgW - 116, dlgY + dlgH - 33, COL_TEXT_WHITE, 12);
  }

  // ── Couple Name Dialog (OG: CUICoupleNameDlg) ──
  private _drawCoupleNameDialog(): void {
    const dlgW = 300; const dlgH = 160;
    const dlgX = (CS_W - dlgW) / 2; const dlgY = (CS_H - dlgH) / 2;
    this._g.rect(dlgX, dlgY, dlgW, dlgH).fill({ color: 0x10142A });
    this._g.rect(dlgX, dlgY, dlgW, dlgH).stroke({ color: COL_TAB_BORDER_ACTIVE, width: 2 });
    this._addText('Couple Ring', dlgX + 100, dlgY + 10, COL_TEXT_GOLD, 14);
    this._addText('Partner name:', dlgX + 20, dlgY + 40, COL_TEXT_WHITE, 11);
    this._g.rect(dlgX + 20, dlgY + 60, dlgW - 40, 24).fill({ color: 0x0A0E1A });
    this._g.rect(dlgX + 20, dlgY + 60, dlgW - 40, 24).stroke({ color: COL_SEPARATOR, width: 1 });
    this._addText(this._coupleNameValue + '_', dlgX + 26, dlgY + 66, COL_TEXT_WHITE, 12);
    this._g.rect(dlgX + 40, dlgY + dlgH - 40, 100, 28).fill({ color: COL_TAB_ACTIVE });
    this._g.rect(dlgX + 40, dlgY + dlgH - 40, 100, 28).stroke({ color: COL_TAB_BORDER_ACTIVE, width: 1 });
    this._addText('OK', dlgX + 76, dlgY + dlgH - 33, COL_TEXT_WHITE, 12);
    this._g.rect(dlgX + dlgW - 140, dlgY + dlgH - 40, 100, 28).fill({ color: 0x3C1A1A });
    this._g.rect(dlgX + dlgW - 140, dlgY + dlgH - 40, 100, 28).stroke({ color: 0x8B4444, width: 1 });
    this._addText('Cancel', dlgX + dlgW - 116, dlgY + dlgH - 33, COL_TEXT_WHITE, 12);
  }

  // ── Friend Name Dialog (OG: CUIFriendNameDlg) ──
  private _drawFriendNameDialog(): void {
    const dlgW = 300; const dlgH = 160;
    const dlgX = (CS_W - dlgW) / 2; const dlgY = (CS_H - dlgH) / 2;
    this._g.rect(dlgX, dlgY, dlgW, dlgH).fill({ color: 0x10142A });
    this._g.rect(dlgX, dlgY, dlgW, dlgH).stroke({ color: COL_TAB_BORDER_ACTIVE, width: 2 });
    this._addText('Friendship Ring', dlgX + 80, dlgY + 10, COL_TEXT_GOLD, 14);
    this._addText('Friend name:', dlgX + 20, dlgY + 40, COL_TEXT_WHITE, 11);
    this._g.rect(dlgX + 20, dlgY + 60, dlgW - 40, 24).fill({ color: 0x0A0E1A });
    this._g.rect(dlgX + 20, dlgY + 60, dlgW - 40, 24).stroke({ color: COL_SEPARATOR, width: 1 });
    this._addText(this._friendNameValue + '_', dlgX + 26, dlgY + 66, COL_TEXT_WHITE, 12);
    this._g.rect(dlgX + 40, dlgY + dlgH - 40, 100, 28).fill({ color: COL_TAB_ACTIVE });
    this._g.rect(dlgX + 40, dlgY + dlgH - 40, 100, 28).stroke({ color: COL_TAB_BORDER_ACTIVE, width: 1 });
    this._addText('OK', dlgX + 76, dlgY + dlgH - 33, COL_TEXT_WHITE, 12);
    this._g.rect(dlgX + dlgW - 140, dlgY + dlgH - 40, 100, 28).fill({ color: 0x3C1A1A });
    this._g.rect(dlgX + dlgW - 140, dlgY + dlgH - 40, 100, 28).stroke({ color: 0x8B4444, width: 1 });
    this._addText('Cancel', dlgX + dlgW - 116, dlgY + dlgH - 33, COL_TEXT_WHITE, 12);
  }

  // ── Equip Slot Extension Dialog (OG: body-part picker) ──
  private _drawEquipSlotExtDialog(): void {
    const dlgW = 300; const dlgH = 200;
    const dlgX = (CS_W - dlgW) / 2; const dlgY = (CS_H - dlgH) / 2;
    this._g.rect(dlgX, dlgY, dlgW, dlgH).fill({ color: 0x10142A });
    this._g.rect(dlgX, dlgY, dlgW, dlgH).stroke({ color: COL_TAB_BORDER_ACTIVE, width: 2 });
    this._addText('Equip Slot Extension', dlgX + 70, dlgY + 10, COL_TEXT_GOLD, 14);
    this._addText('Select equipment slot:', dlgX + 20, dlgY + 40, COL_TEXT_WHITE, 11);
    const parts = ['Hat', 'Face', 'Top', 'Bottom', 'Shoes', 'Weapon', 'Shield', 'Cape'];
    for (let i = 0; i < parts.length; i++) {
      const bx = dlgX + 20 + (i % 4) * 70;
      const by = dlgY + 60 + Math.floor(i / 4) * 28;
      const isSelected = i === this._equipSlotExtBodyPart;
      this._g.rect(bx, by, 65, 24).fill({ color: isSelected ? COL_TAB_ACTIVE : 0x0A0E1A });
      this._g.rect(bx, by, 65, 24).stroke({ color: isSelected ? COL_TAB_BORDER_ACTIVE : COL_SEPARATOR, width: 1 });
      this._addText(parts[i], bx + 8, by + 6, isSelected ? COL_TEXT_GREEN : COL_TEXT_WHITE, 10);
    }
    this._g.rect(dlgX + 40, dlgY + dlgH - 40, 100, 28).fill({ color: COL_TAB_ACTIVE });
    this._g.rect(dlgX + 40, dlgY + dlgH - 40, 100, 28).stroke({ color: COL_TAB_BORDER_ACTIVE, width: 1 });
    this._addText('OK', dlgX + 76, dlgY + dlgH - 33, COL_TEXT_WHITE, 12);
    this._g.rect(dlgX + dlgW - 140, dlgY + dlgH - 40, 100, 28).fill({ color: 0x3C1A1A });
    this._g.rect(dlgX + dlgW - 140, dlgY + dlgH - 40, 100, 28).stroke({ color: 0x8B4444, width: 1 });
    this._addText('Cancel', dlgX + dlgW - 116, dlgY + dlgH - 33, COL_TEXT_WHITE, 12);
  }

  /** OG CCashShop::OnChangedCategory @0x47E560 — category switch resets the
   *  sub-category to 0, page to 0, plate focus, and tears the OneADay window
   *  down; entering the virtual category 10 keeps the search results. */
  SetCategory(category: number): void {
    this._activeTab = category;
    this._setSubCategory(0);
    this._page = 0;
    this._selectedPlate = -1;
    if (category !== 10) this._searchResults = null;
  }

  private _setSubCategory(sub: number): void {
    this._subCategory = sub;
    // OG OnChangedCategorySub @0x47DBF0: cat1/sub2 opens the OneADay window,
    // anything else tears it down.
    this._oneADayActive = this._activeTab === 1 && sub === 2;
    this._page = 0;
    this._selectedPlate = -1;
  }

  /** OG CCashShop::GoTo @0x47E6F0 / CCSWnd_Best::GoToCommoditySN @0x4C6DC0 —
   *  jump to the tab + page that holds the given commodity SN and focus it. */
  GoToCommoditySN(sn: number): void {
    const comm = this._commodities.find(c => c.sn === sn);
    if (!comm) return;
    if (comm.category >= 1 && comm.category <= 8) {
      this.SetCategory(comm.category);
    } else {
      this._page = 0;
      this._selectedPlate = -1;
    }
    const inTab = this._getCurrentPageItems().findIndex(c => c.sn === sn);
    if (inTab >= 0) {
      this._page = Math.floor(inTab / PLATES_PER_PAGE);
      this._selectedPlate = inTab % PLATES_PER_PAGE;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Input handling
  // ═══════════════════════════════════════════════════════════════════════════

  /** OG CCashShop::OnSetWish @0x4837D0 — add SN to the first empty wishlist
   *  slot and send the full 10-slot list. */
  AddToWish(sn: number): void {
    const slot = this._wishlist.indexOf(0);
    if (slot < 0) { this._statusMessage = 'Wishlist is full.'; return; }
    if (this._wishlist.includes(sn)) { this._statusMessage = 'Already on your wishlist.'; return; }
    this._wishlist[slot] = sn;
    this.game?.session.send(GameSender.CashShopSetWish(this._wishlist.slice()));
    const item = this._commodities.find(c => c.sn === sn);
    this._statusMessage = `Wishlist: added ${item ? item.name : sn}`;
  }

  /** OG CCashShop::OnRemoveWish @0x483960 — clear the slot holding sn. */
  RemoveWish(sn: number): void {
    const slot = this._wishlist.indexOf(sn);
    if (slot < 0) return;
    this._wishlist[slot] = 0;
    this.game?.session.send(GameSender.CashShopSetWish(this._wishlist.slice()));
    this._statusMessage = 'Wishlist: item removed.';
  }

  /** Mouse wheel over the item list cycles pages (OG CCSWnd_List — there are
   *  no prev/next buttons in v95). Wheel down = next page, up = previous;
   *  clamped to the valid page range. */
  onMouseWheel(x: number, y: number, deltaY: number): void {
    const lx = x - this._root.x;
    if (this._oneADayActive) return;
    // OG CCSWnd_List::OnMouseWheel @0x4C6550 — modulo cycling, not clamping.
    if (lx < LIST_X || lx >= LIST_X + LIST_W || y < LIST_Y || y >= LIST_Y + LIST_H) return;
    const totalPages = this._getTotalPages();
    const dir = deltaY > 0 ? 1 : -1;
    this._page = ((this._page + dir) % totalPages + totalPages) % totalPages;
    this._selectedPlate = -1;
  }

  onKeyPress(key: string): void {
    // OG CCashShop::OnKey @0x47F7C0 — VK_CAPS(20) toggles user preview control
    if (key === 'CapsLock') {
      this._previewEnabled = !this._previewEnabled;
      return;
    }
    // OG OnSetWish @0x4837D0 / OnRemoveWish @0x483960 — W adds the selected
    // commodity to the first empty wishlist slot, Shift+W removes it.
    if (key === 'w' || key === 'W') {
      const selected = this._getCurrentPageItems()[this._page * PLATES_PER_PAGE + this._selectedPlate];
      if (selected) {
        if (key === 'W') this.RemoveWish(selected.sn);
        else this.AddToWish(selected.sn);
      }
      return;
    }
    // Yes/No modal (OG: CUtilDlg::YesNo) — Enter confirms, Escape cancels
    if (this._yesNoVisible) {
      this._yesNoVisible = false;
      const cb = this._yesNoCallback;
      this._yesNoCallback = null;
      if (key === 'Enter') cb?.();
      return;
    }
    if (this._shortcutHelpVisible) {
      if (key === 'Escape') this._shortcutHelpVisible = false;
      return;
    }
    if (this._couponVisible) {
      if (key === 'Escape') {
        this._couponVisible = false;
        this._couponValue = '';
      } else if (key === 'Backspace') {
        this._couponValue = this._couponValue.slice(0, -1);
      } else if (key === 'Enter') {
        if (this._couponValue.length > 0) this.game?.session.send(GameSender.CashShopUseCoupon(this._couponValue));
        this._couponVisible = false;
      } else if (key.length === 1 && this._couponValue.length < 30) {
        this._couponValue += key;
      }
      return;
    }
    // Gift dialog input mode — capture typing
    if (this._giftVisible) {
      if (key === 'Escape') {
        this._giftVisible = false;
        this._giftItem = null;
        this._giftEditingField = 0;
        return;
      }
      if (key === 'Tab') {
        this._giftEditingField = this._giftEditingField === 1 ? 2 : 1;
        return;
      }
      if (key === 'Enter') {
        this._executeGift();
        return;
      }
      if (key === 'Backspace') {
        if (this._giftEditingField === 1) {
          this._giftReceiver = this._giftReceiver.slice(0, -1);
        } else if (this._giftEditingField === 2) {
          this._giftMessage = this._giftMessage.slice(0, -1);
        }
        return;
      }
      if (key.length === 1 && this._giftEditingField !== 0) {
        if (this._giftEditingField === 1 && this._giftReceiver.length < 12) {
          this._giftReceiver += key;
        } else if (this._giftEditingField === 2 && this._giftMessage.length < 50) {
          this._giftMessage += key;
        }
      }
      return;
    }

    // Confirm buy dialog input — Escape dismisses, Enter confirms, Tab/Arrow cycle payment
    if (this._confirmBuyVisible) {
      if (key === 'Escape') {
        this._confirmBuyVisible = false;
        this._confirmBuyItem = null;
        return;
      }
      if (key === 'Enter') {
        this._executeBuy();
        return;
      }
      if (key === 'Tab' || key === 'ArrowDown') {
        // Skip unavailable payment types
        const comm = this._confirmBuyItem;
        if (comm) {
          const acceptsMaplePoint = comm.limit !== 2;
          const price = this._getSalePrice(comm);
          const payAvail = [
            price <= this._nxCredit,
            acceptsMaplePoint && price <= this._maplePoints,
            price <= this._nxPrepaid,
          ];
          let next = (this._confirmBuyPaymentType + 1) % 3;
          for (let tries = 0; tries < 3; tries++) {
            if (payAvail[next]) { this._confirmBuyPaymentType = next; break; }
            next = (next + 1) % 3;
          }
        } else {
          this._confirmBuyPaymentType = (this._confirmBuyPaymentType + 1) % 3;
        }
        return;
      }
      if (key === 'ArrowUp') {
        const comm = this._confirmBuyItem;
        if (comm) {
          const acceptsMaplePoint = comm.limit !== 2;
          const price = this._getSalePrice(comm);
          const payAvail = [
            price <= this._nxCredit,
            acceptsMaplePoint && price <= this._maplePoints,
            price <= this._nxPrepaid,
          ];
          let prev = (this._confirmBuyPaymentType + 2) % 3;
          for (let tries = 0; tries < 3; tries++) {
            if (payAvail[prev]) { this._confirmBuyPaymentType = prev; break; }
            prev = (prev + 2) % 3;
          }
        } else {
          this._confirmBuyPaymentType = (this._confirmBuyPaymentType + 2) % 3;
        }
        return;
      }
      return;
    }

    // Active dialog input handling
    if (this._activeDialog !== 'none') {
      if (key === 'Escape') {
        this._activeDialog = 'none';
        this._buyPending = false;
        return;
      }
      if (key === 'Enter') {
        switch (this._activeDialog) {
          case 'nameChange': this._confirmNameChange(); break;
          case 'worldTransfer': this._confirmWorldTransfer(); break;
          case 'coupleName': this._confirmCoupleName(); break;
          case 'friendName': this._confirmFriendName(); break;
          case 'equipSlotExt': this._confirmEquipSlotExt(); break;
        }
        return;
      }
      if (key === 'Tab' && this._activeDialog === 'worldTransfer') {
        this._worldTransferSelected = (this._worldTransferSelected + 1) % this._worldTransferNames.length;
        return;
      }
      if (key === 'Tab' && this._activeDialog === 'equipSlotExt') {
        this._equipSlotExtBodyPart = (this._equipSlotExtBodyPart + 1) % 8;
        return;
      }
      if (key === 'Backspace') {
        if (this._activeDialog === 'nameChange') this._nameChangeNewName = this._nameChangeNewName.slice(0, -1);
        if (this._activeDialog === 'coupleName') this._coupleNameValue = this._coupleNameValue.slice(0, -1);
        if (this._activeDialog === 'friendName') this._friendNameValue = this._friendNameValue.slice(0, -1);
        return;
      }
      if (key.length === 1) {
        if (this._activeDialog === 'nameChange' && this._nameChangeNewName.length < 12) this._nameChangeNewName += key;
        if (this._activeDialog === 'coupleName' && this._coupleNameValue.length < 12) this._coupleNameValue += key;
        if (this._activeDialog === 'friendName' && this._friendNameValue.length < 12) this._friendNameValue += key;
      }
      return;
    }

    // Search input mode — capture all typing
    if (this._searchActive) {
      if (key === 'Escape') {
        this._searchActive = false;
        this._searchQuery = '';
        this.SetCategory(1); // leave the results view
        return;
      }
      if (key === 'Enter') {
        // Execute search — filter commodities by name + price band, then show
        // the results as OG's virtual category 10.
        this._executeSearch();
        return;
      }
      if (key === 'Backspace') {
        this._searchQuery = this._searchQuery.slice(0, -1);
        return;
      }
      if (key.length === 1 && key !== '/' && this._searchQuery.length < 20) {
        this._searchQuery += key;
      }
      return;
    }

    if (key === 'Escape') {
      // OG OnKeyRet: in plate/button focus mode Esc backs out instead of exiting
      if (this._buttonFocus >= 0) { this._buttonFocus = -1; return; }
      this._exit();
      return;
    }
    // OG: CCSWnd_Tab OnKeyRet — keys 1-9 switch to categories 1-9
    const num = parseInt(key);
    if (num >= 1 && num <= 9) {
      if (this._activeTab !== num) this.SetCategory(num);
      return;
    }
    // OG CCSWnd_List::OnKeyRet — PageUp/PageDown cycle pages (modulo)
    const totalPages = this._getTotalPages();
    if (key === 'PageUp') { this._page = ((this._page - 1) % totalPages + totalPages) % totalPages; this._selectedPlate = -1; return; }
    if (key === 'PageDown') { this._page = (this._page + 1) % totalPages; this._selectedPlate = -1; return; }

    // OG CCSWnd_List::OnKeyRet @0x4C9460 — plate-grid keyboard navigation:
    // arrows move focus on the 2-column grid, Enter wears the focused item
    // and enters button-focus mode (Left/Right cycles Buy→Gift→Wish).
    if (!this._oneADayActive) {
      const pageItems = this._getCurrentPageItems();
      const count = Math.min(PLATES_PER_PAGE, pageItems.length - this._page * PLATES_PER_PAGE);
      if (count > 0) {
        if (this._buttonFocus >= 0) {
          const item = this._focusedPlate >= 0 ? pageItems[this._page * PLATES_PER_PAGE + this._focusedPlate] : null;
          const btns = item ? this._plateButtons(item) : { buy: false, gift: false, wish: false };
          if (key === 'Escape') { this._buttonFocus = -1; return; }
          if (key === 'ArrowLeft') { this._buttonFocus = (this._buttonFocus + 2) % 3; return; }
          if (key === 'ArrowRight') { this._buttonFocus = (this._buttonFocus + 1) % 3; return; }
          if (key === 'Enter' && item) {
            if (this._buttonFocus === 0 && btns.buy) this._buyItem(item);
            else if (this._buttonFocus === 1 && btns.gift) this._onGiftClick(item);
            else if (this._buttonFocus === 2 && btns.wish) {
              if (this._wishlist.includes(item.sn)) this.RemoveWish(item.sn);
              else this.AddToWish(item.sn);
            }
            return;
          }
        } else {
          let f = this._focusedPlate;
          switch (key) {
            case 'ArrowLeft':
              f = f % 2 !== 0 ? f - 1 : f + 1;
              if (f >= count) f = count - 1;
              break;
            case 'ArrowRight':
              if (f === count - 1) f = 2 * Math.floor(f / 2);
              else f = f % 2 !== 0 ? f - 1 : f + 1;
              break;
            case 'ArrowUp':
              f -= 2;
              if (f < 0) f += 2 * Math.floor(count / 2);
              if (f >= count) f -= 2;
              break;
            case 'ArrowDown':
              f = count - f > 2 ? f + 2 : f % 2;
              break;
            case 'Enter':
              if (f >= 0 && f < count) {
                this.WearCommodity(pageItems[this._page * PLATES_PER_PAGE + f]);
                this._buttonFocus = 0;
              }
              return;
            default:
              return;
          }
          if (f !== this._focusedPlate && f >= 0 && f < count) {
            this._focusedPlate = f;
            this._selectedPlate = -1;
          }
          return;
        }
      }
    }
    if (key === 'ArrowLeft' && this._page > 0) { this._page--; this._selectedPlate = -1; }
    if (key === 'ArrowRight') {
      const maxP = this._getTotalPages() - 1;
      if (this._page < maxP) { this._page++; this._selectedPlate = -1; }
    }

    // Keyboard focus navigation — Tab/Shift+Tab cycles focused plate
    if (key === 'Tab') {
      const items = this._searchResults ?? this._getCurrentPageItems();
      const maxIdx = Math.min(PLATES_PER_PAGE, items.length - this._page * PLATES_PER_PAGE);
      if (maxIdx > 0) {
        this._focusedPlate = this._focusedPlate < 0 ? 0 : (this._focusedPlate + 1) % maxIdx;
        this._selectedPlate = this._focusedPlate;
      }
      return;
    }
    // Enter on focused plate selects it
    if (key === 'Enter' && this._focusedPlate >= 0) {
      const items = this._searchResults ?? this._getCurrentPageItems();
      const absIdx = this._page * PLATES_PER_PAGE + this._focusedPlate;
      if (absIdx < items.length) {
        this._selectedPlate = this._focusedPlate;
      }
    }
  }

  onMouseMove(x: number, y: number): void {
    const lx = x - this._root.x;
    const ly = y;
    this._inventoryScrollbar?.handleMouseMove(lx - INV_X, ly - INV_Y - 160);
    this._lockerScrollbar?.handleMouseMove(lx - this._getLockerScrollbarX(), ly - 229);

    // Track hover state for buttons (OG: mouseOver state)
    this._hoveredBtn = null;

    // Status bar buttons
    const btnY = STATUS_Y + 20;
    if (ly >= STATUS_Y && ly < STATUS_Y + 49) {
      if (lx >= STATUS_X + 248 && lx < STATUS_X + 289) this._hoveredBtn = 'charge';
      else if (lx >= STATUS_X + 289 && lx < STATUS_X + 330) this._hoveredBtn = 'check';
      else if (lx >= STATUS_X + 330 && lx < STATUS_X + 371) this._hoveredBtn = 'coupon';
      else if (lx >= STATUS_X + 378 && lx < STATUS_X + 418) this._hoveredBtn = 'exit';
    }

    // Inventory vertical tab hover
    const invTabNames = ['Equip', 'Use', 'Setup', 'Etc', 'Cash'];
    const invTabH = Math.floor(INV_TAB_H / invTabNames.length);
    for (let i = 0; i < invTabNames.length; i++) {
      const ty = INV_Y + INV_TAB_Y + i * invTabH;
      if (lx >= INV_X + INV_TAB_X && lx < INV_X + INV_TAB_X + INV_TAB_W && ly >= ty && ly < ty + invTabH) {
        this._hoveredBtn = `invTab_${i}`;
        break;
      }
    }

    // Buy/Gift/Wish buttons on plates (OG: CCtrlButton mouseOver states)
    if (!this._oneADayActive && !this._shortcutHelpVisible) {
      const items = this._getCurrentPageItems();
      const offset = this._page * PLATES_PER_PAGE;
      for (let row = 0; row < PLATE_ROWS; row++) {
        for (let col = 0; col < PLATE_COLS; col++) {
          const plateIdx = row * PLATE_COLS + col;
          const absIdx = offset + plateIdx;
          if (absIdx >= items.length) continue;
          const px = LIST_X + col * PLATE_COL_W;
          const py = LIST_Y + row * PLATE_ROW_H + 2;
          const bx = px + PLATE_W - 40;
          // Same rects as the click handler: wish y0..20, gift y24..48, buy y50+
          if (lx >= bx && lx < bx + 40) {
            if (ly >= py + 50 && ly < py + PLATE_H) this._hoveredBtn = `buy_${plateIdx}`;
            else if (ly >= py + 24 && ly < py + 48) this._hoveredBtn = `gift_${plateIdx}`;
            else if (ly >= py && ly < py + 20) this._hoveredBtn = `wish_${plateIdx}`;
          }
        }
      }
    }

    // Avatar control buttons (OG ids 1000-1002, y=237 row)
    if (ly >= CHAR_Y + 237 && ly < CHAR_Y + 256) {
      if (lx >= CHAR_X + 17 && lx < CHAR_X + 100) this._hoveredBtn = 'btBuyAvatar';
      else if (lx >= CHAR_X + 101 && lx < CHAR_X + 184) this._hoveredBtn = 'btDefaultAvatar';
      else if (lx >= CHAR_X + 187 && lx < CHAR_X + 242) this._hoveredBtn = 'btTakeoffAvatar';
    }

    // Search overlay Find/Cancel
    if (this._searchActive) {
      const oY = SEARCH_Y + SEARCH_H + 4;
      if (ly >= oY + 20 && ly < oY + 36) {
        if (lx >= SEARCH_X - 6 && lx < SEARCH_X + 34) this._hoveredBtn = 'searchFind';
        else if (lx >= SEARCH_X + 38 && lx < SEARCH_X + 78) this._hoveredBtn = 'searchCancel';
      }
    }
  }

  onMouseButton(x: number, y: number, down: boolean, _button: MouseButton): void {
    const lx = x - this._root.x;
    const ly = y;
    if (!down) {
      this._inventoryScrollbar?.handleMouseButton(lx - INV_X, ly - INV_Y - 160, false);
      this._lockerScrollbar?.handleMouseButton(lx - this._getLockerScrollbarX(), ly - 229, false);
      return;
    }

    if (this._couponVisible && this._handleCouponClick(lx, ly)) return;
    if (this._yesNoVisible && this._handleYesNoClick(lx, ly)) return;
    // Shortcut-help button / modal (OG id 4000, category 8 sub 0 only)
    if (this._handleShortcutHelpClick(lx, ly)) return;
    // Best panel — OG CCSWnd_Best::OnMouseButton: clicking an entry jumps to it
    if (lx >= BEST_X && lx < BEST_X + BEST_W && ly >= BEST_Y && ly < BEST_Y + BEST_H) {
      const best = this._bestItems[Math.floor((ly - BEST_Y) / BEST_STEP)];
      if (best) { this.GoToCommoditySN(best.sn); return; }
    }
    // Locker cells — OG CCSWnd_Locker::OnMouseButton: clicking selects the
    // cell (rebate goes through the BtRebate button below).
    if (lx >= LOCKER_X && lx < LOCKER_X + LOCKER_W && ly >= LOCKER_Y && ly < LOCKER_Y + LOCKER_H) {
      const col = Math.floor((lx - (LOCKER_X + 21)) / LOCKER_COL_STEP);
      const row = Math.floor((ly - (LOCKER_Y + 30)) / LOCKER_COL_STEP);
      if (col >= 0 && col < LOCKER_COLS && row >= 0 && row < LOCKER_ROWS) {
        const idx = this._lockerScroll * LOCKER_COLS + row * LOCKER_COLS + col;
        this._selectedLockerCell = idx;
      }
    }
    if (this._oneADayActive && this._handleOneADayClick(lx, ly)) return;
    if (this._inventoryScrollbar?.handleMouseButton(lx - INV_X, ly - INV_Y - 160, down)) return;
    if (this._lockerScrollbar?.handleMouseButton(lx - this._getLockerScrollbarX(), ly - 229, down)) return;

    if (ly >= STATUS_Y && ly < STATUS_Y + 49) {
      if (lx >= STATUS_X + 248 && lx < STATUS_X + 289) {
        this._statusMessage = 'Cash charge opened.';
        return;
      }
      if (lx >= STATUS_X + 289 && lx < STATUS_X + 330) {
        const items = this._getCurrentPageItems();
        const selected = this._selectedPlate >= 0 ? items[this._page * PLATES_PER_PAGE + this._selectedPlate] : undefined;
        if (selected) this.game?.session.send(GameSender.CashShopPurchaseRecord(selected.sn));
        return;
      }
      if (lx >= STATUS_X + 330 && lx < STATUS_X + 371) {
        this._couponVisible = true;
        this._couponValue = '';
        return;
      }
      if (lx >= STATUS_X + 378 && lx < STATUS_X + 418) {
        this._exit();
        return;
      }
    }

    // Gift dialog click handling
    if (this._giftVisible) {
      const dlgW = 473;
      const dlgH = 169;
      const dlgX = Math.floor((CS_W - dlgW) / 2);
      const dlgY = Math.floor((CS_H - dlgH) / 2);

      // Click outside dialog → dismiss
      if (lx < dlgX || lx >= dlgX + dlgW || ly < dlgY || ly >= dlgY + dlgH) {
        this._giftVisible = false;
        this._giftItem = null;
        this._giftEditingField = 0;
        return;
      }

      // Receiver field click — OG edit at (84,52) 122x13
      const recvX = dlgX + 84;
      const recvY = dlgY + 52;
      if (lx >= recvX && lx < recvX + 122 && ly >= recvY && ly < recvY + 13) {
        this._giftEditingField = 1;
        return;
      }

      // Message field click — OG edit at (26,76) 210x13
      const msgX = dlgX + 26;
      const msgY = dlgY + 76;
      if (lx >= msgX && lx < msgX + 210 && ly >= msgY && ly < msgY + 13) {
        this._giftEditingField = 2;
        return;
      }

      // Recipient list clicks (buddy/guild mode)
      if (this._giftState !== 0) {
        const names = this._giftState === 1 ? this.buddyNames : this.guildNames;
        for (let i = 0; i < names.length && i < 6; i++) {
          const ny = dlgY + 46 + i * 14;
          if (lx >= dlgX + 300 && lx < dlgX + 450 && ly >= ny - 2 && ly < ny + 11) {
            this._giftListSelected = i;
            this._giftReceiver = names[i];
            return;
          }
        }
      }

      // Button row y139 — Guild(56) Buddy(110) OK(168) Cancel(210) Hide(439)
      const btnY = dlgY + 139;
      if (ly >= btnY && ly < btnY + 18) {
        if (lx >= dlgX + 56 && lx < dlgX + 104) { this._setGiftState(2); return; }
        if (lx >= dlgX + 110 && lx < dlgX + 158) { this._setGiftState(1); return; }
        if (lx >= dlgX + 168 && lx < dlgX + 204) { this._executeGift(); return; }
        if (lx >= dlgX + 210 && lx < dlgX + 258) {
          this._giftVisible = false;
          this._giftItem = null;
          this._giftEditingField = 0;
          return;
        }
        if (this._giftState !== 0 && lx >= dlgX + 439 && lx < dlgX + 467) {
          this._setGiftState(0); // OG BtHide id1005 → back to manual entry
          return;
        }
      }

      // Click elsewhere in dialog → consume (don't propagate)
      return;
    }

    // Confirm buy dialog click handling
    if (this._confirmBuyVisible && this._confirmBuyItem) {
      const dlgW = 305;
      const dlgH = 157;
      const dlgX = Math.floor((CS_W - dlgW) / 2);
      const dlgY = Math.floor((CS_H - dlgH) / 2);

      // Click outside dialog → dismiss
      if (lx < dlgX || lx >= dlgX + dlgW || ly < dlgY || ly >= dlgY + dlgH) {
        this._confirmBuyVisible = false;
        this._confirmBuyItem = null;
        return;
      }

      // Payment type buttons (3 buttons stacked, each 280×24, starting at dlgY+84)
      const payX = dlgX + 30;
      const payW = dlgW - 60;
      const payH = 15;
      const payStartY = dlgY + 58;
      const payStep = 15;
      const comm = this._confirmBuyItem;
      const price = comm ? this._getSalePrice(comm) : 0;
      const payAvail = [
        this._nxCredit >= price,
        this._maplePoints >= price && (comm?.onSaleFlag ?? 0) !== 2,
        this._nxPrepaid >= price,
      ];
      for (let i = 0; i < 3; i++) {
        const py = payStartY + i * payStep;
        if (lx >= payX && lx < payX + payW && ly >= py && ly < py + payH) {
          if (!payAvail[i]) return; // Don't select unavailable types
          this._confirmBuyPaymentType = i;
          return;
        }
      }

      // OK button (bottom-left area)
      const okX = dlgX + 157;
      const okY = dlgY + dlgH - 37;
      if (lx >= okX && lx < okX + 40 && ly >= okY && ly < okY + 16) {
        this._executeBuy();
        return;
      }

      // Cancel button (bottom-right area)
      const cancelX = dlgX + 207;
      if (lx >= cancelX && lx < cancelX + 57 && ly >= okY && ly < okY + 16) {
        this._confirmBuyVisible = false;
        this._confirmBuyItem = null;
        return;
      }

      // Click elsewhere in dialog → consume
      return;
    }

    if (this._activeDialog !== 'none' && this._handleActiveDialogClick(lx, ly)) return;

    // Exit button (OG: CCSWnd_Status nId=1003, at y offset +15)
    const exitX = STATUS_X + 378;
    const exitY = STATUS_Y + 15;
    if (lx >= exitX && lx < exitX + 40 && ly >= exitY && ly < exitY + 16) {
      this._exit();
      return;
    }

    // Search button click
    if (lx >= SEARCH_X && lx < SEARCH_X + SEARCH_W && ly >= SEARCH_Y && ly < SEARCH_Y + SEARCH_H) {
      this._searchActive = !this._searchActive;
      if (!this._searchActive) {
        this._searchQuery = '';
        this._searchResults = null;
      }
      return;
    }

    // Search overlay button clicks
    if (this._searchActive) {
      const overlayY = SEARCH_Y + SEARCH_H + 4;

      // Find button click
      if (lx >= SEARCH_X - 6 && lx < SEARCH_X + 34 && ly >= overlayY + 20 && ly < overlayY + 36) {
        this._executeSearch();
        return;
      }

      // Price-band selector arrows
      if (ly >= overlayY + 38 && ly < overlayY + 52) {
        if (lx >= SEARCH_X + 90 && lx < SEARCH_X + 101) { this._cycleSearchBand(-1); return; }
        if (lx >= SEARCH_X + 101 && lx < SEARCH_X + 112) { this._cycleSearchBand(1); return; }
      }

      // Cancel button click
      if (lx >= SEARCH_X + 38 && lx < SEARCH_X + 78 && ly >= overlayY + 20 && ly < overlayY + 36) {
        this._searchActive = false;
        this._searchQuery = '';
        this.SetCategory(1); // leave the results view
        return;
      }

      // Click outside search overlay dismisses
      if (lx < SEARCH_X - 10 || lx >= SEARCH_X + SEARCH_W + 10 || ly < overlayY - 4 || ly >= overlayY + 76) {
        this._searchActive = false;
        this._searchQuery = '';
        this.SetCategory(1); // leave the results view
      }
    }

    // CCSWnd_Char avatar controls (OG ids 1000-1002).
    if (ly >= CHAR_Y + 237 && ly < CHAR_Y + 256) {
      if (lx >= CHAR_X + 17 && lx < CHAR_X + 100) {
        this._onBuyAvatar();
        return;
      }
      if (lx >= CHAR_X + 101 && lx < CHAR_X + 184) {
        this._onDefaultAvatar();
        return;
      }
      if (lx >= CHAR_X + 187 && lx < CHAR_X + 242) {
        this._onTakeOffAvatar();
        return;
      }
    }
    // OG OnMouseButton@CCSWnd_Char — clicking the char window toggles preview
    if (lx >= CHAR_X && lx < CHAR_X + CHAR_W && ly >= CHAR_Y && ly < CHAR_Y + 237) {
      this._previewEnabled = !this._previewEnabled;
      return;
    }

    // Tab clicks — the 9 strip slots map to categories 1..9
    // (OG CCSWnd_Tab::GetTabIndex → OnChangedCategory(idx)).
    const tabItemW = Math.floor(TAB_W / TAB_COUNT);
    for (let i = 0; i < TAB_COUNT; i++) {
      const tx = TAB_X + i * tabItemW;
      if (lx >= tx && lx < tx + tabItemW && ly >= TAB_Y && ly < TAB_Y + TAB_H) {
        const cat = i + 1;
        if (this._activeTab !== cat) this.SetCategory(cat);
        return;
      }
    }

    // Sub-category strip inside the tab canvas (OG ChangeSubCategory @0x4C6530)
    const subs = this._subRows();
    if (subs.length > 0 && ly >= TAB_Y + 59 && ly < TAB_Y + 73) {
      const step = Math.floor(485 / subs.length);
      if (lx >= TAB_X + 8 && lx < TAB_X + 8 + 485) {
        const i = Math.min(subs.length - 1, Math.floor((lx - (TAB_X + 8)) / step));
        if (this._subCategory !== subs[i].categorySub) this._setSubCategory(subs[i].categorySub);
        return;
      }
    }

    // Plate clicks (OG: CCSWnd_List::OnMouseButton)
    for (let row = 0; row < PLATE_ROWS; row++) {
      for (let col = 0; col < PLATE_COLS; col++) {
        const px = LIST_X + col * PLATE_COL_W;
        const py = LIST_Y + row * PLATE_ROW_H + 2;
        if (lx >= px && lx < px + PLATE_W && ly >= py && ly < py + PLATE_H) {
          const plateIdx = row * PLATE_COLS + col;
          const items = this._searchResults ?? this._getCurrentPageItems();
          const absIdx = this._page * PLATES_PER_PAGE + plateIdx;
          if (absIdx < items.length) {
            this._selectedPlate = plateIdx;
            // OG: selecting a plate tries the commodity on the preview avatar
            this.WearCommodity(items[absIdx]);
            const btns = this._plateButtons(items[absIdx]);
            // Wish toggle click (OG third button, id 3i+2002 — top-right of plate)
            if (lx >= px + PLATE_W - 40 && lx < px + PLATE_W && ly >= py && ly < py + 20) {
              if (btns.wish) {
                if (this._wishlist.includes(items[absIdx].sn)) {
                  this.RemoveWish(items[absIdx].sn);
                } else {
                  this.AddToWish(items[absIdx].sn);
                }
              } else {
                this._statusMessage = 'This item cannot be added to your wish list.';
              }
            }
            // Buy button click (bottom-right of plate) — disabled plates ignore
            else if (lx >= px + PLATE_W - 40 && ly >= py + 50) {
              if (btns.buy) {
                this._buyItem(items[absIdx]);
              } else {
                this._statusMessage = 'This item cannot be purchased.';
              }
            }
            // Gift button click (top-right of plate)
            else if (lx >= px + PLATE_W - 40 && ly >= py + 24 && ly < py + 46) {
              if (btns.gift) {
                this._onGiftClick(items[absIdx]);
              } else {
                this._statusMessage = 'This item cannot be gifted.';
              }
            }
          }
          return;
        }
      }
    }

    // Best item clicks (OG: CCSWnd_Best::OnMouseButton)
    for (let i = 0; i < 5; i++) {
      const by = BEST_Y + i * BEST_STEP;
      if (lx >= BEST_X && lx < BEST_X + BEST_W && ly >= by && ly < by + 64) {
        if (i < this._bestItems.length) {
          const best = this._bestItems[i];
          const comm = this._commodities.find(c => c.sn === best.sn);
          if (comm) {
            // Find which tab this item's category belongs to
            const cat = comm.category;
            this.SetCategory(cat >= 1 && cat <= 8 ? cat : 1);
            // Find the item's position in the grid
            const pageItems = this._getCurrentPageItems();
            const idx = pageItems.findIndex(c => c.sn === comm.sn);
            if (idx >= 0) {
              this._page = Math.floor(idx / PLATES_PER_PAGE);
              this._selectedPlate = idx % PLATES_PER_PAGE;
            }
          }
        }
        return;
      }
    }

    // Locker cell clicks (OG: CCSWnd_Locker — MoveLtoS)
    for (let row = 0; row < LOCKER_ROWS; row++) {
      for (let col = 0; col < LOCKER_COLS; col++) {
         const cx = LOCKER_X + 21 + col * LOCKER_COL_STEP;
         const cy = LOCKER_Y + 30 + row * LOCKER_COL_STEP;
        if (lx >= cx && lx < cx + LOCKER_CELL && ly >= cy && ly < cy + LOCKER_CELL) {
          const idx = this._lockerScroll * LOCKER_COLS + row * LOCKER_COLS + col;
          this._selectedLockerCell = idx;
          if (idx < this._lockerItems.length) {
            const item = this._lockerItems[idx];
            // OG: SendMoveLtoSRequest (sub-action 6)
            this.game?.session.send(GameSender.CashShopMoveLtoS(item.sn));
            this._statusMessage = `Moving ${item.name} to inventory...`;
          }
          return;
        }
      }
    }

    // Locker scroll clicks
    const lockerH = LOCKER_ROWS * LOCKER_COL_STEP;
    const scrollArrowY = LOCKER_Y + LOCKER_H - 16;
    if (lx >= LOCKER_X && lx < LOCKER_X + LOCKER_COLS * LOCKER_COL_STEP) {
      if (ly >= scrollArrowY && ly < scrollArrowY + 14) {
        if (lx < LOCKER_X + LOCKER_COLS * LOCKER_COL_STEP / 2 && this._lockerScroll > 0) {
          this._lockerScroll--;
        } else {
           const maxScroll = Math.max(0, Math.ceil(Math.max(0, this._lockerItems.length - LOCKER_COLS * LOCKER_ROWS) / LOCKER_COLS));
          if (this._lockerScroll < maxScroll) this._lockerScroll++;
        }
        return;
      }
    }

    // Inventory cell clicks
    const expansionButtons = [
      [176, 27, 1],
      [176, 54, 2],
      [176, 81, 3],
      [176, 108, 4],
    ] as const;
    for (const [bx, by, invType] of expansionButtons) {
      if (lx >= INV_X + bx && lx < INV_X + bx + 64 && ly >= INV_Y + by && ly < INV_Y + by + 22) {
        this.game?.session.send(GameSender.CashShopIncSlotCount(invType));
        return;
      }
    }
    if (lx >= INV_X + 176 && lx < INV_X + 240 && ly >= INV_Y + 135 && ly < INV_Y + 157) {
      this.game?.session.send(GameSender.CashShopIncTrunkCount());
      return;
    }

    if (lx >= LOCKER_X + 160 && lx < LOCKER_X + 246 && ly >= LOCKER_Y + 82 && ly < LOCKER_Y + 101) {
      // OG: rebate the SELECTED locker item (falls back to the first visible)
      const idx = this._selectedLockerCell >= 0
        ? this._selectedLockerCell
        : this._lockerScroll * LOCKER_COLS;
      const item = this._lockerItems[idx];
      if (item) {
        this.game?.session.send(GameSender.CashShopRebate(item.sn));
        this._statusMessage = `Rebate requested for ${item.name}.`;
      }
      return;
    }

    // Inventory cell clicks
    for (let row = 0; row < INV_ROWS; row++) {
      for (let col = 0; col < INV_COLS; col++) {
         const cx = INV_X + 22 + col * INV_COL_STEP;
         const cy = INV_Y + 55 + row * INV_COL_STEP;
        if (lx >= cx && lx < cx + INV_CELL && ly >= cy && ly < cy + INV_CELL) {
          const cell = row * INV_COLS + col;
          const items = this._getInvItems();
          const item = items[this._invFirstPosition + cell];
          this._selectedInvCell = cell;
          const now = Date.now();
          const isDoubleClick = cell === this._lastInventoryClickCell && now - this._lastInventoryClickAt < 400;
          this._lastInventoryClickCell = cell;
          this._lastInventoryClickAt = now;
          if (isDoubleClick && item?.cashSN && this._invItemTI === 4) {
            this.game?.session.send(GameSender.CashShopMoveStoL(item.cashSN));
            this._statusMessage = 'Moving cash item to locker...';
          }
          return;
        }
      }
    }

    // Inventory vertical tab clicks (OG: CCSWnd_Inventory tab control, args 4,17,28,156)
    const invTabNames = ['Equip', 'Use', 'Setup', 'Etc', 'Cash'];
    const invTabH = Math.floor(INV_TAB_H / invTabNames.length);
    for (let i = 0; i < invTabNames.length; i++) {
      const ty = INV_Y + INV_TAB_Y + i * invTabH;
      if (lx >= INV_X + INV_TAB_X && lx < INV_X + INV_TAB_X + INV_TAB_W && ly >= ty && ly < ty + invTabH) {
        this._invItemTI = i;
        this._invFirstPosition = 0;
        this._selectedInvCell = -1;
        return;
      }
    }
  }

  private _handleActiveDialogClick(lx: number, ly: number): boolean {
    let dlgW = 300;
    let dlgH = 160;
    if (this._activeDialog === 'nameChange') { dlgW = 266; dlgH = 124; }
    else if (this._activeDialog === 'worldTransfer') {
      dlgW = this._worldTransferNames.length > 0 ? 406 : 209;
      dlgH = this._worldTransferNames.length > 0 ? 424 : 101;
    } else if (this._activeDialog === 'equipSlotExt') dlgH = 200;

    const dlgX = Math.floor((CS_W - dlgW) / 2);
    const dlgY = Math.floor((CS_H - dlgH) / 2);
    if (lx < dlgX || lx >= dlgX + dlgW || ly < dlgY || ly >= dlgY + dlgH) {
      this._activeDialog = 'none';
      return true;
    }

    if (this._activeDialog === 'worldTransfer' && this._worldTransferNames.length > 0) {
      for (let i = 0; i < this._worldTransferNames.length; i++) {
        const y = dlgY + 60 + i * 22;
        if (ly >= y && ly < y + 20) {
          this._worldTransferSelected = i;
          return true;
        }
      }
    }
    if (this._activeDialog === 'equipSlotExt' && ly >= dlgY + 60 && ly < dlgY + 116) {
      const col = Math.floor((lx - dlgX - 20) / 70);
      const row = Math.floor((ly - dlgY - 60) / 28);
      if (col >= 0 && col < 4 && row >= 0 && row < 2) {
        this._equipSlotExtBodyPart = row * 4 + col;
        return true;
      }
    }

    const okY = dlgY + dlgH - 40;
    if (ly >= okY && ly < okY + 28) {
      if (lx >= dlgX + 40 && lx < dlgX + 140) {
        switch (this._activeDialog) {
          case 'nameChange': this._confirmNameChange(); break;
          case 'worldTransfer': this._confirmWorldTransfer(); break;
          case 'coupleName': this._confirmCoupleName(); break;
          case 'friendName': this._confirmFriendName(); break;
          case 'equipSlotExt': this._confirmEquipSlotExt(); break;
        }
        return true;
      }
      if (lx >= dlgX + dlgW - 140 && lx < dlgX + dlgW - 40) {
        this._activeDialog = 'none';
        this._buyPending = false;
        return true;
      }
    }

    return true;
  }

  private _handleOneADayClick(lx: number, ly: number): boolean {
    const selectorX = LIST_X + 412;
    const selectorY = LIST_Y + 406;
    if (lx >= selectorX && lx < selectorX + 40 && ly >= selectorY && ly < selectorY + 24) {
      this._oneADayMode = this._oneADayMode === 0 ? 1 : 0;
      this._oneADaySelected = -1;
      return true;
    }

    // Today's action buttons — list-relative (165,202) and (246,202)
    const btnY = LIST_Y + 202;
    if (lx >= LIST_X + 165 && lx < LIST_X + 165 + 70 && ly >= btnY && ly < btnY + 24) {
      const item = this._commodities.find(c => c.sn === this._oneADayItemSN);
      if (item) {
        this._buyPending = true;
        this._processBuy(item);
        this._statusMessage = `Buying ${item.name}...`;
      }
      return true;
    }
    if (lx >= LIST_X + 246 && lx < LIST_X + 246 + 70 && ly >= btnY && ly < btnY + 24) {
      const item = this._commodities.find(c => c.sn === this._oneADayItemSN);
      if (item) this._onGiftClick(item);
      return true;
    }

    // Previous items grid — same plate geometry as the main list
    for (let i = 0; i < PLATES_PER_PAGE; i++) {
      const px = LIST_X + PLATE_COL_W * (i % PLATE_COLS) + 2;
      const py = LIST_Y + PLATE_ROW_H * Math.floor(i / PLATE_COLS) + 2;
      if (lx >= px && lx < px + PLATE_W && ly >= py && ly < py + PLATE_H) {
        if (i < this._oneADayPrevItems.length) {
          this._oneADaySelected = i;
          const previous = this._oneADayPrevItems[i];
          const item = this._commodities.find(c => c.sn === previous.originalSn || c.sn === previous.sn);
          if (item) {
            this._buyPending = true;
            this._processBuy(item);
            // If ProcessBuy opened a dialog instead of sending, release the gate
            if (this._activeDialog !== 'none' || this._yesNoVisible) this._buyPending = false;
            this._statusMessage = `Buying ${item.name}...`;
          }
        }
        return true;
      }
    }
    return lx >= LIST_X && lx < LIST_X + LIST_W && ly >= LIST_Y && ly < LIST_Y + LIST_H;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Buy / Gift flow
  // ═══════════════════════════════════════════════════════════════════════════

  private _buyItem(item: CashCommodity): void {
    // OG: CCashShop::OnBuy — checks authorization, balance, restrictions
    if (!this.game) return;

    // Debounce: ignore if a buy is already in-flight
    if (this._buyPending) return;

    // OG ProcessBuy: one-a-day / mesobag commodities ask a YesNo confirm first
    // (StringPool 0x15C4) before any further routing.
    if (Math.floor(item.sn / 100000) === 210 || item.sn === 5640000) {
      if (this._yesNoConfirmed) {
        this._yesNoConfirmed = false;
      } else {
        this._showYesNo('Buy this item? It can only be purchased once per day.', () => {
          this._yesNoConfirmed = true;
          this._buyItem(item);
        });
        return;
      }
    }

    // Check authorization (OG: m_bCashShopAuthorized)
    if (!this._cashShopAuthorized) {
      this._statusMessage = 'Not authorized for Cash Shop.';
      return;
    }

    // Commodity validation: must exist and be on sale
    const commodity = this._commodities.find(c => c.sn === item.sn);
    if (!commodity || !commodity.onSale || !this._isSaleAvailable(commodity)) {
      this._statusMessage = 'Item not found or not for sale.';
      return;
    }

    if (!this._isCommodityUsable(commodity)) {
      this._statusMessage = 'Character restrictions prevent this purchase.';
      return;
    }

    // Premium restriction (OG: forPremiumUser check)
    if (commodity.forPremiumUser && !this._isPremium) {
      this._statusMessage = 'Premium only.';
      return;
    }

    // MaplePoint restriction: limit=2 items don't accept MaplePoint
    // Items with nLimit=2 don't accept MaplePoint
    const acceptsMaplePoint = commodity.limit !== 2;

    // Check per-payment-type balance (OG: tries Credit bit0, MaplePoint bit1, Prepaid bit2)
    const price = this._getSalePrice(commodity);
    const canAfford = price <= this._nxCredit
      || (acceptsMaplePoint && price <= this._maplePoints)
      || price <= this._nxPrepaid;
    if (!canAfford) {
      this._statusMessage = 'Not enough NX.';
      return;
    }

    // Determine which payment types are available
    // NX Credit: always if balance > 0
    // Maple Point: available unless limit === 2
    // Prepaid NX: always if balance > 0

    // Auto-select the first available payment type
    if (price <= this._nxCredit) {
      this._confirmBuyPaymentType = 0; // NX Credit
    } else if (acceptsMaplePoint && price <= this._maplePoints) {
      this._confirmBuyPaymentType = 1; // Maple Point
    } else if (price <= this._nxPrepaid) {
      this._confirmBuyPaymentType = 2; // Prepaid NX
    }

    // Show confirmation dialog (OG: CConfirmPurchaseDlg)
    this._confirmBuyItem = commodity;
    this._confirmBuyVisible = true;
  }

  /** OG: CUtilDlg::YesNo — modal confirm with a callback. */
  private _showYesNo(message: string, onYes: () => void): void {
    this._yesNoVisible = true;
    this._yesNoMessage = message;
    this._yesNoCallback = onYes;
  }

  private _drawYesNoDialog(): void {
    if (!this._yesNoVisible) return;
    // Semi-transparent overlay
    this._g.rect(0, 0, CS_W, CS_H).fill({ color: 0x000000, alpha: 0.5 });
    const dlgW = 266;
    const dlgH = 124;
    const dlgX = Math.floor((CS_W - dlgW) / 2);
    const dlgY = Math.floor((CS_H - dlgH) / 2);
    if (this._confirmNotice) this._drawWzSprite(this._confirmNotice, dlgX, dlgY);
    this._addText('Confirm', dlgX + 110, dlgY + 10, COL_TEXT_GOLD, 14);
    // Word-wrap the message at ~34 chars per line (11px font)
    const words = this._yesNoMessage.split(' ');
    let line = '';
    let lineY = dlgY + 40;
    for (const w of words) {
      if ((line + ' ' + w).trim().length > 34) {
        this._addText(line, dlgX + 20, lineY, COL_TEXT_WHITE, 11);
        line = w;
        lineY += 16;
      } else {
        line = (line + ' ' + w).trim();
      }
    }
    if (line) this._addText(line, dlgX + 20, lineY, COL_TEXT_WHITE, 11);
    // Yes / No buttons — same row as the buy-confirm dialog's OK/Cancel
    const okY = dlgY + dlgH - 37;
    if (this._confirmOk) this._drawWzSprite(this._confirmOk, dlgX + 157, okY);
    if (this._confirmNo) this._drawWzSprite(this._confirmNo, dlgX + 207, okY);
  }

  /** Click hit-test for the Yes/No dialog. Returns true when consumed. */
  private _handleYesNoClick(lx: number, ly: number): boolean {
    if (!this._yesNoVisible) return false;
    const dlgW = 266;
    const dlgH = 124;
    const dlgX = Math.floor((CS_W - dlgW) / 2);
    const dlgY = Math.floor((CS_H - dlgH) / 2);
    const okY = dlgY + dlgH - 37;
    // OK/Cancel sprites are 60×24-ish; use the drawn anchor rects
    if (lx >= dlgX + 157 && lx < dlgX + 217 && ly >= okY && ly < okY + 28) {
      this._yesNoVisible = false;
      const cb = this._yesNoCallback;
      this._yesNoCallback = null;
      cb?.();
      return true;
    }
    if (lx >= dlgX + 207 && lx < dlgX + 267 && ly >= okY && ly < okY + 28) {
      this._yesNoVisible = false;
      this._yesNoCallback = null;
      return true;
    }
    return true; // modal — swallow clicks elsewhere
  }

  private _onGiftClick(item: CashCommodity): void {
    // OG: CCashShop::OnGift — check authorization and balance, then open dialog
    if (!this.game) return;

    if (!this._cashShopAuthorized) {
      this._statusMessage = 'Not authorized for Cash Shop.';
      return;
    }

    // Check that the item is on sale
    const commodity = this._commodities.find(c => c.sn === item.sn);
    if (!commodity || !commodity.onSale) {
      this._statusMessage = 'Item not found or not for sale.';
      return;
    }

    // Check NX balance (gift uses prepaid NX)
    const price = commodity.discountRate > 0
      ? Math.floor(commodity.price * (100 - commodity.discountRate) / 100)
      : commodity.price;
    if (price > this._nxPrepaid && price > this._nxCredit) {
      this._statusMessage = 'Not enough NX to gift this item.';
      return;
    }

    // Show gift dialog
    this._giftItem = item;
    this._giftVisible = true;
    this._giftReceiver = '';
    this._giftMessage = '';
    this._giftState = 0;
    this._giftListSelected = -1;
    this._giftEditingField = 1;
  }

  private _executeGift(): void {
    if (!this._giftItem || !this.game) return;

    // Validate receiver name — OG SetRet @0x79A4C0 requires 4..12 chars
    const receiver = this._giftReceiver.trim();
    if (receiver.length < 4 || receiver.length > 12) {
      this._statusMessage = 'Enter a character name (4-12 letters).';
      return;
    }

    const item = this._giftItem;
    if (Math.floor(item.itemId / 10000) === 910) {
      // OG OnGiftPackage @0x4907B0 — packages gift via their own sub-action
      this.game.session.send(GameSender.CashShopGiftPackage(item.sn, receiver, this._giftMessage));
    } else {
      // OG SendGiftsPacket @0x487B60 (sub-action 4)
      this.game.session.send(GameSender.CashShopSendGift(
        '',             // SPW (empty — not required for v95 client)
        item.sn,
        false,          // requestBuyOneADay
        receiver,
        this._giftMessage,
      ));
    }

    this._statusMessage = `Gifting ${item.name} to ${receiver}...`;

    // Dismiss dialog
    this._giftVisible = false;
    this._giftItem = null;
    this._giftEditingField = 0;
  }

  // ── Dialog confirmations ──
  private _confirmNameChange(): void {
    if (!this._nameChangeItem || !this.game) return;
    if (this._nameChangeNewName.length < 4) { this._statusMessage = 'Name too short.'; return; }
    this.game.session.send(GameSender.CashShopNameChange(this._nameChangeItem.sn, this._nameChangeNewName));
    this._statusMessage = `Name change to "${this._nameChangeNewName}"...`;
    this._activeDialog = 'none';
    this._nameChangeItem = null;
  }

  private _confirmWorldTransfer(): void {
    if (!this._worldTransferItem || !this.game || this._worldTransferSelected < 0) return;
    const worldName = this._worldTransferNames[this._worldTransferSelected];
    this.game.session.send(GameSender.CashShopTransferWorld(this._worldTransferItem.sn, worldName));
    this._statusMessage = `Transferring to ${worldName}...`;
    this._activeDialog = 'none';
    this._worldTransferItem = null;
  }

  private _confirmCoupleName(): void {
    if (!this._coupleNameItem || !this.game) return;
    if (this._coupleNameValue.length < 2) { this._statusMessage = 'Name too short.'; return; }
    this.game.session.send(GameSender.CashShopCouple(this._coupleNameItem.sn, this._coupleNameValue));
    this._statusMessage = `Couple ring to "${this._coupleNameValue}"...`;
    this._activeDialog = 'none';
    this._coupleNameItem = null;
  }

  private _confirmFriendName(): void {
    if (!this._friendNameItem || !this.game) return;
    if (this._friendNameValue.length < 2) { this._statusMessage = 'Name too short.'; return; }
    this.game.session.send(GameSender.CashShopFriendShip(this._friendNameItem.sn, this._friendNameValue));
    this._statusMessage = `Friendship ring to "${this._friendNameValue}"...`;
    this._activeDialog = 'none';
    this._friendNameItem = null;
  }

  private _confirmEquipSlotExt(): void {
    if (!this._equipSlotExtItem || !this.game) return;
    // OG: body-part index maps to equip slot position
    const bodyParts = [1, 2, 3, 5, 6, 7, 8, 9]; // hat, face, top, bottom, shoes, weapon, shield, cape
    const bodyPart = bodyParts[this._equipSlotExtBodyPart] ?? 0;
    this.game.session.send(GameSender.CashShopEnableEquipSlotExt(bodyPart, 30)); // 30 days
    this._statusMessage = `Equip slot extended for slot ${bodyPart}...`;
    this._activeDialog = 'none';
    this._equipSlotExtItem = null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Confirm Buy → ProcessBuy routing (OG: CConfirmPurchaseDlg → ProcessBuy)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Called when the user clicks OK or presses Enter on the confirm dialog. */
  private _executeBuy(): void {
    if (!this._confirmBuyItem || !this.game) return;

    const commodity = this._confirmBuyItem;

    // Dismiss dialog
    this._confirmBuyVisible = false;
    this._confirmBuyItem = null;

    // Set buy pending
    this._buyPending = true;

    // Route through ProcessBuy (OG: CCashShop::ProcessBuy)
    this._processBuy(commodity);
    if (this._activeDialog !== 'none') this._buyPending = false;
    this._statusMessage = `Buying ${commodity.name}...`;
  }

  /**
   * OG: CCashShop::ProcessBuy — 12-way dispatcher based on itemId.
   * Routes the purchase to the correct packet sender.
   */
  private _processBuy(item: CashCommodity): void {
    const { itemId, sn } = item;

    // OG ProcessBuy routing order (0x4936B0):
    // couple ring → package(910) → SN 80000000-89999999 normal → friendship →
    // charslot → character sale → equipslot ext → slot inc → name change →
    // transfer world → default OnBuy.

    // Couple rings: itemId/100 == 11120 && itemId != 1112000 → OnBuyCouple
    if (Math.floor(itemId / 100) === 11120 && itemId !== 1112000) {
      this._coupleNameItem = item;
      this._coupleNameValue = '';
      this._activeDialog = 'coupleName';
      return;
    }

    // Package boxes: itemId/10000 == 910 → OnBuyPackage
    if (Math.floor(itemId / 10000) === 910) {
      this.game?.session.send(GameSender.CashShopBuyPackage([sn]));
      return;
    }

    // Normal items in SN range [80000000..89999999] → OnBuyNormal
    if (sn >= 80000000 && sn <= 89999999) {
      this.game?.session.send(GameSender.CashShopBuyNormal(1, [sn]));
      return;
    }

    // Friendship equip: itemId/100 == 11128 && itemId % 10 <= 2 → OnBuyFriendship
    if (this._isFriendshipEquip(itemId)) {
      this._friendNameItem = item;
      this._friendNameValue = '';
      this._activeDialog = 'friendName';
      return;
    }

    // Character slot increment: itemId/1000 == 5430 → OnIncCharacterSlotCount
    if (this._isCharSlotInc(itemId)) {
      this.game?.session.send(GameSender.CashShopIncCharSlotCount());
      return;
    }

    // Character sale items: 5431000 / 5432000 → OnBuyCharacter
    if (this._isCharSale(itemId)) {
      // OG: CUICharacterSaleDlg — opens a separate dialog for character purchase
      // For now, send the buy request directly (server handles the dialog flow)
      this.game?.session.send(GameSender.CashShopBuy(sn));
      return;
    }

    // Equip slot extension: itemId/10000 == 555 → OnEnableEquipSlotExt
    if (this._isEquipSlotExt(itemId)) {
      this._equipSlotExtItem = item;
      this._equipSlotExtBodyPart = 0;
      this._activeDialog = 'equipSlotExt';
      return;
    }

    // Slot increment: itemId/10000 == 911 || itemId/1000 == 5430 ||
    // itemId == 5431000 || itemId == 5432000 → OnBuySlotInc
    if (this._isSlotInc(itemId)) {
      // Determine inventory type from item subcategory
      const invType = Math.floor(itemId / 1000) % 10;
      this.game?.session.send(GameSender.CashShopIncSlotCount(invType));
      return;
    }

    // Name change item (itemId == 5400000) → OnBuyNameChange
    if (itemId === 5400000) {
      this._nameChangeItem = item;
      this._nameChangeNewName = '';
      this._activeDialog = 'nameChange';
      return;
    }

    // World transfer item (itemId == 5401000) → OnBuyTransferWorldItem
    if (itemId === 5401000) {
      this._worldTransferItem = item;
      this._worldTransferSelected = -1;
      this._activeDialog = 'worldTransfer';
      // Request world list from server
      this.game?.session.send(GameSender.CashShopCheckTransferWorld());
      return;
    }

    // Trunk count extension (itemId == 5001053) → sub-action 11
    if (itemId === 5001053) {
      this.game?.session.send(GameSender.CashShopIncTrunkCount());
      return;
    }

    // Buy-char count extension (itemId == 5001054) → sub-action 13
    if (itemId === 5001054) {
      this.game?.session.send(GameSender.CashShopIncBuyCharCount());
      return;
    }

    // Default: normal single-item buy → sub-action 3
    this.game?.session.send(GameSender.CashShopBuy(sn));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ProcessBuy helpers
  // ═══════════════════════════════════════════════════════════════════════════

  /** Check if a commodity is a package (has packageSnList in modified data). */
  private _isPackage(sn: number): boolean {
    const comm = this._modifiedCommodities.find(c => c.sn === sn);
    return !!(comm?.data?.packageSnList && comm.data.packageSnList.length > 0);
  }

  /** Friendship equip: itemId/100 == 11128 && itemId % 10 <= 2 (OG is_friendship_equip_item). */
  private _isFriendshipEquip(itemId: number): boolean {
    return Math.floor(itemId / 100) === 11128 && itemId % 10 <= 2;
  }

  /** Character slot increment: itemId/1000 == 5430 (OG is_charslot_inc_item). */
  private _isCharSlotInc(itemId: number): boolean {
    return Math.floor(itemId / 1000) === 5430;
  }

  /** Character sale items: 5431000 / 5432000 (OG is_character_sale_item). */
  private _isCharSale(itemId: number): boolean {
    return itemId === 5431000 || itemId === 5432000;
  }

  /** Equip slot extension: itemId/10000 == 555 (OG is_equipslot_ext_item). */
  private _isEquipSlotExt(itemId: number): boolean {
    return Math.floor(itemId / 10000) === 555;
  }

  /** Slot increment (OG is_slot_inc_item): itemId/10000 == 911 ||
   *  itemId/1000 == 5430 || itemId == 5431000 || itemId == 5432000. */
  private _isSlotInc(itemId: number): boolean {
    return Math.floor(itemId / 10000) === 911
      || Math.floor(itemId / 1000) === 5430
      || itemId === 5431000
      || itemId === 5432000;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Packet result handling
  // ═══════════════════════════════════════════════════════════════════════════

  private _handleCashItemResult(args: CashItemResult): void {
    switch (args.subAction) {
      case 0x54: this._statusMessage = `Limited: ${args.remainCount} left`; break;
      case 0x58: {
        // Parse GW_CashItemInfo 55-byte structs into locker items
        const locker: { sn: number; itemId: number; name: string }[] = [];
        const dv = new DataView(args.items.buffer, args.items.byteOffset, args.items.byteLength);
        for (let i = 0; i < args.itemCount; i++) {
          const off = i * 55;
          const itemId = dv.getInt32(off, true);
          const sn = dv.getInt32(off + 4, true);
          locker.push({ sn, itemId, name: this._getItemName(itemId) });
        }
        this._lockerItems = locker;
        this._statusMessage = `Locker loaded: ${args.itemCount} items`;
        break;
      }
      case 0x5A:
        this._giftRecords = args.gifts.slice();
        this._statusMessage = `${args.giftCount} gifts loaded`;
        break;
      case 0x5C: // LoadWish result — wishlist SNs
        this._wishlist = args.wishlist.slice(0, 10);
        this._statusMessage = `Wishlist loaded: ${args.wishlist.length} items`;
        break;
      case 0x62: // SetWish result
        this._wishlist = args.wishlist.slice(0, 10);
        this._statusMessage = 'Wishlist updated';
        break;
      case 0x64:
        this._buyPending = false;
        this._appendCashItem(args.itemBytes);
        this._statusMessage = 'Purchase complete!';
        break;
      case 0x66: // BuyNormalDone — items moved to inventory
        this._buyPending = false;
        for (let i = 0; i < args.itemCount; i++) {
          this._appendCashItem(args.items.subarray(i * 55, (i + 1) * 55));
        }
        this._statusMessage = `Normal buy complete: ${args.itemCount} items`;
        break;
      case 0x68: // GiftDone
        this._buyPending = false;
        this._statusMessage = `Gift sent to ${args.receiverName}`;
        break;
      case 0x6B: // GiftPackageDone
        this._buyPending = false;
        this._statusMessage = `Package gift sent to ${args.receiverName}`;
        break;
      case 0x71: // IncCharSlotCountDone
        this._statusMessage = `Character slots: ${args.characterSlotCount}`;
        break;
      case 0x73: // IncBuyCharCountDone
        this._statusMessage = `Buy character count: ${args.buyCharacterCount}`;
        break;
      case 0x75: // EnableEquipSlotExtDone
        this._statusMessage = `Equip slot ${args.bodyPartIndex} extended by ${args.daysAdded} days`;
        break;
      case 0x7B: // DestroyDone
        this._statusMessage = 'Item destroyed';
        break;
      case 0x7D: // ExpireDone
        this._statusMessage = 'Item expired';
        break;
      case 0x96: // RebateDone
        this._statusMessage = `Rebated ${args.maplePointAmount} Maple Points`;
        break;
      case 0xB5: // TransferWorldDone
        this._buyPending = false;
        this._statusMessage = 'World transfer complete!';
        break;
      case 0xB7: // CashGachaponOpenDone
        this._buyPending = false;
        this._statusMessage = 'Gachapon opened!';
        break;
      case 0xB9: // CashGachaponCopyDone
        this._buyPending = false;
        this._statusMessage = 'Gachapon copied!';
        break;
      case 0xBB: // ChangeMaplePointDone
        this._statusMessage = 'Maple Points converted!';
        break;
      case 0xAA: // FreeCashItemDone
        this._buyPending = false;
        this._appendCashItem(args.itemBytes);
        this._statusMessage = 'Free item claimed!';
        break;
      case 0xAF: { // PurchaseRecordResult (OG OnCashItemResPurchaseRecord @0x495B50)
        const key = args.key as number;
        const purchased = args.available as boolean;
        if (key !== 0) {
          this._purchaseRecords.set(key, purchased);
          if (purchased) this._purchaseRecordGlobal = 1;
        } else {
          this._purchaseRecordGlobal = purchased ? 1 : 0;
        }
        break;
      }
      case 0xB3: // NameChangeDone
        this._buyPending = false;
        this._statusMessage = 'Name change complete!';
        break;
      case 0x6D: this._statusMessage = `Inventory expanded to ${args.newSlotCount}`; break;
      case 0x6F: this._statusMessage = `Storage expanded to ${args.trunkCount}`; break;
      case 0x77: {
        const item = this._parseCashItem(args.itemBytes);
        if (item) {
          this._lockerItems = this._lockerItems.filter(value => value.sn !== item.sn);
          this._appendCashItem(args.itemBytes);
        }
        this._statusMessage = 'Item moved to inventory';
        break;
      }
      case 0x79: {
        const item = this._parseCashItem(args.itemBytes);
        if (item) {
          this._cashInventoryItems = this._cashInventoryItems.filter(value => value.sn !== item.sn);
          this._lockerItems.push({ sn: item.sn, itemId: item.itemId, name: this._getItemName(item.itemId) });
        }
        this._statusMessage = 'Item moved to locker';
        break;
      }
      case 0x9A:
        this._buyPending = false;
        for (let i = 0; i < args.itemCount; i++) {
          this._appendCashItem(args.items.subarray(i * 55, (i + 1) * 55));
        }
        this._statusMessage = `Package: ${args.itemCount} items`;
        break;
      case 0x98: this._buyPending = false; this._statusMessage = 'Couple item sent!'; break;
      case 0x9E: this._buyPending = false; this._statusMessage = 'Purchase complete!'; break;
      case 0xA2: this._buyPending = false; this._statusMessage = 'Friendship item sent!'; break;
      case 0x59: // LoadLockerFailed
      case 0x5B: // LoadGiftFailed
      case 0x5D: // LoadWishFailed
      case 0x65: // BuyFailed
      case 0x69: // UseCouponFailed
      case 0x6C: // GiftFailed
      case 0x6E: // IncSlotCountFailed
      case 0x70: // IncTrunkCountFailed
      case 0x72: // IncCharacterSlotCountFailed
      case 0x74: // IncBuyCharacterCountFailed
      case 0x76: // EnableEquipSlotExtFailed
      case 0x78: // MoveLtoSFailed
      case 0x7A: // MoveStoLFailed
      case 0x7C: // DestroyFailed
      case 0x97: // RebateFailed
      case 0xB0: // PurchaseRecordFailed
      case 0xB6: // TransferWorldFailed
      case 0xB8: // CashGachaponOpenFailed
      case 0xBA: // CashGachaponCopyFailed
      case 0xBC: // ChangeMaplePointFailed
      case 0x99: // CoupleFailed
      case 0x9B: // BuyPackageFailed
      case 0x9D: // GiftPackageFailed
      case 0x9F: // BuyNormalFailed
      case 0xA3: // FriendShipFailed
        this._buyPending = false;
        this._statusMessage = this._noticeFailReason((args as { reason: number }).reason);
        break;
      default: {
        const raw = args as { subAction: number; reason?: number };
        if (raw.reason !== undefined) {
          this._buyPending = false;
          this._statusMessage = this._noticeFailReason(raw.reason);
        }
      }
    }
  }

  /** OG NoticeFailReason — maps server error codes to user-friendly messages.
   *  69 cases from decompile/499370.c → string table. */
  private _noticeFailReason(reason: number): string {
    switch (reason) {
      case 0: return 'Insufficient NX.';
      case 1: return 'Item not found.';
      case 2: return 'Not enough inventory space.';
      case 3: return 'Cannot buy this item.';
      case 4: return 'Invalid quantity.';
      case 5: return 'Item not for sale.';
      case 6: return 'Cannot gift this item.';
      case 7: return 'Invalid coupon.';
      case 8: return 'Already own this item.';
      case 9: return 'Insufficient mesos.';
      case 10: return 'Character level too low.';
      case 11: return 'Wrong job class.';
      case 12: return 'Wrong gender.';
      case 13: return 'Premium only.';
      case 14: return 'Limited stock remaining.';
      case 15: return 'Not authorized.';
      case 16: return 'Cannot purchase with Maple Points.';
      case 17: return 'Item is not tradable.';
      case 18: return 'Account is suspended.';
      case 19: return 'Duplicate purchase detected.';
      case 20: return 'Purchase limit reached.';
      case 21: return 'Item is out of stock.';
      case 22: return 'Server error. Please try again.';
      case 23: return 'Item cannot be purchased at this time.';
      case 24: return 'You do not have enough gift credits.';
      case 25: return 'Invalid recipient.';
      case 26: return 'Recipient is not on this world.';
      case 27: return 'You cannot gift to yourself.';
      case 28: return 'Gift limit reached.';
      case 29: return 'Item restricted for this character.';
      case 30: return 'Item restricted for this character.';
      case 31: return 'Item is event-only.';
      case 32: return 'Item is not available in your region.';
      case 33: return 'Not authorized for Cash Shop.';
      case 34: return 'Purchase is on cooldown.';
      case 35: return 'Item has already expired.';
      case 36: return 'Cannot purchase during maintenance.';
      case 37: return 'Invalid coupon code.';
      case 38: return 'Coupon already redeemed.';
      case 39: return 'Coupon has expired.';
      case 40: return 'Item requires a quest completion.';
      case 41: return 'Item requires a previous purchase.';
      case 42: return 'Item is not available for your class.';
      case 43: return 'Item is locked.';
      case 44: return 'Insufficient Maple Points.';
      case 45: return 'Item cannot be refunded.';
      case 46: return 'Item cannot be exchanged.';
      case 47: return 'Item is temporarily unavailable.';
      case 48: return 'Purchase failed. Try again later.';
      case 49: return 'Item is restricted on this channel.';
      default:
        if (reason >= 50) return `Purchase failed (code ${reason}).`;
        return `Unknown error (code ${reason}).`;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  private _getCurrentPageItems(): CashCommodity[] {
    // OG ChangePage @0x4CFC70 case 10 — search results pages (10 per page).
    if (this._activeTab === 10) return this._searchResults ?? [];
    // OG ChangePage @0x4CFC70 case 9 — the wishlist rendered as plates.
    if (this._activeTab === 9) {
      return this._wishlist
        .filter(sn => sn !== 0)
        .map(sn => this._commodities.find(c => c.sn === sn))
        .filter((c): c is CashCommodity => !!c);
    }
    // OG CCSWnd_List::ChangePage @0x4CFC70 — category 1 sub 2 is forced empty.
    if (this._activeTab === 1 && this._subCategory === 2) {
      return [];
    }
    const subs = this._commTable?.Categories.filter(r => r.category === this._activeTab) ?? [];
    const out: CashCommodity[] = [];
    let rowKey = -1;
    let rowDead = false;
    for (const c of this._commodities) {
      // OG LoadData @0x492EA0: category = sn/10000000 % 10,
      // categorySub = sn/100000 % 100 — filter by the tab's category.
      if (c.category !== this._activeTab) continue;
      const k = c.category * 1000 + c.categorySub;
      if (k !== rowKey) { rowKey = k; rowDead = false; }
      // OG scans a category row only until its first OFF-SALE entry (break).
      if (!c.onSale) rowDead = true;
      if (rowDead) continue;
      // OG ChangePage @0x4CFC70: already-purchased limit(2|3) goods are
      // hidden — limit 2 via the global record (key 0), limit 3 per SN.
      if (c.limit === 2 || c.limit === 3) {
        if (this._getPurchaseRecord(c.limit === 2 ? 0 : c.sn)) continue;
      }
      // Stock/limit-exhausted entries stay visible (buttons disabled, see
      // _plateButtons); zero-goods time windows still hide them (OG folds
      // those windows into the sale flags in LoadData).
      if (!this._zeroWindowOpen(c)) continue;
      // Sub-category bar (OG ChangeCategorySub @0x4C98F0): when the WZ
      // Category table is loaded, filter by the selected sub-row.
      if (subs.length > 0 && c.categorySub !== this._subCategory) continue;
      out.push(c);
    }
    return out;
  }

  /** Zero-goods event window check (the visibility half of _isSaleAvailable). */
  private _zeroWindowOpen(item: CashCommodity): boolean {
    const zero = this._zeroGoods.find(entry => item.sn >= entry.startSN && item.sn <= entry.endSN);
    if (zero && !this._saleTimeMatches(zero.condition, zero.dateStart, zero.dateEnd, zero.hourStart, zero.hourEnd, zero.weekdays)) return false;
    return true;
  }

  /** Sub-category rows for the active tab (Category.img names). */
  private _subRows(): { category: number; categorySub: number; name: string }[] {
    return this._commTable?.Categories.filter(r => r.category === this._activeTab) ?? [];
  }

  /** OG CCSWnd_Tab::ChangeSubCategory @0x4C6530 — the sub-category strip sits
   *  near the bottom of the 508×78 tab canvas (control args 8,59,485). */
  private _drawSubCategoryBar(): void {
    const subs = this._subRows();
    if (subs.length === 0) return;
    const stripX = TAB_X + 8;
    const stripY = TAB_Y + 59;
    const step = Math.floor(485 / subs.length);
    for (let i = 0; i < subs.length; i++) {
      const x = stripX + i * step;
      const selected = subs[i].categorySub === this._subCategory;
      this._addText(
        subs[i].name.slice(0, 8),
        x + 2,
        stripY + 2,
        selected ? COL_TEXT_GOLD : COL_TEXT_DIM,
        9,
      );
      if (selected) {
        this._g.rect(x + 1, stripY, step - 4, 14)
          .stroke({ color: COL_TAB_BORDER_ACTIVE, width: 1 });
      }
    }
  }

  private _getTotalPages(): number {
    const items = this._searchResults ?? this._getCurrentPageItems();
    return Math.max(1, Math.ceil(items.length / PLATES_PER_PAGE));
  }

  private _exit(): void {
    if (this.game?.session.isConnected) this.game.session.send(GameSender.ReturnFromCashShop());
    this.stageDirector.pop();
  }

  private _clearDynamic(): void {
    for (const t of this._dynamicTexts) t.destroy();
    this._dynamicTexts = [];
    for (const s of this._dynamicIcons) s.destroy();
    this._dynamicIcons = [];
  }

  private _addText(text: string, x: number, y: number, fill: number, fontSize: number): void {
    const t = new Text({
      text,
      style: new TextStyle({ fill, fontSize, fontFamily: 'monospace' }),
    });
    t.position.set(x, y);
    this._root.addChild(t);
    this._dynamicTexts.push(t);
  }

  private _createIcon(icon: { Texture: Texture; Width: number; Height: number; OriginX: number; OriginY: number }): Sprite {
    const sp = new Sprite(icon.Texture);
    sp.anchor.set(
      icon.Width > 0 ? icon.OriginX / icon.Width : 0,
      icon.Height > 0 ? icon.OriginY / icon.Height : 0,
    );
    this._root.addChild(sp);
    this._dynamicIcons.push(sp);
    return sp;
  }

  private _drawWzSprite(sprite: WzSprite, x: number, y: number): Sprite {
    const s = sprite.ToPixi();
    s.position.set(x, y);
    this._root.addChild(s);
    this._dynamicIcons.push(s);
    return s;
  }

  private _loadAssets(): void {
    if (!this._ui || !this._loader) return;
    const cs = this._ui.GetItem('CashShop.img') as any;
    if (!cs) return;
    const rootItems = (cs.Root as any)?.Items as Record<string, unknown> | undefined;
    if (!rootItems) return;

    const tryLoad = (path: string): WzSprite | null => {
      try {
        const parts = path.split('/');
        let node: any = rootItems[parts[0]];
        for (let i = 1; i < parts.length && node; i++) {
          node = (node as any).Items?.[parts[i]];
        }
        // OG v95 button-state canvases are nested under a "0" child
        // (Bt*/normal/0, Bt*/mouseOver/0, ...). A bare property resolves to
        // its "0" canvas; a direct canvas passes through.
        if (node instanceof WzProperty && node.Get instanceof Function) {
          const sub = node.Get('0');
          if (sub instanceof WzCanvas) node = sub;
        }
        return node instanceof WzCanvas ? this._loader!.Load(node) : null;
      } catch { return null; }
    };

    const oneADay = this._ui.GetItem('OneADay.img') as any;
    const oneADayItems = (oneADay?.Root as any)?.Items as Record<string, unknown> | undefined;
    const tryLoadOneADay = (path: string): WzSprite | null => {
      if (!oneADayItems) return null;
      try {
        const parts = path.split('/');
        let node: any = oneADayItems[parts[0]];
        for (let i = 1; i < parts.length && node; i++) node = node.Items?.[parts[i]];
        if (node instanceof WzProperty && node.Get instanceof Function) {
          const sub = node.Get('0');
          if (sub instanceof WzCanvas) node = sub;
        }
        return node instanceof WzCanvas ? this._loader!.Load(node) : null;
      } catch { return null; }
    };

    const tryLoadImage = (image: string, path: string): WzSprite | null => {
      try {
        const pkg = this._ui!.GetItem(image) as any;
        const items = pkg?.Root?.Items as Record<string, unknown> | undefined;
        if (!items) return null;
        const parts = path.split('/');
        let node: any = items[parts[0]];
        for (let i = 1; i < parts.length && node; i++) node = node.Items?.[parts[i]];
        if (node instanceof WzProperty && node.Get instanceof Function) {
          const sub = node.Get('0');
          if (sub instanceof WzCanvas) node = sub;
        }
        return node instanceof WzCanvas ? this._loader!.Load(node) : null;
      } catch { return null; }
    };

    this._oneADayBase = tryLoadOneADay('CSOneADay/Base01');
    this._oneADayItemBox = tryLoadOneADay('CSOneADay/ItemBoxBig');
    this._oneADayBuy = tryLoadOneADay('CSOneADay/BtBuy/normal');
    this._oneADayGift = tryLoadOneADay('CSOneADay/BtGift/normal');

    // Background — OG: Base/backgrnd..backgrnd5 (job variants, see _selectBackground)
    this._bg = tryLoad('Base/backgrnd');
    this._bgVariants[0] = this._bg;
    for (let i = 1; i <= 5; i++) this._bgVariants[i] = tryLoad(`Base/backgrnd${i}`);
    this._noItemImage = tryLoad('PicturePlate/NoItem');

    // Character preview backgrounds — OG: Base/Preview/0,1,2
    // Preview/0 = normal job, Preview/1 = Cygnus Knights, Preview/2 = Aran/Evan
    for (let i = 0; i < 3; i++) {
      this._previewBgs[i] = tryLoad(`Base/Preview/${i}`);
    }
    // PreviewOnOff toggle button — NX wraps canvas inside sub-node
    this._previewOn = tryLoad('Base/PreviewOnOff/On/0');
    this._previewOff = tryLoad('Base/PreviewOnOff/Off/0');
    this._btBuyAvatar = tryLoad('CSChar/BtBuyAvatar/normal');
    this._btDefaultAvatar = tryLoad('CSChar/BtDefaultAvatar/normal');
    this._btTakeoffAvatar = tryLoad('CSChar/BtTakeoffAvatar/normal');

    // Tab sprites: CSTab/Tab/1 through CSTab/Tab/9.
    for (let i = 0; i < TAB_COUNT; i++) {
      this._tabSprites[i] = tryLoad(`CSTab/Tab/${i + 1}`);
    }

    // Status bar buttons — 4 states: normal, mouseOver, pressed, disabled
    this._btCharge = tryLoad('CSStatus/BtCharge/normal');
    this._btChargeOver = tryLoad('CSStatus/BtCharge/mouseOver');
    this._btCheck = tryLoad('CSStatus/BtCheck/normal');
    this._btCheckOver = tryLoad('CSStatus/BtCheck/mouseOver');
    this._btCoupon = tryLoad('CSStatus/BtCoupon/normal');
    this._btCouponOver = tryLoad('CSStatus/BtCoupon/mouseOver');
    this._btExit = tryLoad('CSStatus/BtExit/normal');
    this._btExitOver = tryLoad('CSStatus/BtExit/mouseOver');

    // Buy/Gift buttons — 4 states
    this._btBuy = tryLoad('CSList/BtBuy/normal');
    this._btBuyOver = tryLoad('CSList/BtBuy/mouseOver');
    this._btGift = tryLoad('CSList/BtGift/normal');
    this._btGiftOver = tryLoad('CSList/BtGift/mouseOver');
    // Third plate button (wishlist toggle — StringPool 1265/1266 in SetPlateNo)
    this._btWish = tryLoad('CSList/BtWish/normal') ?? tryLoad('CSList/BtWishList/normal');
    this._btWishOver = tryLoad('CSList/BtWish/mouseOver') ?? tryLoad('CSList/BtWishList/mouseOver');
    // Shortcut-help modal background (StringPool UOL in SetPlateNo)
    this._shortcutHelpBg = tryLoad('CSShortcutHelp/backgrnd') ?? tryLoad('CSShortcut/0');

    // Selected/keyboard-focused plate skin (SP 0x4E9 normal / 0x4EA keyFocus)
    this._plateStateFocus = tryLoad('CSList/KeyFocus')
      ?? tryLoad('CSList/keyFocus')
      ?? tryLoad('CSList/Focus');

    // Coupon dialog chrome (OG literal UOLs UIWindow2.img/Coupon/*)
    this._couponBg = tryLoadImage('UIWindow2.img', 'Coupon/backgrnd');
    this._couponOk = tryLoadImage('UIWindow2.img', 'Coupon/BtOK/normal');
    this._couponCancel = tryLoadImage('UIWindow2.img', 'Coupon/BtCancle/normal');

    // OneADay big plate + countdown digit glyphs (children "0".."9")
    this._oneADayPlateBig = tryLoadOneADay('PlateBig');
    for (let d = 0; d < 10; d++) {
      this._oneADayDigits[d] = tryLoadOneADay(`Num/${d}`)
        ?? tryLoadOneADay(`CountDown/${d}`)
        ?? tryLoadOneADay(`Number/${d}`);
    }

    // Price-band table (CCSWnd_ItemSearch::OnCreate @0x4C8980): each child of
    // CSItemSearch/Price holds {0}=lower, {1}=upper bound.
    this._searchPriceBands = [];
    try {
      const priceNode: any = (rootItems['CSItemSearch'] as any)?.Items?.['Price'];
      const children = priceNode?.Items as Record<string, any> | undefined;
      if (children) {
        for (const key of Object.keys(children).sort((a, b) => Number(a) - Number(b))) {
          const child = children[key];
          const low = child?.Get?.('0');
          const high = child?.Get?.('1');
          const toNum = (v: unknown) => typeof v === 'bigint' ? Number(v) : typeof v === 'number' ? v : null;
          const lo = toNum(low);
          const hi = toNum(high);
          if (lo !== null && hi !== null) this._searchPriceBands.push({ low: lo, high: hi });
        }
      }
    } catch { this._searchPriceBands = []; }

    this._btSearch = tryLoad('CSItemSearch/BtSearch/normal');
    this._btSearchBuy = tryLoad('CSItemSearch/BtBuy/normal');
    this._btSearchCancel = tryLoad('CSItemSearch/BtCancel/normal');
    this._searchPopup = tryLoad('CSItemSearch/PopUp/backgrnd');

    this._btExEquip = tryLoad('CSInventory/BtExEquip/normal');
    this._btExConsume = tryLoad('CSInventory/BtExConsume/normal');
    this._btExInstall = tryLoad('CSInventory/BtExInstall/normal');
    this._btExEtc = tryLoad('CSInventory/BtExEtc/normal');
    this._btExTrunk = tryLoad('CSInventory/BtExTrunk/normal');
    this._btRebate = tryLoad('CSLocker/BtRebate/normal');

    // List background (200×80 plate canvas)
    this._bgList = tryLoad('CSList/Base');

    // Item effect badges — multiple animation frames
    this._effectHot = tryLoad('CSEffect/hot/0');
    this._effectNew = tryLoad('CSEffect/new/0');
    this._effectSale = tryLoad('CSEffect/sale/0');

    // Best-panel event banner (optional — skipped silently when missing)
    this._bestEventBanner = tryLoad('CS3thEvent/0');

    // Discount digits 0-9 + bonus/line/backgrnd/total
    for (let i = 0; i <= 9; i++) {
      this._discountDigits[i] = tryLoad(`CSDiscount/${i}`);
    }
    this._discountBg = tryLoad('CSDiscount/backgrnd');
    this._discountBonus = tryLoad('CSDiscount/bonus');
    this._discountLine = tryLoad('CSDiscount/Line');
    this._discountTotal = tryLoad('CSDiscount/total');

    // NX coin icons on price rows (OG: CashItem/0..3 next to the price digits)
    this._cashCoinIcons[0] = tryLoad('CashItem/0');
    this._cashCoinIcons[1] = tryLoad('CashItem/1');
    this._cashCoinIcons[2] = tryLoad('CashItem/2');
    this._cashCoinIcons[3] = tryLoad('CashItem/3');
    this._prepaidCoinIcon = tryLoad('PrepaidCashItem/0');

    // These panels are part of Base/backgrnd in v95. There are no separate
    // CSLocker/CSInventory/CSStatus/CSBest background canvases.
    this._bgLocker = null;
    this._bgInventory = null;
    this._bgStatus = null;
    this._bgBest = null;
    this._bgGift = tryLoad('CSGift/backgrnd');
    this._bgGiftWide = tryLoad('CSGift/backgrnd1');
    this._btGiftBuddy = tryLoad('CSGift/BtBuddy/normal');
    this._btGiftGuild = tryLoad('CSGift/BtGuild/normal');
    this._btGiftHide = tryLoad('CSGift/BtHide/normal');
    this._bgNameChange = tryLoad('CSChangeName/Base/backgrnd');
    this._bgNameChangeNotice = tryLoad('CSChangeName/Base/backgrndnotice');
    this._bgTransferWorld = tryLoad('CSTransferWorld/Base/backgrnd');
    this._bgTransferWorldNotice = tryLoad('CSTransferWorld/Base/backgrndnotice');
    this._btNameCheck = tryLoad('CSChangeName/BtCheck/normal');
    this._confirmNotice = tryLoadImage('UIWindow2.img', 'UtilDlgEx/notice');
    this._confirmOk = tryLoadImage('UIWindow2.img', 'UtilDlgEx/BtOK/normal');
    this._confirmNo = tryLoadImage('UIWindow2.img', 'UtilDlgEx/BtNo/normal');
  }
}
