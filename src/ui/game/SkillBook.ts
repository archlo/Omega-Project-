import { Container, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import type { SkillInfoService } from '../../character/SkillInfoService.js';
import type { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { ScrollBar } from './ScrollBar.js';
import { ItemTooltip } from './ItemTooltip.js';
import { ItemInfoService } from '../../character/ItemInfoService.js';
import { StringPoolService } from '../../localization/StringPoolService.js';
import { TooltipAssets } from './TooltipAssets.js';
import { SkillIncPanel, SkillDecPanel, SkillChangeConfirm, SkillResetRow } from './SkillIncDec.js';
import type { BuiltInFont } from '../BuiltInFont.js';
import type { ItemIconLoader } from '../../character/ItemIconLoader.js';

export interface SkillDragPayload { skillId: number; }

// OG CUISkill constants (from IDA decompilation — Draw @ 0x84ed90)
const PANEL_W = 174;
const PANEL_H = 281;
const VISIBLE_ROWS = 4;
const ROW_H = 40;
const ROW_START_Y = 112; // nTop starts at 112 in Draw, row bg at nTop-19=93
const SP_TEXT_Y = 256; // SP count drawn at y=256
const BOOK_ICON_Y = 55; // Book icon at (15, 55)
const BOOK_NAME_Y = 65; // Book name centered at y=65 (or split at 55/69 if wide)

// Tab control: (8, 10), 154×20
const TAB_X = 8;
const TAB_Y = 10;
const TAB_W = 154;
const TAB_H = 20;
// OG: each tab slot is 30px + 1px spacing (30*5 + 4 = 154). Aran guide buttons
// and the tab strip share this slot layout.
const TAB_SLOT_W = 30;

// Scrollbar: (1, 8), 93×155
const SB_X = 1;
const SB_Y = 8;
const SB_W = 93;
const SB_H = 155;

// OG: SP Up buttons: x=135, Y=113,153,193,233 — loaded from Skill/main/BtSpUp
const SP_BTN_X = 135;
const SP_BTN_Y_START = 113;
const SP_BTN_STEP = 40;

// OG: BtMacro button id=0x7E7 (2023) — loaded from Skill/main/BtMacro
const BT_MACRO_ID = 0x7E7;

// Hit testing (from GetSkillIndexFromPoint)
const ICON_LEFT = 13;
const ICON_RIGHT = 45;
const ROW_LEFT = 10;
const ROW_RIGHT = 149;

// OG: get_basic_font — fonts loaded from WZ via CWnd::GetBasicFont
// FONT_BASIC_WHITE = m_pFont (skill name, level), FONT_BASIC_BLACK = m_pFontNo (SP count)
// FONT_SMALL_GRAY = m_pFontBonus (bonus text), FONT_BOOK_NAME = m_pFontBookName (book name)

// OG: CWzResMan loads button states from "UI/UIWindow2.img/Skill/main/BtX/{state}/0".
// The canvas is nested under a `0` property (normal/0, mouseOver/0, pressed/0,
// disabled/0). Returns null when the state canvas is absent.
function loadButtonStateSprite(loader: WzTextureLoader, root: WzProperty | null, state: string): Sprite | null {
  if (!root || !loader) return null;
  const stateProp = root.Get(state);
  const canvas = stateProp instanceof WzProperty ? stateProp.Get('0') : stateProp;
  if (canvas instanceof WzCanvas) return loader.Load(canvas)?.ToPixi() ?? null;
  return null;
}

// OG: CWvsContext::GetSkillLevelUpState — the three-state machine that drives
// the skill slot canvas (skill0/skill1), the icon (apCanvas[state+hover]), and
// the SP-Up button enable. Decompiled @ 0x9D5A40:
//   0  = a required skill has not reached its required level
//  -1  = skill needs a master level but masterLev <= curSkillLev, OR already maxed
//   1  = can level up (reqs met, below max, master level has headroom)
function skillLevelUpState(skill: SkillRow, service: SkillInfoService | null, findSkill: (id: number) => SkillRow | null): number {
  const info = service?.Get(skill.id);
  for (const [reqId, reqLevel] of info?.RequiredSkills ?? []) {
    if ((findSkill(reqId)?.level ?? 0) < reqLevel) return 0;
  }
  if (isSkillNeedMasterLevel(skill.id)) {
    const curMaster = skill.masterLevel > 0 ? skill.masterLevel : skill.maxLevel;
    if (curMaster <= skill.level) return -1;
  }
  const max = skill.masterLevel > 0 ? skill.masterLevel : skill.maxLevel;
  return 2 * (skill.level < max ? 1 : 0) - 1;
}

// OG: is_ignore_master_level_for_common @ 0x47CC20 — master-book skills that
// are exempt from the master-level gate. Constants decoded from disassembly.
export function isIgnoreMasterLevelForCommon(skillId: number): boolean {
  if (skillId <= 3220010) {
    if (skillId >= 3220009) return true;
    if (skillId === 2120009 || skillId === 1120012 || skillId === 1220013 || skillId === 1320011) return true;
    if (skillId === 2320010 || skillId === 2220009) return true;
    return skillId >= 3120010 && skillId <= 3120011;
  }
  if (skillId === 5220012 || skillId === 4120010 || skillId === 4220009 || skillId === 5120011) return true;
  return skillId === 32120009 || skillId === 33120010;
}

// OG: is_skill_need_master_level @ 0x47CCB0 — which skills consume a master book.
export function isSkillNeedMasterLevel(skillId: number): boolean {
  if (isIgnoreMasterLevelForCommon(skillId)) return false;
  const job = Math.floor(skillId / 10000);
  if (Math.floor(job / 100) === 22 || job === 2001) {
    const jl = getJobLevel(job);
    return jl === 9 || jl === 10 || skillId === 22111001 || skillId === 22141002 || skillId === 22140000;
  }
  if (Math.floor(job / 10) === 43) {
    return getJobLevel(job) === 4
      || skillId === 4311003 || skillId === 4314920 || skillId === 4326906 || skillId === 4326909;
  }
  if (job === 100 * Math.floor(job / 100)) return false;
  return job % 10 === 2;
}

// OG: is_nonslot_skill @ 0x849B90 — skills that cannot be dragged to a slot.
export function isNonslotSkill(skillId: number): boolean {
  if (skillId > 20001067) {
    if (skillId > 30001067) return skillId === 33001002;
    return skillId >= 30001066 || (skillId >= 20011066 && skillId <= 20011067);
  }
  if (skillId >= 20001066) return true;
  if (skillId <= 4321000) return skillId === 4321000 || (skillId >= 1066 && skillId <= 1067);
  return skillId >= 10011066 && skillId <= 10011067;
}
const _titleStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });
const _labelStyle = new TextStyle({ fill: '#CCC', fontSize: 10, fontFamily: 'monospace' });
const _valueStyle = new TextStyle({ fill: '#FFF', fontSize: 9, fontFamily: 'monospace' });
const _cdStyle = new TextStyle({ fill: '#E06060', fontSize: 8, fontFamily: 'monospace' });
const _bonusStyle = new TextStyle({ fill: '#64DC64', fontSize: 9, fontFamily: 'monospace' }); // OG: m_pFontBonus — green bonus text
// OG: m_pFontNo — SP count font (FONT_BASIC_BLACK, right-aligned at x=104)
const _spCountStyle = new TextStyle({ fill: '#A0A0A0', fontSize: 10, fontFamily: 'monospace' });
// OG: m_pFontBookName — book name font (centered or two-line)
const _bookNameStyle = new TextStyle({ fill: '#DCC896', fontSize: 11, fontFamily: 'monospace' });

// OG: Tab labels from StringPool — loaded per job category
// Tab 0=Beginner, 1=Warrior, 2=Magician, 3=Bowman, 4=Thief, 5=Pirate, 6=Aran, 7=DualBlade
const TAB_LABELS = ['Beginner', '1st Job', '2nd Job', '3rd Job', '4th Job'];
const TAB_PREFIXES = [0, 100, 200, 300, 400];

// OG: get_skill_root_from_job — builds skill root list from job
// Returns array of skill root IDs for the character's job
function getSkillRootFromJob(job: number): number[] {
  const roots: number[] = [];
  if (!getJobName(job)) return roots;
  const v2 = Math.floor(job % 1000 / 100);
  if (v2) {
    const v3 = 100 * (v2 + 10 * Math.floor(job / 1000));
    roots.push(v3);
    const v4 = Math.floor(job % 100 / 10);
    if (v4) {
      let v5 = v3 + 10 * v4;
      roots.push(v5);
      for (let i = 1; i <= 8; i++) {
        if (job % 10 < i) break;
        roots.push(++v5);
      }
    }
  }
  return roots;
}

// OG: get_job_name — returns job name string (non-null = valid job)
function getJobName(job: number): string | null {
  // Simplified: return non-null for valid jobs
  if (job <= 0) return null;
  return `job${job}`;
}

// OG: Map skill root ID to tab index
function skillRootToTabIndex(root: number): number {
  // Skill roots are 100/200/... in v95; root 0 is the beginner tab.
  if (root <= 0) return 0;
  const tabRoot = Math.floor(root / 100);
  for (let i = TAB_PREFIXES.length - 1; i >= 1; i--) {
    if (tabRoot >= TAB_PREFIXES[i]) return i;
  }
  return 0;
}

function explorerSkillDegree(root: number): number {
  if (root <= 0) return 0;
  const suffix = root % 100;
  if (suffix === 0) return 1;
  if (suffix === 10) return 2;
  if (suffix === 11) return 3;
  if (suffix === 12) return 4;
  return 1;
}

// ─── OG Helper functions (from IDA) ──────────────────────────────────────
// OG: is_beginner_job — job % 1000 === 0
function isBeginnerJob(job: number): boolean { return job % 1000 === 0; }

// OG: is_extendsp_job — Aran (3000+), Cygnus Knights (2200+), Evan (2001)
function isExtendspJob(job: number): boolean {
  return Math.floor(job / 1000) === 3 || Math.floor(job / 100) === 22 || job === 2001;
}

// OG: is_dual_job — DualBlade (430-439)
function isDualJob(job: number): boolean {
  return Math.floor(job / 10) === 43;
}

// OG: get_job_level — maps job to degree (1-4)
function getJobLevel(job: number): number {
  if (isBeginnerJob(job) || job === 2001) return 1;
  const v1 = Math.floor(job / 10) === 43 ? (job - 430) / 2 : job % 10;
  const v2 = v1 + 2;
  if (v2 >= 2 && (v2 <= 4 || (v2 <= 10 && (Math.floor(job / 100) === 22 || job === 2001)))) return v2;
  return 0;
}

