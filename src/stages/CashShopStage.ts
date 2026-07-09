import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { Stage, MouseButton } from '../app/Stage.js';
import { MapleClaudeGame } from '../MapleClaudeGame.js';
import { WzPackage } from '../wz/WzPackage.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzSprite } from '../render/WzSprite.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { GameSender } from '../net/senders/GameSender.js';
import { ItemIconLoader } from '../character/ItemIconLoader.js';
import { CashShopDecoder } from '../net/packet/CashShopDecoder.js';
import { CharLook } from '../character/CharLook.js';
import { AvatarCodec } from '../net/handlers/AvatarCodec.js';
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
// All positions are absolute screen pixels on 1024×768 canvas
const CS_W = 1024;
const CS_H = 768;

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
const TAB_COUNT = 10;

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
const LOCKER_COLS = 3;
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

// OG tab names (from StringPool — these are the sub-category labels)
const TAB_NAMES = [
  'New', 'Character', 'Equip', 'Hair/Face',
  'Pet', 'Others', 'Event', 'Package', 'Popular', 'One-a-Day',
];

// Colors (Graphics fallback)
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
  name: string;
  price: number;
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
}

export class CashShopStage extends Stage {
  private _ui: WzPackage | null;
  private _loader: WzTextureLoader | null = null;
  private _icons: ItemIconLoader | null = null;
  private _root: Container;
  private _g: Graphics;
  private _prevW: number;

  // ── Commodity data (from server) ──
  private _commodities: CashCommodity[] = [];
  private _bestItems: { category: number; gender: number; sn: number }[] = [];
  private _modifiedCommodities: ModifiedCommodityEntry[] = [];
  private _discountRates: Map<string, number> = new Map(); // key: "category:index" → rate%
  private _notSaleSNs: Set<number> = new Set();

  // ── UI state ──
  private _activeTab = 0;
  private _page = 0;
  private _nxCredit = 0;
  private _nxPrepaid = 0;
  private _maplePoints = 0;
  private _cashShopAuthorized = false;
  private _statusMessage = '';
  private _selectedPlate = -1;
  private _focusedPlate = -1;
  private _buyPending = false;
  private _playerLevel = 1;
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

  // ── Locker state ──
  private _lockerItems: { sn: number; itemId: number; name: string }[] = [];
  private _lockerScroll = 0;

  // ── One-a-Day state ──
  private _oneADayItemSN = 0;
  private _oneADayItemDate = 0;
  private _oneADayPrevItems: OneADayPrevItem[] = [];
  private _oneADayTimer = { hours: 0, minutes: 0, seconds: 0 };
  private _oneADayTimerAccum = 0;
  private _oneADaySelected = -1;

  // ── WZ assets (loaded from UI.nx/CashShop.img) ──
  private _bg: WzSprite | null = null;
  private _bgList: WzSprite | null = null;
  private _tabSprites: (WzSprite | null)[] = new Array(TAB_COUNT).fill(null);
  private _btCharge: WzSprite | null = null;
  private _btCheck: WzSprite | null = null;
  private _btCoupon: WzSprite | null = null;
  private _btExit: WzSprite | null = null;
  private _btBuy: WzSprite | null = null;
  private _btGift: WzSprite | null = null;
  private _effectHot: WzSprite | null = null;
  private _effectNew: WzSprite | null = null;
  private _effectSale: WzSprite | null = null;
  private _discountDigits: (WzSprite | null)[] = new Array(10).fill(null);
  private _discountBg: WzSprite | null = null;

  // Plate state canvases (normal, mouseOver, pressed, disabled)
  private _plateStateNormal: WzSprite | null = null;
  private _plateStateHover: WzSprite | null = null;
  private _plateStatePressed: WzSprite | null = null;
  private _plateStateDisabled: WzSprite | null = null;

  // Panel backgrounds (WZ)
  private _bgLocker: WzSprite | null = null;
  private _bgInventory: WzSprite | null = null;
  private _bgStatus: WzSprite | null = null;
  private _bgBest: WzSprite | null = null;

  // ── Dynamic text (recreated each frame) ──
  private _dynamicTexts: Text[] = [];
  private _dynamicIcons: Sprite[] = [];

  constructor(ui: WzPackage | null, prevW = 800) {
    super();
    this._ui = ui;
    this._prevW = prevW;
    this._root = new Container();
    this._g = new Graphics();
    this._root.addChild(this._g);
  }

  onEnter(game: MapleClaudeGame): void {
    super.onEnter(game);
    this._loader = new WzTextureLoader();
    this._icons = new ItemIconLoader(this._loader, game.wz.character, game.wz.item);
    this._loadAssets();
    this._wireHandlers(game);
    this._requestInitialData();
    this.mapRoot.addChild(this._root);
    this._root.x = Math.floor((this._prevW - CS_W) / 2);

    // Load WZ packages for character rendering
    const dir = game.wzDir ?? '/wz_client';
    const open = (name: string) => WzPackage.OpenBaseAsync(dir, name);
    const loadWz = async () => {
      try {
        this._charWz = game.wz.character ?? await open('Character');
        this._itemWz = game.wz.item ?? await open('Item');
        this._baseWz = game.wz.base ?? await open('Base');
      } catch (ex) { console.warn('CashShopStage: failed to load WZ for character preview', ex); }
    };
    loadWz();
  }

