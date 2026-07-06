import { Container, Sprite, Text, TextStyle } from 'pixi.js';
import { Stage, MouseButton } from '../app/Stage.js';
import { MapleClaudeGame } from '../MapleClaudeGame.js';
import { CharSelectStage } from './CharSelectStage.js';
import { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzImage } from '../wz/WzImage.js';
import { WzSprite } from '../render/WzSprite.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { MapScene } from '../map/MapScene.js';
import { CharacterRenderer } from '../character/CharacterRenderer.js';
import { MakeCharInfoProvider } from '../character/MakeCharInfoProvider.js';
import { ForbiddenNameProvider } from '../character/ForbiddenNameProvider.js';
import { AvatarLook } from '../domain/AvatarLook.js';
import { BodyPartSlot } from '../domain/BodyPartSlot.js';
import { LoginSender } from '../net/senders/LoginSender.js';
import { Button } from '../ui/Button.js';
import { TextField } from '../ui/TextField.js';
import { LoginNoticeOverlay } from '../ui/LoginNoticeOverlay.js';
import { BuiltInFont } from '../ui/BuiltInFont.js';
import { OutPacket } from '../net/packet/OutPacket.js';
import { InHeader } from '../net/packet/OpCodes.js';
import { CheckDuplicatedIdArgs, CreateNewCharacterResultArgs } from '../net/handlers/PacketArgs.js';

const ScrollDuration = 0.55;

enum SubScreen { Name, Look }

const CatFace = MakeCharInfoProvider.CatFace;
const CatHair = MakeCharInfoProvider.CatHair;
const CatHairColor = MakeCharInfoProvider.CatHairColor;
const CatSkin = MakeCharInfoProvider.CatSkin;
const CatCoat = MakeCharInfoProvider.CatCoat;
const CatPants = MakeCharInfoProvider.CatPants;
const CatShoes = MakeCharInfoProvider.CatShoes;
const CatWeapon = MakeCharInfoProvider.CatWeapon;
const CatGender = MakeCharInfoProvider.CatGender;
const RowCount = MakeCharInfoProvider.CatCount;

function smoothStep(t: number): number {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}

function serverRace(uiRace: number): number {
  switch (uiRace) {
    case 5: return 0;
    case 2: return 2;
    case 3: return 3;
    case 4: return 4;
    default: return 1;
  }
}

function convertRaceToUiRace(serverRace: number): number {
  switch (serverRace) {
    case 0: return 4;
    case 1: return 1;
    case 2: return 0;
    case 3: return 3;
    case 4: return 2;
    default: return serverRace;
  }
}

export class CharCreationStage extends Stage {
  private _subScreen: SubScreen = SubScreen.Name;
  private _male = true;
  private _raceIndex: number;

  private _ui: WzPackage;
  private _map: WzPackage | null;
  private _sound: WzPackage | null;
  private _worldId: number;
  private _channelId: number;
  private _cameraStart: { x: number; y: number };
  private _loginCameraOffset: { x: number; y: number };

  private _loader: WzTextureLoader;
  private _scene: MapScene | null = null;
  private _renderer: CharacterRenderer | null = null;
  private _makeChar: MakeCharInfoProvider;
  private _forbidden: ForbiddenNameProvider;
  private _section: string;

  private _commonFrame: WzSprite | null = null;
  private _charNameBoard: WzSprite | null = null;
  private _charSetBoard: WzSprite | null = null;
  private readonly _rowNormal: (WzSprite | null)[] = [];
  private readonly _rowDisabled: (WzSprite | null)[] = [];
  private readonly _btLeftRow: (Button | null)[] = [];
  private readonly _btRightRow: (Button | null)[] = [];
  private _btYes: Button | null = null;
  private _btNo: Button | null = null;
  private readonly _allButtons: Button[] = [];

