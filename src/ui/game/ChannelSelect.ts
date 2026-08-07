import { Container, Sprite, Texture } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { Button } from '../Button.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';

// OG: CUIChannelShift (v95) — in-game channel shift dialog.
// Window 370x168, centered on screen (ctor 0x96BE90:
//   x=(scrW-370)/2, y=(scrH-168)/2, wndKey=10, Origin_LT).
// WZ: UI/UIWindow2.img/Channel (OnCreate 0x96C160):
//   backgrnd          370x168 window background
//   BtChange          id 1, AddButton offset (-20,0), canvas origin (-243,-141) → (223,141) 74x16
//   BtCancel          id 2, AddButton offset (0,0),   canvas origin (-320,-141) → (320,141) 40x16
//   channel0/channel1 68x19 cell backgrounds (m_pCanvasItem[0]/[1])
//   world/<worldId>   world-name image, drawn at (16, 40-h/2)
// Grid (GetRectFromIdx 0x9689C0): cell idx → left=70*(idx%5)+11, top=20*(idx/5)+55, 68x20.
// Channel-number glyphs load from UI/UIWindow.img/Channel/ch/<idx> (0-based; ch/0 shows "1").
// Draw (0x96CCB0): all cells drawn every frame; current channel (m_nChannelID) uses the
// channel0 canvas, hover/selected cell (m_nSel) uses channel1; plain cells draw the number
// glyph only. Number glyph at (left+8, top+5).
const PANEL_W = 370;
const PANEL_H = 168;

// OG GetRectFromIdx: cell idx grid.
function getRectFromIdx(idx: number): { left: number; top: number; right: number; bottom: number } {
  const v4 = 70 * (idx % 5);
  return { left: v4 + 11, top: 20 * (Math.floor(idx / 5)) + 55, right: v4 + 79, bottom: 20 * (Math.floor(idx / 5)) + 75 };
}

export interface ChannelEntry { channel: number; population: number; adult?: boolean; }

export class ChannelSelect extends GamePanel {
  onChannelChange: ((ch: number) => void) | null = null;

  private _loader: WzTextureLoader | null = null;
  private _uiWz: WzPackage | null = null;

  private _channels: ChannelEntry[] = [];
  private _currentChannel = 0;  // 0-based grid index of the channel we're on
  private _sel = 0;             // OG m_nSel — hovered/selected cell (starts at current)
  private _worldId = 0;

  // WZ sprites
  private _bg: Sprite | null = null;
  private _bg2: Sprite | null = null;  // backgrnd2 (white content panel, origin -6,-22 → at 6,22)
  private _bg3: Sprite | null = null;  // backgrnd3 (light-gray grid panel, origin -10,-27 → at 10,27)
  private _worldSprite: Sprite | null = null;
  private _channel0Tex: Texture | null = null;  // current-channel cell bg (m_pCanvasItem[0])
  private _channel1Tex: Texture | null = null;  // selected cell bg (m_pCanvasItem[1])
  private _btnChange: Button | null = null;
  private _btnCancel: Button | null = null;
  private _cells: Array<{ container: Container; bg: Sprite; glyph: Sprite }> = [];

