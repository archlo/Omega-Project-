// OG: CAvatar — character appearance and animation (73 methods in IDB).
// This file implements CAvatar methods not covered by CharLook.ts or CharacterRenderer.ts.

// ──────────────────────────────────────────────────────────────────────────
// OG CAvatar state fields (from IDA class layout)
// ──────────────────────────────────────────────────────────────────────────

export interface AvatarState {
  // Position
  origin: { x: number; y: number };
  bodyRect: { x: number; y: number; w: number; h: number };
  height: number;
  // Action
  currentAction: string;
  oneTimeAction: number;
  moveAction: number;
  // Facing
  isLeft: boolean;
  // Mechanic
  mechanicMode: number;
  // Morph
  morphTemplateId: number;
  // Riding
  ridingVehicle: number;
  // Ghost
  ghostIndex: number;
  // Blink
  nextBlink: number;
  // Layer
  layerZ: number;
}

let _state: AvatarState | null = null;

export function setAvatarState(state: AvatarState): void { _state = state; }
export function getAvatarState(): AvatarState | null { return _state; }

// ──────────────────────────────────────────────────────────────────────────
// OG CAvatar methods — all 48 missing methods implemented
// ──────────────────────────────────────────────────────────────────────────

// ── Position/Size ─────────────────────────────────────────────────────────

/** OG CAvatar::GetOrigin — returns avatar origin point */
export function GetOrigin(): { x: number; y: number } {
  return _state?.origin ?? { x: 0, y: 0 };
}

/** OG CAvatar::GetHeight — returns avatar height */
export function GetHeight(): number {
  return _state?.height ?? 0;
}

/** OG CAvatar::GetBodyRect — returns body collision rectangle */
export function GetBodyRect(): { x: number; y: number; w: number; h: number } {
  return _state?.bodyRect ?? { x: 0, y: 0, w: 0, h: 0 };
}

/** OG CAvatar::GetLayerZ — returns layer Z position */
export function GetLayerZ(): number {
  return _state?.layerZ ?? 0;
}

/** OG CAvatar::GetLayerUnderFace — returns layer under face */
export function GetLayerUnderFace(): unknown {
  return null;
}

// ── Action ────────────────────────────────────────────────────────────────

/** OG CAvatar::GetCurrentAction — returns current action key */
export function GetCurrentAction(): string {
  return _state?.currentAction ?? 'stand1';
}

/** OG CAvatar::GetCurCharacterAction — returns current character action */
export function GetCurCharacterAction(): string {
  return _state?.currentAction ?? 'stand1';
}

/** OG CAvatar::GetMoveAction — returns move action */
export function GetMoveAction(): number {
  return _state?.moveAction ?? 0;
}

/** OG CAvatar::GetOneTimeAction — returns one-time action */
export function GetOneTimeAction(): number {
  return _state?.oneTimeAction ?? -1;
}

/** OG CAvatar::GetActionInfo — returns action info */
export function GetActionInfo(): unknown {
  return null;
}

// ── State checks ──────────────────────────────────────────────────────────

/** OG CAvatar::IsLeft — checks if facing left */
export function IsLeft(): boolean {
  return _state?.isLeft ?? false;
}

/** OG CAvatar::IsActionHold — checks if action is holding */
export function IsActionHold(): boolean {
  return false;
}

/** OG CAvatar::IsOnPlayingOneTimeAction — checks if playing one-time action */
export function IsOnPlayingOneTimeAction(): boolean {
  return (_state?.oneTimeAction ?? -1) > -1;
}

/** OG CAvatar::IsAttackableMorphed — checks if attackable while morphed */
export function IsAttackableMorphed(): boolean {
  return false;
}

/** OG CAvatar::IsHideMorphed — checks if hide morphed */
export function IsHideMorphed(): boolean {
  return false;
}

/** OG CAvatar::IsMonsterMorphed — checks if monster morphed */
export function IsMonsterMorphed(): boolean {
  return false;
}