// OG: get_job_change_level — level threshold for job advancement
function getJobChangeLevel(job: number, subJob: number, step: number): number {
  const v3 = Math.floor(job / 1000);
  if (v3 === 3 || Math.floor(job / 100) === 22 || job === 2001) return 200;
  const isMagician = Math.floor(job / 100) % 10 === 2;
  switch (step) {
    case 1: return isMagician ? 8 : 10;
    case 2: return 30;
    case 3: return 70;
    case 4: return 120;
    default: return 200;
  }
}

// OG: get_novice_skill_point — remaining SP for beginner tab
function getNoviceSkillPoint(job: number, totalSp: number, spentSp: number): number {
  if (!isBeginnerJob(job)) return 0;
  return Math.max(0, totalSp - spentSp);
}

// OG: is_dual_job_born — born as dual job
function isDualJobBorn(job: number, subJob: number): boolean {
  return subJob !== 0 && isDualJob(job);
}

// OG: get_job_category — 0=warrior, 1=magician, 2=bowman, 3=thief, 4=pirate
function getJobCategory(job: number): number {
  const base = Math.floor(job / 100) % 10;
  if (base === 1) return 0; // warrior
  if (base === 2) return 1; // magician
  if (base === 3) return 2; // bowman
  if (base === 4) return 3; // thief
  if (base === 5) return 4; // pirate
  return 0;
}

export class SkillRow {
  constructor(
    public id: number,
    public name: string,
    public level: number,
    public maxLevel: number,
    public passive: boolean,
    public masterLevel: number = maxLevel,
  ) {}
}

export interface CooldownEntry {
  skillId: number;
  remaining: number;
  total: number;
  // OG: Cooldown animation frame (cycles through CoolTime/0-15)
  coolFrame: number;
  coolFrameTimer: number;
}

// OG class: CUISkill (3040 bytes, inherits CUIWnd)
// All coordinates and behavior from IDA decompilation of v95 client.
// Draw function (0x84ed90, 34K chars) rendering layout:
//   Slot bg: m_pCanvasSkill[state] at (10, nTop-19)
//   Skill icon: p->apCanvas[state+hover] at (12, nTop-17)
//   Recommend: m_pCanvasRecommendSkill at (47, nTop-19) if skill == recommendID
//   Skill name: m_pFont at (50, nTop-18)
//   Skill level: m_pFont at (50, nTop)
//   Bonus text: m_pFontBonus at (65, nTop) if bonus > 0
//   Line separator: m_pCanvasLine at (10, nTop+18) for rows 0-2
//   Book icon: pBookIcon at (15, 55)
//   Book name: m_pFontBookName at (50,55)/(50,69) if wide, else centered at (104-w/2, 65)
//   SP count: m_pFontNo at (104-textWidth, 256)
//   Loop: nTop=112, step=40, while nTop+40 < 272
export class SkillBook extends GamePanel {
  skillService: SkillInfoService | null = null;
  textureLoader: WzTextureLoader | null = null;
  sp = 0;
  onSkillUp: ((skillId: number) => void) | null = null;
  onSkillUse: ((skillId: number, slv: number) => void) | null = null;
  // OG: CUISkill::OnButtonClicked id 0x7E7 → ShiftMacroUIState
  onMacroOpen: (() => void) | null = null;
  nameOf: (id: number) => string = () => '';
  // OG: mSkillRecordEx — equipment-provided skill level bonus per skill id.
  // Returns the bonus (SkillLevel - PureSkillLevel) used for the green "(+N)".
  skillBonusOf: ((skillId: number) => number | undefined) | null = null;
  onDragStart: ((payload: SkillDragPayload, texture: Texture, x: number, y: number) => void) | null = null;
  // OG: SendSkillUpRequest callback
  onSendSkillUp: ((skillId: number) => void) | null = null;
  // OG: play_ui_sound(StringPool 0x75E) on drag start
  onDragSound: (() => void) | null = null;

  private _skills: SkillRow[] = [];
  private _tabs: SkillRow[][] = [];
  private _activeTab = 0;
  private _scrollOffset = 0;
  private _lastClickSkillId = -1;
  private _lastClickTime = 0;
  private _cooldowns = new Map<number, CooldownEntry>();

  // OG: Character state for SP validation
  characterLevel = 0;
  characterJob = 0;
  characterSubJob = 0;
  characterHp = 0; // OG: HP check in OnSkillLevelUpButton
  linkedCharacter = '';
  wildHunterMobNames: string[] = [];
  swallowBuffType = 0;
  damageMeter: { avgDmg: number; maxDmg: number } | null = null;
  isAdmin = false; // OG: admin/tester/manager bypass
  private _lastSkillUpTime = 0; // OG: 500ms cooldown between skill up requests
  // OG: ExtendSP — dual-blade extended SP tracking
  private _extendSP: number[] = [0, 0, 0, 0]; // ExtendSP::Get(tab)
  // OG: Per-tab SP — beginner SP, job SP, extend SP tracked separately
  private _noviceSp = 0; // SP for beginner tab (job % 1000 === 0)
  // OG: m_nTabOption — initial tab selection (0=default, 1=skill guide)
  private _tabOption = 0;
  // OG: m_bDualRogueSkillWarning — shows warning for dual-blade job change
  private _dualRogueSkillWarning = false;
  private _resetIncreaseRows: SkillResetRow[] = [];
  private _resetDecreaseRows: SkillResetRow[] = [];
  private _resetSelectedDecrease: SkillResetRow | null = null;
  private _resetSelectedIncrease: SkillResetRow | null = null;
  private _resetOrigin = { x: 0, y: 0 };

  /**
   * Applies the compact ExtendSP::Decode payload used by Aran/Evan/Cygnus.
   * The wire format is count followed by (job-degree, sp) byte pairs.  The
   * original CUISkillEx indexes this array by the selected tab, so keeping
   * the degree in its native slot is important; deriving SP from row count
   * makes later job tabs appear to have (or lose) points incorrectly.
   */
  setExtendedSp(encoded: Uint8Array | undefined): void {
    if (!encoded || encoded.length === 0) return;
    const next = [0, 0, 0, 0];
    const count = Math.min(encoded[0] ?? 0, Math.floor((encoded.length - 1) / 2));
    for (let i = 0; i < count; i++) {
      const degree = encoded[1 + i * 2] ?? 0;
      const value = encoded[2 + i * 2] ?? 0;
      if (degree >= 0 && degree < next.length) next[degree] = value;
    }
    this._extendSP = next;
    this._noviceSp = next[0] ?? 0;
    this._scrollOffset = 0;
    this.update(0);
  }

  setSpecialTooltipContext(linkedCharacter: string | undefined, wildHunterMobNames: string[]): void {
    this.linkedCharacter = linkedCharacter ?? '';
    this.wildHunterMobNames = [...wildHunterMobNames];
  }

  setSwallowBuffType(value: number): void {
    this.swallowBuffType = value;
  }

  setDamageMeterSummary(summary: { avgDmg: number; maxDmg: number } | null): void {
    this.damageMeter = summary;
  }

  private _titleText: Text;
  private _titleSecond: Text;
  private _spText: Text;
  private _tabSprites: Sprite[] = []; // OG: WZ canvas sprites for tab backgrounds
  private _tabLabels: Text[] = [];
  private _tabLabelStrings: string[] = [...TAB_LABELS];
  private _tabKinds: ('regular' | 'dual' | 'aran')[] = [];
  private _isAranJob = false;
  private _rowIcons: Sprite[] = [];
  private _rowNames: Text[] = [];
  private _rowLevels: Text[] = [];
  private _rowCds: Text[] = [];
  private _rowBonuses: Text[] = []; // OG: m_pFontBonus per row
  private _rowSpBtns: Container[] = [];
  private _scrollBar: ScrollBar;
  private _macroBtn: Container;
  // OG: Skill guide — OpenSkillGuide creates CWndSkillGuide (button IDs 3001-3004)
  onSkillGuide: ((grade: number) => void) | null = null;
  onSkillResetConfirm: ((increaseSkillId: number, decreaseSkillId: number) => void) | null = null;
  // OG Draw WZ canvases (from OnCreate @ 0x851520)
  // OG draws m_pCanvasSkill[0]/[1] at EACH row position — need per-row sprites
  private _skillSlotNormalTex: Texture | null = null; // m_pCanvasSkill[0] — skill0
  private _skillSlotEnabledTex: Texture | null = null; // m_pCanvasSkill[1] — skill1
  private _rowSlotBgs: Sprite[] = []; // one bg sprite per visible row (4 total)
  private _recommendBgTex: Texture | null = null; // m_pCanvasRecommendSkill — recommend/0
  private _rowRecommendBgs: Sprite[] = []; // one recommend bg per row
  private _lineBgTex: Texture | null = null; // m_pCanvasLine — line separator
  private _background2: Sprite | null = null;
  private _background3: Sprite | null = null;
  private _rowLineBgs: Sprite[] = []; // one line per row (rows 0-2 only)
  private _bookIcon: Sprite | null = null; // pBookIcon — book icon at (15, 55)
  private _hoverIndex = -1;
  private _recommendSkillId = 0; // from GetRecommendSKill
  private _tooltip: ItemTooltip | null = null;
  private _viewW = 1024;
  private _viewH = 768;
  private _mouseX = 0;
  private _mouseY = 0;
  // OG: Tab backgrounds — Tab/disabled/0-4 and Tab/enabled/0-4
  private _tabDisabledTex: Texture[] = [];
  private _tabEnabledTex: Texture[] = [];
  // OG: Cooldown overlay — CoolTime/0-15 (32x32 each)
  private _coolTimeTex: Texture[] = [];
  // OG: CoolTime sprite (drawn at skill icon position)
  private _coolTimeSprite: Sprite | null = null;
  private _rowCoolTimeSprites: Sprite[] = [];
  // OG: Aran special tab buttons — Tab/AranButton/Bt1-Bt4
  private _aranBtnTex: Texture[] = [];
  private _aranBtnDisabledTex: Texture[] = [];
  // OG: Skill-guide launcher buttons (3001-3004) — CLayoutMan::AddButton loads
  // Tab/AranButton/Bt1-4 and positions each on tab-strip slot N (30px slots +
  // 1px spacing). Real buttons (not tabs); clicking one opens CWndSkillGuide(grade).
  private _guideBtns: Array<{ container: Container }> = [];
  // OG: DualBlade tab textures — Tab/DualTab/disabled and Tab/DualTab/enabled
  private _dualTabDisabledTex: Texture[] = [];
  private _dualTabEnabledTex: Texture[] = [];
  // OG: CUISkillInc/Dec/DecEX sub-panels (skill increment/decrement windows)
  public skillIncPanel: SkillIncPanel;
  public skillDecPanel: SkillDecPanel;
  public skillChangeConfirm: SkillChangeConfirm;
  // OG: CUIWnd position persistence (CreateUIWndPosSaved key 10)
  private static readonly _posKey = 'SkillBookWndPos';

