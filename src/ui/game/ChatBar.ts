import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzSprite } from '../../render/WzSprite.js';
import { ComboBox, ComboBoxItem } from '../ComboBox.js';

// ═══════════════════════════════════════════════════════════════════════════════
// OG v95 CUIStatusBar Chat — Exact coordinates from IDA decompilation
// All coordinates are in the 800×600 client frame (StatusBar's coordinate space).
// Decompiled from CUIStatusBar::OnCreate (0x87B5F0), ChatLogDraw (0x877B40),
// SetChatType (0x879C00), ChatLogAdd (0x87AEC0), OnKey (0x87FDE0),
// OnButtonClicked (0x880540), MakeCtrlEdit (0x870BA0), _ResetChatBarPos (0x86DC30).
// ═══════════════════════════════════════════════════════════════════════════════

// --- Chat window types (OG m_nChatWndType) ---
const CHAT_TYPE_MINIMAL = 1;  // Collapsed: no edit, no combo, y=518, h=24
const CHAT_TYPE_SMALL = 2;    // Small: edit+combo, y=492, h=24
const CHAT_TYPE_EXPANDED = 3; // Expanded: edit+combo, y=515-h, h=stored/70

// --- Edit control (OG MakeCtrlEdit 0x870BA0) ---
// CreateCtrl(id=1011, x=75, y=524, w=409, h=12)
const EDIT_ID = 1011;
const EDIT_X = 75;
const EDIT_Y = 524;
const EDIT_W = 409;
const EDIT_H = 12;
const EDIT_MAX_CHARS = 70;  // OG: 256 if GM, else 70

// --- ComboBox (OG MakeCtrlEdit 0x870BA0) ---
// CreateCtrl_2(id=1012, x=3, y=519, w=68, h=21)
const COMBO_ID = 1012;
const COMBO_X = 3;
const COMBO_Y = 519;
const COMBO_W = 68;
const COMBO_H = 21;
const COMBO_BOX_WIDTH = 90;  // OG: nBoxWidth = 90

// --- Display area (OG ChatLogDraw) ---
// Width: 577 (type 2/3) or 502 (type 1) minus m_nScrWidth
const DISPLAY_X = 0;        // OG: text drawn at x=9 inside canvas
const DISPLAY_W_577 = 577;  // Expanded/Small width
const DISPLAY_W_502 = 502;  // Minimal width
const LINE_H = 13;          // Line height (OG: 13px)
const CHAT_LINE_H = 13;     // Same as LINE_H
const MAX_LOG_ENTRIES = 64; // OG: m_aChatLog trimmed to > 0x40
const TEXT_X = 9;           // OG: DrawTextA x=9 inside canvas
const WHISPER_NAME_GAP = 45; // OG: gap after name for whisper text
const WHISPER_ICON_GAP = 11; // OG: icon X after name width
const CHANNEL_DIGIT_GAP = 22; // OG: channel digit X after name
const WHISPER_INDENT_PX = 38; // OG: first-line width reduction for whisper types
const CONTINUATION_INDENT = '     '; // OG: 5-space indent for wrapped lines

// --- Scrollbar (OG SetChatType) ---
const SCROLLBAR_ID = 1010;
const SCROLLBAR_W = 8;
const SCROLLBAR_MIN_H = 52;  // OG: hide thumb below this

// --- Filter buttons (OG OnButtonClicked 0x880540) ---
// IDs: 0x3F6=All, 0x3F7=Friend, 0x3F8=Guild, 0x3F9=Alliance, 0x3FA=Buddy, 0x3FB=Expedition
export const FILTER_ALL = 0;
export const FILTER_FRIEND = 8;
export const FILTER_GUILD = 4;
export const FILTER_ALLIANCE = 0x10;
export const FILTER_BUDDY = 0x20;    // IDA: index 4 = Buddy, NOT System
export const FILTER_EXPEDITION = 0x4000000;
export const FILTER_PARTY = 0;       // Party not a separate filter in OG
const FILTER_FLAGS = [FILTER_ALL, FILTER_FRIEND, FILTER_GUILD, FILTER_ALLIANCE, FILTER_BUDDY, FILTER_EXPEDITION];

// --- Tab bar (OG filter button labels from IDA _ResetChatBarPos) ---
const TAB_NAMES = ['All', 'Friend', 'Guild', 'Alliance', 'Buddy', 'Expedition'];
const TAB_H = 18;
const TAB_SPACING = 46;  // OG: filter button spacing in _ResetChatBarPos

// --- ComboBox items (OG StringPool IDs from MakeCtrlEdit) ---
// Index 0=0x324(All), 1=0x327(Whisper), 2=0x323(Party), 3=0x189C(Buddy),
// Index 4=0x326(Guild), 5=0x1896(Alliance), 8=0x322(Find)
const CHAT_TARGETS = ['All', 'Whisper', 'Party', 'Buddy', 'Guild', 'Alliance', '', '', 'Find'];
const CHAT_TARGET_INTERNAL = ['all', 'whisper', 'party', 'buddy', 'guild', 'alliance', '', '', 'find'];

// --- Tab cycling (OG OnKey 0x87FDE0 — VK_TAB mapping) ---
// Tab index 0..8 cycles through chat targets in this exact order:
const TAB_CYCLE = [6, 2, 3, 4, 5, -1, 1, 8, 0];
// -1 = whisper special (calls ChangeWhisperTarget or uses existing target)

// --- Chat target types (OG internal lType values) ---
const CHAT_TYPE_WHISPER = 14;
const CHAT_TYPE_PARTY = 2;
const CHAT_TYPE_BUDDY = 3;
const CHAT_TYPE_GUILD = 4;
const CHAT_TYPE_ALLIANCE = 5;
const CHAT_TYPE_EXPEDITION_TYPE = 26;
const CHAT_TYPE_COUPLE = 6;  // SendCoupleMessage
const CHAT_TYPE_FIND = 8;    // SendChatMsg
const CHAT_TYPE_SYSTEM = 12;

// --- OG per-type font colors (from OnCreate 0x87B5F0 m_pFontChatLog[0..26]) ---
// Font height 11 for most, 12 for indices 15,18,19,20,21,22
const FONT_COLORS: { height: number; color: number }[] = [
  { height: 11, color: 0xFFFFFFFF },  // 0: white (default)
  { height: 11, color: 0xFF00FF00 },  // 1: green (party)
  { height: 11, color: 0xFFFF9A9C },  // 2: pink (buddy)
  { height: 11, color: 0xFF009900 },  // 3: dark green (guild)
  { height: 11, color: 0xFFE1A42E },  // 4: orange (alliance)
  { height: 11, color: 0xFFA6A6A6 },  // 5: gray (system)
  { height: 11, color: 0xFFFF6827 },  // 6: red-orange
  { height: 11, color: 0xFFBB553B },  // 7: brown
  { height: 11, color: 0xFFFFFF00 },  // 8: yellow (item link)
  { height: 11, color: 0xFFFFF080 },  // 9: light yellow
  { height: 11, color: 0xFF60606F },  // 10: dark gray
  { height: 11, color: 0xFF000000 },  // 11: black
  { height: 11, color: 0xFFFFAF9F },  // 12: light pink
  { height: 11, color: 0xFF004F00 },  // 13: very dark green
  { height: 11, color: 0xFF76151A },  // 14: dark red (whisper)
  { height: 12, color: 0xFF000000 },  // 15: black
  { height: 11, color: 0xFF4477AA },  // 16: blue
  { height: 11, color: 0xFF6C44AA },  // 17: purple
  { height: 12, color: 0xFFFC6D25 },  // 18: orange (marriage)
  { height: 12, color: 0xFF000000 },  // 19: black
  { height: 12, color: 0xFFFFFFFF },  // 20: white
  { height: 12, color: 0xFF000000 },  // 21: black
  { height: 12, color: 0xFFFFFFFF },  // 22: white
  { height: 11, color: 0xFF4477A9 },  // 23: blue variant
  { height: 11, color: 0xFFBB553B },  // 24: brown
  { height: 11, color: 0xFFFFFF00 },  // 25: yellow
  { height: 11, color: 0xFF7E6612 },  // 26: olive
];

