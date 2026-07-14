import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { FuncKeyMapped, FuncKeyType } from '../../domain/FuncKeyMapped.js';
import type { DragTarget } from '../DragController.js';
import { Button } from '../Button.js';

const SlotCount = 8;
const DefaultKeys = [0x2A, 0x52, 0x47, 0x49, 0x1D, 0x53, 0x4F, 0x51];
const SlotX0 = 7, SlotY0 = 15, SlotStride = 33, SlotSize = 32;
const BarH = 85;
const AttachedLayerX = 881, AttachedLayerY = 2;
const PopupOriginX = 143, PopupOriginY = 143;

// OG: CQuickSlot@CUIStatusBar — nested class with 4 COM layers:
//   m_pLayerSlideBg   (z=1) — quickslotConfig bg, hidden in attached mode
//   m_pLayerShortCut  (z=2) — white canvas with icons+labels drawn programmatically
//   m_pLayerSkillCooltime   — skill cd overlay
//   m_pLayerConsumeItemCoolTime — item cd overlay
// Slide toggle slides Y by 67px (32 slot + 35 margin).
// OG RelMove(881,2) relative to StatusBar origin in attached mode.
export class QuickSlotBar extends GamePanel implements DragTarget {
  private _keys: number[] = [...DefaultKeys];
  private _loader: WzTextureLoader;
  private _labelRoot: WzProperty | null;
  private _labelCache = new Map<number, WzSprite | null>();
  private _bgSprite: Sprite | null;
  private _keyConfigRoot: WzProperty | null;
  private _bindingAt: (scancode: number) => FuncKeyMapped;
  private _bindSkill: (scancode: number, skillId: number) => void;
  private _skillIcon: (skillId: number) => WzSprite | null;
  private _itemIcon: (itemId: number) => WzSprite | null;
  private _skillCdInfo: (skillId: number) => { remain: number; total: number } | null;
  private _itemCooltimeRemaining = 0;
  private _itemCooltimeTotal = 0;
  private _isStateChangeItem: (itemId: number) => boolean;
  private _isBindableItem: (itemId: number, invType: number) => boolean;
  private _itemCountOf: (itemId: number) => number;
  private _viewW = 800;
  private _viewH = 600;
  private _slotG!: Graphics;
  private _cdG!: Graphics;
  private _skillSprites: (Sprite | null)[] = new Array(SlotCount).fill(null);
  private _cashTagSprites: (Sprite | null)[] = new Array(SlotCount).fill(null);
  private _labelSprites: (Sprite | null)[] = new Array(SlotCount).fill(null);
  private _fallbackLabels: Text[] = [];
  private _numberTexts: Text[] = [];
  private _btSlideUp: Button | null;
  private _btSlideDown: Button | null;
  private _bShowSlide = true;
  private _cashTagLoader: (() => Sprite | null) | null = null;
  bindItemToKey: ((scancode: number, itemId: number) => void) | null = null;

