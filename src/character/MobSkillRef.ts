import type { MobSkillType } from './MobSkillType.js';

export class MobSkillRef {
  constructor(
    public readonly Type: MobSkillType,
    public readonly SkillId: number,
    public readonly Level: number,
  ) {}
}
