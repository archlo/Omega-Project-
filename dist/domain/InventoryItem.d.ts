export declare const enum InvItemType {
    Equip = 1,
    Bundle = 2,
    Pet = 3
}
export declare const enum InventoryType {
    Equipped = 0,
    Equip = 1,
    Consume = 2,
    Install = 3,
    Etc = 4,
    Cash = 5
}
export declare class InventoryItem {
    itemId: number;
    type: InvItemType;
    cash: boolean;
    itemSn: bigint;
    dateExpire: bigint;
    quantity: number;
    title: string;
    attribute: number;
    equip: EquipStats | null;
    petName: string;
    petSkill: number;
    petLevel: number;
    petTameness: number;
    petRepleteness: number;
    petRemainLife: number;
}
export declare class EquipStats {
    ruc: number;
    cuc: number;
    incStr: number;
    incDex: number;
    incInt: number;
    incLuk: number;
    incMhp: number;
    incMmp: number;
    incPad: number;
    incMad: number;
    incPdd: number;
    incMdd: number;
    incAcc: number;
    incEva: number;
    craft: number;
    incSpeed: number;
    incJump: number;
    levelUpType: number;
    level: number;
    exp: number;
    durability: number;
    iuc: number;
    grade: number;
    released: boolean;
    vicious: number;
    option1: number;
    option2: number;
    option3: number;
    socket1: number;
    socket2: number;
    /** Raw GW_ItemSlotEquip attribute flags (protection/karma/etc.). */
    attribute: number;
}
//# sourceMappingURL=InventoryItem.d.ts.map