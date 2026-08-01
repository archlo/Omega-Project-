import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzSprite } from '../../render/WzSprite.js';
import { Button } from '../Button.js';
import { Sprite } from 'pixi.js';
import { getIdealStatUp, StatPair } from './StatDetailInfo.js';
import { StringPoolService } from '../../localization/StringPoolService.js';
import { ToolTip } from './ToolTip.js';

// OG CUIStat constants (from IDA decompilation — Draw @ 0x864bd0)
const PANEL_W = 172;
const PANEL_H = 337;

// OG Draw: all text at x=54, Y positions from DrawTextA calls
const TEXT_X = 54;
const Y_NAME = 32;
const Y_JOB = 50;
const Y_LEVEL = 68;
const Y_GUILD = 86;
const Y_HP = 104;
const Y_MP = 122;
const Y_EXP = 140;
const Y_FAME = 158; // IDA: StringPool 6677 "Fame: %d"
const Y_AP_COUNT = 200; // centered: 85 - textWidth
const Y_STR = 227;
const Y_DEX = 245;
const Y_INT = 263;
const Y_LUK = 281;

// OG OnMouseMove: EXP tooltip area hit-test (rx-55 > 0x6D || ry-138 > 0xD)
// Valid range: rx in [55, 164], ry in [138, 151]
// Width = 109 (0x6D), Height = 13 (0xD)
const EXP_TOOLTIP_X = 55;
const EXP_TOOLTIP_Y = 138;
const EXP_TOOLTIP_W = 109; // 0x6D
const EXP_TOOLTIP_H = 13;  // 0xD

// OG Button IDs (from OnCreate / OnButtonClicked)
const BT_HP_UP = 0x7D0;
const BT_MP_UP = 0x7D1;
const BT_STR_UP = 0x7D2;
const BT_DEX_UP = 0x7D3;
const BT_INT_UP = 0x7D4;
const BT_LUK_UP = 0x7D5;
const BT_DETAIL_OPEN = 0x7D6;
const BT_AUTO = 0x7D7;
const BT_AUTO1 = 0x7D8;
const BT_AUTO2 = 0x7D9;

// SendAbilityUpRequest bitmask values (from OnButtonClicked)
const ABILITY_HP = 0x800;
const ABILITY_MP = 0x2000;
const ABILITY_STR = 0x40;
const ABILITY_DEX = 0x80;
const ABILITY_INT = 0x100;
const ABILITY_LUK = 0x200;

// OG StringPool IDs for auto-ap tooltips (from OnCreate)
const STRPOOL_AUTO_TOOLTIP = 1988;
const STRPOOL_AUTO1_TOOLTIP = 1989;
const STRPOOL_AUTO2_TOOLTIP = 1990;
const STRPOOL_TOOLTIP_HELPER = 1993;

const _labelStyle = new TextStyle({ fill: '#000', fontSize: 10, fontFamily: 'monospace', stroke: { color: '#888', width: 1 } });
const _valueStyle = new TextStyle({ fill: '#000', fontSize: 10, fontFamily: 'monospace', stroke: { color: '#888', width: 1 } });
const _apStyle = new TextStyle({ fill: '#8B6914', fontSize: 10, fontFamily: 'monospace', stroke: { color: '#888', width: 1 } });
const _redStyle = new TextStyle({ fill: '#CC0000', fontSize: 10, fontFamily: 'monospace', stroke: { color: '#888', width: 1 } });

// OG class: CUIStat (3008 bytes, inherits CUIWnd)
// All coordinates and behavior from IDA decompilation of v95 client.
export class StatsInfo extends GamePanel {
  level = 1; job = 'Beginner'; ap = 0; fame = 0;
  str = 4; dex = 4; intStat = 4; luk = 4;
  // Base stats (without equipment) — used for StringPool 1979 bonus format
  baseStr = 4; baseDex = 4; baseInt = 4; baseLuk = 4;
  hp = 50; maxHp = 50; mp = 5; maxMp = 5;
  atk = 10; def = 10; speed = 100; jump = 100;
  guild = '';
  exp = 0; nextLevelExp = 10;
  jobCategory = 0; // Computed as (job/100)%10: 0=normal, 1=Aran, 2=Evan, 3=Mercedes

  onHpUp: (() => void) | null = null;
  onMpUp: (() => void) | null = null;
  onStrUp: (() => void) | null = null;
  onDexUp: (() => void) | null = null;
  onIntUp: (() => void) | null = null;
  onLukUp: (() => void) | null = null;
  onAutoApUp: ((mode: number) => void) | null = null;
  onDetailToggle: (() => void) | null = null;
  // OG: AutoApUp shows confirmation dialog before sending
  onAutoApConfirm: ((alloc: { str: number; dex: number; intStat: number; luk: number }) => void) | null = null;

  // OG: AutoApUp confirmation dialog
  private _confirmContainer: Container | null = null;

  // OG: CreateTip — job-specific stat recommendation balloon tips (4140 bytes)
  // All positions, StringPool IDs, and directions from IDA decompilation
  private _tipLayers: Container[] = [];

  private _bg: Graphics;
  private _wzBg: WzSprite | null = null;
  private _wzBg2: WzSprite | null = null;
  private _wzBg3: WzSprite | null = null;
  private _contentLayer: Container;
  private _btHpUp: Button | null = null;
  private _btMpUp: Button | null = null;
  private _btStrUp: Button | null = null;
  private _btDexUp: Button | null = null;
  private _btIntUp: Button | null = null;
  private _btLukUp: Button | null = null;
  private _btAuto: Button | null = null;
  private _btAuto1: Button | null = null;
  private _btAuto2: Button | null = null;
  private _btDetailOpen: Button | null = null;

