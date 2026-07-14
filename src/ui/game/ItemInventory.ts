import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import type { DragTarget } from '../DragController.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { ItemIconLoader } from '../../character/ItemIconLoader.js';
import type { InventoryOpArg } from '../../net/handlers/PacketArgs.js';
import type { EquipStats } from '../../domain/InventoryItem.js';
import { InventoryType } from '../../domain/InventoryItem.js';
import { TooltipAssets } from './TooltipAssets.js';
import { ItemTooltip } from './ItemTooltip.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { Button } from '../Button.js';
import { AnimatedSprite } from '../../render/AnimatedSprite.js';
import { ScrollBar } from './ScrollBar.js';

const COLS = 4;
// OG CUIItem::GetItemSlotRect (0x7cbe90): col += 4 * (row / 6)
// 2 blocks of 4 cols → max col = 8. All 48 slots fit in FULL_PANEL_W=594.
const FULL_COLS = 8;
const OG_EXTENDED_SLOTS = 96;
const ROWS = 6;
const SLOT_W = 32;
const SLOT_H = 32;
const SLOT_STEP_X = 36;
const SLOT_STEP_Y = 35;
const PANEL_W = 172;
// OG: CUIItem::Toggle creates extended window at 594 wide (FullBackgrnd WZ width)
const FULL_PANEL_W = 594;
const PANEL_H = 293;
const GRID_X = 10;
const GRID_Y = 51;
const THROWING_STAR_PREFIX = 207;
const BULLET_PREFIX = 233;
const TAB_X = 8;
const TAB_Y = 25;
const TAB_GAP = 1;
const CLOSE_X_COLLAPSED = 150;
const CLOSE_X_EXPANDED = FULL_PANEL_W - 20; // right edge of extended panel

const TAB_NAMES = ['Equip', 'Use', 'Setup', 'Etc', 'Cash'];
const TAB_COLORS = ['#5A825A', '#5A5AA0', '#826E46', '#646464', '#965096'];

// OG: CUIItem::SetItemTI swaps tabs 2↔3. Visual tab index → server invType:
// tab 0→1, tab 1→2, tab 2→4, tab 3→3, tab 4→5
const TAB_TO_INVTYPE = [1, 2, 4, 3, 5];
// Reverse: server invType → visual tab index (for applyOps routing)
// invType 3→tab 2 (Setup/Install), invType 4→tab 3 (Etc) — matches the swap
const INVTYPE_TO_TAB: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };

const _labelStyle = new TextStyle({ fill: '#CCC', fontSize: 10, fontFamily: 'monospace' });
const _titleStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });

export class InvItem {
  constructor(public id: number, public name = '', public quantity = 1, public tab = 0, public slot = 0) { }
  petLevel?: number;
  petTameness?: number;
  petRepleteness?: number;
  petRemainLife?: number;
  equipStats?: EquipStats;
  /** OG: CItemInfo::IsCashItem — true for cash items (info/cash != 0) */
  cash = false;
}

// OG: CDraggableItem's drop payload — TODO_AUDIT.md item-drag-and-drop TODO.
export interface ItemDragPayload { itemId: number; slotPos: number; invType: number; }

// OG class: CUIItem (TSingleton<CUIItem>, RTTI ms_RTTI_CUIItem; vtable
// referenced throughout CDraggableItem methods alongside CUIEquip).
export class ItemInventory extends GamePanel implements DragTarget {
  private _items: InvItem[] = [];
  private _slots = new Map<string, InvItem>(); // key = "${invType}-${pos}"
  private _bg: Graphics;
  // OG: 3 background layers per mode (collapsed + extended = 6 canvases total).
  // backgrnd/FullBackgrnd = panel frame, backgrnd2/FullBackgrnd2 = content area,
  // backgrnd3/FullBackgrnd3 = item slot grid area.
  private _wzBg1: WzSprite | null = null;  // backgrnd / FullBackgrnd
  private _wzBg2: WzSprite | null = null;  // backgrnd2 / FullBackgrnd2
  private _wzBg3: WzSprite | null = null;  // backgrnd3 / FullBackgrnd3
  private _wzFullBg1: WzSprite | null = null;
  private _wzFullBg2: WzSprite | null = null;
  private _wzFullBg3: WzSprite | null = null;
  private _wzDisabled: WzSprite | null = null;
  private _wzActiveIcon: WzSprite | null = null;
  private _titleText: Text;
  private _tabBgs: Graphics[] = [];
  private _tabSprites: Sprite[] = [];
  private _wzTabEnabled: (WzSprite | null)[] = new Array(5).fill(null);
  private _wzTabDisabled: (WzSprite | null)[] = new Array(5).fill(null);
  private _tabWidths: number[] = [31, 31, 31, 31, 31];
  private _tabLabels: Text[] = [];
  private _slotBgs: Container[] = [];
  private _slotLabels: Text[] = [];
  private _slotQtys: Text[] = [];
  private _activeTab = 0;
  private _extended = false;
  private _activeUseSlot = 0;
  private _activeProjectileWeaponType = 0;
  // OG: m_anSortBtState[6] — indexed by server invType (1-5), not visual tab.
  private _arrangeState = [0, 0, 0, 0, 0, 0];
  private _scrollOffset = [0, 0, 0, 0, 0];
  // OG: CUIItem::ms_anItemScrollPos[6] — persisted scroll position per server invType.
  // Restored when switching tabs; updated when scrollbar moves.
  private _itemScrollPos = [0, 0, 0, 0, 0, 0];
  private _hoverItem: InvItem | null = null;
  private _lastClickKey = '';
  private _lastClickTime = 0;
  private _mouseX = 0;
  private _mouseY = 0;
  private _viewW = 800;
  private _viewH = 600;

  private _tooltip: ItemTooltip | null;
  private _btFull: Button | null = null;
  private _btSmall: Button | null = null;
  private _btCashshop: Button | null = null;
  private _btCoin: Button | null = null;
  private _btGather: Button | null = null;
  private _btSort: Button | null = null;
  private _allButtons: Button[] = [];
  private _effectLayer = new Container();
  private _newTabOther: AnimatedSprite | null = null;
  private _newTabCurrent: AnimatedSprite | null = null;
  private _newInventory: AnimatedSprite | null = null;
  private _loader: WzTextureLoader | null = null;
  private _uiWz: WzPackage | null = null;
  private _releaseEffectNode: unknown = null;
  private _latestItem: { itemId: number; tab: number; slot: number } | null = null;
  private _releaseEffects: { slot: number; anim: AnimatedSprite; elapsedMs: number }[] = [];
  private _scrollBar: ScrollBar | null = null;
  // OG: WZ item root property — stored for button recreation on toggle.
  private _itemWzRoot: WzProperty | null = null;
  // WZ root used for arrange buttons (may differ from _itemWzRoot if fallback).
  private _arrangeWzRoot: WzProperty | null = null;
  // OG: CUIItem meso display — drawn at y=268, right-aligned, using FONT_NO_BLACK_SMALL.
  private _mesoText: Text;
  private _mesoAmount = 0;
  // OG: CUIItem item-release state (scissors/white scroll flow)
  // m_bTryToReleaseItem / m_nReleaseUItemPos at offsets +0B6C / +0B70
  private _tryToReleaseItem = false;
  private _releaseUseSlot = -1;
  // OG: m_pImgFontNumber — WZ image font digits "0"-"9" for item count rendering.
  // Loaded from UIWindow2.img/Item/number (digit canvases "0"-"9").
  private _imgFontDigits: (WzSprite | null)[] = [];
  // Pooled sprites for WZ-rendered quantity digits per slot
  private _qtyDigitSprites: Map<number, Sprite[]> = new Map();

