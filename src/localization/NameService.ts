import { WzPackage } from '../wz/WzPackage.js';
import { WzImage } from '../wz/WzImage.js';
import { WzProperty } from '../wz/WzProperty.js';

export class NameService {
  private static readonly EquipTypes = [
    'Accessory', 'Cap', 'Cape', 'Coat', 'Dragon', 'Face', 'Glove', 'Hair',
    'Longcoat', 'Mechanic', 'Pants', 'PetEquip', 'Ring', 'Shield', 'Shoes',
    'Taming', 'Weapon',
  ];

  private _stringWz: (() => WzPackage | null);
  private _questWz?: (() => WzPackage | null);

  private _items: Map<number, string> | null = null;
  private _itemDescs: Map<number, string> | null = null;
  private _quests: Map<number, string> | null = null;
  private _maps: Map<number, string> | null = null;
  private _mapStreets: Map<number, string> | null = null;
  private _mapNames: Map<number, string> | null = null;
  private _mobs: Map<number, string> | null = null;
  private _npcs: Map<number, string> | null = null;
  private _npcStrings: Map<number, Map<string, string>> | null = null;
  private _skills: Map<number, string> | null = null;

  constructor(stringWzProvider: () => WzPackage | null, questWzProvider?: () => WzPackage | null) {
    this._stringWz = stringWzProvider;
    this._questWz = questWzProvider;
  }

  ItemName(id: number): string | undefined { return this._itemsGet().get(id); }
  ItemDesc(id: number): string | undefined { return this._itemDescsGet().get(id); }
  SkillName(id: number): string | undefined { return this._skillsGet().get(id); }
  MapName(id: number): string | undefined { return this._mapsGet().get(id); }
  MapStreetName(id: number): string | undefined { return this._mapStreetsGet().get(id); }
  MapShortName(id: number): string | undefined { return this._mapNamesGet().get(id); }
  MobName(id: number): string | undefined { return this._mobsGet().get(id); }
  NpcName(id: number): string | undefined { return this._npcsGet().get(id); }
  QuestName(id: number): string | undefined { return this._questsGet().get(id); }
  NpcText(id: number, key: string): string | undefined {
    return this._npcStringsGet().get(id)?.get(key);
  }

  private _itemsGet(): Map<number, string> { return this._items ??= this._loadItemStrings('name'); }
  private _itemDescsGet(): Map<number, string> { return this._itemDescs ??= this._loadItemStrings('desc'); }
  private _mapsGet(): Map<number, string> { return this._maps ??= this._loadMaps(); }
  private _mapStreetsGet(): Map<number, string> { return this._mapStreets ??= this._loadMapStreets(); }
  private _mapNamesGet(): Map<number, string> { return this._mapNames ??= this._loadMapNames(); }
  private _mobsGet(): Map<number, string> { return this._mobs ??= this._loadFlatImage('Mob.img'); }
  private _npcsGet(): Map<number, string> { return this._npcs ??= this._loadNpcs(); }
  private _npcStringsGet(): Map<number, Map<string, string>> { return this._npcStrings ??= this._loadNpcStrings(); }
  private _skillsGet(): Map<number, string> { return this._skills ??= this._loadSkills(); }
  private _questsGet(): Map<number, string> { return this._quests ??= this._loadQuests(); }

  private _loadQuests(): Map<number, string> {
    const dict = new Map<number, string>();
    const wz = this._questWz?.();
    if (!wz) return dict;
    try {
      const image = wz.GetItem('QuestInfo.img');
      if (image instanceof Object && 'Root' in (image as WzImage)) {
        this._addNames((image as WzImage).Root, dict);
      }
    } catch (ex) {
      console.warn('NameService: failed loading quest names', ex);
    }
    return dict;
  }

  private _loadItemStrings(fieldKey: string): Map<number, string> {
    const dict = new Map<number, string>();
    const wz = this._stringWz();
    if (!wz) return dict;
    try {
      const eqp = wz.GetItem('Eqp.img/Eqp');
      if (eqp instanceof WzProperty) {
        for (const type of NameService.EquipTypes) {
          const list = eqp.Get(type);
          if (list instanceof WzProperty) this._addNames(list, dict, fieldKey);
        }
      }
      const etc = wz.GetItem('Etc.img/Etc');
      if (etc instanceof WzProperty) this._addNames(etc, dict, fieldKey);
      for (const img of ['Consume.img', 'Ins.img', 'Cash.img', 'Pet.img']) {
        const image = wz.GetItem(img);
        if (image instanceof WzImage) this._addNames(image.Root, dict, fieldKey);
      }
    } catch (ex) {
      console.warn('NameService: failed loading item strings', ex);
    }
    return dict;
  }

