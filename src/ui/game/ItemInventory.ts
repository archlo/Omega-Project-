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

const COLS = 4;
const FULL_COLS = 16;
const ROWS = 6;
const SLOT_W = 32;
const SLOT_H = 32;
const SLOT_STEP_X = 36;
const SLOT_STEP_Y = 35;
const PANEL_W = 172;
const FULL_PANEL_W = 594;
const PANEL_H = 293;
const GRID_X = 10;
const GRID_Y = 51;
const THROWING_STAR_PREFIX = 207;
const BULLET_PREFIX = 233;

const TAB_NAMES = ['Equip', 'Use', 'Setup', 'Etc', 'Cash'];
const TAB_COLORS = ['#5A825A', '#5A5AA0', '#826E46', '#646464', '#965096'];

const _labelStyle = new TextStyle({ fill: '#CCC', fontSize: 10, fontFamily: 'monospace' });
const _titleStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });

export class InvItem {
  constructor(public id: number, public name = '', public quantity = 1, public tab = 0, public slot = 0) { }
  petLevel?: number;
  petTameness?: number;
  petRepleteness?: number;
  petRemainLife?: number;
  equipStats?: EquipStats;
}

// OG: CDraggableItem's drop payload — TODO_AUDIT.md item-drag-and-drop TODO.
export interface ItemDragPayload { itemId: number; slotPos: number; invType: number; }

// OG class: CUIItem (TSingleton<CUIItem>, RTTI ms_RTTI_CUIItem; vtable
// referenced throughout CDraggableItem methods alongside CUIEquip).
export class ItemInventory extends GamePanel implements DragTarget {
  private _items: InvItem[] = [];
  private _slots = new Map<string, InvItem>(); // key = "${invType}-${pos}"
  private _bg: Graphics;
  private _wzBg: WzSprite | null;
  private _wzFullBg: WzSprite | null = null;
  private _wzDisabled: WzSprite | null = null;
  private _wzActiveIcon: WzSprite | null = null;
  private _titleText: Text;
  private _tabBgs: Graphics[] = [];
  private _tabSprites: Sprite[] = [];
  private _wzTabEnabled: (WzSprite | null)[] = new Array(5).fill(null);
  private _wzTabDisabled: (WzSprite | null)[] = new Array(5).fill(null);
  private _tabLabels: Text[] = [];
  private _slotBgs: Graphics[] = [];
  private _slotLabels: Text[] = [];
  private _slotQtys: Text[] = [];
  private _activeTab = 0;
  private _extended = false;
  private _activeUseSlot = 0;
  private _activeProjectileWeaponType = 0;
  private _arrangeState = [0, 0, 0, 0, 0];
  private _scrollOffset = [0, 0, 0, 0, 0];
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
  private _releaseEffectNode: unknown = null;
  private _latestItem: { itemId: number; tab: number; slot: number } | null = null;
  private _releaseEffects: { slot: number; anim: AnimatedSprite; elapsedMs: number }[] = [];

  /** Resolves an item id to a display name. Called when adding items. */
  nameOf: (id: number) => string = (id) => `[${id}]`;

  /** Double-clicked an item in the Cash tab — caller equips/activates the item (pets, etc.). */
  onActivateCashItem: ((item: InvItem) => void) | null = null;
  /** Double-clicked an item in the Equip tab — caller sends ChangeSlotPosition with newPos<0. */
  onEquipItem: ((item: InvItem) => void) | null = null;
  /** Double-clicked an item in the Use tab — caller sends UseItem. */
  onUseItem: ((item: InvItem) => void) | null = null;
  /** Single-clicked any item — used by other panels (e.g. TradingRoom) that
      want a "select here, click destination there" cross-panel flow. */
  onItemSelected: ((item: InvItem) => void) | null = null;
  onCashShop: (() => void) | null = null;
  onDropMoney: (() => void) | null = null;
  onGather: ((invType: number) => void) | null = null;
  onSort: ((invType: number) => void) | null = null;
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
    if (opts.font && opts.icons) {
      const assets = new TooltipAssets(opts.loader ?? new WzTextureLoader(), opts.uiWz ?? null);
      this._tooltip = new ItemTooltip(opts.font, opts.icons, assets, opts.descOf ?? null);
    } else {
      this._tooltip = null;
    }