  constructor(loader?: WzTextureLoader, ui?: WzPackage | null,
    font?: BuiltInFont, icons?: ItemIconLoader,
    descOf?: (itemId: number) => string | null,
    setItemOf?: (itemId: number) => { name: string; effects: Array<{ threshold: number; effect: Record<string, number> }> } | null,
     optionOf?: (optionId: number, level: number) => Record<string, number> | null,
     itemInfo?: ItemInfoService | null, strings?: StringPoolService | null) {
    super();
    this._root.visible = false;

    // OG: Restore saved position from localStorage
    try {
      const saved = localStorage.getItem(SkillBook._posKey);
      if (saved) {
        const { x, y } = JSON.parse(saved);
        if (typeof x === 'number' && typeof y === 'number') {
          this._root.x = x;
          this._root.y = y;
        }
      }
    } catch { /* ignore */ }
    // Default position only if no saved position
    if (this._root.x === 0 && this._root.y === 0) {
      this._root.x = 190;
      this._root.y = 40;
    }

    // OG: CUIWnd::OnCreate loads backgrnd from UIWindow2.img/Skill/main
    if (loader && ui) {
      const skillProp = ui.GetItem('UIWindow2.img/Skill/main');
      const prop = skillProp instanceof WzProperty ? skillProp : null;

      const bgNode = prop?.Get('backgrnd');
      if (bgNode instanceof WzCanvas) {
        const sprite = loader.Load(bgNode)?.ToPixi();
        if (sprite) this._root.addChild(sprite);
      }
      const bg2Node = prop?.Get('backgrnd2');
      if (bg2Node instanceof WzCanvas) {
        this._background2 = loader.Load(bg2Node)?.ToPixi() ?? null;
        if (this._background2) this._root.addChild(this._background2);
      }
      const bg3Node = prop?.Get('backgrnd3');
      if (bg3Node instanceof WzCanvas) {
        this._background3 = loader.Load(bg3Node)?.ToPixi() ?? null;
        if (this._background3) this._root.addChild(this._background3);
      }

      // OG: skill0 canvas — normal skill slot background (m_pCanvasSkill[0])
      const skill0 = prop?.Get('skill0');
      if (skill0 instanceof WzCanvas) {
        const ws = loader.Load(skill0);
        if (ws) { this._skillSlotNormalTex = ws.Texture; }
      }

      // OG: skill1 canvas — enabled skill slot background (m_pCanvasSkill[1])
      const skill1 = prop?.Get('skill1');
      if (skill1 instanceof WzCanvas) {
        const ws = loader.Load(skill1);
        if (ws) { this._skillSlotEnabledTex = ws.Texture; }
      }

      // OG: recommend/0 canvas (m_pCanvasRecommendSkill)
      const rec = prop?.Get('recommend');
      if (rec instanceof WzProperty) {
        const rec0 = rec.Get('0');
        if (rec0 instanceof WzCanvas) {
          const ws = loader.Load(rec0);
          if (ws) { this._recommendBgTex = ws.Texture; }
        }
      }

      // OG: line canvas — separator (m_pCanvasLine)
      const line = prop?.Get('line');
      if (line instanceof WzCanvas) {
        const ws = loader.Load(line);
        if (ws) { this._lineBgTex = ws.Texture; }
      }

      // OG: Book icon at (15, 55) — pBookIcon from SKILLROOT
      // Loaded from the skill root's book icon property
      const bookIcon = prop?.Get('bookIcon');
      if (bookIcon instanceof WzCanvas) {
        const s = loader.Load(bookIcon)?.ToPixi();
        if (s) { this._bookIcon = s; this._root.addChild(s); }
      }

      // OG: Tab backgrounds — Tab/disabled/0-4 and Tab/enabled/0-4
      const tabProp = prop?.Get('Tab');
      if (tabProp instanceof WzProperty) {
        const disabledProp = tabProp.Get('disabled');
        const enabledProp = tabProp.Get('enabled');
        if (disabledProp instanceof WzProperty && enabledProp instanceof WzProperty) {
          for (let i = 0; i < 5; i++) {
            const dNode = disabledProp.Get(String(i));
            const eNode = enabledProp.Get(String(i));
            if (dNode instanceof WzCanvas) {
              const ws = loader.Load(dNode);
              if (ws) this._tabDisabledTex.push(ws.Texture);
            }
            if (eNode instanceof WzCanvas) {
              const ws = loader.Load(eNode);
              if (ws) this._tabEnabledTex.push(ws.Texture);
            }
          }
        }
      }

      // OG: Cooldown overlay — CoolTime/0-15 (32x32 each, origin 16,16)
      const coolProp = prop?.Get('CoolTime');
      if (coolProp instanceof WzProperty) {
        for (let i = 0; i < 16; i++) {
          const frame = coolProp.Get(String(i));
          if (frame instanceof WzCanvas) {
            const ws = loader.Load(frame);
            if (ws) this._coolTimeTex.push(ws.Texture);
          }
        }
      }

      // OG: Aran special tab buttons — Tab/AranButton/Bt1-Bt4
      // WZ structure: Tab/AranButton/BtN/{normal,mouseOver,pressed,disabled}/0
      const aranProp = prop?.Get('Tab');
      if (aranProp instanceof WzProperty) {
        const aranBtnProp = aranProp.Get('AranButton');
        if (aranBtnProp instanceof WzProperty) {
          for (let i = 1; i <= 4; i++) {
            const btnProp = aranBtnProp.Get(`Bt${i}`);
            if (btnProp instanceof WzProperty) {
               const normal = loadButtonStateSprite(loader, btnProp, 'normal');
               const disabled = loadButtonStateSprite(loader, btnProp, 'disabled');
               if (normal) this._aranBtnTex.push(normal.texture);
               if (disabled) this._aranBtnDisabledTex.push(disabled.texture);
            }
          }
        }
      }

      // OG: DualBlade tab textures — Tab/DualTab/disabled and Tab/DualTab/enabled
      // Used when character is DualBlade (job 430-439)
      const dualTabProp = prop?.Get('Tab');
      if (dualTabProp instanceof WzProperty) {
        const dualDisabled = dualTabProp.Get('DualTab');
        if (dualDisabled instanceof WzProperty) {
           const dNode = dualDisabled.Get('disabled');
           const eNode = dualDisabled.Get('enabled');
           if (dNode instanceof WzProperty && eNode instanceof WzProperty) {
             for (let i = 0; i < 7; i++) {
               const d = dNode.Get(String(i));
               const e = eNode.Get(String(i));
               if (d instanceof WzCanvas) {
                 const ws = loader.Load(d);
                 if (ws) this._dualTabDisabledTex.push(ws.Texture);
               }
               if (e instanceof WzCanvas) {
                 const ws = loader.Load(e);
                 if (ws) this._dualTabEnabledTex.push(ws.Texture);
               }
             }
           }
        }
      }
    }

    // OG: CWndSkillGuide launchers (button ids 3001-3004) — real CCtrlOriginButton
    // controls built from Tab/AranButton/Bt1-4, one per tab-strip slot N (30px
    // slots + 1px spacing). Containers always exist so hit-testing and visibility
    // work without a live WZ; textures load above when loader/ui are available.
    for (let i = 1; i <= 4; i++) {
      const guide = new Container();
      let nPlain: Sprite | null = null;
      let hPlain: Sprite | null = null;
      let pPlain: Sprite | null = null;
      let dPlain: Sprite | null = null;
      if (loader && ui) {
        const skillProp = ui.GetItem('UIWindow2.img/Skill/main');
        const aranProp = skillProp instanceof WzProperty ? skillProp.Get('Tab') : null;
        const aranBtnProp = aranProp instanceof WzProperty ? aranProp.Get('AranButton') : null;
        const btnProp = aranBtnProp instanceof WzProperty ? aranBtnProp.Get(`Bt${i}`) : null;
        const root = btnProp instanceof WzProperty ? btnProp : null;
        const mk = (s: Sprite | null): Sprite | null => {
          if (!s) return null;
          const plain = new Sprite(s.texture);
          plain.visible = false;
          guide.addChild(plain);
          return plain;
        };
        nPlain = mk(loadButtonStateSprite(loader, root, 'normal'));
        hPlain = mk(loadButtonStateSprite(loader, root, 'mouseOver'));
        pPlain = mk(loadButtonStateSprite(loader, root, 'pressed'));
        dPlain = mk(loadButtonStateSprite(loader, root, 'disabled'));
        if (nPlain) nPlain.visible = true;
      }
      guide.position.set(TAB_X + i * (TAB_SLOT_W + 1), TAB_Y);
      guide.visible = false;
      (guide as any).__spBtn = { normal: nPlain, hover: hPlain, pressed: pPlain, disabled: dPlain };
      this._guideBtns.push({ container: guide });
      this._root.addChild(guide);
    }

    // OG: Create per-row sprites for slot bg, recommend bg, and line bg
    // The OG draws m_pCanvasSkill[0]/[1] at EACH row's position separately
    for (let i = 0; i < VISIBLE_ROWS; i++) {
      // Slot background (normal by default, switched to enabled for hovered row)
      const slotBg = new Sprite(this._skillSlotNormalTex ?? Texture.EMPTY);
      this._rowSlotBgs.push(slotBg);
      this._root.addChild(slotBg);

      // Recommend indicator
      const recBg = new Sprite(this._recommendBgTex ?? Texture.EMPTY);
      recBg.visible = false;
      this._rowRecommendBgs.push(recBg);
      this._root.addChild(recBg);

      // Line separator (only for rows 0-2)
      if (i < 3) {
        const lineBg = new Sprite(this._lineBgTex ?? Texture.EMPTY);
        this._rowLineBgs.push(lineBg);
        this._root.addChild(lineBg);
      }
    }

    // OG: Cooldown overlay sprite (drawn at skill icon position when on cooldown)
    this._coolTimeSprite = new Sprite(Texture.EMPTY);
    this._coolTimeSprite.visible = false;
    this._coolTimeSprite.anchor.set(0.5, 0.5); // OG: origin (16,16) centered
    this._root.addChild(this._coolTimeSprite);

    this._titleText = new Text({ text: 'Skills', style: _titleStyle });
    this._titleText.x = 66; this._titleText.y = 5;
    this._root.addChild(this._titleText);
    this._titleSecond = new Text({ text: '', style: _titleStyle });
    this._titleSecond.visible = false;
    this._root.addChild(this._titleSecond);

    this._spText = new Text({ text: 'SP: 0', style: new TextStyle({ fill: '#A0A0A0', fontSize: 10, fontFamily: 'monospace' }) });
    this._spText.x = PANEL_W - 50; this._spText.y = 5;
    this._root.addChild(this._spText);

    // OG: Tab control at (8, 10), 154×20, nTabSpace=1
    // Max 8 tabs: 6 regular + Aran + DualBlade
    // OG uses CCtrlTab which renders WZ canvas textures for each tab
    for (let i = 0; i < 8; i++) {
      const s = new Sprite(Texture.EMPTY);
      s.visible = false;
      this._tabSprites.push(s);
      this._root.addChild(s);
      const t = new Text({ text: '', style: _labelStyle });
      this._tabLabels.push(t);
      this._root.addChild(t);
      t.visible = false;
    }

    // OG: Skill grid — 4 visible rows, Y starts at 127, step 40
    for (let i = 0; i < VISIBLE_ROWS; i++) {
      const icon = new Sprite();
      icon.width = 32; icon.height = 32;
      icon.x = ICON_LEFT; icon.y = ROW_START_Y + i * ROW_H - 31;
      this._rowIcons.push(icon);
      this._root.addChild(icon);
      const cooldown = new Sprite(Texture.EMPTY);
      cooldown.anchor.set(0.5, 0.5);
      cooldown.visible = false;
      this._rowCoolTimeSprites.push(cooldown);
      this._root.addChild(cooldown);

      const tn = new Text({ text: '', style: _valueStyle });
      this._rowNames.push(tn);
      this._root.addChild(tn);

      const tl = new Text({ text: '', style: _labelStyle });
      this._rowLevels.push(tl);
      this._root.addChild(tl);

      const tcd = new Text({ text: '', style: _cdStyle });
      this._rowCds.push(tcd);
      this._root.addChild(tcd);

      // OG: m_pFontBonus — bonus text at (65, nTop) when SkillLevel - PureSkillLevel > 0
      const tBonus = new Text({ text: '', style: _bonusStyle });
      this._rowBonuses.push(tBonus);
      this._root.addChild(tBonus);

      // OG: SP Up button — BtSpUp loaded from Skill/main/BtSpUp via CLayoutMan
      // The WZ node is BtSpUp/{normal,mouseOver,pressed,disabled}/0 (12x12).
      const btn = new Container();
      const btSpUp = loader && ui ? ui.GetItem('UIWindow2.img/Skill/main/BtSpUp') : null;
      const btSpUpRoot = btSpUp instanceof WzProperty ? btSpUp : null;
      if (loader) {
        const n = loadButtonStateSprite(loader, btSpUpRoot, 'normal');
        const h = loadButtonStateSprite(loader, btSpUpRoot, 'mouseOver');
        const p = loadButtonStateSprite(loader, btSpUpRoot, 'pressed');
        const d = loadButtonStateSprite(loader, btSpUpRoot, 'disabled');
        if (n) btn.addChild(n);
        if (h) { h.visible = false; btn.addChild(h); }
        if (p) { p.visible = false; btn.addChild(p); }
        if (d) { d.visible = false; btn.addChild(d); }
        (btn as any).__spBtn = { normal: n, hover: h, pressed: p, disabled: d };
      }
      btn.x = SP_BTN_X;
       btn.y = SP_BTN_Y_START + i * SP_BTN_STEP;
      this._rowSpBtns.push(btn);
      this._root.addChild(btn);
    }

    // OG: Scrollbar at (1, 8), 93×155, nWheelRange=146
    this._scrollBar = new ScrollBar(SB_X, SB_Y, SB_H, (pos: number) => {
      this._scrollOffset = pos;
    });
    this._root.addChild(this._scrollBar.container);

    // OG: Macro button — BtMacro id 0x7E7, loaded from Skill/main/BtMacro
    // WZ node: BtMacro/{normal,mouseOver,pressed,disabled}/0 (49x18).
    this._macroBtn = new Container();
    if (loader) {
      const btMacro = ui ? ui.GetItem('UIWindow2.img/Skill/main/BtMacro') : null;
      const btMacroRoot = btMacro instanceof WzProperty ? btMacro : null;
      const n = loadButtonStateSprite(loader, btMacroRoot, 'normal');
      const h = loadButtonStateSprite(loader, btMacroRoot, 'mouseOver');
      const p = loadButtonStateSprite(loader, btMacroRoot, 'pressed');
      const d = loadButtonStateSprite(loader, btMacroRoot, 'disabled');
      if (n) this._macroBtn.addChild(n);
      if (h) { h.visible = false; this._macroBtn.addChild(h); }
      if (p) { p.visible = false; this._macroBtn.addChild(p); }
      if (d) { d.visible = false; this._macroBtn.addChild(d); }
      (this._macroBtn as any).__spBtn = { normal: n, hover: h, pressed: p, disabled: d };
    }
    this._macroBtn.x = 4;
    this._macroBtn.y = PANEL_H - 26;
    this._root.addChild(this._macroBtn);

    // OG: CUISkillInc/Dec/DecEX sub-panels (skill increment/decrement windows)
    this.skillIncPanel = new SkillIncPanel(loader, ui);
    this.skillDecPanel = new SkillDecPanel(loader, ui);
    this.skillChangeConfirm = new SkillChangeConfirm(loader, ui);
    this.skillDecPanel.setOnSkillDown((skillId) => {
      const selected = this._resetDecreaseRows.find((row) => row.id === skillId);
      if (!selected) return;
      this._resetSelectedDecrease = selected;
      this.skillDecPanel.isVisible = false;
      this.skillIncPanel.open(this._resetIncreaseRows, this._resetOrigin.x, this._resetOrigin.y);
    });
    this.skillIncPanel.setOnSkillUp((skillId) => {
      const selected = this._resetIncreaseRows.find((row) => row.id === skillId);
      if (!selected || !this._resetSelectedDecrease) return;
      this._resetSelectedIncrease = selected;
      this.skillIncPanel.isVisible = false;
      this.skillChangeConfirm.open(selected, this._resetSelectedDecrease, this.characterJob,
        this._resetOrigin.x, this._resetOrigin.y);
    });
    this.skillChangeConfirm.onConfirm = () => {
      if (this._resetSelectedIncrease && this._resetSelectedDecrease) {
        this.onSkillResetConfirm?.(this._resetSelectedIncrease.id, this._resetSelectedDecrease.id);
      }
      this._resetSelectedIncrease = null;
      this._resetSelectedDecrease = null;
    };
    this.skillChangeConfirm.onCancel = () => {
      this._resetSelectedIncrease = null;
      this._resetSelectedDecrease = null;
    };
    this._root.addChild(
      this.skillIncPanel.container,
      this.skillDecPanel.container,
      this.skillChangeConfirm.container,
    );
    this.createCloseButton(loader, ui, 1, PANEL_W);

    // OG: Create tooltip for skill hover display
    if (font && icons && loader && ui) {
      const assets = new TooltipAssets(loader, ui);
      this._tooltip = new ItemTooltip(font, icons, assets,
         descOf ?? null, setItemOf ?? null, optionOf ?? null, itemInfo ?? null, strings ?? null);
    }
  }

