import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { ScrollBar } from './ScrollBar.js';
import { CharLook } from '../../character/CharLook.js';
import { PetLook } from '../../character/PetLook.js';
import { NpcLook } from '../../character/NpcLook.js';
import { AvatarLook } from '../../domain/AvatarLook.js';

// OG: CUtilDlgEx — universal modal dialog (3152 bytes, 71 fields).
// WZ: UI/UIWindow2.img/UtilDlgEx

// ─── Dialog types (OG m_dlgType) ──────────────────────────────────────────
export enum UtilDlgType {
  TEXT     = 0,
  YESNO    = 1,
  INPUT    = 2,
  INPUT_STR= 3,
  LIST     = 4,
  AVATAR   = 5,
  PET      = 6,
  COMBOBOX = 7,
  MLINPUT  = 8,
  IMAGE    = 9,
}

// ─── CT_INFO ───────────────────────────────────────────────────────────────
export interface CtInfo {
  nType: number;      // 0=text, 1=icon, 2=icon2, 3=func, 4=dot
  nItemNo: number;
  nLine: number;
  pFont: number;      // font index 0-11
  sText: string;
  pIcon: number;
  nLeft: number;
  nTop: number;
  nWidth: number;
  nHeight: number;
  nSelect: number;    // -1=none
  nUnderLine: number;
  bLineChange: number;
  nFuncCode: number;
  bReward: number;
  nNpcNo: number;
  nMapNo: number;
  _iconPath?: string; // WZ path for icon nodes (nType=1/2)
}

// ─── PET_INFO (20 bytes) ──────────────────────────────────────────────────
export interface PetInfo {
  dwTempletID: number;
  sName: string;
  nLevel: number;
  nTameness: number;
  bIsDead: number;
}

// ─── OG Font colors from ctor (m_apFont[0..11]) ──────────────────────────
const FONT_COLORS = [
  0x555555, 0x555555, 0xFF0000, 0xFF0000,
  0x00FF00, 0x00FF00, 0x0000FF, 0x0000FF,
  0xFFFFFF, 0xFFFFFF, 0x51378C, 0x51378C,
];

// ─── OG StringPool IDs for buttons ────────────────────────────────────────
const SP_PREV   = 0x8FB;
const SP_NEXT   = 0x8FC;
const SP_OK     = 0x8FD;
const SP_CANCEL = 0x8FF;
const SP_YES    = 0x900;
const SP_NO     = 0x901;
const SP_SELECT = 0x902;
const SP_QUEST_YES = 0xCD7;
const SP_QUEST_NO  = 0xCD8;

// ─── OG helper functions ──────────────────────────────────────────────────
function getWndWidth(dlgType: UtilDlgType, bNoNPC: boolean): number {
  switch (dlgType) {
    case UtilDlgType.TEXT: case UtilDlgType.YESNO:
    case UtilDlgType.INPUT: case UtilDlgType.INPUT_STR:
    case UtilDlgType.LIST: case UtilDlgType.COMBOBOX:
    case UtilDlgType.MLINPUT:
      return bNoNPC ? 260 : 519;
    case UtilDlgType.AVATAR: case UtilDlgType.PET: return 367;
    case UtilDlgType.IMAGE: return 418;
    default: return 0;
  }
}

function getWndHeight(dlgType: UtilDlgType): number {
  if (dlgType === UtilDlgType.AVATAR || dlgType === UtilDlgType.PET) return 259;
  if (dlgType === UtilDlgType.IMAGE) return 348;
  return 0;
}

function getCTHeightMax(dlgType: UtilDlgType): number {
  switch (dlgType) {
    case UtilDlgType.TEXT: case UtilDlgType.YESNO: case UtilDlgType.LIST: return 240;
    case UtilDlgType.INPUT: case UtilDlgType.INPUT_STR:
    case UtilDlgType.COMBOBOX: case UtilDlgType.MLINPUT: return 0x7FFFFFFF;
    case UtilDlgType.AVATAR: case UtilDlgType.PET: return 70;
    case UtilDlgType.IMAGE: return 300;
    default: return 0;
  }
}

function getCTHeightMin(dlgType: UtilDlgType, bNoNPC: boolean): number {
  if (dlgType === UtilDlgType.IMAGE) return 300;
  return bNoNPC ? 0 : 110;
}

// OG: GetBasicCTWidth @0x97ADD0 — fixed content widths per dialog type, NOT
// windowWidth - 4. 0/1/4: 210 (noNPC) / 341; 2/3/7: 236 / 340; 5/6: 250; 9: 400.
function getBasicCTWidth(dlgType: UtilDlgType, bNoNPC: boolean): number {
  switch (dlgType) {
    case UtilDlgType.TEXT: case UtilDlgType.YESNO: case UtilDlgType.LIST:
      return bNoNPC ? 210 : 341;
    case UtilDlgType.INPUT: case UtilDlgType.INPUT_STR: case UtilDlgType.COMBOBOX:
      return bNoNPC ? 236 : 340;
    case UtilDlgType.AVATAR: case UtilDlgType.PET: return 250;
    case UtilDlgType.IMAGE: return 400;
    default: return 0;
  }
}

function getBasicCTMargin(dlgType: UtilDlgType): number {
  switch (dlgType) {
    case UtilDlgType.INPUT: case UtilDlgType.INPUT_STR:
    case UtilDlgType.COMBOBOX: case UtilDlgType.MLINPUT: return 2;
    case UtilDlgType.TEXT: case UtilDlgType.YESNO: case UtilDlgType.LIST:
    case UtilDlgType.AVATAR: case UtilDlgType.PET: case UtilDlgType.IMAGE: return 8;
    default: return 0;
  }
}

// OG: static dialog list
const _activeDialogs: UtilDlgEx[] = [];

// ─── UtilDlgEx class ──────────────────────────────────────────────────────
export class UtilDlgEx extends GamePanel {
  // ── Dialog state ────────────────────────────────────────────────────────
  m_dlgType = UtilDlgType.TEXT;
  m_nTemplateID = 0;
  m_bNoNPC = false;
  m_bQuest = false;
  m_bMsgImage = 0;
  m_bMsgImage_Img = 0;

  // ── Layout ──────────────────────────────────────────────────────────────
  m_ctLeft = 0;
  m_ctTop = 0;
  m_ctHeight = 27;
  m_scrHeight = 0;
  m_wndWidth = 0;
  m_wndHeight = 0;
  m_bScrollBar = false;
  m_nScrollPos = 0;

  // ── Selection / focus ───────────────────────────────────────────────────
  m_nSelect = -1;
  m_nSelectPrev = -1;
  m_nListFocus = -1;
  m_nBtnFocus = -1;
  m_bFinishShow = 0; // button focus index (OG semantics)

  // ── Text prev/next ──────────────────────────────────────────────────────
  m_bTextPrev = false;
  m_bTextNext = false;

  // ── Image ───────────────────────────────────────────────────────────────
  m_bImagePrev = false;
  m_bImageNext = false;
  m_usCurImage = 0;
  m_aImageList: string[] = [];

  // ── Input ───────────────────────────────────────────────────────────────
  m_sInputDefault = '';
  m_nInputLen = 0;
  m_nInputNo_Min = 0;
  m_nInputNo_Max = 0;
  m_nInputNo_Result = 0;
  m_nInputStr_Min = 0;
  m_nInputCol = 0;
  m_nInputLine = 0;
  m_sInputStr_Result = '';
  m_bInputStr_Passwd = false;
  m_bKoreanBaseLen = 0;

  // ── Avatar ──────────────────────────────────────────────────────────────
  m_aAvatarCandidate: number[] = [];
  m_nAvatarType = 0;
  m_nAvatarIndex = 0;
  m_bEquipPreview = false;

  // ── Pet ─────────────────────────────────────────────────────────────────
  m_aPetInfo: PetInfo[] = [];
  m_nPetIndex = 0;

  // ── Speaker / param ─────────────────────────────────────────────────────
  m_bSpeakerOnRight = false;
  m_bParam = 0;

  // ── Typewriter display ──────────────────────────────────────────────────
  m_nCurDisplayItemIndex = 0;
  m_nCurDisplayTextItemPos = 0;

  // ── Return ──────────────────────────────────────────────────────────────
  m_nRet = -1;
  m_bTerminate = false;

  // ── NPC ─────────────────────────────────────────────────────────────────
  m_sNpcName = '';

  // ── Callbacks ───────────────────────────────────────────────────────────
  onResult: ((result: UtilDlgResult) => void) | null = null;
  _avatarNameOf: ((itemId: number) => string) | null = null;

  // ── Internal ────────────────────────────────────────────────────────────
  private _lines: CtInfo[] = [];
  private _apListCT: CtInfo[] = []; // OG: m_apListCT — selectable dot entries
  private _scrollBar: ScrollBar | null = null;
  private _listItems: Container[] = [];
  private _contentLayer: Container = new Container();
  private _inputValue = '';
  private _inputText: Text | null = null;
  private _inputCursor: Graphics | null = null;
  private _cursorBlink = 0;

  private _uiWz: WzPackage | null;
  private _charWz: WzPackage | null;
  private _itemWz: WzPackage | null;
  private _baseWz: WzPackage | null;
  private _loader: WzTextureLoader | null;
  private _fonts: TextStyle[] = [];
  private _apBtnFocus: Container[] = [];

  // ── Avatar rendering ────────────────────────────────────────────────────
  private _charLook: CharLook | null = null;
  private _avatarLook: AvatarLook | null = null;