  private _sel: number[] = [];
  private _selectedRow = 0;
  private _nameField: TextField | null = null;
  private _nameFieldNudgeX = 0;
  private _nameFieldNudgeY = 0;
  private _nameOkOffset = { x: 27, y: 178 };
  private _nameNoOffset = { x: 101, y: 178 };
  private _cameraOffset = { x: 27, y: -1216 };
  private _scrollT = 0;

  private _boardWorld = { x: 109, y: -2613 };
  private _avatarWorld = { x: 22, y: -2369 };

  // Containers for display list management
  private _sceneContainer = new Container();
  private _boardContainer = new Container();
  private _previewContainer = new Container();

  private _previewNeedsUpdate = true;
  private _lastLook: string = '';
  private _uiContainer = new Container();

  // Pixi sprites for board elements (created once in onEnter)
  private _charNameBoardSprite: Sprite | null = null;
  private _charSetBoardSprite: Sprite | null = null;
  private _commonFrameSprite: Sprite | null = null;
  private readonly _rowSprites: (Sprite | null)[] = [];
  private readonly _rowTextSprites: (Text | null)[] = [];

  private _notice: LoginNoticeOverlay | null = null;
  private _checkingName = false;

  // Track whether board has been built (called once per sub-screen)
  private _boardBuilt = false;
  private _lastSubScreen: SubScreen = -1 as unknown as SubScreen;

  constructor(
    ui: WzPackage,
    map: WzPackage | null,
    sound: WzPackage | null,
    worldId: number,
    channelId: number,
    isMale: boolean,
    raceIndex: number,
    cameraStart: { x: number; y: number },
    loginCameraOffset: { x: number; y: number },
  ) {
    super();
    this._ui = ui;
    this._map = map;
    this._sound = sound;
    this._worldId = worldId;
    this._channelId = channelId;
    this._male = isMale;
    this._raceIndex = raceIndex;
    this._cameraStart = cameraStart;
    this._loginCameraOffset = loginCameraOffset;
    this._section = MakeCharInfoProvider.SectionForRace(raceIndex);
    this._loader = new WzTextureLoader();
    this._makeChar = new MakeCharInfoProvider(null);
    this._forbidden = new ForbiddenNameProvider(null);
    this._sel = new Array(RowCount).fill(0);
    for (let i = 0; i < RowCount; i++) this._rowNormal.push(null);
    for (let i = 0; i < RowCount; i++) this._rowDisabled.push(null);
    for (let i = 0; i < RowCount; i++) this._btLeftRow.push(null);
    for (let i = 0; i < RowCount; i++) this._btRightRow.push(null);
    for (let i = 0; i < RowCount; i++) this._rowSprites.push(null);
    for (let i = 0; i < RowCount; i++) this._rowTextSprites.push(null);
  }

