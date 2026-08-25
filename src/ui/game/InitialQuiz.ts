import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { Button } from '../Button.js';
import type { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';

// OG: CUIInitialQuiz — the anti-macro CAPTCHA modal.
// Window: CWnd::CreateWnd(w,h centered, z=10, screen-coord) with the
// UI/UIWindow.img/InitialQuiz/backgrnd plate (288x229; SpeedQuiz uses
// SpeedQuiz/backgrnd 285x409 + BtGiveup/BtNext/BtOK). OnCreate @0x78E720:
//   - CCtrlEdit id 1000 at (109,157) 150x13 — white back, black Arial text
//     (nFontColor = -16777216), focused by default.
//   - BtOK id 1 at (241,199) from StringPool 1298 "UI/Basic.img/BtOK2".
// CWvsContext::OnInitialQuiz @0x9FFAD0 decodes: byte flag(0=show/1=close),
// str title, str problem, str hint, int a, int b, int timeLimitSec ->
// SetValues @0x7816C0 with m_tRemainInitialQuiz = 1000*sec.
// SendResult @0x7900D0: opcode 65 sub-action 6 + string, once per quiz
// (m_bResultSent guard). The countdown auto-submits on expiry.
export interface InitialQuizValues {
  title: string;
  problem: string;
  hint: string;
  a: number;
  b: number;
  timeLimitMs: number;
}

const W = 288;
const H = 229;
const EDIT_X = 109;
const EDIT_Y = 157;
const EDIT_W = 150;
const EDIT_H = 13;

export class InitialQuiz {
  readonly container = new Container();
  onSubmit: ((answer: string) => void) | null = null;

  private _root = new Container();
  private _title!: Text;
  private _problem!: Text;
  private _hint!: Text;
  private _clock!: Text;
  private _inputText!: Text;
  private readonly _editBg = new Graphics();
  private readonly _okBtn: Button | null;
  private _input = '';
  private _values: InitialQuizValues | null = null;
  private _remainMs = 0;
  private _resultSent = false;

  constructor(loader?: WzTextureLoader | null, ui?: WzPackage | null) {
    this.container.addChild(this._root);
    let bgLoaded = false;
    if (loader && ui) {
      const bgCanvas = ui.GetItem('UIWindow.img/InitialQuiz/backgrnd');
      if (bgCanvas instanceof WzCanvas) {
        const ws = loader.Load(bgCanvas);
        if (ws) {
          const sp = new Sprite(ws.Texture);
          sp.position.set(-ws.OriginX, -ws.OriginY);
          this._root.addChild(sp);
          bgLoaded = true;
        }
      }
    }
    if (!bgLoaded) {
      this._root.addChildAt(new Graphics()
        .rect(0, 0, W, H)
        .fill({ color: 0x0d1224, alpha: 0.96 })
        .rect(0, 0, W, H)
        .stroke({ color: 0x5a6c9e, width: 1 }), 0);
    }

    const mk = (y: number, size: number, color: number): Text => {
      const t = new Text({ text: '', style: { fill: color, fontSize: size, fontFamily: 'Arial', wordWrap: true, wordWrapWidth: W - 40, breakWords: true } });
      t.anchor.set(0.5, 0);
      t.x = W / 2;
      t.y = y;
      this._root.addChild(t);
      return t;
    };
    this._title = mk(14, 13, 0xffe8a0);
    this._problem = mk(36, 13, 0xffffff);
    this._hint = mk(100, 11, 0x9fb4e8);
    this._clock = new Text({ text: '', style: { fill: 0xff6060, fontSize: 12, fontFamily: 'Arial' } });
    this._clock.anchor.set(1, 0);
    this._clock.position.set(W - 14, 12);
    this._root.addChild(this._clock);

    // OG CCtrlEdit id 1000 at (109,157) 150x13 — white box, black Arial input.
    this._editBg.rect(EDIT_X, EDIT_Y, EDIT_W, EDIT_H)
      .fill({ color: 0xffffff })
      .stroke({ color: 0x000000, width: 1 });
    this._root.addChild(this._editBg);
    this._inputText = new Text({ text: '', style: { fill: 0x000000, fontSize: 12, fontFamily: 'Arial' } });
    this._inputText.position.set(EDIT_X + 6, EDIT_Y + 0);
    this._root.addChild(this._inputText);

    // OG BtOK id 1 at (241,199) — SP 1298 "UI/Basic.img/BtOK2".
    let ok: Button | null = null;
    if (loader && ui) {
      const pr = ui.GetItem('Basic.img/BtOK2');
      ok = Button.fromWz(loader, pr instanceof WzProperty ? pr : null, 'OK');
      if (!ok.hasWzSprite) ok = null;
    }
    this._okBtn = ok;
    if (this._okBtn) {
      this._okBtn.container.position.set(241, 199);
      this._okBtn.onClick = () => this.Submit();
      this._root.addChild(this._okBtn.container);
    }

    this.container.visible = false;
  }

  /** OG CUIInitialQuiz::SetValues. */
  SetValues(v: InitialQuizValues): void {
    this._values = v;
    this._remainMs = v.timeLimitMs;
    this._resultSent = false;
    this._input = '';
    this._title.text = v.title;
    this._problem.text = v.problem;
    this._hint.text = v.hint;
    this._inputText.text = '';
    this.container.visible = true;
  }

  Close(): void {
    this.container.visible = false;
    this._values = null;
  }

  get IsVisible(): boolean { return this.container.visible; }

  Update(dtMs: number): void {
    if (!this.IsVisible || !this._values) return;
    if (this._values.timeLimitMs > 0 && this._remainMs > 0) {
      this._remainMs -= dtMs;
      this._clock.text = `${Math.max(0, Math.ceil(this._remainMs / 1000))}`;
      if (this._remainMs <= 0) this.Submit(); // auto-submit empty on timeout
    }
  }

  Submit(): void {
    if (!this.IsVisible || this._resultSent) return;
    this._resultSent = true; // OG m_bResultSent guard
    const answer = this._input;
    this.Close();
    this.onSubmit?.(answer);
  }

  onKeyPress(key: string): boolean {
    if (!this.IsVisible) return false;
    if (key === 'Enter' || key === 'Escape') {
      this.Submit();
      return true;
    }
    if (key === 'Backspace') {
      this._input = this._input.slice(0, -1);
    } else if (key.length === 1) {
      this._input += key;
    } else {
      return true;
    }
    this._inputText.text = this._input;
    return true;
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.IsVisible) return false;
    if (this._okBtn) {
      return this._okBtn.handleMouseButton(x - this.container.x, y - this.container.y, down);
    }
    return true; // modal
  }

  onMouseMove(x: number, y: number): void {
    if (!this.IsVisible || !this._okBtn) return;
    this._okBtn.setHover(this._okBtn.hitTest(x - this.container.x, y - this.container.y));
  }
}
