import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzSprite } from '../../render/WzSprite.js';
import { Button } from '../Button.js';
import { ScrollBar } from './ScrollBar.js';

/**
 * OG: CUIMonsterCarnival — Monster Carnival dialog.
 * Decompiled from v95 IDB:
 * - OnCreate (0x80F1C0) — 3 tabs (guard/minion/bomb+uncle), scrollbar, buttons
 * - Draw (0x80D250) — CP display (personal/team/enemy), tab lists, lock buttons
 * - OnButtonClicked (0x80BB10) — request buttons, tab switching
 * - DrawCPTooltip (0x80FD90) — CP tooltip on hover
 * - DrawLockTooltip (0x80DE40) — lock tooltip
 * - DrawListTooltip (0x80DF80) — item tooltip
 *
 * WZ: UI/UIWindow2.img/MonsterCarnival/ (main, tab backgrounds, buttons)
 *
 * 3 tabs:
 * - Tab 0: Guard requests (defense items)
 * - Tab 1: Minion requests (spawn mobs)
 * - Tab 2: Special requests (bomb, uncle, etc.)
 */

// Panel dimensions (OG: CWnd size from OnCreate)
const PanelW = 300;
const PanelH = 350;

// Tab layout (OG: CCtrlTab at position (8, 10))
const TAB_X = 8;
const TAB_Y = 10;
const TAB_W = 91;
const TAB_H = 19;
const TAB_COUNT = 3;

// Item list area
const LIST_X = 8;
const LIST_Y = 32;
const LIST_W = 280;
const LIST_ROWS = 6;
const LIST_ROW_H = 28;

// CP display positions (OG: Draw 0x80D250)
const CP_X = 10;
const CP_PERSONAL_Y = 200;
const CP_TEAM_Y = 220;
const CP_ENEMY_Y = 240;

// Button IDs (OG: OnButtonClicked 0x80BB10)
const BTN_REQUEST_GUARD = 0x3E8;    // 1000
const BTN_REQUEST_MINION = 0x3E9;   // 1001
const BTN_REQUEST_BOMB = 0x3EA;     // 1002
const BTN_REQUEST_UNCLE = 0x3EB;    // 1003
const BTN_LOCK = 0x3EC;             // 1004

const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _cpStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 10, fontFamily: 'monospace' });
const _cpValueStyle = new TextStyle({ fill: '#FFD700', fontSize: 10, fontFamily: 'monospace' });
const _itemStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 9, fontFamily: 'monospace' });
const _priceStyle = new TextStyle({ fill: '#FFD700', fontSize: 9, fontFamily: 'monospace' });
const _tabStyle = new TextStyle({ fill: '#DCC896', fontSize: 10, fontFamily: 'monospace' });

/** Carnival item (guard/minion/bomb/uncle). */
export interface CarnivalItem {
  index: number;
  itemId: number;
  name: string;
  cost: number;
  icon: WzSprite | null;
}

export interface MonsterCarnivalPanelState {
  team?: number;
  personalCp?: number;
  personalCpTotal?: number;
  personalCpDiff?: number;
  myTeamCp?: number;
  enemyCp?: number;
  enemyCpTotal?: number;
  lastMessage?: string;
}

export class MonsterCarnival extends GamePanel {
  // Callbacks (OG: OnButtonClicked 0x80BB10)
  onGuardRequest: ((index: number) => void) | null = null;
  onMinionRequest: ((index: number) => void) | null = null;
  onBombRequest: ((index: number) => void) | null = null;
  onUncleRequest: ((index: number) => void) | null = null;
  onLock: (() => void) | null = null;

  // State
  private _state: MonsterCarnivalPanelState = {};
  private _activeTab = 0;  // OG: m_nCurTab
  private _guardItems: CarnivalItem[] = [];
  private _minionItems: CarnivalItem[] = [];
  private _specialItems: CarnivalItem[] = [];
  private _selectedItem = -1;
  private _scrollOffset = 0;
  private _maxCp = 1000;

