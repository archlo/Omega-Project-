import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';

// OG v95: CUIStatusBar at Origin_LB screen (22,22) with 1024×578 client area.
// Coordinates are from StatusBar's top-left — add 22px window border for screen.
// Edit (MakeCtrlEdit 0x870BA0): SB(75,524,409,12)  → screen(97,546)
// Combobox:                     SB(3,519,68,21)    → screen(25,541)
// Display (m_ptChatWnd):        SB(95,445,420,70)  → screen(117,467)
const CHAT_X = 97;
const DISPLAY_X = 20;
const DISPLAY_Y = 0;
const DISPLAY_W = 420;
const DISPLAY_H = 70;
const INPUT_X = 0;
const INPUT_Y = 79;
const INPUT_W = 409;
const INPUT_H = 12;
const CHAT_W = DISPLAY_X + DISPLAY_W;
const CHAT_H = INPUT_Y + INPUT_H;
const BAR_H = 85; // StatusBar height
const LINE_H = 13;
const MAX_STORED = 100;
const SCROLLBAR_W = 8;

// Combo box (m_pCBChatTarget) — SB(3,519,68,21) → relative to ChatBar root
const COMBO_X = -72, COMBO_Y = 74, COMBO_W = 68, COMBO_H = 21;
const CHAT_TARGETS = ['all', 'whisper', 'party', 'buddy', 'guild', 'alliance', 'find'];
const DROPDOWN_ROW_H = 16;

// Tab bar — overlays top of display area
const TAB_H = 18;
const TAB_NAMES = ['All', 'Party', 'Buddy', 'Guild', 'Alliance', 'System'];
const TAB_STEP = DISPLAY_W / TAB_NAMES.length;

// Chat window types (OG CUIStatusBar)
// Type 1: collapsed (minimal) — height=24, 1 line, no scrollbar
// Type 2: small — height=24, 1 line, no scrollbar
// Type 3: expanded — height=26-489, multiple lines, scrollbar, filter tabs
const CHAT_TYPE_MINIMAL = 1;
const CHAT_TYPE_SMALL = 2;
const CHAT_TYPE_EXPANDED = 3;
const MINIMAL_HEIGHT = 24;
const MINIMAL_LINES = 1;
const EXPANDED_DEFAULT_H = 70;

// Filter flags (OG m_dwChatFilterFlag)
export const FILTER_ALL = 0;
export const FILTER_FRIEND = 1;
export const FILTER_PARTY = 2;
export const FILTER_GUILD = 4;
export const FILTER_ALLIANCE = 8;
export const FILTER_EXPEDITION = 16;
export const FILTER_SYSTEM = 32;
const FILTER_FLAGS = [FILTER_ALL, FILTER_PARTY, FILTER_FRIEND, FILTER_GUILD, FILTER_ALLIANCE, FILTER_SYSTEM];

const _chatStyle = new TextStyle({ fill: '#FFF', fontSize: 11, fontFamily: 'monospace' });
const _inputStyle = new TextStyle({ fill: '#FFD', fontSize: 11, fontFamily: 'monospace' });
const _comboStyle = new TextStyle({ fill: '#FFF', fontSize: 11, fontFamily: 'monospace' });
const _tabStyle = new TextStyle({ fill: '#CCC', fontSize: 10, fontFamily: 'monospace' });
const _tabActiveStyle = new TextStyle({ fill: '#FFF', fontSize: 10, fontFamily: 'monospace' });

export class ChatBar extends GamePanel {
  onSendChat: ((msg: string) => void) | null = null;
  onItemLink: ((itemId: number) => void) | null = null;
  onChatTargetChange: ((target: string) => void) | null = null;
  onTabChange: ((tab: number) => void) | null = null;

  private _viewH = 600;
  private _bg: Graphics;
  private _inputBg: Graphics;
  private _lines: Text[] = [];
  private _stored: { text: string; links: { itemId: number; start: number; end: number }[]; filterType: number }[] = [];
  private _sentHistory: string[] = [];
  private _historyIndex = -1;
  private _inputText: Text;
  private _cursor: Graphics;
  private _input = '';
  private _isFocused = false;
  private _blinkTimer = 0;
  private _cursorVisible = true;
  private _closeBtn: Container;

