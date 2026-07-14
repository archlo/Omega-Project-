import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import type { DragTarget } from '../DragController.js';
import type { ItemDragPayload } from './ItemInventory.js';
import { InventoryType, EquipStats } from '../../domain/InventoryItem.js';
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

interface EquipSlotDef { ox: number; oy: number; key: string; bodyPart: number }

// OG: CUIEquip::CExpandableWndInfo::m_sEqSlotInfo — character equip slots only.
// Computed from EqSlotInfo::GetX/Y with type=0: X = nXpt*33+10, Y = nYpt*33+27.
const SLOTS: EquipSlotDef[] = [
  { ox: 43, oy: 27, key: 'Hat', bodyPart: 1 },
  { ox: 43, oy: 60, key: 'FaceAcc', bodyPart: 2 },
  { ox: 43, oy: 93, key: 'EyeAcc', bodyPart: 3 },
  { ox: 109, oy: 93, key: 'Earring', bodyPart: 4 },
  { ox: 43, oy: 126, key: 'Top', bodyPart: 5 },
  { ox: 43, oy: 159, key: 'Bottom', bodyPart: 6 },
  { ox: 76, oy: 192, key: 'Shoes', bodyPart: 7 },
  { ox: 10, oy: 159, key: 'Gloves', bodyPart: 8 },
  { ox: 10, oy: 126, key: 'Cape', bodyPart: 9 },
  { ox: 142, oy: 126, key: 'Shield', bodyPart: 10 },
  { ox: 109, oy: 126, key: 'Weapon', bodyPart: 11 },
  { ox: 109, oy: 159, key: 'Ring1', bodyPart: 12 },
  { ox: 142, oy: 159, key: 'Ring2', bodyPart: 13 },
  // body part 14 is a pet slot — skipped in character equip
  { ox: 109, oy: 60, key: 'Ring3', bodyPart: 15 },
  { ox: 142, oy: 60, key: 'Ring4', bodyPart: 16 },
  { ox: 76, oy: 126, key: 'Pendant', bodyPart: 17 },
  // body parts 18-20 are expandable bottom row
  { ox: 10, oy: 225, key: 'BottomRow1', bodyPart: 18 },
  { ox: 43, oy: 225, key: 'BottomRow2', bodyPart: 19 },
  { ox: 76, oy: 225, key: 'BottomRow3', bodyPart: 20 },
  { ox: 10, oy: 60, key: 'Medal', bodyPart: 49 },
  { ox: 76, oy: 159, key: 'Belt', bodyPart: 50 },
  { ox: 142, oy: 93, key: 'Shoulder', bodyPart: 51 },
  { ox: 142, oy: 225, key: 'CashPendant', bodyPart: 59 },
];

// OG: CUIPetEquip::GetPetEquipFromPoint — pet equip slots (body parts 14, 21-48).
// Same X/Y formula as character slots; pet panel is a separate 167×201 window
// positioned at (CUIEquip.left+183, CUIEquip.top+103).
const PET_SLOTS: EquipSlotDef[] = [
  { ox: 112, oy: 77, key: 'PetHat0', bodyPart: 14 },
  { ox: 77, oy: 122, key: 'PetTop0', bodyPart: 21 },
  { ox: 11, oy: 56, key: 'PetEye0', bodyPart: 22 },
  { ox: 44, oy: 56, key: 'PetEar0', bodyPart: 23 },
  // 24, 25 are universal (shared across all pets)
  { ox: 77, oy: 89, key: 'PetCape0', bodyPart: 26 },
  { ox: 11, oy: 122, key: 'PetShield0', bodyPart: 27 },
  { ox: 44, oy: 89, key: 'PetWeapon0', bodyPart: 28 },
  // pet 1 variants (body parts 30-37)
  { ox: 112, oy: 77, key: 'PetHat1', bodyPart: 30 },
  { ox: 110, oy: 122, key: 'PetTop1', bodyPart: 32 },
  { ox: 11, oy: 56, key: 'PetEye1', bodyPart: 33 },
  { ox: 44, oy: 56, key: 'PetEar1', bodyPart: 34 },
  { ox: 77, oy: 89, key: 'PetCape1', bodyPart: 35 },
  { ox: 11, oy: 122, key: 'PetShield1', bodyPart: 36 },
  { ox: 44, oy: 89, key: 'PetWeapon1', bodyPart: 37 },
  // pet 2 variants (body parts 38-45)
  { ox: 112, oy: 77, key: 'PetHat2', bodyPart: 38 },
  { ox: 110, oy: 122, key: 'PetTop2', bodyPart: 40 },
  { ox: 11, oy: 56, key: 'PetEye2', bodyPart: 41 },
  { ox: 44, oy: 56, key: 'PetEar2', bodyPart: 42 },
  { ox: 77, oy: 89, key: 'PetCape2', bodyPart: 43 },
  { ox: 11, oy: 122, key: 'PetShield2', bodyPart: 44 },
  { ox: 44, oy: 89, key: 'PetWeapon2', bodyPart: 45 },
  // universal pet slots (24, 25, 46, 47, 48)
  { ox: 77, oy: 122, key: 'PetTopU0', bodyPart: 21 },
  { ox: 110, oy: 122, key: 'PetTopU1', bodyPart: 29 },
  { ox: 11, oy: 89, key: 'PetSlot46', bodyPart: 46 },
  { ox: 11, oy: 89, key: 'PetSlot47', bodyPart: 47 },
  { ox: 11, oy: 89, key: 'PetSlot48', bodyPart: 48 },
];

// Pet slot index mapping — which body parts belong to which pet index.
// From OG CUIPetEquip::Draw: parts 14/21-28/46→pet0, 30-37/47→pet1, 38-45/48→pet2.
const PET_BODY_PART_PET_INDEX: Record<number, number> = {
  14: 0, 21: 0, 22: 0, 23: 0, 26: 0, 27: 0, 28: 0, 46: 0,
  30: 1, 31: 1, 32: 1, 33: 1, 34: 1, 35: 1, 36: 1, 37: 1, 47: 1,
  38: 2, 39: 2, 40: 2, 41: 2, 42: 2, 43: 2, 44: 2, 45: 2, 48: 2,
  24: -1, 25: -1, 29: -1, // universal — always visible
};

// Pet consume slot positions in CUIPetEquip (from m_sPetConsumeSlotInfo).
// HP at (GetX(4,0), GetY(6,0)) = (142, 225), MP at (142, 192).
// But the Draw function uses (44,55) and (110,55) relative to pet panel canvas.
const PET_CONSUME_HP_X = 44;
const PET_CONSUME_HP_Y = 55;
const PET_CONSUME_MP_X = 110;
const PET_CONSUME_MP_Y = 55;

// OG: CUIDragonEquip::ms_aRegion — 4 slots (body parts 1000-1003).
// Computed from EqSlotInfo::GetX/Y with type=2: X = nXpt*33+10, Y = nYpt*33+22.
// Panel size: 151×172, positioned at (CUIEquip.left - 151, CUIEquip.top).
const DRAGON_SLOTS: EquipSlotDef[] = [
  { ox: 10, oy: 55, key: 'DragonSlot0', bodyPart: 1000 },
  { ox: 43, oy: 88, key: 'DragonSlot1', bodyPart: 1001 },
  { ox: 76, oy: 55, key: 'DragonSlot2', bodyPart: 1002 },
  { ox: 109, oy: 88, key: 'DragonSlot3', bodyPart: 1003 },
];

