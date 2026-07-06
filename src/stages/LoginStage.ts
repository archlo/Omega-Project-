import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Stage, MouseButton } from '../app/Stage.js';
import { LoginSender } from '../net/senders/LoginSender.js';
import { HandshakeInfo } from '../net/session/HandshakeReader.js';
import { CheckPasswordResultArgs, AccountInfoResultArgs } from '../net/handlers/PacketArgs.js';
import { MapleClaudeGame } from '../MapleClaudeGame.js';
import { WorldSelectStage } from './WorldSelectStage.js';
import { PinStage } from './PinStage.js';
import { Button } from '../ui/Button.js';
import { TextField } from '../ui/TextField.js';
import { Checkbox } from '../ui/Checkbox.js';
import { LoginWaitOverlay } from '../ui/LoginWaitOverlay.js';
import { LoginNoticeOverlay } from '../ui/LoginNoticeOverlay.js';
import { BuiltInFont } from '../ui/BuiltInFont.js';
import { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzImage } from '../wz/WzImage.js';
import { WzSound } from '../wz/WzSound.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzSprite } from '../render/WzSprite.js';
import { MapScene } from '../map/MapScene.js';

/**
 * Real v95 login stage. Renders `UI.wz/MapLogin1.img` as the backdrop with the
 * signboard panel overlaid in the centre, using the v95 GMS English button set
 * under `Login.img/Title/*`. ID and PW fields accept typed input; Login
 * connects to the configured Kinoko server.
 *
 * Ports `src/MapleClaude/Stages/LoginStage.cs` to Pixi/TS.
 */
export class LoginStage extends Stage {
  // Signboard centre + per-widget offsets (from C# LoginStage field initializers).
  private static readonly SIGNBOARD_CENTER = { x: 371, y: 316 };
  private static readonly CAMERA_OFFSET = { x: 28, y: -8 };
  private static readonly ID_OFFSET = { x: 15, y: 16 };
  private static readonly PW_OFFSET = { x: 15, y: 41 };
  private static readonly LOGIN_BTN_OFFSET = { x: 181, y: 15 };
  private static readonly CHECK_OFFSET = { x: 17, y: 69 };
  private static readonly SAVE_TEXT_OFFSET = { x: 33, y: 69 };
  private static readonly LOST_ID_OFFSET = { x: 103, y: 69 };
  private static readonly LOST_PW_OFFSET = { x: 173, y: 69 };
  private static readonly NEW_OFFSET = { x: 13, y: 93 };
  private static readonly HOME_OFFSET = { x: 88, y: 93 };
  private static readonly QUIT_OFFSET = { x: 163, y: 93 };

  private _statusLabel = '';
  private _statusText: Text;
  private _idField: TextField | null = null;
  private _pwField: TextField | null = null;
  private _saveCheck: Checkbox | null = null;
  private _loginBtn: Button | null = null;
  private _connecting = false;
  private _bg: Graphics;

  private _ui: WzPackage;
  private _map: WzPackage | null;
  private _sound: WzPackage | null;
  private _loader: WzTextureLoader;
  private _scene: MapScene | null = null;

  private _signboard: WzSprite | null = null;
  private _signboardSprite: import('pixi.js').Sprite | null = null;
  private _commonFrame: WzSprite | null = null;
  private _commonFrameSprite: import('pixi.js').Sprite | null = null;

  private readonly _allButtons: Button[] = [];
  private _loginWait: LoginWaitOverlay | null = null;
  private _errorNotice: LoginNoticeOverlay | null = null;

  private _mapContainer = new Container();
  private _panelContainer = new Container();

  constructor(ui: WzPackage, map: WzPackage | null, sound: WzPackage | null, loader: WzTextureLoader) {
    super();
    const style = new TextStyle({ fill: 0xFFE664, fontSize: 14, fontFamily: 'monospace' });
    this._statusText = new Text({ text: '', style });
    this._statusText.position.set(400, 420);
    this._statusText.anchor.set(0.5, 0);

    this._bg = new Graphics();
    this._bg.rect(0, 0, 800, 600).fill({ color: 0x0A1024 });

    this._ui = ui;
    this._map = map;
    this._sound = sound;
    this._loader = loader;
  }