  // Chat window type
  private _chatType = CHAT_TYPE_EXPANDED;
  private _chatHeight = EXPANDED_DEFAULT_H;
  private _maxLines = 5;

  // Scrollbar
  private _scrollGfx: Graphics;
  private _scroll = 0;
  private _isDraggingScroll = false;
  private _dragScrollY = 0;

  // WZ layers for toggle (chatSpace, chatSpace2, chatEnter, chatCover)
  private _layerSpace: Sprite | null = null;
  private _layerSpace2: Sprite | null = null;
  private _layerEnter: Sprite | null = null;
  private _layerCover: Sprite | null = null;

  // Combo box
  private _comboBg: Graphics;
  private _comboLabel: Text;
  private _comboTriangle: Graphics;
  private _comboSprite: Sprite | null = null;
  private _chatTarget = 0;
  private _comboOpen = false;
  private _dropdownContainer: Container;
  private _dropdownGfx: Graphics[] = [];
  private _dropdownLabels: Text[] = [];

  // Tab bar
  private _tabBarGfx: Graphics;
  private _tabBarSprites: (Sprite | null)[] = [];
  private _tabGraphics: Graphics[] = [];
  private _tabLabels: Text[] = [];
  private _activeTab = 0;
  private _filterFlags = 0; // bitmask of active filters

  constructor() {
    super();
    this.isVisible = true;
    this._viewH = 600;
    this._root.x = CHAT_X;
    this._root.y = this._calcY();

    // Display background
    this._bg = new Graphics();
    this._bg.rect(DISPLAY_X, DISPLAY_Y, DISPLAY_W, DISPLAY_H).fill({ color: '#000', alpha: 0.55 });
    this._bg.rect(DISPLAY_X, DISPLAY_Y, DISPLAY_W, DISPLAY_H).stroke({ color: '#444', width: 1 });
    this._root.addChild(this._bg);

    // Tab bar — overlays top of display
    this._tabBarGfx = new Graphics();
    this._tabBarGfx.rect(DISPLAY_X, DISPLAY_Y, DISPLAY_W, TAB_H).fill({ color: '#222', alpha: 0.7 });
    this._root.addChild(this._tabBarGfx);

    for (let i = 0; i < TAB_NAMES.length; i++) {
      const g = new Graphics();
      const tx = DISPLAY_X + i * TAB_STEP;
      this._tabGraphics.push(g);
      this._root.addChild(g);

      const t = new Text({ text: TAB_NAMES[i], style: _tabStyle });
      t.x = tx + TAB_STEP / 2 - t.width / 2;
      t.y = DISPLAY_Y + 2;
      this._tabLabels.push(t);
      this._root.addChild(t);
      this._tabBarSprites.push(null);
    }
    this._refreshTabs();

    // Chat log lines — shifted down by TAB_H so tabs don't overlap
    for (let i = 0; i < this._maxLines; i++) {
      const t = new Text({ text: '', style: _chatStyle });
      t.x = DISPLAY_X + 4;
      t.y = DISPLAY_Y + TAB_H + 2 + i * LINE_H;
      t.visible = false;
      this._lines.push(t);
      this._root.addChild(t);
    }

    // Scrollbar
    this._scrollGfx = new Graphics();
    this._scrollGfx.visible = false;
    this._root.addChild(this._scrollGfx);

    // Input area background
    this._inputBg = new Graphics();
    this._inputBg.rect(INPUT_X, INPUT_Y, INPUT_W, INPUT_H).fill({ color: '#111', alpha: 0.8 });
    this._inputBg.rect(INPUT_X, INPUT_Y, INPUT_W, INPUT_H).stroke({ color: '#555', width: 1 });
    this._root.addChild(this._inputBg);

    this._inputText = new Text({ text: '', style: _inputStyle });
    this._inputText.x = INPUT_X + 4; this._inputText.y = INPUT_Y + 1;
    this._root.addChild(this._inputText);

    this._cursor = new Graphics();
    this._cursor.rect(0, 0, 1, 11).fill({ color: '#FFF' });
    this._cursor.x = INPUT_X + 4; this._cursor.y = INPUT_Y + 1;
    this._cursor.visible = false;
    this._root.addChild(this._cursor);

    // Close button
    this._closeBtn = new Container();
    const cb = new Graphics();
    cb.rect(0, 0, 14, 14).fill({ color: '#300' });
    cb.rect(0, 0, 14, 14).stroke({ color: '#800', width: 1 });
    const ct = new Text({ text: 'X', style: new TextStyle({ fill: '#F44', fontSize: 10, fontFamily: 'monospace' }) });
    ct.x = 3; ct.y = 1;
    this._closeBtn.addChild(cb, ct);
    this._closeBtn.x = CHAT_W - 18;
    this._closeBtn.y = DISPLAY_Y + 2;
    this._root.addChild(this._closeBtn);

    // Combo box
    this._comboBg = new Graphics();
    this._comboBg.rect(COMBO_X, COMBO_Y, COMBO_W, COMBO_H).fill({ color: '#111', alpha: 0.8 });
    this._comboBg.rect(COMBO_X, COMBO_Y, COMBO_W, COMBO_H).stroke({ color: '#555', width: 1 });
    this._root.addChild(this._comboBg);

    this._comboLabel = new Text({ text: CHAT_TARGETS[0], style: _comboStyle });
    this._comboLabel.x = COMBO_X + 4;
    this._comboLabel.y = COMBO_Y + 3;
    this._root.addChild(this._comboLabel);

    this._comboTriangle = new Graphics();
    this._updateComboTriangle();
    this._root.addChild(this._comboTriangle);

    this._dropdownContainer = new Container();
    this._dropdownContainer.visible = false;
    this._root.addChild(this._dropdownContainer);
  }

