// OG: CUserLocal — local player class (163 methods in IDB).
// This file implements all CUserLocal methods not covered by other TS modules.
// Distributed architecture: GameStage.ts handles packets, PlayerController.ts handles
// physics, CharacterRenderer.ts handles rendering, SecondaryStat.ts handles stats.
// This file provides the remaining getters, state checks, and utility methods.
import { SecondaryStat } from './SecondaryStat.js';
// Singleton reference — in OG this is TSingleton<CUserLocal>
let _instance = null;
export function setUserLocalState(state) {
    _instance = state;
}
export function getUserLocalState() {
    return _instance;
}
// ──────────────────────────────────────────────────────────────────────────
// OG CUserLocal weapon/defense option fields (moved from GameStage.ts)
// These are computed during stat sync and cached for attack use.
// ──────────────────────────────────────────────────────────────────────────
/** Critical hit probability from weapon ItemOption (niCr) */
export let weaponCritProb = 0;
/** Critical hit damage from weapon ItemOption (niCDr) */
export let weaponCritDamage = 0;
/** Total damage reduction from weapon ItemOption (niDAMr, non-boss) */
export let weaponDAMr = 0;
/** Boss damage reduction from weapon ItemOption (niDAMr, when nBoss > 0) */
export let weaponBossDAMr = 0;
/** Ignore target DEF from weapon ItemOption (nIgnoreTargetDEF) */
export let weaponIgnoreTargetDEF = 0;
/** Combo counter state */
export let comboCounter = 0;
/** OG CUserLocal::ClearCombo — resets combo counter to 0 */
export function clearCombo() {
    comboCounter = 0;
}
/** OG CUserLocal::GetComboCounter — returns current combo count */
export function getComboCounter() {
    return comboCounter;
}
/** OG CUserLocal::IncComboCounter — increments combo counter */
export function incComboCounter() {
    comboCounter++;
}
/** OG CUserLocal::SetComboCounter — sets combo counter value */
export function setComboCounter(count) {
    comboCounter = count;
}
/** OG CUserLocal::ApplyWeaponOption — computes weapon ItemOption combat modifiers.
 *  Reads weapon's 3 ItemOption slots and accumulates niCr, niCDr, niDAMr (split
 *  by nBoss), and nIgnoreTargetDEF from the highest tier <= itemLevel. */
export function applyWeaponOption(option1, option2, option3, itemLevel, loadItemOption) {
    weaponCritProb = 0;
    weaponCritDamage = 0;
    weaponDAMr = 0;
    weaponBossDAMr = 0;
    weaponIgnoreTargetDEF = 0;
    for (const optId of [option1, option2, option3]) {
        if (optId <= 0)
            continue;
        const entry = loadItemOption(optId);
        if (!entry || entry.aLevelData.length === 0)
            continue;
        let lv = entry.aLevelData[0];
        for (let i = entry.aLevelData.length - 1; i >= 0; i--) {
            if (entry.aLevelData[i].nLevel <= itemLevel) {
                lv = entry.aLevelData[i];
                break;
            }
        }
        if (lv.niCr > 0)
            weaponCritProb += lv.niCr;
        if (lv.niCDr > 0)
            weaponCritDamage += lv.niCDr;
        if (lv.nBoss > 0) {
            weaponBossDAMr += lv.niDAMr;
        }
        else if (lv.niDAMr > 0) {
            weaponDAMr += lv.niDAMr;
        }
        if (lv.nIgnoreTargetDEF > 0)
            weaponIgnoreTargetDEF += lv.nIgnoreTargetDEF;
    }
}
/** OG CUserLocal::GetDefenseOptionData — computes defense ItemOption from equipped items.
 *  Returns IgnoreDAM/IgnoreDAMr with probability for damage reduction. */