  get tooltipContainer(): Container | null { return this._tooltip?.root ?? null; }
  setViewSize(w: number, h: number): void { this._viewW = w; this._viewH = h; }

  private _getJobLevel(job: number): number { return getJobLevel(job); }

  /** OG: CWvsContext::GetSkillLevelUpState — 0/1/-1 state for this skill. */
  getSkillLevelUpState(skill: SkillRow): number {
    return skillLevelUpState(skill, this.skillService, (id) => this._findSkill(id));
  }

  /** OG: CCtrlButton sprite-state swap (normal/mouseOver/pressed/disabled). */
  private _setBtnState(container: Container, state: 'normal' | 'hover' | 'pressed' | 'disabled'): void {
    const states = (container as any).__spBtn as
      | { normal?: Sprite | null; hover?: Sprite | null; pressed?: Sprite | null; disabled?: Sprite | null }
      | undefined;
    if (!states) return;
    for (const key of ['normal', 'hover', 'pressed', 'disabled'] as const) {
      const s = states[key];
      if (s) s.visible = key === state;
    }
  }

  /**
   * OG: Aran/Cygnus skill-guide launchers (3001-3004). Show button for tab-strip
   * slot `slot` only while the character hasn't unlocked that grade's tab
   * (numTabs < 5). Hidden otherwise (SetTabItems only adds them when
   * job/1000==2 && job%1000/100==1 and root count < 5).
   */
  private _refreshGuideButtons(numTabs: number): void {
    for (let g = 0; g < this._guideBtns.length; g++) {
      const btn = this._guideBtns[g];
      const slot = g + 1;
      const show = this._isAranJob && slot >= numTabs && slot < 5;
      if (btn.container.visible !== show) {
        btn.container.visible = show;
        if (show) {
          btn.container.position.set(TAB_X + slot * (TAB_SLOT_W + 1), TAB_Y);
          this._setBtnState(btn.container, 'normal');
        }
      }
    }
  }

  activeSkillGuideGrade(): number {
    return Math.max(1, Math.min(4, this._activeTab + 1));
  }

  private _getJobChangeLevel(job: number, step: number): number {
    return getJobChangeLevel(job, this.characterSubJob, step);
  }

  private _getMaxSkillDegreeSP(job: number, degree: number): number {
    const nextLevel = getJobChangeLevel(job, this.characterSubJob, degree + 1);
    const curLevel = getJobChangeLevel(job, this.characterSubJob, degree);
    const diff = nextLevel - curLevel;
    if (diff <= 0) return 0;
    return 3 * diff + (degree === 4 ? 3 : 1);
  }

  // OG: GetMySkillDegreeSP — sum of skill levels in given degree
  private _getMySkillDegreeSP(degree: number): number {
    let sum = 0;
    for (const sk of this._skills) {
      const job = Math.floor(sk.id / 10000);
      const dl = getJobLevel(job);
      if (!isBeginnerJob(job) && job !== 2001 && dl === degree) {
        sum += sk.level;
      }
    }
    return sum;
  }

  // OG: GetMySkillDegreeSPDualJob — sum of skill levels in dual-job degree
  private _getMySkillDegreeSPDualJob(degree: number): number {
    const jobs = this._dualJobCodes(degree);
    let sum = 0;
    for (const sk of this._skills) {
      const job = Math.floor(sk.id / 10000);
      if (jobs.includes(job)) sum += sk.level;
    }
    return sum;
  }

  // OG: GetMaxSkillDegreeSPDualJob — SP cap for dual-job degree (returns [cap1,cap2,cap3])
  private _dualJobCodes(degree: number): number[] {
    if (degree <= 0) return [400, 430];
    if (degree === 1) return [431];
    if (degree <= 3) return [432, 433];
    if (degree === 4) return [434];
    return [];
  }

  private _dualJobChangeLevel(step: number): number {
    switch (step) {
      case 400: return 10;
      case 430: return 20;
      case 431: return 30;
      case 432: return 55;
      case 433: return 70;
      case 434: return 120;
      default: return 200;
    }
  }