  onEnter(game: MapleClaudeGame): void {
    super.onEnter(game);

    const uiRace = convertRaceToUiRace(serverRace(this._raceIndex));
    this._cameraOffset = { x: 27, y: -8 - 600 * (4 + uiRace) };
    this._boardWorld = { x: 109, y: -2613 - 600 * uiRace };
    this._avatarWorld = { x: 22, y: -2369 - 600 * uiRace };

    this._makeChar = new MakeCharInfoProvider(game.wz.etc ?? null);
    this._forbidden = new ForbiddenNameProvider(game.wz.etc ?? null);
    this._randomizeAppearance();

    if (this._ui && this._map) {
      const loginMapImg = this._ui.GetItem('MapLogin.img');
      if (loginMapImg instanceof WzImage) {
        this._scene = new MapScene(this._map, this._loader);
        this._scene.Load(loginMapImg.Root);
        this._scene.SetCamera(this._cameraStart);
        this._sceneContainer.addChild(this._scene.container);
      }
    }

    this._renderer = new CharacterRenderer(
      game.wz.character ?? null,
      game.wz.item ?? null,
      game.wz.base ?? null,
      this._loader,
    );

    this._commonFrame = this._loadCanvas('Login.img/Common/frame');
    if (this._commonFrame) {
      this._commonFrameSprite = this._commonFrame.ToPixi();
      this._uiContainer.addChild(this._commonFrameSprite);
    }

    const suffix = this._raceSuffix();
    const classRoot = this._ui.GetItem(`Login.img/NewChar${suffix}`) as WzProperty | null;
    const newChar = this._ui.GetItem('Login.img/NewChar') as WzProperty | null;

    this._charNameBoard = this._loadCanvasFrom(classRoot, 'charName')
      ?? this._loadCanvasFrom(newChar, 'charName');
    this._charSetBoard = this._loadCanvasFrom(classRoot, 'charSet')
      ?? this._loadCanvasFrom(newChar, 'charSet');

    if (this._charNameBoard) this._charNameBoardSprite = this._charNameBoard.ToPixi();
    if (this._charSetBoard) this._charSetBoardSprite = this._charSetBoard.ToPixi();

    for (let i = 0; i < RowCount; i++) {
      this._rowNormal[i] = this._loadCanvasFrom(newChar, `avatarSel/${i}/normal`);
      this._rowDisabled[i] = this._loadCanvasFrom(newChar, `avatarSel/${i}/disabled`);
    }

    for (let i = 0; i < RowCount; i++) {
      const row = i;
      this._btLeftRow[i] = this._makeButtonFrom(newChar, 'BtLeft', () => this._cycleRow(row, -1));
      this._btRightRow[i] = this._makeButtonFrom(newChar, 'BtRight', () => this._cycleRow(row, +1));
    }

    this._btYes = this._makeButtonFrom(classRoot, 'BtYes', () => this._onYes())
      ?? this._makeButtonFrom(newChar, 'BtYes', () => this._onYes());
    this._btNo = this._makeButtonFrom(classRoot, 'BtNo', () => this._onNo())
      ?? this._makeButtonFrom(newChar, 'BtNo', () => this._onNo());

    const { textColor, caretColor } = this._nameColors(suffix);
    this._nameFieldNudgeX = suffix === 'Resistance' ? 5 : suffix === 'Knight' ? 3 : 0;
    this._nameFieldNudgeY = suffix === 'Aran' ? -8 : 0;
    const { ok: nameOk, no: nameNo } = this._nameButtonOffsets(suffix);
    this._nameOkOffset = nameOk;
    this._nameNoOffset = nameNo;

    this._nameField = new TextField(null);
    this._nameField.maxLength = 12;
    this._nameField.isFocused = true;
    this._nameField.width = 120;
    this._nameField.height = 22;
    this._nameField.drawBackground = false;
    this._nameField.textColor = textColor;
    this._nameField.caretColor = caretColor;

    if (!this._btYes) {
      const fb = new Button('OK');
      fb.width = 60; fb.height = 24;
      fb.onClick = () => this._onYes();
      this._btYes = fb;
      this._allButtons.push(fb);
    }
    if (!this._btNo) {
      const fb = new Button('Cancel');
      fb.width = 60; fb.height = 24;
      fb.onClick = () => this._onNo();
      this._btNo = fb;
      this._allButtons.push(fb);
    }

    this._notice = new LoginNoticeOverlay(this._loader, this._ui, new BuiltInFont(), { x: 400, y: 300 });
    this._notice.onOk = () => { if (this._nameField) this._nameField.isFocused = true; };

    // Build display list: scene → board → preview → commonFrame → notice
    this.uiRoot.addChild(this._sceneContainer);
    this.uiRoot.addChild(this._boardContainer);
    this.uiRoot.addChild(this._previewContainer);
    this.uiRoot.addChild(this._uiContainer);
    this.uiRoot.addChild(this._notice.container);

    this._applyBoardPositions();
    this._updateBoardVisibility();

    game.loginHandlers.onCheckDuplicatedIdResult = (args) => this._onCheckDuplicatedId(args);
    game.loginHandlers.onCreateCharacterResult = (args) => this._onCreateCharacterResult(args);
  }

