import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import type { ItemDragPayload } from './ItemInventory.js';
import { InventoryType } from '../../domain/InventoryItem.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { ItemIconLoader } from '../../character/ItemIconLoader.js';
import { TooltipAssets } from './TooltipAssets.js';
import { ItemTooltip } from './ItemTooltip.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { Button } from '../Button.js';
import { AnimatedSprite } from '../../render/AnimatedSprite.js';

const PANEL_W = 184;
const PANEL_H = 304;
const SLOT_SIZE = 32;

// OG: CUIWndPosSaved — localStorage key (CUIEquip uses key 10)
const PosSaveKey = 'EquipWndPos';

const _labelStyle = new TextStyle({ fill: '#CCC', fontSize: 9, fontFamily: 'monospace' });
const _valueStyle = new TextStyle({ fill: '#FFF', fontSize: 10, fontFamily: 'monospace' });

interface EquipSlotDef { label: string; ox: number; oy: number; key: string; bodyPart: number; petIndex?: number }

const SLOTS: EquipSlotDef[] = [
  { label: 'Hat', ox: 43, oy: 27, key: 'Hat', bodyPart: 1 },
  { label: 'Face', ox: 43, oy: 60, key: 'FaceAcc', bodyPart: 2 },
  { label: 'Eye', ox: 43, oy: 93, key: 'EyeAcc', bodyPart: 3 },
  { label: 'Ear', ox: 109, oy: 93, key: 'Earring', bodyPart: 4 },
  { label: 'Top', ox: 43, oy: 126, key: 'Top', bodyPart: 5 },
  { label: 'Bot', ox: 43, oy: 159, key: 'Bottom', bodyPart: 6 },
  { label: 'Shoes', ox: 76, oy: 192, key: 'Shoes', bodyPart: 7 },
  { label: 'Glove', ox: 10, oy: 159, key: 'Gloves', bodyPart: 8 },
  { label: 'Cape', ox: 10, oy: 126, key: 'Cape', bodyPart: 9 },
  { label: 'Shield', ox: 142, oy: 126, key: 'Shield', bodyPart: 10 },
  { label: 'Weapon', ox: 109, oy: 126, key: 'Weapon', bodyPart: 11 },
  { label: 'Ring', ox: 109, oy: 159, key: 'Ring1', bodyPart: 12 },
  { label: 'Ring', ox: 142, oy: 159, key: 'Ring2', bodyPart: 13 },
  { label: 'Ring', ox: 109, oy: 60, key: 'Ring3', bodyPart: 15 },
  { label: 'Ring', ox: 142, oy: 60, key: 'Ring4', bodyPart: 16 },
  { label: 'Pendant', ox: 76, oy: 126, key: 'Pendant', bodyPart: 17 },
  { label: 'Medal', ox: 10, oy: 60, key: 'Medal', bodyPart: 49 },
  { label: 'Belt', ox: 76, oy: 159, key: 'Belt', bodyPart: 50 },
  { label: 'Shoulder', ox: 142, oy: 93, key: 'Shoulder', bodyPart: 51 },
  { label: 'BP18', ox: 10, oy: 225, key: 'BottomRow1', bodyPart: 18 },
  { label: 'BP19', ox: 43, oy: 225, key: 'BottomRow2', bodyPart: 19 },
  { label: 'BP20', ox: 76, oy: 225, key: 'BottomRow3', bodyPart: 20 },
  { label: 'Pendant', ox: 142, oy: 225, key: 'CashPendant', bodyPart: 59 },
];

const DRAGON_SLOTS: EquipSlotDef[] = [
  { label: 'Dragon', ox: 10, oy: 55, key: 'Dragon0', bodyPart: 1000 },
  { label: 'Dragon', ox: 43, oy: 88, key: 'Dragon1', bodyPart: 1001 },
  { label: 'Dragon', ox: 76, oy: 55, key: 'Dragon2', bodyPart: 1002 },
  { label: 'Dragon', ox: 109, oy: 88, key: 'Dragon3', bodyPart: 1003 },
];

