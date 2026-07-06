import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import type { IncubatorResultArgs } from '../../net/handlers/PacketArgs.js';

const PanelW = 320;
const PanelH = 174;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 12, fontFamily: 'monospace' });
const _bodyStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 10, fontFamily: 'monospace' });
const _btnStyle = new TextStyle({ fill: '#D8D8D8', fontSize: 10, fontFamily: 'monospace' });

export class Incubator extends GamePanel {
  private _bg = new Graphics();
  private _title = new Text({ text: 'Incubator Result', style: _titleStyle });
  private _body = new Text({ text: '', style: _bodyStyle });
  private _closeBtn = new Graphics();
  private _closeLabel = new Text({ text: 'Close', style: _btnStyle });
  private _itemName = '-';
  private _result: IncubatorResultArgs | null = null;

  constructor() {
    super();
    this.container.position.set(306, 150);
    this._title.position.set(10, 8);
    this._body.position.set(12, 32);
    this._closeLabel.position.set(220, 146);
    this.container.addChild(this._bg, this._title, this._body, this._closeBtn, this._closeLabel);
    this._drawChrome();
    this._refresh();
  }

  SetResult(result: IncubatorResultArgs, itemName: string): void {
    // TODO_AUDIT.md Hundred-and-fifty-fourth pass: CUIIncubator has a decoded
    // result packet here; no request/control sender is modeled for this panel.
    this._result = result;
    this._itemName = itemName;
    this.isVisible = true;
    this._refresh();
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    const lx = x - this.container.position.x;
    const ly = y - this.container.position.y;
    if (this._hit(lx, ly, 210, 140, 70, 24)) { this.isVisible = false; return true; }
    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return false;
  }

  private _refresh(): void {
    if (!this._result) { this._body.text = 'No result.'; return; }
    const r = this._result;
    const stats = [
      ['STR', r.str], ['DEX', r.dex], ['INT', r.int], ['LUK', r.luk], ['ATK', r.attack], ['MATK', r.magicAttack],
      ['DEF', r.def], ['ACC', r.acc], ['AVO', r.avo], ['SPD', r.speed], ['JMP', r.jump], ['UG', r.upgrade],
    ].filter(([, v]) => typeof v === 'number' && v !== 0).map(([k, v]) => `${k}+${v}`).join(' ');
    this._body.text = `${this._itemName}${r.plus ? ` +${r.plus}` : ''}\n${stats || 'No stat delta'}\nstatType: ${r.statType ?? '-'}\ndialog/msg/send: ${r.dialogType ?? '-'}/${r.msgType ?? '-'}/${r.sendItemOption ? 1 : 0}`;
  }

  private _drawChrome(): void {
    this._bg.clear().roundRect(0, 0, PanelW, PanelH, 5).fill({ color: 0x201814, alpha: 0.92 }).stroke({ color: 0xffbb88, width: 1 });
    this._closeBtn.clear().rect(210, 140, 70, 24).fill({ color: 0x1E2030, alpha: 0.9 }).stroke({ color: 0x705550, width: 1 });
  }

  private _hit(x: number, y: number, bx: number, by: number, bw: number, bh: number): boolean {
    return x >= bx && x < bx + bw && y >= by && y < by + bh;
  }
}