  // ── Pet rendering ───────────────────────────────────────────────────────
  private _petLook: PetLook | null = null;
  private _petLookIndex = -1;

  // ── NPC speaker ────────────────────────────────────────────────────────
  private _npcLook: NpcLook | null = null;
  private _npcWz: WzPackage | null;

  constructor(opts: {
    uiWz?: WzPackage | null;
    charWz?: WzPackage | null;
    itemWz?: WzPackage | null;
    baseWz?: WzPackage | null;
    npcWz?: WzPackage | null;
    loader?: WzTextureLoader | null;
  } = {}) {
    super();
    this._uiWz = opts.uiWz ?? null;
    this._charWz = opts.charWz ?? null;
    this._itemWz = opts.itemWz ?? null;
    this._baseWz = opts.baseWz ?? null;
    this._npcWz = opts.npcWz ?? null;
    this._loader = opts.loader ?? null;
    this._root.addChild(this._contentLayer);

    for (let i = 0; i < 12; i++) {
      this._fonts.push(new TextStyle({
        fill: FONT_COLORS[i], fontSize: 11,
        fontFamily: 'Arial, sans-serif', wordWrap: false,
      }));
    }

    _activeDialogs.push(this);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SetUtilDlgEx (OG: 0x98E9F0)
  // ═══════════════════════════════════════════════════════════════════════════
  SetUtilDlgEx(dlgType: UtilDlgType, nTemplateID: number, bNoNPC: boolean, bQuest: boolean, sText?: string): void {
    this.m_dlgType = dlgType;
    this.m_nSelect = -1;
    this.m_nSelectPrev = -1;
    this.m_nListFocus = -1;
    this.m_nBtnFocus = -1;
    this.m_nTemplateID = nTemplateID;
    this.m_ctHeight = 0;
    this.m_scrHeight = 0;
    this.m_nScrollPos = 0;
    this.m_bScrollBar = false;
    this.m_nAvatarIndex = 0;
    this.m_nPetIndex = 0;
    this.m_usCurImage = 0;
    this.m_bNoNPC = bNoNPC;
    this.m_bQuest = bQuest;
    this.m_aImageList = [];
    this._lines = [];
    this.m_bParam = 0;
    this.m_bMsgImage = 0;
    this.m_bMsgImage_Img = 0;
    this.m_nCurDisplayItemIndex = 0;
    this.m_nCurDisplayTextItemPos = 0;
    this.m_bFinishShow = 0;
    this.m_nRet = -1;
    this.m_bTerminate = false;
    this._charLook = null;
    this._avatarLook = null;
    this._petLook = null;
    this._petLookIndex = -1;
    this._npcLook = null;

    // OG: if sText provided, parse it into CT_INFO nodes
    if (sText) this._analyzeText(sText);

    // OG: for LIST type, build list CT from dot entries
    if (dlgType === UtilDlgType.LIST) {
      this.SetUtilDlgEx_LIST(true);
      this.m_ctHeight += 5;
      this._layoutGen(false);
    }
    if (dlgType === UtilDlgType.COMBOBOX) this._layoutInput();
    if (dlgType === UtilDlgType.TEXT) _activeDialogs.push(this);
  }

  // OG: SetUtilDlgEx_LIST (0x97e830) — collect nType==4 entries
  SetUtilDlgEx_LIST(bReset: boolean): void {
    if (bReset) this._apListCT = [];
    for (const line of this._lines) {
      if (line.nType === 4) this._apListCT.push(line);
    }
    this.m_nListFocus = 0;
  }

  // OG: CTextAnalyzer::AnalyzeText — parses formatted text into CT_INFO nodes
  // Simplified: handles #f[path]# icons, #i[id]# items, #b[n]# bold, newlines
  private _analyzeText(text: string): void {
    this._lines = [];
    let fontIndex = 0;
    let y = 0;
    const lines = text.split('\n');
    for (const rawLine of lines) {
      let remaining = rawLine;
      let x = 0;
      while (remaining.length > 0) {
        const iconMatch = remaining.match(/^#f\[([^\]]+)\]#/);
        if (iconMatch) {
          this._lines.push({
            nType: 2, nItemNo: this._lines.length, nLine: 0, pFont: 0,
            sText: '', pIcon: 0, nLeft: x, nTop: y, nWidth: 0, nHeight: 18,
            nSelect: -1, nUnderLine: 0, bLineChange: 0, nFuncCode: 0,
            bReward: 0, nNpcNo: 0, nMapNo: 0, _iconPath: iconMatch[1],
          });
          x += 18;
          remaining = remaining.slice(iconMatch[0].length);
          continue;
        }
        const boldMatch = remaining.match(/^#b/);
        if (boldMatch) { fontIndex = 1; remaining = remaining.slice(2); continue; }
        const resetMatch = remaining.match(/^#n/);
        if (resetMatch) { fontIndex = 0; remaining = remaining.slice(2); continue; }
        // Plain text until next # or end
        const nextHash = remaining.indexOf('#');
        const chunk = nextHash >= 0 ? remaining.slice(0, nextHash) : remaining;
        if (chunk.length > 0) {
          this._lines.push({
            nType: 0, nItemNo: this._lines.length, nLine: 0, pFont: fontIndex,
            sText: chunk, pIcon: 0, nLeft: x, nTop: y, nWidth: 0, nHeight: 18,
            nSelect: -1, nUnderLine: 0, bLineChange: 0, nFuncCode: 0,
            bReward: 0, nNpcNo: 0, nMapNo: 0,
          });
          x += chunk.length * 8;
        }
        remaining = nextHash >= 0 ? remaining.slice(nextHash) : '';
      }
      y += 18;
    }
    this.m_ctHeight = y;
  }

  SetUtilDlgEx_TEXT(bPrev: boolean, bNext: boolean): void {
    this.m_bTextPrev = bPrev;
    this.m_bTextNext = bNext;
    if (bPrev || bNext) this.m_ctHeight += 18;
    this._layoutGen(false);
  }

  SetUtilDlgEx_IMAGE(bPrev: boolean, bNext: boolean): void {
    this.m_bImagePrev = bPrev;
    this.m_bImageNext = bNext;
    if (bPrev || bNext) this.m_ctHeight += 18;
    this._layoutGen(false);
  }

  SetUtilDlgEx_YESNO(): void { this._layoutGen(false); }

  // OG: SetUtilDlgEx_MSG — sets message image parameters
  SetUtilDlgEx_MSG(bMsgImage: number, bMsgImageImg: number): void {
    this.m_bMsgImage = bMsgImage;
    this.m_bMsgImage_Img = bMsgImageImg;
  }

  SetUtilDlgEx_INPUT_STR(sStrDefault: string, nStrMin: number, nStrMax: number,
    bPasswd: boolean, bKoreanBaseLen: number): void {
    this.m_sInputDefault = sStrDefault;
    this.m_nInputLen = nStrMax;
    this.m_bKoreanBaseLen = bKoreanBaseLen;
    this.m_nInputStr_Min = nStrMin;
    this.m_bInputStr_Passwd = bPasswd;
    this._layoutInput();
  }

  // OG: SetUtilDlgEx_INPUT_NO — 6 params: nIntDefault, nIntMin, nIntMax, nStrMin, nStrMax, bPasswd
  SetUtilDlgEx_INPUT_NO(nDefault: number, nMin: number, nMax: number,
    nStrMin = 0, nStrMax = 0, bPasswd = false): void {
    this.m_nInputNo_Min = nMin;
    this.m_nInputNo_Max = nMax;
    this.m_nInputStr_Min = nStrMin;
    this.m_nInputLen = nStrMax;
    this.m_bInputStr_Passwd = bPasswd;
    this.m_sInputDefault = nDefault >= 0 ? String(nDefault) : '0';
    this._layoutInput();
  }

  SetUtilDlgEx_INPUT_MLSTR(sStrDefault: string, nCol: number, nLine: number): void {
    this.m_sInputDefault = sStrDefault;
    this.m_nInputCol = nCol;
    this.m_nInputLine = nLine;
    this._layoutMLInput();
  }

  SetUtilDlgEx_AVATAR(aCandidate: number[], nAvatarType: number): void {
    this.m_aAvatarCandidate = [...aCandidate];
    this.m_nAvatarType = nAvatarType;
    this.m_nAvatarIndex = 0;
    this.m_bEquipPreview = true;
    this._layoutGen(true);
  }

  SetUtilDlgEx_PET(petInfos: PetInfo[]): void {
    this.m_aPetInfo = [...petInfos];
    this.m_nPetIndex = 0;
    this._layoutGen(true);
  }

  SetUtilDlgEx_COMBOBOX(aStr: string[]): void {
    this._lines = [];
    for (let i = 0; i < aStr.length; i++) this.AddDotLine(aStr[i], i, 5);
    this._layoutGen(false);
  }

  AddTextLine(text: string, nFuncCode = 0, fontIndex = 0): void {
    this._lines.push({
      nType: 0, nItemNo: this._lines.length, nLine: 0, pFont: fontIndex,
      sText: text, pIcon: 0, nLeft: 0, nTop: 0, nWidth: 0, nHeight: 18,
      nSelect: -1, nUnderLine: 0, bLineChange: 0, nFuncCode,
      bReward: 0, nNpcNo: 0, nMapNo: 0,
    });
    this.m_ctHeight += 18;
  }

  // OG: AddIconLine — nType=1 (conditional) or nType=2 (always visible)
  AddIconLine(iconPath: string, nLeft: number, nTop: number, conditional = true): void {
    this._lines.push({
      nType: conditional ? 1 : 2, nItemNo: this._lines.length, nLine: 0, pFont: 0,
      sText: '', pIcon: 0, nLeft, nTop, nWidth: 0, nHeight: 18,
      nSelect: -1, nUnderLine: 0, bLineChange: 0, nFuncCode: 0,
      bReward: 0, nNpcNo: 0, nMapNo: 0, _iconPath: iconPath,
    });
    this.m_ctHeight += 18;
  }

  // OG: AddFuncLine — nType=3, triggers status bar button blink
  AddFuncLine(nFuncCode: number, fontIndex = 0): void {
    this._lines.push({
      nType: 3, nItemNo: this._lines.length, nLine: 0, pFont: fontIndex,
      sText: '', pIcon: 0, nLeft: 0, nTop: 0, nWidth: 0, nHeight: 18,
      nSelect: -1, nUnderLine: 0, bLineChange: 0, nFuncCode,
      bReward: 0, nNpcNo: 0, nMapNo: 0,
    });
    this.m_ctHeight += 18;
  }

  AddDotLine(text: string, nSelect: number, fontIndex = 5): void {
    this._lines.push({
      nType: 4, nItemNo: this._lines.length, nLine: 0, pFont: fontIndex,
      sText: text, pIcon: 0, nLeft: 0, nTop: 0, nWidth: 200, nHeight: 18,
      nSelect, nUnderLine: 16, bLineChange: 0, nFuncCode: 0,
      bReward: 0, nNpcNo: 0, nMapNo: 0,
    });
    this.m_ctHeight += 18;
  }

  SetSpeakerOnRight(bRight: boolean): void { this.m_bSpeakerOnRight = bRight; }

  AddImageList(sImagePath: string): void {
    this.m_aImageList.push(sImagePath);
    this.m_bImagePrev = this.m_usCurImage > 0;
    this.m_bImageNext = this.m_usCurImage < this.m_aImageList.length - 1;
  }

  UpdateImage(): void { this._buildContent(); this._buildButtons(); }

  GetInputStr_Result(): string { return this.m_sInputStr_Result; }
  GetInputNo_Result(): number { return this.m_nInputNo_Result; }
  GetSelect(): number { return this.m_nSelect; }

  // OG: GetComboBoxStr — returns selected combo box item text
  GetComboBoxStr(): string {
    if (this.m_nSelect >= 0 && this._apListCT.length > 0) {
      const item = this._apListCT.find(l => l.nSelect === this.m_nSelect);
      return item?.sText ?? '';
    }
    return '';
  }

  // OG: GetEmotionKey — maps keyboard keys to emotion IDs (0x97B9C0 area)
  GetEmotionKey(key: string): number {
    const emotionMap: Record<string, number> = {
      '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6,
    };
    return emotionMap[key] ?? -1;
  }

  OnChildNotify(nId: number, nParam1: number, nParam2: number): void {
    if (nId === 1001 && nParam1 >= 0x12C && nParam1 <= 0x130) {
      this.m_nScrollPos = 8 * nParam2;
      this.m_nSelect = -1;
      this._updateListScroll();
    } else if (nParam1 === 100) {
      this.OnButtonClicked(nId);
    }
  }

  ValidateScroll(pCT: CtInfo | null): void {
    if (!pCT) return;
    const ctTop = pCT.nTop || 0;
    if (ctTop < this.m_nScrollPos) this.m_nScrollPos = ctTop;
    else if (ctTop >= this.m_nScrollPos + this.m_scrHeight) this.m_nScrollPos = ctTop - this.m_scrHeight + 18;
    this.m_nScrollPos = Math.max(0, this.m_nScrollPos);
    this._updateListScroll();
  }

  SetKeyFocus(nBtnFocus: number): void { this.m_nBtnFocus = nBtnFocus; }
  ForcedRet(nRet: number): void { this._doTerminate(nRet); }

  // ═══════════════════════════════════════════════════════════════════════════
  // SetRet (OG: 0x982830)
  // ═══════════════════════════════════════════════════════════════════════════
  SetRet(nRet: number): void {
    if (nRet !== 1) { this._doTerminate(nRet); return; }

    if (this.m_dlgType === UtilDlgType.INPUT) {
      const val = Math.trunc(Number(this._inputValue));
      if (!Number.isFinite(val) || val < 0) { this._showNotice('Please enter a valid number.'); return; }
      if (val < this.m_nInputNo_Min) { this._showNotice(`Minimum value is ${this.m_nInputNo_Min}.`); return; }
      if (val > this.m_nInputNo_Max) { this._showNotice(`Maximum value is ${this.m_nInputNo_Max}.`); return; }
      this.m_nInputNo_Result = val;
      this.m_sInputStr_Result = this._inputValue;
    } else if (this.m_dlgType === UtilDlgType.INPUT_STR) {
      this.m_sInputStr_Result = this._inputValue.trim();
      if (this.m_sInputStr_Result.length < this.m_nInputStr_Min) {
        this._showNotice(`Minimum ${this.m_nInputStr_Min} characters required.`); return;
      }
    } else if (this.m_dlgType === UtilDlgType.MLINPUT) {
      this.m_sInputStr_Result = this._inputValue;
    } else if (this.m_dlgType === UtilDlgType.LIST || this.m_dlgType === UtilDlgType.COMBOBOX) {
      if (this.m_nSelect < 0) return;
    }
    this._doTerminate(nRet);
  }

  private _doTerminate(nRet: number): void {
    if (this.m_bTerminate) return;
    this.m_nRet = nRet;
    this.m_bTerminate = true;
    const type = nRet === 1 || nRet === 8193 ? 'ok' : nRet === 2 ? 'cancel'
      : nRet === 6 ? 'yes' : nRet === 7 ? 'no'
      : nRet === 0x2000 ? 'prev' : nRet === 0x2001 ? 'next' : 'ok';
    this._fireResult({ type } as UtilDlgResult);
  }

  private _showNotice(msg: string): void { console.warn(`[CUtilDlgEx] ${msg}`); }

  private _fireResult(result: UtilDlgResult): void {
    this.isVisible = false;
    this.onResult?.(result);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Layout (OG: 0x97B060 / 0x97B1A0 / 0x97B230)
  // ═══════════════════════════════════════════════════════════════════════════
  private _layoutGen(bAvatar: boolean): void {
    const ctMax = getCTHeightMax(this.m_dlgType);
    const ctMin = getCTHeightMin(this.m_dlgType, this.m_bNoNPC);

    // OG: scrollbar if > 1 page overflow
    if (this.m_ctHeight > ctMax && (this.m_ctHeight - ctMax) / 8 > 1) {
      this.m_scrHeight = ctMax;
      this.m_bScrollBar = true;
    } else {
      this.m_scrHeight = Math.max(this.m_ctHeight, ctMin);
      this.m_bScrollBar = false;
    }

    if (bAvatar) {
      this.m_scrHeight = ctMax;
      this.m_bScrollBar = this.m_ctHeight > ctMax;
      this.m_ctLeft = 95 + (this.m_bScrollBar ? -4 : 0);
      this.m_ctTop = 30;
    } else {
      this.m_ctLeft = (this.m_bSpeakerOnRight ? 23 : 158) + (this.m_bScrollBar ? -4 : 0);
      if (this.m_ctHeight <= this.m_scrHeight) {
        this.m_ctTop = Math.floor((this.m_scrHeight - this.m_ctHeight + 6) / 2) + 22;
      } else {
        this.m_ctTop = 16;
      }
    }

    this.m_wndWidth = getWndWidth(this.m_dlgType, this.m_bNoNPC);
    this.m_wndHeight = bAvatar ? getWndHeight(this.m_dlgType) : this.m_scrHeight + 80;
  }

  private _layoutInput(): void {
    const ctMin = getCTHeightMin(this.m_dlgType, this.m_bNoNPC);
    this.m_scrHeight = Math.max(this.m_ctHeight, ctMin);
    this.m_bScrollBar = false;
    if (this.m_bNoNPC) {
      // OG: INPUT1 path (0x9813C0)
      this.m_ctLeft = 12;
      this.m_ctTop = 16;
      this.m_wndWidth = 260;
      this.m_wndHeight = this.m_scrHeight + 93;
    } else {
      this.m_ctLeft = 158;
      this.m_ctTop = Math.floor((this.m_scrHeight - this.m_ctHeight - 20) / 2) + 22;
      this.m_wndWidth = 519;
      this.m_wndHeight = this.m_scrHeight + 66;
    }
  }

  private _layoutMLInput(): void {
    const ctMin = getCTHeightMin(this.m_dlgType, this.m_bNoNPC);
    this.m_scrHeight = Math.max(this.m_ctHeight, ctMin);
    this.m_bScrollBar = false;
    if (this.m_bNoNPC) {
      this.m_ctLeft = 12;
      this.m_ctTop = 16;
      this.m_wndWidth = 260;
      this.m_wndHeight = this.m_scrHeight + 93;
    } else {
      this.m_ctLeft = 158;
      // OG Layout_MLINPUT @0x97B230: v5 = m_nInputLine > 1 ? 12*m_nInputLine : 0,
      // ctTop = (scrHeight - m_ctHeight - v5 - 20)/2 + 22.
      const v5 = this.m_nInputLine > 1 ? 12 * this.m_nInputLine : 0;
      this.m_ctTop = Math.floor((this.m_scrHeight - this.m_ctHeight - v5 - 20) / 2) + 22;
      this.m_wndWidth = 519;
      this.m_wndHeight = this.m_scrHeight + 66;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Show
  // ═══════════════════════════════════════════════════════════════════════════
  show(): void {
    this._buildBackground();
    this._buildContent();
    this._buildButtons();
    this._root.x = (800 - this.m_wndWidth) / 2;
    this._root.y = (600 - this.m_wndHeight) / 2;
    this.isVisible = true;
  }

  // ─── Background (OG: SetBackground 0x97F180) ───────────────────────────
  // The v95 UtilDlgEx subtree has NO single "backgrnd" canvas. SetBackground
  // composites the dialog from component canvases:
  //   with-NPC:      it(0,0) + ic tiled y=28..h-44 step 13 + is(0,h-44)
  //   without-NPC:   t(0,0)  + c  tiled y=28..h-44 step 13 + s(0,h-44)
  // Hard rule: no custom-drawn rectangles when a backgrnd canvas exists — if
  // the composite canvases aren't loadable, draw nothing (content still shows).
  private _buildBackground(): void {
    for (let i = this._root.children.length - 1; i >= 0; i--) {
      const c = this._root.children[i];
      if (c !== this._contentLayer) this._root.removeChildAt(i);
    }

    const dlgProp = this._uiWz?.GetItem('UIWindow2.img/UtilDlgEx');
    const root = dlgProp instanceof WzProperty ? dlgProp : null;
    const loader = this._loader;

    const loadCanvas = (name: string): WzSprite | null => {
      if (!root || !loader) return null;
      const n = root.Get(name);
      return n instanceof WzCanvas ? loader.Load(n) : null;
    };

    const composited = (() => {
      // With-NPC dialog uses it/ic/is (special quest-style background).
      if (!this.m_bNoNPC && (this.m_bParam & 6) !== 0) {
        const top = loadCanvas('it');
        const tile = loadCanvas('ic');
        const bottom = loadCanvas('is');
        if (top && tile && bottom) return { top, tile, bottom, step: 13, startY: 28, endOff: 44 };
      }
      // Standard with-NPC / text dialog uses t/c/s.
      if (!this.m_bNoNPC) {
        const top = loadCanvas('t');
        const tile = loadCanvas('c');
        const bottom = loadCanvas('s');
        if (top && tile && bottom) return { top, tile, bottom, step: 13, startY: 28, endOff: 44 };
      }
      return null;
    })();

    if (!composited) return;

    const { top, tile, bottom, step, startY, endOff } = composited;
    const add = (sprite: WzSprite, x: number, y: number): void => {
      const sp = sprite.ToPixi();
      sp.position.set(x, y);
      this._root.addChild(sp);
    };
    add(top, 0, 0);
    for (let y = startY; y < this.m_wndHeight - endOff; y += step) add(tile, 0, y);
    add(bottom, 0, this.m_wndHeight - endOff);
  }

  // ─── Content ────────────────────────────────────────────────────────────
  private _buildContent(): void {
    this._contentLayer.removeChildren();
    this._listItems = [];
    this._inputText = null;
    this._scrollBar = null;

    switch (this.m_dlgType) {
      case UtilDlgType.TEXT: case UtilDlgType.YESNO: this._buildTextContent(); break;
      case UtilDlgType.INPUT: case UtilDlgType.INPUT_STR: this._buildInputContent(false); break;
      case UtilDlgType.MLINPUT: this._buildInputContent(true); break;
      case UtilDlgType.LIST: case UtilDlgType.COMBOBOX: this._buildListContent(); break;
      case UtilDlgType.AVATAR: this._buildAvatarContent(); break;
      case UtilDlgType.PET: this._buildPetContent(); break;
      case UtilDlgType.IMAGE: this._buildImageContent(); break;
    }
  }

  // ─── Text (TEXT/YESNO) — OG Draw 0x986c20 ─────────────────────────────
  private _buildTextContent(): void {
    const clipW = getBasicCTWidth(this.m_dlgType, this.m_bNoNPC);
    const clipH = this.m_scrHeight;

    const mask = new Graphics();
    mask.rect(this.m_ctLeft, this.m_ctTop, clipW, clipH).fill({ color: 0xFFFFFF });
    this._contentLayer.addChild(mask);
    this._contentLayer.mask = mask;

    // OG: NPC speaker in left panel when !m_bNoNPC
    if (!this.m_bNoNPC && this.m_nTemplateID > 0 && this._npcWz && this._loader) {
      if (!this._npcLook) {
        this._npcLook = new NpcLook(this.m_nTemplateID);
        this._npcLook.Load(this._loader, this._npcWz);
      }
      if (this._npcLook.Loaded) {
        // OG: NPC positioned at (0, 0) in left panel, scaled to fit
        this._npcLook.container.position.set(6, this.m_ctTop + 10);
        this._npcLook.container.scale.set(0.8, 0.8);
        this._contentLayer.addChild(this._npcLook.container);
      }
    }

    let y = this.m_ctTop;
    for (let i = 0; i < this._lines.length; i++) {
      const line = this._lines[i];
      if (i > this.m_nCurDisplayItemIndex) break;

      const lineY = line.nTop || y;
      const drawY = lineY - this.m_nScrollPos;
      if (drawY < -48 || drawY >= clipH + 24) { y += line.nHeight || 18; continue; }

      switch (line.nType) {
        case 0: // Text node
        case 4: { // Dot node (also renders text)
          let displayText = line.sText;
          if (i === this.m_nCurDisplayItemIndex && !this.m_bFinishShow && !this.m_bNoNPC) {
            displayText = line.sText.substring(0, this.m_nCurDisplayTextItemPos);
          }
          const t = new Text({ text: displayText, style: this._fonts[Math.min(line.pFont, 11)] });
          t.x = this.m_ctLeft + line.nLeft;
          t.y = this.m_ctTop + drawY;
          this._contentLayer.addChild(t);
          break;
        }
        case 1: // Conditional icon (only when selected/reward/displayed)
          if (line.nSelect === -1 && !line.bReward && i > this.m_nCurDisplayItemIndex) break;
          // falls through
        case 2: // Always-visible icon
          if (line._iconPath && this._uiWz && this._loader) {
            const node = this._uiWz.GetItem(line._iconPath);
            if (node instanceof WzCanvas) {
              const sprite = this._loader.Load(node);
              if (sprite) {
                const s = sprite.ToPixi();
                s.x = this.m_ctLeft + line.nLeft;
                s.y = this.m_ctTop + drawY;
                this._contentLayer.addChild(s);
              }
            }
          }
          break;
        case 3: // Function node (triggers status bar blink, no visual)
          break;
      }
      y += line.nHeight || 18;
    }

    // Line separators (OG: draws when nSelect === -1 && !nLine)
    const sepG = new Graphics();
    for (let i = 0; i < this._lines.length; i++) {
      const line = this._lines[i];
      if (line.nSelect >= 0 || line.nLine) continue;
      const ly = this.m_ctTop + (line.nTop || i * 18) - this.m_nScrollPos - 10;
      if (ly >= this.m_ctTop && ly < this.m_ctTop + clipH) {
        sepG.rect(this.m_ctLeft, ly, clipW, 1).fill({ color: 0xFF919191, alpha: 0.3 });
      }
    }
    this._contentLayer.addChild(sepG);
  }

  // ─── Image (OG: MakeImage 0x982280) ────────────────────────────────────
  private _buildImageContent(): void {
    if (this.m_aImageList.length === 0) return;
    const imgPath = this.m_aImageList[this.m_usCurImage];

    // Image counter label
    const label = new Text({
      text: `[${this.m_usCurImage + 1}/${this.m_aImageList.length}]`,
      style: this._fonts[5],
    });
    label.anchor.set(0.5, 0);
    label.x = this.m_ctLeft + (this.m_wndWidth - (this.m_bSpeakerOnRight ? 23 : 158)) / 2;
    label.y = this.m_ctTop;
    this._contentLayer.addChild(label);

    // OG: loads image via g_rm.GetObjectA → IWzCanvas → CreateLayer at (9,9)
    // TS: try UI WzPackage first, then fall back to label-only
    if (this._uiWz && this._loader) {
      const imgNode = this._uiWz.GetItem(imgPath);
      if (imgNode instanceof WzCanvas) {
        const sprite = this._loader.Load(imgNode);
        if (sprite) {
          const s = sprite.ToPixi();
          s.x = this.m_ctLeft;
          s.y = this.m_ctTop + 18;
          this._contentLayer.addChild(s);
        }
      } else if (imgNode instanceof WzProperty) {
        // Multi-frame image: try frame 0
        const frame0 = imgNode.Get('0');
        if (frame0 instanceof WzCanvas) {
          const sprite = this._loader.Load(frame0);
          if (sprite) {
            const s = sprite.ToPixi();
            s.x = this.m_ctLeft;
            s.y = this.m_ctTop + 18;
            this._contentLayer.addChild(s);
          }
        }
      }
    }
  }

  // ─── Input ──────────────────────────────────────────────────────────────
  // ─── Input (OG: Layout_INPUT 0x97b1a0) ────────────────────────────────
  private _buildInputContent(multiLine: boolean): void {
    // OG: uses CCtrlEdit/CCtrlMLEdit with WZ background from UtilDlgEx/edit
    const label = new Text({
      text: multiLine ? 'Text:' : 'Amount:',
      style: this._fonts[5],
    });
    label.x = this.m_ctLeft;
    label.y = this.m_ctTop;
    this._contentLayer.addChild(label);

    const inputW = this.m_wndWidth - this.m_ctLeft - 8 - (multiLine ? 40 : 20);
    const inputH = multiLine ? (this.m_nInputLine || 3) * 18 : 20;

    // Try loading WZ input background
    let loadedWz = false;
    if (this._uiWz && this._loader) {
      const dlgProp = this._uiWz.GetItem('UIWindow2.img/UtilDlgEx');
      if (dlgProp instanceof WzProperty) {
        const editNode = dlgProp.Get(multiLine ? 'edit2' : 'edit');
        if (editNode instanceof WzCanvas) {
          const sprite = this._loader.Load(editNode);
          if (sprite) {
            const s = sprite.ToPixi();
            s.x = this.m_ctLeft;
            s.y = this.m_ctTop + 20;
            this._contentLayer.addChild(s);
            loadedWz = true;
          }
        }
      }
    }

    // Fallback: generic input background
    if (!loadedWz) {
      const inputBg = new Graphics();
      inputBg.rect(0, 0, inputW, inputH).fill({ color: 0x10121C });
      inputBg.rect(0, 0, inputW, inputH).stroke({ color: 0x505570, width: 1 });
      inputBg.x = this.m_ctLeft;
      inputBg.y = this.m_ctTop + 20;
      this._contentLayer.addChild(inputBg);
    }

    this._inputValue = this.m_sInputDefault;
    this._inputText = new Text({
      text: this.m_bInputStr_Passwd ? '*'.repeat(this._inputValue.length) : this._inputValue,
      style: this._fonts[5],
    });
    this._inputText.x = this.m_ctLeft + 4;
    this._inputText.y = this.m_ctTop + 24;
    this._contentLayer.addChild(this._inputText);

    // Cursor indicator
    this._inputCursor = new Graphics();
    this._inputCursor.rect(0, 0, 1, 14).fill({ color: 0xCCCCEE });
    this._inputCursor.x = this.m_ctLeft + 4;
    this._inputCursor.y = this.m_ctTop + 24;
    this._inputCursor.visible = true;
    this._contentLayer.addChild(this._inputCursor);
  }

  // ─── List (LIST/COMBOBOX) ───────────────────────────────────────────────
  private _buildListContent(): void {
    const clipW = getBasicCTWidth(this.m_dlgType, this.m_bNoNPC);

    const mask = new Graphics();
    mask.rect(this.m_ctLeft, this.m_ctTop, clipW, this.m_scrHeight).fill({ color: 0xFFFFFF });
    this._contentLayer.addChild(mask);
    this._contentLayer.mask = mask;

    const oneSelect = (this.m_bParam & 2) !== 0 && this._lines.filter(l => l.nType === 4).length === 1;

    let y = this.m_ctTop;
    for (let i = 0; i < this._lines.length; i++) {
      const line = this._lines[i];
      const h = line.nHeight || 18;
      const lineTop = (line.nTop || i * 18) - this.m_nScrollPos;
      if (lineTop < -48 || lineTop >= this.m_scrHeight + 24) { y += h; continue; }

      const item = new Container();
      const bg = new Graphics();
      bg.rect(0, 0, clipW, h).fill({
        color: line.nSelect === this.m_nSelect ? 0x2A2D48 : 0x000000,
        alpha: line.nSelect === this.m_nSelect ? 1 : 0,
      });
      item.addChild(bg);

      if (line.nType === 4) {
        const dotSel = line.nSelect === this.m_nSelect || line.nSelect === this._apListCT_nSelect;
        const dotPath = dotSel ? 'UI/UIWindow2.img/UtilDlgEx/dot1' : 'UI/UIWindow2.img/UtilDlgEx/dot0';
        let drawn = false;
        if (this._uiWz && this._loader) {
          const dotNode = this._uiWz.GetItem(dotPath);
          if (dotNode instanceof WzCanvas) {
            const sprite = this._loader.Load(dotNode);
            if (sprite) {
              const s = sprite.ToPixi();
              s.x = this.m_ctLeft + line.nLeft + 10;
              s.y = y + 2;
              item.addChild(s);
              drawn = true;
            }
          }
        }
        if (!drawn) {
          const dot = new Graphics();
          dot.circle(0, 0, 4).fill({ color: dotSel ? 0xFFFFFF : 0x888888 });
          dot.x = this.m_ctLeft + line.nLeft + 14;
          dot.y = y + h / 2;
          item.addChild(dot);
        }
      }

      if (line.nSelect >= 0 && line.nSelect === this.m_nSelect && !oneSelect) {
        const underline = new Graphics();
        const uw = line.nWidth + 8;
        for (let u = 0; u < uw / 6; u++) {
          underline.rect(u * 6, line.nUnderLine || (h - 2), 3, 1).fill({ color: 0xFF919191 });
        }
        underline.x = this.m_ctLeft + line.nLeft;
        item.addChild(underline);
      }

      const t = new Text({ text: line.sText, style: this._fonts[Math.min(line.pFont, 11)] });
      t.x = 4; t.y = 2;
      item.addChild(t);

      item.x = this.m_ctLeft;
      item.y = y;
      item.eventMode = 'static';
      item.cursor = 'pointer';
      const idx = i;
      item.on('pointerdown', () => this._selectListItem(idx));
      this._contentLayer.addChild(item);
      this._listItems.push(item);
      y += h;
    }

    if (this.m_bScrollBar) {
      this._scrollBar = new ScrollBar(clipW + this.m_ctLeft + 2, this.m_ctTop, this.m_scrHeight, (pos: number) => {
        this.m_nScrollPos = pos;
        this._updateListScroll();
      });
      this._contentLayer.addChild(this._scrollBar.container);
    }
  }

  private get _apListCT_nSelect(): number {
    if (this._apListCT.length > 0 && this.m_nListFocus >= 0 && this.m_nListFocus < this._apListCT.length) {
      return this._apListCT[this.m_nListFocus].nSelect;
    }
    return -1;
  }

  // ─── Avatar (OG: MakeAvatar 0x981e10) ──────────────────────────────────
  private _buildAvatarContent(): void {
    // OG: avatar rendered via CAvatar::Init at (100, 202) with name tag at y=4
    // TS: use CharLook to render avatar sprite, draw item name below
    if (this._charWz && this._itemWz && this._baseWz && this._loader
      && this.m_aAvatarCandidate.length > 0 && this._avatarNameOf) {
      const itemId = this.m_aAvatarCandidate[this.m_nAvatarIndex];
      // Build a minimal AvatarLook from the item (equip preview mode)
      if (!this._avatarLook) {
        this._avatarLook = new AvatarLook();
      }

      if (!this._charLook) {
        this._charLook = new CharLook(this._avatarLook.skin);
        this._charLook.Load(this._charWz, this._itemWz, this._baseWz, this._loader);
      }
      this._charLook.SetAvatar(this._avatarLook);
      this._charLook.StartAction('stand1');
      // OG: avatar positioned in left panel area
      this._charLook.container.position.set(this.m_ctLeft + 86, this.m_ctTop + 160);
      this._contentLayer.addChild(this._charLook.container);

      // OG: name tag — item name centered at x=86 on name tag canvas
      if (this.m_nAvatarType !== 2) {
        const name = this._avatarNameOf(itemId);
        const nameText = new Text({ text: name, style: this._fonts[5] });
        nameText.anchor.set(0.5, 0);
        nameText.x = this.m_ctLeft + 86;
        nameText.y = this.m_ctTop + 4;
        this._contentLayer.addChild(nameText);
      }
    } else {
      // Fallback placeholder
      const style = this._fonts[5];
      const placeholder = new Text({
        text: `Avatar Selection (${this.m_aAvatarCandidate.length} options)`, style,
      });
      placeholder.x = this.m_ctLeft;
      placeholder.y = this.m_ctTop + 40;
      this._contentLayer.addChild(placeholder);
    }
  }

  // ─── Pet (OG: MakePet 0x97c330) ────────────────────────────────────────
  private _buildPetContent(): void {
    if (this.m_aPetInfo.length === 0) return;
    const pet = this.m_aPetInfo[this.m_nPetIndex];
    if (!pet) return;

    // OG: pet positioned at (187, 180) alive, (204, 180) dead
    if (this._charWz && this._loader) {
      if (this._petLookIndex !== this.m_nPetIndex || !this._petLook) {
        this._petLook = new PetLook(pet.dwTempletID);
        this._petLook.Load(this._loader, this._charWz);
        this._petLookIndex = this.m_nPetIndex;
      }

      if (pet.bIsDead) {
        // OG: dead pet — show item icon at (204, 180)
        // For now, show pet name with "Dead" indicator
        this._petLook.container.position.set(this.m_ctLeft + 114, this.m_ctTop + 80);
        this._contentLayer.addChild(this._petLook.container);
      } else {
        // OG: alive pet — animate at (187, 180)
        this._petLook.container.position.set(this.m_ctLeft + 87, this.m_ctTop + 80);
        this._contentLayer.addChild(this._petLook.container);
      }
    }

    // OG Draw: pet name centered at (188-w/2, 195)
    const nameText = new Text({ text: pet.sName, style: this._fonts[5] });
    nameText.anchor.set(0.5, 0);
    nameText.x = this.m_ctLeft + 88; nameText.y = this.m_ctTop + 160;
    this._contentLayer.addChild(nameText);

    // Level at (166-w/2, 212)
    const lvlText = new Text({ text: `Lv.${pet.nLevel}`, style: this._fonts[0] });
    lvlText.anchor.set(0.5, 0);
    lvlText.x = this.m_ctLeft + 66; lvlText.y = this.m_ctTop + 177;
    this._contentLayer.addChild(lvlText);

    // Tameness at (252-w/2, 212)
    const tameText = new Text({ text: `Intimacy: ${pet.nTameness}`, style: this._fonts[0] });
    tameText.anchor.set(0.5, 0);
    tameText.x = this.m_ctLeft + 152; tameText.y = this.m_ctTop + 177;
    this._contentLayer.addChild(tameText);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Buttons — OG-correct positions per OnCreate_* type
  // ═══════════════════════════════════════════════════════════════════════════
  private _buildButtons(): void {
    this._apBtnFocus = [];

    switch (this.m_dlgType) {
      case UtilDlgType.TEXT: this._onCreateTEXT(); break;
      case UtilDlgType.YESNO: this._onCreateYESNO(); break;
      case UtilDlgType.INPUT: this._onCreateINPUT(); break;
      case UtilDlgType.INPUT_STR: this._onCreateINPUT(); break;
      case UtilDlgType.LIST: this._onCreateLIST(); break;
      case UtilDlgType.AVATAR: this._onCreateAVATAR(); break;
      case UtilDlgType.PET: this._onCreatePET(); break;
      case UtilDlgType.COMBOBOX: this._onCreateCOMBOBOX(); break;
      case UtilDlgType.MLINPUT: this._onCreateMLINPUT(); break;
      case UtilDlgType.IMAGE: this._onCreateIMAGE(); break;
    }
  }

  // ─── OnCreate_TEXT (OG: 0x97DDC0) ───────────────────────────────────────
  private _onCreateTEXT(): void {
    const w = this.m_wndWidth;
    const h = this.m_wndHeight;
    const scrollOff = this.m_bScrollBar ? 5 : 0;
    const speakerOff = this.m_bSpeakerOnRight ? 140 : 10;

    // Prev button (id=0x2000): x = w - speakerOff - 106, y = h - 57
    if (this.m_bTextPrev) {
      const btn = this._makeButton('Prev', 0x2000);
      btn.x = w - speakerOff - 106 - scrollOff;
      btn.y = h - 57;
      this._apBtnFocus.push(btn);
    }

    // Next button (id=8193): x = w - speakerOff - 58, y = h - 57
    // Or OK button (id=1) if no next
    if (this.m_bTextNext) {
      const btn = this._makeButton('Next', 8193);
      btn.x = w - speakerOff - 58 - scrollOff;
      btn.y = h - 57;
      this._apBtnFocus.push(btn);
    } else {
      const btn = this._makeButton('OK', 1);
      btn.x = w - 48;
      btn.y = h - 24;
      this._apBtnFocus.push(btn);
    }

    // Close button (id=2): x=9, y=h-24 — only if (m_bParam & 1) == 0
    if ((this.m_bParam & 1) === 0) {
      const btn = this._makeButton('Close', 2);
      btn.x = 9;
      btn.y = h - 24;
    }
  }

  // ─── OnCreate_YESNO (OG: 0x97E1A0) ─────────────────────────────────────
  private _onCreateYESNO(): void {
    const w = this.m_wndWidth;
    const h = this.m_wndHeight;

    // Yes button (id=6): x = w - 130, y = h - 24
    const yesBtn = this._makeButton(this.m_bQuest ? 'Yes' : 'Yes', 6);
    yesBtn.x = w - 130;
    yesBtn.y = h - 24;
    this._apBtnFocus.push(yesBtn);

    // No button (id=7): x = w - 65, y = h - 24
    const noBtn = this._makeButton(this.m_bQuest ? 'No' : 'No', 7);
    noBtn.x = w - 65;
    noBtn.y = h - 24;
    this._apBtnFocus.push(noBtn);

    // Close button (id=2): x=9, y=h-24
    if ((this.m_bParam & 1) === 0) {
      const btn = this._makeButton('Close', 2);
      btn.x = 9;
      btn.y = h - 24;
    }
  }

  // ─── OnCreate_INPUT (OG: 0x9839A0) — with NPC ──────────────────────────
  private _onCreateINPUT(): void {
    const w = this.m_wndWidth;
    const h = this.m_wndHeight;

    if (this.m_bNoNPC) {
      // OnCreate_INPUT1 (0x9813C0): edit at (22, h-62), OK at (156, h-31), Cancel at (198, h-31)
      const okBtn = this._makeButton('OK', 1);
      okBtn.x = 156; okBtn.y = h - 31;
      this._apBtnFocus.push(okBtn);

      const cancelBtn = this._makeButton('Cancel', 2);
      cancelBtn.x = 198; cancelBtn.y = h - 31;
    } else {
      // OK at (w-48, h-24), Close at (9, h-24)
      const okBtn = this._makeButton('OK', 1);
      okBtn.x = w - 48; okBtn.y = h - 24;
      this._apBtnFocus.push(okBtn);

      if ((this.m_bParam & 1) === 0) {
        const btn = this._makeButton('Close', 2);
        btn.x = 9; btn.y = h - 24;
      }
    }
  }

  // ─── OnCreate_LIST (OG: 0x9816F0) ──────────────────────────────────────
  private _onCreateLIST(): void {
    const w = this.m_wndWidth;
    const h = this.m_wndHeight;
    const scrollOff = this.m_bScrollBar ? 5 : 0;

    // Select button (id=8193): x = w - offset - 62, y = h - 57
    const selBtn = this._makeButton('Select', 8193);
    selBtn.x = w - scrollOff - 62;
    selBtn.y = h - 57;
    this._apBtnFocus.push(selBtn);

    // Cancel button (id=2): x=10, y=h-24
    if ((this.m_bParam & 1) === 0) {
      const btn = this._makeButton('Cancel', 2);
      btn.x = 10; btn.y = h - 24;
    }
  }

  // ─── OnCreate_AVATAR (OG: 0x9846C0) — 7 buttons ────────────────────────
  private _onCreateAVATAR(): void {
    const h = this.m_wndHeight;

    // BtPrev (id=0x2000), BtNext (id=0x2001), BtOK (id=1), BtCancle (id=2)
    // BtOff (id=0x2002), BtOn (id=0x2003), BtExit (id=2)
    const prevBtn = this._makeButton('◀', 0x2000);
    prevBtn.x = 8; prevBtn.y = h - 57;
    this._apBtnFocus.push(prevBtn);

    const nextBtn = this._makeButton('▶', 0x2001);
    nextBtn.x = 49; nextBtn.y = h - 57;
    this._apBtnFocus.push(nextBtn);

    const okBtn = this._makeButton('OK', 1);
    okBtn.x = this.m_wndWidth - 48; okBtn.y = h - 57;
    this._apBtnFocus.push(okBtn);

    const cancelBtn = this._makeButton('Cancel', 2);
    cancelBtn.x = 9; cancelBtn.y = h - 24;

    // BtOff/BtOn equip preview toggle
    const offBtn = this._makeButton('No Equip', 0x2002);
    offBtn.x = this.m_wndWidth - 130; offBtn.y = h - 57;
    offBtn.visible = this.m_bEquipPreview;

    const onBtn = this._makeButton('With Equip', 0x2003);
    onBtn.x = this.m_wndWidth - 130; onBtn.y = h - 57;
    onBtn.visible = !this.m_bEquipPreview;
  }

  // ─── OnCreate_PET (OG: 0x981AC0) ───────────────────────────────────────
  private _onCreatePET(): void {
    const h = this.m_wndHeight;

    const prevBtn = this._makeButton('◀', 0x2000);
    prevBtn.x = 8; prevBtn.y = h - 57;
    this._apBtnFocus.push(prevBtn);

    const nextBtn = this._makeButton('▶', 0x2001);
    nextBtn.x = 49; nextBtn.y = h - 57;
    this._apBtnFocus.push(nextBtn);

    const okBtn = this._makeButton('OK', 1);
    okBtn.x = this.m_wndWidth - 48; okBtn.y = h - 57;
    this._apBtnFocus.push(okBtn);

    const cancelBtn = this._makeButton('Cancel', 2);
    cancelBtn.x = 9; cancelBtn.y = h - 24;
  }

  // ─── OnCreate_COMBOBOX_EDITABLE (OG: 0x984380) ─────────────────────────
  private _onCreateCOMBOBOX(): void {
    const h = this.m_wndHeight;

    // OK at (157, h-31), Cancel at (198, h-31)
    const okBtn = this._makeButton('OK', 1);
    okBtn.x = 157; okBtn.y = h - 31;
    this._apBtnFocus.push(okBtn);

    const cancelBtn = this._makeButton('Cancel', 2);
    cancelBtn.x = 198; cancelBtn.y = h - 31;
  }

  // ─── OnCreate_MLINPUT (OG: 0x983D70) ───────────────────────────────────
  private _onCreateMLINPUT(): void {
    const w = this.m_wndWidth;
    const h = this.m_wndHeight;

    if (this.m_bNoNPC) {
      const okBtn = this._makeButton('OK', 1);
      okBtn.x = 176; okBtn.y = h - 30;
      this._apBtnFocus.push(okBtn);

      const cancelBtn = this._makeButton('Cancel', 2);
      cancelBtn.x = 218; cancelBtn.y = h - 30;
    } else {
      const okBtn = this._makeButton('OK', 1);
      okBtn.x = w - 48; okBtn.y = h - 24;
      this._apBtnFocus.push(okBtn);

      if ((this.m_bParam & 1) === 0) {
        const btn = this._makeButton('Close', 2);
        btn.x = 9; btn.y = h - 24;
      }
    }
  }

  // ─── OnCreate_IMAGE (OG: 0x984F70) ─────────────────────────────────────
  private _onCreateIMAGE(): void {
    const h = this.m_wndHeight;

    // Prev (id=0x2000): x=8, y=h-57, enabled=m_bImagePrev
    const prevBtn = this._makeButton('Prev', 0x2000);
    prevBtn.x = 8; prevBtn.y = h - 57;
    prevBtn.alpha = this.m_bImagePrev ? 1 : 0.5;
    this._apBtnFocus.push(prevBtn);

    // Next (id=0x2001): x=49, y=h-57, enabled=m_bImageNext
    const nextBtn = this._makeButton('Next', 0x2001);
    nextBtn.x = 49; nextBtn.y = h - 57;
    nextBtn.alpha = this.m_bImageNext ? 1 : 0.5;
    this._apBtnFocus.push(nextBtn);

    // OK (id=1): x=w-48, y=h-57, enabled=!m_bImageNext
    const okBtn = this._makeButton('OK', 1);
    okBtn.x = this.m_wndWidth - 48; okBtn.y = h - 57;
    okBtn.alpha = !this.m_bImageNext ? 1 : 0.5;
    this._apBtnFocus.push(okBtn);
  }

  // ─── Button factory ─────────────────────────────────────────────────────
  // OG: button WZ paths — mapped by button ID. The v95 UtilDlgEx subtree has
  // BtClose/BtNext/BtNo/BtOK/BtPrev/BtQGiveup/BtQNo/BtQYes/BtYes; quest
  // dialogs (m_bQuest) swap Yes/No for BtQYes/BtQNo.
  private static readonly BTN_WZ_MAP: Record<number, string> = {
    1: 'UI/UIWindow2.img/UtilDlgEx/BtOK',
    2: 'UI/UIWindow2.img/UtilDlgEx/BtClose',
    6: 'UI/UIWindow2.img/UtilDlgEx/BtYes',
    7: 'UI/UIWindow2.img/UtilDlgEx/BtNo',
    0x2000: 'UI/UIWindow2.img/UtilDlgEx/BtPrev',
    0x2001: 'UI/UIWindow2.img/UtilDlgEx/BtNext',
  };

  // OG OnCreate_YESNO quest variant: 0xCD7 → BtQYes, 0xCD8 → BtQNo.
  private static readonly BTN_WZ_MAP_QUEST: Record<number, string> = {
    6: 'UI/UIWindow2.img/UtilDlgEx/BtQYes',
    7: 'UI/UIWindow2.img/UtilDlgEx/BtQNo',
  };

  private _makeButton(label: string, id: number): Container {
    const btn = new Container();
    (btn as any).__btnId = id;
    (btn as any).__btnLabel = label;

    // Try loading WZ button background
    const wzPath = this.m_bQuest ? (UtilDlgEx.BTN_WZ_MAP_QUEST[id] ?? UtilDlgEx.BTN_WZ_MAP[id]) : UtilDlgEx.BTN_WZ_MAP[id];
    let loaded = false;
    if (wzPath && this._uiWz && this._loader) {
      const node = this._uiWz.GetItem(wzPath);
      // v95 button states are nested at Bt*/normal/0 (also mouseOver/0). The
      // state node holds a "0" canvas child.
      let canvas: WzCanvas | null = null;
      if (node instanceof WzCanvas) {
        canvas = node;
      } else if (node instanceof WzProperty) {
        const normal = node.Get('normal');
        if (normal instanceof WzProperty) {
          const f0 = normal.Get('0');
          if (f0 instanceof WzCanvas) canvas = f0;
        }
        if (!canvas) {
          const f0 = node.Get('0');
          if (f0 instanceof WzCanvas) canvas = f0;
        }
      }
      if (canvas) {
        const sprite = this._loader.Load(canvas);
        if (sprite) {
          const s = sprite.ToPixi();
          btn.addChild(s);
          loaded = true;
        }
      }
    }

    // Fallback: generic graphics button
    if (!loaded) {
      const bg = new Graphics();
      bg.rect(0, 0, 56, 20).fill({ color: 0x1E2030, alpha: 0.9 });
      bg.rect(0, 0, 56, 20).stroke({ color: 0x505570, width: 1 });
      const txt = new Text({
        text: label,
        style: new TextStyle({ fill: 0xCCCCEE, fontSize: 10, fontFamily: 'Arial, sans-serif' }),
      });
      txt.x = 20; txt.y = 4;
      btn.addChild(bg, txt);
    }

    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerdown', () => this.OnButtonClicked(id));
    this._root.addChild(btn);
    return btn;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OnButtonClicked (OG: 0x985350)
  // ═══════════════════════════════════════════════════════════════════════════
  OnButtonClicked(nId: number): void {
    if (nId === 2) { this.SetRet(2); return; }

    switch (this.m_dlgType) {
      case UtilDlgType.TEXT:
        // OG 0x98537b case 0: 0x2000/8193→SetRet(nId), 1→SetRet(8193)
        if (nId === 0x2000 || nId === 8193) this.SetRet(nId);
        else if (nId === 1) this.SetRet(8193);
        break;

      case UtilDlgType.YESNO:
        if (nId === 6 || nId === 7) this.SetRet(nId);
        break;

      case UtilDlgType.INPUT: case UtilDlgType.INPUT_STR: case UtilDlgType.MLINPUT:
        if (nId === 1) this.SetRet(1);
        break;

      case UtilDlgType.LIST:
        if (nId === 8193) {
          if (this._apListCT.length > 0 && this.m_nListFocus >= 0) {
            this.m_nSelect = this._apListCT[this.m_nListFocus]?.nSelect ?? -1;
          }
          this.SetRet(8193);
        }
        break;

      case UtilDlgType.AVATAR:
        switch (nId) {
          case 1: this.SetRet(1); break;
          case 0x2000:
            this.m_nAvatarIndex = Math.max(0, this.m_nAvatarIndex - 1);
            this._charLook = null; // force rebuild
            this._buildContent();
            break;
          case 0x2001:
            this.m_nAvatarIndex = Math.min(this.m_aAvatarCandidate.length - 1, this.m_nAvatarIndex + 1);
            this._charLook = null; // force rebuild
            this._buildContent();
            break;
          case 0x2002: // BtOff — no equip preview
            this.m_bEquipPreview = false;
            this._buildContent();
            this._buildButtons();
            break;
          case 0x2003: // BtOn — with equip preview
            this.m_bEquipPreview = true;
            this._buildContent();
            this._buildButtons();
            break;
        }
        break;

      case UtilDlgType.PET:
        switch (nId) {
          case 1: this.SetRet(1); break;
          case 0x2000:
            this.m_nPetIndex = Math.max(0, this.m_nPetIndex - 1);
            this._petLook = null; // force rebuild
            this._buildContent();
            break;
          case 0x2001:
            this.m_nPetIndex = Math.min(this.m_aPetInfo.length - 1, this.m_nPetIndex + 1);
            this._petLook = null; // force rebuild
            this._buildContent();
            break;
        }
        break;

      case UtilDlgType.IMAGE:
        // OG case 9: 1→SetRet(1), 0x2000→prev, 0x2001→next, 8193→OK
        switch (nId) {
          case 1: this.SetRet(1); break;
          case 0x2000:
            this.m_usCurImage = Math.max(0, this.m_usCurImage - 1);
            this.m_bImagePrev = this.m_usCurImage > 0;
            this.m_bImageNext = this.m_usCurImage < this.m_aImageList.length - 1;
            this.UpdateImage();
            break;
          case 0x2001:
            this.m_usCurImage = Math.min(this.m_aImageList.length - 1, this.m_usCurImage + 1);
            this.m_bImagePrev = this.m_usCurImage > 0;
            this.m_bImageNext = this.m_usCurImage < this.m_aImageList.length - 1;
            this.UpdateImage();
            break;
        }
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OnKey (OG: 0x97B9C0) — m_bFinishShow = button focus index
  // ═══════════════════════════════════════════════════════════════════════════
  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;

    if (key === 'Escape') {
      if ((this.m_nBtnFocus & 1) === 0) this.SetRet(2);
      return true;
    }

    if (key === 'Enter') {
      const hasBtnFocus = (this.m_nBtnFocus & 1) !== 0;
      if (hasBtnFocus && this.m_bFinishShow >= 0 && this.m_bFinishShow < this._apBtnFocus.length) {
        // Click the focused button
        const focusedBtn = this._apBtnFocus[this.m_bFinishShow];
        if (focusedBtn) {
          // Simulate click — extract button ID from the container's userData
          const id = (focusedBtn as any).__btnId as number | undefined;
          if (id !== undefined) this.OnButtonClicked(id);
        }
      } else {
        switch (this.m_dlgType) {
          case UtilDlgType.TEXT: case UtilDlgType.YESNO:
            if (this.m_nCurDisplayItemIndex < this._lines.length) {
              this.m_nCurDisplayItemIndex = this._lines.length;
              this.m_nCurDisplayTextItemPos = 0;
              this.m_bFinishShow = this._apBtnFocus.length - 1;
              return true;
            }
            this.OnButtonClicked(8193);
            break;
          case UtilDlgType.INPUT: case UtilDlgType.INPUT_STR: case UtilDlgType.MLINPUT:
            this.OnButtonClicked(1);
            break;
          case UtilDlgType.LIST: case UtilDlgType.COMBOBOX:
            this.OnButtonClicked(8193);
            break;
          case UtilDlgType.AVATAR: case UtilDlgType.PET:
            this.OnButtonClicked(1);
            break;
          case UtilDlgType.IMAGE:
            if (this.m_bImageNext) this.OnButtonClicked(0x2001); // advance
            else this.OnButtonClicked(8193); // OK
            break;
        }
      }
      return true;
    }

    if (key === 'y' || key === 'Y') {
      if (this.m_dlgType === UtilDlgType.YESNO) { this.SetRet(6); return true; }
    }
    if (key === 'n' || key === 'N') {
      if (this.m_dlgType === UtilDlgType.YESNO) { this.SetRet(7); return true; }
      if (this.m_dlgType === UtilDlgType.IMAGE) { this.OnButtonClicked(0x2001); return true; }
    }

    // Left/Right: cycle button focus (OG m_bFinishShow semantics)
    if (key === 'ArrowLeft') {
      if (this._apBtnFocus.length > 0) {
        this.m_bFinishShow = (this.m_bFinishShow - 1 + this._apBtnFocus.length) % this._apBtnFocus.length;
        this.SetKeyFocus(this.m_bFinishShow);
        return true;
      }
    }
    if (key === 'ArrowRight') {
      if (this._apBtnFocus.length > 0) {
        this.m_bFinishShow = (this.m_bFinishShow + 1) % this._apBtnFocus.length;
        this.SetKeyFocus(this.m_bFinishShow);
        return true;
      }
    }

    // Up/Down: list navigation for LIST/COMBOBOX
    if (key === 'ArrowUp') {
      if (this.m_dlgType === UtilDlgType.LIST || this.m_dlgType === UtilDlgType.COMBOBOX) {
        this._moveSelection(-1);
        return true;
      }
    }
    if (key === 'ArrowDown') {
      if (this.m_dlgType === UtilDlgType.LIST || this.m_dlgType === UtilDlgType.COMBOBOX) {
        this._moveSelection(1);
        return true;
      }
    }

    // Input mode
    if (this.m_dlgType === UtilDlgType.INPUT || this.m_dlgType === UtilDlgType.INPUT_STR
      || this.m_dlgType === UtilDlgType.MLINPUT) {
      return this._handleInputKey(key);
    }

    return false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Input handling
  // ═══════════════════════════════════════════════════════════════════════════
  private _handleInputKey(key: string): boolean {
    if (key === 'Backspace') { this._inputValue = this._inputValue.slice(0, -1); this._updateInputDisplay(); return true; }
    if (key === 'Delete') { this._inputValue = ''; this._updateInputDisplay(); return true; }
    if (this.m_dlgType === UtilDlgType.INPUT) {
      if (/^\d$/.test(key) && this._inputValue.length < this.m_nInputLen) {
        this._inputValue += key; this._updateInputDisplay(); return true;
      }
    } else {
      if (key.length === 1 && this._inputValue.length < this.m_nInputLen) {
        this._inputValue += key; this._updateInputDisplay(); return true;
      }
    }
    return false;
  }

  private _updateInputDisplay(): void {
    if (this._inputText) {
      this._inputText.text = this.m_bInputStr_Passwd ? '*'.repeat(this._inputValue.length) : this._inputValue;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // List selection
  // ═══════════════════════════════════════════════════════════════════════════
  private _selectListItem(idx: number): void {
    const line = this._lines[idx];
    if (line && line.nSelect >= 0) this.m_nSelect = line.nSelect;
    this._refreshListVisuals();
  }

  private _refreshListVisuals(): void {
    for (let i = 0; i < this._listItems.length; i++) {
      const item = this._listItems[i];
      const line = this._lines[i];
      const bg = item.children[0] as Graphics;
      const h = line?.nHeight || 18;
      const clipW = getBasicCTWidth(this.m_dlgType, this.m_bNoNPC);
      bg.clear();
      bg.rect(0, 0, clipW, h).fill({
        color: line?.nSelect === this.m_nSelect ? 0x2A2D48 : 0x000000,
        alpha: line?.nSelect === this.m_nSelect ? 1 : 0,
      });
    }
  }

  private _updateListScroll(): void {
    for (let i = 0; i < this._listItems.length; i++) {
      this._listItems[i].y = this.m_ctTop + i * 18 - this.m_nScrollPos;
    }
  }

  private _moveSelection(delta: number): void {
    if (this._apListCT.length === 0) return;
    const curIdx = this._apListCT.findIndex(l => l.nSelect === this.m_nSelect);
    const nextIdx = Math.max(0, Math.min(this._apListCT.length - 1, curIdx + delta));
    this.m_nSelect = this._apListCT[nextIdx].nSelect;
    this.m_nListFocus = nextIdx;
    this._refreshListVisuals();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Mouse
  // ═══════════════════════════════════════════════════════════════════════════
  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    if (lx < 0 || lx > this.m_wndWidth || ly < 0 || ly > this.m_wndHeight) return true;
    if (this._scrollBar) {
      const sx = lx - this._scrollBar.container.x;
      const sy = ly - this._scrollBar.container.y;
      if (this._scrollBar.handleMouseButton(sx, sy, down)) return true;
    }
    return true;
  }

  handleMouseMove(x: number, y: number): void {
    if (!this.isVisible) return;
    if (this._scrollBar) {
      const lx = x - this._root.x - this._scrollBar.container.x;
      const ly = y - this._root.y - this._scrollBar.container.y;
      this._scrollBar.handleMouseMove(lx, ly);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Update
  // ═══════════════════════════════════════════════════════════════════════════
  update(dt: number): void {
    // Animate avatar
    if (this._charLook && this.m_dlgType === UtilDlgType.AVATAR) {
      this._charLook.Update(dt, { x: 0, y: 0 }, false, false);
      this._charLook.RebuildDisplay();
    }

    // Animate pet
    if (this._petLook && this.m_dlgType === UtilDlgType.PET) {
      this._petLook.Update(dt);
    }

    // Animate NPC speaker
    if (this._npcLook && !this.m_bNoNPC) {
      // NpcLook doesn't have a simple Update method — it's static in dialog context
    }

    // Typewriter for TEXT/YESNO
    if ((this.m_dlgType === UtilDlgType.TEXT || this.m_dlgType === UtilDlgType.YESNO)
      && !this.m_bNoNPC && !this.m_bFinishShow) {
      this._cursorBlink += dt;
      if (this._cursorBlink >= 0.03) {
        this._cursorBlink = 0;
        if (this.m_nCurDisplayItemIndex < this._lines.length) {
          const line = this._lines[this.m_nCurDisplayItemIndex];
          this.m_nCurDisplayTextItemPos += 2;
          if (this.m_nCurDisplayTextItemPos >= line.sText.length) {
            this.m_nCurDisplayItemIndex++;
            this.m_nCurDisplayTextItemPos = 0;
            if (this.m_nCurDisplayItemIndex >= this._lines.length) this.m_bFinishShow = this._apBtnFocus.length - 1;
          }
          this._rebuildTypewriterText();
        }
      }
    }

    if (this.m_dlgType === UtilDlgType.INPUT || this.m_dlgType === UtilDlgType.INPUT_STR
      || this.m_dlgType === UtilDlgType.MLINPUT) {
      this._cursorBlink += dt;
      if (this._cursorBlink >= 0.5) this._cursorBlink = 0;
      // Blink cursor
      if (this._inputCursor) {
        this._inputCursor.visible = Math.floor(this._cursorBlink * 2) % 2 === 0;
        // Position cursor after last character
        if (this._inputText) {
          const charWidth = 8; // approximate monospace width
          this._inputCursor.x = this._inputText.x + this._inputValue.length * charWidth;
        }
      }
    }
  }

  private _rebuildTypewriterText(): void {
    const toRemove: any[] = [];
    for (const child of this._contentLayer.children) {
      if (child instanceof Text) toRemove.push(child);
    }
    for (const c of toRemove) this._contentLayer.removeChild(c);

    let y = this.m_ctTop;
    for (let i = 0; i <= this.m_nCurDisplayItemIndex && i < this._lines.length; i++) {
      const line = this._lines[i];
      let displayText = line.sText;
      if (i === this.m_nCurDisplayItemIndex && !this.m_bFinishShow) {
        displayText = line.sText.substring(0, this.m_nCurDisplayTextItemPos);
      }
      const t = new Text({ text: displayText, style: this._fonts[Math.min(line.pFont, 11)] });
      t.x = this.m_ctLeft + line.nLeft;
      t.y = y;
      this._contentLayer.addChild(t);
      y += line.nHeight || 18;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════════════════
  destroy(): void {
    const idx = _activeDialogs.indexOf(this);
    if (idx >= 0) _activeDialogs.splice(idx, 1);
    this.isVisible = false;
    this._contentLayer.removeChildren();
    this._scrollBar = null;
    this._charLook = null;
    this._avatarLook = null;
    this._petLook = null;
    this._petLookIndex = -1;
    this._npcLook = null;
  }

  GetFont(index: number): TextStyle { return this._fonts[Math.min(index, 11)]; }
}

// ─── Result types ─────────────────────────────────────────────────────────
export type UtilDlgResult =
  | { type: 'ok' } | { type: 'cancel' } | { type: 'yes' } | { type: 'no' }
  | { type: 'prev' } | { type: 'next' };