  constructor(opts: { loader?: WzTextureLoader; uiWz?: WzPackage | null } = {}) {
    super();
    this._root.visible = false;
    this._loader = opts.loader ?? null;
    this._uiWz = opts.uiWz ?? null;

    // OG ctor: CreateWnd((scrW-370)/2, (scrH-168)/2, 370, 168, wndKey=10, Origin_LT)
    const scrW = typeof window !== 'undefined' ? window.innerWidth : 800;
    const scrH = typeof window !== 'undefined' ? window.innerHeight : 600;
    this._root.x = Math.max(0, (scrW - PANEL_W) >> 1);
    this._root.y = Math.max(0, (scrH - PANEL_H) >> 1);

    // OG: background — UI/UIWindow2.img/Channel/backgrnd (+ backgrnd2, backgrnd3).
    // CUIChannelShift ctor allocates m_pCanvasBack[3]; SetBackgrnd(bMulti=1) composites
    // backgrnd (z=-1), backgrnd2 (z=0), backgrnd3 (z=1) — WzSprite.ToPixi() honors the
    // canvas origin, so backgrnd2 lands at (6,22) and backgrnd3 at (10,27) like the OG.
    const bgNode = this._uiWz?.GetItem('UIWindow2.img/Channel/backgrnd');
    if (bgNode instanceof WzCanvas && this._loader) {
      const s = this._loader.Load(bgNode)?.ToPixi();
      if (s) { this._bg = s; this._root.addChild(s); }
    }
    const chanPropBg = this._uiWz?.GetItem('UIWindow2.img/Channel');
    if (chanPropBg instanceof WzProperty && this._loader) {
      for (const [layer, target] of [['backgrnd2', '_bg2'], ['backgrnd3', '_bg3']] as const) {
        const n = chanPropBg.Get(layer);
        if (n instanceof WzCanvas) {
          const s = this._loader.Load(n)?.ToPixi();
          if (s) { (this as any)[target] = s; this._root.addChild(s); }
        }
      }
    }

    // OG: m_pCanvasItem[0]/[1] — channel0 (current), channel1 (selected)
    const chanProp = this._uiWz?.GetItem('UIWindow2.img/Channel');
    if (chanProp instanceof WzProperty && this._loader) {
      const c0 = chanProp.Get('channel0');
      const c1 = chanProp.Get('channel1');
      if (c0 instanceof WzCanvas) this._channel0Tex = this._loader.Load(c0)?.Texture ?? null;
      if (c1 instanceof WzCanvas) this._channel1Tex = this._loader.Load(c1)?.Texture ?? null;
    }

    // OG: BtChange (id 1) — CLayoutMan::AddButton offset (-20,0), canvas origin
    // (-243,-141). Container pos = the layout offset; Button.fromWz renders at
    // (pos - origin) = (223,141) and hitTest matches.
    const chRoot = this._uiWz?.GetItem('UIWindow2.img/Channel/BtChange');
    if (chRoot instanceof WzProperty && this._loader) {
      this._btnChange = Button.fromWz(this._loader, chRoot, 'Change');
      this._btnChange.onClick = () => this._confirm();
      this._btnChange.container.position.set(-20, 0);
      this._root.addChild(this._btnChange.container);
    }
    // OG: BtCancel (id 2) — AddButton offset (0,0), origin (-320,-141) → (320,141)
    const ccRoot = this._uiWz?.GetItem('UIWindow2.img/Channel/BtCancel');
    if (ccRoot instanceof WzProperty && this._loader) {
      this._btnCancel = Button.fromWz(this._loader, ccRoot, 'Cancel');
      this._btnCancel.onClick = () => { this.isVisible = false; };
      this._btnCancel.container.position.set(0, 0);
      this._root.addChild(this._btnCancel.container);
    }

    // OG: pre-build the cell sprites (all drawn every frame; bgs toggled per state)
    for (let i = 0; i < 30; i++) {
      const c = new Container();
      const bg = new Sprite(this._channel0Tex ?? Texture.EMPTY);
      bg.visible = false;
      const glyph = new Sprite(Texture.EMPTY);
      c.addChild(bg, glyph);
      c.visible = false;
      this._root.addChild(c);
      this._cells.push({ container: c, bg, glyph });
    }
  }

  setWorldId(worldId: number): void {
    this._worldId = worldId;
    this._loadWorld();
  }

  setChannels(channels: ChannelEntry[], current: number): void {
    this._channels = channels;
    // OG: m_nSel = m_nChannelID (OnCreate); current channel id is the grid index.
    this._currentChannel = current;
    this._sel = current;
    this._rebuild();
  }

  private _loadWorld(): void {
    if (!this._loader || !this._uiWz) return;
    const node = this._uiWz.GetItem(`UIWindow2.img/Channel/world/${this._worldId}`);
    if (!(node instanceof WzCanvas)) return;
    const ws = this._loader.Load(node);
    if (!ws) return;
    const s = ws.ToPixi();
    // OG Draw: Copy(16, 40 - h/2) — world name vertically centered at y=40.
    s.position.set(16, 40 - Math.floor(ws.Height / 2));
    if (this._worldSprite) {
      this._root.removeChild(this._worldSprite);
      this._worldSprite.destroy();
    }
    this._worldSprite = s;
    // Insert after the 3 background layers so the world name sits ON TOP of the
    // (opaque) backgrnd2/backgrnd3 panels, but still under the channel cells.
    const bgCount = [this._bg, this._bg2, this._bg3].filter((b): b is Sprite => b !== null).length;
    this._root.addChildAt(s, bgCount);
  }