  // Text elements for each Draw position
  private _nameText: Text;
  private _jobText: Text;
  private _levelText: Text;
  private _guildText: Text;
  private _hpText: Text;
  private _mpText: Text;
  private _expText: Text;
  private _fameText: Text;
  private _apValue: Text;
  private _strLabel: Text;
  private _strValue: Text;
  private _dexLabel: Text;
  private _dexValue: Text;
  private _intLabel: Text;
  private _intValue: Text;
  private _lukLabel: Text;
  private _lukValue: Text;

  // OG: m_apCanvasDisabled — stat icons from UI/UIWindow2.img/Stat/main/{statName}
  // Loaded in OnCreate via IWzResMan::GetObjectA with path "UI/UIWindow2.img/Stat/main/" + statName
  private _disabledCanvases: (Sprite | null)[] = [];
  // OG: ms_aStatName — array of stat name strings used for disabled canvas loading and AutoApUp formatting
  private static readonly STAT_NAMES = ['STR', 'DEX', 'INT', 'LUK', 'AP', 'HP', 'MP'];
  // OG: CUIStatDetail — shown when m_nOption=1, positioned at (GetAbsLeft+172, GetAbsTop+90)
  private _detailVisible = false;
  // OG: m_bBeginner — set in Draw based on job/level, gates the entire stats section
  private _bBeginner = false;

  // OG: CUIWnd canvas overlay (StringPool 976) — semi-transparent mask
  private _overlay: Graphics;

  private _stringPool: StringPoolService | null = null;
  private _toolTip: ToolTip | null = null;

