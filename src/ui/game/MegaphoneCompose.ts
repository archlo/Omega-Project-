import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { Button } from '../Button.js';
import { TextField } from '../TextField.js';
import type { DragTarget } from '../DragController.js';
import type { ItemDragPayload } from './ItemInventory.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzSprite } from '../../render/WzSprite.js';

// OG class: CItemSpeakerDlg. Verified live against the v95 IDB:
// - ctor @0x5CA0E0: CDialog::CreateDlg("UI/UIWindow2.img/ItemMegaphone/backgrnd",
//   SP 0x19B4) → backgrnd canvas 236x182, origin (0,0).
// - OnCreate @0x5CA210: BtOK id 1 from SP 0x1992
//   ("UI/UIWindow2.img/ItemMegaphone/BtOK", 37x16 @ origin (-149,-153) → screen
//   (149,153)); BtCancle id 2 from SP 0x1991 (".../BtCancle", 37x16 @
//   (-188,-153) → (188,153)); CCtrlEdit id 1001 at (18,129) 202x15, white bg
//   (nBackColor -1), black text (nFontColor 0xFF000000), text offset (2,0),
//   max 60 chars (nHorzMax), focused on open; CCtrlCheckBox id 1000 at
//   (11,155) 14x14, default CHECKED (whisper ear); item-drop layer at
//   (103,65) showing the dragged target item's icon (PutItem stores nTI/nPOS).
// - Send path: _SendConsumeCashItemUseRequest @0x5C9E70 → opcode 85
//   [int updateTime][short nPOS][int nItemID][str msg][byte whisper]
//   [byte hasTarget][int targetTI][int targetPOS] (see GameSender).
export class MegaphoneCompose extends GamePanel implements DragTarget {
  static readonly W = 236;
  static readonly H = 182;

  OnSend: ((
    invPos: number, itemId: number, message: string,
    isWhisper: boolean, targetTI: number, targetPOS: number,
  ) => void) | null = null;

  // Set by Open() (item double-click).
  private _invPos = 0;
  private _itemId = 0;

  // OG: CDraggableItem::PutItem(CItemSpeakerDlg*) stores the target item's
  // nTI/nSlotPosition (cf. KarmaScissors) — shown at the (103,65) item layer
  // and sent as hasTargetItem + targetTI/targetPOS.
  private _targetTI = 0;
  private _targetPOS = 0;
  private _targetItemId = 0;

  /** Resolves a target item id to its icon sprite (wired by GameStage). */
  iconProvider: ((itemId: number) => WzSprite | null) | null = null;

  private _loader: WzTextureLoader | null;
  private _ui: WzPackage | null;

  private _bgLayer: Container = new Container();
  private _fallbackBg: Graphics = new Graphics();
  private _edit: TextField;
  private _checked = true; // OG: checkbox defaults CHECKED
  private _checkGfx: Graphics = new Graphics();
  private _checkGlyph: Sprite | null = null;
  private _checkLabel: Text | null = null;
  private _btOK: Button | null = null;
  private _btCancel: Button | null = null;
  private _itemIconHolder: Container = new Container();

  constructor(loader: WzTextureLoader | null = null, ui: WzPackage | null = null) {
    super();
    this._loader = loader;
    this._ui = ui;
    this.isVisible = false;
    this.draggable = true;
    // Centered 236x182 dialog in the 800x600 frame (CDialog screen-coord).
    this._root.position.set((800 - MegaphoneCompose.W) / 2, (600 - MegaphoneCompose.H) / 2);
    this._root.addChild(this._bgLayer);
    this._root.addChild(this._fallbackBg);

    this._edit = new TextField(null);
    this._edit.maxLength = 60; // OG nHorzMax
    this._edit.width = 202;
    this._edit.height = 15;
    this._edit.setPosition(18, 129);
    this._edit.textColor = 0x000000; // OG nFontColor black on white (nBackColor -1)
    this._root.addChild(this._edit.container);

    this._root.addChild(this._itemIconHolder);
    this._root.addChild(this._checkGfx);
    this._checkLabel = new Text({
      text: 'Whisper',
      style: new TextStyle({ fill: '#000000', fontSize: 11, fontFamily: 'Arial' }),
    });
    this._checkLabel.position.set(28, 154);
    this._checkLabel.visible = false; // baked into backgrnd2 when WZ loads
    this._root.addChild(this._checkLabel);
    this._loadWz();
  }

  private _prop(path: string): WzProperty | null {
    const n = this._ui?.GetItem(path);
    return n instanceof WzProperty ? n : null;
  }

  private _loadWz(): void {
    if (!this._loader || !this._ui) return;
    const root = this._prop('UIWindow2.img/ItemMegaphone');
    if (!root) return;
    const bg = root.Get('backgrnd');
    if (bg instanceof WzCanvas) {
      const sp = this._loader.Load(bg);
      if (sp) {
        const s = sp.ToPixi();
        s.position.set(-sp.OriginX, -sp.OriginY);
        this._bgLayer.addChild(s);
      }
    }
    const mkBtn = (name: string, fx: number, fy: number, label: string, onClick: () => void): Button => {
      const node = root.Get(name);
      let btn: Button;
      if (node instanceof WzProperty) {
        btn = Button.fromWz(this._loader!, node, '');
        // Origin-placed buttons self-position via WZ origin (BtOK → (149,153)).
        btn.container.position.set(0, 0);
      } else {
        btn = new Button(label);
        btn.container.position.set(fx, fy);
      }
      btn.onClick = onClick;
      this._root.addChild(btn.container);
      return btn;
    };
    this._btOK = mkBtn('BtOK', 149, 153, 'OK', () => this._confirm());
    this._btCancel = mkBtn('BtCancle', 188, 153, 'Cancel', () => this._close());
    const checkNode = root.Get('check');
    if (checkNode instanceof WzCanvas) {
      const ws = this._loader.Load(checkNode);
      if (ws) {
        this._checkGlyph = ws.NewSprite();
        // OG check canvas origin (-16,-158) → glyph at (16,158) inside the
        // 14x14 box at (11,155).
        this._checkGlyph.position.set(-ws.OriginX, -ws.OriginY);
        this._root.addChild(this._checkGlyph);
      }
    }
    this._syncCheckGlyph();
  }

