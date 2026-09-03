import { SecondaryStat } from './SecondaryStat.js';
export interface preparingSkill {
    nSkillID: number;
}
export interface CUserLocalState {
    m_bSit: boolean;
    m_bSit_CS: number;
    preparingSkill: preparingSkill;
    uSkillSoundCookie: number;
    tNextBlink: number;
    nPhase: number;
    nTeamForMCarnival: number;
    rushState: number;
    rushElem: number;
    bDirectionMode: boolean;
    clientTimer: number;
    monsterBookCover: number;
    monsterCardCheckList: number[];
    monsterCardCount: number;
    pairCharacterId: number;
    friendPairCharacterId: number;
    marriagePairCharacterId: number;
    newYearCardPairCharacterId: number;
    passiveSkillData: unknown;
    chatPassiveSkillDataInfo: unknown;
    bAttractMove: boolean;
    bPortableChairStatSetSent: boolean;
    teslaCoilCount: number;
    teslaCoilSummonedId: number;
    spiritJavelinItemId: number;
    dcRect: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    shoeAttr: unknown;
    achillesReduce: number;
    repeatSkillPoint: number;
    clientTimerValue: number;
}
export declare function setUserLocalState(state: CUserLocalState): void;
export declare function getUserLocalState(): CUserLocalState | null;
/** Critical hit probability from weapon ItemOption (niCr) */
export declare let weaponCritProb: number;
/** Critical hit damage from weapon ItemOption (niCDr) */
export declare let weaponCritDamage: number;
/** Total damage reduction from weapon ItemOption (niDAMr, non-boss) */
export declare let weaponDAMr: number;
/** Boss damage reduction from weapon ItemOption (niDAMr, when nBoss > 0) */
export declare let weaponBossDAMr: number;
/** Ignore target DEF from weapon ItemOption (nIgnoreTargetDEF) */
export declare let weaponIgnoreTargetDEF: number;
/** Combo counter state */
export declare let comboCounter: number;
/** OG CUserLocal::ClearCombo — resets combo counter to 0 */
export declare function clearCombo(): void;
/** OG CUserLocal::GetComboCounter — returns current combo count */
export declare function getComboCounter(): number;
/** OG CUserLocal::IncComboCounter — increments combo counter */
export declare function incComboCounter(): void;
/** OG CUserLocal::SetComboCounter — sets combo counter value */
export declare function setComboCounter(count: number): void;
/** OG CUserLocal::ApplyWeaponOption — computes weapon ItemOption combat modifiers.
 *  Reads weapon's 3 ItemOption slots and accumulates niCr, niCDr, niDAMr (split
 *  by nBoss), and nIgnoreTargetDEF from the highest tier <= itemLevel. */
export declare function applyWeaponOption(option1: number, option2: number, option3: number, itemLevel: number, loadItemOption: (id: number) => {
    aLevelData: {
        nLevel: number;
        niCr: number;
        niCDr: number;
        niDAMr: number;
        nBoss: number;
        nIgnoreTargetDEF: number;
    }[];
} | null): void;
/** OG CUserLocal::GetDefenseOptionData — computes defense ItemOption from equipped items.
 *  Returns IgnoreDAM/IgnoreDAMr with probability for damage reduction. */
