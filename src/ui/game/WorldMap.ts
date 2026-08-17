import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzImage } from '../../wz/WzImage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { Button } from '../Button.js';
import { ToolTip } from './ToolTip.js';

/**
 * OG: CWorldMapDlg — world map dialog.
 * Decompiled from v95 IDB: CreateWorldMapDlg 0x9B7E10, OnCreate 0x9B9E10,
 * Draw 0x9BA060, LoadInfo 0x9B7B00, LoadMapList 0x9BC160, LoadMapLink 0x9BBC20,
 * SetWorldMap 0x9BD820, CheckSpotInfo 0x9B59A0, CheckLinkInfo 0x9BAA30,
 * MakeBorder 0x9B6490, ScoreLinkMap 0x9B83B0, GetDeepestWorldMap 0x9BB440.
 *
 * WZ: Map.wz/WorldMap/<WorldMap.img | WorldMap###.img> — whole world + regional
 * maps, each with BaseImg, MapList (spots) and MapLink (sub-map links).
 * Markers: Map.wz/MapHelper.img/worldMap/mapImage/{0..3}.
 * Button IDs: 2=Close, 2000=QuestToggle.
 */

// OG: CWorldMapDlg::OnCreate — close button at (m_width-22, 4), quest toggle at (m_width-65, 4)
const BTN_CLOSE = 2;
const BTN_QUEST_TOGGLE = 2000;

/** OG: Draw blits the base canvas raw at (13, 24). */
const BASE_X = 13;
const BASE_Y = 24;

// OG: MakeBorder — window dimensions from CWorldMapDlg::OnCreate.
const WM_WIDTH = 800;
const WM_HEIGHT = 600;

// OG: MakeBorder border slice indices in UIWindow2.img/WorldMap/Border.
// NX dump: 0=64x27 TL, 1=1x27 L, 2=64x27 TR, 3=64x1 top,
//          4=64x1 bottom, 5=64x27 BL, 6=1x27 R, 7=64x27 BR.
const BORDER_COUNT = 8;

/** A clickable spot (WORLDMAP_ITEM) on the world map. */
interface WorldMapSpot {
  nType: number;
  nX: number; // spot.x + baseOrigin.x
  nY: number; // spot.y + baseOrigin.y
  bNoToolTip: boolean;
  title: string;
  desc: string;
  path: WzSprite | null;
  mapNo: number[];
}

/** A link to a sub-map (WMLink). */
interface WorldMapLink {
  linkMap: string; // e.g. "WorldMap011"
  linkImg: WzSprite | null;
  toolTip: string;
}

const _rowStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace' });
const _fallbackStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 14, fontFamily: 'monospace' });

export class WorldMap extends GamePanel {
  // Callbacks
  onTeleportToMap: ((mapId: number) => void) | null = null;
  onNavigateToMap: ((mapName: string) => void) | null = null;

  // State
  private _loader: WzTextureLoader | null;
  private _mapWz: WzPackage | null;
  private _uiWz: WzPackage | null;
  private _currentMapName = '';
  private _lastFieldId = -1;
  private _baseCanvas: WzSprite | null = null;
  private _mainOrigin = { x: 0, y: 0 };
  private _markers: (WzSprite | null)[] = [null, null, null, null];
  private _spots: WorldMapSpot[] = [];
  private _links: WorldMapLink[] = [];
  private _selectedSpot = -1;   // m_nSelectedWMI (requires pPathImg)
  private _selectedSpotTT = -1; // m_nSelectedWMI_TT (tooltip only)
  private _selectedLink = -1;   // m_nSelectedLink
  private _questToggle = false;

  // Map transfer list (from OpenMapTransfer)
  private _transferMapIds: number[] = [];

  // UI
  private _bg: Graphics;
  private _content: Container;
  private _borderLayer: Container;
  private _borderBuilt = false;
  private _btClose: Button | null = null;
  private _btQuestToggle: Button | null = null;
  private _toolTip: ToolTip;

