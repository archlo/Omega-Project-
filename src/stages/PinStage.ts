import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Stage, MouseButton } from '../app/Stage.js';
import { LoginSender } from '../net/senders/LoginSender.js';
import { MapleClaudeGame } from '../MapleClaudeGame.js';
import { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzSound } from '../wz/WzSound.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzSprite } from '../render/WzSprite.js';
import { Button } from '../ui/Button.js';
import { LoginNoticeOverlay, NoticeType } from '../ui/LoginNoticeOverlay.js';
import { BuiltInFont } from '../ui/BuiltInFont.js';
import { WorldSelectStage } from './WorldSelectStage.js';
import { LoginStage } from './LoginStage.js';
import type { CheckPinCodeResultArgs, UpdatePinCodeResultArgs } from '../net/handlers/PacketArgs.js';

const PIN_DIGITS = 4;
const DIGIT_CELL_W = 36;
const DIGIT_CELL_H = 42;
const DIGIT_GAP = 6;

// Panel layout in `Login.img/Pincode` local space (relative to backgrnd's
// top-left). Coordinates are approximate — no v95 reference offsets exist
// for this screen (MapleClaude never finished a real Pincode UI either) —
// derived from the panel/button canvas sizes (362x219 backgrnd, 76x34 / 75x34
// buttons) rather than ported from a known-good source.
const PANEL_CENTER = { x: 400, y: 300 };
const DIGITS_LOCAL = { x: 100, y: 145 };
const TEXT_LOCAL = { x: 70, y: 30 };
const BTN_ROW_Y_LOCAL = 179;
const BT_NO_X_LOCAL = 40;
const BT_LOGIN_X_LOCAL = 246;

/**
 * v95 PIN entry stage — shown when CheckPasswordResult sets skipPinCode=false.
 * Renders `UI.wz/Login.img/Pincode` (backgrnd/text canvases + BtLogin/BtNo
 * buttons), following the same WZ-loading pattern as LoginStage.
 */
export class PinStage extends Stage {
  private _digits: number[] = [];
  private _statusText: Text;
  private _cells: Graphics[] = [];
  private _cellTexts: Text[] = [];
  private _submitting = false;
  private _updateMode = false;
  private _pinEntryEnabled = false;

  private _ui: WzPackage;
  private _map: WzPackage | null;
  private _sound: WzPackage | null;
  private _loader: WzTextureLoader;

  private _dimming: Graphics;
  private _panelContainer = new Container();
  private _errorNotice: LoginNoticeOverlay | null = null;
  private _backgroundSprite: import('pixi.js').Sprite | null = null;
  private _textSprite: import('pixi.js').Sprite | null = null;
  private _loginBtn: Button | null = null;
  private _noBtn: Button | null = null;
  private readonly _allButtons: Button[] = [];

  constructor(ui: WzPackage, map: WzPackage | null, sound: WzPackage | null) {
    super();
    this._ui = ui;
    this._map = map;
    this._sound = sound;
    this._loader = new WzTextureLoader();

    this._dimming = new Graphics();
    this._dimming.rect(0, 0, 800, 600).fill({ color: 0x000000, alpha: 0.4 });

    const statusStyle = new TextStyle({ fill: 0xCCCCCC, fontSize: 13, fontFamily: 'monospace' });
    this._statusText = new Text({ text: 'Type your 4-digit PIN, then press Enter', style: statusStyle });
    this._statusText.anchor.set(0.5);
    this._statusText.position.set(PANEL_CENTER.x, PANEL_CENTER.y + 130);

    for (let i = 0; i < PIN_DIGITS; i++) {
      const g = new Graphics();
      this._cells.push(g);
      const t = new Text({
        text: '',
        style: new TextStyle({ fill: 0xFFFFFF, fontSize: 20, fontFamily: 'monospace', align: 'center' }),
      });
      t.anchor.set(0.5);
      this._cellTexts.push(t);
    }
  }

  onEnter(game: MapleClaudeGame): void {
    super.onEnter(game);
    this._digits = [];
    this._submitting = false;
    this._updateMode = false;
    this._pinEntryEnabled = false;

    this.uiRoot.addChildAt(this._dimming, 0);
    this.uiRoot.addChild(this._panelContainer);
    this._panelContainer.addChild(this._statusText);
    for (const g of this._cells) this._panelContainer.addChild(g);
    for (const t of this._cellTexts) this._panelContainer.addChild(t);

    if (!this._errorNotice) {
      const center = { x: 400, y: 300 };
      this._errorNotice = new LoginNoticeOverlay(this._loader, this._ui, new BuiltInFont(), center);
      this._errorNotice.onOk = () => { this._errorNotice?.hide(); };
      this._errorNotice.onCancel = () => { this._errorNotice?.hide(); this._cancel(); };
      this.uiRoot.addChild(this._errorNotice.container);
    }

    this._buildPanel();
    this._layoutDigitCells();
    this._refresh();

    game.loginHandlers.onCheckPinCodeResult = (args) => this._onCheckPinCodeResult(args);
    game.loginHandlers.onUpdatePinCodeResult = (args) => this._onUpdatePinCodeResult(args);
    this._statusText.text = 'Checking PIN state...';
    game.session.send(LoginSender.CheckPinCodeBootstrap());
  }