  // OG returns max SP, job SP, and special/master-level SP.
  private _getMaxSkillDegreeSPDualJob(degree: number): [number, number, number] {
    let low = 0;
    let high = 0;
    let jobSp = 0;
    if (degree <= 0) { low = 400; high = 430; jobSp = 1; }
    else if (degree === 1) { low = 431; high = 431; jobSp = 1; }
    else if (degree <= 3) {
      low = 432; high = 433;
      jobSp = this.characterLevel >= 70 ? 1 : 0;
    } else if (degree === 4) { low = 434; high = 434; jobSp = 3; }
    const maxSp = high > 0
      ? 3 * (this._dualJobChangeLevel(high + 1) - this._dualJobChangeLevel(low))
      : 0;
    const specialSp = this._skills
      .filter((sk) => this._dualJobCodes(degree).includes(Math.floor(sk.id / 10000)))
      .filter((sk) => sk.masterLevel > sk.maxLevel && sk.level > sk.maxLevel)
      .length;
    return [maxSp, jobSp, specialSp];
  }

  // OG: Find skill by ID across all tabs
  private _findSkill(skillId: number): SkillRow | null {
    for (const tab of this._tabs) {
      for (const sk of tab) {
        if (sk.id === skillId) return sk;
      }
    }
    return null;
  }

  // OG: CUISkill::CanSkillUp (0x84a930) — full SP validation
  canSkillUp(skillId: number): boolean {
    const job = Math.floor(skillId / 10000);
    if (isBeginnerJob(job) || job === 2001) return true;
    if (isExtendspJob(job)) return true;

    const jobLevel = getJobLevel(job);
    if (jobLevel <= 0) return false;

    const skill = this._findSkill(skillId);
    const info = this.skillService?.Get(skillId);
    if (!skill || skill.level >= (skill.masterLevel > 0 ? skill.masterLevel : skill.maxLevel)) return false;
    for (const [requiredId, requiredLevel] of info?.RequiredSkills ?? []) {
      if ((this._findSkill(requiredId)?.level ?? 0) < requiredLevel) return false;
    }

    // OG: Check SP in current tier only (cross-tier handled by OnSkillLevelUpButton dialog)
    const mySP = this._getMySkillDegreeSP(jobLevel);
    const lvl = this.characterLevel;
    switch (jobLevel) {
      case 2: return mySP < 3 * lvl - 89;
      case 3: return mySP < 3 * lvl - 209;
      case 4: return mySP < 3 * (lvl - 119);
      default: return true;
    }
  }

  // OG: CUISkill::CanSkillUpDualJob (0x84ae10) — dual-job SP validation
  canSkillUpDualJob(skillId: number): boolean {
    const job = Math.floor(skillId / 10000);
    if (!isDualJob(job)) return false;
    const degree = job % 10;
    if (degree < 1 || degree > 3) return false;

    const skill = this._findSkill(skillId);
    const info = this.skillService?.Get(skillId);
    if (!skill || skill.level >= (skill.masterLevel > 0 ? skill.masterLevel : skill.maxLevel)) return false;
    for (const [requiredId, requiredLevel] of info?.RequiredSkills ?? []) {
      if ((this._findSkill(requiredId)?.level ?? 0) < requiredLevel) return false;
    }

    let priorSpent = 0;
    let priorCap = 0;
    for (let prior = 0; prior < degree; prior++) {
      const [maxSp, jobSp] = this._getMaxSkillDegreeSPDualJob(prior);
      priorSpent += this._getMySkillDegreeSPDualJob(prior);
      priorCap += maxSp + jobSp;
    }
    if (priorSpent < priorCap) return false;

    const current = this._getMySkillDegreeSPDualJob(degree);
    const [maxSp, jobSp, specialSp] = this._getMaxSkillDegreeSPDualJob(degree);
    if (current >= maxSp + jobSp + specialSp) return false;
    if (degree === 1) return current < specialSp + 3 * this.characterLevel - 90 + jobSp;
    if (degree === 2 || degree === 3) {
      return current < specialSp + 3 * (this.characterLevel - 55) + jobSp;
    }
    if (degree === 4) return current < specialSp + 3 * (this.characterLevel - 120) + jobSp;
    return true;
  }

  // OG: CUISkill::GetTabSP — returns effective SP for the current tab
  // Tab 0 (beginner): get_novice_skill_point
  // Tabs for extendsp jobs: ExtendSP::Get(tab)
  // Other tabs: global SP
  getTabSp(): number {
    if (this._activeTab === 0) {
      // OG: Tab 0 = beginner — uses novice SP
      return getNoviceSkillPoint(this.characterJob, this.sp, this._noviceSp);
    }
    // OG: For extendsp jobs, SP is tracked per-root via ExtendSP
    if (isExtendspJob(this.characterJob)) {
      // CUISkillEx::SetButtons / OnSkillLevelUpButton call
      // ExtendSP::Get(&extendSP, m_nCurTab) directly.
      return this._extendSP[this._activeTab] ?? 0;
    }
    return this.sp;
  }

  // OG: OnSkillLevelUpButton (0x84d660) — full SP allocation with validation
  // Returns true if skill was leveled up, false if blocked
  onSkillLevelUp(skillId: number): boolean {
    const job = Math.floor(skillId / 10000);

    // OG: admin/tester/manager bypass — skip all checks
    if (this.isAdmin) {
      const tabSp = this.getTabSp();
      if (tabSp <= 0) return false;
      this.onSendSkillUp?.(skillId);
      this.onSkillUp?.(skillId);
      return true;
    }

    // OG: Cooldown check — 500ms between requests (m_tExclRequestSent)
    const now = performance.now();
    if (now - this._lastSkillUpTime < 500) return false;
    this._lastSkillUpTime = now;

    // OG: HP check — must be alive to allocate SP
    if (this.characterHp <= 0) return false;

    // OG: Check SP availability (per-tab)
    const tabSp = this.getTabSp();
    if (tabSp <= 0) return false;

    // OG: bUpButtonDisabled check — some skills block manual allocation
    const info = this.skillService?.Get(skillId);
    if (info?.UpButtonDisabled) return false;

    // OG: GetSkillLevelUpState != 1 check — state must be exactly 1 (allocatable)
    if (info && info.MaxLevel > 0) {
      const sk = this._findSkill(skillId);
      if (sk && sk.level >= (sk.masterLevel > 0 ? sk.masterLevel : info.MaxLevel)) return false;
    }

    // OG: Validate skill can be leveled up (per-tier SP check)
    if (isBeginnerJob(job) || isExtendspJob(job)) {
      // Beginner/extendsp skills: always allowed if SP > 0
    } else if (isDualJob(job)) {
      if (!this.canSkillUpDualJob(skillId)) return false;
    } else {
      if (!this.canSkillUp(skillId)) return false;
    }

    // OG: SendSkillUpRequest
    this.onSendSkillUp?.(skillId);
    this.onSkillUp?.(skillId);
    return true;
  }

  setSkills(skills: SkillRow[]): void {
    this._skills = skills;
    this.rebuildTabs();
  }

  /** Opens the OG three-step SP reset wizard with caller-provided candidates. */
  openSkillReset(decrease: SkillRow[], increase: SkillRow[], x = this._root.x, y = this._root.y): void {
    const toResetRow = (row: SkillRow): SkillResetRow => ({
      id: row.id,
      name: row.name,
      level: row.level,
      maxLevel: row.masterLevel > 0 ? row.masterLevel : row.maxLevel,
      icon: this.skillService?.Get(row.id)?.Icon1 ?? this.skillService?.Get(row.id)?.Icon0 ?? undefined,
    });
    this._resetDecreaseRows = decrease.map(toResetRow);
    this._resetIncreaseRows = increase.map(toResetRow);
    this._resetSelectedDecrease = null;
    this._resetSelectedIncrease = null;
    this._resetOrigin = { x, y };
    this.skillDecPanel.open(this._resetDecreaseRows, x, y);
  }

  /**
   * Build the visible skill list the same way CUISkill does: the character's
   * skill records provide levels, while Skill.wz provides the complete skill
   * roots.  This is intentionally separate from setSkills(), which remains a
   * small deterministic API for tests and callers that already have rows.
   */
  setSkillRecords(records: Array<{ skillId: number; level: number; masterLevel?: number }>): void {
    const byId = new Map(records.map((record) => [record.skillId, record]));
    const roots = this._skillRootsForJob(this.characterJob, records.map((record) => record.skillId));
    const ids = new Set<number>();

    for (const root of roots) {
      for (const skillId of this.skillService?.EnumerateSkillIds(root) ?? []) ids.add(skillId);
    }

    // Keep server records that are not discoverable through a WZ root.  This
    // protects custom/event skills and makes live packets authoritative.
    for (const record of records) ids.add(record.skillId);

    const rows: SkillRow[] = [];
    for (const skillId of Array.from(ids).sort((a, b) => a - b)) {
      const record = byId.get(skillId);
      const info = this.skillService?.Get(skillId);
      if (info?.Invisible) continue;
      const level = record?.level ?? 0;
      const maxLevel = Math.max(1, info?.MaxLevel ?? record?.masterLevel ?? 1);
      rows.push(new SkillRow(
        skillId,
        info?.Name || this.nameOf(skillId) || `Skill ${skillId}`,
        level,
        maxLevel,
        info?.Passive ?? false,
        record?.masterLevel ?? info?.DefaultMasterLev ?? maxLevel,
      ));
    }

    this.setSkills(rows);
  }

  private _skillRootsForJob(job: number, knownSkillIds: number[]): number[] {
    const roots = new Set<number>();
    const addJobRoots = (value: number): void => {
      if (value <= 0) return;
      const tier = Math.floor((value % 1000) / 100);
      if (tier > 0) {
        const base = 100 * (tier + 10 * Math.floor(value / 1000));
        roots.add(base);
        const branch = Math.floor((value % 100) / 10);
        if (branch > 0) {
          const branchRoot = base + 10 * branch;
          roots.add(branchRoot);
          for (let i = 1; i <= 8 && value % 10 >= i; i++) roots.add(branchRoot + i);
        }
      }

      // Extended jobs (Aran/Evan) and Dual Blade have root files named after
      // the job itself in addition to the common explorer roots.
      if (value >= 2000 || Math.floor(value / 10) === 43) roots.add(value);
    };

    addJobRoots(job);
    for (const skillId of knownSkillIds) addJobRoots(Math.floor(skillId / 10000));
    if (isBeginnerJob(job) || job === 0) roots.add(0);
    return Array.from(roots).sort((a, b) => a - b);
  }

