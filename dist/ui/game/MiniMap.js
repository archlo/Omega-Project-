import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { Button } from '../Button.js';
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
class FrameSet {
    nw = null;
    n = null;
    ne = null;
    w = null;
    c = null;
    e = null;
    sw = null;
    s = null;
    se = null;
    get borderL() { return this.w?.width ?? 9; }
    get borderR() { return this.e?.width ?? 9; }
    get borderB() { return this.s?.height ?? 9; }
    get titleH() { return this.n?.height ?? 21; }
    get nwW() { return this.nw?.width ?? 64; }
}
// localStorage key for CUIWnd position (OG: CreateUIWndPosSaved with key 10)
const PosSaveKey = 'MiniMapWndPos';
export class MiniMap extends GamePanel {
    // OG: m_nOption — 0=normal, 1=huge, 2=collapsed
    _mode = 0;
    _prevMode = 1;
    _mapName = '';
    _streetName = '';
    _mapId = 0;
    _data = null;
    // OG: m_nMiniMapType — set in constructor, affects button layout
    _miniMapType = 0;
    // OG: m_nMag — current magnification level (0=normal, 1=2X zoom)
    _mag = 0;
    // OG: m_nMag_Normal — magnification for normal mode
    _magNormal = 0;
    // OG: m_nMag_2X — magnification for 2X mode
    _mag2X = 1;
    // OG: m_dwFieldID — current field ID for tracking map changes
    _fieldId = 0;
    // OG: m_bShowMiniMap — whether minimap is visible
    _showMiniMap = true;
    // OG: m_dwSearchedShop — last searched shop ID
    _searchedShop = 0;
    // OG: m_bCreated — whether minimap has been created/initialized
    _created = false;
    // OG: saved window position from CUIWndPosSaved
    _savedX = null;
    _savedY = null;
    // OG: Remote player names (m_strRemoteNW/N/NE) — names displayed near minimap edges
    _remoteNameNW = '';
    _remoteNameN = '';
    _remoteNameNE = '';
    _minMap = new FrameSet();
    _maxMap = new FrameSet();
    _stripW;
    _stripC;
    _stripE;
    _markers;
    // OG: m_pBtMinimize(1000), m_pBtMaximize(1001), m_pBtWorldMap(1002), m_pBt2X(1003)
    _btMin;
    _btMax;
    _btMap;
    _bt2X;
    _buttons = [];
    _font;
    // OG: m_pFont — main font for minimap text
    _wzFont = null;
    // OG: m_pFontMapName — font for map name display
    _wzFontMapName = null;
    // OG: m_pFontMapNameBack — font for map name background/shadow
    _wzFontMapNameBack = null;
    // OG: m_pPropFieldInfo — field info property for minimap data
    _propFieldInfo = null;
    // OG: m_pPropField — field property for minimap data
    _propField = null;
    // OG: m_pSimple_Canvas — simple mode minimap canvas
    _simpleCanvas = null;
    // OG: m_pSimple_Canvas_Huge — simple mode huge minimap canvas
    _simpleCanvasHuge = null;
    _gfx;
    _content;
    playerWorldPos = { x: 0, y: 0 };
    _npcs = [];
    _others = [];
    _partyMembers = [];
    _portals = [];
    _merchants = [];
    // OG: m_mStalkee (characterId → POINT) + m_mStalkeeName (characterId → name)
    // Stalkees are followed players shown with name labels on the minimap.
    _stalkees = new Map();
    // OG: OnMouseButton sends packet when clicking player dot
    onPlayerDotClick = null;
    // OG: m_pField — live foothold dictionary for dynamic foothold state rendering
    _footholds = null;
    constructor(loader, ui, font) {
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
        }
        catch { }
        const mm = ui?.GetItem('UIWindow2.img/MiniMap');
        this._loadFrame(loader, mm?.Get('MinMap'), this._minMap);
        this._loadFrame(loader, mm?.Get('MaxMap'), this._maxMap);
        const strip = mm?.Get('Min');
        this._stripW = this._loadCanvas(loader, strip, 'w');
        this._stripC = this._loadCanvas(loader, strip, 'c');
        this._stripE = this._loadCanvas(loader, strip, 'e');
        this._markers = new MiniMapMarkers(loader, ui);
        // OG: Simple mode canvas from MiniMapSimpleMode
        const simpleRoot = ui?.GetItem('UIWindow2.img/MiniMapSimpleMode');
        this._simpleCanvas = this._loadWzSprite(loader, simpleRoot, 'canvas');
        this._simpleCanvasHuge = this._loadWzSprite(loader, simpleRoot, 'canvasHuge');
        // OG button IDs: 1000=minimize, 1001=maximize, 1002=worldmap, 1003=2X
        this._btMin = this._makeBtn(loader, mm, 'BtMin', () => this._onBtMinimize());
        this._btMax = this._makeBtn(loader, mm, 'BtMax', () => this._onBtMaximize());
        this._btMap = this._makeBtn(loader, mm, 'BtMap', () => this._onBtWorldMap());
        // OG: SetCtrl_Simple loads Bt2X from MiniMapSimpleMode/Button/Bt2X, not MiniMap root
        const simpleBtnRoot = ui?.GetItem('UIWindow2.img/MiniMapSimpleMode/Button');
        this._bt2X = this._makeBtn(loader, simpleBtnRoot ?? mm, 'Bt2X', () => this._onBt2X());
        // OG: Load fonts from WZ (m_pFont, m_pFontMapName, m_pFontMapNameBack)
        // Font paths from CUIMiniMap::OnCreate
        this._loadFonts(ui);
        this._gfx = new Graphics();
        this._content = new Container();
        this._root.addChild(this._gfx, this._content);
    }
    _loadFrame(loader, root, f) {
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
    _loadCanvas(loader, root, name) {
        const c = root?.Get(name);
        return c instanceof WzCanvas ? loader.Load(c)?.ToPixi() ?? null : null;
    }
    // OG: Load a WzSprite (for simple mode canvas)
    _loadWzSprite(loader, root, name) {
        const c = root?.Get(name);
        return c instanceof WzCanvas ? loader.Load(c) ?? null : null;
    }
    _makeBtn(loader, root, name, onClick) {
        const pr = root?.Get(name);
        if (!pr)
            return null;
        const b = Button.fromWz(loader, pr);
        b.onClick = onClick;
        this._buttons.push(b);
        return b;
    }
    // OG: Load fonts from WZ (m_pFont, m_pFontMapName, m_pFontMapNameBack)
    // Font paths from CUIMiniMap::OnCreate — loads from MiniMap/WzFont
    _loadFonts(ui) {
        if (!ui)
            return;
        // OG: Font loading from MiniMap/WzFont subtree
        const fontRoot = ui.GetItem('UIWindow2.img/MiniMap/WzFont');
        if (fontRoot) {
            this._wzFont = fontRoot.Get('Normal');
            this._wzFontMapName = fontRoot.Get('MapName');
            this._wzFontMapNameBack = fontRoot.Get('MapNameBack');
        }
    }
    // OG: OnButtonClicked 1000 — ToggleMiniMapState
    _onBtMinimize() {
        if (!this.isVisible)
            return;
        this._prevMode = this._mode;
        if (this._miniMapType === 1) {
            // OG: m_nMiniMapType=1 → always (m_nOption + 2) % 3
            this._mode = ((this._mode + 2) % 3);
        }
        else {
            // OG: m_nMiniMapType=0 → if option==0: jump to 2; else: (option+1)%3
            if (this._mode === 0) {
                this._mode = 2;
            }
            else {
                this._mode = ((this._mode + 1) % 3);
            }
        }
        // OG: if collapsed, force prevMode=1 so maximize restores to huge
        if (this._mode === 2)
            this._prevMode = 1;
    }
    // OG: OnButtonClicked 1001 — restore previous mode
    // OG decompilation: m_nOption = m_nPrevOption; then ToggleMap()
    _onBtMaximize() {
        if (!this.isVisible)
            return;
        this._mode = this._prevMode;
    }
    // OG: OnButtonClicked 1002 — world map dialog
    // Wired from GameStage to toggle the WorldMap panel.
    onBtWorldMap = null;
    _onBtWorldMap() {
        this.onBtWorldMap?.();
    }
    // OG: OnButtonClicked 1003 — toggle 2X mode
    _onBt2X() {
        // OG: SetCtrl_Simple toggles between m_nOption 0 (normal) and 1 (huge)
        // This also switches between m_nMag_Normal and m_nMag_2X
        if (this._mode === 0) {
            this._mode = 1;
            this._mag = this._mag2X;
        }
        else {
            this._mode = 0;
            this._mag = this._magNormal;
        }
    }
    setMapData(data, mapName, regionName) {
        this._data = data;
        this._streetName = regionName;
        this._mapName = mapName;
    }
    setMapInfo(street, map, mapId = 0) {
        this._streetName = street;
        this._mapName = map;
        this._mapId = mapId;
    }
    setField(data, street, map, mapId = 0) {
        this._data = data;
        this._streetName = street;
        this._mapName = map;
        this._mapId = mapId;
        // OG: SetFieldID — track current field ID
        this._fieldId = mapId;
        // OG: Reset searched shop when changing maps
        this._searchedShop = 0;
    }
    setNpcs(npcs) {
        this._npcs.length = 0;
        for (const n of npcs)
            this._npcs.push({ x: n.x, y: n.y, quest: n.quest ?? false });
    }
    setOtherPlayers(p) {
        this._others.length = 0;
        this._others.push(...p);
    }
    setPartyMembers(p) {
        this._partyMembers.length = 0;
        this._partyMembers.push(...p);
    }
    setPortals(portals) {
        this._portals.length = 0;
        this._portals.push(...portals);
    }
    setMerchants(merchants) {
        this._merchants.length = 0;
        this._merchants.push(...merchants);
    }
    // OG: InsertStalkee(dwCharacterID, strName, pt) — adds a followed player
    // to m_mStalkee (position) and m_mStalkeeName (name). Drawn with the
    // friend icon + name label in Update.
    insertStalkee(id, name, x, y) {
        this._stalkees.set(id, { x, y, name });
    }
    // OG: RemoveStalkee(dwCharacterID) — removes from both maps.
    removeStalkee(id) {
        this._stalkees.delete(id);
    }
    // OG: SetMiniMapType — m_nMiniMapType 0=simple, 1=normal
    // Affects button layout: simple has 2X button, normal has min/max/worldmap
    setMiniMapType(type) {
        this._miniMapType = type;
    }
    // OG: ToggleMiniMapState — cycles m_nOption with (m_nOption + 2) % 3
    cycleMode() {
        this.isVisible = true;
        this._prevMode = this._mode;
        this._mode = ((this._mode + 2) % 3);
        if (this._mode === 2)
            this._prevMode = 1;
    }
    // OG: SetShowMiniMap — shows/hides the minimap (m_bShowMiniMap)
    setShowMiniMap(show) {
        this._showMiniMap = show;
        this.isVisible = show;
    }
    // Live foothold reference for dynamic foothold state (disabled/moving)
    setFootholds(footholds) {
        this._footholds = footholds;
    }
    // OG: SetFieldID — updates the current field ID (m_dwFieldID)
    setFieldId(id) {
        this._fieldId = id;
    }
    // OG: Remote player names displayed near minimap edges
    setRemoteNames(nw, n, ne) {
        this._remoteNameNW = nw;
        this._remoteNameN = n;
        this._remoteNameNE = ne;
    }
    // OG: SetSearchedShop — tracks last searched shop (m_dwSearchedShop)
    setSearchedShop(shopId) {
        this._searchedShop = shopId;
    }
    // OG: CalculateScr — computes screen origin (m_nScrOrig_X/Y) from local player position
    // Called before drawing to determine which part of the map to show.
    // Formula: scrOrig = (realCX + clamp(localX - (paneW << mag) / 2, -realCX, realW - realCX - paneW*2^mag)) >> mag
    _calculateScr(localPos, paneW, paneH, mag) {
        if (!this._data)
            return { x: 0, y: 0 };
        const realW = this._data.Real_W;
        const realH = this._data.Real_H;
        const realCX = this._data.Real_CX;
        const realCY = this._data.Real_CY;
        // X calculation
        const scaledPaneW = paneW << mag;
        let scrOrigX = localPos.x - Math.floor(scaledPaneW / 2);
        // Clamp: if scrOrigX < -realCX, set to -realCX
        if (scrOrigX < -realCX)
            scrOrigX = -realCX;
        // Clamp: if scrOrigX > realW - realCX - scaledPaneW, set to that
        const maxX = realW - realCX - scaledPaneW;
        if (scrOrigX > maxX)
            scrOrigX = maxX;
        // Final: (realCX + scrOrigX) >> mag
        scrOrigX = (realCX + scrOrigX) >> mag;
        // Y calculation (same pattern)
        const scaledPaneH = paneH << mag;
        let scrOrigY = localPos.y - Math.floor(scaledPaneH / 2);
        if (scrOrigY < -realCY)
            scrOrigY = -realCY;
        const maxY = realH - realCY - scaledPaneH;
        if (scrOrigY > maxY)
            scrOrigY = maxY;
        scrOrigY = (realCY + scrOrigY) >> mag;
        return { x: scrOrigX, y: scrOrigY };
    }
    // OG: TransformPoint — transforms world coordinates to minimap screen coordinates
    // Formula: screenX = (worldX + realCX) >> mag - scrOrigX
    _transformPoint(world, scrOrig, mag) {
        if (!this._data)
            return { x: 0, y: 0 };
        const realCX = this._data.Real_CX;
        const realCY = this._data.Real_CY;
        return {
            x: ((world.x + realCX) >> mag) - scrOrig.x,
            y: ((world.y + realCY) >> mag) - scrOrig.y,
        };
    }
    update(_dt) {
        try {
            const win = this._winRect();
            this._layoutButtons(win);
            this.draw();
        }
        catch (e) {
            console.warn('MiniMap.update error:', e);
        }
    }
    draw() {
        if (!this.isVisible || !this._showMiniMap)
            return;
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
        const frame = isHuge ? this._maxMap : this._minMap;
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
        // OG: Remote player names (m_strRemoteNW/N/NE) displayed near minimap edges
        this._drawRemoteNames(win);
        // Buttons are positioned by _layoutButtons, just add to content
        for (const b of this._buttons) {
            this._content.addChild(b.container);
        }
        // OG: CUIWndPosSaved — save position to localStorage
        this._savePosition();
    }
    // OG: Save window position for CUIWndPosSaved
    _savePosition() {
        const pos = this._root.position;
        this._savedX = pos.x;
        this._savedY = pos.y;
        try {
            localStorage.setItem(PosSaveKey, JSON.stringify({ x: pos.x, y: pos.y }));
        }
        catch { }
    }
    _drawMapAndIcons(pane, scale) {
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
        let mapX;
        let mapY;
        if (mapW <= pane.width) {
            // Map fits in pane — center it
            mapX = pane.x + Math.floor((pane.width - mapW) / 2);
        }
        else {
            // Map is larger than pane — scroll based on scrOrig
            mapX = pane.x - Math.floor(scrOrig.x * scale);
        }
        if (mapH <= pane.height) {
            // Map fits in pane — center it
            mapY = pane.y + Math.floor((pane.height - mapH) / 2);
        }
        else {
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
        if (this._data && this._data.Footholds.length > 0) {
            this._drawFootholds(pane, scrOrig, mag, scale);
        }
        // OG: LoadLadderRope — draw ladders/ropes on minimap
        if (this._data && this._data.LadderRopes.length > 0) {
            this._drawLadderRopes(pane, scrOrig, mag, scale);
        }
        // OG: DrawIcons — entity icons drawn in specific order from Update
        // 1. Portals
        for (const p of this._portals)
            this._drawMarker(pane, scrOrig, mag, scale, p, this._markers.getIcon(this._miniMapType, 'Portal'), false);
        // 2. NPCs (m_aPtNpc) — with quest icons
        for (const n of this._npcs)
            this._drawMarker(pane, scrOrig, mag, scale, n, n.quest ? (this._markers.getIcon(this._miniMapType, 'NpcStart') ?? this._markers.getIcon(this._miniMapType, 'Npc')) : this._markers.getIcon(this._miniMapType, 'Npc'), false);
        // 3. Remote users (CUserPool) — RemoteUser icon
        for (const o of this._others)
            this._drawMarker(pane, scrOrig, mag, scale, o, this._markers.getIcon(this._miniMapType, 'RemoteUser'), true);
        // 4. Party members
        for (const m of this._partyMembers)
            this._drawMarker(pane, scrOrig, mag, scale, m, m.isLeader ? this._markers.getIcon(this._miniMapType, 'PartyMaster') : this._markers.getIcon(this._miniMapType, 'Party'), true);
        // 5. Stalkees (m_mStalkee) — followed players with name labels
        for (const [, s] of this._stalkees) {
            this._drawMarker(pane, scrOrig, mag, scale, s, this._markers.getIcon(this._miniMapType, 'Friend'), true);
            this._drawStalkeeName(pane, scrOrig, mag, scale, s);
        }
        // 6. Shop employees (CEmployeePool) — ShopRemote icon
        for (const m of this._merchants)
            this._drawMarker(pane, scrOrig, mag, scale, m, this._markers.getIcon(this._miniMapType, 'ShopRemote'), false);
        // 7. Player — draws last (on top)
        this._drawMarker(pane, scrOrig, mag, scale, this.playerWorldPos, this._markers.getIcon(this._miniMapType, 'User'), false);
    }
    // OG: MakeConvexLayer — renders foothold segments as lines on the minimap.
    // Each foothold is drawn as a line connecting its two endpoints.
    // Looks up live positions from FieldScene.Footholds so dynamic foothold
    // state changes (ApplyFootHoldState) are reflected on the minimap.
    _drawFootholds(pane, scrOrig, mag, scale) {
        const gfx = this._gfx;
        for (const fh of this._data.Footholds) {
            // Look up live foothold — skip if not found or disabled (State===0)
            const live = this._footholds?.[fh.footholdId] ?? null;
            if (!live || live.State === 0)
                continue;
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
    _drawLadderRopes(pane, scrOrig, mag, scale) {
        const gfx = this._gfx;
        for (const lr of this._data.LadderRopes) {
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
    _drawMarker(pane, scrOrig, mag, scale, world, icon, clamp) {
        if (!icon || !this._data)
            return;
        // OG: TransformPoint — convert world to minimap screen coords
        const c = this._transformPoint(world, scrOrig, mag);
        const px = pane.x + c.x * scale;
        const py = pane.y + c.y * scale;
        const inside = px >= pane.x && px <= pane.x + pane.width && py >= pane.y && py <= pane.y + pane.height;
        if (inside) {
            this._drawIconBottomCentre(icon, px, py);
            return;
        }
        if (!clamp)
            return;
        // OG: CalcAngle-based edge arrow selection
        const centerX = pane.x + pane.width / 2;
        const centerY = pane.y + pane.height / 2;
        const arrow = this._markers.calcAngleEdgeArrow(px, py, centerX, centerY, pane.x, pane.y, pane.width, pane.height);
        if (!arrow)
            return;
        const cx = Math.max(pane.x, Math.min(px, pane.x + pane.width));
        const cy = Math.max(pane.y, Math.min(py, pane.y + pane.height));
        this._drawIconBottomCentre(arrow, cx, cy);
    }
    _drawIconBottomCentre(icon, px, py) {
        const w = icon.Width * MarkerScale;
        const h = icon.Height * MarkerScale;
        const s = icon.ToPixi();
        s.width = w;
        s.height = h;
        s.position.set(px - Math.floor(w / 2), py - h);
        this._content.addChild(s);
    }
    // OG: stalkee name label drawn below the friend icon
    _drawStalkeeName(pane, scrOrig, mag, scale, stalkee) {
        if (!this._data || !stalkee.name)
            return;
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
    // OG: Remote player names (m_strRemoteNW/N/NE) displayed near minimap edges
    // These are names of players in adjacent maps shown at the minimap border.
    _drawRemoteNames(win) {
        const fontSize = 8;
        const style = new TextStyle({ fill: 0xaaaa82, fontSize, fontFamily: 'monospace' });
        // NW name — top-left corner below title
        if (this._remoteNameNW) {
            const t = new Text({ text: this._remoteNameNW, style });
            t.position.set(win.x + 4, win.y + 20);
            this._content.addChild(t);
        }
        // N name — top-center
        if (this._remoteNameN) {
            const t = new Text({ text: this._remoteNameN, style });
            t.anchor.set(0.5, 0);
            t.position.set(win.x + win.width / 2, win.y + 20);
            this._content.addChild(t);
        }
        // NE name — top-right corner
        if (this._remoteNameNE) {
            const t = new Text({ text: this._remoteNameNE, style });
            t.anchor.set(1, 0);
            t.position.set(win.x + win.width - 4, win.y + 20);
            this._content.addChild(t);
        }
    }
    _drawCollapsed(win) {
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
        }
        else {
            this._gfx.rect(win.x, win.y, win.width, win.height).fill({ color: 0x11111c, alpha: 0.95 });
        }
        this._drawTitle(win, this._stripW?.width ?? 64, StripH);
        // OG: Position buttons at right side of strip (same as expanded mode)
        const borderR = this._stripE?.width ?? 9;
        let bx = win.x + win.width - borderR - this._buttonsWidth() + BtnGap;
        const by = win.y + Math.max(2, Math.floor((StripH - 12) / 2));
        for (const b of this._buttons) {
            b.container.position.set(bx, by);
            bx += b.width + BtnGap;
            this._content.addChild(b.container);
        }
    }
    _drawTitle(win, tabW, bandH) {
        const title = this._mapName;
        if (!title)
            return;
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
                const borderR = isHuge ? this._maxMap.borderR : this._minMap.borderR;
                const idX = win.x + win.width - this._buttonsWidth() - borderR - idW - 4;
                const idTxt = new Text({ text: idText, style: new TextStyle({ fill: 0xaaaa82, fontSize: 10, fontFamily: 'monospace' }) });
                idTxt.position.set(idX, win.y + 4 + 12);
                this._content.addChild(idTxt);
            }
        }
        else {
            // Fallback: just map name centered
            const ty = win.y + Math.floor((bandH - 12) / 2);
            const t = new Text({ text: title, style: new TextStyle({ fill: 0xffffff, fontSize: 10, fontFamily: 'monospace' }) });
            t.position.set(tx, ty);
            this._content.addChild(t);
        }
    }
    _drawFrame(f, win) {
        if (f.nw) {
            f.nw.position.set(win.x, win.y);
            this._content.addChild(f.nw);
        }
        if (f.ne) {
            f.ne.position.set(win.x + win.width - f.ne.width, win.y);
            this._content.addChild(f.ne);
        }
        if (f.sw) {
            f.sw.position.set(win.x, win.y + win.height - f.sw.height);
            this._content.addChild(f.sw);
        }
        if (f.se) {
            f.se.position.set(win.x + win.width - f.se.width, win.y + win.height - f.se.height);
            this._content.addChild(f.se);
        }
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
    _winRect() {
        // OG: Window rect in local coordinates (relative to _root)
        // _root.position handles the screen offset, so _winRect returns local (0,0)
        const x = 0;
        const y = 0;
        // OG: m_nOption 2 = collapsed → just the title strip
        if (this._mode === 2) {
            const nameW = this._font && this._mapName ? this._font.measure(this._mapName).x : 0;
            const tabW = this._stripW?.width ?? 64;
            const w = Math.max(160, tabW + nameW + 6 + this._buttonsWidth() + TitlePadRight);
            return { x, y, width: w, height: StripH };
        }
        // OG: SetSize logic — m_nOption=0 with m_nMiniMapType=0 → huge (2x)
        // m_nOption=1 with m_nMiniMapType=0 → normal (1x)
        // m_nMiniMapType=1 always → normal (1x)
        const isHuge = this._miniMapType === 0 && this._mode === 0;
        const frame = isHuge ? this._maxMap : this._minMap;
        const scale = isHuge ? 2 : 1;
        // OG: SetSize caps pane based on canvas dimensions
        // Normal: W≥280→cap 210, H≥150→cap 112
        // Huge: W≥560→cap 420, H≥300→cap 225
        const cw = this._data?.CanvasWidth ?? 180;
        const ch = this._data?.CanvasHeight ?? 120;
        let paneW;
        let paneH;
        if (isHuge) {
            // Huge mode: canvas*2, capped at 420 if >= 560
            const hugeW = cw * 2;
            const hugeH = ch * 2;
            paneW = hugeW >= 560 ? HugePaneCapW : hugeW;
            paneH = hugeH >= 300 ? HugePaneCapH : hugeH;
        }
        else {
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
    _buttonsWidth() {
        let w = 0;
        for (const b of [this._btMin, this._btMax, this._btMap, this._bt2X]) {
            if (b)
                w += b.width + BtnGap;
        }
        return w;
    }
    // OG: SetCtrl positions buttons at (width-46,4), (width-59,4), (width-72,4)
    // and disables the inactive one based on m_nOption + m_nMiniMapType
    _layoutButtons(win) {
        const isHuge = this._miniMapType === 0 && this._mode === 0;
        const borderR = this._mode === 2 ? (this._stripE?.width ?? 9)
            : isHuge ? this._maxMap.borderR : this._minMap.borderR;
        const bandH = this._mode === 2 ? StripH
            : isHuge ? this._maxMap.titleH : this._minMap.titleH;
        let bx = win.x + win.width - borderR - this._buttonsWidth() + BtnGap;
        const by = win.y + Math.max(2, Math.floor((Math.min(bandH, 21) - 12) / 2));
        for (const b of [this._btMin, this._btMax, this._btMap, this._bt2X]) {
            if (!b)
                continue;
            b.container.position.set(bx, by);
            bx += b.width + BtnGap;
        }
        // OG: SetCtrl / SetCtrl_Simple button visibility + enable/disable
        if (this._miniMapType === 1) {
            // OG: m_nMiniMapType=1 — has min/max/worldmap, no 2X
            if (this._btMin)
                this._btMin.container.visible = true;
            if (this._btMax)
                this._btMax.container.visible = true;
            if (this._bt2X)
                this._bt2X.container.visible = false;
            if (this._btMap)
                this._btMap.container.visible = true;
            // OG: disable inactive button based on current mode
            if (this._btMin)
                this._btMin.enabled = this._mode !== 2;
            if (this._btMax)
                this._btMax.enabled = this._mode !== 0;
            // OG: when !m_bShowMiniMap, both min and max disabled
            // (m_bShowMiniMap is true when visible, so this is implicit)
        }
        else {
            // OG: m_nMiniMapType=0 — has worldmap/minimize/2X, no maximize
            if (this._btMin)
                this._btMin.container.visible = true;
            if (this._btMax)
                this._btMax.container.visible = false;
            if (this._bt2X)
                this._bt2X.container.visible = this._mode !== 2;
            if (this._btMap)
                this._btMap.container.visible = true;
            // OG: in simple mode, enable/disable based on mode
            if (this._btMin)
                this._btMin.enabled = this._mode !== 2;
        }
    }
    // OG: OnMouseButton — checks if click is on player dot, fires callback
    handleMouseButton(x, y, down) {
        if (!this.isVisible)
            return false;
        for (const b of this._buttons) {
            if (b.handleMouseButton(x, y, down))
                return true;
        }
        const win = this._winRect();
        const hit = x >= win.x && x < win.x + win.width && y >= win.y && y < win.y + win.height;
        if (hit && !down && this.onPlayerDotClick && this._data) {
            // OG: Calculate screen position of player icon and check if click is on it
            const isHuge = this._miniMapType === 0 && this._mode === 0;
            const frame = isHuge ? this._maxMap : this._minMap;
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
//# sourceMappingURL=MiniMap.js.map