  constructor(
    loader: WzTextureLoader, ui: WzPackage | null, _font: BuiltInFont | null,
    bindingAt: (scancode: number) => FuncKeyMapped,
    bindSkill: (scancode: number, skillId: number) => void,
    skillIcon: (skillId: number) => WzSprite | null,
    itemIcon: (itemId: number) => WzSprite | null,
    skillCdInfo?: (skillId: number) => { remain: number; total: number } | null,
    isStateChangeItem?: (itemId: number) => boolean,
    isBindableItem?: (itemId: number, invType: number) => boolean,
    cashTagLoader?: () => Sprite | null,
    itemCountOf?: (itemId: number) => number,
  ) {
    super();
    this._loader = loader;
    this._bindingAt = bindingAt;
    this._bindSkill = bindSkill;
    this._skillIcon = skillIcon;
    this._itemIcon = itemIcon;
    this._skillCdInfo = skillCdInfo ?? (() => null);
    this._isStateChangeItem = isStateChangeItem ?? (() => false);
    this._isBindableItem = isBindableItem ?? (() => false);
    this._cashTagLoader = cashTagLoader ?? null;
    this._itemCountOf = itemCountOf ?? (() => 0);

    // OG Init: loads slide bg from UIWindow2.img/KeyConfig/quickslotConfig
    this._keyConfigRoot = (ui?.GetItem('UIWindow2.img/KeyConfig') as WzProperty) ?? null;
    const qc = this._keyConfigRoot?.Get('quickslotConfig');
    this._labelRoot = qc instanceof WzProperty ? (qc.Get('key') as WzProperty) ?? qc : null;

    const qcCanvas = qc instanceof WzProperty ? qc.Get('backgrnd') : null;
    this._bgSprite = qcCanvas instanceof WzCanvas ? loader.Load(qcCanvas)?.ToPixi() ?? null : null;
    if (this._bgSprite) this._root.addChild(this._bgSprite);

    // OG Init: slide buttons from StatusBar2.img
    const bar = (ui?.GetItem('StatusBar2.img/mainBar') as WzProperty) ?? null;
    const qsBar = (bar?.Get('quickSlot') as WzProperty) ?? null;
    this._btSlideUp = qsBar ? Button.fromWz(loader, qsBar.Get('BtOpen') as WzProperty) : null;
    this._btSlideDown = qsBar ? Button.fromWz(loader, qsBar.Get('BtClose') as WzProperty) : null;
    for (const bt of [this._btSlideUp, this._btSlideDown]) {
      if (bt) {
        bt.onClick = () => this._toggle();
        this._root.addChild(bt.container);
      }
    }

    this._slotG = new Graphics();
    this._root.addChild(this._slotG);
    this._cdG = new Graphics();
    this._root.addChild(this._cdG);
    this.isVisible = true;
  }

  SetItemCooltime(remaining: number, total: number): void {
    this._itemCooltimeRemaining = remaining;
    this._itemCooltimeTotal = total;
  }

  private _toggle(): void {
    this._bShowSlide = !this._bShowSlide;
  }