  onExit(): void {
    this.game.loginHandlers.onCheckDuplicatedIdResult = null;
    this.game.loginHandlers.onCreateCharacterResult = null;
    this._loader.Dispose();
    super.onExit();
  }

  update(dt: number): void {
    if (this._scene) {
      const dtSec = dt;
      this._scrollT = Math.min(1, this._scrollT + dtSec / ScrollDuration);
      const sp = this._scene.StartPoint ?? { x: 0, y: 0 };
      const t = smoothStep(this._scrollT);
      this._scene.SetCamera({
        x: this._lerp(this._cameraStart.x, sp.x + this._cameraOffset.x, t),
        y: this._lerp(this._cameraStart.y, sp.y + this._cameraOffset.y, t),
      });
      this._scene.update(dt * 1000);
    }
    this._notice?.update(dt);
    this._applyBoardPositions();
  }

  draw(): void {
    const w = 800;
    const h = 600;

    // Position common frame centered
    if (this._commonFrameSprite) {
      this._commonFrameSprite.position.set(w / 2, h / 2);
    }

    this.drawFrameMuteButton();

    // Update board visibility (only rebuilds when sub-screen changes)
    this._updateBoardVisibility();

    // Update preview (only rebuilds when look changes)
    this._updatePreview();

    this._notice?.draw();
  }

  private _updateBoardVisibility(): void {
    if (this._subScreen === this._lastSubScreen) {
      // Already built for this sub-screen — just update positions
      this._applyBoardPositions();
      return;
    }
    this._lastSubScreen = this._subScreen;

    // Remove existing board sprites
    this._boardContainer.removeChildren();

    if (this._subScreen === SubScreen.Name) {
      if (this._charNameBoardSprite) { this._charNameBoardSprite.visible = true; this._boardContainer.addChild(this._charNameBoardSprite); }
      if (this._nameField) { this._nameField.container.visible = true; this._boardContainer.addChild(this._nameField.container); }
      if (this._btYes) this._boardContainer.addChild(this._btYes.container);
      if (this._btNo) this._boardContainer.addChild(this._btNo.container);

      // Hide look-screen elements
      if (this._charSetBoardSprite) this._charSetBoardSprite.visible = false;
      for (let i = 0; i < RowCount; i++) {
        if (this._rowSprites[i]) this._rowSprites[i]!.visible = false;
        if (this._rowTextSprites[i]) this._rowTextSprites[i]!.visible = false;
        if (this._btLeftRow[i]) this._btLeftRow[i]!.container.visible = false;
        if (this._btRightRow[i]) this._btRightRow[i]!.container.visible = false;
      }
    } else {
      if (this._charSetBoardSprite) {
        this._charSetBoardSprite.visible = true;
        this._boardContainer.addChild(this._charSetBoardSprite);
      }

      // Build row sprites if not yet built
      if (!this._rowSprites[0]) {
        for (let i = 0; i < RowCount; i++) {
          const rowSprite = this._rowNormal[i] ?? this._rowDisabled[i];
          if (rowSprite) {
            const s = rowSprite.ToPixi();
            this._rowSprites[i] = s;
          }
          const t = new Text({
            text: this._rowName(i),
            style: new TextStyle({ fontSize: 11, fontFamily: 'Arial', fill: 0xFFFFFF }),
          });
          this._rowTextSprites[i] = t;
        }
      }

      for (let i = 0; i < RowCount; i++) {
        if (this._rowSprites[i]) {
          this._rowSprites[i]!.visible = true;
          this._boardContainer.addChild(this._rowSprites[i]!);
        }
        if (this._rowTextSprites[i]) {
          this._rowTextSprites[i]!.visible = true;
          this._boardContainer.addChild(this._rowTextSprites[i]!);
        }
        if (this._btLeftRow[i]) {
          this._btLeftRow[i]!.container.visible = true;
          this._boardContainer.addChild(this._btLeftRow[i]!.container);
        }
        if (this._btRightRow[i]) {
          this._btRightRow[i]!.container.visible = true;
          this._boardContainer.addChild(this._btRightRow[i]!.container);
        }
      }

      if (this._btYes) {
        this._btYes.container.visible = true;
        this._boardContainer.addChild(this._btYes.container);
      }
      if (this._btNo) {
        this._btNo.container.visible = true;
        this._boardContainer.addChild(this._btNo.container);
      }

      // Hide name-screen elements
      if (this._charNameBoardSprite) this._charNameBoardSprite.visible = false;
      if (this._nameField) this._nameField.container.visible = false;
    }

    this._applyBoardPositions();
  }

