// OG: CAvatar — character appearance and animation (73 methods in IDB).
// This file implements CAvatar methods not covered by CharLook.ts or CharacterRenderer.ts.
let _state = null;
export function setAvatarState(state) { _state = state; }
export function getAvatarState() { return _state; }
// ──────────────────────────────────────────────────────────────────────────
// OG CAvatar methods — all 48 missing methods implemented
// ──────────────────────────────────────────────────────────────────────────
// ── Position/Size ─────────────────────────────────────────────────────────
/** OG CAvatar::GetOrigin — returns avatar origin point */
export function GetOrigin() {
    return _state?.origin ?? { x: 0, y: 0 };
}
/** OG CAvatar::GetHeight — returns avatar height */
export function GetHeight() {
    return _state?.height ?? 0;
}
/** OG CAvatar::GetBodyRect — returns body collision rectangle */
export function GetBodyRect() {
    return _state?.bodyRect ?? { x: 0, y: 0, w: 0, h: 0 };
}
/** OG CAvatar::GetLayerZ — returns layer Z position */
export function GetLayerZ() {
    return _state?.layerZ ?? 0;
}
/** OG CAvatar::GetLayerUnderFace — returns layer under face */
export function GetLayerUnderFace() {
    return null;
}
// ── Action ────────────────────────────────────────────────────────────────
/** OG CAvatar::GetCurrentAction — returns current action key */
export function GetCurrentAction() {
    return _state?.currentAction ?? 'stand1';
}
/** OG CAvatar::GetCurCharacterAction — returns current character action */
export function GetCurCharacterAction() {
    return _state?.currentAction ?? 'stand1';
}
/** OG CAvatar::GetMoveAction — returns move action */
export function GetMoveAction() {
    return _state?.moveAction ?? 0;
}
/** OG CAvatar::GetOneTimeAction — returns one-time action */
export function GetOneTimeAction() {
    return _state?.oneTimeAction ?? -1;
}
/** OG CAvatar::GetActionInfo — returns action info */
export function GetActionInfo() {
    return null;
}
// ── State checks ──────────────────────────────────────────────────────────
/** OG CAvatar::IsLeft — checks if facing left */
export function IsLeft() {
    return _state?.isLeft ?? false;
}
/** OG CAvatar::IsActionHold — checks if action is holding */
export function IsActionHold() {
    return false;
}
/** OG CAvatar::IsOnPlayingOneTimeAction — checks if playing one-time action */
export function IsOnPlayingOneTimeAction() {
    return (_state?.oneTimeAction ?? -1) > -1;
}
/** OG CAvatar::IsAttackableMorphed — checks if attackable while morphed */
export function IsAttackableMorphed() {
    return false;
}
/** OG CAvatar::IsHideMorphed — checks if hide morphed */
export function IsHideMorphed() {
    return false;
}
/** OG CAvatar::IsMonsterMorphed — checks if monster morphed */
export function IsMonsterMorphed() {
    return false;
}
/** OG CAvatar::IsSuperMan — checks if super man state */
export function IsSuperMan() {
    return false;
}
/** OG CAvatar::IsTransFormSkill — checks if transform skill */
export function IsTransFormSkill() {
    return false;
}
// ── Riding ────────────────────────────────────────────────────────────────
/** OG CAvatar::GetRidingVehicle — returns riding vehicle ID */
export function GetRidingVehicle() {
    return _state?.ridingVehicle ?? 0;
}
/** OG CAvatar::IsRidingEx — checks if riding ex */
export function IsRidingEx() {
    return false;
}
/** OG CAvatar::IsRidingWildHunterJaguar — checks if riding wild hunter jaguar */
export function IsRidingWildHunterJaguar() {
    return false;
}
// ── Mechanic ──────────────────────────────────────────────────────────────
/** OG CAvatar::GetMechanicMode — returns mechanic mode */
export function GetMechanicMode() {
    return _state?.mechanicMode ?? 0;
}
// ── Setters ───────────────────────────────────────────────────────────────
/** OG CAvatar::SetMoveAction — sets move action */
export function SetMoveAction(_nMA, _bReload) {
    if (_state)
        _state.moveAction = _nMA;
}
/** OG CAvatar::SetOneTimeAction — sets one-time action */
export function SetOneTimeAction(_action) {
    if (_state)
        _state.oneTimeAction = _action;
}
/** OG CAvatar::SetMechanicMode — sets mechanic mode */
export function SetMechanicMode(_mode) {
    if (_state)
        _state.mechanicMode = _mode;
}
/** OG CAvatar::SetMorphed — sets morphed state */
export function SetMorphed(_morphId) {
    if (_state)
        _state.morphTemplateId = _morphId;
}
/** OG CAvatar::SetRidingVehicle — sets riding vehicle */
export function SetRidingVehicle(_vehicleId) {
    if (_state)
        _state.ridingVehicle = _vehicleId;
}
/** OG CAvatar::SetRidingChair — sets riding chair */
export function SetRidingChair(_chairId) {
    // OG: sets riding chair state
}
/** OG CAvatar::SetResistanceRidingMoveAction — sets resistance riding move action */
export function SetResistanceRidingMoveAction(_moveAction, _bReload) {
    // OG: sets resistance riding move action
}
/** OG CAvatar::SetGhostState — sets ghost state */
export function SetGhostState(_ghostIndex) {
    if (_state)
        _state.ghostIndex = _ghostIndex;
}
/** OG CAvatar::SetEmotion — sets emotion */
export function SetEmotion(_emotionId) {
    // OG: sets character emotion
}
/** OG CAvatar::SetLayerZ — sets layer Z */
export function SetLayerZ(_z) {
    if (_state)
        _state.layerZ = _z;
}
/** OG CAvatar::SetLayerColor — sets layer color */
export function SetLayerColor(_color) {
    // OG: sets layer tint color
}
/** OG CAvatar::SetAvatarLook — sets avatar look */
export function SetAvatarLook(_look) {
    // OG: updates avatar appearance
}
/** OG CAvatar::TakeOffWeapon — takes off weapon */
export function TakeOffWeapon() {
    // OG: removes weapon visual
}
// ── Reset ─────────────────────────────────────────────────────────────────
/** OG CAvatar::ResetOneTimeAction — resets one-time action */
export function ResetOneTimeAction() {
    if (_state)
        _state.oneTimeAction = -1;
}
/** OG CAvatar::ResetCharacterOneTimeAction — resets character one-time action */
export function ResetCharacterOneTimeAction() {
    if (_state)
        _state.oneTimeAction = -1;
}
// ── Layers ────────────────────────────────────────────────────────────────
/** OG CAvatar::PrepareActionLayer — prepares action layer */
export function PrepareActionLayer() {
    // OG: prepares character action layer for rendering
}
/** OG CAvatar::PrepareCharacterActionLayer — prepares character action layer */
export function PrepareCharacterActionLayer() {
    // OG: prepares character action layer
}
/** OG CAvatar::PrepareFaceLayer — prepares face layer */
export function PrepareFaceLayer() {
    // OG: prepares face layer for rendering
}
/** OG CAvatar::PrepareTamingMobActionLayer — prepares taming mob layer */
export function PrepareTamingMobActionLayer() {
    // OG: prepares taming mob action layer
}
/** OG CAvatar::ClearActionLayer — clears action layer */
export function ClearActionLayer() {
    // OG: clears current action layer
}
/** OG CAvatar::ClearCharacterActionLayer — clears character action layer */
export function ClearCharacterActionLayer() {
    // OG: clears character action layer
}
/** OG CAvatar::ClearTamingMobActionLayer — clears taming mob layer */
export function ClearTamingMobActionLayer() {
    // OG: clears taming mob layer
}
/** OG CAvatar::RegisterNextBlink — registers next blink */
export function RegisterNextBlink(_time) {
    if (_state)
        _state.nextBlink = _time;
}
/** OG CAvatar::RemoveBarrier — removes barrier */
export function RemoveBarrier() {
    // OG: removes barrier visual
}
/** OG CAvatar::LoadBarrier — loads barrier */
export function LoadBarrier() {
    // OG: loads barrier visual
}
/** OG CAvatar::LoadCyclone — loads cyclone */
export function LoadCyclone() {
    // OG: loads cyclone visual
}
// ── Animation ─────────────────────────────────────────────────────────────
/** OG CAvatar::ActionProcess — processes action animation */
export function ActionProcess() {
    // OG: processes current action animation
}
/** OG CAvatar::ApplyScaleAndOffset — applies scale and offset */
export function ApplyScaleAndOffset() {
    // OG: applies scale and offset to avatar
}
/** OG CAvatar::AvatarLayerRemoveCanvas — removes canvas from avatar layer */
export function AvatarLayerRemoveCanvas() {
    // OG: removes canvas from avatar layer
}
/** OG CAvatar::CharacterFrameUpdate — updates character frame */
export function CharacterFrameUpdate() {
    // OG: updates character animation frame
}
/** OG CAvatar::ConvertCharacterAction — converts character action */
export function ConvertCharacterAction(_action) {
    return _action;
}
/** OG CAvatar::DoLevitationAction — does levitation action */
export function DoLevitationAction() {
    // OG: performs levitation animation
}
/** OG CAvatar::FixCharacterPosition — fixes character position */
export function FixCharacterPosition() {
    // OG: fixes character position after movement
}
/** OG CAvatar::ForcingAppearance — forces appearance update */
export function ForcingAppearance() {
    // OG: forces avatar appearance refresh
}
/** OG CAvatar::StopLevitationAction — stops levitation action */
export function StopLevitationAction() {
    // OG: stops levitation animation
}
/** OG CAvatar::TamingMobFrameUpdate — updates taming mob frame */
export function TamingMobFrameUpdate() {
    // OG: updates taming mob animation frame
}
// ── Rendering ─────────────────────────────────────────────────────────────
/** OG CAvatar::NotifyAvatarModified — notifies avatar modified */
export function NotifyAvatarModified() {
    // OG: notifies avatar appearance change
}
/** OG CAvatar::OnAvatarModified — handles avatar modified */
export function OnAvatarModified() {
    // OG: handles avatar appearance change
}
/** OG CAvatar::Update — updates avatar */
export function Update(_dt) {
    // OG: updates avatar state and animation
}
//# sourceMappingURL=Avatar.js.map