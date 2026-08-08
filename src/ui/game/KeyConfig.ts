import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { Button } from '../Button.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzSprite } from '../../render/WzSprite.js';
import { FuncKeyMapped, FuncKeyType, FuncKeyMappedNone } from '../../domain/FuncKeyMapped.js';
import { CellSize, PaletteCount, ScRShift, ScLShift, ScRCtrl, ScLCtrl, ScRAlt, ScLAlt, 
getBindableScancodes, tryGetCell, keyLabelOffset, paletteCell, hitTestKey, hitTestPalette, paletteBinding, paletteSlotOf, initLayout } 
from './KeyConfigLayout.js';
import type { DragTarget } from '../DragController.js';

export enum KeyAction {
  None = -1,
  Equipment = 0,
  Items = 1,
  Stats = 2,
  Skills = 3,
  Friends = 4,
  WorldMap = 5,
  MapleChat = 6,
  MiniMap = 7,
  QuestLog = 8,
  KeyBindings = 9,
  Say = 10,
  Whisper = 11,
  PartyChat = 12,
  FriendsChat = 13,
  Menu = 14,
  QuickSlots = 15,
  ToggleChat = 16,
  Guild = 17,
  GuildChat = 18,
  Party = 19,
  Notifier = 20,
  SpouseChat = 21,
  CashShop = 22,
  AllianceChat = 24,
  ManageLegion = 25,
  Family = 26,
  BossParty = 27,
  ExpeditionChat = 29,
  CharInfo = 44,
  ChangeChannel = 45,
  MainMenu = 46,
  Screenshot = 47,
  PickUp = 50,
  Sit = 51,
  Attack = 52,
  Jump = 53,
  Interact = 54,
  MoveLeft = 1002,
  MoveRight = 1003,
}

const MapSize = 89;

enum Confirm { None, Default, Delete }

const DefIndex = [2, 3, 4, 5, 6, 7, 8, 16, 17, 18, 19, 20, 23, 24, 25, 26, 27, 29, 31, 33, 34, 35, 37, 38, 39, 40, 41, 43, 44, 45, 46, 50, 56, 57, 59, 60, 61, 62, 63, 64, 65];
const DefType = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 4, 4, 5, 5, 6, 6, 6, 6, 6, 6, 6];
const DefId = [10, 12, 13, 18, 24, 21, 29, 8, 5, 0, 4, 28, 1, 25, 19, 14, 15, 52, 2, 26, 17, 11, 3, 20, 27, 16, 23, 9, 50, 51, 6, 7, 53, 54, 100, 101, 102, 103, 104, 105, 106];

type FuncKeyMappedRecord = { type: FuncKeyType; id: number };

export class KeyConfig extends GamePanel implements DragTarget {
  private readonly _map: FuncKeyMappedRecord[] = Array.from({ length: MapSize }, () => FuncKeyMappedNone);
  private readonly _mapOnOpen: FuncKeyMappedRecord[] = Array.from({ length: MapSize }, () => FuncKeyMappedNone);

  private readonly _loader: WzTextureLoader;
  private readonly _kc: WzProperty | null;
  private readonly _kc2: WzProperty | null;
  private readonly _iconRoot: WzProperty | null;

  private readonly _bg: Sprite | null;
  private readonly _bg2: Sprite | null;
  private readonly _bg3: Sprite | null;
  private readonly _iconCache = new Map<number, WzSprite | null>();
  private readonly _keyCells = new Map<number, WzSprite | null>();
  private readonly _font: BuiltInFont | null;

  private readonly _btClose: Button | null;
  private readonly _btHelp: Button | null;
  private readonly _btOk: Button | null;
  private readonly _btCancel: Button | null;
  private readonly _btDefault: Button | null;
  private readonly _btDelete: Button | null;
  private readonly _btQuickSlot: Button | null;
  private readonly _allButtons: Button[] = [];

  // OG: Notice dialog backgrounds — notice/0-2
  private _noticeBgs: (Sprite | null)[] = [];
  // OG: QuickSlot config sub-dialog
  private _qsBg: Sprite | null = null;
  private _qsBtOK: Button | null = null;
  private _qsBtCancel: Button | null = null;
  private _qsBtQuickSetting: Button | null = null;

  private _dragActive = false;
  private _dragIcon: FuncKeyMappedRecord = FuncKeyMappedNone;
  private _dragFromScancode = -1;
  private _dragMouseX = 0;
  private _dragMouseY = 0;

  // Click-to-bind: selected key cell waiting for a palette action
  private _selectedKeySc = -1;

  private _windowDrag = false;
  private _windowDragOffX = 0;
  private _windowDragOffY = 0;

  private _confirm: Confirm = Confirm.None;

  private readonly _panelW: number;
  private readonly _panelH: number;

