import { Graphics } from 'pixi.js';
import { Stage, MouseButton } from '../app/Stage.js';
import { CharSelectStage } from './CharSelectStage.js';
import { CharCreationStage } from './CharCreationStage.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzSound } from '../wz/WzSound.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { Button } from '../ui/Button.js';
export class RaceSelectStage extends Stage {
    static RaceDualBlade = 0;
    static RaceExplorer = 1;
    static RaceCygnus = 2;
    static RaceAran = 3;
    static RaceEvan = 4;
    static RaceResistance = 5;
    static RaceNames = [
        'Dual Blade', 'Explorer', 'Cygnus Knight', 'Aran', 'Evan', 'Resistance',
    ];
    static ConfirmBannerIndex = [4, 0, 1, 2, 3, 5];
    _ui;
    _map;
    _sound;
    _charWz;
    _itemWz;
    _baseWz;
    _worldId;
    _channelId;
    _cameraStart;
    _loginCameraOffset;
    _loader;
    // Sprites created once in onEnter
    _backSprite = null;
    _frameSprite = null;
    _stepSprite = null;
    _badgeSprites = [];
    // Buttons
    _btNormal = null;
    _btKnight = null;
    _btAran = null;
    _btEvan = null;
    _btResistance = null;
    _btDual = null;
    _btBack = null;
    _allButtons = [];
    // Confirm dialog
    _confirmDim = null;
    _confirmBgSprite = null;
    _confirmBannerSprites = [null, null, null, null, null, null];
    _confirmOk = null;
    _confirmCancel = null;
    _pendingRace = -1;
    // Positions (mirroring C# field assignments)
    _btResistancePos = { x: 45, y: 43 };
    _btDualPos = { x: 405, y: 43 };
    _btNormalPos = { x: 580, y: 43 };
    _btKnightPos = { x: 45, y: 295 };
    _btAranPos = { x: 284, y: 295 };
    _btEvanPos = { x: 524, y: 295 };
    _stepHeaderPos = { x: 0, y: 0 };
    _btBackPos = { x: 0, y: 546 };
    _confirmPos = { x: 293, y: 244 };
    constructor(ui, map, sound, charWz, itemWz, baseWz, worldId, channelId, cameraStart, loginCameraOffset) {
        super();
        this._ui = ui;
        this._map = map;
        this._sound = sound;
        this._charWz = charWz;
        this._itemWz = itemWz;
        this._baseWz = baseWz;
        this._worldId = worldId;
        this._channelId = channelId;
        this._cameraStart = cameraStart;
        this._loginCameraOffset = loginCameraOffset;
        this._loader = new WzTextureLoader();
    }
    onEnter(game) {
        super.onEnter(game);
        // Black backdrop
        const bg = new Graphics();
        bg.rect(0, 0, 800, 600).fill({ color: 0x000000 });
        this.uiRoot.addChild(bg);
        // Race select background
        this._backSprite = this._loadSprite('Login.img/RaceSelect/backgrnd');
        if (this._backSprite)
            this.uiRoot.addChild(this._backSprite);
        // Step header
        this._stepSprite = this._loadSprite('Login.img/Common/step/3');
        if (this._stepSprite)
            this.uiRoot.addChild(this._stepSprite);
        // Race buttons (6 jobs — added to _allButtons and to the display tree)
        this._btNormal = this._makeButton('Login.img/RaceSelect/BtNormal', () => this._choose(RaceSelectStage.RaceExplorer));
        this._btKnight = this._makeButton('Login.img/RaceSelect/BtKnight', () => this._choose(RaceSelectStage.RaceCygnus));
        this._btAran = this._makeButton('Login.img/RaceSelect/BtAran', () => this._choose(RaceSelectStage.RaceAran));
        this._btEvan = this._makeButton('Login.img/RaceSelect/BtEvan', () => this._choose(RaceSelectStage.RaceEvan));
        this._btResistance = this._makeButton('Login.img/RaceSelect/BtResistance', () => this._choose(RaceSelectStage.RaceResistance));
        this._btDual = this._makeButton('Login.img/RaceSelect/BtDual', () => this._choose(RaceSelectStage.RaceDualBlade));
        if (this._btResistance)
            this.uiRoot.addChild(this._btResistance.container);
        if (this._btDual)
            this.uiRoot.addChild(this._btDual.container);
        if (this._btNormal)
            this.uiRoot.addChild(this._btNormal.container);
        if (this._btKnight)
            this.uiRoot.addChild(this._btKnight.container);
        if (this._btAran)
            this.uiRoot.addChild(this._btAran.container);
        if (this._btEvan)
            this.uiRoot.addChild(this._btEvan.container);
        // Back button NOT in _allButtons — draws on top of frame
        this._btBack = this._makeStandaloneButton('Login.img/Common/BtStart', () => this._goBack());
        // "New" badge on Resistance, Dual, Evan
        const badgePositions = [this._btResistancePos, this._btDualPos, this._btEvanPos];
        for (const pos of badgePositions) {
            const s = this._loadSprite('Login.img/RaceSelect/new/0');
            if (s) {
                s.position.set(pos.x + 4, pos.y - 6);
                this._badgeSprites.push(s);
                this.uiRoot.addChild(s);
            }
        }
        // Common frame centered
        this._frameSprite = this._loadSprite('Login.img/Common/frame');
        if (this._frameSprite)
            this.uiRoot.addChild(this._frameSprite);
        // Back button
        if (this._btBack)
            this.uiRoot.addChild(this._btBack.container);
        // Confirm dialog — all hidden until a race is chosen
        this._confirmDim = new Graphics();
        this._confirmDim.rect(0, 0, 800, 600).fill({ color: 0x000000, alpha: 140 / 255 });
        this._confirmDim.visible = false;
        this.uiRoot.addChild(this._confirmDim);
        this._confirmBgSprite = this._loadSprite('Login.img/RaceSelect/confirm/backgrnd');
        if (this._confirmBgSprite) {
            this._confirmBgSprite.visible = false;
            this.uiRoot.addChild(this._confirmBgSprite);
        }
        for (let i = 0; i < 6; i++) {
            const s = this._loadSprite(`Login.img/RaceSelect/confirm/race/${i}`);
            if (s) {
                this._confirmBannerSprites[i] = s;
                s.visible = false;
                this.uiRoot.addChild(s);
            }
        }
        this._confirmOk = this._makeStandaloneButton('Login.img/RaceSelect/confirm/BtOK', () => this._onConfirmOk());
        this._confirmCancel = this._makeStandaloneButton('Login.img/RaceSelect/confirm/BtCancel', () => this._onConfirmCancel());
        if (this._confirmOk)
            this.uiRoot.addChild(this._confirmOk.container);
        if (this._confirmCancel)
            this.uiRoot.addChild(this._confirmCancel.container);
    }
    onExit() {
        this._loader.Dispose();
        super.onExit();
    }
    update(_dt) {
        // Apply all positions (mirrors C# ApplyLayout())
        if (this._btResistance)
            this._btResistance.container.position.set(this._btResistancePos.x, this._btResistancePos.y);
        if (this._btDual)
            this._btDual.container.position.set(this._btDualPos.x, this._btDualPos.y);
        if (this._btNormal)
            this._btNormal.container.position.set(this._btNormalPos.x, this._btNormalPos.y);
        if (this._btKnight)
            this._btKnight.container.position.set(this._btKnightPos.x, this._btKnightPos.y);
        if (this._btAran)
            this._btAran.container.position.set(this._btAranPos.x, this._btAranPos.y);
        if (this._btEvan)
            this._btEvan.container.position.set(this._btEvanPos.x, this._btEvanPos.y);
        if (this._btBack)
            this._btBack.container.position.set(this._btBackPos.x, this._btBackPos.y);
        // Badge positions
        const badgePositions = [this._btResistancePos, this._btDualPos, this._btEvanPos];
        for (let i = 0; i < this._badgeSprites.length; i++) {
            const pos = badgePositions[i];
            const s = this._badgeSprites[i];
            if (s)
                s.position.set(pos.x + 4, pos.y - 6);
        }
        // Frame centered
        if (this._frameSprite)
            this._frameSprite.position.set(400, 300);
        // Step header
        if (this._stepSprite)
            this._stepSprite.position.set(this._stepHeaderPos.x, this._stepHeaderPos.y);
        // Confirm dialog positions
        if (this._confirmBgSprite)
            this._confirmBgSprite.position.set(this._confirmPos.x, this._confirmPos.y);
        if (this._confirmOk)
            this._confirmOk.container.position.set(this._confirmPos.x + 42, this._confirmPos.y + 77);
        if (this._confirmCancel)
            this._confirmCancel.container.position.set(this._confirmPos.x + 114, this._confirmPos.y + 77);
        // Confirm banner position
        if (this._pendingRace >= 0) {
            const bannerIdx = RaceSelectStage.ConfirmBannerIndex[this._pendingRace];
            const banner = this._confirmBannerSprites[bannerIdx];
            if (banner && banner.width) {
                const bx = this._confirmPos.x + (214 - banner.width) / 2;
                banner.position.set(bx, this._confirmPos.y + 10);
            }
        }
    }
    draw() {
        // All rendering handled by uiRoot container (children added in onEnter)
        // Positions updated in update()
    }
    onMouseButton(x, y, down, button) {
        if (button !== MouseButton.Left)
            return;
        if (this._pendingRace >= 0) {
            this._confirmOk?.handleMouseButton(x, y, down);
            this._confirmCancel?.handleMouseButton(x, y, down);
            return;
        }
        if (this._btBack?.handleMouseButton(x, y, down) === true)
            return;
        for (const b of this._allButtons) {
            if (b.handleMouseButton(x, y, down))
                return;
        }
    }
    onKeyPress(key) {
        if (this._pendingRace >= 0) {
            if (key === 'Enter') {
                this._onConfirmOk();
                return;
            }
            if (key === 'Escape') {
                this._onConfirmCancel();
                return;
            }
            return;
        }
        if (key === 'Escape' || key === 'Backspace') {
            this._goBack();
        }
    }
    _choose(uiRace) {
        this._playClick();
        this._pendingRace = uiRace;
        this._updateConfirmVisibility();
    }
    _onConfirmCancel() {
        this._playClick();
        this._pendingRace = -1;
        this._updateConfirmVisibility();
    }
    _onConfirmOk() {
        const uiRace = this._pendingRace;
        this._pendingRace = -1;
        this._playClick();
        this.stageDirector.replace(new CharCreationStage(this._ui, this._map, this._sound, this._worldId, this._channelId, true, uiRace, this._cameraStart, this._loginCameraOffset));
    }
    _goBack() {
        this._playClick();
        this.stageDirector.replace(new CharSelectStage(this._ui, this._map, this._sound, this._charWz, this._itemWz, this._baseWz, this._worldId, this._channelId, this._cameraStart, this._loginCameraOffset));
    }
    _updateConfirmVisibility() {
        const show = this._pendingRace >= 0;
        if (this._confirmDim)
            this._confirmDim.visible = show;
        if (this._confirmBgSprite)
            this._confirmBgSprite.visible = show;
        if (this._confirmOk)
            this._confirmOk.container.visible = show;
        if (this._confirmCancel)
            this._confirmCancel.container.visible = show;
        // Only show the matching banner
        for (let i = 0; i < this._confirmBannerSprites.length; i++) {
            const s = this._confirmBannerSprites[i];
            if (s)
                s.visible = show && i === RaceSelectStage.ConfirmBannerIndex[this._pendingRace];
        }
        // Hide race buttons while confirm is up
        const showButtons = !show;
        if (this._btNormal)
            this._btNormal.container.visible = showButtons;
        if (this._btKnight)
            this._btKnight.container.visible = showButtons;
        if (this._btAran)
            this._btAran.container.visible = showButtons;
        if (this._btEvan)
            this._btEvan.container.visible = showButtons;
        if (this._btResistance)
            this._btResistance.container.visible = showButtons;
        if (this._btDual)
            this._btDual.container.visible = showButtons;
        for (const s of this._badgeSprites)
            s.visible = showButtons;
    }
    _playClick() {
        try {
            if (this._sound?.GetItem('UI.img/BtMouseClick') instanceof WzSound) {
                // sound available via .AudioBytes if needed
            }
        }
        catch { /* no sound */ }
    }
    _loadSprite(path) {
        try {
            const item = this._ui.GetItem(path);
            if (!(item instanceof WzCanvas))
                return null;
            return this._loader.Load(item)?.ToPixi() ?? null;
        }
        catch {
            return null;
        }
    }
    _makeButton(path, onClick) {
        const b = this._makeStandaloneButton(path, onClick);
        if (b)
            this._allButtons.push(b);
        return b;
    }
    _makeStandaloneButton(path, onClick) {
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
}
//# sourceMappingURL=RaceSelectStage.js.map