  onEnter(game: MapleClaudeGame): void {
    super.onEnter(game);

    this.uiRoot.addChild(this._bg);
    this.uiRoot.addChild(this._mapContainer);
    this.uiRoot.addChild(this._panelContainer);
    this.uiRoot.addChild(this._statusText);

    this._connecting = false;
    this._statusLabel = 'Enter ID/PW and click Login';
    this._updateStatus();

    this._buildMapScene();
    this._buildLoginPanel();
    this._loadCursor();

    if (this._scene?.BgmPath && this._sound) {
      try {
        const rawPath = this._scene.BgmPath;
        // Sound.wz stores tracks as BgmUI.img/Title — map info omits the .img
        const wzPath = rawPath.includes('.img') ? rawPath : rawPath.replace('/', '.img/');
        const bgmNode = this._sound.GetItem(wzPath);
        if (bgmNode instanceof WzSound) {
          this.game.audioPlayer.PlayLoop(bgmNode.AudioBytes);
        }
      } catch (e) {
        console.warn('LoginStage: BGM load failed', e);
      }
    }

    this.game.loginHandlers.onCheckPasswordResult = (args) => this.onCheckPasswordResult(args);
    this.game.loginHandlers.onAccountInfoResult = (args) => this.onAccountInfoResult(args);
    this.game.loginHandlers.onWorldListComplete = (_worlds) => this.onWorldListComplete();
    this.game.session.onHandshakeReceived = (info) => this.onHandshake(info);
    this.game.session.onDisconnected = () => this.onDisconnected();
  }

  /** Called once Map/Sound finish loading in the background, if they weren't ready yet at construction. */
  attachMapSound(map: WzPackage, sound: WzPackage): void {
    this._map = map;
    this._sound = sound;
    // _buildMapScene() already ran once in onEnter() with this._map still null
    // (LoginStage is shown before the large Map.wz package finishes loading),
    // so the scene it built has no real tile data. Now that the map package
    // is attached, rebuild it for real rather than skipping on `!this._scene`.
    this._buildMapScene();
    if (this._scene?.BgmPath) {
      try {
        const rawPath = this._scene.BgmPath;
        const wzPath = rawPath.includes('.img') ? rawPath : rawPath.replace('/', '.img/');
        const bgmNode = this._sound.GetItem(wzPath);
        if (bgmNode instanceof WzSound) {
          this.game.audioPlayer.PlayLoop(bgmNode.AudioBytes);
        }
      } catch (e) {
        console.warn('LoginStage: BGM load failed', e);
      }
    }
  }

  onExit(): void {
    this.game.loginHandlers.onCheckPasswordResult = null;
    this.game.loginHandlers.onAccountInfoResult = null;
    this.game.loginHandlers.onWorldListComplete = null;
    this.game.session.onHandshakeReceived = null;
    this.game.session.onDisconnected = null;
    this._loader.Dispose();
    super.onExit();
  }

  update(dt: number): void {
    this._updateStatus();
    this._loginWait?.update(dt);
    this._scene?.update(dt * 1000);
  }

  draw(): void {
    this._errorNotice?.draw();
    this.drawFrameMuteButton();
  }

  onMouseMove(x: number, y: number): void {
    for (const b of this._allButtons) b.setHover(b.hitTest(x, y));
  }

  onTextInput(character: string): void {
    if (this._loginWait?.isVisible) return;
    this._idField?.onTextInput(character);
    this._pwField?.onTextInput(character);
  }

  onMouseButton(x: number, y: number, down: boolean, button: MouseButton): void {
    if (button !== MouseButton.Left) return;

    if (this._errorNotice?.isVisible) {
      this._errorNotice.handleMouseButton(x, y, down);
      return;
    }

    if (this._loginWait?.isVisible) {
      this._loginWait.handleMouseButton(x, y, down);
      return;
    }

    for (const b of this._allButtons) {
      if (b.handleMouseButton(x, y, down)) return;
    }
    if (this._saveCheck?.handleMouseButton(x, y, down)) return;

    if (this._idField?.handleMouseButton(x, y, down)) {
      if (this._pwField) this._pwField.isFocused = false;
      return;
    }
    if (this._pwField?.handleMouseButton(x, y, down)) {
      if (this._idField) this._idField.isFocused = false;
      return;
    }
  }

