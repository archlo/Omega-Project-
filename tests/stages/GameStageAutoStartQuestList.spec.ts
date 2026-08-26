import { describe, expect, it, vi } from 'vitest';
import { GameStage } from '../../src/stages/GameStage.js';
import { UtilDlgType } from '../../src/ui/game/UtilDlgEx.js';

// Text.width measurement needs a canvas 2D context; provide the minimal shim.
function installCanvasShim(): void {
  if ((globalThis as any).__mapleclaudeCanvasShim) return;
  (globalThis as any).__mapleclaudeCanvasShim = true;
  class Fake2DContext {
    measureText(text: string) { return { width: String(text).length * 8 }; }
    fillText() {} strokeText() {} clearRect() {} fillRect() {}
  }
  class FakeOffscreenCanvas {
    width = 0; height = 0;
    private _ctx: any;
    getContext() { if (!this._ctx) this._ctx = new Fake2DContext(); return this._ctx; }
  }
  (globalThis as any).CanvasRenderingContext2D = Fake2DContext;
  (globalThis as any).OffscreenCanvas = FakeOffscreenCanvas;
  (globalThis as any).document = {
    createElement(tag: string) { return tag === 'canvas' ? new FakeOffscreenCanvas() as any : {}; },
  };
}
installCanvasShim();

// OG: CUserLocal::HandleLButtonClk @0x933920 → ShowAutoStartQuestList
// @0x90FEF0 — left-clicking your own character pops the grouped quest list.
function makeStage(): any {
  const stage: any = Object.create(GameStage.prototype);
  const sent: any[] = [];
  const quests = new Map<any, any>([
    // Available: level-10+ quest and a no-demand quest.
    [1000, { Id: 1000, Name: 'Available A', Start: { Npc: 2100, LvMin: 10, LvMax: 0 }, Complete: { Items: [], Mobs: [] } }],
    [1100, { Id: 1100, Name: 'Available B', Start: { Npc: 2200, LvMin: 0, LvMax: 0 }, Complete: { Items: [], Mobs: [] } }],
    // Level-gated out.
    [1200, { Id: 1200, Name: 'Too High', Start: { Npc: 2300, LvMin: 50, LvMax: 0 }, Complete: { Items: [], Mobs: [] } }],
    // In progress, completion demands met (2 x mob 8888).
    [3000, { Id: 3000, Name: 'Completable', Start: { Npc: 2400, LvMin: 0, LvMax: 0 }, Complete: { Items: [], Mobs: [{ id: 8888, count: 2 }] } }],
    // In progress, demands NOT met.
    [3100, { Id: 3100, Name: 'In Progress', Start: { Npc: 2500, LvMin: 0, LvMax: 0 }, Complete: { Items: [], Mobs: [{ id: 9999, count: 5 }] } }],
  ]);
  stage.game = {
    session: { send: (p: any) => sent.push(p) },
    frameToCanvas: (x: number, y: number) => ({ x, y }),
    nameService: { QuestName: () => undefined },
    questInfoService: { Get: (id: number) => quests.get(id) ?? null, All: () => quests },
  };
  stage.uiRoot = { addChild: vi.fn() };
  stage._panels = [];
  stage._quizModal = null;
  stage._fadeYesNo = null;
  stage._quitOverlay = null;
  stage._gameMenu = null;
  stage._keyConfig = null;
  stage._frameMuteButton = null;
  stage._dragController = { isDragging: false, endDrag: vi.fn(), payload: null };
  stage._contextMenu = null;
  stage._chatBar = null;
  stage._camera = { ScreenToWorld: (x: number, y: number) => ({ x, y }) };
  stage._npcs = [];
  stage._otherChars = new Map();
  stage._mobs = new Map();
  stage._drops = [];
  stage._physics = null;
  stage._pendingBridle = null;
  stage._player = { Position: { x: 400, y: 300 }, charName: 'Me' };
  stage._stats = { level: 10 };
  stage._item = { countItem: () => 0 };
  stage._questRecords = [
    { questId: 3000, state: 1 },
    { questId: 3100, state: 1 },
  ];
  stage._questRecordValues = new Map<number, string>([[3000, '002']]);
  stage._utilDlg = {
    isVisible: false,
    SetUtilDlgEx: vi.fn(),
    AddDotLine: vi.fn(),
    SetUtilDlgEx_LIST: vi.fn(),
    show: vi.fn(),
    GetSelect: vi.fn(() => -1),
    onResult: null as unknown as (r: any) => void,
  };
  (stage as any).__sent = sent;
  return stage;
}

