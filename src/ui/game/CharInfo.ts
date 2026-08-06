import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzSprite } from '../../render/WzSprite.js';
import { Button } from '../Button.js';
import { ScrollBar } from './ScrollBar.js';
import { CharLook } from '../../character/CharLook.js';
import { AvatarLook } from '../../domain/AvatarLook.js';
import { PetLook } from '../../character/PetLook.js';
import { ItemIconLoader } from '../../character/ItemIconLoader.js';
import { UserInfoDetail } from './UserInfoDetail.js';
import { UserInfoWishList } from './UserInfoWishList.js';
import { UserInfoExceptionList } from './UserInfoExceptionList.js';

// OG class: CUIUserInfo (5804 bytes, inherits CUIWnd)
// All coordinates from IDA decompilation of v95 client.
// Window: 271 wide, heights vary by state.

// OG SetLayer: state heights
const PANEL_W = 271;
const STATE_HEIGHTS = [190, 386, 368, 386]; // 0=collapsed, 1=pet, 2=taming, 3=medal

// OG Draw: common stat text at x=153
const STAT_X = 153;
const Y_LEVEL = 71;
const Y_JOB = 89;
const Y_FAME = 107;
const Y_COMMUNITY = 125;
const Y_ALLIANCE = 143;
const NAME_CENTER_X = 61;

// OG Draw: married image at (15, 32)
const MARRIED_X = 15;
const MARRIED_Y = 32;

// OG Draw: state 1 (pet) coordinates
const PET_NAME_Y = 318;
const PET_TEMPLATE_Y = 343;
const PET_LEVEL_Y = 361;
const PET_FULL_Y = 342;
const PET_INTIMACY_Y = 361;
const PET_STAT_LEFT_X = 53;
const PET_STAT_RIGHT_X = 180;
const PET_ITEM_ICON_X = 111;
const PET_ITEM_NAME_X = 147;
const PET_ITEM_INFO_X = 183;
const PET_ITEM_START_Y = 220;
const PET_ITEM_ROW_H = 42;
const PET_AVATAR_X = 53;
const PET_AVATAR_Y = 299;

// OG Draw: state 2 (taming mob) coordinates
const TAMING_NAME_Y = 301;
const TAMING_LEVEL_Y = 326;
const TAMING_EXP_Y = 345;
const TAMING_FATIGUE_Y = 326;
const TAMING_STAT_LEFT_X = 53;
const TAMING_STAT_RIGHT_X = 180;
const TAMING_ITEM_ICON_X = 111;
const TAMING_ITEM_NAME_X = 152;
const TAMING_ITEM_INFO_X = 187;
const TAMING_ITEM_START_Y = 205;
const TAMING_ITEM_ROW_H = 42;

// OG Draw: state 3 (medal) coordinates
const MEDAL_ICON_X = 19;
const MEDAL_ICON_Y = 243;
const MEDAL_NAME_X = 122;
const MEDAL_NAME_Y = 204;
const MEDAL_COUNT_X = 122;
const MEDAL_COUNT_Y = 222;
const MEDAL_QUEST_X = 70;
const MEDAL_QUEST_START_Y = 260;
const MEDAL_QUEST_ROW_H = 20;

// OG SetCtrl: scrollbar
const SB_X = 8;
const SB_IDS = { PET: 2015, TAMING: 2015, MEDAL: 2015 };

// OG SetCtrl: pet selection buttons (state 1)
const PET_BTN_START_Y = 168;
const PET_BTN_SPACING = 34;
const PET_BTN_IDS = [2012, 2013, 2014];

// OG OnCreate button IDs
const BT_PARTY = 0x7D2;
const BT_TRADE = 0x7D3;
const BT_FAME_UP = 0x7D4;
const BT_FAME_DOWN = 0x7D5;
const BT_PET = 0x7D6;
const BT_RIDE = 0x7D7;
const BT_COLLECT = 0x7D8;
const BT_EXCEPTION = 0x7D9;
const BT_FAMILY = 0x7DA;

// OG OnButtonClicked IDs
const BT_ITEM = 0x7D0;
const BT_WISH = 0x7D1;

const _nameStyle = new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace' });
const _statStyle = new TextStyle({ fill: '#888888', fontSize: 10, fontFamily: 'monospace' });
const _blackStyle = new TextStyle({ fill: '#000000', fontSize: 10, fontFamily: 'monospace' });
const _grayStyle = new TextStyle({ fill: '#888888', fontSize: 10, fontFamily: 'monospace' });
const _whiteGrayStyle = new TextStyle({ fill: '#AAAAAA', fontSize: 10, fontFamily: 'monospace' });

export interface PetItem {
  itemId: number;
  name: string;
  info: string;
}

export interface PetInfo {
  name: string;
  templateName: string;
  level: number;
  tameness: number;
  repleteness: number;
  equipItemId: number;
  items: PetItem[];
}

export interface TamingMobItem {
  itemId: number;
  name: string;
  info: string;
}

export interface TamingMobInfo {
  name: string;
  level: number;
  exp: number;
  fatigue: number;
  items: TamingMobItem[];
}

export interface MedalInfo {
  medalItemId: number;
  medalName: string;
  count: number;
  questNames: string[];
}

export class CharInfo extends GamePanel {
  charName = '';
  level = 1;
  job = 'Beginner';
  fame = 0;
  guild = '';
  alliance = '';
  isMarried = false;
  isLocalChar = false;
  characterId = 0;

