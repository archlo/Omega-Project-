import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';

export class WorldMap extends GamePanel {
  private _bg: Graphics;
  private _mapIds: number[] = [];

  /** Click a map ID row to teleport. Caller handles the actual send. */
  onTeleportToMap: ((mapId: number) => void) | null = null;

  constructor() {
    super();
    this.isVisible = false;

    this._bg = new Graphics();
    this._bg.rect(0, 0, 800, 600).fill({  color: '#080A14', alpha: 245 / 255 });
    this._root.addChild(this._bg);

    // No real map content (regions/portal travel) exists yet — this is a
    // standalone feature build, not a wiring gap; see TODO_AUDIT.md.
    const title = new Text({ text: 'World Map', style: new TextStyle({ fill: '#FFE4B5', fontSize: 14, fontFamily: 'monospace' }) });
    title.x = 70; title.y = 8;
    this._root.addChild(title);

    const closeBtn = new Graphics();
    closeBtn.rect(4, 4, 56, 18).fill({ color: '#1E2030', alpha: 0.9 }).stroke({ color: '#505570', width: 1 });
    this._root.addChild(closeBtn);
    const closeLabel = new Text({ text: 'Close', style: new TextStyle({ fill: '#CCC', fontSize: 10, fontFamily: 'monospace' }) });
    closeLabel.x = 14; closeLabel.y = 7;
    this._root.addChild(closeLabel);
  }

  OpenMapTransfer(mapIds: number[]): void {
    // TODO_AUDIT.md Hundred-and-forty-eighth pass: map-transfer result lists
    // now surface inside the existing WorldMap shell instead of toast-only.
    this._mapIds = mapIds;
    this.isVisible = true;
    this._redrawTransferList();
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    if (x >= 4 && x < 60 && y >= 4 && y < 22) { this.isVisible = false; return true; }
    // TODO_AUDIT.md Hundred-and-fifty-second pass: GameStage routes panel clicks
    // through handleMouseButton, not Pixi pointer events, so transfer rows need
    // a direct hit-test to actually send the already-wired map-transfer packet.
    const mapId = this._mapIdAt(x, y);
    if (mapId !== null) { this.isVisible = false; this.onTeleportToMap?.(mapId); }
    return true;
  }

  onKeyPress(key: string): boolean {
    if (key === 'Escape' && this.isVisible) { this.isVisible = false; return true; }
    return false;
  }

  private _redrawTransferList(): void {
    this._root.removeChildren();
    this._root.addChild(this._bg);
    const title = new Text({ text: 'Map Transfer', style: new TextStyle({ fill: '#FFE4B5', fontSize: 14, fontFamily: 'monospace' }) });
    title.x = 70; title.y = 8;
    this._root.addChild(title);
    const closeBtn = new Graphics();
    closeBtn.rect(4, 4, 56, 18).fill({ color: '#1E2030', alpha: 0.9 }).stroke({ color: '#505570', width: 1 });
    this._root.addChild(closeBtn);
    const closeLabel = new Text({ text: 'Close', style: new TextStyle({ fill: '#CCC', fontSize: 10, fontFamily: 'monospace' }) });
    closeLabel.x = 14; closeLabel.y = 7;
    this._root.addChild(closeLabel);
    const ids = this._mapIds.length > 0 ? this._mapIds : [];
    ids.slice(0, 20).forEach((id, i) => {
      const row = new Text({ text: `${i + 1}. ${id}`, style: new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace' }) });
      row.x = 30 + Math.floor(i / 10) * 180;
      row.y = 48 + (i % 10) * 22;
      row.eventMode = 'static';
      row.cursor = 'pointer';
      const mapId = id;
      row.on('pointerdown', () => { this.isVisible = false; this.onTeleportToMap?.(mapId); });
      this._root.addChild(row);
    });
  }

  private _mapIdAt(x: number, y: number): number | null {
    const ids = this._mapIds.slice(0, 20);
    for (let i = 0; i < ids.length; i++) {
      const rx = 30 + Math.floor(i / 10) * 180;
      const ry = 48 + (i % 10) * 22;
      if (x >= rx && x < rx + 150 && y >= ry && y < ry + 18) return ids[i];
    }
    return null;
  }
}
