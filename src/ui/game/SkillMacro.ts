import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { Button } from '../Button.js';

const PanelW = 320;
const PanelH = 260;
const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' });
const _labelStyle = new TextStyle({ fill: '#AAA', fontSize: 9, fontFamily: 'monospace' });

// OG classes: CUIMacroSys (base) and CUIMacroSysEx (extended/advanced
// variant) — both RTTI-confirmed TSingletons with OnCreate/OnSelected/
// OnMouseMove/OnMouseButton/OnButtonClicked/SetShow/Draw. Distinct from the
// unrelated CUIAntiMacro/CUIAdminAntiMacro (anti-macro "are you human"
// challenge popup) and CUIAntiMacroNotice — don't conflate.
export class SkillMacro extends GamePanel {
  OnSave: ((macros: { slot: number; skills: number[] }[]) => void) | null = null;

  private _background: WzSprite | null;
  private _font: BuiltInFont | null;
  private _allButtons: Button[] = [];
  private _btOk: Button | null = null;
  private _btCancel: Button | null = null;
  private _macros: { slot: number; skills: number[] }[] = [];
  private _selectedSlot = 0;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null) {
    super();
    this._font = font;
    this.isVisible = false;
    this.container.position.set(240, 100);

    let macro = ui?.GetItem('UIWindow2.img/Macro');
    if (!(macro instanceof WzProperty)) macro = ui?.GetItem('IWindow2.img/Macro');
    const macroProp = macro instanceof WzProperty ? macro : null;
    this._background = macroProp?.Get('backgrnd') instanceof WzCanvas ? loader.Load(macroProp!.Get('backgrnd') as WzCanvas)
      : (ui?.GetItem('IWindow2.img/Macro/step1/backgrnd') instanceof WzCanvas ? loader.Load(ui!.GetItem('IWindow2.img/Macro/step1/backgrnd') as WzCanvas) : null);
    if (this._background) this.container.addChild(this._background.ToPixi());
    this._btOk = this._makeButton(loader, macroProp, 'btOK', () => this._doSave());
    this._btCancel = this._makeButton(loader, macroProp, 'btCancle', () => { this.isVisible = false; });
    if (this._btOk) this._btOk.container.position.set(PanelW / 2 - 70, PanelH - 36);
    if (this._btCancel) this._btCancel.container.position.set(PanelW / 2 + 10, PanelH - 36);

    const title = new Text({ text: 'Skill Macro', style: _titleStyle });
    title.x = 8; title.y = 5;
    this.container.addChild(title);
  }

  Open(macros: { slot: number; skills: number[] }[]): void {
    this._macros = macros;
    this._selectedSlot = 0;
    this.isVisible = true;
  }

  private _doSave(): void {
    this.OnSave?.(this._macros);
    this.isVisible = false;
  }

  update(_dt: number): void {}

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    const px = this.container.position.x;
    const py = this.container.position.y;
    const lx = x - px;
    const ly = y - py;
    for (const b of this._allButtons) {
      if (b.handleMouseButton(lx, ly, down)) return true;
    }
    if (lx >= PanelW - 18 && ly < 22) { this.isVisible = false; return true; }
    return lx >= 0 && lx < PanelW && ly >= 0 && ly < PanelH;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return false;
  }

  private _makeButton(loader: WzTextureLoader, root: WzProperty | null, name: string, onClick: () => void): Button | null {
    const pr = root?.Get(name);
    if (!(pr instanceof WzProperty)) return null;
    const b = Button.fromWz(loader, pr, name);
    b.onClick = onClick;
    this._allButtons.push(b);
    this.container.addChild(b.container);
    return b;
  }
}