// ═══════════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════════
const _inputStyle = new TextStyle({ fill: '#FFD', fontSize: 11, fontFamily: 'monospace' });
const _comboStyle = new TextStyle({ fill: '#FFF', fontSize: 11, fontFamily: 'monospace' });
const _tabStyle = new TextStyle({ fill: '#CCC', fontSize: 10, fontFamily: 'monospace' });
const _tabActiveStyle = new TextStyle({ fill: '#FFF', fontSize: 10, fontFamily: 'monospace' });

// ═══════════════════════════════════════════════════════════════════════════════
// ChatLog entry (OG CUIStatusBar::CChatLog)
// ═══════════════════════════════════════════════════════════════════════════════
// OG CChatLog struct (0x34 = 52 bytes per entry)
interface ChatLogEntry {
  text: string;           // m_sChat (ZXString<unsigned short>)
  lType: number;          // _ZtlSecureTear_m_nType
  nBack: number;          // m_nBack (background highlight color, 0=none)
  nChannelID: number;     // m_nChannelID (-1 = none)
  bWhisperIcon: boolean;  // m_bWhisperIcon
  isFirstLine: boolean;   // m_bFirstLine
  itemID: number;         // m_pItem.nItemID (0 = no item link)
  itemLinks?: { start: number; end: number; itemId: number }[];  // char ranges for [ItemName] spans
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main ChatBar class
// ═══════════════════════════════════════════════════════════════════════════════
export class ChatBar extends GamePanel {
  // Callbacks
  onSendChat: ((msg: string) => void) | null = null;
  onItemLink: ((itemId: number) => void) | null = null;
  onChatTargetChange: ((target: string) => void) | null = null;
  onTabChange: ((tab: number) => void) | null = null;
  onEmotion: ((emotion: number) => void) | null = null; // OG: SendEmotionChange

  // --- OG state variables ---
  private _chatType = CHAT_TYPE_MINIMAL;
  private _chatHeight = 24;
  private _chatWndY = 518;     // m_ptChatWnd.y
  private _chatWndLineVisible = 1; // m_nChatWndLineVisible
  private _nScrWidth = SCROLLBAR_W; // m_nScrWidth = CCtrlScrollBar::GetScrollBarSize(1, 8)
  private _dwChatFilterFlag = 0; // m_dwChatFilterFlag
  private _nChatTarget = 0;    // m_nChatTarget (0=all, per combo index)
  private _tabCycleIndex = 0;  // m_paramEdit.sEmptyImageUOL (tab cycle position)
  private _activeTab = 0;
  private _isFocused = false;
  private _blinkTimer = 0;
  private _cursorVisible = true;

  // Input
  private _input = '';
  private _historyIndex = -1;
  private _sentHistory: string[] = [];

  // Chat log (OG m_aChatLog)
  private _chatLog: ChatLogEntry[] = [];

  // Whisper (OG m_sWhisperTarget, m_lsWhisperCandidate)
  private _whisperTarget = '';
  private _whisperCandidate: string[] = []; // max 10

  // Drag resize (OG m_bDragChatWnd, m_nCurPtY)
  private _draggingResize = false;
  private _dragStartY = 0;
  private _dragStartH = 0;

  // Scrollbar drag
  private _isDraggingScroll = false;
  private _dragScrollY = 0;
  private _scroll = 0;
  private _lastScrollTime = 0; // OG: m_dwLastScrolled

  // WZ layers (loaded in initWzAssets)
  private _layerSpace: Sprite | null = null;   // chatSpace (display bg)
  private _layerSpace2: Sprite | null = null;  // chatSpace2
  private _layerEnter: Sprite | null = null;   // chatEnter (input bg)
  private _layerCover: Sprite | null = null;   // chatCover
  private _layerChatBar: Sprite | null = null; // tapBar (577×4 separator)
  private _layerTapBarOver: Sprite | null = null; // tapBarOver (hover state)

  // Display elements (Graphics fallbacks, hidden when WZ available)
  private _bg: Graphics;
  private _inputBg: Graphics;
  private _cursor: Graphics;
  private _inputText: Text;

  // Combo box
  private _combo: ComboBox;

  // Tab bar
  private _tabBarGfx: Graphics;
  private _tabGraphics: Graphics[] = [];
  private _tabLabels: Text[] = [];
  private _tabBarSprites: (Sprite | null)[] = [];

  // OG: whisper icon sprites (4 variants) and channel digit sprites (0-9)
  private _whisperIcons: (WzSprite | null)[] = [null, null, null, null];
  private _channelDigits: (WzSprite | null)[] = [];

  // Chat log display lines (each is a Container with optional whisper icon + channel digits + text)
  private _lines: Container[] = [];
  private _lineTexts: Text[] = [];  // shortcut to the Text child of each _lines[i]
  private _maxLines = 5;

  // OG: m_pFontChatLog[0..26] — per-type fonts
  private _chatFonts: TextStyle[] = [];

  // Scrollbar
  private _scrollGfx: Graphics;

  constructor() {
    super();
    this.isVisible = true;
    this.draggable = false;
    this._root.x = 0;
    this._root.y = 0;

    // Display background — hidden until WZ check
    this._bg = new Graphics();
    this._bg.visible = false;
    this._root.addChild(this._bg);

    // Tab bar
    this._tabBarGfx = new Graphics();
    this._tabBarGfx.visible = false;
    this._root.addChild(this._tabBarGfx);

    for (let i = 0; i < TAB_NAMES.length; i++) {
      const g = new Graphics();
      this._tabGraphics.push(g);
      this._root.addChild(g);

      const t = new Text({ text: TAB_NAMES[i], style: _tabStyle });
      t.visible = false;
      this._tabLabels.push(t);
      this._root.addChild(t);
      this._tabBarSprites.push(null);
    }

    // Chat log lines — created by _rebuildLines in _applyLayout

    // Scrollbar
    this._scrollGfx = new Graphics();
    this._scrollGfx.visible = false;
    this._root.addChild(this._scrollGfx);

    // Input area
    this._inputBg = new Graphics();
    this._inputBg.visible = false;
    this._root.addChild(this._inputBg);

    this._inputText = new Text({ text: '', style: _inputStyle });
    this._inputText.x = EDIT_X + 4;
    this._inputText.y = EDIT_Y + 1;
    this._root.addChild(this._inputText);

    this._cursor = new Graphics();
    this._cursor.rect(0, 0, 1, 11).fill({ color: '#FFF' });
    this._cursor.x = EDIT_X + 4;
    this._cursor.y = EDIT_Y + 1;
    this._cursor.visible = false;
    this._root.addChild(this._cursor);

    // Combo box (reusable ComboBox component)
    const comboItems: ComboBoxItem[] = CHAT_TARGETS
      .map((t, i) => ({ label: t, value: CHAT_TARGET_INTERNAL[i] }))
      .filter(it => it.label);
    this._combo = new ComboBox({ width: COMBO_W, height: COMBO_H, style: _comboStyle });
    this._combo.setItems(comboItems);
    this._combo.onChange = (val) => {
      const idx = CHAT_TARGET_INTERNAL.indexOf(val);
      if (idx >= 0) {
        this._nChatTarget = idx;
        this.onChatTargetChange?.(val);
      }
    };
    this._combo.container.x = COMBO_X;
    this._combo.container.y = COMBO_Y;
    this._root.addChild(this._combo.container);

    // OG: m_pFontChatLog[0..26] — per-type fonts (height + ARGB color)
    for (const fc of FONT_COLORS) {
      this._chatFonts.push(new TextStyle({
        fill: this._argbToCss(fc.color),
        fontSize: fc.height,
        fontFamily: 'monospace',
      }      ));
    }

    // Build initial line containers for the default MINIMAL chat type
    this._applyLayout();
  }