  private readonly _gfx: Graphics;
  private readonly _content: Container;
  private readonly _clip: Graphics;

  onBindingsChanged: (() => void) | null = null;
  onSaveToServer: ((changed: { index: number; fk: FuncKeyMappedRecord }[]) => void) | null = null;
  onOpenQuickSlot: (() => void) | null = null;
  skillIconResolver: ((skillId: number) => WzSprite | null) | null = null;
  itemIconResolver: ((itemId: number) => WzSprite | null) | null = null;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    initLayout();
    super();
    this._loader = loader;
    this._font = font;
    this.isVisible = false;
    this._root.position.set(200, 150);

    this._kc = ui?.GetItem('UIWindow.img/KeyConfig') as WzProperty | null;
    this._kc2 = ui?.GetItem('UIWindow2.img/KeyConfig') as WzProperty | null;
    this._iconRoot = this._kc2?.Get('icon') as WzProperty | null;
    this._bg = this._loadCanvas(this._kc2 ?? this._kc, 'backgrnd');
    this._bg2 = this._loadCanvas(this._kc2, 'backgrnd2');
    this._bg3 = this._loadCanvas(this._kc2, 'backgrnd3');
    this._panelW = this._bg?.width ?? 622;
    this._panelH = this._bg?.height ?? 374;

    // OG: Notice dialog backgrounds — notice/0-2 (260x84 each)
    this._noticeBgs = [];
    const noticeProp = this._kc2?.Get('notice');
    if (noticeProp instanceof WzProperty) {
      for (let i = 0; i < 3; i++) {
        const node = noticeProp.Get(String(i));
        if (node instanceof WzCanvas) {
          const s = this._loader.Load(node)?.ToPixi() ?? null;
          this._noticeBgs.push(s);
        } else {
          this._noticeBgs.push(null);
        }
      }
    }

    // OG: QuickSlot config sub-dialog — quickslotConfig/backgrnd (230x210)
    const qsProp = this._kc2?.Get('quickslotConfig') as WzProperty | null;
    this._qsBg = this._loadCanvas(qsProp, 'backgrnd');
    this._qsBtOK = this._makeQsBtn(qsProp, 'BtOK');
    this._qsBtCancel = this._makeQsBtn(qsProp, 'BtCancel');
    this._qsBtQuickSetting = this._makeQsBtn(qsProp, 'BtQuickSetting');

    this._btClose = this._makeBtn('BtClose', () => this._closeCancel());
    this._btHelp = this._makeBtn('BtHelp', () => { });
    this._btOk = this._makeBtn('BtOK', () => this._closeOk());
    this._btCancel = this._makeBtn('BtCancel', () => this._closeCancel());
    this._btDefault = this._makeBtn('BtDefault', () => { this._confirm = Confirm.Default; });
    this._btDelete = this._makeBtn('BtDelete', () => { this._confirm = Confirm.Delete; });
    this._btQuickSlot = this._makeBtn('BtQuickSlot', () => { this.onOpenQuickSlot?.(); });

    this._gfx = new Graphics();
    this._content = new Container();
    this._clip = new Graphics();
    this._clip.rect(0, 0, this._panelW, this._panelH).fill({ color: 0xFFFFFF });
    this._content.mask = this._clip;
    this._gfx.mask = this._clip;
    this._root.addChild(this._clip, this._content, this._gfx);

