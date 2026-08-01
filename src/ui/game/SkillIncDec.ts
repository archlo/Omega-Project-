import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import type { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';

// OG: CUISkillInc (skill increment window) — inherits CUIWnd
// WZ path: UIWindow2.img/Skill/Inc
// Used for skill point allocation confirmation
const INC_W = 174;
const INC_H = 281;

// OG: CUISkillDec (skill decrement window) — inherits CUIWnd
// WZ path: UIWindow2.img/Skill/Dec
// Used for skill point deallocation
const DEC_W = 174;
const DEC_H = 281;

// OG: CUISkillDecEX (extended decrement window) — inherits CUIWnd
// WZ path: UIWindow2.img/Skill/DecEX
// Used for dual-blade skill point deallocation
const DEC_EX_W = 174;
const DEC_EX_H = 281;

// OG: CUISkillChangeConfirm — inherits CUIWnd
// WZ path: UIWindow2.img/Skill/ChangeConfirm
// Confirmation dialog for job change skill reset
const CONFIRM_W = 260;
const CONFIRM_H = 160;

const _titleStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });
const _labelStyle = new TextStyle({ fill: '#CCC', fontSize: 10, fontFamily: 'monospace' });
const _valueStyle = new TextStyle({ fill: '#FFF', fontSize: 9, fontFamily: 'monospace' });
const _btnStyle = new TextStyle({ fill: '#64DC64', fontSize: 10, fontFamily: 'monospace' });

// OG: CUISkillInc — skill increment panel
// Shows skills that can be leveled up with SP allocation
export class SkillIncPanel extends GamePanel {
  private _bg: Graphics;
  private _titleText: Text;
  private _rows: { icon: Sprite; name: Text; level: Text; btn: Container }[] = [];
  private _scrollOffset = 0;
  private _skills: { id: number; name: string; level: number; maxLevel: number }[] = [];
  private _onSkillUp: ((skillId: number) => void) | null = null;
  private _textureLoader: WzTextureLoader | null = null;
  private _skillIcons: Map<number, Texture> = new Map();

  constructor(loader?: WzTextureLoader, ui?: WzPackage | null) {
    super();
    this._root.visible = false;

    let hasWzBg = false;
    if (loader && ui) {
      const incProp = ui.GetItem('UIWindow2.img/Skill/Inc');
      const prop = incProp instanceof WzProperty ? incProp : null;
      const bgNode = prop?.Get('backgrnd');
      if (bgNode instanceof WzCanvas) {
        const sprite = loader.Load(bgNode)?.ToPixi();
        if (sprite) { this._root.addChild(sprite); hasWzBg = true; }
      }
    }

    this._bg = new Graphics();
    if (!hasWzBg) {
      this._bg.rect(0, 0, INC_W, INC_H).fill({ color: '#0C0C16', alpha: 235 / 255 });
      this._bg.rect(0, 0, INC_W, INC_H).stroke({ color: '#46465A', width: 1 });
    }
    this._root.addChild(this._bg);

    this._titleText = new Text({ text: 'Skill Up', style: _titleStyle });
    this._titleText.x = 66; this._titleText.y = 5;
    this._root.addChild(this._titleText);

    // Create 4 visible rows (same as main skill book)
    for (let i = 0; i < 4; i++) {
      const icon = new Sprite(Texture.EMPTY);
      icon.width = 32; icon.height = 32;
      icon.x = 13; icon.y = 95 + i * 40;
      this._root.addChild(icon);

      const name = new Text({ text: '', style: _valueStyle });
      name.x = 50; name.y = 95 + i * 40 - 18;
      this._root.addChild(name);

      const level = new Text({ text: '', style: _labelStyle });
      level.x = 50; level.y = 95 + i * 40;
      this._root.addChild(level);

      // SP Up button
      const btn = new Container();
      const bg = new Graphics();
      bg.rect(0, 0, 16, 14).fill({ color: '#1E3C1E' });
      bg.rect(0, 0, 16, 14).stroke({ color: '#50A050', width: 1 });
      const pt = new Text({ text: '+', style: new TextStyle({ fill: '#64DC64', fontSize: 10, fontFamily: 'monospace' }) });
      pt.x = 3; pt.y = 0;
      btn.addChild(bg, pt);
      btn.x = 135; btn.y = 95 + i * 40 + 6;
      btn.visible = false;
      this._root.addChild(btn);

      this._rows.push({ icon, name, level, btn });
    }
  }

  setOnSkillUp(cb: (skillId: number) => void): void { this._onSkillUp = cb; }

  open(skills: { id: number; name: string; level: number; maxLevel: number }[], x: number, y: number): void {
    this._skills = skills;
    this._scrollOffset = 0;
    this._root.position.set(x, y);
    this.isVisible = true;
  }

