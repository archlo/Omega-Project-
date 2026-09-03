export interface CUserState {
    posPrev: {
        x: number;
        y: number;
    };
    phase: number;
    nDarkSight: number;
    nSneak: number;
    nWindWalk: number;
    nStun: number;
    moveAction: number;
    layerZ: number;
    ridingMechanicBulletPos: number;
    teamForPartyRaid: number;
    teamNameForMCarnival: string;
    teamNameForPartyRaid: string;
}
export declare function setUserState(state: CUserState): void;
export declare function getUserState(): CUserState | null;
/** OG CUser::GetPosPrev — returns previous position */
export declare function GetPosPrev(): {
    x: number;
    y: number;
};
/** OG CUser::GetPhase — returns field phase */
export declare function GetPhase(): number;
/** OG CUser::IsDarkSight — checks dark sight buff */
export declare function IsDarkSight(): boolean;
/** OG CUser::IsSneak — checks sneak buff */
export declare function IsSneak(): boolean;
/** OG CUser::IsWindWalk — checks wind walk buff */
export declare function IsWindWalk(): boolean;
/** OG CUser::IsOnLadderOrRope — checks if on ladder or rope */
export declare function IsOnLadderOrRope(): boolean;
/** OG CUser::IsSamePhaseWithLocalUser — checks phase match */
export declare function IsSamePhaseWithLocalUser(): boolean;
/** OG CUser::IsMovingMode — checks if in moving mode */
export declare function IsMovingMode(): boolean;
/** OG CUser::IsFanShapeShoot — checks fan shape shoot */
export declare function IsFanShapeShoot(): boolean;
/** OG CUser::IsDoingHashing — checks doing hashing */
export declare function IsDoingHashing(): boolean;
/** OG CUser::IsTamingMobTired — checks taming mob tired */
export declare function IsTamingMobTired(): boolean;
/** OG CUser::IsKindOf — RTTI kind check */
export declare function IsKindOf(_rtti: unknown): boolean;
/** OG CUser::GetAttackActionSpeed — returns attack action speed */
export declare function GetAttackActionSpeed(_nSkillID: number): number;
/** OG CUser::GetShootDelay — returns shoot delay for skill */
export declare function GetShootDelay(_pSkill: unknown, _nDefault: number): number;
/** OG CUser::GetBulletDelay — returns bullet delay */
export declare function GetBulletDelay(): number;
/** OG CUser::GetDamageDelay — returns damage delay */
export declare function GetDamageDelay(): number;
/** OG CUser::GetPhase — already implemented above */
/** OG CUser::GetRidingMechanicBulletPos — returns riding mechanic bullet position */
export declare function GetRidingMechanicBulletPos(): number;
/** OG CUser::GetTeamForPartyRaid — returns party raid team */
export declare function GetTeamForPartyRaid(): number;
/** OG CUser::GetTeamNameForMCarnival — returns carnival team name */
export declare function GetTeamNameForMCarnival(): string;
/** OG CUser::GetTeamNameForPartyRaid — returns party raid team name */
export declare function GetTeamNameForPartyRaid(): string;
/** OG CUser::GetType — returns user type */
export declare function GetType(): number;
/** OG CUser::SetMoveAction — sets move action */
export declare function SetMoveAction(_nMA: number, _bReload: boolean): void;
/** OG CUser::SetLayerZ — sets layer Z position */
export declare function SetLayerZ(_z: number): void;
/** OG CUser::SetAttackAction — sets attack action */
export declare function SetAttackAction(_action: number): void;
/** OG CUser::SetAdminEffect — sets admin visual effect */
export declare function SetAdminEffect(_bAdmin: boolean): void;
/** OG CUser::SetAbilityEquip — sets ability equipment */
export declare function SetAbilityEquip(_equip: unknown): void;
/** OG CUser::ShowSkillAffected — shows skill affected visual */
export declare function ShowSkillAffected(_skillId: number): void;
/** OG CUser::ShowSkillSpecialEffect — shows skill special effect */
export declare function ShowSkillSpecialEffect(_skillId: number): void;
/** OG CUser::ShowAffectedSkillAni — shows affected skill animation */
export declare function ShowAffectedSkillAni(): void;
/** OG CUser::ShowGauge — shows gauge display */
export declare function ShowGauge(): void;
/** OG CUser::ShowKeyowrdEffect — shows keyword effect */
export declare function ShowKeyowrdEffect(): void;
/** OG CUser::ShowMorphEffect — shows morph effect */
export declare function ShowMorphEffect(): void;
/** OG CUser::ShowOakCaskEffect — shows oak cask effect */
export declare function ShowOakCaskEffect(): void;
/** OG CUser::ShowRideVehicleEffect — shows ride vehicle effect */
export declare function ShowRideVehicleEffect(): void;
/** OG CUser::ShowEffectFlameThrowerEnd — shows flamethrower end effect */
export declare function ShowEffectFlameThrowerEnd(): void;
/** OG CUser::ShowEffectSiegeEnd — shows siege end effect */
export declare function ShowEffectSiegeEnd(): void;
/** OG CUser::ShowEffectSiegeStart — shows siege start effect */
export declare function ShowEffectSiegeStart(): void;
/** OG CUser::ShowFollowEffectItem — shows follow effect item */
export declare function ShowFollowEffectItem(): void;
/** OG CUser::MakeIncDecHPEffect — makes HP increment/decrement effect */
export declare function MakeIncDecHPEffect(_hpChange: number): void;
/** OG CUser::GetAdditionalLayer — returns additional layer */
export declare function GetAdditionalLayer(): unknown;
/** OG CUser::GetMirrorSrcLayer — returns mirror source layer */
export declare function GetMirrorSrcLayer(): unknown;
/** OG CUser::PrepareActionLayer — prepares action layer */
export declare function PrepareActionLayer(): void;
/** OG CUser::PrepareMirrorActionLayer — prepares mirror action layer */
export declare function PrepareMirrorActionLayer(): void;
/** OG CUser::PrepareShadowPartnerActionLayer — prepares shadow partner layer */
export declare function PrepareShadowPartnerActionLayer(): void;
/** OG CUser::RemoveAdditionalLayer — removes additional layer */
export declare function RemoveAdditionalLayer(): void;
/** OG CUser::UpdateAdditionalLayer — updates additional layer */
export declare function UpdateAdditionalLayer(): void;
/** OG CUser::UpdateKeywordEffects — updates keyword effects */
export declare function UpdateKeywordEffects(): void;
/** OG CUser::SetRidingChair — sets riding chair state */
export declare function SetRidingChair(_chairId: number): void;
/** OG CUser::SetRidingVehicle — sets riding vehicle state */
export declare function SetRidingVehicle(_vehicleId: number): void;
/** OG CUser::SetMorphed — sets morphed state */
export declare function SetMorphed(_morphId: number): void;
/** OG CUser::SetMechanicMode — sets mechanic mode */
export declare function SetMechanicMode(_mode: number): void;
/** OG CUser::SetGhostState — sets ghost state */
export declare function SetGhostState(_bGhost: boolean): void;
/** OG CUser::SetVisibleMan — sets visible man state */
export declare function SetVisibleMan(_bVisible: boolean): void;
/** OG CUser::SetVisibleTamingMob — sets taming mob visibility */
export declare function SetVisibleTamingMob(_bVisible: boolean): void;
/** OG CUser::RemoveBlessingArmor — removes blessing armor effect */
export declare function RemoveBlessingArmor(): void;
/** OG CUser::RemoveDojangBerserkEffect — removes dojang berserk effect */
export declare function RemoveDojangBerserkEffect(): void;
/** OG CUser::RemoveDojangInvincibleEffect — removes dojang invincible effect */
export declare function RemoveDojangInvincibleEffect(): void;
/** OG CUser::RemoveFinalCutEffect — removes final cut effect */
export declare function RemoveFinalCutEffect(): void;
/** OG CUser::RemoveMagicShield — removes magic shield effect */
export declare function RemoveMagicShield(): void;
/** OG CUser::RemoveMoreWildFinishEffect — removes more wild finish effect */
export declare function RemoveMoreWildFinishEffect(): void;
/** OG CUser::RemoveSuddenDeathEffect — removes sudden death effect */
export declare function RemoveSuddenDeathEffect(): void;
/** OG CUser::RemoveSwallowingEffect — removes swallowing effect */
export declare function RemoveSwallowingEffect(): void;
/** OG CUser::ShiftAffectedSkillAnimation — shifts affected skill animation */
export declare function ShiftAffectedSkillAnimation(): void;
/** OG CUser::RegisterSerialBullet — registers serial bullet */
export declare function RegisterSerialBullet(): void;
/** OG CUser::PetAutoSpeaking — pet auto speaking */
export declare function PetAutoSpeaking(): void;
/** OG CUser::PetInterActWithUserAction — pet interaction with user action */
export declare function PetInterActWithUserAction(_action: number, _param: number): void;
/** OG CUser::OnPassiveMove — handles passive movement */
export declare function OnPassiveMove(): void;
/** OG CUser::RetrieveNewYearCardAdditionalLayer — retrieves new year card layer */
export declare function RetrieveNewYearCardAdditionalLayer(): void;
//# sourceMappingURL=CUser.d.ts.map