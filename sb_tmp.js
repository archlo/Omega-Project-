"use strict";
import { Container, Sprite, Text, TextStyle, Texture } from "pixi.js";
import { GamePanel } from "./GamePanel.js";
import { WzProperty } from "../../wz/WzProperty.js";
import { WzCanvas } from "../../wz/WzCanvas.js";
import { ScrollBar } from "./ScrollBar.js";
import { ItemTooltip } from "./ItemTooltip.js";
import { TooltipAssets } from "./TooltipAssets.js";
import { SkillIncPanel, SkillDecPanel, SkillChangeConfirm } from "./SkillIncDec.js";
const PANEL_W = 174;
const PANEL_H = 281;
const VISIBLE_ROWS = 4;
const ROW_H = 40;
const ROW_START_Y = 112;
const SP_TEXT_Y = 256;
const BOOK_ICON_Y = 55;
const BOOK_NAME_Y = 65;
const TAB_X = 8;
const TAB_Y = 10;
const TAB_W = 154;
const TAB_H = 20;
const TAB_SLOT_W = 30;
const SB_X = 153;
const SB_Y = 93;
const SB_W = 15;
const SB_H = 155;
const SP_BTN_X = 135;
const SP_BTN_Y_START = 113;
const SP_BTN_STEP = 40;
const BT_MACRO_ID = 2023;
const ICON_LEFT = 13;
const ICON_RIGHT = 45;
const ROW_LEFT = 10;
const ROW_RIGHT = 149;
function loadButtonStateSprite(loader, root, state) {
  if (!root || !loader) return null;
  const stateProp = root.Get(state);
  const canvas = stateProp instanceof WzProperty ? stateProp.Get("0") : stateProp;
  if (canvas instanceof WzCanvas) return loader.Load(canvas)?.ToPixi() ?? null;
  return null;
}
function skillLevelUpState(skill, service, findSkill) {
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
export function isIgnoreMasterLevelForCommon(skillId) {
  if (skillId <= 3220010) {
    if (skillId >= 3220009) return true;
    if (skillId === 2120009 || skillId === 1120012 || skillId === 1220013 || skillId === 1320011) return true;
    if (skillId === 2320010 || skillId === 2220009) return true;
    return skillId >= 3120010 && skillId <= 3120011;
  }
  if (skillId === 5220012 || skillId === 4120010 || skillId === 4220009 || skillId === 5120011) return true;
  return skillId === 32120009 || skillId === 33120010;
}
export function isSkillNeedMasterLevel(skillId) {
  if (isIgnoreMasterLevelForCommon(skillId)) return false;
  const job = Math.floor(skillId / 1e4);
  if (Math.floor(job / 100) === 22 || job === 2001) {
    const jl = getJobLevel(job);
    return jl === 9 || jl === 10 || skillId === 22111001 || skillId === 22141002 || skillId === 2214e4;
  }
  if (Math.floor(job / 10) === 43) {
    return getJobLevel(job) === 4 || skillId === 4311003 || skillId === 4314920 || skillId === 4326906 || skillId === 4326909;
  }
  if (job === 100 * Math.floor(job / 100)) return false;
  return job % 10 === 2;
}
export function isNonslotSkill(skillId) {
  if (skillId > 20001067) {
    if (skillId > 30001067) return skillId === 33001002;
    return skillId >= 30001066 || skillId >= 20011066 && skillId <= 20011067;
  }
  if (skillId >= 20001066) return true;
  if (skillId <= 4321e3) return skillId === 4321e3 || skillId >= 1066 && skillId <= 1067;
  return skillId >= 10011066 && skillId <= 10011067;
}
const _titleStyle = new TextStyle({ fill: "#DCC896", fontSize: 11, fontFamily: "monospace" });
const _labelStyle = new TextStyle({ fill: "#CCC", fontSize: 10, fontFamily: "monospace" });
const _valueStyle = new TextStyle({ fill: "#FFF", fontSize: 9, fontFamily: "monospace" });
const _cdStyle = new TextStyle({ fill: "#E06060", fontSize: 8, fontFamily: "monospace" });
const _bonusStyle = new TextStyle({ fill: "#64DC64", fontSize: 9, fontFamily: "monospace" });
const _spCountStyle = new TextStyle({ fill: "#A0A0A0", fontSize: 10, fontFamily: "monospace" });
const _bookNameStyle = new TextStyle({ fill: "#DCC896", fontSize: 11, fontFamily: "monospace" });
const TAB_LABELS = ["Beginner", "1st Job", "2nd Job", "3rd Job", "4th Job"];
const TAB_PREFIXES = [0, 100, 200, 300, 400];
function getSkillRootFromJob(job) {
  const roots = [];
  if (!getJobName(job)) return roots;
  const v2 = Math.floor(job % 1e3 / 100);
  if (v2) {
    const v3 = 100 * (v2 + 10 * Math.floor(job / 1e3));
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
function getJobName(job) {
  if (job <= 0) return null;
  return `job${job}`;
}
function skillRootToTabIndex(root) {
  if (root <= 0) return 0;
  const tabRoot = Math.floor(root / 100);
  for (let i = TAB_PREFIXES.length - 1; i >= 1; i--) {
    if (tabRoot >= TAB_PREFIXES[i]) return i;
  }
  return 0;
}
function explorerSkillDegree(root) {
  if (root <= 0) return 0;
  const suffix = root % 100;
  if (suffix === 0) return 1;
  if (suffix === 10) return 2;
  if (suffix === 11) return 3;
  if (suffix === 12) return 4;
  return 1;
}
function isBeginnerJob(job) {
  return job % 1e3 === 0;
}
function isExtendspJob(job) {
  return Math.floor(job / 1e3) === 3 || Math.floor(job / 100) === 22 || job === 2001;
}
function isDualJob(job) {
  return Math.floor(job / 10) === 43;
}
function getJobLevel(job) {
  if (isBeginnerJob(job) || job === 2001) return 1;
  const v1 = Math.floor(job / 10) === 43 ? (job - 430) / 2 : job % 10;
  const v2 = v1 + 2;
  if (v2 >= 2 && (v2 <= 4 || v2 <= 10 && (Math.floor(job / 100) === 22 || job === 2001))) return v2;
  return 0;
}
function getJobChangeLevel(job, subJob, step) {
  const v3 = Math.floor(job / 1e3);
  if (v3 === 3 || Math.floor(job / 100) === 22 || job === 2001) return 200;
  const isMagician = Math.floor(job / 100) % 10 === 2;
  switch (step) {
    case 1:
      return isMagician ? 8 : 10;
    case 2:
      return 30;
    case 3:
      return 70;
    case 4:
      return 120;
    default:
      return 200;
  }
}
function getNoviceSkillPoint(job, totalSp, spentSp) {
  if (!isBeginnerJob(job)) return 0;
  return Math.max(0, totalSp - spentSp);
}
function isDualJobBorn(job, subJob) {
  return subJob !== 0 && isDualJob(job);
}
function getJobCategory(job) {
  const base = Math.floor(job / 100) % 10;
  if (base === 1) return 0;
  if (base === 2) return 1;
  if (base === 3) return 2;
  if (base === 4) return 3;
  if (base === 5) return 4;
  return 0;
}
export class SkillRow {
  constructor(id, name, level, maxLevel, passive, masterLevel = maxLevel) {
    this.id = id;
    this.name = name;
    this.level = level;
    this.maxLevel = maxLevel;
    this.passive = passive;
    this.masterLevel = masterLevel;
  }
  id;
  name;
  level;
  maxLevel;
  passive;
  masterLevel;
}
export class SkillBook extends GamePanel {
  skillService = null;
  textureLoader = null;
  sp = 0;
  onSkillUp = null;
  onSkillUse = null;
  // OG: CUISkill::OnButtonClicked id 0x7E7 → ShiftMacroUIState
  onMacroOpen = null;
  nameOf = () => "";
  // OG: mSkillRecordEx — equipment-provided skill level bonus per skill id.
  // Returns the bonus (SkillLevel - PureSkillLevel) used for the green "(+N)".
  skillBonusOf = null;
  onDragStart = null;
  // OG: SendSkillUpRequest callback
  onSendSkillUp = null;
  // OG: play_ui_sound(StringPool 0x75E) on drag start
  onDragSound = null;
  _skills = [];
  _tabs = [];
  _activeTab = 0;
  _scrollOffset = 0;
  _lastClickSkillId = -1;
  _lastClickTime = 0;
  _cooldowns = /* @__PURE__ */ new Map();
  // OG: Character state for SP validation
  characterLevel = 0;
  characterJob = 0;
  characterSubJob = 0;
  characterHp = 0;
  // OG: HP check in OnSkillLevelUpButton
  linkedCharacter = "";
  wildHunterMobNames = [];
  swallowBuffType = 0;
  damageMeter = null;
  isAdmin = false;
  // OG: admin/tester/manager bypass
  _lastSkillUpTime = 0;
  // OG: 500ms cooldown between skill up requests
  // OG: ExtendSP — dual-blade extended SP tracking
  _extendSP = [0, 0, 0, 0];
  // ExtendSP::Get(tab)
  // OG: Per-tab SP — beginner SP, job SP, extend SP tracked separately
  _noviceSp = 0;
  // SP for beginner tab (job % 1000 === 0)
  // OG: m_nTabOption — initial tab selection (0=default, 1=skill guide)
  _tabOption = 0;
  // OG: m_bDualRogueSkillWarning — shows warning for dual-blade job change
  _dualRogueSkillWarning = false;
  _resetIncreaseRows = [];
  _resetDecreaseRows = [];
  _resetSelectedDecrease = null;
  _resetSelectedIncrease = null;
  _resetOrigin = { x: 0, y: 0 };
  /**
   * Applies the compact ExtendSP::Decode payload used by Aran/Evan/Cygnus.
   * The wire format is count followed by (job-degree, sp) byte pairs.  The
   * original CUISkillEx indexes this array by the selected tab, so keeping
   * the degree in its native slot is important; deriving SP from row count
   * makes later job tabs appear to have (or lose) points incorrectly.
   */
  setExtendedSp(encoded) {
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
  setSpecialTooltipContext(linkedCharacter, wildHunterMobNames) {
    this.linkedCharacter = linkedCharacter ?? "";
    this.wildHunterMobNames = [...wildHunterMobNames];
  }
  setSwallowBuffType(value) {
    this.swallowBuffType = value;
  }
  setDamageMeterSummary(summary) {
    this.damageMeter = summary;
  }
  _titleText;
  _titleSecond;
  _spText;
  _tabSprites = [];
  // OG: WZ canvas sprites for tab backgrounds
  _tabLabels = [];
  _tabLabelStrings = [...TAB_LABELS];
  _tabKinds = [];
  _isAranJob = false;
  _rowIcons = [];
  _rowNames = [];
  _rowLevels = [];
  _rowCds = [];
  _rowBonuses = [];
  // OG: m_pFontBonus per row
  _rowSpBtns = [];
  _scrollBar;
  _macroBtn;
  // OG: Skill guide — OpenSkillGuide creates CWndSkillGuide (button IDs 3001-3004)
  onSkillGuide = null;
  onSkillResetConfirm = null;
  // OG Draw WZ canvases (from OnCreate @ 0x851520)
  // OG draws m_pCanvasSkill[0]/[1] at EACH row position — need per-row sprites
  _skillSlotNormalTex = null;
  // m_pCanvasSkill[0] — skill0
  _skillSlotEnabledTex = null;
  // m_pCanvasSkill[1] — skill1
  _rowSlotBgs = [];
  // one bg sprite per visible row (4 total)
  _recommendBgTex = null;
  // m_pCanvasRecommendSkill — recommend/0
  _rowRecommendBgs = [];
  // one recommend bg per row
  _lineBgTex = null;
  // m_pCanvasLine — line separator
  _background2 = null;
  _background3 = null;
  _rowLineBgs = [];
  // one line per row (rows 0-2 only)
  _bookIcon = null;
  // pBookIcon — book icon at (15, 55)
  _hoverIndex = -1;
  _recommendSkillId = 0;
  // from GetRecommendSKill
  _tooltip = null;
  _viewW = 1024;
  _viewH = 768;
  _mouseX = 0;
  _mouseY = 0;
  // OG: Tab backgrounds — Tab/disabled/0-4 and Tab/enabled/0-4
  _tabDisabledTex = [];
  _tabEnabledTex = [];
  // OG: Cooldown overlay — CoolTime/0-15 (32x32 each)
  _coolTimeTex = [];
  // OG: CoolTime sprite (drawn at skill icon position)
  _coolTimeSprite = null;
  _rowCoolTimeSprites = [];
  // OG: Aran special tab buttons — Tab/AranButton/Bt1-Bt4
  _aranBtnTex = [];
  _aranBtnDisabledTex = [];
  // OG: Skill-guide launcher buttons (3001-3004) — CLayoutMan::AddButton loads
  // Tab/AranButton/Bt1-4 and positions each on tab-strip slot N (30px slots +
  // 1px spacing). Real buttons (not tabs); clicking one opens CWndSkillGuide(grade).
  _guideBtns = [];
  // OG: DualBlade tab textures — Tab/DualTab/disabled and Tab/DualTab/enabled
  _dualTabDisabledTex = [];
  _dualTabEnabledTex = [];
  // OG: CUISkillInc/Dec/DecEX sub-panels (skill increment/decrement windows)
  skillIncPanel;
  skillDecPanel;
  skillChangeConfirm;
  // OG: CUIWnd position persistence (CreateUIWndPosSaved key 10)
  static _posKey = "SkillBookWndPos";
  constructor(loader, ui, font, icons, descOf, setItemOf, optionOf, itemInfo, strings) {
    super();
    this._root.visible = false;
    try {
      const saved = localStorage.getItem(SkillBook._posKey);
      if (saved) {
        const { x, y } = JSON.parse(saved);
        if (typeof x === "number" && typeof y === "number") {
          this._root.x = x;
          this._root.y = y;
        }
      }
    } catch {
    }
    if (this._root.x === 0 && this._root.y === 0) {
      this._root.x = 190;
      this._root.y = 40;
    }
    if (loader && ui) {
      const skillProp = ui.GetItem("UIWindow2.img/Skill/main");
      const prop = skillProp instanceof WzProperty ? skillProp : null;
      const bgNode = prop?.Get("backgrnd");
      if (bgNode instanceof WzCanvas) {
        const sprite = loader.Load(bgNode)?.ToPixi();
        if (sprite) this._root.addChild(sprite);
      }
      const bg2Node = prop?.Get("backgrnd2");
      if (bg2Node instanceof WzCanvas) {
        this._background2 = loader.Load(bg2Node)?.ToPixi() ?? null;
        if (this._background2) this._root.addChild(this._background2);
      }
      const bg3Node = prop?.Get("backgrnd3");
      if (bg3Node instanceof WzCanvas) {
        this._background3 = loader.Load(bg3Node)?.ToPixi() ?? null;
        if (this._background3) this._root.addChild(this._background3);
      }
      const skill0 = prop?.Get("skill0");
      if (skill0 instanceof WzCanvas) {
        const ws = loader.Load(skill0);
        if (ws) {
          this._skillSlotNormalTex = ws.Texture;
        }
      }
      const skill1 = prop?.Get("skill1");
      if (skill1 instanceof WzCanvas) {
        const ws = loader.Load(skill1);
        if (ws) {
          this._skillSlotEnabledTex = ws.Texture;
        }
      }
      const rec = prop?.Get("recommend");
      if (rec instanceof WzProperty) {
        const rec0 = rec.Get("0");
        if (rec0 instanceof WzCanvas) {
          const ws = loader.Load(rec0);
          if (ws) {
            this._recommendBgTex = ws.Texture;
          }
        }
      }
      const line = prop?.Get("line");
      if (line instanceof WzCanvas) {
        const ws = loader.Load(line);
        if (ws) {
          this._lineBgTex = ws.Texture;
        }
      }
      const bookIcon = prop?.Get("bookIcon");
      if (bookIcon instanceof WzCanvas) {
        const s = loader.Load(bookIcon)?.ToPixi();
        if (s) {
          this._bookIcon = s;
          this._root.addChild(s);
        }
      }
      const tabProp = prop?.Get("Tab");
      if (tabProp instanceof WzProperty) {
        const disabledProp = tabProp.Get("disabled");
        const enabledProp = tabProp.Get("enabled");
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
      const coolProp = prop?.Get("CoolTime");
      if (coolProp instanceof WzProperty) {
        for (let i = 0; i < 16; i++) {
          const frame = coolProp.Get(String(i));
          if (frame instanceof WzCanvas) {
            const ws = loader.Load(frame);
            if (ws) this._coolTimeTex.push(ws.Texture);
          }
        }
      }
      const aranProp = prop?.Get("Tab");
      if (aranProp instanceof WzProperty) {
        const aranBtnProp = aranProp.Get("AranButton");
        if (aranBtnProp instanceof WzProperty) {
          for (let i = 1; i <= 4; i++) {
            const btnProp = aranBtnProp.Get(`Bt${i}`);
            if (btnProp instanceof WzProperty) {
              const normal = loadButtonStateSprite(loader, btnProp, "normal");
              const disabled = loadButtonStateSprite(loader, btnProp, "disabled");
              if (normal) this._aranBtnTex.push(normal.texture);
              if (disabled) this._aranBtnDisabledTex.push(disabled.texture);
            }
          }
        }
      }
      const dualTabProp = prop?.Get("Tab");
      if (dualTabProp instanceof WzProperty) {
        const dualDisabled = dualTabProp.Get("DualTab");
        if (dualDisabled instanceof WzProperty) {
          const dNode = dualDisabled.Get("disabled");
          const eNode = dualDisabled.Get("enabled");
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
    for (let i = 1; i <= 4; i++) {
      const guide = new Container();
      let nPlain = null;
      let hPlain = null;
      let pPlain = null;
      let dPlain = null;
      if (loader && ui) {
        const skillProp = ui.GetItem("UIWindow2.img/Skill/main");
        const aranProp = skillProp instanceof WzProperty ? skillProp.Get("Tab") : null;
        const aranBtnProp = aranProp instanceof WzProperty ? aranProp.Get("AranButton") : null;
        const btnProp = aranBtnProp instanceof WzProperty ? aranBtnProp.Get(`Bt${i}`) : null;
        const root = btnProp instanceof WzProperty ? btnProp : null;
        const mk = (s) => {
          if (!s) return null;
          const plain = new Sprite(s.texture);
          plain.visible = false;
          guide.addChild(plain);
          return plain;
        };
        nPlain = mk(loadButtonStateSprite(loader, root, "normal"));
        hPlain = mk(loadButtonStateSprite(loader, root, "mouseOver"));
        pPlain = mk(loadButtonStateSprite(loader, root, "pressed"));
        dPlain = mk(loadButtonStateSprite(loader, root, "disabled"));
        if (nPlain) nPlain.visible = true;
      }
      guide.position.set(TAB_X + i * (TAB_SLOT_W + 1), TAB_Y);
      guide.visible = false;
      guide.__spBtn = { normal: nPlain, hover: hPlain, pressed: pPlain, disabled: dPlain };
      this._guideBtns.push({ container: guide });
      this._root.addChild(guide);
    }
    for (let i = 0; i < VISIBLE_ROWS; i++) {
      const slotBg = new Sprite(this._skillSlotNormalTex ?? Texture.EMPTY);
      this._rowSlotBgs.push(slotBg);
      this._root.addChild(slotBg);
      const recBg = new Sprite(this._recommendBgTex ?? Texture.EMPTY);
      recBg.visible = false;
      this._rowRecommendBgs.push(recBg);
      this._root.addChild(recBg);
      if (i < 3) {
        const lineBg = new Sprite(this._lineBgTex ?? Texture.EMPTY);
        this._rowLineBgs.push(lineBg);
        this._root.addChild(lineBg);
      }
    }
    this._coolTimeSprite = new Sprite(Texture.EMPTY);
    this._coolTimeSprite.visible = false;
    this._coolTimeSprite.anchor.set(0.5, 0.5);
    this._root.addChild(this._coolTimeSprite);
    this._titleText = new Text({ text: "Skills", style: _titleStyle });
    this._titleText.x = 66;
    this._titleText.y = 5;
    this._root.addChild(this._titleText);
    this._titleSecond = new Text({ text: "", style: _titleStyle });
    this._titleSecond.visible = false;
    this._root.addChild(this._titleSecond);
    this._spText = new Text({ text: "SP: 0", style: new TextStyle({ fill: "#A0A0A0", fontSize: 10, fontFamily: "monospace" }) });
    this._spText.x = PANEL_W - 50;
    this._spText.y = 5;
    this._root.addChild(this._spText);
    for (let i = 0; i < 8; i++) {
      const s = new Sprite(Texture.EMPTY);
      s.visible = false;
      this._tabSprites.push(s);
      this._root.addChild(s);
      const t = new Text({ text: "", style: _labelStyle });
      this._tabLabels.push(t);
      this._root.addChild(t);
      t.visible = false;
    }
    for (let i = 0; i < VISIBLE_ROWS; i++) {
      const icon = new Sprite();
      icon.width = 32;
      icon.height = 32;
      icon.x = ICON_LEFT;
      icon.y = ROW_START_Y + i * ROW_H - 31;
      this._rowIcons.push(icon);
      this._root.addChild(icon);
      const cooldown = new Sprite(Texture.EMPTY);
      cooldown.anchor.set(0.5, 0.5);
      cooldown.visible = false;
      this._rowCoolTimeSprites.push(cooldown);
      this._root.addChild(cooldown);
      const tn = new Text({ text: "", style: _valueStyle });
      this._rowNames.push(tn);
      this._root.addChild(tn);
      const tl = new Text({ text: "", style: _labelStyle });
      this._rowLevels.push(tl);
      this._root.addChild(tl);
      const tcd = new Text({ text: "", style: _cdStyle });
      this._rowCds.push(tcd);
      this._root.addChild(tcd);
      const tBonus = new Text({ text: "", style: _bonusStyle });
      this._rowBonuses.push(tBonus);
      this._root.addChild(tBonus);
      const btn = new Container();
      const btSpUp = loader && ui ? ui.GetItem("UIWindow2.img/Skill/main/BtSpUp") : null;
      const btSpUpRoot = btSpUp instanceof WzProperty ? btSpUp : null;
      if (loader) {
        const n = loadButtonStateSprite(loader, btSpUpRoot, "normal");
        const h = loadButtonStateSprite(loader, btSpUpRoot, "mouseOver");
        const p = loadButtonStateSprite(loader, btSpUpRoot, "pressed");
        const d = loadButtonStateSprite(loader, btSpUpRoot, "disabled");
        if (n) btn.addChild(n);
        if (h) {
          h.visible = false;
          btn.addChild(h);
        }
        if (p) {
          p.visible = false;
          btn.addChild(p);
        }
        if (d) {
          d.visible = false;
          btn.addChild(d);
        }
        btn.__spBtn = { normal: n, hover: h, pressed: p, disabled: d };
      }
      btn.x = SP_BTN_X;
      btn.y = SP_BTN_Y_START + i * SP_BTN_STEP;
      this._rowSpBtns.push(btn);
      this._root.addChild(btn);
    }
    this._scrollBar = new ScrollBar(SB_X, SB_Y, SB_H, (pos) => {
      this._scrollOffset = pos;
    }, { loader: loader ?? void 0, uiWz: ui ?? null, variant: 8 });
    this._root.addChild(this._scrollBar.container);
    this._macroBtn = new Container();
    if (loader) {
      const btMacro = ui ? ui.GetItem("UIWindow2.img/Skill/main/BtMacro") : null;
      const btMacroRoot = btMacro instanceof WzProperty ? btMacro : null;
      const n = loadButtonStateSprite(loader, btMacroRoot, "normal");
      const h = loadButtonStateSprite(loader, btMacroRoot, "mouseOver");
      const p = loadButtonStateSprite(loader, btMacroRoot, "pressed");
      const d = loadButtonStateSprite(loader, btMacroRoot, "disabled");
      if (n) this._macroBtn.addChild(n);
      if (h) {
        h.visible = false;
        this._macroBtn.addChild(h);
      }
      if (p) {
        p.visible = false;
        this._macroBtn.addChild(p);
      }
      if (d) {
        d.visible = false;
        this._macroBtn.addChild(d);
      }
      this._macroBtn.__spBtn = { normal: n, hover: h, pressed: p, disabled: d };
    }
    this._macroBtn.x = 0;
    this._macroBtn.y = 0;
    this._root.addChild(this._macroBtn);
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
      this.skillChangeConfirm.open(
        selected,
        this._resetSelectedDecrease,
        this.characterJob,
        this._resetOrigin.x,
        this._resetOrigin.y
      );
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
      this.skillChangeConfirm.container
    );
    this.createCloseButton(loader, ui, 5, PANEL_W, { x: 153, y: 6 });
    if (font && icons && loader && ui) {
      const assets = new TooltipAssets(loader, ui);
      this._tooltip = new ItemTooltip(
        font,
        icons,
        assets,
        descOf ?? null,
        setItemOf ?? null,
        optionOf ?? null,
        itemInfo ?? null,
        strings ?? null
      );
    }
  }
  get tooltipContainer() {
    return this._tooltip?.root ?? null;
  }
  setViewSize(w, h) {
    this._viewW = w;
    this._viewH = h;
  }
  _getJobLevel(job) {
    return getJobLevel(job);
  }
  /** OG: CWvsContext::GetSkillLevelUpState — 0/1/-1 state for this skill. */
  getSkillLevelUpState(skill) {
    return skillLevelUpState(skill, this.skillService, (id) => this._findSkill(id));
  }
  /** OG: CCtrlButton sprite-state swap (normal/mouseOver/pressed/disabled). */
  _setBtnState(container, state) {
    const states = container.__spBtn;
    if (!states) return;
    for (const key of ["normal", "hover", "pressed", "disabled"]) {
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
  _refreshGuideButtons(numTabs) {
    for (let g = 0; g < this._guideBtns.length; g++) {
      const btn = this._guideBtns[g];
      const slot = g + 1;
      const show = this._isAranJob && slot >= numTabs && slot < 5;
      if (btn.container.visible !== show) {
        btn.container.visible = show;
        if (show) {
          btn.container.position.set(TAB_X + slot * (TAB_SLOT_W + 1), TAB_Y);
          this._setBtnState(btn.container, "normal");
        }
      }
    }
  }
  activeSkillGuideGrade() {
    return Math.max(1, Math.min(4, this._activeTab + 1));
  }
  _getJobChangeLevel(job, step) {
    return getJobChangeLevel(job, this.characterSubJob, step);
  }
  _getMaxSkillDegreeSP(job, degree) {
    const nextLevel = getJobChangeLevel(job, this.characterSubJob, degree + 1);
    const curLevel = getJobChangeLevel(job, this.characterSubJob, degree);
    const diff = nextLevel - curLevel;
    if (diff <= 0) return 0;
    return 3 * diff + (degree === 4 ? 3 : 1);
  }
  // OG: GetMySkillDegreeSP — sum of skill levels in given degree
  _getMySkillDegreeSP(degree) {
    let sum = 0;
    for (const sk of this._skills) {
      const job = Math.floor(sk.id / 1e4);
      const dl = getJobLevel(job);
      if (!isBeginnerJob(job) && job !== 2001 && dl === degree) {
        sum += sk.level;
      }
    }
    return sum;
  }
  // OG: GetMySkillDegreeSPDualJob — sum of skill levels in dual-job degree
  _getMySkillDegreeSPDualJob(degree) {
    const jobs = this._dualJobCodes(degree);
    let sum = 0;
    for (const sk of this._skills) {
      const job = Math.floor(sk.id / 1e4);
      if (jobs.includes(job)) sum += sk.level;
    }
    return sum;
  }
  // OG: GetMaxSkillDegreeSPDualJob — SP cap for dual-job degree (returns [cap1,cap2,cap3])
  _dualJobCodes(degree) {
    if (degree <= 0) return [400, 430];
    if (degree === 1) return [431];
    if (degree <= 3) return [432, 433];
    if (degree === 4) return [434];
    return [];
  }
  _dualJobChangeLevel(step) {
    switch (step) {
      case 400:
        return 10;
      case 430:
        return 20;
      case 431:
        return 30;
      case 432:
        return 55;
      case 433:
        return 70;
      case 434:
        return 120;
      default:
        return 200;
    }
  }
  // OG returns max SP, job SP, and special/master-level SP.
  _getMaxSkillDegreeSPDualJob(degree) {
    let low = 0;
    let high = 0;
    let jobSp = 0;
    if (degree <= 0) {
      low = 400;
      high = 430;
      jobSp = 1;
    } else if (degree === 1) {
      low = 431;
      high = 431;
      jobSp = 1;
    } else if (degree <= 3) {
      low = 432;
      high = 433;
      jobSp = this.characterLevel >= 70 ? 1 : 0;
    } else if (degree === 4) {
      low = 434;
      high = 434;
      jobSp = 3;
    }
    const maxSp = high > 0 ? 3 * (this._dualJobChangeLevel(high + 1) - this._dualJobChangeLevel(low)) : 0;
    const specialSp = this._skills.filter((sk) => this._dualJobCodes(degree).includes(Math.floor(sk.id / 1e4))).filter((sk) => sk.masterLevel > sk.maxLevel && sk.level > sk.maxLevel).length;
    return [maxSp, jobSp, specialSp];
  }
  // OG: Find skill by ID across all tabs
  _findSkill(skillId) {
    for (const tab of this._tabs) {
      for (const sk of tab) {
        if (sk.id === skillId) return sk;
      }
    }
    return null;
  }
  // OG: CUISkill::CanSkillUp (0x84a930) — full SP validation
  canSkillUp(skillId) {
    const job = Math.floor(skillId / 1e4);
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
    const mySP = this._getMySkillDegreeSP(jobLevel);
    const lvl = this.characterLevel;
    switch (jobLevel) {
      case 2:
        return mySP < 3 * lvl - 89;
      case 3:
        return mySP < 3 * lvl - 209;
      case 4:
        return mySP < 3 * (lvl - 119);
      default:
        return true;
    }
  }
  // OG: CUISkill::CanSkillUpDualJob (0x84ae10) — dual-job SP validation
  canSkillUpDualJob(skillId) {
    const job = Math.floor(skillId / 1e4);
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
      const [maxSp2, jobSp2] = this._getMaxSkillDegreeSPDualJob(prior);
      priorSpent += this._getMySkillDegreeSPDualJob(prior);
      priorCap += maxSp2 + jobSp2;
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
  getTabSp() {
    if (this._activeTab === 0) {
      return getNoviceSkillPoint(this.characterJob, this.sp, this._noviceSp);
    }
    if (isExtendspJob(this.characterJob)) {
      return this._extendSP[this._activeTab] ?? 0;
    }
    return this.sp;
  }
  // OG: OnSkillLevelUpButton (0x84d660) — full SP allocation with validation
  // Returns true if skill was leveled up, false if blocked
  onSkillLevelUp(skillId) {
    const job = Math.floor(skillId / 1e4);
    if (this.isAdmin) {
      const tabSp2 = this.getTabSp();
      if (tabSp2 <= 0) return false;
      this.onSendSkillUp?.(skillId);
      this.onSkillUp?.(skillId);
      return true;
    }
    const now = performance.now();
    if (now - this._lastSkillUpTime < 500) return false;
    this._lastSkillUpTime = now;
    if (this.characterHp <= 0) return false;
    const tabSp = this.getTabSp();
    if (tabSp <= 0) return false;
    const info = this.skillService?.Get(skillId);
    if (info?.UpButtonDisabled) return false;
    if (info && info.MaxLevel > 0) {
      const sk = this._findSkill(skillId);
      if (sk && sk.level >= (sk.masterLevel > 0 ? sk.masterLevel : info.MaxLevel)) return false;
    }
    if (isBeginnerJob(job) || isExtendspJob(job)) {
    } else if (isDualJob(job)) {
      if (!this.canSkillUpDualJob(skillId)) return false;
    } else {
      if (!this.canSkillUp(skillId)) return false;
    }
    this.onSendSkillUp?.(skillId);
    this.onSkillUp?.(skillId);
    return true;
  }
  setSkills(skills) {
    this._skills = skills;
    this.rebuildTabs();
  }
  /** Opens the OG three-step SP reset wizard with caller-provided candidates. */
  openSkillReset(decrease, increase, x = this._root.x, y = this._root.y) {
    const toResetRow = (row) => ({
      id: row.id,
      name: row.name,
      level: row.level,
      maxLevel: row.masterLevel > 0 ? row.masterLevel : row.maxLevel,
      icon: this.skillService?.Get(row.id)?.Icon1 ?? this.skillService?.Get(row.id)?.Icon0 ?? void 0
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
  setSkillRecords(records) {
    const byId = new Map(records.map((record) => [record.skillId, record]));
    const roots = this._skillRootsForJob(this.characterJob, records.map((record) => record.skillId));
    const ids = /* @__PURE__ */ new Set();
    for (const root of roots) {
      for (const skillId of this.skillService?.EnumerateSkillIds(root) ?? []) ids.add(skillId);
    }
    for (const record of records) ids.add(record.skillId);
    const rows = [];
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
        record?.masterLevel ?? info?.DefaultMasterLev ?? maxLevel
      ));
    }
    this.setSkills(rows);
  }
  _skillRootsForJob(job, knownSkillIds) {
    const roots = /* @__PURE__ */ new Set();
    const addJobRoots = (value) => {
      if (value <= 0) return;
      const tier = Math.floor(value % 1e3 / 100);
      if (tier > 0) {
        const base = 100 * (tier + 10 * Math.floor(value / 1e3));
        roots.add(base);
        const branch = Math.floor(value % 100 / 10);
        if (branch > 0) {
          const branchRoot = base + 10 * branch;
          roots.add(branchRoot);
          for (let i = 1; i <= 8 && value % 10 >= i; i++) roots.add(branchRoot + i);
        }
      }
      if (value >= 2e3 || Math.floor(value / 10) === 43) roots.add(value);
    };
    addJobRoots(job);
    for (const skillId of knownSkillIds) addJobRoots(Math.floor(skillId / 1e4));
    if (Math.floor(job / 100) === 22 || job === 2001) roots.add(2001);
    else roots.add(1e3 * Math.floor(job / 1e3));
    return Array.from(roots).sort((a, b) => a - b);
  }
  rebuildTabs() {
    const tabs = [];
    const labels = [...TAB_LABELS];
    for (let i = 0; i < TAB_PREFIXES.length; i++) tabs.push([]);
    let hasAran = false, hasDual = false;
    for (const sk of this._skills) {
      const jobRoot = Math.floor(sk.id / 1e4);
      if (Math.floor(jobRoot / 10) === 43) hasDual = true;
      if (jobRoot === 2e3 || jobRoot >= 2100 && jobRoot < 2200) hasAran = true;
    }
    if (hasDual) {
      labels.push(...new Array(7).fill(""));
      tabs.push(...new Array(7).fill(null).map(() => []));
    }
    const dualBase = TAB_PREFIXES.length;
    const aranBase = dualBase + (hasDual ? 7 : 0);
    for (const sk of this._skills) {
      const jobRoot = Math.floor(sk.id / 1e4);
      let tabIdx = 0;
      if (Math.floor(jobRoot / 10) === 43) {
        tabIdx = dualBase + Math.max(0, Math.min(6, jobRoot % 10));
      } else if (jobRoot === 2e3 || jobRoot >= 2100 && jobRoot < 2200) {
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
      ...new Array(regularCount).fill("regular"),
      ...hasDual ? new Array(7).fill("dual") : [],
      ...hasAran ? [] : []
    ];
    this._isAranJob = hasAran;
    const tab = this._tabs[this._activeTab] || [];
    this._scrollBar.setRange(Math.max(0, tab.length - 3) + 1);
    this._recommendSkillId = 0;
    if (tab.length > 0 && this.skillService) {
      const rootId = tab[0].id ? Math.floor(tab[0].id / 1e4) * 1e3 : 0;
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
  startCooldown(skillId, totalSeconds) {
    this._cooldowns.set(skillId, {
      skillId,
      remaining: totalSeconds,
      total: totalSeconds,
      coolFrame: 0,
      coolFrameTimer: 0
    });
  }
  clearCooldown(skillId) {
    this._cooldowns.delete(skillId);
  }
  cooldownOf(skillId) {
    const cd = this._cooldowns.get(skillId);
    return cd ? { remain: cd.remaining, total: cd.total } : null;
  }
  update(_dt) {
    if (!this.isVisible) return;
    for (const [id, cd] of this._cooldowns) {
      cd.remaining -= _dt;
      if (this._coolTimeTex.length > 0) {
        cd.coolFrameTimer += _dt;
        if (cd.coolFrameTimer >= 0.08) {
          cd.coolFrameTimer = 0;
          cd.coolFrame = (cd.coolFrame + 1) % this._coolTimeTex.length;
        }
      }
      if (cd.remaining <= 0) this._cooldowns.delete(id);
    }
    const tab = this._tabs[this._activeTab] || [];
    if (this.skillService && this._activeTab < this._tabs.length) {
      const rootId = this._tabs[this._activeTab]?.[0]?.id ? Math.floor(this._tabs[this._activeTab][0].id / 1e4) * 1e3 : 0;
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
    const tabSp = this.getTabSp();
    this._spText.text = `${tabSp}`;
    this._spText.style = new TextStyle({
      fill: tabSp > 0 ? "#FFFFFF" : "#A0A0A0",
      fontSize: 10,
      fontFamily: "monospace"
    });
    this._spText.x = 104 - this._spText.width;
    this._spText.y = SP_TEXT_Y;
    let bookName = this._tabLabelStrings[this._activeTab] ?? "";
    if (this.skillService && this._activeTab < this._tabs.length) {
      const rootId = this._tabs[this._activeTab]?.[0]?.id ? Math.floor(this._tabs[this._activeTab][0].id / 1e4) * 1e3 : 0;
      if (rootId > 0) {
        const wzName = this.skillService.GetBookName(rootId);
        if (wzName) bookName = wzName;
      }
    }
    this._titleText.text = bookName;
    this._titleSecond.text = "";
    this._titleSecond.visible = false;
    const bookNameWidth = this._titleText.width;
    if (bookNameWidth < 110) {
      this._titleText.x = 104 - bookNameWidth / 2;
      this._titleText.y = 65;
    } else {
      const splitIdx = bookName.lastIndexOf(" ", 12);
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
    for (let i = 0; i < VISIBLE_ROWS; i++) {
      const abs = this._scrollOffset + i;
      const sk = abs < tab.length ? tab[abs] : null;
      const nTop = ROW_START_Y + i * ROW_H;
      const isHovered = i === this._hoverIndex;
      if (sk) {
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
        const rowIcon = this._rowIcons[i];
        const info = this.skillService?.Get(sk.id);
        if (rowIcon) {
          rowIcon.texture = Texture.EMPTY;
          const iconCanvas = reqsMet ? isHovered ? info?.Icon2 ?? info?.Icon1 ?? info?.Icon0 : info?.Icon1 ?? info?.Icon0 ?? info?.Icon : info?.Icon0 ?? info?.Icon;
          if (iconCanvas) {
            const ws = this.textureLoader?.Load(iconCanvas);
            if (ws?.Texture) rowIcon.texture = ws.Texture;
          }
          rowIcon.x = 12;
          rowIcon.y = nTop - 17;
        }
        const recBg = this._rowRecommendBgs[i];
        if (sk.id === this._recommendSkillId && this._recommendBgTex) {
          recBg.texture = this._recommendBgTex;
          recBg.position.set(47, nTop - 19);
          recBg.visible = true;
        } else {
          recBg.visible = false;
        }
        const rawName = sk.name;
        this._rowNames[i].text = rawName;
        if (this._rowNames[i].width > 95) {
          let truncated = rawName;
          while (truncated.length > 1 && this._rowNames[i].width > 92) {
            truncated = truncated.slice(0, -1);
            this._rowNames[i].text = truncated + "\u2026";
          }
        }
        this._rowNames[i].x = 50;
        this._rowNames[i].y = nTop - 18;
        const effectiveMasterLevel = sk.masterLevel > 0 ? sk.masterLevel : sk.maxLevel;
        const skillBonus = this.skillBonusOf ? this.skillBonusOf(sk.id) ?? 0 : 0;
        const effLevel = sk.level + skillBonus;
        this._rowLevels[i].text = `${effLevel}/${effectiveMasterLevel}`;
        this._rowLevels[i].x = 50;
        this._rowLevels[i].y = nTop;
        this._rowLevels[i].style = skillBonus > 0 ? _bonusStyle : new TextStyle({
          fill: sk.level >= sk.maxLevel ? "#C8B450" : "#A0C8A0",
          fontSize: 9,
          fontFamily: "monospace"
        });
        const cd = this._cooldowns.get(sk.id);
        if (cd) {
          this._rowCds[i].text = `${Math.ceil(cd.remaining)}s`;
          this._rowCds[i].x = PANEL_W - 44;
          this._rowCds[i].y = nTop;
          if (this._coolTimeTex.length > 0 && this._coolTimeSprite) {
            const cooldown = this._rowCoolTimeSprites[i];
            cooldown.texture = this._coolTimeTex[cd.coolFrame % this._coolTimeTex.length];
            cooldown.position.set(28, nTop - 1);
            cooldown.visible = true;
          }
        } else {
          this._rowCds[i].text = "";
          this._rowCoolTimeSprites[i].visible = false;
        }
        if (skillBonus > 0) {
          this._rowBonuses[i].text = `+${skillBonus}`;
          this._rowBonuses[i].x = 65;
          this._rowBonuses[i].y = nTop;
          this._rowBonuses[i].visible = true;
        } else {
          this._rowBonuses[i].text = "";
          this._rowBonuses[i].visible = false;
        }
        if (i < 3 && this._lineBgTex) {
          const lineBg = this._rowLineBgs[i];
          lineBg.texture = this._lineBgTex;
          lineBg.position.set(10, nTop + 18);
          lineBg.visible = true;
        }
        const btnEnabled = state === 1 && tabSp > 0 && !info?.UpButtonDisabled;
        this._rowSpBtns[i].visible = true;
        this._setBtnState(this._rowSpBtns[i], btnEnabled ? isHovered ? "hover" : "normal" : "disabled");
      } else {
        this._rowSlotBgs[i].visible = false;
        this._rowRecommendBgs[i].visible = false;
        if (this._rowIcons[i]) this._rowIcons[i].texture = Texture.EMPTY;
        this._rowNames[i].text = "";
        this._rowLevels[i].text = "";
        this._rowCds[i].text = "";
        this._rowCoolTimeSprites[i].visible = false;
        this._rowBonuses[i].text = "";
        this._rowBonuses[i].visible = false;
        this._rowSpBtns[i].visible = false;
        if (i < 3) this._rowLineBgs[i].visible = false;
      }
    }
    const numTabs = this._tabs.length;
    const tabSpacing = 1;
    const regularImages = Math.max(1, this._tabEnabledTex.length, this._tabDisabledTex.length);
    const dualImages = Math.max(1, this._dualTabEnabledTex.length, this._dualTabDisabledTex.length);
    for (let i = 0; i < this._tabSprites.length; i++) {
      const isActive = i === this._activeTab;
      const tx = TAB_X + i * (TAB_SLOT_W + tabSpacing);
      this._tabSprites[i].visible = i < numTabs;
      this._tabLabels[i].visible = i < numTabs;
      if (i >= numTabs) continue;
      const kind = this._tabKinds[i] ?? "regular";
      const regularCount = this._tabKinds.filter((value) => value === "regular").length;
      const dualCount = this._tabKinds.filter((value) => value === "dual").length;
      const specialIndex = kind === "dual" ? i - regularCount : i - regularCount - dualCount;
      const regIdx = regularCount > 0 ? i % regularImages : i % regularImages;
      const specIdx = Math.max(0, specialIndex) % Math.max(1, kind === "dual" ? dualImages : regularImages);
      const tabTex = kind === "dual" ? isActive ? this._dualTabEnabledTex[specIdx] : this._dualTabDisabledTex[specIdx] : kind === "aran" ? isActive ? this._aranBtnTex[specIdx] : this._aranBtnDisabledTex[specIdx] : isActive ? this._tabEnabledTex[regIdx] ?? this._tabEnabledTex[0] ?? null : this._tabDisabledTex[regIdx] ?? this._tabDisabledTex[0] ?? null;
      if (tabTex) {
        this._tabSprites[i].texture = tabTex;
        this._tabSprites[i].position.set(tx, TAB_Y);
      }
      this._tabLabels[i].visible = !tabTex;
      this._tabLabels[i].text = this._tabLabelStrings[i] ?? "";
      this._tabLabels[i].anchor.set(0.5, 0);
      this._tabLabels[i].x = tx + TAB_SLOT_W / 2;
      this._tabLabels[i].y = TAB_Y + 4;
      this._tabLabels[i].style = new TextStyle({
        fill: isActive ? "#FFFFFF" : "#888888",
        fontSize: 9,
        fontFamily: "monospace"
      });
    }
    this._refreshGuideButtons(numTabs);
    this.skillIncPanel.update(_dt);
    this.skillDecPanel.update(_dt);
    this.skillChangeConfirm.update(_dt);
    try {
      localStorage.setItem(SkillBook._posKey, JSON.stringify({ x: this._root.x, y: this._root.y }));
    } catch {
    }
  }
  // OG: GetSkillIndexFromPoint — hit testing (v10 starts at 127, step 40)
  _getSkillIndexFromPoint(lx, ly, bIcon) {
    const tab = this._tabs[this._activeTab] || [];
    let v10 = 127;
    for (let i = this._scrollOffset; i < tab.length; i++) {
      let left, top, right, bottom;
      if (bIcon) {
        left = 13;
        top = v10 - 31;
        right = 45;
        bottom = v10 + 1;
      } else {
        left = 10;
        top = v10 - 34;
        right = 149;
        bottom = v10;
      }
      if (lx >= left && lx < right && ly >= top && ly < bottom) {
        return i - this._scrollOffset;
      }
      v10 += 40;
      if (v10 >= 287) break;
    }
    return -1;
  }
  handleMouseButton(x, y, down) {
    if (!this.isVisible) return false;
    if (this.skillIncPanel.handleMouseButton(x, y, down)) return true;
    if (this.skillDecPanel.handleMouseButton(x, y, down)) return true;
    if (this.skillChangeConfirm.handleMouseButton(x, y, down)) return true;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    const sbx = lx - SB_X;
    const sby = ly - SB_Y;
    if (sbx >= 0 && sbx < SB_W && sby >= 0 && sby < SB_H) {
      if (this._scrollBar.handleMouseButton(sbx, sby, down)) return true;
    }
    if (!down) return true;
    if (lx >= 153 && lx < 153 + 14 && ly >= 6 && ly < 6 + 14) {
      this.isVisible = false;
      return true;
    }
    if (lx >= 117 && lx < 117 + 49 && ly >= 255 && ly < 255 + 18) {
      this.onMacroOpen?.();
      return true;
    }
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
    for (let i = 0; i < this._tabs.length; i++) {
      const tx = TAB_X + i * (TAB_SLOT_W + 1);
      if (lx >= tx && lx < tx + TAB_SLOT_W && ly >= TAB_Y && ly < TAB_Y + TAB_H) {
        this.onTabChanged(i);
        return true;
      }
    }
    const tab = this._tabs[this._activeTab] || [];
    for (let i = 0; i < VISIBLE_ROWS; i++) {
      const btn = this._rowSpBtns[i];
      if (!btn.visible) continue;
      if (lx >= btn.x && lx < btn.x + 16 && ly >= btn.y && ly < btn.y + 14) {
        const abs = this._scrollOffset + i;
        if (abs < tab.length) {
          const sk = tab[abs];
          this.onSkillLevelUp(sk.id);
        }
        return true;
      }
    }
    const iconIdx = this._getSkillIndexFromPoint(lx, ly, true);
    if (iconIdx >= 0) {
      const abs = this._scrollOffset + iconIdx;
      if (abs < tab.length) {
        const sk = tab[abs];
        const jobType = Math.floor(sk.id / 1e3) % 10;
        if (jobType !== 0 && jobType !== 9 && !isNonslotSkill(sk.id) && sk.level > 0) {
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
  onMouseMove(x, y) {
    this._mouseX = x;
    this._mouseY = y;
    if (!this.isVisible) return;
    this.skillIncPanel.onMouseMove(x, y);
    this.skillDecPanel.onMouseMove(x, y);
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    const sbx = lx - SB_X;
    const sby = ly - SB_Y;
    if (sbx >= 0 && sbx < SB_W && sby >= 0 && sby < SB_H) {
      this._scrollBar.handleMouseMove(sbx, sby);
    } else {
      this._scrollBar.handleMouseLeave();
    }
    const hoverIdx = this._getSkillIndexFromPoint(lx, ly, false);
    if (hoverIdx !== this._hoverIndex) {
      this._hoverIndex = hoverIdx;
    }
    for (let g = 0; g < this._guideBtns.length; g++) {
      const btn = this._guideBtns[g];
      if (!btn.container.visible) continue;
      const bx = btn.container.x;
      const by = btn.container.y;
      const hovered = lx >= bx && lx < bx + TAB_SLOT_W && ly >= by && ly < by + 18;
      this._setBtnState(btn.container, hovered ? "hover" : "normal");
    }
    if (this._hoverIndex >= 0 && this._tooltip) {
      const tab = this._tabs[this._activeTab] || [];
      const skill = tab[this._scrollOffset + this._hoverIndex];
      if (skill) {
        const info = this.skillService?.Get(skill.id);
        const reqSkills = info ? Array.from(info.RequiredSkills.entries()).map(([requiredId, level]) => {
          const requiredInfo = this.skillService?.Get(requiredId);
          return {
            name: requiredInfo?.Name || this.nameOf(requiredId) || `Skill ${requiredId}`,
            level,
            skillId: requiredId,
            icon: requiredInfo ? this.textureLoader?.Load(requiredInfo.Icon1 ?? requiredInfo.Icon0 ?? requiredInfo.Icon ?? null) ?? void 0 : void 0
          };
        }) : [];
        const linkedSkill = skill.id === 12 || skill.id === 10000012 || skill.id === 20000012 || skill.id === 20010012 || skill.id === 30000012;
        const wildHunterSkill = skill.id === 30001061 || skill.id === 30001062;
        const swallowSkill = skill.id === 33101006;
        const damageMeterSkill = skill.id === 1006 || skill.id === 10001006 || skill.id === 20001006 || skill.id === 20011006 || skill.id === 30001006;
        this._tooltip.DrawSkillTooltip(
          skill.id,
          skill.name,
          info?.Description || this.nameOf(skill.id),
          skill.level,
          skill.masterLevel > 0 ? skill.masterLevel : skill.maxLevel,
          info?.LevelDescriptionAt(skill.level) ?? "",
          info?.LevelDescriptionAt(skill.level + 1) ?? "",
          reqSkills,
          this._mouseX,
          this._mouseY + 20,
          this._viewW,
          this._viewH,
          true,
          info ? {
            // SkillInfoService currently provides these fields directly.
            masterLevel: info.DefaultMasterLev > 0 ? info.DefaultMasterLev : void 0,
            icon: this._rowIcons[this._hoverIndex] ?? void 0,
            linkedCharName: linkedSkill && this.linkedCharacter ? this.linkedCharacter : void 0,
            wildHunterValues: wildHunterSkill ? this.wildHunterMobNames : void 0,
            isSwallowBuff: swallowSkill && this.swallowBuffType !== 0,
            swallowBuffType: swallowSkill ? this.swallowBuffType : void 0,
            swallowBuffs: swallowSkill && this.swallowBuffType !== 0 ? [`Swallow buff type: ${this.swallowBuffType}`] : void 0,
            damageMeter: damageMeterSkill ? this.damageMeter ?? void 0 : void 0,
            damageMeterValues: damageMeterSkill && this.damageMeter ? [`Damage-meter average: ${this.damageMeter.avgDmg}`, `Damage-meter max: ${this.damageMeter.maxDmg}`] : void 0
          } : void 0
        );
      }
    } else if (this._tooltip) {
      this._tooltip.Hide();
    }
  }
  // OG: Clear hover when mouse leaves the panel
  onMouseLeave() {
    if (this._hoverIndex !== -1) {
      this._hoverIndex = -1;
    }
    this._scrollBar.handleMouseLeave();
    this._tooltip?.Hide();
  }
  onKeyPress(key) {
    if (!this.isVisible) return false;
    if (this.skillIncPanel.onKeyPress(key)) return true;
    if (this.skillDecPanel.onKeyPress(key)) return true;
    if (this.skillChangeConfirm.onKeyPress(key)) return true;
    if (key === "Escape") {
      this.isVisible = false;
      return true;
    }
    const tab = this._tabs[this._activeTab] || [];
    if (key === "PageDown") {
      this._scrollOffset = Math.min(this._scrollOffset + VISIBLE_ROWS, Math.max(0, tab.length - VISIBLE_ROWS));
      this._scrollBar.pos = this._scrollOffset;
      return true;
    }
    if (key === "PageUp") {
      this._scrollOffset = Math.max(0, this._scrollOffset - VISIBLE_ROWS);
      this._scrollBar.pos = this._scrollOffset;
      return true;
    }
    return false;
  }
  // OG: CUISkill::OnChildNotify — routes tab changes and scrollbar events
  // nId=2000 (tab control), param1=500 (TCN_SELCHANGING), param2=new tab index
  // nId=2001 (scrollbar), param1=300..320 (scroll events)
  onChildNotify(nId, param1, param2) {
    if (nId === 2e3 && param1 === 500) {
      this.onTabChanged(param2);
      return true;
    }
    if (nId === 2001 && param1 >= 300 && param1 <= 320) {
      this._scrollOffset = this._scrollBar.pos;
      return true;
    }
    if (nId === 2001 && param1 === 100) {
      return true;
    }
    return false;
  }
  // OG: CUISkill::OnTabChanged — handles tab selection change
  onTabChanged(newTab) {
    if (newTab < 0 || newTab >= this._tabs.length) return;
    this._activeTab = newTab;
    this._scrollOffset = 0;
    this._scrollBar.pos = 0;
    this._lastClickSkillId = -1;
    this._hoverIndex = -1;
    this._tooltip?.Hide();
    const tab = this._tabs[this._activeTab] || [];
    this._scrollBar.setRange(Math.max(0, tab.length - 3) + 1);
    this._recommendSkillId = 0;
    if (tab.length > 0 && this.skillService) {
      const rootId = tab[0].id ? Math.floor(tab[0].id / 1e4) * 1e3 : 0;
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
