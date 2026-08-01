import type { WzPackage } from '../wz/WzPackage.js';
import type { WzProperty } from '../wz/WzProperty.js';

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
export class ItemInfoService {
  // OG maps (thread-safe in C++ via ZFatalSection; TS is single-threaded)
  private _equipItems = new Map<number, EquipItemData>();
  private _bundleItems = new Map<number, BundleItemData>();
  private _setItemInfo = new Map<number, SetItemInfoData>();
  private _coupleChairItems = new Map<number, CoupleChairItemData>();
  private _setItemEffects: SetEffectEntry[] = [];

  // String cache (item name/desc resolved once per id)
  private _nameCache = new Map<number, string>();
  private _descCache = new Map<number, string>();

  constructor(
    private _characterWz: WzPackage | null,
    private _itemWz: WzPackage | null,
  ) {}

  // ─── Item Info Resolution ────────────────────────────────────────────

  /**
   * OG: CItemInfo::GetItemProp (0x5A72A0)
   * Resolves the WZ property node for an item. Equips go to Character.wz,
   * consumables/etc go to Item.wz. Returns null if not found.
   */
  GetItemProp(itemId: number): WzProperty | null {
    const cat = Math.floor(itemId / 1000000);
    if (cat === 1) {
      // Equip → Character.wz/<Category>/<id:D8>.img
      const category = equipCategory(itemId);
      if (!category || !this._characterWz) return null;
      const node = this._characterWz.GetItem(`${category}/${itemId.toString().padStart(8, '0')}.img`);
      return node instanceof Object ? node as WzProperty : null;
    }
    if (cat >= 2 && cat <= 5 && this._itemWz) {
      // Consume/Install/Etc/Cash → Item.wz/<Folder>/<id/10000:D4>.img/<id:D8>
      const folder = itemFolder(cat);
      if (!folder) return null;
      const img = Math.floor(itemId / 10000);
      const node = this._itemWz.GetItem(`${folder}/${img.toString().padStart(4, '0')}.img/${itemId.toString().padStart(8, '0')}`);
      return node instanceof Object ? node as WzProperty : null;
    }
    return null;
  }

  /**
   * OG: CItemInfo::GetItemInfo (0x5A8F20)
   * Returns the 'info' sub-node of an item's WZ property.
   * Special case: 910xxxxx items return the prop directly (no 'info' child).
   */
  GetItemInfo(itemId: number): WzProperty | null {
    const prop = this.GetItemProp(itemId);
    if (!prop) return null;
    // 910xxxxx items (quest delivery) return prop directly
    if (Math.floor(itemId / 10000) === 910) return prop;
    const info = prop.Get('info');
    return info instanceof Object ? info as WzProperty : null;
  }

  // ─── Item Name/Description ───────────────────────────────────────────

  /**
   * OG: CItemInfo::GetItemName (0x5B1640)
   * StringPool key 0x671 for name. Delegates to GetItemString.
   */
  GetItemName(itemId: number): string {
    let cached = this._nameCache.get(itemId);
    if (cached !== undefined) return cached;
    // StringPool key 0x671 = name
    const name = this.GetItemString(itemId, 'name');
    this._nameCache.set(itemId, name);
    return name;
  }

  /**
   * OG: CItemInfo::GetItemDesc (0x5B16E0)
   * StringPool key 0x5D4 for description. Special case: item 1702097 has hardcoded desc.
   */
  GetItemDesc(itemId: number): string {
    let cached = this._descCache.get(itemId);
    if (cached !== undefined) return cached;
    // Hardcoded special case for item 1702097
    if (itemId === 1702097) {
      const desc = 'Can be equipped on #cone-handed sword or two-handed sword.';
      this._descCache.set(itemId, desc);
      return desc;
    }
    // StringPool key 0x5D4 = description
    const desc = this.GetItemString(itemId, 'desc');
    this._descCache.set(itemId, desc);
    return desc;
  }

  /**
   * OG: CItemInfo::GetItemString (0x5A9BC0)
   * Resolves an item's localized string from WZ using a StringPool key.
   * The WZ path is: <itemProp>/<info>/<sKey>/<itemId>
   */
  GetItemString(itemId: number, sKey: string): string {
    const info = this.GetItemInfo(itemId);
    if (!info) return '';
    const node = info.Get(sKey);
    if (typeof node === 'string') return node;
    if (node instanceof Object) {
      // Could be a sub-node with the item ID as key
      const sub = (node as WzProperty).Get(String(itemId));
      if (typeof sub === 'string') return sub;
    }
    return '';
  }