    this._loadDefaultMap();
  }

  private _loadCanvas(root: WzProperty | null | undefined, name: string): Sprite | null {
    const c = root?.Get(name);
    return c instanceof WzCanvas ? this._loader.Load(c)?.ToPixi() ?? null : null;
  }

  private _makeBtn(name: string, onClick: () => void): Button | null {
    // OG CUIKeyConfig::OnCreate @0x7dc5d0: AddButton("UI/UIWindow2.img/KeyConfig/<name>", nId, 0, 0).
    // The UIWindow.img/KeyConfig copy with BtClose/BtHelp is a different (older) window — not v95.
    const pr = this._kc2?.Get(name) as WzProperty | null;
    if (!pr) return null;
    const b = Button.fromWz(this._loader, pr);
    b.onClick = onClick;
    this._allButtons.push(b);
    return b;
  }

  private _makeQsBtn(qsProp: WzProperty | undefined | null, name: string): Button | null {
    const pr = qsProp?.Get(name) as WzProperty | null;
    if (!pr) return null;
    const b = Button.fromWz(this._loader, pr);
    return b;
  }

  forKey(keyCode: string): FuncKeyMappedRecord {
    const sc = this._keysToScanCode(keyCode);
    if (sc < 0 || sc >= MapSize) return FuncKeyMappedNone;
    return this._map[sc];
  }

  isActionDown(isKeyDown: (key: string) => boolean, action: KeyAction): boolean {
    switch (action) {
      case KeyAction.MoveLeft: return isKeyDown('ArrowLeft');
      case KeyAction.MoveRight: return isKeyDown('ArrowRight');
      case KeyAction.Jump: return isKeyDown('Alt') || this._anyHeld(isKeyDown, FuncKeyType.BasicAction, 53);
      default: {
        const fk = this._actionToFk(action);
        if (!fk) return false;
        return this._anyHeld(isKeyDown, fk.type, fk.id);
      }
    }
  }

  private _anyHeld(isKeyDown: (key: string) => boolean, type: FuncKeyType, id: number): boolean {
    for (let sc = 0; sc < MapSize; sc++) {
      const fk = this._map[sc];
      if (fk.type !== type || fk.id !== id) continue;
      const key = this._scanCodeToKey(sc);
      if (key && isKeyDown(key)) return true;
      const sibling = this._rightMod(sc);
      if (sibling && isKeyDown(sibling)) return true;
    }
    return false;
  }

  private _rightMod(sc: number): string | null {
    // OG: right modifier keys map to left modifier for binding lookup
    if (sc === ScLCtrl || sc === ScRCtrl) return 'Control';
    if (sc === ScLShift || sc === ScRShift) return 'Shift';
    if (sc === ScLAlt || sc === ScRAlt) return 'Alt';
    return null;
  }

  exportMap(): FuncKeyMappedRecord[] {
    return this._map.slice();
  }

  importMap(map: FuncKeyMappedRecord[] | null): void {
    if (!map || map.length === 0) return;
    for (let i = 0; i < MapSize; i++) {
      this._map[i] = i < map.length ? map[i] : FuncKeyMappedNone;
    }
  }

  applyServerKeymap(entries: { keyIndex: number; type: number; actionId: number }[]): void {
    this._map.fill({ ...FuncKeyMappedNone });
    for (const e of entries) {
      if (e.keyIndex < 0 || e.keyIndex >= MapSize) continue;
      if (e.type < 0 || e.type > 8) continue;
      this._map[e.keyIndex] = { type: e.type as FuncKeyType, id: e.actionId };
    }
    this._snapshotOpen();
  }

  open(): void {
    this.isVisible = true;
    this._snapshotOpen();
    this._cancelDrag();
    this._confirm = Confirm.None;
  }

  bindingAt(scancode: number): FuncKeyMappedRecord {
    return scancode >= 0 && scancode < MapSize ? this._map[scancode] : FuncKeyMappedNone;
  }

  bindSkillToKey(scancode: number, skillId: number): void {
    if (scancode < 0 || scancode >= MapSize) return;
    const fk: FuncKeyMappedRecord = { type: FuncKeyType.Skill, id: skillId };
    const changed: { index: number; fk: FuncKeyMappedRecord }[] = [];
    for (let i = 0; i < MapSize; i++) {
      if (this._map[i].type === FuncKeyType.Skill && this._map[i].id === skillId && i !== scancode) {
        this._map[i] = { ...FuncKeyMappedNone };
        changed.push({ index: i, fk: FuncKeyMappedNone });
      }
    }
    this._map[scancode] = fk;
    changed.push({ index: scancode, fk });
    for (let i = 0; i < MapSize; i++) this._mapOnOpen[i] = { ...this._map[i] };
    this.onSaveToServer?.(changed);
    this.onBindingsChanged?.();
  }

  // OG: CFuncKeyMappedMan — bind item to key slot (FuncKeyType.Item).
  bindItemToKey(scancode: number, itemId: number): void {
    if (scancode < 0 || scancode >= MapSize) return;
    const fk: FuncKeyMappedRecord = { type: FuncKeyType.Item, id: itemId };
    const changed: { index: number; fk: FuncKeyMappedRecord }[] = [];
    for (let i = 0; i < MapSize; i++) {
      if (this._map[i].type === FuncKeyType.Item && this._map[i].id === itemId && i !== scancode) {
        this._map[i] = { ...FuncKeyMappedNone };
        changed.push({ index: i, fk: FuncKeyMappedNone });
      }
    }
    this._map[scancode] = fk;
    changed.push({ index: scancode, fk });
    for (let i = 0; i < MapSize; i++) this._mapOnOpen[i] = { ...this._map[i] };
    this.onSaveToServer?.(changed);
    this.onBindingsChanged?.();
  }

  tryBindSkillAt(skillId: number, screenX: number, screenY: number): boolean {
    if (!this.isVisible) return false;
    const lx = screenX - this._root.x;
    const ly = screenY - this._root.y;
    const sc = hitTestKey(lx, ly);
    if (sc < 0) return false;
    const fk: FuncKeyMappedRecord = { type: FuncKeyType.Skill, id: skillId };
    for (let i = 0; i < MapSize; i++) {
      if (this._map[i].type === FuncKeyType.Skill && this._map[i].id === skillId) {
        this._map[i] = { ...FuncKeyMappedNone };
      }
    }
    this._map[sc] = fk;
    // TODO_AUDIT.md Hundred-and-fifteenth pass: notify callers of binding change
    // (was missing — the binding took effect but onBindingsChanged was never fired).
    this.onBindingsChanged?.();
    return true;
  }

  // TODO_AUDIT.md Hundred-and-fifteenth pass: implement DragTarget so that
  // GameStage's endDrag(visible, x, y) loop offers skill drops to KeyConfig.
  // QuickSlotBar already implements DragTarget this way (Pass 108); KeyConfig had
  // tryBindSkillAt but was never registered as a drop target (zero callers).
  // Also handles item drops (OG: CDraggableItem → CUIKeyConfig::MapFuncKey).
  tryAcceptDrag(payload: unknown, x: number, y: number): boolean {
    if (!payload || typeof payload !== 'object') return false;
    if ('skillId' in payload) return this.tryBindSkillAt((payload as { skillId: number }).skillId, x, y);
    if ('itemId' in payload && 'invType' in payload) {
      const { itemId, invType } = payload as { itemId: number; invType: number };
      if (invType === 2 || invType === 3 || invType === 4) {
        return this.tryBindItemAt(itemId, x, y);
      }
    }
    return false;
  }

  tryBindItemAt(itemId: number, screenX: number, screenY: number): boolean {
    if (!this.isVisible) return false;
    const lx = screenX - this._root.x;
    const ly = screenY - this._root.y;
    const sc = hitTestKey(lx, ly);
    if (sc < 0) return false;
    this.bindItemToKey(sc, itemId);
    return true;
  }

  update(_dt: number): void {
    this._layoutButtons();
    if (!this.isVisible) return;
    this.draw();
  }

  onMouseMove(x: number, y: number): void {
    this._dragMouseX = x;
    this._dragMouseY = y;
    if (this._windowDrag) {
      this._root.x = x - this._windowDragOffX;
      this._root.y = y - this._windowDragOffY;
    }
  }

  draw(): void {
    if (!this.isVisible) return;
    this._content.removeChildren();
    this._gfx.clear();

    if (this._bg) {
      this._bg.position.set(0, 0);
      this._content.addChild(this._bg);
      if (this._bg2) { this._bg2.position.set(0, 0); this._content.addChild(this._bg2); }
      if (this._bg3) { this._bg3.position.set(0, 0); this._content.addChild(this._bg3); }
    } else {
      this._gfx.rect(0, 0, this._panelW, this._panelH).fill({ color: 0x0c0c16, alpha: 0.95 });
      if (this._font) {
        const t = new Text({ text: 'Key Configuration', style: new TextStyle({ fill: 0xdcc896, fontSize: 11, fontFamily: 'monospace' }) });
        t.position.set(230, 6);
        this._content.addChild(t);
      }
    }

    this._drawKeyCells();
    this._drawKeyIcons();
    this._drawPalette();

    for (const b of this._allButtons) {
      this._content.addChild(b.container);
    }

    if (this._dragActive) {
      const dmLx = this._dragMouseX - this._root.x;
      const dmLy = this._dragMouseY - this._root.y;
      const icon = this._iconFor(this._dragIcon);
      if (icon) {
        const s = icon.ToPixi();
        // Anchor is OriginY/Height; most key icons have origin at bottom
        s.position.set(dmLx - icon.Width * s.anchor.x, dmLy - icon.Height * s.anchor.y);
        this._content.addChild(s);
      } else {
        this._drawPlaceholder(dmLx - 16, dmLy - 16, this._dragIcon);
      }
    }

    if (this._confirm !== Confirm.None) {
      this._drawConfirm();
    }
  }

  private _drawKeyIcons(): void {
    for (const sc of getBindableScancodes()) {
      let bindSc = sc;
      if (sc === ScRShift) bindSc = ScLShift;
      else if (sc === ScRCtrl) bindSc = ScLCtrl;
      else if (sc === ScRAlt) bindSc = ScLAlt;
      if (bindSc < 0 || bindSc >= MapSize) continue;
      const fk = this._map[bindSc];
      if (!this._isBound(fk)) continue;
      const cell = tryGetCell(sc);
      if (!cell) continue;
      this._drawIconAt(cell.x, cell.y, fk);
    }
  }

  private _drawKeyCells(): void {
    for (const sc of getBindableScancodes()) {
      const cell = tryGetCell(sc);
      if (!cell) continue;
      // WZ key/<sc> are the engraved key-cap labels; the caps themselves are
      // baked into the backgrnd image. OG DrawKeys @0x7da030 stamps the label
      // at a fixed nudge from the cell origin.
      const wz = this._loadKeyCell(sc);
      if (wz) {
        const off = keyLabelOffset(sc);
        const s = wz.ToPixi();
        s.position.set(cell.x + off.dx, cell.y + off.dy);
        this._content.addChild(s);
      } else {
        this._gfx.rect(cell.x, cell.y, CellSize, CellSize).fill({ color: 0x2a2d3a });
        this._gfx.rect(cell.x, cell.y, CellSize, CellSize).stroke({ color: 0x3c4060, width: 1 });
      }
      // Highlight selected key (awaiting palette action)
      if (sc === this._selectedKeySc) {
        this._gfx.rect(cell.x - 1, cell.y - 1, CellSize + 2, CellSize + 2).stroke({ color: 0xffd700, width: 2 });
      }
      // OG DrawKeys: the left modifier label is also stamped onto the right
      // modifier cap (no WZ sprites exist for RShift/RCtrl/RAlt).
      const rightSc = sc === ScLShift ? ScRShift : sc === ScLCtrl ? ScRCtrl : sc === ScLAlt ? ScRAlt : -1;
      if (rightSc >= 0) {
        const rc = tryGetCell(rightSc);
        if (rc && wz) {
          const off = keyLabelOffset(rightSc);
          const rs = wz.ToPixi();
          rs.position.set(rc.x + off.dx, rc.y + off.dy);
          this._content.addChild(rs);
        }
      }
    }
    for (let slot = 0; slot < PaletteCount; slot++) {
      const cell = paletteCell(slot);
      this._gfx.rect(cell.x, cell.y, CellSize, CellSize).fill({ color: 0x1e2030 });
      this._gfx.rect(cell.x, cell.y, CellSize, CellSize).stroke({ color: 0x2d3048, width: 1 });
    }
  }

  private _drawPalette(): void {
    for (let slot = 0; slot < PaletteCount; slot++) {
      const fk = paletteBinding(slot);
      if (fk.type === FuncKeyType.Menu && fk.id === 22) continue;
      if (this._dragActive && fk.type === this._dragIcon.type && fk.id === this._dragIcon.id) continue;
      const cell = paletteCell(slot);
      // OG: placed items shown dimmed, unplaced items shown fully
      const isPlaced = this._isPlaced(fk);
      this._drawIconAt(cell.x, cell.y, fk, isPlaced ? 0.4 : 1.0);
    }
  }

  private _isPlaced(fk: FuncKeyMappedRecord): boolean {
    for (let i = 0; i < MapSize; i++) {
      if (this._map[i].type === fk.type && this._map[i].id === fk.id) return true;
    }
    return false;
  }

