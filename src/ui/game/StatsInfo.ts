import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzVector } from '../../wz/WzVector.js';
import { WzSprite } from '../../render/WzSprite.js';
import { Button } from '../Button.js';
import { Sprite } from 'pixi.js';
import { getIdealStatUp, StatPair } from './StatDetailInfo.js';
import { StringPoolService } from '../../localization/StringPoolService.js';
import { ToolTip } from './ToolTip.js';
import { ToolTipHelper } from './ToolTipHelper.js';
import { BalloonTipPieces, loadBalloonTipPieces, makeBalloonTip } from './BalloonTip.js';

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

const _labelStyle = new TextStyle({ fill: '#000', fontSize: 10, fontFamily: 'monospace' });
const _valueStyle = new TextStyle({ fill: '#000', fontSize: 10, fontFamily: 'monospace' });
const _apStyle = new TextStyle({ fill: '#8B6914', fontSize: 10, fontFamily: 'monospace' });
const _redStyle = new TextStyle({ fill: '#CC0000', fontSize: 10, fontFamily: 'monospace' });

// OG class: CUIStat (3008 bytes, inherits CUIWnd)
// All coordinates and behavior from IDA decompilation of v95 client.
export class StatsInfo extends GamePanel {
  level = 1; job = 'Beginner'; ap = 0; fame = 0;
  // OG CUIStat holds the numeric BasicStat.nJob; the display name comes from
  // get_job_name. Keep the raw id so job logic never depends on parsing text.
  jobId: number | null = null;
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
  // OG: AutoApUp → CUtilDlg::YesNo (the shared dialog hosted by the stage).
  // Fired after the allocation is computed; the stage shows the YESNO dialog
  // and on Yes calls onAutoApConfirm. StatsInfo itself draws NO dialog window.
  onAutoApConfirmRequest: ((alloc: { str: number; dex: number; intStat: number; luk: number }) => void) | null = null;

  // OG: CreateTip — job-specific stat recommendation balloon tips (4140 bytes)
  // All positions, StringPool IDs, and directions from IDA decompilation
  private _tipLayers: (Container | null)[] = [];

  private _wzBg: WzSprite | null = null;
  private _wzBg2: WzSprite | null = null;
  private _wzBg3: WzSprite | null = null;
  // OG: beginner overlay covers — copied to the window canvas before text in Draw
  // (cover0 160x308 at origin (-6,-22), cover1 150x121 at origin (-11,-181))
  private _wzCover0: WzSprite | null = null;
  private _wzCover1: WzSprite | null = null;
  private _coverSprites: Sprite[] = [];
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

  // OG: m_apCanvasDisabled — stat icons from UI/UIWindow2.img/Stat/main/Disabled/{statName}
  // Loaded in OnCreate via IWzResMan::GetObjectA with path "UI/UIWindow2.img/Stat/main/Disabled/" + statName
  private _disabledCanvases: (Sprite | null)[] = [];
  // OG: ms_aStatName — exactly 4 entries {STR, DEX, INT, LUK} (verified from the
  // static initializer @0xB0E900 and the 4-node WZ Disabled subtree)
  private static readonly STAT_NAMES = ['STR', 'DEX', 'INT', 'LUK'];
  // OG: CUIStatDetail — shown when m_nOption=1, positioned at (GetAbsLeft+172, GetAbsTop+90)
  private _detailVisible = false;
  // OG: m_bBeginner — set in Draw based on job/level, gates the entire stats section
  private _bBeginner = false;

  private _stringPool: StringPoolService | null = null;
  private _toolTip: ToolTip | null = null;
  private _stringWz: (() => WzPackage | null) | null = null;
  private _ttHelper: ToolTipHelper = new ToolTipHelper();

  // OG: CToolTipHelper::LoadToolTip(StringPool 1993) — ToolTipHelp.img/Game/UIWnd/Stat.
  // Each entry = { lt, rb (Vector2D hit rect), Title, Desc } from the String.nx subtree.
  // CheckAndShow @0x8A0980 iterates these and PtInRect's the cursor; the matching
  // entry's Title+Desc are shown via SetToolTip_String2 at (cursor, cursorY+20).
  private static readonly TTH_PATH = 'ToolTipHelp.img/Game/UIWnd/Stat';
  // OG: CUIStat::OnCreate calls CCtrlButton::LoadToolTip(btn, StringPool 1988/1989/1990,
  // 1, 0) for BtAuto/BtAuto1/BtAuto2 — the tooltips live in ToolTipHelp.img/Game/Button/
  // StatAuto, StatAuto1, StatAuto2 (Title + Desc children).
  private static readonly BTN_TOOLTIP_PATH = 'ToolTipHelp.img/Game/Button';

