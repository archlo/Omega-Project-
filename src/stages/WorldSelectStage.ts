import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { Stage, MouseButton } from '../app/Stage.js';
import { LoginSender } from '../net/senders/LoginSender.js';
import { MapleClaudeGame } from '../MapleClaudeGame.js';
import { CharSelectStage } from './CharSelectStage.js';
import { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzImage } from '../wz/WzImage.js';
import { WzSound } from '../wz/WzSound.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzSprite } from '../render/WzSprite.js';
import { AnimatedSprite } from '../render/AnimatedSprite.js';
import { MapScene } from '../map/MapScene.js';
import { WorldInfo } from '../domain/WorldInfo.js';
import { Button } from '../ui/Button.js';
import { LoginStage } from './LoginStage.js';
import { CharacterEntry } from '../domain/CharacterEntry.js';
import { ViewAllCharResultArgs } from '../net/handlers/PacketArgs.js';

const WorldGridCols = 6;
const WorldGridStepX = 96;
const WorldGridStepY = 26;
const WorldGridOriginX = -249;
const WorldGridOriginY = -862;
const WorldFlagOffsetX = 68;
const WorldFlagOffsetY = -4;

const ChannelGridCols = 5;
const ChannelCellBaseX = 23;
const ChannelCellBaseY = 93;
const ChannelCellStepX = 66;
const ChannelCellStepY = 29;
const ChannelCellW = 61;
const ChannelCellH = 21;
const GoWorldBtnX = 230;
const GoWorldBtnY = 43;
const ChannelPanelW = 371;
const ChannelPanelH = 222;
const DEFAULT_CHANNEL_PANEL_X = Math.floor((800 - ChannelPanelW) / 2);
const DEFAULT_CHANNEL_PANEL_Y = Math.floor((600 - ChannelPanelH) / 2);

const ScrollDuration = 0.55;

export class WorldSelectStage extends Stage {
  private _ui: WzPackage;
  private _map: WzPackage | null;
  private _sound: WzPackage | null;
  private _loader: WzTextureLoader;
  private _scene: MapScene;
  private _cameraStart = { x: 0, y: 0 };
  private _cameraOffset = { x: 28, y: -608 };
  private _scrollT = 0;

  private _subScreen: 'world' | 'channel' = 'world';
  private _channelAssetsLoaded = false;
  private _selectedWorldId = 0;
  private _selectedChannelId = 0;
  private _channelGridDirty = false;

  private _worlds: WorldInfo[] = [];
  private _worldsDirty = false;
  private _statusLabel = 'Loading worlds...';

  private _channelPanelAnchor = { x: DEFAULT_CHANNEL_PANEL_X, y: DEFAULT_CHANNEL_PANEL_Y };
  private _worldGridNudge = { x: 0, y: 0 };
  private _worldBannerOffset = { x: 12, y: 6 };
  private _chSelectOffset = { x: -2, y: -3 };
  private _chGaugeOffset = { x: 2, y: 15 };
  private _btBackPos = { x: 0, y: 546 };
  private _btViewAllPos = { x: 670, y: 546 };
  private _stepIndicatorPos = { x: 0, y: 0 };

  private _frame: WzSprite | null = null;
  private _frameSprite: Sprite | null = null;
  private _stepIndicator: WzSprite | null = null;
  private _stepIndicatorSprite: Sprite | null = null;

  private _worldButtons: Button[] = [];
  private _worldFlags: (WzSprite | null)[] = [];
  private _worldFlagContainers: Container[] = [];
  private _btBack: Button | null = null;
  private _btViewAll: Button | null = null;

  // "View all characters" (CLogin::OnViewAllCharResult, decompile/5DE120.c)
  // accumulation state. subType===1 arrives first with the expected batch
  // count and total character count; subType===0 arrives once per world
  // with that world's characters, tagged with worldId since the combined
  // list can span multiple worlds.
  private _vacCharacters: CharacterEntry[] = [];
  private _vacBatchesExpected = -1;
  private _vacBatchesReceived = 0;
  private _vacLoginOpt = 0;
  private _vacPending = false;