  relayout(_viewW: number, _viewH: number): void {
    // OG: ChatBar uses absolute 800×600 frame coords — position never changes
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: SetChatType (0x879C00) — switch between minimal/small/expanded
  // ═══════════════════════════════════════════════════════════════════════════
  toggleChat(): void {
    if (this._chatType === CHAT_TYPE_MINIMAL) {
      this.setChatType(CHAT_TYPE_EXPANDED);
    } else {
      this.setChatType(CHAT_TYPE_MINIMAL);
    }
  }

  get chatType(): number { return this._chatType; }
  get chatHeight(): number { return this._chatHeight; }

  setChatType(type: number, height?: number): void {
    if (type === this._chatType) return;
    this._chatType = type;

    if (type === CHAT_TYPE_MINIMAL) {
      // OG: height=24, y=518, MakeCtrlEdit(0), scrollbar hidden
      this._chatHeight = 24;
      this._chatWndY = 518;
      this._chatWndLineVisible = 1;
      this._maxLines = 1;
      this._scroll = 0;
    } else if (type === CHAT_TYPE_SMALL) {
      // OG: height=24, y=492, MakeCtrlEdit(1), scrollbar hidden
      this._chatHeight = 24;
      this._chatWndY = 492;
      this._chatWndLineVisible = 1;
      this._maxLines = 1;
      this._scroll = 0;
    } else {
      // OG: height=stored or 70, y=515-height, MakeCtrlEdit(1)
      // Height range check: if outside 26..463, default to 70
      this._chatHeight = height ?? 70;
      if (this._chatHeight < 26 || this._chatHeight > 463) {
        this._chatHeight = 70;
      }
      // OG: m_nChatWndLineVisible = height / 13
      this._chatWndLineVisible = Math.floor(this._chatHeight / CHAT_LINE_H);
      // OG: if height % 13 == 0, height += 2
      if (this._chatHeight % 13 === 0) this._chatHeight += 2;
      // OG: m_ptChatWnd.y = 515 - m_nChatWndHeight
      this._chatWndY = 515 - this._chatHeight;
      this._maxLines = this._chatWndLineVisible;
    }

    this._applyLayout();
    this._updateWzVisibility();
    this._updateFilterButtons();
    this._syncLines();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: MakeCtrlEdit (0x870BA0) — WZ layer visibility per chat type
  // ═══════════════════════════════════════════════════════════════════════════
  private _updateWzVisibility(): void {
    // bCreate=0 (minimal): chatEnter=false, chatCover=false, chatSpace=true, chatSpace2=true
    // bCreate=1 (small/expanded): chatEnter=true, chatCover=true, chatSpace=false, chatSpace2=false
    const bCreate = this._chatType !== CHAT_TYPE_MINIMAL;
    if (this._layerSpace) this._layerSpace.visible = !bCreate;
    if (this._layerSpace2) this._layerSpace2.visible = !bCreate;
    if (this._layerEnter) this._layerEnter.visible = bCreate;
    if (this._layerCover) this._layerCover.visible = bCreate;

    // Hide Graphics fallbacks when WZ layers available
    this._bg.visible = !this._layerSpace && !this._layerSpace2;
    this._inputBg.visible = !this._layerEnter;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: _ResetChatBarPos (0x86DC30) — position layers + filter buttons
  // ═══════════════════════════════════════════════════════════════════════════
  private _applyLayout(): void {
    // Display Y varies by type
    const displayY = this._chatWndY;
    const displayW = this._chatType === CHAT_TYPE_MINIMAL ? DISPLAY_W_502 : DISPLAY_W_577;

    // Tab bar position — overlays top of display
    const tabBarY = displayY;
    this._tabBarGfx.clear();
    this._tabBarGfx.rect(DISPLAY_X, tabBarY, displayW, TAB_H).fill({ color: '#222', alpha: 0.7 });
    const showTabs = this._chatType === CHAT_TYPE_EXPANDED;
    this._tabBarGfx.visible = showTabs;
    for (let i = 0; i < TAB_NAMES.length; i++) {
      const tx = DISPLAY_X + i * TAB_SPACING;
      this._tabGraphics[i].clear();
      this._tabGraphics[i].visible = showTabs;
      this._tabLabels[i].visible = showTabs;
      this._tabLabels[i].x = tx + 4;
      this._tabLabels[i].y = tabBarY + 2;
    }

    // Chat log lines
    this._rebuildLines(displayY, displayW);

    // Display background
    this._bg.clear();
    this._bg.rect(DISPLAY_X, displayY, displayW, this._chatHeight)
      .fill({ color: '#000', alpha: this._chatType === CHAT_TYPE_MINIMAL ? 1.0 : 0.5 });
    this._bg.rect(DISPLAY_X, displayY, displayW, this._chatHeight)
      .stroke({ color: '#444', width: 1 });

    // Input background
    this._inputBg.clear();
    this._inputBg.rect(EDIT_X, EDIT_Y, EDIT_W, EDIT_H).fill({ color: '#111', alpha: 0.8 });
    this._inputBg.rect(EDIT_X, EDIT_Y, EDIT_W, EDIT_H).stroke({ color: '#555', width: 1 });

    // tapBar layer position (OG: RelMove(0, m_ptChatWnd.y - 2))
    if (this._layerChatBar) {
      this._layerChatBar.position.set(0, this._chatWndY - 2);
    }

    // Filter buttons position (OG: _ResetChatBarPos — x starts at 1, y = m_ptChatWnd.y - 19, spacing 46px)
    let btnX = 1;
    const btnY = this._chatWndY - 19;
    for (let i = 0; i < this._tabLabels.length; i++) {
      this._tabGraphics[i].position.set(btnX, btnY);
      this._tabLabels[i].position.set(btnX + 4, btnY + 2);
      btnX += TAB_SPACING;
    }

    // Scrollbar (OG SetChatType scrollbar setup)
    this._drawScrollbar();
  }

  private _rebuildLines(displayY: number, displayW: number): void {
    for (const line of this._lines) {
      line.removeFromParent();
      line.destroy({ children: true });
    }
    this._lines = [];
    this._lineTexts = [];

    const tabOffset = this._chatType === CHAT_TYPE_EXPANDED ? TAB_H : 0;
    for (let i = 0; i < this._maxLines; i++) {
      const container = new Container();
      container.y = displayY + tabOffset + 2 + i * LINE_H;
      container.visible = false;

      // OG: DrawTextA(canvas, x=9, y=yPos, ...) — text at x=9 inside canvas
      const t = new Text({ text: '', style: this._chatFonts[0] });
      t.x = TEXT_X;
      container.addChild(t);

      this._lines.push(container);
      this._lineTexts.push(t);
      this._root.addChild(container);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: Filter button visibility (_ResetChatBarPos)
  // ═══════════════════════════════════════════════════════════════════════════

  // OG: IsFiltered (0x86CD30) — check if chat type passes current filter
  private _isFiltered(lType: number): boolean {
    // OG: !dwFilterFlag || (nType>=12 && nType<=24) || ((1 << nType) & dwFilterFlag)
    return !this._dwChatFilterFlag
      || (lType >= 12 && lType <= 24)
      || ((1 << lType) & this._dwChatFilterFlag) !== 0;
  }

  private _updateFilterButtons(): void {
    // OG: Filter buttons only visible in type 3
    const show = this._chatType === CHAT_TYPE_EXPANDED;
    for (let i = 0; i < this._tabLabels.length; i++) {
      this._tabGraphics[i].visible = show;
      this._tabLabels[i].visible = show;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: ChatLogAdd (0x87AEC0) — add message with word-wrap
  // ═══════════════════════════════════════════════════════════════════════════
  addLine(text: string, lTypeOrLinks: number | { itemId: number; start: number; end: number }[] = 0, channelID = -1, whisperIcon = false): void {
    // Backward-compatible: if second arg is an array, treat as old links param
    const lType = typeof lTypeOrLinks === 'number' ? lTypeOrLinks : 0;
    // OG: word-wrap at 547-nScrWidth pixels, first-line whisper indent -38
    let maxWidth = 547 - this._nScrWidth;
    // OG: types 14,16,19,20 get -38 on first line
    if ((lType === 14 || lType === 16 || lType === 19 || lType === 20)) {
      maxWidth -= WHISPER_INDENT_PX;
    }
    const words = text.split(/(\s+)/);
    let currentLine = '';
    let isFirstLine = true;
    let lineNum = 0;

    for (const word of words) {
      const testLine = currentLine + word;
      // Rough char-width estimate: ~7px per char at fontSize 11 monospace
      if (testLine.length * 7 > maxWidth && currentLine.length > 0) {
        lineNum++;
        this._chatLog.push({ text: currentLine, lType, nBack: 0, nChannelID: channelID, bWhisperIcon: whisperIcon, isFirstLine, itemID: 0 });
        // OG: continuation lines get 5-space indent if not in type 7-12 range
        currentLine = (lType < 7 || lType > 12) ? CONTINUATION_INDENT + word : word;
        isFirstLine = false;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine.length > 0) {
      this._chatLog.push({ text: currentLine, lType, nBack: 0, nChannelID: channelID, bWhisperIcon: whisperIcon, isFirstLine, itemID: 0 });
    }

    // OG: trim to MAX_LOG_ENTRIES (0x40 = 64)
    while (this._chatLog.length > MAX_LOG_ENTRIES) {
      this._chatLog.shift();
    }

    this._refreshChatLog();
  }

  addMapleLine(text: string, itemNameFn: (id: number) => string | null | undefined, filterType = FILTER_ALL): void {
    // OG: parse #i<ItemID># tags → [ItemName] with item link tracking
    const links: { start: number; end: number; itemId: number }[] = [];
    const processed = text.replace(/#i(\d+)#/g, (_match, idStr) => {
      const itemId = parseInt(idStr, 10);
      const name = itemNameFn(itemId);
      if (name !== null && name !== undefined) {
        const replacement = `[${name}]`;
        return replacement;
      }
      return _match;
    });
    // Now compute link positions in the processed text by scanning for [Name] patterns
    let scanPos = 0;
    const original = text;
    const re = /#i(\d+)#/g;
    let m: RegExpExecArray | null;
    let resultOffset = 0;
    while ((m = re.exec(original)) !== null) {
      const itemId = parseInt(m[1], 10);
      const name = itemNameFn(itemId);
      if (name !== null && name !== undefined) {
        const replacement = `[${name}]`;
        // Position in processed text = original match start + accumulated offset
        const start = m.index + resultOffset;
        links.push({ start, end: start + replacement.length, itemId });
        resultOffset += replacement.length - m[0].length;
      } else {
        resultOffset += 0; // no change in length
      }
    }
    this.addLine(processed, 0);
    // Attach link metadata to the last chatLog entry
    if (links.length > 0 && this._chatLog.length > 0) {
      const entry = this._chatLog[this._chatLog.length - 1];
      entry.itemLinks = links;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: _RefreshChatLog (0x879B70) — auto-scroll with 5s timeout
  // ═══════════════════════════════════════════════════════════════════════════
  _refreshChatLog(): void {
    const totalEntries = this._chatLog.length;
    const scrollRange = Math.max(0, totalEntries - this._chatWndLineVisible + 1);
    const now = performance.now();
    // OG: if scrollRange <= 2 OR already at bottom OR 5000ms since last scroll → snap to bottom
    if (scrollRange <= 2 || this._scroll >= scrollRange - 1 || (now - this._lastScrollTime) > 5000) {
      this._scroll = Math.max(0, scrollRange - 1);
    }
    this._syncLines();
    this._drawScrollbar();
  }

  private _syncLines(): void {
    // OG ChatLogDraw: filter entries, compute scroll from bottom, render per-type
    const filtered: number[] = [];
    for (let i = 0; i < this._chatLog.length; i++) {
      const e = this._chatLog[i];
      if (this._isFiltered(e.lType)) filtered.push(i);
    }

    const totalVisible = filtered.length;
    const scrollRange = Math.max(0, totalVisible - this._chatWndLineVisible + 1);
    const clampedScroll = Math.min(this._scroll, scrollRange);

    // lFromBottom: index into filtered[] of the bottommost visible entry
    const bottomIdx = totalVisible - 1 - clampedScroll;

    for (let i = 0; i < this._maxLines; i++) {
      const container = this._lines[i];
      if (!container) continue;
      // Remove all old children (text, icons, digits)
      while (container.children.length > 0) {
        container.removeChildAt(0).destroy();
      }

      const visIdx = bottomIdx - i;
      if (visIdx < 0 || visIdx >= filtered.length) {
        container.visible = false;
        continue;
      }

      const entry = this._chatLog[filtered[visIdx]];
      const font = this._chatFonts[entry.lType] ?? this._chatFonts[0];
      const isWhisperType = (entry.lType === 14 || entry.lType === 16 || entry.lType === 23 || entry.lType === 24);
      const showWhisper = isWhisperType && entry.isFirstLine;

      if (showWhisper) {
        // OG: split on ':' to separate character name from chat text
        const colonIdx = entry.text.indexOf(':');
        if (colonIdx > 0) {
          const charName = entry.text.substring(0, colonIdx);
          const chatText = entry.text.substring(colonIdx + 1);

          // Draw character name at (9, 0)
          const nameT = new Text({ text: charName, style: font });
          nameT.x = TEXT_X;
          container.addChild(nameT);

          // Measure name width for icon/digit positioning
          const nameW = nameT.width;

          if (entry.lType === 23) {
            // OG: type 23 draws channel ID at (nCharWidth + 9, nTop)
            if (entry.nChannelID >= 0) {
              const chStr = `${entry.nChannelID}`;
              const chT = new Text({ text: chStr, style: font });
              chT.x = nameW + 9;
              container.addChild(chT);
            }
          } else {
            // OG: types 14, 16, 24 — whisper icon + channel digits
            // Whisper icon position: (nCharWidth + 11, nTop - 1)
            // OG icon index: channel==1 ? (whisperIcon?3:2) : (whisperIcon?1:0)
            if (entry.nChannelID >= 0) {
              const iconIdx = entry.nChannelID === 1
                ? (entry.bWhisperIcon ? 3 : 2)
                : (entry.bWhisperIcon ? 1 : 0);
              const wzIcon = this._whisperIcons[iconIdx];
              if (wzIcon) {
                const s = new Sprite(wzIcon.Texture);
                s.anchor.set(0, 0);
                s.x = nameW + 11;
                s.y = -1;
                container.addChild(s);
              }
            }
            // Channel digits (only for non-current channels)
            if (entry.nChannelID >= 0 && entry.nChannelID !== 1) {
              const ch = entry.nChannelID;
              const tens = Math.floor(ch / 10);
              const ones = ch % 10;
              if (tens > 0 && this._channelDigits[tens]) {
                const s = new Sprite(this._channelDigits[tens]!.Texture);
                s.anchor.set(0, 0);
                s.x = nameW + 22;
                s.y = 3;
                container.addChild(s);
              }
              if (this._channelDigits[ones]) {
                const s = new Sprite(this._channelDigits[ones]!.Texture);
                s.anchor.set(0, 0);
                s.x = nameW + 27;
                s.y = 3;
                container.addChild(s);
              }
            }
          }

          // Draw chat text at (nCharWidth + 45, 0)
          const msgT = new Text({ text: chatText, style: font });
          msgT.x = nameW + 45;
          container.addChild(msgT);
        } else {
          // No colon found — render as plain text
          const t = new Text({ text: entry.text, style: font });
          t.x = TEXT_X;
          container.addChild(t);
          this._lineTexts[i] = t;
        }
      } else {
        // OG: regular line — DrawTextA(9, nTop, m_sChat, m_pFontChatLog[m_nType])
        const t = new Text({ text: entry.text, style: font });
        t.x = TEXT_X;
        container.addChild(t);
        this._lineTexts[i] = t;
      }

      container.visible = true;
    }
  }

  // OG: signed ARGB int → CSS color string
  private _argbToCss(argb: number): string {
    const a = ((argb >> 24) & 0xFF) / 255;
    const r = (argb >> 16) & 0xFF;
    const g = (argb >> 8) & 0xFF;
    const b = argb & 0xFF;
    if (a >= 1) return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    return `rgba(${r},${g},${b},${a.toFixed(2)})`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: _SetFilterButton — XOR toggle on m_dwChatFilterFlag
  // ═══════════════════════════════════════════════════════════════════════════
  get chatTarget(): string { return CHAT_TARGET_INTERNAL[this._nChatTarget] ?? 'all'; }
  get activeTab(): number { return this._activeTab; }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: SetChatTarget (0x87FD30) — switch chat target by combo index
  // ═══════════════════════════════════════════════════════════════════════════
  setChatTarget(target: number): void {
    this._nChatTarget = target;
    this.onChatTargetChange?.(CHAT_TARGET_INTERNAL[target] ?? 'all');
  }

  // OG: SetChatTarget by internal index (for tab cycling)
  private setChatTargetByIndex(idx: number): void {
    this._nChatTarget = idx;
    this.onChatTargetChange?.(CHAT_TARGET_INTERNAL[idx] ?? 'all');
  }

  // OG: SetChatTarget by whisper name
  private setChatTargetByName(name: string): void {
    this._whisperTarget = name;
    this._nChatTarget = 7;
    this.onChatTargetChange?.('whisper');
    // Add to whisper candidate list (OG: AddWhisperCandidate)
    this._addWhisperCandidate(name);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: AddWhisperCandidate (0x879A50) — max 10, dedup, most-recent-first
  // ═══════════════════════════════════════════════════════════════════════════
  private _addWhisperCandidate(name: string): void {
    if (!name) return;
    // Dedup: remove existing
    const existing = this._whisperCandidate.indexOf(name);
    if (existing >= 0) this._whisperCandidate.splice(existing, 1);
    // Add to front
    this._whisperCandidate.unshift(name);
    // Trim to max 10
    while (this._whisperCandidate.length > 10) {
      this._whisperCandidate.pop();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: StartChat (0x87A4B0) — activate input
  // ═══════════════════════════════════════════════════════════════════════════
  focus(): void {
    if (this._chatType === CHAT_TYPE_MINIMAL) {
      this.setChatType(CHAT_TYPE_SMALL);
    }
    this._isFocused = true;
    this._cursor.visible = true;
    this._updateWzVisibility();
  }

  startChat(text?: string): void {
    if (this._chatType === CHAT_TYPE_MINIMAL) {
      this.setChatType(CHAT_TYPE_SMALL);
    }
    this.focus();
    if (text !== undefined) this.setInput(text);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: EndChat (0x87A520) — deactivate input
  // ═══════════════════════════════════════════════════════════════════════════
  endChat(): void {
    if (this._chatType === CHAT_TYPE_SMALL) {
      this.setChatType(CHAT_TYPE_MINIMAL);
    }
    this._blur();
  }

  private _blur(): void {
    if (this._chatType === CHAT_TYPE_SMALL) {
      this.setChatType(CHAT_TYPE_MINIMAL);
    }
    this._isFocused = false;
    this._cursor.visible = false;
    this._historyIndex = -1;
    this._input = '';
    this._syncInput();
    this._updateWzVisibility();
  }

  setInput(text: string): void {
    this._input = text;
    this._syncInput();
  }

  private _syncInput(): void {
    this._inputText.text = this._input;
    this._cursor.x = EDIT_X + 4 + this._inputText.width;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: SendInput — sanitize and route message (from OnKey VK_ENTER)
  // ═══════════════════════════════════════════════════════════════════════════
  private _sendInput(): void {
    let msg = this._input;
    if (msg.length === 0) return;

    // OG: sanitize — replace control chars with space
    msg = msg.replace(/[\x00-\x1F\x7F]/g, ' ').trim();
    if (msg.length === 0) return;

    // OG: route by first char
    if (msg.startsWith('/')) {
      // Slash command → SendChatMsgSlash
      this.onSendChat?.(msg);
      this._sentHistory.unshift(msg);
      if (this._sentHistory.length > 8) this._sentHistory.pop();
    } else if (this._whisperTarget && this._nChatTarget === 7) {
      // Whisper target set → SendChatMsgWhisper
      this.onSendChat?.(msg);
      this.addLine(`${this._whisperTarget} : ${msg}`, CHAT_TYPE_WHISPER, -1, false);
      this._sentHistory.unshift(msg);
      if (this._sentHistory.length > 8) this._sentHistory.pop();
    } else {
      // Route by current chat target (OG switch on tabCycleIndex)
      const target = this._nChatTarget;
      if (target >= 0 && target <= 5) {
        // Group message → SendGroupMessage
        this.onSendChat?.(msg);
      } else if (target === 6) {
        // Couple message → SendCoupleMessage
        this.onSendChat?.(msg);
      } else {
        // Normal chat → SendChatMsg
        this.onSendChat?.(msg);
      }

      // OG: emotion check — GetEmotionKey → SendEmotionChange
      const emotionKey = this._getEmotionKey(msg);
      if (emotionKey) {
        this.onEmotion?.(emotionKey - 111); // 113→2(smile), 115→4(cry)
      }

      this._sentHistory.unshift(msg);
      if (this._sentHistory.length > 8) this._sentHistory.pop();
    }

    this._historyIndex = -1;
    this._input = '';
    this._syncInput();
  }

  // OG: GetEmotionKey (0x8706E0) — detect emotion triggers in chat text
  // Returns emotion ID (2=smile, 4=cry) or 0 if none.
  // Patterns decoded from XOR-encrypted StringPool (IDs 0xD69-0xD70, 0x1AA7).
  private _getEmotionKey(text: string): number {
    const t = text.toLowerCase();
    // Group 1: happy/smile triggers → emotion 2 (return 113 → 113-111=2)
    // StringPool 0xD69="haha", 0xD6A="hoho", 0xD6B="hehe", 0xD6C="harhar", 0xD6D="wahaha"
    if (t.includes('haha') || t.includes('hoho') || t.includes('hehe') || t.includes('harhar') || t.includes('wahaha')) {
      return 113;
    }
    // Group 2: sad/cry triggers → emotion 4 (return 115 → 115-111=4)
    // StringPool 0xD6E="sob", 0xD6F="tears", 0x1AA7="cry", 0xD70="sniff"
    if (t.includes('sob') || t.includes('tears') || t.includes('cry') || t.includes('sniff')) {
      return 115;
    }
    return 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: HistoryUp / HistoryDown
  // ═══════════════════════════════════════════════════════════════════════════
  private _historyUp(): void {
    if (this._historyIndex < this._sentHistory.length - 1) {
      this._historyIndex++;
    }
    this._input = this._historyIndex >= 0 && this._historyIndex < this._sentHistory.length
      ? this._sentHistory[this._historyIndex] : '';
    this._syncInput();
  }

  private _historyDown(): void {
    if (this._historyIndex >= 0) {
      this._historyIndex--;
    }
    this._input = this._historyIndex >= 0 && this._historyIndex < this._sentHistory.length
      ? this._sentHistory[this._historyIndex] : '';
    this._syncInput();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: OnKey (0x87FDE0) — key handling
  // ═══════════════════════════════════════════════════════════════════════════
  onKeyPress(key: string): boolean {
    if (!this._isFocused) return false;

    if (key === 'Escape') {
      // OG: VK_ESCAPE → clear text + EndChat
      this._input = '';
      this._syncInput();
      this.endChat();
      return true;
    }
    if (key === 'Enter') {
      // OG: VK_ENTER → get text, EndChat, sanitize, route
      this._sendInput();
      this.endChat();
      return true;
    }
    if (key === 'Backspace') {
      this._input = this._input.slice(0, -1);
      this._syncInput();
      return true;
    }
    if (key === 'Tab') {
      // OG: VK_TAB → cycle 9 targets using TAB_CYCLE[tabCycleIndex]
      const next = TAB_CYCLE[this._tabCycleIndex];
      this._tabCycleIndex = (this._tabCycleIndex + 1) % TAB_CYCLE.length;
      if (next === -1) {
        // Whisper target — use existing whisper target or prompt
        if (this._whisperTarget) {
          this.setChatTargetByName(this._whisperTarget);
        } else {
          // OG: m_ptChatWnd.y = 1, SetChatTarget(7) → enter whisper input mode
          this._nChatTarget = 7;
          this._combo.setLabel('Whisper');
          this.onChatTargetChange?.('whisper');
        }
      } else {
        this.setChatTargetByIndex(next);
      }
      this._combo.close();
      return true;
    }
    if (key === 'ArrowUp') {
      this._historyUp();
      return true;
    }
    if (key === 'ArrowDown') {
      this._historyDown();
      return true;
    }
    if (key === 'Left' || key === 'Right') {
      // OG: VK_LEFT/VK_RIGHT → if edit empty, EndChat
      if (!this._input) {
        this.endChat();
        return true;
      }
      return false;
    }
    if (key === 'PageUp') {
      this.scrollBy(-this._maxLines);
      return true;
    }
    if (key === 'PageDown') {
      this.scrollBy(this._maxLines);
      return true;
    }
    // Regular character input
    if (key.length === 1) {
      if (this._input.length < EDIT_MAX_CHARS) {
        this._input += key;
        this._syncInput();
      }
      return true;
    }
    return false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: OnMouseButton (0x8803F0)
  // ═══════════════════════════════════════════════════════════════════════════
  handleMouseButton(x: number, y: number, down: boolean): boolean {
    const lx = x - this._root.x;
    const ly = y - this._root.y;
    const displayY = this._chatWndY;
    const displayW = this._chatType === CHAT_TYPE_MINIMAL ? DISPLAY_W_502 : DISPLAY_W_577;

    // Hit-test areas
    const tabOffset = this._chatType === CHAT_TYPE_EXPANDED ? TAB_H : 0;
    const inTabs = this._chatType === CHAT_TYPE_EXPANDED
      && lx >= DISPLAY_X && lx < DISPLAY_X + TAB_NAMES.length * TAB_SPACING
      && ly >= displayY && ly < displayY + TAB_H;
    const inDisplay = lx >= DISPLAY_X && lx < DISPLAY_X + displayW
      && ly >= displayY + tabOffset
      && ly < displayY + this._chatHeight;
    const inInput = lx >= EDIT_X && lx < EDIT_X + EDIT_W && ly >= EDIT_Y && ly < EDIT_Y + EDIT_H;
    const inScrollbar = this._scrollGfx.visible
      && lx >= DISPLAY_X + displayW - SCROLLBAR_W && lx < DISPLAY_X + displayW
      && ly >= displayY + TAB_H && ly < displayY + this._chatHeight;

    // Delegate combo box hit testing to ComboBox component
    const comboLx = lx - COMBO_X;
    const comboLy = ly - COMBO_Y;
    if (this._combo.handleMouseButton(comboLx, comboLy, down)) {
      return true;
    }

    if (!inTabs && !inDisplay && !inInput && !inScrollbar) {
      if (down) this._blur();
      return false;
    }

    if (!down) return true;

    // Scrollbar drag — track time for OG 5s timeout
    if (inScrollbar) {
      this._isDraggingScroll = true;
      this._dragScrollY = ly;
      this._lastScrollTime = performance.now();
      return true;
    }

    // Drag resize (OG: m_bDragChatWnd)
    if (this._chatType === CHAT_TYPE_EXPANDED && ly >= displayY + this._chatHeight - 4 && ly < displayY + this._chatHeight + 4) {
      this._draggingResize = true;
      this._dragStartY = y;
      this._dragStartH = this._chatHeight;
      return true;
    }

    // Tab click (OG: filter XOR toggle on m_dwChatFilterFlag)
    if (inTabs) {
      const tab = Math.floor((lx - DISPLAY_X) / TAB_SPACING);
      if (tab >= 0 && tab < TAB_NAMES.length) {
        this._activeTab = tab;
        if (tab === 0) {
          // OG: "All" tab clears all filters
          this._dwChatFilterFlag = 0;
        } else if (tab < FILTER_FLAGS.length) {
          // OG: other tabs toggle via XOR on m_dwChatFilterFlag
          this._dwChatFilterFlag ^= FILTER_FLAGS[tab];
        }
        this._refreshChatLog();
        this.onTabChange?.(tab);
      }
      return true;
    }

    // Input click → focus
    if (inInput) {
      this.focus();
      return true;
    }

    // Display click → focus + item link detection
    if (inDisplay) {
      this.focus();
      // OG: check if click lands on an item link in the display area
      if (down && this.onItemLink) {
        const tabOff = this._chatType === CHAT_TYPE_EXPANDED ? TAB_H : 0;
        const lineIdx = Math.floor((ly - displayY - tabOff - 2) / LINE_H);
        // Map display line index (bottom-up) to filtered chatLog index
        const filtered: number[] = [];
        for (let i = 0; i < this._chatLog.length; i++) {
          if (this._isFiltered(this._chatLog[i].lType)) filtered.push(i);
        }
        const totalVisible = filtered.length;
        const scrollRange = Math.max(0, totalVisible - this._chatWndLineVisible + 1);
        const clampedScroll = Math.min(this._scroll, scrollRange);
        const bottomIdx = totalVisible - 1 - clampedScroll;
        const visIdx = bottomIdx - lineIdx;
        if (visIdx >= 0 && visIdx < filtered.length) {
          const entry = this._chatLog[filtered[visIdx]];
          if (entry.itemLinks && entry.itemLinks.length > 0) {
            // Compute char index from click x: text starts at TEXT_X, each char ≈7px
            const charIdx = Math.floor((lx - TEXT_X) / 7);
            for (const link of entry.itemLinks) {
              if (charIdx >= link.start && charIdx < link.end) {
                this.onItemLink(link.itemId);
                break;
              }
            }
          }
        }
      }
      return true;
    }

    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: IsFiltered (0x86CD30) — filter visibility check
  // ═══════════════════════════════════════════════════════════════════════════
  private _isLineVisible(entry: ChatLogEntry): boolean {
    // OG: return !dwFilterFlag || (nType >= 12 && nType <= 24) || ((1 << nType) & dwFilterFlag)
    if (this._dwChatFilterFlag === 0) return true; // no filter — show everything
    if (entry.lType >= 12 && entry.lType <= 24) return true; // system types always visible
    return ((1 << entry.lType) & this._dwChatFilterFlag) !== 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Scrollbar (OG SetChatType scrollbar setup)
  // ═══════════════════════════════════════════════════════════════════════════
  private _drawScrollbar(): void {
    const displayW = this._chatType === CHAT_TYPE_MINIMAL ? DISPLAY_W_502 : DISPLAY_W_577;
    // OG: scrollbar only visible in type 3 (expanded) and when content overflows
    const showScrollbar = this._chatType === CHAT_TYPE_EXPANDED && this._chatLog.length > this._maxLines;
    this._scrollGfx.visible = showScrollbar;
    if (!showScrollbar) return;

    this._scrollGfx.clear();
    // OG: x = 565 - m_nScrWidth (type 2/3) or 515 - m_nScrWidth (type 1)
    const trackX = this._chatType === CHAT_TYPE_MINIMAL
      ? DISPLAY_X + 515 - this._nScrWidth
      : DISPLAY_X + 565 - this._nScrWidth;
    // OG: scrollbar Y = 516 - m_nChatWndHeight (type 3), 517 (type 1), 515-h (type 2)
    const trackTop = this._chatType === CHAT_TYPE_EXPANDED
      ? 516 - this._chatHeight + TAB_H
      : this._chatWndY;
    // OG: scrollbar height = m_nChatWndHeight - 2 (type 3)
    const trackH = this._chatType === CHAT_TYPE_EXPANDED
      ? this._chatHeight - 2 - TAB_H
      : this._chatHeight;
    const totalLines = this._chatLog.length;

    this._scrollGfx.rect(trackX, trackTop, SCROLLBAR_W, trackH).fill({ color: 0x333333, alpha: 0.6 });

    // OG: hide thumb if height < 52
    if (trackH < SCROLLBAR_MIN_H) {
      this._scrollGfx.visible = false;
      return;
    }

    const thumbH = Math.max(12, Math.floor(trackH * this._maxLines / Math.max(1, totalLines)));
    const span = trackH - thumbH;
    const maxScroll = Math.max(1, totalLines - this._maxLines);
    const frac = Math.max(0, Math.min(1, this._scroll / maxScroll));
    const ty = trackTop + Math.floor(span * frac);
    this._scrollGfx.rect(trackX + 1, ty, SCROLLBAR_W - 2, thumbH).fill({ color: 0x888888 });
  }

  scrollBy(delta: number): void {
    const maxScroll = Math.max(0, this._chatLog.length - this._maxLines);
    this._scroll = Math.max(0, Math.min(maxScroll, this._scroll + delta));
    this._lastScrollTime = performance.now(); // OG: m_dwLastScrolled
    this._syncLines();
    this._drawScrollbar();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Update (cursor blink)
  // ═══════════════════════════════════════════════════════════════════════════
  update(dt: number): void {
    if (!this._isFocused) return;
    this._blinkTimer += dt;
    if (this._blinkTimer > 0.5) {
      this._blinkTimer = 0;
      this._cursorVisible = !this._cursorVisible;
      this._cursor.visible = this._cursorVisible;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WZ Asset Loading (OG OnCreate 0x87B5F0)
  // ═══════════════════════════════════════════════════════════════════════════
  initWzAssets(loader: WzTextureLoader, ui: WzPackage): void {
    // OG: ChatBar loads WZ from StatusBar2.img/mainBar via WzProperty.Get() —
    // same pattern StatusBar uses (proven working), NOT full-path ui.GetItem().
    const bar = ui.GetItem('StatusBar2.img/mainBar') as WzProperty | null;
    if (!bar) return;

    // Helper: get canvas child from a WzProperty parent, unwrap if needed
    const loadCanvas = (parent: WzProperty, name: string, x: number, y: number, visible = true): Sprite | null => {
      try {
        const node = parent.Get(name);
        if (!node) return null;
        if (node instanceof WzCanvas) {
          const wzSprite = loader.Load(node);
          if (wzSprite) {
            const s = wzSprite.ToPixi();
            if (s) { s.anchor.set(0, 0); s.position.set(x, y); s.visible = visible; this._root.addChild(s); return s; }
          }
        } else if (typeof (node as any).Get === 'function' && typeof (node as any).ToPixi !== 'function') {
          // Property node — unwrap by looking for '0' or 'bmp' child canvas
          const inner = (node as any).Get('0') ?? (node as any).Get('bmp');
          if (inner instanceof WzCanvas) {
            const wzSprite = loader.Load(inner);
            if (wzSprite) {
              const s = wzSprite.ToPixi();
              if (s) { s.anchor.set(0, 0); s.position.set(x, y); s.visible = visible; this._root.addChild(s); return s; }
            }
          }
        }
      } catch {}
      return null;
    };

    // Chat layers (OG OnCreate lines 1814-1893) — all direct children of mainBar
    this._layerSpace = loadCanvas(bar, 'chatSpace', DISPLAY_X, this._chatWndY);
    this._layerSpace2 = loadCanvas(bar, 'chatSpace2', DISPLAY_X, this._chatWndY);
    this._layerEnter = loadCanvas(bar, 'chatEnter', EDIT_X, EDIT_Y, false);
    this._layerCover = loadCanvas(bar, 'chatCover', DISPLAY_X + DISPLAY_W_577 - 82, EDIT_Y, false);

    // Combo box WZ sprite (OG: StatusBar2.img/mainBar/chatTarget/base)
    const ctBase = bar.Get('chatTarget') as WzProperty | null;
    if (ctBase) {
      this._combo.loadWzAsset(loader, ctBase, 'base');
    }

    // Tab bar filter buttons (OG: StatusBar2.img/chat/Tap/*)
    const chatRoot = ui.GetItem('StatusBar2.img/chat') as WzProperty | null;
    const filterNames = ['all', 'friend', 'party', 'guild', 'association', 'expedition'];
    if (chatRoot) {
      for (let i = 0; i < Math.min(TAB_NAMES.length, 6); i++) {
        const tapRoot = chatRoot.Get('Tap') as WzProperty | null;
        const tapNode = tapRoot?.Get(filterNames[i]);
        if (tapNode && typeof (tapNode as any).Get === 'function') {
          const normal = (tapNode as any).Get('normal/0') ?? (tapNode as any).Get('normal');
          if (normal instanceof WzCanvas) {
            const wzSprite = loader.Load(normal);
            if (wzSprite) {
              const s = wzSprite.ToPixi();
              if (s) {
                s.anchor.set(0, 0);
                s.position.set(DISPLAY_X + i * TAB_SPACING, this._chatWndY);
                this._tabBarSprites[i] = s;
                this._root.addChild(s);
              }
            }
          }
        }
      }
    }

    // tapBar layer (OG SetChatType line 265: "UI/StatusBar2.img/chat/tapBar")
    if (chatRoot) {
      const tapBarNode = chatRoot.Get('tapBar');
      if (tapBarNode) {
        let canvasNode: unknown = tapBarNode;
        if (typeof (tapBarNode as any).Get === 'function' && typeof (tapBarNode as any).ToPixi !== 'function') {
          const inner = (tapBarNode as any).Get('0') ?? (tapBarNode as any).Get('bmp');
          if (inner) canvasNode = inner;
        }
        if (canvasNode instanceof WzCanvas) {
          const wzSprite = loader.Load(canvasNode);
          if (wzSprite) {
            const s = wzSprite.ToPixi();
            if (s) {
              s.anchor.set(0, 0);
              s.position.set(1, this._chatWndY - 2);
              s.zIndex = 0;
              this._layerChatBar = s;
              this._root.addChild(s);
            }
          }
        }
      }
    }

    // tapBarOver (OG: "UI/StatusBar2.img/chat/tapBarOver" — hover state)
    if (chatRoot) {
      const tapBarOverNode = chatRoot.Get('tapBarOver');
      if (tapBarOverNode) {
        let canvasNode: unknown = tapBarOverNode;
        if (typeof (tapBarOverNode as any).Get === 'function' && typeof (tapBarOverNode as any).ToPixi !== 'function') {
          const inner = (tapBarOverNode as any).Get('0') ?? (tapBarOverNode as any).Get('bmp');
          if (inner) canvasNode = inner;
        }
        if (canvasNode instanceof WzCanvas) {
          const wzSprite = loader.Load(canvasNode);
          if (wzSprite) {
            const s = wzSprite.ToPixi();
            if (s) {
              s.anchor.set(0, 0);
              s.position.set(0, this._chatWndY - 2);
              s.visible = false;
              this._layerTapBarOver = s;
              this._root.addChild(s);
            }
          }
        }
      }
    }

    // OG: whisper icon sprites (StringPool 6581 → "UI/StatusBar.img/chat/whisper/%d")
    if (chatRoot) {
      for (let i = 0; i < 4; i++) {
        const node = chatRoot.Get(`whisper/${i}`);
        if (node instanceof WzCanvas) {
          const wzSprite = loader.Load(node);
          if (wzSprite) {
            this._whisperIcons[i] = wzSprite;
          }
        }
      }
    }

    // OG: channel digit sprites (StringPool 6582 → "UI/StatusBar.img/chat/digit/%d")
    if (chatRoot) {
      for (let i = 0; i <= 9; i++) {
        const node = chatRoot.Get(`digit/${i}`);
        if (node instanceof WzCanvas) {
          const wzSprite = loader.Load(node);
          if (wzSprite) {
            this._channelDigits[i] = wzSprite;
          }
        }
      }
    }

    this._applyLayout();
    this._updateWzVisibility();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Position saving (OG CreateUIWndPosSaved key 10)
  // ═══════════════════════════════════════════════════════════════════════════
  handleMouseButtonGlobal(x: number, y: number, down: boolean): void {
    if (!down && this._isDraggingScroll) {
      this._isDraggingScroll = false;
    }
    if (!down && this._draggingResize) {
      this._draggingResize = false;
      this.setChatType(CHAT_TYPE_EXPANDED, this._chatHeight);
    }
  }

  // OG: OnMouseMove (226 lines) — scrollbar drag, resize drag, tap bar hover
  onMouseMove(x: number, y: number): void {
    const lx = x - this._root.x;
    const ly = y - this._root.y;

    if (this._isDraggingScroll) {
      const displayW = this._chatType === CHAT_TYPE_MINIMAL ? DISPLAY_W_502 : DISPLAY_W_577;
      const trackTop = this._chatType === CHAT_TYPE_EXPANDED
        ? 516 - this._chatHeight + TAB_H
        : this._chatWndY;
      const trackH = this._chatType === CHAT_TYPE_EXPANDED
        ? this._chatHeight - 2 - TAB_H
        : this._chatHeight;
      const totalLines = this._chatLog.length;
      const thumbH = Math.max(12, Math.floor(trackH * this._maxLines / Math.max(1, totalLines)));
      const span = trackH - thumbH;

      if (span > 0) {
        const maxScroll = Math.max(0, totalLines - this._maxLines);
        const delta = ly - this._dragScrollY;
        const scrollDelta = Math.round((delta / span) * maxScroll);
        if (scrollDelta !== 0) {
          this.scrollBy(scrollDelta);
          this._dragScrollY = ly;
        }
      }
      return;
    }

    if (this._draggingResize) {
      const delta = y - this._dragStartY;
      const newH = Math.max(26, Math.min(463, this._dragStartH - delta));
      this.setChatType(CHAT_TYPE_EXPANDED, newH);
      return;
    }

    // Tap bar hover highlight (OG: tapBarOver layer)
    if (this._chatType === CHAT_TYPE_EXPANDED && this._layerTapBarOver) {
      const inTapBar = lx >= DISPLAY_X && lx < DISPLAY_X + DISPLAY_W_577
        && ly >= this._chatWndY - 2 && ly < this._chatWndY - 2 + 4;
      this._layerTapBarOver.visible = inTapBar;
    }
  }
}
