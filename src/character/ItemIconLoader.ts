import { WzCanvas } from '../wz/WzCanvas.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';
import type { WzSprite } from '../render/WzSprite.js';
import type { WzTextureLoader } from '../render/WzTextureLoader.js';
import { WzUol } from '../wz/WzUol.js';
import { Sprite } from 'pixi.js';
import type { EquipStats, InventoryItem } from '../domain/InventoryItem.js';

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
  private _runtimeItems = new Map<number, RuntimeItemData>();
  private _cashTag: WzSprite | null = null;
  private _cashTagLoaded = false;

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
      // OG CItemInfo::GetItemProp: equips (1xxxxxx) and cash equips (5xxxxxx where group!=500)
      // load from Character.wz; everything else from Item.wz
      const invType = Math.floor(itemId / 1_000_000);
      if (invType === 1) {
        sprite = this._loadEquipIcon(itemId);
      } else if (invType === 5 && Math.floor(itemId / 10000) !== 500) {
        // Cash equip — OG slot type 2, loads from Character.wz like regular equips
        sprite = this._loadEquipIcon(itemId);
      } else {
        sprite = this._loadItemIcon(itemId);
      }
    } catch {
      sprite = null;
    }

    this._cache.set(itemId, sprite);
    return sprite;
  }

  /** OG: CItemInfo::DrawItemIconForSlot cash tag overlay — small "CASH" indicator
      drawn in the bottom-right corner of cash items. Loaded from UIWindow2.img/Item/cash
      or similar WZ path. Returns null if the cash tag asset isn't available. */
  GetCashTag(): Sprite | null {
    if (this._cashTagLoaded) return this._cashTag?.NewSprite() ?? null;
    this._cashTagLoaded = true;
    if (!this._itemWz) return null;
    // Try common WZ paths for the cash tag icon
    const paths = [
      'UIWindow2.img/Item/cash',
      'UIWindow2.img/Item/Cash',
    ];
    for (const p of paths) {
      const node = this._itemWz.GetItem(p);
      if (node instanceof WzCanvas) {
        this._cashTag = this._loader.Load(node);
        break;
      }
      if (node instanceof WzUol) {
        const resolved = node.Resolve();
        if (resolved instanceof WzCanvas) {
          this._cashTag = this._loader.Load(resolved);
          break;
        }
      }
    }
    return this._cashTag?.NewSprite() ?? null;
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
    if (cached !== undefined) return this._withRuntime(itemId, cached);
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
           IncCraft: I(info, 'incCraft'),
           Knockback: I(info, 'knockback'),
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
          // OG: CItemInfo::GetMaxLevel (0x5C09B0) — highest info/level/<n> node.
          // Growth items (135xxx) carry per-level data; used by the tooltip to
          // pick the "max" glyph vs level/percent digits.
          MaxLevel: ItemIconLoader._maxLevel(info),
          // OG: DrawToolTip_Equip durability = 100*cur/max. info/durability is
          // the max; per-instance current durability comes from the item slot.
          DurabilityMax: I(info, 'durability'),
          // OG: CItemInfo::EQUIPITEM reads info/incSkill as skillId → bonus.
          // Used for the skill window's mSkillRecordEx "(+N)" display.
          IncSkill: ItemIconLoader._incSkill(info),
        };
      }
    } catch {
      attr = null;
    }
    this._attrCache.set(itemId, attr);
    return this._withRuntime(itemId, attr);
  }

  /**
   * Attach the decoded instance values used by the equip tooltip. WZ data is
   * immutable and cached by item id; this overlay is deliberately separate so
   * two instances of the same item do not rewrite the template attributes.
   */
  SetRuntimeItem(item: InventoryItem): void {
    if (item.equip) this.SetRuntimeEquip(item.itemId, item.equip, item.attribute);
    else this.ClearRuntimeItem(item.itemId);
  }

  /** Attach decoded equip fields while preserving the existing LoadAttr API. */
  SetRuntimeEquip(itemId: number, equip: EquipStats, attribute = equip.attribute): void {
    this._runtimeItems.set(itemId, { equip, attribute });
  }

  ClearRuntimeItem(itemId: number): void {
    this._runtimeItems.delete(itemId);
  }

  private _withRuntime(itemId: number, attr: ItemAttr | null): ItemAttr | null {
    const runtime = this._runtimeItems.get(itemId);
    if (!runtime) return attr;

    const equip = runtime.equip;
    const result: ItemAttr = attr ? { ...attr } : {
      IsEquip: true,
      Category: Math.floor(itemId / 10000),
      ReqLevel: 0, ReqStr: 0, ReqDex: 0, ReqInt: 0, ReqLuk: 0, ReqFame: 0, ReqJob: 0,
      IncStr: 0, IncDex: 0, IncInt: 0, IncLuk: 0,
      IncPad: 0, IncMad: 0, IncPdd: 0, IncMdd: 0, IncMhp: 0, IncMmp: 0,
      IncAcc: 0, IncEva: 0, IncSpeed: 0, IncJump: 0, IncMHPr: 0, IncMMPr: 0,
      IncCraft: 0, Knockback: 0, AttackSpeed: 0, Upgrades: 0, Price: 0,
      Cash: false, Only: false, SetItemId: 0,
    };

    // Equip packet fields override the WZ template for this instance.
    result.IncStr = equip.incStr; result.IncDex = equip.incDex;
    result.IncInt = equip.incInt; result.IncLuk = equip.incLuk;
    result.IncMhp = equip.incMhp; result.IncMmp = equip.incMmp;
    result.IncPad = equip.incPad; result.IncMad = equip.incMad;
    result.IncPdd = equip.incPdd; result.IncMdd = equip.incMdd;
    result.IncAcc = equip.incAcc; result.IncEva = equip.incEva;
    result.IncSpeed = equip.incSpeed; result.IncJump = equip.incJump;
    result.ProtectionType = runtime.attribute & 3;
    result.Durability = equip.durability;
    result.Level = equip.level;
    result.StarForce = equip.iuc;
    result.Ruc = equip.ruc; result.CUC = equip.cuc; result.Iuc = equip.iuc;
    result.Option1 = equip.option1; result.Option2 = equip.option2; result.Option3 = equip.option3;
    result.Socket1 = equip.socket1; result.Socket2 = equip.socket2;
    result.Attribute = runtime.attribute;

    const nextExp = this._growthNextExp(itemId, equip.level);
    result.Exp = equip.exp;
    result.expPct = nextExp > 0 ? Math.max(0, Math.min(99, Math.floor(100 * equip.exp / nextExp))) : 0;
    return result;
  }

  private _growthNextExp(itemId: number, level: number): number {
    const info = this._infoNode(itemId);
    const levels = info?.Get('level');
    if (!levels || typeof levels !== 'object') return 0;
    const next = (levels as Record<string, unknown>)[String(level + 1)];
    if (!next || typeof next !== 'object') return 0;
    return I(next as WzProperty, 'exp');
  }

  // Count of info/level/<n> children == the growth item's max level (0 = not growth).
  private static _maxLevel(info: WzProperty): number {
    const levelNode = info.Get('level');
    if (!levelNode || typeof levelNode !== 'object') return 0;
    const obj = levelNode as Record<string, unknown>;
    let max = 0;
    for (let i = 1; ; i++) {
      if (!(String(i) in obj)) break;
      max = i;
    }
    return max;
  }

  /** OG: CItemInfo::EQUIPITEM info/incSkill — skillId → bonus level map. */
  private static _incSkill(info: WzProperty): Map<number, number> | undefined {
    const node = info.Get('incSkill');
    if (!(node instanceof WzProperty)) return undefined;
    const map = new Map<number, number>();
    for (const [key, val] of Object.entries(node.Items)) {
      const id = parseInt(key, 10);
      if (isNaN(id) || typeof val !== 'number') continue;
      map.set(id, val);
    }
    return map.size > 0 ? map : undefined;
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
  // StringPool IDs: 0x93E=Unknown, 0x93F=Consume, 0x940=Install, 0x941=Cap,
  // 0x942=Accessory, 0x943=Coat, 0x944=Longcoat, 0x945=Pants, 0x946=Shoes,
  // 0x947=Glove, 0x948=Shield, 0x949=Cape, 0x94A=Ring, 0x94B=PetEquip,
  // 0x94C=Weapon, 0x94D=TamingMob, 0x94F=Dragon, 0x18FA=Mechanic
  private static _category(itemId: number): string | null {
    const cat = Math.floor(itemId / 10000);
    // OG get_equip_data_path (0x5A6060) — explicit cases first, then weapon default
    switch (true) {
      case cat === 100: return 'Cap';
      case cat >= 101 && cat <= 103: return 'Accessory';
      case cat === 104: return 'Coat';
      case cat === 105: return 'Longcoat';
      case cat === 106: return 'Pants';
      case cat === 107: return 'Shoes';
      case cat === 108: return 'Glove';
      case cat === 109 || cat === 119: return 'Shield';
      case cat === 110: return 'Cape';
      case cat === 111: return 'Ring';
      case cat >= 112 && cat <= 115: return 'Accessory';
      case cat >= 116 && cat <= 118: return null;
      case cat >= 180 && cat <= 183: return 'PetEquip';
      case cat >= 190 && cat <= 191 || cat === 193 || cat === 198: return 'TamingMob';
      case cat >= 194 && cat <= 197: return 'Dragon';
      default: {
        // OG default: cat/10 in {13,14,16,17} → Weapon (130-139, 140-149, 160-169, 170-179)
        // Mechanic (161-165) is checked INSIDE the weapon default since it's within the weapon range
        const tens = Math.floor(cat / 10);
        if (cat >= 161 && cat <= 165) return 'Mechanic';
        if (tens === 13 || tens === 14 || tens === 16 || tens === 17) return 'Weapon';
        return null;
      }
    }
  }
}