  constructor(loader: WzTextureLoader, ui: WzPackage | null, stringPool?: StringPoolService | null, stringWz?: (() => WzPackage | null) | null) {
    super();
    this._stringPool = stringPool ?? null;
    this._stringWz = stringWz ?? null;
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

    // OG: CUIStat ctor CUIWnd(this, 2, 5, 150, 6, 1, 0, 0) → closeType 5
    // (UI/Basic.img/BtClose3) at (150, 6).
    this.createCloseButton(loader, ui, 5, PANEL_W, { x: 150, y: 6 });

    // OG: CUIWnd::OnCreate loads 3 background layers from UIWindow2.img/Stat/main.
    // No custom fallback: without the WZ canvases the window renders nothing
    // (authentic rule — never hand-draw the panel).
    const stat = ui?.GetItem('UIWindow2.img/Stat/main') as WzProperty | null;
    if (stat) {
      this._wzBg = this._loadWzSprite(loader, stat, 'backgrnd');
      this._wzBg2 = this._loadWzSprite(loader, stat, 'backgrnd2');
      this._wzBg3 = this._loadWzSprite(loader, stat, 'backgrnd3');
      // OG: beginner covers (cover0/cover1) — copied to the window canvas before
      // text in Draw when (job%1000==0 || job==2001) && level<=10
      this._wzCover0 = this._loadWzSprite(loader, stat, 'cover0');
      this._wzCover1 = this._loadWzSprite(loader, stat, 'cover1');
    }

    // OG MakeBalloonTip: balloon 9-slice from Login.img/WorldNotice/Balloon
    this._loadBalloonPieces(loader, ui);

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
      // OG: beginner covers (cover0/cover1) — drawn under the text but over the
      // normal backgrnd layers when (job%1000==0 || job==2001) && level<=10
      if (this._wzCover0) {
        const c0 = this._wzCover0.ToPixi();
        c0.visible = false;
        this._root.addChild(c0);
        this._coverSprites.push(c0);
      }
      if (this._wzCover1) {
        const c1 = this._wzCover1.ToPixi();
        c1.visible = false;
        this._root.addChild(c1);
        this._coverSprites.push(c1);
      }
    }

    // Content layer — ensures all text/buttons render ON TOP of backgrounds
    this._contentLayer = new Container();
    this._contentLayer.sortableChildren = true;
    this._root.addChild(this._contentLayer);

    // OG: CToolTipHelper::LoadToolTip(this->m_ttHelper, StringPool 1993) —
    // the real stat-row hover tooltips from ToolTipHelp.img/Game/UIWnd/Stat.
    this._ttHelper.LoadToolTip(this._stringWz ? this._stringWz() : null, 'Stat');

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
    this._strLabel.visible = !this._wzBg; // label is baked into backgrnd2
    this._contentLayer.addChild(this._strLabel);

    this._strValue = new Text({ text: '0', style: _valueStyle });
    this._strValue.x = TEXT_X; this._strValue.y = Y_STR;
    this._contentLayer.addChild(this._strValue);

    this._dexLabel = new Text({ text: 'DEX', style: _labelStyle });
    this._dexLabel.x = TEXT_X; this._dexLabel.y = Y_DEX;
    this._dexLabel.visible = !this._wzBg; // label is baked into backgrnd2
    this._contentLayer.addChild(this._dexLabel);

    this._dexValue = new Text({ text: '0', style: _valueStyle });
    this._dexValue.x = TEXT_X; this._dexValue.y = Y_DEX;
    this._contentLayer.addChild(this._dexValue);

    this._intLabel = new Text({ text: 'INT', style: _labelStyle });
    this._intLabel.x = TEXT_X; this._intLabel.y = Y_INT;
    this._intLabel.visible = !this._wzBg; // label is baked into backgrnd2
    this._contentLayer.addChild(this._intLabel);