  /** Resolves an item id to a display name. Called when adding items. */
  nameOf: (id: number) => string = (id) => `[${id}]`;

  /** Double-clicked an item in the Cash tab — caller equips/activates the item (pets, etc.). */
  onActivateCashItem: ((item: InvItem) => void) | null = null;
  /** Double-clicked an item in the Equip tab — caller sends ChangeSlotPosition with newPos<0. */
  onEquipItem: ((item: InvItem) => void) | null = null;
  /** Double-clicked an item in the Use tab — caller sends UseItem. */
  onUseItem: ((item: InvItem) => void) | null = null;
  /** Double-clicked an item in the Setup tab (visual tab 2, server TI=4). */
  onSetupItem: ((item: InvItem) => void) | null = null;
  /** Double-clicked an item in the Etc tab (visual tab 3, server TI=3). */
  onEtcItem: ((item: InvItem) => void) | null = null;
  /** Single-clicked any item — used by other panels (e.g. TradingRoom) that
      want a "select here, click destination there" cross-panel flow. */
  onItemSelected: ((item: InvItem) => void) | null = null;
  onCashShop: ((itemTI: number) => void) | null = null;
  onDropMoney: (() => void) | null = null;
  onGather: ((invType: number) => void) | null = null;
  onSort: ((invType: number) => void) | null = null;
  /** OG: CUIItem::ItemRelease → CWvsContext::SendItemReleaseRequest(useSlot, equipSlot) */
  onItemRelease: ((useSlot: number, equipSlot: number) => void) | null = null;
  // OG: CInputSystem::SetCursorState(14) for release cursor, 0 for normal.
  onCursorChange: ((state: number) => void) | null = null;
  /** Shift+click on stackable item → split off `qty` items to an empty slot. */
  onSplitItem: ((item: InvItem, qty: number) => void) | null = null;
  // OG: CDraggableItem::OnDoubleClicked/PutItem — TODO_AUDIT.md's
  // item-drag-and-drop TODO (no inventory-item drag existed at all; the
  // already-built GoldHammer/KarmaScissors/ItemProtector/megaphone-compose
  // dialogs had no way to receive a dropped item). Mirrors
  // SkillBook.onDragStart's exact convention.
  onDragStart: ((payload: ItemDragPayload, texture: Texture, x: number, y: number) => void) | null = null;
  private _icons: ItemIconLoader | null = null;