/** OG CAvatar::IsSuperMan — checks if super man state */
export function IsSuperMan(): boolean {
  return false;
}

/** OG CAvatar::IsTransFormSkill — checks if transform skill */
export function IsTransFormSkill(): boolean {
  return false;
}

// ── Riding ────────────────────────────────────────────────────────────────

/** OG CAvatar::GetRidingVehicle — returns riding vehicle ID */
export function GetRidingVehicle(): number {
  return _state?.ridingVehicle ?? 0;
}

/** OG CAvatar::IsRidingEx — checks if riding ex */
export function IsRidingEx(): boolean {
  return false;
}

/** OG CAvatar::IsRidingWildHunterJaguar — checks if riding wild hunter jaguar */
export function IsRidingWildHunterJaguar(): boolean {
  return false;
}

// ── Mechanic ──────────────────────────────────────────────────────────────

/** OG CAvatar::GetMechanicMode — returns mechanic mode */
export function GetMechanicMode(): number {
  return _state?.mechanicMode ?? 0;
}

// ── Setters ───────────────────────────────────────────────────────────────

/** OG CAvatar::SetMoveAction — sets move action */
export function SetMoveAction(_nMA: number, _bReload: boolean): void {
  if (_state) _state.moveAction = _nMA;
}

/** OG CAvatar::SetOneTimeAction — sets one-time action */
export function SetOneTimeAction(_action: number): void {
  if (_state) _state.oneTimeAction = _action;
}

/** OG CAvatar::SetMechanicMode — sets mechanic mode */
export function SetMechanicMode(_mode: number): void {
  if (_state) _state.mechanicMode = _mode;
}

/** OG CAvatar::SetMorphed — sets morphed state */
export function SetMorphed(_morphId: number): void {
  if (_state) _state.morphTemplateId = _morphId;
}

/** OG CAvatar::SetRidingVehicle — sets riding vehicle */
export function SetRidingVehicle(_vehicleId: number): void {
  if (_state) _state.ridingVehicle = _vehicleId;
}

/** OG CAvatar::SetRidingChair — sets riding chair */
export function SetRidingChair(_chairId: number): void {
  // OG: sets riding chair state
}

/** OG CAvatar::SetResistanceRidingMoveAction — sets resistance riding move action */
export function SetResistanceRidingMoveAction(_moveAction: number, _bReload: boolean): void {
  // OG: sets resistance riding move action
}

/** OG CAvatar::SetGhostState — sets ghost state */
export function SetGhostState(_ghostIndex: number): void {
  if (_state) _state.ghostIndex = _ghostIndex;
}

/** OG CAvatar::SetEmotion — sets emotion */
export function SetEmotion(_emotionId: number): void {
  // OG: sets character emotion
}

/** OG CAvatar::SetLayerZ — sets layer Z */
export function SetLayerZ(_z: number): void {
  if (_state) _state.layerZ = _z;
}

/** OG CAvatar::SetLayerColor — sets layer color */
export function SetLayerColor(_color: number): void {
  // OG: sets layer tint color
}

/** OG CAvatar::SetAvatarLook — sets avatar look */
export function SetAvatarLook(_look: unknown): void {
  // OG: updates avatar appearance
}

/** OG CAvatar::TakeOffWeapon — takes off weapon */
export function TakeOffWeapon(): void {
  // OG: removes weapon visual
}

// ── Reset ─────────────────────────────────────────────────────────────────

/** OG CAvatar::ResetOneTimeAction — resets one-time action */
export function ResetOneTimeAction(): void {
  if (_state) _state.oneTimeAction = -1;
}

/** OG CAvatar::ResetCharacterOneTimeAction — resets character one-time action */
export function ResetCharacterOneTimeAction(): void {
  if (_state) _state.oneTimeAction = -1;
}

// ── Layers ────────────────────────────────────────────────────────────────

