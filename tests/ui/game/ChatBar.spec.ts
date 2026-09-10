import { describe, it, expect } from 'vitest';
import { Text, Sprite, Texture } from 'pixi.js';
import { ChatBar, FILTER_ALL, FILTER_BUDDY, FILTER_PARTY, FILTER_GUILD, FILTER_ALLIANCE, FILTER_EXPEDITION } from '../../../src/ui/game/ChatBar.js';
import { WzSprite } from '../../../src/render/WzSprite.js';

// ponytail: avoids pulling in jsdom just to satisfy Text.width's canvas measurement in tests
Object.defineProperty(Text.prototype, 'width', { get: () => 0 });

// OG edit control coordinates (ChatBar.ts: CreateCtrl id=1011 x=75 y=524)
const EDIT_X = 75;
const EDIT_Y = 524; // OG MakeCtrlEdit input row
const DISPLAY_X = 0;
const DISPLAY_Y_SMALL = 492;
const CHAT_HEIGHT_SMALL = 24;
const TEXT_X = 9;
const CHAR_W = 7;
const LINE_H = 13;

describe('ChatBar history recall', () => {
  function screenPos(bar: ChatBar, lx: number, ly: number): [number, number] {
    const root = (bar as any)._root;
    return [root.x + lx, root.y + ly];
  }

  function typeAndSend(bar: ChatBar, msg: string): void {
    const [sx, sy] = screenPos(bar, EDIT_X + 4, (bar as any)._editY + 2);
    bar.handleMouseButton(sx, sy, true);
    for (const ch of msg) bar.onKeyPress(ch);
    bar.onKeyPress('Enter'); // OG: stays open + focused after send
    (bar as any)._blur(); // test harness stands in for outside-click
  }

  it('ArrowUp/ArrowDown cycle through previously sent messages', () => {
    const bar = new ChatBar();
    typeAndSend(bar, 'first');
    typeAndSend(bar, 'second');

    // Re-focus after last send (endChat unfocused the bar)
    const [fx, fy] = screenPos(bar, EDIT_X + 4, (bar as any)._editY + 2);
    bar.handleMouseButton(fx, fy, true);
    bar.onKeyPress('ArrowUp');
    expect((bar as any)._input).toBe('second');
    bar.onKeyPress('ArrowUp');
    expect((bar as any)._input).toBe('first');
    bar.onKeyPress('ArrowUp');
    expect((bar as any)._input).toBe('first'); // clamps at oldest

    bar.onKeyPress('ArrowDown');
    expect((bar as any)._input).toBe('second');
    bar.onKeyPress('ArrowDown');
    expect((bar as any)._input).toBe('second'); // past newest: input kept (OG skips SetText)
  });

  it('turns Maple item tags into clickable chat links', () => {
    const bar = new ChatBar();
    bar.startChat(); // switch to SMALL so display area is visible
    let clicked = 0;
    bar.onItemLink = (itemId) => { clicked = itemId; };

    bar.addMapleLine('loot #i2000000# now', (id) => id === 2000000 ? 'Red Potion' : null);

    // Text is "loot [Red Potion] now" — link [Red Potion] spans chars 5-16
    // Click at char 8 → lx = TEXT_X + 8*CHAR_W = 65
    // OG bottom-up: line 0 y = displayY + chatHeight - 13 = 492 + 24 - 13 = 503
    // Line center y = 503 + 6 = 509
    // OG HitTest: display clicks are a pass-through miss — the link fires as
    // a side effect (TryBeginShowItemInfo) and the click is NOT consumed.
    const [sx, sy] = screenPos(bar, TEXT_X + 8 * CHAR_W, DISPLAY_Y_SMALL + CHAT_HEIGHT_SMALL - LINE_H + 6);
    expect(bar.handleMouseButton(sx, sy, true)).toBe(false);
    expect(clicked).toBe(2000000);
  });

  it('keeps duplicate item links distinct', () => {
    const bar = new ChatBar();
    bar.startChat(); // switch to SMALL so display area is visible
    const clicked: number[] = [];
    bar.onItemLink = (itemId) => { clicked.push(itemId); };

    bar.addMapleLine('#i100# and #i200#', (id) => `Item${id}`);

    // Text: "[Item100] and [Item200]"
    // Link1: chars 0-9 → click at char 3 → lx = TEXT_X + 3*CHAR_W = 30
    // Link2: chars 15-24 → click at char 20 → lx = TEXT_X + 20*CHAR_W = 149
    // OG bottom-up: line 0 y = 492 + 24 - 13 = 503, center = 509
    const [sx1, sy] = screenPos(bar, TEXT_X + 3 * CHAR_W, DISPLAY_Y_SMALL + CHAT_HEIGHT_SMALL - LINE_H + 6);
    const [sx2] = screenPos(bar, TEXT_X + 20 * CHAR_W, DISPLAY_Y_SMALL + CHAT_HEIGHT_SMALL - LINE_H + 6);
    bar.handleMouseButton(sx1, sy, true);
    bar.handleMouseButton(sx2, sy, true);
    expect(clicked).toEqual([100, 200]);
  });
});

