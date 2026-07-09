import { InPacket } from './InPacket.js';
import { InvItemType, InventoryItem, EquipStats } from '../../domain/InventoryItem.js';

export class ItemDecoder {
  static Decode(p: InPacket): InventoryItem {
    const type = p.readByte() as InvItemType;
    const item = new InventoryItem();
    item.type = type;
    item.itemId = p.readInt();
    const cash = p.readByte();
    item.cash = cash !== 0;
    if (item.cash) {
      item.itemSn = p.readLong();
    }
    item.dateExpire = p.readLong();

    switch (type) {
      case InvItemType.Equip:
        item.equip = ItemDecoder._decodeEquip(p, item);
        if (!item.cash) {
          item.itemSn = p.readLong();
        }
        p.readLong();
        p.readInt();
        break;

      case InvItemType.Pet:
        // GW_ItemSlotPet::RawDecode (decompile/4F5750.c).
        item.petName = p.readString(13);
        item.petLevel = p.readByte();
        item.petTameness = p.readShort();
        item.petRepleteness = p.readByte();
        p.readLong(); // dateDead FILETIME
        p.readShort(); // petAttribute
        item.petSkill = p.readShort();
        item.petRemainLife = p.readInt();
        item.attribute = p.readShort();
        break;

      default:
        item.quantity = p.readShort();
        item.title = p.readString();
        item.attribute = p.readShort();
        if (ItemDecoder._isRechargeable(item.itemId)) {
          item.itemSn = p.readLong();
        }
        break;
    }
    return item;
  }

  private static _decodeEquip(p: InPacket, item: InventoryItem): EquipStats {
    const e = new EquipStats();
    e.ruc = p.readByte();
    e.cuc = p.readByte();
    e.incStr = p.readShort();
    e.incDex = p.readShort();
    e.incInt = p.readShort();
    e.incLuk = p.readShort();
    e.incMhp = p.readShort();
    e.incMmp = p.readShort();
    e.incPad = p.readShort();
    e.incMad = p.readShort();
    e.incPdd = p.readShort();
    e.incMdd = p.readShort();
    e.incAcc = p.readShort();
    e.incEva = p.readShort();
    e.craft = p.readShort();
    e.incSpeed = p.readShort();
    e.incJump = p.readShort();
    item.title = p.readString();
    item.attribute = p.readShort();
    e.levelUpType = p.readByte();
    e.level = p.readByte();
    e.exp = p.readInt();
    e.durability = p.readInt();
    e.iuc = p.readInt();
    // OG: nGrade byte encodes both grade (bits 0-1) and released flag (bit 2).
    // GetItemGrade() = nGrade & 3, IsReleased() = nGrade & 4.
    const rawGrade = p.readByte();
    e.grade = rawGrade & 3;
    e.released = (rawGrade & 4) !== 0;
    e.vicious = p.readByte();
    e.option1 = p.readShort();
    e.option2 = p.readShort();
    e.option3 = p.readShort();
    e.socket1 = p.readShort();
    e.socket2 = p.readShort();
    return e;
  }

  private static _isRechargeable(itemId: number): boolean {
    return Math.floor(itemId / 10000) === 207 || Math.floor(itemId / 10000) === 233;
  }
}