  update(_dt: number): void {
    if (!this.isVisible) return;
    for (let i = 0; i < this._rows.length; i++) {
      const abs = this._scrollOffset + i;
      const sk = abs < this._skills.length ? this._skills[abs] : null;
      const row = this._rows[i];
      if (sk) {
        row.name.text = sk.name || `[${sk.id}]`;
        row.level.text = `${sk.level}/${sk.maxLevel}`;
        row.btn.visible = sk.level < sk.maxLevel;
      } else {
        row.name.text = '';
        row.level.text = '';
        row.btn.visible = false;
      }
    }
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    if (!down) return true;
    if (lx >= INC_W - 18 && ly < 22) { this.isVisible = false; return true; }

    // SP Up button clicks
    for (let i = 0; i < this._rows.length; i++) {
      const btn = this._rows[i].btn;
      if (!btn.visible) continue;
      if (lx >= btn.x && lx < btn.x + 16 && ly >= btn.y && ly < btn.y + 14) {
        const abs = this._scrollOffset + i;
        if (abs < this._skills.length) {
          this._onSkillUp?.(this._skills[abs].id);
        }
        return true;
      }
    }
    return lx >= 0 && lx < INC_W && ly >= 0 && ly < INC_H;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return true;
  }
}

// OG: CUISkillDec — skill decrement panel
// Shows skills that can have SP removed
export class SkillDecPanel extends GamePanel {
  private _bg: Graphics;
  private _titleText: Text;
  private _rows: { icon: Sprite; name: Text; level: Text; btn: Container }[] = [];
  private _scrollOffset = 0;
  private _skills: { id: number; name: string; level: number }[] = [];
  private _onSkillDown: ((skillId: number) => void) | null = null;
  private _textureLoader: WzTextureLoader | null = null;

  constructor(loader?: WzTextureLoader, ui?: WzPackage | null) {
    super();
    this._root.visible = false;

    let hasWzBg = false;
    if (loader && ui) {
      const decProp = ui.GetItem('UIWindow2.img/Skill/Dec');
      const prop = decProp instanceof WzProperty ? decProp : null;
      const bgNode = prop?.Get('backgrnd');
      if (bgNode instanceof WzCanvas) {
        const sprite = loader.Load(bgNode)?.ToPixi();
        if (sprite) { this._root.addChild(sprite); hasWzBg = true; }
      }
    }

    this._bg = new Graphics();
    if (!hasWzBg) {
      this._bg.rect(0, 0, DEC_W, DEC_H).fill({ color: '#0C0C16', alpha: 235 / 255 });
      this._bg.rect(0, 0, DEC_W, DEC_H).stroke({ color: '#46465A', width: 1 });
    }
    this._root.addChild(this._bg);

    this._titleText = new Text({ text: 'Skill Down', style: _titleStyle });
    this._titleText.x = 56; this._titleText.y = 5;
    this._root.addChild(this._titleText);

    for (let i = 0; i < 4; i++) {
      const icon = new Sprite(Texture.EMPTY);
      icon.width = 32; icon.height = 32;
      icon.x = 13; icon.y = 95 + i * 40;
      this._root.addChild(icon);

      const name = new Text({ text: '', style: _valueStyle });
      name.x = 50; name.y = 95 + i * 40 - 18;
      this._root.addChild(name);

      const level = new Text({ text: '', style: _labelStyle });
      level.x = 50; level.y = 95 + i * 40;
      this._root.addChild(level);

      // SP Down button
      const btn = new Container();
      const bg = new Graphics();
      bg.rect(0, 0, 16, 14).fill({ color: '#3C1E1E' });
      bg.rect(0, 0, 16, 14).stroke({ color: '#A05050', width: 1 });
      const pt = new Text({ text: '-', style: new TextStyle({ fill: '#DC6464', fontSize: 10, fontFamily: 'monospace' }) });
      pt.x = 4; pt.y = 0;
      btn.addChild(bg, pt);
      btn.x = 135; btn.y = 95 + i * 40 + 6;
      btn.visible = false;
      this._root.addChild(btn);

      this._rows.push({ icon, name, level, btn });
    }
  }

  setOnSkillDown(cb: (skillId: number) => void): void { this._onSkillDown = cb; }

  open(skills: { id: number; name: string; level: number }[], x: number, y: number): void {
    this._skills = skills;
    this._scrollOffset = 0;
    this._root.position.set(x, y);
    this.isVisible = true;
  }

  update(_dt: number): void {
    if (!this.isVisible) return;
    for (let i = 0; i < this._rows.length; i++) {
      const abs = this._scrollOffset + i;
      const sk = abs < this._skills.length ? this._skills[abs] : null;
      const row = this._rows[i];
      if (sk) {
        row.name.text = sk.name || `[${sk.id}]`;
        row.level.text = `Lv.${sk.level}`;
        row.btn.visible = sk.level > 0;
      } else {
        row.name.text = '';
        row.level.text = '';
        row.btn.visible = false;
      }
    }
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    if (!down) return true;
    if (lx >= DEC_W - 18 && ly < 22) { this.isVisible = false; return true; }

    for (let i = 0; i < this._rows.length; i++) {
      const btn = this._rows[i].btn;
      if (!btn.visible) continue;
      if (lx >= btn.x && lx < btn.x + 16 && ly >= btn.y && ly < btn.y + 14) {
        const abs = this._scrollOffset + i;
        if (abs < this._skills.length) {
          this._onSkillDown?.(this._skills[abs].id);
        }
        return true;
      }
    }
    return lx >= 0 && lx < DEC_W && ly >= 0 && ly < DEC_H;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; return true; }
    return true;
  }
}