  private _chBackgrn: WzSprite | null = null;
  private _chSelect: AnimatedSprite | null = null;
  private _worldBanner: WzSprite | null = null;
  private _chGauge: WzSprite | null = null;
  private _btGoWorld: Button | null = null;
  private readonly _channelNormal: (WzSprite | null)[] = Array(20).fill(null);
  private readonly _channelDisabled: (WzSprite | null)[] = Array(20).fill(null);

  private _bg: Graphics;
  private _mapContainer = new Container();
  private _panelContainer = new Container();
  private _worldBtnContainer = new Container();
  private _channelContainer = new Container();
  private _statusText: Text;

  constructor(ui: WzPackage, map: WzPackage | null, sound: WzPackage | null) {
    super();
    this._ui = ui;
    this._map = map;
    this._sound = sound;
    this._loader = new WzTextureLoader();
    this._scene = new MapScene(map, this._loader);

    this._bg = new Graphics();
    const style = new TextStyle({ fill: 0xFFFFFF, fontSize: 14, fontFamily: 'monospace' });
    this._statusText = new Text({ text: '', style });
    this._statusText.position.set(400, 560);
    this._statusText.anchor.set(0.5, 0);
  }

  onEnter(game: MapleClaudeGame): void {
    super.onEnter(game);
    this.uiRoot.addChild(this._bg);
    this.uiRoot.addChild(this._mapContainer);
    this.uiRoot.addChild(this._panelContainer);
    this.uiRoot.addChild(this._worldBtnContainer);
    this.uiRoot.addChild(this._channelContainer);
    this.uiRoot.addChild(this._statusText);

    this._buildMapScene();
    this._loadCommonAssets();

    game.loginHandlers.onWorldListComplete = (worlds) => this._onWorldListComplete(worlds);
    game.loginHandlers.onSelectWorldResult = (args) => this._onSelectWorldResult(args, game);
    game.loginHandlers.onViewAllCharResult = (args) => this._onViewAllCharResult(args, game);
    game.session.onDisconnected = () => { this._statusLabel = 'Disconnected.'; };

    if (game.session.worlds.length > 0) {
      this._onWorldListComplete(game.session.worlds);
    } else {
      game.session.send(LoginSender.WorldInfoRequest());
    }
  }

  onExit(): void {
    this.game.loginHandlers.onWorldListComplete = null;
    this.game.loginHandlers.onSelectWorldResult = null;
    this.game.loginHandlers.onViewAllCharResult = null;
    this.game.session.onDisconnected = null;
    this._loader.Dispose();
    super.onExit();
  }

  update(dt: number): void {
    if (this._worldsDirty) {
      this._buildWorldButtons();
      this._worldsDirty = false;
    }

    if (this._chSelect) this._chSelect.Update(dt * 1000);
    this._scene.update(dt * 1000);

    this._scrollT = Math.min(1, this._scrollT + dt / ScrollDuration);
    const t = this._smoothStep(this._scrollT);
    const sp = this._scene.StartPoint ?? { x: 0, y: 0 };
    const targetX = sp.x + this._cameraOffset.x;
    const targetY = sp.y + this._cameraOffset.y;
    const camX = this._lerp(this._cameraStart.x, targetX, t);
    const camY = this._lerp(this._cameraStart.y, targetY, t);
    this._scene.SetCamera({ x: camX, y: camY });

    this._statusText.text = this._statusLabel;
    this._applyLayout();
  }

  draw(): void {
    this.drawFrameMuteButton();
  }

