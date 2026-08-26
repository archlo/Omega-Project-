import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { PartyAdverData, ExpeditionAdverData } from '../../net/handlers/PacketArgs.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { Button } from '../Button.js';
import { ScrollBar } from './ScrollBar.js';

// ═══ CUISearchDlg (v95 IDB) — UIWindow2.img/UserList/Search ═══════════════════
// 264×382 panel. backgrnd (264×382 origin 0,0 z=-5) + backgrnd2 (252×354
// origin -6,-22 z=-4). Two tabs: Tap/enabled|disabled/0 (90px Party) and
// /1 (60px Expedition). Content: Party/base (245×238 origin -9,-60) or
// Expedition/base (244×25 origin -10,-60) + regist (244×44 origin -10,-114).
// Party buttons: BtStart / BtStop / BtEnd (58×16 each).
// Expedition buttons: BtRegist / BtQuickJoin / BtDelete / BtFront / BtRequest
//                     / BtWhisper / BtStart / BtRegist2 / BtCancle.
// Selection: box (11×11) + check (6×6).

const PANEL_W = 264;
const PANEL_H = 382;
const ROW_H = 18;
const LIST_TOP = 64;
const LIST_BOTTOM = 290;

export class PartySearchDialog extends GamePanel {
  onSearch: ((questId: number) => void) | null = null;
  onRegister: ((questId: number, title: string) => void) | null = null;
  onApply: ((partyId: number) => void) | null = null;
  onStart: (() => void) | null = null;
  onStop: (() => void) | null = null;
  onEnd: (() => void) | null = null;
  onWhisper: ((name: string) => void) | null = null;

  private _loader: WzTextureLoader | null = null;
  private _ui: WzPackage | null = null;

  // WZ sprites
  private _bgSprite: Container | null = null;
  private _contentBg: Container | null = null;
  private _registBg: Container | null = null;
  private _tabParty: Button | null = null;
  private _tabExpedition: Button | null = null;
  private _tabPartyDisabled: Container | null = null;
  private _tabExpedDisabled: Container | null = null;

  // Party buttons
  private _btStart: Button | null = null;
  private _btStop: Button | null = null;
  private _btEnd: Button | null = null;

  // Expedition buttons
  private _btRegist: Button | null = null;
  private _btQuickJoin: Button | null = null;
  private _btDelete: Button | null = null;
  private _btFront: Button | null = null;
  private _btRequest: Button | null = null;
  private _btWhisper: Button | null = null;
  private _btRegist2: Button | null = null;
  private _btCancle: Button | null = null;

  // List
  private _listContainer = new Container();
  private _rowTexts: Text[] = [];
  private _rowBgs: Graphics[] = [];
  private _boxSprite: Container | null = null;
  private _checkSprite: Container | null = null;

  // State
  private _adverts: (PartyAdverData | ExpeditionAdverData)[] = [];
  private _selIdx = -1;
  private _currentTab: 0 | 1 = 0; // 0=Party, 1=Expedition
  private _scrollOffset = 0;
  private _sb: ScrollBar | null = null;
  private _maxVisible = Math.floor((LIST_BOTTOM - LIST_TOP) / ROW_H);
  private _fallbackApply: Button | null = null;