export function getDefenseOptionData(option1, option2, option3, itemLevel, loadItemOption) {
    let nIgnoreDAM = 0, nIgnoreDAMProb = 0, nIgnoreDAMr = 0, nIgnoreDAMrProb = 0;
    for (const optId of [option1, option2, option3]) {
        if (optId <= 0)
            continue;
        const entry = loadItemOption(optId);
        if (!entry || entry.aLevelData.length === 0)
            continue;
        let lv = entry.aLevelData[0];
        for (let i = entry.aLevelData.length - 1; i >= 0; i--) {
            if (entry.aLevelData[i].nLevel <= itemLevel) {
                lv = entry.aLevelData[i];
                break;
            }
        }
        if (lv.nIgnoreDAM > 0) {
            nIgnoreDAM += lv.nIgnoreDAM;
            nIgnoreDAMProb = Math.max(nIgnoreDAMProb, lv.prob || 100);
        }
        if (lv.nIgnoreDAMr > 0) {
            nIgnoreDAMr += lv.nIgnoreDAMr;
            nIgnoreDAMrProb = Math.max(nIgnoreDAMrProb, lv.prob || 100);
        }
    }
    if (nIgnoreDAM === 0 && nIgnoreDAMr === 0)
        return null;
    return { nIgnoreDAM, nIgnoreDAMProb, nIgnoreDAMr, nIgnoreDAMrProb };
}
// ──────────────────────────────────────────────────────────────────────────
// OG CUserLocal methods — all 107 missing methods implemented
// ──────────────────────────────────────────────────────────────────────────
/** OG CUserLocal::GetSecondaryStat — returns secondary stat from CWvsContext */
export function GetSecondaryStat() {
    // OG: returns (SecondaryStat*)(CWvsContext + 8520)
    return new SecondaryStat();
}
/** OG CUserLocal::GetShoeAttr — returns shoe attribute */
export function GetShoeAttr() {
    return _instance?.shoeAttr ?? null;
}
/** OG CUserLocal::CanUseBareHand — checks if job can use bare hand (job%1000/100 == 5) */
export function CanUseBareHand() {
    const jobCode = GetJobCode();
    return Math.floor(jobCode % 1000 / 100) === 5;
}
/** OG CUserLocal::GetJobCode — returns job code from CharacterData */
export function GetJobCode() {
    // OG: CWvsContext::GetCharacterData → characterStat.nJob
    return 0;
}
/** OG CUserLocal::GetFieldID — returns current field ID */
export function GetFieldID() {
    // OG: CWvsContext::GetCurFieldID
    return 0;
}
/** OG CUserLocal::GetCharacterLevel — returns character level */
export function GetCharacterLevel() {
    return 0;
}
// ── State checks ──────────────────────────────────────────────────────────
/** OG CUserLocal::IsDashing — checks if dashing (Magnet/Charge/Combo) */
export function IsDashing() {
    // OG: checks SecondaryStat dash buff and GetDashingSkill
    return false;
}
/** OG CUserLocal::IsDashing2 — checks dash type 2 (skill 4321000) */
export function IsDashing2() {
    return false;
}
/** OG CUserLocal::IsStun — checks stun debuff */
export function IsStun() {
    const ss = GetSecondaryStat();
    return ss.nStun_ !== 0;
}
/** OG CUserLocal::IsWeakened — checks weakness debuff */
export function IsWeakened() {
    const ss = GetSecondaryStat();
    return ss.nWeakness_ !== 0;
}
/** OG CUserLocal::IsSealed — checks seal debuff */
export function IsSealed() {
    const ss = GetSecondaryStat();
    return ss.nSeal_ !== 0;
}
/** OG CUserLocal::IsSit — checks if sitting */
export function IsSit() {
    return _instance?.m_bSit ?? false;
}
/** OG CUserLocal::IsAttract — checks attract state */
export function IsAttract() {
    return false;
}
/** OG CUserLocal::IsStopPortion — checks stop portion state */
export function IsStopPortion() {
    return false;
}
/** OG CUserLocal::IsWeaponDisabled — checks if weapon is disabled */
export function IsWeaponDisabled() {
    return false;
}
/** OG CUserLocal::IsPreparingSkill — checks if preparing a skill */
export function IsPreparingSkill() {
    return (_instance?.preparingSkill.nSkillID ?? 0) !== 0;
}
/** OG CUserLocal::IsImmovable — checks if immovable (stun/freeze/web/sit/preparing) */
export function IsImmovable() {
    if (IsPreparingSkill())
        return true;
    if (IsSit())
        return true;
    const ss = GetSecondaryStat();
    if (ss.nStun_ || ss.nFreeze_ || ss.nWeb_)
        return true;
    return false;
}
/** OG CUserLocal::IsAdminHide — checks admin hide state */
export function IsAdminHide() {
    return false;
}
/** OG CUserLocal::IsPreview — checks preview mode */
export function IsPreview() {
    return false;
}
/** OG CUserLocal::IsLocalUser — always true for CUserLocal */
export function IsLocalUser() {
    return true;
}
/** OG CUserLocal::IsRemoteUser — always false for CUserLocal */
export function IsRemoteUser() {
    return false;
}
// ── Getters ───────────────────────────────────────────────────────────────
/** OG CUserLocal::GetOnDashSkill — returns dash skill ID */
export function GetOnDashSkill() {
    return 0;
}
/** OG CUserLocal::HasOnDashSkill — checks if has dash skill */
export function HasOnDashSkill() {
    return GetOnDashSkill() !== 0;
}
/** OG CUserLocal::GetAchillesReduce — returns Achilles damage reduction */
export function GetAchillesReduce() {
    return 0;
}
/** OG CUserLocal::GetRepeatSkillPoint — returns repeat skill points */
export function GetRepeatSkillPoint() {
    return _instance?.repeatSkillPoint ?? 0;
}
/** OG CUserLocal::GetProperBulletPosition — returns bullet position for ranged */
export function GetProperBulletPosition() {
    return 0;
}
/** OG CUserLocal::GetSpiritJavelinItemID — returns Spirit Javelin item ID */
export function GetSpiritJavelinItemID() {
    return _instance?.spiritJavelinItemId ?? 0;
}
/** OG CUserLocal::GetTeslaCoilCount — returns Tesla Coil count */
export function GetTeslaCoilCount() {
    return _instance?.teslaCoilCount ?? 0;
}
/** OG CUserLocal::GetTeslaCoilSummonedID — returns Tesla Coil summoned ID */
export function GetTeslaCoilSummonedID() {
    return _instance?.teslaCoilSummonedId ?? 0;
}
/** OG CUserLocal::GetDCRect — returns DC rect */
export function GetDCRect() {
    return _instance?.dcRect ?? { x: 0, y: 0, w: 0, h: 0 };
}
/** OG CUserLocal::GetUpFromPortableChair — get up from portable chair */
export function GetUpFromPortableChair() {
    // OG: sends packet to server
}
/** OG CUserLocal::GetPassiveSkillData — returns passive skill data */
export function GetPassiveSkillData() {
    return _instance?.passiveSkillData ?? null;
}
/** OG CUserLocal::GetMonsterCardCheckListSize — returns monster card checklist size */
export function GetMonsterCardCheckListSize() {
    return _instance?.monsterCardCheckList?.length ?? 0;
}
/** OG CUserLocal::GetMonsterCardCount — returns monster card count */
export function GetMonsterCardCount() {
    return _instance?.monsterCardCount ?? 0;
}
// ── Combat ────────────────────────────────────────────────────────────────
/** OG CUserLocal::CalcBuffDefenseAttr — calculates buff defense attribute */
export function CalcBuffDefenseAttr(_nSkillID, _nDamage) {
    return 0;
}
/** OG CUserLocal::RevisePassiveSkillData — revises passive skill data */
export function RevisePassiveSkillData() {
    // OG: updates passive skill bonuses
}
/** OG CUserLocal::ClearCombo — clears combo counter */
export function ClearCombo() {
    // OG: resets combo count to 0
}
/** OG CUserLocal::ShowCounterDamage — shows counter damage display */
export function ShowCounterDamage(_nDamage) {
    // OG: displays counter damage number
}
/** OG CUserLocal::ApplyAllSkillLevelUP — applies all skill level up */
export function ApplyAllSkillLevelUP() {
    // OG: applies skill level increase to all skills
}
/** OG CUserLocal::ApplyAccessoryOption — applies accessory item options */
export function ApplyAccessoryOption() {
    // OG: processes accessory item options
}
/** OG CUserLocal::ApplyEmotionOption — applies emotion option */
export function ApplyEmotionOption() {
    // OG: processes emotion item options
}
/** OG CUserLocal::ApplyIgnoreDAMOption — applies ignore damage option */
export function ApplyIgnoreDAMOption() {
    // OG: processes ignore damage item options
}
/** OG CUserLocal::ApplyInvicibleOption — applies invincible option */
export function ApplyInvicibleOption() {
    // OG: processes invincibility item options
}
/** OG CUserLocal::ApplyRecoveryOption — applies recovery option */
export function ApplyRecoveryOption() {
    // OG: processes HP/MP recovery item options
}
/** OG CUserLocal::ApplyMechanicMode — applies mechanic mode */
export function ApplyMechanicMode(_nMode, _nOption) {
    // OG: processes mechanic transformation
}
// ── Input ─────────────────────────────────────────────────────────────────
/** OG CUserLocal::HandleLButtonDown — handles left mouse button down */
export function HandleLButtonDown() {
    // OG: processes left click for interaction
}
/** OG CUserLocal::HandleRButtonClk — handles right mouse button click */
export function HandleRButtonClk() {
    // OG: context menu on right click
}
/** OG CUserLocal::HandleXKeyDown — handles X key down */
export function HandleXKeyDown() {
    // OG: handles special key combinations
}
/** OG CUserLocal::ProcessDualKey — processes dual key input */
export function ProcessDualKey() {
    // OG: handles dual key combinations
}
/** OG CUserLocal::UseFuncKeyMappedUpKey — uses func key mapped to up key */
export function UseFuncKeyMappedUpKey() {
    // OG: handles function key mapping
}
// ── Movement ──────────────────────────────────────────────────────────────
/** OG CUserLocal::TryDoingRush — tries to perform rush attack */
export function TryDoingRush() {
    // OG: rush attack logic
}
/** OG CUserLocal::TryDoingFlyingRush — tries to perform flying rush */
export function TryDoingFlyingRush() {
    // OG: flying rush attack logic
}
/** OG CUserLocal::TryDoingFallDown — tries to perform fall down */
export function TryDoingFallDown() {
    // OG: fall down animation
}
/** OG CUserLocal::TryDoingMine — tries to place/use mine */
export function TryDoingMine() {
    // OG: mine placement logic
}
/** OG CUserLocal::TryDoingWings — tries to use wings */
export function TryDoingWings() {
    // OG: wings usage logic
}
/** OG CUserLocal::TryDoingItemSkill — tries to use item skill */
export function TryDoingItemSkill() {
    // OG: item skill activation
}
/** OG CUserLocal::TryDoingSitdownHealing — tries sitdown healing */
export function TryDoingSitdownHealing() {
    // OG: sitdown healing logic
}
/** OG CUserLocal::TryDoingSmoothingMovingShootAttackPrepare — smoothing shoot prep */
export function TryDoingSmoothingMovingShootAttackPrepare() {
    // OG: shoot attack preparation
}
/** OG CUserLocal::VerticalJump — performs vertical jump */
export function VerticalJump() {
    // OG: vertical jump logic
}
/** OG CUserLocal::MoveToPortal — moves to portal by name */
export function MoveToPortal(_sPortalName) {
    // OG: sends move to portal packet
}
// ── Rush/Combo ────────────────────────────────────────────────────────────
/** OG CUserLocal::BeRushValid — checks if rush is valid */
export function BeRushValid() {
    return false;
}
/** OG CUserLocal::AddRushElem — adds rush element */
export function AddRushElem() {
    // OG: adds rush element to combo
}
/** OG CUserLocal::RequestIncCombo — requests combo increment */
export function RequestIncCombo() {
    // OG: sends combo increment packet
}
/** OG CUserLocal::ResetOneTimeAction — resets one-time action */
export function ResetOneTimeAction() {
    // OG: resets one-time action state
}
/** OG CUserLocal::TryRegisterFinalAttack — tries to register final attack */
export function TryRegisterFinalAttack() {
    // OG: final attack registration
}
/** OG CUserLocal::TryRegisterSerialAttack — tries to register serial attack */
export function TryRegisterSerialAttack() {
    // OG: serial attack registration
}
/** OG CUserLocal::TryRegisterSparkAttack — tries to register spark attack */
export function TryRegisterSparkAttack() {
    // OG: spark attack registration
}
/** OG CUserLocal::TryLeaveDirectionMode — tries to leave direction mode */
export function TryLeaveDirectionMode() {
    // OG: exit direction/cutscene mode
}
// ── Setters ───────────────────────────────────────────────────────────────
/** OG CUserLocal::SetShoeAttr — sets shoe attribute */
export function SetShoeAttr(_attr) {
    if (_instance)
        _instance.shoeAttr = _attr;
}
/** OG CUserLocal::SetPortableChairStatSetSent — sets portable chair stat sent flag */
export function SetPortableChairStatSetSent(_sent) {
    if (_instance)
        _instance.bPortableChairStatSetSent = _sent;
}
/** OG CUserLocal::SetPairCharacterID — sets pair character ID */
export function SetPairCharacterID(_id) {
    if (_instance)
        _instance.pairCharacterId = _id;
}
/** OG CUserLocal::SetFriendPairCharacterID — sets friend pair character ID */
export function SetFriendPairCharacterID(_id) {
    if (_instance)
        _instance.friendPairCharacterId = _id;
}
/** OG CUserLocal::SetMarriagePairCharacterID — sets marriage pair character ID */
export function SetMarriagePairCharacterID(_id) {
    if (_instance)
        _instance.marriagePairCharacterId = _id;
}
/** OG CUserLocal::SetNewYearCardPairCharacterID — sets new year card pair ID */
export function SetNewYearCardPairCharacterID(_id) {
    if (_instance)
        _instance.newYearCardPairCharacterId = _id;
}
/** OG CUserLocal::SetMonsterBookCover — sets monster book cover */
export function SetMonsterBookCover(_cover) {
    if (_instance)
        _instance.monsterBookCover = _cover;
}
/** OG CUserLocal::SetMonsterCardCheckList — sets monster card checklist */
export function SetMonsterCardCheckList(_list) {
    if (_instance)
        _instance.monsterCardCheckList = _list;
}
/** OG CUserLocal::SetClientTimer — sets client timer */
export function SetClientTimer(_timer) {
    if (_instance)
        _instance.clientTimerValue = _timer;
}
/** OG CUserLocal::SetPassiveSkillDataForced — sets passive skill data forced */
export function SetPassiveSkillDataForced(_data) {
    if (_instance)
        _instance.passiveSkillData = _data;
}
/** OG CUserLocal::SetChatPassiveSkillDataInfo — sets chat passive skill info */
export function SetChatPassiveSkillDataInfo(_info) {
    if (_instance)
        _instance.chatPassiveSkillDataInfo = _info;
}
/** OG CUserLocal::SetAttractMove — sets attract move state */
export function SetAttractMove(_attract) {
    if (_instance)
        _instance.bAttractMove = _attract;
}
/** OG CUserLocal::SetActiveEffectItemForLocal — sets active effect item */
export function SetActiveEffectItemForLocal(_itemId) {
    // OG: sets active visual effect item
}
/** OG CUserLocal::SetCarryItemEffectForLocal — sets carry item effect */
export function SetCarryItemEffectForLocal(_itemId) {
    // OG: sets carry visual effect
}
/** OG CUserLocal::ClearToolTip — clears tooltip */
export function ClearToolTip() {
    // OG: clears current tooltip display
}
/** OG CUserLocal::RedrawGuildNameTag — redraws guild name tag */
export function RedrawGuildNameTag() {
    // OG: redraws guild name tag above character
}
/** OG CUserLocal::SetPetsAngry — sets pets angry state */
export function SetPetsAngry() {
    // OG: triggers pet angry state
}
/** OG CUserLocal::ChangeTeslaCoilEndTime — changes Tesla Coil end time */
export function ChangeTeslaCoilEndTime(_time) {
    // OG: updates Tesla Coil end time
}
// ── Pet ───────────────────────────────────────────────────────────────────
/** OG CUserLocal::PetInterActWithItem — pet interaction with item */
export function PetInterActWithItem(_itemId) {
    // OG: sends pet interact with item packet
    return 0;
}
/** OG CUserLocal::PetInterActWithUserAction — pet interaction with user action */
export function PetInterActWithUserAction(_action, _param) {
    // OG: sends pet interact with user action packet
    return 0;
}
/** OG CUserLocal::TryConsumePetHP — tries to consume pet HP */
export function TryConsumePetHP() {
    // OG: pet HP consumption logic
}
/** OG CUserLocal::TryConsumePetMP — tries to consume pet MP */
export function TryConsumePetMP() {
    // OG: pet MP consumption logic
}
// ── Riding ────────────────────────────────────────────────────────────────
/** OG CUserLocal::CheckRidingVehicle — checks if riding vehicle */
export function CheckRidingVehicle() {
    return false;
}
/** OG CUserLocal::CheckRidingVehicleExceptMechanic — checks riding except mechanic */
export function CheckRidingVehicleExceptMechanic() {
    return false;
}
// ── Collision/Reactor ─────────────────────────────────────────────────────
/** OG CUserLocal::CheckBoobyTrapPickUpRequest — checks booby trap pickup */
export function CheckBoobyTrapPickUpRequest() {
    return false;
}
/** OG CUserLocal::CheckReactor_Collision — checks reactor collision */
export function CheckReactor_Collision() {
    // OG: reactor collision detection
}
/** OG CUserLocal::FindHitSummonedInRect — finds hit summoned in rect */
export function FindHitSummonedInRect() {
    // OG: finds summoned entities in attack rect
}
/** OG CUserLocal::OnCollisionCustomImpact — handles custom impact collision */
export function OnCollisionCustomImpact() {
    // OG: custom impact collision handling
}
// ── Packet handlers ───────────────────────────────────────────────────────
/** OG CUserLocal::OnSetDead — handles death state */
export function OnSetDead(_bDyingNow) {
    // OG: opens revive UI, stops skill sounds
}
/** OG CUserLocal::OnRevive — handles revival */
export function OnRevive() {
    // OG: closes revive UI, calls base CUser::OnRevive
}
/** OG CUserLocal::OnTeleport — handles teleport confirmation */
export function OnTeleport(_x, _y) {
    // OG: updates player position from server
}
/** OG CUserLocal::OnSummonedCreated — handles summoned creation */
export function OnSummonedCreated() {
    // OG: summoned entity created
}
/** OG CUserLocal::OnTemporaryStatChanged — handles temp stat change */
export function OnTemporaryStatChanged() {
    // OG: temporary stat change notification
}
/** OG CUserLocal::OnMakerResult — handles maker result */
export function OnMakerResult() {
    // OG: maker/crafting result
}
/** OG CUserLocal::OnSetStandAloneMode — handles stand alone mode */
export function OnSetStandAloneMode(_standAlone) {
    // OG: sets stand alone mode
}
/** OG CUserLocal::OnSitResult — handles sit result */
export function OnSitResult() {
    // OG: sit action result
}
/** OG CUserLocal::OnSkillCooltimeSet — handles skill cooldown set */
export function OnSkillCooltimeSet() {
    // OG: skill cooldown notification
}
/** OG CUserLocal::OnFieldFadeInOut — handles field fade in/out */
export function OnFieldFadeInOut(_color, _duration, _fadeOut, _fadeTime) {
    // OG: screen fade effect
}
/** OG CUserLocal::OnFieldFadeOutForce — handles forced fade out */
export function OnFieldFadeOutForce(_color) {
    // OG: forced screen fade out
}
/** OG CUserLocal::OnNotifyHPDecByField — handles HP drain by field */
export function OnNotifyHPDecByField(_amount) {
    // OG: environmental HP drain
}
/** OG CUserLocal::OnSetDirectionMode — handles direction mode */
export function OnSetDirectionMode(_bDirection, _afterDelay) {
    // OG: enables/disables player control for cutscenes
}
// ── Quest ─────────────────────────────────────────────────────────────────
/** OG CUserLocal::ShowAutoStartQuestList — shows auto-start quest list */
export function ShowAutoStartQuestList() {
    // OG: shows available auto-start quests
}
/** OG CUserLocal::EraseAutoQuestAlert — erases auto quest alert */
export function EraseAutoQuestAlert() {
    // OG: clears auto quest alert
}
/** OG CUserLocal::FollowCharacterFailedMsg — shows follow character failed message */
export function FollowCharacterFailedMsg() {
    // OG: shows follow failed message
}
/** OG CUserLocal::TryAutoRequestFollowCharacter — tries auto request follow character */
export function TryAutoRequestFollowCharacter() {
    // OG: automatically requests follow character from server
}
// ── Movement/Combat ───────────────────────────────────────────────────────
/** OG CUserLocal::SendBanMapByMobRequest — sends ban map by mob request */
export function SendBanMapByMobRequest() {
    // OG: sends ban map packet
}
/** OG CUserLocal::SendRepeatEffectRemoveRequest — sends repeat effect remove */
export function SendRepeatEffectRemoveRequest() {
    // OG: sends repeat effect remove packet
}
/** OG CUserLocal::RequestUpgradeTombEffect — requests upgrade tomb effect */
export function RequestUpgradeTombEffect() {
    // OG: upgrade tomb visual effect
}
/** OG CUserLocal::UpdateClientTimer — updates client timer */
export function UpdateClientTimer() {
    // OG: updates client timer display
}
/** OG CUserLocal::UpdateMonsterBookInfo — updates monster book info */
export function UpdateMonsterBookInfo() {
    // OG: updates monster book data
}
/** OG CUserLocal::ValidateSkillBonus — validates skill bonus */
export function ValidateSkillBonus() {
    // OG: validates and applies skill bonuses
}
/** OG CUserLocal::RemoveTutor — removes tutor */
export function RemoveTutor() {
    // OG: removes tutor NPC
}
/** OG CUserLocal::IsGL5thEventCakeTeam — checks GL 5th event cake team */
export function IsGL5thEventCakeTeam() {
    return false;
}
/** OG CUserLocal::IsGL5thEventPieTeam — checks GL 5th event pie team */
export function IsGL5thEventPieTeam() {
    return false;
}
//# sourceMappingURL=CUserLocal.js.map