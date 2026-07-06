import { CharacterStat } from './CharacterStat.js';
import { AvatarLook } from './AvatarLook.js';

export class CharacterEntry {
  stat!: CharacterStat;
  look!: AvatarLook;
  onFamily = false;
  rank?: CharacterRank;
  /** Set only for entries received via ViewAllCharResult (the "view
   *  characters from every world" flow) — each batch is tagged with its
   *  own worldId since the combined list can span multiple worlds.
   *  Undefined for the normal single-world SelectWorldResult flow. */
  worldId?: number;
}

export class CharacterRank {
  worldRank = 0;
  worldRankMove = 0;
  jobRank = 0;
  jobRankMove = 0;
}