  onExit(): void {
    this.game.loginHandlers.onCheckPinCodeResult = null;
    this.game.loginHandlers.onUpdatePinCodeResult = null;
    this._loader.Dispose();
    super.onExit();
  }

  draw(): void {}

  onMouseMove(x: number, y: number): void {
    for (const b of this._allButtons) b.setHover(b.hitTest(x, y));
  }

  onTextInput(character: string): void {
    if (this._submitting || !this._pinEntryEnabled) return;
    if (this._digits.length >= PIN_DIGITS) return;
    if (!/^[0-9]$/.test(character)) return;
    this._digits.push(parseInt(character, 10));
    this._statusText.text = this._updateMode ? 'Enter a new 4-digit PIN' : 'Type your 4-digit PIN, then press Enter';
    this._refresh();
  }

  onKeyPress(key: string): void {
    if (key === 'Backspace') {
      if (!this._pinEntryEnabled) return;
      if (this._digits.length > 0) {
        this._digits.pop();
        this._refresh();
      }
      return;
    }
    if (key === 'Enter') {
      if (this._pinEntryEnabled && this._digits.length === PIN_DIGITS && !this._submitting) this._submitPin();
      return;
    }
    if (key === 'Escape' && !this._submitting) {
      this._cancel();
    }
  }

  onMouseButton(x: number, y: number, down: boolean, button: MouseButton): void {
    if (button !== MouseButton.Left) return;
    for (const b of this._allButtons) {
      if (b.handleMouseButton(x, y, down)) return;
    }
  }

  private _buildPanel(): void {
    const backgrnd = this._loadCanvas('Login.img/Pincode/backgrnd/0');
    const text = this._loadCanvas('Login.img/Pincode/text/0');

    let signTopLeft = { x: PANEL_CENTER.x, y: PANEL_CENTER.y };
    if (backgrnd) {
      this._backgroundSprite = backgrnd.ToPixi();
      this._backgroundSprite.position.set(PANEL_CENTER.x, PANEL_CENTER.y);
      this._panelContainer.addChild(this._backgroundSprite);
      signTopLeft = { x: PANEL_CENTER.x - backgrnd.OriginX, y: PANEL_CENTER.y - backgrnd.OriginY };
    }

    if (text) {
      this._textSprite = text.ToPixi();
      this._textSprite.position.set(signTopLeft.x + TEXT_LOCAL.x, signTopLeft.y + TEXT_LOCAL.y);
      this._panelContainer.addChild(this._textSprite);
    }

    this._loginBtn = this._makeButton('BtLogin', signTopLeft, { x: BT_LOGIN_X_LOCAL, y: BTN_ROW_Y_LOCAL }, () => {
      if (this._digits.length === PIN_DIGITS && !this._submitting) this._submitPin();
    });
    this._noBtn = this._makeButton('BtNo', signTopLeft, { x: BT_NO_X_LOCAL, y: BTN_ROW_Y_LOCAL }, () => this._cancel());

    this._wireBtnSounds();
  }

  private _layoutDigitCells(): void {
    for (let i = 0; i < PIN_DIGITS; i++) {
      const x = DIGITS_LOCAL.x + i * (DIGIT_CELL_W + DIGIT_GAP) + (PANEL_CENTER.x - 362 / 2);
      const y = DIGITS_LOCAL.y + (PANEL_CENTER.y - 219 / 2);
      this._cells[i].position.set(x, y);
      this._cellTexts[i].position.set(x + DIGIT_CELL_W / 2, y + DIGIT_CELL_H / 2);
    }
  }

  private _loadCanvas(path: string): WzSprite | null {
    try {
      const item = this._ui.GetItem(path);
      if (!(item instanceof WzCanvas)) {
        console.warn(`PinStage: ${path} → ${item === null ? 'null' : (item as any)?.constructor?.name ?? typeof item}`);
        return null;
      }
      return this._loader.Load(item);
    } catch (e) {
      console.warn(`PinStage: failed to load WZ canvas at ${path}`, e);
      return null;
    }
  }

  private _makeButton(
    name: string,
    signTopLeft: { x: number; y: number },
    offset: { x: number; y: number },
    onClick: () => void,
  ): Button {
    const root = this._ui.GetItem(`Login.img/Pincode/${name}`);
    const buttonRoot = root instanceof WzProperty ? root : null;
    const b = Button.fromWz(this._loader, buttonRoot, name);
    b.onClick = onClick;
    b.container.position.set(signTopLeft.x + offset.x, signTopLeft.y + offset.y);
    this._panelContainer.addChild(b.container);
    this._allButtons.push(b);
    return b;
  }

