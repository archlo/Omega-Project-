import { WzCanvas } from '../wz/WzCanvas.js';
import type { WzPackage } from '../wz/WzPackage.js';
import type { WzProperty } from '../wz/WzProperty.js';
import type { WzSprite } from '../render/WzSprite.js';
import type { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzUol } from '../wz/WzUol.js';

/**
Resolves an item's inventory icon (the 32x32-ish cell sprite) from the WZ files.
Equips (1xxxxxx) live in `Character.wz` at
`<Category>/<itemId:D8>.img/info/icon` — the same image that holds
the avatar sprite; the category folder is derived from the item-id prefix
(`itemId / 10000`). Consumables, setup, etc and
cash items (2..5xxxxxx) live in `Item.wz` at
`<Cat>/<itemId/10000:D4>.img/<itemId:D8>/info/icon`.

Pendant/Belt/Medal and the face/eye/earring accessories all share the
`Accessory` folder in v95; Rings, Shields, Capes and Weapons have their
own folders. Every lookup falls back from `icon` to `iconRaw` and resolves
UOL nodes. Loaded sprites (and misses) are cached by item id so repeated
draws never re-walk the WZ tree.
*/
export class ItemIconLoader {
  private _cache = new Map<number, WzSprite | null>();
  private _petCache = new Map<number, WzSprite | null>();
  private _attrCache = new Map<number, ItemAttr | null>();

  constructor(
    private _loader: WzTextureLoader,
    private _characterWz: WzPackage | null,
    private _itemWz: WzPackage | null = null,
  ) {}

  /** The inventory icon for an item, or null if the id isn't a
      recognised item or the asset is missing (caller falls back to a placeholder). */
  LoadIcon(itemId: number): WzSprite | null {
    let cached = this._cache.get(itemId);
    if (cached !== undefined) return cached;

    let sprite: WzSprite | null = null;
    try {
      sprite = Math.floor(itemId / 1_000_000) === 1 ? this._loadEquipIcon(itemId) : this._loadItemIcon(itemId);
    } catch {
      sprite = null;
    }

    this._cache.set(itemId, sprite);
    return sprite;
  }

  /** Pet icon from `Item.wz/Pet/<id:D8>.img/info/icon`. Pets live in their own
      `Pet` folder (NOT under `Cash`), so the character-profile pet row needs
      this dedicated lookup. Cached per id (misses too). */
  LoadPetIcon(templateId: number): WzSprite | null {
    let cached = this._petCache.get(templateId);
    if (cached !== undefined) return cached;
    let sprite: WzSprite | null = null;
    try {
      if (this._itemWz !== null) sprite = this._resolve(this._itemWz, `Pet/${templateId.toString().padStart(8, '0')}.img/info`);
    } catch {
      sprite = null;
    }
    this._petCache.set(templateId, sprite);
    return sprite;
  }

  /** Parsed item attributes for the tooltip (requirements + bonuses), read from the
      item's `info` node. Equips -> Character.wz; consumables/etc -> Item.wz. Returns
      null when the item has no info node (caller shows just the name). Cached per id (misses too). */
  LoadAttr(itemId: number): ItemAttr | null {
    let cached = this._attrCache.get(itemId);
    if (cached !== undefined) return cached;
    let attr: ItemAttr | null = null;
    try {
      const info = this._infoNode(itemId);
      if (info !== null) {
        const isEquip = Math.floor(itemId / 1_000_000) === 1;
        attr = {
          IsEquip: isEquip,
          Category: Math.floor(itemId / 10000),
          ReqLevel: I(info, 'reqLevel'),
          ReqStr: I(info, 'reqSTR'),
          ReqDex: I(info, 'reqDEX'),
          ReqInt: I(info, 'reqINT'),
          ReqLuk: I(info, 'reqLUK'),
          ReqFame: I(info, 'reqPOP'),
          ReqJob: I(info, 'reqJob'),
          IncStr: I(info, 'incSTR'),
          IncDex: I(info, 'incDEX'),
          IncInt: I(info, 'incINT'),
          IncLuk: I(info, 'incLUK'),
          IncPad: I(info, 'incPAD'),
          IncMad: I(info, 'incMAD'),
          IncPdd: I(info, 'incPDD'),
          IncMdd: I(info, 'incMDD'),
          IncMhp: I(info, 'incMHP'),
          IncMmp: I(info, 'incMMP'),
           IncAcc: I(info, 'incACC'),
           IncEva: I(info, 'incEVA'),
           IncSpeed: I(info, 'incSpeed'),
           IncJump: I(info, 'incJump'),
           IncMHPr: I(info, 'incMHPr'),
           IncMMPr: I(info, 'incMMPr'),
          AttackSpeed: I(info, 'attackSpeed'),
          Upgrades: I(info, 'tuc'),
          Price: I(info, 'price'),
          Cash: I(info, 'cash') !== 0,
          Only: I(info, 'only') !== 0,
          SetItemId: I(info, 'setItemID'),
        };
      }
    } catch {
      attr = null;
    }
    this._attrCache.set(itemId, attr);
    return attr;
  }

