import { describe, expect, it } from 'vitest';
import { CashCommodityTable } from '../../src/domain/CashCommodityTable.js';
import { WzPackage } from '../../src/wz/WzPackage.js';

const nxDir = process.env.MAPLECLAUDE_NX_DIR;

describe('CashCommodityTable', () => {
  it('returns an empty table when Etc.wz is unavailable', async () => {
    const t = await CashCommodityTable.LoadAsync(null);
    expect(t.BySn.size).toBe(0);
    expect(t.Categories.length).toBe(0);
  });

  it.skipIf(!nxDir)('parses the real Commodity.img + Category.img', async () => {
    const etc = await WzPackage.OpenBaseAsync(nxDir!, 'Etc');
    const t = await CashCommodityTable.LoadAsync(etc);
    // OG: 12,318 commodity entries
    expect(t.BySn.size).toBeGreaterThan(12000);
    // OG: Category.img has 33 rows (Category 1..8 with subs)
    expect(t.Categories.length).toBe(33);
    // First row: Category 1 / Sub 0 / "New"
    expect(t.Categories[0]).toEqual({ category: 1, categorySub: 0, name: 'New' });
    // A known SN resolves with authentic fields
    const c = t.Get(10000100);
    expect(c).toBeDefined();
    expect(c!.itemId).toBe(1702026);
    expect(c!.price).toBe(3900);
    expect(c!.period).toBe(90);
    // GetCategoryIndex-style sub-row query
    expect(t.SubRows(2).map((r) => r.name)).toContain('Hat');
  });
});
