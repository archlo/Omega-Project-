import { describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { WzPackage } from '../../src/wz/WzPackage.js';
import { GameStage } from '../../src/stages/GameStage.js';
import { QuestInfoService } from '../../src/character/QuestInfoService.js';
import { QuestData } from '../../src/character/QuestInfoService.js';
import { NPC_QUEST_STATE } from '../../src/character/NpcLook.js';

const nxDir = process.env.MAPLECLAUDE_NX_DIR ?? 'wz_client';

// OG CNpc::SetQuestList classification: with an empty quest log and a level
// above every demand, NPCs that start quests must show the PreStart "!" mark.
describe.skipIf(!existsSync(join(nxDir, 'Quest.nx')))('GameStage NPC quest state (real Quest.nx)', () => {
  it('classifies Pio (10000) as PreStart and uninvolved NPCs as None', () => {
    const questWz = WzPackage.Open(join(nxDir, 'Quest.nx'));
    const svc = new QuestInfoService(() => questWz);

    const stage: any = Object.create(GameStage.prototype);
    stage.game = { questInfoService: svc };
    stage._stats = { level: 30, jobId: 0 };
    stage._questRecords = [];
    stage._item = null;

    // Pio starts quests 1008/1020 — no records yet → available ("!").
    expect(stage._npcQuestStateOf(10000)).toBe(NPC_QUEST_STATE.PreStart);
    // An NPC with no quest bindings stays None.
    expect(stage._npcQuestStateOf(9999999)).toBe(NPC_QUEST_STATE.None);
  });

  it('splits in-progress quests into Perform vs PreComplete by completion demand', () => {
    const stage: any = Object.create(GameStage.prototype);
    // Synthetic quests bound to NPC 700: completable vs not-yet-completable.
    const makeQ = (id: number, completeNpc: number) => {
      const q = new QuestData();
      q.Id = id;
      q.Start.Npc = 700;
      q.Complete.Npc = completeNpc;
      return q;
    };
    stage.game = {
      questInfoService: {
        ForNpc: (_npc: number) => [
          { questId: 5001, isStart: false },
          { questId: 5002, isStart: false },
        ],
        Get: (id: number) => (id === 5001 ? makeQ(5001, 700) : makeQ(5002, 999)),
      },
    };
    stage._stats = { level: 30, jobId: 0 };
    stage._questRecords = [
      { questId: 5001, state: 1 },
      { questId: 5002, state: 1 },
    ];
    stage._item = null;

    // 5002 cannot be completed (wrong completion NPC) — PreComplete outranks
    // the Perform mark on 5001 per the OG priority order.
    expect(stage._npcQuestStateOf(700)).toBe(NPC_QUEST_STATE.PreComplete);

    // With only the completable quest in progress → Perform mark.
    stage._questRecords = [{ questId: 5001, state: 1 }];
    stage.game.questInfoService.ForNpc = (_npc: number) => [{ questId: 5001, isStart: false }];
    expect(stage._npcQuestStateOf(700)).toBe(NPC_QUEST_STATE.Perform);
  });
});