  private _calcY(): number {
    // Position input area just above StatusBar (viewH - BAR_H)
    // Input bottom = _root.y + INPUT_Y + INPUT_H
    // Want: _root.y + INPUT_Y + INPUT_H = viewH - BAR_H
    return this._viewH - BAR_H - INPUT_Y - INPUT_H;
  }

  relayout(_viewW: number, viewH: number): void {
    this._viewH = viewH;
    this._root.y = this._calcY();
  }

  // --- Chat window type management (OG SetChatType) ---

  get chatType(): number { return this._chatType; }
  get chatHeight(): number { return this._chatHeight; }

  setChatType(type: number, height?: number): void {
    if (type === this._chatType) return;
    this._chatType = type;

    if (type === CHAT_TYPE_MINIMAL || type === CHAT_TYPE_SMALL) {
      this._chatHeight = MINIMAL_HEIGHT;
      this._maxLines = MINIMAL_LINES;
      this._scroll = 0;
    } else {
      this._chatHeight = height ?? EXPANDED_DEFAULT_H;
      // Compute max visible lines: display area height minus tab bar, divided by line height
      const displayArea = this._chatHeight - TAB_H - 4; // 4px padding
      this._maxLines = Math.max(1, Math.floor(displayArea / LINE_H));
    }

    this._rebuildDisplay();
    this._syncLines();
    this._updateWzVisibility();
  }

  private _rebuildDisplay(): void {
    // Remove old line texts
    for (const line of this._lines) {
      line.removeFromParent();
      line.destroy();
    }
    this._lines = [];

    // Recreate lines for current maxLines
    for (let i = 0; i < this._maxLines; i++) {
      const t = new Text({ text: '', style: _chatStyle });
      t.x = DISPLAY_X + 4;
      t.y = DISPLAY_Y + TAB_H + 2 + i * LINE_H;
      t.visible = false;
      this._lines.push(t);
      this._root.addChild(t);
    }

    // Show/hide tab bar and scrollbar based on type
    const showTabs = this._chatType === CHAT_TYPE_EXPANDED;
    const showScrollbar = this._chatType === CHAT_TYPE_EXPANDED && this._stored.length > this._maxLines;

    this._tabBarGfx.visible = showTabs;
    for (let i = 0; i < TAB_NAMES.length; i++) {
      this._tabGraphics[i].visible = showTabs;
      this._tabLabels[i].visible = showTabs;
      if (this._tabBarSprites[i]) this._tabBarSprites[i]!.visible = showTabs && i === this._activeTab;
    }
    this._scrollGfx.visible = showScrollbar;

    // Update display background height
    this._bg.clear();
    this._bg.rect(DISPLAY_X, DISPLAY_Y, DISPLAY_W, this._chatHeight)
      .fill({ color: '#000', alpha: 0.55 });
    this._bg.rect(DISPLAY_X, DISPLAY_Y, DISPLAY_W, this._chatHeight)
      .stroke({ color: '#444', width: 1 });
  }