const MECHANIC_SLOTS: EquipSlotDef[] = [
  { label: 'Mech', ox: 45, oy: 88, key: 'Mechanic0', bodyPart: 1100 },
  { label: 'Mech', ox: 12, oy: 121, key: 'Mechanic1', bodyPart: 1101 },
  { label: 'Mech', ox: 45, oy: 121, key: 'Mechanic2', bodyPart: 1102 },
  { label: 'Mech', ox: 78, oy: 88, key: 'Mechanic3', bodyPart: 1103 },
  { label: 'Mech', ox: 45, oy: 55, key: 'Mechanic4', bodyPart: 1104 },
];

const PET_SLOT_REGIONS = [
  { ox: 112, oy: 77, parts: [14, 30, 38] },
  { ox: 77, oy: 122, parts: [21, 31, 39] },
  { ox: 110, oy: 122, parts: [29, 32, 40] },
  { ox: 11, oy: 56, parts: [22, 33, 41] },
  { ox: 44, oy: 56, parts: [23, 34, 42] },
  { ox: 77, oy: 89, parts: [26, 35, 43] },
  { ox: 11, oy: 122, parts: [27, 36, 44] },
  { ox: 44, oy: 89, parts: [28, 37, 45] },
  { ox: 11, oy: 89, parts: [46, 47, 48] },
];

const PET_SLOTS: EquipSlotDef[] = PET_SLOT_REGIONS.flatMap((region, regionIndex) =>
  region.parts.map((bodyPart, petIndex) => ({
    label: `Pet ${petIndex + 1}`,
    ox: region.ox,
    oy: region.oy,
    key: `Pet${petIndex}Equip${bodyPart}`,
    bodyPart,
    petIndex,
  })),
);

const ALL_SLOTS = [...SLOTS, ...DRAGON_SLOTS, ...MECHANIC_SLOTS, ...PET_SLOTS];

// OG class: CUIEquip (vtable confirmed pointers.txt ~7A534A/7A5350/7A5357;
// also referenced from CDraggableItem::GetOffEquipItem/ThrowItem as the
// equip-tab dialog the drag/item-slot system interacts with).
export class EquipInventory extends GamePanel {
  private _bg: Graphics;
  private _wzBg: WzSprite | null;
  // OG: CUIEquip loads 3 background layers per mode (backgrnd z=-1, backgrnd2 z=0, backgrnd3 z=1).
  // CoverBackgrnd replaces the innermost layer for mechanic job (backgrnd3_dual).
  private _wzNormalBg: WzSprite | null = null;
  private _wzNormalBg2: WzSprite | null = null;
  private _wzNormalBg3: WzSprite | null = null;
  private _wzDualBg: WzSprite | null = null;
  private _wzDragonBg: WzSprite | null = null;
  private _wzDragonBg2: WzSprite | null = null;
  private _wzDragonBg3: WzSprite | null = null;
  private _wzMechanicBg: WzSprite | null = null;
  private _wzMechanicBg2: WzSprite | null = null;
  private _wzMechanicBg3: WzSprite | null = null;
  private _wzPetBg: WzSprite | null = null;
  private _wzPetBg2: WzSprite | null = null;
  private _wzPetBg3: WzSprite | null = null;
  private _wzDisabled: WzSprite | null = null;
  private _wzCashPendant: WzSprite | null = null;
  private _jobId = 0;
  private _level = 0;
  private _releaseEffectNode: unknown = null;
  private _loader: WzTextureLoader | null = null;
  private _titleText: Text;
  private _slotGraphics: Graphics[] = [];
  private _slotLabels: Text[] = [];
  private _slotValues: Text[] = [];
  private _slotIcons: Sprite[] = [];
  private _buttons: Button[] = [];
  private _btDragon: Button | null = null;
  private _btPet: Button | null = null;
  private _btMechanic: Button | null = null;
  private _btSlot: Button | null = null;
  private _btClose: Button | null = null;
  private _mode: 'character' | 'dragon' | 'pet' | 'mechanic' = 'character';
  private _expanded = false;
  private _petIndex = 0;
  private _petCount = 1;
  private _effectLayer = new Container();
  private _releaseEffects: { bodyPart: number; anim: AnimatedSprite; elapsedMs: number }[] = [];