  private _updatePreview(): void {
    if (!this._renderer) return;
    const pos = this._avatarScreen();
    const look = this._buildLook();
    const lookKey = `${look.face}-${look.hair}-${look.skin}-${look.gender}-${pos.x}-${pos.y}`;
    if (lookKey === this._lastLook && !this._previewNeedsUpdate) return;
    this._lastLook = lookKey;
    this._previewNeedsUpdate = false;

    this._previewContainer.removeChildren();
    const results = this._renderer.Draw(look, 'stand1', 0, pos.x, pos.y, false);
    this._previewContainer.position.set(pos.x, pos.y);
    this._previewContainer.scale.x = -1;
    for (const layer of results.layers) {
      for (const sp of layer) {
        this._previewContainer.addChild(sp);
      }
    }
  }

  onTextInput(character: string): void {
    if (this._subScreen === SubScreen.Name && this._nameField) {
      this._nameField.isFocused = true;
      this._nameField.onTextInput(character);
    }
  }

  onMouseButton(x: number, y: number, down: boolean, button: MouseButton): void {
    if (button !== MouseButton.Left) return;
    if (this._notice?.isVisible) { this._notice.handleMouseButton(x, y, down); return; }
    if (this._subScreen === SubScreen.Name) {
      this._nameField?.handleMouseButton?.(x, y, down);
    } else {
      for (let i = 0; i < RowCount; i++) {
        this._btLeftRow[i]?.handleMouseButton(x, y, down);
        this._btRightRow[i]?.handleMouseButton(x, y, down);
      }
    }
    this._btYes?.handleMouseButton(x, y, down);
    this._btNo?.handleMouseButton(x, y, down);
  }

  onKeyPress(key: string): void {
    if (this._notice?.isVisible) { this._notice.onKeyPress(key); return; }
    if (this._subScreen === SubScreen.Name) {
      if (key === 'Enter') { this._onYes(); return; }
      if (key === 'Escape') { this._onNo(); return; }
      if (this._nameField) {
        this._nameField.isFocused = true;
        this._nameField.onKeyPress(key);
      }
      return;
    }
    switch (key) {
      case 'ArrowUp': this._selectedRow = (this._selectedRow - 1 + RowCount) % RowCount; break;
      case 'ArrowDown': this._selectedRow = (this._selectedRow + 1) % RowCount; break;
      case 'ArrowLeft': this._cycleRow(this._selectedRow, -1); break;
      case 'ArrowRight': this._cycleRow(this._selectedRow, +1); break;
      case 'Enter': this._onYes(); break;
      case 'Escape': this._onNo(); break;
    }
  }

  private _cycleRow(row: number, dir: number): void {
    this._playClick();
    if (row === CatGender) {
      this._male = !this._male;
      this._previewNeedsUpdate = true;
      return;
    }
    this._sel[row] += dir;
    this._previewNeedsUpdate = true;
  }