// OG: CUIMechanicEquip::ms_aRegion — 5 slots (body parts 1100-1104).
// Computed from EqSlotInfo::GetX/Y with type=3: X = nXpt*33+12, Y = nYpt*33+22.
// Panel size: 151×172, positioned at (CUIEquip.left - 151, CUIEquip.top).
const MECHANIC_SLOTS: EquipSlotDef[] = [
  { ox: 45, oy: 88, key: 'MechanicSlot0', bodyPart: 1100 },
  { ox: 12, oy: 121, key: 'MechanicSlot1', bodyPart: 1101 },
  { ox: 45, oy: 121, key: 'MechanicSlot2', bodyPart: 1102 },
  { ox: 78, oy: 88, key: 'MechanicSlot3', bodyPart: 1103 },
  { ox: 45, oy: 55, key: 'MechanicSlot4', bodyPart: 1104 },
];

// OG: CUIDragonEquip/CUIMechanicEquip panel dimensions
const DRAGON_PANEL_W = 151;
const DRAGON_PANEL_H = 172;
const MECHANIC_PANEL_W = 151;
const MECHANIC_PANEL_H = 172;

// OG class: CUIEquip (vtable confirmed pointers.txt ~7A534A/7A5350/7A5357;
// also referenced from CDraggableItem::GetOffEquipItem/ThrowItem as the
// equip-tab dialog the drag/item-slot system interacts with).
export class EquipInventory extends GamePanel implements DragTarget {
  private _bg: Graphics;
  private _wzBg: WzSprite | null;
  // OG: CUIWnd base class loads 3 background layers per mode (backgrnd z=-1, backgrnd2 z=0, backgrnd3 z=1).
  // CoverBackgrnd replaces the innermost layer for mechanic job (backgrnd3_dual).
  private _wzNormalBg: WzSprite | null = null;
  private _wzNormalBg2: WzSprite | null = null;
  private _wzNormalBg3: WzSprite | null = null;
  private _wzDualBg: WzSprite | null = null;
  private _wzDisabled: WzSprite | null = null;
  private _wzCashPendant: WzSprite | null = null;
  private _jobId = 0;
  private _subJob = 0;
  private _hasNoviceSkill1004 = true;
  private _level = 0;
  private _releaseEffectNode: unknown = null;
  private _loader: WzTextureLoader | null = null;
  private _slotIcons: Sprite[] = [];
  private _gradeFrame: Graphics | null = null;
  private _buttons: Button[] = [];
  private _btDragon: Button | null = null;
  private _btPet: Button | null = null;
  private _btMechanic: Button | null = null;
  private _btSlot: Button | null = null;
  private _btArrange: Button | null = null;
  private _btClose: Button | null = null;
  private _expanded = false;
  // OG: CUIEquip::SetArrangeButton — single toggle between BtGather (state 0) and BtSort (state 1).
  private _arrangeState = 0; // 0=gather, 1=sort
  private _effectLayer = new Container();
  private _releaseEffects: { bodyPart: number; anim: AnimatedSprite; elapsedMs: number }[] = [];

  private _font: BuiltInFont | null;
  private _icons: ItemIconLoader | null;
  private _tooltip: ItemTooltip | null;
  private _viewW = 800;
  private _viewH = 600;

  private _equipped = new Map<string, { itemId: number; name: string; grade: number; cash: boolean; stats?: EquipStats }>();
  private _hoverKey: string | null = null;
  private _mouseX = 0;
  private _mouseY = 0;

  // OG: CUIPetEquip — separate 167×201 window that slides in from the right.
  private _petPanel: Container | null = null;
  private _petBg: WzSprite | null = null;
  private _petBg2: WzSprite | null = null;
  private _petBg3: WzSprite | null = null;
  private _petProp: WzProperty | null = null;
  private _petSlotIcons: Sprite[] = [];
  private _petHpIcon: Sprite | null = null;
  private _petMpIcon: Sprite | null = null;
  private _petHpCount: Text | null = null;
  private _petMpCount: Text | null = null;
  // OG: m_pImgFontNumber — WZ image font digits "0"-"9" for item count rendering.
  // Loaded from StringPool(0x50E) in CUIPetEquip::OnCreate.
  private _imgFontDigits: (WzSprite | null)[] = [];
  private _imgFontHpDigits: Sprite[] = [];
  private _imgFontMpDigits: Sprite[] = [];
  private _petIndex = 0;
  private _petCount = 1;
  private _petShown = false;
  private _petSlideX = 0;
  private _petSlideTargetX = 0;
  private _petConsumeItemId = 0;
  private _petConsumeMpItemId = 0;
  private _petConsumeHpCount = 0;
  private _petConsumeMpCount = 0;
  private _btPetHide: Button | null = null;
  private _btPetSelect: Button[] = [];
  private _btPetPrev: Button | null = null;
  private _btPetNext: Button | null = null;

  // OG: CUIDragonEquip — separate 151×172 window, slides in from the LEFT.
  private _dragonPanel: Container | null = null;
  private _dragonBg: WzSprite | null = null;
  private _dragonBg2: WzSprite | null = null;
  private _dragonBg3: WzSprite | null = null;
  private _dragonSlotIcons: Sprite[] = [];
  private _dragonShown = false;
  private _dragonSlideX = 0;
  private _dragonSlideTargetX = 0;

  // OG: CUIMechanicEquip — separate 151×172 window, slides in from the LEFT.
  private _mechanicPanel: Container | null = null;
  private _mechanicBg: WzSprite | null = null;
  private _mechanicBg2: WzSprite | null = null;
  private _mechanicBg3: WzSprite | null = null;
  private _mechanicSlotIcons: Sprite[] = [];
  private _mechanicShown = false;
  private _mechanicSlideX = 0;
  private _mechanicSlideTargetX = 0;

  // OG: CDraggableItem::GetOffEquipItem — TODO_AUDIT.md item-drag-and-drop
  onDragStart: ((payload: ItemDragPayload, texture: Texture, x: number, y: number) => void) | null = null;
  onCashShop: (() => void) | null = null;
  // OG: CUIEquip::SetArrangeButton — fires when arrange button is clicked.
  // state=0 → gather (BtGather), state=1 → sort (BtSort).
  onArrange: ((state: number) => void) | null = null;

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
    const charProp = character instanceof WzProperty ? character : null;
    const dragonProp = dragon instanceof WzProperty ? dragon : null;
    const mechanicProp = mechanic instanceof WzProperty ? mechanic : null;
    if (opts.loader) {
      // OG: CUIWnd base class loads 3 background layers: backgrnd (z=-1), backgrnd2 (z=0), backgrnd3 (z=1).
      // Character mode also has backgrnd3_dual which replaces backgrnd3 when job==43 (Mechanic).
      this._wzNormalBg = this._loadSprite(opts.loader, charProp?.Get('backgrnd'));
      this._wzNormalBg2 = this._loadSprite(opts.loader, charProp?.Get('backgrnd2'));
      this._wzNormalBg3 = this._loadSprite(opts.loader, charProp?.Get('backgrnd3'));
      this._wzDualBg = this._loadSprite(opts.loader, charProp?.Get('backgrnd3_dual'));
      // OG: CUIDragonEquip background — separate 151×172 window to the LEFT of CUIEquip
      this._dragonBg = this._loadSprite(opts.loader, dragonProp?.Get('backgrnd'));
      this._dragonBg2 = this._loadSprite(opts.loader, dragonProp?.Get('backgrnd2'));
      this._dragonBg3 = this._loadSprite(opts.loader, dragonProp?.Get('backgrnd3'));
      // OG: CUIMechanicEquip background — separate 151×172 window to the LEFT of CUIEquip
      this._mechanicBg = this._loadSprite(opts.loader, mechanicProp?.Get('backgrnd'));
      this._mechanicBg2 = this._loadSprite(opts.loader, mechanicProp?.Get('backgrnd2'));
      this._mechanicBg3 = this._loadSprite(opts.loader, mechanicProp?.Get('backgrnd3'));
      this._wzDisabled = this._loadSprite(opts.loader, charProp?.Get('disabled'));
      this._wzCashPendant = this._loadSprite(opts.loader, charProp?.Get('cashPendant'));
      this._releaseEffectNode = opts.uiWz?.GetItem('UIWindow2.img/Item/Magnifier/Success');
      // OG: CUIPetEquip background — loaded when pet panel is created
      const petProp = opts.uiWz?.GetItem('UIWindow2.img/Equip/pet') instanceof WzProperty
        ? opts.uiWz!.GetItem('UIWindow2.img/Equip/pet') as WzProperty : null;
      if (petProp) {
        this._petProp = petProp;
        this._petBg = this._loadSprite(opts.loader, petProp.Get('backgrnd'));
        this._petBg2 = this._loadSprite(opts.loader, petProp.Get('backgrnd2'));
        this._petBg3 = this._loadSprite(opts.loader, petProp.Get('backgrnd3'));
      }
      // OG: CUIPetEquip::OnCreate loads m_pImgFontNumber from StringPool(0x50E).
      // This is the "number" property under the equip WZ path, containing digit canvases "0"-"9".
      const numProp = opts.uiWz?.GetItem('UIWindow2.img/Equip/number');
      if (numProp instanceof WzProperty && opts.loader) {
        for (let i = 0; i < 10; i++) {
          const canvas = numProp.Get(String(i));
          if (canvas instanceof WzCanvas) {
            this._imgFontDigits[i] = opts.loader.Load(canvas);
          }
        }
      }
    }
    this._wzBg = this._wzNormalBg;

