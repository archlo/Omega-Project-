import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzCanvas } from '../../wz/WzCanvas.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzSprite } from '../../render/WzSprite.js';
import { ComboBox, ComboBoxItem } from '../ComboBox.js';
import { Button } from '../Button.js';

// ═══════════════════════════════════════════════════════════════════════════════
// OG v95 CUIStatusBar Chat — Exact coordinates from IDA decompilation
// All coordinates are in the 800×600 client frame (StatusBar's coordinate space).
// Decompiled from CUIStatusBar::OnCreate (0x87B5F0), ChatLogDraw (0x877B40),
// SetChatType (0x879C00), ChatLogAdd (0x87AEC0), OnKey (0x87FDE0),
// OnButtonClicked (0x880540), MakeCtrlEdit (0x870BA0), _ResetChatBarPos (0x86DC30).
// ═══════════════════════════════════════════════════════════════════════════════

// --- Chat window types (OG m_nChatWndType) ---
const CHAT_TYPE_NONE = 0;     // Initial: no chat visible
const CHAT_TYPE_MINIMAL = 1;  // Collapsed: no edit, no combo, y=518, h=24
const CHAT_TYPE_SMALL = 2;    // Small: edit+combo, y=492, h=24 (whisper mode)
const CHAT_TYPE_EXPANDED = 3; // Full: edit+combo, y=515-h, h=stored/70

// User tuning: shift the ENTIRE chat bar (log + input + combo) down by this
// many px from the OG 800x600 frame positions, so it sits lower over the
// status bar. The chatOpen/chatClose "+"-toggle buttons stay at their own
// status-bar anchor (599) — the user wants their bottom "like before".
const CHAT_DY = 20;

// --- Edit control (OG MakeCtrlEdit 0x870BA0) ---
// CreateCtrl(id=1011, x=75, y=524, w=409, h=12)
const EDIT_ID = 1011;
const EDIT_X = 75;
const EDIT_Y = 524 + CHAT_DY;
const EDIT_W = 409;
const EDIT_H = 12;
const EDIT_MAX_CHARS = 70;  // OG: 256 if GM, else 70

// --- ComboBox (OG MakeCtrlEdit 0x870BA0) ---
// CreateCtrl_2(id=1012, x=3, y=519, w=68, h=21)
const COMBO_ID = 1012;
const COMBO_X = 3;
const COMBO_Y = 519 + CHAT_DY;
const COMBO_W = 68;
const COMBO_H = 21;
const COMBO_BOX_WIDTH = 90;  // OG: nBoxWidth = 90

// --- Display area (OG ChatLogDraw) ---
// Width: 577 (type 2/3) or 502 (type 1) minus m_nScrWidth
const DISPLAY_X = 0;        // OG: text drawn at x=9 inside canvas
const DISPLAY_W_515 = 515;  // Expanded width (OG: 0x203)
const DISPLAY_W_518 = 518;  // Minimal width (OG: 0x206)
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

// --- Filter flags (OG OnButtonClicked 0x880540) ---
// 0x3F6 All: flag=0 | 0x3F7 Friend: ^=8 | 0x3F8 Party: ^=4 |
// 0x3F9 Guild: ^=0x10 | 0x3FA Alliance: ^=0x20 | 0x3FB Expedition: ^=0x4000000
export const FILTER_ALL = 0;
export const FILTER_BUDDY = 0x08;   // OG friend/buddy filter (0x3F7)
export const FILTER_PARTY = 0x04;   // OG party filter (0x3F8)
export const FILTER_GUILD = 0x10;   // OG guild filter (0x3F9)
export const FILTER_ALLIANCE = 0x20; // OG alliance filter (0x3FA)
export const FILTER_EXPEDITION = 0x4000000; // OG expedition filter (0x3FB)
export const FILTER_FRIEND = FILTER_BUDDY; // Alias — OG uses "Buddy" not "Friend"
// Note: there is NO system filter — chat types 12-24 always pass _isFiltered.
const FILTER_FLAGS = [FILTER_ALL, FILTER_BUDDY, FILTER_PARTY, FILTER_GUILD, FILTER_ALLIANCE, FILTER_EXPEDITION];
// OG button IDs for filter buttons
const FILTER_BUTTON_IDS = [0x3F6, 0x3F7, 0x3F8, 0x3F9, 0x3FA, 0x3FB];