  private _loadMaps(): Map<number, string> {
    const dict = new Map<number, string>();
    const wz = this._stringWz();
    if (!wz) return dict;
    try {
      const image = wz.GetItem('Map.img');
      if (!(image instanceof WzImage)) return dict;
      for (const [, typeVal] of Object.entries(image.Root.Items)) {
        if (!(typeVal instanceof WzProperty)) continue;
        for (const [key, val] of Object.entries(typeVal.Items)) {
          const id = parseInt(key, 10);
          if (isNaN(id) || !(val instanceof WzProperty)) continue;
          const street = (val.Get('streetName') as string) ?? '';
          const name = (val.Get('mapName') as string) ?? '';
          dict.set(id, street.length > 0 ? `${street} : ${name}` : name);
        }
      }
    } catch (ex) {
      console.warn('NameService: failed loading map names', ex);
    }
    return dict;
  }

  // OG: CUIMiniMap::Update reads street name and map name separately for title
  private _loadMapStreets(): Map<number, string> {
    const dict = new Map<number, string>();
    const wz = this._stringWz();
    if (!wz) return dict;
    try {
      const image = wz.GetItem('Map.img');
      if (!(image instanceof WzImage)) return dict;
      for (const [, typeVal] of Object.entries(image.Root.Items)) {
        if (!(typeVal instanceof WzProperty)) continue;
        for (const [key, val] of Object.entries(typeVal.Items)) {
          const id = parseInt(key, 10);
          if (isNaN(id) || !(val instanceof WzProperty)) continue;
          const street = (val.Get('streetName') as string) ?? '';
          if (street) dict.set(id, street);
        }
      }
    } catch (ex) {
      console.warn('NameService: failed loading map street names', ex);
    }
    return dict;
  }

  private _loadMapNames(): Map<number, string> {
    const dict = new Map<number, string>();
    const wz = this._stringWz();
    if (!wz) return dict;
    try {
      const image = wz.GetItem('Map.img');
      if (!(image instanceof WzImage)) return dict;
      for (const [, typeVal] of Object.entries(image.Root.Items)) {
        if (!(typeVal instanceof WzProperty)) continue;
        for (const [key, val] of Object.entries(typeVal.Items)) {
          const id = parseInt(key, 10);
          if (isNaN(id) || !(val instanceof WzProperty)) continue;
          const name = (val.Get('mapName') as string) ?? '';
          if (name) dict.set(id, name);
        }
      }
    } catch (ex) {
      console.warn('NameService: failed loading map short names', ex);
    }
    return dict;
  }

  private _loadNpcs(): Map<number, string> {
    const dict = new Map<number, string>();
    const wz = this._stringWz();
    if (!wz) return dict;
    try {
      const image = wz.GetItem('Npc.img');
      if (!(image instanceof WzImage)) return dict;
      for (const [key, val] of Object.entries(image.Root.Items)) {
        const id = parseInt(key, 10);
        if (isNaN(id) || !(val instanceof WzProperty)) continue;
        const name = val.Get('name') as string | null;
        if (name === null) continue;
        const func = val.Get('func') as string | null;
        dict.set(id, func !== null ? `${name} : ${func}` : name);
      }
    } catch (ex) {
      console.warn('NameService: failed loading npc names', ex);
    }
    return dict;
  }

  private _loadNpcStrings(): Map<number, Map<string, string>> {
    const dict = new Map<number, Map<string, string>>();
    const wz = this._stringWz();
    if (!wz) return dict;
    try {
      const image = wz.GetItem('Npc.img');
      if (!(image instanceof WzImage)) return dict;
      for (const [key, val] of Object.entries(image.Root.Items)) {
        const id = parseInt(key, 10);
        if (isNaN(id) || !(val instanceof WzProperty)) continue;
        const sub = new Map<string, string>();
        for (const [k, v] of Object.entries(val.Items)) {
          if (typeof v === 'string') sub.set(k, v);
        }
        if (sub.size > 0) dict.set(id, sub);
      }
    } catch (ex) {
      console.warn('NameService: failed loading npc strings', ex);
    }
    return dict;
  }

  private _loadSkills(): Map<number, string> {
    const dict = new Map<number, string>();
    const wz = this._stringWz();
    if (!wz) return dict;
    try {
      const image = wz.GetItem('Skill.img');
      if (!(image instanceof WzImage)) return dict;
      for (const [key, val] of Object.entries(image.Root.Items)) {
        if (key.length < 7) continue;
        const id = parseInt(key, 10);
        if (isNaN(id) || !(val instanceof WzProperty)) continue;
        const name = val.Get('name') as string | null;
        if (name !== null) dict.set(id, name);
      }
    } catch (ex) {
      console.warn('NameService: failed loading skill names', ex);
    }
    return dict;
  }

  private _loadFlatImage(imagePath: string): Map<number, string> {
    const dict = new Map<number, string>();
    const wz = this._stringWz();
    if (!wz) return dict;
    try {
      const image = wz.GetItem(imagePath);
      if (image instanceof WzImage) this._addNames(image.Root, dict);
    } catch (ex) {
      console.warn(`NameService: failed loading names from ${imagePath}`, ex);
    }
    return dict;
  }

  private _addNames(container: WzProperty, dict: Map<number, string>, key = 'name'): void {
    for (const [k, v] of Object.entries(container.Items)) {
      const id = parseInt(k, 10);
      if (!isNaN(id) && v instanceof WzProperty) {
        const name = v.Get(key) as string | null;
        if (name !== null) dict.set(id, name);
      }
    }
  }
}
