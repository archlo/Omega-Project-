import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Stage, MouseButton } from '../app/Stage.js';
import { LoginSender } from '../net/senders/LoginSender.js';
import { CharSelectStage } from './CharSelectStage.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzImage } from '../wz/WzImage.js';
import { WzSound } from '../wz/WzSound.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { MapScene } from '../map/MapScene.js';
import { Button } from '../ui/Button.js';
import { LoginStage } from './LoginStage.js';
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
    _ui;
    _map;
    _sound;
    _loader;
    _scene;
    _cameraStart = { x: 0, y: 0 };
    _cameraOffset = { x: 28, y: -608 };
    _scrollT = 0;
    _subScreen = 'world';
    _channelAssetsLoaded = false;
    _selectedWorldId = 0;
    _selectedChannelId = 0;
    _channelGridDirty = false;
    _worlds = [];
    _worldsDirty = false;
    _statusLabel = 'Loading worlds...';
    _channelPanelAnchor = { x: DEFAULT_CHANNEL_PANEL_X, y: DEFAULT_CHANNEL_PANEL_Y };
    _worldGridNudge = { x: 0, y: 0 };
    _worldBannerOffset = { x: 12, y: 6 };
    _chSelectOffset = { x: -2, y: -3 };
    _chGaugeOffset = { x: 2, y: 15 };
    _btBackPos = { x: 0, y: 546 };
    _btViewAllPos = { x: 670, y: 546 };
    _stepIndicatorPos = { x: 0, y: 0 };
    _frame = null;
    _frameSprite = null;
    _stepIndicator = null;
    _stepIndicatorSprite = null;
    _worldButtons = [];
    _worldFlags = [];
    _worldFlagContainers = [];
    _btBack = null;
    _btViewAll = null;
    // "View all characters" (CLogin::OnViewAllCharResult, decompile/5DE120.c)
    // accumulation state. subType===1 arrives first with the expected batch
    // count and total character count; subType===0 arrives once per world
    // with that world's characters, tagged with worldId since the combined
    // list can span multiple worlds.
    _vacCharacters = [];
    _vacBatchesExpected = -1;
    _vacBatchesReceived = 0;
    _vacLoginOpt = 0;
    _vacPending = false;
    _chBackgrn = null;
    _chSelect = null;
    _worldBanner = null;
    _chGauge = null;
    _btGoWorld = null;
    _channelNormal = Array(20).fill(null);
    _channelDisabled = Array(20).fill(null);
    _bg;
    _mapContainer = new Container();
    _panelContainer = new Container();
    _worldBtnContainer = new Container();
    _channelContainer = new Container();
    _statusText;
    constructor(ui, map, sound) {
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
    onEnter(game) {
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
        }
        else {
            game.session.send(LoginSender.WorldInfoRequest());
        }
    }
    onExit() {
        this.game.loginHandlers.onWorldListComplete = null;
        this.game.loginHandlers.onSelectWorldResult = null;
        this.game.loginHandlers.onViewAllCharResult = null;
        this.game.session.onDisconnected = null;
        this._loader.Dispose();
        super.onExit();
    }
    update(dt) {
        if (this._worldsDirty) {
            this._buildWorldButtons();
            this._worldsDirty = false;
        }
        if (this._chSelect)
            this._chSelect.Update(dt * 1000);
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
    draw() {
        this.drawFrameMuteButton();
    }
    onMouseButton(x, y, down, button) {
        if (button !== MouseButton.Left)
            return;
        if (this._btBack?.handleMouseButton(x, y, down))
            return;
        if (this._btViewAll?.handleMouseButton(x, y, down))
            return;
        if (this._subScreen === 'world') {
            for (const bt of this._worldButtons) {
                if (bt.handleMouseButton(x, y, down))
                    return;
            }
        }
        else {
            if (this._btGoWorld?.handleMouseButton(x, y, down))
                return;
            if (!down)
                return;
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
    onKeyPress(key) {
        if (key === 'Enter') {
            if (this._subScreen === 'world') {
                if (this._worlds.length > 0)
                    this._onWorldClicked(this._worlds[0].worldId);
            }
            else {
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
    _buildMapScene() {
        const loginMap = this._ui.GetItem('MapLogin1.img');
        if (!(loginMap instanceof WzImage))
            return;
        try {
            this._scene.Load(loginMap.Root);
            const sp = this._scene.StartPoint ?? { x: 0, y: -8 };
            this._cameraStart = { x: sp.x + 28, y: sp.y - 8 };
            this._scene.SetCamera(this._cameraStart);
            this._mapContainer.addChild(this._scene.container);
        }
        catch (e) {
            console.warn('WorldSelectStage: MapScene load failed', e);
        }
    }
    _loadCommonAssets() {
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
        if (this._btBack)
            this._panelContainer.addChild(this._btBack.container);
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
    _onWorldListComplete(worlds) {
        this._worlds = worlds;
        this._worldsDirty = true;
        this._statusLabel = worlds.length === 0 ? 'No worlds available.' : '';
    }
    _onViewAllClicked() {
        if (this._vacPending)
            return;
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
    _onViewAllCharResult(args, game) {
        switch (args.subType) {
            case 1:
                this._vacBatchesExpected = args.countRelatedSvrs ?? 0;
                if (this._vacBatchesExpected === 0)
                    this._finishViewAllChars(game);
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
            case 3:
            case 6:
            case 7:
                this._vacPending = false;
                this._statusLabel = args.message || 'View all characters failed.';
                break;
            default:
                // 2, 4, 5: no further data, no client-side action needed.
                break;
        }
    }
    _finishViewAllChars(game) {
        this._vacPending = false;
        this._statusLabel = `Character list: ${this._vacCharacters.length} characters across ${Math.max(this._vacBatchesReceived, 1)} world(s).`;
        game.session.account.loginOpt = this._vacLoginOpt;
        game.session.characters = this._vacCharacters;
        game.stageDirector.replace(new CharSelectStage(this._ui, this._map, this._sound, game.wz.character ?? null, game.wz.item ?? null, game.wz.base ?? null, this._selectedWorldId, this._selectedChannelId, this._scene.Camera, { x: 28, y: -1208 }));
    }
    _onSelectWorldResult(args, game) {
        if (!args.success) {
            this._statusLabel = `World select failed (code ${args.resultCode ?? -1}).`;
            return;
        }
        this._statusLabel = `Character list: ${args.characters.length} characters.`;
        game.session.characters = [...args.characters];
        game.stageDirector.replace(new CharSelectStage(this._ui, this._map, this._sound, game.wz.character ?? null, game.wz.item ?? null, game.wz.base ?? null, this._selectedWorldId, this._selectedChannelId, this._scene.Camera, { x: 28, y: -1208 }));
    }
    _buildWorldButtons() {
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
            if (!bt)
                continue;
            this._worldButtons.push(bt);
            this._worldBtnContainer.addChild(bt.container);
            const flag = world.state > 0 ? this._loadCanvas(`Login.img/WorldNotice/${world.state}/0`) : null;
            this._worldFlags.push(flag);
            if (flag) {
                const fc = new Container();
                fc.addChild(flag.ToPixi());
                this._worldFlagContainers.push(fc);
                this._worldBtnContainer.addChild(fc);
            }
            else {
                this._worldFlagContainers.push(new Container());
            }
        }
    }
    _onWorldClicked(worldId) {
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
    _loadChannelAssets() {
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
    _onChannelClicked(channelId) {
        if (channelId === this._selectedChannelId) {
            this._enterWorld();
            return;
        }
        this._selectedChannelId = channelId;
        this._channelGridDirty = true;
        this._playClick();
    }
    _enterWorld() {
        this._statusLabel = `Joining world ${this._selectedWorldId} ch ${this._selectedChannelId}...`;
        this.game.session.send(LoginSender.SelectWorld(this._selectedWorldId, this._selectedChannelId));
    }
    _channelCellTopLeft(idx) {
        const col = idx % ChannelGridCols;
        const row = Math.floor(idx / ChannelGridCols);
        return {
            x: this._channelPanelAnchor.x + ChannelCellBaseX + col * ChannelCellStepX,
            y: this._channelPanelAnchor.y + ChannelCellBaseY + row * ChannelCellStepY,
        };
    }
    get _selectedWorld() {
        return this._worlds.find(w => w.worldId === this._selectedWorldId);
    }
    _maxChannelUsers() {
        const w = this._selectedWorld;
        if (!w || w.channels.length === 0)
            return 0;
        let max = 0;
        for (const ch of w.channels) {
            if (ch.userCount > max)
                max = ch.userCount;
        }
        return max;
    }
    _applyLayout() {
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
            this._btGoWorld.container.position.set(this._channelPanelAnchor.x + GoWorldBtnX, this._channelPanelAnchor.y + GoWorldBtnY);
        }
        if (this._channelGridDirty) {
            this._renderChannelGrid();
            this._channelGridDirty = false;
        }
    }
    _renderChannelGrid() {
        this._channelContainer.removeChildren();
        if (this._subScreen !== 'channel')
            return;
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
            s.position.set(this._channelPanelAnchor.x + this._worldBannerOffset.x, this._channelPanelAnchor.y + this._worldBannerOffset.y);
            this._channelContainer.addChild(s);
        }
        const channelCount = this._selectedWorld?.channels.length ?? 0;
        const maxUsers = this._maxChannelUsers();
        for (let i = 0; i < 20; i++) {
            const enabled = i < channelCount;
            const sprite = enabled ? this._channelNormal[i] : this._channelDisabled[i];
            if (!sprite)
                continue;
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
                const frac = maxUsers > 0 ? Math.min(1, this._selectedWorld.channels[i].userCount / maxUsers) : 0;
                const fillW = Math.floor(this._chGauge.Width * frac);
                if (fillW > 0) {
                    const g = new Graphics();
                    g.rect(cell.x + this._chGaugeOffset.x, cell.y + this._chGaugeOffset.y, fillW, this._chGauge.Height).fill({ color: 0x00FF00 });
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
    _goBackToLogin() {
        this._playClick();
        this.game.session.disconnectAsync();
        this.stageDirector.replace(new LoginStage(this._ui, this._map, this._sound, new WzTextureLoader()));
    }
    _playClick() {
        try {
            const node = this._sound?.GetItem('UI.img/BtMouseClick');
            if (node instanceof WzSound) {
                this.game.audioPlayer.PlayEffect(node.AudioBytes);
            }
        }
        catch { /* no sound */ }
    }
    _loadCanvas(path) {
        try {
            const item = this._ui.GetItem(path);
            return item instanceof WzCanvas ? this._loader.Load(item) : null;
        }
        catch {
            return null;
        }
    }
    _makeButton(path, onClick) {
        try {
            const root = this._ui.GetItem(path);
            if (!root)
                return null;
            const b = Button.fromWz(this._loader, root);
            b.onClick = onClick;
            return b;
        }
        catch {
            return null;
        }
    }
    _lerp(a, b, t) {
        return a + (b - a) * t;
    }
    _smoothStep(t) {
        t = Math.max(0, Math.min(1, t));
        return t * t * (3 - 2 * t);
    }
}
//# sourceMappingURL=WorldSelectStage.js.map