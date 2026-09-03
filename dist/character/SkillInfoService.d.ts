import type { WzPackage } from '../wz/WzPackage.js';
import { WzCanvas } from '../wz/WzCanvas.js';
export declare class SkillInfo {
    MaxLevel: number;
    Passive: boolean;
    Icon: WzCanvas | null;
    MpCon: number[];
    Cooltime: number[];
    BuffTime: number[];
    /** Per-level tooltip/help text from level/<n>.desc/info/help when present. */
    LevelDescriptions: string[];
    Name: string;
    Description: string;
    SkillType: number;
    Weapon: number;
    SubWeapon: number;
    Invisible: boolean;
    UpButtonDisabled: boolean;
    DefaultMasterLev: number;
    CombatOrders: boolean;
    TimeLimited: number;
    MobCode: number;
    PsdSkill: number;
    AttackElemAttr: number;
    ContinuousEffect: boolean;
    DelayFrame: number;
    HoldFrame: number;
    SpecialAction: number;
    PrepareAction: number;
    PrepareTime: number;
    SkillLVData: boolean;
    /** OG SKILLENTRY::lReqSkill: required skill id -> required level. */
    RequiredSkills: Map<number, number>;
    EffectUOL: string;
    ScreenEffectUOL: string;
    AffectedUOL: string;
    SpecialAffectedUOL: string;
    PrepareUOL: string;
    KeyDownUOL: string;
    KeyDownEndUOL: string;
    HitRootUOL: string;
    BallUOL: string;
    FlipBallUOL: string;
    MobUOL: string;
    TileUOL: string;
    AfterimageUOL: string;
    SpecialUOL: string;
    SummonedUOL: string;
    FinishUOL: string;
    HitUOLs: string[];
    ActionCodes: number[];
    PsdOffsets: Map<number, AdditionPsdData>;
    Common: SkillLevelDataCommon | null;
    Icon0: WzCanvas | null;
    Icon1: WzCanvas | null;
    Icon2: WzCanvas | null;
    MpConAt(level: number): number;
    CooltimeAt(level: number): number;
    BuffTimeAt(level: number): number;
    LevelDescriptionAt(level: number): string;
    private static _at;
}
export declare class AdditionPsdData {
    nWeapon: number;
    nAttack: number;
    nMagicAttack: number;
    nDef: number;
    nHP: number;
    nMP: number;
    nProp: number;
}
export declare class SkillLevelDataCommon {
    SkillType: number;
    Weapon: number;
    SubWeapon: number;
    Attack: number;
    MagicAttack: number;
    Def: number;
    HP: number;
    MP: number;
    ACC: number;
    EVA: number;
    Speed: number;
    Jump: number;
    MpCon: number;
    HpCon: number;
    Duration: number;
    Cooltime: number;
    X: number;
    Y: number;
    AttackCount: number;
    TargetCount: number;
    Damage: number;
    Prop: number;
    MobCount: number;
    Summons: number[];
    LTDamage: number;
    Force: number;
}
export declare class MobSkillEntry {
    SkillID: number;
    Levels: MobSkillLevelData[];
}
export declare class MobSkillLevelData {
    Level: number;
    Effect: number;
    Hp: number;
    Mp: number;
    Prop: number;
    Count: number;
    Sp: number;
    Ta: number;
    Duration: number;
    Interval: number;
    X: number;
    Y: number;
    BuffTime: number;
    Damage: number;
    AttackCount: number;
    TargetCount: number;
    MobCount: number;
    ItemID: number;
    Summons: number[];
    EffectUOL: string;
    HitUOL: string;
    MobUOL: string;
    AffectedUOL: string;
    TileUOL: string;
}
export declare class ItemSkillEntry {
    SkillID: number;
    Levels: ItemSkillLevelData[];
}
export declare class ItemSkillLevelData {
    ConMP: number;
    Duration: number;
    Interval: number;
    Prop: number;
    X: number;
    Y: number;
    MobUOL: string;
}
export declare class SkillCastInfo {
    Actions: string[];
    Effect: unknown;
    Effect0: unknown;
    Screen: unknown;
    Hit: unknown;
    KeyDown: unknown;
    Ball: unknown;
}
export declare class SkillInfoService {
    private readonly _skillWz;
    private readonly _cache;
    private readonly _idsByRoot;
    private readonly _bookIcons;
    private readonly _bookNames;
    private readonly _castCache;
    private readonly _mobSkillCache;
    private readonly _itemSkillCache;
    constructor(skillWz: () => WzPackage | null);
    Get(skillId: number): SkillInfo | null;
    EnumerateSkillIds(root: number): number[];
    GetBookIcon(root: number): WzCanvas | null;
    GetBookName(root: number): string;
    GetRecommendSkill(root: number, totalSp: number): number;
    GetCastInfo(skillId: number): SkillCastInfo | null;
    GetMobSkill(mobSkillId: number): MobSkillEntry | null;
    GetItemSkill(itemSkillId: number): ItemSkillEntry | null;
    private static _readActions;
    private _load;
    private _loadPsdOffsets;
    private _loadLevelDataCommon;
    private _loadMobSkill;
    private _loadItemSkill;
    GetSkillLevel(skillId: number, morph?: number): number;
    private static _isMorphSkill;
    private static _actionCodeFromName;
    private static _readActionCodes;
    private static _readElementAttr;
    private static _d3;
    private static _d7;
    private static _jobItem;
    private static _skillNode;
    private static _getWzNode;
    private static _readInt;
    private static _readStr;
    private static _readIntArray;
    private static _countProps;
}
//# sourceMappingURL=SkillInfoService.d.ts.map