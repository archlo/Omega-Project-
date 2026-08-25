import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { WzPackage } from '../../src/wz/WzPackage.js';
import { QuestInfoService } from '../../src/character/QuestInfoService.js';

const nxDir = process.env.MAPLECLAUDE_NX_DIR ?? 'wz_client';
const questPath = join(nxDir, 'Quest.nx');
const etcPath = join(nxDir, 'Etc.nx');

describe.skipIf(!existsSync(questPath) || !existsSync(etcPath))('QuestInfoService OG category model (real WZ)', () => {
  it('GetQuestCategory returns the quest "area" field (OG m_mQuestCategory)', () => {
    const questWz = WzPackage.Open(questPath);
    const svc = new QuestInfoService(() => questWz);
    // Quest 1000 (Sera's Mirror) carries area=20 in v95 QuestInfo.img.
    expect(svc.GetQuestCategory(1000)).toBe(20);
    // Medal quests live in area 51 — OG IsMedalQuest is category==51.
    const medal = [...svc.All().values()].filter((q) => q.Area === 51);
    expect(medal.length).toBeGreaterThan(50);
    expect(svc.IsMedalQuest(medal[0].Id)).toBe(true);
    expect(svc.IsMedalQuest(1000)).toBe(false);
  });

  it('loads category names from Etc.wz/QuestCategory.img', () => {
    const questWz = WzPackage.Open(questPath);
    const etcWz = WzPackage.Open(etcPath);
    const svc = new QuestInfoService(() => questWz, () => etcWz);
    expect(svc.GetQuestCategoryName(20)).toBe('Maple Island');
    expect(svc.GetQuestCategoryName(30)).toBe('Victoria Island');
    expect(svc.GetQuestCategoryName(51)).not.toBe('');
    expect(svc.GetQuestCategoryName(9999)).toBe('');
  });

  it('parses the sortkey field used by the QICompareFunc sort', () => {
    const questWz = WzPackage.Open(questPath);
    const svc = new QuestInfoService(() => questWz);
    let withKey = 0;
    for (const q of svc.All().values()) if (q.SortKey !== 0) withKey++;
    // Only a subset of v95 quests carry "sortkey" (~34 in this WZ set).
    expect(withKey).toBeGreaterThan(0);
  });
});