  // --- WZ layer visibility toggle (OG toggle chat editing state) ---

  private _updateWzVisibility(): void {
    const editing = this._isFocused;
    // When editing: show chatEnter + chatCover, hide chatSpace + chatSpace2
    // When not editing: show chatSpace + chatSpace2, hide chatEnter + chatCover
    if (this._layerSpace) this._layerSpace.visible = !editing;
    if (this._layerSpace2) this._layerSpace2.visible = !editing;
    if (this._layerEnter) this._layerEnter.visible = editing;
    if (this._layerCover) this._layerCover.visible = editing;
  }

  // --- Scrollbar ---

  private _drawScrollbar(): void {
    const showScrollbar = this._chatType === CHAT_TYPE_EXPANDED && this._stored.length > this._maxLines;
    this._scrollGfx.visible = showScrollbar;
    if (!showScrollbar) return;

    this._scrollGfx.clear();
    const trackX = DISPLAY_X + DISPLAY_W - SCROLLBAR_W;
    const trackTop = DISPLAY_Y + TAB_H;
    const trackH = this._chatHeight - TAB_H - 2;
    const totalLines = this._stored.length;

    // Track background
    this._scrollGfx.rect(trackX, trackTop, SCROLLBAR_W, trackH).fill({ color: 0x333333, alpha: 0.6 });

    // Thumb
    const thumbH = Math.max(12, Math.floor(trackH * this._maxLines / Math.max(1, totalLines)));
    const span = trackH - thumbH;
    const maxScroll = Math.max(0, totalLines - this._maxLines);
    const frac = maxScroll > 0 ? this._scroll / maxScroll : 0;
    const ty = trackTop + Math.floor(span * Math.max(0, Math.min(1, frac)));
    this._scrollGfx.rect(trackX + 1, ty, SCROLLBAR_W - 2, thumbH).fill({ color: 0x888888 });
  }

  scrollBy(delta: number): void {
    const maxScroll = Math.max(0, this._stored.length - this._maxLines);
    this._scroll = Math.max(0, Math.min(maxScroll, this._scroll + delta));
    this._syncLines();
    this._drawScrollbar();
  }

  // --- Combo box ---

  private _updateComboTriangle(): void {
    const g = this._comboTriangle;
    g.clear();
    g.poly([
      COMBO_X + COMBO_W - 12, COMBO_Y + 6,
      COMBO_X + COMBO_W - 4, COMBO_Y + 6,
      COMBO_X + COMBO_W - 8, COMBO_Y + 14,
    ]).fill({ color: '#AAA' });
  }