  onKeyPress(key: string): void {
    if (this._errorNotice?.isVisible) {
      this._errorNotice.onKeyPress(key);
      return;
    }

    if (this._loginWait?.isVisible) {
      this._loginWait.onKeyPress(key);
      return;
    }

    if (key === 'Backspace') {
      this._idField?.onKeyPress(key);
      this._pwField?.onKeyPress(key);
    }
    if (key === 'Tab') {
      if (this._idField?.isFocused) {
        this._idField.isFocused = false;
        if (this._pwField) this._pwField.isFocused = true;
      } else if (this._pwField?.isFocused) {
        this._pwField.isFocused = false;
        if (this._idField) this._idField.isFocused = true;
      } else if (this._idField) {
        this._idField.isFocused = true;
      }
    }
    if (key === 'Enter' && !this._connecting) this.beginLogin();
  }

  // ── All assets pre-loaded by SplashStage — just build UI ──────────

  private _buildLoginPanel(): void {

    // UI canvases — Login.img/Title/*
    this._signboard = this._loadCanvas('Login.img/Title/signboard');
    const idBg = this._loadCanvas('Login.img/Title/ID');
    const pwBg = this._loadCanvas('Login.img/Title/PW');
    this._commonFrame = this._loadCanvas('Login.img/Common/frame');
    const checkUnchecked = this._loadCanvas('Login.img/Title/check/0');
    const checkChecked = this._loadCanvas('Login.img/Title/check/1');

    if (this._commonFrame) {
      this._commonFrameSprite = this._commonFrame.ToPixi();
      this._commonFrameSprite.position.set(400, 300);
      this._panelContainer.addChild(this._commonFrameSprite);
    }

    if (this._signboard) {
      this._signboardSprite = this._signboard.ToPixi();
      this._signboardSprite.position.set(LoginStage.SIGNBOARD_CENTER.x, LoginStage.SIGNBOARD_CENTER.y);
      this._panelContainer.addChild(this._signboardSprite);
    }

    const signTopLeft = this._signboard
      ? { x: LoginStage.SIGNBOARD_CENTER.x - this._signboard.OriginX, y: LoginStage.SIGNBOARD_CENTER.y - this._signboard.OriginY }
      : { x: LoginStage.SIGNBOARD_CENTER.x, y: LoginStage.SIGNBOARD_CENTER.y };

    this._idField = new TextField(idBg);
    this._idField.maxLength = 16;
    this._idField.setPosition(signTopLeft.x + LoginStage.ID_OFFSET.x, signTopLeft.y + LoginStage.ID_OFFSET.y);
    this._panelContainer.addChild(this._idField.container);

    this._pwField = new TextField(pwBg);
    this._pwField.isPassword = true;
    this._pwField.maxLength = 16;
    this._pwField.setPosition(signTopLeft.x + LoginStage.PW_OFFSET.x, signTopLeft.y + LoginStage.PW_OFFSET.y);
    this._panelContainer.addChild(this._pwField.container);
    this._idField.isFocused = true;

    this._saveCheck = new Checkbox(checkUnchecked, checkChecked);
    this._saveCheck.hitSize = 12;
    this._saveCheck.setPosition(signTopLeft.x + LoginStage.CHECK_OFFSET.x, signTopLeft.y + LoginStage.CHECK_OFFSET.y);
    this._panelContainer.addChild(this._saveCheck.container);

    const btLogin = this._makeButton('BtLogin', signTopLeft, LoginStage.LOGIN_BTN_OFFSET, () => this.beginLogin());
    this._loginBtn = btLogin;

    this._makeButton('BtLoginIDSave', signTopLeft, LoginStage.SAVE_TEXT_OFFSET, () => {
      if (this._saveCheck) { this._saveCheck.isChecked = !this._saveCheck.isChecked; this._saveCheck.refresh(); }
    });
    this._makeButton('BtLoginIDLost', signTopLeft, LoginStage.LOST_ID_OFFSET, () => {
      this._statusLabel = "ID recovery isn't available on this server.";
    });
    this._makeButton('BtPasswdLost', signTopLeft, LoginStage.LOST_PW_OFFSET, () => {
      this._statusLabel = "Password recovery isn't available on this server.";
    });
    this._makeButton('BtNew', signTopLeft, LoginStage.NEW_OFFSET, () => {
      this._statusLabel = 'New accounts are created automatically on first login.';
    });
    this._makeButton('BtHomePage', signTopLeft, LoginStage.HOME_OFFSET, () => {
      this._statusLabel = 'No homepage is configured for this server.';
    });
    this._makeButton('BtQuit', signTopLeft, LoginStage.QUIT_OFFSET, () => {
      this.game.shutdown();
    });

    this._wireBtnSounds();

    const center = { x: 400, y: 300 };
    this._loginWait = new LoginWaitOverlay(this._loader, this._ui, new BuiltInFont(), center);
    this._loginWait.OnCancel = () => {
      this._loginWait?.setVisible(false);
      this.game.session.disconnectAsync();
      this._statusLabel = 'Login cancelled.';
      this._connecting = false;
    };
    this.uiRoot.addChild(this._loginWait.container);

    this._errorNotice = new LoginNoticeOverlay(this._loader, this._ui, new BuiltInFont(), center);
    this._errorNotice.onOk = () => { this._errorNotice?.hide(); };
    this.uiRoot.addChild(this._errorNotice.container);
  }