  constructor(loader?: WzTextureLoader | null, mapWz?: WzPackage | null, uiWz?: WzPackage | null) {
    super();
    this.isVisible = false;
    this.draggable = false;
    this._loader = loader ?? null;
    this._mapWz = mapWz ?? null;
    this._uiWz = uiWz ?? null;

    this._bg = new Graphics();
    this._borderLayer = new Container();
    this._content = new Container();
    this._toolTip = new ToolTip();

    this._rebuildBg();
    this._root.addChild(this._bg);
    this._root.addChild(this._borderLayer);
    this._root.addChild(this._content);
    this._root.addChild(this._toolTip.container);
    this._createButtons();
    this._makeBorder();
  }

  // ── World map mode ─────────────────────────────────────────────────

  /**
   * OG: CWorldMapDlg::GetDeepestWorldMap (0x9BB440) — finds the most specific
   * WorldMap###.img that lists `dwFieldID` in one of its MapList items'
   * `mapNo` arrays.
   *
   * Loop order (exact): outer v3=0..20 probes "WorldMap%03d" with 10*v3
   * (000,010,020,...), and on the first hit drops into the inner i=1..10 loop
   * probing 10*v3+i (001..010, 011..020, ...), returning immediately on a hit.
   * If the outer hit has no deeper sub-map containing the field (or no outer
   * hit at all), a fallback probe of j=140..142 still runs and overrides the
   * result when one of those contains the field.
   */
  private _findDeepestWorldMap(fieldId: number): WzProperty | null {
    const wz = this._mapWz;
    if (!wz) return null;
    let pReturn: WzProperty | null = null;
    let v3 = 0;
    let hit = false;

    for (v3 = 0; v3 <= 20; v3++) {
      const pNow = this._loadMapProp(this._pad3(10 * v3));
      if (pNow && this._isHavingFieldNo(pNow, fieldId)) {
        pReturn = pNow;
        hit = true;
        break;
      }
    }

    if (hit) {
      for (let i = 1; i <= 10; i++) {
        const pNow = this._loadMapProp(this._pad3(i + 10 * v3));
        if (pNow && this._isHavingFieldNo(pNow, fieldId)) {
          pReturn = pNow;
          hit = false;
          break;
        }
      }
    }

    // Fallback j=140..142 (LABEL_88) — overrides pReturn if it contains the field.
    for (let j = 140; j <= 142; j++) {
      const pNow = this._loadMapProp(this._pad3(j));
      if (pNow && this._isHavingFieldNo(pNow, fieldId)) {
        pReturn = pNow;
        break;
      }
    }
    return pReturn;
  }

  private _pad3(n: number): string {
    return n.toString().padStart(3, '0');
  }

  private _loadMapProp(name: string): WzProperty | null {
    const path = `WorldMap/WorldMap${name}.img`;
    const item = this._mapWz?.GetItem(path);
    if (item instanceof WzImage) return item.Root;
    if (item instanceof WzProperty) return item;
    return null;
  }

  /**
   * OG: CWorldMapDlg::IsHavingFieldNo — true when any MapList/<i>/mapNo
   * entry equals the field id.
   */
  private _isHavingFieldNo(prop: WzProperty, fieldId: number): boolean {
    const mapList = prop.Get('MapList');
    if (!(mapList instanceof WzProperty)) return false;
    for (const key of Object.keys(mapList.Items)) {
      const item = mapList.Get(key);
      if (!(item instanceof WzProperty)) continue;
      const mapNo = item.Get('mapNo');
      if (!(mapNo instanceof WzProperty)) continue;
      for (const k of Object.keys(mapNo.Items)) {
        if (Number(mapNo.Get(k)) === fieldId) return true;
      }
    }
    return false;
  }

  /**
   * OG: CWorldMapDlg::SetWorldMap (0x9BD820) — loads BaseImg, MapList (spots)
   * and MapLink (sub-map links) for the given world-map property.
   */
  private _setWorldMap(prop: WzProperty): boolean {
    const base = prop.GetItem('BaseImg/0');
    this._baseCanvas = base instanceof WzCanvas && this._loader
      ? this._loader.Load(base)
      : null;
    if (this._baseCanvas) {
      this._mainOrigin = { x: this._baseCanvas.OriginX, y: this._baseCanvas.OriginY };
    }
    this._spots = [];
    this._links = [];
    this._selectedSpot = -1;
    this._selectedSpotTT = -1;
    this._selectedLink = -1;
    this._loadMarkers();
    this._loadMapList(prop);
    this._loadMapLink(prop);
    if (this._questToggle) this._scoreLinkMap();
    return true;
  }

