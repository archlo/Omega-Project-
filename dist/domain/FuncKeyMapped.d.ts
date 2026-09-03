export declare const enum FuncKeyType {
    None = 0,
    Skill = 1,
    Item = 2,
    Emotion = 3,
    Menu = 4,
    BasicAction = 5,
    BasicMotion = 6,
    Effect = 7,
    MacroSkill = 8
}
export interface FuncKeyMapped {
    type: FuncKeyType;
    id: number;
}
export declare const FuncKeyMappedNone: FuncKeyMapped;
export declare function funcKeyMappedIsBound(fk: FuncKeyMapped): boolean;
//# sourceMappingURL=FuncKeyMapped.d.ts.map