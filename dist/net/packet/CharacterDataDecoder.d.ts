import { InPacket } from './InPacket.js';
import { CharacterData } from '../../domain/CharacterData.js';
/**
 * CharacterData::Decode (decompile/4FCCE0.c), `bBackwardUpdate` always false
 * for live network decode (that parameter only gates internal cash-item-SN
 * memory bookkeeping that never touches the packet — confirmed by grepping
 * every `CInPacket::Decode*` call site in the function and finding none
 * inside any `if (bBackwardUpdate)` block).
 *
 * Field-for-field order and types cross-verified against
 * kinoko-main/src/main/java/kinoko/world/user/CharacterData.java's
 * `encodeCharacterData` and DBChar.java's flag bit table. Stops after
 * MAPTRANSFER — see CharacterData's class doc for why.
 */
export declare class CharacterDataDecoder {
    static Decode(p: InPacket): CharacterData;
}
//# sourceMappingURL=CharacterDataDecoder.d.ts.map