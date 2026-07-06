import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';

const PANEL_W = 280;
const PANEL_H = 200;

/** Minimal status panel for the Tournament opcode family (374-377,
 *  `CField_Tournament::OnPacket`, decompile/563780.c). No `Tournament.img`
 *  WZ panel art is confirmed anywhere in this client's asset pipeline, and
 *  two of the four real sub-handlers (`OnTournament`/`OnTournamentSetPrize`/
 *  `OnTournamentUEW`) are pure one-shot client-side notice strings rather
 *  than persistent state — so, same pattern as `WorldMap.ts`/`FamilyWindow`'s
 *  no-WZ-art fallback, this renders a plain-Graphics panel that just stacks
 *  the most recent notice/result line from each opcode rather than building
 *  speculative bracket/standings UI nothing in this decompile confirms the
 *  shape of (`TournamentMatchTable`'s own field shape is unconfirmed — see
 *  TODO_AUDIT.md). */
export class TournamentWindow extends GamePanel {
  private _bg: Graphics;
  private _lines: Text[] = [];
  private _lastInfo = '';
  private _lastMatchTable = '';
  private _lastSetPrize = '';
  private _lastUew = '';

  constructor() {
    super();
    this.isVisible = false;
    this.container.position.set(260, 200);

    this._bg = new Graphics();
    this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#101426', alpha: 240 / 255 }).stroke({ color: '#4A4F70', width: 1 });
    this._root.addChild(this._bg);

    const title = new Text({ text: 'Tournament', style: new TextStyle({ fill: '#FFE4B5', fontSize: 13, fontFamily: 'monospace' }) });
    title.position.set(10, 6);
    this._root.addChild(title);

    const closeLabel = new Text({ text: '[x]', style: new TextStyle({ fill: '#CCCCCC', fontSize: 11, fontFamily: 'monospace' }) });
    closeLabel.position.set(PANEL_W - 26, 6);
    this._root.addChild(closeLabel);

    this._redrawLines();
  }

  setInfo(text: string): void { this._lastInfo = text; this._redrawLines(); }
  setMatchTable(text: string): void { this._lastMatchTable = text; this._redrawLines(); }
  setSetPrize(text: string): void { this._lastSetPrize = text; this._redrawLines(); }
  setUew(text: string): void { this._lastUew = text; this._redrawLines(); }

  private _redrawLines(): void {
    for (const t of this._lines) t.destroy();
    this._lines = [];
    const style = new TextStyle({ fill: '#D8DCE8', fontSize: 11, fontFamily: 'monospace', wordWrap: true, wordWrapWidth: PANEL_W - 20 });
    const rows: [string, string][] = [
      ['Info', this._lastInfo],
      ['MatchTable', this._lastMatchTable],
      ['SetPrize', this._lastSetPrize],
      ['UEW', this._lastUew],
    ];
    let y = 32;
    for (const [label, value] of rows) {
      const t = new Text({ text: `${label}: ${value || '(none yet)'}`, style });
      t.position.set(10, y);
      this._root.addChild(t);
      this._lines.push(t);
      y += 38;
    }
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const px = this.container.position.x;
    const py = this.container.position.y;
    const lx = x - px;
    const ly = y - py;
    if (lx < 0 || lx >= PANEL_W || ly < 0 || ly >= PANEL_H) return false;
    if (!down) return true;
    if (lx >= PANEL_W - 26 && lx < PANEL_W - 4 && ly >= 4 && ly < 20) { this.isVisible = false; return true; }
    return true;
  }

  onKeyPress(key: string): boolean {
    if (key === 'Escape' && this.isVisible) { this.isVisible = false; return true; }
    return false;
  }
}
