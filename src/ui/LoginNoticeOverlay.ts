import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { Overlay } from './Overlay.js';
import { WzPackage } from '../wz/WzPackage.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { Button } from './Button.js';
import { BuiltInFont } from './BuiltInFont.js';

export enum NoticeType { Ok, OkCancel }

export class LoginNoticeOverlay extends Overlay {
  private _bgSprite: Sprite | null = null;

  private _btOk: Button | null = null;
  private _btCancel: Button | null = null;
  private _font: BuiltInFont;
  private _center: { x: number; y: number };

  private _message = '';
  private _type: NoticeType = NoticeType.Ok;
  private _autoDismiss = 0;

  private _fallbackBox: Graphics | null = null;
  private _lineTexts: Text[] = [];
  private _msgText: Text;

  onOk: (() => void) | null = null;
  onCancel: (() => void) | null = null;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont, center: { x: number; y: number }) {
    super();
    this._font = font;
    this._center = center;

    this._msgText = new Text({ text: '', style: new TextStyle({ fill: 0xFFFFFF, fontSize: 14, fontFamily: 'monospace' }) });
    this._msgText.position.set(center.x, center.y);
    this._msgText.anchor.set(0.5);
    this.container.addChild(this._msgText);

    const notice = ui?.GetItem('Login.img/Notice') as WzProperty | null;

    const bgCanvas = notice?.Get('backgrnd') as WzCanvas | null;
    if (bgCanvas) {
      const bgSprite = loader.Load(bgCanvas);
      if (bgSprite) {
        this._bgSprite = bgSprite.ToPixi();
        this._bgSprite.visible = false;
        this.container.addChild(this._bgSprite);
      }
    }

    const okRoot = notice?.Get('BtOK') as WzProperty | null;
    if (okRoot) {
      this._btOk = Button.fromWz(loader, okRoot);
      this._btOk.onClick = () => { this.isVisible = false; this.onOk?.(); };
      this._btOk.container.visible = false;
      this.container.addChild(this._btOk.container);
    }

    const cancelRoot = notice?.Get('BtCancel') as WzProperty | null;
    if (cancelRoot) {
      this._btCancel = Button.fromWz(loader, cancelRoot);
      this._btCancel.onClick = () => { this.isVisible = false; this.onCancel?.(); };
      this._btCancel.container.visible = false;
      this.container.addChild(this._btCancel.container);
    }

    if (!this._bgSprite) {
      this._fallbackBox = new Graphics();
      this._fallbackBox.visible = false;
      this.container.addChild(this._fallbackBox);
    }

    this.isVisible = false;
  }

  show(message: string, type: NoticeType = NoticeType.Ok, autoDismissSeconds = 0): void {
    this._message = message;
    this._type = type;
    this._autoDismiss = autoDismissSeconds;
    this.isVisible = true;
    this._applyLayout();
    this._rebuildText();
  }

  hide(): void {
    this.isVisible = false;
  }

  update(dt: number): void {
    if (!this.isVisible || this._autoDismiss <= 0) return;
    this._autoDismiss -= dt;
    if (this._autoDismiss <= 0) {
      this._autoDismiss = 0;
      this.isVisible = false;
      this.onOk?.();
    }
  }

  private _applyLayout(): void {
    const ox = this._type === NoticeType.OkCancel ? -40 : 0;
    if (this._btOk) this._btOk.container.position.set(this._center.x + ox, this._center.y + 38);
    if (this._btCancel) this._btCancel.container.position.set(this._center.x + 44, this._center.y + 38);
  }

  private _rebuildText(): void {
    this._msgText.text = this._message;
    this._msgText.visible = !!this._bgSprite;

    for (const t of this._lineTexts) { t.destroy({ children: true }); }
    this._lineTexts = [];

    if (!this._fallbackBox) return;

    const innerW = 280;
    const padX = 12;
    const lines = this._font.wrapToWidth(this._message, innerW);
    const lineH = this._font.lineHeight;
    const textBlockH = lines.length * lineH;
    const boxW = innerW + padX * 2;
    const boxH = Math.max(110, textBlockH + 80);
    const bx = this._center.x - boxW / 2;
    const by = this._center.y - boxH / 2;

    this._fallbackBox.clear();
    this._fallbackBox.rect(bx, by, boxW, boxH).fill({ color: 0x000000, alpha: 210 / 255 });
    this._fallbackBox.rect(bx, by, boxW, 2).fill({ color: 0x786458 });
    this._fallbackBox.rect(bx, by + boxH - 2, boxW, 2).fill({ color: 0x786458 });
    this._fallbackBox.rect(bx, by, 2, boxH).fill({ color: 0x786458 });
    this._fallbackBox.rect(bx + boxW - 2, by, 2, boxH).fill({ color: 0x786458 });

    const textStartY = this._center.y - 8 - textBlockH / 2;
    for (let i = 0; i < lines.length; i++) {
      const m = this._font.measure(lines[i]);
      const lineTxt = new Text({ text: lines[i], style: this._font.style });
      lineTxt.position.set(this._center.x - m.x / 2, textStartY + i * lineH);
      lineTxt.anchor.set(0.5, 0);
      this._lineTexts.push(lineTxt);
      this.container.addChild(lineTxt);
    }
  }

  draw(): void {
    if (!this.isVisible) {
      if (this._bgSprite) this._bgSprite.visible = false;
      if (this._fallbackBox) this._fallbackBox.visible = false;
      if (this._btOk) this._btOk.container.visible = false;
      if (this._btCancel) this._btCancel.container.visible = false;
      for (const t of this._lineTexts) t.visible = false;
      return;
    }

    if (this._bgSprite) {
      this._bgSprite.position.set(this._center.x, this._center.y);
      this._bgSprite.visible = true;
    }
    if (this._fallbackBox) this._fallbackBox.visible = true;
    if (this._btOk) { this._btOk.container.visible = true; }
    if (this._btCancel) this._btCancel.container.visible = this._type === NoticeType.OkCancel;
    for (const t of this._lineTexts) t.visible = true;
  }

  handleMouseButton(x: number, y: number, down: boolean): void {
    if (!this.isVisible) return;
    if (this._btOk?.handleMouseButton(x, y, down)) return;
    if (this._type === NoticeType.OkCancel && this._btCancel?.handleMouseButton(x, y, down)) return;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Enter' || key === 'Escape') {
      this.isVisible = false;
      if (key === 'Enter') this.onOk?.();
      else this.onCancel?.();
      return true;
    }
    return false;
  }
}
