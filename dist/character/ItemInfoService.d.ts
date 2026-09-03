import type { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzCanvas } from '../wz/WzCanvas.js';
/**
 * CItemInfo — typed TypeScript port of the OG CItemInfo singleton (196 methods).
 *
 * Handles:
 * - Equip/Bundle item data loading and caching (maps keyed by itemId)
 * - Set item effect calculation (counting equipped set pieces)
 * - Couple chair and portable chair data
 * - Item name/description/string resolution via WZ StringPool keys
 * - Growth item level info (apLevelInfo, abilities)
 * - Item boolean checks (IsCashItem, IsEquipItem, IsTradeBlock, etc.)
 * - Item quality calculation for grade frame colors
 * - Grade frame drawing (1px border based on item grade)
 *
 * Data flows from WZ files (Character.wz for equips, Item.wz for consumables/etc)
 * into cached maps, matching the OG's lazy-load + lock + map-insert pattern.
 */
export declare class ItemInfoService {
    private _characterWz;
    private _itemWz;
    private _tamingMobWz;
    private _morphWz;
    private _etcWz;
    private _skillWz;
    private _equipItems;
    private _bundleItems;
    private _setItemInfo;
    private _coupleChairItems;
    private _setItemEffects;
    private _nameCache;
    private _descCache;
    constructor(_characterWz: WzPackage | null, _itemWz: WzPackage | null, _tamingMobWz?: WzPackage | null, _morphWz?: WzPackage | null, _etcWz?: WzPackage | null, _skillWz?: WzPackage | null);
    /**
     * OG: CItemInfo::GetItemProp (0x5A72A0)
     * Resolves the WZ property node for an item. Equips go to Character.wz,
     * consumables/etc go to Item.wz. Returns null if not found.
     */
    GetItemProp(itemId: number): WzProperty | null;
    /**
     * OG: CItemInfo::GetItemInfo (0x5A8F20)
     * Returns the 'info' sub-node of an item's WZ property.
     * Special case: 910xxxxx items return the prop directly (no 'info' child).
     */
    GetItemInfo(itemId: number): WzProperty | null;
    /**
     * Resolve the canvas selected by CItemInfo::GetItemIcon.
     *
     * Verified v95 keys are info/icon, info/iconRaw, info/iconD and
     * info/iconRawD. The D variants are the pet-dead canvases; ordinary item
     * records simply do not contain them and therefore return null.
     */
    GetItemIconCanvas(itemId: number, variant?: ItemIconCanvasVariant): WzCanvas | null;
    /** Item.wz/Pet/<template>.img/info/{icon|iconRaw|iconD|iconRawD}. */
    GetPetIconCanvas(templateId: number, raw?: boolean, dead?: boolean): WzCanvas | null;
    /** Ring-specific spelling for callers that need the OG ring path contract. */
    GetRingIconCanvas(itemId: number, raw?: boolean): WzCanvas | null;
    /**
     * Skill.wz stores icons under <job:D>.img/skill/<skillId>/icon. The
     * disabled and mouse-over canvases are siblings in the same skill record.
     */
    GetSkillIconCanvas(skillId: number, variant?: SkillIconCanvasVariant): WzCanvas | null;
    /**
     * OG: CItemInfo::GetItemName (0x5B1640)
     * StringPool key 0x671 for name. Delegates to GetItemString.
     */
    GetItemName(itemId: number): string;
    /**
     * OG: CItemInfo::GetItemDesc (0x5B16E0)
     * StringPool key 0x5D4 for description. Special case: item 1702097 has hardcoded desc.
     */
    GetItemDesc(itemId: number): string;
    /**
     * OG: CItemInfo::GetItemString (0x5A9BC0)
     * Resolves an item's localized string from WZ using a StringPool key.
     * The WZ path is: <itemProp>/<info>/<sKey>/<itemId>
     */
    GetItemString(itemId: number, sKey: string): string;
    /**
     * OG: CItemInfo::GetItemTypeName (0x59F140)
     * Returns the localized type name for an item category.
     * StringPool keys: 1=equip(10), 2=consume(6791), 3=install(11),
     * 4=etc(6712), 5=cash(6700).
     */
    GetItemTypeName(itemId: number): string;
    /**
     * OG: CItemInfo::GetEquipItem (0x5C0820)
     * Thread-safe lookup in m_mEquipItem map. On miss, loads from WZ via
     * get_equip_data_path → RegisterEquipItemInfo.
     */
    GetEquipItem(itemId: number): EquipItemData | null;
    private _loadEquipItem;
    private _loadMaxLevel;
    /**
     * OG: CItemInfo::GetBundleItem (0x5B5200)
     * Cached map lookup for consumable/etc items.
     */
    GetBundleItem(itemId: number): BundleItemData | null;
    private _loadBundleItem;
    /**
     * OG: CItemInfo::GetSetItemInfo (0x721590)
     * Returns the set item info map.
     */
    GetSetItemInfo(): Map<number, SetItemInfoData>;
    GetSetItemTooltip(itemId: number): SetItemInfoData | null;
    /**
     * OG: CItemInfo::RegisterSetItemInfo (0x5AF950)
     * Loads set item data from Etc.wz/SetItemInfo.img.
     */
    RegisterSetItemInfo(): void;
    /**
     * OG: CItemInfo::RegisterSetItemEffect (0x5ACE40)
     * Loads set effect data from Item.wz/Special/SetItem.img.
     */
    RegisterSetItemEffect(): void;
    /**
     * OG: CItemInfo::GetSetItemEffect (0x594ED0)
     * Counts how many equipped items belong to each set and returns the
     * highest-threshold effect that's met. Returns the set item ID of the
     * completed set, or -1 if no set effects apply.
     */
    GetSetItemEffect(hairEquip: number[], weaponStickerId: number, petIds: number[]): {
        setItemId: number;
        effect: SetEffectData['effect'] | null;
    };
    /**
     * OG: CItemInfo::GetCoupleChairItem (0x94AEF0)
     * Map lookup for couple chair data.
     */
    GetCoupleChairItem(itemId: number): CoupleChairItemData | null;
    /**
     * OG: CItemInfo::RegisterCoupleChairItem (0x5A25B0)
     * Loads couple chair data from WZ.
     */
    RegisterCoupleChairItem(itemId: number, info: WzProperty): void;
    /**
     * OG: CItemInfo::GetPortableChairRecoveryRate (0x5AC750)
     * Reads HP/MP recovery values from the item's info node.
     * bHP=true returns HP recovery, bHP=false returns MP recovery.
     */
    GetPortableChairRecoveryRate(itemId: number, bHP: boolean): number;
    /**
     * OG: CItemInfo::IsTherePortableChairStatUp (0x5AC8E0)
     * Checks if the item has stat bonus properties (STR/DEX/INT/LUK/PAD/MAD).
     */
    IsTherePortableChairStatUp(itemId: number): boolean;
    /**
     * OG: CItemInfo::IsEquipItem (0x4C6320)
     * Item ID category 1xxxxxx = equip item.
     */
    IsEquipItem(itemId: number): boolean;
    /**
     * OG: CItemInfo::IsCashItem (0x5AAF60)
     * Reads StringPool key 0x826 ('cash') from the item's info node.
     */
    IsCashItem(itemId: number): boolean;
    /**
     * OG: CItemInfo::IsGrowthItem (0x5C39B0)
     * A growth item has level info (maxLevel > 0).
     */
    IsGrowthItem(itemId: number): boolean;
    /**
     * OG: CItemInfo::GetMaxLevel (0x5C09B0)
     * Returns the max level for a growth item, or 0 if not a growth item.
     */
    GetMaxLevel(itemId: number): number;
    /**
     * OG: CItemInfo::GetRequiredLEV (0x5ACA50)
     * Reads StringPool key 0x787 ('reqLEV') from the item's info node.
     */
    GetRequiredLEV(itemId: number): number;
    /**
     * OG: CItemInfo::GetMaxLEV (0x5ACB70)
     * Reads StringPool key 0x788 ('maxLEV') from the item's info node.
     */
    GetMaxLEV(itemId: number): number;
    /**
     * OG: CItemInfo::IsTradeBlockItem (0x5AB5A0)
     * Reads StringPool key 0xCA0 ('tradeBlock') from info node.
     */
    IsTradeBlockItem(itemId: number): boolean;
    /**
     * OG: CItemInfo::IsOnlyItem (0x5AB1E0)
     * Reads StringPool key 0xC9F ('only') from info node.
     */
    IsOnlyItem(itemId: number): boolean;
    /**
     * OG: CItemInfo::IsOnlyEquipItem (0x5AB320)
     * Same as IsOnlyItem but only for equip items.
     */
    IsOnlyEquipItem(itemId: number): boolean;
    /**
     * OG: CItemInfo::IsNotSaleItem (0x5AB960)
     * Reads 'notSale' from info node.
     */
    IsNotSaleItem(itemId: number): boolean;
    /**
     * OG: CItemInfo::IsMsgItem (0x5AAE30)
     * Category 239 = message-type item.
     */
    IsMsgItem(itemId: number): boolean;
    /**
     * OG: CItemInfo::IsNoRevive (0x5AB0A0)
     * Reads 'noRevive' from info node.
     */
    IsNoRevive(itemId: number): boolean;
    /**
     * OG: CItemInfo::IsNoCancelMouse (0x5AB460)
     * Reads 'noCancelMouse' from info node.
     */
    IsNoCancelMouse(itemId: number): boolean;
    /**
     * OG: CItemInfo::IsQuestItem (0x5ABAA0)
     * Category 4xxxxx = quest item.
     */
    IsQuestItem(itemId: number): boolean;
    /**
     * OG: CItemInfo::IsEpicItem (0x5C0970)
     * Epic items have 'desc' in their info node.
     */
    IsEpicItem(itemId: number): boolean;
    /**
     * OG: CItemInfo::GetItemPrice (0x5AAC90)
     * Returns { price, unitPrice } from the item's info node.
     */
    GetItemPrice(itemId: number): {
        price: number;
        unitPrice: number;
    };
    /**
     * OG: CItemInfo::GetBulletPAD (0x5AC630)
     * Returns the bullet's attack power from info/bullet/pad.
     */
    GetBulletPAD(itemId: number): number;
    /**
     * OG: CItemInfo::GetSpecialProp (0x5A6EE0)
     * Returns the special property node. 910xxxxx items use StringPool key
     * 0xB71 to resolve a UOL path; other items use 'info/special'.
     */
    GetSpecialProp(itemId: number): WzProperty | null;
    /**
     * OG: CItemInfo::GetSpecialName (0x5A8460)
     * Reads StringPool key 0x671 ('name') from the special prop.
     */
    GetSpecialName(itemId: number): string;
    /**
     * OG: CItemInfo::GetSpecialDesc (0x5A85B0)
     * Reads 'desc' from the special prop.
     */
    GetSpecialDesc(itemId: number): string;
    /**
     * OG: CItemInfo::GetSpecialIcon (0x5A87B0)
     * Reads StringPool key 0x95B ('icon') from the special prop.
     */
    GetSpecialIcon(itemId: number): number;
    /**
     * OG: CItemInfo::CalcEquipItemQuality (0x5C2A30)
     * Calculates a quality score for equip items based on stat bonuses.
     * Used to determine the grade frame color.
     */
    CalcEquipItemQuality(itemId: number): number;
    /**
     * OG: CItemInfo::DrawGradeFrame (0x594D10)
     * Returns the border color for an equip item based on its grade.
     * Grade colors (ARGB):
     *   Released items: grade 1=blue, 2=purple, 3=gold
     *   Non-released: default yellow (-65434 = 0xFFFF0022)
     *
     * Returns null if item has no grade (no border drawn).
     */
    GetGradeColor(itemId: number): number | null;
    /**
     * OG: CItemInfo::GetAppliableKarmaType (0x5C09F0)
     * Returns the karma type for an item (determines trading rules).
     */
    GetAppliableKarmaType(itemId: number): number;
    /**
     * OG: CItemInfo::GetLevelInfo (0x5C39D0)
     * Returns level data for a growth item at a specific level.
     */
    GetLevelInfo(itemId: number, level: number): LevelInfoData | null;
    /**
     * OG: CItemInfo::GetLevelAbilityInfo (0x5C3A60)
     * Returns ability info for a growth item at a specific level and level-up type.
     */
    GetLevelAbilityInfo(itemId: number, level: number, levelUpType: number): LevelAbilityData | null;
    /**
     * OG: CItemInfo::GetItemPetAbilityFlag — reads dwPetAbilityFlag from item info node.
     * Used by CPet::UpdatePetAbility to determine pet equipment abilities.
     */
    GetPetAbilityFlag(itemId: number): number;
    /**
     * OG: CUserLocal::SetShoeAttr. Returns the movement values supplied by the
     * equipped shoes, mount template, or morph template. The physics consumer
     * remains PlayerController; this service only owns WZ/model resolution.
     */
    GetMovementProfile(shoeItemId: number, vehicleItemId: number, vehicleEquipIds: number[], morphId: number): MovementProfile;
    GetVehicleMovement(vehicleItemId: number, equipItemIds?: number[]): MovementProfile | null;
    private _getTemplate;
    /** Map item ID to Character.wz category folder. */
    static equipCategory(itemId: number): string | null;
}
export interface EquipItemData {
    itemId: number;
    reqLevel: number;
    reqSTR: number;
    reqDEX: number;
    reqINT: number;
    reqLUK: number;
    reqPOP: number;
    reqJob: number;
    incSTR: number;
    incDEX: number;
    incINT: number;
    incLUK: number;
    incPAD: number;
    incMAD: number;
    incPDD: number;
    incMDD: number;
    incMHP: number;
    incMMP: number;
    incACC: number;
    incEVA: number;
    incSpeed: number;
    incJump: number;
    incMHPr: number;
    incMMPr: number;
    attackSpeed: number;
    tuc: number;
    price: number;
    cash: boolean;
    only: boolean;
    tradeBlock: boolean;
    notSale: boolean;
    setItemID: number;
    durability: number;
    maxLevel: number;
    dFs: number;
    nSwim: number;
    niSpeed: number;
    niJump: number;
    tamingMob: number;
}
export type ItemIconCanvasVariant = 'icon' | 'iconRaw' | 'iconD' | 'iconRawD';
export type SkillIconCanvasVariant = 'icon' | 'iconDisabled' | 'iconMouseOver';
export interface MovementProfile {
    speed: number;
    jump: number;
    walkAcc: number;
    walkDrag: number;
    swimSpeedMultiplier: number;
    source: 'shoe' | 'vehicle' | 'morph';
}
export declare function movementProfile(speed: number, jump: number, dFs: number, nSwim: number, source: MovementProfile['source']): MovementProfile;
export interface BundleItemData {
    itemId: number;
    desc: string;
    price: number;
    unitPrice: number;
    slotMax: number;
    reqLevel: number;
    reqJob: number;
    cash: boolean;
    tradeBlock: boolean;
    notSale: boolean;
    expireOnLogout: boolean;
}
export interface SetItemInfoData {
    setItemId: number;
    name: string;
    desc: string;
    items: {
        itemId: number;
        equippedCount: number;
    }[];
    effects: {
        threshold: number;
        effect: SetBonusStats;
    }[];
}
export interface SetEffectEntry {
    setItemId: number;
    effects: SetEffectData[];
}
export interface SetEffectData {
    itemCount: number;
    optionType: number;
    effect: SetBonusStats;
}
export interface SetBonusStats {
    incSTR: number;
    incDEX: number;
    incINT: number;
    incLUK: number;
    incMHP: number;
    incMMP: number;
    incPAD: number;
    incMAD: number;
    incPDD: number;
    incMDD: number;
    incACC: number;
    incEVA: number;
    incCraft?: number;
    nKnockback?: number;
    incSpeed: number;
    incJump: number;
    incMHPr: number;
    incMMPr: number;
    armor: number;
    boss: number;
    ignoreTargetDEF: number;
    mpConReduce: number;
    recoveryHP: number;
    recoveryMP: number;
}
export interface CoupleChairItemData {
    itemId: number;
    nDistanceX: number;
    nDistanceY: number;
}
export interface LevelInfoData {
    level: number;
    incSTR: number;
    incDEX: number;
    incINT: number;
    incLUK: number;
    incMHP: number;
    incMMP: number;
    incPAD: number;
    incMAD: number;
    incPDD: number;
    incMDD: number;
    incACC: number;
    incEVA: number;
    incSpeed: number;
    incJump: number;
}
export interface LevelAbilityData {
    levelUpType: number;
    incSTR: number;
    incDEX: number;
    incINT: number;
    incLUK: number;
    incMHP: number;
    incMMP: number;
    incPAD: number;
    incMAD: number;
    incPDD: number;
    incMDD: number;
    incACC: number;
    incEVA: number;
}
//# sourceMappingURL=ItemInfoService.d.ts.map