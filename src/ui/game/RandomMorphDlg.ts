import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';

// OG: CUIRandomMorphDlg (0xA1E8C0–0xA1EC6A).
// Client-side preview dialog showing a white rectangle (300×131) with morph info.
// Opened via ShowDlg(nPOS, nItemID) — singleton pattern (TSingleton<CUniqueModeless>).

const PANEL_W = 300;
const PANEL_H = 131;
const _titleStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace' });

export class RandomMorphDlg extends GamePanel {
  private _bg = new Graphics();
  private _label = new Text({ text: 'Random Morph Preview', style: _titleStyle });
  private _closeLabel = new Text({
    text: '[ Close ]',
    style: new TextStyle({ fill: '#D8D8D8', fontSize: 10, fontFamily: 'monospace' }),
  });
  private _nItemID = 0;
  private _nPOS = 0;

  constructor() {
    super();
    this._root.position.set(270, 200);
    this._label.position.set(10, 10);
    this._closeLabel.position.set(PANEL_W - 70, PANEL_H - 24);
    this._root.addChild(this._bg, this._label, this._closeLabel);
    this._drawBg();
    this.isVisible = false;
  }

  /** OG: CUIRandomMorphDlg::ShowDlg — opens or focuses the singleton. */
  static ShowDlg(nPOS: number, nItemID: number): void {
    const inst = RandomMorphDlg._instance;
    if (inst) {
      inst._nPOS = nPOS;
      inst._nItemID = nItemID;
      inst._refresh();
      inst.isVisible = true;
    }
  }
  private static _instance: RandomMorphDlg | null = null;
  static get instance(): RandomMorphDlg | null { return RandomMorphDlg._instance; }

  /** OG: ShowDlg allocates; we construct once and reuse. */
  static Init(): RandomMorphDlg {
    if (!RandomMorphDlg._instance) {
      RandomMorphDlg._instance = new RandomMorphDlg();
    }
    return RandomMorphDlg._instance;
  }

  /** OG: CUIRandomMorphDlg::Draw — fills white rect + CWnd::Draw. */
  private _drawBg(): void {
    this._bg.clear();
    this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: 0xFFFFFF });
    this._bg.rect(0, 0, PANEL_W, 1).fill({ color: 0x888888 });
    this._bg.rect(0, PANEL_H - 1, PANEL_W, 1).fill({ color: 0x888888 });
    this._bg.rect(0, 0, 1, PANEL_H).fill({ color: 0x888888 });
    this._bg.rect(PANEL_W - 1, 0, 1, PANEL_H).fill({ color: 0x888888 });
  }

  private _refresh(): void {
    this._label.text = `Morph Preview [item: ${this._nItemID}]`;
  }

  /** OG: _CloseDlg — sets m_bTerminate=1, hides. */
  private _close(): void {
    this.isVisible = false;
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    const lx = x - this._root.position.x;
    const ly = y - this._root.position.y;
    // Close button region
    if (lx >= PANEL_W - 76 && lx < PANEL_W - 4 && ly >= PANEL_H - 28 && ly < PANEL_H - 4) {
      this._close();
      return true;
    }
    return lx >= 0 && lx < PANEL_W && ly >= 0 && ly < PANEL_H;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this._close(); return true; }
    return false;
  }
}