private _drawIconAt(cellX: number, cellY: number, fk: FuncKeyMappedRecord, alpha = 1.0): void {
    const icon = this._iconFor(fk);
    if (icon) {
      const s = icon.ToPixi();
      // OG DrawItemIcon/DrawSkillIcon receives the cell baseline at y + CellSize.
      // The icons are origin=(0,height) → anchor.y = 1; we want the icon's BOTTOM
      // edge on the cell bottom, so place at cellY + CellSize (NOT minus the
      // anchor height, which lifts the icon one whole cell).
      s.position.set(cellX, cellY + CellSize - icon.Height * (1 - s.anchor.y));
      s.alpha = alpha;
      this._content.addChild(s);
    } else {
      this._drawPlaceholder(cellX, cellY, fk);
    }
  }

  private _drawPlaceholder(x: number, y: number, fk: FuncKeyMappedRecord): void {
    const color = fk.type === FuncKeyType.Skill ? 0x3c5a96
      : fk.type === FuncKeyType.Item || fk.type === FuncKeyType.Effect ? 0x6e5a32
      : fk.type === FuncKeyType.MacroSkill ? 0x5a3c6e
      : 0x464650;
    const label = fk.type === FuncKeyType.Skill ? 'SK'
      : fk.type === FuncKeyType.Item || fk.type === FuncKeyType.Effect ? 'IT'
      : fk.type === FuncKeyType.MacroSkill ? 'MA'
      : '?';
    this._gfx.rect(x, y, CellSize, CellSize).fill({ color });
    const t = new Text({ text: label, style: new TextStyle({ fill: 0xffffff, fontSize: 9, fontFamily: 'monospace' }) });
    t.position.set(x + 8, y + 10);
    this._content.addChild(t);
  }

  private _iconFor(fk: FuncKeyMappedRecord): WzSprite | null {
    if (fk.type === FuncKeyType.Menu || fk.type === FuncKeyType.BasicAction || fk.type === FuncKeyType.BasicMotion || fk.type === FuncKeyType.Emotion) {
      return this._loadIcon(fk.id);
    }
    if (fk.type === FuncKeyType.Skill || fk.type === FuncKeyType.MacroSkill) {
      return this.skillIconResolver?.(fk.id) ?? null;
    }
    if (fk.type === FuncKeyType.Item || fk.type === FuncKeyType.Effect) {
      return this.itemIconResolver?.(fk.id) ?? null;
    }
    return null;
  }

  private _loadIcon(id: number): WzSprite | null {
    if (this._iconCache.has(id)) return this._iconCache.get(id)!;
    const c = this._iconRoot?.Get(String(id));
    const sprite = c instanceof WzCanvas ? this._loader.Load(c) : null;
    this._iconCache.set(id, sprite);
    return sprite;
  }

  private _loadKeyCell(sc: number): WzSprite | null {
    if (this._keyCells.has(sc)) return this._keyCells.get(sc)!;
    const keyRoot = (this._kc2 ?? this._kc)?.Get('key') as WzProperty | null;
    const node = keyRoot?.Get(String(sc));
    const sprite = node instanceof WzCanvas ? this._loader.Load(node) : null;
    this._keyCells.set(sc, sprite);
    return sprite;
  }

  private _drawConfirm(): void {
    const box = { x: Math.floor(this._panelW / 2) - 140, y: Math.floor(this._panelH / 2) - 40, w: 280, h: 90 };
    this._gfx.rect(0, 0, this._panelW, this._panelH).fill({ color: 0x000000, alpha: 0.6 });
    this._gfx.rect(box.x, box.y, box.w, box.h).fill({ color: 0x14161e, alpha: 0.98 });
    this._gfx.rect(box.x, box.y, box.w, 1).fill({ color: 0x5a6478 });
    this._gfx.rect(box.x, box.y + box.h - 1, box.w, 1).fill({ color: 0x5a6478 });
    this._gfx.rect(box.x, box.y, 1, box.h).fill({ color: 0x5a6478 });
    this._gfx.rect(box.x + box.w - 1, box.y, 1, box.h).fill({ color: 0x5a6478 });

    const msg = this._confirm === Confirm.Default ? 'Restore the default key layout?' : 'Clear all key bindings?';
    if (this._font) {
      const t = new Text({ text: msg, style: new TextStyle({ fill: 0xe6dcc8, fontSize: 11, fontFamily: 'monospace' }) });
      const m = this._font.measure(msg);
      t.position.set(box.x + Math.floor((box.w - m.x) / 2), box.y + 16);
      this._content.addChild(t);
    }

    const yes = { x: box.x + box.w / 2 - 90, y: box.y + box.h / 2 + 12, w: 70, h: 24 };
    const no = { x: box.x + box.w / 2 + 20, y: box.y + box.h / 2 + 12, w: 70, h: 24 };
    const yesHover = this._dragMouseX >= this._root.x + yes.x && this._dragMouseX <= this._root.x + yes.x + yes.w && this._dragMouseY >= this._root.y + yes.y && this._dragMouseY <= this._root.y + yes.y + yes.h;
    const noHover = this._dragMouseX >= this._root.x + no.x && this._dragMouseX <= this._root.x + no.x + no.w && this._dragMouseY >= this._root.y + no.y && this._dragMouseY <= this._root.y + no.y + no.h;
    this._gfx.rect(yes.x, yes.y, yes.w, yes.h).fill({ color: yesHover ? 0x5a6ea0 : 0x3c4670 });
    this._gfx.rect(no.x, no.y, no.w, no.h).fill({ color: noHover ? 0x5a6ea0 : 0x3c4670 });
    const yesT = new Text({ text: 'OK', style: new TextStyle({ fill: 0xffffff, fontSize: 10, fontFamily: 'monospace' }) });
    yesT.position.set(yes.x + 24, yes.y + 5);
    const noT = new Text({ text: 'Cancel', style: new TextStyle({ fill: 0xffffff, fontSize: 10, fontFamily: 'monospace' }) });
    noT.position.set(no.x + 15, no.y + 5);
    this._content.addChild(yesT, noT);
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    const inside = lx >= 0 && lx < this._panelW && ly >= 0 && ly < this._panelH;

    if (this._confirm !== Confirm.None) {
      if (down) this._handleConfirmClick(lx, ly);
      return true;
    }

    if (!down) {
      this._windowDrag = false;
      for (const b of this._allButtons) {
        if (b.handleMouseButton(lx, ly, false)) return true;
      }
      return inside;
    }

    if (this._dragActive) {
      this._finishDrag(lx, ly);
      return true;
    }

    for (const b of this._allButtons) {
      if (b.handleMouseButton(lx, ly, true)) return true;
    }
    if (!inside) return false;

    const sc = hitTestKey(lx, ly);
    if (sc >= 0) {
      // If a palette action is selected, bind it to this key
      if (this._selectedKeySc === -2) {
        const fk = this._dragIcon;
        if (fk.type !== FuncKeyType.None) {
          this._map[sc] = fk;
          this.onBindingsChanged?.();
        }
        this._selectedKeySc = -1;
        this._dragIcon = FuncKeyMappedNone;
        return true;
      }
      // If clicking the same selected key, deselect
      if (sc === this._selectedKeySc) {
        this._selectedKeySc = -1;
        return true;
      }
      // If clicking a bound key, start drag (pick up)
      if (this._isBound(this._map[sc])) {
        this._dragIcon = this._map[sc];
        this._dragFromScancode = sc;
        this._map[sc] = { ...FuncKeyMappedNone };
        this._dragActive = true;
        this._selectedKeySc = -1;
        return true;
      }
      // Clicking an unbound key — select it for binding
      this._selectedKeySc = sc;
      return true;
    }

    const slot = hitTestPalette(lx, ly);
    if (slot >= 0) {
      const fk = paletteBinding(slot);
      if (fk.type === FuncKeyType.Menu && fk.id === 22) return true; // CashShop not bindable
      // If a key is selected, bind this palette action to it
      if (this._selectedKeySc >= 0) {
        this._map[this._selectedKeySc] = fk;
        this._selectedKeySc = -1;
        this.onBindingsChanged?.();
        return true;
      }
      // Otherwise start drag from palette
      if (this._isPlaced(fk)) return true;
      this._dragIcon = fk;
      this._dragFromScancode = -1;
      this._dragActive = true;
      return true;
    }

    // Click outside key/palette — deselect
    this._selectedKeySc = -1;

    if (ly < 24) {
      this._windowDrag = true;
      this._windowDragOffX = lx;
      this._windowDragOffY = ly;
    }
    return true;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (this._confirm !== Confirm.None) {
      if (key === 'Escape') { this._confirm = Confirm.None; return true; }
      if (key === 'Enter') { this._applyConfirm(); return true; }
      return true;
    }
    if (key === 'Escape') { this._closeCancel(); return true; }
    return false;
  }

