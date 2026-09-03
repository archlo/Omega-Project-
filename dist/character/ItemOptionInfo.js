function I(p, key) {
    const v = p.Get(key);
    return typeof v === 'number' ? v : 0;
}
function loadItemOptionLevelData(lv) {
    return {
        prob: I(lv, 'prob'),
        time: I(lv, 'time'),
        niSTR: I(lv, 'str'), niDEX: I(lv, 'dex'), niINT: I(lv, 'int'), niLUK: I(lv, 'luk'),
        niHP: I(lv, 'hp'), niMP: I(lv, 'mp'),
        niMaxHP: I(lv, 'mhp'), niMaxMP: I(lv, 'mmp'),
        niACC: I(lv, 'acc'), niEVA: I(lv, 'eva'),
        niSpeed: I(lv, 'speed'), niJump: I(lv, 'jump'),
        niPAD: I(lv, 'pad'), niMAD: I(lv, 'mad'), niPDD: I(lv, 'pdd'), niMDD: I(lv, 'mdd'),
        niSTRr: I(lv, 'strR'), niDEXr: I(lv, 'dexR'), niINTr: I(lv, 'intR'), niLUKr: I(lv, 'lukR'),
        niMaxHPr: I(lv, 'mhpR'), niMaxMPr: I(lv, 'mmpR'),
        niACCr: I(lv, 'accR'), niEVAr: I(lv, 'evaR'),
        niPADr: I(lv, 'padR'), niMADr: I(lv, 'madR'), niPDDr: I(lv, 'pddR'), niMDDr: I(lv, 'mddR'),
        niCr: I(lv, 'cr'), niCDr: I(lv, 'cdr'), niMAMr: I(lv, 'mamR'),
        niSkill: I(lv, 'skill'), niAllSkill: I(lv, 'allSkill'),
        nRecoveryHP: I(lv, 'recoverHP'), nRecoveryMP: I(lv, 'recoverMP'), nRecoveryUP: I(lv, 'recoverUP'),
        nMPConReduce: I(lv, 'mpConReduce'), nMPConRestore: I(lv, 'mpConRestore'),
        nIgnoreTargetDEF: I(lv, 'ignoreTargetDEF'), nIgnoreDAM: I(lv, 'ignoreDAM'), nIgnoreDAMr: I(lv, 'ignoreDAMr'),
        niDAMr: I(lv, 'damR'), nDAMReflect: I(lv, 'damReflect'),
        nAttackType: I(lv, 'attackType'),
        niMesoProb: I(lv, 'mesoProb'), niRewardProb: I(lv, 'rewardProb'),
        nLevel: I(lv, 'level'),
        nBoss: I(lv, 'boss'),
    };
}
function loadSocketOptionLevelData(lv) {
    return {
        niSTR: I(lv, 'str'), niDEX: I(lv, 'dex'), niINT: I(lv, 'int'), niLUK: I(lv, 'luk'),
        niMaxHP: I(lv, 'mhp'), niMaxMP: I(lv, 'mmp'),
        niACC: I(lv, 'acc'), niEVA: I(lv, 'eva'),
        niSpeed: I(lv, 'speed'), niJump: I(lv, 'jump'),
        niPAD: I(lv, 'pad'), niMAD: I(lv, 'mad'), niPDD: I(lv, 'pdd'), niMDD: I(lv, 'mdd'),
    };
}
export class ItemOptionLoader {
    _itemWz;
    _optionCache = new Map();
    _socketCache = new Map();
    constructor(_itemWz) {
        this._itemWz = _itemWz;
    }
    loadItemOption(nItemOptionID) {
        let cached = this._optionCache.get(nItemOptionID);
        if (cached !== undefined)
            return cached;
        const entry = this._loadItemOption(nItemOptionID);
        this._optionCache.set(nItemOptionID, entry);
        return entry;
    }
    loadSocketOption(nSocketOptionID) {
        let cached = this._socketCache.get(nSocketOptionID);
        if (cached !== undefined)
            return cached;
        const entry = this._loadSocketOption(nSocketOptionID);
        this._socketCache.set(nSocketOptionID, entry);
        return entry;
    }
    _loadItemOption(nItemOptionID) {
        if (!this._itemWz)
            return null;
        const node = this._itemWz.GetItem(`ItemOption/${nItemOptionID.toString().padStart(6, '0')}`);
        if (!node || typeof node !== 'object' || Array.isArray(node))
            return null;
        const p = node;
        const nReqLevel = I(p, 'reqLevel');
        const nOptionType = I(p, 'optionType');
        const levelProp = p.Get('level');
        if (!levelProp || typeof levelProp !== 'object' || Array.isArray(levelProp)) {
            return { nItemOptionID, nReqLevel, nOptionType, aLevelData: [] };
        }
        const levels = [];
        const lvObj = levelProp;
        for (let i = 0;; i++) {
            const lv = lvObj[String(i)];
            if (!lv || typeof lv !== 'object')
                break;
            levels.push(loadItemOptionLevelData(lv));
        }
        return { nItemOptionID, nReqLevel, nOptionType, aLevelData: levels };
    }
    _loadSocketOption(nSocketOptionID) {
        if (!this._itemWz)
            return null;
        const node = this._itemWz.GetItem(`SocketOption/${nSocketOptionID.toString().padStart(6, '0')}`);
        if (!node || typeof node !== 'object' || Array.isArray(node))
            return null;
        const p = node;
        const levelProp = p.Get('level');
        if (!levelProp || typeof levelProp !== 'object' || Array.isArray(levelProp)) {
            return { nSocketOptionID, aLevelData: [] };
        }
        const levels = [];
        const lvObj = levelProp;
        for (let i = 0;; i++) {
            const lv = lvObj[String(i)];
            if (!lv || typeof lv !== 'object')
                break;
            levels.push(loadSocketOptionLevelData(lv));
        }
        return { nSocketOptionID, aLevelData: levels };
    }
}
//# sourceMappingURL=ItemOptionInfo.js.map