  initWzAssets(loader: WzTextureLoader, ui: WzPackage): void {
    const bar = ui.GetItem('StatusBar2.img/mainBar');
    if (!(bar instanceof WzProperty)) {
      console.warn('[ChatBar] StatusBar2.img/mainBar not a WzProperty:', typeof bar);
      return;
    }

    const chat = ui.GetItem('StatusBar2.img/chat') as WzProperty | null;

    // Helper: load a WzCanvas from a parent and add it to _root at (x,y).
    // Tries bar (mainBar) first, then chat (StatusBar2.img/chat).
    const loadChatSprite = (name: string, x: number, y: number, visible = true): Sprite | null => {
      let node = bar.Get(name);
      if (!(node instanceof WzCanvas) && chat) {
        node = chat.Get(name);
      }
      if (node instanceof WzProperty) {
        // Some WZ entries are properties wrapping a single canvas child
        const inner = node.Get('0') ?? node.Get('bmp');
        if (inner instanceof WzCanvas) node = inner;
      }
      if (!(node instanceof WzCanvas)) {
        console.warn(`[ChatBar] ${name} not a WzCanvas:`, typeof node, node?.constructor?.name);
        return null;
      }
      const s = loader.Load(node)?.ToPixi();
      if (!s) {
        console.warn(`[ChatBar] ${name} Load/ToPixi failed`);
        return null;
      }
      s.anchor.set(0, 0);
      s.position.set(x, y);
      s.visible = visible;
      this._root.addChild(s);
      return s;
    };

    this._layerSpace = loadChatSprite('chatSpace', DISPLAY_X, DISPLAY_Y);
    this._layerSpace2 = loadChatSprite('chatSpace2', DISPLAY_X, DISPLAY_Y);
    this._layerEnter = loadChatSprite('chatEnter', INPUT_X, INPUT_Y, false);
    this._layerCover = loadChatSprite('chatCover', DISPLAY_X + DISPLAY_W - 82, INPUT_Y, false);

    // Combo box background from StatusBar2.img/mainBar/chatTarget
    const chatTarget = bar.Get('chatTarget');
    const ctNode = chatTarget instanceof WzProperty ? chatTarget.Get('bmp') ?? chatTarget.Get('0') : chatTarget instanceof WzCanvas ? chatTarget : null;
    if (ctNode instanceof WzCanvas) {
      const s = loader.Load(ctNode)?.ToPixi();
      if (s) {
        s.anchor.set(0, 0);
        s.position.set(COMBO_X, COMBO_Y);
        this._comboSprite = s;
        this._root.removeChild(this._comboBg);
        this._root.addChildAt(s, this._root.getChildIndex(this._comboLabel) - 1);
      }
    }

    // Tab bar WZ
    if (chat) {
      const tapBar = chat.Get('tapBar');
      if (tapBar instanceof WzProperty) {
        const tbBmp = tapBar.Get('0') instanceof WzCanvas ? tapBar.Get('0') as WzCanvas
          : tapBar.Get('bmp') instanceof WzCanvas ? tapBar.Get('bmp') as WzCanvas
          : null;
        if (tbBmp) {
          const s = loader.Load(tbBmp)?.ToPixi();
          if (s) {
            s.anchor.set(0, 0);
            s.position.set(DISPLAY_X, DISPLAY_Y);
            const idx = this._root.getChildIndex(this._tabBarGfx);
            this._root.removeChild(this._tabBarGfx);
            this._root.addChildAt(s, idx);
          }
        }
      }

      const tap = chat.Get('Tap') as WzProperty | null;
      if (tap) {
        for (let i = 0; i < Math.min(TAB_NAMES.length, 6); i++) {
          const tabNode = tap.Get(String(i)) as WzProperty | null;
          if (!tabNode) continue;
          const normal = tabNode.Get('normal/0');
          if (normal instanceof WzCanvas) {
            const s = loader.Load(normal)?.ToPixi();
            if (s) {
              s.anchor.set(0, 0);
              const tx = DISPLAY_X + i * TAB_STEP;
              s.position.set(tx, DISPLAY_Y);
              this._tabBarSprites[i] = s;
              this._root.addChild(s);
            }
          }
        }
        this._refreshTabs();
      }
    }

    this._updateWzVisibility();
  }