  constructor(loader: WzTextureLoader, ui: WzPackage | null, stringPool?: StringPoolService) {
    super();
    this._stringPool = stringPool ?? null;
    this._toolTip = new ToolTip();
    this._root.visible = false;

    // OG: CUIWnd position persistence — save/restore via localStorage key 10
    const savedPos = localStorage.getItem('CUIStatWndPos');
    if (savedPos) {
      try {
        const pos = JSON.parse(savedPos);
        this._root.x = pos.x ?? 10;
        this._root.y = pos.y ?? 80;
      } catch { this._root.x = 10; this._root.y = 80; }
    } else {
      this._root.x = 10;
      this._root.y = 80;
    }

    // OG: CUIWnd::OnCreate creates close button (type 1 = BtClose)
    this.createCloseButton(loader, ui, 1, PANEL_W);

    // OG: CUIWnd::OnCreate loads 3 background layers from UIWindow2.img/Stat/main
    const stat = ui?.GetItem('UIWindow2.img/Stat/main') as WzProperty | null;
    if (stat) {
      this._wzBg = this._loadWzSprite(loader, stat, 'backgrnd');
      this._wzBg2 = this._loadWzSprite(loader, stat, 'backgrnd2');
      this._wzBg3 = this._loadWzSprite(loader, stat, 'backgrnd3');
    }

    this._bg = new Graphics();
    if (this._wzBg) {
      // OG: 3 background layers at z=-1, z=0, z=1 (backgrnd, backgrnd2, backgrnd3)
      const bg1 = this._wzBg.ToPixi();
      this._root.addChild(bg1);
      if (this._wzBg2) {
        const bg2 = this._wzBg2.ToPixi();
        this._root.addChild(bg2);
      }
      if (this._wzBg3) {
        const bg3 = this._wzBg3.ToPixi();
        this._root.addChild(bg3);
      }
    } else {
      this._rebuildBg();
      this._root.addChild(this._bg);
    }

    // OG: CUIWnd canvas overlay (StringPool 976) — semi-transparent mask
    this._overlay = new Graphics();
    this._overlay.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#000000', alpha: 0.3 });
    this._root.addChild(this._overlay);

    // Content layer — ensures all text/buttons render ON TOP of backgrounds
    this._contentLayer = new Container();
    this._contentLayer.sortableChildren = true;
    this._root.addChild(this._contentLayer);

    // OG: CToolTipHelper — load tooltip from StringPool 1993
    // Loaded via ToolTip class

    // OG: m_apCanvasDisabled — load stat icons from UI/UIWindow2.img/Stat/main/Disabled/{statName}
    // These are the small stat icons drawn next to each stat label in Draw
    // Loaded via IWzResMan::GetObjectA with path "UI/UIWindow2.img/Stat/main/Disabled/" + statName
    if (stat) {
      const disabledProp = stat.Get('Disabled') instanceof WzProperty ? stat.Get('Disabled') as WzProperty : null;
      if (disabledProp) {
        for (const name of StatsInfo.STAT_NAMES) {
          const canvasNode = disabledProp.Get(name);
          if (canvasNode instanceof WzCanvas) {
            const loaded = loader.Load(canvasNode);
            if (loaded) {
              this._disabledCanvases.push(loaded.ToPixi());
            } else {
              this._disabledCanvases.push(null);
            }
          } else {
            this._disabledCanvases.push(null);
          }
        }
      }
      // Add all loaded canvases to content layer
      for (const c of this._disabledCanvases) {
        if (c) this._contentLayer.addChild(c);
      }
    }

    // OG: All text at x=54, Y positions from DrawTextA calls
    // Added to _contentLayer to ensure they render ON TOP of backgrounds
    this._nameText = new Text({ text: '', style: _valueStyle });
    this._nameText.x = TEXT_X; this._nameText.y = Y_NAME;
    this._contentLayer.addChild(this._nameText);

    this._jobText = new Text({ text: '', style: _valueStyle });
    this._jobText.x = TEXT_X; this._jobText.y = Y_JOB;
    this._contentLayer.addChild(this._jobText);

    this._levelText = new Text({ text: '', style: _valueStyle });
    this._levelText.x = TEXT_X; this._levelText.y = Y_LEVEL;
    this._contentLayer.addChild(this._levelText);

    this._guildText = new Text({ text: '', style: _valueStyle });
    this._guildText.x = TEXT_X; this._guildText.y = Y_GUILD;
    this._contentLayer.addChild(this._guildText);

    this._hpText = new Text({ text: '', style: _valueStyle });
    this._hpText.x = TEXT_X; this._hpText.y = Y_HP;
    this._contentLayer.addChild(this._hpText);

    this._mpText = new Text({ text: '', style: _valueStyle });
    this._mpText.x = TEXT_X; this._mpText.y = Y_MP;
    this._contentLayer.addChild(this._mpText);

    this._expText = new Text({ text: '', style: _valueStyle });
    this._expText.x = TEXT_X; this._expText.y = Y_EXP;
    this._contentLayer.addChild(this._expText);

    this._fameText = new Text({ text: '', style: _labelStyle });
    this._fameText.x = TEXT_X; this._fameText.y = Y_FAME;
    this._contentLayer.addChild(this._fameText);

    this._apValue = new Text({ text: '0', style: _apStyle });
    this._apValue.x = TEXT_X; this._apValue.y = Y_AP_COUNT;
    this._contentLayer.addChild(this._apValue);

    this._strLabel = new Text({ text: 'STR', style: _labelStyle });
    this._strLabel.x = TEXT_X; this._strLabel.y = Y_STR;
    this._contentLayer.addChild(this._strLabel);

    this._strValue = new Text({ text: '0', style: _valueStyle });
    this._strValue.x = TEXT_X + 30; this._strValue.y = Y_STR;
    this._contentLayer.addChild(this._strValue);

    this._dexLabel = new Text({ text: 'DEX', style: _labelStyle });
    this._dexLabel.x = TEXT_X; this._dexLabel.y = Y_DEX;
    this._contentLayer.addChild(this._dexLabel);

    this._dexValue = new Text({ text: '0', style: _valueStyle });
    this._dexValue.x = TEXT_X + 30; this._dexValue.y = Y_DEX;
    this._contentLayer.addChild(this._dexValue);

    this._intLabel = new Text({ text: 'INT', style: _labelStyle });
    this._intLabel.x = TEXT_X; this._intLabel.y = Y_INT;
    this._contentLayer.addChild(this._intLabel);

    this._intValue = new Text({ text: '0', style: _valueStyle });
    this._intValue.x = TEXT_X + 30; this._intValue.y = Y_INT;
    this._contentLayer.addChild(this._intValue);

    this._lukLabel = new Text({ text: 'LUK', style: _labelStyle });
    this._lukLabel.x = TEXT_X; this._lukLabel.y = Y_LUK;
    this._contentLayer.addChild(this._lukLabel);

    this._lukValue = new Text({ text: '0', style: _valueStyle });
    this._lukValue.x = TEXT_X + 30; this._lukValue.y = Y_LUK;
    this._contentLayer.addChild(this._lukValue);

    // OG: Load WZ buttons via CLayoutMan::AddButton
    if (stat) {
      this._btHpUp = this._loadButton(loader, stat, 'BtHpUp');
      this._btMpUp = this._loadButton(loader, stat, 'BtMpUp');
      this._btStrUp = this._loadButton(loader, stat, 'BtStrUp');
      this._btDexUp = this._loadButton(loader, stat, 'BtDexUp');
      this._btIntUp = this._loadButton(loader, stat, 'BtIntUp');
      this._btLukUp = this._loadButton(loader, stat, 'BtLukUp');
      this._btAuto = this._loadButton(loader, stat, 'BtAuto');
      this._btAuto1 = this._loadButton(loader, stat, 'BtAuto1');
      this._btAuto2 = this._loadButton(loader, stat, 'BtAuto2');
      this._btDetailOpen = this._loadButton(loader, stat, 'BtDetailOpen');

      // Wire click handlers (OG: OnButtonClicked — switch on nId)
      // 0x7D0→SendAbilityUp(0x800), 0x7D1→SendAbilityUp(0x2000),
      // 0x7D2→SendAbilityUp(0x40), 0x7D3→SendAbilityUp(0x80),
      // 0x7D4→SendAbilityUp(0x100), 0x7D5→SendAbilityUp(0x200),
      // 0x7D6→ToggleDetail, 0x7D7/0x7D8→AutoApUp(1), 0x7D9→AutoApUp(0)
      if (this._btHpUp) { this._btHpUp.onClick = () => this.onHpUp?.(); this._contentLayer.addChild(this._btHpUp.container); }
      if (this._btMpUp) { this._btMpUp.onClick = () => this.onMpUp?.(); this._contentLayer.addChild(this._btMpUp.container); }
      if (this._btStrUp) { this._btStrUp.onClick = () => this.onStrUp?.(); this._contentLayer.addChild(this._btStrUp.container); }
      if (this._btDexUp) { this._btDexUp.onClick = () => this.onDexUp?.(); this._contentLayer.addChild(this._btDexUp.container); }
      if (this._btIntUp) { this._btIntUp.onClick = () => this.onIntUp?.(); this._contentLayer.addChild(this._btIntUp.container); }
      if (this._btLukUp) { this._btLukUp.onClick = () => this.onLukUp?.(); this._contentLayer.addChild(this._btLukUp.container); }
      // OG: Auto AP buttons — positioned by WZ, add with zIndex to ensure visibility
      if (this._btAuto) { this._btAuto.onClick = () => this.onAutoApUp?.(1); this._btAuto.container.zIndex = 50; this._contentLayer.addChild(this._btAuto.container); }
      if (this._btAuto1) { this._btAuto1.onClick = () => this.onAutoApUp?.(1); this._btAuto1.container.zIndex = 50; this._contentLayer.addChild(this._btAuto1.container); }
      if (this._btAuto2) { this._btAuto2.onClick = () => this.onAutoApUp?.(0); this._btAuto2.container.zIndex = 50; this._contentLayer.addChild(this._btAuto2.container); }
      if (this._btDetailOpen) { this._btDetailOpen.onClick = () => this.toggleDetail(); this._contentLayer.addChild(this._btDetailOpen.container); }
    }
  }