    // Try WZ background first
    const itemProp = opts.uiWz?.GetItem('UIWindow2.img/Item');
    const itemRoot = itemProp instanceof WzProperty ? itemProp : null;
    const wzBgNode = itemRoot?.Get('backgrnd') ?? null;
    this._wzBg = wzBgNode instanceof WzCanvas ? (opts.loader?.Load(wzBgNode) ?? null) : null;
    if (opts.loader && itemRoot) {
      const fullBg = itemRoot.Get('FullBackgrnd');
      const disabled = itemRoot.Get('disabled');
      const activeIcon = itemRoot.Get('activeIcon');
      this._wzFullBg = fullBg instanceof WzCanvas ? opts.loader.Load(fullBg) : null;
      this._wzDisabled = disabled instanceof WzCanvas ? opts.loader.Load(disabled) : null;
      this._wzActiveIcon = activeIcon instanceof WzCanvas ? opts.loader.Load(activeIcon) : null;
      for (let i = 0; i < 5; i++) {
        const enabled = itemRoot.GetItem(`Tab/enabled/${i}`);
        const disabled = itemRoot.GetItem(`Tab/disabled/${i}`);
        this._wzTabEnabled[i] = enabled instanceof WzCanvas ? opts.loader.Load(enabled) : null;
        this._wzTabDisabled[i] = disabled instanceof WzCanvas ? opts.loader.Load(disabled) : null;
      }
      this._btFull = this._makeButton(opts.loader, itemRoot, 'BtFull', () => this._setExtended(true));
      this._btSmall = this._makeButton(opts.loader, itemRoot, 'BtSmall', () => this._setExtended(false));
      this._btCashshop = this._makeButton(opts.loader, itemRoot, 'BtCashshop', () => this.onCashShop?.());
      this._btCoin = this._makeButton(opts.loader, itemRoot, 'BtCoin', () => this.onDropMoney?.());
      this._newTabOther = opts.loader.LoadAnimation(itemRoot.GetItem('New/Tab0'));
      this._newTabCurrent = opts.loader.LoadAnimation(itemRoot.GetItem('New/Tab1'));
      this._newInventory = opts.loader.LoadAnimation(itemRoot.GetItem('New/inventory'));
      this._releaseEffectNode = itemRoot.GetItem('Magnifier/Success');
    }
    const iItemRoot = opts.uiWz?.GetItem('IWindow2.img/Item');
    if (opts.loader && iItemRoot instanceof WzProperty) {
      this._btGather = this._makeButton(opts.loader, iItemRoot, 'BtGather', () => this.onGather?.(this._activeTab + 1));
      this._btSort = this._makeButton(opts.loader, iItemRoot, 'BtSort', () => this.onSort?.(this._activeTab + 1));
    }