  private _buildLook(): AvatarLook {
    const face = this._curId(CatFace, this._sel[CatFace]);
    const hairBase = this._curId(CatHair, this._sel[CatHair]);
    const hairColor = this._curId(CatHairColor, this._sel[CatHairColor]);
    const skinRaw = this._curId(CatSkin, this._sel[CatSkin]);
    const skin = skinRaw > 0xFF ? (skinRaw >> 16) & 0xFF : skinRaw;
    const coat = this._curId(CatCoat, this._sel[CatCoat]);
    const pants = this._curId(CatPants, this._sel[CatPants]);
    const shoes = this._curId(CatShoes, this._sel[CatShoes]);
    const weapon = this._curId(CatWeapon, this._sel[CatWeapon]);

    const look = new AvatarLook();
    look.gender = this._male ? 0 : 1;
    look.skin = skin;
    look.face = face;
    look.hair = hairBase + hairColor;
    if (coat !== 0) look.hairEquip.set(BodyPartSlot.Clothes, coat);
    if (pants !== 0) look.hairEquip.set(BodyPartSlot.Pants, pants);
    if (shoes !== 0) look.hairEquip.set(BodyPartSlot.Shoes, shoes);
    if (weapon !== 0) look.hairEquip.set(BodyPartSlot.Weapon, weapon);
    return look;
  }

  private _rowName(row: number): string {
    switch (row) {
      case CatFace: return this._itemName(CatFace);
      case CatHair: return this._makeChar.Name(this._section, this._male, 1, this._curId(CatHair, this._sel[CatHair])) ?? '';
      case CatHairColor: return this._makeChar.Name(this._section, this._male, 2, this._curId(CatHairColor, this._sel[CatHairColor])) ?? '';
      case CatSkin: return this._makeChar.Name(this._section, this._male, 3, this._curId(CatSkin, this._sel[CatSkin])) ?? '';
      case CatCoat: return this._itemName(CatCoat);
      case CatPants: return this._itemName(CatPants);
      case CatShoes: return this._itemName(CatShoes);
      case CatWeapon: return this._itemName(CatWeapon);
      case CatGender: return this._male ? 'Male' : 'Female';
      default: return '';
    }
  }

  private _itemName(cat: number): string {
    return this.game.nameService.ItemName(this._curId(cat, this._sel[cat])) ?? '';
  }

  private _onYes(): void {
    if (this._checkingName) return;
    if (this._subScreen === SubScreen.Name) {
      this._onCheckName();
    } else {
      this._sendCreate();
    }
  }

  private _onNo(): void {
    this._playClick();
    if (this._subScreen === SubScreen.Look) {
      this._subScreen = SubScreen.Name;
      if (this._nameField) this._nameField.isFocused = true;
      return;
    }
    this._goBack();
  }

  private _onCheckName(): void {
    const name = this._nameField?.text ?? '';
    const err = this._validateName(name);
    if (err) { this._notice?.show(err); return; }
    if (this._forbidden.IsForbidden(name)) { this._notice?.show('This name cannot be used.'); return; }
    if (!this.game.session.isConnected) { this._subScreen = SubScreen.Look; return; }
    this._checkingName = true;
    this.game.session.send(LoginSender.CheckDuplicatedId(name));
  }

  private _onCheckDuplicatedId(args: CheckDuplicatedIdArgs): void {
    this._checkingName = false;
    if (args.resultCode === 0) {
      this._subScreen = SubScreen.Look;
    } else {
      const msg = args.resultCode === 1 ? 'Name already in use.'
        : args.resultCode === 2 ? 'This name cannot be used.'
        : 'Invalid name.';
      this._notice?.show(msg);
      if (this._nameField) this._nameField.isFocused = true;
    }
  }