  /** OG: LoadInfo — per-nType marker canvases from Map/MapHelper.img/worldMap/mapImage. */
  private _loadMarkers(): void {
    this._markers = [null, null, null, null];
    if (!this._mapWz || !this._loader) return;
    for (let t = 0; t < 4; t++) {
      const node = this._mapWz.GetItem(`MapHelper.img/worldMap/mapImage/${t}`);
      if (node instanceof WzCanvas) this._markers[t] = this._loader.Load(node);
    }
  }

  /**
   * OG: LoadMapList (0x9BC160) — reads each MapList/<i> item:
   * nX = spot.x + baseOrigin.x, nY = spot.y + baseOrigin.y, nType,
   * bNoToolTip, title, desc, path canvas, mapNo array.
   */
  private _loadMapList(prop: WzProperty): void {
    const mapList = prop.Get('MapList');
    if (!(mapList instanceof WzProperty)) return;
    for (const key of Object.keys(mapList.Items)) {
      const item = mapList.Get(key);
      if (!(item instanceof WzProperty)) continue;

      const spot = item.Get('spot');
      const sx = this._readVecX(spot);
      const sy = this._readVecY(spot);
      if (spot === null) continue;

      const nType = this._readInt(item.Get('type'), 0);
      const bNoToolTip = this._readInt(item.Get('noToolTip') ?? item.Get('bNoToolTip'), 0) !== 0;

      const pathNode = item.Get('path');
      const path = pathNode instanceof WzCanvas && this._loader
        ? this._loader.Load(pathNode)
        : null;

      const mapNo: number[] = [];
      const mapNoProp = item.Get('mapNo');
      if (mapNoProp instanceof WzProperty) {
        for (const k of Object.keys(mapNoProp.Items)) {
          mapNo.push(Number(mapNoProp.Get(k)));
        }
      }

      this._spots.push({
        nType,
        nX: sx + this._mainOrigin.x,
        nY: sy + this._mainOrigin.y,
        bNoToolTip,
        title: this._readString(item.Get('title')),
        desc: this._readString(item.Get('desc')),
        path,
        mapNo,
      });
    }
  }

  /**
   * OG: LoadMapLink (0x9BBC20) — reads each MapLink/<i> node:
   * link/linkImg canvas, link/linkMap string, toolTip string (direct child).
   */
  private _loadMapLink(prop: WzProperty): void {
    const mapLink = prop.Get('MapLink');
    if (!(mapLink instanceof WzProperty)) return;
    for (const key of Object.keys(mapLink.Items)) {
      const node = mapLink.Get(key);
      if (!(node instanceof WzProperty)) continue;
      const link = node.Get('link');
      const linkProp = link instanceof WzProperty ? link : null;

      const imgNode = linkProp?.Get('linkImg');
      const linkImg = imgNode instanceof WzCanvas && this._loader
        ? this._loader.Load(imgNode)
        : null;
      const linkMap = this._readString(linkProp?.Get('linkMap') ?? '');
      const toolTip = this._readString(node.Get('toolTip'));

      if (linkMap) {
        this._links.push({ linkMap, linkImg, toolTip });
      }
    }
  }

  /**
   * Open the world map for the current field. Resolves the deepest regional
   * map containing the field (GetDeepestWorldMap) and loads it. Skips the
   * reload when the field is unchanged so hovering/selection survive.
   */
  openForField(fieldId: number): void {
    this._transferMapIds = [];
    if (fieldId === this._lastFieldId && this._baseCanvas && this.isVisible) {
      this.isVisible = true;
      return;
    }
    const deepest = this._findDeepestWorldMap(fieldId);
    if (!deepest) {
      this._currentMapName = '';
      this._baseCanvas = null;
      this._spots = [];
      this._links = [];
      this.isVisible = true;
      return;
    }
    this._setWorldMap(deepest);
    this._currentMapName = this._mapNameOf(deepest);
    this._lastFieldId = fieldId;
    this.isVisible = true;
  }