  private _refreshTabs(): void {
    for (let i = 0; i < TAB_NAMES.length; i++) {
      this._tabBarSprites[i]?.removeFromParent();
      this._tabGraphics[i].clear();

      const tx = DISPLAY_X + i * TAB_STEP;
      const active = i === this._activeTab;

      if (this._tabBarSprites[i]) {
        this._tabBarSprites[i]!.position.set(tx, DISPLAY_Y);
        this._root.addChild(this._tabBarSprites[i]!);
        this._tabBarSprites[i]!.visible = active;
      } else {
        const w = Math.floor(TAB_STEP) + (i < TAB_NAMES.length - 1 ? 0 : DISPLAY_W % TAB_NAMES.length);
        this._tabGraphics[i].rect(tx, DISPLAY_Y, w, TAB_H).fill({
          color: active ? '#3C4164' : '#1A1A2E',
          alpha: 0.5,
        });
      }

      this._tabLabels[i].text = TAB_NAMES[i];
      this._tabLabels[i].style = active ? _tabActiveStyle : _tabStyle;
      this._tabLabels[i].x = tx + TAB_STEP / 2 - this._tabLabels[i].width / 2;
    }
  }

  // --- Filter logic ---

  private _getFilterTypeForLine(line: { filterType: number }): number {
    return line.filterType;
  }

  private _isLineVisible(line: { filterType: number }): boolean {
    // FILTER_ALL (tab 0) shows everything
    if (this._activeTab === 0) return true;
    const flag = FILTER_FLAGS[this._activeTab];
    if (!flag) return true;
    // System messages always visible
    if (line.filterType === FILTER_SYSTEM) return true;
    return (line.filterType & flag) !== 0;
  }

  addLine(text: string, links: { itemId: number; start: number; end: number }[] = [], filterType = FILTER_ALL): void {
    this._stored.push({ text, links, filterType });
    if (this._stored.length > MAX_STORED) this._stored.shift();
    this._syncLines();
    this._drawScrollbar();
  }

