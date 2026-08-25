import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { PartyMember } from '../../net/handlers/PacketArgs.js';
import type { WzTextureLoader } from '../../render/WzTextureLoader.js';
import type { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import type { WzSprite } from '../../render/WzSprite.js';

// OG class: CUIPartyHP (ctor @0x8D5920, Create @0x8D1CE0, Draw @0x8D1F70,
// ToggleShowHP @0x8D8560 via CTabParty BtHP id 2207). The always-on-screen
// party-member HP widget.
//
// IDA-verified layout (Draw disassembly):
//   window W = maxNameTextWidth + 100 (min 150); H = fontH*(count+5)+5
//   rowY(i)  = i * (fontH + 5)
//   name     : x=5, y=rowY+5 — FONT_BASIC_BLACK when the member is on this
//              map (CUserPool::GetUser != null), FONT_BASIC_GRAY otherwise
//   bar      : Copy(W-72, rowY+8), canvas GaugeBar/bar 63x7
//   gauge    : R = min(64, hp*64/maxHp) 1px columns at (W-72+k, rowY+8);
//              local member ratio = hp<<6/max, remote = m_nPartyHP pct<<6/100
//              (CUserRemote::OnReceiveHP @0x953F50 stores 100*cur/max)
//   graduation frame (69x13) drawn LAST on top: Copy(W-75, rowY+5)
//
// WZ assets (StringPool-decoded ctor): UI/UIWindow.img/UserList/Party/PartyHP
//   9-slice nw/n/ne/w/c/e/sw/s/se + GaugeBar/{graduation,bar,gauge}.

const FONT_H = 12;               // basic font height (row pitch component)
const ROW_PITCH = FONT_H + 5;
const NAME_X = 5;
const MIN_W = 150;
const NAME_TO_W_PAD = 100;
const BAR_ANCHOR_DX = -72;       // bar/gauge right-anchor offset from window width
const FRAME_ANCHOR_DX = -75;     // graduation frame anchor
const GAUGE_SCALE_MAX = 64;      // full-bar ratio units (hp << 6 / max)
const BAR_W = 63;

export interface PartyHpRowLayout {
  index: number;
  rowY: number;
  nameX: number;
  nameY: number;
  barX: number;
  barY: number;
  frameX: number;
  frameY: number;
}

/** Pure geometry helper exported for tests (OG formulas, no rendering). */
export function partyHpRowLayout(windowW: number, i: number): PartyHpRowLayout {
  const rowY = i * ROW_PITCH;
  return {
    index: i,
    rowY,
    nameX: NAME_X,
    nameY: rowY + 5,
    barX: windowW + BAR_ANCHOR_DX,
    barY: rowY + 8,
    frameX: windowW + FRAME_ANCHOR_DX,
    frameY: rowY + 5,
  };
}

/** OG Create @0x8D1CE0: W = max(150, maxNameWidth+100), H = fontH*(n+5)+5. */
export function partyHpWindowSize(nameWidths: number[], count: number): { w: number; h: number } {
  let w = Math.max(0, ...nameWidths, 0) + NAME_TO_W_PAD;
  if (w < MIN_W) w = MIN_W;
  return { w, h: FONT_H * (count + 5) + 5 };
}

/** OG Draw gauge ratio: local = hp<<6/max, capped at 64 columns. */
export function partyHpGaugeColumns(hp: number, maxHp: number): number {
  if (maxHp <= 0 || hp <= 0) return 0;
  return Math.min(GAUGE_SCALE_MAX, Math.floor((hp * GAUGE_SCALE_MAX) / maxHp));
}

export class PartyHPBar extends GamePanel {
  private _members: PartyMember[] = [];
  private _nameWidths: number[] = [];
  /** CConfig::SetShowPartyHP persistence (ToggleShowHP @0x8D8560). */
  private _showEnabled: boolean;
  /** OG gates each row on CUserPool::GetUser(memberId) — wired from GameStage. */
  isOnline: ((charId: number) => boolean) | null = null;

  private _loader: WzTextureLoader | null = null;
  private _uiWz: WzPackage | null = null;
  private _bgLayer = new Container();
  private _rowsLayer = new Container();
  private _gfx = new Graphics();

  constructor() {
    super();
    // OG reads the persisted position via CConfig::GetUIWndPos(m_nUIType=14);
    // default anchors under the top-left minimap like every other LT window.
    this._root.x = 4;
    this._root.y = 80;
    this._showEnabled = (() => {
      try { return localStorage.getItem('ShowPartyHP') !== '0'; } catch { return true; }
    })();
    this._root.addChild(this._bgLayer, this._rowsLayer);
  }

  /** Called once UI.nx is available (GameStage._initMenu). */
  initWz(loader: WzTextureLoader, uiWz: WzPackage): void {
    this._loader = loader;
    this._uiWz = uiWz;
    if (this._members.length > 0) this._rebuild();
  }

  toggle(): void {
    this._showEnabled = !this._showEnabled;
    try { localStorage.setItem('ShowPartyHP', this._showEnabled ? '1' : '0'); } catch { /* private mode */ }
    this._applyVisibility();
  }

  setMembers(members: PartyMember[]): void {
    this._members = members.slice();
    this._rebuild();
  }

  /** OG CUserRemote::OnReceiveHP invalidates the window for party members. */
  updateMemberHp(charId: number, curHp: number, maxHp: number): void {
    const m = this._members.find((x) => x.charId === charId);
    if (!m) return;
    m.hp = curHp;
    m.maxHp = maxHp;
    this._rebuild();
  }

  private _applyVisibility(): void {
    this.isVisible = this._showEnabled && this._members.length > 0;
  }

  private _sprite(ws: WzSprite | null, x: number, y: number, stretchW?: number, stretchH?: number): void {
    if (!ws) return;
    const s = ws.NewSprite();
    s.position.set(x - ws.OriginX, y - ws.OriginY);
    if (stretchW !== undefined) s.width = stretchW;
    if (stretchH !== undefined) s.height = stretchH;
    this._bgLayer.addChild(s);
  }

  private _canvas(base: WzProperty, child: string): WzSprite | null {
    const node = base.Get(child);
    if (!(node instanceof WzCanvas) || !this._loader) return null;
    return this._loader.Load(node);
  }

  private _rebuild(): void {
    this._bgLayer.removeChildren();
    this._rowsLayer.removeChildren();
    this._gfx.clear();

    const count = this._members.length;
    this._applyVisibility();
    if (count === 0) return;

    // Measure names with the same font used to draw them.
    const measureStyle = new TextStyle({ fontSize: FONT_H - 2, fontFamily: 'Arial', fill: 0x000000 });
    this._nameWidths = this._members.map((m) => {
      const t = new Text({ text: m.name, style: measureStyle });
      const w = Math.ceil(t.width);
      t.destroy();
      return w;
    });
    const size = partyHpWindowSize(this._nameWidths, count);
    this._gfx.rect(0, 0, size.w, size.h);

    // ── background 9-slice (OG Draw: NW fixed, strips stretched, SE last) ──
    const root = this._uiWz?.GetItem('UIWindow.img/UserList/Party/PartyHP');
    const bg = root instanceof WzProperty ? root : null;
    if (bg && this._loader) {
      const nw = this._canvas(bg, 'nw');
      const n = this._canvas(bg, 'n');
      const ne = this._canvas(bg, 'ne');
      const w = this._canvas(bg, 'w');
      const c = this._canvas(bg, 'c');
      const e = this._canvas(bg, 'e');
      const sw = this._canvas(bg, 'sw');
      const s = this._canvas(bg, 's');
      const se = this._canvas(bg, 'se');
      if (nw && n && ne && w && c && e && sw && s && se) {
        const leftW = nw.Width;      // 5
        const topH = nw.Height;      // 7
        const rightW = ne.Width;     // 144 — fixed right ornament block
        const midX = leftW;
        const midW = Math.max(1, size.w - leftW - rightW);
        const midY = topH;
        const midH = Math.max(1, size.h - topH * 2);
        this._sprite(nw, 0, 0);
        this._sprite(n, midX, 0, midW);
        this._sprite(ne, size.w - rightW, 0);
        this._sprite(w, 0, midY, undefined, midH);
        this._sprite(c, midX, midY, midW, midH);
        this._sprite(e, size.w - rightW, midY, undefined, midH);
        this._sprite(sw, 0, size.h - topH);
        this._sprite(s, midX, size.h - topH, midW);
        this._sprite(se, size.w - rightW, size.h - topH);
      }
    }
    this._bgLayer.addChildAt(this._gfx, 0);

    // GaugeBar pieces.
    const gaugeProp = bg?.Get('GaugeBar');
    const gb = gaugeProp instanceof WzProperty ? gaugeProp : null;
    const barWs = gb ? this._canvas(gb, 'bar') : null;
    const gaugeWs = gb ? this._canvas(gb, 'gauge') : null;
    const gradWs = gb ? this._canvas(gb, 'graduation') : null;

    for (let i = 0; i < count; i++) {
      const m = this._members[i];
      const L = partyHpRowLayout(size.w, i);

      // Name — black when on this map, gray otherwise (CUserPool::GetUser).
      const online = this.isOnline ? this.isOnline(m.charId) : false;
      const name = new Text({
        text: m.name,
        style: new TextStyle({ fontSize: FONT_H - 2, fontFamily: 'Arial', fill: online ? 0x000000 : 0x808080 }),
      });
      name.position.set(L.nameX, L.nameY);
      this._rowsLayer.addChild(name);

      if (barWs) this._sprite(barWs, L.barX, L.barY);
      else {
        this._gfx.fill({ color: 0x222222 });
        this._gfx.rect(L.barX, L.barY, BAR_W, 7);
        this._gfx.fill();
      }

      // Gauge fill — R 1px columns (stretched sprite of width R is equivalent).
      const cols = partyHpGaugeColumns(m.hp, m.maxHp);
      if (cols > 0) {
        if (gaugeWs) this._sprite(gaugeWs, L.barX, L.barY, cols);
        else {
          this._gfx.fill({ color: 0xcc2222 });
          this._gfx.rect(L.barX, L.barY, cols, 7);
          this._gfx.fill();
        }
      }

      // Graduation frame drawn last, on top of bar + gauge.
      if (gradWs) this._sprite(gradWs, L.frameX, L.frameY);
    }
  }
}
