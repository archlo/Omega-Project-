import type { WzPackage } from '../wz/WzPackage.js';
import type { WzSprite } from '../render/WzSprite.js';
import type { WzTextureLoader } from '../render/WzTextureLoader.js';
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
export declare class ItemIconLoader {
    private _loader;
    private _characterWz;
    private _itemWz;
    private _cache;
    private _petCache;
    private _attrCache;
    private _runtimeItems;
    private _cashTag;
    private _cashTagLoaded;
    constructor(_loader: WzTextureLoader, _characterWz: WzPackage | null, _itemWz?: WzPackage | null);
    /** The inventory icon for an item, or null if the id isn't a
        recognised item or the asset is missing (caller falls back to a placeholder). */
    LoadIcon(itemId: number): WzSprite | null;
    /** OG: CItemInfo::DrawItemIconForSlot cash tag overlay — small "CASH" indicator
        drawn in the bottom-right corner of cash items. Loaded from UIWindow2.img/Item/cash
        or similar WZ path. Returns null if the cash tag asset isn't available. */
    GetCashTag(): Sprite | null;
    /** Pet icon from `Item.wz/Pet/<id:D8>.img/info/icon`. Pets live in their own
        `Pet` folder (NOT under `Cash`), so the character-profile pet row needs
        this dedicated lookup. Cached per id (misses too). */
    LoadPetIcon(templateId: number): WzSprite | null;
    /** Parsed item attributes for the tooltip (requirements + bonuses), read from the
        item's `info` node. Equips -> Character.wz; consumables/etc -> Item.wz. Returns
        null when the item has no info node (caller shows just the name). Cached per id (misses too). */
    LoadAttr(itemId: number): ItemAttr | null;
    /**
     * Attach the decoded instance values used by the equip tooltip. WZ data is
     * immutable and cached by item id; this overlay is deliberately separate so
     * two instances of the same item do not rewrite the template attributes.
     */
    SetRuntimeItem(item: InventoryItem): void;
    /** Attach decoded equip fields while preserving the existing LoadAttr API. */
    SetRuntimeEquip(itemId: number, equip: EquipStats, attribute?: number): void;
    ClearRuntimeItem(itemId: number): void;
    private _withRuntime;
    private _growthNextExp;
    private static _maxLevel;
    private _infoNode;
    private _loadEquipIcon;
    private _loadItemIcon;
    private _resolve;
    private static _category;
}
/**
Parsed item attributes for the tooltip (a subset of the WZ `info` node):
requirements + stat bonuses. Stat values are the item's base WZ values.
*/
export interface ItemAttr {
    IsEquip: boolean;
    Category: number;
    ReqLevel: number;
    ReqStr: number;
    ReqDex: number;
    ReqInt: number;
    ReqLuk: number;
    ReqFame: number;
    ReqJob: number;
    IncStr: number;
    IncDex: number;
    IncInt: number;
    IncLuk: number;
    IncPad: number;
    IncMad: number;
    IncPdd: number;
    IncMdd: number;
    IncMhp: number;
    IncMmp: number;
    IncAcc: number;
    IncEva: number;
    IncSpeed: number;
    IncJump: number;
    IncMHPr: number;
    IncMMPr: number;
    IncCraft: number;
    Knockback: number;
    AttackSpeed: number;
    Upgrades: number;
    Price: number;
    Cash: boolean;
    Only: boolean;
    SetItemId: number;
    ProtectionType?: number;
    Durability?: number;
    DurabilityMax?: number;
    Level?: number;
    MaxLevel?: number;
    StarForce?: number;
    Exp?: number;
    expPct?: number;
    Ruc?: number;
    CUC?: number;
    Iuc?: number;
    Option1?: number;
    Option2?: number;
    Option3?: number;
    Socket1?: number;
    Socket2?: number;
    Attribute?: number;
}
//# sourceMappingURL=ItemIconLoader.d.ts.map