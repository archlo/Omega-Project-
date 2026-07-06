export const enum FuncKeyType {
  None = 0,
  Skill = 1,
  Item = 2,
  Emotion = 3,
  Menu = 4,
  BasicAction = 5,
  BasicMotion = 6,
  Effect = 7,
  MacroSkill = 8,
}

export interface FuncKeyMapped {
  type: FuncKeyType;
  id: number;
}

export const FuncKeyMappedNone: FuncKeyMapped = { type: FuncKeyType.None, id: 0 };

export function funcKeyMappedIsBound(fk: FuncKeyMapped): boolean {
  return fk.type !== FuncKeyType.None;
}
