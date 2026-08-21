import { describe, expect, it } from 'vitest';
import { GameStage } from '../../src/stages/GameStage.js';
import { NPC_QUEST_STATE } from '../../src/character/NpcLook.js';
import { QuestData } from '../../src/character/QuestInfoService.js';

const NPC = 9000000;

function makeQuest(id: number, opts: {
  startLvMin?: number; completeItems?: { id: number; count: number }[];
  repeat?: number;
} = {}): QuestData {
  const qd = new QuestData();
  qd.Id = id;
  qd.Start.Npc = NPC;
  qd.Start.LvMin = opts.startLvMin ?? 0;
  qd.Complete.Npc = NPC;
  qd.Complete.Items = opts.completeItems ?? [];
  qd.RepeatInterval = opts.repeat ?? 0;
  return qd;
}

function makeStage(quests: QuestData[], records: { questId: number; state: number }[], level = 10, counts: Record<number, number> = {}): any {
  const stage: any = Object.create(GameStage.prototype);
  stage._stats = { level, jobId: 0 };
  stage._questRecords = records;
  stage._item = { countItem: (id: number) => counts[id] ?? 0 };
  const map = new Map(quests.map(q => [q.Id, q]));
  stage.game = {
    questInfoService: {
      ForNpc: () => quests.map(q => ({ questId: q.Id, isStart: true })),
      Get: (id: number) => map.get(id) ?? null,
    },
  };
  return stage;
}

// OG CNpc::SetQuestList @0x671980 classification with priority
// PreComplete(2) > PreStart(0) > Perform(1) > NearStart(3), else None(6).
describe('GameStage NPC quest-mark state machine (_npcQuestStateOf)', () => {
  it('available quest (no record) meeting demands shows the pre-start mark', () => {
    const stage = makeStage([makeQuest(20000)], [], 10);
    expect(stage._npcQuestStateOf(NPC)).toBe(NPC_QUEST_STATE.PreStart);
  });

  it('in-progress quest with completion items met shows perform; unmet shows pre-complete', () => {
    const item = { id: 4000000, count: 10 };
    const done = makeStage([makeQuest(20001, { completeItems: [item] })], [{ questId: 20001, state: 1 }], 10, { 4000000: 10 });
    expect(done._npcQuestStateOf(NPC)).toBe(NPC_QUEST_STATE.Perform);

    const short = makeStage([makeQuest(20001, { completeItems: [item] })], [{ questId: 20001, state: 1 }], 10, { 4000000: 9 });
    expect(short._npcQuestStateOf(NPC)).toBe(NPC_QUEST_STATE.PreComplete);
  });

  it('completed quest is only repeatable without a repeat-interval gate', () => {
    const gated = makeStage([makeQuest(20002, { repeat: 604800 })], [{ questId: 20002, state: 0 }]);
    expect(gated._npcQuestStateOf(NPC)).toBe(NPC_QUEST_STATE.None);

    const instant = makeStage([makeQuest(20002)], [{ questId: 20002, state: 0 }]);
    expect(instant._npcQuestStateOf(NPC)).toBe(NPC_QUEST_STATE.PreStart);
  });

  it('level below LvMin relaxes by at most 10 for the near-start mark', () => {
    // LvMin 20: char 15 -> near-start; char 5 -> none
    const near = makeStage([makeQuest(20003, { startLvMin: 20 })], [], 15);
    expect(near._npcQuestStateOf(NPC)).toBe(NPC_QUEST_STATE.NearStart);

    const far = makeStage([makeQuest(20003, { startLvMin: 20 })], [], 5);
    expect(far._npcQuestStateOf(NPC)).toBe(NPC_QUEST_STATE.None);

    // exact threshold met -> plain pre-start, not near-start
    const ok = makeStage([makeQuest(20003, { startLvMin: 20 })], [], 20);
    expect(ok._npcQuestStateOf(NPC)).toBe(NPC_QUEST_STATE.PreStart);
  });

  it('party quests (1200-1467) never produce a mark', () => {
    const pq = makeQuest(1300);
    pq.Start.LvMin = 0;
    const stage = makeStage([pq], []);
    expect(stage._npcQuestStateOf(NPC)).toBe(NPC_QUEST_STATE.None);
  });

  it('pre-complete outranks pre-start across multiple quests on one NPC', () => {
    const inProgressShort = makeQuest(20004, { completeItems: [{ id: 4000001, count: 1 }] });
    const available = makeQuest(20005);
    const stage = makeStage(
      [inProgressShort, available],
      [{ questId: 20004, state: 1 }],
      10,
    );
    expect(stage._npcQuestStateOf(NPC)).toBe(NPC_QUEST_STATE.PreComplete);
  });

  it('precede-quest demand gates the mark (state 2 requires completed record)', () => {
    const chained = makeQuest(20006);
    chained.Start.Quests = [{ id: 20005, state: 2 }];
    const blocked = makeStage([chained], [], 10);
    expect(blocked._npcQuestStateOf(NPC)).toBe(NPC_QUEST_STATE.None);

    const unlocked = makeStage([chained], [{ questId: 20005, state: 0 }]);
    expect(unlocked._npcQuestStateOf(NPC)).toBe(NPC_QUEST_STATE.PreStart);
  });

  it('_refreshNpcQuestMarks pushes the computed state into every npc', () => {
    const stage = makeStage([makeQuest(20007)], [], 10);
    const calls: Array<[number, number]> = [];
    stage._npcs = [
      { NpcId: NPC, SetQuestList: (s: number) => calls.push([NPC, s]) },
      { NpcId: 9999998, SetQuestList: (s: number) => calls.push([9999998, s]) },
    ];
    stage._refreshNpcQuestMarks();
    expect(calls).toEqual([
      [NPC, NPC_QUEST_STATE.PreStart],
      [9999998, NPC_QUEST_STATE.None], // no quests bound to this NPC
    ]);
  });
});
