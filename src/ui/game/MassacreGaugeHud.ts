import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';

const PANEL_W = 90;
const PANEL_H = 26;

// OG: CField_Massacre's gauge/combo display — per-digit WZ sprite canvases,
// same since-deleted numeric-StringPool-resolved asset path as `Clock.ts`'s
// and `KillCountHud.ts`'s digit displays — rendered here as plain text
// instead, matching that established fallback. TODO_AUDIT.md
// Seventy-eighth pass's `CField_Massacre` finding: WZ-confirmed present
// (351 maps with info/fieldType===23), opcode 173 (`MassacreIncGauge`).
export class MassacreGaugeHud extends GamePanel {
  private _bg: Graphics;
  private _text: Text;

  constructor() {
    super();
    this.isVisible = false;
    this._root.x = (800 - PANEL_W) / 2;
    this._root.y = 32;

    this._bg = new Graphics();
    this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0E18', alpha: 200 / 255 });
    this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
    this._root.addChild(this._bg);

    this._text = new Text({
      text: '',
      style: new TextStyle({ fill: '#FFFFFF', fontSize: 13, fontFamily: 'monospace' }),
    });
    this._text.x = PANEL_W / 2;
    this._text.y = PANEL_H / 2;
    this._text.anchor.set(0.5);
    this._root.addChild(this._text);
  }

  SetGauge(gauge: number): void {
    this._text.text = `Gauge: ${gauge}`;
    this.isVisible = true;
  }

  hide(): void {
    this.isVisible = false;
  }
}
