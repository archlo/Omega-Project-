import { WzImage } from '../wz/WzImage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzPackage } from '../wz/WzPackage.js';

/** CS_COMMODITY base entry from Etc.wz/Commodity.img (OG load_commodity
 *  @0x49BCD0 + read_commodity_entity @0x49AC30; StringPool field ids
 *  0xB0D..0xB19, 0xC60..0xC64). The v95 client owns this table locally and the
 *  server's SetCashShop packet only modifies entries on top of it. */
export interface CSCommodity {
  sn: number;
  itemId: number;
  count: number;
  price: number;
  bonus: boolean;
  priority: number;
  period: number;
  gender: number;
  onSale: boolean;
  maplePoint: number;
  meso: number;
  reqPop: number;
  reqLevel: number;
  limit: number;
  classField: number;
  forPremiumUser: boolean;
  pbCash: number;
  pbPoint: number;
  pbGift: number;
}

/** One row of Etc.wz/Category.img (OG load_category @0x49C1C0:
 *  Category + CategorySub + Name). */
export interface CSCategoryRow {
  category: number;
  categorySub: number;
  name: string;
}

function num(p: WzProperty | null, name: string): number {
  const v = p?.Get(name);
  return typeof v === 'bigint' ? Number(v) : typeof v === 'number' ? v : 0;
}
function boolOf(v: unknown): boolean {
  if (typeof v === 'bigint') return v !== 0n;
  if (typeof v === 'number') return v !== 0;
  return v === true;
}

export class CashCommodityTable {
  private _bySn = new Map<number, CSCommodity>();
  private _categories: CSCategoryRow[] = [];

  static async LoadAsync(etcWz: WzPackage | null): Promise<CashCommodityTable> {
    const t = new CashCommodityTable();
    if (!etcWz) return t;
    // Commodity.img — children are index-named properties, each carrying SN.
    const comm = etcWz.GetItem('Commodity.img');
    const root = comm instanceof WzImage ? comm.Root : null;
    if (root) {
      for (let i = 0; ; i++) {
        const child = root.Get(String(i));
        if (!(child instanceof WzProperty)) break;
        const sn = num(child, 'SN');
        if (sn <= 0) continue;
        t._bySn.set(sn, {
          sn,
          itemId: num(child, 'ItemId'),
          count: num(child, 'Count') || 1,
          price: num(child, 'Price'),
          bonus: boolOf(child.Get('Bonus')),
          priority: num(child, 'Priority'),
          period: num(child, 'Period'),
          gender: num(child, 'Gender'),
          onSale: boolOf(child.Get('OnSale')),
          maplePoint: num(child, 'MaplePoint'),
          meso: num(child, 'Meso'),
          reqPop: num(child, 'ReqPop'),
          reqLevel: num(child, 'ReqLevel'),
          limit: num(child, 'Limit'),
          classField: num(child, 'Class'),
          forPremiumUser: boolOf(child.Get('Premium')),
          pbCash: num(child, 'PBcash'),
          pbPoint: num(child, 'PBpoint'),
          pbGift: num(child, 'PBgift'),
        });
      }
    }
    // Category.img — numbered rows with Category/CategorySub/Name.
    const cat = etcWz.GetItem('Category.img');
    const catRoot = cat instanceof WzImage ? cat.Root : null;
    if (catRoot) {
      for (let i = 0; ; i++) {
        const child = catRoot.Get(String(i));
        if (!(child instanceof WzProperty)) break;
        t._categories.push({
          category: num(child, 'Category'),
          categorySub: num(child, 'CategorySub'),
          name: (child.Get('Name') as string) ?? '',
        });
      }
    }
    return t;
  }

  get BySn(): Map<number, CSCommodity> { return this._bySn; }
  get Categories(): CSCategoryRow[] { return this._categories; }
  Get(sn: number): CSCommodity | undefined { return this._bySn.get(sn); }

  /** Sub-category rows belonging to one tab category (OG GetCategoryIndex). */
  SubRows(category: number): CSCategoryRow[] {
    return this._categories.filter((c) => c.category === category);
  }
}
