import { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';
import type { CActionMan } from '../character/ActionMan.js';

export class ItemInfo {
  private _itemCache = new Map<number, WzProperty | null>();
  private _categoryCache = new Map<string, WzProperty | null>();

  constructor(
    private _itemWz: WzPackage | null,
    private _characterWz: WzPackage | null,
    private _actionMan?: CActionMan,
  ) {}

  GetItemProp(itemId: number): WzProperty | null {
    const cached = this._itemCache.get(itemId);
    if (cached !== undefined) return cached;
    const result = this._resolve(itemId);
    this._itemCache.set(itemId, result);
    return result;
  }

  private _resolve(itemId: number): WzProperty | null {
    const idStr = itemId.toString().padStart(8, '0');
    const prefix = Math.floor(itemId / 1000000);
    const subCategory = Math.floor(itemId / 10000);

    if (prefix === 1) {
      const entry = this._actionMan?.GetCharacterImgEntry(itemId);
      return entry?.pImg ?? null;
    }

    if (subCategory <= 3) return null;

    if (prefix === 5) {
      return this._resolveCategoryPath('Cash', itemId, idStr);
    }
    if (prefix >= 2 && prefix <= 4) {
      const cat = this._categoryName(prefix, subCategory);
      if (!cat) return null;
      return this._resolveCategoryPath(cat, itemId, idStr);
    }
    return null;
  }

  private _resolveCategoryPath(category: string, itemId: number, idStr: string): WzProperty | null {
    const catNode = this._getCategory(category);
    if (!catNode) return null;
    const child = catNode.Get(idStr);
    if (child instanceof WzProperty) return child;
    return null;
  }

  private _getCategory(category: string): WzProperty | null {
    const cached = this._categoryCache.get(category);
    if (cached !== undefined) return cached;
    const node = this._itemWz?.GetItem(`${category}.img`);
    const prop = node instanceof WzProperty ? node : null;
    this._categoryCache.set(category, prop);
    return prop;
  }

  private _categoryName(prefix: number, subCategory: number): string | null {
    if (prefix === 2) return 'Consume';
    if (prefix === 3 || prefix === 4) return 'Install';
    if (prefix === 5) return 'Cash';
    const catMap: Record<number, string> = {
      100: 'Cap', 101: 'Cap', 102: 'Cape', 103: 'Cape', 104: 'Coat', 105: 'Longcoat',
      106: 'Pants', 107: 'Shoes', 108: 'Glove', 109: 'Shield',
      110: 'Cape', 111: 'Ring', 112: 'Pendant', 113: 'Pendant',
      120: 'Weapon', 121: 'Weapon', 122: 'Weapon', 130: 'Weapon', 131: 'Weapon',
      132: 'Weapon', 133: 'Weapon', 134: 'Weapon', 137: 'Weapon', 138: 'Weapon',
      140: 'Weapon', 141: 'Weapon', 142: 'Weapon', 143: 'Weapon', 144: 'Weapon',
      145: 'Weapon', 146: 'Weapon', 147: 'Weapon', 148: 'Weapon', 149: 'Weapon',
      150: 'Weapon', 151: 'Weapon', 152: 'Weapon', 153: 'Weapon', 154: 'Weapon',
      155: 'Weapon', 156: 'Weapon', 157: 'Weapon',
      200: 'Consume',
      300: 'Install',
      400: 'Etc',
      500: 'Pet',
      900: 'Etc', 910: 'Etc',
    };
    return catMap[subCategory] ?? null;
  }
}