  onMouseButton(x: number, y: number, down: boolean, button: MouseButton): void {
    if (button !== MouseButton.Left) return;

    if (this._btBack?.handleMouseButton(x, y, down)) return;

    if (this._subScreen === 'world') {
      for (const bt of this._worldButtons) {
        if (bt.handleMouseButton(x, y, down)) return;
      }
    } else {
      if (this._btGoWorld?.handleMouseButton(x, y, down)) return;
      if (!down) return;
      const channelCount = this._selectedWorld?.channels.length ?? 0;
      for (let i = 0; i < channelCount; i++) {
        const cell = this._channelCellTopLeft(i);
        if (x >= cell.x && x < cell.x + ChannelCellW && y >= cell.y && y < cell.y + ChannelCellH) {
          this._onChannelClicked(i);
          return;
        }
      }
    }
  }

  onKeyPress(key: string): void {
    if (key === 'Enter') {
      if (this._subScreen === 'world') {
        if (this._worlds.length > 0) this._onWorldClicked(this._worlds[0].worldId);
      } else {
        this._enterWorld();
      }
      return;
    }
    if (key === 'Escape' || key === 'Backspace') {
      if (this._subScreen === 'channel') {
        this._subScreen = 'world';
        this._channelGridDirty = true;
        return;
      }
      this._goBackToLogin();
    }
  }

  private _buildMapScene(): void {
    const loginMap = this._ui.GetItem('MapLogin1.img');
    if (!(loginMap instanceof WzImage)) return;
    try {
      this._scene.Load(loginMap.Root);
      const sp = this._scene.StartPoint ?? { x: 0, y: -8 };
      this._cameraStart = { x: sp.x + 28, y: sp.y - 8 };
      this._scene.SetCamera(this._cameraStart);
      this._mapContainer.addChild(this._scene.container);
    } catch (e) {
      console.warn('WorldSelectStage: MapScene load failed', e);
    }
  }

  private _loadCommonAssets(): void {
    this._frame = this._loadCanvas('Login.img/Common/frame');
    if (this._frame) {
      this._frameSprite = this._frame.ToPixi();
      this._frameSprite.position.set(400, 300);
      this._panelContainer.addChild(this._frameSprite);
    }

    this._stepIndicator = this._loadCanvas('Login.img/Common/step/1');
    if (this._stepIndicator) {
      this._stepIndicatorSprite = this._stepIndicator.ToPixi();
      this._stepIndicatorSprite.position.set(0, 0);
      this._panelContainer.addChild(this._stepIndicatorSprite);
    }

    this._btBack = this._makeButton('Login.img/Common/BtStart', () => this._goBackToLogin());
    if (this._btBack) this._panelContainer.addChild(this._btBack.container);

    // OG: CUILoginStart::OnButtonClicked button id 0x3EC(1004) ->
    // SendViewAllCharacterPacket (decompile/5EE5A0.c, 5EE800.c). WZ asset
    // confirmed at Login.img/WorldSelect/BtViewAll. Exact OG pixel position
    // wasn't recoverable from the decompile dump — placed near the back
    // button as a reasonable default; nudge `_btViewAllPos` if it looks off
    // once WZ art is visible.
    this._btViewAll = this._makeButton('Login.img/WorldSelect/BtViewAll', () => this._onViewAllClicked());
    if (this._btViewAll) {
      this._btViewAll.container.position.set(this._btViewAllPos.x, this._btViewAllPos.y);
      this._panelContainer.addChild(this._btViewAll.container);
    }
  }

  private _onWorldListComplete(worlds: WorldInfo[]): void {
    this._worlds = worlds;
    this._worldsDirty = true;
    this._statusLabel = worlds.length === 0 ? 'No worlds available.' : '';
  }

  private _onViewAllClicked(): void {
    if (this._vacPending) return;
    this._vacPending = true;
    this._vacCharacters = [];
    this._vacBatchesExpected = -1;
    this._vacBatchesReceived = 0;
    this._statusLabel = 'Loading characters from all worlds...';
    this._playClick();
    // gameStartMode=0: the NEXON passport/machine-auth flow OG's other mode
    // needs has no equivalent here — see GameSender.ViewAllChar's doc comment.
    this.game.session.send(LoginSender.ViewAllChar(0));
  }

