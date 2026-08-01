import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';

const PanelW = 386, PanelH = 361;
const TabW = 52, TabH = 20;
const Tabs: string[] = ['AVAILABLE', 'IN PROGRESS', 'COMPLETED', 'PARTY'];

const _tabStyle = new TextStyle({ fill: '#DCC896', fontSize: 10, fontFamily: 'monospace' });
const _titleStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace' });
const _groupStyle = new TextStyle({ fill: '#B3904C', fontSize: 10, fontFamily: 'monospace' });
const _questStyle = new TextStyle({ fill: '#DCC896', fontSize: 10, fontFamily: 'monospace' });

const _filterLabels = ['-1', '-2', '-3', '-4', '-5', '-6', '-7', '-8'];
const _filterWidth = 72;

const ScrollW = 14;
const ContentW = PanelW - ScrollW - 18;
const ContentX = 9;
const ContentY = 38;
const ContentH = PanelH - ContentY - 5;
const HeaderH = 14;
const RowH = 16;

interface QuestGroup {
  name: string;
  quests: number[]; // quest IDs
}

interface QuestEntry {
  id: number;
  name: string;
  group: number; // index into groups
}

// OG class: CUIQuestInfo (ToggleTab/IsCategoryButton/OnToggleDetail,
// decompile/9CCC30.c; ms_lQuestRead tracked-quest-id list). Parent of
// CUIQuestInfoDetail (see QuestDetail.ts).
export class QuestLog extends GamePanel {
  private _bg: Graphics;
  private _wzBg: WzSprite | null;
  private _tabText: Text;
  private _filterButtons: { label: string; g: Graphics; x: number; y: number; active: boolean }[] = [];
  private _activeTab = 1;
  private _scrollOffset = 0;
  private _maxScroll = 0;
  private _dragScroll = false;
  private _dragX = 0;
  private _dragY = 0;
  private _dragging = false;
  private _prevWheel = 0;
  private _groups: QuestGroup[] = [];
  private _entries: QuestEntry[] = [];
  private _selected = -1;

  /** Resolves a quest id to a display name. */
  nameOf: (id: number) => string = (id) => `[${id}]`;

  /** Fired when a quest row is clicked. The stage opens the companion QuestDetail panel. */
  onSelectQuest: ((id: number) => void) | null = null;

  /** Currently selected quest id (or -1). Read-only from outside. */
  get selectedId(): number { return this._selected; }

  // level range filter (true = show)
  private _levelFilters = new Array(8).fill(false);

  constructor(opts: { loader?: WzTextureLoader; uiWz?: WzPackage | null } = {}) {
    super();
    this._root.visible = false;
    this._root.x = 50;
    this._root.y = 60;

    // Try WZ background first
    const questProp = opts.uiWz?.GetItem('UIWindow2.img/Quest/list');
    const wzBgNode = questProp instanceof WzProperty ? questProp.Get('backgrnd') : null;
    this._wzBg = wzBgNode instanceof WzCanvas ? (opts.loader?.Load(wzBgNode) ?? null) : null;

    this._bg = new Graphics();
    if (!this._wzBg) this._rebuildBg();
    this._root.addChild(this._bg);

    if (this._wzBg) {
      this._root.addChildAt(this._wzBg.ToPixi(), 0);
    }

    this._tabText = new Text({ text: '', style: _tabStyle });
    this._root.addChild(this._tabText);

    this._setupFilterButtons();
    // OG: CUIWnd close button
    this.createCloseButton(null, null, 1, 300);
  }

  private _setupFilterButtons(): void {
    let fx = ContentX;
    const fy = ContentY - 18;
    for (let i = 0; i < _filterLabels.length; i++) {
      const g = new Graphics();
      g.rect(0, 0, 18, 15).fill({ color: '#2E2E3C' });
      g.rect(0, 0, 18, 1).fill({ color: '#504632' });
      g.rect(0, 14, 18, 1).fill({ color: '#504632' });
      g.rect(0, 0, 1, 15).fill({ color: '#504632' });
      g.rect(17, 0, 1, 15).fill({ color: '#504632' });
      this._filterButtons.push({ label: _filterLabels[i], g, x: fx, y: fy, active: false });
      g.eventMode = 'static';
      g.cursor = 'pointer';
      this._root.addChild(g);
      fx += 19;
    }
  }

  /** Replace quest data from server. Each entry: { name, quests }. */
  setQuests(groups: { name: string; quests: number[] }[]): void {
    this._groups = groups;
    this._rebuildEntries();
  }

  private _rebuildEntries(): void {
    this._entries = [];
    for (let gi = 0; gi < this._groups.length; gi++) {
      for (const qid of this._groups[gi].quests) {
        this._entries.push({ id: qid, name: this.nameOf(qid) ?? `[${qid}]`, group: gi });
      }
    }
    this._recalcScroll();
  }

