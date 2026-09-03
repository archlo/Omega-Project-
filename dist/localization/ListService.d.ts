import { WzPackage } from '../wz/WzPackage.js';
export declare class ListService {
    private _equip;
    private _use;
    private _setup;
    private _etc;
    private _cash;
    private _npc;
    private _mob;
    private _map;
    private _skill;
    constructor(listWz: WzPackage | null);
    private _openSub;
    GetItemName(itemId: number): string;
    GetMobName(templateId: number): string;
    GetNpcName(templateId: number): string;
    GetMapName(mapId: number): string;
    GetSkillName(skillId: number): string;
    private _getNameFrom;
    private _categoryOf;
}
//# sourceMappingURL=ListService.d.ts.map