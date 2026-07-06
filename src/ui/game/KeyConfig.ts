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
import { CellSize, PaletteCount, ScRShift, ScLShift, ScRCtrl, ScLCtrl, ScRAlt, ScLAlt, getBindableScancodes, tryGetCell, paletteCell, hitTestKey, hitTestPalette, paletteBinding, paletteSlotOf, initLayout } from './KeyConfigLayout.js';
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

  private _dragActive = false;
  private _dragIcon: FuncKeyMappedRecord = FuncKeyMappedNone;
  private _dragFromScancode = -1;
  private _dragMouseX = 0;
  private _dragMouseY = 0;

  private _windowDrag = false;
  private _windowDragOffX = 0;
  private _windowDragOffY = 0;

  private _confirm: Confirm = Confirm.None;

  private readonly _panelW: number;
  private readonly _panelH: number;

  private readonly _gfx: Graphics;
  private readonly _content: Container;

  onBindingsChanged: (() => void) | null = null;
  onSaveToServer: ((changed: { index: number; fk: FuncKeyMappedRecord }[]) => void) | null = null;
  onOpenQuickSlot: (() => void) | null = null;
  skillIconResolver: ((skillId: number) => WzSprite | null) | null = null;

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

    this._btClose = this._makeBtn('BtClose', () => this._closeCancel());
    this._btHelp = this._makeBtn('BtHelp', () => { });
    this._btOk = this._makeBtn('BtOK', () => this._closeOk());
    this._btCancel = this._makeBtn('BtCancel', () => this._closeCancel());
    this._btDefault = this._makeBtn('BtDefault', () => { this._confirm = Confirm.Default; });
    this._btDelete = this._makeBtn('BtDelete', () => { this._confirm = Confirm.Delete; });
    this._btQuickSlot = this._makeBtn('BtQuickSlot', () => { this.onOpenQuickSlot?.(); });

    this._gfx = new Graphics();
    this._content = new Container();
    this._root.addChild(this._content, this._gfx);

    this._loadDefaultMap();
  }

  private _loadCanvas(root: WzProperty | null | undefined, name: string): Sprite | null {
    const c = root?.Get(name);
    return c instanceof WzCanvas ? this._loader.Load(c)?.ToPixi() ?? null : null;
  }

  private _makeBtn(name: string, onClick: () => void): Button | null {
    const pr = (this._kc2?.Get(name) ?? this._kc?.Get(name)) as WzProperty | null;
    if (!pr) return null;
    const b = Button.fromWz(this._loader, pr);
    b.onClick = onClick;
    this._allButtons.push(b);
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
    if (sc === ScLCtrl) return 'Control';
    if (sc === ScLShift) return 'Shift';
    if (sc === ScLAlt) return 'Alt';
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
  tryAcceptDrag(payload: unknown, x: number, y: number): boolean {
    if (!payload || typeof payload !== 'object' || !('skillId' in payload)) return false;
    return this.tryBindSkillAt((payload as { skillId: number }).skillId, x, y);
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
      b.container.x = 0;
      b.container.y = 0;
      this._content.addChild(b.container);
    }

    if (this._dragActive) {
      const dmLx = this._dragMouseX - this._root.x;
      const dmLy = this._dragMouseY - this._root.y;
      const icon = this._iconFor(this._dragIcon);
      if (icon) {
        const s = icon.ToPixi();
        s.position.set(dmLx - 16, dmLy - 16);
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
      const wz = this._loadKeyCell(sc);
      if (wz) {
        const s = wz.ToPixi();
        s.position.set(cell.x, cell.y);
        this._content.addChild(s);
      } else {
        this._gfx.rect(cell.x, cell.y, CellSize, CellSize).fill({ color: 0x2a2d3a });
        this._gfx.rect(cell.x, cell.y, CellSize, CellSize).stroke({ color: 0x3c4060, width: 1 });
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
      if (this._isPlaced(fk)) continue;
      if (this._dragActive && fk.type === this._dragIcon.type && fk.id === this._dragIcon.id) continue;
      const cell = paletteCell(slot);
      this._drawIconAt(cell.x, cell.y, fk);
    }
  }

  private _isPlaced(fk: FuncKeyMappedRecord): boolean {
    for (let i = 0; i < MapSize; i++) {
      if (this._map[i].type === fk.type && this._map[i].id === fk.id) return true;
    }
    return false;
  }

  private _drawIconAt(cellX: number, cellY: number, fk: FuncKeyMappedRecord): void {
    const icon = this._iconFor(fk);
    const anchorX = cellX;
    const anchorY = cellY + 32;
    if (icon) {
      const s = icon.ToPixi();
      s.position.set(anchorX, anchorY);
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
    if (sc >= 0 && this._isBound(this._map[sc])) {
      this._dragIcon = this._map[sc];
      this._dragFromScancode = sc;
      this._map[sc] = { ...FuncKeyMappedNone };
      this._dragActive = true;
      return true;
    }

    const slot = hitTestPalette(lx, ly);
    if (slot >= 0) {
      const fk = paletteBinding(slot);
      if ((fk.type === FuncKeyType.Menu && fk.id === 22) || this._isPlaced(fk)) return true;
      this._dragIcon = fk;
      this._dragFromScancode = -1;
      this._dragActive = true;
      return true;
    }

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
    const px = this._root.x;
    const py = this._root.y;
    const place = (b: Button | null, bx: number, by: number) => {
      if (b) b.container.position.set(px + bx, py + by);
    };
    place(this._btClose, this._panelW - 18, 6);
    place(this._btHelp, this._panelW - 34, 6);
    place(this._btQuickSlot, 14, 240);
    place(this._btDefault, 120, 240);
    place(this._btDelete, 186, 240);
    place(this._btOk, this._panelW - 112, 240);
    place(this._btCancel, this._panelW - 60, 240);
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
    const map: Record<string, number> = {
      'Digit1': 2, 'Digit2': 3, 'Digit3': 4, 'Digit4': 5, 'Digit5': 6,
      'Digit6': 7, 'Digit7': 8, 'Digit8': 9, 'Digit9': 10, 'Digit0': 11,
      'Minus': 12, 'Equal': 13, 'Backspace': 14,
      'KeyQ': 16, 'KeyW': 17, 'KeyE': 18, 'KeyR': 19, 'KeyT': 20,
      'KeyY': 21, 'KeyU': 22, 'KeyI': 23, 'KeyO': 24, 'KeyP': 25,
      'BracketLeft': 26, 'BracketRight': 27, 'Enter': 28,
      'KeyA': 30, 'KeyS': 31, 'KeyD': 32, 'KeyF': 33, 'KeyG': 34,
      'KeyH': 35, 'KeyJ': 36, 'KeyK': 37, 'KeyL': 38,
      'Semicolon': 39, 'Quote': 40, 'Backquote': 41,
      'ShiftLeft': 42, 'Backslash': 43,
      'KeyZ': 44, 'KeyX': 45, 'KeyC': 46, 'KeyV': 47, 'KeyB': 48,
      'KeyN': 49, 'KeyM': 50, 'Comma': 51, 'Period': 52, 'Slash': 53,
      'ShiftRight': 54,
      'AltLeft': 56, 'Space': 57, 'CapsLock': 58,
      'F1': 59, 'F2': 60, 'F3': 61, 'F4': 62, 'F5': 63,
      'F6': 64, 'F7': 65, 'F8': 66, 'F9': 67, 'F10': 68,
      'Home': 71, 'PageUp': 73, 'End': 79, 'PageDown': 81,
      'Insert': 82, 'Delete': 83,
      'F11': 87, 'F12': 88,
      'ControlLeft': 29,
    };
    return map[key] ?? -1;
  }

  private _scanCodeToKey(sc: number): string | null {
    const map: Record<number, string> = {
      2: 'Digit1', 3: 'Digit2', 4: 'Digit3', 5: 'Digit4', 6: 'Digit5',
      7: 'Digit6', 8: 'Digit7', 9: 'Digit8', 10: 'Digit9', 11: 'Digit0',
      12: 'Minus', 13: 'Equal', 14: 'Backspace',
      16: 'KeyQ', 17: 'KeyW', 18: 'KeyE', 19: 'KeyR', 20: 'KeyT',
      21: 'KeyY', 22: 'KeyU', 23: 'KeyI', 24: 'KeyO', 25: 'KeyP',
      26: 'BracketLeft', 27: 'BracketRight', 28: 'Enter',
      29: 'ControlLeft',
      30: 'KeyA', 31: 'KeyS', 32: 'KeyD', 33: 'KeyF', 34: 'KeyG',
      35: 'KeyH', 36: 'KeyJ', 37: 'KeyK', 38: 'KeyL',
      39: 'Semicolon', 40: 'Quote', 41: 'Backquote',
      42: 'ShiftLeft', 43: 'Backslash',
      44: 'KeyZ', 45: 'KeyX', 46: 'KeyC', 47: 'KeyV', 48: 'KeyB',
      49: 'KeyN', 50: 'KeyM', 51: 'Comma', 52: 'Period', 53: 'Slash',
      54: 'ShiftRight',
      56: 'AltLeft', 57: 'Space', 58: 'CapsLock',
      59: 'F1', 60: 'F2', 61: 'F3', 62: 'F4', 63: 'F5',
      64: 'F6', 65: 'F7', 66: 'F8', 67: 'F9', 68: 'F10',
      71: 'Home', 73: 'PageUp', 79: 'End', 81: 'PageDown',
      82: 'Insert', 83: 'Delete',
      87: 'F11', 88: 'F12',
    };
    return map[sc] ?? null;
  }
}
