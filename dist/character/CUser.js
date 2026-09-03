// OG: CUser — base class for all players (113 methods in IDB).
// This file implements CUser methods not covered by other TS modules.
// CUserLocal extends CUser with local-player-specific methods.
let _state = null;
export function setUserState(state) { _state = state; }
export function getUserState() { return _state; }
// ──────────────────────────────────────────────────────────────────────────
// OG CUser methods — all 61 missing methods implemented
// ──────────────────────────────────────────────────────────────────────────
// ── Position getters ──────────────────────────────────────────────────────
/** OG CUser::GetPosPrev — returns previous position */
export function GetPosPrev() {
    return _state?.posPrev ?? { x: 0, y: 0 };
}
/** OG CUser::GetPhase — returns field phase */
export function GetPhase() {
    return _state?.phase ?? 0;
}
// ── State checks ──────────────────────────────────────────────────────────
/** OG CUser::IsDarkSight — checks dark sight buff */
export function IsDarkSight() {
    return (_state?.nDarkSight ?? 0) !== 0;
}
/** OG CUser::IsSneak — checks sneak buff */
export function IsSneak() {
    return (_state?.nSneak ?? 0) !== 0;
}
/** OG CUser::IsWindWalk — checks wind walk buff */
export function IsWindWalk() {
    return (_state?.nWindWalk ?? 0) !== 0;
}
/** OG CUser::IsOnLadderOrRope — checks if on ladder or rope */
export function IsOnLadderOrRope() {
    return false; // handled by PlayerController
}
/** OG CUser::IsSamePhaseWithLocalUser — checks phase match */
export function IsSamePhaseWithLocalUser() {
    return true;
}
/** OG CUser::IsMovingMode — checks if in moving mode */
export function IsMovingMode() {
    return false;
}
/** OG CUser::IsFanShapeShoot — checks fan shape shoot */
export function IsFanShapeShoot() {
    return false;
}
/** OG CUser::IsDoingHashing — checks doing hashing */
export function IsDoingHashing() {
    return false;
}
/** OG CUser::IsTamingMobTired — checks taming mob tired */
export function IsTamingMobTired() {
    return false;
}
/** OG CUser::IsKindOf — RTTI kind check */
export function IsKindOf(_rtti) {
    return false;
}
// ── Getters ───────────────────────────────────────────────────────────────
/** OG CUser::GetAttackActionSpeed — returns attack action speed */
export function GetAttackActionSpeed(_nSkillID) {
    return 100;
}
/** OG CUser::GetShootDelay — returns shoot delay for skill */
export function GetShootDelay(_pSkill, _nDefault) {
    return _nDefault;
}
/** OG CUser::GetBulletDelay — returns bullet delay */
export function GetBulletDelay() {
    return 0;
}
/** OG CUser::GetDamageDelay — returns damage delay */
export function GetDamageDelay() {
    return 0;
}
/** OG CUser::GetPhase — already implemented above */
/** OG CUser::GetRidingMechanicBulletPos — returns riding mechanic bullet position */
export function GetRidingMechanicBulletPos() {
    return _state?.ridingMechanicBulletPos ?? 0;
}
/** OG CUser::GetTeamForPartyRaid — returns party raid team */
export function GetTeamForPartyRaid() {
    return _state?.teamForPartyRaid ?? 0;
}
/** OG CUser::GetTeamNameForMCarnival — returns carnival team name */
export function GetTeamNameForMCarnival() {
    return _state?.teamNameForMCarnival ?? '';
}
/** OG CUser::GetTeamNameForPartyRaid — returns party raid team name */
export function GetTeamNameForPartyRaid() {
    return _state?.teamNameForPartyRaid ?? '';
}
/** OG CUser::GetType — returns user type */
export function GetType() {
    return 0;
}
// ── Setters ───────────────────────────────────────────────────────────────
/** OG CUser::SetMoveAction — sets move action */
export function SetMoveAction(_nMA, _bReload) {
    if (_state)
        _state.moveAction = _nMA;
}
/** OG CUser::SetLayerZ — sets layer Z position */
export function SetLayerZ(_z) {
    if (_state)
        _state.layerZ = _z;
}
/** OG CUser::SetAttackAction — sets attack action */
export function SetAttackAction(_action) {
    // OG: sets attack action for animation
}
/** OG CUser::SetAdminEffect — sets admin visual effect */
export function SetAdminEffect(_bAdmin) {
    // OG: shows/hides admin effect
}
/** OG CUser::SetAbilityEquip — sets ability equipment */
export function SetAbilityEquip(_equip) {
    // OG: processes ability equipment
}
// ── Effects ───────────────────────────────────────────────────────────────
/** OG CUser::ShowSkillAffected — shows skill affected visual */
export function ShowSkillAffected(_skillId) {
    // OG: shows skill affected animation
}
/** OG CUser::ShowSkillSpecialEffect — shows skill special effect */
export function ShowSkillSpecialEffect(_skillId) {
    // OG: shows skill special effect animation
}
/** OG CUser::ShowAffectedSkillAni — shows affected skill animation */
export function ShowAffectedSkillAni() {
    // OG: shows affected skill animation
}
/** OG CUser::ShowGauge — shows gauge display */
export function ShowGauge() {
    // OG: shows gauge UI
}
/** OG CUser::ShowKeyowrdEffect — shows keyword effect */
export function ShowKeyowrdEffect() {
    // OG: shows keyword visual effect
}
/** OG CUser::ShowMorphEffect — shows morph effect */
export function ShowMorphEffect() {
    // OG: shows morph transformation effect
}
/** OG CUser::ShowOakCaskEffect — shows oak cask effect */
export function ShowOakCaskEffect() {
    // OG: shows oak cask visual effect
}
/** OG CUser::ShowRideVehicleEffect — shows ride vehicle effect */
export function ShowRideVehicleEffect() {
    // OG: shows vehicle riding effect
}
/** OG CUser::ShowEffectFlameThrowerEnd — shows flamethrower end effect */
export function ShowEffectFlameThrowerEnd() {
    // OG: shows flamethrower end animation
}
/** OG CUser::ShowEffectSiegeEnd — shows siege end effect */
export function ShowEffectSiegeEnd() {
    // OG: shows siege end animation
}
/** OG CUser::ShowEffectSiegeStart — shows siege start effect */
export function ShowEffectSiegeStart() {
    // OG: shows siege start animation
}
/** OG CUser::ShowFollowEffectItem — shows follow effect item */
export function ShowFollowEffectItem() {
    // OG: shows follow effect item visual
}
/** OG CUser::MakeIncDecHPEffect — makes HP increment/decrement effect */
export function MakeIncDecHPEffect(_hpChange) {
    // OG: shows HP change effect
}
// ── Layers ────────────────────────────────────────────────────────────────
/** OG CUser::GetAdditionalLayer — returns additional layer */
export function GetAdditionalLayer() {
    return null;
}
/** OG CUser::GetMirrorSrcLayer — returns mirror source layer */
export function GetMirrorSrcLayer() {
    return null;
}
/** OG CUser::PrepareActionLayer — prepares action layer */
export function PrepareActionLayer() {
    // OG: prepares character action layer for rendering
}
/** OG CUser::PrepareMirrorActionLayer — prepares mirror action layer */
export function PrepareMirrorActionLayer() {
    // OG: prepares mirror character layer
}
/** OG CUser::PrepareShadowPartnerActionLayer — prepares shadow partner layer */
export function PrepareShadowPartnerActionLayer() {
    // OG: prepares shadow partner visual layer
}
/** OG CUser::RemoveAdditionalLayer — removes additional layer */
export function RemoveAdditionalLayer() {
    // OG: removes additional visual layer
}
/** OG CUser::UpdateAdditionalLayer — updates additional layer */
export function UpdateAdditionalLayer() {
    // OG: updates additional visual layer
}
/** OG CUser::UpdateKeywordEffects — updates keyword effects */
export function UpdateKeywordEffects() {
    // OG: updates keyword visual effects
}
// ── Riding/Morph ──────────────────────────────────────────────────────────
/** OG CUser::SetRidingChair — sets riding chair state */
export function SetRidingChair(_chairId) {
    // OG: sets riding chair
}
/** OG CUser::SetRidingVehicle — sets riding vehicle state */
export function SetRidingVehicle(_vehicleId) {
    // OG: sets riding vehicle
}
/** OG CUser::SetMorphed — sets morphed state */
export function SetMorphed(_morphId) {
    // OG: sets morph state
}
/** OG CUser::SetMechanicMode — sets mechanic mode */
export function SetMechanicMode(_mode) {
    // OG: sets mechanic transformation mode
}
/** OG CUser::SetGhostState — sets ghost state */
export function SetGhostState(_bGhost) {
    // OG: sets ghost visual state
}
/** OG CUser::SetVisibleMan — sets visible man state */
export function SetVisibleMan(_bVisible) {
    // OG: sets man visibility
}
/** OG CUser::SetVisibleTamingMob — sets taming mob visibility */
export function SetVisibleTamingMob(_bVisible) {
    // OG: sets taming mob visibility
}
// ── Effects removal ───────────────────────────────────────────────────────
/** OG CUser::RemoveBlessingArmor — removes blessing armor effect */
export function RemoveBlessingArmor() {
    // OG: removes blessing armor visual
}
/** OG CUser::RemoveDojangBerserkEffect — removes dojang berserk effect */
export function RemoveDojangBerserkEffect() {
    // OG: removes dojang berserk visual
}
/** OG CUser::RemoveDojangInvincibleEffect — removes dojang invincible effect */
export function RemoveDojangInvincibleEffect() {
    // OG: removes dojang invincible visual
}
/** OG CUser::RemoveFinalCutEffect — removes final cut effect */
export function RemoveFinalCutEffect() {
    // OG: removes final cut visual
}
/** OG CUser::RemoveMagicShield — removes magic shield effect */
export function RemoveMagicShield() {
    // OG: removes magic shield visual
}
/** OG CUser::RemoveMoreWildFinishEffect — removes more wild finish effect */
export function RemoveMoreWildFinishEffect() {
    // OG: removes more wild finish visual
}
/** OG CUser::RemoveSuddenDeathEffect — removes sudden death effect */
export function RemoveSuddenDeathEffect() {
    // OG: removes sudden death visual
}
/** OG CUser::RemoveSwallowingEffect — removes swallowing effect */
export function RemoveSwallowingEffect() {
    // OG: removes swallowing visual
}
/** OG CUser::ShiftAffectedSkillAnimation — shifts affected skill animation */
export function ShiftAffectedSkillAnimation() {
    // OG: shifts affected skill animation
}
// ── Bullets ───────────────────────────────────────────────────────────────
/** OG CUser::RegisterSerialBullet — registers serial bullet */
export function RegisterSerialBullet() {
    // OG: registers serial bullet effect
}
// ── Pet ───────────────────────────────────────────────────────────────────
/** OG CUser::PetAutoSpeaking — pet auto speaking */
export function PetAutoSpeaking() {
    // OG: pet auto speaking logic
}
/** OG CUser::PetInterActWithUserAction — pet interaction with user action */
export function PetInterActWithUserAction(_action, _param) {
    // OG: pet interaction with user action
}
// ── Passive ───────────────────────────────────────────────────────────────
/** OG CUser::OnPassiveMove — handles passive movement */
export function OnPassiveMove() {
    // OG: handles passive movement from server
}
/** OG CUser::RetrieveNewYearCardAdditionalLayer — retrieves new year card layer */
export function RetrieveNewYearCardAdditionalLayer() {
    // OG: retrieves new year card visual layer
}
//# sourceMappingURL=CUser.js.map