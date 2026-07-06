import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Overlay } from './Overlay.js';

export class QuitConfirmOverlay extends Overlay {
  onYes: (() => void) | null = null;
  onNo: (() => void) | null = null;

  private _prompt: Text;

  constructor() {
    super();
    this._prompt = new Text({ text: 'Quit MapleClaude?', style: new TextStyle({ fill: 0xFFFFFF, fontSize: 16, fontFamily: 'monospace' }) });
    this._prompt.position.set(400, 280); this._prompt.anchor.set(0.5);
    this.container.addChild(this._prompt);
  }

  handleMouseButton(x: number, y: number, down: boolean): void {
    if (!down || !this.isVisible) return;
    if (x >= 350 && x <= 410 && y >= 310 && y <= 340) { this.isVisible = false; this.onYes?.(); }
    if (x >= 420 && x <= 480 && y >= 310 && y <= 340) { this.isVisible = false; this.onNo?.(); }
  }

  onKeyPress(key: string): void {
    if (!this.isVisible) return;
    if (key === 'y' || key === 'Y') { this.isVisible = false; this.onYes?.(); }
    if (key === 'n' || key === 'N' || key === 'Escape') { this.isVisible = false; this.onNo?.(); }
  }
}
