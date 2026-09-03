export interface AvatarState {
    origin: {
        x: number;
        y: number;
    };
    bodyRect: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    height: number;
    currentAction: string;
    oneTimeAction: number;
    moveAction: number;
    isLeft: boolean;
    mechanicMode: number;
    morphTemplateId: number;
    ridingVehicle: number;
    ghostIndex: number;
    nextBlink: number;
    layerZ: number;
}
export declare function setAvatarState(state: AvatarState): void;
export declare function getAvatarState(): AvatarState | null;
/** OG CAvatar::GetOrigin — returns avatar origin point */
export declare function GetOrigin(): {
    x: number;
    y: number;
};
/** OG CAvatar::GetHeight — returns avatar height */
export declare function GetHeight(): number;
/** OG CAvatar::GetBodyRect — returns body collision rectangle */
export declare function GetBodyRect(): {
    x: number;
    y: number;
    w: number;
    h: number;
};
/** OG CAvatar::GetLayerZ — returns layer Z position */
export declare function GetLayerZ(): number;
/** OG CAvatar::GetLayerUnderFace — returns layer under face */
export declare function GetLayerUnderFace(): unknown;
/** OG CAvatar::GetCurrentAction — returns current action key */
export declare function GetCurrentAction(): string;
/** OG CAvatar::GetCurCharacterAction — returns current character action */
export declare function GetCurCharacterAction(): string;
/** OG CAvatar::GetMoveAction — returns move action */
export declare function GetMoveAction(): number;
/** OG CAvatar::GetOneTimeAction — returns one-time action */
export declare function GetOneTimeAction(): number;
/** OG CAvatar::GetActionInfo — returns action info */
export declare function GetActionInfo(): unknown;
/** OG CAvatar::IsLeft — checks if facing left */
export declare function IsLeft(): boolean;
/** OG CAvatar::IsActionHold — checks if action is holding */
export declare function IsActionHold(): boolean;
/** OG CAvatar::IsOnPlayingOneTimeAction — checks if playing one-time action */
export declare function IsOnPlayingOneTimeAction(): boolean;
/** OG CAvatar::IsAttackableMorphed — checks if attackable while morphed */
export declare function IsAttackableMorphed(): boolean;
/** OG CAvatar::IsHideMorphed — checks if hide morphed */
export declare function IsHideMorphed(): boolean;
/** OG CAvatar::IsMonsterMorphed — checks if monster morphed */
export declare function IsMonsterMorphed(): boolean;
/** OG CAvatar::IsSuperMan — checks if super man state */
export declare function IsSuperMan(): boolean;
/** OG CAvatar::IsTransFormSkill — checks if transform skill */
export declare function IsTransFormSkill(): boolean;
/** OG CAvatar::GetRidingVehicle — returns riding vehicle ID */
export declare function GetRidingVehicle(): number;
/** OG CAvatar::IsRidingEx — checks if riding ex */
export declare function IsRidingEx(): boolean;
/** OG CAvatar::IsRidingWildHunterJaguar — checks if riding wild hunter jaguar */
export declare function IsRidingWildHunterJaguar(): boolean;
/** OG CAvatar::GetMechanicMode — returns mechanic mode */
export declare function GetMechanicMode(): number;
/** OG CAvatar::SetMoveAction — sets move action */
export declare function SetMoveAction(_nMA: number, _bReload: boolean): void;
/** OG CAvatar::SetOneTimeAction — sets one-time action */
export declare function SetOneTimeAction(_action: number): void;
/** OG CAvatar::SetMechanicMode — sets mechanic mode */
export declare function SetMechanicMode(_mode: number): void;
/** OG CAvatar::SetMorphed — sets morphed state */
export declare function SetMorphed(_morphId: number): void;
/** OG CAvatar::SetRidingVehicle — sets riding vehicle */
export declare function SetRidingVehicle(_vehicleId: number): void;
/** OG CAvatar::SetRidingChair — sets riding chair */
export declare function SetRidingChair(_chairId: number): void;
/** OG CAvatar::SetResistanceRidingMoveAction — sets resistance riding move action */
export declare function SetResistanceRidingMoveAction(_moveAction: number, _bReload: boolean): void;
/** OG CAvatar::SetGhostState — sets ghost state */
export declare function SetGhostState(_ghostIndex: number): void;
/** OG CAvatar::SetEmotion — sets emotion */
export declare function SetEmotion(_emotionId: number): void;
/** OG CAvatar::SetLayerZ — sets layer Z */
export declare function SetLayerZ(_z: number): void;
/** OG CAvatar::SetLayerColor — sets layer color */
export declare function SetLayerColor(_color: number): void;
/** OG CAvatar::SetAvatarLook — sets avatar look */
export declare function SetAvatarLook(_look: unknown): void;
/** OG CAvatar::TakeOffWeapon — takes off weapon */
export declare function TakeOffWeapon(): void;
/** OG CAvatar::ResetOneTimeAction — resets one-time action */
export declare function ResetOneTimeAction(): void;
/** OG CAvatar::ResetCharacterOneTimeAction — resets character one-time action */
export declare function ResetCharacterOneTimeAction(): void;
/** OG CAvatar::PrepareActionLayer — prepares action layer */
export declare function PrepareActionLayer(): void;
/** OG CAvatar::PrepareCharacterActionLayer — prepares character action layer */
export declare function PrepareCharacterActionLayer(): void;
/** OG CAvatar::PrepareFaceLayer — prepares face layer */
export declare function PrepareFaceLayer(): void;
/** OG CAvatar::PrepareTamingMobActionLayer — prepares taming mob layer */
export declare function PrepareTamingMobActionLayer(): void;
/** OG CAvatar::ClearActionLayer — clears action layer */
export declare function ClearActionLayer(): void;
/** OG CAvatar::ClearCharacterActionLayer — clears character action layer */
export declare function ClearCharacterActionLayer(): void;
/** OG CAvatar::ClearTamingMobActionLayer — clears taming mob layer */
export declare function ClearTamingMobActionLayer(): void;
/** OG CAvatar::RegisterNextBlink — registers next blink */
export declare function RegisterNextBlink(_time: number): void;
/** OG CAvatar::RemoveBarrier — removes barrier */
export declare function RemoveBarrier(): void;
/** OG CAvatar::LoadBarrier — loads barrier */
export declare function LoadBarrier(): void;
/** OG CAvatar::LoadCyclone — loads cyclone */
export declare function LoadCyclone(): void;
/** OG CAvatar::ActionProcess — processes action animation */
export declare function ActionProcess(): void;
/** OG CAvatar::ApplyScaleAndOffset — applies scale and offset */
export declare function ApplyScaleAndOffset(): void;
/** OG CAvatar::AvatarLayerRemoveCanvas — removes canvas from avatar layer */
export declare function AvatarLayerRemoveCanvas(): void;
/** OG CAvatar::CharacterFrameUpdate — updates character frame */
export declare function CharacterFrameUpdate(): void;
/** OG CAvatar::ConvertCharacterAction — converts character action */
export declare function ConvertCharacterAction(_action: string): string;
/** OG CAvatar::DoLevitationAction — does levitation action */
export declare function DoLevitationAction(): void;
/** OG CAvatar::FixCharacterPosition — fixes character position */
export declare function FixCharacterPosition(): void;
/** OG CAvatar::ForcingAppearance — forces appearance update */
export declare function ForcingAppearance(): void;
/** OG CAvatar::StopLevitationAction — stops levitation action */
export declare function StopLevitationAction(): void;
/** OG CAvatar::TamingMobFrameUpdate — updates taming mob frame */
export declare function TamingMobFrameUpdate(): void;
/** OG CAvatar::NotifyAvatarModified — notifies avatar modified */
export declare function NotifyAvatarModified(): void;
/** OG CAvatar::OnAvatarModified — handles avatar modified */
export declare function OnAvatarModified(): void;
/** OG CAvatar::Update — updates avatar */
export declare function Update(_dt: number): void;
//# sourceMappingURL=Avatar.d.ts.map