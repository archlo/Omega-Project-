import { CharacterStat } from '../../domain/CharacterStat.js';
import { AvatarLook } from '../../domain/AvatarLook.js';
import { SlotItem } from '../../domain/CharacterData.js';
import { InPacket } from '../packet/InPacket.js';
import { OutPacket } from '../packet/OutPacket.js';
export declare function IsExtendSpJob(job: number): boolean;
export declare class AvatarCodec {
    static DecodeCharacterStat(p: InPacket): CharacterStat;
    static DecodeAvatarLook(p: InPacket): AvatarLook;
    static PopulateEquipsFromInventory(look: AvatarLook, equipped: Array<{
        pos: number;
        itemId: number;
    }>, equippedCash?: Array<{
        pos: number;
        itemId: number;
    }>): void;
    static FromCharacterData(stat: CharacterStat, equipped: SlotItem[], equippedCash: SlotItem[]): AvatarLook;
    static EncodeAvatarLook(p: OutPacket, look: AvatarLook): void;
}
//# sourceMappingURL=AvatarCodec.d.ts.map