  onExit(): void {
    this._unwireHandlers();
    this._clearDynamic();
    for (const s of this._dynamicIcons) s.destroy();
    this._dynamicIcons = [];
    this._icons = null;
    this._loader?.Dispose();
    this._loader = null;
    this._charWz = null;
    this._itemWz = null;
    this._baseWz = null;
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
      this._statusMessage = args.result === 0
        ? `Transfer available (${args.worldNames.length} worlds)`
        : 'Transfer unavailable';
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

      // Build character preview from character data
      const stat = args.characterData?.characterStat;
      if (stat && args.characterData?.equipped) {
        const look = AvatarCodec.FromCharacterData(
          stat,
          args.characterData.equipped,
          args.characterData.equippedCash,
        );
        if (!this._charLook) {
          if (!this._charWz || !this._itemWz || !this._baseWz || !this._loader) return;
          this._charLook = new CharLook(stat.skin);
          this._charLook.Load(this._charWz, this._itemWz, this._baseWz, this._loader);
        }
        this._charLook.SetAvatar(look);
        this._charLook.StartAction('stand1');
      }

      // Decode best array
      this._bestItems = CashShopDecoder.decodeBestArray(args.best);

      // Store discount rates in a lookup map
      this._discountRates.clear();
      for (const dr of args.discountRates) {
        this._discountRates.set(`${dr.category}:${dr.index}`, dr.rate);
      }

      // Store not-sale serial numbers
      this._notSaleSNs = new Set(args.notSaleSNs);

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
          name: this._getItemName(itemId),
          price: m.data?.price ?? 0,
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
        });
      }
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
    const prefix = Math.floor(itemId / 1000000);
    const typeNames: Record<number, string> = { 1: 'Equip', 2: 'Use', 3: 'Setup', 4: 'Etc', 5: 'Cash' };
    return `${typeNames[prefix] ?? 'Item'} ${itemId}`;
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

    // Full background
    this._g.rect(0, 0, CS_W, CS_H).fill({ color: COL_BG });

    // Draw WZ background if available
    if (this._bg) {
      this._drawWzSprite(this._bg, 0, 0);
    }

    // Draw list background if available
    if (this._bgList) {
      this._drawWzSprite(this._bgList, LIST_X - 4, LIST_Y - 4);
    }

    this._drawCharacterPreview();
    this._drawTabBar();
    if (this._activeTab === 9) {
      this._drawOneADay();
    } else {
      this._drawItemGrid();
    }
    this._drawBestPanel();
    this._drawLockerPanel();
    this._drawInventoryPanel();
    this._drawStatusBar();
    this._drawSearchButton();
    this._drawStatusMessage();
    if (this._giftVisible) this._drawGiftDialog();
    if (this._confirmBuyVisible) this._drawConfirmBuy();
  }

  draw(): void {}

  onResize(windowW: number, _windowH: number): void {
    this._prevW = windowW;
    this._root.x = Math.floor((windowW - CS_W) / 2);
  }

  // ── Character preview (m_pLayer) — LEFT COLUMN ──
  // OG: L=0, T=0, W=256, H=316 — background + character rendering area
  private _drawCharacterPreview(): void {
    this._g.rect(CHAR_X, CHAR_Y, CHAR_W, CHAR_H).fill({ color: 0x0A0E1A });
    this._g.rect(CHAR_X, CHAR_Y, CHAR_W, CHAR_H).stroke({ color: COL_SEPARATOR, width: 1 });

    if (this._charLook) {
      // Update character animation
      this._charLook.Update(1 / 60, { x: 0, y: 0 }, false, false);
      // Rebuild body sprites and position at center of preview area
      this._charLook.RebuildDisplay();
      const container = this._charLook.container;
      container.position.set(CHAR_X + CHAR_W / 2, CHAR_Y + CHAR_H - 30);
      this._root.addChild(container);
    } else {
      this._addText('Character', CHAR_X + 80, CHAR_Y + 8, COL_TEXT_DIM, 10);
      this._addText('Preview', CHAR_X + 90, CHAR_Y + 150, COL_TEXT_DIM, 12);
    }
  }

  // ── Status bar (CCSWnd_Status) — BOTTOM CENTER ──
  // OG: L=254, T=530, W=545, H=56
  // Draw: 3 horizontal separator lines at Y=11/25/40, W=107 at X=120
  // Text: "NexonCash", "MaplePoint", "Prepaid NXCash" labels + values
  private _drawStatusBar(): void {
    // Background — use WZ sprite if available
    if (this._bgStatus) {
      this._drawWzSprite(this._bgStatus, STATUS_X, STATUS_Y);
    } else {
      this._g.rect(STATUS_X, STATUS_Y, STATUS_W, STATUS_H).fill({ color: 0x10141F });
      this._g.rect(STATUS_X, STATUS_Y, STATUS_W, STATUS_H).stroke({ color: COL_SEPARATOR, width: 1 });
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
    // Buttons positioned at right side of status bar
    const btnY = STATUS_Y + 20;
    const statusBtns = [
      { sprite: this._btCharge, x: STATUS_X + 350, label: 'Charge' },
      { sprite: this._btCheck, x: STATUS_X + 400, label: 'Check' },
      { sprite: this._btCoupon, x: STATUS_X + 450, label: 'Coupon' },
    ];
    for (const btn of statusBtns) {
      if (btn.sprite) {
        this._drawWzSprite(btn.sprite, btn.x, btnY);
      } else {
        this._g.rect(btn.x, btnY, 50, 18).fill({ color: COL_TAB_ACTIVE });
        this._g.rect(btn.x, btnY, 50, 18).stroke({ color: COL_TAB_BORDER_ACTIVE, width: 1 });
        this._addText(btn.label, btn.x + 4, btnY + 3, COL_TEXT_WHITE, 10);
      }
    }

    // Exit button
    const exitX = STATUS_X + STATUS_W - 40;
    if (this._btExit) {
      this._drawWzSprite(this._btExit, exitX, btnY);
    } else {
      this._g.rect(exitX, btnY, 30, 18).fill({ color: 0x8B0000 });
      this._g.rect(exitX, btnY, 30, 18).stroke({ color: 0xFF4444, width: 1 });
      this._addText('X', exitX + 10, btnY + 3, 0xFFFFFF, 12);
    }
  }

  // ── Tab bar (CCSWnd_Tab) — HORIZONTAL, TOP CENTER ──
  // OG: L=272, T=17, W=508, H=78
  // Uses CCtrlSelector (horizontal), NOT CCtrlTab
  // Each tab has a pre-rendered WZ canvas from CSTab/Tab/1-9
  private _drawTabBar(): void {
    // Background
    this._g.rect(TAB_X, TAB_Y, TAB_W, TAB_H).fill({ color: COL_PANEL });
    this._g.rect(TAB_X, TAB_Y, TAB_W, TAB_H).stroke({ color: COL_SEPARATOR, width: 1 });

    // Draw horizontal tab items
    const tabItemW = Math.floor(TAB_W / TAB_COUNT);
    for (let i = 0; i < TAB_COUNT; i++) {
      const tx = TAB_X + i * tabItemW;
      const isActive = i === this._activeTab;

      // Use WZ tab sprite if available
      const tabSprite = this._tabSprites[i];
      if (tabSprite) {
        this._drawWzSprite(tabSprite, tx, TAB_Y);
      } else {
        // Graphics fallback — horizontal tab
        this._g.rect(tx, TAB_Y, tabItemW, TAB_H).fill({ color: isActive ? COL_TAB_ACTIVE : COL_TAB_INACTIVE });
        this._g.rect(tx, TAB_Y, tabItemW, TAB_H).stroke({ color: isActive ? COL_TAB_BORDER_ACTIVE : COL_TAB_BORDER_INACTIVE, width: 1 });
      }

      // Tab label (centered in tab item)
      const labelW = TAB_NAMES[i].length * 7;
      this._addText(TAB_NAMES[i], tx + (tabItemW - labelW) / 2, TAB_Y + 30, isActive ? COL_TEXT_WHITE : COL_TEXT_DIM, 11);
    }
  }

  // ── Item grid (CCSWnd_List) — CENTER, 2 columns × 5 rows ──
  // OG: L=275, T=95, W=412, H=430
  // 10 PICTURE_PLATE entries with (nX, nY, sUOL)
  // Each plate: 64×64 item icon area + name + price
  private _drawItemGrid(): void {
    // Panel background
    this._g.rect(LIST_X, LIST_Y, LIST_W, LIST_H).fill({ color: COL_PANEL });
    this._g.rect(LIST_X, LIST_Y, LIST_W, LIST_H).stroke({ color: COL_SEPARATOR, width: 1 });

    const items = this._searchResults ?? this._getCurrentPageItems();
    const offset = this._page * PLATES_PER_PAGE;

    for (let row = 0; row < PLATE_ROWS; row++) {
      for (let col = 0; col < PLATE_COLS; col++) {
        const plateIdx = row * PLATE_COLS + col;
        const absIdx = offset + plateIdx;
        const px = LIST_X + col * PLATE_COL_W;
        const py = LIST_Y + row * PLATE_ROW_H;

        if (absIdx < items.length) {
          const item = items[absIdx];
          const isSelected = plateIdx === this._selectedPlate;
          const isFocused = plateIdx === this._focusedPlate;

          // Plate background — use WZ state canvas if available, else Graphics fallback
          const plateBg = isSelected ? (this._plateStateHover ?? this._plateStateNormal) : this._plateStateNormal;
          if (plateBg) {
            this._drawWzSprite(plateBg, px, py);
          } else {
            this._g.rect(px, py, PLATE_W, PLATE_H)
              .fill({ color: isSelected ? 0x1E2845 : COL_PLATE });
            this._g.rect(px, py, PLATE_W, PLATE_H)
              .stroke({ color: isSelected ? COL_TAB_BORDER_ACTIVE : COL_PLATE_BORDER, width: isSelected ? 2 : 1 });
          }

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
          const price = item.discountRate > 0 ? Math.floor(item.price * (100 - item.discountRate) / 100) : item.price;
          this._addText(`${price} NX`, px + 70, py + 28, COL_TEXT_GOLD, 11);

          // Discount badge — use WZ digit sprites if available
          if (item.discountRate > 0) {
            if (this._discountBg) {
              this._drawWzSprite(this._discountBg, px + 70, py + 46);
            } else {
              this._g.rect(px + 70, py + 46, 50, 14).fill({ color: 0xCC3333 });
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
              // Fallback: draw character as text
              this._addText(ch, dx, py + 48, 0xFFFFFF, 10);
              dx += 7;
            }
            this._addText(`${item.price}`, px + 124, py + 48, 0x888888, 9);
          }

          // Buy button (OG: CSList/BtBuy/normal)
          const buyX = px + PLATE_W - 40;
          const buyY = py + 52;
          if (this._btBuy) {
            this._drawWzSprite(this._btBuy, buyX, buyY);
          } else {
            this._g.rect(buyX, buyY, 35, 20).fill({ color: COL_TAB_ACTIVE });
            this._g.rect(buyX, buyY, 35, 20).stroke({ color: COL_TAB_BORDER_ACTIVE, width: 1 });
            this._addText('Buy', buyX + 8, buyY + 4, COL_TEXT_WHITE, 10);
          }

          // Gift button (OG: CSList/BtGift/normal)
          const giftX = px + PLATE_W - 40;
          const giftY = py + 26;
          if (this._btGift) {
            this._drawWzSprite(this._btGift, giftX, giftY);
          } else {
            this._g.rect(giftX, giftY, 35, 20).fill({ color: 0x2D4A1E });
            this._g.rect(giftX, giftY, 35, 20).stroke({ color: 0x4A8A2D, width: 1 });
            this._addText('Gift', giftX + 8, giftY + 4, COL_TEXT_GREEN, 10);
          }

          // Effect badges (OG: CSEffect — hot/new/sale)
          if (item.discountRate > 0 && this._effectSale) {
            this._drawWzSprite(this._effectSale, px + 2, py + 2);
          } else if (this._effectHot) {
            this._drawWzSprite(this._effectHot, px + 2, py + 2);
          } else if (this._effectNew) {
            this._drawWzSprite(this._effectNew, px + 2, py + 2);
          }
        } else {
          // Empty plate
          this._g.rect(px, py, PLATE_W, PLATE_H)
            .fill({ color: 0x0E112A, alpha: 0.6 });
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
    this._g.rect(LIST_X, LIST_Y, LIST_W, LIST_H).fill({ color: COL_PANEL });
    this._g.rect(LIST_X, LIST_Y, LIST_W, LIST_H).stroke({ color: COL_SEPARATOR, width: 1 });

    // Title
    this._addText('One-a-Day', LIST_X + 140, LIST_Y + 8, COL_TEXT_GOLD, 13);

    // ── Today's item (large plate at top) ──
    const todayX = LIST_X + 10;
    const todayY = LIST_Y + 28;
    const todayW = LIST_W - 20;
    const todayH = 100;

    // Background — selected/highlighted state
    this._g.rect(todayX, todayY, todayW, todayH).fill({ color: 0x1A2040 });
    this._g.rect(todayX, todayY, todayW, todayH).stroke({ color: COL_TAB_BORDER_ACTIVE, width: 2 });

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

        // Buy button
        const buyX = todayX + todayW - 80;
        const buyY = todayY + 65;
        this._g.rect(buyX, buyY, 70, 24).fill({ color: COL_TAB_ACTIVE });
        this._g.rect(buyX, buyY, 70, 24).stroke({ color: COL_TAB_BORDER_ACTIVE, width: 1 });
        this._addText('Free', buyX + 18, buyY + 5, COL_TEXT_GREEN, 11);
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
  // 5 items vertically stacked, each 90×68, step 69
  private _drawBestPanel(): void {
    if (this._bgBest) {
      this._drawWzSprite(this._bgBest, BEST_X, BEST_Y);
    } else {
      this._g.rect(BEST_X, BEST_Y, BEST_W, BEST_H).fill({ color: COL_PANEL });
      this._g.rect(BEST_X, BEST_Y, BEST_W, BEST_H).stroke({ color: COL_SEPARATOR, width: 1 });
    }
    this._addText('Best', BEST_X + 25, BEST_Y + 4, COL_TEXT_GOLD, 11);

    for (let i = 0; i < 5; i++) {
      const by = BEST_Y + 20 + i * BEST_STEP;
      this._g.rect(BEST_X + 2, by, BEST_W - 4, 64).fill({ color: COL_PLATE });
      this._g.rect(BEST_X + 2, by, BEST_W - 4, 64).stroke({ color: COL_PLATE_BORDER, width: 1 });

      if (i < this._bestItems.length) {
        const best = this._bestItems[i];
        const comm = this._commodities.find(c => c.sn === best.sn);
        if (comm) {
          const icon = this._icons?.LoadIcon(comm.itemId);
          if (icon) {
            const sp = this._createIcon(icon);
            sp.position.set(BEST_X + BEST_W / 2, by + 25);
            sp.scale.set(0.5);
          }
          this._addText(comm.name.slice(0, 10), BEST_X + 4, by + 50, COL_TEXT_WHITE, 8);
        }
      }
    }
  }

  // ── Locker (CCSWnd_Locker) — CENTERED BELOW PREVIEW ──
  // OG: L=-1 (centered), T=318, W=256, H=104
  private _drawLockerPanel(): void {
    if (this._bgLocker) {
      this._drawWzSprite(this._bgLocker, LOCKER_X, LOCKER_Y);
    } else {
      this._g.rect(LOCKER_X, LOCKER_Y, LOCKER_W, LOCKER_H).fill({ color: COL_PANEL });
      this._g.rect(LOCKER_X, LOCKER_Y, LOCKER_W, LOCKER_H).stroke({ color: COL_SEPARATOR, width: 1 });
    }
    this._addText('Cash Locker', LOCKER_X + 80, LOCKER_Y + 4, COL_TEXT_GOLD, 11);

    const startIdx = this._lockerScroll * LOCKER_COLS;
    for (let row = 0; row < LOCKER_ROWS; row++) {
      for (let col = 0; col < LOCKER_COLS; col++) {
        const idx = startIdx + row * LOCKER_COLS + col;
        const cx = LOCKER_X + 10 + col * LOCKER_COL_STEP;
        const cy = LOCKER_Y + 20 + row * LOCKER_COL_STEP;

        this._g.rect(cx, cy, LOCKER_CELL, LOCKER_CELL).fill({ color: COL_PLATE });
        this._g.rect(cx, cy, LOCKER_CELL, LOCKER_CELL).stroke({ color: COL_PLATE_BORDER, width: 1 });

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

    // Scroll arrows
    const arrowY = LOCKER_Y + LOCKER_H - 16;
    const maxScroll = Math.ceil(this._lockerItems.length / (LOCKER_COLS * LOCKER_ROWS)) - 1;
    const hasMoreDown = this._lockerScroll < maxScroll;
    this._g.rect(LOCKER_X + 10, arrowY, 40, 14).fill({ color: this._lockerScroll > 0 ? COL_TAB_ACTIVE : COL_TAB_INACTIVE });
    this._addText('▲', LOCKER_X + 24, arrowY + 1, COL_TEXT_WHITE, 10);
    this._g.rect(LOCKER_X + 60, arrowY, 40, 14).fill({ color: hasMoreDown ? COL_TAB_ACTIVE : COL_TAB_INACTIVE });
    this._addText('▼', LOCKER_X + 74, arrowY + 1, COL_TEXT_WHITE, 10);
  }

  // ── Inventory (CCSWnd_Inventory) — BOTTOM LEFT ──
  // OG: L=0, T=426, W=246, H=163
  private _drawInventoryPanel(): void {
    if (this._bgInventory) {
      this._drawWzSprite(this._bgInventory, INV_X, INV_Y);
    } else {
      this._g.rect(INV_X, INV_Y, INV_W, INV_H).fill({ color: COL_PANEL });
      this._g.rect(INV_X, INV_Y, INV_W, INV_H).stroke({ color: COL_SEPARATOR, width: 1 });
    }
    this._addText('Inventory', INV_X + 80, INV_Y + 4, COL_TEXT_GOLD, 11);

    // 4×3 grid of 35×35 cells
    for (let row = 0; row < INV_ROWS; row++) {
      for (let col = 0; col < INV_COLS; col++) {
        const cellIdx = row * INV_COLS + col;
        const cx = INV_X + 10 + col * INV_COL_STEP;
        const cy = INV_Y + 20 + row * INV_COL_STEP;
        const isSelected = cellIdx === this._selectedInvCell;
        this._g.rect(cx, cy, INV_CELL, INV_CELL).fill({ color: isSelected ? 0x1E2845 : COL_PLATE });
        this._g.rect(cx, cy, INV_CELL, INV_CELL).stroke({ color: isSelected ? COL_TAB_BORDER_ACTIVE : COL_PLATE_BORDER, width: isSelected ? 2 : 1 });
      }
    }
  }

  // ── Search button (CCSWnd_ItemSearch) — RIGHT COLUMN TOP ──
  // OG: L=690, T=97, W=89, H=22
  private _drawSearchButton(): void {
    this._g.rect(SEARCH_X, SEARCH_Y, SEARCH_W, SEARCH_H).fill({ color: COL_TAB_ACTIVE });
    this._g.rect(SEARCH_X, SEARCH_Y, SEARCH_W, SEARCH_H).stroke({ color: COL_TAB_BORDER_ACTIVE, width: 1 });
    this._addText('Search', SEARCH_X + 20, SEARCH_Y + 5, COL_TEXT_WHITE, 11);

    // Search overlay — input field when search is active
    if (this._searchActive) {
      const overlayY = SEARCH_Y + SEARCH_H + 4;
      this._g.rect(SEARCH_X, overlayY, SEARCH_W, 20).fill({ color: 0x0A0E1A });
      this._g.rect(SEARCH_X, overlayY, SEARCH_W, 20).stroke({ color: COL_TAB_BORDER_ACTIVE, width: 1 });
      this._addText(this._searchQuery + '_', SEARCH_X + 4, overlayY + 4, COL_TEXT_WHITE, 11);
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
    const dlgW = 400;
    const dlgH = 260;
    const dlgX = Math.floor((CS_W - dlgW) / 2);
    const dlgY = Math.floor((CS_H - dlgH) / 2);

    // Dialog background
    this._g.rect(dlgX, dlgY, dlgW, dlgH).fill({ color: 0x0E1226 });
    this._g.rect(dlgX, dlgY, dlgW, dlgH).stroke({ color: COL_TAB_BORDER_ACTIVE, width: 2 });

    // Title
    this._addText('Gift Item', dlgX + 160, dlgY + 12, COL_TEXT_GOLD, 14);

    // Item name and price
    this._addText(`Item: ${this._giftItem.name}`, dlgX + 20, dlgY + 44, COL_TEXT_WHITE, 11);
    const price = this._giftItem.discountRate > 0
      ? Math.floor(this._giftItem.price * (100 - this._giftItem.discountRate) / 100)
      : this._giftItem.price;
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
    const price = commodity.discountRate > 0
      ? Math.floor(commodity.price * (100 - commodity.discountRate) / 100)
      : commodity.price;

    // Semi-transparent overlay
    this._g.rect(0, 0, CS_W, CS_H).fill({ color: 0x000000, alpha: 0.5 });

    // Dialog box centered
    const dlgW = 340;
    const dlgH = 260;
    const dlgX = Math.floor((CS_W - dlgW) / 2);
    const dlgY = Math.floor((CS_H - dlgH) / 2);

    // Dialog background
    this._g.rect(dlgX, dlgY, dlgW, dlgH).fill({ color: 0x0E1226 });
    this._g.rect(dlgX, dlgY, dlgW, dlgH).stroke({ color: COL_TAB_BORDER_ACTIVE, width: 2 });

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
    const payH = 24;
    const payStartY = dlgY + 84;
    const payStep = 30;

    const payLabels = ['NX Credit', 'Maple Point', 'Prepaid NX'];
    const payAvail = [
      commodity.price <= this._nxCredit,                                      // NX Credit
      acceptsMaplePoint && commodity.price <= this._maplePoints,              // Maple Point
      commodity.price <= this._nxPrepaid,                                     // Prepaid NX
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
      this._g.circle(radioX, radioY, 6).stroke({ color: isAvail ? COL_TEXT_WHITE : 0x666666, width: 1 });
      if (isSelected) {
        this._g.circle(radioX, radioY, 3).fill({ color: isAvail ? COL_TEXT_GREEN : 0x666666 });
      }

      // Label
      const textColor = !isAvail ? 0x666666 : isSelected ? COL_TEXT_GREEN : COL_TEXT_WHITE;
      this._addText(payLabels[i], payX + 20, py + 5, textColor, 11);

      // Balance display on right side
      this._addText(`${payBalances[i]}`, payX + payW - 80, py + 5, isAvail ? COL_TEXT_DIM : 0x555555, 10);
    }

    // OK button
    const okX = dlgX + 40;
    const okY = dlgY + dlgH - 40;
    this._g.rect(okX, okY, 100, 28).fill({ color: COL_TAB_ACTIVE });
    this._g.rect(okX, okY, 100, 28).stroke({ color: COL_TAB_BORDER_ACTIVE, width: 1 });
    this._addText('OK', okX + 40, okY + 7, COL_TEXT_WHITE, 12);

    // Cancel button
    const cancelX = dlgX + dlgW - 140;
    this._g.rect(cancelX, okY, 100, 28).fill({ color: 0x3C1A1A });
    this._g.rect(cancelX, okY, 100, 28).stroke({ color: 0x8B4444, width: 1 });
    this._addText('Cancel', cancelX + 24, okY + 7, COL_TEXT_WHITE, 12);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Input handling
  // ═══════════════════════════════════════════════════════════════════════════

  onKeyPress(key: string): void {
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
          const payAvail = [
            comm.price <= this._nxCredit,
            acceptsMaplePoint && comm.price <= this._maplePoints,
            comm.price <= this._nxPrepaid,
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
          const payAvail = [
            comm.price <= this._nxCredit,
            acceptsMaplePoint && comm.price <= this._maplePoints,
            comm.price <= this._nxPrepaid,
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

  onMouseButton(x: number, y: number, down: boolean, _button: MouseButton): void {
    if (!down) return;
    const lx = x - this._root.x;
    const ly = y;

    // Gift dialog click handling
    if (this._giftVisible) {
      const dlgW = 400;
      const dlgH = 260;
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
      const dlgW = 340;
      const dlgH = 260;
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
      const payH = 24;
      const payStartY = dlgY + 84;
      const payStep = 30;
      const comm = this._confirmBuyItem;
      const payAvail = [
        this._nxCredit >= (comm?.price ?? 0),
        this._maplePoints >= (comm?.price ?? 0) && (comm?.onSaleFlag ?? 0) !== 2,
        this._nxPrepaid >= (comm?.price ?? 0),
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
      const okX = dlgX + 40;
      const okY = dlgY + dlgH - 40;
      if (lx >= okX && lx < okX + 100 && ly >= okY && ly < okY + 28) {
        this._executeBuy();
        return;
      }

      // Cancel button (bottom-right area)
      const cancelX = dlgX + dlgW - 140;
      if (lx >= cancelX && lx < cancelX + 100 && ly >= okY && ly < okY + 28) {
        this._confirmBuyVisible = false;
        this._confirmBuyItem = null;
        return;
      }

      // Click elsewhere in dialog → consume
      return;
    }

    // Exit button (OG: CCSWnd_Status nId=1003 — in status bar at bottom)
    const exitX = STATUS_X + STATUS_W - 40;
    const exitY = STATUS_Y + 20;
    if (lx >= exitX && lx < exitX + 30 && ly >= exitY && ly < exitY + 18) {
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

    // Search overlay input area — click outside dismisses
    if (this._searchActive) {
      const overlayY = SEARCH_Y + SEARCH_H + 4;
      if (lx < SEARCH_X || lx >= SEARCH_X + SEARCH_W || ly < overlayY || ly >= overlayY + 20) {
        this._searchActive = false;
        this._searchQuery = '';
        this._searchResults = null;
      }
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
    if (this._activeTab === 9) {
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
        const py = LIST_Y + row * PLATE_ROW_H;
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
        const cx = LOCKER_X + 10 + col * LOCKER_COL_STEP;
        const cy = LOCKER_Y + 20 + row * LOCKER_COL_STEP;
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
          const maxScroll = Math.ceil(this._lockerItems.length / (LOCKER_COLS * LOCKER_ROWS)) - 1;
          if (this._lockerScroll < maxScroll) this._lockerScroll++;
        }
        return;
      }
    }

    // Inventory cell clicks
    for (let row = 0; row < INV_ROWS; row++) {
      for (let col = 0; col < INV_COLS; col++) {
        const cx = INV_X + 10 + col * INV_COL_STEP;
        const cy = INV_Y + 20 + row * INV_COL_STEP;
        if (lx >= cx && lx < cx + INV_CELL && ly >= cy && ly < cy + INV_CELL) {
          this._selectedInvCell = row * INV_COLS + col;
          return;
        }
      }
    }
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
    if (!commodity || !commodity.onSale) {
      this._statusMessage = 'Item not found or not for sale.';
      return;
    }

    // Level restriction (OG: nReqLevel check)
    if (commodity.reqLevel > 0 && this._playerLevel < commodity.reqLevel) {
      this._statusMessage = 'Character level too low.';
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
    const canAfford = commodity.price <= this._nxCredit
      || (acceptsMaplePoint && commodity.price <= this._maplePoints)
      || commodity.price <= this._nxPrepaid;
    if (!canAfford) {
      this._statusMessage = 'Not enough NX.';
      return;
    }

    // Determine which payment types are available
    // NX Credit: always if balance > 0
    // Maple Point: available unless limit === 2
    // Prepaid NX: always if balance > 0

    // Auto-select the first available payment type
    if (commodity.price <= this._nxCredit) {
      this._confirmBuyPaymentType = 0; // NX Credit
    } else if (acceptsMaplePoint && commodity.price <= this._maplePoints) {
      this._confirmBuyPaymentType = 1; // Maple Point
    } else if (commodity.price <= this._nxPrepaid) {
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
      // TODO: open couple-name dialog, then send CashShopCouple(sn, name)
      this.game?.session.send(GameSender.CashShopCouple(sn, ''));
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
      // TODO: open friend-name dialog, then send CashShopFriendShip(sn, name)
      this.game?.session.send(GameSender.CashShopFriendShip(sn, ''));
      return;
    }

    // Character slot increment (itemId == 5000047) → sub-action 12
    if (this._isCharSlotInc(itemId)) {
      this.game?.session.send(GameSender.CashShopIncCharSlotCount());
      return;
    }

    // Character sale → opens character sale dialog
    if (this._isCharSale(itemId)) {
      // TODO: open CUICharacterSaleDlg
      this._statusMessage = 'Character sale not yet implemented.';
      this._buyPending = false;
      return;
    }

    // Equip slot extension (itemId/10000 == 506) → sub-action 14
    if (this._isEquipSlotExt(itemId)) {
      // TODO: open body-part picker dialog, then send CashShopEnableEquipSlotExt(bodyPart, days)
      this.game?.session.send(GameSender.CashShopEnableEquipSlotExt(0, 0));
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
      // TODO: open CUINameChangeDlg, which then sends NameChange(itemId, newName)
      this._statusMessage = 'Name change not yet implemented.';
      this._buyPending = false;
      return;
    }

    // World transfer item (itemId == 5390088)
    if (itemId === 5390088) {
      // TODO: open CUIWorldTransferDlg, which then sends the transfer
      this._statusMessage = 'World transfer not yet implemented.';
      this._buyPending = false;
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
      case 0x5A: this._statusMessage = `${args.giftCount} gifts loaded`; break;
      case 0x64: this._buyPending = false; this._statusMessage = 'Purchase complete!'; break;
      case 0x6D: this._statusMessage = `Inventory expanded to ${args.newSlotCount}`; break;
      case 0x6F: this._statusMessage = `Storage expanded to ${args.trunkCount}`; break;
      case 0x77: this._statusMessage = 'Item moved to locker'; break;
      case 0x79: this._statusMessage = 'Item moved to inventory'; break;
      case 0x9A: this._buyPending = false; this._statusMessage = `Package: ${args.itemCount} items`; break;
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
      if (!c.onSale) return false;

      // Tab 0 (New/Best) and Tab 8 (Popular) show all items
      if (this._activeTab === 0 || this._activeTab === 8) return true;

      // Tab 9 (One-a-Day) — filter by one-a-day flag (placeholder)
      if (this._activeTab === 9) return false;

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
    // CashShop.img is an NxImage — access children via Root.Items
    const cs = this._ui.GetItem('CashShop.img') as any;
    if (!cs) return;
    const rootItems = (cs.Root as any)?.Items as Record<string, unknown> | undefined;
    if (!rootItems) return;

    const tryLoad = (path: string): WzSprite | null => {
      try {
        // Navigate nested paths: "Base/backgrnd" → rootItems["Base"].Items["backgrnd"]
        const parts = path.split('/');
        let node: any = rootItems[parts[0]];
        for (let i = 1; i < parts.length && node; i++) {
          node = (node as any).Items?.[parts[i]];
        }
        return node instanceof WzCanvas ? this._loader!.Load(node) : null;
      } catch { return null; }
    };

    // Backgrounds
    this._bg = tryLoad('Base/backgrnd');

    // Tab sprites: CSTab/Tab/1 through CSTab/Tab/9
    // Tab canvases: OG mapping 8->1, 9->9, 10->1, else nTab+1
    for (let i = 0; i < TAB_COUNT; i++) {
      const canvasIdx = (i === 8) ? 1 : (i === 9) ? 9 : i + 1;
      this._tabSprites[i] = tryLoad(`CSTab/Tab/${canvasIdx}`);
    }

    // Status bar buttons (normal state)
    this._btCharge = tryLoad('CSStatus/BtCharge/normal');
    this._btCheck = tryLoad('CSStatus/BtCheck/normal');
    this._btCoupon = tryLoad('CSStatus/BtCoupon/normal');
    this._btExit = tryLoad('CSStatus/BtExit/normal');

    // Buy/Gift buttons (normal state)
    this._btBuy = tryLoad('CSList/BtBuy/normal');
    this._btGift = tryLoad('CSList/BtGift/normal');

    // List background
    this._bgList = tryLoad('CSList/Base');

    // Item effects (badges)
    this._effectHot = tryLoad('CSEffect/hot/0');
    this._effectNew = tryLoad('CSEffect/new/0');
    this._effectSale = tryLoad('CSEffect/sale/0');

    // Discount digits 0-9
    for (let i = 0; i <= 9; i++) {
      this._discountDigits[i] = tryLoad(`CSDiscount/${i}`);
    }
    this._discountBg = tryLoad('CSDiscount/backgrnd');

    // Plate state canvases (0=normal, 1=mouseOver, 2=pressed, 3=disabled)
    this._plateStateNormal = tryLoad('CSList/state/0');
    this._plateStateHover = tryLoad('CSList/state/1');
    this._plateStatePressed = tryLoad('CSList/state/2');
    this._plateStateDisabled = tryLoad('CSList/state/3');

    // Panel backgrounds
    this._bgLocker = tryLoad('CSLocker/Base');
    this._bgInventory = tryLoad('CSInventory/Base');
    this._bgStatus = tryLoad('CSStatus/Base');
    this._bgBest = tryLoad('CSBest/Base');
  }
}