  /**
   * OG: CItemInfo::GetItemTypeName (0x59F140)
   * Returns the localized type name for an item category.
   * StringPool keys: 1=equip(10), 2=consume(6791), 3=install(11),
   * 4=etc(6712), 5=cash(6700).
   */
  GetItemTypeName(itemId: number): string {
    const cat = Math.floor(itemId / 1_000_000);
    // These are the StringPool IDs for each category name
    const typeNames: Record<number, string> = {
      1: 'Equip',    // StringPool 10
      2: 'Use',      // StringPool 6791
      3: 'Setup',    // StringPool 11
      4: 'Etc',      // StringPool 6712
      5: 'Cash',     // StringPool 6700
    };
    return typeNames[cat] ?? 'Error Type';
  }

  // ─── Equip Item Data ─────────────────────────────────────────────────

  /**
   * OG: CItemInfo::GetEquipItem (0x5C0820)
   * Thread-safe lookup in m_mEquipItem map. On miss, loads from WZ via
   * get_equip_data_path → RegisterEquipItemInfo.
   */
  GetEquipItem(itemId: number): EquipItemData | null {
    let cached = this._equipItems.get(itemId);
    if (cached) return cached;
    const data = this._loadEquipItem(itemId);
    if (data) this._equipItems.set(itemId, data);
    return data;
  }

  private _loadEquipItem(itemId: number): EquipItemData | null {
    const info = this.GetItemInfo(itemId);
    if (!info) return null;
    return {
      itemId,
      reqLevel: N(info, 'reqLevel'),
      reqSTR: N(info, 'reqSTR'),
      reqDEX: N(info, 'reqDEX'),
      reqINT: N(info, 'reqINT'),
      reqLUK: N(info, 'reqLUK'),
      reqPOP: N(info, 'reqPOP'),
      reqJob: N(info, 'reqJob'),
      incSTR: N(info, 'incSTR'),
      incDEX: N(info, 'incDEX'),
      incINT: N(info, 'incINT'),
      incLUK: N(info, 'incLUK'),
      incPAD: N(info, 'incPAD'),
      incMAD: N(info, 'incMAD'),
      incPDD: N(info, 'incPDD'),
      incMDD: N(info, 'incMDD'),
      incMHP: N(info, 'incMHP'),
      incMMP: N(info, 'incMMP'),
      incACC: N(info, 'incACC'),
      incEVA: N(info, 'incEVA'),
      incSpeed: N(info, 'incSpeed'),
      incJump: N(info, 'incJump'),
      incMHPr: N(info, 'incMHPr'),
      incMMPr: N(info, 'incMMPr'),
      attackSpeed: N(info, 'attackSpeed'),
      tuc: N(info, 'tuc'),
      price: N(info, 'price'),
      cash: N(info, 'cash') !== 0,
      only: N(info, 'only') !== 0,
      tradeBlock: N(info, 'tradeBlock') !== 0,
      notSale: N(info, 'notSale') !== 0,
      setItemID: N(info, 'setItemID'),
      durability: N(info, 'durability'),
      // Growth item level info (apLevelInfo)
      maxLevel: this._loadMaxLevel(info),
    };
  }

  private _loadMaxLevel(info: WzProperty): number {
    const levelNode = info.Get('level');
    if (!levelNode || typeof levelNode !== 'object') return 0;
    const levelObj = levelNode as Record<string, unknown>;
    let max = 0;
    for (let i = 1; ; i++) {
      if (!(String(i) in levelObj)) break;
      max = i;
    }
    return max;
  }

  // ─── Bundle Item Data ────────────────────────────────────────────────

  /**
   * OG: CItemInfo::GetBundleItem (0x5B5200)
   * Cached map lookup for consumable/etc items.
   */
  GetBundleItem(itemId: number): BundleItemData | null {
    let cached = this._bundleItems.get(itemId);
    if (cached) return cached;
    const data = this._loadBundleItem(itemId);
    if (data) this._bundleItems.set(itemId, data);
    return data;
  }