  rebuildTabs(): void {
    const tabs: SkillRow[][] = [];
    const labels: string[] = [...TAB_LABELS];
    // OG: tabs built from skill root data
    // For regular jobs: use TAB_PREFIXES mapping
    // For Aran (3000+): separate tab
    // For DualBlade (430+): separate tab with extended SP
    for (let i = 0; i < TAB_PREFIXES.length; i++) tabs.push([]);
    // Add extra tabs for Aran and DualBlade if needed
    let hasAran = false, hasDual = false;
    for (const sk of this._skills) {
      const jobRoot = Math.floor(sk.id / 10000);
      if (Math.floor(jobRoot / 10) === 43) hasDual = true;
      if (jobRoot === 2000 || (jobRoot >= 2100 && jobRoot < 2200)) hasAran = true;
    }
    if (hasDual) { labels.push(...new Array(7).fill('')); tabs.push(...new Array(7).fill(null).map(() => [])); }

    const dualBase = TAB_PREFIXES.length;
    const aranBase = dualBase + (hasDual ? 7 : 0);

    for (const sk of this._skills) {
      const jobRoot = Math.floor(sk.id / 10000);
      let tabIdx = 0;
      if (Math.floor(jobRoot / 10) === 43) {
        tabIdx = dualBase + Math.max(0, Math.min(6, jobRoot % 10));
      } else if (jobRoot === 2000 || (jobRoot >= 2100 && jobRoot < 2200)) {
        // Aran guide buttons are separate controls (3001-3004), not tabs.
        tabIdx = Math.max(0, Math.min(4, explorerSkillDegree(jobRoot)));
      } else {
        tabIdx = Math.max(0, Math.min(4, explorerSkillDegree(jobRoot)));
      }
      if (tabIdx >= 0 && tabIdx < tabs.length) tabs[tabIdx].push(sk);
    }
    let lastRegularTab = 0;
    for (let i = 1; i < TAB_PREFIXES.length; i++) {
      if (tabs[i].length > 0) lastRegularTab = i;
    }
    const regularCount = Math.max(1, lastRegularTab + 1);
    const extraTabs = tabs.slice(TAB_PREFIXES.length);
    const extraLabels = labels.slice(TAB_PREFIXES.length);
    tabs.length = regularCount;
    labels.length = regularCount;
    tabs.push(...extraTabs);
    labels.push(...extraLabels);
    this._tabs = tabs;
    this._tabLabelStrings = labels;
    this._tabKinds = [
      ...new Array(regularCount).fill('regular'),
      ...(hasDual ? new Array(7).fill('dual') : []),
      ...(hasAran ? [] : []),
    ];
    this._isAranJob = hasAran;
    // OG: SetScrollBar — range = skillCount - 3 (not VISIBLE_ROWS)
    const tab = this._tabs[this._activeTab] || [];
    this._scrollBar.setRange(Math.max(0, tab.length - 3) + 1);
    // OG: GetRecommendSKill — WZ-driven from Skill.wz/<root>.img/recommend
    this._recommendSkillId = 0;
    if (tab.length > 0 && this.skillService) {
      const rootId = tab[0].id ? Math.floor(tab[0].id / 10000) * 1000 : 0;
      if (rootId > 0) {
        // OG: sum all skill levels in this root, then find matching recommend entry
        let nSLVSum = 0;
        for (const sk of tab) nSLVSum += sk.level;
        this._recommendSkillId = this.skillService.GetRecommendSkill(rootId, nSLVSum);
      }
      // Fallback: first non-passive with level > 0
      if (!this._recommendSkillId) {
        for (const sk of tab) {
          if (!sk.passive && sk.level > 0 && sk.level < sk.maxLevel) {
            this._recommendSkillId = sk.id;
            break;
          }
        }
      }
    }
  }

  startCooldown(skillId: number, totalSeconds: number): void {
    this._cooldowns.set(skillId, {
      skillId, remaining: totalSeconds, total: totalSeconds,
      coolFrame: 0, coolFrameTimer: 0,
    });
  }

  clearCooldown(skillId: number): void {
    this._cooldowns.delete(skillId);
  }

  cooldownOf(skillId: number): { remain: number; total: number } | null {
    const cd = this._cooldowns.get(skillId);
    return cd ? { remain: cd.remaining, total: cd.total } : null;
  }

  update(_dt: number): void {
    if (!this.isVisible) return;

    for (const [id, cd] of this._cooldowns) {
      cd.remaining -= _dt;
      // OG: Cooldown animation — cycle through CoolTime frames
      if (this._coolTimeTex.length > 0) {
        cd.coolFrameTimer += _dt;
        if (cd.coolFrameTimer >= 0.08) { // ~12.5fps animation
          cd.coolFrameTimer = 0;
          cd.coolFrame = (cd.coolFrame + 1) % this._coolTimeTex.length;
        }
      }
      if (cd.remaining <= 0) this._cooldowns.delete(id);
    }

    const tab = this._tabs[this._activeTab] || [];

    // OG Draw: Book icon at (15, 55) via pBookIcon — loaded from Skill.wz/Root/<id>/icon
    if (this.skillService && this._activeTab < this._tabs.length) {
      const rootId = this._tabs[this._activeTab]?.[0]?.id
        ? Math.floor(this._tabs[this._activeTab][0].id / 10000) * 1000
        : 0;
      if (rootId > 0) {
        const bookCanvas = this.skillService.GetBookIcon(rootId);
        if (bookCanvas && this.textureLoader) {
          const ws = this.textureLoader.Load(bookCanvas);
          if (ws) {
            if (!this._bookIcon) {
              this._bookIcon = new Sprite(ws.Texture);
              this._root.addChild(this._bookIcon);
            } else {
              this._bookIcon.texture = ws.Texture;
            }
          }
        }
      }
    }
    if (this._bookIcon) {
      this._bookIcon.position.set(15, 55);
      this._bookIcon.visible = true;
    }

    // OG Draw: SP count at (104 - textWidth, 256) via m_pFontNo — right-aligned at x=104
    // OG uses per-tab SP (beginner/extend/job), not global SP
    const tabSp = this.getTabSp();
    this._spText.text = `${tabSp}`;
    this._spText.style = new TextStyle({
      fill: tabSp > 0 ? '#FFFFFF' : '#A0A0A0',
      fontSize: 10, fontFamily: 'monospace',
    });
    this._spText.x = 104 - this._spText.width;
    this._spText.y = SP_TEXT_Y;

    // OG Draw: Book name — loaded from Skill.wz/Root/<id>/name via get_labeled_string
    // If width >= 110, split at space: line1 at (50,55), line2 at (50,69)
    let bookName = this._tabLabelStrings[this._activeTab] ?? '';
    if (this.skillService && this._activeTab < this._tabs.length) {
      const rootId = this._tabs[this._activeTab]?.[0]?.id
        ? Math.floor(this._tabs[this._activeTab][0].id / 10000) * 1000
        : 0;
      if (rootId > 0) {
        const wzName = this.skillService.GetBookName(rootId);
        if (wzName) bookName = wzName;
      }
    }
    this._titleText.text = bookName;
    this._titleSecond.text = '';
    this._titleSecond.visible = false;
    // OG Draw: measure text width for centering decision (v29 >= 110 check)
    const bookNameWidth = this._titleText.width;
    if (bookNameWidth < 110) {
      // Narrow: centered at (104 - w/2, 65)
      this._titleText.x = 104 - bookNameWidth / 2;
      this._titleText.y = 65;
    } else {
      // Wide: two-line at (50, 55) — split at last space before column 110
      const splitIdx = bookName.lastIndexOf(' ', 12);
      if (splitIdx > 0) {
        this._titleText.text = bookName.substring(0, splitIdx);
        const line1Width = this._titleText.width;
        this._titleText.x = 104 - line1Width / 2;
        this._titleText.y = 55;
        this._titleSecond.text = bookName.substring(splitIdx + 1);
        this._titleSecond.x = 104 - this._titleSecond.width / 2;
        this._titleSecond.y = 69;
        this._titleSecond.visible = true;
      } else {
        this._titleText.x = 50;
        this._titleText.y = 55;
      }
    }

    // OG Draw: Skill slot rendering loop — nTop=112, step=40, while nTop+40<272
    for (let i = 0; i < VISIBLE_ROWS; i++) {
      const abs = this._scrollOffset + i;
      const sk = abs < tab.length ? tab[abs] : null;
      const nTop = ROW_START_Y + i * ROW_H; // 112, 152, 192, 232
      const isHovered = i === this._hoverIndex;

      if (sk) {
        // OG Draw: Slot background at (10, nTop-19) via m_pCanvasSkill[state]
        // state = (GetSkillLevelUpState != 0): enabled texture whenever required
        // skills are met (state -1 maxed, or 1 can-up), normal otherwise.
        const state = skillLevelUpState(sk, this.skillService, (id) => this._findSkill(id));
        const reqsMet = state !== 0;
        const slotBg = this._rowSlotBgs[i];
        if (reqsMet && this._skillSlotEnabledTex) {
          slotBg.texture = this._skillSlotEnabledTex;
        } else if (this._skillSlotNormalTex) {
          slotBg.texture = this._skillSlotNormalTex;
        }
        slotBg.position.set(10, nTop - 19);
        slotBg.visible = true;

        // OG Draw: Skill icon at (12, nTop-17) via p->apCanvas[v54 + v75]
        // v54 = state != 0, v75 = hover && v54 → Icon0/Icon1/Icon2.
        this._rowIcons[i].texture = Texture.EMPTY;
        const info = this.skillService?.Get(sk.id);
        const iconCanvas = reqsMet
          ? (isHovered ? (info?.Icon2 ?? info?.Icon1 ?? info?.Icon0) : (info?.Icon1 ?? info?.Icon0 ?? info?.Icon))
          : (info?.Icon0 ?? info?.Icon);
        if (iconCanvas) {
          const ws = this.textureLoader?.Load(iconCanvas);
          if (ws) this._rowIcons[i].texture = ws.Texture;
        }
        this._rowIcons[i].x = 12;
        this._rowIcons[i].y = nTop - 17;

        // OG Draw: Recommend indicator at (47, nTop-19) if skill == recommendID
        const recBg = this._rowRecommendBgs[i];
        if (sk.id === this._recommendSkillId && this._recommendBgTex) {
          recBg.texture = this._recommendBgTex;
          recBg.position.set(47, nTop - 19);
          recBg.visible = true;
        } else {
          recBg.visible = false;
        }

        // OG Draw: Skill name at (50, nTop-18) via m_pFont — truncated at 95px width
        const rawName = sk.name;
        this._rowNames[i].text = rawName;
        // OG: format_string truncates at max pixel width (95px for skill names)
        if (this._rowNames[i].width > 95) {
          let truncated = rawName;
          while (truncated.length > 1 && this._rowNames[i].width > 92) {
            truncated = truncated.slice(0, -1);
            this._rowNames[i].text = truncated + '…';
          }
        }
        this._rowNames[i].x = 50;
        this._rowNames[i].y = nTop - 18;

        // OG Draw: Level at (50, nTop) via m_pFont or m_pFontBonus if bonus>0
        // PureSkillLevel = level without equipment bonus; difference = equipment
        // skill bonus (mSkillRecordEx). When bonus > 0 the level itself is drawn
        // with m_pFontBonus (green) and "(+%d)" follows at (65, nTop).
        const effectiveMasterLevel = sk.masterLevel > 0 ? sk.masterLevel : sk.maxLevel;
        const skillBonus = this.skillBonusOf ? this.skillBonusOf(sk.id) ?? 0 : 0;
        const effLevel = sk.level + skillBonus;
        this._rowLevels[i].text = `${effLevel}/${effectiveMasterLevel}`;
        this._rowLevels[i].x = 50;
        this._rowLevels[i].y = nTop;
        this._rowLevels[i].style = skillBonus > 0 ? _bonusStyle : new TextStyle({
          fill: sk.level >= sk.maxLevel ? '#C8B450' : '#A0C8A0',
          fontSize: 9, fontFamily: 'monospace',
        });

        const cd = this._cooldowns.get(sk.id);
        if (cd) {
          this._rowCds[i].text = `${Math.ceil(cd.remaining)}s`;
          this._rowCds[i].x = PANEL_W - 44;
          this._rowCds[i].y = nTop;
          // OG: Cooldown overlay — CoolTime frame at skill icon position (12, nTop-17)
          if (this._coolTimeTex.length > 0 && this._coolTimeSprite) {
            const cooldown = this._rowCoolTimeSprites[i];
            cooldown.texture = this._coolTimeTex[cd.coolFrame % this._coolTimeTex.length];
            cooldown.position.set(28, nTop - 1);
            cooldown.visible = true;
          }
        } else {
          this._rowCds[i].text = '';
          this._rowCoolTimeSprites[i].visible = false;
        }

        // OG Draw: Bonus text at (65, nTop) via m_pFontBonus when SkillLevel - PureSkillLevel > 0
        // PureSkillLevel = level without equipment bonus; difference = equipment skill bonus
        if (skillBonus > 0) {
          this._rowBonuses[i].text = `+${skillBonus}`;
          this._rowBonuses[i].x = 65;
          this._rowBonuses[i].y = nTop;
          this._rowBonuses[i].visible = true;
        } else {
          this._rowBonuses[i].text = '';
          this._rowBonuses[i].visible = false;
        }

        // OG Draw: Line separator at (10, nTop+18) for rows 0-2
        if (i < 3 && this._lineBgTex) {
          const lineBg = this._rowLineBgs[i];
          lineBg.texture = this._lineBgTex;
          lineBg.position.set(10, nTop + 18);
          lineBg.visible = true;
        }

        // OG: SetButtons — SP Up button visible whenever the skill exists at
        // this row (shown-disabled when it can't be leveled), hidden only when
        // no skill occupies the row. Enabled when reqs met (state==1) AND nSP>0
        // AND not bUpButtonDisabled (OG 0x84B220). CCtrlButton cycles
        // normal→mouseOver on hover when enabled.
        const btnEnabled = state === 1 && tabSp > 0 && !info?.UpButtonDisabled;
        this._rowSpBtns[i].visible = true;
        this._setBtnState(this._rowSpBtns[i], btnEnabled ? (isHovered ? 'hover' : 'normal') : 'disabled');
      } else {
        // OG: SetButton(idx, 0, 0) — hide
        this._rowSlotBgs[i].visible = false;
        this._rowRecommendBgs[i].visible = false;
        this._rowIcons[i].texture = Texture.EMPTY;
        this._rowNames[i].text = '';
        this._rowLevels[i].text = '';
        this._rowCds[i].text = '';
        this._rowCoolTimeSprites[i].visible = false;
        this._rowBonuses[i].text = '';
        this._rowBonuses[i].visible = false;
        this._rowSpBtns[i].visible = false;
        if (i < 3) this._rowLineBgs[i].visible = false;
      }
    }

    // OG Draw: DrawTab — tab backgrounds from WZ (Tab/disabled/0-4, Tab/enabled/0-4)
    // OG uses CCtrlTab which renders each tab with WZ canvas textures
    // Tab width = (TAB_W - nTabSpace*(numTabs-1)) / numTabs, nTabSpace=1
    // OG SetTabItems cycles images via `i % nTabImageCount` and marks item i
    // enabled when `i < s_nTabCount` (7). The image arrays carry the per-slot
    // texture; when the count exceeds the available images we wrap around.
    const numTabs = this._tabs.length;
    const tabSpacing = 1; // OG: nTabSpace = 1
    const tabW = numTabs > 0 ? Math.floor((TAB_W - tabSpacing * (numTabs - 1)) / numTabs) : TAB_W;
    const regularImages = Math.max(1, this._tabEnabledTex.length, this._tabDisabledTex.length);
    const dualImages = Math.max(1, this._dualTabEnabledTex.length, this._dualTabDisabledTex.length);

    for (let i = 0; i < this._tabSprites.length; i++) {
      const isActive = i === this._activeTab;
      const tx = TAB_X + i * (tabW + tabSpacing);

      // Show/hide tabs based on actual count
      this._tabSprites[i].visible = i < numTabs;
      this._tabLabels[i].visible = i < numTabs;
      if (i >= numTabs) continue;

       const kind = this._tabKinds[i] ?? 'regular';
       const regularCount = this._tabKinds.filter(value => value === 'regular').length;
       const dualCount = this._tabKinds.filter(value => value === 'dual').length;
       const specialIndex = kind === 'dual' ? i - regularCount : i - regularCount - dualCount;
       // OG: image index cycles `i % nTabImageCount`; special tabs use their own
       // image set and also cycle within it.
       const regIdx = regularCount > 0 ? i % regularImages : i % regularImages;
       const specIdx = Math.max(0, specialIndex) % Math.max(1, kind === 'dual' ? dualImages : regularImages);
       const tabTex = kind === 'dual'
         ? (isActive ? this._dualTabEnabledTex[specIdx] : this._dualTabDisabledTex[specIdx])
         : kind === 'aran'
           ? (isActive ? this._aranBtnTex[specIdx] : this._aranBtnDisabledTex[specIdx])
           : (isActive
             ? (this._tabEnabledTex[regIdx] ?? this._tabEnabledTex[0] ?? null)
             : (this._tabDisabledTex[regIdx] ?? this._tabDisabledTex[0] ?? null));

      if (tabTex) {
        this._tabSprites[i].texture = tabTex;
        this._tabSprites[i].position.set(tx, TAB_Y);
        this._tabSprites[i].width = tabW;
        this._tabSprites[i].height = TAB_H;
      }

      // OG: Tab label text — centered in tab
       this._tabLabels[i].visible = !tabTex;
       this._tabLabels[i].text = this._tabLabelStrings[i] ?? '';
      this._tabLabels[i].anchor.set(0.5, 0);
      this._tabLabels[i].x = tx + tabW / 2;
      this._tabLabels[i].y = TAB_Y + 4;
      this._tabLabels[i].style = new TextStyle({
        fill: isActive ? '#FFFFFF' : '#888888',
        fontSize: 9, fontFamily: 'monospace',
      });
    }

    // OG: Aran guide buttons (3001-3004) — CLayoutMan::AddButton creates one per
    // tab-strip slot N that the current character hasn't unlocked (numTabs < 5).
    // Shown only for Aran/Cygnus (SetTabItems job/1000==2 && job%1000/100==1),
    // i.e. _isAranJob here; each opens CWndSkillGuide(grade = slot index).
    this._refreshGuideButtons(numTabs);

    // OG: Update sub-panels (CUISkillInc/Dec/DecEX)
    this.skillIncPanel.update(_dt);
    this.skillDecPanel.update(_dt);
    this.skillChangeConfirm.update(_dt);

    // OG: CUIWndPosSaved — save position to localStorage
    try {
      localStorage.setItem(SkillBook._posKey, JSON.stringify({ x: this._root.x, y: this._root.y }));
    } catch { /* ignore */ }
  }

