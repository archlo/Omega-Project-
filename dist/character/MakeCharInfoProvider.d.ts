import type { WzPackage } from '../wz/WzPackage.js';
/**
Loads the character-creation appearance option lists from
`Etc.wz/MakeCharInfo.img`. Each option category maps 1:1 to a slot in the
`CreateNewCharacter` packet:
- 0 face, 1 hairBase, 2 hairColor (0/7/3/2 added to hairBase), 3 skin (0–3),
- 4 coat, 5 pants, 6 shoes, 7 weapon.

The standard set is `Info/Char{Male,Female}`; "legend" classes have their own
top-level sets (`ResistanceChar*`, `EvanChar*`, `OrientChar*` for Aran,
`PremiumChar*`).
*/
export declare class MakeCharInfoProvider {
    static readonly CatFace = 0;
    static readonly CatHair = 1;
    static readonly CatHairColor = 2;
    static readonly CatSkin = 3;
    static readonly CatCoat = 4;
    static readonly CatPants = 5;
    static readonly CatShoes = 6;
    static readonly CatWeapon = 7;
    static readonly CatGender = 8;
    static readonly CatCount = 9;
    private _options;
    private _names;
    constructor(etcWz: WzPackage | null);
    /** Option ids for a category, for the given race section + gender. Falls back
        to the standard "Info" set when a section omits a category. */
    Options(section: string, male: boolean, cat: number): number[];
    get HasData(): boolean;
    /** UI race id (RaceSelectStage button order) -> MakeCharInfo section.
        Dual=0, Explorer=1, Cygnus=2, Aran=3, Evan=4, Resistance=5. */
    static SectionForRace(uiRace: number): string;
    private static _key;
    private _load;
    private _loadSection;
    /** Display name for a Name-table entry — type 1 hairStyle (full hair id),
        2 hairColor (color code), 3 skin (skin code); e.g. "Buzz Hair"/"Black"/"Light".
        Falls back to the standard "Info" set. Face/equips have no Name entry (use String.wz). */
    Name(section: string, male: boolean, type: number, id: number): string | null;
    private static _nameKey;
    private _loadNames;
}
//# sourceMappingURL=MakeCharInfoProvider.d.ts.map