  private _sendCreate(): void {
    const name = this._nameField?.text ?? '';
    const face = this._curId(CatFace, this._sel[CatFace]);
    const hairBase = this._curId(CatHair, this._sel[CatHair]);
    const hairColor = this._curId(CatHairColor, this._sel[CatHairColor]);
    const skinRaw = this._curId(CatSkin, this._sel[CatSkin]);
    const skin = skinRaw > 0xFF ? (skinRaw >> 16) & 0xFF : skinRaw;
    const coat = this._curId(CatCoat, this._sel[CatCoat]);
    const pants = this._curId(CatPants, this._sel[CatPants]);
    const shoes = this._curId(CatShoes, this._sel[CatShoes]);
    const weapon = this._curId(CatWeapon, this._sel[CatWeapon]);
    const srace = serverRace(this._raceIndex);
    const subJob = this._raceIndex === 5 ? 1 : 0;

    if (!this.game.session.isConnected) {
      this._goBackToCharSelect();
      return;
    }
    this.game.session.send(LoginSender.CreateNewCharacter(
      name, srace, face, hairBase, hairColor, skin, coat, pants, shoes, weapon, this._male, subJob,
    ));
  }

  private _onCreateCharacterResult(args: CreateNewCharacterResultArgs): void {
    if (args.success && args.entry) {
      this._goBackToCharSelect();
    } else {
      this._notice?.show(args.resultCode === 30 ? 'Name already in use.' : 'Creation failed.');
      this._subScreen = SubScreen.Name;
      if (this._nameField) this._nameField.isFocused = true;
    }
  }

  private _goBack(): void {
    this._playClick();
    this.stageDirector.replace(new CharSelectStage(
      this._ui, this._map, this._sound,
      this.game.wz.character ?? null,
      this.game.wz.item ?? null,
      this.game.wz.base ?? null,
      this._worldId, this._channelId,
      this._scene?.Camera ?? { x: 0, y: 0 },
      this._loginCameraOffset,
    ));
  }

  private _goBackToCharSelect(): void {
    this.stageDirector.replace(new CharSelectStage(
      this._ui, this._map, this._sound,
      this.game.wz.character ?? null,
      this.game.wz.item ?? null,
      this.game.wz.base ?? null,
      this._worldId, this._channelId,
      this._scene?.Camera ?? { x: 0, y: 0 },
      this._loginCameraOffset,
    ));
  }

  private _validateName(name: string): string {
    if (name.length < 4) return 'Name must be at least 4 characters.';
    if (name.length > 12) return 'Name must be at most 12 characters.';
    if (name.includes(' ')) return 'Name cannot contain spaces.';
    for (const c of name) {
      if (!(c >= 'a' && c <= 'z') && !(c >= 'A' && c <= 'Z') && !(c >= '0' && c <= '9')) {
        return 'Only letters and digits allowed.';
      }
    }
    let il = 0;
    for (const c of name) if (c === 'I' || c === 'l') il++;
    if (il >= 4) return 'Too many look-alike I/l characters.';
    return '';
  }

  private _randomizeAppearance(): void {
    for (let i = 0; i < CatGender; i++) {
      this._sel[i] = Math.floor(Math.random() * 9999);
    }
  }

  private _curId(mciCat: number, sel: number): number {
    const o = this._makeChar.Options(this._section, this._male, mciCat);
    if (o.length === 0) return 0;
    return o[((sel % o.length) + o.length) % o.length];
  }