  private _syncCheckGlyph(): void {
    if (this._checkGlyph) this._checkGlyph.visible = this._checked;
  }

  Open(invPos: number, itemId: number): void {
    this._invPos = invPos;
    this._itemId = itemId;
    this._targetTI = 0;
    this._targetPOS = 0;
    this._targetItemId = 0;
    this._checked = true; // OG default CHECKED
    this._edit.text = '';
    this._edit.isFocused = true;
    this._syncCheckGlyph();
    this._refreshItemIcon();
    this.isVisible = true;
  }

  private _close(): void {
    this.isVisible = false;
    this._edit.isFocused = false;
  }

  private _confirm(): void {
    const message = this._edit.text.trim();
    if (!message) return;
    this.OnSend?.(this._invPos, this._itemId, message, this._checked, this._targetTI, this._targetPOS);
    this._close();
  }

  private _refreshItemIcon(): void {
    while (this._itemIconHolder.children.length > 0) {
      this._itemIconHolder.removeChildAt(0).destroy();
    }
    if (this._targetItemId > 0) {
      const ws = this.iconProvider?.(this._targetItemId) ?? null;
      if (ws) {
        const s = ws.NewSprite();
        s.position.set(103, 65); // OG _pItemLayer at (103,65)
        this._itemIconHolder.addChild(s);
      }
    }
  }

  setIconProvider(fn: (itemId: number) => WzSprite | null): void {
    this.iconProvider = fn;
  }

  // DragTarget — OG PutItem stores nTI/nSlotPosition.
  tryAcceptDrag(payload: unknown, _x: number, _y: number): boolean {
    if (!this.isVisible || !payload || typeof payload !== 'object' || !('itemId' in payload)) return false;
    const p = payload as ItemDragPayload;
    // OG stores nTI (inventory type), not the item id — cf. KarmaScissors.
    this._targetTI = p.invType;
    this._targetPOS = p.slotPos;
    this._targetItemId = (p as { itemId?: number }).itemId ?? 0;
    this._refreshItemIcon();
    return true;
  }

  update(_dt: number): void {
    if (!this.isVisible) return;
    // Graphics fallback panel (hidden once the WZ backgrnd loads).
    this._fallbackBg.clear();
    if (this._bgLayer.children.length === 0) {
      this._fallbackBg.rect(0, 0, MegaphoneCompose.W, MegaphoneCompose.H)
        .fill({ color: '#0c0c16', alpha: 0.95 });
      this._fallbackBg.rect(0, 0, MegaphoneCompose.W, MegaphoneCompose.H)
        .stroke({ color: '#5a6478', width: 1 });
    }
    if (this._checkLabel) this._checkLabel.visible = this._bgLayer.children.length === 0;
    // 14x14 box at (11,155); WZ `check` glyph covers the checked state.
    this._checkGfx.clear();
    this._checkGfx.rect(11, 155, 14, 14).fill({ color: '#FFFFFF', alpha: 0.9 });
    this._checkGfx.rect(11, 155, 14, 14).stroke({ color: '#000000', width: 1 });
    if (this._checked && !this._checkGlyph) {
      this._checkGfx.moveTo(13, 162).lineTo(16, 166).lineTo(22, 158).stroke({ color: '#000000', width: 2 });
    }
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    // WZ/text buttons handle their own down/up-fire.
    if (this._btOK?.handleMouseButton(lx, ly, down)) return true;
    if (this._btCancel?.handleMouseButton(lx, ly, down)) return true;
    if (!down) {
      return lx >= 0 && lx < MegaphoneCompose.W && ly >= 0 && ly < MegaphoneCompose.H;
    }
    // Checkbox 14x14 at (11,155).
    if (lx >= 11 && lx < 25 && ly >= 155 && ly < 169) {
      this._checked = !this._checked;
      this._syncCheckGlyph();
      return true;
    }
    // Edit (18,129,202x15).
    if (this._edit.handleMouseButton(lx, ly, down)) return true;
    // Drag title region / swallow inside dialog.
    if (this.beginDrag(lx, ly, down)) return true;
    return lx >= 0 && lx < MegaphoneCompose.W && ly >= 0 && ly < MegaphoneCompose.H;
  }

  onMouseMove(x: number, y: number): void {
    if (!this.isVisible) return;
    this._edit.onMouseMove(x - this._root.x, y - this._root.y);
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') {
      this._close();
      return true;
    }
    if (key === 'Enter') {
      this._confirm();
      return true;
    }
    if (key === 'Backspace') {
      return this._edit.onKeyPress(key);
    }
    if (key.length === 1) {
      this._edit.onTextInput(key);
      return true;
    }
    return false;
  }
}
