import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { GamePanel } from './GamePanel.js';

const PANEL_W = 220;
const PANEL_H = 180;

const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 12, fontFamily: 'monospace' });
const _msgStyle = new TextStyle({ fill: '#FFF', fontSize: 11, fontFamily: 'monospace', wordWrap: true, wordWrapWidth: PANEL_W - 16 });
const _btnStyle = new TextStyle({ fill: '#CCC', fontSize: 10, fontFamily: 'monospace' });

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// OG: CUIAntiMacro/CUIAdminAntiMacro (decompile 0x78b6b0/0x9f1750) — the
// periodic "are you human" anti-bot challenge. TODO_AUDIT.md Eighty-sixth
// pass flagged the whole feature as missing; "Resolved against the v95
// decompile" section later decoded `OnAntiMacroResult` (subType 6 = JPEG
// CAPTCHA image) but left it unwired. This pass found the real answer-submit
// site (`CUIAntiMacro::SetRet`, decompile/78c940.c: COutPacket(117),
// EncodeStr(answer), sent only when nRet==1/"OK") and built the panel.
// subTypes 4/5/8/10 (plain string message, no image) and 7/9 (ack only, no
// further fields) are notice-only variants (CUIAntiMacroNotice) — shown as
// a message with just a Close button, no answer expected/sent.
export class AntiMacroDialog extends GamePanel {
  onSubmit: ((answer: string) => void) | null = null;

  private _bg: Graphics;
  private _titleText: Text;
  private _msgText: Text;
  private _sprite: Sprite | null = null;
  private _btnOk: Container;
  private _btnCancel: Container;
  private _isQuestion = false;

  constructor() {
    super();
    this._root.visible = false;

    this._bg = new Graphics();
    this._root.addChild(this._bg);

    this._titleText = new Text({ text: 'Verification', style: _titleStyle });
    this._titleText.x = 8; this._titleText.y = 4;
    this._root.addChild(this._titleText);

    this._msgText = new Text({ text: '', style: _msgStyle });
    this._msgText.x = 8; this._msgText.y = 24;
    this._root.addChild(this._msgText);

    this._btnOk = this._makeButton('OK', () => this._confirm());
    this._btnCancel = this._makeButton('Cancel', () => this._cancel());
    this._root.addChild(this._btnOk, this._btnCancel);

    this._redrawBg();
  }

  private _makeButton(label: string, onClick: () => void): Container {
    const c = new Container();
    const g = new Graphics();
    g.rect(0, 0, 56, 20).fill({ color: '#1E2030', alpha: 0.9 });
    g.rect(0, 0, 56, 20).stroke({ color: '#505570', width: 1 });
    const t = new Text({ text: label, style: _btnStyle });
    t.x = 8; t.y = 4;
    c.addChild(g, t);
    c.eventMode = 'static';
    c.cursor = 'pointer';
    c.on('pointerdown', onClick);
    c.y = PANEL_H - 26;
    return c;
  }

  private _redrawBg(): void {
    this._bg.clear();
    this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0E18', alpha: 245 / 255 });
    this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#3C4164', width: 1 });
  }

  /** subType 6: real CAPTCHA — image + free-text answer + OK/Cancel. */
  showQuestion(jpeg: Uint8Array | undefined): void {
    this._isQuestion = true;
    this._msgText.text = 'Type the text shown below:';
    if (this._sprite) { this._root.removeChild(this._sprite); this._sprite = null; }
    // ponytail: jsdom/Image isn't available under vitest's node environment;
    // the dialog still functions (text input/submit) without the texture.
    if (jpeg && jpeg.length > 0 && typeof Image !== 'undefined') {
      const img = new Image();
      img.src = `data:image/jpeg;base64,${bytesToBase64(jpeg)}`;
      this._sprite = Sprite.from(Texture.from(img));
      this._sprite.x = 8; this._sprite.y = 48;
      this._root.addChild(this._sprite);
    }
    this._btnOk.visible = true;
    this._btnCancel.visible = true;
    this._btnOk.x = PANEL_W / 2 - 60;
    this._btnCancel.x = PANEL_W / 2 + 4;
    this.isVisible = true;
    this._root.visible = true;
  }

  /** subTypes 4/5/7/8/9/10: notice-only, no answer sent either way. */
  showNotice(message: string): void {
    this._isQuestion = false;
    this._msgText.text = message;
    if (this._sprite) { this._root.removeChild(this._sprite); this._sprite = null; }
    this._btnOk.visible = false;
    this._btnCancel.visible = true;
    this._btnCancel.x = (PANEL_W - 56) / 2;
    this.isVisible = true;
    this._root.visible = true;
  }

  private _confirm(): void {
    if (!this._isQuestion) return;
    const answer = (globalThis as { prompt?: (msg: string) => string | null }).prompt?.('Answer:') ?? '';
    this.isVisible = false;
    this._root.visible = false;
    this.onSubmit?.(answer);
  }

  private _cancel(): void {
    this.isVisible = false;
    this._root.visible = false;
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    return x - this._root.x >= 0 && x - this._root.x < PANEL_W && y - this._root.y >= 0 && y - this._root.y < PANEL_H;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this._cancel(); return true; }
    return false;
  }
}