  addMapleLine(text: string, itemName: (itemId: number) => string | null | undefined, filterType = FILTER_ALL): void {
    const links: { itemId: number; start: number; end: number }[] = [];
    let displayLen = 0;
    let lastOffset = 0;
    const display = text.replace(/#[ive](\d+)#/g, (match, id, offset) => {
      displayLen += text.slice(lastOffset, offset).length;
      const itemId = Number(id);
      const label = `[${itemName(itemId) ?? id}]`;
      const start = displayLen;
      links.push({ itemId, start, end: start + label.length });
      displayLen += label.length;
      lastOffset = offset + match.length;
      return label;
    });
    this.addLine(display, links, filterType);
  }

  get chatTarget(): string { return CHAT_TARGETS[this._chatTarget]; }
  get activeTab(): number { return this._activeTab; }
  get isComboOpen(): boolean { return this._comboOpen; }

  private _syncLines(): void {
    // Filter stored lines by active tab
    const filtered = this._stored.filter((l) => this._isLineVisible(l));
    const start = Math.max(0, filtered.length - this._maxLines);
    const scrollOffset = Math.max(0, start - this._scroll);
    const viewStart = Math.max(0, this._scroll);

    for (let i = 0; i < this._maxLines; i++) {
      const idx = viewStart + i;
      if (idx < filtered.length) {
        this._lines[i].text = filtered[idx].text;
        this._lines[i].visible = true;
      } else {
        this._lines[i].text = '';
        this._lines[i].visible = false;
      }
    }
  }

  update(dt: number): void {
    if (!this._isFocused) return;
    this._blinkTimer += dt;
    if (this._blinkTimer > 0.5) {
      this._blinkTimer = 0;
      this._cursorVisible = !this._cursorVisible;
      this._cursor.visible = this._cursorVisible;
    }
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    const lx = x - this._root.x;
    const ly = y - this._root.y;

    // Hit-test areas
    const inCombo = lx >= COMBO_X && lx < COMBO_X + COMBO_W && ly >= COMBO_Y && ly < COMBO_Y + COMBO_H;
    const dropdownOpen = this._comboOpen;
    const inDropdown = dropdownOpen && lx >= COMBO_X && lx < COMBO_X + COMBO_W
      && ly >= COMBO_Y + COMBO_H && ly < COMBO_Y + COMBO_H + CHAT_TARGETS.length * DROPDOWN_ROW_H;
    const inTabs = this._chatType === CHAT_TYPE_EXPANDED
      && lx >= DISPLAY_X && lx < DISPLAY_X + DISPLAY_W && ly >= DISPLAY_Y && ly < DISPLAY_Y + TAB_H;
    const inDisplay = lx >= DISPLAY_X && lx < DISPLAY_X + DISPLAY_W
      && ly >= DISPLAY_Y + (this._chatType === CHAT_TYPE_EXPANDED ? TAB_H : 0)
      && ly < DISPLAY_Y + this._chatHeight;
    const inInput = lx >= INPUT_X && lx < INPUT_X + INPUT_W && ly >= INPUT_Y && ly < INPUT_Y + INPUT_H;
    const inScrollbar = this._scrollGfx.visible
      && lx >= DISPLAY_X + DISPLAY_W - SCROLLBAR_W && lx < DISPLAY_X + DISPLAY_W
      && ly >= DISPLAY_Y + TAB_H && ly < DISPLAY_Y + this._chatHeight;
    const inMain = lx >= 0 && lx < CHAT_W && ly >= 0 && ly < CHAT_H;

    if (!inCombo && !inDropdown && !inTabs && !inDisplay && !inInput && !inScrollbar && !inMain) {
      if (down) this._comboOpen = false;
      if (down) this._blur();
      this._syncDropdown();
      return false;
    }

    if (!down) return true;

    // Scrollbar drag
    if (inScrollbar) {
      this._isDraggingScroll = true;
      this._dragScrollY = ly;
      return true;
    }

    // Dropdown item click
    if (inDropdown) {
      const idx = Math.floor((ly - (COMBO_Y + COMBO_H)) / DROPDOWN_ROW_H);
      if (idx >= 0 && idx < CHAT_TARGETS.length) {
        this._chatTarget = idx;
        this._comboLabel.text = CHAT_TARGETS[idx];
        this._comboOpen = false;
        this._syncDropdown();
        this.onChatTargetChange?.(CHAT_TARGETS[idx]);
        return true;
      }
    }

    // Combo box click
    if (inCombo) {
      this._comboOpen = !this._comboOpen;
      this._syncDropdown();
      return true;
    }

    // Close dropdown on any non-combo click
    if (dropdownOpen) {
      this._comboOpen = false;
      this._syncDropdown();
    }

    // Tab click
    if (inTabs) {
      const tab = Math.floor((lx - DISPLAY_X) / TAB_STEP);
      if (tab >= 0 && tab < TAB_NAMES.length) {
        this._activeTab = tab;
        this._refreshTabs();
        this._syncLines();
        this.onTabChange?.(tab);
      }
      return true;
    }

    // Close button
    if (lx >= CHAT_W - 18 && ly < DISPLAY_Y + 16) { this._blur(); return true; }

    // Item link click in display area
    if (inDisplay) {
      const lineOffset = this._chatType === CHAT_TYPE_EXPANDED ? TAB_H : 0;
      const lineIndex = Math.floor((ly - (DISPLAY_Y + lineOffset + 2)) / LINE_H);
      if (lineIndex >= 0 && lineIndex < this._maxLines) {
        const filtered = this._stored.filter((l) => this._isLineVisible(l));
        const viewStart = Math.min(this._scroll, Math.max(0, filtered.length - this._maxLines));
        const storedIndex = viewStart + lineIndex;
        const line = filtered[storedIndex];
        if (line) {
          const charIndex = Math.floor((lx - (DISPLAY_X + 4)) / 7);
          const link = line.links.find((l) => charIndex >= l.start && charIndex < l.end);
          if (link) { this.onItemLink?.(link.itemId); return true; }
        }
      }
    }

    // Click in display area (not on link) — focus input
    if (inDisplay) {
      this.focus();
      return true;
    }

    // Click in input area
    if (inInput) {
      this.focus();
      return true;
    }

    return true;
  }

  handleMouseMove(x: number, y: number): void {
    if (!this._isDraggingScroll) return;
    const ly = y - this._root.y;
    const delta = ly - this._dragScrollY;
    this._dragScrollY = ly;

    // Convert pixel delta to line scroll
    const trackH = this._chatHeight - TAB_H - 2;
    const totalLines = this._stored.length;
    const lineDelta = Math.round(delta * totalLines / trackH);
    if (lineDelta !== 0) {
      this.scrollBy(lineDelta);
    }
  }

  onMouseMove(x: number, y: number): void {
    this.handleMouseMove(x, y);
  }

  handleMouseButtonGlobal(_x: number, _y: number, down: boolean): void {
    if (this._isDraggingScroll && !down) {
      this._isDraggingScroll = false;
    }
  }

  private _syncDropdown(): void {
    this._dropdownContainer.removeChildren();
    this._dropdownContainer.visible = this._comboOpen;
    if (!this._comboOpen) return;

    for (let i = 0; i < CHAT_TARGETS.length; i++) {
      const iy = COMBO_Y + COMBO_H + i * DROPDOWN_ROW_H;
      const g = new Graphics();
      g.rect(COMBO_X, iy, COMBO_W, DROPDOWN_ROW_H).fill({
        color: i === this._chatTarget ? '#3C4164' : '#0F0F19',
      });
      g.rect(COMBO_X, iy, COMBO_W, DROPDOWN_ROW_H).stroke({ color: '#504632', width: 1 });
      if (i === this._chatTarget) {
        g.rect(COMBO_X + 2, iy + 3, 10, 10).fill({ color: '#64DC64' });
      }
      this._dropdownContainer.addChild(g);

      const t = new Text({ text: CHAT_TARGETS[i], style: _comboStyle });
      t.x = COMBO_X + 14;
      t.y = iy + 2;
      this._dropdownContainer.addChild(t);
    }
  }

  onKeyPress(key: string): boolean {
    if (!this._isFocused) return false;
    if (key === 'Escape') { this._blur(); return true; }
    if (key === 'Enter') {
      this._sendInput();
      return true;
    }
    if (key === 'Backspace') {
      this._input = this._input.slice(0, -1);
      this._syncInput();
      return true;
    }
    if (key === 'ArrowUp') {
      if (this._historyIndex < this._sentHistory.length - 1) this._historyIndex++;
      this._applyHistory();
      return true;
    }
    if (key === 'ArrowDown') {
      if (this._historyIndex >= 0) this._historyIndex--;
      this._applyHistory();
      return true;
    }
    if (key === 'PageUp') {
      this.scrollBy(-this._maxLines);
      return true;
    }
    if (key === 'PageDown') {
      this.scrollBy(this._maxLines);
      return true;
    }
    if (key.length === 1) {
      if (this._input.length < 60) {
        this._input += key;
        this._syncInput();
      }
      return true;
    }
    return false;
  }

  focus(): void {
    this._isFocused = true;
    this._cursor.visible = true;
    this._inputBg.rect(INPUT_X, INPUT_Y, INPUT_W, INPUT_H).stroke({ color: '#8AF', width: 1 });
    this._updateWzVisibility();
  }

  private _blur(): void {
    this._isFocused = false;
    this._cursor.visible = false;
    this._historyIndex = -1;
    this._input = '';
    this._syncInput();
    this._inputBg.clear();
    this._inputBg.rect(INPUT_X, INPUT_Y, INPUT_W, INPUT_H).fill({ color: '#111', alpha: 0.8 });
    this._inputBg.rect(INPUT_X, INPUT_Y, INPUT_W, INPUT_H).stroke({ color: '#555', width: 1 });
    this._updateWzVisibility();
  }

  private _sendInput(): void {
    const msg = this._input.trim();
    if (msg.length > 0) {
      this.onSendChat?.(msg);
      this.addLine(`> ${msg}`, [], FILTER_ALL);
      this._sentHistory.unshift(msg);
      if (this._sentHistory.length > MAX_STORED) this._sentHistory.pop();
    }
    this._historyIndex = -1;
    this._input = '';
    this._syncInput();
  }

  private _applyHistory(): void {
    this._input = this._historyIndex < 0 ? '' : this._sentHistory[this._historyIndex];
    this._syncInput();
  }

  setInput(text: string): void {
    this._input = text;
    this._syncInput();
  }

  private _syncInput(): void {
    this._inputText.text = this._input;
    this._cursor.x = INPUT_X + 4 + this._inputText.width;
  }
}