  private _loadWzSprite(loader: WzTextureLoader, prop: WzProperty, name: string): WzSprite | null {
    const node = prop.Get(name);
    return node instanceof WzCanvas ? loader.Load(node) : null;
  }

  private _loadButton(loader: WzTextureLoader, prop: WzProperty, name: string): Button | null {
    const btnProp = prop.Get(name);
    if (!(btnProp instanceof WzProperty)) {
      return null;
    }
    const btn = Button.fromWz(loader, btnProp);
    return btn;
  }

  SetDerivedStats(atk: number, def: number, speed: number, jump: number): void {
    this.atk = atk;
    this.def = def;
    this.speed = speed;
    this.jump = jump;
  }

  // OG: ToggleDetail — CUIStatDetail at (GetAbsLeft+172, GetAbsTop+90)

  get detailVisible(): boolean { return this._detailVisible; }

  toggleDetail(): void {
    this._detailVisible = !this._detailVisible;
    this.onDetailToggle?.();
  }

  private _parseJobNumber(): number {
    // Extract job number from job string — fallback to 0
    const match = this.job.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  // OG: EnableApUpButton — complex enable/disable logic (from cuistat_EnableApUpButton_clean.txt)
  private _updateButtonStates(): void {
    const hasAp = this.ap > 0;
    const jobNum = this._parseJobNumber();
    const level = this.level;
    const isBeginnerOrLowEvans = (jobNum % 1000 === 0 || jobNum === 2001) && level <= 10;

    // OG RestoreButtons: show/hide all ApUp buttons based on beginner/low-Evans state
    const showButtons = !isBeginnerOrLowEvans;
    for (const btn of [this._btHpUp, this._btMpUp, this._btStrUp, this._btDexUp, this._btIntUp, this._btLukUp]) {
      if (btn) btn.container.visible = showButtons;
    }
    for (const btn of [this._btAuto, this._btAuto1, this._btAuto2]) {
      if (btn) btn.container.visible = showButtons;
    }

    // OG EnableApUpButton: enable/disable all 6 ApUp buttons based on AP
    for (const btn of [this._btHpUp, this._btMpUp, this._btStrUp, this._btDexUp, this._btIntUp, this._btLukUp]) {
      if (btn && btn.container.visible) btn.enabled = hasAp;
    }
    // OG: nLevel < 20 → disable first 2 ApUp buttons (HP=0x7D0, MP=0x7D1)
    // IDA confirms: m_pBtApUp[0] (HP) and m_pBtApUp[1] (MP) disabled when level < 20
    if (hasAp && level < 20) {
      if (this._btHpUp && this._btHpUp.container.visible) this._btHpUp.enabled = false;
      if (this._btMpUp && this._btMpUp.container.visible) this._btMpUp.enabled = false;
    }

    // OG EnableApUpButton: enable/disable 3 AutoApUp buttons based on AP
    for (const btn of [this._btAuto, this._btAuto1, this._btAuto2]) {
      if (btn && btn.container.visible) btn.enabled = hasAp;
    }

    // OG EnableApUpButton: auto button visibility by job category
    // IDA: bEnablea = !(job % 1000 / 100 == 8 || job % 1000 / 100 == 9) — not Mercedes/Aran
    // IDA: isEvan = (nJob == 500) — actually Aran (variable naming from decompile)
    // BtAuto (i=0): shown when bEnablea && !isEvan (normal chars, not Aran)
    // BtAuto1 (i=1): shown when bEnablea && isEvan (Aran only)
    // BtAuto2 (i=2): shown when bEnablea && isEvan (Aran only)
    const jobCat = Math.floor(jobNum / 100) % 10;
    const bEnablea = !(jobCat === 8 || jobCat === 9);
    const isAran = jobNum === 500;
    if (this._btAuto) this._btAuto.container.visible = showButtons && bEnablea && !isAran;
    if (this._btAuto1) this._btAuto1.container.visible = showButtons && bEnablea && isAran;
    if (this._btAuto2) this._btAuto2.container.visible = showButtons && bEnablea && isAran;
  }

  update(_dt: number): void {
    if (!this.isVisible) return;

    // OG Draw: all text at x=54, Y positions match DrawTextA calls
    this._nameText.text = this._playerName || '';
    this._jobText.text = this.job;
    this._levelText.text = `${this.level}`;
    this._guildText.text = this.guild;

    // OG Draw: HP/MP with max values (StringPool 6678 format "%d / %d")
    this._hpText.text = `${this.hp} / ${this.maxHp}`;
    this._mpText.text = `${this.mp} / ${this.maxMp}`;

    // OG Draw: EXP percentage display (StringPool 1994 format "%d / %d (%d%%)")
    // EXP% = nEXP / nNextLevelEXP * 100, clamped to 0 if nNextLevelEXP <= 0
    const expPct = this.nextLevelExp > 0 ? Math.floor((this.exp / this.nextLevelExp) * 100) : 0;
    this._expText.text = `${this.exp} / ${this.nextLevelExp} (${expPct}%)`;

    // OG Draw: bBeginner check — (job == 0 * 1000 || job == 2001) && level <= 10
    // When bBeginner: draw beginner text, skip stats section entirely
    const jobNum = this._parseJobNumber();
    this._bBeginner = (jobNum % 1000 === 0 || jobNum === 2001) && this.level <= 10;

    if (this._bBeginner) {
      // OG: when bBeginner, only name/job/level/guild/HP/MP/EXP/AP are drawn
      // Stats section (STR/DEX/INT/LUK) and AP count are NOT drawn
      this._apValue.visible = false;
      this._strLabel.visible = false;
      this._strValue.visible = false;
      this._dexLabel.visible = false;
      this._dexValue.visible = false;
      this._intLabel.visible = false;
      this._intValue.visible = false;
      this._lukLabel.visible = false;
      this._lukValue.visible = false;
      this._updateButtonStates();
      return;
    }

    // OG Draw: AP count centered at (85 - textWidth, 200)
    // CalcTextWidth → DrawTextA at (85 - nWidth, 200)
    this._apValue.visible = true;
    this._apValue.text = `${this.ap}`;
    const apTextWidth = this._apValue.width;
    this._apValue.x = 85 - apTextWidth;

    // OG Draw: Fame at y=158 — StringPool 6677 format "Fame: %d"
    this._fameText.visible = true;
    this._fameText.text = `Fame: ${this.fame}`;

    // OG Draw: Stats section — only drawn when !bBeginner
    // StringPool 1979 format when basicStat != characterStat: "%d (+%d)(+%d)"
    // When basicStat == characterStat: just itoa(value)
    const formatStat = (base: number, total: number): string => {
      if (base === total) return `${total}`;
      const bonus = total - base;
      return `${base} (+${bonus})`;
    };

    this._strLabel.visible = true;
    this._strValue.visible = true;
    this._strValue.text = formatStat(this.baseStr, this.str);
    this._strValue.style = _valueStyle;

    this._dexLabel.visible = true;
    this._dexValue.visible = true;
    this._dexValue.text = formatStat(this.baseDex, this.dex);
    this._dexValue.style = _valueStyle;

    this._intLabel.visible = true;
    this._intValue.visible = true;
    this._intValue.text = formatStat(this.baseInt, this.intStat);
    this._intValue.style = _valueStyle;

    this._lukLabel.visible = true;
    this._lukValue.visible = true;
    this._lukValue.text = formatStat(this.baseLuk, this.luk);
    this._lukValue.style = _valueStyle;

    // OG Draw: Position disabled stat canvases next to each stat label at x=38
    // Job category determines which pair of icons to show:
    // case 0,1,3,5 (warriors/mages/thieves): indices [2,3] (INT, LUK)
    // case 2 (archer): indices [0,1] (STR, DEX)
    // case 4 (thief): indices [0,2] (STR, INT)
    const statYPositions = [Y_STR, Y_DEX, Y_INT, Y_LUK, Y_FAME, Y_HP, Y_MP];
    const jobCat = Math.floor(jobNum / 100) % 10;
    for (let i = 0; i < this._disabledCanvases.length && i < statYPositions.length; i++) {
      const c = this._disabledCanvases[i];
      if (c) {
        c.x = 38;
        c.y = statYPositions[i];
        // Indices 0-3 are the stat icons (STR/DEX/INT/LUK)
        // Show the appropriate pair based on job category
        if (i < 4) {
          if (jobCat === 2) {
            // Archer: show STR(0) + DEX(1)
            c.visible = (i === 0 || i === 1);
          } else if (jobCat === 4) {
            // Thief: show STR(0) + INT(2)
            c.visible = (i === 0 || i === 2);
          } else {
            // Warrior/Mage/Pirate/Botanist: show INT(2) + LUK(3)
            c.visible = (i === 2 || i === 3);
          }
        } else {
          c.visible = true; // AP/HP/MP icons always visible
        }
      }
    }

    this._updateButtonStates();

    // OG: CUIWnd position persistence — save current position
    try {
      localStorage.setItem('CUIStatWndPos', JSON.stringify({ x: this._root.x, y: this._root.y }));
    } catch { /* ignore */ }
  }

  private _playerName = '';

  setPlayerName(name: string): void {
    this._playerName = name;
  }

  // OG: OnMouseMove — EXP tooltip and CToolTipHelper (from cuistat_OnMouseMove_clean.txt)
  private _tooltipShown = false;

  handleMouseMove(x: number, y: number): void {
    if (!this.isVisible) return;
    const lx = x - this._root.x;
    const ly = y - this._root.y;

    // OG: EXP tooltip area hit-test: (rx - 55) > 0x6D || (ry - 138) > 0xD → goto LABEL_15
    // If mouse is in EXP area (55, 138, 110, 14): show EXP tooltip via CUIToolTip::SetToolTip_String
    const inExpArea = (lx - EXP_TOOLTIP_X) <= EXP_TOOLTIP_W && (ly - EXP_TOOLTIP_Y) <= EXP_TOOLTIP_H;

    if (inExpArea) {
      // OG: StringPool 0x1A37 = EXP tooltip format
      // Shows: "EXP: %d / %d (%d%%)" or similar
      const expPct = this.nextLevelExp > 0 ? Math.floor((this.exp / this.nextLevelExp) * 100) : 0;
      const tooltipStr = `EXP: ${this.exp} / ${this.nextLevelExp} (${expPct}%)`;
      if (tooltipStr) {
        // OG: CUIToolTip::SetToolTip_String at (IsMyAddon() + rx + 20, ry + 20)
        this._showExpTooltip(lx + 20, ly + 20, tooltipStr);
        this._tooltipShown = true;
      }
    } else {
      // OG LABEL_15: CToolTipHelper::CheckAndShow with offset 8 when beginner
      // When not in EXP area, show CToolTipHelper if available
      if (!this._tooltipShown) {
        this._tooltipShown = true;
        this._showTooltip(lx, ly);
      }
    }

    // OG: clear tooltip when mouse leaves all areas
    if (!inExpArea && this._tooltipShown) {
      // Check if still in stat area
      const inStatArea = lx >= 0 && lx < PANEL_W && ly >= Y_NAME && ly < Y_LUK + 16;
      if (!inStatArea) {
        this._tooltipShown = false;
        this._hideTooltip();
      }
    }
  }

  private _showTooltip(lx: number, ly: number): void {
    if (!this._toolTip) return;

    // OG: CToolTipHelper::CheckAndShow — show stat tooltip on hover
    this._toolTip.clearToolTip();

    // Build tooltip content using ToolTip's line system
    const tooltipText = this._buildTooltipText();
    const lines = tooltipText.split('\n');

    for (const line of lines) {
      this._toolTip.addInfo(line, 11); // GEN_WHITE
    }

    // Position and show
    this._toolTip.setToolTipString(lx + 20, ly + 20, '');
    this._root.addChild(this._toolTip.container);
  }

  private _hideTooltip(): void {
    if (this._toolTip) {
      this._toolTip.clearToolTip();
    }
  }

  private _showExpTooltip(lx: number, ly: number, text: string): void {
    if (!this._toolTip) return;

    // OG: CUIToolTip::SetToolTip_String — shows a single-line tooltip near cursor
    this._toolTip.clearToolTip();
    this._toolTip.setToolTipString(lx + 20, ly + 20, text);
    this._root.addChild(this._toolTip.container);
  }

  private _buildTooltipText(): string {
    // OG: CToolTipHelper loads StringPool 1993 — a multi-line stat description
    // Tooltip type 8 for beginner (job%1000==0 or job==2001, level<=10)
    // Tooltip type 0 for normal characters
    const isBeginner = this._bBeginner;
    if (isBeginner) {
      // Type 8: beginner-specific tooltip
      return [
        `Lv.${this.level} ${this.job}`,
        `HP: ${this.hp}/${this.maxHp}  MP: ${this.mp}/${this.maxMp}`,
        `AP: ${this.ap}`,
        `Use AP to raise your stats!`,
      ].join('\n');
    }
    // Type 0: normal character tooltip
    return [
      `Lv.${this.level} ${this.job}`,
      `HP: ${this.hp}/${this.maxHp}  MP: ${this.mp}/${this.maxMp}`,
      `STR: ${this.str}  DEX: ${this.dex}  INT: ${this.intStat}  LUK: ${this.luk}`,
      `AP: ${this.ap}  EXP: ${this.exp}/${this.nextLevelExp}`,
    ].join('\n');
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;

    // OG OnMouseButton: msg == 513 (WM_LBUTTONDOWN) → CUIToolTip::ClearToolTip
    if (down) {
      this._hideTooltip();
      this._tooltipShown = false;
    }

    // Check WZ buttons first
    for (const b of [this._btHpUp, this._btMpUp, this._btStrUp, this._btDexUp, this._btIntUp, this._btLukUp, this._btAuto, this._btAuto1, this._btAuto2, this._btDetailOpen]) {
      if (b?.handleMouseButton(x - this._root.x, y - this._root.y, down)) return true;
    }

    const lx = x - this._root.x;
    const ly = y - this._root.y;
    if (!down) return true;

    // Close button fallback
    if (lx >= PANEL_W - 18 && ly < 22) { this.isVisible = false; return true; }

    return lx >= 0 && lx < PANEL_W && ly >= 0 && ly < PANEL_H;
  }

  onKeyPress(key: string): boolean {
    if (key === 'Escape' && this.isVisible) { this.isVisible = false; return true; }
    return false;
  }

  // OG: AutoApUp — computes ideal stat allocation based on job, shows confirmation dialog
  // StringPool 0x7C7 = header, 0x7C8 = per-stat format
  // Calls GetIdealStatUp (0x73DDB0) for job-based allocation
  autoApUp(mode: number): void {
    if (this.ap <= 0) return;

    const jobNum = this._parseJobNumber();
    const level = this.level;

    // OG: GetIdealStatUp returns StatPair[] with { dwStatFlag, nValue }
    // Then AutoApUp caps each entry to available AP and shows confirmation
    const statPairs = getIdealStatUp(jobNum, level, this.str, this.dex, this.intStat, this.luk, mode === 1);

    // Cap each allocation to available AP (OG: loops through pairs, caps each to remaining AP)
    let remaining = this.ap;
    const alloc = { str: 0, dex: 0, intStat: 0, luk: 0 };

    for (const pair of statPairs) {
      let amount = Math.min(pair.nValue, remaining);
      if (amount < 0) amount = 0;
      remaining -= amount;

      switch (pair.dwStatFlag) {
        case 0x40: alloc.str += amount; break;   // STR
        case 0x80: alloc.dex += amount; break;   // DEX
        case 0x100: alloc.intStat += amount; break; // INT
        case 0x200: alloc.luk += amount; break;  // LUK
      }
    }

    // Distribute any remaining AP to the last stat (OG: adds remainder to last entry)
    if (remaining > 0) {
      if (alloc.luk > 0) alloc.luk += remaining;
      else if (alloc.intStat > 0) alloc.intStat += remaining;
      else if (alloc.dex > 0) alloc.dex += remaining;
      else alloc.str += remaining;
    }

    // OG: Show confirmation dialog (CUtilDlg::YesNo)
    this._showAutoApConfirm(alloc);
  }

  private _showAutoApConfirm(alloc: { str: number; dex: number; intStat: number; luk: number }): void {
    if (!this._confirmContainer) {
      this._confirmContainer = new Container();
    }
    this._confirmContainer.removeChildren();

    // Background
    const bg = new Graphics();
    bg.roundRect(0, 0, 220, 120, 4).fill({ color: '#0C0C16', alpha: 240 / 255 });
    bg.roundRect(0, 0, 220, 120, 4).stroke({ color: '#46465A', width: 1 });
    this._confirmContainer.addChild(bg);

    // Header text (StringPool 0x7C7)
    const header = new Text({
      text: 'Auto-allocate AP?',
      style: new TextStyle({ fill: '#FFFFFF', fontSize: 11, fontFamily: 'monospace' }),
    });
    header.x = 10; header.y = 10;
    this._confirmContainer.addChild(header);

    // Per-stat allocation (StringPool 0x7C8 format)
    const lines = [
      `STR: +${alloc.str}`,
      `DEX: +${alloc.dex}`,
      `INT: +${alloc.intStat}`,
      `LUK: +${alloc.luk}`,
    ];
    const detail = new Text({
      text: lines.join('  '),
      style: new TextStyle({ fill: '#C8C8C8', fontSize: 9, fontFamily: 'monospace' }),
    });
    detail.x = 10; detail.y = 35;
    this._confirmContainer.addChild(detail);

    // Yes button
    const yesBtn = new Text({
      text: '[Yes]',
      style: new TextStyle({ fill: '#00FF00', fontSize: 11, fontFamily: 'monospace' }),
    });
    yesBtn.x = 50; yesBtn.y = 80;
    yesBtn.eventMode = 'static';
    yesBtn.cursor = 'pointer';
    yesBtn.on('pointerdown', () => {
      this._hideConfirm();
      this.onAutoApConfirm?.(alloc);
    });
    this._confirmContainer.addChild(yesBtn);

    // No button
    const noBtn = new Text({
      text: '[No]',
      style: new TextStyle({ fill: '#FF0000', fontSize: 11, fontFamily: 'monospace' }),
    });
    noBtn.x = 120; noBtn.y = 80;
    noBtn.eventMode = 'static';
    noBtn.cursor = 'pointer';
    noBtn.on('pointerdown', () => {
      this._hideConfirm();
    });
    this._confirmContainer.addChild(noBtn);

    this._confirmContainer.x = 10;
    this._confirmContainer.y = 300;
    this._root.addChild(this._confirmContainer);
  }

  private _hideConfirm(): void {
    if (this._confirmContainer) {
      this._confirmContainer.visible = false;
      this._root.removeChild(this._confirmContainer);
    }
  }

  // OG: DestroyTip — removes all tip layers
  destroyTip(): void {
    for (const tip of this._tipLayers) {
      if (tip.parent) tip.parent.removeChild(tip);
    }
    this._tipLayers = [];
  }

  // OG: CreateTip @ 0x866530 — 1:1 implementation with exact IDA values
  // Font: m_pFont (FONT_SMALL_GRAY)
  // First balloon: StringPool 0x14C6 + 0x14C7, nDir=2, nX=170, nY=187
  // Job-specific: switch on job ID, StringPool 0x14BA + job-specific + 3rd line
  createTip11(): void {
    this.destroyTip();

    const jobNum = this._parseJobNumber();
    const font = new TextStyle({ fill: '#C8C8C8', fontSize: 9, fontFamily: 'monospace', wordWrap: true, wordWrapWidth: 150 });

    // OG: First balloon tip — m_pLayerTip[0], ALWAYS created (all jobs)
    // StringPool 0x14C6 (5318) + 0x14C7 (5319), nDir=2, nX=170, nY=187
    this._createBalloonTip(0, 170, 187, 2, [
      this._getStringPoolText(0x14C6),
      this._getStringPoolText(0x14C7),
    ], font);

    // OG: Job-specific switch — m_pLayerTip[1] and optionally [2]
    // Each branch: StringPool 0x14BA (5290) + job-specific 2nd line + 3rd line
    switch (jobNum) {
      case 100: // Warrior
        // nDir=3, nX=160, nY=241, StringPool 0x14BA + 0x14BB + 0x1A45
        this._createBalloonTip(1, 160, 241, 3, [
          this._getStringPoolText(0x14BA),
          this._getStringPoolText(0x14BB),
          this._getStringPoolText(0x1A45),
        ], font);
        break;
      case 200: // Magician
        // nDir=2, nX=160, nY=266, StringPool 0x14BA + 0x14BC + 0x1A46
        this._createBalloonTip(1, 160, 266, 2, [
          this._getStringPoolText(0x14BA),
          this._getStringPoolText(0x14BC),
          this._getStringPoolText(0x1A46),
        ], font);
        break;
      case 300: // Archer
        // nDir=2, nX=160, nY=248, StringPool 0x14BA + 0x14BD + 0x1A47
        this._createBalloonTip(1, 160, 248, 2, [
          this._getStringPoolText(0x14BA),
          this._getStringPoolText(0x14BD),
          this._getStringPoolText(0x1A47),
        ], font);
        break;
      case 400: // Thief
        // nDir=2, nX=160, nY=248, StringPool 0x14BA + 0x14BE + 0x1A45
        this._createBalloonTip(1, 160, 248, 2, [
          this._getStringPoolText(0x14BA),
          this._getStringPoolText(0x14BE),
          this._getStringPoolText(0x1A45),
        ], font);
        break;
      case 500: // Pirate — TWO tips
        // First tip: nDir=1, nX=149, nY=230, StringPool 0x14BA + 0x14BF + 0x1A45
        this._createBalloonTip(1, 149, 230, 1, [
          this._getStringPoolText(0x14BA),
          this._getStringPoolText(0x14BF),
          this._getStringPoolText(0x1A45),
        ], font);
        // Second tip: nDir=2, nX=160, nY=248, StringPool 0x14C0 + 0x1A47
        this._createBalloonTip(2, 160, 248, 2, [
          this._getStringPoolText(0x14C0),
          this._getStringPoolText(0x1A47),
        ], font);
        break;
      case 1100: // Cygnus Knights
        // nDir=2, nX=160, nY=248, StringPool 0x14BA + 0x14C0 + 0x1A47
        this._createBalloonTip(1, 160, 248, 2, [
          this._getStringPoolText(0x14BA),
          this._getStringPoolText(0x14C0),
          this._getStringPoolText(0x1A47),
        ], font);
        break;
      case 1200: // Aran
        // nDir=2, nX=160, nY=248, StringPool 0x14BA + 0x14C0 + 0x1A47
        this._createBalloonTip(1, 160, 248, 2, [
          this._getStringPoolText(0x14BA),
          this._getStringPoolText(0x14C0),
          this._getStringPoolText(0x1A47),
        ], font);
        break;
      case 1300: // Evan
        // nDir=2, nX=160, nY=248, StringPool 0x14BA + 0x14C0 + 0x1A47
        this._createBalloonTip(1, 160, 248, 2, [
          this._getStringPoolText(0x14BA),
          this._getStringPoolText(0x14C0),
          this._getStringPoolText(0x1A47),
        ], font);
        break;
      case 1400: // Mercedes
        // nDir=2, nX=160, nY=248, StringPool 0x14BA + 0x14C0 + 0x1A47
        this._createBalloonTip(1, 160, 248, 2, [
          this._getStringPoolText(0x14BA),
          this._getStringPoolText(0x14C0),
          this._getStringPoolText(0x1A47),
        ], font);
        break;
      case 1500: // Phantom
        // nDir=2, nX=160, nY=248, StringPool 0x14BA + 0x14C0 + 0x1A47
        this._createBalloonTip(1, 160, 248, 2, [
          this._getStringPoolText(0x14BA),
          this._getStringPoolText(0x14C0),
          this._getStringPoolText(0x1A47),
        ], font);
        break;
    }
  }

  // OG: MakeBalloonTip — creates a balloon tip layer at (nX, nY) with direction nDir
  // nDir=1: tail down-left, nDir=2: tail up, nDir=3: tail up-right
  private _createBalloonTip(index: number, nX: number, nY: number, nDir: number, lines: string[], font: TextStyle): void {
    const tip = new Container();

    // Balloon background — rounded rect with border
    const bg = new Graphics();
    const w = 160;
    const h = 30 + lines.length * 14;
    bg.roundRect(0, 0, w, h, 6).fill({ color: '#0C0C16', alpha: 220 / 255 });
    bg.roundRect(0, 0, w, h, 6).stroke({ color: '#46465A', width: 1 });
    tip.addChild(bg);

    // Tail/pointer triangle based on direction
    const tail = new Graphics();
    if (nDir === 2) {
      // Tail points up — triangle at top center
      tail.moveTo(w / 2 - 6, 0);
      tail.lineTo(w / 2 + 6, 0);
      tail.lineTo(w / 2, -8);
      tail.closePath();
    } else if (nDir === 1) {
      // Tail points down-left
      tail.moveTo(0, h);
      tail.lineTo(12, h);
      tail.lineTo(0, h + 8);
      tail.closePath();
    } else if (nDir === 3) {
      // Tail points up-right
      tail.moveTo(w - 12, 0);
      tail.lineTo(w, 0);
      tail.lineTo(w, -8);
      tail.closePath();
    }
    tail.fill({ color: '#0C0C16', alpha: 220 / 255 });
    tail.stroke({ color: '#46465A', width: 1 });
    tip.addChild(tail);

    // Text lines
    for (let i = 0; i < lines.length; i++) {
      const text = new Text({ text: lines[i], style: font });
      text.x = 5;
      text.y = 5 + i * 14;
      tip.addChild(text);
    }

    // Position at (nX, nY) relative to stat window
    tip.x = nX;
    tip.y = nY;
    this._root.addChild(tip);
    this._tipLayers[index] = tip;
  }

  // OG: StringPool::GetString — resolves StringPool ID to text
  // Loads from String.wz at runtime via StringPoolService
  private _getStringPoolText(id: number): string {
    // Try loading from StringPoolService first
    if (this._stringPool) {
      const text = this._stringPool.getString(id);
      if (text) return text;
    }

    // Fallback text for common StringPool IDs (when String.wz not available)
    const fallbacks: Record<number, string> = {
      0x14BA: 'Tip: Use AP to raise',
      0x14BB: 'your STR for melee attacks.',
      0x14BC: 'your INT for magic attacks.',
      0x14BD: 'your DEX for ranged attacks.',
      0x14BE: 'your DEX/LUK for criticals.',
      0x14BF: 'your STR for melee attacks.',
      0x14C0: 'Tip: Pirates can use',
      0x14C1: 'your STR for melee attacks.',
      0x14C2: 'your STR for combo attacks.',
      0x14C3: 'your INT for dragon magic.',
      0x14C4: 'your DEX for elemental arrows.',
      0x14C5: 'your LUK for card attacks.',
      0x14C6: 'AP can be used to raise',
      0x14C7: 'your stats or HP/MP.',
      0x1A45: 'Click the + button to add.',
      0x1A46: 'Click the + button to add.',
      0x1A47: 'Click the + button to add.',
    };
    return fallbacks[id] ?? `StringPool(${id})`;
  }

  private _rebuildBg(): void {
    this._bg.clear();
    this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({ color: '#0C0C16', alpha: 235 / 255 });
    this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({ color: '#46465A', width: 1 });
  }
}
