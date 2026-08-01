export class MobAttack {
  AttackIndex = 0;

  SkillId      = 0;
  SkillLevel   = 0;
  ConMp        = 0;
  MpBurn       = 0;
  Magic        = false;
  DeadlyAttack = false;

  BulletNumber = 1;
  BulletSpeed  = 0;
  MagicElemAttr = 0;
  JumpAttack   = false;
  KnockBack    = false;
  AttackAfter  = 0;
  EffectAfter  = 0;
  Tremble      = false;
  Rush         = false;
  HitAttach    = false;
  FacingAttach = false;
  Effect       = '';
  Hit          = '';
  Ball         = '';
  AreaWarning  = '';

  // Attack type: 0=melee, 1=target, 2=bullet, 3/4=area
  nType = 0;
  // Attack range rect (relative to mob position)
  rcRange: { left: number; top: number; right: number; bottom: number } | null = null;
  // Bullet speed for type 2 attacks
  nBulletSpeed = 200;

  // TODO_AUDIT.md Thirty-fourth pass: CMob::GetAttackBodyRect/GetMultiBodyRect
  // (real range check behind CMob::IsTargetInAttackRange, 0x645f50) derive
  // the hit rect from this attack's own frame-0 `lt`/`rb` vectors in
  // Mob.wz, not a stored stat. Real coordinates are relative to the mob's
  // own facing-right origin; null when this attack frame carries no
  // lt/rb (rare, falls back to the caller's universal-box default).
  HitRect: { ltx: number; lty: number; rbx: number; rby: number } | null = null;
}