  private _titleStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'Arial' });
  private _entryStyle = new TextStyle({ fill: '#000000', fontSize: 11, fontFamily: 'Arial' });
  private _selStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'Arial' });
  private _labelStyle = new TextStyle({ fill: '#666666', fontSize: 10, fontFamily: 'Arial' });

  constructor(loader?: WzTextureLoader, uiWz?: WzPackage | null) {
    super();
    this.isVisible = false;
    this._wndTitleH = 22;
    this._loader = loader ?? null;
    this._ui = uiWz ?? null;
    if (loader && uiWz) this.initWzAssets(loader, uiWz);
    else this._buildFallback();
  }

  initWzAssets(loader: WzTextureLoader, ui: WzPackage | null): void {
    this._loader = loader;
    this._ui = ui;
    const prop = ui?.GetItem('UIWindow2.img/UserList/Search');
    if (!(prop instanceof WzProperty)) { this._buildFallback(); return; }

    for (const child of [...this._root.children]) child.removeFromParent();

    // backgrnd (264×382 origin 0,0) / backgrnd2 (origin -6,-22 → at 6,22)
    this._addCanvasChild(prop, 'backgrnd');
    this._addCanvasChild(prop, 'backgrnd2');

    this._listContainer.position.set(0, 0);
    this._root.addChild(this._listContainer);

    this._initTabs(prop);
    this._initContent(prop);
    this.createCloseButton(loader, ui, 5, PANEL_W);

    const maxVisible = Math.floor((LIST_BOTTOM - LIST_TOP) / ROW_H);
    this._sb = new ScrollBar(PANEL_W - 16, LIST_TOP, LIST_BOTTOM - LIST_TOP, (pos: number) => {
      this._scrollOffset = pos;
      this._buildRows();
    });
    this._sb.container.visible = false;
    this._root.addChild(this._sb.container);
    this._maxVisible = maxVisible;

    this._buildRows();
  }

  /** Blits a direct canvas child of `prop` at (-originX, -originY). */
  private _addCanvasChild(prop: WzProperty, name: string): void {
    if (!this._loader) return;
    const canvas = prop.Get(name);
    if (!(canvas instanceof WzCanvas)) return;
    const ws = this._loader.Load(canvas);
    if (!ws) return;
    const s = ws.ToPixi();
    s.position.set(-ws.OriginX, -ws.OriginY);
    this._root.addChild(s);
  }

  private _buildFallback(): void {
    for (const child of [...this._root.children]) child.removeFromParent();
    const g = new Graphics();
    g.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0E18', alpha: 245 / 255 });
    g.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
    g.rect(0, 0, PANEL_W, 22).fill({ color: '#0F1224' });
    this._root.addChild(g);

    const t = new Text({ text: 'Party Search', style: this._titleStyle });
    t.position.set(8, 5);
    this._root.addChild(t);

    this._listContainer = new Container();
    this._root.addChild(this._listContainer);

    // Functional fallback buttons (Button renders its own Graphics box).
    this._btStart = new Button('Search');
    this._btStart.container.position.set(10, PANEL_H - 26);
    this._btStart.onClick = () => { this.onSearch?.(-1); };
    this._root.addChild(this._btStart.container);

    this._btStop = new Button('Register');
    this._btStop.container.position.set(80, PANEL_H - 26);
    this._btStop.onClick = () => this._doRegist();
    this._root.addChild(this._btStop.container);

    this._btEnd = new Button('Close');
    this._btEnd.container.position.set(170, PANEL_H - 26);
    this._btEnd.onClick = () => { this.isVisible = false; };
    this._root.addChild(this._btEnd.container);

    const applyBtn = new Button('Apply');
    applyBtn.container.position.set(PANEL_W - 60, PANEL_H - 26);
    applyBtn.onClick = () => this._applySelected();
    this._root.addChild(applyBtn.container);
    this._fallbackApply = applyBtn;

    this.createCloseButton(null, null, 1, PANEL_W);
  }

  private _applySelected(): void {
    if (this._selIdx >= 0 && this._selIdx < this._adverts.length) {
      this.onApply?.(this._adverts[this._selIdx].nGroupID);
    }
  }

  // ── Tab setup ────────────────────────────────────────────────────────────
  private _initTabs(prop: WzProperty): void {
    const tapPr = prop.Get('Tap');
    if (!(tapPr instanceof WzProperty)) return;

    const enabledPr = tapPr.Get('enabled');
    const disabledPr = tapPr.Get('disabled');

    // Party tab (enabled when _currentTab === 0)
    this._tabParty = this._mkTapBtn(enabledPr instanceof WzProperty ? enabledPr : null, 0, () => this._switchTab(0));
    this._tabPartyDisabled = this._mkTapCanvas(disabledPr instanceof WzProperty ? disabledPr : null, 0);

    // Expedition tab (enabled when _currentTab === 1)
    this._tabExpedition = this._mkTapBtn(enabledPr instanceof WzProperty ? enabledPr : null, 1, () => this._switchTab(1));
    this._tabExpedDisabled = this._mkTapCanvas(disabledPr instanceof WzProperty ? disabledPr : null, 1);

    this._syncTabVis();
  }

  private _mkTapBtn(enabledPr: WzProperty | null, idx: number, onClick: () => void): Button | null {
    if (!enabledPr || !this._loader) return null;
    const canvas = enabledPr.Get(`${idx}`);
    if (!(canvas instanceof WzCanvas)) return null;
    const ws = this._loader.Load(canvas);
    if (!ws) return null;
    const b = new Button();
    // ToPixi() already applies the WZ origin as the sprite anchor.
    b.container.addChild(ws.ToPixi());
    b.onClick = onClick;
    b.container.position.set(-ws.OriginX, -ws.OriginY);
    this._root.addChild(b.container);
    return b;
  }

  private _mkTapCanvas(parentPr: WzProperty | null, idx: number): Container | null {
    if (!parentPr || !this._loader) return null;
    const canvas = parentPr.Get(`${idx}`);
    if (!(canvas instanceof WzCanvas)) return null;
    const ws = this._loader.Load(canvas);
    if (!ws) return null;
    const c = new Container();
    c.addChild(ws.ToPixi());
    c.position.set(-ws.OriginX, -ws.OriginY);
    this._root.addChild(c);
    return c;
  }

  private _switchTab(tab: 0 | 1): void {
    if (this._currentTab === tab) return;
    this._currentTab = tab;
    this._selIdx = -1;
    this._scrollOffset = 0;
    this._syncTabVis();
    this._syncContent();
    this._buildRows();
  }

  private _syncTabVis(): void {
    if (this._tabParty) this._tabParty.container.visible = this._currentTab === 0;
    if (this._tabPartyDisabled) this._tabPartyDisabled.visible = this._currentTab !== 0;
    if (this._tabExpedition) this._tabExpedition.container.visible = this._currentTab === 1;
    if (this._tabExpedDisabled) this._tabExpedDisabled.visible = this._currentTab !== 1;
  }

  // ── Content areas ────────────────────────────────────────────────────────
  private _initContent(prop: WzProperty): void {
    // Party content (base 245×238 origin -9,-60 → at 9,60)
    const partyPr = prop.Get('Party');
    if (partyPr instanceof WzProperty) {
      this._contentBg = this._mkContentBg(partyPr, 'base');
      this._btStart = this._mkBtn(partyPr, 'BtStart', () => this.onStart?.());
      this._btStop = this._mkBtn(partyPr, 'BtStop', () => this.onStop?.());
      this._btEnd = this._mkBtn(partyPr, 'BtEnd', () => this.onEnd?.());
    }

    // Expedition content (base 244×25 origin -10,-60; regist 244×44 origin -10,-114)
    const expedPr = prop.Get('Expedition');
    if (expedPr instanceof WzProperty) {
      this._registBg = this._mkContentBg(expedPr, 'base');
      const registRegPr = expedPr.Get('regist');
      if (registRegPr instanceof WzCanvas && this._loader) {
        const ws = this._loader.Load(registRegPr);
        if (ws) {
          const s = ws.ToPixi();
          s.position.set(-ws.OriginX, -ws.OriginY);
          this._root.addChild(s);
        }
      }
      this._btRegist = this._mkBtn(expedPr, 'BtRegist', () => this._doRegist());
      this._btQuickJoin = this._mkBtn(expedPr, 'BtQuickJoin', () => this._doQuickJoin());
      this._btDelete = this._mkBtn(expedPr, 'BtDelete', () => this._doDelete());
      this._btFront = this._mkBtn(expedPr, 'BtFront', () => this._doFront());
      this._btRequest = this._mkBtn(expedPr, 'BtRequest', () => this._doRequest());
      this._btWhisper = this._mkBtn(expedPr, 'BtWhisper', () => this._doWhisper());
      this._btStart = this._mkBtn(expedPr, 'BtStart', () => this._doRegist());
      this._btRegist2 = this._mkBtn(expedPr, 'BtRegist2', () => this._doRegist());
      this._btCancle = this._mkBtn(expedPr, 'BtCancle', () => this._doCancel());
    }

    this._syncContent();
  }

  private _mkContentBg(parentPr: WzProperty, name: string): Container | null {
    const canvas = parentPr.Get(name);
    if (!(canvas instanceof WzCanvas) || !this._loader) return null;
    const ws = this._loader.Load(canvas);
    if (!ws) return null;
    const c = new Container();
    c.addChild(ws.ToPixi());
    c.position.set(-ws.OriginX, -ws.OriginY);
    this._root.addChildAt(c, 2); // above bg, below buttons
    return c;
  }

  private _mkBtn(parentPr: WzProperty, name: string, onClick: () => void): Button | null {
    const sub = parentPr.Get(name);
    if (!(sub instanceof WzProperty) || !this._loader) return null;
    const b = Button.fromWz(this._loader, sub, '');
    b.onClick = onClick;
    b.container.position.set(0, 0);
    this._root.addChild(b.container);
    return b;
  }

  private _syncContent(): void {
    const isParty = this._currentTab === 0;
    if (this._contentBg) this._contentBg.visible = isParty;
    if (this._registBg) this._registBg.visible = !isParty;
    if (this._btStart) this._btStart.container.visible = isParty;
    if (this._btStop) this._btStop.container.visible = isParty;
    if (this._btEnd) this._btEnd.container.visible = isParty;
    if (this._btRegist) this._btRegist.container.visible = !isParty;
    if (this._btQuickJoin) this._btQuickJoin.container.visible = !isParty;
    if (this._btDelete) this._btDelete.container.visible = !isParty;
    if (this._btFront) this._btFront.container.visible = !isParty;
    if (this._btRequest) this._btRequest.container.visible = !isParty;
    if (this._btWhisper) this._btWhisper.container.visible = !isParty;
    if (this._btRegist2) this._btRegist2.container.visible = !isParty;
    if (this._btCancle) this._btCancle.container.visible = !isParty;
  }

  // ── Public API ───────────────────────────────────────────────────────────
  Open(): void {
    this.isVisible = true;
    this._currentTab = 0;
    this._selIdx = -1;
    this._scrollOffset = 0;
    this._syncTabVis();
    this._syncContent();
    this._buildRows();
  }

  SetList(adverts: (PartyAdverData | ExpeditionAdverData)[]): void {
    this._adverts = adverts;
    this._selIdx = -1;
    this._scrollOffset = 0;
    this._buildRows();
  }

  // ── List rendering ───────────────────────────────────────────────────────
  private _buildRows(): void {
    for (const t of this._rowTexts) t.destroy();
    for (const g of this._rowBgs) g.destroy();
    this._rowTexts = [];
    this._rowBgs = [];
    this._listContainer.removeChildren();

    // Selection box/check sprites
    if (this._boxSprite) this._boxSprite.destroy({ children: true });
    if (this._checkSprite) this._checkSprite.destroy({ children: true });
    this._boxSprite = null;
    this._checkSprite = null;

    const maxVisible = this._maxVisible;
    const visible = this._adverts.slice(this._scrollOffset, this._scrollOffset + maxVisible);

    if (this._sb) {
      const total = this._adverts.length;
      this._sb.container.visible = total > maxVisible;
      this._sb.setRange(Math.max(1, total - maxVisible + 1));
      this._sb.pos = this._scrollOffset;
    }

    for (let i = 0; i < visible.length; i++) {
      const a = visible[i];
      const rowIdx = this._scrollOffset + i;
      const y = LIST_TOP + i * ROW_H;
      const isSelected = rowIdx === this._selIdx;

      // Row background highlight
      if (isSelected) {
        const bg = new Graphics();
        bg.rect(10, y, PANEL_W - 30, ROW_H).fill({ color: 0x244768 });
        this._listContainer.addChild(bg);
        this._rowBgs.push(bg);
      }

      // Box icon (left of selection)
      const boxX = 12;
      const boxY = y + 3;
      if (!this._boxSprite && this._ui) {
        const prop = this._ui.GetItem('UIWindow2.img/UserList/Search/box');
        if (prop instanceof WzCanvas && this._loader) {
          const ws = this._loader.Load(prop);
          if (ws) {
            const s = ws.ToPixi();
            this._boxSprite = new Container();
            this._boxSprite.addChild(s);
          }
        }
      }

      // Party mode: show name + quest info
      const label = this._currentTab === 0
        ? `${a.sName} (${a.members.length} members)`
        : a.sName;

      const t = new Text({
        text: label,
        style: isSelected ? this._selStyle : this._entryStyle,
      });
      t.position.set(28, y + 2);
      t.eventMode = 'static';
      t.cursor = 'pointer';
      const idx = rowIdx;
      t.on('pointerdown', () => {
        this._selIdx = idx;
        this._buildRows();
      });
      this._listContainer.addChild(t);
      this._rowTexts.push(t);

      // Member names as sub-text
      if (this._currentTab === 0 && a.members.length > 0) {
        const memberNames = a.members.slice(0, 3).map(m => m.sCharacterName).join(', ');
        const suffix = a.members.length > 3 ? ` +${a.members.length - 3}` : '';
        const sub = new Text({
          text: memberNames + suffix,
          style: this._labelStyle,
        });
        sub.position.set(28, y + 14);
        this._listContainer.addChild(sub);
        this._rowTexts.push(sub);
      }
    }

    if (visible.length === 0) {
      const noResults = new Text({
        text: 'No listings found.',
        style: this._labelStyle,
      });
      noResults.position.set(PANEL_W / 2 - 60, (LIST_TOP + LIST_BOTTOM) / 2);
      this._listContainer.addChild(noResults);
      this._rowTexts.push(noResults);
    }
  }

  // ── Expedition actions ────────────────────────────────────────────────────
  private _doRegist(): void {
    const raw = window.prompt('Quest ID:');
    if (raw === null) return;
    const qid = parseInt(raw, 10);
    if (!Number.isFinite(qid)) return;
    const title = window.prompt('Advertisement title:') ?? '';
    this.onRegister?.(qid, title);
  }

  private _doQuickJoin(): void {
    this._applySelected();
  }

  private _doDelete(): void {
    // Server handles deletion via register with empty title
    this._doRegist();
  }

  private _doFront(): void {
    // Move to front - not commonly used in v95
  }

  private _doRequest(): void {
    this._applySelected();
  }

  private _doWhisper(): void {
    if (this._selIdx >= 0 && this._selIdx < this._adverts.length) {
      const name = this._adverts[this._selIdx].sName;
      this.onWhisper?.(name);
    }
  }

  private _doCancel(): void {
    this.isVisible = false;
  }

  // ── Input ────────────────────────────────────────────────────────────────
  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;

    if (this.handleCloseButton(lx, ly, down)) return true;

    // Tab clicks
    if (this._tabParty?.container.visible && this._hitTab(lx, ly, 10, 25, 90)) {
      if (down) this._switchTab(0);
      return true;
    }
    if (this._tabExpedition?.container.visible && this._hitTab(lx, ly, 101, 25, 60)) {
      if (down) this._switchTab(1);
      return true;
    }

    // Button routing
    const isParty = this._currentTab === 0;
    if (isParty) {
      if (down) {
        this._btStart?.handleMouseButton(lx, ly, down);
        this._btStop?.handleMouseButton(lx, ly, down);
        this._btEnd?.handleMouseButton(lx, ly, down);
      }
    } else {
      if (down) {
        this._btRegist?.handleMouseButton(lx, ly, down);
        this._btQuickJoin?.handleMouseButton(lx, ly, down);
        this._btDelete?.handleMouseButton(lx, ly, down);
        this._btFront?.handleMouseButton(lx, ly, down);
        this._btRequest?.handleMouseButton(lx, ly, down);
        this._btWhisper?.handleMouseButton(lx, ly, down);
        this._btRegist2?.handleMouseButton(lx, ly, down);
        this._btCancle?.handleMouseButton(lx, ly, down);
      }
    }

    return lx >= 0 && lx < PANEL_W && ly >= 0 && ly < PANEL_H;
  }

  private _hitTab(lx: number, ly: number, x: number, y: number, w: number): boolean {
    return lx >= x && lx < x + w && ly >= y && ly < y + 20;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return false;
  }
}