export declare function getDefenseOptionData(option1: number, option2: number, option3: number, itemLevel: number, loadItemOption: (id: number) => {
    aLevelData: {
        nLevel: number;
        nIgnoreDAM: number;
        nIgnoreDAMr: number;
        prob: number;
    }[];
} | null): {
    nIgnoreDAM: number;
    nIgnoreDAMProb: number;
    nIgnoreDAMr: number;
    nIgnoreDAMrProb: number;
} | null;
/** OG CUserLocal::GetSecondaryStat — returns secondary stat from CWvsContext */
export declare function GetSecondaryStat(): SecondaryStat;
/** OG CUserLocal::GetShoeAttr — returns shoe attribute */
export declare function GetShoeAttr(): unknown;
/** OG CUserLocal::CanUseBareHand — checks if job can use bare hand (job%1000/100 == 5) */
export declare function CanUseBareHand(): boolean;
/** OG CUserLocal::GetJobCode — returns job code from CharacterData */
export declare function GetJobCode(): number;
/** OG CUserLocal::GetFieldID — returns current field ID */
export declare function GetFieldID(): number;
/** OG CUserLocal::GetCharacterLevel — returns character level */
export declare function GetCharacterLevel(): number;
/** OG CUserLocal::IsDashing — checks if dashing (Magnet/Charge/Combo) */
export declare function IsDashing(): boolean;
/** OG CUserLocal::IsDashing2 — checks dash type 2 (skill 4321000) */
export declare function IsDashing2(): boolean;
/** OG CUserLocal::IsStun — checks stun debuff */
export declare function IsStun(): boolean;
/** OG CUserLocal::IsWeakened — checks weakness debuff */
export declare function IsWeakened(): boolean;
/** OG CUserLocal::IsSealed — checks seal debuff */
export declare function IsSealed(): boolean;
/** OG CUserLocal::IsSit — checks if sitting */
export declare function IsSit(): boolean;
/** OG CUserLocal::IsAttract — checks attract state */
export declare function IsAttract(): boolean;
/** OG CUserLocal::IsStopPortion — checks stop portion state */
export declare function IsStopPortion(): boolean;
/** OG CUserLocal::IsWeaponDisabled — checks if weapon is disabled */
export declare function IsWeaponDisabled(): boolean;
/** OG CUserLocal::IsPreparingSkill — checks if preparing a skill */
export declare function IsPreparingSkill(): boolean;
/** OG CUserLocal::IsImmovable — checks if immovable (stun/freeze/web/sit/preparing) */
export declare function IsImmovable(): boolean;
/** OG CUserLocal::IsAdminHide — checks admin hide state */
export declare function IsAdminHide(): boolean;
/** OG CUserLocal::IsPreview — checks preview mode */
export declare function IsPreview(): boolean;
/** OG CUserLocal::IsLocalUser — always true for CUserLocal */
export declare function IsLocalUser(): boolean;
/** OG CUserLocal::IsRemoteUser — always false for CUserLocal */
export declare function IsRemoteUser(): boolean;
/** OG CUserLocal::GetOnDashSkill — returns dash skill ID */
export declare function GetOnDashSkill(): number;
/** OG CUserLocal::HasOnDashSkill — checks if has dash skill */
export declare function HasOnDashSkill(): boolean;
/** OG CUserLocal::GetAchillesReduce — returns Achilles damage reduction */
export declare function GetAchillesReduce(): number;
/** OG CUserLocal::GetRepeatSkillPoint — returns repeat skill points */
export declare function GetRepeatSkillPoint(): number;
/** OG CUserLocal::GetProperBulletPosition — returns bullet position for ranged */
export declare function GetProperBulletPosition(): number;
/** OG CUserLocal::GetSpiritJavelinItemID — returns Spirit Javelin item ID */
export declare function GetSpiritJavelinItemID(): number;
/** OG CUserLocal::GetTeslaCoilCount — returns Tesla Coil count */
export declare function GetTeslaCoilCount(): number;
/** OG CUserLocal::GetTeslaCoilSummonedID — returns Tesla Coil summoned ID */
export declare function GetTeslaCoilSummonedID(): number;
/** OG CUserLocal::GetDCRect — returns DC rect */
export declare function GetDCRect(): {
    x: number;
    y: number;
    w: number;
    h: number;
};
/** OG CUserLocal::GetUpFromPortableChair — get up from portable chair */
export declare function GetUpFromPortableChair(): void;
/** OG CUserLocal::GetPassiveSkillData — returns passive skill data */
export declare function GetPassiveSkillData(): unknown;
/** OG CUserLocal::GetMonsterCardCheckListSize — returns monster card checklist size */
export declare function GetMonsterCardCheckListSize(): number;
/** OG CUserLocal::GetMonsterCardCount — returns monster card count */
export declare function GetMonsterCardCount(): number;
/** OG CUserLocal::CalcBuffDefenseAttr — calculates buff defense attribute */
export declare function CalcBuffDefenseAttr(_nSkillID: number, _nDamage: number): number;
/** OG CUserLocal::RevisePassiveSkillData — revises passive skill data */
export declare function RevisePassiveSkillData(): void;
/** OG CUserLocal::ClearCombo — clears combo counter */
export declare function ClearCombo(): void;
/** OG CUserLocal::ShowCounterDamage — shows counter damage display */
export declare function ShowCounterDamage(_nDamage: number): void;
/** OG CUserLocal::ApplyAllSkillLevelUP — applies all skill level up */
export declare function ApplyAllSkillLevelUP(): void;
/** OG CUserLocal::ApplyAccessoryOption — applies accessory item options */
export declare function ApplyAccessoryOption(): void;
/** OG CUserLocal::ApplyEmotionOption — applies emotion option */
export declare function ApplyEmotionOption(): void;
/** OG CUserLocal::ApplyIgnoreDAMOption — applies ignore damage option */
export declare function ApplyIgnoreDAMOption(): void;
/** OG CUserLocal::ApplyInvicibleOption — applies invincible option */
export declare function ApplyInvicibleOption(): void;
/** OG CUserLocal::ApplyRecoveryOption — applies recovery option */
export declare function ApplyRecoveryOption(): void;
/** OG CUserLocal::ApplyMechanicMode — applies mechanic mode */
export declare function ApplyMechanicMode(_nMode: number, _nOption: number): void;
/** OG CUserLocal::HandleLButtonDown — handles left mouse button down */
export declare function HandleLButtonDown(): void;
/** OG CUserLocal::HandleRButtonClk — handles right mouse button click */
export declare function HandleRButtonClk(): void;
/** OG CUserLocal::HandleXKeyDown — handles X key down */
export declare function HandleXKeyDown(): void;
/** OG CUserLocal::ProcessDualKey — processes dual key input */
export declare function ProcessDualKey(): void;
/** OG CUserLocal::UseFuncKeyMappedUpKey — uses func key mapped to up key */
export declare function UseFuncKeyMappedUpKey(): void;
/** OG CUserLocal::TryDoingRush — tries to perform rush attack */
export declare function TryDoingRush(): void;
/** OG CUserLocal::TryDoingFlyingRush — tries to perform flying rush */
export declare function TryDoingFlyingRush(): void;
/** OG CUserLocal::TryDoingFallDown — tries to perform fall down */
export declare function TryDoingFallDown(): void;
/** OG CUserLocal::TryDoingMine — tries to place/use mine */
export declare function TryDoingMine(): void;
/** OG CUserLocal::TryDoingWings — tries to use wings */
export declare function TryDoingWings(): void;
/** OG CUserLocal::TryDoingItemSkill — tries to use item skill */
export declare function TryDoingItemSkill(): void;
/** OG CUserLocal::TryDoingSitdownHealing — tries sitdown healing */
export declare function TryDoingSitdownHealing(): void;
/** OG CUserLocal::TryDoingSmoothingMovingShootAttackPrepare — smoothing shoot prep */
export declare function TryDoingSmoothingMovingShootAttackPrepare(): void;
/** OG CUserLocal::VerticalJump — performs vertical jump */
export declare function VerticalJump(): void;
/** OG CUserLocal::MoveToPortal — moves to portal by name */
export declare function MoveToPortal(_sPortalName: string): void;
/** OG CUserLocal::BeRushValid — checks if rush is valid */
export declare function BeRushValid(): boolean;
/** OG CUserLocal::AddRushElem — adds rush element */
export declare function AddRushElem(): void;
/** OG CUserLocal::RequestIncCombo — requests combo increment */
export declare function RequestIncCombo(): void;
/** OG CUserLocal::ResetOneTimeAction — resets one-time action */
export declare function ResetOneTimeAction(): void;
/** OG CUserLocal::TryRegisterFinalAttack — tries to register final attack */
export declare function TryRegisterFinalAttack(): void;
/** OG CUserLocal::TryRegisterSerialAttack — tries to register serial attack */
export declare function TryRegisterSerialAttack(): void;
/** OG CUserLocal::TryRegisterSparkAttack — tries to register spark attack */
export declare function TryRegisterSparkAttack(): void;
/** OG CUserLocal::TryLeaveDirectionMode — tries to leave direction mode */
export declare function TryLeaveDirectionMode(): void;
/** OG CUserLocal::SetShoeAttr — sets shoe attribute */
export declare function SetShoeAttr(_attr: unknown): void;
/** OG CUserLocal::SetPortableChairStatSetSent — sets portable chair stat sent flag */
export declare function SetPortableChairStatSetSent(_sent: boolean): void;
/** OG CUserLocal::SetPairCharacterID — sets pair character ID */
export declare function SetPairCharacterID(_id: number): void;
/** OG CUserLocal::SetFriendPairCharacterID — sets friend pair character ID */
export declare function SetFriendPairCharacterID(_id: number): void;
/** OG CUserLocal::SetMarriagePairCharacterID — sets marriage pair character ID */
export declare function SetMarriagePairCharacterID(_id: number): void;
/** OG CUserLocal::SetNewYearCardPairCharacterID — sets new year card pair ID */
export declare function SetNewYearCardPairCharacterID(_id: number): void;
/** OG CUserLocal::SetMonsterBookCover — sets monster book cover */
export declare function SetMonsterBookCover(_cover: number): void;
/** OG CUserLocal::SetMonsterCardCheckList — sets monster card checklist */
export declare function SetMonsterCardCheckList(_list: number[]): void;
/** OG CUserLocal::SetClientTimer — sets client timer */
export declare function SetClientTimer(_timer: number): void;
/** OG CUserLocal::SetPassiveSkillDataForced — sets passive skill data forced */
export declare function SetPassiveSkillDataForced(_data: unknown): void;
/** OG CUserLocal::SetChatPassiveSkillDataInfo — sets chat passive skill info */
export declare function SetChatPassiveSkillDataInfo(_info: unknown): void;
/** OG CUserLocal::SetAttractMove — sets attract move state */
export declare function SetAttractMove(_attract: boolean): void;
/** OG CUserLocal::SetActiveEffectItemForLocal — sets active effect item */
export declare function SetActiveEffectItemForLocal(_itemId: number): void;
/** OG CUserLocal::SetCarryItemEffectForLocal — sets carry item effect */
export declare function SetCarryItemEffectForLocal(_itemId: number): void;
/** OG CUserLocal::ClearToolTip — clears tooltip */
export declare function ClearToolTip(): void;
/** OG CUserLocal::RedrawGuildNameTag — redraws guild name tag */
export declare function RedrawGuildNameTag(): void;
/** OG CUserLocal::SetPetsAngry — sets pets angry state */
export declare function SetPetsAngry(): void;
/** OG CUserLocal::ChangeTeslaCoilEndTime — changes Tesla Coil end time */
export declare function ChangeTeslaCoilEndTime(_time: number): void;
/** OG CUserLocal::PetInterActWithItem — pet interaction with item */
export declare function PetInterActWithItem(_itemId: number): number;
/** OG CUserLocal::PetInterActWithUserAction — pet interaction with user action */
export declare function PetInterActWithUserAction(_action: number, _param: number): number;
/** OG CUserLocal::TryConsumePetHP — tries to consume pet HP */
export declare function TryConsumePetHP(): void;
/** OG CUserLocal::TryConsumePetMP — tries to consume pet MP */
export declare function TryConsumePetMP(): void;
/** OG CUserLocal::CheckRidingVehicle — checks if riding vehicle */
export declare function CheckRidingVehicle(): boolean;
/** OG CUserLocal::CheckRidingVehicleExceptMechanic — checks riding except mechanic */
export declare function CheckRidingVehicleExceptMechanic(): boolean;
/** OG CUserLocal::CheckBoobyTrapPickUpRequest — checks booby trap pickup */
export declare function CheckBoobyTrapPickUpRequest(): boolean;
/** OG CUserLocal::CheckReactor_Collision — checks reactor collision */
export declare function CheckReactor_Collision(): void;
/** OG CUserLocal::FindHitSummonedInRect — finds hit summoned in rect */
export declare function FindHitSummonedInRect(): void;
/** OG CUserLocal::OnCollisionCustomImpact — handles custom impact collision */
export declare function OnCollisionCustomImpact(): void;
/** OG CUserLocal::OnSetDead — handles death state */
export declare function OnSetDead(_bDyingNow: boolean): void;
/** OG CUserLocal::OnRevive — handles revival */
export declare function OnRevive(): void;
/** OG CUserLocal::OnTeleport — handles teleport confirmation */
export declare function OnTeleport(_x: number, _y: number): void;
/** OG CUserLocal::OnSummonedCreated — handles summoned creation */
export declare function OnSummonedCreated(): void;
/** OG CUserLocal::OnTemporaryStatChanged — handles temp stat change */
export declare function OnTemporaryStatChanged(): void;
/** OG CUserLocal::OnMakerResult — handles maker result */
export declare function OnMakerResult(): void;
/** OG CUserLocal::OnSetStandAloneMode — handles stand alone mode */
export declare function OnSetStandAloneMode(_standAlone: boolean): void;
/** OG CUserLocal::OnSitResult — handles sit result */
export declare function OnSitResult(): void;
/** OG CUserLocal::OnSkillCooltimeSet — handles skill cooldown set */
export declare function OnSkillCooltimeSet(): void;
/** OG CUserLocal::OnFieldFadeInOut — handles field fade in/out */
export declare function OnFieldFadeInOut(_color: number, _duration: number, _fadeOut: boolean, _fadeTime: number): void;
/** OG CUserLocal::OnFieldFadeOutForce — handles forced fade out */
export declare function OnFieldFadeOutForce(_color: number): void;
/** OG CUserLocal::OnNotifyHPDecByField — handles HP drain by field */
export declare function OnNotifyHPDecByField(_amount: number): void;
/** OG CUserLocal::OnSetDirectionMode — handles direction mode */
export declare function OnSetDirectionMode(_bDirection: boolean, _afterDelay: number): void;
/** OG CUserLocal::ShowAutoStartQuestList — shows auto-start quest list */
export declare function ShowAutoStartQuestList(): void;
/** OG CUserLocal::EraseAutoQuestAlert — erases auto quest alert */
export declare function EraseAutoQuestAlert(): void;
/** OG CUserLocal::FollowCharacterFailedMsg — shows follow character failed message */
export declare function FollowCharacterFailedMsg(): void;
/** OG CUserLocal::TryAutoRequestFollowCharacter — tries auto request follow character */
export declare function TryAutoRequestFollowCharacter(): void;
/** OG CUserLocal::SendBanMapByMobRequest — sends ban map by mob request */
export declare function SendBanMapByMobRequest(): void;
/** OG CUserLocal::SendRepeatEffectRemoveRequest — sends repeat effect remove */
export declare function SendRepeatEffectRemoveRequest(): void;
/** OG CUserLocal::RequestUpgradeTombEffect — requests upgrade tomb effect */
export declare function RequestUpgradeTombEffect(): void;
/** OG CUserLocal::UpdateClientTimer — updates client timer */
export declare function UpdateClientTimer(): void;
/** OG CUserLocal::UpdateMonsterBookInfo — updates monster book info */
export declare function UpdateMonsterBookInfo(): void;
/** OG CUserLocal::ValidateSkillBonus — validates skill bonus */
export declare function ValidateSkillBonus(): void;
/** OG CUserLocal::RemoveTutor — removes tutor */
export declare function RemoveTutor(): void;
/** OG CUserLocal::IsGL5thEventCakeTeam — checks GL 5th event cake team */
export declare function IsGL5thEventCakeTeam(): boolean;
/** OG CUserLocal::IsGL5thEventPieTeam — checks GL 5th event pie team */
export declare function IsGL5thEventPieTeam(): boolean;
//# sourceMappingURL=CUserLocal.d.ts.map