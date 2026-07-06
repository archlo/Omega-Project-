import { CharacterStat } from '../../domain/CharacterStat.js';
import { AvatarLook } from '../../domain/AvatarLook.js';
import { SlotItem } from '../../domain/CharacterData.js';
import { InPacket } from '../packet/InPacket.js';
import { OutPacket } from '../packet/OutPacket.js';

export function IsExtendSpJob(job: number): boolean {
  return Math.floor(job / 1000) === 3 || Math.floor(job / 100) === 22 || job === 2001;
}

export class AvatarCodec {
  static DecodeCharacterStat(p: InPacket): CharacterStat {
    const s = new CharacterStat();
    s.characterId = p.readInt();
    s.name = p.readString(13);
    s.gender = p.readByte();
    s.skin = p.readByte();
    s.face = p.readInt();
    s.hair = p.readInt();
    s.petSn1 = p.readLong();
    s.petSn2 = p.readLong();
    s.petSn3 = p.readLong();
    s.level = p.readByte();
    s.job = p.readShort();
    s.str = p.readShort();
    s.dex = p.readShort();
    s.int = p.readShort();
    s.luk = p.readShort();
    s.hp = p.readInt();
    s.maxHp = p.readInt();
    s.mp = p.readInt();
    s.maxMp = p.readInt();
    s.ap = p.readShort();
    if (IsExtendSpJob(s.job)) {
      const count = p.readByte();
      s.spRaw = new Uint8Array(1 + count * 2);
      s.spRaw[0] = count;
      const sub = p.readBytes(count * 2);
      s.spRaw.set(sub, 1);
    } else {
      const spLow = p.readByte();
      const spHigh = p.readByte();
      s.spRaw = new Uint8Array([spLow, spHigh]);
    }
    s.exp = p.readInt();
    s.pop = p.readShort();
    s.tempExp = p.readInt();
    s.posMap = p.readInt();
    s.portal = p.readByte();
    s.playTime = p.readInt();
    s.subJob = p.readShort();
    return s;
  }

  static DecodeAvatarLook(p: InPacket): AvatarLook {
    const look = new AvatarLook();
    look.gender = p.readByte();
    look.skin = p.readByte();
    look.face = p.readInt();
    p.readByte(); // 0
    look.hair = p.readInt();
    let bp = p.readByte();
    while (bp !== 0xFF) {
      const itemId = p.readInt();
      look.hairEquip.set(bp, itemId);
      bp = p.readByte();
    }
    bp = p.readByte();
    while (bp !== 0xFF) {
      const itemId = p.readInt();
      look.unseenEquip.set(bp, itemId);
      bp = p.readByte();
    }
    look.weaponStickerId = p.readInt();
    for (let i = 0; i < 3; i++) {
      look.petIds[i] = p.readInt();
    }
    return look;
  }

  static PopulateEquipsFromInventory(
    look: AvatarLook,
    equipped: Array<{ pos: number; itemId: number }>,
    equippedCash: Array<{ pos: number; itemId: number }> = [],
  ): void {
    for (const { pos, itemId } of equipped) {
      const bodyPart = pos < 0 ? -pos : pos;
      if (bodyPart <= 0 || bodyPart > 59) continue;
      look.hairEquip.set(bodyPart, itemId);
    }
    for (const { pos, itemId } of equippedCash) {
      const rawBodyPart = pos < 0 ? -pos : pos;
      const bodyPart = rawBodyPart >= 101 && rawBodyPart <= 159 ? rawBodyPart - 100 : rawBodyPart;
      if (bodyPart <= 0 || bodyPart > 59) continue;
      if (bodyPart === 11) {
        look.weaponStickerId = itemId;
        continue;
      }
      const prev = look.hairEquip.get(bodyPart);
      if (prev !== undefined && prev !== itemId) {
        look.unseenEquip.set(bodyPart, prev);
      }
      look.hairEquip.set(bodyPart, itemId);
    }
  }

  static FromCharacterData(stat: CharacterStat, equipped: SlotItem[], equippedCash: SlotItem[]): AvatarLook {
    const look = new AvatarLook();
    look.gender = stat.gender;
    look.skin = stat.skin;
    look.face = stat.face;
    look.hair = stat.hair;
    look.petIds = [stat.petSn1 === 0n ? 0 : Number(stat.petSn1), stat.petSn2 === 0n ? 0 : Number(stat.petSn2), stat.petSn3 === 0n ? 0 : Number(stat.petSn3)];
    AvatarCodec.PopulateEquipsFromInventory(
      look,
      equipped.map(({ slot, item }) => ({ pos: slot, itemId: item.itemId })),
      equippedCash.map(({ slot, item }) => ({ pos: slot, itemId: item.itemId })),
    );
    return look;
  }

  static EncodeAvatarLook(p: OutPacket, look: AvatarLook): void {
    p.writeByte(look.gender);
    p.writeByte(look.skin);
    p.writeInt(look.face);
    p.writeByte(0);
    p.writeInt(look.hair);
    for (const [k, v] of look.hairEquip) {
      p.writeByte(k);
      p.writeInt(v);
    }
    p.writeByte(0xFF);
    for (const [k, v] of look.unseenEquip) {
      p.writeByte(k);
      p.writeInt(v);
    }
    p.writeByte(0xFF);
    p.writeInt(look.weaponStickerId);
    for (let i = 0; i < 3; i++) {
      p.writeInt(look.petIds[i]);
    }
  }
}