// OG: CUISkillChangeConfirm — job change skill reset confirmation
// Shows before job change to confirm SP reset
export class SkillChangeConfirm extends GamePanel {
  private _bg: Graphics;
  private _titleText: Text;
  private _bodyText: Text;
  private _btOk: Container;
  private _btCancel: Container;
  onConfirm: (() => void) | null = null;
  onCancel: (() => void) | null = null;

  constructor(loader?: WzTextureLoader, ui?: WzPackage | null) {
    super();
    this._root.visible = false;

    let hasWzBg = false;
    if (loader && ui) {
      const confirmProp = ui.GetItem('UIWindow2.img/Skill/ChangeConfirm');
      const prop = confirmProp instanceof WzProperty ? confirmProp : null;
      const bgNode = prop?.Get('backgrnd');
      if (bgNode instanceof WzCanvas) {
        const sprite = loader.Load(bgNode)?.ToPixi();
        if (sprite) { this._root.addChild(sprite); hasWzBg = true; }
      }
    }

    this._bg = new Graphics();
    if (!hasWzBg) {
      this._bg.roundRect(0, 0, CONFIRM_W, CONFIRM_H, 5).fill({ color: 0x121827, alpha: 0.92 });
      this._bg.roundRect(0, 0, CONFIRM_W, CONFIRM_H, 5).stroke({ color: 0x7cc8ff, width: 1 });
    }
    this._root.addChild(this._bg);

    this._titleText = new Text({ text: 'Job Change', style: _titleStyle });
    this._titleText.x = 10; this._titleText.y = 8;
    this._root.addChild(this._titleText);

    this._bodyText = new Text({
      text: 'Your skill points will be reset.\nDo you want to proceed?',
      style: new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace', wordWrap: true, wordWrapWidth: CONFIRM_W - 20 }),
    });
    this._bodyText.x = 10; this._bodyText.y = 35;
    this._root.addChild(this._bodyText);

    // OK button
    this._btOk = new Container();
    const okBg = new Graphics();
    okBg.roundRect(0, 0, 60, 22, 3).fill({ color: 0x2A4A2A });
    okBg.roundRect(0, 0, 60, 22, 3).stroke({ color: 0x50A050, width: 1 });
    const okText = new Text({ text: 'OK', style: _btnStyle });
    okText.x = 18; okText.y = 3;
    this._btOk.addChild(okBg, okText);
    this._btOk.x = CONFIRM_W / 2 - 70;
    this._btOk.y = CONFIRM_H - 36;
    this._root.addChild(this._btOk);

    // Cancel button
    this._btCancel = new Container();
    const cancelBg = new Graphics();
    cancelBg.roundRect(0, 0, 60, 22, 3).fill({ color: 0x4A2A2A });
    cancelBg.roundRect(0, 0, 60, 22, 3).stroke({ color: 0xA05050, width: 1 });
    const cancelText = new Text({ text: 'Cancel', style: new TextStyle({ fill: '#DC6464', fontSize: 10, fontFamily: 'monospace' }) });
    cancelText.x = 8; cancelText.y = 3;
    this._btCancel.addChild(cancelBg, cancelText);
    this._btCancel.x = CONFIRM_W / 2 + 10;
    this._btCancel.y = CONFIRM_H - 36;
    this._root.addChild(this._btCancel);
  }

  open(x: number, y: number): void {
    this._root.position.set(x, y);
    this.isVisible = true;
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    if (!down) return true;

    // OK button
    if (lx >= this._btOk.x && lx < this._btOk.x + 60 &&
        ly >= this._btOk.y && ly < this._btOk.y + 22) {
      this.isVisible = false;
      this.onConfirm?.();
      return true;
    }
    // Cancel button
    if (lx >= this._btCancel.x && lx < this._btCancel.x + 60 &&
        ly >= this._btCancel.y && ly < this._btCancel.y + 22) {
      this.isVisible = false;
      this.onCancel?.();
      return true;
    }
    // Close button
    if (lx >= CONFIRM_W - 18 && ly < 22) { this.isVisible = false; return true; }
    return lx >= 0 && lx < CONFIRM_W && ly >= 0 && ly < CONFIRM_H;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.isVisible = false; this.onCancel?.(); return true; }
    if (key === 'Enter') { this.isVisible = false; this.onConfirm?.(); return true; }
    return true;
  }
}