  private _buildMapScene(): void {
    const loginMap = this._ui.GetItem('MapLogin1.img');
    if (!(loginMap instanceof WzImage)) return;
    this._mapContainer.removeChildren();
    this._scene = new MapScene(this._map, this._loader);
    try {
      this._scene.Load(loginMap.Root);
      const sp = this._scene.StartPoint ?? { x: 0, y: -8 };
      this._scene.SetCamera({
        x: sp.x + LoginStage.CAMERA_OFFSET.x,
        y: sp.y + LoginStage.CAMERA_OFFSET.y,
      });
      this._mapContainer.addChild(this._scene.container);
    } catch (e) {
      console.warn('LoginStage: MapScene load failed', e);
    }
  }

  private _loadCursor(): void {
    try {
      // Basic.img/Cursor/0/0 = default arrow; 1/0 = hand (hover)
      const node = this._ui.GetItem('Basic.img/Cursor/0/0');
      if (node instanceof WzCanvas) {
        const spr = this._loader.Load(node);
        if (spr) this.game.cursor.setCursorTexture(spr.Texture);
      }
    } catch { /* fallback to procedural arrow */ }
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

  private _loadCanvas(path: string): WzSprite | null {
    try {
      const item = this._ui.GetItem(path);
      if (!(item instanceof WzCanvas)) {
        console.warn(`LoginStage: ${path} → ${item === null ? 'null' : (item as any)?.constructor?.name ?? typeof item}`);
        return null;
      }
      return this._loader.Load(item);
    } catch (e) {
      console.warn(`LoginStage: failed to load WZ canvas at ${path}`, e);
      return null;
    }
  }

  private _makeButton(
    name: string,
    signTopLeft: { x: number; y: number },
    offset: { x: number; y: number },
    onClick: () => void,
  ): Button {
    const root = this._ui?.GetItem(`Login.img/Title/${name}`);
    const buttonRoot = root instanceof WzProperty ? root : null;
    const b = Button.fromWz(this._loader!, buttonRoot, name);
    b.onClick = onClick;
    b.container.position.set(signTopLeft.x + offset.x, signTopLeft.y + offset.y);
    this._panelContainer.addChild(b.container);
    this._allButtons.push(b);
    return b;
  }

  // ── Network flow ──────────────────────────────────────────────────

  private beginLogin(): void {
    if (this._connecting) return;
    const id = this._idField?.text ?? '';
    const pw = this._pwField?.text ?? '';
    // login.md §E1 / CUITitle::SetRet (decompile/5FFEC0.c): the OG gates the
    // login packet on ID length >= 4 (else Error(28)) and password length >= 5
    // (else Error(3)) before ever hitting the wire. TS previously only checked
    // for a non-empty ID, so too-short creds were sent and bounced by the server.
    if (id.length < 4) {
      this._errorNotice?.show('Please enter an ID of at least 4 characters.');
      return;
    }
    if (pw.length < 5) {
      this._errorNotice?.show('Please enter a password of at least 5 characters.');
      return;
    }
    this._connecting = true;
    this._statusLabel = `Connecting to ${this.game.loginHost}:${this.game.loginPort}...`;
    this._updateStatus();

    this._loginWait?.setVisible(true);

    this.game.session.connectAsync(this.game.loginHost, this.game.loginPort).catch((err) => {
      this._statusLabel = `Connect failed: ${err.message}`;
      this._connecting = false;
      this._loginWait?.setVisible(false);
    });
  }

  private onHandshake(info: HandshakeInfo): void {
    this.game.session.send(LoginSender.CheckPassword(this._idField?.text || 'test', this._pwField?.text || 'test', this.game.session.machineId));
    this._statusLabel = 'Authenticating...';
  }

  private onCheckPasswordResult(args: CheckPasswordResultArgs): void {
    this._loginWait?.setVisible(false);

    if (!args.success) {
      this._errorNotice?.show(this._loginErrorMessage(args.resultCode));
      this._connecting = false;
      this.game.session.disconnectAsync();
      return;
    }
    if (args.eulaRequired) {
      this._errorNotice?.show(
        'EULA required. Please accept the End User License Agreement.'
        + '\nClose the notice and try again after accepting.',
      );
      this._connecting = false;
      this.game.session.disconnectAsync();
      return;
    }
    if (args.skipPinCode === false) {
      this._statusLabel = 'PIN required — enter PIN';
      this.stageDirector.push(new PinStage(this._ui, this._map, this._sound));
    } else {
      this._statusLabel = 'Login OK — waiting for worlds...';
      this.game.session.send(LoginSender.WorldRequest());
    }
  }

  /** CLogin::OnAccountInfoResult resultType 14/15 — SSN/DOB registration
   *  required. OG shows a YesNo dialog + opens a website, then terminates. */
  private onAccountInfoResult(args: AccountInfoResultArgs): void {
    if (args.resultType !== 14 && args.resultType !== 15) return;
    this._statusLabel = 'SSN/DOB registration required — disconnect.';
    this._errorNotice?.show(
      'SSN/Date of Birth registration required.\nPlease register at maplestory.nexon.net'
    );
    window.open('http://maplestory.nexon.net', '_blank', 'noopener,noreferrer');
    this._connecting = false;
    this.game.session.disconnectAsync();
  }

  private onWorldListComplete(): void {
    this.stageDirector.replace(new WorldSelectStage(this._ui, this._map, this._sound));
  }

  private onDisconnected(): void {
    this._loginWait?.setVisible(false);
    this._statusLabel = 'Disconnected.';
    this._connecting = false;
  }

  private _updateStatus(): void {
    this._statusText.text = this._statusLabel;
  }

  private _loginErrorMessage(code: number): string {
    switch (code) {
      case 1: return 'Incorrect password.';
      case 2: return 'This account does not exist.';
      case 3: return 'The username or password is incorrect.';
      case 4: return 'Your account has been blocked due to security concerns. Contact support.';
      case 5: return 'This account has been locked. Please try again later.';
      case 6: return 'This account has been permanently blocked.';
      case 7: return 'The server is currently unavailable.';
      case 8: return 'Please verify your account via email.';
      case 9: return 'The temporary password has expired.';
      case 10: return 'System error. Please try again.';
      default: return `Login failed (error ${code}).`;
    }
  }
}

function _fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