private _layoutButtons(): void {
    const place = (b: Button | null, bx: number, by: number) => {
      if (b) b.container.position.set(bx, by);
    };
    // OG CUIKeyConfig::OnCreate @0x7dc5d0: all five AddButton calls use layout
    // offset (0,0) — the WZ canvas origin (already baked into WzSprite's anchor)
    // positions each button at its home cell, so the container must stay at (0,0).
    // (ChannelSelect precedent: container pos = the layout offset.)
    place(this._btClose, this._panelW - 18, 6);
    place(this._btHelp, this._panelW - 34, 6);
    place(this._btQuickSlot, 0, 0);
    place(this._btDefault, 0, 0);
    place(this._btDelete, 0, 0);
    place(this._btOk, 0, 0);
    place(this._btCancel, 0, 0);
  }

  private _finishDrag(lx: number, ly: number): void {
    const sc = hitTestKey(lx, ly);
    if (sc >= 0) {
      if (this._dragIcon.type === FuncKeyType.Skill || this._dragIcon.type === FuncKeyType.Item || this._dragIcon.type === FuncKeyType.Effect || this._dragIcon.type === FuncKeyType.MacroSkill) {
        for (let i = 0; i < MapSize; i++) {
          if (this._map[i].type === this._dragIcon.type && this._map[i].id === this._dragIcon.id) {
            this._map[i] = { ...FuncKeyMappedNone };
          }
        }
      }
      this._map[sc] = this._dragIcon;
    }
    this._cancelDrag();
  }

  private _cancelDrag(): void {
    this._dragActive = false;
    this._dragFromScancode = -1;
    this._windowDrag = false;
    this._selectedKeySc = -1;
  }

  private _handleConfirmClick(lx: number, ly: number): void {
    const yes = { x: Math.floor(this._panelW / 2) - 90, y: Math.floor(this._panelH / 2) + 12, w: 70, h: 24 };
    const no = { x: Math.floor(this._panelW / 2) + 20, y: Math.floor(this._panelH / 2) + 12, w: 70, h: 24 };
    if (lx >= yes.x && lx <= yes.x + yes.w && ly >= yes.y && ly <= yes.y + yes.h) this._applyConfirm();
    else if (lx >= no.x && lx <= no.x + no.w && ly >= no.y && ly <= no.y + no.h) this._confirm = Confirm.None;
  }

  private _applyConfirm(): void {
    if (this._confirm === Confirm.Default) this._loadDefaultMap();
    else if (this._confirm === Confirm.Delete) this._map.fill({ ...FuncKeyMappedNone });
    this.onBindingsChanged?.();
    this._confirm = Confirm.None;
  }

  private _closeOk(): void {
    const changed: { index: number; fk: FuncKeyMappedRecord }[] = [];
    for (let i = 0; i < MapSize; i++) {
      if (this._map[i].type !== this._mapOnOpen[i].type || this._map[i].id !== this._mapOnOpen[i].id) {
        changed.push({ index: i, fk: this._map[i] });
      }
    }
    if (changed.length > 0) this.onSaveToServer?.(changed);
    this.onBindingsChanged?.();
    this._snapshotOpen();
    this._closeInternal();
  }

  private _closeCancel(): void {
    this._map.splice(0, this._map.length, ...this._mapOnOpen.map(f => ({ ...f })));
    this._closeInternal();
  }

  private _closeInternal(): void {
    this.isVisible = false;
    this._cancelDrag();
    this._confirm = Confirm.None;
  }

  private _loadDefaultMap(): void {
    this._map.fill({ ...FuncKeyMappedNone });
    for (let i = 0; i < DefIndex.length; i++) {
      if (DefIndex[i] < MapSize) {
        this._map[DefIndex[i]] = { type: DefType[i] as FuncKeyType, id: DefId[i] };
      }
    }
    this._snapshotOpen();
  }

  private _snapshotOpen(): void {
    for (let i = 0; i < MapSize; i++) this._mapOnOpen[i] = { ...this._map[i] };
  }

  private _isBound(fk: FuncKeyMappedRecord): boolean {
    return fk.type !== FuncKeyType.None;
  }

  private _actionToFk(action: KeyAction): FuncKeyMappedRecord | null {
    const id = action as number;
    if (id >= 0 && id < 30) return { type: FuncKeyType.Menu, id };
    if (id >= 50 && id <= 54) return { type: FuncKeyType.BasicAction, id };
    return null;
  }

  private _keysToScanCode(key: string): number {
    // Maps e.key values (what the browser sends) to DirectInput scancodes.
    const map: Record<string, number> = {
      '1': 2, '2': 3, '3': 4, '4': 5, '5': 6,
      '6': 7, '7': 8, '8': 9, '9': 10, '0': 11,
      '-': 12, '=': 13, 'Backspace': 14, 'Tab': 15,
      'q': 16, 'w': 17, 'e': 18, 'r': 19, 't': 20,
      'y': 21, 'u': 22, 'i': 23, 'o': 24, 'p': 25,
      '[': 26, ']': 27, 'Enter': 28,
      'a': 30, 's': 31, 'd': 32, 'f': 33, 'g': 34,
      'h': 35, 'j': 36, 'k': 37, 'l': 38,
      ';': 39, "'": 40, '`': 41,
      'Shift': 42, '\\': 43,
      'z': 44, 'x': 45, 'c': 46, 'v': 47, 'b': 48,
      'n': 49, 'm': 50, ',': 51, '.': 52, '/': 53,
      'F1': 59, 'F2': 60, 'F3': 61, 'F4': 62, 'F5': 63,
      'F6': 64, 'F7': 65, 'F8': 66, 'F9': 67, 'F10': 68,
      'Home': 71, 'PageUp': 73, 'End': 79, 'PageDown': 81,
      'Insert': 82, 'Delete': 83,
      'F11': 87, 'F12': 88,
      'Control': 29,
      'Alt': 56, ' ': 57, 'CapsLock': 58,
      // Arrow keys — hardcoded in isActionDown
      'ArrowLeft': -1, 'ArrowRight': -1, 'ArrowUp': -1, 'ArrowDown': -1,
    };
    return map[key] ?? -1;
  }

  private _scanCodeToKey(sc: number): string | null {
    const map: Record<number, string> = {
      2: '1', 3: '2', 4: '3', 5: '4', 6: '5',
      7: '6', 8: '7', 9: '8', 10: '9', 11: '0',
      12: '-', 13: '=', 14: 'Backspace', 15: 'Tab',
      16: 'q', 17: 'w', 18: 'e', 19: 'r', 20: 't',
      21: 'y', 22: 'u', 23: 'i', 24: 'o', 25: 'p',
      26: '[', 27: ']', 28: 'Enter',
      29: 'Control',
      30: 'a', 31: 's', 32: 'd', 33: 'f', 34: 'g',
      35: 'h', 36: 'j', 37: 'k', 38: 'l',
      39: ';', 40: "'", 41: '`',
      42: 'Shift', 43: '\\',
      44: 'z', 45: 'x', 46: 'c', 47: 'v', 48: 'b',
      49: 'n', 50: 'm', 51: ',', 52: '.', 53: '/',
      56: 'Alt', 57: ' ', 58: 'CapsLock',
      59: 'F1', 60: 'F2', 61: 'F3', 62: 'F4', 63: 'F5',
      64: 'F6', 65: 'F7', 66: 'F8', 67: 'F9', 68: 'F10',
      71: 'Home', 73: 'PageUp', 79: 'End', 81: 'PageDown',
      82: 'Insert', 83: 'Delete',
      87: 'F11', 88: 'F12',
    };
    return map[sc] ?? null;
  }
}
