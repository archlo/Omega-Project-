import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { Button } from '../Button.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { MiniMapData } from '../../map/MiniMapData.js';
import type { Foothold } from '../../map/Foothold.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { MiniMapMarkers } from './MiniMapMarkers.js';

// ---------------------------------------------------------------------------
// CUIMiniMap (v95) — TS port.
//
// OG references:
//   SetLayer        @0x8011A0  (title text rules)
//   DrawIcon        @0x7F7980  (bottom-center icon anchoring)
//   OnButtonClicked @0x803E40  (min/max/world-map/2X mode transitions)
//   Update          @0x8053A0  (pane draw order + remote-name edge arrows)
//
// Modes (m_nOption): 0 = big (2X pane when simple type), 1 = normal, 2 = collapsed strip.
// Types (m_nMiniMapType): 0 = simple, 1 = normal.
// ---------------------------------------------------------------------------

// OG pane caps from CUIMiniMap::SetSize
const NormalPaneCapW = 210;
const NormalPaneCapH = 112;
const HugePaneCapW = 420;
const HugePaneCapH = 225;
const StripH = 20;
const BtnGap = 1;
const MarkX = 7;
const MarkY = 17;

/** Result of OG CalculateScr — the scrolled canvas origin in canvas pixels. */
interface ScrOrig {
  x: number;
  y: number;
}

/**
 * OG m_strRemoteNW/N/NE/W/SW/S/SE/E — the 8 direction buckets that drive the
 * edge-arrow pass at the end of Update @0x8053A0. Stalkees that fall off-pane
 * accumulate their name into the matching bucket; non-empty buckets draw the
 * matching edge arrow at a fixed pane position.
 */
type RemoteDir = 'NW' | 'N' | 'NE' | 'W' | 'SW' | 'S' | 'SE' | 'E';

/** One 9-slice window frame (all pieces optional — WZ may miss any of them). */
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
  /** Left corner piece width — also the collapsed-strip tab indent default. */
  get nwW(): number { return this.nw?.width ?? 64; }
}

type OgMode = 0 | 1 | 2;
type MiniMapType = 0 | 1;

export class MiniMap extends GamePanel {
  // OG m_nOption — 0=big(2X), 1=normal, 2=collapsed
  private _mode: OgMode = 0;
  // OG m_nPrevOption — restored verbatim on simple-type maximize
  private _prevMode: OgMode = 1;
  private _streetName = '';
  private _mapName = '';
  private _mapId = 0;
  private _data: MiniMapData | null = null;
  // OG m_nMiniMapType — 0=simple (2X button), 1=normal (min/max/worldmap buttons)
  private _miniMapType: MiniMapType = 0;
  // OG m_nMag / m_nMag_Normal / m_nMag_2X
  private _mag = 0;
  private _magNormal = 0;
  private _mag2X = 1;
  private _fieldId = 0;
  private _showMiniMap = true;

  private readonly _minMap = new FrameSet();
  private readonly _maxMap = new FrameSet();
  // Simple type (m_nMiniMapType=0) frames from MiniMapSimpleMode/Window/*
  private readonly _simpleNormal = new FrameSet();
  private readonly _simpleMax = new FrameSet();

  // Normal-type collapsed strip pieces (MiniMap/Min: w/c/e)
  private readonly _stripW: Sprite | null;
  private readonly _stripC: Sprite | null;
  private readonly _stripE: Sprite | null;
  // Simple-type collapsed strip pieces (MiniMapSimpleMode/Window/Min: Left/Center/Right)
  private readonly _simpleStripL: Sprite | null;
  private readonly _simpleStripC: Sprite | null;
  private readonly _simpleStripR: Sprite | null;

  private readonly _markers: MiniMapMarkers;

  // OG buttons: minimize(1000), maximize(1001), worldmap(1002), 2X(1003).
  // SetCtrl (type 1) builds BtMin/BtMax/BtMap; SetCtrl_Simple (type 0)
  // builds MiniMapSimpleMode/Button/{BtMin,BtMax} plus the ZoomIn/ZoomOut
  // sprite pair acting as the 2X toggle.
  private readonly _btMin: Button | null;
  private readonly _btMax: Button | null;
  private readonly _btMap: Button | null;
  private readonly _btMinSimple: Button | null;
  private readonly _btMaxSimple: Button | null;
  private readonly _bt2XOut: Button | null;
  private readonly _bt2XIn: Button | null;
  private readonly _buttons: Button[] = [];

  private readonly _font: BuiltInFont | null;
  // Optional whole-map canvases (may be absent in some NX sets)
  private readonly _simpleCanvas: WzSprite | null;
  private readonly _simpleCanvasHuge: WzSprite | null;

  private readonly _gfx: Graphics;
  private readonly _content: Container;

  playerWorldPos = { x: 0, y: 0 };

  private readonly _npcs: { x: number; y: number; quest: boolean }[] = [];
  private readonly _others: { x: number; y: number }[] = [];
  private readonly _partyMembers: { x: number; y: number; isLeader: boolean }[] = [];
  private readonly _portals: { x: number; y: number; type: number }[] = [];
  private readonly _merchants: { x: number; y: number }[] = [];
  // OG m_mStalkee (charId -> pos) + m_mStalkeeName (charId -> name)
  private readonly _stalkees = new Map<number, { x: number; y: number; name: string }>();
  private _remoteNames: Record<RemoteDir, string> = {
    NW: '', N: '', NE: '', W: '', SW: '', S: '', SE: '', E: '',
  };