  private _onViewAllCharResult(args: ViewAllCharResultArgs, game: MapleClaudeGame): void {
    switch (args.subType) {
      case 1:
        this._vacBatchesExpected = args.countRelatedSvrs ?? 0;
        if (this._vacBatchesExpected === 0) this._finishViewAllChars(game);
        break;
      case 0: {
        const worldId = args.worldId ?? 0;
        for (const entry of args.characters ?? []) {
          entry.worldId = worldId;
          this._vacCharacters.push(entry);
        }
        this._vacLoginOpt = args.loginOpt ?? this._vacLoginOpt;
        this._vacBatchesReceived++;
        if (this._vacBatchesExpected >= 0 && this._vacBatchesReceived >= this._vacBatchesExpected) {
          this._finishViewAllChars(game);
        }
        break;
      }
      case 3: case 6: case 7:
        this._vacPending = false;
        this._statusLabel = args.message || 'View all characters failed.';
        break;
      default:
        // 2, 4, 5: no further data, no client-side action needed.
        break;
    }
  }

  private _finishViewAllChars(game: MapleClaudeGame): void {
    this._vacPending = false;
    this._statusLabel = `Character list: ${this._vacCharacters.length} characters across ${Math.max(this._vacBatchesReceived, 1)} world(s).`;
    game.session.account.loginOpt = this._vacLoginOpt;
    game.session.characters = this._vacCharacters;
    game.stageDirector.replace(new CharSelectStage(
      this._ui, this._map, this._sound,
      game.wz.character ?? null, game.wz.item ?? null, game.wz.base ?? null,
      this._selectedWorldId, this._selectedChannelId,
      this._scene.Camera, { x: 28, y: -1208 },
    ));
  }

  private _onSelectWorldResult(args: { success: boolean; resultCode?: number; characters: unknown[] }, game: MapleClaudeGame): void {
    if (!args.success) {
      this._statusLabel = `World select failed (code ${args.resultCode ?? -1}).`;
      return;
    }
    this._statusLabel = `Character list: ${(args.characters as unknown[]).length} characters.`;
    game.session.characters = [...(args.characters as Parameters<typeof game.session.characters.push>[0][])];
    game.stageDirector.replace(new CharSelectStage(
      this._ui, this._map, this._sound,
      game.wz.character ?? null, game.wz.item ?? null, game.wz.base ?? null,
      this._selectedWorldId, this._selectedChannelId,
      this._scene.Camera, { x: 28, y: -1208 },
    ));
  }

  private _buildWorldButtons(): void {
    for (const b of this._worldButtons) {
      this._worldBtnContainer.removeChild(b.container);
    }
    this._worldButtons.length = 0;
    this._worldFlags.length = 0;
    for (const fc of this._worldFlagContainers) {
      this._worldBtnContainer.removeChild(fc);
    }
    this._worldFlagContainers.length = 0;

    for (const world of this._worlds) {
      const worldId = world.worldId;
      const bt = this._makeButton(`Login.img/WorldSelect/BtWorld/${worldId}`, () => this._onWorldClicked(worldId));
      if (!bt) continue;
      this._worldButtons.push(bt);
      this._worldBtnContainer.addChild(bt.container);

      const flag = world.state > 0 ? this._loadCanvas(`Login.img/WorldNotice/${world.state}/0`) : null;
      this._worldFlags.push(flag);

      if (flag) {
        const fc = new Container();
        fc.addChild(flag.ToPixi());
        this._worldFlagContainers.push(fc);
        this._worldBtnContainer.addChild(fc);
      } else {
        this._worldFlagContainers.push(new Container());
      }
    }
  }