describe('ChatBar filter tabs (IDB OnButtonClicked 0x880540)', () => {
  const TAB_H = 18;

  // Expanded chat: height=70 → m_ptChatWnd.y = 515-70 = 445. The tab hit-test
  // region (handleMouseButton) is ly in [m_ptChatWnd.y, +TAB_H); buttons are
  // laid out at x = 1+i*46 with TAB_SPACING width.
  function clickTab(bar: ChatBar, index: number): void {
    const root = (bar as any)._root;
    const chatWndY = (bar as any)._chatWndY;
    const sx = root.x + 1 + index * 46 + 23;
    const sy = root.y + chatWndY + 9;
    bar.handleMouseButton(sx, sy, true);
  }

  function expand(bar: ChatBar): void {
    bar.setChatType(3); // CHAT_TYPE_EXPANDED — only type with filter tabs
  }

  it('exports the IDB-verified filter flag constants', () => {
    expect(FILTER_ALL).toBe(0);
    expect(FILTER_BUDDY).toBe(0x08);        // 0x3F7 Friend
    expect(FILTER_PARTY).toBe(0x04);        // 0x3F8 Party
    expect(FILTER_GUILD).toBe(0x10);        // 0x3F9 Guild
    expect(FILTER_ALLIANCE).toBe(0x20);     // 0x3FA Alliance
    expect(FILTER_EXPEDITION).toBe(0x4000000); // 0x3FB Expedition
  });

  it('Party tab sets the 0x04 bit and filters to party messages only', () => {
    const bar = new ChatBar();
    expand(bar); // toggles MINIMAL → EXPANDED
    expect((bar as any)._chatType).toBe(3);
    bar.addLine('normal text', 0);
    bar.addLine('party text', 2); // ChatType party
    bar.addLine('whisper text', 14); // ChatType whisper — always passes

    clickTab(bar, 2); // Party
    expect((bar as any)._dwChatFilterFlag).toBe(FILTER_PARTY);

    const filtered = (bar as any)._getFilteredChatLogCount();
    // party(2) + whisper(14, always visible band) — normal(0) is filtered out
    expect(filtered).toBe(2);
  });

  it('All tab clears every filter bit', () => {
    const bar = new ChatBar();
    expand(bar);
    clickTab(bar, 2); // Party on
    expect((bar as any)._dwChatFilterFlag).toBe(FILTER_PARTY);
    clickTab(bar, 0); // All — resets to 0
    expect((bar as any)._dwChatFilterFlag).toBe(0);
    expect((bar as any)._filterChecked[0]).toBe(true);
  });

  it('tabs XOR their own bit (clicking twice toggles off)', () => {
    const bar = new ChatBar();
    expand(bar);
    clickTab(bar, 3); // Guild
    expect((bar as any)._dwChatFilterFlag).toBe(FILTER_GUILD);
    clickTab(bar, 3);
    expect((bar as any)._dwChatFilterFlag).toBe(0);
  });

  it('separate group tabs combine bits independently', () => {
    const bar = new ChatBar();
    expand(bar);
    clickTab(bar, 1); // Friend
    clickTab(bar, 2); // Party
    expect((bar as any)._dwChatFilterFlag).toBe(FILTER_BUDDY | FILTER_PARTY);
    clickTab(bar, 4); // Alliance
    expect((bar as any)._dwChatFilterFlag).toBe(FILTER_BUDDY | FILTER_PARTY | FILTER_ALLIANCE);
  });

  it('membership gating hides a group tab and clears its filter bit', () => {
    const bar = new ChatBar();
    expand(bar);
    clickTab(bar, 2); // Party on
    expect((bar as any)._dwChatFilterFlag).toBe(FILTER_PARTY);

    bar.setMembership({ party: false });
    // _ResetChatBarPos: m_dwChatFilterFlag &= ~4 when not in party
    expect((bar as any)._dwChatFilterFlag).toBe(0);
    expect((bar as any)._tabGraphics[2].visible).toBe(false);
    expect((bar as any)._tabGraphics[3].visible).toBe(true); // Guild still shown
  });

  it('membership gating compacts the tab strip layout', () => {
    const bar = new ChatBar();
    expand(bar);
    // Hide Guild (index 3): Alliance (4) and Expedition (5) shift left one slot
    bar.setMembership({ guild: false });
    expect((bar as any)._tabLabels[4].x).toBe(1 + 3 * 46 + 4); // Alliance now at slot 3 (label = btnX+4)
    expect((bar as any)._tabLabels[5].x).toBe(1 + 4 * 46 + 4); // Expedition at slot 4
  });

  it('filter tabs show only in expanded (OG SetChatType tail: type == 3)', () => {
    const bar = new ChatBar();
    bar.startChat(); // SMALL — tabs hidden
    expect((bar as any)._tabGraphics[0].visible).toBe(false);
    expect((bar as any)._tabLabels[0].visible).toBe(false);
    bar.setChatType(3); // EXPANDED — tabs shown
    expect((bar as any)._tabGraphics[0].visible).toBe(true);
    expect((bar as any)._tabLabels[0].visible).toBe(true);
  });

  it('uses ChatType-indexed font colors for group messages', () => {
    const bar = new ChatBar();
    // _chatFonts[2] = party pink, [3] = buddy orange, [4] = guild purple,
    // [5] = alliance light green, [26] = expedition teal (IDB OnCreate)
    const fonts: any[] = (bar as any)._chatFonts;
    expect(fonts[2].fill).toBe('#ff99cc');
    expect(fonts[3].fill).toBe('#ff9900');
    expect(fonts[4].fill).toBe('#e1acfe');
    expect(fonts[5].fill).toBe('#a6ff7f');
    expect(fonts[26].fill).toBe('#7dffee');
  });
});