function I(p: WzProperty, key: string): number {
  const v = p.Get(key);
  if (typeof v === 'number') return v;
  if (typeof v === 'bigint') return Number(v);
  return 0;
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
   IncCraft: number; Knockback: number;
  AttackSpeed: number; Upgrades: number; Price: number;
  Cash: boolean; Only: boolean;
  // OG: CItemInfo::EQUIPITEM::nSetItemID (info/setItemID) — TODO_AUDIT.md
  // Hundred-and-second/Hundred-and-fifth/Hundred-and-ninth passes
  // (EQUIPPED_SETITEM/ToolTip_SetItemList). 0 when the item belongs to no set.
  SetItemId: number;
  // OG: Equip-specific fields from SetToolTip_Equip_Basic / DrawToolTip_Equip
  ProtectionType?: number;  // 0-3, border color selection
  Durability?: number;      // current durability (item instance); omitted → full
  DurabilityMax?: number;   // WZ info/durability — max, so pct = 100*cur/max
  Level?: number;           // growth item level
  MaxLevel?: number;        // growth item max level (info/level/<n> count)
  StarForce?: number;       // star force enhancement count
  Exp?: number;              // current growth EXP from the item instance
  expPct?: number;           // OG display percentage, derived from next level EXP
  Ruc?: number; CUC?: number; Iuc?: number;
  Option1?: number; Option2?: number; Option3?: number;
  Socket1?: number; Socket2?: number;
  Attribute?: number;
  // OG: mSkillRecordEx source — info/incSkill: skillId → bonus level from equipping
  // this item. Absent when the item grants no skill levels (the common case).
  IncSkill?: Map<number, number>;
}

interface RuntimeItemData {
  equip: EquipStats;
  attribute: number;
}