  constructor(opts: {
    loader?: WzTextureLoader,
    uiWz?: WzPackage | null,
    font?: BuiltInFont | null,
    icons?: ItemIconLoader | null,
    descOf?: (itemId: number) => string | null,
  } = {}) {
    super();
    this._root.visible = false;
    this._root.x = 370;
    this._root.y = 50;

    this._icons = opts.icons ?? null;
    this._loader = opts.loader ?? null;
    this._uiWz = opts.uiWz ?? null;
    if (opts.font && opts.icons) {
      const assets = new TooltipAssets(opts.loader ?? new WzTextureLoader(), opts.uiWz ?? null);
      this._tooltip = new ItemTooltip(opts.font, opts.icons, assets, opts.descOf ?? null);
    } else {
      this._tooltip = null;
    }

    // Try WZ background first — load all 3 layers per mode
    const itemProp = opts.uiWz?.GetItem('UIWindow2.img/Item');
    const itemRoot = itemProp instanceof WzProperty ? itemProp : null;
    this._itemWzRoot = itemRoot;
    const loadCanvas = (name: string): WzSprite | null => {
      const node = itemRoot?.Get(name);
      return node instanceof WzCanvas ? (opts.loader?.Load(node) ?? null) : null;
    };
    // Collapsed layers
    this._wzBg1 = loadCanvas('backgrnd');
    this._wzBg2 = loadCanvas('backgrnd2');
    this._wzBg3 = loadCanvas('backgrnd3');
    // Extended layers
    this._wzFullBg1 = loadCanvas('FullBackgrnd');
    this._wzFullBg2 = loadCanvas('FullBackgrnd2');
    this._wzFullBg3 = loadCanvas('FullBackgrnd3');
    if (opts.loader && itemRoot) {
      this._wzDisabled = loadCanvas('disabled');
      this._wzActiveIcon = loadCanvas('activeIcon');
      for (let i = 0; i < 5; i++) {
        const enabled = itemRoot.GetItem(`Tab/enabled/${i}`);
        const disabled = itemRoot.GetItem(`Tab/disabled/${i}`);
        this._wzTabEnabled[i] = enabled instanceof WzCanvas ? opts.loader.Load(enabled) : null;
        this._wzTabDisabled[i] = disabled instanceof WzCanvas ? opts.loader.Load(disabled) : null;
        const ref = this._wzTabEnabled[i] ?? this._wzTabDisabled[i];
        if (ref) this._tabWidths[i] = ref.width;
      }
      this._btFull = this._makeButton(opts.loader, itemRoot, 'BtFull', () => this._setExtended(true));
      this._btSmall = this._makeButton(opts.loader, itemRoot, 'BtSmall', () => this._setExtended(false));
      this._btCashshop = this._makeButton(opts.loader, itemRoot, 'BtCashshop', () => this.onCashShop?.(TAB_TO_INVTYPE[this._activeTab]));
      this._btCoin = this._makeButton(opts.loader, itemRoot, 'BtCoin', () => this.onDropMoney?.());
      this._newTabOther = opts.loader.LoadAnimation(itemRoot.GetItem('New/Tab0'));
      this._newTabCurrent = opts.loader.LoadAnimation(itemRoot.GetItem('New/Tab1'));
      this._newInventory = opts.loader.LoadAnimation(itemRoot.GetItem('New/inventory'));
      this._releaseEffectNode = itemRoot.GetItem('Magnifier/Success');
    }
    // OG: Arrange buttons use same WZ package as other buttons via CLayoutMan::AddButton.
    // Only one button exists at a time (state 0 = BtGather, state 1 = BtSort).
    // Initial state is 0, so create BtGather here. _rebuildArrangeButton handles swapping.
    const arrangeRoot = itemRoot ?? (opts.uiWz?.GetItem('IWindow2.img/Item') instanceof WzProperty
      ? opts.uiWz!.GetItem('IWindow2.img/Item') as WzProperty : null);
    this._arrangeWzRoot = arrangeRoot;
    if (opts.loader && arrangeRoot) {
      this._btGather = this._makeButton(opts.loader, arrangeRoot, 'BtGather', () => this.onGather?.(TAB_TO_INVTYPE[this._activeTab]));
    }
    // OG: m_pImgFontNumber — WZ image font for quantity digits.
    // Loaded from UIWindow2.img/Item/number, matching EquipInventory's pattern.
    if (itemRoot && opts.loader) {
      const numProp = itemRoot.Get('number');
      if (numProp instanceof WzProperty) {
        for (let i = 0; i < 10; i++) {
          const canvas = numProp.Get(String(i));
          if (canvas instanceof WzCanvas) {
            this._imgFontDigits[i] = opts.loader.Load(canvas);
          }
        }
      }
    }

    this._bg = new Graphics();
    if (!this._wzBg1) this._rebuildBg();
    this._root.addChild(this._bg);

    this._rebuildBackgroundSprite();

    this._titleText = new Text({ text: 'Items - Equip', style: _titleStyle });
    this._titleText.x = 20; this._titleText.y = 5;
    this._root.addChild(this._titleText);

    for (let i = 0; i < 5; i++) {
      const g = new Graphics();
      g.rect(0, 0, 0, 0).fill({  color: TAB_COLORS[i], alpha: 0.7 });
      this._tabBgs.push(g);
      this._root.addChild(g);

      const tabSprite = new Sprite(Texture.EMPTY);
      this._tabSprites.push(tabSprite);
      this._root.addChild(tabSprite);

      const t = new Text({ text: TAB_NAMES[i][0], style: _labelStyle });
      t.visible = false;
      this._tabLabels.push(t);
      this._root.addChild(t);
    }
    this._root.addChild(this._effectLayer);

    // OG: CUIItem::Draw renders meso count at y=268, right-aligned with FONT_NO_BLACK_SMALL.
    const mesoStyle = new TextStyle({ fill: '#000', fontSize: 11, fontFamily: 'monospace' });
    this._mesoText = new Text({ text: '', style: mesoStyle });
    this._mesoText.y = 268;
    this._root.addChild(this._mesoText);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < FULL_COLS; c++) {
        const g = new Container();
        this._slotBgs.push(g);
        this._root.addChild(g);

        const tl = new Text({ text: '', style: _labelStyle });
        this._slotLabels.push(tl);
        this._root.addChild(tl);

        const tq = new Text({ text: '', style: _labelStyle });
        this._slotQtys.push(tq);
        this._root.addChild(tq);
      }
    }
    // OG: scrollbar at (152,51,207) — CCtrlScrollBar(m_pParent, 2001, 1, 8, 152, 51, 207)
    this._scrollBar = new ScrollBar(152, 51, 207, (pos) => {
      this._scrollOffset[this._activeTab] = pos;
      this._itemScrollPos[TAB_TO_INVTYPE[this._activeTab]] = pos;
      this._rebuildGrid();
    }, { loader: opts.loader!, uiWz: opts.uiWz ?? null });
    this._root.addChild(this._scrollBar.container);
    this._rebuild();
  }

  private _makeButton(loader: WzTextureLoader, root: WzProperty, name: string, onClick: () => void): Button | null {
    const prop = root.Get(name);
    if (!(prop instanceof WzProperty)) return null;
    const button = Button.fromWz(loader, prop, name);
    button.onClick = onClick;
    this._allButtons.push(button);
    this._root.addChild(button.container);
    return button;
  }

  // OG: SetArrangeButton (0x7ccc90) — destroys old button, creates new one via
  // CLayoutMan::AddButton. State 0 = BtGather (id=0x7D3), state 1 = BtSort (id=0x7D4).
  private _rebuildArrangeButton(): void {
    // Remove old arrange button (detach from scene tree)
    if (this._btGather) {
      this._btGather.container.removeFromParent();
      this._allButtons = this._allButtons.filter(b => b !== this._btGather);
      this._btGather = null;
    }
    if (this._btSort) {
      this._btSort.container.removeFromParent();
      this._allButtons = this._allButtons.filter(b => b !== this._btSort);
      this._btSort = null;
    }
    // Create new button based on current arrange state for this tab
    if (this._loader && this._arrangeWzRoot) {
      if (this._arrangeState[this._activeTab] === 0) {
        this._btGather = this._makeButton(this._loader, this._arrangeWzRoot, 'BtGather', () => {
          this.onGather?.(TAB_TO_INVTYPE[this._activeTab]);
        });
      } else {
        this._btSort = this._makeButton(this._loader, this._arrangeWzRoot, 'BtSort', () => {
          this.onSort?.(TAB_TO_INVTYPE[this._activeTab]);
        });
      }
    }
  }

  private _setExtended(extended: boolean): void {
    // OG Toggle (0x7cbba0): m_bExtended toggle → Destroy → CreateUIWndPosSaved.
    // Must fully tear down and rebuild the window at the new size.
    this._extended = extended;
    if (extended) this._scrollOffset[this._activeTab] = 0;

    // Destroy all children from _root (mirrors CWnd::Destroy)
    this._allButtons = [];
    while (this._root.children.length > 0) {
      this._root.removeChildAt(0);
    }
    this._tabBgs = [];
    this._tabSprites = [];
    this._tabLabels = [];
    this._slotBgs = [];
    this._slotLabels = [];
    this._slotQtys = [];
    this._qtyDigitSprites.clear();

    // Rebuild everything (mirrors CUIWnd::CreateUIWndPosSaved)
    if (!this._wzBg1) this._rebuildBg();
    this._root.addChild(this._bg);
    this._rebuildBackgroundSprite();

    this._titleText = new Text({ text: `Items - ${TAB_NAMES[this._activeTab]}`, style: _titleStyle });
    this._titleText.x = 20; this._titleText.y = 5;
    this._root.addChild(this._titleText);

    for (let i = 0; i < 5; i++) {
      const g = new Graphics();
      g.rect(0, 0, 0, 0).fill({ color: TAB_COLORS[i], alpha: 0.7 });
      this._tabBgs.push(g);
      this._root.addChild(g);

      const tabSprite = new Sprite(Texture.EMPTY);
      this._tabSprites.push(tabSprite);
      this._root.addChild(tabSprite);

      const t = new Text({ text: TAB_NAMES[i][0], style: _labelStyle });
      t.visible = false;
      this._tabLabels.push(t);
      this._root.addChild(t);
    }
    this._root.addChild(this._effectLayer);

    const mesoStyle = new TextStyle({ fill: '#000', fontSize: 11, fontFamily: 'monospace' });
    this._mesoText = new Text({ text: '', style: mesoStyle });
    this._mesoText.y = 268;
    this._root.addChild(this._mesoText);

    const gridCols = this._extended ? FULL_COLS : COLS;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < gridCols; c++) {
        const g = new Container();
        this._slotBgs.push(g);
        this._root.addChild(g);

        const tl = new Text({ text: '', style: _labelStyle });
        this._slotLabels.push(tl);
        this._root.addChild(tl);

        const tq = new Text({ text: '', style: _labelStyle });
        this._slotQtys.push(tq);
        this._root.addChild(tq);
      }
    }

    // Buttons (same as constructor — _makeButton uses _root)
    this._btFull = this._loader && this._itemWzRoot ? this._makeButton(this._loader, this._itemWzRoot, 'BtFull', () => this._setExtended(true)) : this._btFull;
    this._btSmall = this._loader && this._itemWzRoot ? this._makeButton(this._loader, this._itemWzRoot, 'BtSmall', () => this._setExtended(false)) : this._btSmall;
    this._btCashshop = this._loader && this._itemWzRoot ? this._makeButton(this._loader, this._itemWzRoot, 'BtCashshop', () => this.onCashShop?.(TAB_TO_INVTYPE[this._activeTab])) : this._btCashshop;
    this._btCoin = this._loader && this._itemWzRoot ? this._makeButton(this._loader, this._itemWzRoot, 'BtCoin', () => this.onDropMoney?.()) : this._btCoin;
    this._rebuildArrangeButton();

    // Scrollbar (collapsed mode only)
    this._scrollBar = new ScrollBar(152, 51, 207, (pos) => {
      this._scrollOffset[this._activeTab] = pos;
      this._itemScrollPos[TAB_TO_INVTYPE[this._activeTab]] = pos;
      this._rebuildGrid();
    }, { loader: this._loader!, uiWz: this._uiWz });
    this._root.addChild(this._scrollBar.container);

    this.setMeso(this._mesoAmount);
    this._rebuild();
  }

  private _rebuildBackgroundSprite(): void {
    // Remove old WZ background layers
    this._root.children
      .filter((c) => (c as any).label?.startsWith('itemInventoryBg'))
      .forEach((c) => this._root.removeChild(c));
    this._bg.clear();
    const bg1 = this._extended ? this._wzFullBg1 : this._wzBg1;
    const bg2 = this._extended ? this._wzFullBg2 : this._wzBg2;
    const bg3 = this._extended ? this._wzFullBg3 : this._wzBg3;
    if (!bg1) { this._rebuildBg(); return; }
    // Remove fallback Graphics — WZ layers replace it
    if (this._bg.parent) this._bg.parent.removeChild(this._bg);
    // Layer 1: panel frame (bottom)
    const s1 = bg1.ToPixi();
    (s1 as any).label = 'itemInventoryBg1';
    this._root.addChildAt(s1, 0);
    // Layer 2: content area
    if (bg2) {
      const s2 = bg2.ToPixi();
      (s2 as any).label = 'itemInventoryBg2';
      this._root.addChildAt(s2, 1);
    }
    // Layer 3: items grid area (top)
    if (bg3) {
      const s3 = bg3.ToPixi();
      (s3 as any).label = 'itemInventoryBg3';
      const idx = bg2 ? 2 : 1;
      this._root.addChildAt(s3, idx);
    }
  }

  get activeTab(): number { return this._activeTab; }

  // OG: CUserLocal::HandleXKeyDown (decompile) scans the Install tab
  // (GW_ItemSlotBase category 3, `tab` index 2 here per the existing
  // `invType - 1` convention) for the first `is_portable_chair_item`
  // (itemId/10000===301) match. TODO_AUDIT.md Seventy-sixth pass's
  // chair/sitting finding.
  FindPortableChair(): InvItem | null {
    return this._items.find((i) => i.tab === 2 && Math.floor(i.id / 10000) === 301) ?? null;
  }

  SetPlayerStats(level: number, str: number, dex: number, intt: number, luk: number, jobId: number): void {
    this._tooltip?.SetPlayer(level, str, dex, intt, luk, jobId);
  }

  /** The tooltip's display container — add to a screen-space parent (e.g. game.uiRoot) so
      the tooltip renders in absolute screen coordinates. May be null if no font/icons supplied. */
  get tooltipContainer(): Container | null { return this._tooltip?.root ?? null; }

  onResize(viewW: number, viewH: number): void {
    this._viewW = viewW;
    this._viewH = viewH;
  }

  onMouseMove(x: number, y: number): void {
    this._mouseX = x;
    this._mouseY = y;
    if (this._scrollBar && this.isVisible && !this._extended) {
      const lx = x - this._root.x;
      const ly = y - this._root.y;
      const sbx = lx - 152;
      const sby = ly - 51;
      if (sby >= 0 && sby < 207 && sbx >= 0 && sbx < 16) {
        this._scrollBar.handleMouseMove(sbx, sby);
      } else {
        this._scrollBar.handleMouseLeave();
      }
    }
  }

  addItem(item: InvItem): void {
    item.name = this.nameOf(item.id) ?? '';
    this._items.push(item);
    const key = `${item.tab}-${item.slot}`;
    this._slots.set(key, item);
  }

  removeItem(id: number): void {
    this._items = this._items.filter(i => i.id !== id);
    for (const [k, v] of this._slots) {
      if (v.id === id) { this._slots.delete(k); break; }
    }
  }

  clear(): void { this._items = []; this._slots.clear(); }

  /** Item id currently at `(tab, pos)` (0-based tab, matching `firstFreeSlot`'s
      convention), or 0 if the slot is empty. Used to resolve which item just
      moved into a negative (equipped) slot after a Move op, since the op itself
      only carries position numbers, not the item id at the destination. */
  itemIdAt(tab: number, pos: number): number {
    return this._slots.get(`${tab}-${pos}`)?.id ?? 0;
  }

  itemAt(tab: number, pos: number): InvItem | undefined {
    return this._slots.get(`${tab}-${pos}`);
  }

  /** Total quantity of all items with the given itemId across all tabs. */
  countItem(itemId: number): number {
    let total = 0;
    for (const item of this._items) {
      if (item.id === itemId) total += item.quantity;
    }
    return total;
  }

  setActiveUseSlot(slot: number): void { this._activeUseSlot = slot; }

  // OG: CUIItem::Draw renders meso at y=268, right-aligned.
  // Called by GameStage when character data changes.
  setMeso(amount: number): void {
    this._mesoAmount = amount;
    const formatted = amount.toLocaleString();
    this._mesoText.text = formatted;
    // Right-align: OG uses `126 - CalcTextWidth(meso)` for x position.
    this._mesoText.x = 126 - this._mesoText.width;
  }

  getMeso(): number {
    return this._mesoAmount;
  }

  setActiveProjectileWeaponType(weaponType: number): void {
    this._activeProjectileWeaponType = weaponType;
    this._updateActiveUseSlot();
  }

  // TODO: Wire this from the real item-release request flow once implemented.
  // The field packet `ShowItemReleaseEffect` only carries charId+flag, not the
  // inventory slot, so it cannot drive this CUIItem slot-local animation alone.
  showItemReleaseEffect(slot: number): void {
    const anim = this._loader?.LoadAnimation(this._releaseEffectNode) ?? null;
    if (!anim) return;
    this._releaseEffects.push({ slot, anim, elapsedMs: 0 });
  }

  // OG: CUIItem::SetTryToReleaseItem(bTryToReleaseItem, nReleaseUItemPos)
  // Sets the item-release cursor mode: when active, clicking an equip item
  // in tab 0 triggers the release scroll flow.
  setTryToReleaseItem(bTry: boolean, useSlot: number): void {
    this._tryToReleaseItem = bTry;
    this._releaseUseSlot = useSlot;
    // OG: CInputSystem::SetCursorState(14) for release, 0 for normal.
    this.onCursorChange?.(bTry ? 14 : 0);
  }

  setArrangeState(invType: number, state: 0 | 1): void {
    // OG: m_anSortBtState[m_nItemTI] indexed by server invType (1-5).
    if (invType < 0 || invType >= this._arrangeState.length) return;
    this._arrangeState[invType] = state;
    this._rebuildArrangeButton();
  }

  /** First free 1-based position in the given tab (default 96 slots), or -1 if full. */
  firstFreeSlot(tab: number, max = 96): number {
    const used = new Set<number>();
    for (const it of this._items) {
      if (it.tab === tab) used.add(it.slot);
    }
    for (let s = 1; s <= max; s++) if (!used.has(s)) return s;
    return -1;
  }

  applyOps(ops: InventoryOpArg[]): void {
    for (const op of ops) {
      // OG: invType → visual tab via INVTYPE_TO_TAB (swaps 3↔4)
      const tab = INVTYPE_TO_TAB[op.invType] ?? Math.max(0, Math.min(4, op.invType - 1));
      switch (op.opType) {
        case 0: { // add
          if (op.itemId === undefined) break;
          const name = this.nameOf(op.itemId) ?? '';
          const item = new InvItem(op.itemId, name, op.quantity ?? 1, tab);
          item.slot = op.pos;
          item.petLevel = op.petLevel;
          item.petTameness = op.petTameness;
          item.petRepleteness = op.petRepleteness;
          item.petRemainLife = op.petRemainLife;
          item.equipStats = op.equipStats;
          // OG: CItemInfo::IsCashItem — items with ID >= 5000000 are cash items
          item.cash = Math.floor(op.itemId / 1_000_000) === 5;
          this._items.push(item);
          this._slots.set(`${tab}-${op.pos}`, item);
          this._latestItem = { itemId: op.itemId, tab, slot: op.pos };
          break;
        }
        case 1: { // quantity change
          const existing = this._findSlot(tab, op.pos);
          if (existing) existing.quantity = op.quantity ?? 1;
          break;
        }
        case 2: { // move
          const src = this._findSlot(tab, op.pos);
          if (src) {
            src.slot = op.newPos ?? op.pos;
            this._slots.delete(`${tab}-${op.pos}`);
            this._slots.set(`${tab}-${src.slot}`, src);
          }
          break;
        }
        case 3: // delete
          this._deleteSlot(tab, op.pos);
          break;
        case 4: // ??? — ignore
          break;
      }
    }
    this._updateActiveUseSlot();
    // Rebuild display after inventory operations to show new/changed items
    this._rebuild();
  }

  private _findSlot(tab: number, pos: number): InvItem | undefined {
    return this._slots.get(`${tab}-${pos}`);
  }

  private _deleteSlot(tab: number, pos: number): void {
    const key = `${tab}-${pos}`;
    const item = this._slots.get(key);
    if (item) {
      this._items = this._items.filter(i => i !== item);
      this._slots.delete(key);
    }
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    // Route to scrollbar first (collapsed mode only)
    if (this._scrollBar && !this._extended) {
      const sbx = lx - 152;
      const sby = ly - 51;
      if (this._scrollBar.handleMouseButton(sbx, sby, down)) return true;
    }
    for (const button of this._allButtons) {
      if (button.handleMouseButton(lx, ly, down)) return true;
    }
    if (!down) return true;

    const closeX = this._extended ? CLOSE_X_EXPANDED : CLOSE_X_COLLAPSED;
    if (lx >= closeX && ly < TAB_Y + 19) { this.isVisible = false; return true; }

    const tabIdx = this._tabIndexAtPoint(lx, ly);
    if (tabIdx >= 0) {
      this._activeTab = tabIdx;
      // OG: OnTabChanged restores scroll from ms_anItemScrollPos[m_nItemTI]
      this._scrollOffset[tabIdx] = this._itemScrollPos[TAB_TO_INVTYPE[tabIdx]] ?? 0;
      // OG: OnTabChanged clears release mode and tooltip
      this.setTryToReleaseItem(false, -1);
      this._tooltip?.Hide();
      this._rebuild();
      return true;
    }

    this._handleSlotClick(lx, ly);
    return lx >= 0 && lx < this._panelW && ly >= 0 && ly < PANEL_H;
  }

  private _handleSlotClick(lx: number, ly: number): void {
    const slotPos = this._slotPositionFromPoint(lx, ly);
    if (slotPos <= 0) return;

    // OG: CUIItem::OnMouseButton — when m_bTryToReleaseItem is set, clicking
    // an equip item sends the release request instead of starting a drag.
    if (this._tryToReleaseItem && this._activeTab === 0) {
      const item = this._slots.get(`${this._activeTab}-${slotPos}`) ?? null;
      if (item) {
        this.onItemRelease?.(this._releaseUseSlot, slotPos);
        this.setTryToReleaseItem(false, -1);
      }
      return;
    }

    const item = this._slots.get(`${this._activeTab}-${slotPos}`) ?? null;
    if (!item) return;

    // Shift+click: split a stack of Use/Setup/Etc items (quantity > 1)
    const shiftKey = typeof window !== 'undefined' && (window as any).__shiftKey === true;
    const ctrlKey = typeof window !== 'undefined' && (window as any).__ctrlKey === true;

    if (shiftKey && item.quantity > 1 && (this._activeTab === 1 || this._activeTab === 2 || this._activeTab === 3)) {
      // Prompt for quantity to split off (default 1)
      const qtyStr = window.prompt(`Split how many? (1-${item.quantity - 1})`, '1');
      if (qtyStr === null) return; // cancelled
      const qty = Math.max(1, Math.min(parseInt(qtyStr, 10) || 1, item.quantity - 1));
      this.onSplitItem?.(item, qty);
      return;
    }

    // Ctrl+click on equip tab items: equip the item directly
    if (ctrlKey && this._activeTab === 0) {
      this.onEquipItem?.(item);
      return;
    }

    this.onItemSelected?.(item);
    const icon = this._icons?.LoadIcon(item.id);
    if (icon) this.onDragStart?.({ itemId: item.id, slotPos: item.slot, invType: item.tab + 1 }, icon.Texture, this._mouseX, this._mouseY);

    const key = `${item.tab}-${item.slot}`;
    const now = performance.now();
    const isDoubleClick = key === this._lastClickKey && now - this._lastClickTime < 400;
    this._lastClickKey = key;
    this._lastClickTime = isDoubleClick ? 0 : now;

    if (!isDoubleClick) return;
    if (this._activeTab === 0) this.onEquipItem?.(item);
    else if (this._activeTab === 1) {
      // OG: is_release_item → ChangeTab(0) + SetTryToReleaseItem(1, slot)
      // Release items (white scrolls, scissors) in Use tab trigger the
      // release flow: switch to Equip tab, enter release-cursor mode.
      this.onUseItem?.(item);
    }
    else if (this._activeTab === 2) this.onSetupItem?.(item);
    else if (this._activeTab === 3) this.onEtcItem?.(item);
    else if (this._activeTab === 4) this.onActivateCashItem?.(item);
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    const maxSlot = Math.max(0, ...this._items.filter(i => i.tab === this._activeTab).map(i => i.slot));
    const maxScroll = Math.max(0, Math.ceil(maxSlot / COLS) - ROWS);
    if (key === 'PageDown' && !this._extended) { this._scrollOffset[this._activeTab] = Math.min(this._scrollOffset[this._activeTab] + 1, maxScroll); this._rebuildGrid(); return true; }
    if (key === 'PageUp' && !this._extended) { this._scrollOffset[this._activeTab] = Math.max(0, this._scrollOffset[this._activeTab] - 1); this._rebuildGrid(); return true; }
    return false;
  }

  // OG: CDraggableItem::OnDropped → GetOffEquipItem (unequip) / rearrange.
  // Accepts worn equip items (slotPos<0) dragged from EquipInventory, or
  // inventory items dragged within the inventory to reorder.
  onUnequipToInventory: ((invType: number, bodyPart: number, invSlot: number) => void) | null = null;
  // OG: CDraggableItem::MoveItemSlot — same-panel reorder via drag.
  // Sends ChangeSlotPositionRequest(m_nItemTI, fromSlot, toSlot, -1).
  onMoveItemSlot: ((invType: number, fromSlot: number, toSlot: number) => void) | null = null;

  tryAcceptDrag(payload: unknown, x: number, y: number): boolean {
    if (!this.isVisible) return false;
    if (!payload || typeof payload !== 'object' || !('invType' in payload)) return false;
    const p = payload as ItemDragPayload;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    const slotPos = this._slotPositionFromPoint(lx, ly);

    // Worn item (negative slotPos) dropped onto inventory — unequip to this slot
    if (p.slotPos < 0 && p.invType === InventoryType.Equip) {
      const bodyPart = -p.slotPos;
      if (slotPos > 0) {
        // Dropped onto a specific inventory slot — unequip there
        this.onUnequipToInventory?.(p.invType, bodyPart, slotPos);
      } else {
        // Dropped on the panel background — unequip to first free slot
        const free = this.firstFreeSlot(0);
        if (free > 0) this.onUnequipToInventory?.(p.invType, bodyPart, free);
      }
      return true;
    }

    // OG: CDraggableItem::MoveItemSlot — same-panel reorder via drag.
    // Positive slotPos, same invType, different target slot → swap positions.
    // Works for ALL tabs (not just Equip), matching OG behavior.
    if (p.slotPos > 0 && slotPos > 0 && slotPos !== p.slotPos) {
      // p.invType is 1-based server invType; _activeTab is 0-based visual tab.
      // Must use the OG tab swap to compare: visual tab 2 = invType 4, visual tab 3 = invType 3.
      const srcTab = INVTYPE_TO_TAB[p.invType] ?? -1;
      if (srcTab === this._activeTab) {
        // Same panel — reorder via ChangeSlotPositionRequest
        this.onMoveItemSlot?.(p.invType, p.slotPos, slotPos);
        return true;
      }
    }

    return false;
  }

  update(_dt: number): void {
    if (!this.isVisible) {
      this._tooltip?.Hide();
      return;
    }
    this._updateEffects(_dt * 1000);

    this._hoverItem = null;
    if (this._tooltip !== null) {
      const lx = this._mouseX - this._root.x;
      const ly = this._mouseY - this._root.y;
      if (lx >= GRID_X && ly >= GRID_Y) {
        const slotPos = this._slotPositionFromPoint(lx, ly);
        this._hoverItem = slotPos > 0 ? (this._slots.get(`${this._activeTab}-${slotPos}`) ?? null) : null;
      }
      if (this._hoverItem !== null) {
        this._tooltip.Draw(this._hoverItem.id, this._hoverItem.name, 0, this._hoverItem.quantity, this._mouseX, this._mouseY, this._viewW, this._viewH, 0, this._hoverItem.petLevel, this._hoverItem.petTameness, this._hoverItem.petRepleteness, this._hoverItem.petRemainLife);
      } else {
        this._tooltip.Hide();
      }
    }
  }

  private _rebuild(): void {
    this._titleText.text = `Items - ${TAB_NAMES[this._activeTab]}`;
    if (this._btFull) this._btFull.container.visible = !this._extended;
    if (this._btSmall) this._btSmall.container.visible = this._extended;
    // OG: OnTabChanged — Cash Shop enabled for TI 1/2/4, disabled for TI 3/5;
    // also disabled when items ≥ 48 in extended mode.
    if (this._btCashshop) {
      const ti = TAB_TO_INVTYPE[this._activeTab];
      const tiEnabled = ti === 1 || ti === 2 || ti === 4;
      const count = this._items.filter(i => i.tab === this._activeTab).length;
      const overCapacity = this._extended && count >= OG_EXTENDED_SLOTS;
      this._btCashshop.enabled = this._extended && tiEnabled && !overCapacity;
    }
    // OG: SetArrangeButton — destroy old, create new matching current state
    this._rebuildArrangeButton();
    const hasWzTabs = this._wzTabEnabled.some(Boolean) && this._wzTabDisabled.some(Boolean);
    for (let i = 0; i < 5; i++) {
      const tx = this._tabX(i);
      const tw = this._tabWidths[i];
      this._tabBgs[i].clear();
      const tabAsset = i === this._activeTab ? this._wzTabEnabled[i] : this._wzTabDisabled[i];
      this._tabSprites[i].visible = hasWzTabs && tabAsset !== null;
      if (tabAsset !== null) {
        this._tabSprites[i].texture = tabAsset.Texture;
        this._tabSprites[i].position.set(tx, TAB_Y);
      }
      if (!hasWzTabs) {
        this._tabBgs[i].rect(tx, TAB_Y, tw, 19).fill({
          color: i === this._activeTab ? TAB_COLORS[i] : '#141628',
          alpha: i === this._activeTab ? 0.7 : 1,
        });
        this._tabBgs[i].rect(tx, TAB_Y, tw, 19).stroke({
          color: i === this._activeTab ? TAB_COLORS[i] : '#282D41',
          width: 1,
        });
      }
      this._tabLabels[i].x = tx + tw / 2 - 3;
      this._tabLabels[i].y = TAB_Y + 4;
      this._tabLabels[i].visible = !hasWzTabs;
    }
    this._rebuildGrid();
    this._updateEffects(0);
  }

  private _rebuildGrid(): void {
    const cols = this._extended ? FULL_COLS : COLS;
    // OG: m_nFirstPosition = 4 * scrollPos + 1 (collapsed only; extended = always 1)
    // scrollPos comes from ms_anItemScrollPos[m_nItemTI] which persists per-tab.
    const firstPos = this._extended ? 1 : this._scrollOffset[this._activeTab] * COLS + 1;
    // Persist the scroll position for this tab (OG: ms_anItemScrollPos[m_nItemTI] = param2)
    this._itemScrollPos[TAB_TO_INVTYPE[this._activeTab]] = this._scrollOffset[this._activeTab];
    const hasImgFont = this._imgFontDigits.length > 0;

    // Update scrollbar range and visibility
    if (this._scrollBar) {
      this._scrollBar.visible = !this._extended;
      const maxSlot = Math.max(0, ...this._items.filter(i => i.tab === this._activeTab).map(i => i.slot));
      const maxScroll = Math.max(0, Math.ceil(maxSlot / COLS) - ROWS);
      this._scrollBar.setRange(maxScroll);
    }

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < FULL_COLS; c++) {
        const idx = r * FULL_COLS + c;
        const visible = c < cols;
        const slotPos = this._slotPositionForCell(c, r, firstPos);
        const item = visible ? (this._slots.get(`${this._activeTab}-${slotPos}`) ?? null) : null;
        const sx = GRID_X + c * SLOT_STEP_X;
        const sy = GRID_Y + r * SLOT_STEP_Y;

        this._slotBgs[idx].visible = visible;
        this._slotLabels[idx].visible = false;
        if (!visible) continue;

        // Clear previous children (old icons, disabled overlays, etc.)
        this._slotBgs[idx].removeChildren();

        // OG: no empty slot background drawn — bg3 layer provides the grid.

        // Extended empty slots get the disabled overlay
        if (this._extended && !item && this._wzDisabled) {
          const disabled = this._wzDisabled.ToPixi();
          disabled.position.set(sx, sy);
          this._slotBgs[idx].addChild(disabled);
        }

        // OG: CDraggableItem::Draw active use-slot icon — positioned at
        // (pRc.left - iconWidth, pRc.top - iconHeight) offset from the slot rect.
        if (this._activeTab === 1 && item?.slot === this._activeUseSlot && this._wzActiveIcon) {
          const active = this._wzActiveIcon.ToPixi();
          const iw = this._wzActiveIcon.Width;
          const ih = this._wzActiveIcon.Height;
          // ToPixi sets anchor to (OriginX/Width, OriginY/Height), so we
          // compensate to place the sprite's top-left at (sx-iw, sy-ih).
          active.position.set(sx - iw + this._wzActiveIcon.OriginX, sy - ih + this._wzActiveIcon.OriginY);
          this._slotBgs[idx].addChild(active);
        }

        if (!item) continue;

        // OG: CItemInfo::DrawGradeFrame — 1px colored border for equip grade rarity.
        // Only drawn on Equip tab (tab 0) for items with grade > 0.
        // OG: GetItemGrade() = nGrade & 3, IsReleased() = nGrade & 4.
        // Drawn BEFORE item icon so icon renders on top of the frame.
        if (this._activeTab === 0 && item.equipStats && item.equipStats.grade > 0) {
          const gradeGfx = new Graphics();
          // OG DrawGradeFrame colors:
          // Not released: 0xFF0066 (red, default)
          // Released grade 2: 0xFF5CA1FF (blue)
          // Released grade 3: 0xFFC261FF (pink)
          // Released grade 4: 0xFFFFCC00 (gold)
          let gradeColor = 0xFF0066;
          if (item.equipStats.released) {
            switch (item.equipStats.grade) {
              case 2: gradeColor = 0xFF5CA1FF; break;
              case 3: gradeColor = 0xFFC261FF; break;
              case 4: gradeColor = 0xFFFFCC00; break;
            }
          }
          gradeGfx.rect(sx, sy, SLOT_W, SLOT_H).stroke({ color: gradeColor, width: 1 });
          this._slotBgs[idx].addChild(gradeGfx);
        }

        // OG: CItemInfo::DrawItemIconForSlot — render WZ item icon
        if (this._icons) {
          const icon = this._icons.LoadIcon(item.id);
          if (icon) {
            const iconSpr = icon.ToPixi();
            // Center the icon in the slot (icon is typically 32×32 or smaller)
            const iw = icon.Texture.width;
            const ih = icon.Texture.height;
            iconSpr.position.set(sx + (SLOT_W - iw) / 2, sy + (SLOT_H - ih) / 2);
            this._slotBgs[idx].addChild(iconSpr);
            // OG: DrawItemIconForSlot — cash tag overlay in bottom-right corner
            if (item.cash) {
              const cashTag = this._icons.GetCashTag();
              if (cashTag) {
                cashTag.position.set(sx + SLOT_W - cashTag.width, sy + SLOT_H - cashTag.height);
                this._slotBgs[idx].addChild(cashTag);
              }
            }
          }
        }

        // OG: draw_number_by_image — render quantity using WZ image font digits
        if (item.quantity > 1) {
          const qty = item.quantity > 9999 ? 9999 : item.quantity;
          const digits = String(qty);
          // Clean up old digit sprites for this slot
          const oldDigits = this._qtyDigitSprites.get(idx);
          if (oldDigits) {
            for (const s of oldDigits) s.removeFromParent();
          }
          const newDigits: Sprite[] = [];
          if (hasImgFont) {
            let dx = sx + SLOT_W;
            for (let d = digits.length - 1; d >= 0; d--) {
              const dgt = parseInt(digits[d], 10);
              const wzSpr = this._imgFontDigits[dgt];
              if (!wzSpr) continue;
              const spr = wzSpr.ToPixi();
              dx -= wzSpr.Texture.width;
              spr.x = dx;
              spr.y = sy + SLOT_H - 14;
              this._slotBgs[idx].addChild(spr);
              newDigits.push(spr);
            }
          } else {
            // Fallback: PixiJS text
            const qtyText = new Text({ text: digits, style: _labelStyle });
            qtyText.x = sx + SLOT_W - qtyText.width - 2;
            qtyText.y = sy + SLOT_H - 12;
            this._slotBgs[idx].addChild(qtyText);
            newDigits.push(qtyText as any);
          }
          this._qtyDigitSprites.set(idx, newDigits);
        } else {
          // Clean up old digits
          const oldDigits = this._qtyDigitSprites.get(idx);
          if (oldDigits) {
            for (const s of oldDigits) s.removeFromParent();
            this._qtyDigitSprites.delete(idx);
          }
        }
      }
    }
  }

  private _rebuildBg(): void {
    this._bg.clear();
    this._bg.rect(0, 0, this._panelW, PANEL_H).fill({  color: '#0C0E18', alpha: 240 / 255 });
    this._bg.rect(0, 0, this._panelW, PANEL_H).stroke({  color: '#3C4164', width: 1 });
    this._bg.rect(0, 0, this._panelW, 22).fill({  color: '#0F1224' });
  }

  // OG: _getBackgroundUOL — returns WZ paths for all 3 background layers.
  private _getBackgroundUOLs(): { bg1: string; bg2: string; bg3: string } {
    const prefix = this._extended ? 'FullBackgrnd' : 'backgrnd';
    return {
      bg1: `UIWindow2.img/Item/${prefix}`,
      bg2: `UIWindow2.img/Item/${prefix}2`,
      bg3: `UIWindow2.img/Item/${prefix}3`,
    };
  }

  private get _panelW(): number { return this._extended ? FULL_PANEL_W : PANEL_W; }

  /** OG: CCtrlTab stores tab items with their canvas widths. Tab i starts at
   *  TAB_X + sum(widths[0..i-1]) + i * TAB_GAP. */
  private _tabX(i: number): number {
    let x = TAB_X;
    for (let j = 0; j < i; j++) x += this._tabWidths[j] + TAB_GAP;
    return x;
  }

  /** Which tab index was clicked, or -1 if none. Mirrors CCtrlTab hit-test. */
  private _tabIndexAtPoint(lx: number, ly: number): number {
    if (ly < TAB_Y || ly >= TAB_Y + 19) return -1;
    for (let i = 0; i < 5; i++) {
      const tx = this._tabX(i);
      if (lx >= tx && lx < tx + this._tabWidths[i]) return i;
    }
    return -1;
  }

  private _slotPositionForCell(col: number, row: number, firstPos: number): number {
    if (!this._extended) return firstPos + row * COLS + col;
    const block = Math.floor(col / COLS);
    return firstPos + block * (COLS * ROWS) + row * COLS + (col % COLS);
  }

  private _slotPositionFromPoint(lx: number, ly: number): number {
    const col = Math.floor((lx - GRID_X) / SLOT_STEP_X);
    const row = Math.floor((ly - GRID_Y) / SLOT_STEP_Y);
    const cols = this._extended ? FULL_COLS : COLS;
    if (col < 0 || col >= cols || row < 0 || row >= ROWS) return 0;
    const sx = GRID_X + col * SLOT_STEP_X;
    const sy = GRID_Y + row * SLOT_STEP_Y;
    if (lx < sx || lx >= sx + SLOT_W || ly < sy || ly >= sy + SLOT_H) return 0;
    const firstPos = this._extended ? 1 : this._scrollOffset[this._activeTab] * COLS + 1;
    return this._slotPositionForCell(col, row, firstPos);
  }

  private _updateActiveUseSlot(): void {
    let best = 0;
    const wantedPrefix = this._activeProjectileWeaponType === 47 ? THROWING_STAR_PREFIX
      : this._activeProjectileWeaponType === 49 ? BULLET_PREFIX
      : 0;
    for (const item of this._items) {
      if (item.tab !== 1 || item.quantity <= 0) continue;
      const prefix = Math.floor(item.id / 10000);
      if (wantedPrefix !== 0 ? prefix !== wantedPrefix : (prefix !== THROWING_STAR_PREFIX && prefix !== BULLET_PREFIX)) continue;
      if (best === 0 || item.slot < best) best = item.slot;
    }
    this._activeUseSlot = best;
  }

  private _updateEffects(dtMs: number): void {
    this._effectLayer.removeChildren();
    const latest = this._latestItem;
    if (latest !== null && this._slots.get(`${latest.tab}-${latest.slot}`)?.id === latest.itemId) {
      const tabAnim = latest.tab === this._activeTab ? this._newTabCurrent : this._newTabOther;
      if (tabAnim) {
        const tx = this._tabX(latest.tab) + this._tabWidths[latest.tab] / 2;
        tabAnim.Update(dtMs);
        this._effectLayer.addChild(tabAnim.Draw(tx, TAB_Y + 12));
      }
      if (latest.tab === this._activeTab && this._newInventory) {
        const rc = this._slotRectForPosition(latest.slot);
        if (rc !== null) {
          this._newInventory.Update(dtMs);
          this._effectLayer.addChild(this._newInventory.Draw(rc.x - 1, rc.y - 1));
        }
      }
    }

    for (let i = this._releaseEffects.length - 1; i >= 0; i--) {
      const fx = this._releaseEffects[i];
      fx.elapsedMs += dtMs;
      if (fx.elapsedMs >= fx.anim.TotalDurationMs) {
        this._releaseEffects.splice(i, 1);
        continue;
      }
      const rc = this._slotRectForPosition(fx.slot);
      if (rc === null) continue;
      fx.anim.Update(dtMs);
      this._effectLayer.addChild(fx.anim.Draw(rc.x, rc.y));
    }
  }

  private _slotRectForPosition(slot: number): { x: number; y: number } | null {
    const firstPos = this._extended ? 1 : this._scrollOffset[this._activeTab] * COLS + 1;
    const offset = slot - firstPos;
    if (offset < 0) return null;
    let col = offset % COLS;
    let row = Math.floor(offset / COLS);
    if (this._extended && row >= ROWS) {
      const block = Math.floor(row / ROWS);
      row %= ROWS;
      col += block * COLS;
    }
    const maxCols = this._extended ? FULL_COLS : COLS;
    if (col < 0 || col >= maxCols || row < 0 || row >= ROWS) return null;
    return { x: GRID_X + col * SLOT_STEP_X, y: GRID_Y + row * SLOT_STEP_Y };
  }

}