  // OG OnMouseButton — clicking the local player dot sends UserMiniMapClick
  onPlayerDotClick: (() => void) | null = null;
  // OG BtMap (id 1002) — wired from GameStage to toggle the WorldMap dialog
  onBtWorldMap: (() => void) | null = null;
  // Live footholds so dynamic state (disabled/moving platforms) reflects on the map
  private _footholds: Record<number, Foothold> | null = null;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._font = font;
    this.isVisible = true;
    // The minimap stays ALWAYS anchored at the top-left corner of the screen.
    this._root.position.set(4, 4);

    const mm = ui?.GetItem('UIWindow2.img/MiniMap') as WzProperty | null;
    loadFrame(loader, mm?.Get('MinMap') as WzProperty | null, this._minMap);
    loadFrame(loader, mm?.Get('MaxMap') as WzProperty | null, this._maxMap);
    // Normal-type collapsed strip: MiniMap/Min children w/c/e
    const strip = mm?.Get('Min') as WzProperty | null;
    this._stripW = loadPixi(loader, strip, 'w');
    this._stripC = loadPixi(loader, strip, 'c');
    this._stripE = loadPixi(loader, strip, 'e');

    this._markers = new MiniMapMarkers(loader, ui);

    // Simple-type window: MiniMapSimpleMode/Window/{Normal,Max} nine-piece
    // frames + Window/Min (Left/Center/Right) collapsed strips + optional
    // whole-map canvases (`canvas` / `canvasHuge` — tolerate absence).
    const simpleRoot = ui?.GetItem('UIWindow2.img/MiniMapSimpleMode') as WzProperty | null;
    const simpleWindow = simpleRoot?.Get('Window') as WzProperty | null;
    loadSimpleFrame(loader, simpleWindow?.Get('Normal') as WzProperty | null, this._simpleNormal);
    loadSimpleFrame(loader, simpleWindow?.Get('Max') as WzProperty | null, this._simpleMax);
    const simpleMin = simpleWindow?.Get('Min') as WzProperty | null;
    this._simpleStripL = loadPixi(loader, simpleMin, 'Left');
    this._simpleStripC = loadPixi(loader, simpleMin, 'Center');
    this._simpleStripR = loadPixi(loader, simpleMin, 'Right');
    this._simpleCanvas = loadOptionalSprite(loader, simpleRoot, 'canvas');
    this._simpleCanvasHuge = loadOptionalSprite(loader, simpleRoot, 'canvasHuge');

    // Normal-type buttons live under UIWindow2.img/MiniMap/{BtMin,BtMax,BtMap}
    this._btMin = makeBtn(this._buttons, loader, mm, 'BtMin', () => this._onBtMinimize());
    this._btMax = makeBtn(this._buttons, loader, mm, 'BtMax', () => this._onBtMaximize());
    this._btMap = makeBtn(this._buttons, loader, mm, 'BtMap', () => this.onBtWorldMap?.());
    // Simple-type buttons under MiniMapSimpleMode/Button (+ ZoomIn/ZoomOut 2X pair)
    const simpleBtnRoot = ui?.GetItem('UIWindow2.img/MiniMapSimpleMode/Button') as WzProperty | null;
    this._bt2XOut = makeBtn(this._buttons, loader, simpleBtnRoot, 'ZoomOut', () => this._onBt2X());
    this._bt2XIn = makeBtn(this._buttons, loader, simpleBtnRoot, 'ZoomIn', () => this._onBt2X());
    this._btMinSimple = makeBtn(this._buttons, loader, simpleBtnRoot, 'BtMin', () => this._onBtMinimize());
    this._btMaxSimple = makeBtn(this._buttons, loader, simpleBtnRoot, 'BtMax', () => this._onBtMaximize());

