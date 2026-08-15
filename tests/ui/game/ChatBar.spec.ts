import { describe, it, expect } from 'vitest';
import { Text, Sprite, Texture } from 'pixi.js';
import { ChatBar, FILTER_ALL, FILTER_BUDDY, FILTER_PARTY, FILTER_GUILD, FILTER_ALLIANCE, FILTER_EXPEDITION } from '../../../src/ui/game/ChatBar.js';
import { WzSprite } from '../../../src/render/WzSprite.js';

// ponytail: avoids pulling in jsdom just to satisfy Text.width's canvas measurement in tests
Object.defineProperty(Text.prototype, 'width', { get: () => 0 });

// OG edit control coordinates (ChatBar.ts constants, +20 CHAT_DY user tuning)
const EDIT_X = 75;
const EDIT_Y = 544;
const DISPLAY_X = 0;
const DISPLAY_Y_SMALL = 512;
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
    const [sx, sy] = screenPos(bar, EDIT_X + 4, EDIT_Y + 2);
    bar.handleMouseButton(sx, sy, true);
    for (const ch of msg) bar.onKeyPress(ch);
    bar.onKeyPress('Enter');
  }

  it('ArrowUp/ArrowDown cycle through previously sent messages', () => {
    const bar = new ChatBar();
    typeAndSend(bar, 'first');
    typeAndSend(bar, 'second');

    // Re-focus after last send (endChat unfocused the bar)
    const [fx, fy] = screenPos(bar, EDIT_X + 4, EDIT_Y + 2);
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
    expect((bar as any)._input).toBe(''); // back past newest clears input
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
    const [sx, sy] = screenPos(bar, TEXT_X + 8 * CHAR_W, DISPLAY_Y_SMALL + CHAT_HEIGHT_SMALL - LINE_H + 6);
    expect(bar.handleMouseButton(sx, sy, true)).toBe(true);
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

  it('fallbacks to text when no WZ canvas exists (whisper 7 / find 8)', () => {
    const bar = new ChatBar();
    bar.setChatTarget(7); // whisper has no canvas
    const c = combo(bar);
    expect(c._labelSprite).toBeNull();
    expect(c._label.visible).toBe(true);
    expect(c._label.text).toBe('Whisper');
  });

  it('combo click change routes through _applyComboLabel and fires onChatTargetChange', () => {
    const bar = new ChatBar();
    const changed: string[] = [];
    bar.onChatTargetChange = (v) => changed.push(v);
    const c = combo(bar);

    // Open the dropdown and click Party (3rd visible item, index 2 — the two
    // empty labels at indices 6/7 are filtered out). Dropdown rows are laid
    // out upward from the box.
    c.handleMouseButton(30, 10, true); // toggle open
    const itemH = 16;
    const idxInList = 2;
    const ly = -c._items.filter((it: any) => it.label).length * itemH + idxInList * itemH + itemH / 2;
    c.handleMouseButton(30, ly, true);

    expect((bar as any)._nChatTarget).toBe(2);
    expect(changed).toEqual(['party']);
    expect(c._label.visible).toBe(true); // no WZ label stubbed → text fallback
  });
});

describe('ChatBar input edit control (OG m_paramEdit)', () => {
  it('input text is black (0xFF000000) per m_paramEdit.nFontColor', () => {
    const bar = new ChatBar();
    const st: any = (bar as any)._inputText.style;
    expect(String(st.fill).toLowerCase()).toBe('#000000');
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
    // _chatWndY = 518 + CHAT_DY(20) = 538 (expanded log top).
    // chatSpace (512,57)→(0,542), chatSpace2 (512,60)→(0,539),
    // chatEnter (467,58)→(45,541), chatCover (509,57)→(3,542).
    // As offsets from the log top: +24/+21/+23/+24, kept relative to _chatWndY.
    const bar = new ChatBar();
    const { space, space2, enter, cover } = withLayers(bar);

    expect(space.position.x).toBe(0);
    expect(space.position.y).toBe(538 + 24); // 562
    expect(space2.position.x).toBe(0);
    expect(space2.position.y).toBe(538 + 21); // 559
    expect(enter.position.x).toBe(45);
    expect(enter.position.y).toBe(538 + 23); // 561
    expect(cover.position.x).toBe(3);
    expect(cover.position.y).toBe(538 + 24); // 562
  });

  it('shifts layers with the chat window type', () => {
    // Expanded type: m_ptChatWnd.y = 515 − height (default height 70 →
    // _chatWndY = 515 + 20 − 70 = 465). The layers track _chatWndY.
    const bar = new ChatBar();
    (bar as any).setChatType(3);
    const b = bar as any;
    expect(b._chatWndY).toBe(465);
    const enter = new Sprite(Texture.EMPTY);
    b._layerEnter = enter;
    b._applyLayout();
    expect(enter.position.x).toBe(45);
    expect(enter.position.y).toBe(465 + 23); // 488
  });
});