  // Pet data (up to 3 pets)
  pets: (PetInfo | null)[] = [null, null, null];
  currentPetIndex = 0;
  bPetActivated = false;

  // Taming mob data
  tamingMob: TamingMobInfo | null = null;
  hasTamingMob = false;

  // Medal data
  medal: MedalInfo | null = null;

  // Chair items (left column of Detail sub-panel)
  chairItems: number[] = [];
  // Wish items (right column of Detail sub-panel / WishList sub-panel)
  wishItems: number[] = [];

  // Callbacks
  onParty: (() => void) | null = null;
  onTrade: (() => void) | null = null;
  onFameUp: (() => void) | null = null;
  onFameDown: (() => void) | null = null;
  onTogglePet: (() => void) | null = null;
  onToggleRide: (() => void) | null = null;
  onToggleCollect: (() => void) | null = null;
  onSelectPet: ((index: number) => void) | null = null;

  // Avatar look data (set by GameStage)
  avatarLook: AvatarLook | null = null;

  // Name resolver callbacks (set by GameStage)
  itemNameOf: ((id: number) => string) | null = null;
  mobNameOf: ((id: number) => string) | null = null;

  private _loader: WzTextureLoader;
  private _ui: WzPackage | null;
  private _charInfoProp: WzProperty | null = null;
  private _charWz: WzPackage | null = null;
  private _itemWz: WzPackage | null = null;
  private _baseWz: WzPackage | null = null;
  private _itemIcons: ItemIconLoader | null = null;
  private _state = 0;
  private _contentLayer: Container;
  private _stateLayer: Container;

  // BG
  private _bgGraphics: Graphics;
  private _bgWz: WzSprite | null = null;
  private _coverWz: WzSprite | null = null;

  // OG: CUIWnd canvas overlay (StringPool 976) — semi-transparent mask sized to panel
  private _overlay: Graphics;

  // Common texts
  private _nameText: Text;
  private _levelText: Text;
  private _jobText: Text;
  private _fameText: Text;
  private _communityText: Text;
  private _allianceText: Text;
  private _marriedSprite: WzSprite | null = null;

  // State 1 (pet) elements
  private _petNameTexts: Text[] = [];
  private _petStatTexts: Text[] = [];
  private _petItemTexts: Text[] = [];
  private _petBtns: Button[] = [];
  private _petSb: ScrollBar | null = null;
  private _petScrollPos = 0;

  // State 2 (taming) elements
  private _tamingNameText: Text | null = null;
  private _tamingStatTexts: Text[] = [];
  private _tamingItemTexts: Text[] = [];
  private _tamingSb: ScrollBar | null = null;
  private _tamingScrollPos = 0;

  // State 3 (medal) elements
  private _medalNameText: Text | null = null;
  private _medalCountText: Text | null = null;
  private _medalQuestTexts: Text[] = [];

  // OG: character avatar in main panel — drawn at (100, 127)
  private _avatar: CharLook | null = null;

  // OG: pet avatars in state 1 — drawn at (53, 299)
  private _petAvatars: (PetLook | null)[] = [null, null, null];

  // OG: boss pet crown — canvas from StringPool 0x125B (4699)
  // Drawn at (44, 267) initially, (44, 209) when pet slot 0 active
  private _bossPetCrown: WzSprite | null = null;
  private _bossPetCrownPixi: import('pixi.js').Sprite | null = null;
  private _bossPetCrownLoaded = false;

  // OG: sub-windows — positioned at (absLeft+271, absTop)
  private _detailPanel: UserInfoDetail | null = null;
  private _wishPanel: UserInfoWishList | null = null;
  private _exceptionPanel: UserInfoExceptionList | null = null;
  private _detailVisible = false;
  private _wishVisible = false;
  private _exceptionVisible = false;