  private _loadBundleItem(itemId: number): BundleItemData | null {
    const info = this.GetItemInfo(itemId);
    if (!info) return null;
    return {
      itemId,
      desc: this.GetItemDesc(itemId),
      price: N(info, 'price'),
      unitPrice: NF(info, 'unitPrice'),
      slotMax: N(info, 'slotMax'),
      reqLevel: N(info, 'reqLevel'),
      reqJob: N(info, 'reqJob'),
      cash: N(info, 'cash') !== 0,
      tradeBlock: N(info, 'tradeBlock') !== 0,
      notSale: N(info, 'notSale') !== 0,
      expireOnLogout: N(info, 'expireOnLogout') !== 0,
    };
  }

  // ─── Set Item System ─────────────────────────────────────────────────

  /**
   * OG: CItemInfo::GetSetItemInfo (0x721590)
   * Returns the set item info map.
   */
  GetSetItemInfo(): Map<number, SetItemInfoData> {
    return this._setItemInfo;
  }

  /**
   * OG: CItemInfo::RegisterSetItemInfo (0x5AF950)
   * Loads set item data from Item.wz/Special/SetItemInfo.img.
   */
  RegisterSetItemInfo(): void {
    if (!this._itemWz) return;
    const setNode = this._itemWz.GetItem('Special/SetItemInfo.img');
    if (!setNode || typeof setNode !== 'object') return;
    const obj = setNode as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      const setItemId = parseInt(key, 10);
      if (!isFinite(setItemId)) continue;
      const setProp = obj[key];
      if (!setProp || typeof setProp !== 'object') continue;
      const p = setProp as WzProperty;
      const info: SetItemInfoData = {
        setItemId,
        name: S(p, 'name'),
        desc: S(p, 'desc'),
        items: [],
      };
      // Load set items (0, 1, 2, ...)
      const itemsNode = p.Get('Item');
      if (itemsNode && typeof itemsNode === 'object') {
        const itemsObj = itemsNode as Record<string, unknown>;
        for (let i = 0; ; i++) {
          const itemNode = itemsObj[String(i)];
          if (!itemNode || typeof itemNode !== 'object') break;
          const ip = itemNode as WzProperty;
          info.items.push({
            itemId: N(ip, 'id'),
            equippedCount: 0,
          });
        }
      }
      this._setItemInfo.set(setItemId, info);
    }
  }

  /**
   * OG: CItemInfo::RegisterSetItemEffect (0x5ACE40)
   * Loads set effect data from Item.wz/Special/SetItem.img.
   */
  RegisterSetItemEffect(): void {
    if (!this._itemWz) return;
    const setNode = this._itemWz.GetItem('Special/SetItem.img');
    if (!setNode || typeof setNode !== 'object') return;
    const obj = setNode as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      const setItemId = parseInt(key, 10);
      if (!isFinite(setItemId)) continue;
      const setProp = obj[key];
      if (!setProp || typeof setProp !== 'object') continue;
      const p = setProp as WzProperty;
      const entry: SetEffectEntry = {
        setItemId,
        effects: [],
      };
      // Load effects (0, 1, 2, ...) each with item count threshold and stat bonuses
      for (let i = 0; ; i++) {
        const effNode = p.Get(String(i));
        if (!effNode || typeof effNode !== 'object') break;
        const ep = effNode as WzProperty;
        const effect: SetEffectData = {
          itemCount: N(ep, 'itemcount'),
          optionType: N(ep, 'optionType'),
          effect: {
            incSTR: N(ep, 'incSTR'), incDEX: N(ep, 'incDEX'),
            incINT: N(ep, 'incINT'), incLUK: N(ep, 'incLUK'),
            incMHP: N(ep, 'incMHP'), incMMP: N(ep, 'incMMP'),
            incPAD: N(ep, 'incPAD'), incMAD: N(ep, 'incMAD'),
            incPDD: N(ep, 'incPDD'), incMDD: N(ep, 'incMDD'),
            incACC: N(ep, 'incACC'), incEVA: N(ep, 'incEVA'),
            incSpeed: N(ep, 'incSpeed'), incJump: N(ep, 'incJump'),
            incMHPr: N(ep, 'incMHPr'), incMMPr: N(ep, 'incMMPr'),
            armor: N(ep, 'armor'),
            boss: N(ep, 'boss'),
            ignoreTargetDEF: N(ep, 'ignoreTargetDEF'),
            mpConReduce: N(ep, 'mpConReduce'),
            recoveryHP: N(ep, 'recoveryHP'),
            recoveryMP: N(ep, 'recoveryMP'),
          },
        };
        entry.effects.push(effect);
      }
      this._setItemEffects.push(entry);
    }
  }

  /**
   * OG: CItemInfo::GetSetItemEffect (0x594ED0)
   * Counts how many equipped items belong to each set and returns the
   * highest-threshold effect that's met. Returns the set item ID of the
   * completed set, or -1 if no set effects apply.
   */
  GetSetItemEffect(
    hairEquip: number[],
    weaponStickerId: number,
    petIds: number[],
  ): { setItemId: number; effect: SetEffectData['effect'] | null } {
    let bestEffect: SetEffectData['effect'] | null = null;
    let bestSetItemId = -1;

    for (const entry of this._setItemEffects) {
      // Count how many of this set's items are equipped
      const setInfo = this._setItemInfo.get(entry.setItemId);
      if (!setInfo) continue;

      let count = 0;
      for (const setItem of setInfo.items) {
        if (setItem.itemId === 0) continue;
        // Check if this item is in the equipped list
        for (const equippedId of hairEquip) {
          if (equippedId === setItem.itemId) {
            count++;
            break;
          }
        }
      }

      // Find the highest effect threshold that's met
      for (const effect of entry.effects) {
        if (count >= effect.itemCount) {
          bestEffect = effect.effect;
          bestSetItemId = entry.setItemId;
        }
      }
    }

    return { setItemId: bestSetItemId, effect: bestEffect };
  }

  // ─── Couple Chair ────────────────────────────────────────────────────

  /**
   * OG: CItemInfo::GetCoupleChairItem (0x94AEF0)
   * Map lookup for couple chair data.
   */
  GetCoupleChairItem(itemId: number): CoupleChairItemData | null {
    return this._coupleChairItems.get(itemId) ?? null;
  }

  /**
   * OG: CItemInfo::RegisterCoupleChairItem (0x5A25B0)
   * Loads couple chair data from WZ.
   */
  RegisterCoupleChairItem(itemId: number, info: WzProperty): void {
    this._coupleChairItems.set(itemId, {
      itemId,
      nDistanceX: N(info, 'distanceX'),
      nDistanceY: N(info, 'distanceY'),
    });
  }

  // ─── Portable Chair ──────────────────────────────────────────────────

  /**
   * OG: CItemInfo::GetPortableChairRecoveryRate (0x5AC750)
   * Reads HP/MP recovery values from the item's info node.
   * bHP=true returns HP recovery, bHP=false returns MP recovery.
   */
  GetPortableChairRecoveryRate(itemId: number, bHP: boolean): number {
    const info = this.GetItemInfo(itemId);
    if (!info) return 0;
    // StringPool 0x6F5 = 'info/recoveryHP' or 'info/recoveryMP'
    const key = bHP ? 'recoveryHP' : 'recoveryMP';
    return N(info, key);
  }

  /**
   * OG: CItemInfo::IsTherePortableChairStatUp (0x5AC8E0)
   * Checks if the item has stat bonus properties (STR/DEX/INT/LUK/PAD/MAD).
   */
  IsTherePortableChairStatUp(itemId: number): boolean {
    const info = this.GetItemInfo(itemId);
    if (!info) return false;
    // StringPool 0x928 = 'info' sub-check for stat bonuses
    return (
      N(info, 'incSTR') > 0 || N(info, 'incDEX') > 0 ||
      N(info, 'incINT') > 0 || N(info, 'incLUK') > 0 ||
      N(info, 'incPAD') > 0 || N(info, 'incMAD') > 0
    );
  }

  // ─── Item Type Checks ────────────────────────────────────────────────

  /**
   * OG: CItemInfo::IsEquipItem (0x4C6320)
   * Item ID category 1xxxxxx = equip item.
   */
  IsEquipItem(itemId: number): boolean {
    return this.GetEquipItem(itemId) !== null;
  }

  /**
   * OG: CItemInfo::IsCashItem (0x5AAF60)
   * Reads StringPool key 0x826 ('cash') from the item's info node.
   */
  IsCashItem(itemId: number): boolean {
    const info = this.GetItemInfo(itemId);
    if (!info) return false;
    // StringPool 0x826 = 'cash'
    return N(info, 'cash') !== 0;
  }

  /**
   * OG: CItemInfo::IsGrowthItem (0x5C39B0)
   * A growth item has level info (maxLevel > 0).
   */
  IsGrowthItem(itemId: number): boolean {
    if (!this.IsEquipItem(itemId)) return false;
    const equip = this.GetEquipItem(itemId);
    return equip !== null && equip.maxLevel > 0;
  }

  /**
   * OG: CItemInfo::GetMaxLevel (0x5C09B0)
   * Returns the max level for a growth item, or 0 if not a growth item.
   */
  GetMaxLevel(itemId: number): number {
    if (!this.IsEquipItem(itemId)) return 0;
    const equip = this.GetEquipItem(itemId);
    return equip?.maxLevel ?? 0;
  }

  /**
   * OG: CItemInfo::GetRequiredLEV (0x5ACA50)
   * Reads StringPool key 0x787 ('reqLEV') from the item's info node.
   */
  GetRequiredLEV(itemId: number): number {
    const info = this.GetItemInfo(itemId);
    if (!info) return 0;
    // StringPool 0x787 = 'reqLEV'
    return N(info, 'reqLEV');
  }

  /**
   * OG: CItemInfo::GetMaxLEV (0x5ACB70)
   * Reads StringPool key 0x788 ('maxLEV') from the item's info node.
   */
  GetMaxLEV(itemId: number): number {
    const info = this.GetItemInfo(itemId);
    if (!info) return 0;
    // StringPool 0x788 = 'maxLEV'
    return N(info, 'maxLEV');
  }

  /**
   * OG: CItemInfo::IsTradeBlockItem (0x5AB5A0)
   * Reads StringPool key 0xCA0 ('tradeBlock') from info node.
   */
  IsTradeBlockItem(itemId: number): boolean {
    const info = this.GetItemInfo(itemId);
    if (!info) return false;
    // StringPool 0xCA0 = 'tradeBlock'
    return N(info, 'tradeBlock') !== 0;
  }

  /**
   * OG: CItemInfo::IsOnlyItem (0x5AB1E0)
   * Reads StringPool key 0xC9F ('only') from info node.
   */
  IsOnlyItem(itemId: number): boolean {
    const info = this.GetItemInfo(itemId);
    if (!info) return false;
    // StringPool 0xC9F = 'only'
    return N(info, 'only') !== 0;
  }

  /**
   * OG: CItemInfo::IsOnlyEquipItem (0x5AB320)
   * Same as IsOnlyItem but only for equip items.
   */
  IsOnlyEquipItem(itemId: number): boolean {
    if (!this.IsEquipItem(itemId)) return false;
    return this.IsOnlyItem(itemId);
  }

  /**
   * OG: CItemInfo::IsNotSaleItem (0x5AB960)
   * Reads 'notSale' from info node.
   */
  IsNotSaleItem(itemId: number): boolean {
    const info = this.GetItemInfo(itemId);
    if (!info) return false;
    return N(info, 'notSale') !== 0;
  }

  /**
   * OG: CItemInfo::IsMsgItem (0x5AAE30)
   * Category 239 = message-type item.
   */
  IsMsgItem(itemId: number): boolean {
    return Math.floor(itemId / 10000) === 239;
  }

  /**
   * OG: CItemInfo::IsNoRevive (0x5AB0A0)
   * Reads 'noRevive' from info node.
   */
  IsNoRevive(itemId: number): boolean {
    const info = this.GetItemInfo(itemId);
    if (!info) return false;
    return N(info, 'noRevive') !== 0;
  }

  /**
   * OG: CItemInfo::IsNoCancelMouse (0x5AB460)
   * Reads 'noCancelMouse' from info node.
   */
  IsNoCancelMouse(itemId: number): boolean {
    const info = this.GetItemInfo(itemId);
    if (!info) return false;
    return N(info, 'noCancelMouse') !== 0;
  }

  /**
   * OG: CItemInfo::IsQuestItem (0x5ABAA0)
   * Category 4xxxxx = quest item.
   */
  IsQuestItem(itemId: number): boolean {
    return Math.floor(itemId / 1_000_000) === 4;
  }

  /**
   * OG: CItemInfo::IsEpicItem (0x5C0970)
   * Epic items have 'desc' in their info node.
   */
  IsEpicItem(itemId: number): boolean {
    const info = this.GetItemInfo(itemId);
    if (!info) return false;
    return typeof info.Get('desc') === 'string';
  }

  // ─── Item Price ──────────────────────────────────────────────────────

  /**
   * OG: CItemInfo::GetItemPrice (0x5AAC90)
   * Returns { price, unitPrice } from the item's info node.
   */
  GetItemPrice(itemId: number): { price: number; unitPrice: number } {
    const info = this.GetItemInfo(itemId);
    if (!info) return { price: 0, unitPrice: 0 };
    return {
      price: N(info, 'price'),
      unitPrice: NF(info, 'unitPrice'),
    };
  }

  /**
   * OG: CItemInfo::GetBulletPAD (0x5AC630)
   * Returns the bullet's attack power from info/bullet/pad.
   */
  GetBulletPAD(itemId: number): number {
    const info = this.GetItemInfo(itemId);
    if (!info) return 0;
    return N(info, 'pad');
  }

  // ─── Special Item Props ──────────────────────────────────────────────

  /**
   * OG: CItemInfo::GetSpecialProp (0x5A6EE0)
   * Returns the special property node. 910xxxxx items use StringPool key
   * 0xB71 to resolve a UOL path; other items use 'info/special'.
   */
  GetSpecialProp(itemId: number): WzProperty | null {
    if (Math.floor(itemId / 10000) === 910) {
      // 910xxxxx items: resolve via StringPool key 0xB71
      const prop = this.GetItemProp(itemId);
      if (!prop) return null;
      // The WZ path is stored as a string property
      const uol = prop.Get('special');
      if (typeof uol === 'string') {
        const resolved = prop.Get(uol);
        return resolved instanceof Object ? resolved as WzProperty : null;
      }
      return null;
    }
    // Regular items: 'info/special' node
    const info = this.GetItemInfo(itemId);
    if (!info) return null;
    const special = info.Get('special');
    return special instanceof Object ? special as WzProperty : null;
  }

  /**
   * OG: CItemInfo::GetSpecialName (0x5A8460)
   * Reads StringPool key 0x671 ('name') from the special prop.
   */
  GetSpecialName(itemId: number): string {
    const special = this.GetSpecialProp(itemId);
    if (!special) return '';
    // StringPool 0x671 = 'name'
    return S(special, 'name');
  }

  /**
   * OG: CItemInfo::GetSpecialDesc (0x5A85B0)
   * Reads 'desc' from the special prop.
   */
  GetSpecialDesc(itemId: number): string {
    const special = this.GetSpecialProp(itemId);
    if (!special) return '';
    return S(special, 'desc');
  }

  /**
   * OG: CItemInfo::GetSpecialIcon (0x5A87B0)
   * Reads StringPool key 0x95B ('icon') from the special prop.
   */
  GetSpecialIcon(itemId: number): number {
    const special = this.GetSpecialProp(itemId);
    if (!special) return 0;
    // StringPool 0x95B = 'icon'
    return N(special, 'icon');
  }

  // ─── Item Quality / Grade ────────────────────────────────────────────

  /**
   * OG: CItemInfo::CalcEquipItemQuality (0x5C2A30)
   * Calculates a quality score for equip items based on stat bonuses.
   * Used to determine the grade frame color.
   */
  CalcEquipItemQuality(itemId: number): number {
    if (!this.IsEquipItem(itemId)) return 0;
    const equip = this.GetEquipItem(itemId);
    if (!equip) return 0;
    // OG: Cash items and taming mobs (190-193, 198) get quality 0
    if (this.IsCashItem(itemId)) return 0;
    const cat = Math.floor(itemId / 10000);
    if ((cat >= 190 && cat <= 193) || cat === 198) return 0;

    let quality = 0;
    quality += equip.incSTR + equip.incDEX + equip.incINT + equip.incLUK;
    quality += equip.incPAD + equip.incMAD;
    quality += equip.incPDD + equip.incMDD;
    quality += Math.floor(equip.incMHP / 10) + Math.floor(equip.incMMP / 10);
    quality += equip.incACC + equip.incEVA;
    quality += equip.incSpeed + equip.incJump;
    return quality;
  }

  // ─── Grade Frame Drawing ─────────────────────────────────────────────

  /**
   * OG: CItemInfo::DrawGradeFrame (0x594D10)
   * Returns the border color for an equip item based on its grade.
   * Grade colors (ARGB):
   *   Released items: grade 1=blue, 2=purple, 3=gold
   *   Non-released: default yellow (-65434 = 0xFFFF0022)
   *
   * Returns null if item has no grade (no border drawn).
   */
  GetGradeColor(itemId: number): number | null {
    if (!this.IsEquipItem(itemId)) return null;
    // OG checks pItem->GetItemGrade(pItem) — we approximate from quality
    const quality = this.CalcEquipItemQuality(itemId);
    if (quality <= 0) return null;
    // OG: Released items get special colors
    // For now, return the default grade color
    return 0xFFFF0022; // Yellow border (default grade)
  }

  // ─── Karma Type ──────────────────────────────────────────────────────

  /**
   * OG: CItemInfo::GetAppliableKarmaType (0x5C09F0)
   * Returns the karma type for an item (determines trading rules).
   */
  GetAppliableKarmaType(itemId: number): number {
    if (this.IsEquipItem(itemId)) {
      const equip = this.GetEquipItem(itemId);
      if (equip?.tradeBlock) return 3; // Untradeable
      if (equip?.cash) return 1; // Cash item
      return 0; // Normal
    }
    const bundle = this.GetBundleItem(itemId);
    if (bundle?.tradeBlock) return 3;
    if (bundle?.cash) return 1;
    return 0;
  }

  // ─── Level Info (Growth Items) ───────────────────────────────────────

  /**
   * OG: CItemInfo::GetLevelInfo (0x5C39D0)
   * Returns level data for a growth item at a specific level.
   */
  GetLevelInfo(itemId: number, level: number): LevelInfoData | null {
    if (!this.IsGrowthItem(itemId)) return null;
    const equip = this.GetEquipItem(itemId);
    if (!equip) return null;
    if (level <= 0 || level > equip.maxLevel) return null;
    // Level info is stored in WZ as 'level/<n>'
    const info = this.GetItemInfo(itemId);
    if (!info) return null;
    const levelNode = info.Get('level');
    if (!levelNode || typeof levelNode !== 'object') return null;
    const levelData = (levelNode as Record<string, unknown>)[String(level)];
    if (!levelData || typeof levelData !== 'object') return null;
    const lp = levelData as WzProperty;
    return {
      level,
      incSTR: N(lp, 'incSTR'), incDEX: N(lp, 'incDEX'),
      incINT: N(lp, 'incINT'), incLUK: N(lp, 'incLUK'),
      incMHP: N(lp, 'incMHP'), incMMP: N(lp, 'incMMP'),
      incPAD: N(lp, 'incPAD'), incMAD: N(lp, 'incMAD'),
      incPDD: N(lp, 'incPDD'), incMDD: N(lp, 'incMDD'),
      incACC: N(lp, 'incACC'), incEVA: N(lp, 'incEVA'),
      incSpeed: N(lp, 'incSpeed'), incJump: N(lp, 'incJump'),
    };
  }

  /**
   * OG: CItemInfo::GetLevelAbilityInfo (0x5C3A60)
   * Returns ability info for a growth item at a specific level and level-up type.
   */
  GetLevelAbilityInfo(itemId: number, level: number, levelUpType: number): LevelAbilityData | null {
    const levelInfo = this.GetLevelInfo(itemId, level);
    if (!levelInfo) return null;
    // Ability data is in the level node under 'ability/<levelUpType>'
    const info = this.GetItemInfo(itemId);
    if (!info) return null;
    const levelNode = info.Get('level');
    if (!levelNode || typeof levelNode !== 'object') return null;
    const levelData = (levelNode as Record<string, unknown>)[String(level)];
    if (!levelData || typeof levelData !== 'object') return null;
    const lp = levelData as WzProperty;
    const abilityNode = lp.Get('ability');
    if (!abilityNode || typeof abilityNode !== 'object') return null;
    const abilityData = (abilityNode as Record<string, unknown>)[String(levelUpType)];
    if (!abilityData || typeof abilityData !== 'object') return null;
    const ap = abilityData as WzProperty;
    return {
      levelUpType,
      incSTR: N(ap, 'incSTR'), incDEX: N(ap, 'incDEX'),
      incINT: N(ap, 'incINT'), incLUK: N(ap, 'incLUK'),
      incMHP: N(ap, 'incMHP'), incMMP: N(ap, 'incMMP'),
      incPAD: N(ap, 'incPAD'), incMAD: N(ap, 'incMAD'),
      incPDD: N(ap, 'incPDD'), incMDD: N(ap, 'incMDD'),
      incACC: N(ap, 'incACC'), incEVA: N(ap, 'incEVA'),
    };
  }

  /**
   * OG: CItemInfo::GetItemPetAbilityFlag — reads dwPetAbilityFlag from item info node.
   * Used by CPet::UpdatePetAbility to determine pet equipment abilities.
   */
  GetPetAbilityFlag(itemId: number): number {
    const info = this.GetItemInfo(itemId);
    if (!info) return 0;
    const petNode = info.Get('pet');
    if (!petNode || typeof petNode !== 'object') return 0;
    const flag = (petNode as WzProperty).Get('dwPetAbilityFlag');
    return typeof flag === 'number' ? flag : 0;
  }

  // ─── Static Helpers ──────────────────────────────────────────────────

  /** Map item ID to Character.wz category folder. */
  static equipCategory(itemId: number): string | null {
    return equipCategory(itemId);
  }
}

