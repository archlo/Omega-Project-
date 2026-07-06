import { WzImage } from '../wz/WzImage.js';
import type { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';

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
export class MakeCharInfoProvider {
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

  // section|gender|cat -> id list
  private _options = new Map<string, number[]>();
  // section|gender|type|id -> display name
  private _names = new Map<string, string>();

  constructor(etcWz: WzPackage | null) {
    try { this._load(etcWz); }
    catch (ex) { console.warn('MakeCharInfo load failed', ex); }
  }

  /** Option ids for a category, for the given race section + gender. Falls back
      to the standard "Info" set when a section omits a category. */
  Options(section: string, male: boolean, cat: number): number[] {
    const key = MakeCharInfoProvider._key(section, male, cat);
    const v = this._options.get(key);
    if (v !== undefined && v.length > 0) return v;
    const fb = this._options.get(MakeCharInfoProvider._key('Info', male, cat));
    return fb !== undefined ? fb : [];
  }

  get HasData(): boolean {
    return this._options.size > 0;
  }

  /** UI race id (RaceSelectStage button order) -> MakeCharInfo section.
      Dual=0, Explorer=1, Cygnus=2, Aran=3, Evan=4, Resistance=5. */
  static SectionForRace(uiRace: number): string {
    switch (uiRace) {
      case 5: return 'Resistance';
      case 4: return 'Evan';
      case 3: return 'Orient'; // Aran
      default: return 'Info'; // Explorer, Cygnus, Dual Blade
    }
  }

  private static _key(section: string, male: boolean, cat: number): string {
    return `${section}|${male ? 'M' : 'F'}|${cat}`;
  }

  private _load(etc: WzPackage | null): void {
    if (!etc) return;

    let root: WzProperty | null = null;
    const img = etc.GetItem('MakeCharInfo.img');
    if (img instanceof WzImage) {
      root = img.Root;
    } else {
      const prop = etc.GetItem('MakeCharInfo');
      if (prop instanceof WzProperty) root = prop;
    }
    if (!root) {
      console.log(`[MAKECHAR] MakeCharInfo not found — available root items: ${Object.keys(etc.Root.Items).slice(0, 10).join(', ')}`);
      return;
    }

    for (const section of ['Info', 'Resistance', 'Evan', 'Orient', 'Premium']) {
      this._loadSection(root, section, true);
      this._loadSection(root, section, false);
      this._loadNames(root, section, true);
      this._loadNames(root, section, false);
    }
  }

  private _loadSection(root: WzProperty, section: string, male: boolean): void {
    const gender = male ? 'CharMale' : 'CharFemale';
    let node: WzProperty | null = null;
    if (section === 'Info') {
      const info = root.Get('Info');
      if (info instanceof Object) node = (info as WzProperty).Get(gender) as WzProperty || null;
    } else {
      const raw = root.Get(`${section}${gender}`);
      if (raw instanceof Object) node = raw as WzProperty;
    }
    if (node === null) return;

    for (let cat = 0; cat < MakeCharInfoProvider.CatCount; cat++) {
      const catNode = node.Get(cat.toString());
      if (!(catNode instanceof Object)) continue;
      const ids: number[] = [];
      let i = 0;
      while (true) {
        const raw = (catNode as WzProperty).Get(i.toString());
        if (raw === null || raw === undefined) break;
        if (typeof raw === 'number' || typeof raw === 'bigint') ids.push(Number(raw));
        i++;
      }
      if (ids.length > 0) this._options.set(MakeCharInfoProvider._key(section, male, cat), ids);
    }
  }

  /** Display name for a Name-table entry — type 1 hairStyle (full hair id),
      2 hairColor (color code), 3 skin (skin code); e.g. "Buzz Hair"/"Black"/"Light".
      Falls back to the standard "Info" set. Face/equips have no Name entry (use String.wz). */
  Name(section: string, male: boolean, type: number, id: number): string | null {
    const key = MakeCharInfoProvider._nameKey(section, male, type, id);
    const v = this._names.get(key);
    if (v !== undefined) return v;
    const fb = this._names.get(MakeCharInfoProvider._nameKey('Info', male, type, id));
    return fb !== undefined ? fb : null;
  }

  private static _nameKey(section: string, male: boolean, type: number, id: number): string {
    return `${section}|${male ? 'M' : 'F'}|${type}|${id}`;
  }

  // MakeCharInfo.img/Name/{prefix}Char{Male,Female}/{type}/{id} = display string.
  // prefix: Info -> "" (CharMale); legend sets -> "Evan"/"Resistance"/"Orient"/"Premium".
  private _loadNames(root: WzProperty, section: string, male: boolean): void {
    const nameRoot = root.Get('Name');
    if (!(nameRoot instanceof Object)) return;
    const prefix = section === 'Info' ? '' : section;
    const gender = male ? 'CharMale' : 'CharFemale';
    const node = (nameRoot as WzProperty).Get(`${prefix}${gender}`);
    if (!(node instanceof Object)) return;
    for (const [typeKey, typeVal] of Object.entries((node as WzProperty).Items)) {
      if (!(typeVal instanceof Object)) continue;
      const type = parseInt(typeKey, 10);
      if (isNaN(type)) continue;
      for (const [idKey, idVal] of Object.entries((typeVal as WzProperty).Items)) {
        if (typeof idVal !== 'string') continue;
        const id = parseInt(idKey, 10);
        if (isNaN(id)) continue;
        this._names.set(MakeCharInfoProvider._nameKey(section, male, type, id), idVal);
      }
    }
  }
}