describe('ChatBar combo box label (OG chatTarget label canvases)', () => {
  function combo(bar: ChatBar): any { return (bar as any)._combo; }

  it('setChatTarget with a WZ label canvas shows the sprite and hides the text', () => {
    const bar = new ChatBar();
    // Stub the WZ label for target 2 (Party) — direct child canvas `party`,
    // origin (498,54) vs base origin (510,58) → offset (12,4).
    (bar as any)._chatTargetLabels[2] = new WzSprite(Texture.EMPTY, 498, 54);
    bar.setChatTarget(2);

    const c = combo(bar);
    expect(c._labelSprite).toBeInstanceOf(Sprite);
    expect(c._labelSprite.position.x).toBe(12); // 510 - 498
    expect(c._labelSprite.position.y).toBe(4);  // 58 - 54
    expect(c._label.visible).toBe(false);
  });

  it('routes target 7 through the ChangeWhisperTarget dialog (no direct apply)', () => {
    // OG SetChatTarget case 7 → ChangeWhisperTarget dialog; the target
    // applies only on confirm via setWhisperTarget.
    const bar = new ChatBar();
    const requested: string[][] = [];
    bar.onWhisperDialogRequest = (c) => requested.push(c);
    (bar as any)._addWhisperCandidate('alice');
    bar.setChatTarget(7);
    expect(requested).toEqual([['alice']]);
    expect((bar as any)._nChatTarget).not.toBe(7);
    expect((bar as any)._whisperPickerOpen).toBe(true);
    // Confirm path applies the target.
    bar.setWhisperTarget('alice');
    expect((bar as any)._nChatTarget).toBe(7);
  });

  it('combo click change routes through _applyComboLabel and fires onChatTargetChange', () => {
    const bar = new ChatBar();
    const changed: string[] = [];
    bar.onChatTargetChange = (v) => changed.push(v);
    const c = combo(bar);

    // Open the dropdown and click "To the party" (3rd visible item, index 2 —
    // the two empty labels at indices 6/7 are filtered out). Dropdown rows
    // are laid out upward from the box.
    c.handleMouseButton(30, 10, true); // toggle open
    const itemH = 16;
    const idxInList = 2;
    const ly = -c._items.filter((it: any) => it.label).length * itemH + idxInList * itemH + itemH / 2;
    c.handleMouseButton(30, ly, true);

    expect((bar as any)._nChatTarget).toBe(2);
    expect(changed).toEqual(['party']);
    expect(c._label.visible).toBe(true); // no WZ label stubbed → text fallback
    expect(c._label.text).toBe('To the party');
  });
});