// ─── Data Types ──────────────────────────────────────────────────────────

export interface EquipItemData {
  itemId: number;
  reqLevel: number; reqSTR: number; reqDEX: number; reqINT: number; reqLUK: number;
  reqPOP: number; reqJob: number;
  incSTR: number; incDEX: number; incINT: number; incLUK: number;
  incPAD: number; incMAD: number; incPDD: number; incMDD: number;
  incMHP: number; incMMP: number; incACC: number; incEVA: number;
  incSpeed: number; incJump: number;
  incMHPr: number; incMMPr: number;
  attackSpeed: number; tuc: number; price: number;
  cash: boolean; only: boolean; tradeBlock: boolean; notSale: boolean;
  setItemID: number;
  durability: number;
  maxLevel: number;
}

export interface BundleItemData {
  itemId: number;
  desc: string;
  price: number; unitPrice: number;
  slotMax: number;
  reqLevel: number; reqJob: number;
  cash: boolean; tradeBlock: boolean; notSale: boolean;
  expireOnLogout: boolean;
}

export interface SetItemInfoData {
  setItemId: number;
  name: string;
  desc: string;
  items: { itemId: number; equippedCount: number }[];
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
  incSTR: number; incDEX: number; incINT: number; incLUK: number;
  incMHP: number; incMMP: number;
  incPAD: number; incMAD: number;
  incPDD: number; incMDD: number;
  incACC: number; incEVA: number;
  incSpeed: number; incJump: number;
  incMHPr: number; incMMPr: number;
  armor: number; boss: number;
  ignoreTargetDEF: number;
  mpConReduce: number;
  recoveryHP: number; recoveryMP: number;
}