  private _wireBtnSounds(): void {
    if (!this._sound) return;
    const loadSfx = (wzPath: string): (() => void) | null => {
      try {
        const node = this._sound!.GetItem(wzPath);
        if (!(node instanceof WzSound)) return null;
        const bytes = node.AudioBytes;
        return () => this.game.audioPlayer.PlayEffect(bytes);
      } catch { return null; }
    };
    const hover = loadSfx('UI.img/BtMouseOver');
    const click = loadSfx('UI.img/BtMouseClick');
    for (const b of this._allButtons) {
      if (hover) b.onHoverSound = hover;
      if (click) b.onClickSound = click;
    }
  }

  private _submitPin(): void {
    if (!this._pinEntryEnabled) return;
    this._submitting = true;
    this._statusText.text = 'Verifying PIN...';
    if (this._updateMode) {
      this.game.session.send(LoginSender.UpdatePinCode(this._digits.join('')));
    } else {
      this.game.session.send(LoginSender.CheckPinCode(this._digits.join('')));
    }
  }

  private _cancel(): void {
    this.stageDirector.replace(new LoginStage(this._ui, this._map, this._sound, new WzTextureLoader()));
  }

  private _onCheckPinCodeResult(args: CheckPinCodeResultArgs): void {
    this._submitting = false;
    this._digits = [];
    this._refresh();

    if (args.accepted) {
      this._pinEntryEnabled = false;
      this._statusText.text = 'PIN accepted!';
      this.game.session.send(LoginSender.WorldRequest());
      this.stageDirector.replace(new WorldSelectStage(this._ui, this._map, this._sound));
      return;
    }

    if (args.requiresNewPin) {
      this._updateMode = true;
      this._pinEntryEnabled = true;
      this._statusText.text = 'Enter a new 4-digit PIN';
      return;
    }

    if (args.requiresPinEntry) {
      this._updateMode = false;
      this._pinEntryEnabled = true;
      this._statusText.text = 'Type your 4-digit PIN, then press Enter';
      return;
    }

    this._pinEntryEnabled = false;
    if (args.returnToLogin) {
      this._errorNotice?.show('Your login session expired. Please sign in again.', NoticeType.Ok);
      this._errorNotice!.onOk = () => {
        this._errorNotice?.hide();
        this._cancel();
      };
      return;
    }

    this._errorNotice?.show(`PIN flow returned unsupported mode ${args.mode}.`, NoticeType.Ok);
    this._errorNotice!.onOk = () => { this._errorNotice?.hide(); };
  }

  private _onUpdatePinCodeResult(args: UpdatePinCodeResultArgs): void {
    this._submitting = false;
    if (args.success) {
      this._digits = [];
      this._refresh();
      this._pinEntryEnabled = false;
      this._updateMode = false;
      this._statusText.text = 'PIN updated. Rechecking PIN state...';
      this.game.session.send(LoginSender.CheckPinCodeBootstrap());
    } else {
      this._digits = [];
      this._refresh();
      this._statusText.text = this._pinErrorMessage(args.errorCode ?? -1);
    }
  }

  private _pinErrorMessage(code: number): string {
    switch (code) {
      case 1: return 'Invalid PIN. Please try again.';
      case 2: return 'Your account has been locked due to too many failed PIN attempts.';
      case 3: return 'This PIN has expired. Please contact support.';
      case 4: return 'PIN cannot match a previous PIN.';
      case 5: return 'PIN must be 4 digits.';
      case 6: return 'Your account has been temporarily blocked. Please try again later.';
      case 7: return 'A system error occurred. Please try again.';
      case 8: return 'This PIN has been used too recently.';
      case 9: return 'PIN verification unavailable. Please contact support.';
      case 10: return 'Session expired. Please log in again.';
      default: return `PIN verification failed (error ${code}).`;
    }
  }

  private _refresh(): void {
    for (let i = 0; i < PIN_DIGITS; i++) {
      const filled = i < this._digits.length;
      const active = i === this._digits.length;
      this._cellTexts[i].text = filled ? '●' : (active ? '_' : '');
      this._cells[i].clear();
      this._cells[i].roundRect(0, 0, DIGIT_CELL_W, DIGIT_CELL_H, 4).fill({ color: filled ? 0x1A1C2E : 0x222444 });
      this._cells[i].roundRect(0, 0, DIGIT_CELL_W, DIGIT_CELL_H, 4)
        .stroke({ width: 1, color: filled || active ? 0x88CCFF : 0x3C4164 });
    }
  }
}