describe('ChatBar input edit control (OG m_paramEdit)', () => {
  it('input text is black (0xFF000000) per m_paramEdit.nFontColor', () => {
    const bar = new ChatBar();
    const st: any = (bar as any)._inputText.style;
    expect(String(st.fill).toLowerCase()).toBe('#000000');
  });

  it('uses Arial (StringPool 6693) for input, combo and log fonts', () => {
    const bar = new ChatBar();
    expect((bar as any)._inputText.style.fontFamily).toBe('Arial');
    expect((bar as any)._chatFonts[0].fontFamily).toBe('Arial');
  });
});

describe('ChatBar IDA-verified layout (MakeCtrlEdit/ChatLogDraw)', () => {
  it('whisper first-lines shift up 5px when not expanded, 0 when expanded', () => {
    // OG ChatLogDraw: nTop = h+13*(-1-idx)-(type!=3?5:0) for lType 14/16/23/24
    // first lines; main text at h-13*idx-13 with no shift.
    const small = new ChatBar();
    small.startChat(); // SMALL: displayY=492, h=24
    small.addLine('bob: hi', 14);
    expect((small as any)._lines[0].y).toBe(492 + (24 - 13 - 5)); // 498

    const plain = new ChatBar();
    plain.startChat();
    plain.addLine('hello', 0);
    expect((plain as any)._lines[0].y).toBe(492 + (24 - 13)); // 503, no shift

    const exp = new ChatBar();
    exp.setChatType(3); // EXPANDED: displayY=515-70=445, tabOffset=18
    exp.addLine('bob: hi', 14);
    expect((exp as any)._lines[0].y).toBe(445 + 18 + (70 - 13)); // 530, no shift
  });

  it('chatSpace2 is visible only when the input controls are destroyed (!bCreate)', () => {
    // OG MakeCtrlEdit tail: space/space2 visible = (bCreate==0).
    const bar = new ChatBar();
    const b = bar as any;
    b._layerSpace2 = new Sprite(Texture.EMPTY);
    b._updateWzVisibility(); // MINIMAL → bCreate=0
    expect(b._layerSpace2.visible).toBe(true);
    bar.startChat(); // SMALL → bCreate=1
    expect(b._layerSpace2.visible).toBe(false);
  });
});

describe('ChatBar focus lifecycle (OG EndChat @0x87A520 / HitTest @0x86D500)', () => {
  it('plain display clicks pass through without focusing', () => {
    const bar = new ChatBar();
    bar.startChat();
    bar.addLine('plain', 0);
    (bar as any)._blur();
    expect(bar.isFocused).toBe(false);
    const root = (bar as any)._root;
    // Display row, no links/whisper: unconsumed, stays unfocused.
    const consumed = bar.handleMouseButton(root.x + 200, root.y + 503, true);
    expect(consumed).toBe(false);
    expect(bar.isFocused).toBe(false);
  });

  it('losing focus keeps the typed input (OG EndChat does not clear)', () => {
    const bar = new ChatBar();
    bar.startChat();
    for (const ch of 'half') bar.onKeyPress(ch);
    (bar as any)._blur();
    expect(bar.isFocused).toBe(false);
    expect((bar as any)._input).toBe('half');
  });

  it('Enter keeps the chat open and focused with cleared input', () => {
    const bar = new ChatBar();
    bar.startChat();
    for (const ch of 'hi') bar.onKeyPress(ch);
    bar.onKeyPress('Enter');
    expect(bar.isFocused).toBe(true);
    expect((bar as any)._input).toBe('');
    expect((bar as any)._chatType).toBe(2);
  });
});