  draw(): void {
    if (!this.isVisible) return;
    const attached = this._viewW > 800;
    this._slotG.clear();

    if (this._bgSprite) this._bgSprite.visible = !attached;

    // OG attached mode: clear to white (no slot backgrounds)
    if (!this._bgSprite || attached) {
      const tl = this._gridTopLeft;
      for (let i = 0; i < SlotCount; i++) {
        const r = this._slotRect(i);
        this._slotG.rect(r.x, r.y, r.width, r.height).fill({ color: attached ? 0x2880 : 0x1A1C28, alpha: attached ? 0.15 : 0.8 });
      }
    }

    for (let i = 0; i < SlotCount; i++) {
      const r = this._slotRect(i);

      const binding = this._bindingAt(this._keys[i]);
      if (binding.type !== FuncKeyType.None && binding.id > 0) {
        // OG Draw: type-dispatch icons — skill / item / menu / emote / macro
        let icon: WzSprite | null = null;
        if (binding.type === FuncKeyType.Skill) {
          icon = this._skillIcon(binding.id);
        } else if (binding.type === FuncKeyType.Item) {
          icon = this._itemIcon(binding.id);
        }
        if (icon?.Texture) {
          let sp = this._skillSprites[i];
          if (!sp) {
            sp = new Sprite(icon.Texture);
            this._root.addChild(sp);
            this._skillSprites[i] = sp;
          }
          sp.texture = icon.Texture;
          sp.x = r.x + 2;
          sp.y = r.y + 2;
          sp.width = r.width - 4;
          sp.height = r.height - 4;
          sp.visible = true;
          // OG: DrawItemIconForSlot — cash tag overlay for cash items
          if (binding.type === FuncKeyType.Item && Math.floor(binding.id / 1_000_000) === 5) {
            if (!this._cashTagSprites[i] && this._cashTagLoader) {
              this._cashTagSprites[i] = this._cashTagLoader();
              if (this._cashTagSprites[i]) this._root.addChild(this._cashTagSprites[i]!);
            }
            if (this._cashTagSprites[i]) {
              this._cashTagSprites[i]!.position.set(r.x + r.width - this._cashTagSprites[i]!.width, r.y + r.height - this._cashTagSprites[i]!.height);
              this._cashTagSprites[i]!.visible = true;
            }
          } else {
            if (this._cashTagSprites[i]) this._cashTagSprites[i]!.visible = false;
          }
        } else {
          if (this._skillSprites[i]) this._skillSprites[i]!.visible = false;
          if (this._cashTagSprites[i]) this._cashTagSprites[i]!.visible = false;
        }
      } else {
        if (this._skillSprites[i]) this._skillSprites[i]!.visible = false;
      }

      // OG Draw: keycap label at (x+2, y+2) — loaded from KeyConfig property
      const label = this._label(this._keys[i]);
      if (label?.Texture) {
        let sp = this._labelSprites[i];
        if (!sp) {
          sp = new Sprite(label.Texture);
          this._root.addChild(sp);
          this._labelSprites[i] = sp;
        }
        sp.texture = label.Texture;
        sp.x = r.x + 2;
        sp.y = r.y + 2;
        sp.visible = true;
        if (this._fallbackLabels[i]) this._fallbackLabels[i].visible = false;
      } else {
        if (this._labelSprites[i]) this._labelSprites[i]!.visible = false;
        let lbl = this._fallbackLabels[i];
        if (!lbl) {
          lbl = new Text({ text: '', style: new TextStyle({ fill: 0x9090A0, fontSize: 9 }) });
          this._root.addChild(lbl);
          this._fallbackLabels[i] = lbl;
        }
        lbl.text = String.fromCharCode(this._keys[i]);
        lbl.x = r.x + r.width - 10;
        lbl.y = r.y + r.height - 11;
        lbl.visible = true;
      }
    }

    // OG DrawSkillCooltime + DrawConsumeItemCooltime: cooldown overlays
    this._cdG.clear();
    for (let i = 0; i < SlotCount; i++) {
      const r = this._slotRect(i);
      const binding = this._bindingAt(this._keys[i]);
      let cdRatio = 0;
      if (binding.type === FuncKeyType.Skill && binding.id > 0) {
        const cd = this._skillCdInfo(binding.id);
        if (cd && cd.remain > 0) {
          cdRatio = Math.min(1, cd.remain / Math.max(1, cd.total));
        }
      } else if (binding.type === FuncKeyType.Item && binding.id > 0 && this._itemCooltimeRemaining > 0) {
        if (this._isStateChangeItem(binding.id)) {
          cdRatio = Math.min(1, this._itemCooltimeRemaining / Math.max(1, this._itemCooltimeTotal));
        }
      }
      if (cdRatio > 0) {
        const oh = Math.max(1, Math.round(r.height * cdRatio));
        this._cdG.rect(r.x, r.y + r.height - oh, r.width, oh).fill({ color: 0x000000, alpha: 0.55 });
      }
    }

    // OG DrawFuncKeyMapped: number overlay for items (count) and macros
    for (let i = 0; i < SlotCount; i++) {
      const r = this._slotRect(i);
      const binding = this._bindingAt(this._keys[i]);
      let num = 0;
      if (binding.type === FuncKeyType.Item && binding.id > 0) {
        num = this._itemCountOf(binding.id);
      }
      let nt = this._numberTexts[i];
      if (num > 0) {
        if (!nt) {
          nt = new Text({ text: '', style: new TextStyle({ fill: '#FFE0A0', fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold', stroke: { color: '#000000', width: 2 } }) });
          this._root.addChild(nt);
          this._numberTexts[i] = nt;
        }
        nt.text = num.toString();
        nt.x = r.x + r.width - 2 - nt.width;
        nt.y = r.y + r.height - 2 - nt.height;
        nt.visible = true;
      } else if (nt) {
        nt.visible = false;
      }
    }

    // Slide buttons: OG hides both when attached, toggles visibility in popup
    if (this._btSlideUp) this._btSlideUp.container.visible = !attached && !this._bShowSlide;
    if (this._btSlideDown) this._btSlideDown.container.visible = !attached && this._bShowSlide;

    // Position slide buttons at bottom-right of slot area
    if (!attached && (this._btSlideUp || this._btSlideDown)) {
      const tl = this._gridTopLeft;
      const btnY = tl.y + SlotY0 + 2 * SlotStride + 4;
      const btnX = tl.x + SlotX0;
      if (this._btSlideUp) { this._btSlideUp.container.position.set(btnX, btnY); }
      if (this._btSlideDown) { this._btSlideDown.container.position.set(btnX + 32, btnY); }
    }
  }

  SetKeys(keys: number[] | null): void {
    if (keys === null) return;
    for (let i = 0; i < SlotCount && i < keys.length; i++) this._keys[i] = keys[i];
  }

  Relayout(viewWidth: number, viewHeight: number): void {
    this._viewW = viewWidth;
    this._viewH = viewHeight;
    // Position slide bg at top-left of grid in popup mode
    if (this._bgSprite) {
      const tl = this._gridTopLeft;
      this._bgSprite.position.set(tl.x + SlotX0 - 7, tl.y + SlotY0 - 15);
    }
  }

  /** Render the 8 quickslot cells — called by the parent stage each frame via the panel update loop. */
  update(_dt: number): void {
    this.draw();
  }

  private get _gridTopLeft(): { x: number; y: number } {
    if (this._viewW > 800) {
      // OG: RelMove(881, 2) relative to StatusBar origin at bottom of screen
      const barCenterX = Math.max(512, this._viewW / 2);
      return { x: barCenterX - 512 + AttachedLayerX, y: this._viewH - BarH + AttachedLayerY };
    }
    // OG popup mode: positioned via quickslotConfig WZ origin
    return { x: this._viewW / 2 + PopupOriginX, y: this._viewH - 1 - PopupOriginY };
  }

  private _slotRect(i: number): { x: number; y: number; width: number; height: number } {
    const g = this._gridTopLeft;
    const yOff = this._bShowSlide ? 0 : 67;
    return {
      x: g.x + SlotX0 + SlotStride * (i % 4),
      y: g.y + SlotY0 + SlotStride * Math.floor(i / 4) + yOff,
      width: SlotSize,
      height: SlotSize,
    };
  }

  // DragTarget — TODO_AUDIT.md Eighty-ninth/Hundred-and-eighth passes:
  // wires CDraggableSkill::OnDropped's quickslot-drop case (IDA 0x50a4e0)
  // to the previously-dead TryBindSkillAt below via DragController.
  // Also handles item drops (OG: CDraggableItem → CUIStatusBar::MapFuncKey).
  tryAcceptDrag(payload: unknown, x: number, y: number): boolean {
    if (!payload || typeof payload !== 'object') return false;
    if ('skillId' in payload) return this.TryBindSkillAt((payload as { skillId: number }).skillId, x, y);
    if ('itemId' in payload && 'invType' in payload) {
      const { itemId, invType } = payload as { itemId: number; invType: number };
      // OG CDraggableItem::MapFuncKey: only specific items are bindable
      if (this._isBindableItem(itemId, invType)) {
        return this.TryBindItemAt(itemId, x, y);
      }
    }
    return false;
  }

  TryBindItemAt(itemId: number, x: number, y: number): boolean {
    if (!this.isVisible) return false;
    for (let i = 0; i < SlotCount; i++) {
      const r = this._slotRect(i);
      if (x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height) {
        this._bindItem(this._keys[i], itemId);
        return true;
      }
    }
    return false;
  }

  private _bindItem(scancode: number, itemId: number): void {
    this.bindItemToKey?.(scancode, itemId);
  }

  TryBindSkillAt(skillId: number, x: number, y: number): boolean {
    if (!this.isVisible) return false;
    for (let i = 0; i < SlotCount; i++) {
      const r = this._slotRect(i);
      if (x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height) {
        this._bindSkill(this._keys[i], skillId);
        return true;
      }
    }
    return false;
  }

  // OG Draw: keycap labels loaded from KeyConfig property (StringPool 6677 → format → lookup)
  // TS reads scancode-named canvases from quickslotConfig/key, falling back to text
  private _label(scancode: number): WzSprite | null {
    const s = this._labelCache.get(scancode);
    if (s !== undefined) return s;
    let v = this._labelRoot?.Get(scancode.toString());
    if (!(v instanceof WzCanvas) && this._keyConfigRoot) {
      v = this._keyConfigRoot.Get(scancode.toString());
    }
    const sprite = v instanceof WzCanvas ? this._loader.Load(v) : null;
    this._labelCache.set(scancode, sprite);
    return sprite;
  }

}