  private _recalcScroll(): void {
    const rows = this._groups.reduce((s, g) => s + 1 + g.quests.length, 0);
    const totalH = rows * RowH;
    this._maxScroll = Math.max(0, totalH - ContentH);
    this._scrollOffset = Math.min(this._scrollOffset, this._maxScroll);
  }

  private _totalRows(): number {
    return this._groups.reduce((s, g) => s + 1 + g.quests.length, 0);
  }

  update(_dt: number): void {
    if (!this.isVisible) return;
    this._pollWheel();
    this.draw();
  }

  draw(): void {
    if (!this.isVisible) return;
    if (!this._wzBg) this._rebuildBg();
    this._drawTabs();
    this._drawFilterHighlight();
    this._drawQuestList();
    this._drawScrollbar();
  }

  private _drawTabs(): void {
    for (let i = 0; i < Tabs.length; i++) {
      const tx = 8 + i * (TabW + 2);
      const ty = 8;
      const g = new Graphics();
      if (i === this._activeTab) {
        g.rect(tx, ty, TabW, TabH).fill({ color: '#3A3450' });
        g.rect(tx, ty, TabW, 1).fill({ color: '#6A5A9A' });
      } else {
        g.rect(tx, ty, TabW, TabH).fill({ color: '#1A1A28' });
        g.rect(tx, ty, TabW, 1).fill({ color: '#504632' });
      }
      g.rect(tx, ty + TabH - 1, TabW, 1).fill({ color: '#504632' });
      g.rect(tx, ty, 1, TabH).fill({ color: '#504632' });
      g.rect(tx + TabW - 1, ty, 1, TabH).fill({ color: '#504632' });
      this._root.addChild(g);
      const t = new Text({ text: Tabs[i], style: _tabStyle });
      t.x = tx + 4; t.y = ty + 2;
      this._root.addChild(t);
    }
  }

  private _drawFilterHighlight(): void {
    for (const f of this._filterButtons) {
      if (f.active) {
        const h = new Graphics();
        h.rect(f.x + 2, f.y + 1, 14, 13).fill({ color: '#64DC64', alpha: 0.3 });
        this._root.addChild(h);
      }
    }
  }

  private _drawQuestList(): void {
    const clip = new Graphics();
    clip.rect(ContentX, ContentY, ContentW, ContentH).fill({ color: '#0F0F19', alpha: 0.01 });
    this._root.addChild(clip);

    let py = ContentY - this._scrollOffset;
    let visible = 0;

    for (let gi = 0; gi < this._groups.length; gi++) {
      const g = this._groups[gi];
      if (py + RowH > ContentY && py < ContentY + ContentH) {
        const gh = new Text({ text: g.name, style: _groupStyle });
        gh.x = ContentX + 4; gh.y = py + 1;
        this._root.addChild(gh);
        visible++;
      }
      py += RowH;

      for (const entry of this._entries) {
        if (entry.group !== gi) continue;
        if (py + RowH > ContentY && py < ContentY + ContentH) {
          const bg = new Graphics();
          bg.rect(ContentX, py, ContentW, RowH).fill({ color: visible % 2 === 0 ? '#13131F' : '#181828', alpha: 0.8 });
          this._root.addChild(bg);
          const t = new Text({ text: `  ${entry.name}`, style: _questStyle });
          t.x = ContentX + 4; t.y = py + 1;
          this._root.addChild(t);
          visible++;
        }
        py += RowH;
      }
    }
  }

  private _drawScrollbar(): void {
    if (this._maxScroll === 0) return;
    const sx = PanelW - ScrollW - 5;
    const sy = ContentY;
    const sh = ContentH;
    const g = new Graphics();
    g.rect(sx, sy, ScrollW, sh).fill({ color: '#1A1A28' });
    g.rect(sx, sy, ScrollW, 1).fill({ color: '#504632' });
    g.rect(sx, sy + sh - 1, ScrollW, 1).fill({ color: '#504632' });
    g.rect(sx, sy, 1, sh).fill({ color: '#504632' });
    g.rect(sx + ScrollW - 1, sy, 1, sh).fill({ color: '#504632' });
    this._root.addChild(g);

    const ratio = Math.min(1, sh / (this._totalRows() * RowH));
    const thumbH = Math.max(14, sh * ratio);
    const thumbY = sy + (this._scrollOffset / this._maxScroll) * (sh - thumbH);
    const tg = new Graphics();
    tg.rect(sx + 1, thumbY, ScrollW - 2, thumbH).fill({ color: '#46465A' });
    tg.rect(sx + 1, thumbY, ScrollW - 2, 1).fill({ color: '#64647A' });
    tg.rect(sx + 1, thumbY + thumbH - 1, ScrollW - 2, 1).fill({ color: '#64647A' });
    this._root.addChild(tg);
  }