  // OG: GetSkillIndexFromPoint — hit testing (v10 starts at 127, step 40)
  private _getSkillIndexFromPoint(lx: number, ly: number, bIcon: boolean): number {
    const tab = this._tabs[this._activeTab] || [];
    let v10 = 127; // OG: v10 = 127 initial value
    for (let i = this._scrollOffset; i < tab.length; i++) {
      let left: number, top: number, right: number, bottom: number;
      if (bIcon) {
        left = 13; top = v10 - 31; right = 45; bottom = v10 + 1;
      } else {
        left = 10; top = v10 - 34; right = 149; bottom = v10;
      }
      if (lx >= left && lx < right && ly >= top && ly < bottom) {
        return i - this._scrollOffset;
      }
      v10 += 40;
      if (v10 >= 287) break; // OG: stops at 287
    }
    return -1;
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    // Forward to sub-panels first (they have higher z-order)
    if (this.skillIncPanel.handleMouseButton(x, y, down)) return true;
    if (this.skillDecPanel.handleMouseButton(x, y, down)) return true;
    if (this.skillChangeConfirm.handleMouseButton(x, y, down)) return true;
    const lx = x - this._root.x;
    const ly = y - this._root.y;

    // Forward to scrollbar first
    const sbx = lx - SB_X;
    const sby = ly - SB_Y;
    if (sbx >= 0 && sbx < 12 && sby >= 0 && sby < SB_H) {
      if (this._scrollBar.handleMouseButton(sbx, sby, down)) return true;
    }

    if (!down) return true;

    // Close button
    if (lx >= PANEL_W - 18 && ly < 22) { this.isVisible = false; return true; }

    // OG: OnButtonClicked id 2023 — macro toggle (0x7E7)
    if (lx >= this._macroBtn.x && lx < this._macroBtn.x + 58 &&
        ly >= this._macroBtn.y && ly < this._macroBtn.y + 18) {
      this.onMacroOpen?.();
      return true;
    }

    // OG: OnButtonClicked ids 3001-3004 — skill guide (OpenSkillGuide).
    // Each AranButton BtN is a real button on tab-strip slot N; clicking opens
    // CWndSkillGuide(grade = N).
    for (let g = 0; g < this._guideBtns.length; g++) {
      const btn = this._guideBtns[g];
      if (!btn.container.visible) continue;
      const bx = btn.container.x;
      const by = btn.container.y;
      if (lx >= bx && lx < bx + TAB_SLOT_W && ly >= by && ly < by + 18) {
        this.onSkillGuide?.(g + 1);
        return true;
      }
    }

    // OG: Tab click — nId=2000, param1=100 (TCN_SELCHANGE)
    for (let i = 0; i < this._tabs.length; i++) {
      const tabSpacing = 1;
      const tabW = this._tabs.length > 0
        ? Math.floor((TAB_W - tabSpacing * (this._tabs.length - 1)) / this._tabs.length)
        : TAB_W;
      const tx = TAB_X + i * (tabW + tabSpacing);
      if (lx >= tx && lx < tx + tabW && ly >= TAB_Y && ly < TAB_Y + TAB_H) {
        this.onTabChanged(i);
        return true;
      }
    }

    // OG: SP Up button clicks — nId=2010..2013 (CCtrlButton OnClick only
    // fires for enabled buttons; OG CUISkill::OnButtonClicked routes to
    // OnSkillLevelUpButton(nId-2010)).
    const tab = this._tabs[this._activeTab] || [];
    for (let i = 0; i < VISIBLE_ROWS; i++) {
      const btn = this._rowSpBtns[i];
      if (!btn.visible) continue;
      if (lx >= btn.x && lx < btn.x + 16 && ly >= btn.y && ly < btn.y + 14) {
        const abs = this._scrollOffset + i;
        if (abs < tab.length) {
          const sk = tab[abs];
          // OG: CCtrlButton only dispatches OnButtonClicked for enabled buttons;
          // CUISkill::OnButtonClicked then routes 2010-2013 to
          // OnSkillLevelUpButton, which re-validates (state==1, SP>0, not
          // UpButtonDisabled) before sending — so a disabled button click here
          // is a no-op just like the OG.
          this.onSkillLevelUp(sk.id);
        }
        return true;
      }
    }

    // OG: OnMouseButton (0x84B710) msg==513 (left down) — GetSkillIndexFromPoint
    // with bIcon=1 (icon rect). Drag starts only for skills that are not
    // nonslot, not job-type-9, and have level > 0.
    const iconIdx = this._getSkillIndexFromPoint(lx, ly, true);
    if (iconIdx >= 0) {
      const abs = this._scrollOffset + iconIdx;
      if (abs < tab.length) {
        const sk = tab[abs];
        const jobType = Math.floor(sk.id / 1000) % 10;
        if (jobType !== 0 && jobType !== 9 && !isNonslotSkill(sk.id) && sk.level > 0) {
          // OG: play_ui_sound(StringPool 0x75E) on drag start
          this.onDragSound?.();
          this.onDragStart?.({ skillId: sk.id }, this._rowIcons[iconIdx].texture, x, y);
          const now = performance.now();
          const isDoubleClick = sk.id === this._lastClickSkillId && now - this._lastClickTime < 400;
          this._lastClickSkillId = sk.id;
          this._lastClickTime = isDoubleClick ? 0 : now;
          if (isDoubleClick) this.onSkillUse?.(sk.id, sk.level);
        }
      }
      return true;
    }

    // OG: Row click — GetSkillIndexFromPoint with bIcon=0
    const rowIdx = this._getSkillIndexFromPoint(lx, ly, false);
    if (rowIdx >= 0) {
      const abs = this._scrollOffset + rowIdx;
      if (abs < tab.length) {
        const sk = tab[abs];
        if (!sk.passive && sk.level > 0) {
          this.onDragSound?.();
          this.onDragStart?.({ skillId: sk.id }, this._rowIcons[rowIdx].texture, x, y);
          const now = performance.now();
          const isDoubleClick = sk.id === this._lastClickSkillId && now - this._lastClickTime < 400;
          this._lastClickSkillId = sk.id;
          this._lastClickTime = isDoubleClick ? 0 : now;
          if (isDoubleClick) this.onSkillUse?.(sk.id, sk.level);
        }
      }
      return true;
    }

    return lx >= 0 && lx < PANEL_W && ly >= 0 && ly < PANEL_H;
  }

