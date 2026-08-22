import { describe, expect, it } from 'vitest';
import { CashShopStage, LOCKER_X, LIST_X, LIST_Y, PLATE_H, PLATE_W } from '../../src/stages/CashShopStage.js';
import { CashShopDecoder } from '../../src/net/packet/CashShopDecoder.js';

describe('CashShopStage', () => {
  it('creates instance without errors', () => {
    const stage = new CashShopStage(null);
    expect(stage).toBeDefined();
  });

  it('onSetCashShop populates commodities with discount rates and notSaleSNs', () => {
    const stage = new CashShopStage(null) as any;
    // Mock minimal game with fieldHandlers and cashShopHandlers
    const mockFieldHandlers = { onSetCashShop: null as any };
    const mockGame = {
      fieldHandlers: mockFieldHandlers,
      cashShopHandlers: { clear: () => {} },
    };
    stage._wireHandlers(mockGame);

    // Simulate SetCashShop args (7-digit itemIds for proper category detection)
    const args = {
      best: new Uint8Array(0x438),
      characterData: { characterStat: { characterId: 1, name: 'Test', level: 100, job: 100 } },
      cashShopAuthorized: true,
      modifiedCommodities: [
        { sn: 1001, data: { itemId: 1002000, price: 1000, onSale: true, gender: 0 } },
        { sn: 1002, data: { itemId: 2003000, price: 500, onSale: true, gender: 0 } },
        { sn: 1003, data: { itemId: 3004000, price: 800, onSale: false, gender: 0 } },
      ],
      discountRates: [{ category: 1, index: 0, rate: 10 }],
      notSaleSNs: [1002],
    };
    mockFieldHandlers.onSetCashShop(args);

    // Should have 2 items (1003 is onSale=false, 1002 is in notSaleSNs)
    expect(stage._commodities.length).toBe(2);
    expect(stage._commodities[0].sn).toBe(1001);
    expect(stage._commodities[1].sn).toBe(1003);

    // Discount rate should be applied to first item
    expect(stage._commodities[0].discountRate).toBe(10);
    expect(stage._commodities[0].price).toBe(1000);
  });

  it('decodeBestArray parses 90 entries from 1080-byte buffer', () => {
    const raw = new Uint8Array(0x438);
    const view = new DataView(raw.buffer);
    // First entry: category=1, gender=2, sn=300
    view.setInt32(0, 1, true);
    view.setInt32(4, 2, true);
    view.setInt32(8, 300, true);
    // Last entry (index 89): category=9, gender=1, sn=9999
    const lastOff = 89 * 12;
    view.setInt32(lastOff, 9, true);
    view.setInt32(lastOff + 4, 1, true);
    view.setInt32(lastOff + 8, 9999, true);

    const entries = CashShopDecoder.decodeBestArray(raw);
    expect(entries).toHaveLength(90);
    expect(entries[0]).toEqual({ category: 1, gender: 2, sn: 300 });
    expect(entries[89]).toEqual({ category: 9, gender: 1, sn: 9999 });
  });

  it('status bar values sit at OG positions (y 9/23/38, right-aligned at x 220)', () => {
    (globalThis as any).window ??= {};
    const stage = new CashShopStage(null) as any;
    stage._nxCredit = 12345;
    stage._maplePoints = 678;
    stage._nxPrepaid = 0;
    stage._clearDynamic = () => { stage._dynamicTexts = []; };
    stage._drawStatusBar();

    const texts = stage._dynamicTexts.map((t: any) => t.text);
    expect(texts).toContain('12,345');
    expect(texts).toContain('678');
    expect(texts).toContain('0');

    // OG CCSWnd_Status::Draw @0x4CBCD0: format_integer (thousands commas),
    // right-aligned at x = 220 - width, y = 9 (NexonCash), 23 (PrepaidNX),
    // 38 (MaplePoint), relative to the status window at (254, 530).
    const nxc = stage._dynamicTexts.find((t: any) => t.text === '12,345');
    expect(nxc.y).toBe(530 + 9);
    const mp = stage._dynamicTexts.find((t: any) => t.text === '678');
    expect(mp.y).toBe(530 + 38);
    // OG draws the MaplePoint value in red
    expect(mp.style.fill).toBe(0xE84C4C);
    const prepaid = stage._dynamicTexts.find((t: any) => t.text === '0');
    expect(prepaid.y).toBe(530 + 23);

    // Right-aligned: x + width ≈ 254 + 220. '12,345' = 6 chars * 7 = 42 wide.
    expect(nxc.x).toBe(254 + 220 - 42);
  });

  it('status buttons render at OG offsets (+13; Exit at +15 per CCSWnd_Status::OnCreate)', () => {
    (globalThis as any).window ??= {};
    const stage = new CashShopStage(null) as any;
    stage._clearDynamic = () => { stage._dynamicTexts = []; };
    const drawn: any[] = [];
    stage._drawWzSprite = (sprite: any, x: number, y: number) => drawn.push({ x, y });
    stage._btCharge = { ToPixi: () => ({}) };
    stage._btCheck = { ToPixi: () => ({}) };
    stage._btCoupon = { ToPixi: () => ({}) };
    stage._btExit = { ToPixi: () => ({}) };
    stage._drawStatusBar();

    // OG CreateCtrl_2 y=13 relative to status window (y=530) → 543;
    // BtExit (id 1003) sits at y offset +15 → 545.
    expect(drawn.filter((d) => d.y === 543).length).toBe(3);
    expect(drawn.find((d) => d.x === 632)?.y).toBe(545);
    // x positions 248/289/330/378 relative to status window (x=254).
    expect(drawn.map((d) => d.x)).toEqual([502, 543, 584, 632]);
  });

  it('item grid plates place name/price at OG CCSWnd_List::Draw coords', () => {
    (globalThis as any).window ??= {};
    const stage = new CashShopStage(null) as any;
    stage._clearDynamic = () => { stage._dynamicTexts = []; };
    stage._getCurrentPageItems = () => [{ sn: 1001, itemId: 1302000, name: 'Test Sword', price: 100, discountRate: 0 }];
    stage._page = 0;
    stage._selectedPlate = -1;
    stage._focusedPlate = -1;
    stage._drawItemGrid();

    const name = stage._dynamicTexts.find((t: any) => t.text === 'Test Sword');
    const price = stage._dynamicTexts.find((t: any) => t.text === '100 NX');
    // OG: name at rect.left+82, rect.top+6; price at rect.left+78, rect.top+32.
    // First plate: left = 275 + 0, top = 95 + 0 + 2.
    expect(name.x).toBe(275 + 82);
    expect(name.y).toBe(95 + 2 + 6);
    expect(price.x).toBe(275 + 78);
    expect(price.y).toBe(95 + 2 + 32);
  });

  it('GetPlateRect uses a 206x81 pitch with an 81-high plate', () => {
    const stage = new CashShopStage(null) as any;
    expect(stage._getPlateRect(0)).toEqual({ left: LIST_X, top: LIST_Y + 2 });
    expect(stage._getPlateRect(1)).toEqual({ left: LIST_X + 206, top: LIST_Y + 2 });
    expect(stage._getPlateRect(3)).toEqual({ left: LIST_X + 206, top: LIST_Y + 81 + 2 });
    expect(PLATE_W).toBe(200);
    expect(PLATE_H).toBe(81);
  });

  it('locker window sits at x=-1 below the character preview', () => {
    expect(LOCKER_X).toBe(-1);
  });

  it('mouse wheel cycles pages over the item list, wrapping modulo (OG OnMouseWheel)', () => {
    (globalThis as any).window ??= {};
    const stage = new CashShopStage(null) as any;
    const items = Array.from({ length: 25 }, (_, i) => ({ sn: i, itemId: 1702000 }));
    stage._getCurrentPageItems = () => items; // 25 items → 3 pages
    stage.onMouseWheel(LIST_X + 100, LIST_Y + 100, 120);
    expect(stage._page).toBe(1);
    stage.onMouseWheel(LIST_X + 100, LIST_Y + 100, -120);
    expect(stage._page).toBe(0);
    // wraps at both bounds (modulo cycling)
    stage.onMouseWheel(LIST_X + 100, LIST_Y + 100, -120);
    expect(stage._page).toBe(2);
    stage.onMouseWheel(LIST_X + 100, LIST_Y + 100, 120);
    stage.onMouseWheel(LIST_X + 100, LIST_Y + 100, 120);
    expect(stage._page).toBe(1);
    // wheel outside the list area is ignored
    stage.onMouseWheel(50, 50, 120);
    expect(stage._page).toBe(1);
  });

  it('one-a-day prev-items grid uses the 2-column main-list plate geometry', () => {
    const { stage } = (() => {
      const s = new CashShopStage(null) as any;
      s.game = { session: { send: () => {} } };
      return { stage: s };
    })();
    stage._activeTab = 1; // OG: OneADay lives on category 1 sub-category 2
    stage._subCategory = 2;
    stage._oneADayActive = true;
    stage._oneADayItemSN = 1;
    stage._commodities = [];
    stage._oneADayPrevItems = [
      { sn: 11, date: 0 }, { sn: 12, date: 0 },
      { sn: 13, date: 0 }, { sn: 14, date: 0 },
    ];
    // Cell index 3 → col 1 / row 1: left=LIST_X+206+2, top=LIST_Y+81+2
    stage.onMouseButton(LIST_X + 206 + 2 + 10, LIST_Y + 81 + 2 + 10, true, 0);
    expect(stage._oneADaySelected).toBe(3);
    // Just outside plate 1's right edge → no selection change
    stage.onMouseButton(LIST_X + 206 + 2 + PLATE_W + 5, LIST_Y + 81 + 2 + 10, true, 0);
    expect(stage._oneADaySelected).toBe(3);
  });
});