  private _font: BuiltInFont | null;
  private _icons: ItemIconLoader | null;
  private _tooltip: ItemTooltip | null;
  private _viewW = 800;
  private _viewH = 600;

  private _equipped = new Map<string, { itemId: number; name: string }>();
  private _hoverKey: string | null = null;
  private _mouseX = 0;
  private _mouseY = 0;

  // OG: CDraggableItem::GetOffEquipItem — TODO_AUDIT.md item-drag-and-drop
  // TODO. Mousedown over a worn slot now starts a drag (mirrors
  // SkillBook.onDragStart's convention) instead of unequipping immediately;
  // GameStage falls back to the original immediate-unequip behavior if
  // nothing claims the drop (see GameStage's drag-end handling).
  onDragStart: ((payload: ItemDragPayload, texture: Texture, x: number, y: number) => void) | null = null;
  onCashShop: (() => void) | null = null;

  constructor(opts: {
    loader?: WzTextureLoader,
    uiWz?: WzPackage | null,
    font?: BuiltInFont | null,
    icons?: ItemIconLoader | null,
    descOf?: (itemId: number) => string | null,
  } = {}) {
    super();
    this._root.visible = false;
    this._root.x = 550;
    this._root.y = 50;

    // OG: CUIWndPosSaved — restore saved position
    try {
      const saved = localStorage.getItem(PosSaveKey);
      if (saved) {
        const { x, y } = JSON.parse(saved);
        if (typeof x === 'number' && typeof y === 'number') {
          this._root.x = x;
          this._root.y = y;
        }
      }
    } catch {}

    this._font = opts.font ?? null;
    this._icons = opts.icons ?? null;
    this._loader = opts.loader ?? null;
    if (opts.font && opts.icons) {
      const assets = new TooltipAssets(opts.loader ?? new WzTextureLoader(), opts.uiWz ?? null);
      this._tooltip = new ItemTooltip(opts.font, opts.icons, assets, opts.descOf ?? null);
    } else {
      this._tooltip = null;
    }

    const character = opts.uiWz?.GetItem('UIWindow2.img/Equip/character');
    const dragon = opts.uiWz?.GetItem('UIWindow2.img/Equip/dragon');
    const mechanic = opts.uiWz?.GetItem('UIWindow2.img/Equip/mechanic');
    const pet = opts.uiWz?.GetItem('UIWindow2.img/Equip/pet');
    const charProp = character instanceof WzProperty ? character : null;
    const dragonProp = dragon instanceof WzProperty ? dragon : null;
    const mechanicProp = mechanic instanceof WzProperty ? mechanic : null;
    const petProp = pet instanceof WzProperty ? pet : null;
    if (opts.loader) {
      // OG: CUIWnd base class loads 3 background layers: backgrnd (z=-1), backgrnd2 (z=0), backgrnd3 (z=1).
      // Character mode also has backgrnd3_dual which replaces backgrnd3 when job==43 (Mechanic).
      this._wzNormalBg = this._loadSprite(opts.loader, charProp?.Get('backgrnd'));
      this._wzNormalBg2 = this._loadSprite(opts.loader, charProp?.Get('backgrnd2'));
      this._wzNormalBg3 = this._loadSprite(opts.loader, charProp?.Get('backgrnd3'));
      this._wzDualBg = this._loadSprite(opts.loader, charProp?.Get('backgrnd3_dual'));
      // Dragon sub-panel: Equip/dragon/backgrnd + backgrnd2 + backgrnd3
      this._wzDragonBg = this._loadSprite(opts.loader, dragonProp?.Get('backgrnd'));
      this._wzDragonBg2 = this._loadSprite(opts.loader, dragonProp?.Get('backgrnd2'));
      this._wzDragonBg3 = this._loadSprite(opts.loader, dragonProp?.Get('backgrnd3'));
      // Mechanic sub-panel: Equip/mechanic/backgrnd + backgrnd2 + backgrnd3
      this._wzMechanicBg = this._loadSprite(opts.loader, mechanicProp?.Get('backgrnd'));
      this._wzMechanicBg2 = this._loadSprite(opts.loader, mechanicProp?.Get('backgrnd2'));
      this._wzMechanicBg3 = this._loadSprite(opts.loader, mechanicProp?.Get('backgrnd3'));
      // Pet sub-panel: Equip/pet/backgrnd + backgrnd2 + backgrnd3
      this._wzPetBg = this._loadSprite(opts.loader, petProp?.Get('backgrnd'));
      this._wzPetBg2 = this._loadSprite(opts.loader, petProp?.Get('backgrnd2'));
      this._wzPetBg3 = this._loadSprite(opts.loader, petProp?.Get('backgrnd3'));
      this._wzDisabled = this._loadSprite(opts.loader, charProp?.Get('disabled'));
      this._wzCashPendant = this._loadSprite(opts.loader, charProp?.Get('cashPendant'));
      this._releaseEffectNode = opts.uiWz?.GetItem('UIWindow2.img/Item/Magnifier/Success');
    }
    this._wzBg = this._wzNormalBg;

    this._bg = new Graphics();
    if (!this._wzBg) this._rebuildBg();
    this._root.addChild(this._bg);

    this._rebuildBackground();

    this._titleText = new Text({ text: 'Equipment', style: new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' }) });
    this._titleText.x = 54; this._titleText.y = 5;
    this._root.addChild(this._titleText);

    for (let i = 0; i < ALL_SLOTS.length; i++) {
      const s = ALL_SLOTS[i];
      const g = new Graphics();
      g.rect(s.ox, s.oy, SLOT_SIZE, SLOT_SIZE).fill({  color: '#121420' });
      g.rect(s.ox, s.oy, SLOT_SIZE, SLOT_SIZE).stroke({  color: '#2D324B', width: 1 });
      this._slotGraphics.push(g);
      this._root.addChild(g);

      const vl = new Text({ text: s.label, style: _labelStyle });
      vl.x = s.ox + 2; vl.y = s.oy + 18;
      this._slotLabels.push(vl);
      this._root.addChild(vl);

      const vt = new Text({ text: '', style: _valueStyle });
      vt.x = s.ox + 2; vt.y = s.oy + 4;
      this._slotValues.push(vt);
      this._root.addChild(vt);

      const icon = new Sprite(Texture.EMPTY);
      icon.x = s.ox; icon.y = s.oy;
      this._slotIcons.push(icon);
      this._root.addChild(icon);
    }
    if (opts.loader && charProp) {
      // OG: BtSlot (nID=0xBB8) and BtPet (nID=0xBBA) are always loaded.
      this._btSlot = this._makeButton(opts.loader, charProp, 'BtSlot', () => this.onCashShop?.());
      this._btPet = this._makeButton(opts.loader, charProp, 'BtPet', () => this._toggleMode('pet'));
      // OG: BtDragon (nID=0xBB9) only shown for Dragon Knight (job==22) or Evan (job==2001).
      // OG: BtMechanic (nID=0xBBB) only shown for Mechanic (job==35).
      // Loaded unconditionally here; visibility gated in _layoutButtons via _jobId.
      this._btDragon = this._makeButton(opts.loader, charProp, 'BtDragon', () => this._toggleMode('dragon'));
      this._btMechanic = this._makeButton(opts.loader, charProp, 'BtMechanic', () => this._toggleMode('mechanic'));
      // OG: CUIWnd base class creates BtClose — load from Basic.img
      const closeImg = opts.uiWz?.GetItem('Basic.img/BtClose3');
      if (closeImg instanceof WzProperty) {
        this._btClose = Button.fromWz(opts.loader, closeImg, 'Close');
        this._btClose.onClick = () => { this.isVisible = false; };
        this._buttons.push(this._btClose);
        this._root.addChild(this._btClose.container);
      }
    }
    this._root.addChild(this._effectLayer);
  }

  private _loadSprite(loader: WzTextureLoader, node: unknown): WzSprite | null {
    return node instanceof WzCanvas ? loader.Load(node) : null;
  }

  private _makeButton(loader: WzTextureLoader, root: WzProperty, name: string, onClick: () => void): Button | null {
    const node = root.Get(name);
    if (!(node instanceof WzProperty)) return null;
    const button = Button.fromWz(loader, node, name);
    button.onClick = onClick;
    this._buttons.push(button);
    this._root.addChild(button.container);
    return button;
  }

  private _toggleMode(mode: 'dragon' | 'pet' | 'mechanic'): void {
    this._mode = this._mode === mode ? 'character' : mode;
    this._rebuildBackground();
  }

  private _rebuildBackground(): void {
    // Remove old WZ background layers (labeled equipInventoryWzBg/2/3).
    for (let i = this._root.children.length - 1; i >= 0; i--) {
      const c = this._root.children[i];
      const lbl = (c as any).label as string | undefined;
      if (lbl === 'equipInventoryWzBg' || lbl === 'equipInventoryWzBg2' || lbl === 'equipInventoryWzBg3') {
        this._root.removeChild(c);
      }
    }

    // OG: CUIWnd loads 3 layers stacked: backgrnd (z=-1), backgrnd2 (z=0), backgrnd3 (z=1).
    // ToPixi() sets anchor from WZ origin, so sprites auto-position when placed at (0,0).
    let bg1: WzSprite | null;
    let bg2: WzSprite | null;
    let bg3: WzSprite | null;
    if (this._mode === 'dragon') {
      bg1 = this._wzDragonBg;
      bg2 = this._wzDragonBg2;
      bg3 = this._wzDragonBg3;
    } else if (this._mode === 'mechanic') {
      bg1 = this._wzMechanicBg;
      bg2 = this._wzMechanicBg2;
      bg3 = this._wzMechanicBg3;
    } else if (this._mode === 'pet') {
      bg1 = this._wzPetBg;
      bg2 = this._wzPetBg2;
      bg3 = this._wzPetBg3;
    } else {
      // Character mode: OG uses backgrnd3_dual when job==43 (Mechanic) via CoverBackgrnd.
      bg1 = this._wzNormalBg;
      bg2 = this._wzNormalBg2;
      bg3 = (this._jobId === 43 && this._wzDualBg) ? this._wzDualBg : this._wzNormalBg3;
    }
    this._wzBg = bg1;

    if (!bg1) { this._rebuildBg(); return; }
    this._bg.clear();
    // z=-1: outermost frame (backgrnd)
    const s1 = bg1.ToPixi();
    (s1 as any).label = 'equipInventoryWzBg';
    this._root.addChildAt(s1, 0);
    // z=0: middle decorative layer (backgrnd2)
    if (bg2) {
      const s2 = bg2.ToPixi();
      (s2 as any).label = 'equipInventoryWzBg2';
      this._root.addChildAt(s2, 1);
    }
    // z=1: innermost content area (backgrnd3 or backgrnd3_dual)
    if (bg3) {
      const s3 = bg3.ToPixi();
      (s3 as any).label = 'equipInventoryWzBg3';
      this._root.addChildAt(s3, 2);
    }
  }

  equip(slotKey: string, itemName: string, itemId = 0): void {
    this._equipped.set(slotKey, { itemId, name: itemName });
  }
  unequip(slotKey: string): void { this._equipped.delete(slotKey); }

  setPetCount(count: number): void {
    this._petCount = Math.max(1, Math.min(3, Math.trunc(count)));
    if (this._petIndex >= this._petCount) this._petIndex = this._petCount - 1;
  }

  /** OG: CUIEquip reads nJob to gate BtDragon/BtMechanic and select backgrnd3 vs backgrnd3_dual.
      OnCreate auto-shows mechanic/dragon/pet panels based on job — our single-panel
      architecture translates this to an initial mode switch. */
  setJobId(jobId: number, level?: number): void {
    if (level !== undefined) this._level = level;
    if (this._jobId === jobId) return;
    const prevJob = this._jobId;
    this._jobId = jobId;
    this._rebuildBackground();
    // OG OnCreate: auto-toggle sub-panel based on job (only on first set, not re-entry).
    if (prevJob === 0 && jobId !== 0) {
      if (jobId === 35) this._mode = 'mechanic';          // Mechanic
      else if (jobId === 22 || jobId === 2001) this._mode = 'dragon'; // Dragon Knight / Evan
    }
  }

  /** Set the currently equipped item by wire data (slot key, item id, display name). */
  setEquipped(slotKey: string, itemId: number, name: string): void {
    this._equipped.set(slotKey, { itemId, name });
  }

  /** Find the slot key for a given item id (returns null if not equipped). */
  findSlotByItemId(itemId: number): string | null {
    for (const [k, v] of this._equipped) {
      if (v.itemId === itemId) return k;
    }
    return null;
  }

  /** Body part for a slot key, or -1 if not found. */
  bodyPartForSlot(slotKey: string): number {
    for (const s of ALL_SLOTS) if (s.key === slotKey) return s.bodyPart;
    return -1;
  }

  /** Set/clear the equipped item by body-part number (the wire's negative-slot
      convention: `nCurItemPos`/`GW_ItemSlotEquip` position == -bodyPart). Used to
      mirror real `InventoryOperation`(equip-tab, negative pos) updates into the
      paper-doll display, which otherwise has no data source of its own. */
  setEquippedByBodyPart(bodyPart: number, itemId: number, name: string): void {
    for (const s of ALL_SLOTS) {
      if (s.bodyPart === bodyPart) { this._equipped.set(s.key, { itemId, name }); return; }
    }
  }
  unequipByBodyPart(bodyPart: number): void {
    for (const s of ALL_SLOTS) {
      if (s.bodyPart === bodyPart) { this._equipped.delete(s.key); return; }
    }
  }

  /** Single-click on an equipped slot fires this. The stage sends the unequip packet. */
  onUnequip: ((bodyPart: number) => void) | null = null;

  showItemReleaseEffect(bodyPart: number): void {
    const anim = this._loader?.LoadAnimation(this._releaseEffectNode) ?? null;
    if (!anim) return;
    this._releaseEffects.push({ bodyPart, anim, elapsedMs: 0 });
  }

  /** Returns the equipped weapon's item ID, or null if no weapon is worn. */
  get equippedWeaponItemId(): number | null {
    return this._equipped.get('Weapon')?.itemId ?? null;
  }

  /** Iterate all equipped item IDs (skips slots with no itemId). */
  *equippedItemIds(): IterableIterator<number> {
    for (const { itemId } of this._equipped.values()) {
      if (itemId) yield itemId;
    }
  }

  /** Iterate all equipped slots as {slotKey, itemId, bodyPart} tuples. */
  *equippedSlots(): IterableIterator<{ slotKey: string; itemId: number; bodyPart: number }> {
    for (const s of ALL_SLOTS) {
      const v = this._equipped.get(s.key);
      if (v && v.itemId) yield { slotKey: s.key, itemId: v.itemId, bodyPart: s.bodyPart };
    }
  }

  SetPlayerStats(level: number, str: number, dex: number, intt: number, luk: number, jobId: number): void {
    this._tooltip?.SetPlayer(level, str, dex, intt, luk, jobId);
    this.setJobId(jobId, level);
  }

  /** The tooltip's display container — add to a screen-space parent (e.g. game.uiRoot) so
      the tooltip renders in absolute screen coordinates. May be null if no font/icons supplied. */
  get tooltipContainer(): Container | null { return this._tooltip?.root ?? null; }

  onResize(viewW: number, viewH: number): void {
    this._viewW = viewW;
    this._viewH = viewH;
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    for (const button of this._buttons) {
      if (button.handleMouseButton(lx, ly, down)) return true;
    }
    if (!down) return true;
    // OG: CExpandableWndInfo::m_bExpanded — toggle on title bar click
    if (ly < 22 && lx < PANEL_W - 18) { this._expanded = !this._expanded; return true; }
    if (this._mode === 'pet') {
      if (lx >= 45 && lx <= 75 && ly >= 24 && ly <= 54) { this._cyclePet(-1); return true; }
      if (lx >= 111 && lx <= 141 && ly >= 24 && ly <= 54) { this._cyclePet(1); return true; }
    }

    if (down) {
      for (const s of ALL_SLOTS) {
        if (!this._slotVisible(s)) continue;
        if (lx >= s.ox && lx < s.ox + SLOT_SIZE && ly >= s.oy && ly < s.oy + SLOT_SIZE) {
          const equipped = this._equipped.get(s.key);
          if (equipped) {
            const icon = this._icons?.LoadIcon(equipped.itemId);
            if (icon) {
              const isPetWear = s.bodyPart >= 52 && s.bodyPart <= 54;
              this.onDragStart?.({ itemId: equipped.itemId, slotPos: -s.bodyPart, invType: isPetWear ? InventoryType.Cash : InventoryType.Equip }, icon.Texture, x, y);
            } else {
              this.onUnequip?.(s.bodyPart);
            }
            return true;
          }
        }
      }
    }

    return lx >= 0 && lx < PANEL_W && ly >= 0 && ly < PANEL_H;
  }

  onMouseMove(x: number, y: number): void {
    this._mouseX = x;
    this._mouseY = y;
  }

  onKeyPress(key: string): boolean {
    if (key === 'Escape' && this.isVisible) { this.isVisible = false; return true; }
    return false;
  }

  update(_dt: number): void {
    if (!this.isVisible) {
      this._tooltip?.Hide();
      return;
    }

    // OG: CUIWndPosSaved — save position while visible (after drag)
    this._savePosition();

    this._hoverKey = null;
    this._layoutButtons();
    this._effectLayer.removeChildren();
    const lx = this._mouseX - this._root.x;
    const ly = this._mouseY - this._root.y;
    for (let i = 0; i < ALL_SLOTS.length; i++) {
      const s = ALL_SLOTS[i];
      const visible = this._slotVisible(s);
      this._slotGraphics[i].visible = visible;
      this._slotLabels[i].visible = visible;
      this._slotValues[i].visible = visible;
      this._slotIcons[i].visible = false;
      if (!visible) continue;
      const equipped = this._equipped.get(s.key);
      const hasItem = equipped !== undefined;

      this._slotGraphics[i].removeChildren();
      this._slotGraphics[i].clear();
      this._slotGraphics[i].rect(s.ox, s.oy, SLOT_SIZE, SLOT_SIZE).fill({  color: hasItem ? '#1E2D23' : '#121420' });
      this._slotGraphics[i].rect(s.ox, s.oy, SLOT_SIZE, SLOT_SIZE).stroke({  color: hasItem ? '#3C6E46' : '#2D324B', width: 1 });

      const name = equipped?.name ?? '';
      this._slotLabels[i].visible = !hasItem;
      const icon = hasItem ? (this._icons?.LoadIcon(equipped!.itemId) ?? null) : null;
      this._slotIcons[i].visible = icon !== null;
      if (icon) {
        this._slotIcons[i].texture = icon.Texture;
        this._slotValues[i].text = '';
      } else {
        this._slotValues[i].text = hasItem ? name : '';
      }
      this._slotIcons[i].position.set(s.ox, s.oy);
      if (!hasItem && this._wzDisabled && (s.bodyPart === 10 || s.bodyPart === 18 || s.bodyPart === 19 || s.bodyPart === 20)) {
        const disabled = this._wzDisabled.ToPixi();
        disabled.position.set(s.ox, s.oy);
        this._slotGraphics[i].addChild(disabled);
      }
      if (!hasItem && this._wzCashPendant && s.bodyPart === 59) {
        const pendant = this._wzCashPendant.ToPixi();
        pendant.position.set(s.ox, s.oy);
        this._slotGraphics[i].addChild(pendant);
      }

      if (hasItem && lx >= s.ox && lx < s.ox + SLOT_SIZE && ly >= s.oy && ly < s.oy + SLOT_SIZE) {
        this._hoverKey = s.key;
      }
    }
    this._updateEffects(_dt * 1000);

    if (this._hoverKey !== null) {
      const equipped = this._equipped.get(this._hoverKey);
      if (equipped && this._tooltip) {
        const setCount = this._equippedSetCount(equipped.itemId);
        this._tooltip.Draw(equipped.itemId, equipped.name, 0, 1, this._mouseX, this._mouseY, this._viewW, this._viewH, setCount);
      }
    } else {
      this._tooltip?.Hide();
    }
  }

  // OG: CWvsContext::CheckEquippedSetItem (IDA 0x9e04d0) — TODO_AUDIT.md
  // Hundred-and-ninth pass. Recomputed from currently-equipped items
  // whenever the tooltip is shown, same trigger-on-demand shape as the OG
  // (which recomputes on every equip/unequip rather than caching long-term).
  private _equippedSetCount(itemId: number): number {
    if (!this._icons) return 0;
    const setItemId = this._icons.LoadAttr(itemId)?.SetItemId ?? 0;
    if (setItemId <= 0) return 0;
    let count = 0;
    for (const { itemId: equippedId } of this._equipped.values()) {
      if (this._icons.LoadAttr(equippedId)?.SetItemId === setItemId) count++;
    }
    return count;
  }

  private _savePosition(): void {
    try {
      localStorage.setItem(PosSaveKey, JSON.stringify({ x: this._root.x, y: this._root.y }));
    } catch {}
  }

  private _rebuildBg(): void {
    this._bg.clear();
    this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({  color: '#0C0E18', alpha: 240 / 255 });
    this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({  color: '#3C4164', width: 1 });
    this._bg.rect(0, 0, PANEL_W, 22).fill({  color: '#0F1224' });
  }

  private _layoutButtons(): void {
    // OG: CLayoutMan::AddButton loads from WZ with offset (0,0) — the WZ sprite
    // origins encode the correct positions (BtSlot origin=(-104,-266) → pos 104,266
    // in the 184×290 backgrnd). No manual positioning needed.
    if (this._btDragon) {
      const show = this._jobId === 22 || this._jobId === 2001;
      this._btDragon.container.visible = show;
    }
    if (this._btMechanic) {
      const show = this._jobId === 35;
      this._btMechanic.container.visible = show;
      if (show && this._level < 50) this._btMechanic.enabled = false;
    }
  }

  private _cyclePet(delta: number): void {
    if (this._petCount <= 1) return;
    this._petIndex = (this._petIndex + delta + this._petCount) % this._petCount;
  }

  private _updateEffects(dtMs: number): void {
    for (let i = this._releaseEffects.length - 1; i >= 0; i--) {
      const fx = this._releaseEffects[i];
      fx.elapsedMs += dtMs;
      if (fx.elapsedMs >= fx.anim.TotalDurationMs) {
        this._releaseEffects.splice(i, 1);
        continue;
      }
      const slot = ALL_SLOTS.find((s) => s.bodyPart === fx.bodyPart);
      if (!slot) continue;
      fx.anim.Update(dtMs);
      this._effectLayer.addChild(fx.anim.Draw(slot.ox, slot.oy));
    }
  }

  private _slotVisible(slot: EquipSlotDef): boolean {
    if (slot.bodyPart >= 1000 && slot.bodyPart < 1100) return this._mode === 'dragon';
    if (slot.bodyPart >= 1100 && slot.bodyPart < 1200) return this._mode === 'mechanic';
    if (slot.petIndex !== undefined) return this._mode === 'pet' && slot.petIndex === this._petIndex;
    // OG: CExpandableWndInfo::m_bExpanded — bottom row (body parts 18/19/20 + CashPendant)
    if ((slot.bodyPart === 18 || slot.bodyPart === 19 || slot.bodyPart === 20 || slot.bodyPart === 59) && !this._expanded) return false;
    return this._mode === 'character';
  }
}
