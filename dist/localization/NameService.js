import { WzImage } from '../wz/WzImage.js';
import { WzProperty } from '../wz/WzProperty.js';
export class NameService {
    static EquipTypes = [
        'Accessory', 'Cap', 'Cape', 'Coat', 'Dragon', 'Face', 'Glove', 'Hair',
        'Longcoat', 'Mechanic', 'Pants', 'PetEquip', 'Ring', 'Shield', 'Shoes',
        'Taming', 'Weapon',
    ];
    _stringWz;
    _questWz;
    _items = null;
    _itemDescs = null;
    _quests = null;
    _maps = null;
    _mapStreets = null;
    _mapNames = null;
    _mobs = null;
    _npcs = null;
    _npcStrings = null;
    _skills = null;
    constructor(stringWzProvider, questWzProvider) {
        this._stringWz = stringWzProvider;
        this._questWz = questWzProvider;
    }
    ItemName(id) { return this._itemsGet().get(id); }
    ItemDesc(id) { return this._itemDescsGet().get(id); }
    SkillName(id) { return this._skillsGet().get(id); }
    MapName(id) { return this._mapsGet().get(id); }
    MapStreetName(id) { return this._mapStreetsGet().get(id); }
    MapShortName(id) { return this._mapNamesGet().get(id); }
    MobName(id) { return this._mobsGet().get(id); }
    NpcName(id) { return this._npcsGet().get(id); }
    QuestName(id) { return this._questsGet().get(id); }
    NpcText(id, key) {
        return this._npcStringsGet().get(id)?.get(key);
    }
    _itemsGet() { return this._items ??= this._loadItemStrings('name'); }
    _itemDescsGet() { return this._itemDescs ??= this._loadItemStrings('desc'); }
    _mapsGet() { return this._maps ??= this._loadMaps(); }
    _mapStreetsGet() { return this._mapStreets ??= this._loadMapStreets(); }
    _mapNamesGet() { return this._mapNames ??= this._loadMapNames(); }
    _mobsGet() { return this._mobs ??= this._loadFlatImage('Mob.img'); }
    _npcsGet() { return this._npcs ??= this._loadNpcs(); }
    _npcStringsGet() { return this._npcStrings ??= this._loadNpcStrings(); }
    _skillsGet() { return this._skills ??= this._loadSkills(); }
    _questsGet() { return this._quests ??= this._loadQuests(); }
    _loadQuests() {
        const dict = new Map();
        const wz = this._questWz?.();
        if (!wz)
            return dict;
        try {
            const image = wz.GetItem('QuestInfo.img');
            if (image instanceof Object && 'Root' in image) {
                this._addNames(image.Root, dict);
            }
        }
        catch (ex) {
            console.warn('NameService: failed loading quest names', ex);
        }
        return dict;
    }
    _loadItemStrings(fieldKey) {
        const dict = new Map();
        const wz = this._stringWz();
        if (!wz)
            return dict;
        try {
            const eqp = wz.GetItem('Eqp.img/Eqp');
            if (eqp instanceof WzProperty) {
                for (const type of NameService.EquipTypes) {
                    const list = eqp.Get(type);
                    if (list instanceof WzProperty)
                        this._addNames(list, dict, fieldKey);
                }
            }
            const etc = wz.GetItem('Etc.img/Etc');
            if (etc instanceof WzProperty)
                this._addNames(etc, dict, fieldKey);
            for (const img of ['Consume.img', 'Ins.img', 'Cash.img', 'Pet.img']) {
                const image = wz.GetItem(img);
                if (image instanceof WzImage)
                    this._addNames(image.Root, dict, fieldKey);
            }
        }
        catch (ex) {
            console.warn('NameService: failed loading item strings', ex);
        }
        return dict;
    }
    _loadMaps() {
        const dict = new Map();
        const wz = this._stringWz();
        if (!wz)
            return dict;
        try {
            const image = wz.GetItem('Map.img');
            if (!(image instanceof WzImage))
                return dict;
            for (const [, typeVal] of Object.entries(image.Root.Items)) {
                if (!(typeVal instanceof WzProperty))
                    continue;
                for (const [key, val] of Object.entries(typeVal.Items)) {
                    const id = parseInt(key, 10);
                    if (isNaN(id) || !(val instanceof WzProperty))
                        continue;
                    const street = val.Get('streetName') ?? '';
                    const name = val.Get('mapName') ?? '';
                    dict.set(id, street.length > 0 ? `${street} : ${name}` : name);
                }
            }
        }
        catch (ex) {
            console.warn('NameService: failed loading map names', ex);
        }
        return dict;
    }
    // OG: CUIMiniMap::Update reads street name and map name separately for title
    _loadMapStreets() {
        const dict = new Map();
        const wz = this._stringWz();
        if (!wz)
            return dict;
        try {
            const image = wz.GetItem('Map.img');
            if (!(image instanceof WzImage))
                return dict;
            for (const [, typeVal] of Object.entries(image.Root.Items)) {
                if (!(typeVal instanceof WzProperty))
                    continue;
                for (const [key, val] of Object.entries(typeVal.Items)) {
                    const id = parseInt(key, 10);
                    if (isNaN(id) || !(val instanceof WzProperty))
                        continue;
                    const street = val.Get('streetName') ?? '';
                    if (street)
                        dict.set(id, street);
                }
            }
        }
        catch (ex) {
            console.warn('NameService: failed loading map street names', ex);
        }
        return dict;
    }
    _loadMapNames() {
        const dict = new Map();
        const wz = this._stringWz();
        if (!wz)
            return dict;
        try {
            const image = wz.GetItem('Map.img');
            if (!(image instanceof WzImage))
                return dict;
            for (const [, typeVal] of Object.entries(image.Root.Items)) {
                if (!(typeVal instanceof WzProperty))
                    continue;
                for (const [key, val] of Object.entries(typeVal.Items)) {
                    const id = parseInt(key, 10);
                    if (isNaN(id) || !(val instanceof WzProperty))
                        continue;
                    const name = val.Get('mapName') ?? '';
                    if (name)
                        dict.set(id, name);
                }
            }
        }
        catch (ex) {
            console.warn('NameService: failed loading map short names', ex);
        }
        return dict;
    }
    _loadNpcs() {
        const dict = new Map();
        const wz = this._stringWz();
        if (!wz)
            return dict;
        try {
            const image = wz.GetItem('Npc.img');
            if (!(image instanceof WzImage))
                return dict;
            for (const [key, val] of Object.entries(image.Root.Items)) {
                const id = parseInt(key, 10);
                if (isNaN(id) || !(val instanceof WzProperty))
                    continue;
                const name = val.Get('name');
                if (name === null)
                    continue;
                const func = val.Get('func');
                dict.set(id, func !== null ? `${name} : ${func}` : name);
            }
        }
        catch (ex) {
            console.warn('NameService: failed loading npc names', ex);
        }
        return dict;
    }
    _loadNpcStrings() {
        const dict = new Map();
        const wz = this._stringWz();
        if (!wz)
            return dict;
        try {
            const image = wz.GetItem('Npc.img');
            if (!(image instanceof WzImage))
                return dict;
            for (const [key, val] of Object.entries(image.Root.Items)) {
                const id = parseInt(key, 10);
                if (isNaN(id) || !(val instanceof WzProperty))
                    continue;
                const sub = new Map();
                for (const [k, v] of Object.entries(val.Items)) {
                    if (typeof v === 'string')
                        sub.set(k, v);
                }
                if (sub.size > 0)
                    dict.set(id, sub);
            }
        }
        catch (ex) {
            console.warn('NameService: failed loading npc strings', ex);
        }
        return dict;
    }
    _loadSkills() {
        const dict = new Map();
        const wz = this._stringWz();
        if (!wz)
            return dict;
        try {
            const image = wz.GetItem('Skill.img');
            if (!(image instanceof WzImage))
                return dict;
            for (const [key, val] of Object.entries(image.Root.Items)) {
                if (key.length < 7)
                    continue;
                const id = parseInt(key, 10);
                if (isNaN(id) || !(val instanceof WzProperty))
                    continue;
                const name = val.Get('name');
                if (name !== null)
                    dict.set(id, name);
            }
        }
        catch (ex) {
            console.warn('NameService: failed loading skill names', ex);
        }
        return dict;
    }
    _loadFlatImage(imagePath) {
        const dict = new Map();
        const wz = this._stringWz();
        if (!wz)
            return dict;
        try {
            const image = wz.GetItem(imagePath);
            if (image instanceof WzImage)
                this._addNames(image.Root, dict);
        }
        catch (ex) {
            console.warn(`NameService: failed loading names from ${imagePath}`, ex);
        }
        return dict;
    }
    _addNames(container, dict, key = 'name') {
        for (const [k, v] of Object.entries(container.Items)) {
            const id = parseInt(k, 10);
            if (!isNaN(id) && v instanceof WzProperty) {
                const name = v.Get(key);
                if (name !== null)
                    dict.set(id, name);
            }
        }
    }
}
//# sourceMappingURL=NameService.js.map