  /**
   * Navigate deeper into a sub-map link (OG: clicking a link image calls
   * SetWorldMap on the linked map property).
   */
  navigateTo(linkMap: string): void {
    const prop = this._loadMapProp(linkMap.replace(/^WorldMap\//, '').replace(/\.img$/, '').replace(/^WorldMap/, ''));
    if (!prop) return;
    this._transferMapIds = [];
    this._setWorldMap(prop);
    this._currentMapName = linkMap;
  }

  private _mapNameOf(prop: WzProperty): string {
    // Best-effort name: use the parent info/name or fall back to the map node.
    const info = prop.Get('info');
    const name = info instanceof WzProperty ? this._readString(info.Get('name')) : '';
    return name || this._currentMapName;
  }

  // ── Map transfer list mode (OG: CWorldMapDlg transfer sub-state) ──────

  OpenMapTransfer(mapIds: number[]): void {
    this._transferMapIds = mapIds;
    this._spots = [];
    this._links = [];
    this._baseCanvas = null;
    this.isVisible = true;
  }

  // ── UI construction ─────────────────────────────────────────────────

  private _createButtons(): void {
    if (this._btClose) {
      this._btClose.container.removeFromParent();
      this._btClose.container.destroy({ children: true });
      this._btClose = null;
    }
    if (this._btQuestToggle) {
      this._btQuestToggle.container.removeFromParent();
      this._btQuestToggle.container.destroy({ children: true });
      this._btQuestToggle = null;
    }

    // OG: CreateCtrl_2(2, m_width-22, 4) — close button at top-right
    const closeNode = this._mapWz?.GetItem('Basic.img/BtClose');
    this._btClose = closeNode instanceof WzProperty
      ? Button.fromWz(this._loader ?? new WzTextureLoader(), closeNode, 'Close')
      : new Button('Close');
    this._btClose.container.position.set(WM_WIDTH - 22, 4);
    this._btClose.onClick = () => { this.isVisible = false; };
    this._root.addChild(this._btClose.container);

    // OG: CreateCtrl_2(2000, m_width-65, 4) — quest toggle at top-right
    this._btQuestToggle = new Button(this._questToggle ? '?' : '!');
    this._btQuestToggle.container.position.set(WM_WIDTH - 65, 4);
    this._btQuestToggle.onClick = () => {
      this._questToggle = !this._questToggle;
      this._updateQuestToggle();
    };
    this._root.addChild(this._btQuestToggle.container);
  }

  /**
   * OG: OnButtonClicked id=2000 — toggles quest mode, persists via
   * CConfig::SetQuestGuideOption, re-runs SetWorldMap (which calls
   * ScoreLinkMap), and releases the quest-guide tip balloon.
   */
  private _updateQuestToggle(): void {
    // Re-run SetWorldMap on the current map to score links for quest mode
    const current = this._loadMapProp(this._currentMapName.replace(/^WorldMap\//, '').replace(/\.img$/, ''));
    if (current) this._setWorldMap(current);
  }

  /**
   * OG: ScoreLinkMap (0x9B83B0) — scores each MapLink against quest mob
   * and demand-item lists. When quest toggle is active, links with the
   * highest score are visually prioritized (the link image for the
   * best-scoring link gets drawn).
   */
  private _scoreLinkMap(): void {
    // Structural stub — requires CQuestMan data (mob lists, demand items)
    // which is populated at runtime from the quest system. Without quest
    // state wired, this is a no-op. When quest data becomes available,
    // score each MapLink's linkMap against the current quest objectives
    // and select the highest-scoring link.
  }

  private _rebuildBg(): void {
    this._bg.clear();
    this._bg.rect(0, 0, WM_WIDTH, WM_HEIGHT).fill({ color: '#080A14', alpha: 245 / 255 });
    this._bg.rect(0, 0, WM_WIDTH, WM_HEIGHT).stroke({ color: '#3C4164', width: 1 });
    this._bg.rect(0, 0, WM_WIDTH, 22).fill({ color: '#0F1224' });
  }

  // ── MakeBorder (0x9B6490) ──────────────────────────────────────────

  /**
   * OG: MakeBorder (0x9B6490) — composites the 9-slice border chrome from
   * UIWindow2.img/WorldMap onto a white-filled canvas.
   *
   * Border slices (NX dump):   *   0 = 64×27 top-left corner   *   1 = 1×27  left edge (tiled vertically)
   *   2 = 64×27 top-right corner
   *   3 = 64×1  top edge (tiled horizontally)
   *   4 = 64×1  bottom edge (tiled horizontally)
   *   5 = 64×27 bottom-left corner
   *   6 = 1×27  right edge (tiled vertically)
   *   7 = 64×27 bottom-right corner
   *
   * Draw order: white fill → horizontal edges → vertical edges → corners → title.
   */
  private _makeBorder(): void {
    if (this._borderBuilt) return;
    this._borderLayer.removeChildren();

    const uiWz = this._uiWz;
    const loader = this._loader;
    if (!uiWz || !loader) {
      this._borderBuilt = true;
      return;
    }

    // Load all 8 border slices + title from UIWindow2.img/WorldMap.
    const slices: (WzSprite | null)[] = [];
    for (let i = 0; i < BORDER_COUNT; i++) {
      const node = uiWz.GetItem(`UIWindow2.img/WorldMap/Border/${i}`);
      slices.push(node instanceof WzCanvas ? loader.Load(node) : null);
    }
    const titleNode = uiWz.GetItem('UIWindow2.img/WorldMap/title');
    const titleSprite = titleNode instanceof WzCanvas ? loader.Load(titleNode) : null;

    // If any critical slices are missing, fall back to the Graphics border.
    const hasAllSlices = slices.every((s) => s !== null);
    if (!hasAllSlices) {
      this._borderBuilt = true;
      return;
    }

    // White background fill (OG: fills m_pBackgrnd with 0xFFFFFF first).
    const bg = new Graphics();
    bg.rect(0, 0, WM_WIDTH, WM_HEIGHT).fill({ color: 0xFFFFFF });
    this._borderLayer.addChild(bg);

    // Horizontal edges — tiled from x=64 to x=WM_WIDTH-64.
    // Top edge = Border/3 (64×1), bottom edge = Border/4 (64×1).
    const topEdge = slices[3]!;
    const bottomEdge = slices[4]!;
    for (let x = 64; x < WM_WIDTH - 64; x += topEdge.Width) {
      const s1 = topEdge.NewSprite();
      s1.anchor.set(0, 0);
      s1.x = x;
      s1.y = 0;
      this._borderLayer.addChild(s1);

      const s2 = bottomEdge.NewSprite();
      s2.anchor.set(0, 0);
      s2.x = x;
      s2.y = WM_HEIGHT - 27;
      this._borderLayer.addChild(s2);
    }

    // Vertical edges — tiled from y=27 to y=WM_HEIGHT-27.
    // Left edge = Border/1 (1×27), right edge = Border/6 (1×27).
    const leftEdge = slices[1]!;
    const rightEdge = slices[6]!;
    for (let y = 27; y < WM_HEIGHT - 27; y += leftEdge.Height) {
      const s1 = leftEdge.NewSprite();
      s1.anchor.set(0, 0);
      s1.x = 0;
      s1.y = y;
      this._borderLayer.addChild(s1);

      const s2 = rightEdge.NewSprite();
      s2.anchor.set(0, 0);
      s2.x = WM_WIDTH - 64;
      s2.y = y;
      this._borderLayer.addChild(s2);
    }

    // Corners (64×27 each).
    // TL=0 at (0,0), TR=2 at (WM_WIDTH-64, 0), BL=5 at (0, WM_HEIGHT-27), BR=7 at (WM_WIDTH-64, WM_HEIGHT-27).
    const cornerPositions: [WzSprite, number, number][] = [
      [slices[0]!, 0, 0],
      [slices[2]!, WM_WIDTH - 64, 0],
      [slices[5]!, 0, WM_HEIGHT - 27],
      [slices[7]!, WM_WIDTH - 64, WM_HEIGHT - 27],
    ];
    for (const [slice, cx, cy] of cornerPositions) {
      const s = slice.NewSprite();
      s.anchor.set(0, 0);
      s.x = cx;
      s.y = cy;
      this._borderLayer.addChild(s);
    }

    // Title (57×15) at (304, 0).
    if (titleSprite) {
      const ts = titleSprite.NewSprite();
      ts.anchor.set(0, 0);
      ts.x = 304;
      ts.y = 0;
      this._borderLayer.addChild(ts);
    }

    this._borderBuilt = true;
  }

  // ── Drawing (OG: Draw 0x9BA060) ─────────────────────────────────────

  update(_dt: number): void {
    if (!this.isVisible) return;
    this.draw();
  }

  draw(): void {
    if (!this.isVisible) return;
    this._content.removeChildren();

    // Transfer list mode
    if (this._transferMapIds.length > 0) {
      this._drawTransferList();
      return;
    }

    // 1. Base canvas — raw blit at (13, 24)
    if (this._baseCanvas) {
      const s = this._baseCanvas.NewSprite();
      s.anchor.set(0, 0);
      s.x = BASE_X;
      s.y = BASE_Y;
      this._content.addChild(s);
    }

    const anchorX = this._mainOrigin.x + BASE_X; // (333, 259) for 640x470 base
    const anchorY = this._mainOrigin.y + BASE_Y;

    // 2. Head — selected spot's path image, origin-anchored at the base origin
    const selSpot = this._selectedSpot >= 0 ? this._spots[this._selectedSpot] : undefined;
    if (selSpot?.path) {
      const s = selSpot.path.NewSprite();
      s.x = anchorX;
      s.y = anchorY;
      this._content.addChild(s);
    }

    // 3. Item markers — origin-anchored at (nX+13, nY+24)
    for (const spot of this._spots) {
      const marker = this._markers[spot.nType];
      if (!marker) continue;
      const s = marker.NewSprite();
      s.x = spot.nX + BASE_X;
      s.y = spot.nY + BASE_Y;
      this._content.addChild(s);
    }

    // 4. Tail — selected link image, origin-anchored at the base origin
    const selLink = this._selectedLink >= 0 ? this._links[this._selectedLink] : undefined;
    if (selLink?.linkImg) {
      const s = selLink.linkImg.NewSprite();
      s.x = anchorX;
      s.y = anchorY;
      this._content.addChild(s);
    }

    // Title fallback
    if (!this._baseCanvas) {
      const t = new Text({ text: this._currentMapName || 'World Map', style: _fallbackStyle });
      t.x = 70;
      t.y = 3;
      this._content.addChild(t);
    }
  }

  private _drawTransferList(): void {
    const ids = this._transferMapIds.slice(0, 20);
    ids.forEach((id, i) => {
      const row = new Text({ text: `${i + 1}. ${id}`, style: _rowStyle });
      row.x = 30 + Math.floor(i / 10) * 180;
      row.y = 48 + (i % 10) * 22;
      this._content.addChild(row);
    });
  }

  // ── Input ───────────────────────────────────────────────────────────

  /**
   * OG: CheckSpotInfo (0x9B59A0) — hit iff |nX-(rx-13)| <= w/3 &&
   * |nY-(ry-24)| <= w/3 where w = marker width for the spot's type.
   * nSelectedWMI_TT set on any hit; nSelectedWMI only when a path image exists.
   */
  private _checkSpotInfo(rx: number, ry: number): boolean {
    let hitIndex = -1;
    let hitTT = -1;
    for (let i = 0; i < this._spots.length; i++) {
      const spot = this._spots[i];
      const marker = this._markers[spot.nType];
      const w = marker ? marker.Width : 20;
      const dx = Math.abs(spot.nX - (rx - BASE_X));
      const dy = Math.abs(spot.nY - (ry - BASE_Y));
      if (dx <= w / 3 && dy <= w / 3) {
        hitTT = i;
        if (spot.path) hitIndex = i;
        break;
      }
    }
    const changed = hitIndex !== this._selectedSpot || hitTT !== this._selectedSpotTT;
    this._selectedSpot = hitIndex;
    this._selectedSpotTT = hitTT;
    return changed;
  }

  /** OG: CheckLinkInfo (0x9BAA30) — pixel-alpha test on linkImg; bounding-box fallback. */
  private _checkLinkInfo(rx: number, ry: number): boolean {
    const anchorX = this._mainOrigin.x + BASE_X;
    const anchorY = this._mainOrigin.y + BASE_Y;
    for (let i = 0; i < this._links.length; i++) {
      const link = this._links[i];
      if (!link.linkImg) continue;
      const w = link.linkImg.Width;
      const h = link.linkImg.Height;
      const left = anchorX - link.linkImg.OriginX;
      const top = anchorY - link.linkImg.OriginY;
      if (rx >= left && rx < left + w && ry >= top && ry < top + h) {
        const changed = this._selectedLink !== i;
        this._selectedLink = i;
        return changed;
      }
    }
    const changed = this._selectedLink !== -1;
    this._selectedLink = -1;
    return changed;
  }

  /**
   * OG: CWorldMapDlg::OnMouseMove (0x9BAE40) — calls CheckSpotInfo +
   * CheckLinkInfo, then shows tooltip for the hovered spot or link.
   */
  private _updateToolTip(rx: number, ry: number): void {
    // Spot tooltip
    if (this._selectedSpotTT >= 0) {
      const spot = this._spots[this._selectedSpotTT];
      if (spot && !spot.bNoToolTip && (spot.title || spot.desc)) {
        this._toolTip.setToolTipString2(rx, ry + 20, spot.title, spot.desc);
        return;
      }
    }
    // Link tooltip
    if (this._selectedLink >= 0) {
      const link = this._links[this._selectedLink];
      if (link?.toolTip) {
        this._toolTip.setToolTipString2(rx, ry + 20, link.toolTip, '');
        return;
      }
    }
    this._toolTip.clearToolTip();
  }

  handleMouseButton(mx: number, my: number, down: boolean): boolean {
    if (!this.isVisible) return false;

    const lx = mx - this._root.x;
    const ly = my - this._root.y;

    for (const b of [this._btClose, this._btQuestToggle]) {
      if (b?.handleMouseButton(lx, ly, down)) return true;
    }

    if (!down) return false;

    // Transfer list click
    if (this._transferMapIds.length > 0) {
      const mapId = this._transferIdAt(lx, ly);
      if (mapId !== null) {
        this.isVisible = false;
        this.onTeleportToMap?.(mapId);
        return true;
      }
    }

    // Link click → navigate deeper (OG: clicking a link calls SetWorldMap on the linked map)
    if (this._checkLinkInfo(lx, ly)) {
      const link = this._links[this._selectedLink];
      if (link) {
        this.onNavigateToMap?.(link.linkMap);
        this.navigateTo(link.linkMap);
        return true;
      }
    }

    // Spot click → select (head) only, per OG (world map is informational;
    // teleport happens via the map-transfer list).
    if (this._checkSpotInfo(lx, ly)) {
      return true;
    }

    return lx >= 0 && lx < WM_WIDTH && ly >= 0 && ly < WM_HEIGHT;
  }

  onMouseMove(mx: number, my: number): void {
    if (!this.isVisible) return;
    const lx = mx - this._root.x;
    const ly = my - this._root.y;
    this._checkSpotInfo(lx, ly);
    this._checkLinkInfo(lx, ly);
    this._updateToolTip(lx, ly);
  }

  handleWheel(_dx: number, _dy: number): void {
    // No scrolling in world map
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') {
      this.isVisible = false;
      this._toolTip.clearToolTip();
      return true;
    }
    return true;
  }

  onResize(_w: number, _h: number): void {
    // OG: full-screen dialog
  }

  private _transferIdAt(x: number, y: number): number | null {
    const ids = this._transferMapIds.slice(0, 20);
    for (let i = 0; i < ids.length; i++) {
      const rx = 30 + Math.floor(i / 10) * 180;
      const ry = 48 + (i % 10) * 22;
      if (x >= rx && x < rx + 150 && y >= ry && y < ry + 18) return ids[i];
    }
    return null;
  }

  // ── WZ value helpers ────────────────────────────────────────────────

  private _readInt(v: unknown, fallback = 0): number {
    if (typeof v === 'number') return v;
    if (typeof v === 'bigint') return Number(v);
    return fallback;
  }

  private _readString(v: unknown): string {
    return typeof v === 'string' ? v : '';
  }

  private _readVecX(v: unknown): number {
    if (v && typeof v === 'object' && 'X' in v) return (v as { X: number }).X;
    if (v && typeof v === 'object' && 'x' in v) return (v as { x: number }).x;
    return 0;
  }

  private _readVecY(v: unknown): number {
    if (v && typeof v === 'object' && 'Y' in v) return (v as { Y: number }).Y;
    if (v && typeof v === 'object' && 'y' in v) return (v as { y: number }).y;
    return 0;
  }
}