  private _rebuild(): void {
    // OG: for each channel i < m_nChannelCount, draw cell + number glyph.
    // Current channel (i == m_nChannelID) gets channel0 bg; hovered (i == m_nSel) gets
    // channel1 bg; plain cells get the number glyph only.
    const n = Math.min(this._channels.length, 30);
    for (let i = 0; i < this._cells.length; i++) {
      const cell = this._cells[i];
      const show = i < n;
      cell.container.visible = show;
      if (!show) continue;
      const rc = getRectFromIdx(i);
      cell.container.position.set(rc.left, rc.top);

      const isCurrent = i === this._currentChannel;
      const isSel = i === this._sel;
      let bgTex: Texture | null = null;
      if (isCurrent || isSel) {
        // Path A/E: selected → channel1; Path C: current (not selected) → channel0.
        bgTex = isSel ? (this._channel1Tex ?? this._channel0Tex) : this._channel0Tex;
      }
      if (bgTex) {
        cell.bg.texture = bgTex;
        cell.bg.visible = true;
      } else {
        // No WZ texture loaded: still mark the cell so the selection state is
        // visible (empty box) and hit-testing behaves the same as the OG.
        cell.bg.texture = Texture.EMPTY;
        cell.bg.visible = isCurrent || isSel;
      }

      // OG: UI/UIWindow.img/Channel/ch/<idx> number glyph at (left+8, top+5)
      const glyphNode = this._uiWz?.GetItem(`UIWindow.img/Channel/ch/${i}`);
      if (glyphNode instanceof WzCanvas && this._loader) {
        const ws = this._loader.Load(glyphNode);
        if (ws) cell.glyph.texture = ws.Texture;
      }
      cell.glyph.position.set(8, 5);
    }
  }

  private _pressCell = -1;

  // OG OnMouseButton: msg 513 (down) selects the cell and invalidates; msg 515
  // (up) calls Update(this, 1) → SetRet(1) → sends the transfer.
  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;

    if (this._btnChange?.hitTest(lx, ly)) { if (down) this._btnChange.onClick?.(); return true; }
    if (this._btnCancel?.hitTest(lx, ly)) { if (down) this._btnCancel.onClick?.(); return true; }

    const idx = this._getIdxFromPoint(lx, ly);
    if (down) {
      // OG: selecting a cell that isn't the current one is allowed (guard
      // IdxFromPoint != m_nSel handles the current-cell case below).
      if (idx >= 0 && idx !== this._sel) {
        this._pressCell = idx;
        this._sel = idx;
        this._rebuild();
        return true;
      }
      this._pressCell = -1;
      return lx >= 0 && lx < PANEL_W && ly >= 0 && ly < PANEL_H;
    }
    // msg 515 — release: confirm only if released over the cell that was pressed.
    if (this._pressCell >= 0 && idx === this._pressCell) {
      this._pressCell = -1;
      this._confirm();
      return true;
    }
    this._pressCell = -1;
    return lx >= 0 && lx < PANEL_W && ly >= 0 && ly < PANEL_H;
  }

  // OG: GetIdxFromPoint (0x968A10) — first cell whose rect contains the point.
  private _getIdxFromPoint(lx: number, ly: number): number {
    for (let i = 0; i < this._channels.length; i++) {
      const rc = getRectFromIdx(i);
      if (lx >= rc.left && lx < rc.right && ly >= rc.top && ly < rc.bottom) return i;
    }
    return -1;
  }

  // OG: SetRet(1) — send TransferChannelRequest for the selected channel.
  private _confirm(): void {
    const ch = this._channels[this._sel];
    if (ch && ch.channel !== this._currentChannel) {
      this.onChannelChange?.(ch.channel);
    }
    this.isVisible = false;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    switch (key) {
      case 'Escape': this.isVisible = false; return true; // OG wParam 0x1B → SetRet(2)
      case 'Enter': this._confirm(); return true;        // OG wParam 0x0D → Update(1)
      case 'ArrowLeft': {
        const p = this._sel;
        this._sel = p >= 1 ? p - 1 : Math.max(0, this._currentChannel - 1);
        this._rebuild();
        return true;
      }
      case 'ArrowRight': {
        this._sel = Math.min(this._channels.length - 1, this._sel + 1);
        this._rebuild();
        return true;
      }
      case 'ArrowUp': {
        const p = this._sel;
        this._sel = Math.max(0, p - 5);
        this._rebuild();
        return true;
      }
      case 'ArrowDown': {
        this._sel = Math.min(this._channels.length - 1, this._sel + 5);
        this._rebuild();
        return true;
      }
      default: return false;
    }
  }
}
