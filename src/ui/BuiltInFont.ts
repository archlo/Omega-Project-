import { Text, TextStyle } from 'pixi.js';

export class BuiltInFont {
  private _style: TextStyle;
  private _canvasCtx: CanvasRenderingContext2D | null = null;

  constructor(size = 11) {
    this._style = new TextStyle({
      fontFamily: 'monospace',
      fontSize: size,
      fill: 0xFFFFFF,
    });
  }

  get lineHeight(): number { return this._style.fontSize as number + 4; }

  measure(text: string): { x: number; y: number } {
    const t = new Text({ text, style: this._style });
    return { x: t.width, y: t.height };
  }

  get style(): TextStyle { return this._style; }

  private _ctx(): CanvasRenderingContext2D {
    if (!this._canvasCtx) {
      const c = document.createElement('canvas');
      this._canvasCtx = c.getContext('2d')!;
      this._canvasCtx.font = `${this._style.fontSize}px ${this._style.fontFamily}`;
    }
    return this._canvasCtx;
  }

  wrapToWidth(text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    const ctx = this._ctx();
    let line = '';
    for (const word of text.split(' ')) {
      const test = line.length === 0 ? word : `${line} ${word}`;
      if (ctx.measureText(test).width > maxWidth && line.length > 0) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line.length > 0) lines.push(line);
    if (lines.length === 0) lines.push('');
    return lines;
  }

  truncateToWidth(text: string, maxWidth: number): string {
    const ctx = this._ctx();
    if (ctx.measureText(text).width <= maxWidth) return text;
    for (let i = text.length - 1; i > 0; i--) {
      const t = text.substring(0, i) + '…';
      if (ctx.measureText(t).width <= maxWidth) return t;
    }
    return text.substring(0, 1) + '…';
  }
}
