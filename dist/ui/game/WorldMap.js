import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { Button } from '../Button.js';
/**
 * OG: CWorldMapDlg — world map dialog.
 * Decompiled from v95 IDB (OnCreate 0x9B9E10, Draw 0x9BA060,
 * LoadInfo 0x9B7B00, CheckLinkInfo 0x9BAE40, CheckSpotInfo 0x9B59A0,
 * MakeBorder 0x9B6490, ScoreLinkMap 0x9B83B0).
 *
 * WZ: Map.wz/WorldMap.img/<mapName> — contains map image, spots, links.
 * Button IDs: 2=Close, 2000=QuestToggle.
 */
// OG: CWorldMapDlg::OnCreate — close button at (m_width-22, 4), quest toggle at (m_width-65, 4)
const BTN_CLOSE = 2;
const BTN_QUEST_TOGGLE = 2000;
// Spot types (from OG WZ data)
const SPOT_TOWN = 'S';
const SPOT_DUNGEON = 'D';
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 14, fontFamily: 'monospace' });
const _spotStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 9, fontFamily: 'monospace' });
const _linkStyle = new TextStyle({ fill: '#FFD700', fontSize: 9, fontFamily: 'monospace' });
export class WorldMap extends GamePanel {
    // Callbacks
    onTeleportToMap = null;
    onNavigateToMap = null;
    // State
    _mapName = '';
    _spots = [];
    _links = [];
    _mapImage = null;
    _questToggle = false;
    // UI
    _bg;
    _dynamicChildren = [];
    _btClose = null;
    _btQuestToggle = null;
    // WZ packages
    _loader = null;
    _mapWz = null;
    // Map transfer list (from OpenMapTransfer)
    _transferMapIds = [];
    constructor(loader, mapWz) {
        super();
        this.isVisible = false;
        this._loader = loader ?? null;
        this._mapWz = mapWz ?? null;
        this._bg = new Graphics();
        this._rebuildBg();
        this._root.addChild(this._bg);
    }
    /**
     * OG: CWorldMapDlg::LoadInfo (0x9B7B00) — load world map data from WZ.
     * WZ path: Map.wz/WorldMap.img/<mapName>
     */
    openWorldMap(mapName) {
        this._mapName = mapName;
        this._spots = [];
        this._links = [];
        this._mapImage = null;
        this._transferMapIds = [];
        if (!this._loader || !this._mapWz) {
            this.isVisible = true;
            return;
        }
        // Load world map node from WZ
        const worldMapImg = this._mapWz.GetItem('WorldMap.img');
        if (!worldMapImg) {
            this.isVisible = true;
            return;
        }
        const mapNode = worldMapImg.Get(mapName);
        if (!mapNode) {
            this.isVisible = true;
            return;
        }
        // Load map image (OG: "map" child)
        const mapImg = mapNode.Get('map');
        if (mapImg instanceof WzCanvas) {
            this._mapImage = this._loader.Load(mapImg);
        }
        // Load spots (OG: "spot" children)
        const spotNode = mapNode.Get('spot');
        if (spotNode instanceof WzProperty) {
            for (const key of Object.keys(spotNode.Items)) {
                const spotProp = spotNode.Get(key);
                if (!(spotProp instanceof WzProperty))
                    continue;
                const type = this._getStringProp(spotProp, 'type');
                const mapId = this._getNumProp(spotProp, 'mapNo');
                const x = this._getNumProp(spotProp, 'x');
                const y = this._getNumProp(spotProp, 'y');
                const name = this._getStringProp(spotProp, 'desc');
                const hidden = this._getNumProp(spotProp, 'hidden') !== 0;
                if (mapId > 0) {
                    this._spots.push({ type, mapId, x, y, name, hidden });
                }
            }
        }
        // Load links (OG: "link" children)
        const linkNode = mapNode.Get('link');
        if (linkNode instanceof WzProperty) {
            for (const key of Object.keys(linkNode.Items)) {
                const linkProp = linkNode.Get(key);
                if (!(linkProp instanceof WzProperty))
                    continue;
                const linkMap = this._getStringProp(linkProp, 'linkMap');
                const x = this._getNumProp(linkProp, 'x');
                const y = this._getNumProp(linkProp, 'y');
                const width = this._getNumProp(linkProp, 'width');
                const height = this._getNumProp(linkProp, 'height');
                const tooltip = this._getStringProp(linkProp, 'toolTip');
                if (linkMap) {
                    this._links.push({ linkMap, x, y, width: width || 50, height: height || 50, tooltip });
                }
            }
        }
        // Create buttons (OG: OnCreate)
        this._createButtons();
        this.isVisible = true;
    }
    /**
     * OG: CWorldMapDlg map-transfer support.
     * Opens the world map in transfer mode with clickable map IDs.
     */
    OpenMapTransfer(mapIds) {
        this._transferMapIds = mapIds;
        this._spots = [];
        this._links = [];
        this._mapImage = null;
        this.isVisible = true;
        this._createButtons();
    }
    _createButtons() {
        // Remove old buttons
        if (this._btClose) {
            this._btClose.container.destroy();
            this._btClose = null;
        }
        if (this._btQuestToggle) {
            this._btQuestToggle.container.destroy();
            this._btQuestToggle = null;
        }
        // Close button (OG: ID 2, position (m_width-22, 4))
        this._btClose = new Button('Close');
        this._btClose.container.position.set(800 - 22, 4);
        this._btClose.onClick = () => { this.isVisible = false; };
        this._root.addChild(this._btClose.container);
        // Quest toggle button (OG: ID 2000, position (m_width-65, 4))
        this._btQuestToggle = new Button('Quest');
        this._btQuestToggle.container.position.set(800 - 65, 4);
        this._btQuestToggle.onClick = () => { this._questToggle = !this._questToggle; };
        this._root.addChild(this._btQuestToggle.container);
    }
    _getStringProp(node, key) {
        const v = node.Get(key);
        return typeof v === 'string' ? v : '';
    }
    _getNumProp(node, key) {
        const v = node.Get(key);
        return typeof v === 'number' ? v : 0;
    }
    _rebuildBg() {
        this._bg.clear();
        this._bg.rect(0, 0, 800, 600).fill({ color: '#080A14', alpha: 245 / 255 });
        this._bg.rect(0, 0, 800, 600).stroke({ color: '#3C4164', width: 1 });
        this._bg.rect(0, 0, 800, 22).fill({ color: '#0F1224' });
    }
    // --- Drawing ---
    update(_dt) {
        if (!this.isVisible)
            return;
        this.draw();
    }
    draw() {
        if (!this.isVisible)
            return;
        for (const c of this._dynamicChildren)
            c.destroy();
        this._dynamicChildren = [];
        this._rebuildBg();
        // Title
        const title = new Text({ text: this._mapName || 'World Map', style: _titleStyle });
        title.x = 70;
        title.y = 3;
        this._root.addChild(title);
        this._dynamicChildren.push(title);
        // Map image
        if (this._mapImage) {
            const img = this._mapImage.ToPixi();
            img.x = 0;
            img.y = 22;
            this._root.addChild(img);
            this._dynamicChildren.push(img);
        }
        // Transfer list mode
        if (this._transferMapIds.length > 0) {
            this._drawTransferList();
            return;
        }
        // Draw spots (OG: Draw spots with names)
        for (const spot of this._spots) {
            if (spot.hidden)
                continue;
            // Spot marker
            const marker = new Graphics();
            const color = spot.type === SPOT_TOWN ? 0x00FF00 : 0xFF8800;
            marker.circle(spot.x, spot.y + 22, 4).fill({ color });
            this._root.addChild(marker);
            this._dynamicChildren.push(marker);
            // Spot name
            if (spot.name) {
                const label = new Text({ text: spot.name, style: _spotStyle });
                label.x = spot.x + 6;
                label.y = spot.y + 22 - 6;
                this._root.addChild(label);
                this._dynamicChildren.push(label);
            }
        }
        // Draw links (OG: Draw links as clickable rectangles)
        for (const link of this._links) {
            const linkBg = new Graphics();
            linkBg.rect(link.x, link.y + 22, link.width, link.height)
                .fill({ color: 0x3366FF, alpha: 0.2 })
                .stroke({ color: 0x3366FF, width: 1 });
            this._root.addChild(linkBg);
            this._dynamicChildren.push(linkBg);
            if (link.tooltip) {
                const label = new Text({ text: link.tooltip, style: _linkStyle });
                label.x = link.x + 4;
                label.y = link.y + 22 + 4;
                this._root.addChild(label);
                this._dynamicChildren.push(label);
            }
        }
    }
    _drawTransferList() {
        const ids = this._transferMapIds.slice(0, 20);
        ids.forEach((id, i) => {
            const row = new Text({ text: `${i + 1}. ${id}`, style: new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace' }) });
            row.x = 30 + Math.floor(i / 10) * 180;
            row.y = 48 + (i % 10) * 22;
            this._root.addChild(row);
            this._dynamicChildren.push(row);
        });
    }
    // --- Input ---
    handleMouseButton(mx, my, down) {
        if (!this.isVisible)
            return false;
        // WZ buttons first
        for (const b of [this._btClose, this._btQuestToggle]) {
            if (b?.handleMouseButton(mx - this._root.x, my - this._root.y, down))
                return true;
        }
        const lx = mx - this._root.x;
        const ly = my - this._root.y;
        if (!down)
            return false;
        // Transfer list click
        if (this._transferMapIds.length > 0) {
            const mapId = this._transferIdAt(lx, ly);
            if (mapId !== null) {
                this.isVisible = false;
                this.onTeleportToMap?.(mapId);
                return true;
            }
        }
        // Spot click (OG: CheckSpotInfo)
        for (const spot of this._spots) {
            if (spot.hidden)
                continue;
            const dx = lx - spot.x;
            const dy = ly - (spot.y + 22);
            if (dx * dx + dy * dy < 100) { // 10px radius
                this.onTeleportToMap?.(spot.mapId);
                return true;
            }
        }
        // Link click (OG: CheckLinkInfo)
        for (const link of this._links) {
            if (lx >= link.x && lx < link.x + link.width &&
                ly >= link.y + 22 && ly < link.y + 22 + link.height) {
                this.onNavigateToMap?.(link.linkMap);
                return true;
            }
        }
        return lx >= 0 && lx < 800 && ly >= 0 && ly < 600;
    }
    onMouseMove(_mx, _my) {
        // Hover tooltip could be added here
    }
    handleWheel(_dx, _dy) {
        // No scrolling in world map
    }
    onKeyPress(key) {
        if (!this.isVisible)
            return false;
        if (key === 'Escape') {
            this.isVisible = false;
            return true;
        }
        return true;
    }
    onResize(_w, _h) {
        // OG: full-screen dialog
    }
    _transferIdAt(x, y) {
        const ids = this._transferMapIds.slice(0, 20);
        for (let i = 0; i < ids.length; i++) {
            const rx = 30 + Math.floor(i / 10) * 180;
            const ry = 48 + (i % 10) * 22;
            if (x >= rx && x < rx + 150 && y >= ry && y < ry + 18)
                return ids[i];
        }
        return null;
    }
}
//# sourceMappingURL=WorldMap.js.map