    this._gfx = new Graphics();
    this._content = new Container();
    this._root.addChild(this._gfx, this._content);
  }

  // -------------------------------------------------------------------------
  // Data setters
  // -------------------------------------------------------------------------

  setMapData(data: MiniMapData | null, mapName: string, streetName: string): void {
    this._data = data;
    // OG: m_nMag_Normal/m_nMag_2X copied from the MiniMapData node on load
    if (data) {
      this._magNormal = data.Mag_Normal;
      this._mag2X = data.Mag_2X;
    }
    this._mapName = mapName;
    this._streetName = streetName;
  }

  setField(data: MiniMapData | null, streetName: string, mapName: string, mapId = 0): void {
    this.setMapData(data, mapName, streetName);
    this._mapId = mapId;
    this._fieldId = mapId;
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

  // OG Update @0x8053A0 draws only portals of nType 2|7 on the minimap —
  // spawn/script/hidden portals never appear.
  setPortals(portals: { x: number; y: number; type: number }[]): void {
    this._portals.length = 0;
    this._portals.push(...portals.filter((p) => p.type === 2 || p.type === 7));
  }

  setMerchants(m: { x: number; y: number }[]): void {
    this._merchants.length = 0;
    this._merchants.push(...m);
  }

  // OG InsertStalkee(dwCharacterID, strName, pt)
  insertStalkee(id: number, name: string, x: number, y: number): void {
    this._stalkees.set(id, { x, y, name });
  }

  // OG RemoveStalkee(dwCharacterID)
  removeStalkee(id: number): void {
    this._stalkees.delete(id);
  }

  setMiniMapType(type: 0 | 1): void {
    this._miniMapType = type;
  }

  // OG ToggleMiniMapState — cycles m_nOption with (m_nOption + 2) % 3
  cycleMode(): void {
    this.isVisible = true;
    this._prevMode = this._mode;
    this._mode = ((this._mode + 2) % 3) as OgMode;
    if (this._mode === 2) this._prevMode = 1;
  }

  setShowMiniMap(show: boolean): void {
    this._showMiniMap = show;
    this.isVisible = show;
  }

  setFootholds(fh: Record<number, Foothold>): void {
    this._footholds = fh;
  }

  // -------------------------------------------------------------------------
  // Mode transitions — OnButtonClicked @0x803E40
  // -------------------------------------------------------------------------

  // minimize: type 1 -> (option+1)%3; type 0 -> prev=option,
  // option ? (option+1)%3 : 2.
  private _onBtMinimize(): void {
    if (!this.isVisible) return;
    if (this._miniMapType === 1) {
      this._mode = ((this._mode + 1) % 3) as OgMode;
    } else {
      this._prevMode = this._mode;
      this._mode = (this._mode !== 0 ? ((this._mode + 1) % 3) : 2) as OgMode;
    }
  }

  // maximize: type 1 -> (option+2)%3; type 0 -> restore m_nPrevOption
  // verbatim (clamp only when < 0).
  private _onBtMaximize(): void {
    if (!this.isVisible) return;
    if (this._miniMapType === 1) {
      this._mode = ((this._mode + 2) % 3) as OgMode;
    } else {
      this._mode = (this._prevMode < 0 ? 1 : this._prevMode) as OgMode;
    }
  }

  // 2X toggle swaps option 0 <-> 1 (also switches m_nMag between
  // m_nMag_2X and m_nMag_Normal).
  private _onBt2X(): void {
    this._mode = this._mode === 0 ? 1 : 0;
  }

  // -------------------------------------------------------------------------
  // Coordinate math — CalculateScr / TransformPoint
  // -------------------------------------------------------------------------

  // OG CalculateScr:
  //   scaledPane = pane << mag
  //   x = clamp(localX - scaledPaneW/2, -realCX, realW - realCX - scaledPaneW)
  //   orig = (realCX + x) >> mag     (same for Y)
  private _calculateScr(localPos: { x: number; y: number }, paneW: number, paneH: number, mag: number): ScrOrig {
    if (!this._data) return { x: 0, y: 0 };
    const realW = this._data.Real_W;
    const realH = this._data.Real_H;
    const realCX = this._data.Real_CX;
    const realCY = this._data.Real_CY;

    const scaledPaneW = paneW << mag;
    let sx = localPos.x - Math.floor(scaledPaneW / 2);
    if (sx < -realCX) sx = -realCX;
    const maxX = realW - realCX - scaledPaneW;
    if (sx > maxX) sx = maxX;
    sx = (realCX + sx) >> mag;

    const scaledPaneH = paneH << mag;
    let sy = localPos.y - Math.floor(scaledPaneH / 2);
    if (sy < -realCY) sy = -realCY;
    const maxY = realH - realCY - scaledPaneH;
    if (sy > maxY) sy = maxY;
    sy = (realCY + sy) >> mag;

    return { x: sx, y: sy };
  }

  // OG TransformPoint: screen = ((world + realC) >> mag) - scrOrig
  private _transformPoint(world: { x: number; y: number }, scrOrig: ScrOrig, mag: number): { x: number; y: number } {
    if (!this._data) return { x: 0, y: 0 };
    return {
      x: ((world.x + this._data.Real_CX) >> mag) - scrOrig.x,
      y: ((world.y + this._data.Real_CY) >> mag) - scrOrig.y,
    };
  }

  // -------------------------------------------------------------------------
  // Frame update / draw
  // -------------------------------------------------------------------------

  update(_dt: number): void {
    try {
      const win = this._winRect();
      this._layoutButtons(win);
      this.draw();
    } catch (e) {
      console.warn('MiniMap.update error:', e);
    }
  }

  draw(): void {
    if (!this.isVisible || !this._showMiniMap) return;
    const win = this._winRect();
    this._content.removeChildren();
    this._gfx.clear();

    if (this._mode === 2) {
      this._drawCollapsed(win);
      return;
    }

    // SetSize: option 0 with simple type -> huge (2X); otherwise normal.
    const isHuge = this._miniMapType === 0 && this._mode === 0;
    this._mag = isHuge ? this._mag2X : this._magNormal;
    const frame = this._frameFor(isHuge);
    const scale = isHuge ? 2 : 1;

    // OG SetLayer has NO center blit for modes 0/1 — the interior stays
    // transparent; the map canvas and the 9-slice frame (with its own
    // rounded corner art) supply everything.

    const pane = {
      x: win.x + frame.borderL,
      y: win.y + frame.titleH,
      width: win.width - frame.borderL - frame.borderR,
      height: win.height - frame.titleH - frame.borderB,
    };
    this._drawMapAndIcons(pane, scale);
    this._drawFrame(frame, win);

    // OG DrawIcon blits the map-mark in both normal and huge modes.
    if (this._data?.Mark) {
      const mark = this._data.Mark.ToPixi();
      mark.position.set(win.x + MarkX, win.y + MarkY);
      this._content.addChild(mark);
    }

    this._drawTitle(win, frame.nwW, frame.titleH);

    // Buttons go LAST — they sit on an overlay above the title text in OG.
    for (const b of this._buttons) {
      this._content.addChild(b.container);
    }
  }

  // -------------------------------------------------------------------------
  // Pane content — Update @0x8053A0 draw order
  // -------------------------------------------------------------------------

  private _activeCanvas(): WzSprite | null {
    if (!this._data) return null;
    if (this._miniMapType !== 0) return this._data.Canvas;
    const isHuge = this._mode === 0;
    return (isHuge ? this._simpleCanvasHuge : this._simpleCanvas) ?? this._data.Canvas;
  }

  private _drawMapAndIcons(pane: { x: number; y: number; width: number; height: number }, scale: number): void {
    // OG draws the dark pane backdrop even when no canvas loaded.
    if (!this._data?.Canvas) {
      this._gfx.rect(pane.x, pane.y, pane.width, pane.height).fill({ color: 0x1c241c, alpha: 0.8 });
    }

    const canvas = this._activeCanvas();
    // The field minimap canvas is authored at the map's native Mag, so the
    // world->canvas shift must stay at data.Mag. Only a real 2X-authored
    // canvas (MiniMapSimpleMode/canvasHuge) shifts at _mag2X.
    const mag = canvas === this._simpleCanvasHuge && this._simpleCanvasHuge !== null
      ? this._mag2X
      : (this._data?.Mag ?? this._mag);

    // CalculateScr expects the canvas-pixel viewport size.
    const canvasPaneW = canvas ? canvas.Width : Math.floor(pane.width / scale);
    const canvasPaneH = canvas ? canvas.Height : Math.floor(pane.height / scale);
    const scrOrig = this._calculateScr(this.playerWorldPos, canvasPaneW, canvasPaneH, mag);

    // Map sprite: centered when smaller than the pane, else scrolled by scrOrig.
    const mapW = (canvas?.Width ?? 0) * scale;
    const mapH = (canvas?.Height ?? 0) * scale;
    if (canvas) {
      const mapX = mapW <= pane.width
        ? pane.x + Math.floor((pane.width - mapW) / 2)
        : pane.x - Math.floor(scrOrig.x * scale);
      const mapY = mapH <= pane.height
        ? pane.y + Math.floor((pane.height - mapH) / 2)
        : pane.y - Math.floor(scrOrig.y * scale);
      const s = new Sprite(canvas.Texture);
      s.width = mapW;
      s.height = mapH;
      s.position.set(mapX, mapY);
      this._content.addChildAt(s, 0);
    }

    // MakeConvexLayer — foothold lines (white), clipped to the pane, using
    // the live foothold table so State changes are reflected.
    if (this._data?.Footholds?.length) this._drawFootholds(pane, scrOrig, mag, scale);
    // LoadLadderRope — ladders red / ropes blue.
    if (this._data?.LadderRopes?.length) this._drawLadderRopes(pane, scrOrig, mag, scale);

    // Icon order per Update @0x8053A0:
    // 1. CEmployeePool — remote merchant shops (ShopRemote).
    for (const m of this._merchants) {
      this._drawMarker(pane, scrOrig, mag, scale, m, this._markers.getIcon(this._miniMapType, 'ShopRemote'), false);
    }
    // 2. CUserPool — unclassified remote users (RemoteUser).
    for (const o of this._others) {
      this._drawMarker(pane, scrOrig, mag, scale, o, this._markers.getIcon(this._miniMapType, 'RemoteUser'), false);
    }
    // 3. Deferred group lists — portals next in the OG sequence.
    for (const p of this._portals) {
      this._drawMarker(pane, scrOrig, mag, scale, p, this._markers.getIcon(this._miniMapType, 'Portal'), true);
    }
    // m_mStalkee loop — on-pane stalkees keep the Friend icon + name label;
    // off-pane ones accumulate into the m_strRemote* direction bucket.
    this._remoteNames = { NW: '', N: '', NE: '', W: '', SW: '', S: '', SE: '', E: '' };
    for (const [, st] of this._stalkees) {
      const c = this._transformPoint(st, scrOrig, mag);
      const dir = this._remoteDirectionFor(c, canvasPaneW, canvasPaneH);
      if (dir) {
        this._remoteNames[dir] = st.name;
      } else {
        this._drawMarker(pane, scrOrig, mag, scale, st, this._markers.getIcon(this._miniMapType, 'Friend'), true);
        this._drawStalkeeName(pane, scrOrig, mag, scale, st);
      }
    }
    // Party members (PartyMaster when leader, else Party).
    for (const pm of this._partyMembers) {
      const icon = pm.isLeader
        ? this._markers.getIcon(this._miniMapType, 'PartyMaster')
        : this._markers.getIcon(this._miniMapType, 'Party');
      this._drawMarker(pane, scrOrig, mag, scale, pm, icon, false);
    }
    // NPCs — quest NPCs show NpcStart, plain ones Npc.
    for (const n of this._npcs) {
      const icon = n.quest
        ? (this._markers.getIcon(this._miniMapType, 'NpcStart') ?? this._markers.getIcon(this._miniMapType, 'Npc'))
        : this._markers.getIcon(this._miniMapType, 'Npc');
      this._drawMarker(pane, scrOrig, mag, scale, n, icon, false);
    }
    // Remote-name edge arrows for non-empty direction buckets.
    this._drawRemoteEdgeArrows(pane);
    // Self icon LAST, on top.
    this._drawMarker(pane, scrOrig, mag, scale, this.playerWorldPos, this._markers.getIcon(this._miniMapType, 'User'), false);
  }

  private _drawFootholds(
    pane: { x: number; y: number; width: number; height: number },
    scrOrig: ScrOrig, mag: number, scale: number,
  ): void {
    for (const fh of this._data!.Footholds) {
      const live = this._footholds?.[fh.footholdId] ?? null;
      if (!live || live.State === 0) continue;
      const p1 = this._transformPoint({ x: live.X1, y: live.Y1 }, scrOrig, mag);
      const p2 = this._transformPoint({ x: live.X2, y: live.Y2 }, scrOrig, mag);
      const x1 = clampTo(pane.x + p1.x * scale, pane.x, pane.x + pane.width);
      const y1 = clampTo(pane.y + p1.y * scale, pane.y, pane.y + pane.height);
      const x2 = clampTo(pane.x + p2.x * scale, pane.x, pane.x + pane.width);
      const y2 = clampTo(pane.y + p2.y * scale, pane.y, pane.y + pane.height);
      this._gfx.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: 0xffffff, width: 1, alpha: 0.6 });
    }
  }

  private _drawLadderRopes(
    pane: { x: number; y: number; width: number; height: number },
    scrOrig: ScrOrig, mag: number, scale: number,
  ): void {
    for (const lr of this._data!.LadderRopes) {
      const p1 = this._transformPoint({ x: lr.x, y: lr.y1 }, scrOrig, mag);
      const p2 = this._transformPoint({ x: lr.x, y: lr.y2 }, scrOrig, mag);
      const px = clampTo(pane.x + p1.x * scale, pane.x, pane.x + pane.width);
      const py1 = clampTo(pane.y + p1.y * scale, pane.y, pane.y + pane.height);
      const py2 = clampTo(pane.y + p2.y * scale, pane.y, pane.y + pane.height);
      const color = lr.isLadder ? 0xff0000 : 0x0000ff;
      this._gfx.moveTo(px, py1).lineTo(px, py2).stroke({ color, width: 1, alpha: 0.8 });
    }
  }

  private _drawMarker(
    pane: { x: number; y: number; width: number; height: number },
    scrOrig: ScrOrig, mag: number, scale: number,
    world: { x: number; y: number },
    icon: WzSprite | null,
    clamp: boolean,
  ): void {
    if (!icon || !this._data) return;
    const c = this._transformPoint(world, scrOrig, mag);
    const px = pane.x + c.x * scale;
    const py = pane.y + c.y * scale;
    const inside = px >= pane.x && px <= pane.x + pane.width && py >= pane.y && py <= pane.y + pane.height;
    if (inside) {
      this._drawIconAt(icon, px, py);
      return;
    }
    if (!clamp) return;
    // CalcAngle-based edge arrow for clamped markers (portals/stalkees).
    const arrow = this._markers.calcAngleEdgeArrow(
      px, py,
      pane.x + pane.width / 2, pane.y + pane.height / 2,
      pane.x, pane.y, pane.width, pane.height,
    );
    if (!arrow) return;
    this._drawIconAt(arrow, clampTo(px, pane.x, pane.x + pane.width), clampTo(py, pane.y, pane.y + pane.height));
  }

  // OG DrawIcon @0x7F7980 — bottom-center anchored:
  //   normal layout  -> Copy at (px - w/2, py - h)
  //   simple + huge  -> 2x CopyEx, center = px, bottom = py
  private _drawIconAt(icon: WzSprite, px: number, py: number): void {
    const w = icon.Width;
    const h = icon.Height;
    const huge = this._miniMapType === 0 && this._mode === 0;
    const s = icon.ToPixi();
    s.width = huge ? w * 2 : w;
    s.height = huge ? h * 2 : h;
    s.position.set(px - Math.floor(w / 2), py - h);
    this._content.addChild(s);
  }

  // Stalkee name label drawn below the Friend icon, horizontally centered.
  private _drawStalkeeName(
    pane: { x: number; y: number; width: number; height: number },
    scrOrig: ScrOrig, mag: number, scale: number,
    stalkee: { x: number; y: number; name: string },
  ): void {
    if (!this._data || !stalkee.name) return;
    const c = this._transformPoint(stalkee, scrOrig, mag);
    const t = new Text({
      text: stalkee.name,
      style: new TextStyle({ fill: 0xaaaa82, fontSize: 9, fontFamily: 'monospace' }),
    });
    t.anchor.set(0.5, 0);
    t.position.set(pane.x + c.x * scale, pane.y + c.y * scale + 2);
    this._content.addChild(t);
  }

  // m_mStalkee off-pane classification into the m_strRemote* buckets:
  // x<0 -> W/SW/NW by y, x>paneW -> E/SE/NE by y, else y<0 N / y>paneH S.
  private _remoteDirectionFor(c: { x: number; y: number }, paneW: number, paneH: number): RemoteDir | null {
    if (c.x < 0) {
      if (c.y > paneH) return 'SW';
      if (c.y < 0) return 'NW';
      return 'W';
    }
    if (c.x > paneW) {
      if (c.y > paneH) return 'SE';
      if (c.y < 0) return 'NE';
      return 'E';
    }
    if (c.y < 0) return 'N';
    if (c.y > paneH) return 'S';
    return null;
  }

  // Edge arrows at the 8 fixed pane positions (top row bottom-anchored at
  // paneY+h+1, middle row at the vertical center, bottom row at paneY+paneH-1).
  private _drawRemoteEdgeArrows(pane: { x: number; y: number; width: number; height: number }): void {
    const deltas: Record<RemoteDir, [number, number]> = {
      NW: [-1, -1], N: [0, -1], NE: [1, -1],
      W: [-1, 0], E: [1, 0],
      SW: [-1, 1], S: [0, 1], SE: [1, 1],
    };
    const midY = pane.y + Math.floor((14 + pane.height) / 2);
    const positions: Record<RemoteDir, (w: number, h: number) => [number, number]> = {
      NW: (w, h) => [pane.x + 1, pane.y + h + 1],
      N: (w, h) => [pane.x + Math.floor(pane.width / 2), pane.y + h + 1],
      NE: (w, h) => [pane.x + pane.width - w - 1, pane.y + h + 1],
      W: (w, h) => [pane.x + 1, midY],
      E: (w, h) => [pane.x + pane.width - w - 2, midY],
      SW: (w, h) => [pane.x + 1, pane.y + pane.height - 1],
      S: (w, h) => [pane.x + Math.floor(pane.width / 2), pane.y + pane.height - 1],
      SE: (w, h) => [pane.x + pane.width - w - 1, pane.y + pane.height - 1],
    };
    for (const dir of ['NW', 'N', 'NE', 'W', 'E', 'SW', 'S', 'SE'] as const) {
      if (!this._remoteNames[dir]) continue;
      const arrow = this._markers.edgeArrow(deltas[dir][0], deltas[dir][1]);
      if (!arrow) continue;
      const [px, py] = positions[dir](arrow.Width, arrow.Height);
      this._drawIconAt(arrow, px, py);
    }
  }

  // -------------------------------------------------------------------------
  // Collapsed strip / frame / title
  // -------------------------------------------------------------------------

  private _drawCollapsed(win: { x: number; y: number; width: number; height: number }): void {
    // Simple type collapses onto MiniMapSimpleMode/Window/Min (Left/Center/Right);
    // normal type onto MiniMap/Min (w/c/e).
    const l = this._miniMapType === 0 ? this._simpleStripL : this._stripW;
    const c = this._miniMapType === 0 ? this._simpleStripC : this._stripC;
    const r = this._miniMapType === 0 ? this._simpleStripR : this._stripE;
    if (l && c && r) {
      l.position.set(win.x, win.y);
      this._content.addChild(l);
      const midX = win.x + l.width;
      const midW = win.width - l.width - r.width;
      if (midW > 0) {
        const mid = new Sprite(c.texture);
        mid.position.set(midX, win.y);
        mid.width = midW;
        this._content.addChild(mid);
      }
      r.position.set(win.x + win.width - r.width, win.y);
      this._content.addChild(r);
    } else {
      this._gfx.rect(win.x, win.y, win.width, win.height).fill({ color: 0x11111c, alpha: 0.95 });
    }
    this._drawTitle(win, l?.width ?? 64, StripH);
    for (const b of this._buttons) {
      if (b.container.visible) this._content.addChild(b.container);
    }
  }

  private _drawFrame(f: FrameSet, win: { x: number; y: number; width: number; height: number }): void {
    // Corners
    if (f.nw) { f.nw.position.set(win.x, win.y); this._content.addChild(f.nw); }
    if (f.ne) { f.ne.position.set(win.x + win.width - f.ne.width, win.y); this._content.addChild(f.ne); }
    if (f.sw) { f.sw.position.set(win.x, win.y + win.height - f.sw.height); this._content.addChild(f.sw); }
    if (f.se) { f.se.position.set(win.x + win.width - f.se.width, win.y + win.height - f.se.height); this._content.addChild(f.se); }
    // Stretched edges
    const nwW = f.nw?.width ?? 0;
    const neW = f.ne?.width ?? 0;
    const swW = f.sw?.width ?? 0;
    const seW = f.se?.width ?? 0;
    const nwH = f.nw?.height ?? 0;
    const neH = f.ne?.height ?? 0;
    const swH = f.sw?.height ?? 0;
    const seH = f.se?.height ?? 0;
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
    if (f.c) {
      const s = new Sprite(f.c.texture);
      s.position.set(win.x + (f.w?.width ?? 0), win.y + f.titleH);
      s.width = win.width - (f.w?.width ?? 0) - (f.e?.width ?? 0);
      s.height = win.height - f.titleH - f.borderB;
      this._content.addChildAt(s, 0);
    }
  }

  /**
   * OG SetLayer @0x8011A0 title rules:
   *   mode 1 (normal): NO title text at all.
   *   mode 0 (big): two lines over the frame top-left — street white at
   *     (9,21) with shadow pass at (8,20); map white at (9,35), shadow at
   *     (8,34); shadow color 0x52759c. When a map-mark icon exists both
   *     lines shift right by 40 (white x=49, shadow x=48).
   *   mode 2 (collapsed): single line on the strip starting x=6,y=5 —
   *     street, then "-" after streetWidth+5, then the map name after +4.
   * No clipping or truncation anywhere — the window grows to fit the names.
   */
  private _drawTitle(win: { x: number; y: number; width: number; height: number }, _tabW: number, _bandH: number): void {
    if (this._mode === 1) return;
    const white = new TextStyle({ fill: 0xffffff, fontSize: 10, fontFamily: 'monospace' });
    const shadow = new TextStyle({ fill: 0x52759c, fontSize: 10, fontFamily: 'monospace' });
    const put = (text: string, x: number, y: number, style: TextStyle): void => {
      const t = new Text({ text, style });
      t.position.set(win.x + x, win.y + y);
      this._content.addChild(t);
    };

    const street = this._streetName;
    const map = this._mapName;

    if (this._mode === 0) {
      const markShift = this._data?.Mark ? 40 : 0;
      if (street) {
        put(street, 9 + markShift, 21, white);
        put(street, 8 + markShift, 20, shadow);
      }
      if (map) {
        put(map, 9 + markShift, 35, white);
        put(map, 8 + markShift, 34, shadow);
      }
      return;
    }

    // mode 2 — one horizontal line on the strip.
    let x = 6;
    if (street) {
      put(street, x, 5, white);
      x += this._measureText(street) + 5;
      put('-', x, 5, white);
      x += this._measureText('-') + 4;
    }
    if (map) put(map, x, 5, white);
  }

  private _measureText(s: string): number {
    if (this._font) return this._font.measure(s).x;
    return s.length * 6;
  }

  // -------------------------------------------------------------------------
  // Window sizing / button layout
  // -------------------------------------------------------------------------

  private _winRect(): { x: number; y: number; width: number; height: number } {
    // Window rect in _root-local coordinates; _root.position holds the
    // screen offset (always the top-left corner).
    const x = 0;
    const y = 0;

    if (this._mode === 2) {
      // Collapsed strip grows so the FULL "street - map" title fits.
      const tabW = this._stripTabWidth();
      const streetW = this._streetName ? this._measureText(this._streetName) : 0;
      const mapW = this._mapName ? this._measureText(this._mapName) : 0;
      const sepW = this._streetName ? this._measureText('-') + 9 : 0;
      const w = Math.max(120, Math.floor(tabW + streetW + mapW + sepW + 22 + this._buttonsWidth()));
      return { x, y, width: w, height: StripH };
    }

    // SetSize caps: normal pane 210x112; huge (simple type, option 0)
    // canvas*2 capped at 420x225 once it reaches 560x300.
    const isHuge = this._miniMapType === 0 && this._mode === 0;
    const frame = this._frameFor(isHuge);
    const cw = this._data?.CanvasWidth ?? 180;
    const ch = this._data?.CanvasHeight ?? 120;
    let paneW: number;
    let paneH: number;
    if (isHuge) {
      paneW = cw * 2 >= 560 ? HugePaneCapW : cw * 2;
      paneH = ch * 2 >= 300 ? HugePaneCapH : ch * 2;
    } else {
      paneW = cw >= 280 ? NormalPaneCapW : cw;
      paneH = ch >= 150 ? NormalPaneCapH : ch;
    }
    return {
      x,
      y,
      width: paneW + frame.borderL + frame.borderR,
      height: paneH + frame.titleH + frame.borderB,
    };
  }

  private _stripTabWidth(): number {
    return this._miniMapType === 0
      ? (this._simpleStripL?.width ?? 64)
      : (this._stripW?.width ?? 64);
  }

  // Total footprint of the top-row buttons (for the collapsed strip width).
  private _buttonsWidth(): number {
    let w = 0;
    for (const b of [this._btMap, this._btMin, this._btMax, this._btMinSimple, this._btMaxSimple]) {
      if (b) w += b.width + BtnGap;
    }
    return w;
  }

  private _frameFor(isHuge: boolean): FrameSet {
    return this._miniMapType === 1
      ? (isHuge ? this._maxMap : this._minMap)
      : (isHuge ? this._simpleMax : this._simpleNormal);
  }

  // OG SetCtrl / SetCtrl_Simple button anchors:
  //   worldmap (w-46, 4); min (w-72, 4); max (w-59, 4) for type 1;
  //   simple type: min/max share (w-59, 4), 2X toggle at (w-30, h-16),
  //   collapsed shows ONLY BtMaxSimple.
  private _layoutButtons(win: { x: number; y: number; width: number; height: number }): void {
    const isHuge = this._miniMapType === 0 && this._mode === 0;
    const frame = this._frameFor(isHuge);
    const bandH = this._mode === 2 ? StripH : frame.titleH;
    const yTop = win.y + Math.max(2, Math.floor((Math.min(bandH, 21) - 12) / 2));
    const w = win.width;
    const h = win.height;
    const bt2XPos = { x: win.x + (w - 30), y: win.y + (h - 16) };
    const hide = (...btns: (Button | null)[]): void => {
      for (const b of btns) if (b) b.container.visible = false;
    };
    const place = (b: Button | null, x: number, y: number): void => {
      if (!b) return;
      b.container.visible = true;
      b.container.position.set(x, y);
    };

    if (this._miniMapType === 1) {
      place(this._btMap, win.x + (w - 46), yTop);
      place(this._btMin, win.x + (w - 72), yTop);
      place(this._btMax, win.x + (w - 59), yTop);
      hide(this._btMinSimple, this._btMaxSimple, this._bt2XOut, this._bt2XIn);
      if (this._btMin) this._btMin.enabled = this._mode !== 2;
      if (this._btMax) this._btMax.enabled = this._mode !== 0;
      return;
    }

    // Simple type
    place(this._btMap, win.x + (w - 46), yTop);
    if (this._mode === 2) {
      place(this._btMaxSimple, win.x + (w - 59), yTop);
      hide(this._btMin, this._btMax, this._btMinSimple, this._bt2XOut, this._bt2XIn);
    } else if (this._mode === 1) {
      place(this._btMinSimple, win.x + (w - 59), yTop);
      place(this._bt2XIn, bt2XPos.x, bt2XPos.y);
      hide(this._btMin, this._btMax, this._btMaxSimple, this._bt2XOut);
    } else {
      place(this._btMin, win.x + (w - 59), yTop);
      place(this._bt2XOut, bt2XPos.x, bt2XPos.y);
      hide(this._btMinSimple, this._btMax, this._btMaxSimple, this._bt2XIn);
    }
  }

  // -------------------------------------------------------------------------
  // Mouse — OnMouseButton
  // -------------------------------------------------------------------------

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    // Screen -> window-local (the panel always sits at the top-left corner).
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    for (const b of this._buttons) {
      if (b.handleMouseButton(lx, ly, down)) return true;
    }
    const win = this._winRect();
    const hit = lx >= win.x && lx < win.x + win.width && ly >= win.y && ly < win.y + win.height;
    if (hit && !down && this.onPlayerDotClick && this._data && this._mode !== 2) {
      const isHuge = this._miniMapType === 0 && this._mode === 0;
      const frame = this._frameFor(isHuge);
      const scale = isHuge ? 2 : 1;
      const canvas = this._activeCanvas();
      const mag = canvas === this._simpleCanvasHuge && this._simpleCanvasHuge !== null
        ? this._mag2X
        : (this._data.Mag ?? this._mag);
      const canvasPaneW = canvas ? canvas.Width : Math.floor((win.width - frame.borderL - frame.borderR) / scale);
      const canvasPaneH = canvas ? canvas.Height : Math.floor((win.height - frame.titleH - frame.borderB) / scale);
      const scrOrig = this._calculateScr(this.playerWorldPos, canvasPaneW, canvasPaneH, mag);
      const pane = {
        x: win.x + frame.borderL,
        y: win.y + frame.titleH,
        width: win.width - frame.borderL - frame.borderR,
        height: win.height - frame.titleH - frame.borderB,
      };
      const c = this._transformPoint(this.playerWorldPos, scrOrig, mag);
      const px = pane.x + c.x * scale;
      const py = pane.y + c.y * scale;
      // Hit rect (-2,-5)-(5,7) around the player's pane position.
      if (lx >= px - 2 && lx <= px + 5 && ly >= py - 5 && ly <= py + 7) {
        this.onPlayerDotClick();
      }
    }
    return hit;
  }
}