describe('GameStage self-click auto-start quest list (OG HandleLButtonClk/ShowAutoStartQuestList)', () => {
  it('left click on own character opens the OG LIST dialog (SP4211 base + banners + 9010023)', () => {
    const stage = makeStage();
    stage.onMouseButton(400, 270, true, 0);
    expect(stage._utilDlg.SetUtilDlgEx).not.toHaveBeenCalled(); // fires on UP like OG click
    stage.onMouseButton(400, 270, false, 0);

    const call = stage._utilDlg.SetUtilDlgEx.mock.calls[0];
    expect(call[0]).toBe(UtilDlgType.LIST);
    expect(call[1]).toBe(9010023); // OG GetNpcTemplate immediate 0x897B67
    const text = call[4] as string;
    expect(text.startsWith('Someone in MapleStory would like to send you a message.')).toBe(true);
    expect(text).toContain('#fUI/UIWindow2.img/UtilDlgEx/list3#\r\n'); // pre-complete banner
    expect(text).toContain('#fUI/UIWindow2.img/UtilDlgEx/list1#\r\n'); // available banner
    expect(text).toContain('#fUI/UIWindow2.img/UtilDlgEx/list0#\r\n'); // in-progress banner
    expect(text).toContain('#d#L0# Completable (Pre-completion enabled)#l#k');
    expect(text).toContain('#d#L1# Available A#l#k');
    expect(text).toContain('#d#L2# Available B#l#k');
    // OG's pre-complete and perform lists are INDEPENDENT — a completable
    // quest appears in BOTH groups.
    expect(text).toContain('#d#L3# Completable (In Progress)#l#k');
    expect(text).toContain('#d#L4# In Progress (In Progress)#l#k');
    expect(text).not.toContain('Too High'); // level-gated out of available
    expect(stage._utilDlg.SetUtilDlgEx_LIST).toHaveBeenCalledWith(true);
    expect(stage._utilDlg.show).toHaveBeenCalled();
  });

  it('rows are numbered pre-complete → available → in-progress in one running index', () => {
    const stage = makeStage();
    stage.onMouseButton(400, 270, false, 0);
    const text = stage._utilDlg.SetUtilDlgEx.mock.calls[0][4] as string;
    expect(text).toContain('#L0#');
    expect(text.indexOf('#L1# Available A')).toBeGreaterThan(text.indexOf('#L0# Completable'));
    expect(text.indexOf('#L2# Available B')).toBeGreaterThan(text.indexOf('#L1# Available A'));
    expect(text.indexOf('#L4# In Progress')).toBeGreaterThan(text.indexOf('#L3# Completable'));
    expect(text).not.toContain('#L5#');
  });

  it('any picked row sends StartQuest via UserQuestRequest Accept (OG StartQuest)', () => {
    const stage = makeStage();
    stage.onMouseButton(400, 270, false, 0);
    stage._utilDlg.GetSelect.mockReturnValue(1); // Available A
    stage._utilDlg.onResult({ type: 'ok' });
    let sent = (stage as any).__sent;
    expect(sent).toHaveLength(1);
    expect(sent[0].header).toBe(119); // InHeader.UserQuestRequest

    // OG fires StartQuest for EVERY selection (server rejects invalid ones).
    stage.onMouseButton(400, 270, false, 0);
    stage._utilDlg.GetSelect.mockReturnValue(0); // completable (also in perform group)
    stage._utilDlg.onResult({ type: 'ok' });
    sent = (stage as any).__sent;
    expect(sent).toHaveLength(2);
  });

  it('does not clobber an already-open NPC dialog', () => {
    const stage = makeStage();
    stage._utilDlg.isVisible = true;
    stage.onMouseButton(400, 270, false, 0);
    expect(stage._utilDlg.SetUtilDlgEx).not.toHaveBeenCalled();
  });
});