  // UI
  private _bg: Graphics;
  private _wzBg: WzSprite | null = null;
  private _dynamicChildren: Container[] = [];
  private _scrollBar: ScrollBar | null = null;

  // Resolvers
  private _itemNameOf: ((id: number) => string) | null = null;

  constructor(loader: WzTextureLoader, uiWz: WzPackage | null) {
    super();

    this._bg = new Graphics();
    this._rebuildBg();
    this._root.addChild(this._bg);

    // OG: WZ background from UIWindow2.img/MonsterCarnival/main
    const prop = uiWz?.GetItem('UIWindow2.img/MonsterCarnival/main') as WzProperty | null;
    const bgNode = prop?.Get('backgrnd');
    this._wzBg = bgNode instanceof WzCanvas ? (loader.Load(bgNode) ?? null) : null;
    if (this._wzBg) {
      this._root.addChildAt(this._wzBg.ToPixi(), 0);
    }

    // Scrollbar (OG: CCtrlScrollBar)
    this._scrollBar = new ScrollBar(
      LIST_X + LIST_W + 2,
      LIST_Y,
      LIST_ROWS * LIST_ROW_H,
      (pos: number) => { this._scrollOffset = pos; },
    );
    this._root.addChild(this._scrollBar.container);

    // Request buttons (OG: CLayoutMan::AddButton)
    this._makeButton(loader, uiWz, 'BtGuard', () => {
      if (this._selectedItem >= 0) this.onGuardRequest?.(this._selectedItem);
    });
    this._makeButton(loader, uiWz, 'BtMinion', () => {
      if (this._selectedItem >= 0) this.onMinionRequest?.(this._selectedItem);
    });
    this._makeButton(loader, uiWz, 'BtBomb', () => {
      if (this._selectedItem >= 0) this.onBombRequest?.(this._selectedItem);
    });
    this._makeButton(loader, uiWz, 'BtUncle', () => {
      if (this._selectedItem >= 0) this.onUncleRequest?.(this._selectedItem);
    });

    this.container.position.set(495, 82);
  }

  /** Set name resolver. */
  setResolvers(itemNameOf: (id: number) => string): void {
    this._itemNameOf = itemNameOf;
  }

  /** Set carnival items per tab. */
  setItems(tab: number, items: CarnivalItem[]): void {
    switch (tab) {
      case 0: this._guardItems = [...items]; break;
      case 1: this._minionItems = [...items]; break;
      case 2: this._specialItems = [...items]; break;
    }
    this._updateScrollRange();
  }

  /** OG: CUIMonsterCarnival::SetState — update CP display. */
  SetState(state: MonsterCarnivalPanelState): void {
    this._state = { ...this._state, ...state };
    if (state.enemyCpTotal !== undefined && state.enemyCpTotal > this._maxCp) {
      this._maxCp = state.enemyCpTotal;
    }
    if (state.myTeamCp !== undefined && state.myTeamCp > this._maxCp) {
      this._maxCp = state.myTeamCp;
    }
    this.isVisible = true;
  }

  Clear(): void {
    this._state = {};
    this._guardItems = [];
    this._minionItems = [];
    this._specialItems = [];
    this._selectedItem = -1;
    this.isVisible = false;
  }

  private _getActiveList(): CarnivalItem[] {
    switch (this._activeTab) {
      case 0: return this._guardItems;
      case 1: return this._minionItems;
      case 2: return this._specialItems;
      default: return [];
    }
  }

  private _updateScrollRange(): void {
    const list = this._getActiveList();
    const max = Math.max(0, list.length - LIST_ROWS);
    this._scrollBar?.setRange(max);
  }

  private _makeButton(loader: WzTextureLoader, uiWz: WzPackage | null, name: string, onClick: () => void): Button | null {
    const prop = uiWz?.GetItem(`UIWindow2.img/MonsterCarnival/main/${name}`) as WzProperty | null;
    if (!prop) return null;
    const b = Button.fromWz(loader, prop);
    b.onClick = onClick;
    this._root.addChild(b.container);
    return b;
  }