// ---------------------------------------------------------------------------
// Module-level WZ loaders used by the constructor.
// ---------------------------------------------------------------------------

/** Loads `root/<name>` canvas as a pixi Sprite, or null when absent. */
function loadPixi(loader: WzTextureLoader, root: WzProperty | null, name: string): Sprite | null {
  const c = root?.Get(name);
  return c instanceof WzCanvas ? loader.Load(c)?.ToPixi() ?? null : null;
}

/** Loads `root/<name>` canvas as a WzSprite, or null when absent. */
function loadOptionalSprite(loader: WzTextureLoader, root: WzProperty | null, name: string): WzSprite | null {
  const c = root?.Get(name);
  return c instanceof WzCanvas ? loader.Load(c) ?? null : null;
}

function loadFrame(loader: WzTextureLoader, root: WzProperty | null, f: FrameSet): void {
  f.nw = loadPixi(loader, root, 'nw');
  f.n = loadPixi(loader, root, 'n');
  f.ne = loadPixi(loader, root, 'ne');
  f.w = loadPixi(loader, root, 'w');
  f.c = loadPixi(loader, root, 'c');
  f.e = loadPixi(loader, root, 'e');
  f.sw = loadPixi(loader, root, 'sw');
  f.s = loadPixi(loader, root, 's');
  f.se = loadPixi(loader, root, 'se');
}

// Simple-window frames use row-piece names (UpLeft..DownRight).
function loadSimpleFrame(loader: WzTextureLoader, root: WzProperty | null, f: FrameSet): void {
  f.nw = loadPixi(loader, root, 'UpLeft');
  f.n = loadPixi(loader, root, 'UpCenter');
  f.ne = loadPixi(loader, root, 'UpRight');
  f.w = loadPixi(loader, root, 'MiddleLeft');
  f.c = loadPixi(loader, root, 'MiddleCenter');
  f.e = loadPixi(loader, root, 'MiddleRight');
  f.sw = loadPixi(loader, root, 'DownLeft');
  f.s = loadPixi(loader, root, 'DownCenter');
  f.se = loadPixi(loader, root, 'DownRight');
}

function makeBtn(buttons: Button[], loader: WzTextureLoader, root: WzProperty | null, name: string, onClick: () => void): Button | null {
  const pr = root?.Get(name) as WzProperty | null;
  if (!pr) return null;
  const b = Button.fromWz(loader, pr);
  b.onClick = onClick;
  buttons.push(b);
  return b;
}

function clampTo(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(v, hi));
}
