import { Container, Graphics, Text, TextStyle } from 'pixi.js';

// OG CCtrlTab types and their layout constants (from IDA decompilation)
// RelocateTabPos @ 0x4ee7f0
const TAB_TYPE_LAYOUT: Record<number, { height: number; grid: number; first: number; spacing: number }> = {
  0: { height: 24, grid: 13, first: 6, spacing: 12 },
  1: { height: 19, grid: 8, first: 4, spacing: 4 },
  2: { height: 21, grid: 12, first: 6, spacing: 6 },
  3: { height: 28, grid: 12, first: 10, spacing: 6 },
  4: { height: 21, grid: 12, first: 6, spacing: 6 },
  5: { height: 21, grid: 8, first: 3, spacing: 4 },
  6: { height: 20, grid: 9, first: 4, spacing: 4 },
  7: { height: 17, grid: 6, first: 3, spacing: 3 },
};

export interface TabItem {
  label: string;
  enabled: boolean;
  // Computed by RelocateTabPos
  x: number;
  width: number;
}

export interface TabCreateParams {
  type?: number; // 0-8, default 8 (custom)
  customHeight?: number; // for type 8
  tabSpace?: number; // grid spacing for type 8
  bDrawBaseImage?: boolean;
  bSameWidth?: boolean;
}

// OG class: CCtrlTab (inherits CCtrlWnd)
// All behavior from IDA decompilation of v95 client.
export class CCtrlTab {
  readonly container = new Container();
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;

  private _type: number;
  private _tabSpace: number;
  private _bDrawBaseImage: boolean;
  private _bSameWidth: boolean;
  private _items: TabItem[] = [];
  private _curTab = 0;
  private _parent: { onTabChanged?: (tab: number) => void; onChildNotify?: (nId: number, param1: number, param2: number) => void } | null = null;

  // Rendering
  private _bg: Graphics;
  private _tabTexts: Text[] = [];
  private _normalFont: TextStyle;
  private _selectedFont: TextStyle;

  constructor(id: number, x: number, y: number, width: number, params?: TabCreateParams) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.width = width;
    this._type = params?.type ?? 8;
    this._tabSpace = params?.tabSpace ?? 1;
    this._bDrawBaseImage = params?.bDrawBaseImage ?? false;
    this._bSameWidth = params?.bSameWidth ?? false;

    const layout = TAB_TYPE_LAYOUT[this._type] || { height: 19, grid: 8, first: 4, spacing: 4 };
    this.height = this._type === 8 ? (params?.customHeight ?? 19) : layout.height;

    this._normalFont = new TextStyle({ fill: '#909090', fontSize: 10, fontFamily: 'monospace' });
    this._selectedFont = new TextStyle({ fill: '#FFFFFF', fontSize: 10, fontFamily: 'monospace' });

    this._bg = new Graphics();
    this.container.addChild(this._bg);
    this.container.position.set(x, y);
  }

  setParent(p: { onTabChanged?: (tab: number) => void; onChildNotify?: (nId: number, param1: number, param2: number) => void }): void {
    this._parent = p;
  }

  // OG: AddItem_Canvas @ 0x4efc40 — adds a tab item with label
  addItem(label: string, enabled = true): void {
    this._items.push({ label, enabled, x: 0, width: 0 });
    this._relocateTabPos();
    this._redraw();
  }

  // OG: RemoveAllItems @ 0x4ee090
  removeAllItems(): void {
    this._items = [];
    this._curTab = 0;
    this._redraw();
  }

  // OG: SetTab @ 0x4ede60
  setTab(nTab: number): void {
    if (nTab >= 0 && nTab < this._items.length) {
      this._curTab = nTab;
      this._redraw();
      // OG: fires OnChildNotify(m_nCtrlId, 500, m_nCurTab) to parent
      this._parent?.onChildNotify?.(this.id, 500, this._curTab);
      this._parent?.onTabChanged?.(this._curTab);
    }
  }

  get curTab(): number { return this._curTab; }
  get itemCount(): number { return this._items.length; }

  // OG: RelocateTabPos @ 0x4ee7f0 — computes x positions for all tabs
  private _relocateTabPos(): void {
    const layout = TAB_TYPE_LAYOUT[this._type] || { grid: 8, first: 4, spacing: 4 };
    const nGrid = this._type === 8 ? this._tabSpace : layout.grid;
    const nFirst = this._type === 8 ? 0 : layout.first;
    const nSpacing = this._type === 8 ? 0 : layout.spacing;

    if (this._bSameWidth && this._items.length > 0) {
      // Equal-width mode
      const totalGrid = nGrid * (this._items.length - 1);
      const available = this.width - totalGrid - nFirst - nSpacing;
      const tabW = Math.max(0, Math.floor(available / this._items.length));
      let pos = nFirst;
      for (const item of this._items) {
        item.x = pos;
        item.width = tabW;
        pos += tabW + nGrid;
      }
    } else {
      // Variable-width mode — measure text
      let pos = Math.floor(nGrid / 2);
      for (let i = 0; i < this._items.length; i++) {
        if (i === 0) pos = nFirst;
        const item = this._items[i];
        item.x = pos;
        // Measure text width (approximate: 7px per char at fontSize 10)
        item.width = item.label.length * 7 + (this._type !== 8 ? 8 : 0);
        pos += item.width + nGrid;
      }
    }
  }

  // OG: Draw @ 0x4ef160
  private _redraw(): void {
    this._bg.clear();
    for (const t of this._tabTexts) this.container.removeChild(t);
    this._tabTexts = [];

    // Draw base image background if enabled
    if (this._bDrawBaseImage) {
      this._bg.rect(0, 0, this.width, this.height).fill({ color: '#141628' });
    }

    for (let i = 0; i < this._items.length; i++) {
      const item = this._items[i];
      const isSelected = i === this._curTab;

      // Draw tab background
      if (isSelected) {
        this._bg.rect(item.x, 0, item.width, this.height).fill({ color: '#26304A' });
        this._bg.rect(item.x, 0, item.width, this.height).stroke({ color: '#5A6E9A', width: 1 });
      } else if (this._bDrawBaseImage) {
        this._bg.rect(item.x, 0, item.width, this.height).fill({ color: '#141628' });
        this._bg.rect(item.x, 0, item.width, this.height).stroke({ color: '#282D41', width: 1 });
      }

      // Draw tab label
      const style = isSelected ? this._selectedFont : this._normalFont;
      const t = new Text({ text: item.label, style });
      t.x = item.x + 4;
      t.y = Math.floor((this.height - 10) / 2);
      this._tabTexts.push(t);
      this.container.addChild(t);
    }
  }

  // OG: OnMouseButton @ 0x4ee3b0 — hit test for tab click
  handleMouseButton(lx: number, ly: number, down: boolean): boolean {
    if (!down) return false;
    if (ly < 0 || ly >= this.height) return false;

    for (let i = 0; i < this._items.length; i++) {
      const item = this._items[i];
      if (lx >= item.x && lx < item.x + item.width) {
        this.setTab(i);
        return true;
      }
    }
    return false;
  }

  get visible(): boolean { return this.container.visible; }
  set visible(v: boolean) { this.container.visible = v; }
}
