import { describe, expect, it } from 'vitest';
import { CashShopStage } from '../../src/stages/CashShopStage.js';

function makeStageWithCommodities(items: { sn: number; itemId?: number; price?: number; onSale?: boolean }[]) {
  const stage = new CashShopStage(null) as any;
  const mockFieldHandlers = { onSetCashShop: null as any };
  const mockGame = {
    fieldHandlers: mockFieldHandlers,
    cashShopHandlers: { clear: () => {} },
  };
  stage._wireHandlers(mockGame);
  mockFieldHandlers.onSetCashShop({
    best: new Uint8Array(0x438),
    characterData: { characterStat: { characterId: 1, name: 'T', level: 100, job: 100 } },
    cashShopAuthorized: true,
    modifiedCommodities: items.map((it, i) => ({
      sn: it.sn,
      data: { itemId: it.itemId ?? 1702000, price: it.price ?? 100, onSale: it.onSale ?? true, gender: 0 },
    })),
    discountRates: [],
    notSaleSNs: [],
  });
  return stage;
}

describe('CashShop paging repro', () => {
  it('23 items in category 1 render across 3 pages', () => {
    (globalThis as any).window ??= {};
    const items = Array.from({ length: 23 }, (_, i) => ({ sn: 10100000 + i * 100000 }));
    const stage = makeStageWithCommodities(items);
    stage._clearDynamic = () => { stage._dynamicTexts = []; };
    stage.SetCategory(1);
    expect(stage._activeTab).toBe(1);

    const all = stage._getCurrentPageItems();
    expect(all.length).toBe(23);

    stage._page = 0;
    stage._drawItemGrid();
    let names = stage._dynamicTexts.filter((t: any) => typeof t.text === 'string' && /^\d+ NX$/.test(t.text));
    expect(names.length).toBe(10);

    stage._onPageDown?.();
    stage._page = 1;
    stage._clearDynamic();
    stage._g.clear();
    stage._drawItemGrid();
    names = stage._dynamicTexts.filter((t: any) => typeof t.text === 'string' && /^\d+ NX$/.test(t.text));
    expect(names.length).toBe(10);

    stage._page = 2;
    stage._clearDynamic();
    stage._g.clear();
    stage._drawItemGrid();
    names = stage._dynamicTexts.filter((t: any) => typeof t.text === 'string' && /^\d+ NX$/.test(t.text));
    expect(names.length).toBe(3);
  });

  it('SetCategory resets page to 0', () => {
    const items = Array.from({ length: 23 }, (_, i) => ({ sn: 10100000 + i * 100000 }));
    const stage = makeStageWithCommodities(items);
    stage.SetCategory(1);
    stage._page = 2;
    stage.SetCategory(1);
    expect(stage._page).toBe(0);
  });

  it('rowDead truncation: off-sale entry hides later same-row items (OG break)', () => {
    // 8-digit SNs: cat = sn/1e7%10, sub = sn/1e5%100
    const items = [
      { sn: 10100101 },                 // cat1 sub1
      { sn: 10100102, onSale: false },  // cat1 sub1 - kills the rest of the row
      { sn: 10100103 },                 // cat1 sub1
    ];
    const stage = makeStageWithCommodities(items);
    stage.SetCategory(1);
    const vis = stage._getCurrentPageItems();
    expect(vis.map((c: any) => c.sn)).toEqual([10100101]);
  });

  it('off-sale in another row does not affect this row', () => {
    const items = [
      { sn: 30100201, onSale: false },  // cat3 sub2 - dead row
      { sn: 30200301 },                 // cat3 sub20? -> floor(30200301/1e5)=302 %100=2... use explicit
    ];
    const stage = makeStageWithCommodities(items);
    stage.SetCategory(3);
    const vis = stage._getCurrentPageItems();
    expect(vis.map((c: any) => c.sn)).toEqual([30200301]);
  });

  // THE production bug: the server sends SET_CASH_SHOP opcode-only, so
  // onSetCashShop never fires and _modifiedCommodities stays empty. The grid
  // must still populate from the client-owned WZ Commodity table (OG
  // CWvsContext::LoadCommodity runs unconditionally at shop init).
  it('populates + pages from the WZ table when no SetCashShop payload arrives', () => {
    (globalThis as any).window ??= {};
    const stage = new CashShopStage(null) as any;
    stage._clearDynamic = () => { stage._dynamicTexts = []; };
    stage._commTable = {
      BySn: new Map([
        [10000001, { sn: 10000001, itemId: 1702000, price: 100, onSale: true }], // cat1 sub0
        [10000002, { sn: 10000002, itemId: 1702001, price: 100, onSale: true }], // cat1 sub0
      ]),
      // Real Category.img rows for category 1 (subs 0,1,2 all exist).
      Categories: [
        { category: 1, categorySub: 0, name: 'All' },
        { category: 1, categorySub: 1, name: 'Equip' },
        { category: 1, categorySub: 2, name: 'OneADay' },
      ],
      Get(sn) { return (this as any).BySn.get(sn); },
    };
    // No onSetCashShop call at all — exactly what happens with the current
    // opcode-only server packet.
    stage._rebuildCommodities();

    expect(stage._commodities.length).toBe(2);
    stage.SetCategory(1);
    expect(stage._getCurrentPageItems().length).toBe(2);
    stage._page = 0;
    stage._drawItemGrid();
    const names = stage._dynamicTexts.filter((t: any) => typeof t.text === 'string' && /^\d+ NX$/.test(t.text));
    expect(names.length).toBe(2);
  });

  // CCSWnd_Tab::Draw @0x4C68A0 canvas map: cat8/cat10 → canvas 1, cat9 →
  // canvas 9, else canvas cat+1 (_tabSprites[i] holds CSTab/Tab/(i+1)).
  it('tab bar blits the OG canvas for each active tab', () => {
    (globalThis as any).window ??= {};
    const stage = new CashShopStage(null) as any;
    stage._tabSprites = Array.from({ length: 9 }, (_, i) => ({ canvas: i + 1 }));
    const drawn: any[] = [];
    stage._drawWzSprite = (s: any) => drawn.push(s);
    const expectCanvas = (tab: number, canvas: number) => {
      stage._activeTab = tab;
      drawn.length = 0;
      stage._drawTabBar();
      expect(drawn[0]?.canvas).toBe(canvas);
    };
    expectCanvas(1, 2);
    expectCanvas(7, 8);
    expectCanvas(8, 1);
    expectCanvas(9, 9);
    expectCanvas(10, 1);
  });
});
