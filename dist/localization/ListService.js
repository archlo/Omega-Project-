import { WzProperty } from '../wz/WzProperty.js';
import { WzImage } from '../wz/WzImage.js';
export class ListService {
    _equip = null;
    _use = null;
    _setup = null;
    _etc = null;
    _cash = null;
    _npc = null;
    _mob = null;
    _map = null;
    _skill = null;
    constructor(listWz) {
        if (!listWz)
            return;
        this._equip = this._openSub(listWz, 'Equip');
        this._use = this._openSub(listWz, 'Use');
        this._setup = this._openSub(listWz, 'Setup');
        this._etc = this._openSub(listWz, 'Etc');
        this._cash = this._openSub(listWz, 'Cash');
        this._npc = this._openSub(listWz, 'Npc');
        this._mob = this._openSub(listWz, 'Mob');
        this._map = this._openSub(listWz, 'Map');
        this._skill = this._openSub(listWz, 'Skill');
    }
    _openSub(wz, name) {
        try {
            const sub = wz.GetItem(name + '.img');
            if (sub instanceof WzImage)
                return { GetItem: (id) => sub.Root?.Get(id) ?? null };
        }
        catch { /* skip */ }
        return null;
    }
    GetItemName(itemId) {
        const cat = this._categoryOf(itemId);
        if (!cat)
            return '';
        const strId = itemId.toString();
        const node = cat.GetItem(strId);
        if (node instanceof WzImage) {
            const nameNode = node.Root?.Get('name');
            if (typeof nameNode === 'string')
                return nameNode;
        }
        if (node instanceof WzProperty) {
            const nameNode = node.Get('name');
            if (typeof nameNode === 'string')
                return nameNode;
        }
        return '';
    }
    GetMobName(templateId) {
        if (!this._mob)
            return '';
        return this._getNameFrom(this._mob, templateId);
    }
    GetNpcName(templateId) {
        if (!this._npc)
            return '';
        return this._getNameFrom(this._npc, templateId);
    }
    GetMapName(mapId) {
        if (!this._map)
            return '';
        return this._getNameFrom(this._map, mapId);
    }
    GetSkillName(skillId) {
        if (!this._skill)
            return '';
        return this._getNameFrom(this._skill, skillId);
    }
    _getNameFrom(wz, id) {
        const strId = id.toString();
        const node = wz.GetItem(strId);
        if (node instanceof WzImage) {
            const nameNode = node.Root?.Get('name');
            if (typeof nameNode === 'string')
                return nameNode;
        }
        if (node instanceof WzProperty) {
            const nameNode = node.Get('name');
            if (typeof nameNode === 'string')
                return nameNode;
        }
        return '';
    }
    _categoryOf(itemId) {
        const prefix = Math.floor(itemId / 1000000);
        if (prefix === 1)
            return this._equip;
        if (prefix === 2)
            return this._use;
        if (prefix === 3)
            return this._setup;
        if (prefix === 4)
            return this._etc;
        if (prefix >= 5)
            return this._cash;
        return this._etc;
    }
}
//# sourceMappingURL=ListService.js.map