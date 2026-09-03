import { CharacterStat } from './CharacterStat.js';
import { AvatarLook } from './AvatarLook.js';
export declare class CharacterEntry {
    stat: CharacterStat;
    look: AvatarLook;
    onFamily: boolean;
    rank?: CharacterRank;
    /** Set only for entries received via ViewAllCharResult (the "view
     *  characters from every world" flow) — each batch is tagged with its
     *  own worldId since the combined list can span multiple worlds.
     *  Undefined for the normal single-world SelectWorldResult flow. */
    worldId?: number;
}
export declare class CharacterRank {
    worldRank: number;
    worldRankMove: number;
    jobRank: number;
    jobRankMove: number;
}
//# sourceMappingURL=CharacterEntry.d.ts.map