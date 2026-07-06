import { Container, Graphics, Sprite, Texture, Text, TextStyle, Rectangle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { Button } from '../Button.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { MiniMapData } from '../../map/MiniMapData.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { MiniMapMarkers } from './MiniMapMarkers.js';

// OG pane cap constants from CUIMiniMap::SetSize
const NormalPaneCapW = 210;
const NormalPaneCapH = 112;
const HugePaneCapW = 420;
const HugePaneCapH = 225;
const StripH = 20;
const BtnGap = 1;
const TitlePadRight = 7;
const MarkX = 7;
const MarkY = 17;
const MarkerScale = 2;

interface Axis {
  viewStart: number;
  viewLen: number;
  drawOffset: number;
}

class FrameSet {
  nw: Sprite | null = null;
  n: Sprite | null = null;
  ne: Sprite | null = null;
  w: Sprite | null = null;
  c: Sprite | null = null;
  e: Sprite | null = null;
  sw: Sprite | null = null;
  s: Sprite | null = null;
  se: Sprite | null = null;

  get borderL(): number { return this.w?.width ?? 9; }
  get borderR(): number { return this.e?.width ?? 9; }
  get borderB(): number { return this.s?.height ?? 9; }
  get titleH(): number { return this.n?.height ?? 21; }
  get nwW(): number { return this.nw?.width ?? 64; }
}

// OG mode mapping: m_nOption 0=normal, 1=huge, 2=collapsed
type OgMode = 0 | 1 | 2;

// OG: m_nMiniMapType — 0=simple (has 2X button), 1=normal (has min/max/worldmap buttons)
type MiniMapType = 0 | 1;

// localStorage key for CUIWnd position (OG: CreateUIWndPosSaved with key 10)
const PosSaveKey = 'MiniMapWndPos';

export class MiniMap extends GamePanel {
  // OG: m_nOption — 0=normal, 1=huge, 2=collapsed
  private _mode: OgMode = 0;
  private _prevMode: OgMode = 1;
  private _mapName = '';
  private _streetName = '';
  private _mapId = 0;
  private _data: MiniMapData | null = null;

  // OG: m_nMiniMapType — set in constructor, affects button layout
  private _miniMapType: MiniMapType = 0;

  // OG: saved window position from CUIWndPosSaved
  private _savedX: number | null = null;
  private _savedY: number | null = null;

  private readonly _minMap = new FrameSet();
  private readonly _maxMap = new FrameSet();
  private readonly _stripW: Sprite | null;
  private readonly _stripC: Sprite | null;
  private readonly _stripE: Sprite | null;
  private readonly _markers: MiniMapMarkers;

  // OG: m_pBtMinimize(1000), m_pBtMaximize(1001), m_pBtWorldMap(1002), m_pBt2X(1003)
  private readonly _btMin: Button | null;
  private readonly _btMax: Button | null;
  private readonly _btMap: Button | null;
  private readonly _bt2X: Button | null;
  private readonly _buttons: Button[] = [];

  private readonly _font: BuiltInFont | null;
  private readonly _gfx: Graphics;
  private readonly _content: Container;

  playerWorldPos = { x: 0, y: 0 };
  private readonly _npcs: { x: number; y: number; quest: boolean }[] = [];
  private readonly _others: { x: number; y: number }[] = [];
  private readonly _partyMembers: { x: number; y: number; isLeader: boolean }[] = [];
  private readonly _portals: { x: number; y: number }[] = [];
  private readonly _merchants: { x: number; y: number }[] = [];

  // OG: OnMouseButton sends packet when clicking player dot
  onPlayerDotClick: (() => void) | null = null;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._font = font;
    this.isVisible = true;
    this._root.position.set(4, 4);

    // OG: Restore saved window position from CUIWndPosSaved
    try {
      const saved = localStorage.getItem(PosSaveKey);
      if (saved) {
        const { x, y } = JSON.parse(saved);
        if (typeof x === 'number' && typeof y === 'number') {
          this._savedX = x;
          this._savedY = y;
          this._root.position.set(x, y);
        }
      }
    } catch {}

    const mm = ui?.GetItem('UIWindow2.img/MiniMap') as WzProperty | null;
    this._loadFrame(loader, mm?.Get('MinMap') as WzProperty | null, this._minMap);
    this._loadFrame(loader, mm?.Get('MaxMap') as WzProperty | null, this._maxMap);

    const strip = mm?.Get('Min') as WzProperty | null;
    this._stripW = this._loadCanvas(loader, strip, 'w');
    this._stripC = this._loadCanvas(loader, strip, 'c');
    this._stripE = this._loadCanvas(loader, strip, 'e');

    this._markers = new MiniMapMarkers(loader, ui);

    // OG button IDs: 1000=minimize, 1001=maximize, 1002=worldmap, 1003=2X
    this._btMin = this._makeBtn(loader, mm, 'BtMin', () => this._onBtMinimize());
    this._btMax = this._makeBtn(loader, mm, 'BtMax', () => this._onBtMaximize());
    this._btMap = this._makeBtn(loader, mm, 'BtMap', () => this._onBtWorldMap());
    this._bt2X = this._makeBtn(loader, mm, 'Bt2X', () => this._onBt2X());

    this._gfx = new Graphics();
    this._content = new Container();
    this._root.addChild(this._gfx, this._content);
  }

  private _loadFrame(loader: WzTextureLoader, root: WzProperty | null, f: FrameSet): void {
    f.nw = this._loadCanvas(loader, root, 'nw');
    f.n = this._loadCanvas(loader, root, 'n');
    f.ne = this._loadCanvas(loader, root, 'ne');
    f.w = this._loadCanvas(loader, root, 'w');
    f.c = this._loadCanvas(loader, root, 'c');
    f.e = this._loadCanvas(loader, root, 'e');
    f.sw = this._loadCanvas(loader, root, 'sw');
    f.s = this._loadCanvas(loader, root, 's');
    f.se = this._loadCanvas(loader, root, 'se');
  }

  private _loadCanvas(loader: WzTextureLoader, root: WzProperty | null, name: string): Sprite | null {
    const c = root?.Get(name);
    return c instanceof WzCanvas ? loader.Load(c)?.ToPixi() ?? null : null;
  }

  private _makeBtn(loader: WzTextureLoader, root: WzProperty | null, name: string, onClick: () => void): Button | null {
    const pr = root?.Get(name) as WzProperty | null;
    if (!pr) return null;
    const b = Button.fromWz(loader, pr);
    b.onClick = onClick;
    this._buttons.push(b);
    return b;
  }

  // OG: OnButtonClicked 1000 — ToggleMiniMapState
  private _onBtMinimize(): void {
    if (!this.isVisible) return;
    this._prevMode = this._mode;
    if (this._miniMapType === 1) {
      // OG: m_nMiniMapType=1 → m_nOption = (m_nOption + 2) % 3
      this._mode = ((this._mode + 2) % 3) as OgMode;
    } else {
      // OG: m_nMiniMapType=0 → m_nOption = (m_nOption + 1) % 3
      this._mode = ((this._mode + 1) % 3) as OgMode;
    }
    if (this._mode === 2) this._prevMode = 1;
  }

  // OG: OnButtonClicked 1001 — restore previous mode
  private _onBtMaximize(): void {
    if (!this.isVisible) return;
    if (this._miniMapType === 1) {
      // OG: m_nMiniMapType=1 → m_nOption = (m_nOption + 1) % 3
      this._mode = ((this._mode + 1) % 3) as OgMode;
    } else {
      // OG: m_nMiniMapType=0 → m_nOption = (m_nOption + 2) % 3
      this._mode = ((this._mode + 2) % 3) as OgMode;
    }
  }

  // OG: OnButtonClicked 1002 — world map (stub)
  private _onBtWorldMap(): void {
    // TODO: open CWorldMapDlg
  }

  // OG: OnButtonClicked 1003 — toggle 2X mode
  private _onBt2X(): void {
    // In OG SetCtrl_Simple, button 1003 toggles between m_nOption 0 and 1
    this._mode = this._mode === 0 ? 1 : 0;
  }

  setMapData(data: MiniMapData | null, mapName: string, regionName: string): void {
    this._data = data;
    this._streetName = regionName;
    this._mapName = mapName;
  }

  setMapInfo(street: string, map: string, mapId = 0): void {
    this._streetName = street;
    this._mapName = map;
    this._mapId = mapId;
  }

  setField(data: MiniMapData | null, street: string, map: string, mapId = 0): void {
    this._data = data;
    this._streetName = street;
    this._mapName = map;
    this._mapId = mapId;
  }

  setNpcs(npcs: { x: number; y: number; quest?: boolean }[]): void {
    this._npcs.length = 0;
    for (const n of npcs) this._npcs.push({ x: n.x, y: n.y, quest: n.quest ?? false });
  }

  setOtherPlayers(p: { x: number; y: number }[]): void {
    this._others.length = 0;
    this._others.push(...p);
  }

  setPartyMembers(p: { x: number; y: number; isLeader: boolean }[]): void {
    this._partyMembers.length = 0;
    this._partyMembers.push(...p);
  }

  setPortals(portals: { x: number; y: number }[]): void {
    this._portals.length = 0;
    this._portals.push(...portals);
  }

  setMerchants(merchants: { x: number; y: number }[]): void {
    this._merchants.length = 0;
    this._merchants.push(...merchants);
  }

  // OG: SetMiniMapType — m_nMiniMapType 0=simple, 1=normal
  // Affects button layout: simple has 2X button, normal has min/max/worldmap
  setMiniMapType(type: MiniMapType): void {
    this._miniMapType = type;
  }

  // OG: ToggleMiniMapState — cycles m_nOption with (m_nOption + 2) % 3
  cycleMode(): void {
    this.isVisible = true;
    this._prevMode = this._mode;
    this._mode = ((this._mode + 2) % 3) as OgMode;
    if (this._mode === 2) this._prevMode = 1;
  }

  update(_dt: number): void {
    const win = this._winRect();
    this._layoutButtons(win);
    this.draw();
  }

  draw(): void {
    if (!this.isVisible) return;

    const win = this._winRect();
    this._content.removeChildren();
    this._gfx.clear();

    // OG: m_nOption 2 = collapsed
    if (this._mode === 2) {
      this._drawCollapsed(win);
      return;
    }

    // OG: m_nOption 0=normal, 1=huge
    const frame = this._mode === 1 ? this._maxMap : this._minMap;
    const scale = this._mode === 1 ? 2 : 1;

    this._gfx.rect(win.x, win.y, win.width, win.height).fill({ color: 0x11111c, alpha: 0.9 });

    const pane = {
      x: win.x + frame.borderL,
      y: win.y + frame.titleH,
      width: win.width - frame.borderL - frame.borderR,
      height: win.height - frame.titleH - frame.borderB,
    };

    this._drawMapAndIcons(pane, scale);

    this._drawFrame(frame, win);

    // OG: DrawIcon draws mark in both normal and huge modes
    if (this._data?.Mark) {
      const markSprite = this._data.Mark.ToPixi();
      markSprite.position.set(win.x + MarkX, win.y + MarkY);
      this._content.addChild(markSprite);
    }

    this._drawTitle(win, frame.nwW, frame.titleH);

    for (const b of this._buttons) {
      b.container.x = win.x;
      b.container.y = win.y;
      this._content.addChild(b.container);
    }

    // OG: CUIWndPosSaved — save position to localStorage
    this._savePosition();
  }

  // OG: Save window position for CUIWndPosSaved
  private _savePosition(): void {
    const pos = this._root.position;
    try {
      localStorage.setItem(PosSaveKey, JSON.stringify({ x: pos.x, y: pos.y }));
    } catch {}
  }

  private _drawMapAndIcons(pane: { x: number; y: number; width: number; height: number }, scale: number): void {
    if (this._data?.Canvas) {
      const canvas = this._data.Canvas;
      const player = this._data.WorldToCanvas(this.playerWorldPos);
      const ax = this._computeAxis(player.x, canvas.Width, pane.width, scale);
      const ay = this._computeAxis(player.y, canvas.Height, pane.height, scale);

      const fitScale = Math.min(pane.width / canvas.Width, pane.height / canvas.Height, 1);
      const mapSprite = new Sprite(canvas.Texture);
      mapSprite.width = canvas.Width * fitScale;
      mapSprite.height = canvas.Height * fitScale;
      mapSprite.position.set(
        pane.x + (pane.width - canvas.Width * fitScale) / 2,
        pane.y + (pane.height - canvas.Height * fitScale) / 2,
      );
      this._content.addChildAt(mapSprite, 0);

      // OG: MakeConvexLayer — draw foothold lines on minimap
      if (this._data.Footholds.length > 0) {
        this._drawFootholds(pane, ax, ay, scale);
      }

      // OG: LoadLadderRope — draw ladders/ropes on minimap
      if (this._data.LadderRopes.length > 0) {
        this._drawLadderRopes(pane, ax, ay, scale);
      }

      for (const p of this._portals) this._drawMarker(pane, ax, ay, scale, p, this._markers.Portal, false);
      for (const m of this._merchants) this._drawMarker(pane, ax, ay, scale, m, this._markers.Merchant ?? this._markers.Another, false);
      for (const n of this._npcs) this._drawMarker(pane, ax, ay, scale, n, n.quest ? (this._markers.StartNpc ?? this._markers.Npc) : this._markers.Npc, false);
      for (const o of this._others) this._drawMarker(pane, ax, ay, scale, o, this._markers.Another, true);
      for (const m of this._partyMembers) this._drawMarker(pane, ax, ay, scale, m, m.isLeader ? this._markers.PartyMaster : this._markers.Party, true);
      // OG: DrawIcon for player — draws last (on top)
      this._drawMarker(pane, ax, ay, scale, this.playerWorldPos, this._markers.User, false);
    } else {
      this._gfx.rect(pane.x, pane.y, pane.width, pane.height).fill({ color: 0x1c241c, alpha: 0.8 });
    }
  }

  // OG: MakeConvexLayer — renders foothold segments as lines on the minimap.
  // Each foothold is drawn as a horizontal line at its y coordinate.
  private _drawFootholds(
    pane: { x: number; y: number; width: number; height: number },
    ax: Axis, ay: Axis, scale: number,
  ): void {
    const gfx = this._gfx;
    for (const fh of this._data!.Footholds) {
      const x1 = pane.x + ax.drawOffset + (fh.x1 - ax.viewStart) * scale;
      const y1 = pane.y + ay.drawOffset + (fh.y1 - ay.viewStart) * scale;
      const x2 = pane.x + ax.drawOffset + (fh.x2 - ax.viewStart) * scale;
      const y2 = pane.y + ay.drawOffset + (fh.y2 - ay.viewStart) * scale;

      // Clip to pane
      const cx1 = Math.max(pane.x, Math.min(x1, pane.x + pane.width));
      const cy1 = Math.max(pane.y, Math.min(y1, pane.y + pane.height));
      const cx2 = Math.max(pane.x, Math.min(x2, pane.x + pane.width));
      const cy2 = Math.max(pane.y, Math.min(y2, pane.y + pane.height));

      // OG: foothold lines drawn in white
      gfx.moveTo(cx1, cy1).lineTo(cx2, cy2).stroke({ color: 0xffffff, width: 1, alpha: 0.6 });
    }
  }

  // OG: LoadLadderRope — renders ladders (red) and ropes (blue) as vertical lines.
  private _drawLadderRopes(
    pane: { x: number; y: number; width: number; height: number },
    ax: Axis, ay: Axis, scale: number,
  ): void {
    const gfx = this._gfx;
    for (const lr of this._data!.LadderRopes) {
      const px = pane.x + ax.drawOffset + (lr.x - ax.viewStart) * scale;
      const py1 = pane.y + ay.drawOffset + (lr.y1 - ay.viewStart) * scale;
      const py2 = pane.y + ay.drawOffset + (lr.y2 - ay.viewStart) * scale;

      // Clip to pane
      const cpx = Math.max(pane.x, Math.min(px, pane.x + pane.width));
      const cpy1 = Math.max(pane.y, Math.min(py1, pane.y + pane.height));
      const cpy2 = Math.max(pane.y, Math.min(py2, pane.y + pane.height));

      // OG: ladders=red, ropes=blue
      const color = lr.isLadder ? 0xff0000 : 0x0000ff;
      gfx.moveTo(cpx, cpy1).lineTo(cpx, cpy2).stroke({ color, width: 1, alpha: 0.8 });
    }
  }

  private _computeAxis(playerCanvas: number, canvasLen: number, paneLen: number, scale: number): Axis {
    const scaledLen = canvasLen * scale;
    if (scaledLen <= paneLen) {
      return { viewStart: 0, viewLen: canvasLen, drawOffset: Math.floor((paneLen - scaledLen) / 2) };
    }
    const viewLen = Math.max(1, Math.floor(paneLen / scale));
    const viewStart = Math.max(0, Math.min(playerCanvas - Math.floor(viewLen / 2), canvasLen - viewLen));
    return { viewStart, viewLen, drawOffset: 0 };
  }

  private _drawMarker(
    pane: { x: number; y: number; width: number; height: number },
    ax: Axis, ay: Axis, scale: number,
    world: { x: number; y: number },
    icon: WzSprite | null,
    clamp: boolean,
  ): void {
    if (!icon || !this._data) return;
    const c = this._data.WorldToCanvas(world);
    const px = pane.x + ax.drawOffset + (c.x - ax.viewStart) * scale;
    const py = pane.y + ay.drawOffset + (c.y - ay.viewStart) * scale;

    const inside = px >= pane.x && px <= pane.x + pane.width && py >= pane.y && py <= pane.y + pane.height;
    if (inside) {
      this._drawIconBottomCentre(icon, px, py);
      return;
    }
    if (!clamp) return;

    // OG: CalcAngle-based edge arrow selection
    const centerX = pane.x + pane.width / 2;
    const centerY = pane.y + pane.height / 2;
    const arrow = this._markers.calcAngleEdgeArrow(px, py, centerX, centerY, pane.x, pane.y, pane.width, pane.height);
    if (!arrow) return;
    const cx = Math.max(pane.x, Math.min(px, pane.x + pane.width));
    const cy = Math.max(pane.y, Math.min(py, pane.y + pane.height));
    this._drawIconBottomCentre(arrow, cx, cy);
  }

  private _drawIconBottomCentre(icon: WzSprite, px: number, py: number): void {
    const w = icon.Width * MarkerScale;
    const h = icon.Height * MarkerScale;
    const s = icon.ToPixi();
    s.width = w;
    s.height = h;
    s.position.set(px - Math.floor(w / 2), py - h);
    this._content.addChild(s);
  }

  private _drawCollapsed(win: { x: number; y: number; width: number; height: number }): void {
    if (this._stripW && this._stripC && this._stripE) {
      this._stripW.position.set(win.x, win.y);
      this._content.addChild(this._stripW);

      const midX = win.x + this._stripW.width;
      const midW = win.width - this._stripW.width - this._stripE.width;
      if (midW > 0) {
        const mid = new Sprite(this._stripC.texture);
        mid.position.set(midX, win.y);
        mid.width = midW;
        this._content.addChild(mid);
      }

      this._stripE.position.set(win.x + win.width - this._stripE.width, win.y);
      this._content.addChild(this._stripE);
    } else {
      this._gfx.rect(win.x, win.y, win.width, win.height).fill({ color: 0x11111c, alpha: 0.95 });
    }

    this._drawTitle(win, this._stripW?.width ?? 64, StripH);

    for (const b of this._buttons) {
      b.container.x = win.x;
      b.container.y = win.y;
      this._content.addChild(b.container);
    }
  }

  private _drawTitle(win: { x: number; y: number; width: number; height: number }, tabW: number, bandH: number): void {
    const title = this._mapName;
    if (!title) return;

    const tx = win.x + tabW - 8;

    // OG: expanded modes (m_nOption 0/1) show street name + map name on two lines
    // Collapsed mode (m_nOption 2) shows map name + map ID
    if (this._streetName) {
      const streetText = new Text({ text: this._streetName, style: new TextStyle({ fill: 0xaaaa82, fontSize: 10, fontFamily: 'monospace' }) });
      streetText.position.set(tx, win.y + 4);
      this._content.addChild(streetText);

      const mapText = new Text({ text: title, style: new TextStyle({ fill: 0xffffff, fontSize: 10, fontFamily: 'monospace' }) });
      mapText.position.set(tx, win.y + 4 + 12);
      this._content.addChild(mapText);

      // OG: map ID shown in title bar for all expanded modes
      if (this._mapId > 0) {
        const idText = this._mapId.toString();
        const idW = this._font ? this._font.measure(idText).x : 60;
        const borderR = this._mode === 1 ? this._maxMap.borderR : this._minMap.borderR;
        const idX = win.x + win.width - this._buttonsWidth() - borderR - idW - 4;
        const idTxt = new Text({ text: idText, style: new TextStyle({ fill: 0xaaaa82, fontSize: 10, fontFamily: 'monospace' }) });
        idTxt.position.set(idX, win.y + 4 + 12);
        this._content.addChild(idTxt);
      }
    } else {
      // Fallback: just map name centered
      const ty = win.y + Math.floor((bandH - 12) / 2);
      const t = new Text({ text: title, style: new TextStyle({ fill: 0xffffff, fontSize: 10, fontFamily: 'monospace' }) });
      t.position.set(tx, ty);
      this._content.addChild(t);
    }
  }

  private _drawFrame(f: FrameSet, win: { x: number; y: number; width: number; height: number }): void {
    if (f.nw) { f.nw.position.set(win.x, win.y); this._content.addChild(f.nw); }
    if (f.ne) { f.ne.position.set(win.x + win.width - f.ne.width, win.y); this._content.addChild(f.ne); }
    if (f.sw) { f.sw.position.set(win.x, win.y + win.height - f.sw.height); this._content.addChild(f.sw); }
    if (f.se) { f.se.position.set(win.x + win.width - f.se.width, win.y + win.height - f.se.height); this._content.addChild(f.se); }

    const nwW = f.nw?.width ?? 0;
    const neW = f.ne?.width ?? 0;
    const swW = f.sw?.width ?? 0;
    const seW = f.se?.width ?? 0;

    if (f.n) {
      const s = new Sprite(f.n.texture);
      s.position.set(win.x + nwW, win.y);
      s.width = win.width - nwW - neW;
      this._content.addChild(s);
    }
    if (f.s) {
      const s = new Sprite(f.s.texture);
      s.position.set(win.x + swW, win.y + win.height - f.s.height);
      s.width = win.width - swW - seW;
      this._content.addChild(s);
    }

    const nwH = f.nw?.height ?? 0;
    const swH = f.sw?.height ?? 0;
    const neH = f.ne?.height ?? 0;
    const seH = f.se?.height ?? 0;

    if (f.w) {
      const s = new Sprite(f.w.texture);
      s.position.set(win.x, win.y + nwH);
      s.height = win.height - nwH - swH;
      this._content.addChild(s);
    }
    if (f.e) {
      const s = new Sprite(f.e.texture);
      s.position.set(win.x + win.width - f.e.width, win.y + neH);
      s.height = win.height - neH - seH;
      this._content.addChild(s);
    }
  }

  private _winRect(): { x: number; y: number; width: number; height: number } {
    // OG: CUIWndPosSaved — restore from localStorage if available
    const x = this._savedX ?? 4;
    const y = this._savedY ?? 4;

    // OG: m_nOption 2 = collapsed → just the title strip
    if (this._mode === 2) {
      const nameW = this._font && this._mapName ? this._font.measure(this._mapName).x : 0;
      const tabW = this._stripW?.width ?? 64;
      const w = Math.max(160, tabW + nameW + 6 + this._buttonsWidth() + TitlePadRight);
      return { x, y, width: w, height: StripH };
    }

    // OG: m_nOption 0=normal, 1=huge
    const frame = this._mode === 1 ? this._maxMap : this._minMap;
    const scale = this._mode === 1 ? 2 : 1;
    const capW = this._mode === 1 ? HugePaneCapW : NormalPaneCapW;
    const capH = this._mode === 1 ? HugePaneCapH : NormalPaneCapH;

    const cw = this._data?.CanvasWidth ?? 180;
    const ch = this._data?.CanvasHeight ?? 120;
    // OG: SetSize caps pane to min(canvas*scale, cap)
    const paneW = Math.min(cw * scale, capW);
    const paneH = Math.min(ch * scale, capH);

    const titleNeed = frame.nwW + (this._font && this._mapName ? this._font.measure(this._mapName).x : 0)
      + 6 + this._buttonsWidth() + TitlePadRight;
    const finalW = Math.max(paneW, titleNeed - frame.borderL - frame.borderR) + frame.borderL + frame.borderR;
    const finalH = paneH + frame.titleH + frame.borderB;

    return { x, y, width: finalW, height: finalH };
  }

  private _buttonsWidth(): number {
    let w = 0;
    for (const b of [this._btMin, this._btMax, this._btMap, this._bt2X]) {
      if (b) w += b.width + BtnGap;
    }
    return w;
  }

  // OG: SetCtrl positions buttons at (width-46,4), (width-59,4), (width-72,4)
  // and disables the inactive one based on m_nOption + m_nMiniMapType
  private _layoutButtons(win: { x: number; y: number; width: number; height: number }): void {
    const borderR = this._mode === 2 ? (this._stripE?.width ?? 9)
      : this._mode === 1 ? this._maxMap.borderR : this._minMap.borderR;
    const bandH = this._mode === 2 ? StripH
      : this._mode === 1 ? this._maxMap.titleH : this._minMap.titleH;

    let bx = win.x + win.width - borderR - this._buttonsWidth() + BtnGap;
    const by = win.y + Math.max(2, Math.floor((Math.min(bandH, 21) - 12) / 2));

    for (const b of [this._btMin, this._btMax, this._btMap, this._bt2X]) {
      if (!b) continue;
      b.container.position.set(bx, by);
      bx += b.width + BtnGap;
    }

    // OG: SetCtrl / SetCtrl_Simple button visibility
    if (this._miniMapType === 1) {
      // OG: m_nMiniMapType=1 — has min/max/worldmap buttons, no 2X
      if (this._btMin) this._btMin.enabled = true;
      if (this._btMax) this._btMax.enabled = true;
      if (this._bt2X) this._bt2X.container.visible = false;
    } else {
      // OG: m_nMiniMapType=0 — has worldmap/minimize/2X, no maximize
      if (this._btMin) this._btMin.enabled = true;
      if (this._btMax) this._btMax.container.visible = false;
      if (this._bt2X) this._bt2X.container.visible = this._mode !== 2;
    }
  }

  // OG: OnMouseButton — checks if click is on player dot, fires callback
  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    for (const b of this._buttons) {
      if (b.handleMouseButton(x, y, down)) return true;
    }
    const win = this._winRect();
    const hit = x >= win.x && x < win.x + win.width && y >= win.y && y < win.y + win.height;
    if (hit && !down && this.onPlayerDotClick && this._data) {
      // OG: Calculate screen position of player icon and check if click is on it
      const frame = this._mode === 1 ? this._maxMap : this._minMap;
      const scale = this._mode === 1 ? 2 : 1;
      const pane = {
        x: win.x + frame.borderL,
        y: win.y + frame.titleH,
        width: win.width - frame.borderL - frame.borderR,
        height: win.height - frame.titleH - frame.borderB,
      };
      const player = this._data.WorldToCanvas(this.playerWorldPos);
      const ax = this._computeAxis(player.x, this._data.CanvasWidth, pane.width, scale);
      const ay = this._computeAxis(player.y, this._data.CanvasHeight, pane.height, scale);
      const px = pane.x + ax.drawOffset + (player.x - ax.viewStart) * scale;
      const py = pane.y + ay.drawOffset + (player.y - ay.viewStart) * scale;

      // OG: hit rect (-2,-5,5,7) offset to player screen pos
      const hitLeft = px - 2;
      const hitTop = py - 5;
      const hitRight = px + 5;
      const hitBottom = py + 7;
      if (x >= hitLeft && x <= hitRight && y >= hitTop && y <= hitBottom) {
        this.onPlayerDotClick();
      }
    }
    return hit;
  }
}