  private _rebuildBg(): void {
    this._bg.clear();
    this._bg.rect(0, 0, PanelW, PanelH).fill({ color: '#0C0E18', alpha: 245 / 255 });
    this._bg.rect(0, 0, PanelW, PanelH).stroke({ color: '#3C4164', width: 1 });
    this._bg.rect(0, 0, PanelW, 22).fill({ color: '#0F1224' });
  }

  // --- Drawing ---

  update(_dt: number): void {
    if (!this.isVisible) return;
    this.draw();
  }

  draw(): void {
    if (!this.isVisible) return;
    for (const c of this._dynamicChildren) c.destroy();
    this._dynamicChildren = [];
    this._rebuildBg();

    // Title
    const title = new Text({ text: 'Monster Carnival', style: _titleStyle });
    title.x = 8; title.y = 3;
    this._root.addChild(title);
    this._dynamicChildren.push(title);

    // Tabs (OG: CCtrlTab with 3 tabs)
    this._drawTabs();

    // Item list
    this._drawItemList();

    // CP display (OG: Draw 0x80D250 — personal/team/enemy CP)
    this._drawCP();
  }

  private _drawTabs(): void {
    const labels = ['Guard', 'Minion', 'Special'];
    for (let i = 0; i < TAB_COUNT; i++) {
      const tx = TAB_X;
      const ty = TAB_Y + i * TAB_H;
      const isActive = i === this._activeTab;

      const g = new Graphics();
      g.rect(tx, ty, TAB_W, TAB_H).fill({ color: isActive ? '#3A3450' : '#1A1A28' });
      if (isActive) g.rect(tx, ty, TAB_W, 1).fill({ color: '#6A5A9A' });
      g.rect(tx, ty, 1, TAB_H).fill({ color: '#504632' });
      g.rect(tx + TAB_W - 1, ty, 1, TAB_H).fill({ color: '#504632' });
      this._root.addChild(g);
      this._dynamicChildren.push(g);

      const t = new Text({ text: labels[i], style: _tabStyle });
      t.x = tx + 4; t.y = ty + 3;
      this._root.addChild(t);
      this._dynamicChildren.push(t);
    }
  }

  private _drawItemList(): void {
    const list = this._getActiveList();
    const startIdx = this._scrollOffset;
    const visibleCount = Math.min(LIST_ROWS, list.length - startIdx);

    for (let i = 0; i < visibleCount; i++) {
      const idx = startIdx + i;
      const item = list[idx];
      const ix = LIST_X;
      const iy = LIST_Y + i * LIST_ROW_H;
      const isSelected = idx === this._selectedItem;

      // Selection highlight
      if (isSelected) {
        const sel = new Graphics();
        sel.rect(ix, iy, LIST_W, LIST_ROW_H).fill({ color: '#2E2E4C' });
        this._root.addChild(sel);
        this._dynamicChildren.push(sel);
      }

      // Item icon
      if (item.icon) {
        const icon = item.icon.ToPixi();
        icon.x = ix + 2; icon.y = iy + 2;
        this._root.addChild(icon);
        this._dynamicChildren.push(icon);
      }

      // Item name
      const nameText = new Text({ text: item.name, style: _itemStyle });
      nameText.x = ix + 24; nameText.y = iy + 3;
      this._root.addChild(nameText);
      this._dynamicChildren.push(nameText);

      // Cost
      const costText = new Text({ text: `${item.cost} CP`, style: _priceStyle });
      costText.x = ix + LIST_W - 60; costText.y = iy + 3;
      this._root.addChild(costText);
      this._dynamicChildren.push(costText);
    }
  }