  private _onWorldClicked(worldId: number): void {
    this._playClick();
      if (this._subScreen === 'channel' && worldId === this._selectedWorldId) {
        this._subScreen = 'world';
        this._channelGridDirty = true;
      return;
    }
    this._selectedWorldId = worldId;
    this._selectedChannelId = 0;
    this._channelGridDirty = true;
    const chCount = this._worlds.find(w => w.worldId === worldId)?.channels.length ?? 0;
    if (!this._channelAssetsLoaded) {
      this._loadChannelAssets();
      this._channelAssetsLoaded = true;
    }
    this._worldBanner = this._loadCanvas(`Login.img/WorldSelect/world/${worldId}`);
    this._subScreen = 'channel';
    this._channelGridDirty = true;
  }

  private _loadChannelAssets(): void {
    this._chBackgrn = this._loadCanvas('Login.img/WorldSelect/chBackgrn');
    this._chGauge = this._loadCanvas('Login.img/WorldSelect/channel/chgauge');
    const chSelectNode = this._ui.GetItem('Login.img/WorldSelect/channel/chSelect');
    if (chSelectNode) {
      this._chSelect = this._loader.LoadAnimation(chSelectNode) ?? null;
    }
    for (let i = 0; i < 20; i++) {
      this._channelNormal[i] = this._loadCanvas(`Login.img/WorldSelect/channel/${i}/normal`);
      this._channelDisabled[i] = this._loadCanvas(`Login.img/WorldSelect/channel/${i}/disabled`);
    }
    this._btGoWorld = this._makeButton('Login.img/WorldSelect/BtGoworld', () => this._enterWorld());
  }

  private _onChannelClicked(channelId: number): void {
    if (channelId === this._selectedChannelId) {
      this._enterWorld();
      return;
    }
    this._selectedChannelId = channelId;
    this._channelGridDirty = true;
    this._playClick();
  }

  private _enterWorld(): void {
    this._statusLabel = `Joining world ${this._selectedWorldId} ch ${this._selectedChannelId}...`;
    this.game.session.send(LoginSender.SelectWorld(this._selectedWorldId, this._selectedChannelId));
  }

  private _channelCellTopLeft(idx: number): { x: number; y: number } {
    const col = idx % ChannelGridCols;
    const row = Math.floor(idx / ChannelGridCols);
    return {
      x: this._channelPanelAnchor.x + ChannelCellBaseX + col * ChannelCellStepX,
      y: this._channelPanelAnchor.y + ChannelCellBaseY + row * ChannelCellStepY,
    };
  }

  private get _selectedWorld(): WorldInfo | undefined {
    return this._worlds.find(w => w.worldId === this._selectedWorldId);
  }

  private _maxChannelUsers(): number {
    const w = this._selectedWorld;
    if (!w || w.channels.length === 0) return 0;
    let max = 0;
    for (const ch of w.channels) {
      if (ch.userCount > max) max = ch.userCount;
    }
    return max;
  }

  private _applyLayout(): void {
    for (let i = 0; i < this._worldButtons.length; i++) {
      const col = i % WorldGridCols;
      const row = Math.floor(i / WorldGridCols);
      const mapX = WorldGridOriginX + this._worldGridNudge.x + col * WorldGridStepX;
      const mapY = WorldGridOriginY + this._worldGridNudge.y + row * WorldGridStepY;
      const screen = this._scene.WorldToScreen(mapX, mapY, 800, 600);
      this._worldButtons[i].container.position.set(screen.x, screen.y);

      const flagContainer = this._worldFlagContainers[i];
      if (flagContainer && flagContainer.children.length > 0) {
        flagContainer.position.set(screen.x + WorldFlagOffsetX, screen.y + WorldFlagOffsetY);
        flagContainer.visible = true;
      }
    }

    if (this._btBack) {
      this._btBack.container.position.set(this._btBackPos.x, this._btBackPos.y);
    }

    if (this._btGoWorld) {
      this._btGoWorld.container.position.set(
        this._channelPanelAnchor.x + GoWorldBtnX,
        this._channelPanelAnchor.y + GoWorldBtnY,
      );
    }

    if (this._channelGridDirty) {
      this._renderChannelGrid();
      this._channelGridDirty = false;
    }
  }

