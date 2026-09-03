import type { WzPackage } from '../wz/WzPackage.js';
import { MobInfo } from './MobInfo.js';
export declare class MobInfoService {
    private readonly _mobWz;
    private readonly _cache;
    constructor(mobWz: WzPackage | null);
    Get(templateId: number): MobInfo;
    private _parse;
    private static _readInt;
    private static _readBool;
    private static _readStr;
    private static _readHitRect;
    private static _isMobSkillType;
}
//# sourceMappingURL=MobInfoService.d.ts.map