  private _applyBoardPositions(): void {
    const board = this._boardScreen();
    if (this._subScreen === SubScreen.Name) {
      if (this._charNameBoardSprite) this._charNameBoardSprite.position.set(board.x, board.y);
      if (this._nameField) {
        this._nameField.setPosition(board.x + 33 + this._nameFieldNudgeX, board.y + 106 + this._nameFieldNudgeY);
      }
      if (this._btYes) this._btYes.container.position.set(board.x + this._nameOkOffset.x, board.y + this._nameOkOffset.y);
      if (this._btNo) this._btNo.container.position.set(board.x + this._nameNoOffset.x, board.y + this._nameNoOffset.y);
    } else {
      if (this._charSetBoardSprite) this._charSetBoardSprite.position.set(board.x, board.y);
      for (let i = 0; i < RowCount; i++) {
        if (this._rowSprites[i]) this._rowSprites[i]!.position.set(board.x + 14, board.y + 102 + 18 * i);
        if (this._rowTextSprites[i]) {
          const t = this._rowTextSprites[i]!;
          t.text = this._rowName(i);
          t.position.set(board.x + 81 + (198 - 81) / 2 - t.width / 2, board.y + 102 + 18 * i + 4);
        }
        if (this._btLeftRow[i]) this._btLeftRow[i]!.container.position.set(board.x + 66, board.y + 103 + 18 * i);
        if (this._btRightRow[i]) this._btRightRow[i]!.container.position.set(board.x + 198, board.y + 103 + 18 * i);
      }
      if (this._btYes) this._btYes.container.position.set(board.x + 37, board.y + 330);
      if (this._btNo) this._btNo.container.position.set(board.x + 111, board.y + 330);
    }
  }

  private _boardScreen(): { x: number; y: number } {
    if (this._scene) {
      return this._scene.WorldToScreen(this._boardWorld.x, this._boardWorld.y, 800, 600);
    }
    return { x: 482, y: 95 };
  }

  private _avatarScreen(): { x: number; y: number } {
    if (this._scene) {
      return this._scene.WorldToScreen(this._avatarWorld.x, this._avatarWorld.y, 800, 600);
    }
    return { x: 395, y: 339 };
  }

  private _raceSuffix(): string {
    switch (this._raceIndex) {
      case 5: return 'Resistance';
      case 4: return 'Evan';
      case 3: return 'Aran';
      case 2: return 'Knight';
      default: return '';
    }
  }

  private _nameColors(suffix: string): { textColor: number; caretColor: number } {
    if (suffix === 'Resistance') return { textColor: 0x000000, caretColor: 0x000000 };
    return { textColor: 0xFFFFFF, caretColor: 0x78DCFF };
  }

  private _nameButtonOffsets(suffix: string): { ok: { x: number; y: number }; no: { x: number; y: number } } {
    switch (suffix) {
      case 'Resistance': return { ok: { x: 47, y: 178 }, no: { x: 122, y: 178 } };
      case 'Knight':     return { ok: { x: 31, y: 181 }, no: { x: 104, y: 181 } };
      case 'Aran':       return { ok: { x: 34, y: 137 }, no: { x: 108, y: 137 } };
      default:           return { ok: { x: 27, y: 178 }, no: { x: 101, y: 178 } };
    }
  }

  private _loadCanvas(path: string): WzSprite | null {
    try {
      const item = this._ui.GetItem(path);
      return item instanceof WzCanvas ? this._loader.Load(item) : null;
    } catch { return null; }
  }

  private _loadCanvasFrom(root: WzProperty | null, relPath: string): WzSprite | null {
    try {
      if (!root) return null;
      const parts = relPath.split('/');
      let node: unknown = root;
      for (const part of parts) {
        if (!(node instanceof WzProperty)) return null;
        node = (node as WzProperty).Get(part);
      }
      return node instanceof WzCanvas ? this._loader.Load(node) : null;
    } catch { return null; }
  }

  private _makeButtonFrom(root: WzProperty | null, name: string, onClick: () => void): Button | null {
    try {
      if (!root) return null;
      const pr = root.Get(name);
      if (!(pr instanceof WzProperty)) return null;
      const b = Button.fromWz(this._loader, pr);
      b.onClick = onClick;
      this._allButtons.push(b);
      return b;
    } catch { return null; }
  }

  private _lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private _playClick(): void {
    try {
      const s = this._sound?.GetItem('UI.img/BtMouseClick');
      if (s instanceof WzCanvas) {
        // WzSound not available — skip
      }
    } catch { /* no sound */ }
  }
}