  private _renderChannelGrid(): void {
    this._channelContainer.removeChildren();
    if (this._subScreen !== 'channel') return;

    const overlay = new Graphics();
    overlay.rect(0, 0, 800, 600).fill({ color: 0x000000, alpha: 96 / 255 });
    this._channelContainer.addChild(overlay);

    if (this._chBackgrn) {
      const s = this._chBackgrn.ToPixi();
      s.position.set(this._channelPanelAnchor.x, this._channelPanelAnchor.y);
      this._channelContainer.addChild(s);
    }

    if (this._worldBanner) {
      const s = this._worldBanner.ToPixi();
      s.position.set(
        this._channelPanelAnchor.x + this._worldBannerOffset.x,
        this._channelPanelAnchor.y + this._worldBannerOffset.y,
      );
      this._channelContainer.addChild(s);
    }

    const channelCount = this._selectedWorld?.channels.length ?? 0;
    const maxUsers = this._maxChannelUsers();

    for (let i = 0; i < 20; i++) {
      const enabled = i < channelCount;
      const sprite = enabled ? this._channelNormal[i] : this._channelDisabled[i];
      if (!sprite) continue;
      const cell = this._channelCellTopLeft(i);

      if (enabled && i === this._selectedChannelId && this._chSelect) {
        const sel = this._chSelect.Current?.ToPixi();
        if (sel) {
          sel.position.set(cell.x + this._chSelectOffset.x, cell.y + this._chSelectOffset.y);
          this._channelContainer.addChild(sel);
        }
      }

      const s = sprite.ToPixi();
      s.position.set(cell.x, cell.y);
      this._channelContainer.addChild(s);

      if (enabled && this._chGauge) {
        const frac = maxUsers > 0 ? Math.min(1, this._selectedWorld!.channels[i].userCount / maxUsers) : 0;
        const fillW = Math.floor(this._chGauge.Width * frac);
        if (fillW > 0) {
          const g = new Graphics();
          g.rect(
            cell.x + this._chGaugeOffset.x,
            cell.y + this._chGaugeOffset.y,
            fillW,
            this._chGauge.Height,
          ).fill({ color: 0x00FF00 });
          this._channelContainer.addChild(g);
        }
      }
    }

    if (this._btGoWorld) {
      this._channelContainer.addChild(this._btGoWorld.container);
    }

    if (this._statusLabel) {
      const t = new Text({ text: this._statusLabel, style: new TextStyle({ fill: 0xFFFFFF, fontSize: 11, fontFamily: 'monospace' }) });
      t.position.set(400, 580);
      t.anchor.set(0.5, 0);
      this._channelContainer.addChild(t);
    }
  }

  private _goBackToLogin(): void {
    this._playClick();
    this.game.session.disconnectAsync();
    this.stageDirector.replace(new LoginStage(this._ui, this._map, this._sound, new WzTextureLoader()));
  }

  private _playClick(): void {
    try {
      const node = this._sound?.GetItem('UI.img/BtMouseClick');
      if (node instanceof WzSound) {
        this.game.audioPlayer.PlayEffect(node.AudioBytes);
      }
    } catch { /* no sound */ }
  }

  private _loadCanvas(path: string): WzSprite | null {
    try {
      const item = this._ui.GetItem(path);
      return item instanceof WzCanvas ? this._loader.Load(item) : null;
    } catch {
      return null;
    }
  }

  private _makeButton(path: string, onClick: () => void): Button | null {
    try {
      const root = this._ui.GetItem(path) as WzProperty | null;
      if (!root) return null;
      const b = Button.fromWz(this._loader, root);
      b.onClick = onClick;
      return b;
    } catch {
      return null;
    }
  }

  private _lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private _smoothStep(t: number): number {
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  }
}