  private _infoNode(itemId: number): WzProperty | null {
    if (Math.floor(itemId / 1_000_000) === 1) {
      const category = ItemIconLoader._category(itemId);
      if (category === null || this._characterWz === null) return null;
      const node = this._characterWz.GetItem(`${category}/${itemId.toString().padStart(8, '0')}.img/info`);
      return node instanceof Object ? node as WzProperty : null;
    }
    if (this._itemWz === null) return null;
    const folder = (() => {
      switch (Math.floor(itemId / 1_000_000)) {
        case 2: return 'Consume';
        case 3: return 'Install';
        case 4: return 'Etc';
        case 5: return 'Cash';
        default: return null;
      }
    })();
    if (folder === null) return null;
    const node = this._itemWz.GetItem(`${folder}/${Math.floor(itemId / 10000).toString().padStart(4, '0')}.img/${itemId.toString().padStart(8, '0')}/info`);
    return node instanceof Object ? node as WzProperty : null;
  }

  // Equip (1xxxxxx): Character.wz/<Category>/<id:D8>.img/info/icon
  private _loadEquipIcon(itemId: number): WzSprite | null {
    const category = ItemIconLoader._category(itemId);
    if (category === null || this._characterWz === null) return null;
    return this._resolve(this._characterWz, `${category}/${itemId.toString().padStart(8, '0')}.img/info`);
  }

  // Consume/Install/Etc/Cash (2..5xxxxxx): Item.wz/<Cat>/<id/10000:D4>.img/<id:D8>/info/icon
  private _loadItemIcon(itemId: number): WzSprite | null {
    if (this._itemWz === null) return null;
    const folder = (() => {
      switch (Math.floor(itemId / 1_000_000)) {
        case 2: return 'Consume';
        case 3: return 'Install';
        case 4: return 'Etc';
        case 5: return 'Cash';
        default: return null;
      }
    })();
    if (folder === null) return null;
    const img = Math.floor(itemId / 10000);
    return this._resolve(this._itemWz, `${folder}/${img.toString().padStart(4, '0')}.img/${itemId.toString().padStart(8, '0')}/info`);
  }

  // icon (preferred) -> iconRaw (fallback), resolving a UOL and uploading the canvas.
  private _resolve(wz: WzPackage, infoPath: string): WzSprite | null {
    let node = wz.GetItem(`${infoPath}/icon`) ?? wz.GetItem(`${infoPath}/iconRaw`);
    if (node instanceof WzUol) node = node.Resolve();
    return node instanceof WzCanvas ? this._loader.Load(node) : null;
  }

  // Character.wz folder for an equip id, by the 4-digit category (itemId / 10000).
  // Mapped from OG CItemInfo::get_equip_data_path (0x5A6060).
  private static _category(itemId: number): string | null {
    const cat = Math.floor(itemId / 10000);
    switch (true) {
      case cat === 100: return 'Cap';
      case cat >= 101 && cat <= 103: return 'Accessory';
      case cat === 104: return 'Coat';
      case cat === 105: return 'Longcoat';
      case cat === 106: return 'Pants';
      case cat === 107: return 'Shoes';
      case cat === 108: return 'Glove';
      case cat === 109: return 'Shield';
      case cat === 110: return 'Cape';
      case cat === 111: return 'Ring';
      case cat >= 112 && cat <= 115: return 'Accessory';
      case cat >= 116 && cat <= 118: return null;
      case cat === 119: return 'Shield';
      case cat >= 130 && cat <= 160: return 'Weapon';
      case cat >= 161 && cat <= 165: return 'Mechanic';
      case cat >= 166 && cat <= 179: return 'Weapon';
      case cat >= 180 && cat <= 183: return 'PetEquip';
      case cat >= 190 && cat <= 193: return 'TamingMob';
      case cat >= 194 && cat <= 197: return 'Dragon';
      case cat === 198: return 'TamingMob';
      default: return null;
    }
  }
}

function I(p: WzProperty, key: string): number {
  const v = p.Get(key);
  return typeof v === 'number' ? v : 0;
}

/**
Parsed item attributes for the tooltip (a subset of the WZ `info` node):
requirements + stat bonuses. Stat values are the item's base WZ values.
*/
export interface ItemAttr {
  IsEquip: boolean;
  Category: number; // itemId / 10000
  ReqLevel: number; ReqStr: number; ReqDex: number; ReqInt: number; ReqLuk: number; ReqFame: number; ReqJob: number;
   IncStr: number; IncDex: number; IncInt: number; IncLuk: number;
   IncPad: number; IncMad: number; IncPdd: number; IncMdd: number; IncMhp: number; IncMmp: number; IncAcc: number; IncEva: number; IncSpeed: number; IncJump: number;
   IncMHPr: number; IncMMPr: number;
  AttackSpeed: number; Upgrades: number; Price: number;
  Cash: boolean; Only: boolean;
  // OG: CItemInfo::EQUIPITEM::nSetItemID (info/setItemID) — TODO_AUDIT.md
  // Hundred-and-second/Hundred-and-fifth/Hundred-and-ninth passes
  // (EQUIPPED_SETITEM/ToolTip_SetItemList). 0 when the item belongs to no set.
  SetItemId: number;
}