export interface CoupleChairItemData {
  itemId: number;
  nDistanceX: number;
  nDistanceY: number;
}

export interface LevelInfoData {
  level: number;
  incSTR: number; incDEX: number; incINT: number; incLUK: number;
  incMHP: number; incMMP: number;
  incPAD: number; incMAD: number;
  incPDD: number; incMDD: number;
  incACC: number; incEVA: number;
  incSpeed: number; incJump: number;
}

export interface LevelAbilityData {
  levelUpType: number;
  incSTR: number; incDEX: number; incINT: number; incLUK: number;
  incMHP: number; incMMP: number;
  incPAD: number; incMAD: number;
  incPDD: number; incMDD: number;
  incACC: number; incEVA: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function N(p: WzProperty, key: string): number {
  const v = p.Get(key);
  return typeof v === 'number' ? v : 0;
}

function NF(p: WzProperty, key: string): number {
  const v = p.Get(key);
  if (typeof v === 'number') return v;
  if (typeof v === 'bigint') return Number(v);
  return 0;
}

function S(p: WzProperty, key: string): string {
  const v = p.Get(key);
  return typeof v === 'string' ? v : '';
}

function itemFolder(cat: number): string | null {
  switch (cat) {
    case 2: return 'Consume';
    case 3: return 'Install';
    case 4: return 'Etc';
    case 5: return 'Cash';
    default: return null;
  }
}

/** Character.wz folder for an equip id. OG: get_equip_data_path (0x5A6060). */
function equipCategory(itemId: number): string | null {
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