  // Buttons
  private _btParty: Button | null = null;
  private _btTrade: Button | null = null;
  private _btFameUp: Button | null = null;
  private _btFameDown: Button | null = null;
  private _btPet: Button | null = null;
  private _btRide: Button | null = null;
  private _btCollect: Button | null = null;
  private _btException: Button | null = null;
  private _btFamily: Button | null = null;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, charWz?: WzPackage | null, itemWz?: WzPackage | null, baseWz?: WzPackage | null, itemIcons?: ItemIconLoader | null) {
    super();
    this._loader = loader;
    this._ui = ui;
    this._charWz = charWz ?? null;
    this._itemWz = itemWz ?? null;
    this._baseWz = baseWz ?? null;
    this._itemIcons = itemIcons ?? null;
    this._root.visible = false;
    this._root.x = 10;
    this._root.y = 80;

    // OG: CUIWnd::CreateUIWndPosSaved(this, 0, 0, 10)
    this._charInfoProp = ui?.GetItem('UIWindow2.img/UserInfo/character') as WzProperty | null;

    // Background
    this._bgGraphics = new Graphics();
    this._loadBackground(0);

    // OG: CUIWnd canvas overlay (StringPool 976) — semi-transparent mask
    // Sized to panel dimensions, inserted between bg and content
    this._overlay = new Graphics();
    this._overlay.rect(0, 0, PANEL_W, STATE_HEIGHTS[0]).fill({ color: '#000000', alpha: 0.3 });
    this._root.addChild(this._overlay);

    // Content layer (above backgrounds)
    this._contentLayer = new Container();
    this._root.addChild(this._contentLayer);

    // State layer (rebuilt per state)
    this._stateLayer = new Container();
    this._contentLayer.addChild(this._stateLayer);

    // Common texts (always visible)
    this._nameText = new Text({ text: '', style: _nameStyle });
    this._nameText.anchor.set(0.5, 0);
    this._nameText.x = NAME_CENTER_X;
    this._nameText.y = 50;
    this._contentLayer.addChild(this._nameText);

    this._levelText = new Text({ text: '', style: _nameStyle });
    this._levelText.x = STAT_X; this._levelText.y = Y_LEVEL;
    this._contentLayer.addChild(this._levelText);

    this._jobText = new Text({ text: '', style: _statStyle });
    this._jobText.x = STAT_X; this._jobText.y = Y_JOB;
    this._contentLayer.addChild(this._jobText);

    this._fameText = new Text({ text: '', style: _statStyle });
    this._fameText.x = STAT_X; this._fameText.y = Y_FAME;
    this._contentLayer.addChild(this._fameText);

    this._communityText = new Text({ text: '', style: _statStyle });
    this._communityText.x = STAT_X; this._communityText.y = Y_COMMUNITY;
    this._contentLayer.addChild(this._communityText);

    this._allianceText = new Text({ text: '', style: _statStyle });
    this._allianceText.x = STAT_X; this._allianceText.y = Y_ALLIANCE;
    this._contentLayer.addChild(this._allianceText);

    // Married image at (15, 32)
    if (this._charInfoProp) {
      const marriedNode = this._charInfoProp.Get('married');
      if (marriedNode instanceof WzCanvas) {
        this._marriedSprite = loader.Load(marriedNode);
        if (this._marriedSprite) {
          const sp = this._marriedSprite.ToPixi();
          sp.x = MARRIED_X; sp.y = MARRIED_Y;
          sp.visible = false;
          this._contentLayer.addChild(sp);
        }
      }
    }

    // Buttons
    this._loadButtons(loader);

    // OG: Boss pet crown — StringPool 0x125B (4699) canvas
    // Loaded from UI/UIWindow2.img/UserInfo/character/ or via resource manager
    // Positioned at (44, 267) initially, (44, 209) when pet 0 active
    // For now, skip if WZ path not available — crown is only for boss pets
  }

  private _loadButtons(loader: WzTextureLoader): void {
    const p = this._charInfoProp;
    if (!p) return;

    const load = (name: string): Button | null => {
      const n = p.Get(name);
      return n instanceof WzProperty ? Button.fromWz(loader, n) : null;
    };

    this._btParty = load('BtParty');
    this._btTrade = load('BtTrad');
    this._btFameUp = load('BtPopUp');
    this._btFameDown = load('BtPopDown');
    this._btPet = load('BtPet');
    this._btRide = load('BtRide');
    this._btCollect = load('BtCollect');
    this._btException = load('BtException');
    this._btFamily = load('BtFamily');
    // OG OnCreate: BtItem(0x7D0) → toggleDetail, BtWish(0x7D1) → toggleWishList
    const btItem = load('BtItem');
    const btWish = load('BtWish');

    if (this._btParty) { this._btParty.onClick = () => this.onParty?.(); this._contentLayer.addChild(this._btParty.container); }
    if (this._btTrade) { this._btTrade.onClick = () => this.onTrade?.(); this._contentLayer.addChild(this._btTrade.container); }
    if (this._btFameUp) { this._btFameUp.onClick = () => this.onFameUp?.(); this._contentLayer.addChild(this._btFameUp.container); }
    if (this._btFameDown) { this._btFameDown.onClick = () => this.onFameDown?.(); this._contentLayer.addChild(this._btFameDown.container); }
    if (this._btPet) { this._btPet.onClick = () => this.setState(this._state === 1 ? 0 : 1); this._contentLayer.addChild(this._btPet.container); }
    if (this._btRide) { this._btRide.onClick = () => this.setState(this._state === 2 ? 0 : 2); this._contentLayer.addChild(this._btRide.container); }
    if (this._btCollect) { this._btCollect.onClick = () => this.setState(this._state === 3 ? 0 : 3); this._contentLayer.addChild(this._btCollect.container); }
    if (this._btException) { this._btException.onClick = () => this.toggleExceptionList(); this._contentLayer.addChild(this._btException.container); }
    if (this._btFamily) { this._contentLayer.addChild(this._btFamily.container); }
    // OG OnButtonClicked: 0x7D0 → ToggleAddOn(1) — item info, 0x7D1 → ToggleAddOn(2) — wish list
    if (btItem) { btItem.onClick = () => this.toggleDetail(); this._contentLayer.addChild(btItem.container); }
    if (btWish) { btWish.onClick = () => this.toggleWishList(); this._contentLayer.addChild(btWish.container); }
  }

  // OG ToggleAddOn: type=1 → detail panel, type=2 → wish list panel
  toggleDetail(): void {
    this._detailVisible = !this._detailVisible;
    if (this._detailVisible) {
      this._wishVisible = false;
      if (this._wishPanel) this._wishPanel.container.visible = false;
      if (!this._detailPanel) {
        this._detailPanel = new UserInfoDetail(this._loader, this._ui);
        this._detailPanel.container.position.set(PANEL_W, 0);
        this._contentLayer.addChild(this._detailPanel.container);
      }
    }
    if (this._detailPanel) this._detailPanel.container.visible = this._detailVisible;
  }

  toggleWishList(): void {
    this._wishVisible = !this._wishVisible;
    if (this._wishVisible) {
      this._detailVisible = false;
      if (this._detailPanel) this._detailPanel.container.visible = false;
      if (!this._wishPanel) {
        this._wishPanel = new UserInfoWishList(this._loader, this._ui);
        this._wishPanel.container.position.set(PANEL_W, 271);
        this._contentLayer.addChild(this._wishPanel.container);
      }
    }
    if (this._wishPanel) this._wishPanel.container.visible = this._wishVisible;
  }

  // OG ToggleExceptionList
  toggleExceptionList(): void {
    this._exceptionVisible = !this._exceptionVisible;
    if (this._exceptionVisible) {
      if (!this._exceptionPanel) {
        this._exceptionPanel = new UserInfoExceptionList(this._loader, this._ui);
        // OG: positioned at (absLeft+270, absTop+(state!=0?196:34))
        const offsetY = this._state !== 0 ? 196 : 34;
        this._exceptionPanel.container.position.set(PANEL_W - 1, offsetY);
        this._contentLayer.addChild(this._exceptionPanel.container);
      }
    }
    if (this._exceptionPanel) this._exceptionPanel.container.visible = this._exceptionVisible;
  }

  // OG: SetChairItemInfo / SetWishItemInfo — populate sub-panel data
  setChairItems(itemIds: number[]): void {
    this.chairItems = itemIds;
    this._syncDetailPanel();
  }

  setWishItems(itemIds: number[]): void {
    this.wishItems = itemIds;
    this._syncDetailPanel();
    if (this._wishPanel) this._wishPanel.setItems(
      itemIds.map(id => ({ itemId: id, name: this.itemNameOf?.(id) ?? `Item ${id}`, count: 1, isCash: Math.floor(id / 100000) === 91 }))
    );
  }

  private _syncDetailPanel(): void {
    if (this._detailPanel) {
      const chair = this.chairItems.map(id => ({ itemId: id, name: this.itemNameOf?.(id) ?? `Item ${id}`, info: '' }));
      const wish = this.wishItems.map(id => ({ itemId: id, name: this.itemNameOf?.(id) ?? `Item ${id}`, info: '' }));
      this._detailPanel.setItems(chair, wish);
    }
  }

  // OG: SetPetItemList — populate pet equipped items for current pet slot
  setPetItemList(petIndex: number, itemIds: number[]): void {
    const pet = this.pets[petIndex];
    if (pet) {
      pet.items = itemIds.map(id => ({
        itemId: id,
        name: this.itemNameOf?.(id) ?? `Item ${id}`,
        info: '',
      }));
    }
  }

  // OG: SetTamingMobItemList — populate taming mob equipped items
  setTamingMobItemList(itemIds: number[]): void {
    if (this.tamingMob) {
      this.tamingMob.items = itemIds.map(id => ({
        itemId: id,
        name: this.itemNameOf?.(id) ?? `Item ${id}`,
        info: '',
      }));
    }
  }

  private _loadBackground(state: number): void {
    // OG SetLayer: loads base bg then cover per state
    if (this._bgWz) { this._bgWz.ToPixi().parent?.removeChild(this._bgWz.ToPixi()); }
    if (this._coverWz) { this._coverWz.ToPixi().parent?.removeChild(this._coverWz.ToPixi()); }
    this._bgGraphics.clear();

    const p = this._charInfoProp;
    if (p) {
      // Base background
      const bgNode = p.Get('backgrnd');
      if (bgNode instanceof WzCanvas) {
        this._bgWz = this._loader.Load(bgNode);
        if (this._bgWz) {
          const sp = this._bgWz.ToPixi();
          this._root.addChildAt(sp, 0);
        }
      }
      // Cover background per state
      if (state === 1) {
        // OG: CoverBackgrnd for pet state
        const coverNode = p.Get('covergrnd');
        if (coverNode instanceof WzCanvas) {
          this._coverWz = this._loader.Load(coverNode);
          if (this._coverWz) {
            const sp = this._coverWz.ToPixi();
            sp.y = 190; // below collapsed area
            this._root.addChildAt(sp, 1);
          }
        }
      } else if (state === 2) {
        const coverNode = p.Get('covergrnd2');
        if (coverNode instanceof WzCanvas) {
          this._coverWz = this._loader.Load(coverNode);
          if (this._coverWz) {
            const sp = this._coverWz.ToPixi();
            sp.y = 190;
            this._root.addChildAt(sp, 1);
          }
        }
      } else if (state === 3) {
        const coverNode = p.Get('covergrnd3');
        if (coverNode instanceof WzCanvas) {
          this._coverWz = this._loader.Load(coverNode);
          if (this._coverWz) {
            const sp = this._coverWz.ToPixi();
            sp.y = 190;
            this._root.addChildAt(sp, 1);
          }
        }
      }
    }

    if (!this._bgWz) {
      this._rebuildBg(state);
      this._root.addChildAt(this._bgGraphics, 0);
    }
  }

  // OG SetState: changes state, rebuilds background + controls + content
  // Also repositions exception list per IDA: MoveWnd(absLeft+271-(state!=0?0:171), absTop+190)
  setState(state: number): void {
    if (this._state === state) return;
    this._state = state;
    this._rebuildState();
    // OG: reposition exception list on state change
    if (this._exceptionPanel) {
      const offsetY = state !== 0 ? 196 : 34;
      this._exceptionPanel.container.position.set(PANEL_W - 1, offsetY);
    }
  }

  private _rebuildState(): void {
    const state = this._state;
    const height = STATE_HEIGHTS[state];

    // Rebuild background for new state
    this._loadBackground(state);

    // OG: Resize canvas overlay to match new panel height
    this._overlay.clear();
    this._overlay.rect(0, 0, PANEL_W, height).fill({ color: '#000000', alpha: 0.3 });

    // Clear old state content
    this._stateLayer.removeChildren();
    this._petNameTexts = [];
    this._petStatTexts = [];
    this._petItemTexts = [];
    this._petBtns = [];
    this._tamingStatTexts = [];
    this._tamingItemTexts = [];
    this._medalQuestTexts = [];

    // Build state-specific content
    if (state === 1) this._buildPetState();
    else if (state === 2) this._buildTamingState();
    else if (state === 3) this._buildMedalState();

    // Rebuild scrollbar per state
    this._petSb = null;
    this._tamingSb = null;
  }

  // OG state 1: Pet expanded view
  private _buildPetState(): void {
    if (!this._charInfoProp) return;

    // OG SetCtrl: 3 pet selection buttons at y=168, 202, 236
    // Buttons loaded from WZ via CreateCtrl_2 with IDs 2012, 2013, 2014
    for (let i = 0; i < 3; i++) {
      const pet = this.pets[i];
      const btnText = new Text({
        text: pet ? pet.name : `--empty--`,
        style: new TextStyle({ fill: '#FFFFFF', fontSize: 10, fontFamily: 'monospace' }),
      });
      btnText.x = 187;
      btnText.y = PET_BTN_START_Y + i * PET_BTN_SPACING;
      this._stateLayer.addChild(btnText);
      this._petNameTexts.push(btnText);
    }

    // OG Draw: current pet info
    const pet = this.pets[this.currentPetIndex];
    if (pet) {
      // Pet name centered at x=61, y=318
      const nameText = new Text({ text: pet.name, style: _nameStyle });
      nameText.anchor.set(0.5, 0);
      nameText.x = NAME_CENTER_X;
      nameText.y = PET_NAME_Y;
      this._stateLayer.addChild(nameText);

      // Pet template name at x=53, y=343
      const tplText = new Text({ text: pet.templateName.toUpperCase(), style: _blackStyle });
      tplText.x = PET_STAT_LEFT_X; tplText.y = PET_TEMPLATE_Y;
      this._stateLayer.addChild(tplText);
      this._petStatTexts.push(tplText);

      // Pet level at x=53, y=361
      const lvlText = new Text({ text: `Lv.${pet.level}`, style: _blackStyle });
      lvlText.x = PET_STAT_LEFT_X; lvlText.y = PET_LEVEL_Y;
      this._stateLayer.addChild(lvlText);
      this._petStatTexts.push(lvlText);

      // Pet repleteness at x=180, y=342
      const fullText = new Text({ text: `Full: ${pet.repleteness}`, style: _blackStyle });
      fullText.x = PET_STAT_RIGHT_X; fullText.y = PET_FULL_Y;
      this._stateLayer.addChild(fullText);
      this._petStatTexts.push(fullText);

      // Pet tameness at x=180, y=361
      const intimText = new Text({ text: `Intimacy: ${pet.tameness}`, style: _blackStyle });
      intimText.x = PET_STAT_RIGHT_X; intimText.y = PET_INTIMACY_Y;
      this._stateLayer.addChild(intimText);
      this._petStatTexts.push(intimText);

      // OG Draw: pet equipped items (scrollable list)
      // Item icon at x=111, y=220+42*i
      // Item name at x=147, y=220+42*i (format_string maxW=100)
      // Item info at x=183, y=237+42*i
      const items = pet.items ?? [];
      const maxVisible = 5;
      const startIdx = this._petScrollPos;
      for (let i = 0; i < maxVisible && startIdx + i < items.length; i++) {
        const item = items[startIdx + i];
        const rowY = PET_ITEM_START_Y + i * PET_ITEM_ROW_H;

        const nameT = new Text({ text: item.name, style: _blackStyle });
        nameT.x = PET_ITEM_NAME_X; nameT.y = rowY;
        this._stateLayer.addChild(nameT);
        this._petItemTexts.push(nameT);

        const infoT = new Text({ text: item.info, style: _blackStyle });
        infoT.x = PET_ITEM_INFO_X; infoT.y = rowY + 17;
        this._stateLayer.addChild(infoT);
        this._petItemTexts.push(infoT);
      }
    }

    // OG SetCtrl: scrollbar at (8, 250, 250, 117) with height=220
    const totalItems = pet?.items?.length ?? 0;
    const maxScroll = Math.max(0, totalItems - 5);
    if (maxScroll > 0) {
      this._petSb = new ScrollBar(SB_X, 250, 220, (pos) => { this._petScrollPos = pos; });
      this._stateLayer.addChild(this._petSb.container);
    }

    // OG: Boss pet crown — loaded from StringPool 0x125B (4699)
    // Positioned at (44, 267) initially, (44, 209) when pet slot 0 active
    this._loadBossPetCrown();
  }

  // OG: Load boss pet crown canvas from WZ
  // StringPool 0x125B (4699) resolves to a BSTR UOL path for the crown canvas
  // In the OG client, this is loaded via g_rm->GetObjectA using the StringPool BSTR
  private _loadBossPetCrown(): void {
    if (this._bossPetCrownLoaded || !this._charInfoProp) return;
    this._bossPetCrownLoaded = true;

    // Try to load from the character WZ package — the crown is typically at
    // a path resolved by StringPool 0x125B. Since we can't resolve StringPool
    // at runtime, try common WZ paths the crown might be at.
    // The crown is a small canvas icon (like a crown/halo above boss pets).
    const charWzProp = this._charWz?.GetItem('Character.wz') as WzProperty | null;
    if (charWzProp) {
      // Try loading from common boss pet crown paths
      const crownPaths = ['Info/crown', 'info/crown', 'Crown'];
      for (const path of crownPaths) {
        const node = charWzProp.Get(path);
        if (node instanceof WzCanvas) {
          this._bossPetCrown = this._loader.Load(node);
          if (this._bossPetCrown) {
            this._bossPetCrownPixi = this._bossPetCrown.ToPixi();
            this._bossPetCrownPixi.x = 44;
            this._bossPetCrownPixi.y = 267; // Initial position
            this._stateLayer.addChild(this._bossPetCrownPixi);
          }
          break;
        }
      }
    }
  }

  // OG state 2: Taming mob expanded view
  private _buildTamingState(): void {
    if (!this.tamingMob) return;

    // Taming mob name centered at x=61, y=301
    const nameText = new Text({ text: this.tamingMob.name, style: _nameStyle });
    nameText.anchor.set(0.5, 0);
    nameText.x = NAME_CENTER_X;
    nameText.y = TAMING_NAME_Y;
    this._stateLayer.addChild(nameText);
    this._tamingNameText = nameText;

    // Taming mob level at x=53, y=326
    const lvlText = new Text({ text: `Lv.${this.tamingMob.level}`, style: _grayStyle });
    lvlText.x = TAMING_STAT_LEFT_X; lvlText.y = TAMING_LEVEL_Y;
    this._stateLayer.addChild(lvlText);
    this._tamingStatTexts.push(lvlText);

    // Taming mob exp at x=53, y=345
    const expText = new Text({ text: `Exp: ${this.tamingMob.exp}`, style: _grayStyle });
    expText.x = TAMING_STAT_LEFT_X; expText.y = TAMING_EXP_Y;
    this._stateLayer.addChild(expText);
    this._tamingStatTexts.push(expText);

    // Taming mob fatigue at x=180, y=326
    const fatText = new Text({ text: `Fatigue: ${this.tamingMob.fatigue}`, style: _grayStyle });
    fatText.x = TAMING_STAT_RIGHT_X; fatText.y = TAMING_FATIGUE_Y;
    this._stateLayer.addChild(fatText);
    this._tamingStatTexts.push(fatText);

    // OG Draw: taming mob equipped items (scrollable list)
    // Item icon at x=111, y=205+42*i
    // Item name at x=152, y=205+42*i (format_string maxW=90)
    // Item info at x=187, y=222+42*i
    const items = this.tamingMob.items ?? [];
    const maxVisible = 4;
    const startIdx = this._tamingScrollPos;
    for (let i = 0; i < maxVisible && startIdx + i < items.length; i++) {
      const item = items[startIdx + i];
      const rowY = TAMING_ITEM_START_Y + i * TAMING_ITEM_ROW_H;

      const nameT = new Text({ text: item.name, style: _whiteGrayStyle });
      nameT.x = TAMING_ITEM_NAME_X; nameT.y = rowY;
      this._stateLayer.addChild(nameT);
      this._tamingItemTexts.push(nameT);

      const infoT = new Text({ text: item.info, style: _whiteGrayStyle });
      infoT.x = TAMING_ITEM_INFO_X; infoT.y = rowY + 17;
      this._stateLayer.addChild(infoT);
      this._tamingItemTexts.push(infoT);
    }

    // OG SetCtrl: scrollbar at (8, 250, 203, 117) with height=203
    const totalItems = items.length;
    const maxScroll = Math.max(0, totalItems - maxVisible);
    if (maxScroll > 0) {
      this._tamingSb = new ScrollBar(SB_X, 250, 203, (pos) => { this._tamingScrollPos = pos; });
      this._stateLayer.addChild(this._tamingSb.container);
    }
  }

  // OG state 3: Medal/Collection expanded view
  private _buildMedalState(): void {
    if (!this.medal) return;

    // Medal name at x=122, y=204
    const nameText = new Text({ text: this.medal.medalName, style: _grayStyle });
    nameText.x = MEDAL_NAME_X; nameText.y = MEDAL_NAME_Y;
    this._stateLayer.addChild(nameText);
    this._medalNameText = nameText;

    // Medal count at x=122, y=222
    const countText = new Text({ text: `Count: ${this.medal.count}`, style: _grayStyle });
    countText.x = MEDAL_COUNT_X; countText.y = MEDAL_COUNT_Y;
    this._stateLayer.addChild(countText);
    this._medalCountText = countText;

    // OG Draw: medal icon at (19, 243) via DrawItemIconForSlot(nEquipedMedalID)
    if (this._itemIcons && this.medal.medalItemId > 0) {
      const icon = this._itemIcons.LoadIcon(this.medal.medalItemId);
      if (icon) {
        const sp = icon.ToPixi();
        sp.x = MEDAL_ICON_X; sp.y = MEDAL_ICON_Y;
        this._stateLayer.addChild(sp);
      }
    }

    // Medal quest names at x=70, y=260+20*i
    for (let i = 0; i < this.medal.questNames.length; i++) {
      const qText = new Text({ text: this.medal.questNames[i], style: _whiteGrayStyle });
      qText.x = MEDAL_QUEST_X;
      qText.y = MEDAL_QUEST_START_Y + i * MEDAL_QUEST_ROW_H;
      this._stateLayer.addChild(qText);
      this._medalQuestTexts.push(qText);
    }
  }

  // OG: ResetInfo — refresh avatar from live CUserLocal data
  resetInfo(): void {
    // Re-trigger avatar creation on next update
    this._avatar = null;
    // Rebuild state content if expanded
    if (this._state > 0) this._rebuildState();
  }

  // OG: ResetInfo_Pet — refresh pet data from live pet array
  resetInfoPet(): void {
    // Clear pet avatars so they rebuild on next update
    for (let i = 0; i < 3; i++) this._petAvatars[i] = null;
    if (this._state === 1) this._rebuildState();
  }

  // OG: ResetInfo_TamingMob — refresh taming mob from live data
  resetInfoTamingMob(): void {
    if (this._state === 2) this._rebuildState();
  }

  // OG: OnClosePet — called when a pet is closed/removed
  onClosePet(ownerCharId: number): void {
    if (this.characterId === ownerCharId && this._state === 1) {
      // Close exception list if open
      if (this._exceptionVisible) this.toggleExceptionList();
      // Switch to taming mob state if riding, else collapse
      if (this.hasTamingMob) this.setState(2);
      else this.setState(0);
    }
  }

  // OG: NotifyGivePopResult — update fame display after fame gift
  notifyGivePopResult(newFame: number): void {
    this.fame = newFame;
  }

  get state(): number { return this._state; }

  update(dt: number): void {
    if (!this.isVisible) return;

    // OG Draw: common text updates
    this._nameText.text = this.charName;
    this._levelText.text = `Lv.${this.level}`;
    this._jobText.text = this.job;
    this._fameText.text = `Fame: ${this.fame}`;
    this._communityText.text = this.guild;
    this._allianceText.text = this.alliance;

    // OG Draw: married image at (15, 32)
    if (this._marriedSprite) {
      this._marriedSprite.ToPixi().visible = this.isMarried;
    }

    // OG SetAvatarInfo: character avatar at (100, 127) — rendered in main panel
    if (this.avatarLook && this._charWz && this._itemWz && this._baseWz) {
      if (!this._avatar) {
        this._avatar = new CharLook(this.avatarLook.skin);
        this._avatar.Load(this._charWz, this._itemWz, this._baseWz, this._loader);
        this._avatar.SetAvatar(this.avatarLook);
        this._avatar.StartAction('stand1');
        this._avatar.container.position.set(100, 127);
        this._contentLayer.addChild(this._avatar.container);
      }
      this._avatar.Update(dt, { x: 0, y: 0 }, false, false);
      this._avatar.RebuildDisplay();
    }

    // OG CreatePetAvatar: pet avatar at (53, 299) — rendered in state 1
    if (this._state === 1 && this._charWz) {
      const pet = this.pets[this.currentPetIndex];
      if (pet && pet.equipItemId > 0) {
        if (!this._petAvatars[this.currentPetIndex]) {
          const petLook = new PetLook(pet.equipItemId);
          petLook.Load(this._loader, this._charWz);
          petLook.container.position.set(PET_AVATAR_X, PET_AVATAR_Y);
          this._stateLayer.addChild(petLook.container);
          this._petAvatars[this.currentPetIndex] = petLook;
        }
        const av = this._petAvatars[this.currentPetIndex];
        if (av) av.Update(dt);
      }

      // OG: Boss pet crown reposition — (44, 209) when pet slot 0 active
      if (this._bossPetCrownPixi) {
        this._bossPetCrownPixi.y = this.currentPetIndex === 0 ? 209 : 267;
      }
    }

    // OG SetCtrl: button enable/disable by state (from IDA)
    // BtPet: enabled = local char && m_bPetActivated
    if (this._btPet) this._btPet.enabled = this.isLocalChar && this.bPetActivated;
    // BtRide: enabled = m_bTamingMob
    if (this._btRide) this._btRide.enabled = this.hasTamingMob;
    // BtCollect: enabled = m_pMedalInfo != null
    if (this._btCollect) this._btCollect.enabled = this.medal !== null;
    // BtException: enabled = local char && m_bPetActivated && state==1
    if (this._btException) this._btException.enabled = this.isLocalChar && this.bPetActivated && this._state === 1;
    // BtPopUp/BtPopDown: enabled if not local char, OR if local char level >= 15
    const canFame = !this.isLocalChar || this.level >= 15;
    if (this._btFameUp) this._btFameUp.enabled = canFame;
    if (this._btFameDown) this._btFameDown.enabled = canFame;
    // BtParty/BtTrad: disabled for local char
    if (this._btParty) this._btParty.enabled = !this.isLocalChar;
    if (this._btTrade) this._btTrade.enabled = !this.isLocalChar;
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = x - this._root.x;
    const ly = y - this._root.y;

    // Check buttons
    for (const b of [this._btParty, this._btTrade, this._btFameUp, this._btFameDown, this._btPet, this._btRide, this._btCollect, this._btException, this._btFamily]) {
      if (b?.handleMouseButton(lx, ly, down)) return true;
    }

    if (!down) return true;

    // Close button
    const ph = STATE_HEIGHTS[this._state];
    if (lx >= PANEL_W - 18 && ly < 22) { this.isVisible = false; return true; }

    // Forward clicks to sub-windows
    if (this._detailVisible && this._detailPanel) {
      const slx = lx - PANEL_W;
      if (slx >= 0 && ly >= 0) {
        this._detailPanel.container.visible = true;
        return true;
      }
    }
    if (this._wishVisible && this._wishPanel) {
      const slx = lx - PANEL_W;
      if (slx >= 0 && ly >= 271) {
        this._wishPanel.container.visible = true;
        return true;
      }
    }
    if (this._exceptionVisible && this._exceptionPanel) {
      const slx = lx - (PANEL_W - 1);
      const offsetY = this._state !== 0 ? 196 : 34;
      if (slx >= 0 && ly >= offsetY) {
        this._exceptionPanel.handleClick(slx, ly - offsetY);
        return true;
      }
    }

    // Pet selection buttons (state 1): hit-test at y=168, 202, 236
    if (this._state === 1 && lx >= 187 && lx < PANEL_W) {
      for (let i = 0; i < 3; i++) {
        const btnY = PET_BTN_START_Y + i * PET_BTN_SPACING;
        if (ly >= btnY && ly < btnY + PET_BTN_SPACING) {
          this.currentPetIndex = i;
          this._rebuildState();
          this.onSelectPet?.(i);
          return true;
        }
      }
    }

    return lx >= 0 && lx < PANEL_W && ly >= 0 && ly < ph;
  }

  onKeyPress(key: string): boolean {
    if (key === 'Escape' && this.isVisible) { this.isVisible = false; return true; }
    return false;
  }

  // OG: OnMouseMove — tooltip for pet/taming mob items on hover
  handleMouseMove(x: number, y: number): void {
    if (!this.isVisible) return;
    const lx = x - this._root.x;
    const ly = y - this._root.y;

    // OG: pet item tooltip hit-test at (147, y-16, 247, y) where y starts at 218, increments by 42
    if (this._state === 1) {
      const pet = this.pets[this.currentPetIndex];
      if (pet) {
        for (let i = 0; i < 5 && i < (pet.items?.length ?? 0); i++) {
          const rowY = PET_ITEM_START_Y + i * PET_ITEM_ROW_H;
          if (lx >= PET_ITEM_NAME_X && lx < PET_ITEM_NAME_X + 100 && ly >= rowY - 16 && ly < rowY + 26) {
            // OG: tooltip shows item name via CUIToolTip
            this._showItemTooltip(lx, ly, pet.items[i].name);
            return;
          }
        }
      }
    }

    // OG: taming mob item tooltip hit-test at (152, y-16, 252, y) where y starts at 205, increments by 42
    if (this._state === 2 && this.tamingMob) {
      for (let i = 0; i < 4 && i < (this.tamingMob.items?.length ?? 0); i++) {
        const rowY = TAMING_ITEM_START_Y + i * TAMING_ITEM_ROW_H;
        if (lx >= TAMING_ITEM_NAME_X && lx < TAMING_ITEM_NAME_X + 100 && ly >= rowY - 16 && ly < rowY + 26) {
          this._showItemTooltip(lx, ly, this.tamingMob.items[i].name);
          return;
        }
      }
    }

    // Clear tooltip when not hovering items
    this._hideTooltip();
  }

  private _tooltipContainer: Container | null = null;

  private _showItemTooltip(lx: number, ly: number, text: string): void {
    if (!this._tooltipContainer) {
      this._tooltipContainer = new Container();
      const bg = new Graphics();
      bg.roundRect(0, 0, 200, 30, 4).fill({ color: '#0C0C16', alpha: 240 / 255 });
      bg.roundRect(0, 0, 200, 30, 4).stroke({ color: '#46465A', width: 1 });
      this._tooltipContainer.addChild(bg);
      const tipText = new Text({ text: '', style: new TextStyle({ fill: '#C8C8C8', fontSize: 9, fontFamily: 'monospace', wordWrap: true, wordWrapWidth: 190 }) });
      tipText.x = 5; tipText.y = 5;
      this._tooltipContainer.addChild(tipText);
      this._root.addChild(this._tooltipContainer);
    }
    const tipText = this._tooltipContainer.children[1] as Text;
    if (tipText) tipText.text = text;
    this._tooltipContainer.x = Math.min(lx + 10, PANEL_W - 210);
    this._tooltipContainer.y = Math.min(ly - 35, STATE_HEIGHTS[this._state] - 40);
    this._tooltipContainer.visible = true;
  }

  private _hideTooltip(): void {
    if (this._tooltipContainer) this._tooltipContainer.visible = false;
  }

  private _rebuildBg(state: number): void {
    const h = STATE_HEIGHTS[state];
    this._bgGraphics.clear();
    this._bgGraphics.rect(0, 0, PANEL_W, h).fill({ color: '#0F0F19', alpha: 230 / 255 });
    this._bgGraphics.rect(0, 0, PANEL_W, h).stroke({ color: '#504632', width: 1 });
  }
}
