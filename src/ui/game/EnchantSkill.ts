import { Container, Sprite, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { Button } from '../Button.js';
import { InventoryType } from '../../domain/InventoryItem.js';
import type { DragTarget } from '../DragController.js';
import type { ItemDragPayload } from './ItemInventory.js';

const PanelW = 173;
const PanelH = 182;

// OG CUIEnchantDlg geometry (OnCreate @0x7A1E60 / Draw @0x7A0980):
// - window = UIWindow2.img/EnchantSkill/backgrnd (173x182), wndKey 1
// - BtCancel id 2 at WZ origin + AddButton offset (55,0)
// - BtClose id 2 (Basic.img/BtClose3) at (152,6)
// - white-scroll checkbox id 5000 at (10,158) 100x15, glyph at (x+2,y+1)
// - guide strip UIWindow.img/EnchantSkill/say2 at (30,158)
// - hint strip say0 (no item) / say1 (item parked) drawn via CopyToCanvas(0,0)
// - parked equip icon at (72,134)
// - result effect EnchantSkill/Effect frames 0..25 (origin -7,-68)
const CancelOffsetX = 55;
const CancelOffsetY = 0;
const ClosePos = { x: 152, y: 6 };
const CheckBoxRect = { x: 10, y: 158, w: 100, h: 15 };
const Say2Pos = { x: 30, y: 158 };
const IconPos = { x: 72, y: 134 };
const EffectFrameMs = 100;

export const WHITE_SCROLL_ITEM_ID = 2340000;

// StringPool texts decoded from the decompiles; this String.wz has no
// NoSound.img so the ids cannot be resolved at runtime — fixed fallbacks.
const NOTICE_CASH_ITEM = 'You cannot use a cash item on this.'; // SP 0x108B (PutItem cash reject)
const NOTICE_CANNOT_ENCHANT = 'You cannot enchant this item right now.'; // SP 0x18E7 (SetResult(-1))

export class EnchantSkill extends GamePanel implements DragTarget {
  /** OG ModifyEquipItem nModifyEquipType==0: scroll dropped onto the dialog
   *  sends SendUpgradeItemUseRequest(scrollPos, dlgEquipSlot, whiteScroll,
   *  bEnchantSkill=1). */
  OnEnchantRequest: ((scrollSlot: number, equipSlot: number, whiteScroll: boolean) => void) | null = null;
  /** CUtilDlg::Notice equivalent for the PutItem / SetResult(-1) rejects. */
  OnNotice: ((text: string) => void) | null = null;
  /** OG ShowResult ChatLogAdd(lType 12). */
  OnChatLine: ((text: string) => void) | null = null;
  /** CharacterData::GetItemCount(2, 2340000) != 0 — enables the checkbox. */
  hasWhiteScroll: (() => boolean) | null = null;
  /** play_ui_sound("Enchant") — Sound.wz/UI.img/Enchant bytes provider. */
  playUiSound: ((name: string) => void) | null = null;
  /** Icon provider for the parked equip (DrawItemIconForSlot at 72,134). */
  loadIcon: ((itemId: number) => Sprite | null) | null = null;
  /** OG ShowResult tail: play_game_sound(EnchantSuccess|Failure) +
   *  Effect_ItemUpgrade over the avatar. */
  OnShowWorldEffect: ((success: boolean, cursed: boolean) => void) | null = null;

  // OG state machine flags
  private _clonedItemId = 0;
  private _clonedSlotPosition = 0;
  private _requestSent = false;
  private _receivedResult = false;
  private _bSuccess = false;
  private _bCursed = false;
  private _nEnchantCategory = 0;
  private _bRecoverable = false;

  private _btCancel: Button | null = null;
  private _btClose: Button | null = null;
  private _allButtons: Button[] = [];
  private _checkGlyphs: Sprite[] = [];
  private _checkChecked = false;
  private _checkEnabled = false;
  private _say0: Sprite | null = null;
  private _say1: Sprite | null = null;
  private _itemIcon: Sprite | null = null;
  private _effectFrames: Sprite[] = [];
  private _effectContainer: Container;
  private _effectRunning = false;
  private _effectFrameIndex = 0;
  private _effectFrameTimer = 0;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, _font: unknown) {
    super();
    this.isVisible = false;
    this.container.position.set(300, 200);

    const es = ui?.GetItem('UIWindow2.img/EnchantSkill');
    const esProp = es instanceof WzProperty ? es : null;

    // CreateDlg("UI/UIWindow2.img/EnchantSkill/backgrnd", 1)
    const bg = esProp?.Get('backgrnd');
    if (bg instanceof WzCanvas) {
      const s = loader.Load(bg);
      if (s) this.container.addChild(s.ToPixi());
    }

    this._say0 = this._loadSprite(loader, esProp, 'say0');
    this._say1 = this._loadSprite(loader, esProp, 'say1');

    // AddButton(BtCancel, id 2, offset (55, 0)) — origin (-69,-157) self-places
    this._btCancel = this._makeButton(loader, esProp, 'BtCancel', () => this._onButtonClicked(2));
    if (this._btCancel) this._btCancel.container.position.set(CancelOffsetX, CancelOffsetY);

    // m_pBtClose: CCtrlButton UOL StringPool 0x1962 = "UI/Basic.img/BtClose3",
    // CreateCtrl_2(this, 2, 152, 6)
    const closeRoot = ui?.GetItem('Basic.img/BtClose3');
    this._btClose = closeRoot instanceof WzProperty
      ? this._makeButton(loader, closeRoot, 'BtClose3', () => this._onButtonClicked(2))
      : null;
    if (this._btClose) this._btClose.container.position.set(ClosePos.x, ClosePos.y);

    // m_pCheckWhiteScroll: CCtrlCheckBox id 5000 at (10,158) — glyphs
    // Basic.img/CheckBox/0..3 drawn at (x+2, y+1) per CCtrlCheckBox::Draw.
    const cb = ui?.GetItem('Basic.img/CheckBox');
    if (cb instanceof WzProperty) {
      for (let i = 0; i < 4; i++) {
        const c = cb.Get(String(i));
        if (c instanceof WzCanvas) {
          const ws = loader.Load(c);
          if (ws) {
            const sp = ws.ToPixi();
            sp.position.set(CheckBoxRect.x + 2, CheckBoxRect.y + 1);
            sp.visible = false;
            this._checkGlyphs.push(sp);
            this.container.addChild(sp);
          }
        }
      }
    }
    if (this._checkGlyphs.length === 0) {
      const fallback = new Text({ text: '[ ] White Scroll', style: new TextStyle({ fill: '#FFFFFF', fontSize: 10, fontFamily: 'Arial' }) });
      fallback.position.set(CheckBoxRect.x + 16, CheckBoxRect.y);
      this.container.addChild(fallback);
    }
    this._syncCheckGlyph();

    // Guide strip + effect layer
    const wsRoot = ui?.GetItem('UIWindow.img/EnchantSkill');
    const say2 = this._loadSprite(loader, wsRoot instanceof WzProperty ? wsRoot : null, 'say2');
    if (say2) say2.position.set(Say2Pos.x, Say2Pos.y);

    this._effectContainer = new Container();
    this._effectContainer.visible = false;
    this.container.addChild(this._effectContainer);
    const eff = esProp?.Get('Effect');
    if (eff instanceof WzProperty) {
      for (const key of Object.keys(eff.Items)) {
        const c = eff.Get(key);
        if (c instanceof WzCanvas) {
          const ws = loader.Load(c);
          if (ws) {
            const sp = ws.ToPixi();
            sp.visible = false;
            this._effectFrames.push(sp);
            this._effectContainer.addChild(sp);
          }
        }
      }
      // Frames carry origin (-7,-68): anchor the container so frame (0,0)
      // lands at the dialog-space position OG's LoadLayer uses.
      const first = this._effectFrames[0];
      if (first) this._effectContainer.position.set(-first.x, -first.y);
    }
  }

  /** OG CUserLocal::DoEnchantSkill → ctor+CreateDlg. */
  Open(): void {
    this._clonedItemId = 0;
    this._clonedSlotPosition = 0;
    this._requestSent = false;
    this._receivedResult = false;
    this._effectRunning = false;
    this._effectContainer.visible = false;
    this._setItemIcon(null);
    // EnableWhiteScrollCheck(GetItemCount(2, 2340000) != 0)
    this.EnableWhiteScrollCheck(this.hasWhiteScroll?.() ?? false);
    this.isVisible = true;
  }

  Close(): void {
    this.isVisible = false;
  }

  /** OG EnableWhiteScrollCheck: SetEnable(b) + SetChecked(b). */
  EnableWhiteScrollCheck(enable: boolean): void {
    this._checkEnabled = enable;
    this._checkChecked = enable;
    this._syncCheckGlyph();
  }

  /** OG GetWhiteScrollCheck: (m_bChecked != 0) + 1 → 2 when checked. */
  GetWhiteScrollCheck(): number {
    return (this._checkChecked ? 1 : 0) + 1;
  }

  get hasValidTarget(): boolean {
    return this._clonedItemId !== 0 && this._clonedSlotPosition > 0;
  }

  get isRequestSent(): boolean {
    return this._requestSent;
  }

  /** OG CUIEnchantDlg::PutItem (@0x7A1200) via CDraggableItem route: equips
   *  only (TI 1); cash items rejected unless itemId/10000 == 180 (pet equips).
   *  A Use-tab scroll (TI 2) dropped on the dialog is OG ModifyEquipItem
   *  nModifyEquipType==0 → send with bEnchantSkill=1. */
  tryAcceptDrag(payload: unknown, _x: number, _y: number): boolean {
    if (!this.isVisible || !payload || typeof payload !== 'object' || !('invType' in payload)) return false;
    const p = payload as ItemDragPayload;
    if (p.invType === InventoryType.Equip) {
      if (this.PutItem(p.itemId, p.slotPos)) {
        this.setItemIcon(this.loadIcon?.(p.itemId) ?? null);
        return true;
      }
      return false;
    }
    if (p.invType === InventoryType.Consume && p.slotPos > 0 && !this._requestSent) {
      // ModifyEquipItem case 0: nEPOS = m_nSlotPosition, white scroll from the
      // checkbox, bEnchantSkill = (target == CUIEnchantDlg) = 1. Our server
      // decodes bWhiteScroll truthily so we send the boolean, not OG's 1|2.
      if (!this.hasValidTarget) return false;
      this._requestSent = true;
      this._setButtonsEnabled(false);
      this.OnEnchantRequest?.(p.slotPos, this._clonedSlotPosition, this._checkChecked);
      return true;
    }
    return false;
  }

  /** returns true on accept, false on reject (OG int semantics) */
  PutItem(itemId: number, slotPosition: number): boolean {
    if (this._requestSent || slotPosition <= 0) return false;
    // CItemInfo::IsCashItem reject unless pet equip (/10000 == 180).
    if (isCashItem(itemId) && Math.floor(itemId / 10000) !== 180) {
      this.OnNotice?.(NOTICE_CASH_ITEM);
      return false;
    }
    this._clonedItemId = itemId; // MakeClone = item snapshot; TS keeps the ids
    this._clonedSlotPosition = slotPosition;
    return true;
  }

  setItemIcon(icon: Sprite | null): void {
    this._setItemIcon(icon);
  }

  /** OG SetResult(@0x7A1340). success === -1 surfaces the failure notice and
   *  re-enables; otherwise plays the Effect layer once and parks the outcome
   *  until update() sees IsOKToShowResult → ShowResult(). */
  SetResult(success: number, cursed: boolean, enchantCategory: number, recoverable: boolean): void {
    if (success === -1) {
      this.OnNotice?.(NOTICE_CANNOT_ENCHANT);
      this._stopEffect();
      this._receivedResult = false;
      this._requestSent = false;
      this._setButtonsEnabled(true);
      return;
    }
    this._playEffect();
    this.playUiSound?.('Enchant');
    this._bSuccess = success !== 0;
    this._bCursed = cursed;
    this._nEnchantCategory = enchantCategory;
    this._bRecoverable = recoverable;
    this._receivedResult = true;
  }

  /** OG ShowResult(@0x7A1610) chat matrix (lType 12). Sounds + the avatar
   *  Effect_ItemUpgrade are played by GameStage for every viewer. */
  ShowResult(): void {
    let msg: string;
    const checked = this.GetWhiteScrollCheck() === 2;
    if (this._bSuccess) {
      msg = checked
        ? 'The item was successfully upgraded, and the white scroll was used in the process.'
        : 'The scroll lights up, and then its mysterious power has been transferred to the item.';
    } else if (this._bCursed) {
      msg = 'The item is destroyed due to the overwhelming power of the scroll.';
    } else {
      msg = checked
        ? 'The item upgrade failed, but since the White Scroll was used, the number of item upgrade slots remained in tact.'
        : 'The scroll lights up, but the item winds up as if nothing happened';
    }
    if ((this._nEnchantCategory & 2) !== 0) {
      msg = this._bSuccess
        ? 'You are successful in upgrading the equipment.'
        : this._bCursed
          ? 'Your equipment is destroyed since you fail to upgrade.'
          : 'You fail to upgrade the equipment.';
    }
    this.OnChatLine?.(msg);
    this.OnShowWorldEffect?.(this._bSuccess, this._bCursed);

    if (!this._bCursed || this._bSuccess) {
      this._stopEffect();
      this._receivedResult = false;
      this._requestSent = false;
      this._setButtonsEnabled(true);
      // RefreshToolTip: tooltip re-render — no persistent tooltip here yet.
      // AskWhetherUsePamsSong: no Pam's Song system — documented gap.
    } else {
      // cursed destroy: OG tears down the CUniqueModeless.
      this.Close();
    }
  }

  // IsOKToShowResult: received && effect layer finished animating.
  private _isOKToShowResult(): boolean {
    return this._receivedResult && !this._effectRunning;
  }

  update(dt: number): void {
    if (!this.isVisible) return;
    if (this._effectRunning) {
      this._effectFrameTimer += dt * 1000;
      while (this._effectRunning && this._effectFrameTimer >= EffectFrameMs) {
        this._effectFrameTimer -= EffectFrameMs;
        this._effectFrameIndex++;
        if (this._effectFrameIndex >= this._effectFrames.length) {
          this._effectRunning = false;
          this._effectContainer.visible = false;
          break;
        }
        this._showEffectFrame(this._effectFrameIndex);
      }
    }
    if (this._isOKToShowResult()) this.ShowResult();
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this.container.position.x;
    const ly = y - this.container.position.y;
    if (!down) return true;
    for (const b of this._allButtons) {
      if (b.handleMouseButton(lx, ly, down)) return true;
    }
    // checkbox hit (control rect 100x15)
    if (this._checkEnabled &&
      lx >= CheckBoxRect.x && lx < CheckBoxRect.x + CheckBoxRect.w &&
      ly >= CheckBoxRect.y && ly < CheckBoxRect.y + CheckBoxRect.h) {
      this._checkChecked = !this._checkChecked;
      this._syncCheckGlyph();
      return true;
    }
    // HitTest: ry >= 15 → region 1 (body), else region 2 (drag title)
    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.Close(); return true; }
    return false;
  }

  private _onButtonClicked(nId: number): void {
    if (this._requestSent) return;
    if (nId === 1 || nId === 2 || nId === 8) this.Close(); // SetRet(1|2|8) → dismiss
  }

  private _syncCheckGlyph(): void {
    // state = checked?1:0 (+2 disabled) per CCtrlCheckBox::Draw @0x4D6360
    const idx = this._checkChecked ? 1 : 0;
    for (let i = 0; i < this._checkGlyphs.length; i++) {
      this._checkGlyphs[i].visible = this._checkEnabled ? i === idx : i === idx + 2;
    }
  }

  private _setButtonsEnabled(enabled: boolean): void {
    for (const b of this._allButtons) b.enabled = enabled;
  }

  private _setItemIcon(icon: Sprite | null): void {
    if (this._itemIcon) {
      this.container.removeChild(this._itemIcon);
      this._itemIcon = null;
    }
    if (icon) {
      icon.position.set(IconPos.x, IconPos.y);
      this.container.addChild(icon);
      this._itemIcon = icon;
    }
  }

  private _playEffect(): void {
    if (this._effectFrames.length === 0) return;
    this._effectRunning = true;
    this._effectFrameIndex = 0;
    this._effectFrameTimer = 0;
    this._effectContainer.visible = true;
    this._showEffectFrame(0);
  }

  private _stopEffect(): void {
    this._effectRunning = false;
    this._effectContainer.visible = false;
  }

  private _showEffectFrame(index: number): void {
    for (let i = 0; i < this._effectFrames.length; i++) {
      this._effectFrames[i].visible = i === index;
    }
  }

  private _makeButton(loader: WzTextureLoader, root: WzProperty | null, name: string, onClick: () => void): Button | null {
    if (!(root instanceof WzProperty)) return null;
    const pr = root.Get(name);
    if (!(pr instanceof WzProperty)) return null;
    const b = Button.fromWz(loader, pr, name);
    b.onClick = onClick;
    this._allButtons.push(b);
    this.container.addChild(b.container);
    return b;
  }

  private _loadSprite(loader: WzTextureLoader, root: WzProperty | null, name: string): Sprite | null {
    const c = root?.Get(name);
    if (!(c instanceof WzCanvas)) return null;
    const ws = loader.Load(c);
    if (!ws) return null;
    const sp = ws.ToPixi();
    this.container.addChild(sp);
    return sp;
  }
}

/** v95 CItemInfo::IsCashItem family check (cash prefixes; pet equips are
 *  handled by the caller's /10000==180 exception). */
function isCashItem(itemId: number): boolean {
  const cat = Math.floor(itemId / 10000);
  return cat === 500 || cat === 501 || cat === 502 || cat === 503 ||
    cat === 504 || cat === 505 || cat === 506 || cat === 507 ||
    cat === 508 || cat === 509 || cat === 510 || cat === 511 ||
    cat === 512 || cat === 513 || cat === 514 || cat === 515 ||
    cat === 516 || cat === 517 || cat === 518 || cat === 520 ||
    cat === 522 || cat === 539 || cat === 543 || cat === 550 ||
    cat === 551 || cat === 552 || cat === 553 || cat === 555 ||
    cat === 556 || cat === 557 || cat === 558 || cat === 559 ||
    cat === 560 || cat === 561 || cat === 562 || cat === 563 ||
    cat === 564 || cat === 565;
}