// --- Tab bar (OG filter button labels from IDA _ResetChatBarPos) ---
const TAB_NAMES = ['All', 'Friend', 'Party', 'Guild', 'Alliance', 'Expedition'];
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
// VERIFIED from IDB (block-boundary parser + spot checks): idx 0=-1(white),
// 1=-16711936(green), 2=pink party, 3=orange buddy, 4=purple guild,
// 5=light-green alliance, 14=0xFF770042 whisper, 26=0xFF7DFFEE expedition.
// Font height 11 for most, 12 for indices 6,15,18,19,20,21,22.
const FONT_COLORS: { height: number; color: number }[] = [
  { height: 11, color: 0xFFFFFFFF },  // 0: white (default)
  { height: 11, color: 0xFF00FF00 },  // 1: green
  { height: 11, color: 0xFFFF99CC },  // 2: pink (party)
  { height: 11, color: 0xFFFF9900 },  // 3: orange (buddy)
  { height: 11, color: 0xFFE1ACFE },  // 4: purple (guild)
  { height: 11, color: 0xFFA6FF7F },  // 5: light green (alliance)
  { height: 12, color: 0xFFFF28A7 },  // 6: pink
  { height: 11, color: 0xFFBBBBBB },  // 7: grey
  { height: 11, color: 0xFFFFFF00 },  // 8: yellow
  { height: 11, color: 0xFFFFF080 },  // 9: light yellow
  { height: 11, color: 0xFF60CEFF },  // 10: light blue
  { height: 11, color: 0xFF000000 },  // 11: black
  { height: 11, color: 0xFFFFAFAF },  // 12: light pink
  { height: 11, color: 0xFF003F7F },  // 13: dark blue
  { height: 11, color: 0xFF770042 },  // 14: dark red (whisper)
  { height: 12, color: 0xFF000000 },  // 15: black
  { height: 11, color: 0xFF462706 },  // 16: brown
  { height: 11, color: 0xFF6C4CE3 },  // 17: purple
  { height: 12, color: 0xFFFC8BE5 },  // 18: pink
  { height: 12, color: 0xFF000000 },  // 19: black
  { height: 12, color: 0xFFFFFFFF },  // 20: white
  { height: 12, color: 0xFF000000 },  // 21: black
  { height: 12, color: 0xFFFFFFFF },  // 22: white
  { height: 11, color: 0xFF462705 },  // 23: brown
  { height: 11, color: 0xFFBBBBBB },  // 24: grey
  { height: 11, color: 0xFFFFFF00 },  // 25: yellow
  { height: 11, color: 0xFF7DFFEE },  // 26: teal (expedition)
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
  timestamp?: number;     // OG: creation timestamp (ms) for fade-out
  displayMs?: number;     // OG: ChatMessageDisplayTime (10000ms)
  fadeMs?: number;        // OG: ChatMessageFadeTime (2000ms)
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
  onItemInfo: ((itemId: number, x: number, y: number) => void) | null = null; // OG: TryBeginShowItemInfo

  // --- OG state variables ---
  private _chatType = CHAT_TYPE_MINIMAL;
  private _chatHeight = 24;
  private _chatWndY = 518 + CHAT_DY;     // m_ptChatWnd.y
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

  // OG: CChatHelper spam detection (m_asRecent[4], m_dwChatTimeStamp[4], m_dwMutedTime)
  private _recentMessages: string[] = []; // max 4
  private _recentTimestamps: number[] = []; // timestamps for spam window
  private _muteEndTime = 0; // m_dwMutedTime — when mute expires
  private static readonly SPAM_WINDOW = 2000;  // 0x7D0 — 2s between identical msgs
  private static readonly SPAM_COUNT = 4;      // 4 identical msgs triggers mute
  private static readonly MUTE_DURATION = 30000; // 30s mute (OG: 2800ms but 30s is standard)

  // OG: CChatHelper last-entry dedup (m_asHistory[8], m_nHistoryIndex)
  private _lastSentText = ''; // for HistoryAdd dedup

  // Drag resize (OG m_bDragChatWnd, m_nCurPtY)
  private _draggingResize = false;
  private _dragStartY = 0;
  private _dragStartH = 0;
  private _dragStartWndY = 0;

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
  private _chatOpenButton: Button | null = null;
  private _chatCloseButton: Button | null = null;
  private _scrollUpButton: Button | null = null;
  private _scrollDownButton: Button | null = null;

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
  private _tabBarCheckedSprites: (Sprite | null)[] = [];

  // OG: filter button membership gating (_ResetChatBarPos) — hidden when the
  // character isn't in the group; the matching filter bit is cleared.
  private _memberParty = true;
  private _memberGuild = true;
  private _memberAlliance = true;
  private _memberExpedition = true;

  // OG: whisper icon sprites (4 variants) and channel digit sprites (0-9)
  private _whisperIcons: (WzSprite | null)[] = [null, null, null, null];
  private _channelDigits: (WzSprite | null)[] = [];

  // OG: filter button checked states (m_bChecked on each CCtrlOriginButton)
  private _filterChecked: boolean[] = [true, false, false, false, false, false];

  // --- OG: ChatMessageDisplayTime / ChatMessageFadeTime ---
  private static readonly MSG_DISPLAY_MS = 10000;  // 10s display
  private static readonly MSG_FADE_MS = 2000;       // 2s fade

  // --- OG: Chat target label textures (WZ sprites per target type) ---
  private _chatTargetLabels: (WzSprite | null)[] = [];

  // --- OG: Point notification animation (AP/SP) ---
  private _apNotification: Container | null = null;
  private _spNotification: Container | null = null;
  private _apNotifTimer = 0;
  private _spNotifTimer = 0;

  // --- OG: Shortcut tooltip text ---
  private _shortcutTooltip: Text | null = null;

  // --- OG: Chat enter texture (WZ) ---
  private _chatEnterTexture: WzSprite | null = null;

  // --- OG: Whisper picker modal state ---
  private _whisperPickerOpen = false;
  private _whisperPickerSelectedIdx = 0;
  private _whisperPickerScrollOffset = 0;
  private _whisperPickerContainer: Container | null = null;
  private _whisperPickerRows: Container[] = [];
  private _whisperPickerComboText: Text | null = null;
  private _whisperPickerScrollGfx: Graphics | null = null;
  private _whisperPickerDropdownOpen = false;
  private _whisperPickerDropdownScroll = 0;
  private _whisperPickerDropdownRows: Container[] = [];
  private _whisperPickerDropdownContainer: Container | null = null;
  // prev/next/ok/close buttons
  private _whisperPickerPrevBtn: Graphics | null = null;
  private _whisperPickerNextBtn: Graphics | null = null;
  private _whisperPickerOkBtn: Graphics | null = null;
  private _whisperPickerCloseBtn: Graphics | null = null;
  // WZ textures for whisper picker
  private _whisperPickerDialogBg: WzSprite | null = null;
  private _whisperPickerRowTextures: { selected: WzSprite | null; normal: WzSprite | null } = { selected: null, normal: null };
  private _whisperPickerComboTextures: { normal: WzSprite | null; hover: WzSprite | null; pressed: WzSprite | null } = { normal: null, hover: null, pressed: null };
  private _whisperPickerButtonTextures: { prevNormal: WzSprite | null; nextNormal: WzSprite | null; okNormal: WzSprite | null; closeNormal: WzSprite | null } = { prevNormal: null, nextNormal: null, okNormal: null, closeNormal: null };

  // --- OG: Whisper picker modal layout constants (from StatusBarChatLayoutRules) ---
  private static readonly WP_MODAL_W = 260;
  private static readonly WP_COMBO_LEFT = 21;
  private static readonly WP_COMBO_W = 222;
  private static readonly WP_COMBO_H = 18;
  private static readonly WP_ROW_H = 16;
  private static readonly WP_VISIBLE_ROWS = 6;
  private static readonly WP_BUTTON_BOTTOM = 31;
  private static readonly WP_OK_LEFT = 157;
  private static readonly WP_CLOSE_LEFT = 198;

  // Chat log display lines (each is a Container with optional whisper icon + channel digits + text)
  private _lines: Container[] = [];
  private _lineTexts: Text[] = [];  // shortcut to the Text child of each _lines[i]
  private _maxLines = 1;

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

    if (type === CHAT_TYPE_NONE) {
      // OG: type 0 = initial state, no chat visible
      this._chatHeight = 0;
      this._chatWndLineVisible = 0;
      this._maxLines = 0;
    } else if (type === CHAT_TYPE_MINIMAL) {
      // OG: height=24, y=518, MakeCtrlEdit(0), scrollbar hidden
      this._chatHeight = 24;
      this._chatWndY = 518 + CHAT_DY;
      this._chatWndLineVisible = 1;
      this._maxLines = 1;
      this._scroll = 0;
    } else if (type === CHAT_TYPE_SMALL) {
      // OG: height=24, y=492, MakeCtrlEdit(1), scrollbar hidden
      this._chatHeight = 24;
      this._chatWndY = 492 + CHAT_DY;
      this._chatWndLineVisible = 1;
      this._maxLines = 1;
      this._scroll = 0;
    } else {
      // OG: height=stored or 70, y=515-height, MakeCtrlEdit(1)
      // OG: height range check: if outside 26..489, default to 70
      this._chatHeight = height ?? 70;
      if (this._chatHeight < 26 || this._chatHeight > 489) {
        this._chatHeight = 70;
      }
      // OG: m_nChatWndLineVisible = height / 13
      this._chatWndLineVisible = Math.floor(this._chatHeight / 13);
      // OG: if height % 13 == 0, height += 2
      if (this._chatHeight % 13 === 0) this._chatHeight += 2;
      // OG: m_ptChatWnd.y = 515 - m_nChatWndHeight
      this._chatWndY = 515 + CHAT_DY - this._chatHeight;
      this._maxLines = this._chatWndLineVisible;
    }

    this._applyLayout();
    this._updateWzVisibility();
    this._setFilterButton();
    this._syncLines();
    this._drawScrollbar();
    this._updateWzVisibility();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: MakeCtrlEdit (0x870BA0) — WZ layer visibility per chat type
  // ═══════════════════════════════════════════════════════════════════════════
  private _updateWzVisibility(): void {
    // bCreate=0 (minimal): chatEnter=false, chatCover=false, chatSpace=true, chatSpace2=true
    // bCreate=1 (small/expanded): chatEnter=true, chatCover=true, chatSpace=false, chatSpace2=false
    const bCreate = this._chatType !== CHAT_TYPE_MINIMAL;
    if (this._layerSpace) this._layerSpace.visible = !bCreate;
    // OG draws chatSpace2 as the persistent foreground/input layer; it is
    // present in both closed and open states.
    if (this._layerSpace2) this._layerSpace2.visible = true;
    if (this._layerEnter) this._layerEnter.visible = bCreate;
    if (this._layerCover) this._layerCover.visible = bCreate;
    if (this._chatOpenButton) this._chatOpenButton.container.visible = this._chatType === CHAT_TYPE_MINIMAL;
    if (this._chatCloseButton) this._chatCloseButton.container.visible = this._chatType !== CHAT_TYPE_MINIMAL;
    const showScrollControls = this._chatType === CHAT_TYPE_EXPANDED && this._scrollGfx.visible;
    if (this._scrollUpButton) this._scrollUpButton.container.visible = showScrollControls;
    if (this._scrollDownButton) this._scrollDownButton.container.visible = showScrollControls;

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
    const displayW = this._chatType === CHAT_TYPE_MINIMAL ? DISPLAY_W_518 : DISPLAY_W_515;

    // Tab bar position — overlays top of display
    const tabBarY = displayY;
    this._tabBarGfx.clear();
    this._tabBarGfx.rect(DISPLAY_X, tabBarY, displayW, TAB_H).fill({ color: '#222', alpha: 0.7 });
    const showTabs = this._chatType === CHAT_TYPE_EXPANDED;
    this._tabBarGfx.visible = showTabs;

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
    if (this._layerSpace) this._layerSpace.position.set(DISPLAY_X, this._chatWndY);
    if (this._layerSpace2) this._layerSpace2.position.set(DISPLAY_X, this._chatWndY);
    if (this._layerEnter) this._layerEnter.position.set(DISPLAY_X, this._chatWndY);
    if (this._layerCover) this._layerCover.position.set(DISPLAY_X + DISPLAY_W_515 - 82, this._chatWndY);

    // Filter buttons position (OG: _ResetChatBarPos — x starts at 1, y = m_ptChatWnd.y - 19, spacing 46px)
    this._setFilterButton();

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
      // OG: y is set in _syncLines via bottom-up calculation
      container.y = displayY + tabOffset + this._chatHeight - 13 * i - 13;
      container.visible = false;

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
    // OG: _ResetChatBarPos (0x86DC30) — hide filter buttons for groups the
    // character isn't in, clear the matching filter bit, then lay out shown
    // buttons left-to-right at x=1+i*46, y=m_ptChatWnd.y-19.
    const show = this._chatType === CHAT_TYPE_EXPANDED;
    const members = [true, true, this._memberParty, this._memberGuild, this._memberAlliance, this._memberExpedition];
    if (show) {
      if (!this._memberParty) this._dwChatFilterFlag &= ~FILTER_PARTY;
      if (!this._memberGuild) this._dwChatFilterFlag &= ~FILTER_GUILD;
      if (!this._memberAlliance) this._dwChatFilterFlag &= ~FILTER_ALLIANCE;
      if (!this._memberExpedition) this._dwChatFilterFlag &= ~FILTER_EXPEDITION;
      this._filterChecked = this._computeFilterChecked();
    }

    let shown = 0;
    for (let i = 0; i < this._tabLabels.length; i++) {
      const btnX = 1 + shown * TAB_SPACING;
      const btnY = this._chatWndY - 19;
      const tabVisible = show && members[i];

      this._tabGraphics[i].visible = tabVisible;
      this._tabLabels[i].visible = tabVisible;
      this._tabLabels[i].x = btnX + 4;
      this._tabLabels[i].y = btnY + 2;
      const wzTab = this._tabBarSprites[i];
      const wzChecked = this._tabBarCheckedSprites[i];
      if (wzTab || wzChecked) {
        if (wzTab) {
          wzTab.visible = tabVisible && !this._filterChecked[i];
          wzTab.position.set(btnX, btnY);
        }
        if (wzChecked) {
          wzChecked.visible = tabVisible && this._filterChecked[i];
          wzChecked.position.set(btnX, btnY);
        }
        if (wzTab || wzChecked) {
          this._tabGraphics[i].visible = false;
          this._tabLabels[i].visible = false;
        }
      }

      // OG: _SetFilterButton — show checked state via background color
      if (tabVisible) {
        const checked = this._filterChecked[i];
        this._tabGraphics[i].clear();
        if (checked) {
          // OG: checked button has brighter background
          this._tabGraphics[i].rect(btnX, btnY, TAB_SPACING - 2, 17)
            .fill({ color: 0x3C4164, alpha: 0.9 });
        } else {
          this._tabGraphics[i].rect(btnX, btnY, TAB_SPACING - 2, 17)
            .fill({ color: 0x222222, alpha: 0.6 });
        }
      }

      if (tabVisible) shown++;
    }
  }

  // OG: _SetFilterButton (0x86CF80) checked masks, per button index
  private _computeFilterChecked(): boolean[] {
    return [
      this._dwChatFilterFlag === 0,                      // [0] All: checked when no filter
      (this._dwChatFilterFlag & FILTER_BUDDY) !== 0,     // [1] Friend: flag & 8
      (this._dwChatFilterFlag & FILTER_PARTY) !== 0,     // [2] Party: flag & 4
      (this._dwChatFilterFlag & FILTER_GUILD) !== 0,     // [3] Guild: flag & 0x10
      (this._dwChatFilterFlag & FILTER_ALLIANCE) !== 0,  // [4] Alliance: flag & 0x20
      (this._dwChatFilterFlag & FILTER_EXPEDITION) !== 0, // [5] Expedition: flag & 0x4000000
    ];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: ChatLogAdd (0x87AEC0) — add message with word-wrap
  // ═══════════════════════════════════════════════════════════════════════════
  addLine(text: string, lTypeOrLinks: number | { itemId: number; start: number; end: number }[] = 0, channelID = -1, whisperIcon = false, itemLinks: { itemId: number; start: number; end: number }[] = []): void {
    // Backward-compatible: if second arg is an array, treat as old links param
    const lType = typeof lTypeOrLinks === 'number' ? lTypeOrLinks : 0;
    // OG: word-wrap at 547-nScrWidth pixels, first-line whisper indent -38
    let maxWidth = 547 - this._nScrWidth;
    // OG: types 14,16,19,20 get -38 on first line
    if ((lType === 14 || lType === 16 || lType === 19 || lType === 20)) {
      maxWidth -= WHISPER_INDENT_PX;
    }
    // OG: use font-based word-wrap via CalcLongestText
    const font = this._chatFonts[lType] ?? this._chatFonts[0];
    // Create temp Text for width measurement (OG uses IWzFont::CalcLongestText)
    const _tmpText = new Text({ text: '', style: font });
    const words = text.split(/(\s+)/);
    let currentLine = '';
    let currentStart = 0;
    let isFirstLine = true;
    let sourceOffset = 0;
    const linksFor = (start: number, end: number, prefixLength: number): { start: number; end: number; itemId: number }[] => itemLinks
      .filter(link => link.end > start && link.start < end)
      .map(link => ({
        itemId: link.itemId,
        start: prefixLength + Math.max(0, link.start - start),
        end: prefixLength + Math.min(end - start, link.end - start),
      }));

    const now = performance.now();
    for (const word of words) {
      const wordStart = sourceOffset;
      sourceOffset += word.length;
      const testLine = currentLine + word;
      // OG: use font metrics for accurate width measurement
      _tmpText.text = testLine;
      const testWidth = _tmpText.width;
      if (testWidth > maxWidth && currentLine.length > 0) {
        this._chatLog.push({
          text: currentLine, lType, nBack: 0, nChannelID: channelID,
          bWhisperIcon: whisperIcon, isFirstLine, itemID: 0,
          itemLinks: linksFor(currentStart, wordStart, 0),
          timestamp: now, displayMs: ChatBar.MSG_DISPLAY_MS, fadeMs: ChatBar.MSG_FADE_MS,
        });
        // OG: continuation lines get 5-space indent if not in type 7-12 range
        const prefix = (lType < 7 || lType > 12) ? CONTINUATION_INDENT : '';
        currentLine = prefix + word;
        currentStart = wordStart;
        isFirstLine = false;
      } else {
        currentLine = testLine;
      }
    }
    _tmpText.destroy();
    if (currentLine.length > 0) {
      this._chatLog.push({
        text: currentLine, lType, nBack: 0, nChannelID: channelID,
        bWhisperIcon: whisperIcon, isFirstLine, itemID: 0,
        itemLinks: linksFor(currentStart, sourceOffset, currentLine.startsWith(CONTINUATION_INDENT) ? CONTINUATION_INDENT.length : 0),
        timestamp: now, displayMs: ChatBar.MSG_DISPLAY_MS, fadeMs: ChatBar.MSG_FADE_MS,
      });
    }

    // OG: trim to MAX_LOG_ENTRIES (0x40 = 64)
    while (this._chatLog.length > MAX_LOG_ENTRIES) {
      this._chatLog.shift();
    }

    this._refreshChatLog();
  }

  addMapleLine(text: string, itemNameFn: (id: number) => string | null | undefined, filterType = FILTER_ALL, lType = 0): void {
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
    this.addLine(processed, lType, -1, false, links);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: _RefreshChatLog (0x879B70) — auto-scroll with 5s timeout
  // ═══════════════════════════════════════════════════════════════════════════
  _refreshChatLog(): void {
    const totalEntries = this._getFilteredChatLogCount();
    const scrollRange = Math.max(0, totalEntries - this._chatWndLineVisible + 1);
    const now = performance.now();
    // OG: if scrollRange <= 2 OR already at bottom OR > 5000ms since last scroll → snap to bottom
    // OG: 0x1388 = 5000ms
    if (scrollRange <= 2
      || this._scroll >= scrollRange - 1
      || (now - this._lastScrollTime) > 5000) {
      this._scroll = Math.max(0, scrollRange - 1);
    } else {
      // OG: otherwise maintain current scroll position
      this._scroll = Math.min(this._scroll, scrollRange - 1);
    }
    this._syncLines();
    this._drawScrollbar();
  }

  // OG: _GetFilteredChatLogCount (0x86DE40) — count entries that pass filter
  private _getFilteredChatLogCount(): number {
    let count = 0;
    for (const e of this._chatLog) {
      if (this._isFiltered(e.lType)) count++;
    }
    return count;
  }

  private _syncLines(): void {
    // OG ChatLogDraw: filter entries, compute scroll from bottom, render per-type
    // OG draws bottom-up: y = m_nChatWndHeight - 13*idx - 13
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

    const displayY = this._chatWndY;
    const tabOffset = this._chatType === CHAT_TYPE_EXPANDED ? TAB_H : 0;

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

      // OG: y = m_nChatWndHeight - 13*idx - 13 (bottom-up rendering)
      const lineY = this._chatHeight - 13 * i - 13;
      container.y = displayY + tabOffset + lineY;

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

          // Draw chat text at (nCharWidth + 45, 0) — OG: WHISPER_NAME_GAP=45
          const msgT = new Text({ text: chatText, style: font });
          msgT.x = nameW + WHISPER_NAME_GAP;
          container.addChild(msgT);
        } else {
          // No colon found — render as plain text
          const t = new Text({ text: entry.text, style: font });
          t.x = TEXT_X;
          container.addChild(t);
          this._lineTexts[i] = t;
        }
      } else {
        // OG: DrawTextA(canvas, 9, nTop, text, font, ...)
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
  // OG: _SetFilterButton (0x86CF80) — update button checked states
  // ═══════════════════════════════════════════════════════════════════════════
  private _setFilterButton(): void {
    // OG: sets m_bChecked on each CCtrlOriginButton and invalidates
    this._filterChecked = this._computeFilterChecked();
    // Redraw filter button visuals
    this._updateFilterButtons();
  }
  get chatTarget(): string { return CHAT_TARGET_INTERNAL[this._nChatTarget] ?? 'all'; }
  get activeTab(): number { return this._activeTab; }

  // OG: _ResetChatBarPos membership gating — call when party/guild/alliance/
  // expedition membership changes. Non-member group tabs are hidden and their
  // filter bit cleared (exactly as the v95 client does).
  setMembership(state: { party?: boolean; guild?: boolean; alliance?: boolean; expedition?: boolean }): void {
    if (state.party !== undefined) this._memberParty = state.party;
    if (state.guild !== undefined) this._memberGuild = state.guild;
    if (state.alliance !== undefined) this._memberAlliance = state.alliance;
    if (state.expedition !== undefined) this._memberExpedition = state.expedition;
    this._setFilterButton();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: SetChatTarget (0x87FD30) — switch chat target by combo index
  // ═══════════════════════════════════════════════════════════════════════════
  setChatTarget(target: number): void {
    this._nChatTarget = target;
    const cycleIndex = TAB_CYCLE.indexOf(target);
    if (cycleIndex >= 0) this._tabCycleIndex = cycleIndex;
    // OG: updates combo box selection
    const internalName = CHAT_TARGET_INTERNAL[target] ?? 'all';
    this._combo.setLabel(target === 7 ? 'Whisper' : (CHAT_TARGETS[target] ?? 'All'));
    this.onChatTargetChange?.(internalName);
  }

  // OG: SetChatTarget by internal index (for tab cycling)
  private setChatTargetByIndex(idx: number): void {
    this.setChatTarget(idx);
  }

  // OG: SetChatTarget by whisper name
  private setChatTargetByName(name: string): void {
    this._changeWhisperTarget(name);
    this._nChatTarget = 7;
    this._combo.setLabel('Whisper');
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
  get isFocused(): boolean { return this._isFocused; }

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
  // OG: CChatHelper::TryChat (0x4AA550) — spam check + send
  // 4 identical messages within 2s → 30s mute
  // ═══════════════════════════════════════════════════════════════════════════
  private _tryChat(msg: string): boolean {
    const now = performance.now();

    // OG: check if muted
    if (now < this._muteEndTime) {
      return false; // muted — don't send
    }

    // OG: spam detection — track last 4 identical messages
    const trimmed = msg.trim();
    if (trimmed.length === 0) return false;

    // Check if this matches recent messages
    let identicalCount = 0;
    let oldestInWindow = now;
    for (let i = 0; i < this._recentMessages.length; i++) {
      if (this._recentMessages[i] === trimmed) {
        identicalCount++;
        if (this._recentTimestamps[i] < oldestInWindow) {
          oldestInWindow = this._recentTimestamps[i];
        }
      }
    }

    // OG: if 4+ identical messages within 2s window → mute for 30s
    if (identicalCount >= ChatBar.SPAM_COUNT && (now - oldestInWindow) < ChatBar.SPAM_WINDOW) {
      this._muteEndTime = now + ChatBar.MUTE_DURATION;
      this.floatNotice('Chat muted for spam.', 5000);
      return false;
    }

    // OG: add to recent messages (ring buffer of 4)
    this._recentMessages.push(trimmed);
    this._recentTimestamps.push(now);
    if (this._recentMessages.length > ChatBar.SPAM_COUNT) {
      this._recentMessages.shift();
      this._recentTimestamps.shift();
    }

    return true;
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

    // OG: TryChat spam check — skip for slash commands (OG doesn't mute slash cmds)
    if (!msg.startsWith('/') && !this._tryChat(msg)) {
      this._input = '';
      this._syncInput();
      return;
    }

    // OG: route by first char
    if (msg.startsWith('/')) {
      // Slash command → SendChatMsgSlash
      this.onSendChat?.(msg);
      this._historyAdd(msg);
    } else if (this._whisperTarget && this._nChatTarget === 7) {
      // Whisper target set → GameStage sends via GameSender.Whisper and adds to chat log
      this.onSendChat?.(msg);
      this._historyAdd(msg);
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

      this._historyAdd(msg);
    }

    this._historyIndex = -1;
    this._input = '';
    this._syncInput();
  }

  // OG: CChatHelper::HistoryAdd (0x4AA090) — add to history with last-entry dedup
  private _historyAdd(msg: string): void {
    // OG: if msg matches most recent history entry, don't add (dedup)
    if (this._sentHistory.length > 0 && this._sentHistory[0] === msg) {
      return;
    }
    this._sentHistory.unshift(msg);
    // OG: max 8 history entries
    while (this._sentHistory.length > 8) {
      this._sentHistory.pop();
    }
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
  onKeyPress(key: string, ctrlKey = false): boolean {
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
          // OG: m_nChatTarget = 7, update combo label
          this._nChatTarget = 7;
          this._combo.setLabel('Whisper');
          this.onChatTargetChange?.('whisper');
        }
      } else {
        // OG: SetChatTarget(next) — updates m_nChatTarget and combo selection
        this.setChatTarget(next);
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
    // OG: Ctrl+A (select all), Ctrl+C (copy), Ctrl+V (paste), Ctrl+X (cut)
    if (ctrlKey) {
      if (key === 'a' || key === 'A') {
        // Ctrl+A — select all text
        if (this._input.length > 0) {
          navigator.clipboard?.writeText(this._input);
        }
        return true;
      }
      if (key === 'c' || key === 'C') {
        // Ctrl+C — copy input text
        if (this._input.length > 0) {
          navigator.clipboard?.writeText(this._input);
        }
        return true;
      }
      if (key === 'v' || key === 'V') {
        // Ctrl+V — paste from clipboard
        navigator.clipboard?.readText().then(text => {
          if (text) {
            this._input += text;
            if (this._input.length > EDIT_MAX_CHARS) {
              this._input = this._input.substring(0, EDIT_MAX_CHARS);
            }
            this._syncInput();
          }
        });
        return true;
      }
      if (key === 'x' || key === 'X') {
        // Ctrl+X — cut input text
        if (this._input.length > 0) {
          navigator.clipboard?.writeText(this._input);
          this._input = '';
          this._syncInput();
        }
        return true;
      }
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
    const displayW = this._chatType === CHAT_TYPE_MINIMAL ? DISPLAY_W_518 : DISPLAY_W_515;

    // Hit-test areas
    const tabOffset = this._chatType === CHAT_TYPE_EXPANDED ? TAB_H : 0;
    const inTabs = this._chatType === CHAT_TYPE_EXPANDED
      && lx >= DISPLAY_X && lx < DISPLAY_X + TAB_NAMES.length * TAB_SPACING
      && ly >= displayY && ly < displayY + TAB_H;
    const inDisplay = lx >= DISPLAY_X && lx < DISPLAY_X + displayW
      && ly >= displayY + tabOffset
      && ly < displayY + this._chatHeight;
    const inInput = lx >= EDIT_X && lx < EDIT_X + EDIT_W && ly >= EDIT_Y && ly < EDIT_Y + EDIT_H;
    const scrollbarX = DISPLAY_X + 565 - this._nScrWidth;
    const scrollbarTop = 516 + CHAT_DY - this._chatHeight;
    const inScrollbar = this._scrollGfx.visible
      && lx >= scrollbarX && lx < scrollbarX + SCROLLBAR_W
      && ly >= scrollbarTop && ly < scrollbarTop + this._chatHeight - 2;

    // Delegate combo box hit testing to ComboBox component
    const comboLx = lx - COMBO_X;
    const comboLy = ly - COMBO_Y;
    if (this._combo.handleMouseButton(comboLx, comboLy, down)) {
      return true;
    }

    // OG: Close whisper picker on outside click
    if (this._whisperPickerOpen && this._whisperPickerContainer) {
      const wpX = this._whisperPickerContainer.x;
      const wpY = this._whisperPickerContainer.y;
      const wpW = ChatBar.WP_MODAL_W;
      const wpH = 300; // approximate modal height
      const inWhisperPicker = lx >= wpX && lx < wpX + wpW && ly >= wpY && ly < wpY + wpH;
      if (!inWhisperPicker && down) {
        this.closeWhisperPicker();
        return false;
      }
      if (inWhisperPicker) {
        return true; // consume clicks inside whisper picker
      }
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

    // OG: TryBeginChangeChatWnd — start drag resize from bottom edge
    if (this._chatType === CHAT_TYPE_EXPANDED && ly >= displayY + this._chatHeight - 4 && ly < displayY + this._chatHeight + 4) {
      this._draggingResize = true;
      this._dragStartY = y;
      this._dragStartH = this._chatHeight;
      this._dragStartWndY = displayY;
      return true;
    }

    // OG: TryBeginWhisper — click on whisper icon in chat log
    if (inDisplay) {
      const tabOff = this._chatType === CHAT_TYPE_EXPANDED ? TAB_H : 0;
      const lineIdx = Math.floor((this._chatHeight - (ly - displayY - tabOff)) / LINE_H);
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

        // OG: TryBeginWhisper — click on character name in whisper types
        const isWhisperType = (entry.lType === 14 || entry.lType === 15 || entry.lType === 16
          || entry.lType === 18 || entry.lType === 19 || entry.lType === 20
          || entry.lType === 21 || entry.lType === 22);
        if (isWhisperType && entry.bWhisperIcon && entry.isFirstLine) {
          // Extract character name from whisper text
          const colonIdx = entry.text.indexOf(':');
          if (colonIdx > 0) {
            const charName = entry.text.substring(0, colonIdx).trim();
            if (charName) {
              this._addWhisperCandidate(charName);
              this.setChatTargetByName(charName);
              this.focus();
              return true;
            }
          }
        }

        // OG: TryBeginShowItemInfo — hover/click on item link in chat
        if (entry.itemLinks && entry.itemLinks.length > 0 && this.onItemLink) {
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

    // Tab click (OG: filter XOR toggle on m_dwChatFilterFlag)
    if (inTabs) {
      // OG: hit test against the compacted (membership-gated) layout — the
      // same x=1+i*46 run used by _updateFilterButtons.
      const members = [true, true, this._memberParty, this._memberGuild, this._memberAlliance, this._memberExpedition];
      let tab = -1;
      let shown = 0;
      for (let i = 0; i < TAB_NAMES.length; i++) {
        if (!members[i]) continue;
        const x0 = 1 + shown * TAB_SPACING;
        if (lx >= x0 && lx < x0 + TAB_SPACING) { tab = i; break; }
        shown++;
      }
      if (tab >= 0) {
        this._activeTab = tab;
        if (tab === 0) {
          // OG: "All" tab clears all filters
          this._dwChatFilterFlag = 0;
        } else if (tab < FILTER_FLAGS.length) {
          // OG: other tabs toggle via XOR on m_dwChatFilterFlag
          this._dwChatFilterFlag ^= FILTER_FLAGS[tab];
        }
        this._setFilterButton();
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

    // Display click → focus
    if (inDisplay) {
      this.focus();
      return true;
    }

    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Scrollbar (OG SetChatType scrollbar setup)
  // ═══════════════════════════════════════════════════════════════════════════
  private _drawScrollbar(): void {
    // OG: scrollbar only visible in type 3 (expanded) and when content overflows
    const showScrollbar = this._chatType === CHAT_TYPE_EXPANDED
      && this._chatLog.length > this._maxLines;
    this._scrollGfx.visible = showScrollbar;
    if (!showScrollbar) return;

    this._scrollGfx.clear();
    // OG: x = 565 - m_nScrWidth (type 2/3) or 515 - m_nScrWidth (type 1)
    const trackX = DISPLAY_X + 565 - this._nScrWidth;
    // OG: y = 516 - m_nChatWndHeight (type 3)
    const trackTop = 516 + CHAT_DY - this._chatHeight;
    // OG: height = m_nChatWndHeight - 2 (type 3)
    const trackH = this._chatHeight - 2;
    const totalLines = this._getFilteredChatLogCount();

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
    const maxScroll = Math.max(0, this._getFilteredChatLogCount() - this._maxLines);
    this._scroll = Math.max(0, Math.min(maxScroll, this._scroll + delta));
    this._lastScrollTime = performance.now(); // OG: m_dwLastScrolled
    this._syncLines();
    this._drawScrollbar();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Update (cursor blink + float notice)
  // ═══════════════════════════════════════════════════════════════════════════
  update(dt: number): void {
    const now = performance.now();
    // Cursor blink
    if (this._isFocused) {
      this._blinkTimer += dt;
      if (this._blinkTimer > 0.5) {
        this._blinkTimer = 0;
        this._cursorVisible = !this._cursorVisible;
        this._cursor.visible = this._cursorVisible;
      }
    }
    // Float notice timer
    if (this._floatNoticeTimer > 0) {
      const elapsed = now - this._floatNoticeTimer;
      if (elapsed > this._floatNoticeDuration) {
        this._hideFloatNotice();
      }
    }
    // OG: message fade-out — update alpha on chat lines based on age
    this._updateMessageFade(now);
    // OG: point notification timers
    this._updatePointNotifications(now);
    // OG: whisper picker dropdown scroll auto-repeat
    this._updateWhisperPickerScrollRepeat(now);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: ChatMessageDisplayTime — fade-out old messages (10s display + 2s fade)
  // ═══════════════════════════════════════════════════════════════════════════
  private _updateMessageFade(now: number): void {
    for (let i = 0; i < this._lines.length; i++) {
      const container = this._lines[i];
      if (!container || !container.visible) continue;

      // Find the corresponding chat log entry
      const filtered: number[] = [];
      for (let j = 0; j < this._chatLog.length; j++) {
        if (this._isFiltered(this._chatLog[j].lType)) filtered.push(j);
      }
      const totalVisible = filtered.length;
      const scrollRange = Math.max(0, totalVisible - this._chatWndLineVisible + 1);
      const clampedScroll = Math.min(this._scroll, scrollRange);
      const bottomIdx = totalVisible - 1 - clampedScroll;
      const visIdx = bottomIdx - i;

      if (visIdx < 0 || visIdx >= filtered.length) continue;
      const entry = this._chatLog[filtered[visIdx]];
      if (!entry.timestamp || !entry.displayMs) continue;

      const age = now - entry.timestamp;
      if (age > entry.displayMs + (entry.fadeMs ?? 2000)) {
        container.alpha = 0;
      } else if (age > entry.displayMs) {
        const fadeProgress = (age - entry.displayMs) / (entry.fadeMs ?? 2000);
        container.alpha = 1 - Math.min(1, fadeProgress);
      } else {
        container.alpha = 1;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: Point notification animations (AP/SP popup)
  // ═══════════════════════════════════════════════════════════════════════════
  private _updatePointNotifications(now: number): void {
    if (this._apNotification && this._apNotifTimer > 0) {
      const elapsed = now - this._apNotifTimer;
      if (elapsed > 3000) {
        this._apNotification.visible = false;
        this._apNotifTimer = 0;
      } else if (elapsed > 2000) {
        this._apNotification.alpha = 1 - ((elapsed - 2000) / 1000);
      }
    }
    if (this._spNotification && this._spNotifTimer > 0) {
      const elapsed = now - this._spNotifTimer;
      if (elapsed > 3000) {
        this._spNotification.visible = false;
        this._spNotifTimer = 0;
      } else if (elapsed > 2000) {
        this._spNotification.alpha = 1 - ((elapsed - 2000) / 1000);
      }
    }
  }

  showAPNotification(): void {
    if (!this._apNotification) {
      this._apNotification = this._createPointNotification('You have gained Ability Points!', 0xFFD700);
    }
    this._apNotification.visible = true;
    this._apNotification.alpha = 1;
    this._apNotifTimer = performance.now();
  }

  showSPNotification(): void {
    if (!this._spNotification) {
      this._spNotification = this._createPointNotification('You have gained Skill Points!', 0x00FF00);
    }
    this._spNotification.visible = true;
    this._spNotification.alpha = 1;
    this._spNotifTimer = performance.now();
  }

  private _createPointNotification(text: string, color: number): Container {
    const c = new Container();
    const bg = new Graphics();
    bg.roundRect(0, 0, 200, 20, 4).fill({ color: 0x000000, alpha: 0.7 });
    c.addChild(bg);
    const t = new Text({ text, style: new TextStyle({ fill: color, fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' }) });
    t.x = 10;
    t.y = 3;
    c.addChild(t);
    c.x = 300;
    c.y = this._chatWndY - 28;
    c.visible = false;
    this._root.addChild(c);
    return c;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: Shortcut tooltip on hover over status bar buttons
  // ═══════════════════════════════════════════════════════════════════════════
  showShortcutTooltip(text: string, x: number, y: number): void {
    if (!this._shortcutTooltip) {
      this._shortcutTooltip = new Text({
        text: '',
        style: new TextStyle({ fill: '#FFF', fontSize: 10, fontFamily: 'monospace', wordWrap: true, wordWrapWidth: 150 })
      });
      this._shortcutTooltip.zIndex = 100;
      this._root.addChild(this._shortcutTooltip);
    }
    this._shortcutTooltip.text = text;
    this._shortcutTooltip.x = x;
    this._shortcutTooltip.y = y - 20;
    this._shortcutTooltip.visible = true;
  }

  hideShortcutTooltip(): void {
    if (this._shortcutTooltip) this._shortcutTooltip.visible = false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: Whisper picker modal dialog (CCtrlComboBoxSelect)
  // ═══════════════════════════════════════════════════════════════════════════
  toggleWhisperPicker(): void {
    if (this._whisperPickerOpen) {
      this.closeWhisperPicker();
    } else {
      this.openWhisperPicker();
    }
  }

  openWhisperPicker(): void {
    if (this._whisperPickerOpen) return;
    this._whisperPickerOpen = true;
    this._whisperPickerSelectedIdx = 0;
    this._whisperPickerScrollOffset = 0;
    this._whisperPickerDropdownOpen = false;
    this._whisperPickerDropdownScroll = 0;
    this._buildWhisperPickerUI();
  }

  closeWhisperPicker(): void {
    if (!this._whisperPickerOpen) return;
    this._whisperPickerOpen = false;
    this._whisperPickerDropdownOpen = false;
    this._destroyWhisperPickerUI();
  }

  private _buildWhisperPickerUI(): void {
    this._destroyWhisperPickerUI();

    const modalW = ChatBar.WP_MODAL_W;
    const rowH = ChatBar.WP_ROW_H;
    const visibleRows = ChatBar.WP_VISIBLE_ROWS;
    const listH = rowH * visibleRows;
    const comboH = ChatBar.WP_COMBO_H;
    const btnBottom = ChatBar.WP_BUTTON_BOTTOM;
    const modalH = listH + comboH + btnBottom + 40;

    const modalX = (800 - modalW) / 2;
    const modalY = this._chatWndY - modalH - 10;

    this._whisperPickerContainer = new Container();
    this._whisperPickerContainer.x = modalX;
    this._whisperPickerContainer.y = modalY;

    // Dialog background
    const bg = new Graphics();
    bg.roundRect(0, 0, modalW, modalH, 6).fill({ color: 0x1A1A2E, alpha: 0.95 });
    bg.rect(0, 0, modalW, modalH).stroke({ color: 0x444466, width: 1 });
    this._whisperPickerContainer.addChild(bg);

    // Title
    const title = new Text({ text: 'Select Whisper Target', style: new TextStyle({ fill: '#AAA', fontSize: 11, fontFamily: 'monospace' }) });
    title.x = 10;
    title.y = 6;
    this._whisperPickerContainer.addChild(title);

    // List area
    const listY = 24;
    const listContainer = new Container();
    listContainer.x = ChatBar.WP_COMBO_LEFT;
    listContainer.y = listY;

    const listMask = new Graphics();
    listMask.rect(0, 0, ChatBar.WP_COMBO_W, listH).fill({ color: 0xFFFFFF });
    listMask.x = ChatBar.WP_COMBO_LEFT;
    listMask.y = listY;
    this._whisperPickerContainer.addChild(listMask);

    const candidates = this._whisperCandidate;
    const maxScroll = Math.max(0, candidates.length - visibleRows);

    for (let i = 0; i < Math.min(visibleRows, candidates.length); i++) {
      const rowIdx = i + this._whisperPickerScrollOffset;
      if (rowIdx >= candidates.length) break;

      const row = new Container();
      row.y = i * rowH;

      const isSelected = rowIdx === this._whisperPickerSelectedIdx;
      const rowBg = new Graphics();
      rowBg.rect(0, 0, ChatBar.WP_COMBO_W, rowH).fill({ color: isSelected ? 0x3C4164 : 0x222244, alpha: 0.9 });
      row.addChild(rowBg);

      const label = new Text({ text: candidates[rowIdx], style: new TextStyle({ fill: isSelected ? '#FFF' : '#CCC', fontSize: 11, fontFamily: 'monospace' }) });
      label.x = 6;
      label.y = 2;
      row.addChild(label);

      row.eventMode = 'static';
      row.cursor = 'pointer';
      row.on('pointerdown', () => {
        this._whisperPickerSelectedIdx = rowIdx;
        this._buildWhisperPickerUI();
      });
      row.on('pointerdoubleclick', () => {
        this._whisperPickerSelectedIdx = rowIdx;
        this._confirmWhisperPicker();
      });

      listContainer.addChild(row);
      this._whisperPickerRows.push(row);
    }

    listContainer.mask = listMask;
    this._whisperPickerContainer.addChild(listContainer);

    // Scrollbar
    if (candidates.length > visibleRows) {
      const sbX = ChatBar.WP_COMBO_LEFT + ChatBar.WP_COMBO_W + 2;
      const sb = new Graphics();
      sb.rect(0, 0, 8, listH).fill({ color: 0x333333, alpha: 0.6 });
      const thumbH = Math.max(12, Math.floor(listH * visibleRows / candidates.length));
      const span = listH - thumbH;
      const frac = maxScroll > 0 ? this._whisperPickerScrollOffset / maxScroll : 0;
      sb.rect(1, Math.floor(span * frac), 6, thumbH).fill({ color: 0x888888 });
      this._whisperPickerContainer.addChild(sb);
      this._whisperPickerScrollGfx = sb;

      const upBtn = new Graphics();
      upBtn.moveTo(4, 2).lineTo(0, 7).lineTo(8, 7).closePath().fill({ color: 0xAAAACC });
      upBtn.x = sbX;
      upBtn.y = -10;
      upBtn.eventMode = 'static';
      upBtn.cursor = 'pointer';
      upBtn.on('pointerdown', () => {
        if (this._whisperPickerScrollOffset > 0) {
          this._whisperPickerScrollOffset--;
          this._buildWhisperPickerUI();
        }
      });
      this._whisperPickerContainer.addChild(upBtn);

      const downBtn = new Graphics();
      downBtn.moveTo(4, 7).lineTo(0, 2).lineTo(8, 2).closePath().fill({ color: 0xAAAACC });
      downBtn.x = sbX;
      downBtn.y = listH + 2;
      downBtn.eventMode = 'static';
      downBtn.cursor = 'pointer';
      downBtn.on('pointerdown', () => {
        if (this._whisperPickerScrollOffset < maxScroll) {
          this._whisperPickerScrollOffset++;
          this._buildWhisperPickerUI();
        }
      });
      this._whisperPickerContainer.addChild(downBtn);
    }

    // Combo box area
    const comboY = listY + listH + 6;
    const comboContainer = new Container();
    comboContainer.x = ChatBar.WP_COMBO_LEFT;
    comboContainer.y = comboY;

    const comboBg = new Graphics();
    comboBg.rect(0, 0, ChatBar.WP_COMBO_W, comboH).fill({ color: 0x222244, alpha: 0.9 });
    comboBg.rect(0, 0, ChatBar.WP_COMBO_W, comboH).stroke({ color: 0x555577, width: 1 });
    comboContainer.addChild(comboBg);

    const selectedName = candidates.length > 0 ? candidates[this._whisperPickerSelectedIdx] : 'No targets';
    this._whisperPickerComboText = new Text({ text: selectedName, style: new TextStyle({ fill: '#FFF', fontSize: 11, fontFamily: 'monospace' }) });
    this._whisperPickerComboText.x = 6;
    this._whisperPickerComboText.y = 3;
    comboContainer.addChild(this._whisperPickerComboText);

    const toggleBtn = new Graphics();
    toggleBtn.moveTo(ChatBar.WP_COMBO_W - 12, 5).lineTo(ChatBar.WP_COMBO_W - 18, 5).lineTo(ChatBar.WP_COMBO_W - 15, 12).closePath().fill({ color: 0xAAAACC });
    toggleBtn.eventMode = 'static';
    toggleBtn.cursor = 'pointer';
    toggleBtn.on('pointerdown', () => {
      this._whisperPickerDropdownOpen = !this._whisperPickerDropdownOpen;
      this._buildWhisperPickerUI();
    });
    comboContainer.addChild(toggleBtn);

    this._whisperPickerContainer.addChild(comboContainer);

    // Dropdown (if open)
    if (this._whisperPickerDropdownOpen) {
      this._buildWhisperPickerDropdown(comboY + comboH + 2, ChatBar.WP_COMBO_LEFT, ChatBar.WP_COMBO_W);
    }

    // Buttons row
    const btnY = comboY + comboH + (this._whisperPickerDropdownOpen ? listH + 10 : 8);

    this._whisperPickerPrevBtn = new Graphics();
    this._whisperPickerPrevBtn.roundRect(0, 0, 36, 18, 3).fill({ color: 0x334466 });
    this._whisperPickerPrevBtn.x = ChatBar.WP_COMBO_LEFT;
    this._whisperPickerPrevBtn.y = btnY;
    const prevLabel = new Text({ text: 'Prev', style: new TextStyle({ fill: '#CCC', fontSize: 10, fontFamily: 'monospace' }) });
    prevLabel.x = 4;
    prevLabel.y = 3;
    this._whisperPickerPrevBtn.addChild(prevLabel);
    this._whisperPickerPrevBtn.eventMode = 'static';
    this._whisperPickerPrevBtn.cursor = 'pointer';
    this._whisperPickerPrevBtn.on('pointerdown', () => {
      if (this._whisperPickerSelectedIdx > 0) {
        this._whisperPickerSelectedIdx--;
        if (this._whisperPickerSelectedIdx < this._whisperPickerScrollOffset) {
          this._whisperPickerScrollOffset = this._whisperPickerSelectedIdx;
        }
        this._buildWhisperPickerUI();
      }
    });
    this._whisperPickerContainer.addChild(this._whisperPickerPrevBtn);

    this._whisperPickerNextBtn = new Graphics();
    this._whisperPickerNextBtn.roundRect(0, 0, 36, 18, 3).fill({ color: 0x334466 });
    this._whisperPickerNextBtn.x = ChatBar.WP_COMBO_LEFT + 40;
    this._whisperPickerNextBtn.y = btnY;
    const nextLabel = new Text({ text: 'Next', style: new TextStyle({ fill: '#CCC', fontSize: 10, fontFamily: 'monospace' }) });
    nextLabel.x = 4;
    nextLabel.y = 3;
    this._whisperPickerNextBtn.addChild(nextLabel);
    this._whisperPickerNextBtn.eventMode = 'static';
    this._whisperPickerNextBtn.cursor = 'pointer';
    this._whisperPickerNextBtn.on('pointerdown', () => {
      if (this._whisperPickerSelectedIdx < candidates.length - 1) {
        this._whisperPickerSelectedIdx++;
        if (this._whisperPickerSelectedIdx >= this._whisperPickerScrollOffset + visibleRows) {
          this._whisperPickerScrollOffset = this._whisperPickerSelectedIdx - visibleRows + 1;
        }
        this._buildWhisperPickerUI();
      }
    });
    this._whisperPickerContainer.addChild(this._whisperPickerNextBtn);

    this._whisperPickerOkBtn = new Graphics();
    this._whisperPickerOkBtn.roundRect(0, 0, 36, 18, 3).fill({ color: 0x226644 });
    this._whisperPickerOkBtn.x = ChatBar.WP_OK_LEFT;
    this._whisperPickerOkBtn.y = btnY;
    const okLabel = new Text({ text: 'OK', style: new TextStyle({ fill: '#FFF', fontSize: 10, fontFamily: 'monospace' }) });
    okLabel.x = 8;
    okLabel.y = 3;
    this._whisperPickerOkBtn.addChild(okLabel);
    this._whisperPickerOkBtn.eventMode = 'static';
    this._whisperPickerOkBtn.cursor = 'pointer';
    this._whisperPickerOkBtn.on('pointerdown', () => this._confirmWhisperPicker());
    this._whisperPickerContainer.addChild(this._whisperPickerOkBtn);

    this._whisperPickerCloseBtn = new Graphics();
    this._whisperPickerCloseBtn.roundRect(0, 0, 36, 18, 3).fill({ color: 0x664444 });
    this._whisperPickerCloseBtn.x = ChatBar.WP_CLOSE_LEFT;
    this._whisperPickerCloseBtn.y = btnY;
    const closeLabel = new Text({ text: 'Close', style: new TextStyle({ fill: '#FFF', fontSize: 10, fontFamily: 'monospace' }) });
    closeLabel.x = 4;
    closeLabel.y = 3;
    this._whisperPickerCloseBtn.addChild(closeLabel);
    this._whisperPickerCloseBtn.eventMode = 'static';
    this._whisperPickerCloseBtn.cursor = 'pointer';
    this._whisperPickerCloseBtn.on('pointerdown', () => this.closeWhisperPicker());
    this._whisperPickerContainer.addChild(this._whisperPickerCloseBtn);

    this._root.addChild(this._whisperPickerContainer);
  }

  private _buildWhisperPickerDropdown(y: number, x: number, w: number): void {
    const candidates = this._whisperCandidate;
    const rowH = ChatBar.WP_ROW_H;
    const maxVisible = ChatBar.WP_VISIBLE_ROWS;
    const maxScroll = Math.max(0, candidates.length - maxVisible);

    this._whisperPickerDropdownContainer = new Container();
    this._whisperPickerDropdownContainer.x = x;
    this._whisperPickerDropdownContainer.y = y;

    const bg = new Graphics();
    bg.rect(0, 0, w, rowH * maxVisible + 2).fill({ color: 0x1A1A2E, alpha: 0.95 });
    bg.rect(0, 0, w, rowH * maxVisible + 2).stroke({ color: 0x555577, width: 1 });
    this._whisperPickerDropdownContainer.addChild(bg);

    for (let i = 0; i < Math.min(maxVisible, candidates.length); i++) {
      const rowIdx = i + this._whisperPickerDropdownScroll;
      if (rowIdx >= candidates.length) break;

      const row = new Container();
      row.y = i * rowH + 1;

      const isSelected = rowIdx === this._whisperPickerSelectedIdx;
      const rowBg = new Graphics();
      rowBg.rect(0, 0, w, rowH).fill({ color: isSelected ? 0x3C4164 : 0x1A1A2E, alpha: 0.9 });
      row.addChild(rowBg);

      const label = new Text({ text: candidates[rowIdx], style: new TextStyle({ fill: isSelected ? '#FFF' : '#CCC', fontSize: 11, fontFamily: 'monospace' }) });
      label.x = 6;
      label.y = 2;
      row.addChild(label);

      row.eventMode = 'static';
      row.cursor = 'pointer';
      row.on('pointerdown', () => {
        this._whisperPickerSelectedIdx = rowIdx;
        this._whisperPickerDropdownOpen = false;
        this._buildWhisperPickerUI();
      });

      this._whisperPickerDropdownContainer.addChild(row);
      this._whisperPickerDropdownRows.push(row);
    }

    if (candidates.length > maxVisible) {
      const sb = new Graphics();
      sb.rect(w - 10, 1, 8, rowH * maxVisible).fill({ color: 0x333333, alpha: 0.6 });
      const thumbH = Math.max(8, Math.floor(rowH * maxVisible * maxVisible / candidates.length));
      const span = rowH * maxVisible - thumbH;
      const frac = maxScroll > 0 ? this._whisperPickerDropdownScroll / maxScroll : 0;
      sb.rect(w - 9, 1 + Math.floor(span * frac), 6, thumbH).fill({ color: 0x888888 });
      this._whisperPickerDropdownContainer.addChild(sb);
    }

    this._whisperPickerContainer?.addChild(this._whisperPickerDropdownContainer);
  }

  private _confirmWhisperPicker(): void {
    const candidates = this._whisperCandidate;
    if (candidates.length > 0 && this._whisperPickerSelectedIdx < candidates.length) {
      const name = candidates[this._whisperPickerSelectedIdx];
      this.setChatTargetByName(name);
      this.closeWhisperPicker();
      this.focus();
    }
  }

  private _destroyWhisperPickerUI(): void {
    if (this._whisperPickerContainer) {
      this._whisperPickerContainer.removeFromParent();
      this._whisperPickerContainer.destroy({ children: true });
      this._whisperPickerContainer = null;
    }
    this._whisperPickerRows = [];
    this._whisperPickerDropdownRows = [];
    this._whisperPickerDropdownContainer = null;
    this._whisperPickerComboText = null;
    this._whisperPickerScrollGfx = null;
    this._whisperPickerPrevBtn = null;
    this._whisperPickerNextBtn = null;
    this._whisperPickerOkBtn = null;
    this._whisperPickerCloseBtn = null;
  }

  private _updateWhisperPickerScrollRepeat(_now: number): void {
    // Placeholder for auto-repeat scroll on held buttons (OG behavior)
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
    this._layerEnter = loadCanvas(bar, 'chatEnter', DISPLAY_X, this._chatWndY, false);
    this._layerCover = loadCanvas(bar, 'chatCover', DISPLAY_X + DISPLAY_W_515 - 82, this._chatWndY, false);

    // Combo box WZ sprite (OG: StatusBar2.img/mainBar/chatTarget/base)
    const ctBase = bar.Get('chatTarget') as WzProperty | null;
    if (ctBase) {
      this._combo.loadWzAsset(loader, ctBase, 'base');
    }

    const addControl = (name: string, onClick: () => void): Button | null => {
      const node = bar.Get(name);
      if (!(node instanceof WzProperty)) return null;
      const button = Button.fromWz(loader, node);
      button.onClick = onClick;
      button.container.position.set(512, 599);
      this._root.addChild(button.container);
      return button;
    };
    this._chatOpenButton = addControl('chatOpen', () => this.setChatType(CHAT_TYPE_EXPANDED));
    this._chatCloseButton = addControl('chatClose', () => this.setChatType(CHAT_TYPE_MINIMAL));
    this._scrollUpButton = addControl('scrollUp', () => this.scrollBy(-1));
    this._scrollDownButton = addControl('scrollDown', () => this.scrollBy(1));

    // Tab bar filter buttons (OG: StatusBar2.img/chat/Tap/*)
    const chatRoot = ui.GetItem('StatusBar2.img/chat') as WzProperty | null;
    // OG: WZ node names for filter buttons
    const filterWzNames = ['all', 'friend', 'party', 'guild', 'association', 'expedition'];
    if (chatRoot) {
      for (let i = 0; i < Math.min(TAB_NAMES.length, 6); i++) {
        const tapRoot = chatRoot.Get('Tap') as WzProperty | null;
        const tapNode = tapRoot?.Get(filterWzNames[i]);
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
          const checked = (tapNode as any).Get('checked/0') ?? (tapNode as any).Get('checked');
          if (checked instanceof WzCanvas) {
            const wzSprite = loader.Load(checked);
            if (wzSprite) {
              const s = wzSprite.ToPixi();
              if (s) {
                s.anchor.set(0, 0);
                s.position.set(DISPLAY_X + i * TAB_SPACING, this._chatWndY);
                s.visible = false;
                this._tabBarCheckedSprites[i] = s;
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
    // Note: OG uses StatusBar.img, not StatusBar2.img for whisper icons
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
      // Also try StatusBar.img path if StatusBar2 didn't have them
      if (!this._whisperIcons[0]) {
        const statusBarRoot = ui.GetItem('StatusBar.img');
        if (statusBarRoot instanceof WzProperty) {
          const chatNode = statusBarRoot.Get('chat') as WzProperty | null;
          if (chatNode) {
            for (let i = 0; i < 4; i++) {
              const node = chatNode.Get(`whisper/${i}`);
              if (node instanceof WzCanvas) {
                const wzSprite = loader.Load(node);
                if (wzSprite) {
                  this._whisperIcons[i] = wzSprite;
                }
              }
            }
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
      // Also try StatusBar.img path if StatusBar2 didn't have them
      if (!this._channelDigits[0]) {
        const statusBarRoot = ui.GetItem('StatusBar.img');
        if (statusBarRoot instanceof WzProperty) {
          const chatNode = statusBarRoot.Get('chat') as WzProperty | null;
          if (chatNode) {
            for (let i = 0; i <= 9; i++) {
              const node = chatNode.Get(`digit/${i}`);
              if (node instanceof WzCanvas) {
                const wzSprite = loader.Load(node);
                if (wzSprite) {
                  this._channelDigits[i] = wzSprite;
                }
              }
            }
          }
        }
      }
    }

    // OG: Whisper picker dialog textures (from StatusBar2.img/Chat/Dlg/)
    const dlgRoot = ui.GetItem('StatusBar2.img/Chat/Dlg') as WzProperty | null;
    if (dlgRoot) {
      const dlgBg = dlgRoot.Get('Dlg');
      if (dlgBg instanceof WzCanvas) {
        this._whisperPickerDialogBg = loader.Load(dlgBg);
      }
      const selNode = dlgRoot.Get('Sel');
      if (selNode instanceof WzCanvas) this._whisperPickerRowTextures.selected = loader.Load(selNode);
      const rowNode = dlgRoot.Get('Row');
      if (rowNode instanceof WzCanvas) this._whisperPickerRowTextures.normal = loader.Load(rowNode);
      const btnPrev = dlgRoot.Get('BtPrev') as WzProperty | null;
      if (btnPrev) {
        const n = btnPrev.Get('normal/0');
        if (n instanceof WzCanvas) this._whisperPickerButtonTextures.prevNormal = loader.Load(n);
      }
      const btnNext = dlgRoot.Get('BtNext') as WzProperty | null;
      if (btnNext) {
        const n = btnNext.Get('normal/0');
        if (n instanceof WzCanvas) this._whisperPickerButtonTextures.nextNormal = loader.Load(n);
      }
      const btnOk = dlgRoot.Get('BtOK') as WzProperty | null;
      if (btnOk) {
        const n = btnOk.Get('normal/0');
        if (n instanceof WzCanvas) this._whisperPickerButtonTextures.okNormal = loader.Load(n);
      }
      const btnClose = dlgRoot.Get('BtClose') as WzProperty | null;
      if (btnClose) {
        const n = btnClose.Get('normal/0');
        if (n instanceof WzCanvas) this._whisperPickerButtonTextures.closeNormal = loader.Load(n);
      }
      const comboNode = dlgRoot.Get('Combo') as WzProperty | null;
      if (comboNode) {
        const cn = comboNode.Get('normal/0');
        if (cn instanceof WzCanvas) this._whisperPickerComboTextures.normal = loader.Load(cn);
        const ch = comboNode.Get('mouseOver/0');
        if (ch instanceof WzCanvas) this._whisperPickerComboTextures.hover = loader.Load(ch);
      }
    }

    // OG: Chat target label textures (from StatusBar2.img/mainBar/chatTarget/label/*)
    const ctRoot = bar.Get('chatTarget') as WzProperty | null;
    if (ctRoot) {
      const labelRoot = ctRoot.Get('label') as WzProperty | null;
      if (labelRoot) {
        const labelNames = ['all', 'whisper', 'party', 'buddy', 'guild', 'alliance'];
        for (let i = 0; i < labelNames.length; i++) {
          const node = labelRoot.Get(labelNames[i]);
          if (node instanceof WzCanvas) {
            const ws = loader.Load(node);
            if (ws) this._chatTargetLabels[i] = ws;
          }
        }
      }
    }

    this._applyLayout();
    this._updateWzVisibility();
    this._chatOpenButton && (this._chatOpenButton.container.visible = this._chatType === CHAT_TYPE_MINIMAL);
    this._chatCloseButton && (this._chatCloseButton.container.visible = this._chatType !== CHAT_TYPE_MINIMAL);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Position saving (OG CreateUIWndPosSaved key 10)
  // ═══════════════════════════════════════════════════════════════════════════
  handleMouseButtonGlobal(x: number, y: number, down: boolean): void {
    if (!down && this._isDraggingScroll) {
      this._isDraggingScroll = false;
    }
    if (!down && this._draggingResize) {
      // OG: ChangeChatWndSize — snap to 13px increments, save to Config
      // Must call BEFORE clearing flag since _changeChatWndSize checks it
      this._changeChatWndSize(y);
      this._draggingResize = false;
    }
  }

  // OG: ChangeChatWndSize (0x87A540) — snap to 13px increments
  private _changeChatWndSize(ry: number): void {
    if (!this._draggingResize) return;
    // OG: compute delta from start, snap to 13px
    const delta = this._dragStartWndY - ry;
    const snapDelta = Math.round(delta / 13) * 13;
    let newH = this._dragStartH + snapDelta;
    // OG: clamp to 26..489
    newH = Math.max(26, Math.min(489, newH));
    // OG: m_nChatWndLineVisible = height / 13
    this._chatWndLineVisible = Math.floor(newH / 13);
    // OG: if height % 13 == 0, height += 2
    if (newH % 13 === 0) newH += 2;
    this._chatHeight = newH;
    // OG: m_ptChatWnd.y = 515 - m_nChatWndHeight
    this._chatWndY = 515 + CHAT_DY - this._chatHeight;
    this._maxLines = this._chatWndLineVisible;
    this._applyLayout();
    this._updateWzVisibility();
    this._setFilterButton();
    this._syncLines();
    // OG: *((_DWORD *)TSingleton<CConfig>::ms_pInstance._m_pStr + 24) = m_nChatWndHeight
    this._onResize?.(this._chatHeight);
  }

  // Callback for saving chat window height to config
  _onResize: ((height: number) => void) | null = null;

  // OG: OnMouseMove (226 lines) — scrollbar drag, resize drag, tap bar hover
  onMouseMove(x: number, y: number): void {
    const lx = x - this._root.x;
    const ly = y - this._root.y;

    if (this._isDraggingScroll) {
      const trackTop = 516 + CHAT_DY - this._chatHeight;
      const trackH = this._chatHeight - 2;
      const totalLines = this._getFilteredChatLogCount();
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
      // OG: ChangeChatWndSize — snap to 13px increments
      const delta = this._dragStartWndY - y;
      const snapDelta = Math.round(delta / 13) * 13;
      let newH = this._dragStartH + snapDelta;
      newH = Math.max(26, Math.min(489, newH));
      this._chatWndLineVisible = Math.floor(newH / 13);
      if (newH % 13 === 0) newH += 2;
      this._chatHeight = newH;
      this._chatWndY = 515 + CHAT_DY - this._chatHeight;
      this._maxLines = this._chatWndLineVisible;
      this._applyLayout();
      this._updateWzVisibility();
      this._setFilterButton();
      this._syncLines();
      return;
    }

    // Tap bar hover highlight (OG: tapBarOver layer)
    if (this._chatType === CHAT_TYPE_EXPANDED && this._layerTapBarOver) {
      const inTapBar = lx >= DISPLAY_X && lx < DISPLAY_X + DISPLAY_W_515
        && ly >= this._chatWndY - 2 && ly < this._chatWndY - 2 + 4;
      this._layerTapBarOver.visible = inTapBar;
    }

    // OG: TryBeginShowItemInfo — hover over item link in chat display
    if (this._chatType !== CHAT_TYPE_NONE) {
      const displayY = this._chatWndY;
      const tabOffset = this._chatType === CHAT_TYPE_EXPANDED ? TAB_H : 0;
      const inDisplay = lx >= DISPLAY_X && lx < DISPLAY_X + DISPLAY_W_515
        && ly >= displayY + tabOffset && ly < displayY + this._chatHeight;
      if (inDisplay) {
        const lineIdx = Math.floor((this._chatHeight - (ly - displayY - tabOffset)) / LINE_H);
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
          if (entry.itemLinks && entry.itemLinks.length > 0 && this.onItemInfo) {
            const charIdx = Math.floor((lx - TEXT_X) / 7);
            for (const link of entry.itemLinks) {
              if (charIdx >= link.start && charIdx < link.end) {
                this.onItemInfo(link.itemId, x, y);
                break;
              }
            }
          }
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: FloatNotice (0x86D430) — floating notice text
  // ═══════════════════════════════════════════════════════════════════════════
  private _floatNoticeText: Text | null = null;
  private _floatNoticeTimer = 0;
  private _floatNoticeDuration = 0;

  floatNotice(text: string, duration = 5000): void {
    // OG: CFloatNotice::CreateFloatNotice — show floating text above chat
    if (!text) {
      this._hideFloatNotice();
      return;
    }
    this._floatNoticeDuration = duration;
    this._floatNoticeTimer = performance.now();

    if (!this._floatNoticeText) {
      this._floatNoticeText = new Text({
        text,
        style: new TextStyle({ fill: '#FFD700', fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold' })
      });
      this._floatNoticeText.anchor.set(0.5, 1);
      this._root.addChild(this._floatNoticeText);
    } else {
      this._floatNoticeText.text = text;
    }
    // Position above chat bar
    this._floatNoticeText.x = DISPLAY_X + DISPLAY_W_515 / 2;
    this._floatNoticeText.y = this._chatWndY - 4;
    this._floatNoticeText.visible = true;
  }

  private _hideFloatNotice(): void {
    if (this._floatNoticeText) this._floatNoticeText.visible = false;
    this._floatNoticeTimer = 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: ProcessToolTip (0x873140) — show tooltip on hover over EXP gauge
  // ═══════════════════════════════════════════════════════════════════════════
  onProcessToolTip: ((rx: number, ry: number) => void) | null = null;

  processToolTip(rx: number, ry: number): void {
    // OG: checks cursor color == -1 (transparent) and m_nToolTipType <= 1
    // Then shows EXP tooltip with format from StringPool 0x1A37
    this.onProcessToolTip?.(rx, ry);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: OnChildNotify (0x8804A0) — handle child control notifications
  // ═══════════════════════════════════════════════════════════════════════════
  onChildNotify(nId: number, param1: number, param2: number): void {
    if (nId === SCROLLBAR_ID) {
      // OG: nId=1010, param1>=0x12C && param1<=0x130 → ChatLogDraw + m_dwLastScrolled
      if (param1 >= 0x12C && param1 <= 0x130) {
        this._syncLines();
        this._drawScrollbar();
        this._lastScrollTime = performance.now();
      }
    } else if (nId === COMBO_ID) {
      // OG: nId=1012, param1==600 → SetChatTarget(param2)
      if (param1 === 600) {
        this.setChatTarget(param2);
      }
    }
    // OG: nId 2000-2003 with param1==100 → SetButtonBlink + OnButtonClicked
    if (nId >= 2000 && nId <= 2003 && param1 === 100) {
      this._setButtonBlink(nId - 2000, false);
      this._onButtonClicked(nId);
    }
    // OG: param1==100 → OnButtonClicked
    if (param1 === 100 && (nId < 2000 || nId > 2003)) {
      this._onButtonClicked(nId);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: OnButtonClicked (0x880540) — button click dispatcher
  // ═══════════════════════════════════════════════════════════════════════════
  onButtonClicked: ((nId: number) => void) | null = null;

  private _onButtonClicked(nId: number): void {
    // OG: dispatches to CWvsContext::UI_Toggle, SendMigrateTo*, etc.
    this.onButtonClicked?.(nId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: SetButtonBlink (0x86CEC0) — button blink animation
  // ═══════════════════════════════════════════════════════════════════════════
  private _buttonBlinkStates = [false, false, false, false];

  private _setButtonBlink(index: number, blink: boolean): void {
    if (index >= 0 && index < 4) {
      this._buttonBlinkStates[index] = blink;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: EnableButtons (0x86CF10) — enable/disable buttons based on game state
  // ═══════════════════════════════════════════════════════════════════════════
  onEnableButtons: ((enabled: boolean) => void) | null = null;

  enableButtons(enabled: boolean): void {
    // OG: enables/disables Cash Shop, ITC, etc. based on field state
    // Delegated to GameStage via callback
    this.onEnableButtons?.(enabled);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: ToggleMaxMinButton (0x86CEC0) — toggle min/max button visibility
  // ═══════════════════════════════════════════════════════════════════════════
  onToggleMaxMin: ((showMax: boolean) => void) | null = null;

  private _toggleMaxMinButton(): void {
    // OG: type 1 (minimal) → show minimize button, hide maximize
    // OG: type 3 (expanded) → show both
    const showMax = this._chatType === CHAT_TYPE_EXPANDED;
    this.onToggleMaxMin?.(showMax);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: ToggleQuickSlot — toggle quick slot panel visibility
  // ═══════════════════════════════════════════════════════════════════════════
  onToggleQuickSlot: (() => void) | null = null;

  private _toggleQuickSlot(): void {
    this.onToggleQuickSlot?.();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: SendClaim (0x877970) — send claim to server
  // ═══════════════════════════════════════════════════════════════════════════
  onSendClaim: (() => void) | null = null;

  private _sendClaim(): void {
    this.onSendClaim?.();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: TryShowMemoListDlg (0x8779F0) — show memo list on right-click
  // ═══════════════════════════════════════════════════════════════════════════
  onShowMemoList: (() => void) | null = null;

  private _tryShowMemoListDlg(): void {
    this.onShowMemoList?.();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: TryUseTempExp (0x870AA0) — use temporary EXP on right-click
  // ═══════════════════════════════════════════════════════════════════════════
  onUseTempExp: (() => void) | null = null;

  private _tryUseTempExp(): void {
    this.onUseTempExp?.();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: SetWhisperTargetFromCandidate (0x532150) — navigate candidate list
  // ═══════════════════════════════════════════════════════════════════════════
  setWhisperTargetFromCandidate(index: number): void {
    if (index >= 0 && index < this._whisperCandidate.length) {
      const name = this._whisperCandidate[index];
      this.setChatTargetByName(name);
    }
  }

  // OG: getWhisperCandidateList — public accessor
  getWhisperCandidateList(): readonly string[] {
    return this._whisperCandidate;
  }
  onChangeWhisperTarget: ((name: string) => void) | null = null;

  private _changeWhisperTarget(name: string): void {
    this._whisperTarget = name;
    this.onChangeWhisperTarget?.(name);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: ChangeGroupWhisperTarget (0x87F120) — group whisper dialog
  // ═══════════════════════════════════════════════════════════════════════════
  onChangeGroupWhisperTarget: (() => void) | null = null;

  changeGroupWhisperTarget(): void {
    this.onChangeGroupWhisperTarget?.();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: GetWhisperTarget (0x4D97C0) — get current whisper target
  // ═══════════════════════════════════════════════════════════════════════════
  getWhisperTarget(): string {
    return this._whisperTarget;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: SetWhisperTarget (0x871830) — set whisper target from external
  // ═══════════════════════════════════════════════════════════════════════════
  setWhisperTarget(name: string): void {
    this._changeWhisperTarget(name);
    this._addWhisperCandidate(name);
    this._nChatTarget = 7;
    this.onChatTargetChange?.('whisper');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: GetFilteredChatLogCount — public accessor
  // ═══════════════════════════════════════════════════════════════════════════
  getFilteredChatLogCount(): number {
    return this._getFilteredChatLogCount();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: ConvertWhisperToNormal (0x8771C0) — convert whisper format
  // ═══════════════════════════════════════════════════════════════════════════
  convertWhisperToNormal(text: string): string {
    // OG: strips whisper formatting — handles "Name : msg", "Name:msg", channel prefix
    // OG: also handles "ChannelName> Name : msg" format
    let s = text.trim();
    // OG: strip channel prefix if present (e.g. "Scania> Name : msg")
    const channelArrowIdx = s.indexOf('> ');
    if (channelArrowIdx >= 0 && channelArrowIdx < 20) {
      s = s.substring(channelArrowIdx + 2);
    }
    // OG: find first ':' and strip everything before it + the colon + leading spaces
    const colonIdx = s.indexOf(':');
    if (colonIdx > 0) {
      s = s.substring(colonIdx + 1);
      // OG: skip leading spaces after colon
      while (s.length > 0 && s[0] === ' ') s = s.substring(1);
    }
    return s;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OG: GetChatLog — get chat log array
  // ═══════════════════════════════════════════════════════════════════════════
  getChatLog(): readonly ChatLogEntry[] {
    return this._chatLog;
  }
}