describe('ChatBar SetChatTarget (OG @0x87FD30)', () => {
  it('boots with target 8 ("To All", SP 0x322) per the CUIStatusBar ctor', () => {
    const bar = new ChatBar();
    expect((bar as any)._nChatTarget).toBe(8);
    const c = (bar as any)._combo;
    expect(c._label.text).toBe('To All');
  });

  it('switching target opens chat, clears input and the whisper target', () => {
    const bar = new ChatBar();
    (bar as any)._input = 'half-typed';
    (bar as any)._whisperTarget = 'alice';
    const changed: string[] = [];
    bar.onChatTargetChange = (v) => changed.push(v);
    bar.setChatTarget(2);
    expect((bar as any)._nChatTarget).toBe(2);
    expect((bar as any)._input).toBe('');
    expect((bar as any)._whisperTarget).toBe('');
    expect((bar as any)._chatType).toBe(2); // StartChat from minimal
    expect(changed).toEqual(['party']);
  });

  it('combo selection routes through the full SetChatTarget switch', () => {    const bar = new ChatBar();
    const changed: string[] = [];
    bar.onChatTargetChange = (v) => changed.push(v);
    const c = (bar as any)._combo;
    // Select Whisper (param 1): plain apply, no dialog (group dialog gap).
    c.handleMouseButton(30, 10, true); // open
    const itemH = 16;
    const ly = -c._items.filter((it: any) => it.label).length * itemH + 1 * itemH + itemH / 2;
    c.handleMouseButton(30, ly, true);
    expect((bar as any)._nChatTarget).toBe(1);
    expect(changed).toEqual(['whisper']);
  });
});

describe('ChatBar scroll model (OG _RefreshChatLog @0x879B70)', () => {  function expandedBar(): ChatBar {
    const bar = new ChatBar();
    bar.setChatType(3); // h=70 → 5 visible lines
    return bar;
  }

  it('shows the newest message at the bottom once the log overflows', () => {
    const bar = expandedBar();
    for (let i = 0; i < 10; i++) bar.addLine(`msg${i}`, 0);
    const b = bar as any;
    expect(b._scroll).toBe(0);
    // Bottom row (i=0) shows the newest entry.
    const bottomText = b._lineTexts[0]?.text ?? b._lines[0].children.map((c: any) => c.text ?? '').join('');
    expect(bottomText).toContain('msg9');
  });

  it('holds the viewed entries when a new message arrives while scrolled up', () => {
    const bar = expandedBar();
    for (let i = 0; i < 10; i++) bar.addLine(`msg${i}`, 0);
    const b = bar as any;
    bar.scrollBy(2);
    const before: string = b._lines[0].children.map((c: any) => c.text ?? '').join('');
    bar.addLine('newest', 0);
    expect(b._scroll).toBe(3);
    const after: string = b._lines[0].children.map((c: any) => c.text ?? '').join('');
    expect(after).toBe(before);
  });

  it('PageUp moves older, PageDown moves newer', () => {
    const bar = expandedBar();
    for (let i = 0; i < 10; i++) bar.addLine(`msg${i}`, 0);
    const b = bar as any;
    bar.focus();
    bar.onKeyPress('PageUp');
    expect(b._scroll).toBeGreaterThan(0);
    const up = b._scroll;
    bar.onKeyPress('PageDown');
    expect(b._scroll).toBeLessThan(up);
  });
});