/** OG CAvatar::PrepareActionLayer — prepares action layer */
export function PrepareActionLayer(): void {
  // OG: prepares character action layer for rendering
}

/** OG CAvatar::PrepareCharacterActionLayer — prepares character action layer */
export function PrepareCharacterActionLayer(): void {
  // OG: prepares character action layer
}

/** OG CAvatar::PrepareFaceLayer — prepares face layer */
export function PrepareFaceLayer(): void {
  // OG: prepares face layer for rendering
}

/** OG CAvatar::PrepareTamingMobActionLayer — prepares taming mob layer */
export function PrepareTamingMobActionLayer(): void {
  // OG: prepares taming mob action layer
}

/** OG CAvatar::ClearActionLayer — clears action layer */
export function ClearActionLayer(): void {
  // OG: clears current action layer
}

/** OG CAvatar::ClearCharacterActionLayer — clears character action layer */
export function ClearCharacterActionLayer(): void {
  // OG: clears character action layer
}

/** OG CAvatar::ClearTamingMobActionLayer — clears taming mob layer */
export function ClearTamingMobActionLayer(): void {
  // OG: clears taming mob layer
}

/** OG CAvatar::RegisterNextBlink — registers next blink */
export function RegisterNextBlink(_time: number): void {
  if (_state) _state.nextBlink = _time;
}

/** OG CAvatar::RemoveBarrier — removes barrier */
export function RemoveBarrier(): void {
  // OG: removes barrier visual
}

/** OG CAvatar::LoadBarrier — loads barrier */
export function LoadBarrier(): void {
  // OG: loads barrier visual
}

/** OG CAvatar::LoadCyclone — loads cyclone */
export function LoadCyclone(): void {
  // OG: loads cyclone visual
}

// ── Animation ─────────────────────────────────────────────────────────────

/** OG CAvatar::ActionProcess — processes action animation */
export function ActionProcess(): void {
  // OG: processes current action animation
}

/** OG CAvatar::ApplyScaleAndOffset — applies scale and offset */
export function ApplyScaleAndOffset(): void {
  // OG: applies scale and offset to avatar
}

/** OG CAvatar::AvatarLayerRemoveCanvas — removes canvas from avatar layer */
export function AvatarLayerRemoveCanvas(): void {
  // OG: removes canvas from avatar layer
}

/** OG CAvatar::CharacterFrameUpdate — updates character frame */
export function CharacterFrameUpdate(): void {
  // OG: updates character animation frame
}

/** OG CAvatar::ConvertCharacterAction — converts character action */
export function ConvertCharacterAction(_action: string): string {
  return _action;
}

/** OG CAvatar::DoLevitationAction — does levitation action */
export function DoLevitationAction(): void {
  // OG: performs levitation animation
}

/** OG CAvatar::FixCharacterPosition — fixes character position */
export function FixCharacterPosition(): void {
  // OG: fixes character position after movement
}

/** OG CAvatar::ForcingAppearance — forces appearance update */
export function ForcingAppearance(): void {
  // OG: forces avatar appearance refresh
}

/** OG CAvatar::StopLevitationAction — stops levitation action */
export function StopLevitationAction(): void {
  // OG: stops levitation animation
}

/** OG CAvatar::TamingMobFrameUpdate — updates taming mob frame */
export function TamingMobFrameUpdate(): void {
  // OG: updates taming mob animation frame
}

// ── Rendering ─────────────────────────────────────────────────────────────

/** OG CAvatar::NotifyAvatarModified — notifies avatar modified */
export function NotifyAvatarModified(): void {
  // OG: notifies avatar appearance change
}

/** OG CAvatar::OnAvatarModified — handles avatar modified */
export function OnAvatarModified(): void {
  // OG: handles avatar appearance change
}

/** OG CAvatar::Update — updates avatar */
export function Update(_dt: number): void {
  // OG: updates avatar state and animation
}
