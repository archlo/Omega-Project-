export class InventoryItem {
    itemId = 0;
    type = 2 /* InvItemType.Bundle */;
    cash = false;
    itemSn = 0n;
    dateExpire = 0n;
    quantity = 1;
    title = '';
    attribute = 0;
    equip = null;
    petName = '';
    petSkill = 0;
    petLevel = 0;
    petTameness = 0;
    petRepleteness = 0;
    petRemainLife = 0;
}
export class EquipStats {
    ruc = 0;
    cuc = 0;
    incStr = 0;
    incDex = 0;
    incInt = 0;
    incLuk = 0;
    incMhp = 0;
    incMmp = 0;
    incPad = 0;
    incMad = 0;
    incPdd = 0;
    incMdd = 0;
    incAcc = 0;
    incEva = 0;
    craft = 0;
    incSpeed = 0;
    incJump = 0;
    levelUpType = 0;
    level = 0;
    exp = 0;
    durability = 0;
    iuc = 0;
    grade = 0;
    released = false;
    vicious = 0;
    option1 = 0;
    option2 = 0;
    option3 = 0;
    socket1 = 0;
    socket2 = 0;
    /** Raw GW_ItemSlotEquip attribute flags (protection/karma/etc.). */
    attribute = 0;
}
//# sourceMappingURL=InventoryItem.js.map