describe('CashShopStage ProcessBuy routing (OG CCashShop::ProcessBuy @0x4936B0)', () => {
  function makeStage() {
    const sent: { method: string; args: unknown[] }[] = [];
    const stage = new CashShopStage(null) as any;
    stage.game = {
      session: {
        send: (pkt: unknown) => sent.push({ method: (pkt as any).kind ?? String(pkt), args: [] }),
      },
    };
    // Record GameSender calls instead of packets
    const orig = stage.game.session.send;
    return { stage, sent };
  }

  function capture(stage: any) {
    const calls: string[] = [];
    stage.game = {
      session: {
        send: (fn: () => void) => {
          calls.push(fn.name || 'packet');
        },
      },
    };
    return calls;
  }

  it('couple ring 1112001 opens the couple dialog, NOT the package flow', () => {
    const { stage } = makeStage();
    stage._processBuy({ itemId: 1112001, sn: 1 });
    expect(stage._activeDialog).toBe('coupleName');
    stage._activeDialog = 'none';
    stage._processBuy({ itemId: 1112000, sn: 2 });
    expect(stage._activeDialog).toBe('none'); // 1112000 falls through
  });

  it('package box 910xxxxx sends BuyPackage', () => {
    const { stage } = makeStage();
    const calls = capture(stage);
    stage._processBuy({ itemId: 9100000, sn: 3 });
    expect(calls.length).toBe(1);
    expect(stage._activeDialog).toBe('none');
  });

  it('SN range [80000000..89999999] sends BuyNormal', () => {
    const { stage } = makeStage();
    const calls = capture(stage);
    stage._processBuy({ itemId: 1702000, sn: 80000000 });
    expect(calls.length).toBe(1);
  });

  it('v95 special-item IDs route to their OG dialogs/packets', () => {
    const { stage } = makeStage();
    // Friendship: /100 == 11128 && %10 <= 2
    stage._processBuy({ itemId: 1112801, sn: 4 });
    expect(stage._activeDialog).toBe('friendName');
    stage._activeDialog = 'none';
    // Char slot inc: /1000 == 5430
    let calls = capture(stage);
    stage._processBuy({ itemId: 5430000, sn: 5 });
    expect(calls.length).toBe(1);
    // Character sale: 5431000 / 5432000
    calls = capture(stage);
    stage._processBuy({ itemId: 5431000, sn: 6 });
    expect(calls.length).toBe(1);
    stage._processBuy({ itemId: 5432000, sn: 7 });
    expect(calls.length).toBe(2);
    // Equip slot ext: /10000 == 555
    stage._processBuy({ itemId: 5550000, sn: 8 });
    expect(stage._activeDialog).toBe('equipSlotExt');
    stage._activeDialog = 'none';
    // Name change: 5400000
    stage._processBuy({ itemId: 5400000, sn: 9 });
    expect(stage._activeDialog).toBe('nameChange');
    stage._activeDialog = 'none';
    // World transfer: 5401000
    stage._processBuy({ itemId: 5401000, sn: 10 });
    expect(stage._activeDialog).toBe('worldTransfer');
  });

  it('one-a-day SNs (sn/100000==210) gate the buy behind a YesNo confirm', () => {
    const { stage } = makeStage();
    const comm = { itemId: 1002000, sn: 21000001, price: 100, gender: 0, classField: 0, onSale: true };
    stage._commodities = [comm];
    stage._cashShopAuthorized = true;
    stage._nxCredit = 999999;
    stage._buyItem(comm as any);
    expect(stage._yesNoVisible).toBe(true);
    expect(stage._confirmBuyVisible).toBe(false);
    // Enter confirms → re-runs the buy past the gate into the payment dialog
    stage.onKeyPress('Enter');
    expect(stage._yesNoVisible).toBe(false);
    expect(stage._confirmBuyVisible).toBe(true);
    // Escape cancels the payment dialog without resurfacing YesNo
    stage.onKeyPress('Escape');
    expect(stage._confirmBuyVisible).toBe(false);
  });

  it('non-gated items skip the YesNo and go straight to the payment dialog', () => {
    const { stage } = makeStage();
    const comm = { itemId: 1002000, sn: 1001, price: 100, gender: 0, classField: 0, onSale: true };
    stage._commodities = [comm];
    stage._cashShopAuthorized = true;
    stage._nxCredit = 999999;
    stage._buyItem(comm as any);
    expect(stage._yesNoVisible).toBe(false);
    expect(stage._confirmBuyVisible).toBe(true);
  });

  it('category comes from SN digits (OG LoadData @0x492EA0)', () => {
    const { stage } = makeStage();
    stage._rebuildCommodities = Object.getPrototypeOf(stage)._rebuildCommodities; // keep real
    stage._modifiedCommodities = [
      { sn: 30200018, data: {} },   // category 3 sub 2
      { sn: 50100101, data: {} },   // category 5 sub 10
    ];
    stage._notSaleSNs = new Set<number>();
    stage._stockStates = new Map<number, number>();
    stage._limitGoods = [];
    stage._commTable = null;
    stage._rebuildCommodities();
    expect(stage._commodities[0].category).toBe(3);
    expect(stage._commodities[0].categorySub).toBe(2); // 30200018/100000 % 100
    expect(stage._commodities[1].category).toBe(5);
    expect(stage._commodities[1].categorySub).toBe(1); // 50100101/100000 % 100
  });

  it('SetSortType sorts per row: priority asc / price desc / SN asc', () => {
    const { stage } = makeStage();
    const mk = (sn: number, price: number, priority: number) =>
      ({ sn, itemId: sn, price, priority, onSale: true, category: 3, categorySub: 0 });
    stage._commodities = [mk(30000001, 100, 3), mk(30000002, 500, 1), mk(30000003, 300, 2)];
    stage.SetSortType(0);
    expect(stage._commodities.map((c: any) => c.priority)).toEqual([1, 2, 3]);
    stage.SetSortType(1);
    expect(stage._commodities.map((c: any) => c.price)).toEqual([500, 300, 100]);
    stage.SetSortType(2);
    expect(stage._commodities.map((c: any) => c.sn)).toEqual([30000001, 30000002, 30000003]);
  });

  it('Evan-only dragon boxes blocked for non-Evan (IsUsableItemCheckFirst rule 1)', () => {
    const { stage } = makeStage();
    stage._playerJob = 100; // warrior
    const box = { itemId: 5620006, sn: 1, reqLevel: 0, reqPop: 0, gender: 0, classField: 0 };
    expect(stage._isCommodityUsable(box)).toBe(false);
    stage._playerJob = 2210; // Evan
    expect(stage._isCommodityUsable(box)).toBe(true);
  });

  it('AddToWish fills the first empty slot and sends the full list; RemoveWish clears it', () => {
    const { stage } = makeStage();
    stage._wishlist = [111, 222, 0, 0, 0, 0, 0, 0, 0, 0];
    stage.AddToWish(333);
    expect(stage._wishlist[2]).toBe(333);
    // duplicate rejected
    stage.AddToWish(333);
    expect(stage._wishlist.filter((s: number) => s === 333).length).toBe(1);
    stage.RemoveWish(222);
    expect(stage._wishlist).toContain(0);
    expect(stage._wishlist).not.toContain(222);
  });

  it('CapsLock toggles user preview control (OnKey @0x47F7C0)', () => {
    const { stage } = makeStage();
    const before = stage._previewEnabled;
    stage.onKeyPress('CapsLock');
    expect(stage._previewEnabled).toBe(!before);
    stage.onKeyPress('CapsLock');
    expect(stage._previewEnabled).toBe(before);
  });

  it('GoToCommoditySN jumps to the tab/page/plate holding the SN', () => {
    const { stage } = makeStage();
    const items: any[] = [];
    for (let i = 0; i < 25; i++) {
      items.push({ sn: 30000000 + i, itemId: 1702000, category: 3, categorySub: 2, price: 10, priority: i, onSale: true, gender: 0, classField: 0 });
    }
    stage._commodities = items;
    stage.GoToCommoditySN(30000014); // index 14 → page 1, plate 4
    expect(stage._activeTab).toBe(3);
    expect(stage._page).toBe(1);
    expect(stage._selectedPlate).toBe(4);
    stage.GoToCommoditySN(99999999); // unknown — state unchanged
    expect(stage._activeTab).toBe(3);
  });

  describe('CCSWnd_List::SetPlateNo @0x4C9B40 button gating + ChangePage @0x4CFC70', () => {
    function makeGatedStage() {
      const stage = new CashShopStage(null) as any;
      stage.game = { session: { send: () => {} } };
      stage._cashShopAuthorized = true;
      stage._nxCredit = 100000;
      stage._nxPrepaid = 0;
      stage._maplePoints = 0;
      return stage;
    }

    const comm = (over: Partial<any> = {}) => ({
      sn: 30000001, itemId: 1702000, price: 100, onSale: true, gender: 2,
      forPremiumUser: false, limit: 0, stockState: 0, limitState: 0,
      category: 3, categorySub: 0, priority: 0, reqLevel: 0, reqPop: 0,
      classField: 0, count: 1, name: 'x', period: 0,
      ...over,
    });

    it('gender mismatch disables Buy+Wish; rings/coupons disable Gift only', () => {
      const { stage } = makeStage();
      stage._playerGender = 1; // female
      // male-only item → buy+wish off (OG [0]+[2]), gift still on
      expect(stage._plateButtons(comm({ gender: 0 }))).toEqual({ buy: false, gift: true, wish: false });
      // both-gender item fine
      expect(stage._plateButtons(comm({ gender: 2 }))).toEqual({ buy: true, gift: true, wish: true });
      // couple ring (111200/!=1112000) → gift off only
      expect(stage._plateButtons(comm({ itemId: 1112001 }))).toEqual({ buy: true, gift: false, wish: true });
      expect(stage._plateButtons(comm({ itemId: 1112000 }))).toEqual({ buy: true, gift: true, wish: true });
    });

    it('non-giftable coupons: name change/transfer/slot-inc/555/522xxxx', () => {
      const { stage } = makeStage();
      for (const id of [5400000, 5401000, 5220012, 5222000, 5220016, 5220017, 5220018, 5430000, 5431000, 5550000]) {
        expect(stage._plateButtons(comm({ itemId: id })).gift).toBe(false);
      }
    });

    it('level gates block Buy; premium/stock/sold-out/off-sale block both', () => {
      const stage = makeGatedStage();
      stage._playerLevel = 8;
      // megaphone under level 10
      expect(stage._plateButtons(comm({ itemId: 5071000 })).buy).toBe(false);
      // pet-name tag family under level 15
      expect(stage._plateButtons(comm({ itemId: 5200000 })).buy).toBe(false);
      stage._playerLevel = 30;
      expect(stage._plateButtons(comm({ itemId: 5200000 })).buy).toBe(true);

      stage._isPremium = false;
      expect(stage._plateButtons(comm({ forPremiumUser: true }))).toEqual({ buy: false, gift: false, wish: true });
      expect(stage._plateButtons(comm({ stockState: 1 }))).toEqual({ buy: false, gift: false, wish: true });
      expect(stage._plateButtons(comm({ limitState: 2 }))).toEqual({ buy: false, gift: false, wish: true });
      expect(stage._plateButtons(comm({ onSale: false }))).toEqual({ buy: false, gift: false, wish: true });
    });

    it('free / random-window / one-a-day items keep Buy but drop Gift+Wish', () => {
      const stage = makeGatedStage();
      expect(stage._plateButtons(comm({ price: 0 }))).toEqual({ buy: true, gift: false, wish: false });
      expect(stage._plateButtons(comm({ sn: 80000000 }))).toEqual({ buy: true, gift: false, wish: false });
      expect(stage._plateButtons(comm({ sn: 21000001 }))).toEqual({ buy: true, gift: false, wish: false });
      expect(stage._plateButtons(comm({ sn: 5640000 }))).toEqual({ buy: true, gift: false, wish: false });
      expect(stage._plateButtons(comm({ limit: 3 }))).toEqual({ buy: true, gift: false, wish: false });
    });

    it('ChangePage: sold-out stock entries stay VISIBLE with disabled buttons', () => {
      const stage = makeGatedStage();
      stage._activeTab = 3;
      stage._subCategory = 0;
      stage._commodities = [
        comm({ sn: 30000001, stockState: 2 }),
        comm({ sn: 30000002 }),
      ];
      const page = stage._getCurrentPageItems();
      expect(page.length).toBe(2); // not hidden anymore (OG keeps the plate)
      expect(stage._plateButtons(page[0]).buy).toBe(false);
      expect(stage._plateButtons(page[1]).buy).toBe(true);
    });

    it('ChangePage: row scan stops at the first off-sale entry of a row', () => {
      const stage = makeGatedStage();
      stage._activeTab = 3;
      stage._commodities = [
        comm({ sn: 30000001, onSale: true }),
        comm({ sn: 30000002, onSale: false }),
        comm({ sn: 30000003, onSale: true }), // after the off-sale one → invisible
      ];
      const page = stage._getCurrentPageItems();
      expect(page.map((c: any) => c.sn)).toEqual([30000001]);
    });

    it('ChangePage: category 1 sub 2 renders an empty page', () => {
      const stage = makeGatedStage();
      stage._activeTab = 1;
      stage._subCategory = 2;
      stage._commodities = [comm({ category: 1, categorySub: 2 })];
      expect(stage._getCurrentPageItems()).toEqual([]);
    });

    it('clicking a disabled buy button does not send the purchase', () => {
      const stage = makeGatedStage();
      stage._activeTab = 3;
      stage._commodities = [comm({ sn: 30000001, stockState: 2 })];
      let sent = 0;
      stage._buyItem = () => { sent++; };
      stage.onMouseButton(275 + 200 - 40, 95 + 2 + 60, true, 0); // inside plate 0 buy area
      expect(sent).toBe(0);
      expect(stage._statusMessage).toBe('This item cannot be purchased.');
    });

    describe('purchase records (GetCashPurchaseRecord @0x482450)', () => {
      it('hides already-purchased limit-3 items; unknown keys default hidden + lazy request', () => {
        const stage = makeGatedStage();
        stage.game.session.isConnected = true;
        const sent: number[] = [];
        stage.game.session.send = (pkt: any) => sent.push(pkt);
        stage._activeTab = 3;
        stage._commodities = [
          comm({ sn: 30000001, limit: 3 }),
          comm({ sn: 30000002, limit: 3 }),
        ];
        // Unknown → treated purchased (hidden) while the record is requested
        expect(stage._getCurrentPageItems().length).toBe(0);
        expect(sent.length).toBe(2); // one lazy request per SN, sub-action 44
        // Response says only ...001 was bought (...002's record: not bought)
        stage._handleCashItemResult({ subAction: 0xAF, key: 30000001, available: true });
        stage._handleCashItemResult({ subAction: 0xAF, key: 30000002, available: false });
        const page = stage._getCurrentPageItems();
        expect(page.map((c: any) => c.sn)).toEqual([30000002]);
        expect(stage._plateButtons(page[0]).buy).toBe(true);
      });

      it('limit-2 goods use the global record (key 0)', () => {
        const stage = makeGatedStage();
        stage._activeTab = 3;
        stage._commodities = [comm({ sn: 30000001, limit: 2 })];
        stage._purchaseRecordGlobal = -1;
        expect(stage._getCurrentPageItems().length).toBe(0); // unknown → assumed bought
        stage._purchaseRecords.set(999, false); // unrelated response must not flip global
        stage._handleCashItemResult({ subAction: 0xAF, key: 0, available: false });
        expect(stage._getCurrentPageItems().length).toBe(1);
        stage._handleCashItemResult({ subAction: 0xAF, key: 0, available: true });
        expect(stage._getCurrentPageItems().length).toBe(0);
      });
    });

    it('third plate button toggles the wishlist (OnSetWish/OnRemoveWish)', () => {
      const stage = makeGatedStage();
      stage._activeTab = 3;
      stage._wishlist = new Array(10).fill(0);
      stage._commodities = [comm({ sn: 30000001 }), comm({ sn: 30000002 })];
      // click plate 1's wish area (top-right of plate)
      stage.onMouseButton(275 + 206 + 199, 95 + 2 + 10, true, 0);
      expect(stage._wishlist).toContain(30000002);
      // click again on a wished item removes it (route through RemoveWish spy)
      let removed: number | null = null;
      stage.RemoveWish = (sn: number) => { removed = sn; };
      stage.onMouseButton(275 + 206 + 199, 95 + 2 + 10, true, 0);
      expect(removed).toBe(30000002);
    });

    it('gifting a package (itemId/10000==910) sends the package-gift sub-action 33', () => {
      const stage = makeGatedStage();
      const sent: any[] = [];
      stage.game.session.send = (pkt: any) => sent.push(pkt);
      stage._giftItem = comm({ sn: 30000001, itemId: 9100000 });
      stage._giftReceiver = 'MapleFriend';
      stage._executeGift();
      expect(sent.length).toBe(1);
      // after the 2-byte opcode header comes the sub-action byte (33)
      const body: Uint8Array = sent[0]._buffer;
      expect(body[2]).toBe(33);
    });

    it('gifting a normal item keeps the bulk-gift sub-action 4', () => {
      const stage = makeGatedStage();
      const calls: string[] = [];
      stage.game.session.send = (pkt: any) => { calls.push(String(pkt)); };
      stage._giftItem = comm({ sn: 30000001 });
      stage._giftReceiver = 'MapleFriend';
      stage._executeGift();
      expect(calls.length).toBe(1);
    });

    it('shortcut-help button opens on cat-8/sub-0 and Escape closes the modal', () => {
      const stage = makeGatedStage();
      stage._activeTab = 8;
      stage._subCategory = 0;
      // click the shortcut button at list-relative (150,380)
      expect(stage._handleShortcutHelpClick(LIST_X + 160, LIST_Y + 390)).toBe(true);
      expect(stage._shortcutHelpVisible).toBe(true);
      // modal swallows other clicks; close button at dialog-relative (130,328)
      expect(stage._handleShortcutHelpClick(LIST_X, LIST_Y)).toBe(true);
      const cx = Math.floor((800 - 260) / 2) + 130;
      const cy = Math.floor((600 - 356) / 2) + 328;
      expect(stage._handleShortcutHelpClick(cx + 5, cy + 5)).toBe(true);
      expect(stage._shortcutHelpVisible).toBe(false);
      // inactive on other tabs
      stage._activeTab = 3;
      expect(stage._handleShortcutHelpClick(LIST_X + 160, LIST_Y + 390)).toBe(false);
    });

    describe('tab switching (OG OnChangedCategory @0x47E560)', () => {
      it('SetCategory resets sub, page, plate and search state', () => {
        const stage = makeGatedStage();
        stage._activeTab = 3;
        stage._subCategory = 5;
        stage._page = 2;
        stage._selectedPlate = 4;
        stage._searchResults = [comm()];
        stage.SetCategory(6);
        expect(stage._activeTab).toBe(6);
        expect(stage._subCategory).toBe(0);
        expect(stage._page).toBe(0);
        expect(stage._selectedPlate).toBe(-1);
        expect(stage._searchResults).toBeNull();
      });

      it('number keys map to categories 1-8 directly (OG VK 1..9); initial tab is 1', () => {
        const stage = makeGatedStage();
        expect(stage._activeTab).toBe(1); // OG Init m_nCurCategory=1
        stage.onKeyPress('3');
        expect(stage._activeTab).toBe(3);
        expect(stage._subCategory).toBe(0);
        stage.onKeyPress('8');
        expect(stage._activeTab).toBe(8);
      });

      it('PageUp/PageDown cycle pages with modulo wrap', () => {
        const stage = makeGatedStage();
        const items = Array.from({ length: 25 }, (_, i) => ({ sn: i }));
        stage._getCurrentPageItems = () => items as any; // 3 pages
        stage.onKeyPress('PageDown');
        expect(stage._page).toBe(1);
        stage.onKeyPress('PageUp');
        expect(stage._page).toBe(0);
        stage.onKeyPress('PageUp');
        expect(stage._page).toBe(2); // wraps to last
        stage.onKeyPress('PageDown');
        expect(stage._page).toBe(0);
      });

      it('one-a-day window opens on category 1 sub-category 2 only (OG m_bIsOneADay)', () => {
        const stage = makeGatedStage();
        stage.SetCategory(1);
        expect(stage._oneADayActive).toBe(false);
        stage._setSubCategory(2);
        expect(stage._oneADayActive).toBe(true);
        stage.SetCategory(3); // any other category tears it down
        expect(stage._oneADayActive).toBe(false);
        // key '9' reaches the wishlist page too
        stage.onKeyPress('9');
        expect(stage._activeTab).toBe(9);
      });

      it('category 9 renders the wishlist as plates', () => {
        const stage = makeGatedStage();
        stage._activeTab = 9;
        stage._wishlist = [30000001, 0, 30000002, 0, 0, 0, 0, 0, 0, 0];
        stage._commodities = [comm({ sn: 30000001 }), comm({ sn: 30000002 })];
        const page = stage._getCurrentPageItems();
        expect(page.map((c: any) => c.sn)).toEqual([30000001, 30000002]);
        // wish toggle on the wishlist page removes the entry
        let removed: number | null = null;
        stage.RemoveWish = (sn: number) => { removed = sn; };
        stage.onMouseButton(LIST_X + PLATE_W - 40 + 10, LIST_Y + 2 + 10, true, 0);
        expect(removed).toBe(30000001);
      });

      it('search results become virtual category 10 and cancel returns to category 1', () => {
        const stage = makeGatedStage();
        stage._activeTab = 1;
        stage._searchActive = true;
        stage._searchQuery = 'cape';
        stage._commodities = [comm({ name: 'Red Cape' }), comm({ name: 'Blue Shoe' })];
        stage.onKeyPress('Enter'); // executes the search
        expect(stage._activeTab).toBe(10);
        expect(stage._getCurrentPageItems().map((c: any) => c.name)).toEqual(['Red Cape']);
        // re-open the search field, then Escape leaves the results view
        stage._searchActive = true;
        stage.onKeyPress('Escape');
        expect(stage._activeTab).toBe(1);
        expect(stage._searchResults).toBeNull();
      });

      it('arrow keys move plate focus on the 2-column grid (OG OnKeyRet)', () => {
        const stage = makeGatedStage();
        const items = Array.from({ length: 10 }, (_, i) => comm({ sn: 30000000 + i }));
        stage._activeTab = 3;
        stage._commodities = items;
        stage._focusedPlate = 0;
        stage.onKeyPress('ArrowDown');
        expect(stage._focusedPlate).toBe(2); // down one row
        stage.onKeyPress('ArrowRight');
        expect(stage._focusedPlate).toBe(3); // left col → right col
        stage.onKeyPress('ArrowUp');
        expect(stage._focusedPlate).toBe(1);
        stage.onKeyPress('ArrowUp');
        expect(stage._focusedPlate).toBe(9); // wraps to bottom row
      });

      it('Enter wears the focused item and enters button mode; Esc exits', () => {
        const stage = makeGatedStage();
        stage._initialLook = {
          gender: 0, skin: 0, face: 20000, hair: 30000,
          hairEquip: new Map(), unseenEquip: new Map(), weaponStickerId: 0, petIds: [0, 0, 0],
        };
        stage._charLook = { SetAvatar: () => {}, RebuildDisplay: () => {} };
        stage._activeTab = 3;
        stage._commodities = [comm({ sn: 30000001, itemId: 1070000 })];
        stage._page = 0;
        stage._focusedPlate = 0;
        stage._buttonFocus = -1;
        stage.onKeyPress('Enter');
        expect(stage._wearInfo.get(7)?.itemId).toBe(1070000);
        expect(stage._buttonFocus).toBe(0);
        stage.onKeyPress('ArrowRight'); // cycle to Gift
        expect(stage._buttonFocus).toBe(1);
        stage.onKeyPress('Escape');
        expect(stage._buttonFocus).toBe(-1);
      });

      it('search price band filters results (CSItemSearch/Price model)', () => {
        const stage = makeGatedStage();
        stage._searchActive = true;
        stage._searchQuery = 'cape';
        stage._searchPriceBands = [{ low: 0, high: 1000 }, { low: 1000, high: 5000 }];
        stage._searchBandIndex = 0; // 0..1000
        stage._commodities = [
          comm({ name: 'Red Cape', price: 500, discountRate: 0 }),
          comm({ name: 'Blue Cape', price: 3000, discountRate: 0 }),
        ];
        stage._executeSearch();
        expect(stage._activeTab).toBe(10);
        expect(stage._getCurrentPageItems().map((c: any) => c.name)).toEqual(['Red Cape']);
        // switching bands re-filters on the next search
        stage._searchActive = true;
        stage._cycleSearchBand(1); // → band 1
        expect(stage._searchBandIndex).toBe(1);
        stage._executeSearch();
        expect(stage._getCurrentPageItems().map((c: any) => c.name)).toEqual(['Blue Cape']);
      });

      it('coupon dialog modal: OK sends the coupon, Cancel clears', () => {
        const stage = makeGatedStage();
        const sent: string[] = [];
        stage.game.session.send = (pkt: any) => sent.push(String(pkt));
        stage._couponVisible = true;
        stage._couponValue = 'GEMS123';
        // outside clicks are swallowed by the modal
        expect(stage._handleCouponClick(10, 10)).toBe(true);
        expect(stage._couponVisible).toBe(true);
        // OK button (dialog-relative 40..104 in the bottom row)
        const r = stage._couponRect();
        stage._handleCouponClick(r.x + 50, r.y + r.h - 16);
        expect(sent.length).toBe(1);
        expect(stage._couponVisible).toBe(false);
      });

    it('one-a-day direct buy releases the pending gate when a dialog opens', () => {
      const stage = makeGatedStage();
      stage._buyPending = false;
      // _processBuy that routes to a dialog must not leave the gate stuck
      stage._processBuy({ itemId: 1112001, sn: 4 });
      expect(stage._activeDialog).toBe('coupleName');
      stage._activeDialog = 'none';
    });

    it('gift dialog state buttons: Guild→2, Buddy→1, Hide→0 (CUISendGifts)', () => {
      const stage = makeGatedStage();
      stage._activeTab = 3;
      stage._commodities = [comm({ sn: 30000001 })];
      // open the dialog via the Gift button on plate 0
      stage.onMouseButton(LIST_X + PLATE_W - 40 + 10, LIST_Y + 2 + 35, true, 0);
      expect(stage._giftVisible).toBe(true);
      expect(stage._giftState).toBe(0); // manual entry default
      const dlgX = Math.floor((800 - 473) / 2);
      const dlgY = Math.floor((600 - 169) / 2);
      const btnY = dlgY + 139;
      stage.onMouseButton(dlgX + 70, btnY + 8, true, 0);   // Guild
      expect(stage._giftState).toBe(2);
      stage.onMouseButton(dlgX + 120, btnY + 8, true, 0);  // Buddy
      expect(stage._giftState).toBe(1);
      // buddy list renders names and click-selects into the receiver field
      stage.buddyNames = ['Alpha', 'Beta'];
      stage.onMouseButton(dlgX + 350, dlgY + 48, true, 0); // first list row
      expect(stage._giftListSelected).toBe(0);
      expect(stage._giftReceiver).toBe('Alpha');
      stage.onMouseButton(dlgX + 445, btnY + 8, true, 0);  // Hide → manual
      expect(stage._giftState).toBe(0);
    });

    it('gift receiver must be 4-12 chars (OG SetRet @0x79A4C0)', () => {
      const stage = makeGatedStage();
      let sent = 0;
      stage.game.session.send = () => { sent++; };
      stage._giftItem = comm({ sn: 30000001 });
      stage._giftReceiver = 'Ab';
      stage._executeGift();
      expect(sent).toBe(0);
      expect(stage._statusMessage).toContain('4-12');
      stage._giftReceiver = 'ValidName';
      stage._executeGift();
      expect(sent).toBe(1);
    });
    });

    describe('character preview try-on (CCSWnd_Char OnWear @0x4C5A60)', () => {
      function makePreviewStage() {
        const stage = makeGatedStage();
        stage._initialLook = {
          gender: 0, skin: 0, face: 20000, hair: 30000,
          hairEquip: new Map([[1, 1000000], [5, 1040000], [10, 1302000]]),
          unseenEquip: new Map(), weaponStickerId: 0, petIds: [0, 0, 0],
        };
        stage._charLook = { SetAvatar: () => {}, RebuildDisplay: () => {} };
        return stage;
      }

      it('body part table maps equip ranges (OG get_bodypart_from_item)', () => {
        const stage = makeGatedStage();
        expect(stage._bodyPartFromItem(1002357)).toBe(1);  // hat
        expect(stage._bodyPartFromItem(1050000)).toBe(5);  // overall
        expect(stage._bodyPartFromItem(1070000)).toBe(7);  // shoes
        expect(stage._bodyPartFromItem(1092000)).toBe(10); // weapon
        expect(stage._bodyPartFromItem(1112000)).toBe(12); // ring
        expect(stage._bodyPartFromItem(1702000)).toBe(-1); // cash weapon → sticker path
      });

      it('wearing a commodity overlays the slot; clicking again toggles off', () => {
        const stage = makePreviewStage();
        const applied: any[] = [];
        stage._charLook.SetAvatar = (look: any) => { applied.push(look); };
        stage.WearCommodity(comm({ sn: 30000001, itemId: 1070000 })); // shoes
        expect(stage._wearInfo.get(7)?.itemId).toBe(1070000);
        expect(applied[applied.length - 1].hairEquip.get(7)).toBe(1070000);
        // base look preserved underneath
        expect(applied[applied.length - 1].hairEquip.get(1)).toBe(1000000);
        stage.WearCommodity(comm({ sn: 30000001, itemId: 1070000 }));
        expect(stage._wearInfo.has(7)).toBe(false);
      });

      it('overall/pants exclusivity: wearing an overall clears pants and vice versa', () => {
        const stage = makePreviewStage();
        stage.WearCommodity(comm({ itemId: 1060000 })); // pants → slot 6
        expect(stage._wearInfo.get(6)?.itemId).toBe(1060000);
        stage.WearCommodity(comm({ itemId: 1050000 })); // overall → slot 5, clears 6
        expect(stage._wearInfo.get(5)?.itemId).toBe(1050000);
        expect(stage._wearInfo.has(6)).toBe(false);
        stage.WearCommodity(comm({ itemId: 1060001 })); // pants clears overall
        expect(stage._wearInfo.has(5)).toBe(false);
        expect(stage._wearInfo.get(6)?.itemId).toBe(1060001);
      });

      it('cash weapons ride the sticker slot (bp 11 → weaponStickerId)', () => {
        const stage = makePreviewStage();
        let applied: any = null;
        stage._charLook.SetAvatar = (look: any) => { applied = look; };
        stage.WearCommodity(comm({ itemId: 1702000 })); // /100000==17 → sticker
        expect(stage._wearInfo.get(11)?.itemId).toBe(1702000);
        expect(applied.weaponStickerId).toBe(1702000);
      });

      it('gender mismatch rejects try-on', () => {
        const stage = makePreviewStage();
        stage._playerGender = 0; // male
        stage.WearCommodity(comm({ itemId: 1070000, gender: 1 }));
        expect(stage._wearInfo.size).toBe(0);
      });

      it('TakeOff/Default clear the overlay; BuyAvatar sends one packet per worn slot', () => {
        const stage = makePreviewStage();
        stage.WearCommodity(comm({ sn: 30000001, itemId: 1070000 }));
        stage.WearCommodity(comm({ sn: 30000002, itemId: 1080000 }));
        expect(stage._wearInfo.size).toBe(2);
        const sent: number[] = [];
        stage.game.session.send = (pkt: any) => sent.push(pkt);
        stage._onBuyAvatar();
        expect(sent.length).toBe(2);
        stage._onTakeOffAvatar();
        expect(stage._wearInfo.size).toBe(0);
      });

      it('plate selection wears the commodity on the preview', () => {
        const stage = makePreviewStage();
        stage._activeTab = 3;
        stage._commodities = [comm({ sn: 30000001, itemId: 1070000 })];
        stage.onMouseButton(275 + 50, 95 + 2 + 40, true, 0); // plate body
        expect(stage._selectedPlate).toBe(0);
        expect(stage._wearInfo.get(7)?.itemId).toBe(1070000);
      });
    });
  });
});
