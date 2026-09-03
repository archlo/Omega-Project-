import { Container, Graphics, Text } from 'pixi.js';
import { Stage, MouseButton } from '../app/Stage.js';
import { LoginSender } from '../net/senders/LoginSender.js';
import { RaceSelectStage } from './RaceSelectStage.js';
import { WorldSelectStage } from './WorldSelectStage.js';
import { GameStage } from './GameStage.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzImage } from '../wz/WzImage.js';
import { WzSound } from '../wz/WzSound.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { MapScene } from '../map/MapScene.js';
import { CharLook } from '../character/CharLook.js';
import { CharacterRenderer } from '../character/CharacterRenderer.js';
import { Stance, StanceToWzKey } from '../character/Stance.js';
import { LoginNoticeOverlay } from '../ui/LoginNoticeOverlay.js';
import { SoftKeyOverlay } from '../ui/SoftKeyOverlay.js';
import { SystemNoticeOverlay } from '../ui/SystemNoticeOverlay.js';
import { Button } from '../ui/Button.js';
import { BuiltInFont } from '../ui/BuiltInFont.js';
const SlotCount = 3;
const SlotBaseMapX = -120;
const SlotBaseMapY = -1138;
const SlotStepX = 125;
const SlotStepY = 0;
const PageLMapX = -260;
const PageLMapY = -1215;
const PageRMapX = 188;
const PageRMapY = -1213;
const BtSelectMapX = 259;
const BtSelectMapY = -1361;
const BtNewMapX = 259;
const BtNewMapY = -1323;
const BtDeleteMapX = 259;
const BtDeleteMapY = -1274;
const ScrollDuration = 1.5;
const ScrollUnrollDuration = 0.28;
const WalkFrameDur = 0.18;
const ScrollOffsetX = -108;
const ScrollOffsetY = -320;
const CardOffsetX = 17;
const CardOffsetY = 30;
export class CharSelectStage extends Stage {
    _ui;
    _map;
    _sound;
    _charWz;
    _itemWz;
    _baseWz;
    _worldId;
    _channelId;
    _cameraStart = { x: 0, y: 0 };
    _cameraOffset = { x: 28, y: -1208 };
    _loader;
    _scene;
    _renderer;
    _commonFrame = null;
    _commonFrameSprite = null;
    _stepIndicator = null;
    _stepIndicatorSprite = null;
    _chLabel = null;
    _chLabelSprite = null;
    _charEmpty = null;
    _charInfo = null;
    _charInfoNoRank = null;
    _effectSelected = null;
    _pageL = null;
    _pageR = null;
    _platforms = new Map();
    _scrollFrames = [null, null, null, null];
    _rankUp = null;
    _rankDown = null;
    _rankSame = null;
    _btSelect = null;
    _btNew = null;
    _btDelete = null;
    _btBack = null;
    _notice;
    _softKey;
    _sysNotice;
    _rollDown = null;
    _selectedSlot = -1;
    _page = 0;
    _scrollAnimT = 0;
    _walkAnimT = 0;
    _lastClickSlot = -1;
    _lastClickTime = 0;
    _scrollT = 0;
    _charSlots = [];
    _slotsContainer = new Container();
    _overlayContainer = new Container();
    _scrollContainer = new Container();
    _arrowContainer = new Container();
    _nameContainer = new Container();
    _bg;
    _chContainer = new Container();
    constructor(ui, map, sound, charWz, itemWz, baseWz, worldId, channelId, cameraStart, loginCameraOffset) {
        super();
        this._ui = ui ?? {};
        this._map = map ?? null;
        this._sound = sound ?? null;
        this._charWz = charWz ?? null;
        this._itemWz = itemWz ?? null;
        this._baseWz = baseWz ?? null;
        this._worldId = worldId ?? 0;
        this._channelId = channelId ?? 0;
        this._cameraStart = cameraStart ?? { x: 0, y: 0 };
        this._cameraOffset = loginCameraOffset ? { x: loginCameraOffset.x, y: -1208 } : { x: 28, y: -1208 };
        this._loader = new WzTextureLoader();
        this._scene = new MapScene(this._map, this._loader);
        this._renderer = new CharacterRenderer(this._charWz, this._itemWz, this._baseWz, this._loader);
        this._notice = new LoginNoticeOverlay(this._loader, this._ui, new BuiltInFont(14), { x: 400, y: 300 });
        this._sysNotice = new SystemNoticeOverlay(this._loader, this._ui, { x: 400, y: 300 });
        this._softKey = new SoftKeyOverlay(this._loader, this._ui, new BuiltInFont(11), { x: 400, y: 300 });
        this._bg = new Graphics();
        this._bg.rect(0, 0, 800, 600).fill({ color: 0x0A1024 });
    }
    onEnter(game) {
        super.onEnter(game);
        this.uiRoot.addChild(this._bg);
        this.uiRoot.addChild(this._scene.container);
        this.uiRoot.addChild(this._slotsContainer);
        this.uiRoot.addChild(this._nameContainer);
        this.uiRoot.addChild(this._arrowContainer);
        this.uiRoot.addChild(this._scrollContainer);
        this.uiRoot.addChild(this._chContainer);
        this.uiRoot.addChild(this._overlayContainer);
        this._loadMapScene();
        this._loadAssets();
        this._buildCharSlots();
        this._buildButtons();
        this._loadSounds();
        this._notice.container.visible = false;
        this._softKey.container.visible = false;
        this._sysNotice.container.visible = false;
        this._overlayContainer.addChild(this._notice.container);
        this._overlayContainer.addChild(this._softKey.container);
        this._overlayContainer.addChild(this._sysNotice.container);
        game.loginHandlers.onSelectCharacterResult = (args) => this._onSelectCharacterResult(args, game);
        game.loginHandlers.onDeleteCharacterResult = (args) => this._onDeleteCharacterResult(args);
        game.loginHandlers.onCheckSpwResult = (args) => this._onSelectCharacterResult(args, game);
        game.loginHandlers.onCheckSpwFailed = () => this._onCheckSpwFailed();
        game.loginHandlers.onEnableSpwResult = (args) => this._onEnableSpwResult(args);
        if (game.session.characters.length > 0) {
            this._selectSlot(0);
        }
        this._chContainer.addChild(this._notice.container);
        this._chContainer.addChild(this._softKey.container);
        this._chContainer.addChild(this._sysNotice.container);
    }
    onExit() {
        this.game.loginHandlers.onSelectCharacterResult = null;
        this.game.loginHandlers.onDeleteCharacterResult = null;
        this.game.loginHandlers.onCheckSpwResult = null;
        this.game.loginHandlers.onCheckSpwFailed = null;
        this.game.loginHandlers.onEnableSpwResult = null;
        this._loader.Dispose();
        super.onExit();
    }
    update(dt) {
        // These overlays' own .isVisible flag is the source of truth (set by
        // show()/Show()); container.visible must be kept in sync each frame —
        // it was previously set false once at init and never touched again,
        // making every notice/PIC-entry popup on this screen permanently
        // invisible and non-interactive (input dispatch below also checks
        // .isVisible now, not the stale container.visible).
        this._notice.container.visible = this._notice.isVisible;
        this._sysNotice.container.visible = this._sysNotice.isVisible;
        this._softKey.container.visible = this._softKey.isVisible;
        this._notice.draw();
        this._softKey.update(dt);
        this._scene.update(dt * 1000);
        this._scrollT = Math.min(1, this._scrollT + dt / ScrollDuration);
        const sp = this._scene.StartPoint ?? { x: 0, y: 0 };
        const targetX = sp.x + this._cameraOffset.x;
        const targetY = sp.y + this._cameraOffset.y;
        const camX = this._lerp(this._cameraStart.x, targetX, this._smoothStep(this._scrollT));
        const camY = this._lerp(this._cameraStart.y, targetY, this._smoothStep(this._scrollT));
        this._scene.SetCamera({ x: camX, y: camY });
        if (this._selectedSlot >= 0) {
            this._scrollAnimT = Math.min(1, this._scrollAnimT + dt / ScrollUnrollDuration);
        }
        this._walkAnimT += dt;
        this._updateCharSlots(dt);
        this._applyLayout();
    }
    draw() {
        this.drawFrameMuteButton();
    }
    _updateCharSlots(_dt) {
        const chars = this.game.session.characters;
        for (let i = 0; i < SlotCount; i++) {
            const absIdx = this._page * SlotCount + i;
            const slot = this._charSlots[i];
            if (!slot.charLook)
                continue;
            const isSelected = absIdx === this._selectedSlot;
            if (isSelected) {
                const entry = chars[absIdx];
                if (entry) {
                    const twoHanded = this._renderer.IsTwoHanded(entry.look);
                    const stanceKey = twoHanded ? StanceToWzKey(Stance.Walk2) : StanceToWzKey(Stance.Walk1);
                    const frameCount = this._renderer.FrameCount(entry.look, stanceKey);
                    const frame = Math.floor((this._walkAnimT / WalkFrameDur) % Math.max(1, frameCount));
                    slot.charLook.StartAction(stanceKey);
                    slot.charLook.Update(_dt, { x: 0, y: 0 }, false, false);
                }
            }
            else {
                slot.charLook.StartAction('stand1');
                slot.charLook.Update(_dt, { x: 0, y: 0 }, false, false);
            }
        }
    }
    onMouseButton(x, y, down, button) {
        if (button !== MouseButton.Left)
            return;
        if (this._softKey.isVisible) {
            this._softKey.handleMouseButton(x, y, down);
            return;
        }
        if (this._sysNotice.isVisible) {
            this._sysNotice.handleMouseButton(x, y, down);
            return;
        }
        if (this._notice.isVisible) {
            this._notice.handleMouseButton(x, y, down);
            return;
        }
        // Buttons need both down and up events (down = press, up = fire onClick).
        if (this._btSelect?.handleMouseButton(x, y, down))
            return;
        if (this._btNew?.handleMouseButton(x, y, down))
            return;
        if (this._btDelete?.handleMouseButton(x, y, down))
            return;
        if (this._btBack?.handleMouseButton(x, y, down))
            return;
        if (!down)
            return;
        const chars = this.game.session.characters;
        const maxPage = chars.length === 0 ? 0 : Math.floor((chars.length - 1) / SlotCount);
        if (maxPage > 0) {
            if (this._page > 0 && this._hitSprite(this._pageL, PageLMapX, PageLMapY, x, y)) {
                this._onPageL();
                return;
            }
            if (this._page < maxPage && this._hitSprite(this._pageR, PageRMapX, PageRMapY, x, y)) {
                this._onPageR();
                return;
            }
        }
        for (let i = 0; i < SlotCount; i++) {
            const absIdx = this._page * SlotCount + i;
            const pos = this._slotScreen(i);
            const rect = { x: pos.x - 45, y: pos.y - 110, w: 90, h: 130 };
            if (x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h) {
                const now = Date.now();
                const isDouble = absIdx === this._lastClickSlot && (now - this._lastClickTime) < 400;
                this._lastClickSlot = absIdx;
                this._lastClickTime = now;
                this._selectSlot(absIdx);
                if (isDouble) {
                    this._onSelectClicked();
                }
                return;
            }
        }
    }
    onKeyPress(key) {
        if (this._softKey.isVisible) {
            this._softKey.onKeyPress(key);
            return;
        }
        if (this._sysNotice.isVisible) {
            this._sysNotice.onKeyPress(key);
            return;
        }
        if (this._notice.isVisible) {
            this._notice.onKeyPress(key);
            return;
        }
        switch (key) {
            case 'Backspace':
            case 'Escape':
                this._goBack();
                break;
            case 'Enter':
                if (this._selectedSlot >= 0)
                    this._onSelectClicked();
                break;
            case 'ArrowLeft':
                if (this._selectedSlot > 0)
                    this._selectSlot(this._selectedSlot - 1);
                break;
            case 'ArrowRight':
                if (this._selectedSlot < this.game.session.characters.length - 1)
                    this._selectSlot(this._selectedSlot + 1);
                break;
        }
    }
    onTextInput(character) {
        this._softKey.OnTextInput(character);
    }
    _loadMapScene() {
        const loginMap = this._ui.GetItem('MapLogin1.img');
        if (!(loginMap instanceof WzImage))
            return;
        try {
            this._scene.Load(loginMap.Root);
            this._scene.SetCamera(this._cameraStart);
        }
        catch (e) {
            console.warn('CharSelectStage: MapScene load failed', e);
        }
    }
    _loadAssets() {
        this._commonFrame = this._loadCanvas('Login.img/Common/frame');
        if (this._commonFrame) {
            this._commonFrameSprite = this._commonFrame.ToPixi();
            this._commonFrameSprite.position.set(400, 300);
            this._chContainer.addChild(this._commonFrameSprite);
        }
        this._stepIndicator = this._loadCanvas('Login.img/Common/step/2');
        if (this._stepIndicator) {
            this._stepIndicatorSprite = this._stepIndicator.ToPixi();
            this._stepIndicatorSprite.position.set(0, 0);
            this._chContainer.addChild(this._stepIndicatorSprite);
        }
        this._chLabel = this._loadCanvas('Login.img/Common/selectWorld');
        if (this._chLabel) {
            this._chLabelSprite = this._chLabel.ToPixi();
            this._chLabelSprite.position.set(688, 18);
            this._chContainer.addChild(this._chLabelSprite);
        }
        this._charEmpty = this._loadCanvas('Login.img/CharSelect/character/1/0');
        this._charInfo = this._loadCanvas('Login.img/CharSelect/charInfo1');
        this._charInfoNoRank = this._loadCanvas('Login.img/CharSelect/charInfo');
        this._rankUp = this._loadCanvas('Login.img/CharSelect/icon/up/0') ?? this._loadCanvas('Login.img/CharSelect/icon/up');
        this._rankDown = this._loadCanvas('Login.img/CharSelect/icon/down/0') ?? this._loadCanvas('Login.img/CharSelect/icon/down');
        this._rankSame = this._loadCanvas('Login.img/CharSelect/icon/same/0') ?? this._loadCanvas('Login.img/CharSelect/icon/same');
        this._effectSelected = this._loadCanvas('Login.img/CharSelect/effect/0/0');
        this._pageL = this._loadCanvas('Login.img/CharSelect/pageL/0/0');
        this._pageR = this._loadCanvas('Login.img/CharSelect/pageR/0/0');
        for (const g of ['adventure', 'knight', 'aran', 'evan', 'resistance']) {
            this._platforms.set(g, this._loadCanvas(`Login.img/CharSelect/${g}/0`));
        }
        for (let i = 0; i < 4; i++) {
            this._scrollFrames[i] = this._loadCanvas(`Login.img/CharSelect/scroll/${i}/0`);
        }
    }
    _buildButtons() {
        this._btSelect = this._makeButton('Login.img/CharSelect/BtSelect', () => this._onSelectClicked());
        this._btNew = this._makeButton('Login.img/CharSelect/BtNew', () => this._onNewClicked());
        this._btDelete = this._makeButton('Login.img/CharSelect/BtDelete', () => this._onDeleteClicked());
        this._btBack = this._makeButton('Login.img/Common/BtStart', () => this._goBack());
        if (this._btSelect) {
            this._btSelect.enabled = false;
            this._chContainer.addChild(this._btSelect.container);
        }
        if (this._btNew)
            this._chContainer.addChild(this._btNew.container);
        if (this._btDelete) {
            this._btDelete.enabled = false;
            this._chContainer.addChild(this._btDelete.container);
        }
        if (this._btBack)
            this._chContainer.addChild(this._btBack.container);
    }
    _buildCharSlots() {
        for (let i = 0; i < SlotCount; i++) {
            const container = new Container();
            this._slotsContainer.addChild(container);
            this._charSlots.push({
                charLook: null,
                container,
                hit: { x: 0, y: 0, w: 90, h: 130 },
            });
        }
        this._rebuildCharLooks();
    }
    _rebuildCharLooks() {
        const chars = this.game.session.characters;
        for (let i = 0; i < SlotCount; i++) {
            const absIdx = this._page * SlotCount + i;
            const slot = this._charSlots[i];
            slot.container.removeChildren();
            if (absIdx >= chars.length) {
                slot.charLook = null;
                continue;
            }
            const entry = chars[absIdx];
            const charLook = new CharLook(entry.look.skin);
            charLook.SetAvatar(entry.look);
            charLook.Load(this._charWz, this._itemWz, this._baseWz, this._loader);
            slot.charLook = charLook;
        }
    }
    _loadSounds() {
        try {
            const node = this._sound?.GetItem('UI.img/RollDown');
            if (node instanceof WzSound)
                this._rollDown = node;
        }
        catch { /* no roll sound */ }
        try {
            const node = this._sound?.GetItem('UI.img/CharSelect');
            if (node instanceof WzSound)
                this.game.audioPlayer.PlayEffect(node.AudioBytes);
        }
        catch { /* no enter sound */ }
    }
    _selectSlot(absIdx) {
        if (absIdx < 0 || absIdx >= this.game.session.characters.length)
            return;
        this._selectedSlot = absIdx;
        this._page = Math.floor(absIdx / SlotCount);
        this._scrollAnimT = 0;
        this._playRollDown();
        if (this._btSelect)
            this._btSelect.enabled = true;
        if (this._btDelete)
            this._btDelete.enabled = true;
        this._rebuildCharLooks();
    }
    _clearSelection() {
        this._selectedSlot = -1;
        if (this._btSelect)
            this._btSelect.enabled = false;
        if (this._btDelete)
            this._btDelete.enabled = false;
    }
    _onSelectClicked() {
        if (this._selectedSlot < 0 || this._selectedSlot >= this.game.session.characters.length)
            return;
        const entry = this.game.session.characters[this._selectedSlot];
        // OG: CLogin::SendSelectCharPacketByVAC (decompile/5D7550.c) — when the
        // character came from the "view all characters" flow (worldId set per
        // entry, since the list can span multiple worlds), the same loginOpt
        // switch applies but every sender needs the character's own worldId
        // instead of the single shared world this stage normally assumes.
        const worldId = entry.worldId;
        switch (this.game.session.account.loginOpt) {
            case 2:
                this._sendSelectCharacter(entry, worldId);
                break;
            case 1:
                this._softKey.Show('', (pic) => this._sendCheckSpw(entry, pic, worldId));
                break;
            default:
                this._beginRegisterPic(entry, worldId);
                break;
        }
    }
    _sendSelectCharacter(entry, worldId) {
        this.game.session.send(worldId !== undefined
            ? LoginSender.SelectCharacterByVAC(entry.stat.characterId, worldId)
            : LoginSender.SelectCharacter(entry.stat.characterId));
    }
    _sendCheckSpw(entry, pic, worldId) {
        this.game.session.send(worldId !== undefined
            ? LoginSender.CheckSPWRequestByVAC(entry.stat.characterId, worldId, pic)
            : LoginSender.CheckSPWRequest(pic, entry.stat.characterId));
    }
    _sendEnableSpw(entry, pic, worldId) {
        this.game.session.send(worldId !== undefined
            ? LoginSender.EnableSPWRequestByVAC(entry.stat.characterId, worldId, pic)
            : LoginSender.EnableSPWRequest(entry.stat.characterId, pic));
    }
    _beginRegisterPic(entry, worldId) {
        this._sysNotice.Show(95, () => this._askNewPic(entry, worldId));
    }
    _askNewPic(entry, worldId) {
        this._softKey.Show('', (first) => {
            this._softKey.Show('Please re-enter your PIC', (second) => {
                if (first === second) {
                    this._sendEnableSpw(entry, first, worldId);
                }
                else {
                    this._sysNotice.Show(41, () => this._askNewPic(entry, worldId));
                }
            });
        });
    }
    _onCheckSpwFailed() {
        // TODO_AUDIT.md CLoginUtilDlg pass: OG CLogin::OnCheckSPWResult (0x5d23f0)
        // shows CLoginUtilDlg::Error(93) — the real Login.img/Notice/text/93 image —
        // for a rejected PIC, not an ad-hoc English string. SystemNoticeOverlay
        // renders the WZ notice image by code, so use it here for the authentic
        // (and localized) message.
        this._sysNotice.Show(93, () => { });
    }
    /** CLogin::OnEnableSPWResult (decompile/5D2290.c, verified against v95_dump
     *  0x5d2290). code=0 success → Notice(39) if flag set else Notice(40);
     *  code 6/9 → Error(18), 0x14 → Error(93), 0x16 → Error(91), 0x17 → Error(92),
     *  any other code shows nothing. OG updates m_bLoginOpt to (flag==0)+1.
     *  TODO_AUDIT.md CLoginUtilDlg pass: these codes index Login.img/Notice/text/N
     *  (all present in UI.nx), so render the real WZ notice images via
     *  SystemNoticeOverlay instead of ad-hoc English strings. */
    _onEnableSpwResult(args) {
        const { flag, code } = args;
        if (code !== 0) {
            // 6/9 → 18, 0x14(20) → 93, 0x16(22) → 91, 0x17(23) → 92; else nothing.
            const errText = { 6: 18, 9: 18, 20: 93, 22: 91, 23: 92 };
            const textId = errText[code];
            if (textId !== undefined)
                this._sysNotice.Show(textId, () => { });
            return;
        }
        // OG: m_bLoginOpt = (v3 == 0) + 1  → flag=1→loginOpt=1, flag=0→loginOpt=2
        this.game.session.account.loginOpt = (flag ? 0 : 1) + 1;
        // OG: if (flag) Notice(39) else Notice(40) — PIC registered / removed.
        this._sysNotice.Show(flag ? 39 : 40, () => { });
    }
    _onNewClicked() {
        this.stageDirector.replace(new RaceSelectStage(this._ui, this._map, this._sound, this._charWz, this._itemWz, this._baseWz, this._worldId, this._channelId, this._cameraStart, this._cameraOffset));
    }
    _onDeleteClicked() {
        if (this._selectedSlot < 0 || this._selectedSlot >= this.game.session.characters.length)
            return;
        const charId = this.game.session.characters[this._selectedSlot].stat.characterId;
        if (this.game.session.account.loginOpt === 1) {
            this._softKey.Show('', (spw) => {
                this.game.session.send(LoginSender.DeleteCharacter(charId, spw));
            });
        }
        else if (window.confirm('Delete this character? This cannot be undone.')) {
            this.game.session.send(LoginSender.DeleteCharacter(charId, ''));
        }
    }
    _onPageL() {
        if (this._page <= 0)
            return;
        this._page--;
        this._clearSelection();
        this._rebuildCharLooks();
        this._playClick();
    }
    _onPageR() {
        const maxPage = this.game.session.characters.length === 0 ? 0 : Math.floor((this.game.session.characters.length - 1) / SlotCount);
        if (this._page >= maxPage)
            return;
        this._page++;
        this._clearSelection();
        this._rebuildCharLooks();
        this._playClick();
    }
    _onSelectCharacterResult(args, game) {
        if (!args.success || !args.channelHost) {
            this._notice.show(`Could not enter character (code ${args.resultCode ?? -1}).`);
            return;
        }
        game.session.worldId = this._worldId;
        game.session.channelId = this._channelId;
        game.migration.beginMigrateAsync(args.channelHost, args.channelPort ?? 0, args.characterId ?? 0);
        this.stageDirector.replace(new GameStage());
    }
    _onDeleteCharacterResult(args) {
        if (args.success) {
            this._selectedSlot = -1;
            this._page = Math.min(this._page, Math.max(0, Math.floor((this.game.session.characters.length - 1) / SlotCount)));
            if (this._btSelect)
                this._btSelect.enabled = false;
            if (this._btDelete)
                this._btDelete.enabled = false;
            this._notice.show('Character deleted.');
            this._rebuildCharLooks();
        }
        else {
            this._notice.show(this._deleteFailMessage(args.resultCode ?? 0));
        }
    }
    _deleteFailMessage(code) {
        switch (code) {
            case 20: return 'Incorrect PIC / 2nd password.';
            case 6: return 'Could not delete the character (server error).';
            case 22: return "A guild master's character cannot be deleted.";
            case 24: return 'An engaged character cannot be deleted.';
            case 29: return 'A character in a family cannot be deleted.';
            default: return `Could not delete the character (code ${code}).`;
        }
    }
    _goBack() {
        this.game.session.send(LoginSender.LogoutWorld());
        this.stageDirector.replace(new WorldSelectStage(this._ui, this._map, this._sound));
    }
    _slotScreen(i) {
        return this._scene.WorldToScreen(SlotBaseMapX + i * SlotStepX, SlotBaseMapY + i * SlotStepY, 800, 600);
    }
    _mapToScreen(mapX, mapY) {
        return this._scene.WorldToScreen(mapX, mapY, 800, 600);
    }
    _applyLayout() {
        const chars = this.game.session.characters;
        for (let i = 0; i < SlotCount; i++) {
            const absIdx = this._page * SlotCount + i;
            const screenPos = this._slotScreen(i);
            const slot = this._charSlots[i];
            // Container stays at (0,0); all sprites use absolute screen coordinates.
            slot.container.removeChildren();
            const hasChar = absIdx < chars.length;
            const isSelected = absIdx === this._selectedSlot;
            if (isSelected && this._effectSelected) {
                const eff = this._effectSelected.NewSprite();
                eff.position.set(screenPos.x, screenPos.y);
                slot.container.addChild(eff);
            }
            if (!hasChar) {
                if (this._charEmpty) {
                    const e = this._charEmpty.NewSprite();
                    e.position.set(screenPos.x, screenPos.y);
                    slot.container.addChild(e);
                }
                continue;
            }
            const entry = chars[absIdx];
            const platform = this._platforms.get(this._jobGroup(entry.stat.job));
            if (platform) {
                const ps = platform.NewSprite();
                ps.position.set(screenPos.x, screenPos.y);
                slot.container.addChildAt(ps, 0);
            }
            const stanceKey = isSelected
                ? (this._renderer.IsTwoHanded(entry.look) ? StanceToWzKey(Stance.Walk2) : StanceToWzKey(Stance.Walk1))
                : 'stand1';
            const frameCount = this._renderer.FrameCount(entry.look, stanceKey);
            const frame = isSelected
                ? Math.floor((this._walkAnimT / WalkFrameDur) % Math.max(1, frameCount))
                : 0;
            const results = this._renderer.Draw(entry.look, stanceKey, frame, screenPos.x, screenPos.y, false, 0, 0);
            const charContainer = new Container();
            charContainer.position.set(screenPos.x, screenPos.y);
            charContainer.scale.x = -1;
            for (let layerIdx = 0; layerIdx < 5; layerIdx++) {
                const sprites = results.layers[layerIdx];
                if (sprites.length === 0)
                    continue;
                const c = new Container();
                for (const s of sprites)
                    c.addChild(s);
                c.zIndex = layerIdx - 2;
                charContainer.addChild(c);
            }
            slot.container.addChild(charContainer);
        }
        if (this._btSelect) {
            const p = this._mapToScreen(BtSelectMapX, BtSelectMapY);
            this._btSelect.container.position.set(p.x, p.y);
        }
        if (this._btNew) {
            const p = this._mapToScreen(BtNewMapX, BtNewMapY);
            this._btNew.container.position.set(p.x, p.y);
        }
        if (this._btDelete) {
            const p = this._mapToScreen(BtDeleteMapX, BtDeleteMapY);
            this._btDelete.container.position.set(p.x, p.y);
        }
        if (this._btBack) {
            this._btBack.container.position.set(0, 546);
        }
        this._renderStatScroll();
        this._renderPageArrows();
        this._renderNameTags();
    }
    _renderStatScroll() {
        this._scrollContainer.removeChildren();
        if (this._selectedSlot < 0 || this._selectedSlot >= this.game.session.characters.length)
            return;
        const slotInPage = this._selectedSlot - this._page * SlotCount;
        if (slotInPage < 0 || slotInPage >= SlotCount)
            return;
        const screenPos = this._slotScreen(slotInPage);
        const scrollTL = { x: screenPos.x + ScrollOffsetX, y: screenPos.y + ScrollOffsetY };
        const frameIdx = Math.min(Math.floor(this._scrollAnimT * this._scrollFrames.length), this._scrollFrames.length - 1);
        const scrollFrame = this._scrollFrames[frameIdx];
        if (scrollFrame) {
            const s = scrollFrame.ToPixi();
            s.position.set(scrollTL.x, scrollTL.y);
            this._scrollContainer.addChild(s);
        }
        if (frameIdx < this._scrollFrames.length - 1)
            return;
        const entry = this.game.session.characters[this._selectedSlot];
        const board = this._charInfo ?? this._charInfoNoRank;
        if (board) {
            const cardX = scrollTL.x + CardOffsetX;
            const cardY = scrollTL.y + CardOffsetY;
            const bs = board.ToPixi();
            bs.position.set(cardX + board.OriginX, cardY + board.OriginY);
            this._scrollContainer.addChild(bs);
            this._drawCardStats(cardX, cardY, entry);
        }
    }
    _drawCardStats(boardX, boardY, entry) {
        const s = entry.stat;
        const style = { fontSize: 11, fill: 0x000000, fontFamily: 'Arial' };
        const add = (text, dx, dy) => {
            const t = new Text({ text, style });
            t.position.set(boardX + dx, boardY + dy);
            this._scrollContainer.addChild(t);
        };
        add(this._jobName(s.job), 46, 1);
        add(String(s.level), 46, 19);
        add(String(s.pop), 136, 19);
        add(String(s.str), 46, 37);
        add(String(s.int), 136, 37);
        add(String(s.dex), 46, 55);
        add(String(s.luk), 136, 55);
        // rank info row
        if (entry.rank) {
            add(`#${entry.rank.worldRank}`, 46, 73);
            this._drawRankArrow(boardX + 72, boardY + 73, entry.rank.worldRankMove);
            add(`#${entry.rank.jobRank}`, 136, 73);
            this._drawRankArrow(boardX + 162, boardY + 73, entry.rank.jobRankMove);
        }
    }
    _drawRankArrow(x, y, move) {
        if (move === 0)
            return;
        const sprite = move > 0 ? this._rankUp : this._rankDown;
        if (!sprite)
            return;
        const s = sprite.ToPixi();
        s.position.set(x, y);
        this._scrollContainer.addChild(s);
    }
    _jobName(job) {
        if (job === 0)
            return 'Beginner';
        if (job === 100)
            return 'Warrior';
        if (job === 110)
            return 'Fighter';
        if (job === 111)
            return 'Crusader';
        if (job === 112)
            return 'Hero';
        if (job === 120)
            return 'Page';
        if (job === 121)
            return 'White Knight';
        if (job === 122)
            return 'Paladin';
        if (job === 130)
            return 'Spearman';
        if (job === 131)
            return 'Dragon Knight';
        if (job === 132)
            return 'Dark Knight';
        if (job === 200)
            return 'Magician';
        if (job === 210)
            return 'Fire/Poison Wizard';
        if (job === 211)
            return 'F/P Mage';
        if (job === 212)
            return 'F/P Arch Mage';
        if (job === 220)
            return 'Ice/Lightning Wizard';
        if (job === 221)
            return 'I/L Mage';
        if (job === 222)
            return 'I/L Arch Mage';
        if (job === 230)
            return 'Cleric';
        if (job === 231)
            return 'Priest';
        if (job === 232)
            return 'Bishop';
        if (job === 300)
            return 'Bowman';
        if (job === 310)
            return 'Hunter';
        if (job === 311)
            return 'Ranger';
        if (job === 312)
            return 'Bowmaster';
        if (job === 320)
            return 'Crossbowman';
        if (job === 321)
            return 'Sniper';
        if (job === 322)
            return 'Marksman';
        if (job === 400)
            return 'Thief';
        if (job === 410)
            return 'Assassin';
        if (job === 411)
            return 'Hermit';
        if (job === 412)
            return 'Night Lord';
        if (job === 420)
            return 'Bandit';
        if (job === 421)
            return 'Chief Bandit';
        if (job === 422)
            return 'Shadower';
        if (job === 500)
            return 'Pirate';
        if (job === 510)
            return 'Brawler';
        if (job === 511)
            return 'Marauder';
        if (job === 512)
            return 'Buccaneer';
        if (job === 520)
            return 'Gunslinger';
        if (job === 521)
            return 'Outlaw';
        if (job === 522)
            return 'Corsair';
        if (job >= 2000 && job < 2200)
            return 'Aran';
        if (job >= 2200 && job < 2300)
            return 'Evan';
        if (job >= 3000)
            return 'Resistance';
        if (job >= 1000)
            return 'Cygnus';
        return `Job ${job}`;
    }
    _renderPageArrows() {
        this._arrowContainer.removeChildren();
        const chars = this.game.session.characters;
        const maxPage = chars.length === 0 ? 0 : Math.floor((chars.length - 1) / SlotCount);
        if (maxPage <= 0)
            return;
        if (this._page > 0 && this._pageL) {
            const p = this._mapToScreen(PageLMapX, PageLMapY);
            const s = this._pageL.ToPixi();
            s.position.set(p.x, p.y);
            this._arrowContainer.addChild(s);
        }
        if (this._page < maxPage && this._pageR) {
            const p = this._mapToScreen(PageRMapX, PageRMapY);
            const s = this._pageR.ToPixi();
            s.position.set(p.x, p.y);
            this._arrowContainer.addChild(s);
        }
    }
    _renderNameTags() {
        this._nameContainer.removeChildren();
        const chars = this.game.session.characters;
        for (let i = 0; i < SlotCount; i++) {
            const absIdx = this._page * SlotCount + i;
            if (absIdx >= chars.length)
                continue;
            const entry = chars[absIdx];
            const pos = this._slotScreen(i);
            const isSelected = absIdx === this._selectedSlot;
            const name = entry.stat.name;
            const style = { fontSize: 11, fill: 0xFFFFFF, fontFamily: 'Arial' };
            const t = new Text({ text: name, style });
            const textW = t.width;
            const tagW = Math.max(58, textW + 16);
            const tagX = pos.x - tagW / 2;
            const tagY = pos.y + 4;
            const gfx = new Graphics();
            gfx.rect(tagX, tagY, tagW, 15).fill({ color: 0x000000, alpha: isSelected ? 0.8 : 0.59 });
            t.position.set(pos.x - textW / 2, tagY + 2);
            this._nameContainer.addChild(gfx);
            this._nameContainer.addChild(t);
        }
    }
    _hitSprite(sprite, mapX, mapY, x, y) {
        if (!sprite)
            return false;
        const pos = this._mapToScreen(mapX, mapY);
        const rect = {
            x: pos.x - sprite.OriginX,
            y: pos.y - sprite.OriginY,
            w: sprite.Width,
            h: sprite.Height,
        };
        return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
    }
    _jobGroup(job) {
        if (job >= 3000 && job < 4000)
            return 'resistance';
        if (job === 2001 || (job >= 2200 && job < 2300))
            return 'evan';
        if (job === 2000 || (job >= 2100 && job < 2200))
            return 'aran';
        if (job >= 1000 && job < 2000)
            return 'knight';
        return 'adventure';
    }
    _playRollDown() {
        if (this._rollDown)
            this.game.audioPlayer.PlayEffect(this._rollDown.AudioBytes);
    }
    _playClick() {
        try {
            const node = this._sound?.GetItem('UI.img/BtMouseClick');
            if (node instanceof WzSound)
                this.game.audioPlayer.PlayEffect(node.AudioBytes);
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
//# sourceMappingURL=CharSelectStage.js.map