describe('ChatBar WZ layer positions (OG mainBar origin anchor)', () => {
  function withLayers(bar: ChatBar): { space: Sprite; space2: Sprite; enter: Sprite; cover: Sprite } {
    const mk = () => new Sprite(Texture.EMPTY);
    const layers = { space: mk(), space2: mk(), enter: mk(), cover: mk() };
    const b = bar as any;
    b._layerSpace = layers.space;
    b._layerSpace2 = layers.space2;
    b._layerEnter = layers.enter;
    b._layerCover = layers.cover;
    b._applyLayout();
    return layers;
  }

  it('anchors chat layers from the mainBar origin (screen = _barRef − WZ origin), shifted with _chatWndY', () => {
    // _chatWndY = 518 + CHAT_DY(0) = 518 (minimal log top).
    // chatSpace (512,57)→(0,542), chatSpace2 (512,60)→(0,539),
    // chatEnter (467,58)→(45,541), chatCover (509,57)→(3,542).
    // As offsets from the log top: +24/+21/+23/+24, kept relative to _chatWndY.
    const bar = new ChatBar();
    const { space, space2, enter, cover } = withLayers(bar);

    expect(space.position.x).toBe(0);
    expect(space.position.y).toBe(518 + 24); // 542
    expect(space2.position.x).toBe(0);
    expect(space2.position.y).toBe(518 + 21); // 539
    expect(enter.position.x).toBe(45);
    expect(enter.position.y).toBe(518 + 23); // 541
    expect(cover.position.x).toBe(3);
    expect(cover.position.y).toBe(518 + 24); // 542
  });

  it('keeps the input-strip layers fixed when the log expands upward', () => {
    // Expanded type: m_ptChatWnd.y = 515 − height (default height 70 →
    // _chatWndY = 445). The LOG grows upward, but the input-strip chrome
    // (chatEnter etc.) stays glued at the fixed bottom edge (~541) so the
    // chat bar keeps its position relative to the status bar.
    const bar = new ChatBar();
    (bar as any).setChatType(3);
    const b = bar as any;
    expect(b._chatWndY).toBe(445);
    const enter = new Sprite(Texture.EMPTY);
    b._layerEnter = enter;
    b._applyLayout();
    expect(enter.position.x).toBe(45);
    expect(enter.position.y).toBe(518 + 23); // 541 — unchanged from minimal
  });
});

describe('ChatBar whisper click (OG TryBeginWhisper @0x87F390)', () => {  function whisperBar(): ChatBar {
    const bar = new ChatBar();
    bar.startChat(); // SMALL: displayY=492, h=24
    // lType 14 + icon + first line. Text width shim = 0 → hit rect x in [15, 48).
    bar.addLine('bob: hi', 14, -1, true);
    return bar;
  }

  function click(bar: ChatBar, lx: number, ly: number): void {
    const root = (bar as any)._root;
    bar.handleMouseButton(root.x + lx, root.y + ly, true);
  }

  it('click inside the (nameW+6, nameW+39) rect opens the dialog without applying', () => {
    const bar = whisperBar();
    const requested: string[][] = [];
    bar.onWhisperDialogRequest = (c) => requested.push(c);
    click(bar, 20, 500); // inside [15,48), row y 498..511
    expect(requested).toEqual([['bob']]);
    expect((bar as any)._nChatTarget).not.toBe(7);
  });

  it('click elsewhere on the whisper line does not open the dialog', () => {
    const bar = whisperBar();
    let opened = false;
    bar.onWhisperDialogRequest = () => { opened = true; };
    click(bar, 200, 500);
    expect(opened).toBe(false);
  });

  it('ignores clicks on your own name', () => {
    const bar = whisperBar();
    bar.myName = 'bob';
    let opened = false;
    bar.onWhisperDialogRequest = () => { opened = true; };
    click(bar, 20, 500);
    expect(opened).toBe(false);
  });
});

