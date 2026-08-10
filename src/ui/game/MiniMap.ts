import { Container, Graphics, Sprite, Texture, Text, TextStyle, Rectangle } from 'pixi.js';
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

// OG: CalculateScr result — screen origin after clamping
interface ScrOrig {
  x: number;
  y: number;
}

// OG: 8 remote-name buckets (m_strRemoteNW/N/NE/W/SW/S/SE/E) driving the
// edge-arrow pass in Update @0x8053A0. Stalkees off-pane in a direction get
// their name accumulated into the matching bucket; arrows draw when non-empty.
type RemoteDir = 'NW' | 'N' | 'NE' | 'W' | 'SW' | 'S' | 'SE' | 'E';

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

  // OG: m_nMag — current magnification level (0=normal, 1=2X zoom)
  private _mag = 0;
  // OG: m_nMag_Normal — magnification for normal mode
  private _magNormal = 0;
  // OG: m_nMag_2X — magnification for 2X mode
  private _mag2X = 1;

  // OG: m_dwFieldID — current field ID for tracking map changes
  private _fieldId = 0;
  // OG: m_bShowMiniMap — whether minimap is visible
  private _showMiniMap = true;
  // OG: m_dwSearchedShop — last searched shop ID
  private _searchedShop = 0;
  // OG: m_bCreated — whether minimap has been created/initialized
  private _created = false;

  // OG: Remote-name edge arrows (m_strRemoteNW/N/NE/W/SW/S/SE/E). Names of
  // players on adjacent maps accumulate per-direction; a non-empty bucket
  // draws the matching edge-arrow icon at a fixed pane position (step 5 of
  // Update @0x8053A0). Buckets are rebuilt every frame from the stalkees.
  private _remoteNames: Record<RemoteDir, string> = { NW: '', N: '', NE: '', W: '', SW: '', S: '', SE: '', E: '' };

  private readonly _minMap = new FrameSet();
  private readonly _maxMap = new FrameSet();
  // OG: m_nMiniMapType=0 (simple) frame sets from MiniMapSimpleMode/Window/
  private readonly _simpleNormal = new FrameSet();
  private readonly _simpleMax = new FrameSet();
  private readonly _stripW: Sprite | null;
  private readonly _stripC: Sprite | null;
  private readonly _stripE: Sprite | null;
  // OG: simple collapsed strip = MiniMapSimpleMode/Window/Min (Left/Center/Right)
  private readonly _simpleStripL: Sprite | null;
  private readonly _simpleStripC: Sprite | null;
  private readonly _simpleStripR: Sprite | null;
  private readonly _markers: MiniMapMarkers;

  // OG: m_pBtMinimize(1000), m_pBtMaximize(1001), m_pBtWorldMap(1002), m_pBt2X(1003)
  // SetCtrl (type 1) builds BtMin/BtMax/BtMap; SetCtrl_Simple (type 0) builds
  // minimimize/maximize (MiniMapSimpleMode/Button) + a 2X toggle that swaps
  // its ZoomIn/ZoomOut sprite with the current option.
  private readonly _btMin: Button | null;
  private readonly _btMax: Button | null;
  private readonly _btMap: Button | null;
  // OG: SetCtrl_Simple uses MiniMapSimpleMode/Button/BtMin|BtMax for
  // simple mode (aUi_175 / aUi_161), plus ZoomIn/ZoomOut as the 2X toggle.
  private readonly _btMinSimple: Button | null;
  private readonly _btMaxSimple: Button | null;
  private readonly _bt2XOut: Button | null;
  private readonly _bt2XIn: Button | null;
  private readonly _buttons: Button[] = [];

  private readonly _font: BuiltInFont | null;
  // OG: m_pFont — main font for minimap text
  private _wzFont: WzProperty | null = null;
  // OG: m_pFontMapName — font for map name display
  private _wzFontMapName: WzProperty | null = null;
  // OG: m_pFontMapNameBack — font for map name background/shadow
  private _wzFontMapNameBack: WzProperty | null = null;
  // OG: m_pPropFieldInfo — field info property for minimap data
  private _propFieldInfo: WzProperty | null = null;
  // OG: m_pPropField — field property for minimap data
  private _propField: WzProperty | null = null;
  // OG: m_pSimple_Canvas — simple mode minimap canvas
  private _simpleCanvas: WzSprite | null = null;
  // OG: m_pSimple_Canvas_Huge — simple mode huge minimap canvas
  private _simpleCanvasHuge: WzSprite | null = null;
  private readonly _gfx: Graphics;
  private readonly _content: Container;

  playerWorldPos = { x: 0, y: 0 };
  private readonly _npcs: { x: number; y: number; quest: boolean }[] = [];
  private readonly _others: { x: number; y: number }[] = [];
  private readonly _partyMembers: { x: number; y: number; isLeader: boolean }[] = [];
  private readonly _portals: { x: number; y: number }[] = [];
  private readonly _merchants: { x: number; y: number }[] = [];
  // OG: m_mStalkee (characterId → POINT) + m_mStalkeeName (characterId → name)
  // Stalkees are followed players shown with name labels on the minimap.
  private readonly _stalkees = new Map<number, { x: number; y: number; name: string }>();

  // OG: OnMouseButton sends packet when clicking player dot
  onPlayerDotClick: (() => void) | null = null;
  // OG: m_pField — live foothold dictionary for dynamic foothold state rendering
  private _footholds: Record<number, Foothold> | null = null;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._font = font;
    this.isVisible = true;
    // User: the minimap stays ALWAYS at the top-left corner of the screen.
    // Do NOT restore a saved window position — a stale localStorage entry
    // (e.g. from an earlier draggable build) parked it off-screen and made it
    // appear missing.
    this._root.position.set(4, 4);

    const mm = ui?.GetItem('UIWindow2.img/MiniMap') as WzProperty | null;
    this._loadFrame(loader, mm?.Get('MinMap') as WzProperty | null, this._minMap);
    this._loadFrame(loader, mm?.Get('MaxMap') as WzProperty | null, this._maxMap);

    const strip = mm?.Get('Min') as WzProperty | null;
    this._stripW = this._loadCanvas(loader, strip, 'w');
    this._stripC = this._loadCanvas(loader, strip, 'c');
    this._stripE = this._loadCanvas(loader, strip, 'e');

    this._markers = new MiniMapMarkers(loader, ui);

    // OG: Simple mode window (m_nMiniMapType=0) draws MiniMapSimpleMode/Window/
    // Normal (north/south/middle 8-piece frame) + Window/Max for the 2X huge
    // option. The collapsed strip is Window/Min (Left/Center/Right).
    const simpleRoot = ui?.GetItem('UIWindow2.img/MiniMapSimpleMode') as WzProperty | null;
    const simpleWindow = simpleRoot?.Get('Window') as WzProperty | null;
    this._loadSimpleFrame(loader, simpleWindow?.Get('Normal') as WzProperty | null, this._simpleNormal);
    this._loadSimpleFrame(loader, simpleWindow?.Get('Max') as WzProperty | null, this._simpleMax);
    const simpleMin = simpleWindow?.Get('Min') as WzProperty | null;
    this._simpleStripL = this._loadCanvas(loader, simpleMin, 'Left');
    this._simpleStripC = this._loadCanvas(loader, simpleMin, 'Center');
    this._simpleStripR = this._loadCanvas(loader, simpleMin, 'Right');

    this._simpleCanvas = this._loadWzSprite(loader, simpleRoot, 'canvas');
    this._simpleCanvasHuge = this._loadWzSprite(loader, simpleRoot, 'canvasHuge');

    // OG button IDs: 1000=minimize, 1001=maximize, 1002=worldmap, 1003=2X
    // SetCtrl (type 1): MiniMap/BtMin|BtMax|BtMap at width-72/-59/-46.
    this._btMin = this._makeBtn(loader, mm, 'BtMin', () => this._onBtMinimize());
    this._btMax = this._makeBtn(loader, mm, 'BtMax', () => this._onBtMaximize());
    this._btMap = this._makeBtn(loader, mm, 'BtMap', () => this._onBtWorldMap());
    // OG: SetCtrl_Simple (type 0) builds the 2X toggle from
    // MiniMapSimpleMode/Button/ZoomIn (option 1) / ZoomOut (option 0) — there
    // is no "Bt2X" node. This minimap's WZ file has no NoSound.img, so the
    // StringPool IDs can't be resolved, but the subtree shape is verified.
    const simpleBtnRoot = ui?.GetItem('UIWindow2.img/MiniMapSimpleMode/Button') as WzProperty | null;
    this._bt2XOut = this._makeBtn(loader, simpleBtnRoot, 'ZoomOut', () => this._onBt2X());
    this._bt2XIn = this._makeBtn(loader, simpleBtnRoot, 'ZoomIn', () => this._onBt2X());
    this._btMinSimple = this._makeBtn(loader, simpleBtnRoot, 'BtMin', () => this._onBtMinimize());
    this._btMaxSimple = this._makeBtn(loader, simpleBtnRoot, 'BtMax', () => this._onBtMaximize());

    // OG: Load fonts from WZ (m_pFont, m_pFontMapName, m_pFontMapNameBack)
    // Font paths from CUIMiniMap::OnCreate
    this._loadFonts(ui);

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

  // OG: simple window pieces are named UpLeft/UpCenter/UpRight/MiddleLeft/
  // MiddleCenter/MiddleRight/DownLeft/DownCenter/DownRight (Window/Normal rows).
  private _loadSimpleFrame(loader: WzTextureLoader, root: WzProperty | null, f: FrameSet): void {
    f.nw = this._loadCanvas(loader, root, 'UpLeft');
    f.n = this._loadCanvas(loader, root, 'UpCenter');
    f.ne = this._loadCanvas(loader, root, 'UpRight');
    f.w = this._loadCanvas(loader, root, 'MiddleLeft');
    f.c = this._loadCanvas(loader, root, 'MiddleCenter');
    f.e = this._loadCanvas(loader, root, 'MiddleRight');
    f.sw = this._loadCanvas(loader, root, 'DownLeft');
    f.s = this._loadCanvas(loader, root, 'DownCenter');
    f.se = this._loadCanvas(loader, root, 'DownRight');
  }

  // OG: m_nMiniMapType selection — the frame draws the window chrome. type 1
  // (normal) uses MiniMap/MinMap|MaxMap; type 0 (simple) uses
  // MiniMapSimpleMode/Window/Normal|Max (the "Max" variant is the 2X huge pane).
  private _frameFor(isHuge: boolean): FrameSet {
    return this._miniMapType === 1
      ? (isHuge ? this._maxMap : this._minMap)
      : (isHuge ? this._simpleMax : this._simpleNormal);
  }

  private _loadCanvas(loader: WzTextureLoader, root: WzProperty | null, name: string): Sprite | null {
    const c = root?.Get(name);
    return c instanceof WzCanvas ? loader.Load(c)?.ToPixi() ?? null : null;
  }

  // OG: Load a WzSprite (for simple mode canvas)
  private _loadWzSprite(loader: WzTextureLoader, root: WzProperty | null, name: string): WzSprite | null {
    const c = root?.Get(name);
    return c instanceof WzCanvas ? loader.Load(c) ?? null : null;
  }

  private _makeBtn(loader: WzTextureLoader, root: WzProperty | null, name: string, onClick: () => void): Button | null {
    const pr = root?.Get(name) as WzProperty | null;
    if (!pr) return null;
    const b = Button.fromWz(loader, pr);
    b.onClick = onClick;
    this._buttons.push(b);
    return b;
  }

  // OG: Load fonts from WZ (m_pFont, m_pFontMapName, m_pFontMapNameBack)
  // Font paths from CUIMiniMap::OnCreate — loads from MiniMap/WzFont
  private _loadFonts(ui: WzPackage | null): void {
    if (!ui) return;
    // OG: Font loading from MiniMap/WzFont subtree
    const fontRoot = ui.GetItem('UIWindow2.img/MiniMap/WzFont') as WzProperty | null;
    if (fontRoot) {
      this._wzFont = fontRoot.Get('Normal') as WzProperty | null;
      this._wzFontMapName = fontRoot.Get('MapName') as WzProperty | null;
      this._wzFontMapNameBack = fontRoot.Get('MapNameBack') as WzProperty | null;
    }
  }

  // OG: OnButtonClicked @0x803E40 — type 1 minimize = (m_nOption + 1) % 3;
  // type 0 minimize = prev = option; option ? (option+1)%3 : 2.
  private _onBtMinimize(): void {
    if (!this.isVisible) return;
    if (this._miniMapType === 1) {
      this._mode = ((this._mode + 1) % 3) as OgMode;
    } else {
      this._prevMode = this._mode;
      this._mode = (this._mode !== 0 ? ((this._mode + 1) % 3) : 2) as OgMode;
    }
  }

  // OG: OnButtonClicked @0x803E40 — type 1 maximize = (m_nOption - 1) % 3;
  // type 0 maximize restores m_nPrevOption (clamped >= 1 when it's negative).
  private _onBtMaximize(): void {
    if (!this.isVisible) return;
    if (this._miniMapType === 1) {
      this._mode = ((this._mode + 2) % 3) as OgMode;
    } else {
      // OG: m_nOption = m_nPrevOption; if (m_nPrevOption < 0) m_nPrevOption = 1;
      // m_nPrevOption is restored verbatim (0 = huge / 1 = normal are both valid).
      this._mode = (this._prevMode < 0 ? 1 : this._prevMode) as OgMode;
    }
  }

  // OG: OnButtonClicked 1002 — world map dialog
  // Wired from GameStage to toggle the WorldMap panel.
  onBtWorldMap: (() => void) | null = null;

  private _onBtWorldMap(): void {
    this.onBtWorldMap?.();
  }

  // OG: OnButtonClicked 1003 — toggle 2X mode (m_nOption == 0)
  // SetCtrl_Simple toggles between m_nOption 0 (huge) and 1 (normal),
  // which also switches m_nMag between m_nMag_2X and m_nMag_Normal.
  private _onBt2X(): void {
    this._mode = this._mode === 0 ? 1 : 0;
  }

  setMapData(data: MiniMapData | null, mapName: string, regionName: string): void {
    this._data = data;
    // OG: m_nMag_Normal/m_nMag_2X copied from the MiniMapData node on load
    if (data) {
      this._magNormal = data.Mag_Normal;
      this._mag2X = data.Mag_2X;
    }
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
    // OG: m_nMag_Normal/m_nMag_2X copied from the MiniMapData node on load
    if (data) {
      this._magNormal = data.Mag_Normal;
      this._mag2X = data.Mag_2X;
    }
    this._streetName = street;
    this._mapName = map;
    this._mapId = mapId;
    // OG: SetFieldID — track current field ID
    this._fieldId = mapId;
    // OG: Reset searched shop when changing maps
    this._searchedShop = 0;
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

  // OG: InsertStalkee(dwCharacterID, strName, pt) — adds a followed player
  // to m_mStalkee (position) and m_mStalkeeName (name). Drawn with the
  // friend icon + name label in Update.
  insertStalkee(id: number, name: string, x: number, y: number): void {
    this._stalkees.set(id, { x, y, name });
  }

  // OG: RemoveStalkee(dwCharacterID) — removes from both maps.
  removeStalkee(id: number): void {
    this._stalkees.delete(id);
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

  // OG: SetShowMiniMap — shows/hides the minimap (m_bShowMiniMap)
  setShowMiniMap(show: boolean): void {
    this._showMiniMap = show;
    this.isVisible = show;
  }

  // Live foothold reference for dynamic foothold state (disabled/moving)
  setFootholds(footholds: Record<number, Foothold>): void {
    this._footholds = footholds;
  }

  // OG: SetFieldID — updates the current field ID (m_dwFieldID)
  setFieldId(id: number): void {
    this._fieldId = id;
  }

  // OG: setRemoteName — remote player names accumulated per direction
  // (m_strRemoteNW/N/NE/W/SW/S/SE/E). A non-empty bucket draws the matching
  // edge arrow. Callers MAY use these; we also auto-build them from stalkees.
  setRemoteNames(dir: RemoteDir, name: string): void {
    this._remoteNames[dir] = name;
  }

  // OG: resetRemoteNames — clears the 8 buckets (Update resets them each frame).
  private resetRemoteNames(): void {
    this._remoteNames = { NW: '', N: '', NE: '', W: '', SW: '', S: '', SE: '', E: '' };
  }

  // OG: SetSearchedShop — tracks last searched shop (m_dwSearchedShop)
  setSearchedShop(shopId: number): void {
    this._searchedShop = shopId;
  }

  // OG: CalculateScr — computes screen origin (m_nScrOrig_X/Y) from local player position
  // Called before drawing to determine which part of the map to show.
  // Formula: scrOrig = (realCX + clamp(localX - (paneW << mag) / 2, -realCX, realW - realCX - paneW*2^mag)) >> mag
  private _calculateScr(
    localPos: { x: number; y: number },
    paneW: number,
    paneH: number,
    mag: number,
  ): ScrOrig {
    if (!this._data) return { x: 0, y: 0 };

    const realW = this._data.Real_W;
    const realH = this._data.Real_H;
    const realCX = this._data.Real_CX;
    const realCY = this._data.Real_CY;

    // X calculation
    const scaledPaneW = paneW << mag;
    let scrOrigX = localPos.x - Math.floor(scaledPaneW / 2);
    // Clamp: if scrOrigX < -realCX, set to -realCX
    if (scrOrigX < -realCX) scrOrigX = -realCX;
    // Clamp: if scrOrigX > realW - realCX - scaledPaneW, set to that
    const maxX = realW - realCX - scaledPaneW;
    if (scrOrigX > maxX) scrOrigX = maxX;
    // Final: (realCX + scrOrigX) >> mag
    scrOrigX = (realCX + scrOrigX) >> mag;

    // Y calculation (same pattern)
    const scaledPaneH = paneH << mag;
    let scrOrigY = localPos.y - Math.floor(scaledPaneH / 2);
    if (scrOrigY < -realCY) scrOrigY = -realCY;
    const maxY = realH - realCY - scaledPaneH;
    if (scrOrigY > maxY) scrOrigY = maxY;
    scrOrigY = (realCY + scrOrigY) >> mag;

    return { x: scrOrigX, y: scrOrigY };
  }

  // OG: TransformPoint — transforms world coordinates to minimap screen coordinates
  // Formula: screenX = (worldX + realCX) >> mag - scrOrigX
  private _transformPoint(
    world: { x: number; y: number },
    scrOrig: ScrOrig,
    mag: number,
  ): { x: number; y: number } {
    if (!this._data) return { x: 0, y: 0 };
    const realCX = this._data.Real_CX;
    const realCY = this._data.Real_CY;
    return {
      x: ((world.x + realCX) >> mag) - scrOrig.x,
      y: ((world.y + realCY) >> mag) - scrOrig.y,
    };
  }

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

    // OG: m_bCreated — set after first successful draw
    this._created = true;

    // OG: m_nOption 2 = collapsed
    if (this._mode === 2) {
      this._drawCollapsed(win);
      return;
    }

    // OG: SetSize logic — m_nOption=0 with m_nMiniMapType=0 → huge (2x)
    // m_nOption=1 with m_nMiniMapType=0 → normal (1x)
    // m_nMiniMapType=1 always → normal (1x)
    const isHuge = this._miniMapType === 0 && this._mode === 0;
    this._mag = isHuge ? this._mag2X : this._magNormal;

    const frame = this._frameFor(isHuge);
    const scale = isHuge ? 2 : 1;

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

    // Buttons are positioned by _layoutButtons, just add to content
    for (const b of this._buttons) {
      this._content.addChild(b.container);
    }
  }

  private _drawMapAndIcons(pane: { x: number; y: number; width: number; height: number }, scale: number): void {
    // OG: Draw background even when canvas is null
    if (!this._data?.Canvas) {
      this._gfx.rect(pane.x, pane.y, pane.width, pane.height).fill({ color: 0x1c241c, alpha: 0.8 });
      // Continue to draw icons even without canvas
    }

    // OG: Use simple mode canvas when m_nMiniMapType=0
    const isHuge = this._miniMapType === 0 && this._mode === 0;
    const canvas = this._miniMapType === 0
      ? (isHuge ? this._simpleCanvasHuge : this._simpleCanvas) ?? this._data?.Canvas
      : this._data?.Canvas;
    const mag = this._mag;

    // OG: CalculateScr — compute screen origin from player position
    // This determines which part of the map to show in the pane
    // BUG FIX: _calculateScr expects canvas-pixel dimensions, not screen-pixel
    // In huge mode, pane.width is 2x the canvas width, so we divide by scale
    const canvasPaneW = canvas ? canvas.Width : pane.width / scale;
    const canvasPaneH = canvas ? canvas.Height : pane.height / scale;
    const scrOrig = this._calculateScr(this.playerWorldPos, canvasPaneW, canvasPaneH, mag);

    // OG: Map canvas is drawn at the viewport position
    // The canvas is scaled by the magnification factor
    const mapW = (canvas?.Width ?? 0) * scale;
    const mapH = (canvas?.Height ?? 0) * scale;

    // OG: Map position is determined by CalculateScr
    // If map fits in pane, center it. Otherwise, scroll based on scrOrig
    let mapX: number;
    let mapY: number;

    if (mapW <= pane.width) {
      // Map fits in pane — center it
      mapX = pane.x + Math.floor((pane.width - mapW) / 2);
    } else {
      // Map is larger than pane — scroll based on scrOrig
      mapX = pane.x - Math.floor(scrOrig.x * scale);
    }

    if (mapH <= pane.height) {
      // Map fits in pane — center it
      mapY = pane.y + Math.floor((pane.height - mapH) / 2);
    } else {
      // Map is larger than pane — scroll based on scrOrig
      mapY = pane.y - Math.floor(scrOrig.y * scale);
    }

    // Draw map canvas if available
    if (canvas) {
      const mapSprite = new Sprite(canvas.Texture);
      mapSprite.width = mapW;
      mapSprite.height = mapH;
      mapSprite.position.set(mapX, mapY);
      this._content.addChildAt(mapSprite, 0);
    }

    // OG: MakeConvexLayer — draw foothold lines on minimap
    if (this._data?.Footholds?.length) {
      this._drawFootholds(pane, scrOrig, mag, scale);
    }

    // OG: LoadLadderRope — draw ladders/ropes on minimap
    if (this._data?.LadderRopes?.length) {
      this._drawLadderRopes(pane, scrOrig, mag, scale);
    }

    // OG: DrawIcons — entity icons drawn in the exact Update @0x8053A0 order.
    // Inline draws happen inside their source loops (bottom of the layer);
    // the deferred group lists are drawn afterwards, then NPCs, then the
    // remote-name edge arrows, and finally the self icon on top.
    //
    // 1. CEmployeePool — non-self shops drawn inline with ShopRemote
    //    (self-entrusted shops defer to lEntrustedShop → ShopSelf).
    for (const m of this._merchants) this._drawMarker(pane, scrOrig, mag, scale, m, this._markers.getIcon(this._miniMapType, 'ShopRemote'), false);
    // 2. CUserPool — unclassified remote users drawn inline with RemoteUser.
    for (const o of this._others) this._drawMarker(pane, scrOrig, mag, scale, o, this._markers.getIcon(this._miniMapType, 'RemoteUser'), false);
    // 3. Deferred list draws (after the user loop, in OG order):
    //    lEntrustedShop(ShopSelf) → portals → lFriend → lGuild → lGuildMaster
    //    → lParty → lPartyMaster → lPartner(Match). We have no self-own shop,
    //    guild, or marriage data, so draw what exists in the OG sequence.
    for (const p of this._portals) this._drawMarker(pane, scrOrig, mag, scale, p, this._markers.getIcon(this._miniMapType, 'Portal'), true);
    // 3. m_mStalkee loop — stalkees on-pane keep the Friend icon + name;
    //    stalkees off-pane accumulate into the m_strRemote* direction bucket
    //    for that direction (drawn as edge arrows in step 5).
    this.resetRemoteNames();
    for (const [, s] of this._stalkees) {
      const c = this._transformPoint(s, scrOrig, mag);
      const dir = this._remoteDirectionFor(c, canvasPaneW, canvasPaneH);
      if (dir) {
        this._remoteNames[dir] = s.name;
      } else {
        this._drawMarker(pane, scrOrig, mag, scale, s, this._markers.getIcon(this._miniMapType, 'Friend'), true);
        this._drawStalkeeName(pane, scrOrig, mag, scale, s);
      }
    }
    for (const m of this._partyMembers) this._drawMarker(pane, scrOrig, mag, scale, m, m.isLeader ? this._markers.getIcon(this._miniMapType, 'PartyMaster') : this._markers.getIcon(this._miniMapType, 'Party'), false);
    // 4. m_aPtNpc — quest-state grouped lists NpcEnd/NpcStart/NpcLowLevel,
    //    plain NPCs keep the base Npc icon.
    for (const n of this._npcs) this._drawMarker(pane, scrOrig, mag, scale, n, n.quest ? (this._markers.getIcon(this._miniMapType, 'NpcStart') ?? this._markers.getIcon(this._miniMapType, 'Npc')) : this._markers.getIcon(this._miniMapType, 'Npc'), false);
    // 5. Remote-name edge arrows (m_strRemote*) drawn after the NPC pass at
    //    the 8 fixed pane positions; only drawn when the bucket is non-empty.
    this._drawRemoteEdgeArrows(pane);
    // 6. Player icon (m_pCanvasIconSelf) — draws last, on top.
    this._drawMarker(pane, scrOrig, mag, scale, this.playerWorldPos, this._markers.getIcon(this._miniMapType, 'User'), false);
  }

  // OG: MakeConvexLayer — renders foothold segments as lines on the minimap.
  // Each foothold is drawn as a line connecting its two endpoints.
  // Looks up live positions from FieldScene.Footholds so dynamic foothold
  // state changes (ApplyFootHoldState) are reflected on the minimap.
  private _drawFootholds(
    pane: { x: number; y: number; width: number; height: number },
    scrOrig: ScrOrig, mag: number, scale: number,
  ): void {
    const gfx = this._gfx;
    for (const fh of this._data!.Footholds) {
      // Look up live foothold — skip if not found or disabled (State===0)
      const live = this._footholds?.[fh.footholdId] ?? null;
      if (!live || live.State === 0) continue;

      // OG: TransformPoint for each foothold endpoint using live coordinates
      const p1 = this._transformPoint({ x: live.X1, y: live.Y1 }, scrOrig, mag);
      const p2 = this._transformPoint({ x: live.X2, y: live.Y2 }, scrOrig, mag);

      const x1 = pane.x + p1.x * scale;
      const y1 = pane.y + p1.y * scale;
      const x2 = pane.x + p2.x * scale;
      const y2 = pane.y + p2.y * scale;

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
    scrOrig: ScrOrig, mag: number, scale: number,
  ): void {
    const gfx = this._gfx;
    for (const lr of this._data!.LadderRopes) {
      // OG: TransformPoint for ladder/rope endpoints
      const p1 = this._transformPoint({ x: lr.x, y: lr.y1 }, scrOrig, mag);
      const p2 = this._transformPoint({ x: lr.x, y: lr.y2 }, scrOrig, mag);

      const px = pane.x + p1.x * scale;
      const py1 = pane.y + p1.y * scale;
      const py2 = pane.y + p2.y * scale;

      // Clip to pane
      const cpx = Math.max(pane.x, Math.min(px, pane.x + pane.width));
      const cpy1 = Math.max(pane.y, Math.min(py1, pane.y + pane.height));
      const cpy2 = Math.max(pane.y, Math.min(py2, pane.y + pane.height));

      // OG: ladders=red, ropes=blue
      const color = lr.isLadder ? 0xff0000 : 0x0000ff;
      gfx.moveTo(cpx, cpy1).lineTo(cpx, cpy2).stroke({ color, width: 1, alpha: 0.8 });
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
    // OG: TransformPoint — convert world to minimap screen coords
    const c = this._transformPoint(world, scrOrig, mag);
    const px = pane.x + c.x * scale;
    const py = pane.y + c.y * scale;

    const inside = px >= pane.x && px <= pane.x + pane.width && py >= pane.y && py <= pane.y + pane.height;
    if (inside) {
      this._drawIconAt(icon, px, py);
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
    this._drawIconAt(arrow, cx, cy);
  }

  // OG: DrawIcon @0x7F7980 — bottom-center anchored sprite.
  // Normal layout (m_nMiniMapType != 0 || m_nOption != 0): 1x Copy at
  //   (px - w/2, py - h)  [pt.x + paneX - width>>1, pt.y + paneY - height]
  // Simple + huge (type 0, option 0, icon scaled 2x): CopyEx dest at
  //   x = px - w(icon), destW = 2w, so the icon center equals px and the
  //   bottom equals py — i.e. 2x bottom-center.
  private _drawIconAt(icon: WzSprite, px: number, py: number): void {
    const w = icon.Width;
    const h = icon.Height;
    const s = icon.ToPixi();
    const huge = this._miniMapType === 0 && this._mode === 0;
    s.width = huge ? w * 2 : w;
    s.height = huge ? h * 2 : h;
    s.position.set(px - Math.floor(w / 2), py - h);
    this._content.addChild(s);
  }

  // OG: stalkee name label drawn below the friend icon
  private _drawStalkeeName(
    pane: { x: number; y: number; width: number; height: number },
    scrOrig: ScrOrig, mag: number, scale: number,
    stalkee: { x: number; y: number; name: string },
  ): void {
    if (!this._data || !stalkee.name) return;
    // OG: TransformPoint for stalkee position
    const c = this._transformPoint(stalkee, scrOrig, mag);
    const px = pane.x + c.x * scale;
    const py = pane.y + c.y * scale;
    // OG: name drawn below icon, centered horizontally
    const nameText = new Text({
      text: stalkee.name,
      style: new TextStyle({ fill: 0xaaaa82, fontSize: 9, fontFamily: 'monospace' }),
    });
    nameText.anchor.set(0.5, 0);
    nameText.position.set(px, py + 2);
    this._content.addChild(nameText);
  }

  // OG: m_mStalkee off-pane classification — bucket the stalkee's transformed
  // pane coords into the m_strRemote* direction string it belongs to.
  // Mirrors Update @0x8053A0: x<0 → W/SW/NW (by y), x>paneW → E/SE/NE (by y),
  // else y<0 → N, y>paneH → S; on-pane (both in range) → null (no bucket).
  private _remoteDirectionFor(
    c: { x: number; y: number },
    canvasPaneW: number,
    canvasPaneH: number,
  ): RemoteDir | null {
    if (c.x < 0) {
      if (c.y >= 0 && c.y <= canvasPaneH) return 'W';
      if (c.y > canvasPaneH) return 'SW';
      return 'NW';
    }
    if (c.x > canvasPaneW) {
      if (c.y >= 0 && c.y <= canvasPaneH) return 'E';
      if (c.y > canvasPaneH) return 'SE';
      return 'NE';
    }
    if (c.y < 0) return 'N';
    if (c.y > canvasPaneH) return 'S';
    return null;
  }

  // OG: Remote-name edge arrows. For each non-empty m_strRemote* bucket draw
  // the corresponding m_pCanvasIcon* arrow at its fixed pane position (drawn
  // after the NPC pass, before the self icon). Arrow icons come from the
  // mini-map simple-mode sprites (the markers' arrow path), matching how the
  // normal-mode arrow WZ source is unresolved so we fall back to them.
  private _drawRemoteEdgeArrows(pane: { x: number; y: number; width: number; height: number }): void {
    const dirToDelta: Record<RemoteDir, [number, number]> = {
      NW: [-1, -1], N: [0, -1], NE: [1, -1],
      W: [-1, 0], E: [1, 0],
      SW: [-1, 1], S: [0, 1], SE: [1, 1],
    };
    const dirToPos: Record<RemoteDir, (w: number, h: number) => [number, number]> = {
      // top row: (paneY + h + 1) as bottom-of-icon, x at pane edges
      NW: (w, h) => [pane.x + 1, pane.y + h + 1],
      N: (w, h) => [pane.x + Math.floor(pane.width / 2), pane.y + h + 1],
      NE: (w, h) => [pane.x + pane.width - w - 1, pane.y + h + 1],
      // middle row: (paneY + (h + paneH) >> 1)
      W: (w, h) => [pane.x + 1, pane.y + Math.floor((h + pane.height) / 2)],
      E: (w, h) => [pane.x + pane.width - w - 2, pane.y + Math.floor((h + pane.height) / 2)],
      // bottom row: (paneY + paneH - 1)
      SW: (w, h) => [pane.x + 1, pane.y + pane.height - 1],
      S: (w, h) => [pane.x + Math.floor(pane.width / 2), pane.y + pane.height - 1],
      SE: (w, h) => [pane.x + pane.width - w - 1, pane.y + pane.height - 1],
    };
    for (const dir of ['NW', 'N', 'NE', 'W', 'E', 'SW', 'S', 'SE'] as const) {
      if (!this._remoteNames[dir]) continue;
      const arrow = this._markers.edgeArrow(dirToDelta[dir][0], dirToDelta[dir][1]);
      if (!arrow) continue;
      const [px, py] = dirToPos[dir](arrow.Width, arrow.Height);
      this._drawIconAt(arrow, px, py);
    }
  }

  private _drawCollapsed(win: { x: number; y: number; width: number; height: number }): void {
    // OG: type 0 (simple) collapsed strip = MiniMapSimpleMode/Window/Min
    // (Left/Center/Right); type 1 = MiniMap/Min (w/c/e).
    const stripW = this._miniMapType === 0 ? this._simpleStripL : this._stripW;
    const stripC = this._miniMapType === 0 ? this._simpleStripC : this._stripC;
    const stripE = this._miniMapType === 0 ? this._simpleStripR : this._stripE;
    if (stripW && stripC && stripE) {
      stripW.position.set(win.x, win.y);
      this._content.addChild(stripW);

      const midX = win.x + stripW.width;
      const midW = win.width - stripW.width - stripE.width;
      if (midW > 0) {
        const mid = new Sprite(stripC.texture);
        mid.position.set(midX, win.y);
        mid.width = midW;
        this._content.addChild(mid);
      }

      stripE.position.set(win.x + win.width - stripE.width, win.y);
      this._content.addChild(stripE);
    } else {
      this._gfx.rect(win.x, win.y, win.width, win.height).fill({ color: 0x11111c, alpha: 0.95 });
    }

    this._drawTitle(win, stripW?.width ?? 64, StripH);

    // OG: collapsed strip only has the mode's buttons (see _layoutButtons),
    // which are already positioned in _buttons.
    for (const b of this._buttons) {
      if (b.container.visible) this._content.addChild(b.container);
    }
  }

  private _drawTitle(win: { x: number; y: number; width: number; height: number }, tabW: number, bandH: number): void {
    const title = this._mapName;
    if (!title) return;

    const tx = win.x + tabW - 8;

    // OG: Collapsed mode (m_nOption 2) shows only map name centered in strip
    if (this._mode === 2) {
      const ty = win.y + Math.floor((bandH - 12) / 2);
      const t = new Text({ text: title, style: new TextStyle({ fill: 0xffffff, fontSize: 10, fontFamily: 'monospace' }) });
      t.position.set(tx, ty);
      this._content.addChild(t);
      return;
    }

    // OG: Expanded modes (m_nOption 0/1) show street name + map name on two lines
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
        const isHuge = this._miniMapType === 0 && this._mode === 0;
        const borderR = this._frameFor(isHuge).borderR;
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
    // OG: Window rect in local coordinates (relative to _root)
    // _root.position handles the screen offset, so _winRect returns local (0,0)
    const x = 0;
    const y = 0;

    // OG: m_nOption 2 = collapsed → just the title strip
    if (this._mode === 2) {
      const nameW = this._font && this._mapName ? this._font.measure(this._mapName).x : 0;
      const tabW = this._miniMapType === 0 ? (this._simpleStripL?.width ?? 64) : (this._stripW?.width ?? 64);
      const w = Math.max(160, tabW + nameW + 6 + this._buttonsWidth() + TitlePadRight);
      return { x, y, width: w, height: StripH };
    }

    // OG: SetSize logic — m_nOption=0 with m_nMiniMapType=0 → huge (2x)
    // m_nOption=1 with m_nMiniMapType=0 → normal (1x)
    // m_nMiniMapType=1 always → normal (1x)
    const isHuge = this._miniMapType === 0 && this._mode === 0;
    const frame = this._frameFor(isHuge);
    const scale = isHuge ? 2 : 1;

    // OG: SetSize caps pane based on canvas dimensions
    // Normal: W≥280→cap 210, H≥150→cap 112
    // Huge: W≥560→cap 420, H≥300→cap 225
    const cw = this._data?.CanvasWidth ?? 180;
    const ch = this._data?.CanvasHeight ?? 120;
    let paneW: number;
    let paneH: number;

    if (isHuge) {
      // Huge mode: canvas*2, capped at 420 if >= 560
      const hugeW = cw * 2;
      const hugeH = ch * 2;
      paneW = hugeW >= 560 ? HugePaneCapW : hugeW;
      paneH = hugeH >= 300 ? HugePaneCapH : hugeH;
    } else {
      // Normal mode: canvas, capped at 210 if >= 280
      paneW = cw >= 280 ? NormalPaneCapW : cw;
      paneH = ch >= 150 ? NormalPaneCapH : ch;
    }

    // OG: Window width = pane width + borders
    // Title text is clipped if it exceeds the window width
    const finalW = paneW + frame.borderL + frame.borderR;
    const finalH = paneH + frame.titleH + frame.borderB;

    return { x, y, width: finalW, height: finalH };
  }

  private _buttonsWidth(): number {
    // OG: top-row buttons are anchored at fixed right offsets, but for the
    // title/id indents we just need the total top-row button footprint.
    let w = 0;
    for (const b of [this._btMap, this._btMin, this._btMax, this._btMinSimple, this._btMaxSimple]) {
      if (b) w += b.width + BtnGap;
    }
    return w;
  }

  // OG: SetCtrl positions buttons at (width-46,4), (width-59,4), (width-72,4)
  // and disables the inactive one based on m_nOption + m_nMiniMapType
  private _layoutButtons(win: { x: number; y: number; width: number; height: number }): void {
    const isHuge = this._miniMapType === 0 && this._mode === 0;
    const frame = this._frameFor(isHuge);
    const borderR = this._mode === 2 ? (this._miniMapType === 0 ? this._simpleStripR?.width ?? 9 : this._stripE?.width ?? 9)
      : frame.borderR;
    const bandH = this._mode === 2 ? StripH : frame.titleH;

    // OG: SetCtrl (type 1): buttons at (width-46,4)=worldmap, (width-59,4)=
    // maximize, (width-72,4)=minimize. SetCtrl_Simple (type 0): worldmap at
    // (width-46,4); option 0/1 use BtMin|ZoomOut or BtMin|ZoomIn; option 2
    // (collapsed) uses ONLY BtMaxSimple. Anchored to window-local coords.
    const yTop = win.y + Math.max(2, Math.floor((Math.min(bandH, 21) - 12) / 2));
    const w = win.width;
    const h = win.height;
    const top2X = { x: win.x + (w - 30), y: win.y + (h - 16) };

    if (this._miniMapType === 1) {
      if (this._btMap) { this._btMap.container.visible = true; this._btMap.container.position.set(win.x + (w - 46), yTop); }
      if (this._btMin) { this._btMin.container.visible = true; this._btMin.container.position.set(win.x + (w - 72), yTop); }
      if (this._btMax) { this._btMax.container.visible = true; this._btMax.container.position.set(win.x + (w - 59), yTop); }
      if (this._btMinSimple) this._btMinSimple.container.visible = false;
      if (this._btMaxSimple) this._btMaxSimple.container.visible = false;
      if (this._bt2XOut) this._bt2XOut.container.visible = false;
      if (this._bt2XIn) this._bt2XIn.container.visible = false;
      if (this._btMin) this._btMin.enabled = this._mode !== 2;
      if (this._btMax) this._btMax.enabled = this._mode !== 0;
    } else {
      // OG: worldmap always at (width-46, 4)
      if (this._btMap) { this._btMap.container.visible = true; this._btMap.container.position.set(win.x + (w - 46), yTop); }
      if (this._mode === 2) {
        // option 2 (collapsed): ONLY BtMaxSimple at (w-59, 4)
        if (this._btMaxSimple) { this._btMaxSimple.container.visible = true; this._btMaxSimple.container.position.set(win.x + (w - 59), yTop); }
        if (this._btMin) this._btMin.container.visible = false;
        if (this._btMax) this._btMax.container.visible = false;
        if (this._btMinSimple) this._btMinSimple.container.visible = false;
        if (this._bt2XOut) this._bt2XOut.container.visible = false;
        if (this._bt2XIn) this._bt2XIn.container.visible = false;
      } else if (this._mode === 1) {
        // option 1 (normal): MiniMapSimpleMode/Button/BtMin + ZoomIn
        if (this._btMinSimple) { this._btMinSimple.container.visible = true; this._btMinSimple.container.position.set(win.x + (w - 59), yTop); }
        if (this._bt2XIn) { this._bt2XIn.container.visible = true; this._bt2XIn.container.position.set(top2X.x, top2X.y); }
        if (this._btMin) this._btMin.container.visible = false;
        if (this._btMax) this._btMax.container.visible = false;
        if (this._btMaxSimple) this._btMaxSimple.container.visible = false;
        if (this._bt2XOut) this._bt2XOut.container.visible = false;
      } else {
        // option 0 (2X huge): MiniMap/BtMin + ZoomOut
        if (this._btMin) { this._btMin.container.visible = true; this._btMin.container.position.set(win.x + (w - 59), yTop); }
        if (this._bt2XOut) { this._bt2XOut.container.visible = true; this._bt2XOut.container.position.set(top2X.x, top2X.y); }
        if (this._btMinSimple) this._btMinSimple.container.visible = false;
        if (this._btMax) this._btMax.container.visible = false;
        if (this._btMaxSimple) this._btMaxSimple.container.visible = false;
        if (this._bt2XIn) this._bt2XIn.container.visible = false;
      }
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
      const isHuge = this._miniMapType === 0 && this._mode === 0;
      const frame = this._frameFor(isHuge);
      const scale = isHuge ? 2 : 1;
      const mag = this._mag;
      const pane = {
        x: win.x + frame.borderL,
        y: win.y + frame.titleH,
        width: win.width - frame.borderL - frame.borderR,
        height: win.height - frame.titleH - frame.borderB,
      };
      // OG: CalculateScr for player position
      // BUG FIX: _calculateScr expects canvas-pixel dimensions, not screen-pixel
      const canvasPaneW = this._data?.Canvas ? this._data.Canvas.Width : pane.width / scale;
      const canvasPaneH = this._data?.Canvas ? this._data.Canvas.Height : pane.height / scale;
      const scrOrig = this._calculateScr(this.playerWorldPos, canvasPaneW, canvasPaneH, mag);
      // OG: TransformPoint for player
      const c = this._transformPoint(this.playerWorldPos, scrOrig, mag);
      const px = pane.x + c.x * scale;
      const py = pane.y + c.y * scale;

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