    this._bg = new Graphics();
    if (!this._wzBg) this._rebuildBg();
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
      this._tabLabels.push(t);
      this._root.addChild(t);
    }
    this._root.addChild(this._effectLayer);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < FULL_COLS; c++) {
        const g = new Graphics();
        const sx = GRID_X + c * SLOT_STEP_X;
        const sy = GRID_Y + r * SLOT_STEP_Y;
        g.rect(sx, sy, SLOT_W, SLOT_H).fill({  color: '#10121C' });
        g.rect(sx, sy, SLOT_W, SLOT_H).stroke({  color: '#282C44', width: 1 });
        this._slotBgs.push(g);
        this._root.addChild(g);

        const tl = new Text({ text: '', style: _labelStyle });
        tl.x = sx + 6; tl.y = sy + 9;
        this._slotLabels.push(tl);
        this._root.addChild(tl);

        const tq = new Text({ text: '', style: _labelStyle });
        this._slotQtys.push(tq);
        this._root.addChild(tq);
      }
    }
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

  private _setExtended(extended: boolean): void {
    this._extended = extended;
    if (extended) this._scrollOffset[this._activeTab] = 0;
    this._rebuildBackgroundSprite();
    this._rebuild();
  }

  private _rebuildBackgroundSprite(): void {
    const old = this._root.children.find((c) => (c as any).label === 'itemInventoryWzBg');
    if (old) this._root.removeChild(old);
    this._bg.clear();
    const bg = this._extended ? (this._wzFullBg ?? this._wzBg) : this._wzBg;
    if (!bg) { this._rebuildBg(); return; }
    const sprite = bg.ToPixi();
    (sprite as any).label = 'itemInventoryWzBg';
    this._root.addChildAt(sprite, 0);
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

  setArrangeState(invType: number, state: 0 | 1): void {
    const tab = invType - 1;
    if (tab < 0 || tab >= this._arrangeState.length) return;
    this._arrangeState[tab] = state;
    this._rebuild();
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
      const tab = Math.max(0, Math.min(4, op.invType - 1));
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
    for (const button of this._allButtons) {
      if (button.handleMouseButton(lx, ly, down)) return true;
    }
    if (!down) return true;

    if (lx >= this._panelW - 18 && ly < 22) { this.isVisible = false; return true; }

    if (ly >= 22 && ly < 42) {
      const tabW = PANEL_W / 5;
      const tab = Math.floor((lx) / tabW);
      if (tab >= 0 && tab < 5) {
        this._activeTab = tab;
        this._rebuild();
        return true;
      }
    }

    this._handleSlotClick(lx, ly);
    return lx >= 0 && lx < this._panelW && ly >= 0 && ly < PANEL_H;
  }

  private _handleSlotClick(lx: number, ly: number): void {
    const slotPos = this._slotPositionFromPoint(lx, ly);
    if (slotPos <= 0) return;

    const item = this._slots.get(`${this._activeTab}-${slotPos}`) ?? null;
    if (!item) return;

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
    else if (this._activeTab === 1) this.onUseItem?.(item);
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

    // Inventory-to-inventory move (positive slotPos within equip tab)
    if (p.slotPos > 0 && p.invType === InventoryType.Equip && slotPos > 0 && slotPos !== p.slotPos) {
      // Rearrange within equip tab — move item from p.slotPos to slotPos
      // OG doesn't have explicit rearrange via drag (only arrange button),
      // but we can support it via ChangeSlotPosition with a swap.
      this.onUnequipToInventory?.(p.invType, -slotPos, p.slotPos);
      return true;
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
    if (this._btCashshop) this._btCashshop.enabled = this._extended && (this._activeTab === 0 || this._activeTab === 1 || this._activeTab === 3);
    if (this._btGather) this._btGather.container.visible = !this._extended && this._arrangeState[this._activeTab] === 0;
    if (this._btSort) this._btSort.container.visible = !this._extended && this._arrangeState[this._activeTab] === 1;
    const tabW = PANEL_W / 5;
    const hasWzTabs = this._wzTabEnabled.some(Boolean) && this._wzTabDisabled.some(Boolean);
    for (let i = 0; i < 5; i++) {
      const tx = i * tabW;
      this._tabBgs[i].clear();
      const tabAsset = i === this._activeTab ? this._wzTabEnabled[i] : this._wzTabDisabled[i];
      this._tabSprites[i].visible = hasWzTabs && tabAsset !== null;
      if (tabAsset !== null) {
        this._tabSprites[i].texture = tabAsset.Texture;
        this._tabSprites[i].position.set(tx, 22);
      }
      if (!hasWzTabs) {
        this._tabBgs[i].rect(tx, 22, tabW, 20).fill({ 
          color: i === this._activeTab ? TAB_COLORS[i] : '#141628',
          alpha: i === this._activeTab ? 0.7 : 1,
        });
        this._tabBgs[i].rect(tx, 22, tabW, 20).stroke({ 
          color: i === this._activeTab ? TAB_COLORS[i] : '#282D41',
          width: 1,
        });
      }
      this._tabLabels[i].x = tx + tabW / 2 - 3;
      this._tabLabels[i].y = 26;
      this._tabLabels[i].visible = !hasWzTabs;
    }
    this._rebuildGrid();
    this._updateEffects(0);
  }

  private _rebuildGrid(): void {
    const cols = this._extended ? FULL_COLS : COLS;
    const firstPos = this._extended ? 1 : this._scrollOffset[this._activeTab] * COLS + 1;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < FULL_COLS; c++) {
        const idx = r * FULL_COLS + c;
        const visible = c < cols;
        const slotPos = this._slotPositionForCell(c, r, firstPos);
        const item = visible ? (this._slots.get(`${this._activeTab}-${slotPos}`) ?? null) : null;
        const sx = GRID_X + c * SLOT_STEP_X;
        const sy = GRID_Y + r * SLOT_STEP_Y;

        this._slotBgs[idx].visible = visible;
        this._slotLabels[idx].visible = visible;
        this._slotQtys[idx].visible = false;
        if (!visible) continue;

        this._slotBgs[idx].removeChildren();
        this._slotBgs[idx].clear();
        this._slotBgs[idx].rect(sx, sy, SLOT_W, SLOT_H).fill({  color: item ? '#182016' : '#10121C' });
        this._slotBgs[idx].rect(sx, sy, SLOT_W, SLOT_H).stroke({  color: item ? '#375537' : '#282C44', width: 1 });
        if (this._extended && !item && this._wzDisabled) {
          const disabled = this._wzDisabled.ToPixi();
          disabled.position.set(sx, sy);
          this._slotBgs[idx].addChild(disabled);
        }
        if (this._activeTab === 1 && item?.slot === this._activeUseSlot && this._wzActiveIcon) {
          const active = this._wzActiveIcon.ToPixi();
          active.position.set(sx, sy);
          this._slotBgs[idx].addChild(active);
        }

        this._slotLabels[idx].text = item ? (item.name.length >= 2 ? item.name.slice(0, 2) : item.name) : '';
        this._slotLabels[idx].x = sx + 6;

        if (item && item.quantity > 1) {
          const qty = item.quantity > 9999 ? '999+' : `${item.quantity}`;
          this._slotQtys[idx].text = qty;
          this._slotQtys[idx].x = sx + SLOT_W - this._slotQtys[idx].width - 2;
          this._slotQtys[idx].y = sy + SLOT_H - 12;
          this._slotQtys[idx].visible = true;
        } else {
          this._slotQtys[idx].visible = false;
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

  private get _panelW(): number { return this._extended ? FULL_PANEL_W : PANEL_W; }

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
      const tabW = PANEL_W / 5;
      const tabAnim = latest.tab === this._activeTab ? this._newTabCurrent : this._newTabOther;
      if (tabAnim) {
        tabAnim.Update(dtMs);
        this._effectLayer.addChild(tabAnim.Draw(latest.tab * tabW + tabW / 2, 31));
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