  // OG: CUISkill::OnMouseMove — hover + tooltip
  onMouseMove(x: number, y: number): void {
    this._mouseX = x;
    this._mouseY = y;
    if (!this.isVisible) return;
    this.skillIncPanel.onMouseMove(x, y);
    this.skillDecPanel.onMouseMove(x, y);
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    // Forward to scrollbar
    const sbx = lx - SB_X;
    const sby = ly - SB_Y;
    if (sbx >= 0 && sbx < 12 && sby >= 0 && sby < SB_H) {
      this._scrollBar.handleMouseMove(sbx, sby);
    } else {
      this._scrollBar.handleMouseLeave();
    }
    // OG: GetSkillIndexFromPoint(this, rx, ry, 0) → store in m_nMouseOver
    const hoverIdx = this._getSkillIndexFromPoint(lx, ly, false);
    if (hoverIdx !== this._hoverIndex) {
      this._hoverIndex = hoverIdx;
      // Trigger redraw to update slot bg state (normal vs enabled)
    }

    // OG: guide-button hover — CCtrlButton mouseOver state on the skill-guide
    // launchers. update() resets each to normal each frame; applying hover here
    // happens after that reset during the same frame's event processing.
    for (let g = 0; g < this._guideBtns.length; g++) {
      const btn = this._guideBtns[g];
      if (!btn.container.visible) continue;
      const bx = btn.container.x;
      const by = btn.container.y;
      const hovered = lx >= bx && lx < bx + TAB_SLOT_W && ly >= by && ly < by + 18;
      this._setBtnState(btn.container, hovered ? 'hover' : 'normal');
    }

    // OG: Show skill tooltip on hover — offset Y by 20 + addon offset
    if (this._hoverIndex >= 0 && this._tooltip) {
      const tab = this._tabs[this._activeTab] || [];
      const skill = tab[this._scrollOffset + this._hoverIndex];
      if (skill) {
        // OG: tooltip at (rx + offset, ry + IsMyAddon() + 20)
        const info = this.skillService?.Get(skill.id);
        // TODO: SkillInfoService does not currently expose the OG swallow,
        // Wild Hunter, linked-character, expiry, or damage-meter context.
        const reqSkills = info ? Array.from(info.RequiredSkills.entries()).map(([requiredId, level]) => {
          const requiredInfo = this.skillService?.Get(requiredId);
          return {
            name: requiredInfo?.Name || this.nameOf(requiredId) || `Skill ${requiredId}`,
            level,
            skillId: requiredId,
            icon: requiredInfo
              ? this.textureLoader?.Load(requiredInfo.Icon1 ?? requiredInfo.Icon0 ?? requiredInfo.Icon ?? null) ?? undefined
              : undefined,
          };
        }) : [];
        const linkedSkill = skill.id === 12 || skill.id === 10000012 || skill.id === 20000012
          || skill.id === 20010012 || skill.id === 30000012;
        const wildHunterSkill = skill.id === 30001061 || skill.id === 30001062;
        const swallowSkill = skill.id === 33101006;
        const damageMeterSkill = skill.id === 1006 || skill.id === 10001006
          || skill.id === 20001006 || skill.id === 20011006 || skill.id === 30001006;
        this._tooltip.DrawSkillTooltip(
           skill.id, skill.name, info?.Description || this.nameOf(skill.id),
            skill.level, skill.masterLevel > 0 ? skill.masterLevel : skill.maxLevel,
           info?.LevelDescriptionAt(skill.level) ?? '',
           info?.LevelDescriptionAt(skill.level + 1) ?? '', reqSkills,
           this._mouseX, this._mouseY + 20, this._viewW, this._viewH,
           true,
           info ? {
             // SkillInfoService currently provides these fields directly.
              masterLevel: info.DefaultMasterLev > 0 ? info.DefaultMasterLev : undefined,
              icon: this._rowIcons[this._hoverIndex] ?? undefined,
              linkedCharName: linkedSkill && this.linkedCharacter ? this.linkedCharacter : undefined,
              wildHunterValues: wildHunterSkill ? this.wildHunterMobNames : undefined,
              isSwallowBuff: swallowSkill && this.swallowBuffType !== 0,
              swallowBuffType: swallowSkill ? this.swallowBuffType : undefined,
              swallowBuffs: swallowSkill && this.swallowBuffType !== 0
                ? [`Swallow buff type: ${this.swallowBuffType}`] : undefined,
              damageMeter: damageMeterSkill ? this.damageMeter ?? undefined : undefined,
              damageMeterValues: damageMeterSkill && this.damageMeter
                ? [`Damage-meter average: ${this.damageMeter.avgDmg}`, `Damage-meter max: ${this.damageMeter.maxDmg}`]
                : undefined,
            } : undefined,
         );
      }
    } else if (this._tooltip) {
      this._tooltip.Hide();
    }
  }

  // OG: Clear hover when mouse leaves the panel
  onMouseLeave(): void {
    if (this._hoverIndex !== -1) {
      this._hoverIndex = -1;
    }
    this._scrollBar.handleMouseLeave();
    this._tooltip?.Hide();
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    // Forward to sub-panels first
    if (this.skillIncPanel.onKeyPress(key)) return true;
    if (this.skillDecPanel.onKeyPress(key)) return true;
    if (this.skillChangeConfirm.onKeyPress(key)) return true;
    if (key === 'Escape') { this.isVisible = false; return true; }
    const tab = this._tabs[this._activeTab] || [];
    if (key === 'PageDown') {
      this._scrollOffset = Math.min(this._scrollOffset + VISIBLE_ROWS, Math.max(0, tab.length - VISIBLE_ROWS));
      this._scrollBar.pos = this._scrollOffset;
      return true;
    }
    if (key === 'PageUp') {
      this._scrollOffset = Math.max(0, this._scrollOffset - VISIBLE_ROWS);
      this._scrollBar.pos = this._scrollOffset;
      return true;
    }
    return false;
  }

  // OG: CUISkill::OnChildNotify — routes tab changes and scrollbar events
  // nId=2000 (tab control), param1=500 (TCN_SELCHANGING), param2=new tab index
  // nId=2001 (scrollbar), param1=300..320 (scroll events)
  onChildNotify(nId: number, param1: number, param2: number): boolean {
    if (nId === 2000 && param1 === 500) {
      // OG: TCN_SELCHANGING — tab is about to change
      this.onTabChanged(param2);
      return true;
    }
    if (nId === 2001 && param1 >= 300 && param1 <= 320) {
      // OG: scrollbar event — full ResetInfo (rebuilds entire display)
      this._scrollOffset = this._scrollBar.pos;
      return true;
    }
    if (nId === 2001 && param1 === 100) {
      // OG: scrollbar click — OnButtonClicked
      return true;
    }
    return false;
  }

  // OG: CUISkill::OnTabChanged — handles tab selection change
  private onTabChanged(newTab: number): void {
    if (newTab < 0 || newTab >= this._tabs.length) return;
    this._activeTab = newTab;
    this._scrollOffset = 0;
    this._scrollBar.pos = 0;
    this._lastClickSkillId = -1;
    this._hoverIndex = -1;
    // OG: Clear tooltip on tab change
    this._tooltip?.Hide();
    // OG: SetScrollBar — range = skillCount - 3
    const tab = this._tabs[this._activeTab] || [];
    this._scrollBar.setRange(Math.max(0, tab.length - 3) + 1);
    // OG: GetRecommendSKill — WZ-driven from Skill.wz/<root>.img/recommend
    this._recommendSkillId = 0;
    if (tab.length > 0 && this.skillService) {
      const rootId = tab[0].id ? Math.floor(tab[0].id / 10000) * 1000 : 0;
      if (rootId > 0) {
        let nSLVSum = 0;
        for (const sk of tab) nSLVSum += sk.level;
        this._recommendSkillId = this.skillService.GetRecommendSkill(rootId, nSLVSum);
      }
      if (!this._recommendSkillId) {
        for (const sk of tab) {
          if (!sk.passive && sk.level > 0 && sk.level < sk.maxLevel) {
            this._recommendSkillId = sk.id;
            break;
          }
        }
      }
    }
  }

}
