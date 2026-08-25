import { Container, Graphics, Text } from 'pixi.js';
import { Button } from '../Button.js';
import type { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';

/** OG CUIFadeYesNo — modal Yes/No dialog (CFadeWnd).
 *  Assets: UI/UIWindow.img/FadeYesNo/{backgrnd,BtOK,BtCancel}
 *  (StringPool 1325 "UI/UIWindow.img/FadeYesNo/BtOK" / 1326 BtCancel —
 *  CUIFadeYesNo::OnCreate @0x5244C0). Default backgrnd is 202x56; the OK /
 *  Cancel pair stacks on its right half. Text uses the SP 1455 face ("Arial")
 *  at size 12 (CUIFadeYesNo::OnCreate IWzFont::Create). Used by the follow
 *  request (CreateFollowRequest), new-memo notify (CreateNewMemo) and
 *  quest-clear prompt (CreateQuestClear). */
export class FadeYesNoDialog {
  readonly container = new Container();
  onResult: ((yes: boolean) => void) | null = null;

  private _root = new Container();
  private _panel = new Container();
  private _bg = new Graphics();
  private _lines: Text[] = [];
  private readonly _btnYes: Button;
  private readonly _btnNo: Button;
  private readonly _w = 202;
  private _h = 56;

  constructor(loader?: WzTextureLoader | null, ui?: WzPackage | null) {
    this.container.addChild(this._root);
    this._root.addChild(this._panel);

    const btnRoot = ui?.GetItem('UIWindow.img/FadeYesNo');
    const btnProp = btnRoot instanceof WzProperty ? btnRoot : null;
    if (loader && ui) {
      const bgCanvas = ui.GetItem('UIWindow.img/FadeYesNo/backgrnd');
      if (bgCanvas instanceof WzCanvas) {
        const ws = loader.Load(bgCanvas);
        if (ws) {
          const sp = ws.ToPixi();
          sp.position.set(-ws.OriginX, -ws.OriginY);
          this._panel.addChild(sp);
        }
      }
    }
    const mk = (name: string, fallback: string): Button => {
      if (loader && btnProp) {
        const pr = btnProp.Get(name);
        if (pr instanceof WzProperty) {
          const b = Button.fromWz(loader, pr, fallback);
          if (b.hasWzSprite) return b;
        }
      }
      return new Button(fallback);
    };
    this._btnYes = mk('BtOK', 'Yes');
    this._btnNo = mk('BtCancel', 'No');

    // OG OnCreate: CreateCtrl_2(id 2000/2001, l=v4(136..228 per type), t=7 / 20)
    // — the pair stacks vertically on the right side of the 202px plate.
    this._btnYes.container.position.set(this._w - 66, 5);
    this._btnNo.container.position.set(this._w - 66, 22);
    this._panel.addChild(this._btnYes.container, this._btnNo.container);
    this._btnYes.onClick = () => this.finish(true);
    this._btnNo.onClick = () => this.finish(false);
    // Fallback plate when the WZ background didn't load.
    if (!(loader && ui && ui.GetItem('UIWindow.img/FadeYesNo/backgrnd'))) {
      this._panel.addChildAt(this._bg, 0);
    }

    this.container.visible = false;
  }

  /** OG CreateFollowRequest etc. — show with message text (\n or \r\n). */
  Show(text: string): void {
    for (const l of this._lines) l.destroy();
    this._lines = [];
    let y = 10;
    for (const raw of text.replace(/\r/g, '').split('\n')) {
      const t = new Text({ text: raw, style: { fill: 0xffffff, fontSize: 12, fontFamily: 'Arial' } });
      t.anchor.set(0.5, 0);
      t.x = (this._w - 70) / 2;
      t.y = y;
      this._lines.push(t);
      this._panel.addChild(t);
      y += 16;
    }
    this._h = Math.max(56, y + 8);
    this._bg.clear()
      .rect(0, 0, this._w, this._h)
      .fill({ color: 0x0d1224, alpha: 0.95 })
      .rect(0, 0, this._w, this._h)
      .stroke({ color: 0x5a6c9e, width: 1 });
    this._btnYes.container.y = Math.min(5, this._h - 40);
    this._btnNo.container.y = this._btnYes.container.y + 17;
    this.container.visible = true;
  }

  Close(): void { this.container.visible = false; }
  get IsVisible(): boolean { return this.container.visible; }

  private finish(yes: boolean): void {
    this.Close();
    this.onResult?.(yes);
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.IsVisible) return false;
    if (!down) return true;
    const lx = x - this.container.x;
    const ly = y - this.container.y;
    for (const btn of [this._btnYes, this._btnNo]) {
      if (btn.handleMouseButton(lx, ly, down)) return true;
    }
    return true; // modal — swallow outside clicks
  }

  onMouseMove(x: number, y: number): void {
    if (!this.IsVisible) return;
    const lx = x - this.container.x;
    const ly = y - this.container.y;
    for (const btn of [this._btnYes, this._btnNo]) btn.setHover(btn.hitTest(lx, ly));
  }
}