  /** OG: Draw (0x80D250) — CP display at bottom. */
  private _drawCP(): void {
    const s = this._state;

    // Personal CP (OG: "%d / %d" format)
    const personalLabel = new Text({ text: 'My CP:', style: _cpStyle });
    personalLabel.x = CP_X; personalLabel.y = CP_PERSONAL_Y;
    this._root.addChild(personalLabel);
    this._dynamicChildren.push(personalLabel);

    const personalValue = new Text({
      text: `${s.personalCp ?? 0} / ${s.personalCpTotal ?? 0}`,
      style: _cpValueStyle,
    });
    personalValue.x = CP_X + 60; personalValue.y = CP_PERSONAL_Y;
    this._root.addChild(personalValue);
    this._dynamicChildren.push(personalValue);

    // Team CP (OG: red team / blue team)
    const teamLabel = new Text({ text: `Team ${s.team ?? 0}:`, style: _cpStyle });
    teamLabel.x = CP_X; teamLabel.y = CP_TEAM_Y;
    this._root.addChild(teamLabel);
    this._dynamicChildren.push(teamLabel);

    const teamValue = new Text({ text: `${s.myTeamCp ?? 0}`, style: _cpValueStyle });
    teamValue.x = CP_X + 60; teamValue.y = CP_TEAM_Y;
    this._root.addChild(teamValue);
    this._dynamicChildren.push(teamValue);

    // Enemy CP
    const enemyLabel = new Text({ text: 'Enemy:', style: _cpStyle });
    enemyLabel.x = CP_X; enemyLabel.y = CP_ENEMY_Y;
    this._root.addChild(enemyLabel);
    this._dynamicChildren.push(enemyLabel);

    const enemyStr = s.enemyCpTotal !== undefined ? `${s.enemyCp ?? 0}/${s.enemyCpTotal}` : `${s.enemyCp ?? 0}`;
    const enemyValue = new Text({ text: enemyStr, style: _cpValueStyle });
    enemyValue.x = CP_X + 60; enemyValue.y = CP_ENEMY_Y;
    this._root.addChild(enemyValue);
    this._dynamicChildren.push(enemyValue);

    // Status message
    if (s.lastMessage) {
      const msg = new Text({ text: s.lastMessage, style: new TextStyle({ fill: '#FFD700', fontSize: 9, fontFamily: 'monospace' }) });
      msg.x = CP_X; msg.y = CP_ENEMY_Y + 20;
      this._root.addChild(msg);
      this._dynamicChildren.push(msg);
    }
  }

  // --- Input ---

  handleMouseButton(mx: number, my: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = mx - this._root.x;
    const ly = my - this._root.y;

    if (!down) return false;

    // Tab clicks
    for (let i = 0; i < TAB_COUNT; i++) {
      const ty = TAB_Y + i * TAB_H;
      if (lx >= TAB_X && lx < TAB_X + TAB_W && ly >= ty && ly < ty + TAB_H) {
        this._activeTab = i;
        this._selectedItem = -1;
        this._scrollOffset = 0;
        this._updateScrollRange();
        return true;
      }
    }

    // Item list click
    if (lx >= LIST_X && lx < LIST_X + LIST_W && ly >= LIST_Y && ly < LIST_Y + LIST_ROWS * LIST_ROW_H) {
      const rowIdx = Math.floor((ly - LIST_Y) / LIST_ROW_H) + this._scrollOffset;
      const list = this._getActiveList();
      if (rowIdx >= 0 && rowIdx < list.length) {
        this._selectedItem = rowIdx;
        return true;
      }
    }

    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onMouseMove(_mx: number, _my: number): void {}

  handleWheel(_dx: number, dy: number): void {
    if (!this.isVisible || !this._scrollBar) return;
    this._scrollBar.pos = Math.max(0, Math.min(this._scrollBar.pos + (dy > 0 ? 1 : -1), this._getActiveList().length - LIST_ROWS));
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return true;
  }

  onResize(w: number, h: number): void {
    this._root.x = Math.floor(w - PanelW - 10);
    this._root.y = 82;
  }
}