    this._intValue = new Text({ text: '0', style: _valueStyle });
    this._intValue.x = TEXT_X; this._intValue.y = Y_INT;
    this._contentLayer.addChild(this._intValue);

    this._lukLabel = new Text({ text: 'LUK', style: _labelStyle });
    this._lukLabel.x = TEXT_X; this._lukLabel.y = Y_LUK;
    this._lukLabel.visible = !this._wzBg; // label is baked into backgrnd2
    this._contentLayer.addChild(this._lukLabel);

    this._lukValue = new Text({ text: '0', style: _valueStyle });
    this._lukValue.x = TEXT_X; this._lukValue.y = Y_LUK;
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

      // OG: CCtrlButton::LoadToolTip for the three auto-AP buttons (StringPool
      // 1988/1989/1990 → ToolTipHelp.img/Game/Button/StatAuto, StatAuto1, StatAuto2)
      this._loadButtonToolTip(this._btAuto, 'StatAuto');
      this._loadButtonToolTip(this._btAuto1, 'StatAuto1');
      this._loadButtonToolTip(this._btAuto2, 'StatAuto2');
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

  // OG: CCtrlButton::LoadToolTip — reads Title/Desc children from the
  // ToolTipHelp.img/Game/Button/<name> subtree and attaches them to the button.
  // Loaded lazily; String.wz may not carry the subtree (then no tooltip).
  private _loadButtonToolTip(btn: Button | null, name: string): void {
    if (!btn || !this._stringWz) return;
    let wz: WzPackage | null = null;
    try { wz = this._stringWz(); } catch { return; }
    if (!wz) return;
    let node: unknown;
    try {
      node = wz.GetItem(`${StatsInfo.BTN_TOOLTIP_PATH}/${name}`);
    } catch { return; }
    if (!(node instanceof WzProperty)) return;
    const title = node.Get('Title');
    const desc = node.Get('Desc');
    if (typeof title === 'string') {
      btn.setToolTip(title, typeof desc === 'string' ? desc : '');
    }
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
    // Prefer the raw numeric job id (set from GameStage). Fall back to
    // extracting digits from the display string for callers that only set `job`.
    if (this.jobId !== null && this.jobId >= 0) return this.jobId;
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

    // OG Draw: EXP percentage display — StringPool 1994 Format(exp, pct) = 2 args.
    // The "next level" EXP is NOT shown here (it only appears in the 0x1A37 tooltip).
    // EXP% = nEXP / nNextLevelEXP * 100, clamped to 0 if nNextLevelEXP <= 0
    const expPct = this.nextLevelExp > 0 ? Math.floor((this.exp / this.nextLevelExp) * 100) : 0;
    this._expText.text = `${this.exp} (${expPct}%)`;

    // OG Draw: bBeginner check — (job == 1000*(job/1000) || job == 2001) && level <= 10
    // When bBeginner: draw beginner cover overlays, skip stats section entirely
    const jobNum = this._parseJobNumber();
    this._bBeginner = (jobNum % 1000 === 0 || jobNum === 2001) && this.level <= 10;

    if (this._bBeginner) {
      // OG: beginner branch copies cover0/cover1 canvas overlays (behind text,
      // over backgrnd); stats section (STR/DEX/INT/LUK) and AP count are NOT drawn
      for (const c of this._coverSprites) c.visible = true;
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
    for (const c of this._coverSprites) c.visible = false;
    this._apValue.visible = true;
    this._apValue.text = `${this.ap}`;
    const apTextWidth = this._apValue.width;
    this._apValue.x = 85 - apTextWidth;

    // OG Draw: Fame at y=158 — StringPool 6677 Format(POP), single %d like Level.
    // The "Fame:" label is baked into the WZ backgrnd image, not drawn as text.
    this._fameText.visible = true;
    this._fameText.text = `${this.fame}`;
    this._fameText.style = _valueStyle;

    // OG Draw: Stats section — only drawn when !bBeginner
    // StringPool 1979 format when basicStat != characterStat: "%d (+%d)(+%d)"
    // When basicStat == characterStat: just itoa(value)
    const formatStat = (base: number, total: number): string => {
      if (base === total) return `${total}`;
      const bonus = total - base;
      return `${base} (+${bonus})`;
    };

    this._strLabel.visible = !this._wzBg;
    this._strValue.visible = true;
    this._strValue.text = formatStat(this.baseStr, this.str);
    this._strValue.style = _valueStyle;

    this._dexLabel.visible = !this._wzBg;
    this._dexValue.visible = true;
    this._dexValue.text = formatStat(this.baseDex, this.dex);
    this._dexValue.style = _valueStyle;

    this._intLabel.visible = !this._wzBg;
    this._intValue.visible = true;
    this._intValue.text = formatStat(this.baseInt, this.intStat);
    this._intValue.style = _valueStyle;

    this._lukLabel.visible = !this._wzBg;
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

  // OG: OnMouseMove @0x8649D0 — EXP tooltip + CToolTipHelper::CheckAndShow.
  private _tooltipShown = false;

  handleMouseMove(x: number, y: number): void {
    if (!this.isVisible) return;
    const lx = x - this._root.x;
    const ly = y - this._root.y;

    // OG: CCtrlButton hover tooltip — when the cursor is over a button with a
    // loaded tooltip (BtAuto/BtAuto1/BtAuto2), the button control shows it via
    // SetToolTip_String2 at (cursor, cursorY+20). Check before the stat-row
    // CToolTipHelper rects since buttons sit inside the window.
    for (const b of [this._btAuto, this._btAuto1, this._btAuto2]) {
      if (!b || !b.container.visible || b.toolTipTitle == null) continue;
      if (b.hitTest(lx, ly)) {
        this._toolTip?.clearToolTip();
        this._toolTip?.setToolTipString2(lx + 20, ly + 20, b.toolTipTitle, b.toolTipDesc ?? '');
        if (this._toolTip && !this._toolTip.container.parent) this._root.addChild(this._toolTip.container);
        this._tooltipShown = true;
        return;
      }
    }

    // OG: EXP tooltip area hit-test: (rx - 55) > 0x6D || (ry - 138) > 0xD → goto LABEL_15.
    // Inside rect (55, 138, 110, 14): SetToolTip_String(StringPool 0x1A37, exp, next).
    const inExpArea = (lx - EXP_TOOLTIP_X) <= EXP_TOOLTIP_W && (ly - EXP_TOOLTIP_Y) <= EXP_TOOLTIP_H;

    if (inExpArea) {
      // OG: 0x1A37 Format(exp, nextLevelExp) — exactly 2 args (next EXP is only
      // here, not on the panel; the format string itself is unresolvable from
      // this String.wz, so the fallback mirrors the 2-arg shape).
      const tooltipStr = `EXP: ${this.exp} / ${this.nextLevelExp}`;
      this._showExpTooltip(lx, ly, tooltipStr);
      this._tooltipShown = true;
      return;
    }

    // OG LABEL_15: CToolTipHelper::CheckAndShow(this->m_ttHelper, tooltip, rx, ry, 0, offset)
    // offset = 8 when beginner (level<=10 && (job%1000==0 || job==2001)), else null.
    const maxCount = this._bBeginner ? 8 : null;
    const hit = this._ttHelper.checkAndShow(this._toolTip, lx, ly, maxCount);
    if (hit >= 0 && this._toolTip) {
      if (!this._toolTip.container.parent) this._root.addChild(this._toolTip.container);
      this._tooltipShown = true;
    } else if (this._tooltipShown) {
      this._tooltipShown = false;
      this._hideTooltip();
    }
  }

  private _hideTooltip(): void {
    if (this._toolTip) {
      this._toolTip.clearToolTip();
    }
  }

  private _showExpTooltip(lx: number, ly: number, text: string): void {
    if (!this._toolTip) return;

    // OG: CUIToolTip::SetToolTip_String at (IsMyAddon() + rx + 20, ry + 20)
    this._toolTip.clearToolTip();
    this._toolTip.setToolTipString(lx + 20, ly + 20, text);
    if (!this._toolTip.container.parent) this._root.addChild(this._toolTip.container);
  }

  // OG: CUIWnd::HitTest @0x8DD2C0 — ry > 0x18 (24) → region 1 (body), else region 2
  // (drag title). beginDrag uses the fixed window rect (backgrnd 172x337 at 0,0)
  // instead of getLocalBounds(), which is polluted by the tooltip container and
  // Text children (and can throw before fonts are measured).
  override beginDrag(lx: number, ly: number, down: boolean): boolean {
    if (!this.draggable) return false;
    if (!down && this._wndDragging) {
      this._wndDragging = false;
      return true;
    }
    if (!down) return false;
    if (lx < 0 || lx >= PANEL_W || ly < 0 || ly >= PANEL_H) return false;
    if (ly >= this._wndTitleH) return false; // title bar = top 24px
    this._wndDragging = true;
    this._wndDragOff = { x: lx, y: ly };
    return true;
  }

  override updateDrag(): void {
    if (!this._wndDragging) return;
    const mx = (window as any).__mouseX as number | undefined;
    const my = (window as any).__mouseY as number | undefined;
    if (mx !== undefined && my !== undefined) {
      this._root.x = mx - this._wndDragOff.x;
      this._root.y = my - this._wndDragOff.y;
    }
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

    // OG: CUIWnd::OnButtonClicked(1000) — the real BtClose3 button (id 1000,
    // type 5) handles the click instead of a raw top-right rect.
    if (this.handleCloseButton(lx, ly, down)) return true;

    const inside = lx >= 0 && lx < PANEL_W && ly >= 0 && ly < PANEL_H;
    return inside;
  }

  onKeyPress(key: string): boolean {
    if (key === 'Escape' && this.isVisible) { this.isVisible = false; return true; }
    return false;
  }

  // OG: AutoApUp — computes ideal stat allocation based on job, shows confirmation dialog
  // StringPool 0x7C7 = header, 0x7C8 = per-stat format
  // Calls GetIdealStatUp (0x73DDB0) for job-based allocation
  // The computed allocation awaiting the YesNo confirm (exposed for tests).
  pendingAutoApAlloc: { str: number; dex: number; intStat: number; luk: number } | null = null;
  autoApUp(mode: number): void {
    if (this.ap <= 0) return;

    const jobNum = this._parseJobNumber();
    const level = this.level;

    // OG: GetIdealStatUp returns StatPair[] with { dwStatFlag, nValue }
    // Then AutoApUp caps each entry to available AP and shows confirmation
    const statPairs = getIdealStatUp(jobNum, level, this.str, this.dex, this.intStat, this.luk, mode === 1);
    // OG: `if (GetIdealStatUp(bs, bWantToBeInfighter, &aStatUp))` — empty result = no-op
    if (statPairs.length === 0) return;

    // Cap each allocation to available AP (OG: loops through pairs, caps each to remaining AP)
    let remaining = this.ap;
    let lastFlag = 0;
    const alloc = { str: 0, dex: 0, intStat: 0, luk: 0 };

    for (const pair of statPairs) {
      lastFlag = pair.dwStatFlag;
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

    // OG: any leftover AP is added to the LAST pair in the array
    // (a[v10 - 1].nValue += v6), regardless of its current value.
    if (remaining > 0) {
      switch (lastFlag) {
        case 0x40: alloc.str += remaining; break;
        case 0x80: alloc.dex += remaining; break;
        case 0x100: alloc.intStat += remaining; break;
        case 0x200: alloc.luk += remaining; break;
      }
    }

    this.pendingAutoApAlloc = alloc;
    // OG: Show confirmation dialog (CUtilDlg::YesNo) — routed to the shared
    // stage dialog. On Yes the stage calls onAutoApConfirm(alloc).
    this.onAutoApConfirmRequest?.(alloc);
  }

  // OG: DestroyTip — removes all tip layers
  destroyTip(): void {
    for (const tip of this._tipLayers) {
      if (tip) {
        tip.removeFromParent();
        tip.destroy({ children: true });
      }
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
      case 1100: // Cygnus Knights — nDir=3, nX=160, nY=241, 0x14BA+0x14C1+0x1A45
        this._createBalloonTip(1, 160, 241, 3, [
          this._getStringPoolText(0x14BA),
          this._getStringPoolText(0x14C1),
          this._getStringPoolText(0x1A45),
        ], font);
        break;
      case 1200: // Aran — nDir=2, nX=160, nY=266, 0x14BA+0x14C2+0x1A46
        this._createBalloonTip(1, 160, 266, 2, [
          this._getStringPoolText(0x14BA),
          this._getStringPoolText(0x14C2),
          this._getStringPoolText(0x1A46),
        ], font);
        break;
      case 1300: // Evan — nDir=2, nX=160, nY=248, 0x14BA+0x14C3+0x1A47
        this._createBalloonTip(1, 160, 248, 2, [
          this._getStringPoolText(0x14BA),
          this._getStringPoolText(0x14C3),
          this._getStringPoolText(0x1A47),
        ], font);
        break;
      case 1400: // Mercedes — nDir=2, nX=160, nY=284, 0x14BA+0x14C4+0x1A45
        this._createBalloonTip(1, 160, 284, 2, [
          this._getStringPoolText(0x14BA),
          this._getStringPoolText(0x14C4),
          this._getStringPoolText(0x1A45),
        ], font);
        break;
      case 1500: // Phantom — nDir=3, nX=160, nY=241, 0x14BA+0x14C5+0x1A45
        this._createBalloonTip(1, 160, 241, 3, [
          this._getStringPoolText(0x14BA),
          this._getStringPoolText(0x14C5),
          this._getStringPoolText(0x1A45),
        ], font);
        break;
    }
  }

  // OG: CUIStat::CreateTip calls UIHelper::MakeBalloonTip — the shared port
  // lives in BalloonTip.ts (UIHelper::MakeBalloonTip @0x7C9780 +
  // make_balloon @0x95DE30, pieces from Login.img/WorldNotice/Balloon).
  private _balloonPieces: BalloonTipPieces | null = null;

  private _loadBalloonPieces(loader: WzTextureLoader, ui: WzPackage | null): void {
    this._balloonPieces = loadBalloonTipPieces(loader, ui);
  }

  private _createBalloonTip(index: number, nX: number, nY: number, nDir: number, lines: string[], _font: TextStyle): void {
    const pieces = this._balloonPieces;
    if (!pieces) return; // no WZ assets → draw nothing

    // Destroy the previous tip at this slot (createTip11 re-runs on every
    // open/level change — the old layer must not accumulate under _root).
    const prev = this._tipLayers[index];
    if (prev) {
      prev.removeFromParent();
      prev.destroy({ children: true });
      this._tipLayers[index] = null;
    }

    const measure = new Text({ text: lines.length ? lines[0] : '', style: _valueStyle });
    const tip = makeBalloonTip({
      pieces,
      lines,
      nDir,
      nX,
      nY,
      textStyle: new TextStyle({ fill: '#000000', fontSize: _font.fontSize as number ?? 9, fontFamily: _font.fontFamily }),
      measure: (line) => {
        measure.text = line;
        return measure.width;
      },
    });

    this._root.addChild(tip);
    this._tipLayers[index] = tip;
  }

  // OG: StringPool::GetString — resolves StringPool ID to text.
  // Fallback values below are DECRYPTED from the v95 client's embedded
  // ms_aString table (StringPool::Key XOR stream), not invented.
  private _getStringPoolText(id: number): string {
    if (this._stringPool) {
      const text = this._stringPool.getString(id);
      if (text) return text;
    }

    const fallbacks: Record<number, string> = {
      0x14BA: 'You can raise the desired stat by clicking the arrow next to it.',
      0x14BB: 'The most important stat for a Warrior is STR.',
      0x14BC: 'The most important stat for a Magician is INT.',
      0x14BD: 'The most important stat for a Bowman is DEX.',
      0x14BE: 'The most important stat for a Thief is LUK.',
      0x14BF: 'The most important stat for a knuckle using Pirate is STR.',
      0x14C0: 'The most important stat for a gun using Pirate is DEX.',
      0x14C1: 'The most important stat for a Dawn Warrior is STR.',
      0x14C2: 'The most important stat for a Blaze Wizard is INT.',
      0x14C3: 'The most important stat for a Wind Archer is DEX.',
      0x14C4: 'The most important stat for a Night Walker is LUK.',
      0x14C5: 'The most important stat for a Thunder Breaker is STR.',
      0x14C6: 'If you click the auto-assign button, the AP will be',
      0x14C7: 'distributed automatically as needed.',
      0x1A45: 'In addition, a bit of DEX is needed.',
      0x1A46: 'In addition, a bit of LUK is needed.',
      0x1A47: 'In addition, a bit of STR is needed.',
    };
    return fallbacks[id] ?? `StringPool(${id})`;
  }
}