describe('ChatBar highlight colors (OG ChatLogAdd @0x87AEC0)', () => {
  it('assigns per-type m_nBack values', () => {
    const bar = new ChatBar();
    const backOf = (t: number, ch = -1) => (bar as any)._backColorFor(t, ch);
    expect(backOf(0)).toBe(0);
    expect(backOf(14)).toBe(0xCCFFBFDD);
    expect(backOf(15)).toBe(0xFFF74B4B);
    expect(backOf(16)).toBe(0xDDFFC600);
    expect(backOf(21)).toBe(0xDDFFC600);
    expect(backOf(19, 2)).toBe(0xFF99CC33);
    expect(backOf(19, -1)).toBe(0x80FF5C59);
    expect(backOf(20)).toBe(0x80FF5C59);
    expect(backOf(22)).toBe(0xFF99CC33);
    expect(backOf(11)).toBe(0xB0FFFFFF);
  });

  it('draws the highlight band behind back-colored lines', () => {
    const bar = new ChatBar();
    bar.startChat();
    bar.addLine('sys', 14);
    const b = bar as any;
    expect(b._chatLog[0].nBack).toBe(0xCCFFBFDD);
    // First child of the row container is the highlight Graphics.
    const row = b._lines[0];
    expect(row.children.length).toBeGreaterThan(1);
    expect(row.children[0].constructor.name).toBe('Graphics');
  });

  it('leaves plain lines without a highlight rect', () => {
    const bar = new ChatBar();
    bar.startChat();
    bar.addLine('plain', 0);
    const b = bar as any;
    expect(b._chatLog[0].nBack).toBe(0);
    expect(b._lines[0].children.length).toBe(1);
  });

  it('log lines never fade (OG ChatLogDraw draws constant alpha)', () => {
    const bar = new ChatBar();
    bar.startChat();
    bar.addLine('stays', 0);
    const b = bar as any;
    for (let i = 0; i < 10; i++) bar.update(16);
    expect(b._lines[0].alpha).toBe(1);
    expect('timestamp' in b._chatLog[0]).toBe(false);
  });
});

describe('ChatBar send path (OG OnKey Enter @0x87FDE0)', () => {  function send(bar: ChatBar, msg: string): void {
    const root = (bar as any)._root;
    const editY = (bar as any)._editY;
    bar.handleMouseButton(root.x + 75 + 4, root.y + editY + 2, true);
    for (const ch of msg) bar.onKeyPress(ch);
    bar.onKeyPress('Enter');
  }

  it('whisper target with no name shows the SP 0xAFD notice and sends nothing', () => {
    const bar = new ChatBar();
    (bar as any)._nChatTarget = 7; // whisper mode, no name (bypasses dialog)
    const sent: string[] = [];
    bar.onSendChat = (m) => sent.push(m);
    send(bar, 'hello');
    expect(sent).toEqual([]);
    const log = (bar as any)._chatLog;
    expect(log[log.length - 1].text).toBe('There is no one to whisper to.');
    expect(log[log.length - 1].lType).toBe(12);
  });

  it('Find-target sends append the SP 6445 notice', () => {
    const bar = new ChatBar(); // boots target 8
    expect((bar as any)._nChatTarget).toBe(8);
    const sent: string[] = [];
    bar.onSendChat = (m) => sent.push(m);
    send(bar, 'hello map');
    expect(sent).toEqual(['hello map']);
    const log = (bar as any)._chatLog;
    expect(log[log.length - 1].text).toBe('Select View All to check sent messages.');
  });
});

describe('ChatBar spam gate (OG CChatHelper::TryChat @0x4AA550)', () => {
  it('mutes for 2800ms (0xAF0) on 4 identical lines, with the SP 0x390 text', () => {
    const bar = new ChatBar();
    const notices: string[] = [];
    (bar as any).floatNotice = (t: string) => notices.push(t);
    const tryChat = (m: string): boolean => (bar as any)._tryChat(m);
    expect(tryChat('spam')).toBe(true);
    expect(tryChat('spam')).toBe(true);
    expect(tryChat('spam')).toBe(true);
    expect(tryChat('spam')).toBe(true);
    expect(tryChat('spam')).toBe(false);
    expect(notices[notices.length - 1]).toContain('Repeating the same line');
    // Mute window is 2800ms, not 30s.
    (bar as any)._muteEndTime = performance.now() - 2799;
    expect(tryChat('spam')).toBe(false);
    (bar as any)._muteEndTime = performance.now() - 2801;
    expect(tryChat('other')).toBe(true);
  });

  it('chat-blocked state drops messages with the SP 0x392 notice', () => {
    const bar = new ChatBar();
    const notices: string[] = [];
    (bar as any).floatNotice = (t: string) => notices.push(t);
    bar.setChatBlocked(true);
    expect((bar as any)._tryChat('hello')).toBe(false);
    expect(notices[notices.length - 1]).toBe('You are currently blocked from chatting.');
    bar.setChatBlocked(false);
    expect((bar as any)._tryChat('hello')).toBe(true);
  });
});