    this._bg = new Graphics();
    if (!this._wzBg) this._rebuildBg();
    this._root.addChild(this._bg);

    this._rebuildBackground();

    // OG: CUIEquip creates one icon Sprite per slot (no text labels, no colored borders).
    for (let i = 0; i < SLOTS.length; i++) {
      const s = SLOTS[i];
      const icon = new Sprite(Texture.EMPTY);
      icon.x = s.ox; icon.y = s.oy;
      this._slotIcons.push(icon);
      this._root.addChild(icon);
    }
    // Grade frame layer — drawn behind slot icons for rarity borders
    this._gradeFrame = new Graphics();
    this._root.addChildAt(this._gradeFrame, 0);
    if (opts.loader && charProp) {
      // OG: BtSlot (nID=0xBB8) and BtPet (nID=0xBBA) are always loaded.
      this._btSlot = this._makeButton(opts.loader, charProp, 'BtSlot', () => this.onCashShop?.());
      this._btPet = this._makeButton(opts.loader, charProp, 'BtPet', () => this._togglePetPanel());
      // OG: BtDragon (nID=0xBB9) only shown for Dragon Knight (job==22) or Evan (job==2001).
      // OG: BtMechanic (nID=0xBBB) only shown for Mechanic (job==35).
      this._btDragon = this._makeButton(opts.loader, charProp, 'BtDragon', () => this._toggleDragonPanel());
      this._btMechanic = this._makeButton(opts.loader, charProp, 'BtMechanic', () => this._toggleMechanicPanel());
      // OG: BtArrange — toggles between BtGather (state 0) and BtSort (state 1).
      // Positioned at (142, 4) in the expanded header area.
      this._btArrange = this._makeButton(opts.loader, charProp, 'BtGather', () => {
        this._arrangeState = this._arrangeState === 0 ? 1 : 0;
        this.onArrange?.(this._arrangeState);
      });
      if (this._btArrange) {
        this._btArrange.container.x = 142;
        this._btArrange.container.y = 4;
      }
      // OG: CUIWnd base class creates BtClose — load from Basic.img
      const closeImg = opts.uiWz?.GetItem('Basic.img/BtClose3');
      if (closeImg instanceof WzProperty) {
        this._btClose = Button.fromWz(opts.loader, closeImg, 'Close');
        this._btClose.onClick = () => { this.isVisible = false; this._hidePetPanel(); this._hideDragonPanel(); this._hideMechanicPanel(); };
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

  // OG: draw_number_by_image — renders a number using WZ image font digit sprites.
  // Each digit is a separate WzSprite from m_pImgFontNumber ("0"-"9").
  // Existing sprites in `out` are removed; digit Sprites are reused from pool.
  private _drawNumberByImage(out: Sprite[], value: number, x: number, y: number): void {
    // Remove old sprites from parent
    for (const s of out) { s.removeFromParent(); }
    out.length = 0;
    if (value <= 0 || this._imgFontDigits.length === 0) return;
    const str = String(value);
    for (let i = 0; i < str.length; i++) {
      const d = parseInt(str[i], 10);
      const wzSpr = this._imgFontDigits[d];
      if (!wzSpr) continue;
      const spr = wzSpr.ToPixi();
      spr.x = x + i * wzSpr.Texture.width;
      spr.y = y;
      out.push(spr);
    }
  }

  // OG: CItemInfo::DrawGradeFrame — draws a 1px colored border around equipped items
  // based on item grade (rarity). Colors from OG binary:
  //   Grade 1 (rare):     0xFF5CA1FF (blue)
  //   Grade 2 (unique):   0xFFC261FF (purple)
  //   Grade 3 (legendary): 0xFFFF0066 (gold)
  // Grade 4 (epic) is not in the OG DrawGradeFrame but exists in _gradeColor.
  private _drawGradeFrame(g: Graphics, grade: number, x: number, y: number, w: number, h: number): void {
    let color: number;
    switch (grade) {
      case 1: color = 0x5CA1FF; break; // rare — blue
      case 2: color = 0xC261FF; break; // unique — purple
      case 3: color = 0xFF0066; break; // legendary — gold
      case 4: color = 0x55EE77; break; // epic — green
      default: return; // grade 0 = no frame
    }
    g.rect(x, y, w, 1).fill({ color, alpha: 0.7 });     // top
    g.rect(x, y + h - 1, w, 1).fill({ color, alpha: 0.7 }); // bottom
    g.rect(x, y, 1, h).fill({ color, alpha: 0.7 });     // left
    g.rect(x + w - 1, y, 1, h).fill({ color, alpha: 0.7 }); // right
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

    // OG: CUIEquip always uses character background; dragon/mechanic are separate windows.
    let bg1: WzSprite | null;
    let bg2: WzSprite | null;
    let bg3: WzSprite | null;
    bg1 = this._wzNormalBg;
    bg2 = this._wzNormalBg2;
    bg3 = (this._jobId === 43 && this._wzDualBg) ? this._wzDualBg : this._wzNormalBg3;
    this._wzBg = bg1;

    if (!bg1) { this._rebuildBg(); return; }
    this._bg.clear();
    const s1 = bg1.ToPixi();
    (s1 as any).label = 'equipInventoryWzBg';
    this._root.addChildAt(s1, 0);
    if (bg2) {
      const s2 = bg2.ToPixi();
      (s2 as any).label = 'equipInventoryWzBg2';
      this._root.addChildAt(s2, 1);
    }
    if (bg3) {
      const s3 = bg3.ToPixi();
      (s3 as any).label = 'equipInventoryWzBg3';
      this._root.addChildAt(s3, 2);
    }
    // Re-add slot icons and grade frame on top of backgrounds
    // (backgrounds inserted at indices 0-2 push everything else down)
    for (const icon of this._slotIcons) {
      this._root.addChild(icon);
    }
    if (this._gradeFrame) this._root.addChild(this._gradeFrame);
    this._root.addChild(this._effectLayer);
  }

  equip(slotKey: string, itemName: string, itemId = 0, grade = 0): void {
    this._equipped.set(slotKey, { itemId, name: itemName, grade, cash: Math.floor(itemId / 1_000_000) === 5 });
  }
  unequip(slotKey: string): void { this._equipped.delete(slotKey); }

  setPetCount(count: number): void {
    this._petCount = Math.max(1, Math.min(3, Math.trunc(count)));
    if (this._petIndex >= this._petCount) this._petIndex = this._petCount - 1;
  }

  setJobId(jobId: number, level?: number, subJob = 0): void {
    if (level !== undefined) this._level = level;
    if (subJob !== undefined) this._subJob = subJob;
    if (this._jobId === jobId) return;
    this._jobId = jobId;
    this._rebuildBackground();
  }

  setHasNoviceSkill1004(has: boolean): void { this._hasNoviceSkill1004 = has; }

  setEquipped(slotKey: string, itemId: number, name: string, grade = 0): void {
    this._equipped.set(slotKey, { itemId, name, grade, cash: Math.floor(itemId / 1_000_000) === 5 });
  }

  findSlotByItemId(itemId: number): string | null {
    for (const [k, v] of this._equipped) {
      if (v.itemId === itemId) return k;
    }
    return null;
  }

  bodyPartForSlot(slotKey: string): number {
    for (const s of SLOTS) if (s.key === slotKey) return s.bodyPart;
    return -1;
  }

  setEquippedByBodyPart(bodyPart: number, itemId: number, name: string, grade = 0, stats?: EquipStats): void {
    for (const s of SLOTS) {
      if (s.bodyPart === bodyPart) { this._equipped.set(s.key, { itemId, name, grade, cash: Math.floor(itemId / 1_000_000) === 5, stats }); return; }
    }
    for (const s of PET_SLOTS) {
      if (s.bodyPart === bodyPart) { this._equipped.set(s.key, { itemId, name, grade, cash: Math.floor(itemId / 1_000_000) === 5, stats }); return; }
    }
    for (const s of DRAGON_SLOTS) {
      if (s.bodyPart === bodyPart) { this._equipped.set(s.key, { itemId, name, grade, cash: Math.floor(itemId / 1_000_000) === 5, stats }); return; }
    }
    for (const s of MECHANIC_SLOTS) {
      if (s.bodyPart === bodyPart) { this._equipped.set(s.key, { itemId, name, grade, cash: Math.floor(itemId / 1_000_000) === 5, stats }); return; }
    }
  }
  unequipByBodyPart(bodyPart: number): void {
    for (const s of SLOTS) {
      if (s.bodyPart === bodyPart) { this._equipped.delete(s.key); return; }
    }
    for (const s of PET_SLOTS) {
      if (s.bodyPart === bodyPart) { this._equipped.delete(s.key); return; }
    }
    for (const s of DRAGON_SLOTS) {
      if (s.bodyPart === bodyPart) { this._equipped.delete(s.key); return; }
    }
    for (const s of MECHANIC_SLOTS) {
      if (s.bodyPart === bodyPart) { this._equipped.delete(s.key); return; }
    }
  }

  // OG: CUIEquip::SetArrangeButton — set arrange state externally.
  // state=0 → gather (BtGather), state=1 → sort (BtSort).
  setArrangeState(state: number): void {
    this._arrangeState = state;
  }

  onUnequip: ((bodyPart: number) => void) | null = null;

  // OG: CDraggableItem::WearEquipItem — equip from inventory via drag-drop.
  // Callback sends ChangeSlotPosition(invType, invSlot, -bodyPart, 1).
  onEquipDrop: ((invType: number, invSlot: number, bodyPart: number) => void) | null = null;
  // OG: CDraggableItem::GetOffEquipItem — unequip worn item to inventory.
  // Callback sends ChangeSlotPosition(invType, -bodyPart, invSlot, 1).
  onUnequipToInventory: ((invType: number, bodyPart: number, invSlot: number) => void) | null = null;

  showItemReleaseEffect(bodyPart: number): void {
    const anim = this._loader?.LoadAnimation(this._releaseEffectNode) ?? null;
    if (!anim) return;
    this._releaseEffects.push({ bodyPart, anim, elapsedMs: 0 });
  }

  get equippedWeaponItemId(): number | null {
    return this._equipped.get('Weapon')?.itemId ?? null;
  }

  *equippedItemIds(): IterableIterator<number> {
    for (const { itemId } of this._equipped.values()) {
      if (itemId) yield itemId;
    }
  }

  *equippedSlots(): IterableIterator<{ slotKey: string; itemId: number; bodyPart: number }> {
    for (const s of SLOTS) {
      const v = this._equipped.get(s.key);
      if (v && v.itemId) yield { slotKey: s.key, itemId: v.itemId, bodyPart: s.bodyPart };
    }
    for (const s of PET_SLOTS) {
      const v = this._equipped.get(s.key);
      if (v && v.itemId) yield { slotKey: s.key, itemId: v.itemId, bodyPart: s.bodyPart };
    }
  }

  SetPlayerStats(level: number, str: number, dex: number, intt: number, luk: number, jobId: number): void {
    this._tooltip?.SetPlayer(level, str, dex, intt, luk, jobId);
    this.setJobId(jobId, level);
  }

  get tooltipContainer(): Container | null { return this._tooltip?.root ?? null; }

  onResize(viewW: number, viewH: number): void {
    this._viewW = viewW;
    this._viewH = viewH;
  }

  // OG: CUIPetEquip::SetPetConsumeItem / SetPetConsumeMPItem
  setPetConsumeItem(itemId: number): void { this._petConsumeItemId = itemId; }
  setPetConsumeMpItem(itemId: number): void { this._petConsumeMpItemId = itemId; }
  setPetConsumeHpCount(count: number): void { this._petConsumeHpCount = count; }
  setPetConsumeMpCount(count: number): void { this._petConsumeMpCount = count; }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    for (const button of this._buttons) {
      if (button.handleMouseButton(lx, ly, down)) return true;
    }
    // Check pet panel buttons — panel is child of _root, so coords are relative to _root
    if (this._petPanel && this._petShown) {
      const plx = lx - this._petPanel.x;
      const ply = ly - this._petPanel.y;
      for (const btn of this._btPetSelect) {
        if (btn.handleMouseButton(plx, ply, down)) return true;
      }
      if (this._btPetHide?.handleMouseButton(plx, ply, down)) return true;
      if (this._btPetPrev?.handleMouseButton(plx, ply, down)) return true;
      if (this._btPetNext?.handleMouseButton(plx, ply, down)) return true;
    }
    // Check dragon panel slot clicks — child of _root
    if (this._dragonPanel && this._dragonShown && down) {
      const dlx = lx - this._dragonPanel.x;
      const dly = ly - this._dragonPanel.y;
      for (let i = 0; i < DRAGON_SLOTS.length; i++) {
        const s = DRAGON_SLOTS[i];
        if (dlx >= s.ox && dlx < s.ox + SLOT_SIZE && dly >= s.oy && dly < s.oy + SLOT_SIZE) {
          const equipped = this._equipped.get(s.key);
          if (equipped) {
            const icon = this._icons?.LoadIcon(equipped.itemId);
            if (icon) {
              this.onDragStart?.({ itemId: equipped.itemId, slotPos: -s.bodyPart, invType: InventoryType.Equip }, icon.Texture, x, y);
            } else {
              this.onUnequip?.(s.bodyPart);
            }
            return true;
          }
        }
      }
    }
    // Check mechanic panel slot clicks — child of _root
    if (this._mechanicPanel && this._mechanicShown && down) {
      const mlx = lx - this._mechanicPanel.x;
      const mly = ly - this._mechanicPanel.y;
      for (let i = 0; i < MECHANIC_SLOTS.length; i++) {
        const s = MECHANIC_SLOTS[i];
        if (mlx >= s.ox && mlx < s.ox + SLOT_SIZE && mly >= s.oy && mly < s.oy + SLOT_SIZE) {
          const equipped = this._equipped.get(s.key);
          if (equipped) {
            const icon = this._icons?.LoadIcon(equipped.itemId);
            if (icon) {
              this.onDragStart?.({ itemId: equipped.itemId, slotPos: -s.bodyPart, invType: InventoryType.Equip }, icon.Texture, x, y);
            } else {
              this.onUnequip?.(s.bodyPart);
            }
            return true;
          }
        }
      }
    }
    if (!down) return true;
    // OG: CExpandableWndInfo::m_bExpanded — toggle on title bar click
    if (ly < 22 && lx < PANEL_W - 18) { this._expanded = !this._expanded; return true; }

    if (down) {
      for (const s of SLOTS) {
        if (!this._slotVisible(s)) continue;
        if (lx >= s.ox && lx < s.ox + SLOT_SIZE && ly >= s.oy && ly < s.oy + SLOT_SIZE) {
          const equipped = this._equipped.get(s.key);
          if (equipped) {
            // Ctrl+click: unequip directly without drag
            if (typeof window !== 'undefined' && (window as any).__ctrlKey === true) {
              this.onUnequip?.(s.bodyPart);
              return true;
            }
            const icon = this._icons?.LoadIcon(equipped.itemId);
            if (icon) {
              this.onDragStart?.({ itemId: equipped.itemId, slotPos: -s.bodyPart, invType: InventoryType.Equip }, icon.Texture, x, y);
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
    if (key === 'Escape' && this.isVisible) { this.isVisible = false; this._hidePetPanel(); this._hideDragonPanel(); this._hideMechanicPanel(); return true; }
    return false;
  }

  // OG: CDraggableItem::OnDropped → WearEquipItem / GetOffEquipItem.
  // Accepts equip items dragged from inventory (slotPos>0) or worn items dragged
  // from this panel to another slot (slotPos<0, swap).
  tryAcceptDrag(payload: unknown, x: number, y: number): boolean {
    if (!this.isVisible) return false;
    if (!payload || typeof payload !== 'object' || !('invType' in payload)) return false;
    const p = payload as ItemDragPayload;
    if (p.invType !== InventoryType.Equip && p.invType !== InventoryType.Cash) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    // Check pet panel first — child of _root, coords relative to _root
    if (this._petPanel && this._petShown) {
      const plx = lx - this._petPanel.x;
      const ply = ly - this._petPanel.y;
      for (const s of PET_SLOTS) {
        if (plx >= s.ox && plx < s.ox + SLOT_SIZE && ply >= s.oy && ply < s.oy + SLOT_SIZE) {
          if (p.slotPos > 0) {
            // Equip from inventory → pet slot
            this.onEquipDrop?.(p.invType, p.slotPos, s.bodyPart);
          }
          return true;
        }
      }
    }
    // Check dragon panel slots — child of _root
    if (this._dragonPanel && this._dragonShown) {
      const dlx = lx - this._dragonPanel.x;
      const dly = ly - this._dragonPanel.y;
      for (const s of DRAGON_SLOTS) {
        if (dlx >= s.ox && dlx < s.ox + SLOT_SIZE && dly >= s.oy && dly < s.oy + SLOT_SIZE) {
          if (p.slotPos > 0) {
            this.onEquipDrop?.(p.invType, p.slotPos, s.bodyPart);
          }
          return true;
        }
      }
    }
    // Check mechanic panel slots — child of _root
    if (this._mechanicPanel && this._mechanicShown) {
      const mlx = lx - this._mechanicPanel.x;
      const mly = ly - this._mechanicPanel.y;
      for (const s of MECHANIC_SLOTS) {
        if (mlx >= s.ox && mlx < s.ox + SLOT_SIZE && mly >= s.oy && mly < s.oy + SLOT_SIZE) {
          if (p.slotPos > 0) {
            this.onEquipDrop?.(p.invType, p.slotPos, s.bodyPart);
          }
          return true;
        }
      }
    }
    // Check main character equip slots
    for (const s of SLOTS) {
      if (!this._slotVisible(s)) continue;
      if (lx >= s.ox && lx < s.ox + SLOT_SIZE && ly >= s.oy && ly < s.oy + SLOT_SIZE) {
        if (p.slotPos > 0) {
          // Equip from inventory → character slot
          this.onEquipDrop?.(p.invType, p.slotPos, s.bodyPart);
        } else if (p.slotPos < 0) {
          // Swap worn item to a different slot
          const srcBodyPart = -p.slotPos;
          if (srcBodyPart !== s.bodyPart) {
            this.onUnequipToInventory?.(p.invType, srcBodyPart, -s.bodyPart);
          }
        }
        return true;
      }
    }
    return false;
  }

  private _debugLogged = false;
  update(_dt: number): void {
    if (!this.isVisible) {
      this._tooltip?.Hide();
      return;
    }
    if (!this._debugLogged) {
      this._debugLogged = true;
      console.log(`[EquipInv] update called: icons=${!!this._icons}, slotCount=${this._slotIcons.length}, equippedCount=${this._equipped.size}`);
    }

    // OG: CUIWndPosSaved — save position while visible (after drag)
    this._savePosition();

    this._hoverKey = null;
    this._layoutButtons();
    this._effectLayer.removeChildren();
    // OG: CItemInfo::DrawGradeFrame — clear and redraw rarity borders each frame
    this._gradeFrame?.clear();
    const lx = this._mouseX - this._root.x;
    const ly = this._mouseY - this._root.y;
    for (let i = 0; i < SLOTS.length; i++) {
      const s = SLOTS[i];
      const visible = this._slotVisible(s);
      this._slotIcons[i].visible = false;
      if (!visible) continue;
      const equipped = this._equipped.get(s.key);
      const hasItem = equipped !== undefined;

      const icon = hasItem ? (this._icons?.LoadIcon(equipped!.itemId) ?? null) : null;
      if (hasItem && !icon) {
        console.warn(`[EquipInv] No icon for slot ${s.key} item ${equipped!.itemId} (icons=${!!this._icons})`);
      }
      this._slotIcons[i].visible = icon !== null;
      if (icon) {
        this._slotIcons[i].texture = icon.Texture;
      }
      this._slotIcons[i].position.set(s.ox, s.oy);
      // OG: DrawGradeFrame — draw rarity border for equipped items with grade > 0
      if (hasItem && equipped!.grade > 0 && this._gradeFrame) {
        this._drawGradeFrame(this._gradeFrame, equipped!.grade, s.ox, s.oy, SLOT_SIZE, SLOT_SIZE);
      }
      // OG: DrawItemIconForSlot — cash tag overlay in bottom-right corner
      if (hasItem && equipped!.cash && this._icons) {
        const cashTag = this._icons.GetCashTag();
        if (cashTag) {
          cashTag.position.set(s.ox + SLOT_SIZE - cashTag.width, s.oy + SLOT_SIZE - cashTag.height);
          this._effectLayer.addChild(cashTag);
        }
      }
      if (!hasItem && this._wzDisabled && (s.bodyPart === 10 || s.bodyPart === 18 || s.bodyPart === 19 || s.bodyPart === 20)) {
        const disabled = this._wzDisabled.ToPixi();
        disabled.position.set(s.ox, s.oy);
        this._effectLayer.addChild(disabled);
      }
      // OG: Dynamic SetSlotDisable — apply disabled overlay based on character state even when item IS equipped
      if (hasItem && this._wzDisabled && this._isSlotDynamicallyDisabled(s.bodyPart)) {
        const disabled = this._wzDisabled.ToPixi();
        disabled.position.set(s.ox, s.oy);
        this._effectLayer.addChild(disabled);
      }
      if (!hasItem && this._wzCashPendant && s.bodyPart === 59) {
        const pendant = this._wzCashPendant.ToPixi();
        pendant.position.set(s.ox, s.oy);
        this._effectLayer.addChild(pendant);
      }

      if (hasItem && lx >= s.ox && lx < s.ox + SLOT_SIZE && ly >= s.oy && ly < s.oy + SLOT_SIZE) {
        this._hoverKey = s.key;
      }
    }
    this._updateEffects(_dt * 1000);
    this._updatePetPanel(_dt);
    this._updateDragonPanel(_dt);
    this._updateMechanicPanel(_dt);

    if (this._hoverKey !== null) {
      const equipped = this._equipped.get(this._hoverKey);
      if (equipped && this._tooltip) {
        const setCount = this._equippedSetCount(equipped.itemId);
        this._tooltip.Draw(equipped.itemId, equipped.name, 0, 1, this._mouseX, this._mouseY, this._viewW, this._viewH, setCount, undefined, undefined, undefined, undefined, equipped.stats);
      }
    } else {
      this._tooltip?.Hide();
    }
  }

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
    this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0E18', alpha: 240 / 255 });
    this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
    this._bg.rect(0, 0, PANEL_W, 22).fill({ color: '#0F1224' });
  }

  private _layoutButtons(): void {
    if (this._btDragon) {
      // OG: BtDragon shown for Dragon Knight (job==22) or Evan (job==2001)
      const show = this._jobId === 22 || this._jobId === 2001;
      this._btDragon.container.visible = show;
      if (show && this._level < 50) this._btDragon.enabled = false;
    }
    if (this._btMechanic) {
      // OG: BtMechanic shown for Mechanic (job==35), level >= 50
      const show = this._jobId === 35;
      this._btMechanic.container.visible = show;
      if (show && this._level < 50) this._btMechanic.enabled = false;
    }
  }

  private _updateEffects(dtMs: number): void {
    for (let i = this._releaseEffects.length - 1; i >= 0; i--) {
      const fx = this._releaseEffects[i];
      fx.elapsedMs += dtMs;
      if (fx.elapsedMs >= fx.anim.TotalDurationMs) {
        this._releaseEffects.splice(i, 1);
        continue;
      }
      const slot = SLOTS.find((s) => s.bodyPart === fx.bodyPart);
      if (!slot) continue;
      fx.anim.Update(dtMs);
      this._effectLayer.addChild(fx.anim.Draw(slot.ox, slot.oy));
    }
  }

  private _slotVisible(slot: EquipSlotDef): boolean {
    // OG: CExpandableWndInfo::m_bExpanded — bottom row (body parts 18/19/20 + CashPendant)
    if ((slot.bodyPart === 18 || slot.bodyPart === 19 || slot.bodyPart === 20 || slot.bodyPart === 59) && !this._expanded) return false;
    return true;
  }

  // OG: Dynamic SetSlotDisable conditions from CUIEquip::Draw.
  // These override the basic "empty slot" disable and apply based on character state.
  private _isSlotDynamicallyDisabled(bodyPart: number): boolean {
    const job = this._jobId;
    const sub = this._subJob;
    // Condition 1: Shield slot 10 disabled if pet class (nJob/100000==14) and no pet equipped
    if (bodyPart === 10 && Math.floor(job / 100000) === 14) {
      // If no pet equipped in any pet slot, disable shield
      let petEquipped = false;
      for (const ps of PET_SLOTS) {
        if (this._equipped.has(ps.key)) { petEquipped = true; break; }
      }
      if (!petEquipped) return true;
    }
    // Condition 2: Bottom slot 6 disabled if Aran (nJob/10000==105) and no pants equipped
    if (bodyPart === 6 && Math.floor(job / 10000) === 105) {
      if (!this._equipped.has('Bottom')) return true;
    }
    // Condition 3: Slots 18/19/20 disabled if no novice skill 1004
    if ((bodyPart === 18 || bodyPart === 19 || bodyPart === 20) && !this._hasNoviceSkill1004) {
      return true;
    }
    // Condition 4: Shield slot 10 disabled if 1st job non-Mechanic
    if (bodyPart === 10 && Math.floor(job / 1000) === 0 && sub === 1 && Math.floor(job / 10) !== 43) {
      return true;
    }
    return false;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // OG: CUIPetEquip — separate 167×201 window that slides in from the right.
  // Created on BtPet click, destroyed on BtPet hide.
  // Positioned at (CUIEquip.left+183, CUIEquip.top+103) when fully open.
  // Slides from off-screen (CUIEquip.left, CUIEquip.top+103) to target.
  // ──────────────────────────────────────────────────────────────────────────

  private _togglePetPanel(): void {
    if (this._petShown) {
      this._hidePetPanel();
    } else {
      this._showPetPanel();
    }
  }

  private _showPetPanel(): void {
    if (this._petShown) return;
    this._petShown = true;
    if (!this._petPanel) this._createPetPanel();
    if (!this._petPanel) return;
    // OG: positioned at (0, 103) relative to CUIEquip, slides from x=0 to x=183
    this._petPanel.x = 0;
    this._petPanel.y = 103;
    this._petSlideX = 0;
    this._petSlideTargetX = 183;
    this._petPanel.visible = true;
    this._petPanel.alpha = 1;
  }

  private _hidePetPanel(): void {
    if (!this._petShown) return;
    this._petShown = false;
    // OG: reverse animation — slide out then destroy
    if (this._petPanel) {
      this._petSlideTargetX = 0;
    }
  }

  private _createPetPanel(): void {
    const panel = new Container();
    // OG: CUIPetEquip is 167×201
    const petW = 167;
    const petH = 201;

    // Background layers (same 3-layer approach as CUIEquip)
    if (this._petBg) {
      const s1 = this._petBg.ToPixi();
      panel.addChild(s1);
    }
    if (this._petBg2) {
      const s2 = this._petBg2.ToPixi();
      panel.addChild(s2);
    }
    if (this._petBg3) {
      const s3 = this._petBg3.ToPixi();
      panel.addChild(s3);
    }

    // Fallback bg if no WZ
    if (!this._petBg) {
      const g = new Graphics();
      g.rect(0, 0, petW, petH).fill({ color: '#0C0E18', alpha: 240 / 255 });
      g.rect(0, 0, petW, petH).stroke({ color: '#3C4164', width: 1 });
      panel.addChild(g);
    }

    // Pet slot icons — one per PET_SLOTS entry
    this._petSlotIcons = [];
    for (const s of PET_SLOTS) {
      const icon = new Sprite(Texture.EMPTY);
      icon.x = s.ox; icon.y = s.oy;
      this._petSlotIcons.push(icon);
      panel.addChild(icon);
    }

    // Pet consume HP/MP item icons + count text
    this._petHpIcon = new Sprite(Texture.EMPTY);
    this._petHpIcon.x = PET_CONSUME_HP_X; this._petHpIcon.y = PET_CONSUME_HP_Y;
    panel.addChild(this._petHpIcon);
    this._petMpIcon = new Sprite(Texture.EMPTY);
    this._petMpIcon.x = PET_CONSUME_MP_X; this._petMpIcon.y = PET_CONSUME_MP_Y;
    panel.addChild(this._petMpIcon);

    // OG: m_pImgFontNumber renders item counts using WZ digit sprites.
    // Positions: draw_number_by_image(canvas, 44, 43, count, m_pImgFontNumber, 0)
    // Fallback to PIXI.Text if WZ image font not available.
    const hasImgFont = this._imgFontDigits.length > 0;
    if (!hasImgFont) {
      const countStyle = new TextStyle({ fill: '#FFF', fontSize: 10, fontFamily: 'monospace' });
      this._petHpCount = new Text({ text: '', style: countStyle });
      this._petHpCount.x = PET_CONSUME_HP_X; this._petHpCount.y = PET_CONSUME_HP_Y - 12;
      panel.addChild(this._petHpCount);
      this._petMpCount = new Text({ text: '', style: countStyle });
      this._petMpCount.x = PET_CONSUME_MP_X; this._petMpCount.y = PET_CONSUME_MP_Y - 12;
      panel.addChild(this._petMpCount);
    }

    // OG: BtHide (ID 2000) at (125, 159)
    // OG: BtPets[0-2] (IDs 2001-2003) at (10, 151/185/219) — pet selection tabs
    this._btPetSelect = [];
    if (this._loader && this._petProp) {
      // WZ pet selection buttons
      for (let i = 0; i < 3; i++) {
        const btNode = this._petProp.Get(`BtPet${i}`);
        if (btNode instanceof WzProperty) {
          const btn = Button.fromWz(this._loader, btNode, `${i + 1}`);
          const idx = i;
          btn.onClick = () => { this._petIndex = idx; };
          btn.container.x = 10;
          btn.container.y = 151 + i * 34;
          this._btPetSelect.push(btn);
          panel.addChild(btn.container);
        }
      }
      // WZ close button
      const btHideNode = this._petProp.Get('BtHide');
      if (btHideNode instanceof WzProperty) {
        this._btPetHide = Button.fromWz(this._loader, btHideNode, 'X');
        this._btPetHide.onClick = () => { this._hidePetPanel(); };
        this._btPetHide.container.x = 125;
        this._btPetHide.container.y = 159;
        panel.addChild(this._btPetHide.container);
      }
    }
    // Fallback: Graphics-based buttons if WZ unavailable
    if (this._btPetSelect.length === 0) {
      const tabStyle = new TextStyle({ fill: '#DCC896', fontSize: 10, fontFamily: 'monospace' });
      for (let i = 0; i < 3; i++) {
        const tab = new Graphics();
        tab.rect(10, 151 + i * 34, 32, 28).fill({ color: '#1A1D2E' });
        tab.rect(10, 151 + i * 34, 32, 28).stroke({ color: '#3C4164', width: 1 });
        panel.addChild(tab);
        const label = new Text({ text: `${i + 1}`, style: tabStyle });
        label.x = 22; label.y = 158 + i * 34;
        panel.addChild(label);
      }
      // Prev/Next arrows
      const arrowStyle = new TextStyle({ fill: '#DCC896', fontSize: 14, fontFamily: 'monospace' });
      const prevArrow = new Text({ text: '<', style: arrowStyle });
      prevArrow.x = 47; prevArrow.y = 34;
      prevArrow.eventMode = 'static'; prevArrow.cursor = 'pointer';
      prevArrow.on('pointertap', () => { this._petIndex = (this._petIndex - 1 + this._petCount) % this._petCount; });
      panel.addChild(prevArrow);
      this._btPetPrev = null;
      const nextArrow = new Text({ text: '>', style: arrowStyle });
      nextArrow.x = 113; nextArrow.y = 34;
      nextArrow.eventMode = 'static'; nextArrow.cursor = 'pointer';
      nextArrow.on('pointertap', () => { this._petIndex = (this._petIndex + 1) % this._petCount; });
      panel.addChild(nextArrow);
      this._btPetNext = null;
      // BtHide fallback
      if (!this._btPetHide) {
        const hideBtn = new Text({ text: 'X', style: new TextStyle({ fill: '#FF6666', fontSize: 12, fontFamily: 'monospace' }) });
        hideBtn.x = 125; hideBtn.y = 159;
        hideBtn.eventMode = 'static'; hideBtn.cursor = 'pointer';
        hideBtn.on('pointertap', () => { this._hidePetPanel(); });
        panel.addChild(hideBtn);
        this._btPetHide = null;
      }
    }

    this._petPanel = panel;
    // OG: CUIPetEquip is a child of CUIEquip — moves with it when dragged
    this._root.addChild(panel);
  }

  private _updatePetPanel(_dt: number): void {
    if (!this._petPanel) return;
    // Slide animation — panel is child of equip, so x is relative to equip origin
    if (this._petSlideX !== this._petSlideTargetX) {
      const diff = this._petSlideTargetX - this._petSlideX;
      const step = Math.sign(diff) * Math.min(Math.abs(diff), 12 * (_dt / 16.67));
      this._petSlideX += step;
      if (Math.abs(this._petSlideTargetX - this._petSlideX) < 1) {
        this._petSlideX = this._petSlideTargetX;
      }
      this._petPanel.x = this._petSlideX;
      this._petPanel.y = 103;
    }
    // When slide-out complete, hide panel
    if (!this._petShown && this._petSlideX === 0 && this._petPanel) {
      this._petPanel.visible = false;
    }
    // Update pet slot icons
    for (let i = 0; i < PET_SLOTS.length; i++) {
      const s = PET_SLOTS[i];
      const bodyPartIdx = PET_BODY_PART_PET_INDEX[s.bodyPart];
      const visible = bodyPartIdx === this._petIndex || bodyPartIdx === -1;
      this._petSlotIcons[i].visible = visible;
      if (!visible) continue;
      const equipped = this._equipped.get(s.key);
      const icon = equipped ? (this._icons?.LoadIcon(equipped.itemId) ?? null) : null;
      if (icon) {
        this._petSlotIcons[i].texture = icon.Texture;
      } else {
        this._petSlotIcons[i].texture = Texture.EMPTY;
      }
    }
    // Update pet consume icons
    if (this._petConsumeItemId && this._icons) {
      const icon = this._icons.LoadIcon(this._petConsumeItemId);
      if (icon) { this._petHpIcon!.texture = icon.Texture; }
    }
    if (this._petConsumeMpItemId && this._icons) {
      const icon = this._icons.LoadIcon(this._petConsumeMpItemId);
      if (icon) { this._petMpIcon!.texture = icon.Texture; }
    }
    if (this._petHpCount) this._petHpCount.text = this._petConsumeHpCount > 0 ? `${this._petConsumeHpCount}` : '';
    if (this._petMpCount) this._petMpCount.text = this._petConsumeMpCount > 0 ? `${this._petConsumeMpCount}` : '';
    // WZ image font rendering for pet consume item counts
    if (this._imgFontDigits.length > 0 && this._petPanel) {
      this._drawNumberByImage(this._imgFontHpDigits, this._petConsumeHpCount, PET_CONSUME_HP_X, PET_CONSUME_HP_Y - 12);
      this._drawNumberByImage(this._imgFontMpDigits, this._petConsumeMpCount, PET_CONSUME_MP_X, PET_CONSUME_MP_Y - 12);
      for (const s of this._imgFontHpDigits) { if (!s.parent) this._petPanel.addChild(s); }
      for (const s of this._imgFontMpDigits) { if (!s.parent) this._petPanel.addChild(s); }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // OG: CUIDragonEquip — separate 151×172 window that slides in from the LEFT.
  // Created on BtDragon click (job==22 or job==2001), destroyed on re-click.
  // Positioned at (CUIEquip.left - 151, CUIEquip.top) when fully open.
  // ──────────────────────────────────────────────────────────────────────────

  private _toggleDragonPanel(): void {
    if (this._dragonShown) {
      this._hideDragonPanel();
    } else {
      this._showDragonPanel();
    }
  }

  private _showDragonPanel(): void {
    if (this._dragonShown) return;
    this._dragonShown = true;
    if (!this._dragonPanel) this._createDragonPanel();
    if (!this._dragonPanel) return;
    // OG: positioned at (-151, 0) relative to CUIEquip, slides from x=0 to x=-151
    this._dragonPanel.x = 0;
    this._dragonPanel.y = 0;
    this._dragonSlideX = 0;
    this._dragonSlideTargetX = -DRAGON_PANEL_W;
    this._dragonPanel.visible = true;
  }

  private _hideDragonPanel(): void {
    if (!this._dragonShown) return;
    this._dragonShown = false;
    if (this._dragonPanel) {
      this._dragonSlideTargetX = 0;
    }
  }

  private _createDragonPanel(): void {
    const panel = new Container();

    // OG: CUIDragonEquip uses put_overlay on CUIEquip's layer at z=-1
    // Background layers
    if (this._dragonBg) {
      const s1 = this._dragonBg.ToPixi();
      panel.addChild(s1);
    }
    if (this._dragonBg2) {
      const s2 = this._dragonBg2.ToPixi();
      panel.addChild(s2);
    }
    if (this._dragonBg3) {
      const s3 = this._dragonBg3.ToPixi();
      panel.addChild(s3);
    }

    // Fallback bg if no WZ
    if (!this._dragonBg) {
      const g = new Graphics();
      g.rect(0, 0, DRAGON_PANEL_W, DRAGON_PANEL_H).fill({ color: '#0C0E18', alpha: 240 / 255 });
      g.rect(0, 0, DRAGON_PANEL_W, DRAGON_PANEL_H).stroke({ color: '#3C4164', width: 1 });
      panel.addChild(g);
    }

    // Dragon slot icons
    this._dragonSlotIcons = [];
    for (const s of DRAGON_SLOTS) {
      const icon = new Sprite(Texture.EMPTY);
      icon.x = s.ox; icon.y = s.oy;
      this._dragonSlotIcons.push(icon);
      panel.addChild(icon);
    }

    this._dragonPanel = panel;
    // OG: CUIDragonEquip is a child of CUIEquip — moves with it when dragged
    this._root.addChild(panel);
  }

  private _updateDragonPanel(_dt: number): void {
    if (!this._dragonPanel) return;
    // Slide animation — panel is child of equip, so x is relative to equip origin
    if (this._dragonSlideX !== this._dragonSlideTargetX) {
      const diff = this._dragonSlideTargetX - this._dragonSlideX;
      const step = Math.sign(diff) * Math.min(Math.abs(diff), 12 * (_dt / 16.67));
      this._dragonSlideX += step;
      if (Math.abs(this._dragonSlideTargetX - this._dragonSlideX) < 1) {
        this._dragonSlideX = this._dragonSlideTargetX;
      }
      this._dragonPanel.x = this._dragonSlideX;
      this._dragonPanel.y = 0;
    }
    // When slide-out complete, hide panel
    if (!this._dragonShown && this._dragonSlideX === 0 && this._dragonPanel) {
      this._dragonPanel.visible = false;
    }
    // Update dragon slot icons
    for (let i = 0; i < DRAGON_SLOTS.length; i++) {
      const s = DRAGON_SLOTS[i];
      const equipped = this._equipped.get(s.key);
      const icon = equipped ? (this._icons?.LoadIcon(equipped.itemId) ?? null) : null;
      this._dragonSlotIcons[i].visible = icon !== null;
      if (icon) {
        this._dragonSlotIcons[i].texture = icon.Texture;
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // OG: CUIMechanicEquip — separate 151×172 window that slides in from the LEFT.
  // Created on BtMechanic click (job==35, level>=50), destroyed on re-click.
  // Positioned at (CUIEquip.left - 151, CUIEquip.top) when fully open.
  // ──────────────────────────────────────────────────────────────────────────

  private _toggleMechanicPanel(): void {
    if (this._mechanicShown) {
      this._hideMechanicPanel();
    } else {
      this._showMechanicPanel();
    }
  }

  private _showMechanicPanel(): void {
    if (this._mechanicShown) return;
    this._mechanicShown = true;
    if (!this._mechanicPanel) this._createMechanicPanel();
    if (!this._mechanicPanel) return;
    // OG: positioned at (-151, 0) relative to CUIEquip, slides from x=0 to x=-151
    this._mechanicPanel.x = 0;
    this._mechanicPanel.y = 0;
    this._mechanicSlideX = 0;
    this._mechanicSlideTargetX = -MECHANIC_PANEL_W;
    this._mechanicPanel.visible = true;
  }

  private _hideMechanicPanel(): void {
    if (!this._mechanicShown) return;
    this._mechanicShown = false;
    if (this._mechanicPanel) {
      this._mechanicSlideTargetX = 0;
    }
  }

  private _createMechanicPanel(): void {
    const panel = new Container();

    // Background layers
    if (this._mechanicBg) {
      const s1 = this._mechanicBg.ToPixi();
      panel.addChild(s1);
    }
    if (this._mechanicBg2) {
      const s2 = this._mechanicBg2.ToPixi();
      panel.addChild(s2);
    }
    if (this._mechanicBg3) {
      const s3 = this._mechanicBg3.ToPixi();
      panel.addChild(s3);
    }

    // Fallback bg if no WZ
    if (!this._mechanicBg) {
      const g = new Graphics();
      g.rect(0, 0, MECHANIC_PANEL_W, MECHANIC_PANEL_H).fill({ color: '#0C0E18', alpha: 240 / 255 });
      g.rect(0, 0, MECHANIC_PANEL_W, MECHANIC_PANEL_H).stroke({ color: '#3C4164', width: 1 });
      panel.addChild(g);
    }

    // Mechanic slot icons
    this._mechanicSlotIcons = [];
    for (const s of MECHANIC_SLOTS) {
      const icon = new Sprite(Texture.EMPTY);
      icon.x = s.ox; icon.y = s.oy;
      this._mechanicSlotIcons.push(icon);
      panel.addChild(icon);
    }

    this._mechanicPanel = panel;
    // OG: CUIMechanicEquip is a child of CUIEquip — moves with it when dragged
    this._root.addChild(panel);
  }

  private _updateMechanicPanel(_dt: number): void {
    if (!this._mechanicPanel) return;
    // Slide animation — panel is child of equip, so x is relative to equip origin
    if (this._mechanicSlideX !== this._mechanicSlideTargetX) {
      const diff = this._mechanicSlideTargetX - this._mechanicSlideX;
      const step = Math.sign(diff) * Math.min(Math.abs(diff), 12 * (_dt / 16.67));
      this._mechanicSlideX += step;
      if (Math.abs(this._mechanicSlideTargetX - this._mechanicSlideX) < 1) {
        this._mechanicSlideX = this._mechanicSlideTargetX;
      }
      this._mechanicPanel.x = this._mechanicSlideX;
      this._mechanicPanel.y = 0;
    }
    // When slide-out complete, hide panel
    if (!this._mechanicShown && this._mechanicSlideX === 0 && this._mechanicPanel) {
      this._mechanicPanel.visible = false;
    }
    // Update mechanic slot icons
    for (let i = 0; i < MECHANIC_SLOTS.length; i++) {
      const s = MECHANIC_SLOTS[i];
      const equipped = this._equipped.get(s.key);
      const icon = equipped ? (this._icons?.LoadIcon(equipped.itemId) ?? null) : null;
      this._mechanicSlotIcons[i].visible = icon !== null;
      if (icon) {
        this._mechanicSlotIcons[i].texture = icon.Texture;
      }
    }
  }
}
