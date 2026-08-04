import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { Stage, MouseButton } from '../app/Stage.js';
import { MapleClaudeGame } from '../MapleClaudeGame.js';
import { WzPackage } from '../wz/WzPackage.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzSprite } from '../render/WzSprite.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { GameSender } from '../net/senders/GameSender.js';
import { ItemIconLoader } from '../character/ItemIconLoader.js';
import { ItemInfoService } from '../character/ItemInfoService.js';
import { CashShopDecoder } from '../net/packet/CashShopDecoder.js';
import { CharLook } from '../character/CharLook.js';
import { AvatarCodec } from '../net/handlers/AvatarCodec.js';
import { ScrollBar } from '../ui/game/ScrollBar.js';
import type { ModifiedCommodityEntry, SetCashShopArgs } from '../domain/CashShopData.js';
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
const LIST_X = 275;
const LIST_Y = 95;
const LIST_W = 412;
const LIST_H = 430;
// OG: GetPlateRect — column offset 0xCE=206, row offset 0x51=81
const PLATE_W = 200;
const PLATE_H = 80;
const PLATE_COL_W = 206; // 0xCE
const PLATE_ROW_H = 81;  // 0x51
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

// Locker (CCSWnd_Locker) — centered below character preview
// OG: CreateWnd L=-1 (centered), T=318, W=256, H=104
const LOCKER_W = 256;
const LOCKER_H = 104;
const LOCKER_Y = 318;
const LOCKER_X = Math.floor((CS_W - LOCKER_W) / 2); // centered
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
const INV_CELL = 35;
const INV_COL_STEP = 35;
const INV_COLS = 4;
const INV_ROWS = 3;

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
  private _limitGoods: Array<{ sns: number[]; count: number; state: number; condition: number; dateStart: number; dateEnd: number; hourStart: number; hourEnd: number; weekdays: number[] }> = [];
  private _zeroGoods: Array<{ startSN: number; endSN: number; eventSN: number; condition: number; dateStart: number; dateEnd: number; hourStart: number; hourEnd: number; weekdays: number[] }> = [];

  // ── UI state ──
  private _activeTab = 0;
  private _page = 0;
  private _nxCredit = 0;
  private _nxPrepaid = 0;
  private _maplePoints = 0;
  private _cashShopAuthorized = false;
  private _statusMessage = '';
  private _couponVisible = false;
  private _couponValue = '';
  private _selectedPlate = -1;
  private _focusedPlate = -1;
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

  // ── Character preview ──
  private _charLook: CharLook | null = null;
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
  private _cashInventoryItems: { sn: number; itemId: number; count: number }[] = [];
  private _wishlist: number[] = new Array(10).fill(0);
  private _giftRecords = new Uint8Array(0);

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
    this.mapRoot.addChild(this._root);
    this.mapRoot.addChildAt(this._staticRoot, this.mapRoot.children.length - 1);
    this._root.x = Math.floor((this._prevW - CS_W) / 2);
    this._staticRoot.x = this._root.x;

    // Load WZ packages for character rendering
    const dir = game.wzDir ?? '/wz_client';
    const open = (name: string) => WzPackage.OpenBaseAsync(dir, name);
    const loadWz = async () => {
      try {
        this._charWz = game.wz.character ?? await open('Character');
        this._itemWz = game.wz.item ?? await open('Item');
        this._baseWz = game.wz.base ?? await open('Base');
        this._itemInfo = new ItemInfoService(this._charWz, this._itemWz);
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
      this._commodities = [];
      const categoryCounters: Record<number, number> = {};
      for (let i = 0; i < args.modifiedCommodities.length; i++) {
        const m = args.modifiedCommodities[i];
        const sn = m.sn ?? i;

        // Skip items that are not for sale
        if (this._notSaleSNs.has(sn)) continue;

        const itemId = m.data?.itemId ?? 0;

        // Determine category from itemId prefix
        const category = this._getCategoryFromItemId(itemId);

        // Look up discount rate for this category + category-specific index
        const catIdx = categoryCounters[category] ?? 0;
        const discountRate = this._getDiscountRate(category, catIdx);
        categoryCounters[category] = catIdx + 1;

        this._commodities.push({
          sn,
          itemId,
          count: m.data?.count ?? 1,
          name: this._getItemName(itemId),
          price: m.data?.price ?? 0,
          priority: m.data?.priority ?? i,
          period: m.data?.period ?? 0,
          bonus: m.data?.bonus ?? false,
          reqPop: m.data?.reqPop ?? 0,
          category,
          categorySub: 0,
          discountRate,
          onSale: m.data?.onSale !== false,
          gender: m.data?.gender ?? 0,
          onSaleFlag: 0,
          classField: m.data?.classField ?? 0,
          reqLevel: m.data?.reqLevel ?? 0,
          forPremiumUser: m.data?.forPremiumUser ?? false,
          limit: m.data?.limit ?? 0,
          maplePoint: m.data?.maplePoint ?? 0,
          meso: m.data?.meso ?? 0,
          pbCash: m.data?.pbCash ?? 0,
          pbPoint: m.data?.pbPoint ?? 0,
          pbGift: m.data?.pbGift ?? 0,
          packageSnList: m.data?.packageSnList ?? [],
          stockState: this._stockStates.get(sn) ?? 0,
          limitState: this._getLimitGoodsState(sn),
        });
      }
      this._commodities.sort((a, b) => a.priority - b.priority || a.sn - b.sn);
    };
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
    this._charLook.SetAvatar(look);
    this._charLook.StartAction('stand1');
  }

  private _buildStaticLayer(): void {
    this._staticRoot.removeChildren().forEach(child => child.destroy());
    if (!this._bg) return;
    const sprite = this._bg.ToPixi();
    this._staticRoot.addChild(sprite);
  }

  private _getSalePrice(item: CashCommodity): number {
    return item.discountRate > 0 ? Math.floor(item.price * (100 - item.discountRate) / 100) : item.price;
  }

  private _isCommodityUsable(item: CashCommodity): boolean {
    if (item.reqLevel > 0 && this._playerLevel < item.reqLevel) return false;
    if (item.reqPop > 0 && this._playerFame < item.reqPop) return false;
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
    if (this._activeTab === 8 && this._oneADayItemSN > 0) this._drawOneADay();
    else this._drawItemGrid();
    this._drawBestPanel();
    this._drawLockerPanel();
    this._drawInventoryPanel();
    this._drawStatusBar();
    this._drawSearchButton();
    this._drawStatusMessage();
    if (this._giftVisible) this._drawGiftDialog();
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
    this._root.x = Math.floor((windowW - CS_W) / 2);
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

    // PreviewOnOff toggle button
    const toggleY = CHAR_Y + 4;
    const toggleX = CHAR_X + CHAR_W - 36;
    const previewToggle = this._previewEnabled ? this._previewOn : this._previewOff;
    if (previewToggle) this._drawWzSprite(previewToggle, toggleX, toggleY);

    const avatarButtons = [
      [this._btBuyAvatar, 17],
      [this._btDefaultAvatar, 101],
      [this._btTakeoffAvatar, 187],
    ] as const;
    for (const [sprite, x] of avatarButtons) {
      if (sprite) this._drawWzSprite(sprite, CHAR_X + x, CHAR_Y + 237);
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
  // Draw: 3 horizontal separator lines at Y=11/25/40, W=107 at X=120
  // Text: "NexonCash", "MaplePoint", "Prepaid NXCash" labels + values
  private _drawStatusBar(): void {
    // Background — use WZ sprite if available
    if (this._bgStatus) {
      this._drawWzSprite(this._bgStatus, STATUS_X, STATUS_Y);
    }

    // NX balances — OG positions: labels at X=10-60, values right-aligned at X=220
    // Separator lines at Y=11, Y=25, Y=40 (relative to status bar)
    const lineX = STATUS_X + 120; // 0x78
    const lineW = 107; // 0x6B
    const lineH = 11;  // 0x0B

    // Separator lines (OG: color 0xFFF3F4F5)
    this._g.moveTo(lineX, STATUS_Y + 11).lineTo(lineX + lineW, STATUS_Y + 11).stroke({ color: 0xF3F4F5, width: 1 });
    this._g.moveTo(lineX, STATUS_Y + 25).lineTo(lineX + lineW, STATUS_Y + 25).stroke({ color: 0xF3F4F5, width: 1 });
    this._g.moveTo(lineX, STATUS_Y + 40).lineTo(lineX + lineW, STATUS_Y + 40).stroke({ color: 0xF3F4F5, width: 1 });

    // Labels (OG: font type 56, positions from pos: annotations)
    this._addText('NexonCash', STATUS_X + 10, STATUS_Y + 11, COL_TEXT_WHITE, 11);
    this._addText('MaplePoint', STATUS_X + 10, STATUS_Y + 25, COL_TEXT_WHITE, 11);
    this._addText('Prepaid NXCash', STATUS_X + 10, STATUS_Y + 40, COL_TEXT_WHITE, 11);

    // Values (right-aligned at X=220 from status bar left)
    this._addText(String(this._nxCredit), STATUS_X + 220, STATUS_Y + 11, COL_TEXT_GOLD, 11);
    this._addText(String(this._maplePoints), STATUS_X + 220, STATUS_Y + 25, COL_TEXT_GOLD, 11);
    this._addText(String(this._nxPrepaid), STATUS_X + 220, STATUS_Y + 40, COL_TEXT_GOLD, 11);

    // OG button IDs: 1000=Charge, 1001=Check, 1002=Coupon, 1003=Exit
    // Buttons positioned at right side of status bar — use mouseOver state on hover
    const btnY = STATUS_Y;
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

    // Exit button
    const exitX = STATUS_X + 378;
    const exitHovered = this._hoveredBtn === 'exit';
    const exitSprite = exitHovered ? (this._btExitOver ?? this._btExit) : this._btExit;
    if (exitSprite) {
      this._drawWzSprite(exitSprite, exitX, btnY);
    }
  }

  // ── Tab bar (CCSWnd_Tab) — HORIZONTAL, TOP CENTER ──
  // OG: L=272, T=17, W=508, H=78
  // Uses CCtrlSelector (horizontal), NOT CCtrlTab
  // Each tab has a pre-rendered WZ canvas from CSTab/Tab/1-9
  private _drawTabBar(): void {
    // Each CSTab/Tab/N canvas is the complete 508x78 selector for category N.
    // The OG client draws one canvas, not nine overlaid tab fragments.
    const tabSprite = this._tabSprites[this._activeTab];
    if (tabSprite) this._drawWzSprite(tabSprite, TAB_X, TAB_Y);
  }

  // ── Item grid (CCSWnd_List) — CENTER, 2 columns × 5 rows ──
  // OG: L=275, T=95, W=412, H=430
  // 10 PICTURE_PLATE entries with (nX, nY, sUOL)
  // Each plate: 64×64 item icon area + name + price
  private _drawItemGrid(): void {
    const items = this._searchResults ?? this._getCurrentPageItems();
    const offset = this._page * PLATES_PER_PAGE;

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
            this._g.rect(px + 2, py + 2, PLATE_W - 4, PLATE_H - 4)
              .stroke({ color: COL_TEXT_GOLD, width: 1 });
          }

          // Item icon (OG: 64×64 area at plate+5,5 — left side)
          const icon = this._icons?.LoadIcon(item.itemId);
          if (icon) {
            const sp = this._createIcon(icon);
            sp.position.set(px + 5, py + 5);
            sp.scale.set(icon.Width > 64 ? 64 / icon.Width : 1);
          }

          // Item name (right of icon)
          this._addText(item.name.slice(0, 14), px + 70, py + 10, COL_TEXT_WHITE, 11);

          // Price
          const price = this._getSalePrice(item);
          this._addText(`${price} NX`, px + 70, py + 28, COL_TEXT_GOLD, 11);

          // Discount badge — use WZ digit sprites if available
          if (item.discountRate > 0) {
            if (this._discountBg) {
              this._drawWzSprite(this._discountBg, px + 70, py + 46);
            }
            // Draw discount percentage using digit sprites
            const rateStr = `-${item.discountRate}%`;
            let dx = px + 74;
            for (let ci = 0; ci < rateStr.length; ci++) {
              const ch = rateStr[ci];
              if (ch >= '0' && ch <= '9') {
                const digit = this._discountDigits[parseInt(ch)];
                if (digit) {
                  this._drawWzSprite(digit, dx, py + 47);
                  dx += digit.width;
                  continue;
                }
              }
              dx += 7;
            }
            this._addText(`${item.price}`, px + 124, py + 48, 0x888888, 9);
          }

          // Buy button (OG: CSList/BtBuy — 4 states)
          const buyX = px + PLATE_W - 40;
          const buyY = py + 52;
          const buyHovered = this._hoveredBtn === `buy_${plateIdx}`;
          const buySprite = buyHovered ? (this._btBuyOver ?? this._btBuy) : this._btBuy;
          if (buySprite) {
            this._drawWzSprite(buySprite, buyX, buyY);
          }

          // Gift button (OG: CSList/BtGift — 4 states)
          const giftX = px + PLATE_W - 40;
          const giftY = py + 26;
          const giftHovered = this._hoveredBtn === `gift_${plateIdx}`;
          const giftSprite = giftHovered ? (this._btGiftOver ?? this._btGift) : this._btGift;
          if (giftSprite) {
            this._drawWzSprite(giftSprite, giftX, giftY);
          }

          // Effect badges (OG: CSEffect — hot/new/sale)
          if (item.discountRate > 0 && this._effectSale) {
            this._drawWzSprite(this._effectSale, px + 2, py + 2);
          } else if (this._effectHot) {
            this._drawWzSprite(this._effectHot, px + 2, py + 2);
          } else if (this._effectNew) {
            this._drawWzSprite(this._effectNew, px + 2, py + 2);
          }
        }
      }
    }

    // Pagination — below item grid
    const totalPages = this._getTotalPages();
    const pageY = LIST_Y + LIST_H - 24;
    const pageCenterX = LIST_X + LIST_W / 2;

    // Prev button
    this._g.rect(pageCenterX - 60, pageY, 50, 20).fill({ color: this._page > 0 ? COL_TAB_ACTIVE : COL_TAB_INACTIVE });
    this._addText('< Prev', pageCenterX - 54, pageY + 4, COL_TEXT_WHITE, 10);

    // Page indicator
    this._addText(`${this._page + 1}/${totalPages}`, pageCenterX - 10, pageY + 4, COL_TEXT_DIM, 10);

    // Next button
    this._g.rect(pageCenterX + 20, pageY, 50, 20).fill({ color: this._page < totalPages - 1 ? COL_TAB_ACTIVE : COL_TAB_INACTIVE });
    this._addText('Next >', pageCenterX + 26, pageY + 4, COL_TEXT_WHITE, 10);
  }

  // ── One-a-Day panel (CCSWnd_OneADay) — CENTER, replaces item grid on tab 9 ──
  // OG: CCSWnd_OneADay (2944 bytes) — 3 columns × 4 rows of plates
  // Plate states: normal, big (selected), key-focus, no-item
  // 10 number digit canvases, countdown timer, state machine
  private _drawOneADay(): void {
    // Panel background — same area as item grid
    if (this._oneADayBase) this._drawWzSprite(this._oneADayBase, LIST_X + 3, LIST_Y + 3);

    // Title
    this._addText('One-a-Day', LIST_X + 140, LIST_Y + 8, COL_TEXT_GOLD, 13);

    // ── Today's item (large plate at top) ──
    const todayX = LIST_X + 10;
    const todayY = LIST_Y + 28;
    const todayW = LIST_W - 20;
    const todayH = 100;

      if (this._oneADayItemBox) this._drawWzSprite(this._oneADayItemBox, todayX, todayY);

    this._addText('Today\'s Item', todayX + 8, todayY + 4, COL_TEXT_DIM, 10);

    if (this._oneADayItemSN > 0) {
      // Look up commodity by SN
      const comm = this._commodities.find(c => c.sn === this._oneADayItemSN);
      if (comm) {
        // Item icon
        const icon = this._icons?.LoadIcon(comm.itemId);
        if (icon) {
          const sp = this._createIcon(icon);
          sp.position.set(todayX + 50, todayY + 50);
          sp.scale.set(icon.Width > 64 ? 64 / icon.Width : 1);
        }
        // Item name + price
        this._addText(comm.name, todayX + 80, todayY + 30, COL_TEXT_WHITE, 12);
        this._addText(`${comm.price} NX`, todayX + 80, todayY + 48, COL_TEXT_GOLD, 11);

        const buyX = todayX + todayW - 80;
        const buyY = todayY + 65;
        if (this._oneADayBuy) this._drawWzSprite(this._oneADayBuy, buyX, buyY);
        if (this._oneADayGift) this._drawWzSprite(this._oneADayGift, buyX, buyY - 22);
      } else {
        // SN exists but commodity not loaded yet
        this._addText(`Item SN: ${this._oneADayItemSN}`, todayX + 80, todayY + 40, COL_TEXT_DIM, 11);
      }
    } else {
      this._addText('No item available today.', todayX + 80, todayY + 40, COL_TEXT_DIM, 11);
    }

    // ── Previous items grid (3 columns × 3 rows) ──
    const gridStartY = todayY + todayH + 10;
    const gridCols = 3;
    const gridRows = 3;
    const gridPlateW = 120;
    const gridPlateH = 80;
    const gridColStep = gridPlateW + 14;
    const gridRowStep = gridPlateH + 10;
    const gridMaxPlates = gridCols * gridRows;

    this._addText('Previous Items', LIST_X + 10, gridStartY - 2, COL_TEXT_DIM, 10);

    for (let i = 0; i < gridMaxPlates; i++) {
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);
      const px = LIST_X + 10 + col * gridColStep;
      const py = gridStartY + 14 + row * gridRowStep;

      if (i < this._oneADayPrevItems.length) {
        const prev = this._oneADayPrevItems[i];
        const isSelected = i === this._oneADaySelected;

        // Plate background
        this._g.rect(px, py, gridPlateW, gridPlateH)
          .fill({ color: isSelected ? 0x1E2845 : COL_PLATE });
        this._g.rect(px, py, gridPlateW, gridPlateH)
          .stroke({ color: isSelected ? COL_TAB_BORDER_ACTIVE : COL_PLATE_BORDER, width: isSelected ? 2 : 1 });

        // Look up commodity
        const comm = this._commodities.find(c => c.sn === prev.sn);
        if (comm) {
          const icon = this._icons?.LoadIcon(comm.itemId);
          if (icon) {
            const sp = this._createIcon(icon);
            sp.position.set(px + gridPlateW / 2, py + 30);
            sp.scale.set(icon.Width > 40 ? 40 / icon.Width : 0.6);
          }
          this._addText(comm.name.slice(0, 12), px + 4, py + 55, COL_TEXT_WHITE, 8);
        } else {
          this._addText(`SN: ${prev.sn}`, px + 4, py + 30, COL_TEXT_DIM, 9);
        }

        // Date label
        if (prev.date > 0) {
          const d = new Date(prev.date * 1000);
          const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
          this._addText(dateStr, px + gridPlateW - 36, py + 4, COL_TEXT_DIM, 8);
        }
      } else {
        // Empty plate
        this._g.rect(px, py, gridPlateW, gridPlateH)
          .fill({ color: 0x0E112A, alpha: 0.5 });
        this._g.rect(px, py, gridPlateW, gridPlateH)
          .stroke({ color: COL_PLATE_BORDER, width: 1 });
      }
    }

    // ── Countdown timer at bottom ──
    const timerY = LIST_Y + LIST_H - 28;
    const { hours, minutes, seconds } = this._oneADayTimer;
    const timerStr = `Next item in: ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    this._addText(timerStr, LIST_X + 10, timerY, COL_TEXT_GREEN, 11);
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
          // OG Draw: name at (8, itemTop+36), font FONT_BASIC_BLACK
          this._addText(comm.name.slice(0, 10), BEST_X + 8, by + 36, COL_TEXT_WHITE, 8);
          // OG Draw: price at (8, itemTop+53), font FONT_BASIC_WHITE
          const price = this._getSalePrice(comm);
          this._addText(`${price} NX`, BEST_X + 8, by + 53, COL_TEXT_GOLD, 8);
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

    // OG: Inventory tab selector (equip/use/setup/etc) — horizontal tabs
    // For now, show the current tab type
    const tabNames = ['Equip', 'Use', 'Setup', 'Etc', 'Cash'];
    const tabX = INV_X + 4;
    const tabY = INV_Y + 28;
    const tabW = Math.floor(156 / tabNames.length);
    for (let i = 0; i < tabNames.length; i++) {
      const tx = tabX + i * tabW;
      const isActive = i === this._invItemTI;
      this._g.rect(tx, tabY, tabW, 14).fill({ color: isActive ? COL_TAB_ACTIVE : COL_TAB_INACTIVE });
      this._g.rect(tx, tabY, tabW, 14).stroke({ color: isActive ? COL_TAB_BORDER_ACTIVE : COL_PLATE_BORDER, width: 1 });
      this._addText(tabNames[i], tx + 2, tabY + 1, isActive ? COL_TEXT_WHITE : COL_TEXT_DIM, 8);
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
    this._inventoryScrollbar?.setRange(Math.max(0, items.length - 12) + 1);
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

      // Result count
      if (this._searchResults) {
        this._addText(`${this._searchResults.length} found`, SEARCH_X - 6, overlayY + 40, COL_TEXT_GREEN, 9);
      }
    }
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

    // Dialog box centered
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
    this._addText(`Item: ${this._giftItem.name}`, dlgX + 20, dlgY + 44, COL_TEXT_WHITE, 11);
    const price = this._getSalePrice(this._giftItem);
    this._addText(`Price: ${price} NX`, dlgX + 20, dlgY + 64, COL_TEXT_GOLD, 11);

    // Receiver name field
    this._addText('To:', dlgX + 20, dlgY + 96, COL_TEXT_WHITE, 11);
    const recvX = dlgX + 80;
    const recvY = dlgY + 90;
    const fieldW = dlgW - 100;
    const fieldH = 20;
    this._g.rect(recvX, recvY, fieldW, fieldH).fill({ color: 0x0A0E1A });
    this._g.rect(recvX, recvY, fieldW, fieldH).stroke({ color: this._giftEditingField === 1 ? COL_TAB_BORDER_ACTIVE : COL_PLATE_BORDER, width: 1 });
    const recvDisplay = this._giftReceiver + (this._giftEditingField === 1 ? '_' : '');
    this._addText(recvDisplay || 'Type receiver name...', recvX + 4, recvY + 4, this._giftReceiver ? COL_TEXT_WHITE : COL_TEXT_DIM, 11);

    // Message field
    this._addText('Message:', dlgX + 20, dlgY + 128, COL_TEXT_WHITE, 11);
    const msgX = dlgX + 100;
    const msgY = dlgY + 122;
    const msgH = 40;
    this._g.rect(msgX, msgY, fieldW - 20, msgH).fill({ color: 0x0A0E1A });
    this._g.rect(msgX, msgY, fieldW - 20, msgH).stroke({ color: this._giftEditingField === 2 ? COL_TAB_BORDER_ACTIVE : COL_PLATE_BORDER, width: 1 });
    const msgDisplay = this._giftMessage + (this._giftEditingField === 2 ? '_' : '');
    this._addText(msgDisplay || 'Type a message...', msgX + 4, msgY + 4, this._giftMessage ? COL_TEXT_WHITE : COL_TEXT_DIM, 11);

    // OK button
    const okX = dlgX + dlgW - 180;
    const okY = dlgY + dlgH - 36;
    this._g.rect(okX, okY, 80, 24).fill({ color: COL_TAB_ACTIVE });
    this._g.rect(okX, okY, 80, 24).stroke({ color: COL_TAB_BORDER_ACTIVE, width: 1 });
    this._addText('OK', okX + 30, okY + 5, COL_TEXT_WHITE, 11);

    // Cancel button
    const cancelX = dlgX + dlgW - 90;
    this._g.rect(cancelX, okY, 80, 24).fill({ color: 0x3C1A1A });
    this._g.rect(cancelX, okY, 80, 24).stroke({ color: 0x8B4444, width: 1 });
    this._addText('Cancel', cancelX + 20, okY + 5, COL_TEXT_WHITE, 11);
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

  // ═══════════════════════════════════════════════════════════════════════════
  // Input handling
  // ═══════════════════════════════════════════════════════════════════════════

  onKeyPress(key: string): void {
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
        this._searchResults = null;
        return;
      }
      if (key === 'Enter') {
        // Execute search — filter commodities by name
        const q = this._searchQuery.toLowerCase();
        if (q.length > 0) {
          this._searchResults = this._commodities.filter(c =>
            c.onSale && c.name.toLowerCase().includes(q),
          );
          this._page = 0;
          this._selectedPlate = -1;
          this._statusMessage = `Found ${this._searchResults.length} items`;
        } else {
          this._searchResults = null;
        }
        this._searchActive = false;
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

    if (key === 'Escape') { this._exit(); return; }
    // OG: CCSWnd_Tab — keys 1-9 switch tabs
    const num = parseInt(key);
    if (num >= 1 && num <= 9) {
      this._activeTab = num - 1;
      this._page = 0;
      this._selectedPlate = -1;
      this._searchResults = null;
      return;
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
      else if (lx >= STATUS_X + 378 && lx < STATUS_X + 546) this._hoveredBtn = 'exit';
    }

    // Inventory tab hover
    const tabNames = ['Equip', 'Use', 'Setup', 'Etc', 'Cash'];
    const tabW = Math.floor(156 / tabNames.length);
    for (let i = 0; i < tabNames.length; i++) {
      const tx = INV_X + 4 + i * tabW;
      if (lx >= tx && lx < tx + tabW && ly >= INV_Y + 28 && ly < INV_Y + 42) {
        this._hoveredBtn = `invTab_${i}`;
        break;
      }
    }

    // Buy/Gift buttons on plates
    if (this._activeTab !== 8) {
      const items = this._getCurrentPageItems();
      const offset = this._page * PLATES_PER_PAGE;
      for (let row = 0; row < PLATE_ROWS; row++) {
        for (let col = 0; col < PLATE_COLS; col++) {
          const plateIdx = row * PLATE_COLS + col;
          const absIdx = offset + plateIdx;
          if (absIdx >= items.length) continue;
          const px = LIST_X + col * PLATE_COL_W;
          const py = LIST_Y + row * PLATE_ROW_H + 2;
          const buyX = px + PLATE_W - 40;
          const buyY = py + 52;
          const giftY = py + 26;
          if (lx >= buyX && lx < buyX + 35 && ly >= buyY && ly < buyY + 20) {
            this._hoveredBtn = `buy_${plateIdx}`;
          } else if (lx >= buyX && lx < buyX + 35 && ly >= giftY && ly < giftY + 20) {
            this._hoveredBtn = `gift_${plateIdx}`;
          }
        }
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

    if (this._activeTab === 8 && this._oneADayItemSN > 0 && this._handleOneADayClick(lx, ly)) return;
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
      if (lx >= STATUS_X + 378 && lx < STATUS_X + 546) {
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

      // Receiver field click
      const recvX = dlgX + 80;
      const recvY = dlgY + 90;
      const fieldW = dlgW - 100;
      if (lx >= recvX && lx < recvX + fieldW && ly >= recvY && ly < recvY + 20) {
        this._giftEditingField = 1;
        return;
      }

      // Message field click
      const msgX = dlgX + 100;
      const msgY = dlgY + 122;
      if (lx >= msgX && lx < msgX + fieldW - 20 && ly >= msgY && ly < msgY + 40) {
        this._giftEditingField = 2;
        return;
      }

      // OK button click
      const okX = dlgX + dlgW - 180;
      const okY = dlgY + dlgH - 36;
      if (lx >= okX && lx < okX + 80 && ly >= okY && ly < okY + 24) {
        this._executeGift();
        return;
      }

      // Cancel button click
      const cancelX = dlgX + dlgW - 90;
      if (lx >= cancelX && lx < cancelX + 80 && ly >= okY && ly < okY + 24) {
        this._giftVisible = false;
        this._giftItem = null;
        this._giftEditingField = 0;
        return;
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

    // Exit button (OG: CCSWnd_Status nId=1003 — in status bar at bottom)
    const exitX = STATUS_X + 378;
    const exitY = STATUS_Y;
    if (lx >= exitX && lx < exitX + 168 && ly >= exitY && ly < exitY + 49) {
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
        const q = this._searchQuery.toLowerCase();
        if (q.length > 0) {
          this._searchResults = this._commodities.filter(c =>
            c.onSale && c.name.toLowerCase().includes(q),
          );
          this._page = 0;
          this._selectedPlate = -1;
          this._statusMessage = `Found ${this._searchResults.length} items`;
        } else {
          this._searchResults = null;
        }
        this._searchActive = false;
        return;
      }

      // Cancel button click
      if (lx >= SEARCH_X + 38 && lx < SEARCH_X + 78 && ly >= overlayY + 20 && ly < overlayY + 36) {
        this._searchActive = false;
        this._searchQuery = '';
        this._searchResults = null;
        return;
      }

      // Click outside search overlay dismisses
      if (lx < SEARCH_X - 10 || lx >= SEARCH_X + SEARCH_W + 10 || ly < overlayY - 4 || ly >= overlayY + 76) {
        this._searchActive = false;
        this._searchQuery = '';
        this._searchResults = null;
      }
    }

    // CCSWnd_Char avatar controls (IDs 1000-1002).
    if (ly >= CHAR_Y + 237 && ly < CHAR_Y + 256) {
      if (lx >= CHAR_X + 17 && lx < CHAR_X + 100) {
        this._statusMessage = 'Avatar purchase selected.';
        return;
      }
      if (lx >= CHAR_X + 101 && lx < CHAR_X + 184) {
        this._statusMessage = 'Default avatar selected.';
        return;
      }
      if (lx >= CHAR_X + 187 && lx < CHAR_X + 242) {
        this._statusMessage = 'Avatar take-off selected.';
        return;
      }
    }
    if (lx >= CHAR_X + CHAR_W - 36 && lx < CHAR_X + CHAR_W && ly >= CHAR_Y + 4 && ly < CHAR_Y + 27) {
      this._previewEnabled = !this._previewEnabled;
      return;
    }

    // Tab clicks (OG: CCSWnd_Tab — HORIZONTAL CCtrlSelector)
    const tabItemW = Math.floor(TAB_W / TAB_COUNT);
    for (let i = 0; i < TAB_COUNT; i++) {
      const tx = TAB_X + i * tabItemW;
      if (lx >= tx && lx < tx + tabItemW && ly >= TAB_Y && ly < TAB_Y + TAB_H) {
        this._activeTab = i;
        this._page = 0;
        this._selectedPlate = -1;
        this._searchResults = null;
        return;
      }
    }

    // One-a-Day plate clicks (tab 9)
    if (this._activeTab === 8 && this._oneADayItemSN > 0) {
      // Today's item "Free" buy button
      const todayX = LIST_X + 10;
      const todayY = LIST_Y + 28;
      const todayW = LIST_W - 20;
      const todayH = 100;
      const buyX = todayX + todayW - 80;
      const buyY = todayY + 65;
      if (lx >= buyX && lx < buyX + 70 && ly >= buyY && ly < buyY + 24) {
        if (this._oneADayItemSN > 0) {
          // OG: one-a-day items use CashShopFreeCashItem (sub-action 23), not CashShopBuy (sub-action 3)
          this.game?.session.send(GameSender.CashShopFreeCashItem(this._oneADayItemSN));
          this._statusMessage = 'Claiming free one-a-day item...';
        }
        return;
      }

      // Previous items grid clicks
      const gridStartY = todayY + todayH + 10 + 14;
      const gridCols = 3;
      const gridPlateW = 120;
      const gridPlateH = 80;
      const gridColStep = gridPlateW + 14;
      const gridRowStep = gridPlateH + 10;
      for (let i = 0; i < 9; i++) {
        const col = i % gridCols;
        const row = Math.floor(i / gridCols);
        const px = LIST_X + 10 + col * gridColStep;
        const py = gridStartY + row * gridRowStep;
        if (lx >= px && lx < px + gridPlateW && ly >= py && ly < py + gridPlateH) {
          if (i < this._oneADayPrevItems.length) {
            this._oneADaySelected = i;
          }
          return;
        }
      }
      return;
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
            // Buy button click (bottom-right of plate)
            if (lx >= px + PLATE_W - 40 && ly >= py + 50) {
              this._buyItem(items[absIdx]);
            }
            // Gift button click (top-right of plate)
            else if (lx >= px + PLATE_W - 40 && ly >= py + 24 && ly < py + 46) {
              this._onGiftClick(items[absIdx]);
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
            const tabIdx = cat >= 1 && cat <= 7 ? cat : 0;
            this._activeTab = tabIdx;
            this._page = 0;
            this._selectedPlate = -1;
            this._searchResults = null;
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

    // Pagination clicks — below item grid
    const pageY = LIST_Y + LIST_H - 24;
    const pageCenterX = LIST_X + LIST_W / 2;
    if (ly >= pageY && ly < pageY + 20) {
      if (lx >= pageCenterX - 60 && lx < pageCenterX - 10 && this._page > 0) {
        this._page--;
        this._selectedPlate = -1;
        return;
      }
      if (lx >= pageCenterX + 20 && lx < pageCenterX + 70) {
        const maxP = this._getTotalPages() - 1;
        if (this._page < maxP) { this._page++; this._selectedPlate = -1; }
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
      const item = this._lockerItems[this._lockerScroll * LOCKER_COLS];
      if (item) this.game?.session.send(GameSender.CashShopRebate(item.sn));
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

    // Inventory tab clicks (OG: CCSWnd_Inventory tab control)
    const tabNames = ['Equip', 'Use', 'Setup', 'Etc', 'Cash'];
    const tabW = Math.floor(156 / tabNames.length);
    for (let i = 0; i < tabNames.length; i++) {
      const tx = INV_X + 4 + i * tabW;
      if (lx >= tx && lx < tx + tabW && ly >= INV_Y + 28 && ly < INV_Y + 42) {
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

    const todayX = LIST_X + 10;
    const todayY = LIST_Y + 28;
    const todayW = LIST_W - 20;
    if (this._oneADayMode === 0) {
      const buyY = todayY + 65;
      if (lx >= todayX + todayW - 80 && lx < todayX + todayW - 10 && ly >= buyY && ly < buyY + 24) {
        const item = this._commodities.find(c => c.sn === this._oneADayItemSN);
        if (item) {
          this._buyPending = true;
          this._processBuy(item);
          this._statusMessage = `Buying ${item.name}...`;
        }
        return true;
      }
      if (lx >= todayX + todayW - 80 && lx < todayX + todayW - 10 && ly >= buyY - 22 && ly < buyY - 4) {
        const item = this._commodities.find(c => c.sn === this._oneADayItemSN);
        if (item) this._onGiftClick(item);
        return true;
      }
      return lx >= LIST_X && lx < LIST_X + LIST_W && ly >= LIST_Y && ly < LIST_Y + LIST_H;
    }

    const gridStartY = todayY + 100 + 10 + 14;
    const gridPlateW = 120;
    const gridPlateH = 80;
    for (let i = 0; i < 10; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const px = LIST_X + 10 + col * (gridPlateW + 14);
      const py = gridStartY + row * (gridPlateH + 10);
      if (lx >= px && lx < px + gridPlateW && ly >= py && ly < py + gridPlateH) {
        if (i < this._oneADayPrevItems.length) {
          this._oneADaySelected = i;
          const previous = this._oneADayPrevItems[i];
          const item = this._commodities.find(c => c.sn === previous.originalSn || c.sn === previous.sn);
          if (item) {
            this._buyPending = true;
            this._processBuy(item);
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
    this._giftEditingField = 1;
  }

  private _executeGift(): void {
    if (!this._giftItem || !this.game) return;

    // Validate receiver name
    if (this._giftReceiver.length === 0) {
      this._statusMessage = 'Please enter a receiver name.';
      return;
    }

    // Send the gift packet (sub-action 4)
    this.game.session.send(GameSender.CashShopSendGift(
      '',             // SPW (empty — not required for v95 client)
      this._giftItem.sn,
      false,          // requestBuyOneADay
      this._giftReceiver,
      this._giftMessage,
    ));

    this._statusMessage = `Gifting ${this._giftItem.name} to ${this._giftReceiver}...`;

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

    // Couple ring items (itemId/10000 == 910) → sub-action 18
    if (Math.floor(itemId / 10000) === 910) {
      this._coupleNameItem = item;
      this._coupleNameValue = '';
      this._activeDialog = 'coupleName';
      return;
    }

    // Package items (have packageSnList) → sub-action 19
    if (this._isPackage(sn)) {
      this.game?.session.send(GameSender.CashShopBuyPackage([sn]));
      return;
    }

    // Normal items in SN range [80000000..] → sub-action 21
    if (sn >= 80000000) {
      this.game?.session.send(GameSender.CashShopBuyNormal(1, [sn]));
      return;
    }

    // Friendship equip items (itemId/10000 == 193) → sub-action 22
    if (this._isFriendshipEquip(itemId)) {
      this._friendNameItem = item;
      this._friendNameValue = '';
      this._activeDialog = 'friendName';
      return;
    }

    // Character slot increment (itemId == 5000047) → sub-action 12
    if (this._isCharSlotInc(itemId)) {
      this.game?.session.send(GameSender.CashShopIncCharSlotCount());
      return;
    }

    // Character sale → opens character sale dialog
    if (this._isCharSale(itemId)) {
      // OG: CUICharacterSaleDlg — opens a separate dialog for character purchase
      // For now, send the buy request directly (server handles the dialog flow)
      this.game?.session.send(GameSender.CashShopBuy(sn));
      return;
    }

    // Equip slot extension (itemId/10000 == 506) → sub-action 14
    if (this._isEquipSlotExt(itemId)) {
      this._equipSlotExtItem = item;
      this._equipSlotExtBodyPart = 0;
      this._activeDialog = 'equipSlotExt';
      return;
    }

    // Slot increment (itemId/10000 == 504) → sub-action 10
    if (this._isSlotInc(itemId)) {
      // Determine inventory type from item subcategory
      const invType = Math.floor(itemId / 1000) % 10;
      this.game?.session.send(GameSender.CashShopIncSlotCount(invType));
      return;
    }

    // Name change item (itemId == 5390000)
    if (itemId === 5390000) {
      this._nameChangeItem = item;
      this._nameChangeNewName = '';
      this._activeDialog = 'nameChange';
      return;
    }

    // World transfer item (itemId == 5390088)
    if (itemId === 5390088) {
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

  /** Friendship equip items: itemId/10000 == 193. */
  private _isFriendshipEquip(itemId: number): boolean {
    return Math.floor(itemId / 10000) === 193;
  }

  /** Character slot increment: itemId == 5000047. */
  private _isCharSlotInc(itemId: number): boolean {
    return itemId === 5000047;
  }

  /** Character sale items. */
  private _isCharSale(itemId: number): boolean {
    // Character sale items are in the 5000051 range
    return itemId === 5000051 || itemId === 5000052;
  }

  /** Equip slot extension: itemId/10000 == 506. */
  private _isEquipSlotExt(itemId: number): boolean {
    return Math.floor(itemId / 10000) === 506;
  }

  /** Slot increment: itemId/10000 == 504. */
  private _isSlotInc(itemId: number): boolean {
    return Math.floor(itemId / 10000) === 504;
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
      case 0xAF: // PurchaseRecordResult
        this._statusMessage = args.available ? 'Item available for purchase' : 'Item not available';
        break;
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
    if (this._searchResults) return this._searchResults;
    return this._commodities.filter(c => {
      if (!c.onSale || !this._isSaleAvailable(c)) return false;

      // Tab 0 (New/Best) and Tab 8 (Popular) show all items
      if (this._activeTab === 0 || this._activeTab === 8) return true;

      // Tab 9 (One-a-Day) — filter by one-a-day flag (placeholder)
      if (this._activeTab === 8) return false;

      // Tab 1-7 filter by category
      return c.category === this._activeTab;
    });
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

  private _drawWzSprite(sprite: WzSprite, x: number, y: number): void {
    const s = sprite.ToPixi();
    s.position.set(x, y);
    this._root.addChild(s);
    this._dynamicIcons.push(s);
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
        return node instanceof WzCanvas ? this._loader!.Load(node) : null;
      } catch { return null; }
    };

    this._oneADayBase = tryLoadOneADay('CSOneADay/Base01');
    this._oneADayItemBox = tryLoadOneADay('CSOneADay/ItemBoxBig');
    this._oneADayBuy = tryLoadOneADay('CSOneADay/BtBuy/normal');
    this._oneADayGift = tryLoadOneADay('CSOneADay/BtGift/normal');

    // Background — OG: Base/backgrnd (800×600)
    this._bg = tryLoad('Base/backgrnd');

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

    // Discount digits 0-9 + bonus/line/backgrnd/total
    for (let i = 0; i <= 9; i++) {
      this._discountDigits[i] = tryLoad(`CSDiscount/${i}`);
    }
    this._discountBg = tryLoad('CSDiscount/backgrnd');
    this._discountBonus = tryLoad('CSDiscount/bonus');
    this._discountLine = tryLoad('CSDiscount/Line');
    this._discountTotal = tryLoad('CSDiscount/total');

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
