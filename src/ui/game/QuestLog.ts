import { Container, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { ScrollBar } from './ScrollBar.js';
import { Button } from '../Button.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';

// ── OG class: CUIQuestInfo (UIWindow2.img/Quest/list) ─────────────────────────
// Window 235x396 (CreateUIWndPosSaved(235, 396, 10)); backgrnd at (0,0),
// backgrnd2 (223x368, origin -6,-23) at (6,23).
//
// Tab strip (CCtrlTab id 2000, type 8, x=8 y=9 w=239 h=20, nTabSpace=1):
//   Quest/list/Tab/enabled/<i> | Quest/list/Tab/disabled/<i>, i = 0..3
//   canvas origins: enabled (-9,-25),(-59,-25),(-117,-25),(-169,-25)
//   disabled        (-9,-27),(-59,-27),(-117,-27),(-169,-27)
//
// Scrollbar (CCtrlScrollBar id 2001, type 8, x=217 y=48 h=318, m_nWheelRange=207)
// BtMyLevel id 5000 / BtAllLevel id 5001 (Quest/list/BtMyLevel|BtAllLevel,
//   85x16, canvas origin (-140,-371) → (140,371)); only shown on tab 0, toggling
//   the "show only worthy" filter (m_nOption 0x10000000).
// Category toggles: BtMax id 4000+4*cat+tab (Quest/BtMax, minimize),
//   BtMin id 3000+4*cat+tab (Quest/BtMin, expand) — created lazily per row.
//
// Hit rect (GetQuestIdxFromMousePos 0x821980): {14,52,216,52+22*(count-scroll)},
//   row = scrollPos + (ry-52)/22.
// Rows (22px): icon (12, 22r+54); header "name (%d)" white (31, 22r+51);
//   quest name white/darkgray/disabledgray (32, 22r+52); level red (31, 22r+56).
// Icons by nIconType: 0→icon5 (QM0 if read/delivery), 1→icon6(alarm) else icon2,
//   2→iconQM1 else icon3, 3→none, 4→icon7, 5→iconQM0/icon9/icon8.
const W = 235;
const H = 396;
const TAB_X = 8;
const TAB_Y = 9;
const TAB_ORIGIN_X = [-9, -59, -117, -169];
const TAB_ORIGIN_Y_ENABLED = -25;
const SB_X = 217;
const SB_Y = 48;
const SB_H = 318;
const ROW_H = 22;
const LIST_TOP = 52;
const LIST_LEFT = 14;
const LIST_RIGHT = 216;
const MAX_ROW_COUNT = Math.floor((SB_H - LIST_TOP) / ROW_H); // visible rows (12)
const ICON_X = 12;
const NAME_X = 32;
const NAME_COLORS = {
  selected: 0xFFFFFF,
  normal: 0x9C9C9C,
  worthless: 0x6E6E6E,
  header: 0xFFFFFF,
  level: 0xFF6A6A,
};
const _nameStyle = new TextStyle({ fill: NAME_COLORS.normal, fontSize: 11, fontFamily: 'monospace' });
const _levelStyle = new TextStyle({ fill: NAME_COLORS.level, fontSize: 11, fontFamily: 'monospace' });
const _headerStyle = new TextStyle({ fill: NAME_COLORS.header, fontSize: 11, fontFamily: 'monospace' });

interface QuestGroup {
  name: string;
  quests: number[];
}

interface QuestRow {
  id: number;
  name: string;
  level: string;
  category: number;
  sortKey: number;
  iconType: number;
}

interface QuestHeaderRow {
  header: true;
  name: string;
  category: number;
  count: number;
  minimized: boolean;
}

type DisplayRow = QuestRow | QuestHeaderRow;

/** WZ icon node per nIconType. Icon node → frame children (icon5 has 5, etc.). */
const ICON_NODE_BY_TYPE: Record<number, string> = {
  0: 'icon5',
  1: 'icon2',
  2: 'icon3',
  3: '',
  4: 'icon7',
  5: 'icon8',
};

export class QuestLog extends GamePanel {
  /** Resolves a quest id to a display name. */
  nameOf: (id: number) => string = (id) => `[${id}]`;

  /** Resolves a quest id to a level-range display string (red prefix), or ''. */
  levelOf: (id: number) => string = () => '';

  /** Fired when a quest row is clicked. The stage opens the companion QuestDetail panel. */
  onSelectQuest: ((id: number) => void) | null = null;

  /** Currently selected quest id (or -1). Read-only from outside. */
  get selectedId(): number { return this._selected; }

  private _loader: WzTextureLoader;
  private _uiWz: WzPackage | null;
  private _wzBg: WzSprite | null = null;
  private _wzBg2: WzSprite | null = null;
  private _wzTabEnabled: (WzSprite | null)[] = new Array(4).fill(null);
  private _wzTabDisabled: (WzSprite | null)[] = new Array(4).fill(null);
  private _wzIcons: Record<number, WzSprite[]> = {}; // node name → frame sprites

  private _activeTab = 1;
  private _scroll = 0;
  private _maxScroll = 0;
  private _selected = -1;
  private _showAll = false;

  private _groupsByTab: QuestGroup[][] = [
    [], [], [], [],
  ];
  private _rowsByTab: DisplayRow[][] = [
    [], [], [], [],
  ];

  private _layer: Container;
  private _rowLayer: Container;
  private _scrollBar: ScrollBar | null = null;
  private _btMyLevel: Button | null = null;
  private _btAllLevel: Button | null = null;
  private _catBtns: Button[] = [];

  constructor(opts: { loader?: WzTextureLoader; uiWz?: WzPackage | null } = {}) {
    super();
    this._loader = opts.loader ?? (null as unknown as WzTextureLoader);
    this._uiWz = opts.uiWz ?? null;
    this._root.visible = false;
    this._root.x = 50;
    this._root.y = 60;

    this._layer = new Container();
    this._rowLayer = new Container();
    this._root.addChild(this._layer);
    this._root.addChild(this._rowLayer);

    this._loadWzAssets();
    this.createCloseButton(null, null, 1, W);

    // OG: scrollbar (id 2001) at (217, 48, 318); range set by SetScrollBar.
    this._scrollBar = new ScrollBar(SB_X, SB_Y, SB_H, (pos) => { this._scroll = pos; }, {
      loader: this._loader,
      uiWz: this._uiWz,
    });
    this._root.addChild(this._scrollBar.container);

    if (this._loader) {
      this._btMyLevel = this._buttonFrom('BtMyLevel', 5000, () => { this._showAll = false; this._refresh(); });
      this._btAllLevel = this._buttonFrom('BtAllLevel', 5001, () => { this._showAll = true; this._refresh(); });
    }
  }

  private _loadWzAssets(): void {
    if (!this._loader || !this._uiWz) return;
    const list = this._uiWz.GetItem('UIWindow2.img/Quest/list');
    if (!(list instanceof WzProperty)) return;

    this._wzBg = this._canvas(list, 'backgrnd');
    this._wzBg2 = this._canvas(list, 'backgrnd2');

    for (let i = 0; i < 4; i++) {
      const en = list.GetItem(`Tab/enabled/${i}`);
      const dis = list.GetItem(`Tab/disabled/${i}`);
      this._wzTabEnabled[i] = en instanceof WzCanvas ? this._loader.Load(en) : null;
      this._wzTabDisabled[i] = dis instanceof WzCanvas ? this._loader.Load(dis) : null;
    }

    // Icons under UIWindow2.img/Quest/icon/<node>/<frame>
    const questRoot = this._uiWz.GetItem('UIWindow2.img/Quest');
    const iconRoot = questRoot instanceof WzProperty ? questRoot.Get('icon') : null;
    if (iconRoot instanceof WzProperty) {
      for (const [type, nodeName] of Object.entries(ICON_NODE_BY_TYPE)) {
        if (!nodeName) continue;
        const node = iconRoot.Get(nodeName);
        if (!(node instanceof WzProperty)) continue;
        const frames: WzSprite[] = [];
        for (const [key, val] of Object.entries(node.Items)) {
          if (val instanceof WzCanvas) {
            const spr = this._loader.Load(val);
            if (spr) frames[parseInt(key)] = spr;
          }
        }
        this._wzIcons[Number(type)] = frames.filter((f): f is WzSprite => f !== null);
      }
    }

    // BtMyLevel/BtAllLevel are created as Button instances in _buttonFrom.
  }

  private _canvas(root: WzProperty, name: string): WzSprite | null {
    const v = root.Get(name);
    return v instanceof WzCanvas ? this._loader.Load(v) : null;
  }

  private _buttonFrom(name: string, id: number, onClick: () => void): Button | null {
    if (!this._loader || !this._uiWz) return null;
    const node = this._uiWz.GetItem(`UIWindow2.img/Quest/list/${name}`);
    if (!(node instanceof WzProperty)) return null;
    const b = Button.fromWz(this._loader, node, name);
    b.onClick = onClick;
    b.container.position.set(140, 371);
    this._root.addChild(b.container);
    return b;
  }

  // ── Data ────────────────────────────────────────────────────────────────────

  /** Replace quest data from server (per-tab groups). */
  setQuests(groups: { name: string; quests: number[] }[]): void {
    // Backward-compat: old call fed a single list of groups → treat as tab 1.
    this.setQuestsForTab(1, groups);
  }

  /** Feed one tab's groups (OG LoadData: tab0 available, 1 in-progress, 2 completed, 3 party). */
  setQuestsForTab(tab: number, groups: { name: string; quests: number[] }[]): void {
    if (tab < 0 || tab > 3) return;
    this._groupsByTab[tab] = groups;
    if (tab === this._activeTab) this._rebuildRows();
    this._refresh();
  }

  /** All tabs at once. */
  setQuestLists(tabs: QuestGroup[][]): void {
    for (let i = 0; i < 4; i++) this._groupsByTab[i] = tabs[i] ?? [];
    this._rebuildRows();
    this._refresh();
  }

  private _rebuildRows(): void {
    const rows: DisplayRow[] = [];
    const state = new Map<number, boolean>();
    for (const g of this._groupsByTab[this._activeTab]) {
      for (const id of g.quests) state.set(id, false);
    }
    for (const g of this._groupsByTab[this._activeTab]) {
      const quests = g.quests.filter((id) => !this._showAll || !this._isWorthless(id));
      if (quests.length === 0) continue;
      rows.push({ header: true, name: g.name, category: 0, count: quests.length, minimized: false });
      for (const id of quests) {
        rows.push({
          id,
          name: this.nameOf(id),
          level: this._levelOf(id),
          category: 0,
          sortKey: 0,
          iconType: this._iconTypeForTab(this._activeTab),
        });
      }
    }
    this._rowsByTab[this._activeTab] = rows;
    this._maxScroll = Math.max(0, rows.length - MAX_ROW_COUNT);
    if (this._scroll > this._maxScroll) this._scroll = this._maxScroll;
    if (this._scrollBar) this._scrollBar.setRange(this._maxScroll + 1);
  }

  private _iconTypeForTab(tab: number): number {
    // OG LoadData sets nIconType per tab: available→0, in-progress→1,
    // completed→2, party→4.
    return [0, 1, 2, 4][tab];
  }

  private _isWorthless(_id: number): boolean {
    return false;
  }

  private _levelOf(id: number): string {
    return this.levelOf(id);
  }

  private _refresh(): void {
    this._rebuildRows();
    this._applyButtons();
  }

  private _applyButtons(): void {
    const onTab0 = this._activeTab === 0;
    if (this._btMyLevel) this._btMyLevel.container.visible = onTab0 && !this._showAll;
    if (this._btAllLevel) this._btAllLevel.container.visible = onTab0 && this._showAll;
  }

  // ── Rendering ───────────────────────────────────────────────────────────────

  update(_dt: number): void {
    if (!this.isVisible) return;
    this.draw();
  }

  draw(): void {
    if (!this.isVisible) return;
    this._layer.removeChildren();
    this._rowLayer.removeChildren();
    this._catBtns = [];

    // Backgrounds
    if (this._wzBg) this._layer.addChild(this._wzBg.ToPixi());
    if (this._wzBg2) this._layer.addChild(this._wzBg2.ToPixi());

    // Tabs — each tab canvas is placed at the strip anchor; the WZ canvas
    // origin (Tab/enabled|disabled/<i> origin: x=-9,-59,-117,-169) fans them out.
    for (let i = 0; i < 4; i++) {
      const sprite = i === this._activeTab ? this._wzTabEnabled[i] : this._wzTabDisabled[i];
      if (!sprite) continue;
      const s = sprite.ToPixi();
      s.position.set(TAB_X, TAB_Y);
      this._layer.addChild(s);
    }

    // Rows
    const rows = this._rowsByTab[this._activeTab];
    const start = this._scroll;
    if (rows.length === 0) {
      this._drawEmptyNotice();
    } else {
      for (let r = 0; r < MAX_ROW_COUNT; r++) {
        const idx = start + r;
        if (idx >= rows.length) break;
        this._drawRow(rows[idx], r);
      }
    }
  }

  private _drawEmptyNotice(): void {
    // OG Draw: when the tab list is empty, show Quest/list/notice{tab}
    const list = this._uiWz?.GetItem('UIWindow2.img/Quest/list');
    if (this._loader && list instanceof WzProperty) {
      const n = list.GetItem(`notice${this._activeTab}`);
      if (n instanceof WzCanvas) {
        const spr = this._loader.Load(n);
        if (!spr) return;
        const sp = spr.ToPixi();
        sp.position.set(0, 0);
        this._rowLayer.addChild(sp);
        return;
      }
    }
    const t = new Text({ text: '(No quests)', style: _headerStyle });
    t.position.set(40, 90);
    this._rowLayer.addChild(t);
  }

  private _drawRow(row: DisplayRow, r: number): void {
    const y = LIST_TOP + r * ROW_H;
    if (this._isHeader(row)) {
      // Category header: "name (%d)" white at (31, 22r+51)
      const t = new Text({ text: `${row.name} (${row.count})`, style: _headerStyle });
      t.position.set(31, LIST_TOP + r * ROW_H - 1);
      this._rowLayer.addChild(t);
      // Category toggle button: BtMax (minimize) at (140-ish)
      if (this._loader && this._uiWz) {
        const bt = this._toggleButton(row.minimized ? 'BtMin' : 'BtMax');
        if (bt) {
          bt.container.position.set(211 - 13, y);
          this._root.addChild(bt.container);
          this._catBtns.push(bt);
        }
      }
      return;
    }
    // Quest row
    const isSelected = row.id === this._selected;
    const style = isSelected ? new TextStyle({ fill: NAME_COLORS.selected, fontSize: 11, fontFamily: 'monospace' }) : _nameStyle;

    // Icon at (12, 22r+54)
    const iconFrames = this._wzIcons[row.iconType] ?? [];
    if (iconFrames.length > 0) {
      const frame = iconFrames[this._iconFrame(row, iconFrames.length)];
      if (frame) {
        const sp = frame.ToPixi();
        sp.position.set(ICON_X, y + 2);
        this._rowLayer.addChild(sp);
      }
    }

    // Level (red) at (31, 22r+56)
    if (row.level) {
      const lv = new Text({ text: row.level, style: _levelStyle });
      lv.position.set(31, y + 4);
      this._rowLayer.addChild(lv);
    }

    // Name at (32, 22r+52)
    const t = new Text({ text: row.name, style });
    t.position.set(NAME_X, y);
    this._rowLayer.addChild(t);
  }

  private _iconFrame(_row: QuestRow, frameCount: number): number {
    return Math.min(0, frameCount - 1);
  }

  private _isHeader(row: DisplayRow): row is QuestHeaderRow {
    return 'header' in row && row.header;
  }

  private _toggleButton(nodeName: string): Button | null {
    if (!this._loader || !this._uiWz) return null;
    const node = this._uiWz.GetItem(`UIWindow2.img/Quest/${nodeName}`);
    if (!(node instanceof WzProperty)) return null;
    const b = Button.fromWz(this._loader, node, '');
    b.onClick = () => { /* minimize/expand category — skip for now */ };
    return b;
  }

  // ── Input ───────────────────────────────────────────────────────────────────

  handleMouseButton(mx: number, my: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = mx - this._root.x;
    const ly = my - this._root.y;

    if (this._scrollBar?.handleMouseButton(lx - SB_X, ly - SB_Y, down) === true) return true;
    if (this._btMyLevel?.handleMouseButton(lx, ly, down) === true) return true;
    if (this._btAllLevel?.handleMouseButton(lx, ly, down) === true) return true;

    if (down) {
      // Tabs
      for (let i = 0; i < 4; i++) {
        if (this._hitTab(lx, ly, i)) {
          if (this._activeTab !== i) {
            this._activeTab = i;
            this._scroll = 0;
            this._rebuildRows();
            this._applyButtons();
          }
          return true;
        }
      }

      // Quest rows
      const idx = this._hitRow(lx, ly);
      if (idx >= 0) {
        const row = this._rowsByTab[this._activeTab][idx];
        if (this._isHeader(row)) return true;
        this._selected = row.id;
        this.onSelectQuest?.(row.id);
        return true;
      }
    }

    return super.handleMouseButton(mx, my, down) || (lx >= 0 && lx < W && ly >= 0 && ly < H);
  }

  onMouseMove(mx: number, my: number): void {
    if (!this.isVisible) return;
    const lx = mx - this._root.x;
    const ly = my - this._root.y;
    this._scrollBar?.handleMouseMove(lx - SB_X, ly - SB_Y);
  }

  handleWheel(dx: number, dy: number): void {
    if (!this.isVisible) return;
    this._scroll = Math.max(0, Math.min(this._maxScroll, this._scroll - dy));
  }

  private _hitTab(lx: number, ly: number, i: number): boolean {
    // Tab canvas is origin-anchored at (TAB_X, TAB_Y): top-left = TAB - origin.
    // Enabled origins: x=-9,-59,-117,-169, y=-25 → visual y 34..56, heights 22.
    const w = [49, 57, 51, 57][i];
    const x = TAB_X - TAB_ORIGIN_X[i];
    const y = TAB_Y - TAB_ORIGIN_Y_ENABLED;
    return lx >= x && lx < x + w && ly >= y && ly < y + 22;
  }

  private _hitRow(lx: number, ly: number): number {
    if (ly < LIST_TOP) return -1;
    const row = this._scroll + Math.floor((ly - LIST_TOP) / ROW_H);
    if (row < 0 || row >= this._rowsByTab[this._activeTab].length) return -1;
    if (lx < LIST_LEFT || lx >= LIST_RIGHT) return -1;
    return row;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return true;
  }

  onResize(w: number, h: number): void {
    this._root.x = Math.floor((w - W) / 2);
    this._root.y = Math.floor((h - H) / 2);
  }
}
