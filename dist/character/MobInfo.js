export class MobInfo {
    TemplateId = 0;
    Level = 1;
    Exp = 0;
    MaxHp = 1;
    MaxMp = 0;
    Pad = 0;
    Pdr = 0;
    Mad = 0;
    Mdr = 0;
    Acc = 0;
    Eva = 0;
    HpRecovery = 0;
    MpRecovery = 0;
    FixedDamage = 0;
    RemoveAfter = 0;
    DropItemPeriod = 0;
    MoveAbility = 1;
    Speed = 0;
    FlySpeed = 0;
    Fly = false;
    ChaseSpeed = 0;
    BodyAttack = false;
    Pushed = 0;
    Undead = false;
    Boss = false;
    NoFlip = false;
    OnlyNormalAttack = false;
    DamagedByMob = false;
    PickUp = false;
    CannotEvade = false;
    SelfDestruction = false;
    FirstSelfDestruction = false;
    Invincible = false;
    Disable = false;
    NotAttack = false;
    FirstAttack = false;
    HpTagColor = 0;
    HpTagBgColor = 0;
    HpGaugeHide = false;
    UpperMostLayer = false;
    WeaponID = 0;
    AngerGauge = false;
    ChargeCount = 0;
    Category = 0;
    EscortType = 0;
    MobSpeciesCode = '';
    Attacks = new Map();
    Skills = new Map();
    DamagedElemAttr = new Map();
    DamagedBySkill = new Set();
    Revives = [];
    SpeakEntries = [];
    get IsStay() { return this.MoveAbility === 0; }
    get IsFly() { return this.MoveAbility === 4 || this.Fly; }
    get IsJump() { return this.MoveAbility === 3; }
}
//# sourceMappingURL=MobInfo.js.map