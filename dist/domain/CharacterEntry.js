export class CharacterEntry {
    stat;
    look;
    onFamily = false;
    rank;
    /** Set only for entries received via ViewAllCharResult (the "view
     *  characters from every world" flow) — each batch is tagged with its
     *  own worldId since the combined list can span multiple worlds.
     *  Undefined for the normal single-world SelectWorldResult flow. */
    worldId;
}
export class CharacterRank {
    worldRank = 0;
    worldRankMove = 0;
    jobRank = 0;
    jobRankMove = 0;
}
//# sourceMappingURL=CharacterEntry.js.map