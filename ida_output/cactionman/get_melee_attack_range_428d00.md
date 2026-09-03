/**
 * CActionMan::GetMeleeAttackRange (0x428d00) — Attack Range Calculation
 *
 * Signature: (sAfterimageUOL, nAction, &rc)
 *
 * Logic:
 *   1. If nAction == 74: hardcoded range (-88,-62,-18,-6)
 *   2. If nAction == 57: remap to 41 (proneStab → swingO1)
 *   3. Look up weapon afterimage by sAfterimageUOL
 *   4. Get range rect from afterimage->arcRange[aAction]
 *   5. If no afterimage data: SetRectEmpty(rc)
 *   6. Release sAfterimageUOL reference
 *
 * The range rectangle defines the attack hitbox in local character coordinates.
 * Used by CUserLocal for mob hit detection during attacks.
 */
export {};