  setPosition(x: number, y: number): void {
    this._root.x = x;
    this._root.y = y;
  }

  handleMouseButton(mx: number, my: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = mx - this._root.x;
    const ly = my - this._root.y;

    if (!down) {
      this._dragScroll = false;
      this._dragging = false;
      return true;
    }

    if (lx >= PanelW - 18 && ly < 22) { this.isVisible = false; return true; }

    // tabs
    for (let i = 0; i < Tabs.length; i++) {
      const tx = 8 + i * (TabW + 2);
      if (lx >= tx && lx < tx + TabW && ly >= 8 && ly < 8 + TabH) {
        this._activeTab = i;
        this._scrollOffset = 0;
        return true;
      }
    }

    // filter buttons
    for (const f of this._filterButtons) {
      if (lx >= f.x && lx < f.x + 18 && ly >= f.y && ly < f.y + 15) {
        f.active = !f.active;
        return true;
      }
    }

    // scrollbar drag
    const sx = PanelW - ScrollW - 5;
    if (lx >= sx && lx < sx + ScrollW && ly >= ContentY && ly < ContentY + ContentH) {
      this._dragScroll = true;
      this._setScrollFromY(ly - ContentY);
      return true;
    }

    // quest row click — fire onSelectQuest if a row is hit
    const hitId = this._hitTestQuest(lx, ly);
    if (hitId > 0) {
      this._selected = hitId;
      this.onSelectQuest?.(hitId);
      return true;
    }

    // panel drag
    if (ly < 22 && lx < PanelW - 18) {
      this._dragging = true;
      this._dragX = mx - this._root.x;
      this._dragY = my - this._root.y;
      return true;
    }

    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onMouseMove(mx: number, my: number): void {
    if (this._dragScroll) {
      const ly = my - this._root.y;
      this._setScrollFromY(ly - ContentY);
    }
    if (this._dragging) {
      this._root.x = Math.max(0, mx - this._dragX);
      this._root.y = Math.max(0, my - this._dragY);
    }
  }

  handleWheel(dx: number, dy: number): void {
    if (!this.isVisible) return;
    this._scrollOffset = Math.max(0, Math.min(this._maxScroll, this._scrollOffset + dy * -RowH * 3));
  }

  /** GameStage doesn't forward wheel events to panels — poll the same global
      `window.__wheelDelta`/`__mouseX/Y` stash QuestDetail.ts already uses. */
  private _pollWheel(): void {
    const w = window as any;
    const mx = w.__mouseX as number | undefined;
    const my = w.__mouseY as number | undefined;
    if (mx === undefined || my === undefined) return;
    const lx = mx - this._root.x;
    const ly = my - this._root.y;
    if (lx < 0 || lx >= PanelW || ly < 0 || ly >= PanelH) return;
    if (typeof w.__wheelDelta !== 'number') return;
    const d = w.__wheelDelta;
    if (d === this._prevWheel) return;
    this._prevWheel = d;
    this.handleWheel(0, Math.sign(d));
  }

  private _setScrollFromY(ly: number): void {
    const ratio = Math.max(0, Math.min(1, ly / ContentH));
    this._scrollOffset = Math.floor(ratio * this._maxScroll);
  }

  /** Resolve a click in content space to a quest id (0 if no hit). */
  private _hitTestQuest(lx: number, ly: number): number {
    if (lx < ContentX || lx >= ContentX + ContentW) return 0;
    if (ly < ContentY || ly >= ContentY + ContentH) return 0;
    const localY = ly - ContentY + this._scrollOffset;
    const groups = this._groups;
    let y = 0;
    for (let gi = 0; gi < groups.length; gi++) {
      if (localY >= y && localY < y + RowH) return 0; // group header
      y += RowH;
      const groupEntries = this._entries.filter(e => e.group === gi);
      for (const entry of groupEntries) {
        if (localY >= y && localY < y + RowH) return entry.id;
        y += RowH;
      }
    }
    return 0;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return true;
  }

  onResize(w: number, h: number): void {
    this._root.x = Math.floor((w - PanelW) / 2);
    this._root.y = Math.floor((h - PanelH) / 2);
  }

  private _rebuildBg(): void {
    this._bg.clear();
    this._bg.rect(0, 0, PanelW, PanelH).fill({ color: '#0F0F19', alpha: 235 / 255 });
    // title bar
    this._bg.rect(0, 0, PanelW, 22).fill({ color: '#1A1A28', alpha: 1 });
  }
}
