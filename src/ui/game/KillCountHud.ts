import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';

const PANEL_W = 90;
const PANEL_H = 26;

// OG: CField_KillCount::_UpdateCountInfo (decompile, 0x554900) renders the
// running kill count via per-digit WZ sprite canvases (`m_pLayerCount`),
// same since-deleted numeric-StringPool-resolved asset path as `Clock.ts`'s
// digit display — rendered here as plain text instead, matching that
// established fallback. TODO_AUDIT.md Eighty-third pass's `CField_KillCount`
// finding: WZ-confirmed present (10 maps with info/fieldType===34), opcode
// 178 (`KillCountInfo`).
export class KillCountHud extends GamePanel {
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

  SetCount(count: number): void {
    this._text.text = `Kills: ${count}`;
    this.isVisible = true;
  }

  hide(): void {
    this.isVisible = false;
  }
}
