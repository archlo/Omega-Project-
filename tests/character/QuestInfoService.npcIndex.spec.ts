import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { WzPackage } from '../../src/wz/WzPackage.js';
import { QuestInfoService } from '../../src/character/QuestInfoService.js';

const nxDir = process.env.MAPLECLAUDE_NX_DIR ?? 'wz_client';
const questPath = join(nxDir, 'Quest.nx');

describe.skipIf(!existsSync(questPath))('NPC quest-mark data probe (real Quest.nx)', () => {
  it('indexes quests by their start NPC so marks can trigger', () => {
    const questWz = WzPackage.Open(questPath);
    const svc = new QuestInfoService(() => questWz);
    // Quest 1020 ("Pio and the Recycling") starts at NPC 10000 in v95 Check.img;
    // quest 1008 also starts there.
    const pio = svc.ForNpc(10000);
    expect(pio.some(e => e.questId === 1020 && e.isStart),
      'quest 1020 start not indexed under NPC 10000').toBe(true);
    expect(pio.some(e => e.questId === 1020 && !e.isStart),
      'quest 1020 completion NPC not indexed').toBe(true);
    expect(pio.some(e => e.questId === 1008 && e.isStart),
      'quest 1008 start not indexed under NPC 10000').toBe(true);
  });
});
