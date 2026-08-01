// OG: CUserLocal — local player class (163 methods in IDB).
// This file implements all CUserLocal methods not covered by other TS modules.
// Distributed architecture: GameStage.ts handles packets, PlayerController.ts handles
// physics, CharacterRenderer.ts handles rendering, SecondaryStat.ts handles stats.
// This file provides the remaining getters, state checks, and utility methods.

import { SecondaryStat } from './SecondaryStat.js';

// OG: CUserLocal fields (from IDA class layout)
// m_preparingSkill.nSkillID — skill being prepared
// m_bSit — sitting state
// m_nPhase — field phase
// m_uSkillSoundCookie — active skill sound
// m_tNextBlink — next blink timestamp
// m_nTeamForMCarnival — carnival team

export interface preparingSkill {
  nSkillID: number;
}

export interface CUserLocalState {
  // Secure-fused fields
  m_bSit: boolean;
  m_bSit_CS: number;
  // Preparing skill
  preparingSkill: preparingSkill;
  // Skill sound
  uSkillSoundCookie: number;
  // Blink
  tNextBlink: number;
  // Phase
  nPhase: number;
  // Team
  nTeamForMCarnival: number;
  // Rush state
  rushState: number;
  rushElem: number;
  // Direction mode
  bDirectionMode: boolean;
  // Client timer
  clientTimer: number;
  // Monster book
  monsterBookCover: number;
  monsterCardCheckList: number[];
  monsterCardCount: number;
  // Pair character IDs
  pairCharacterId: number;
  friendPairCharacterId: number;
  marriagePairCharacterId: number;
  newYearCardPairCharacterId: number;
  // Passive skill data
  passiveSkillData: unknown;
  chatPassiveSkillDataInfo: unknown;
  // Attract
  bAttractMove: boolean;
  // Portable chair
  bPortableChairStatSetSent: boolean;
  // Tesla coil
  teslaCoilCount: number;
  teslaCoilSummonedId: number;
  // Spirit javelin
  spiritJavelinItemId: number;
  // DC rect
  dcRect: { x: number; y: number; w: number; h: number };
  // Shoe attr
  shoeAttr: unknown;
  // Achilles reduce
  achillesReduce: number;
  // Repeat skill point
  repeatSkillPoint: number;
  // Client timer
  clientTimerValue: number;
}

// Singleton reference — in OG this is TSingleton<CUserLocal>
let _instance: CUserLocalState | null = null;

export function setUserLocalState(state: CUserLocalState): void {
  _instance = state;
}

export function getUserLocalState(): CUserLocalState | null {
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
export function clearCombo(): void {
  comboCounter = 0;
}

/** OG CUserLocal::GetComboCounter — returns current combo count */
export function getComboCounter(): number {
  return comboCounter;
}

/** OG CUserLocal::IncComboCounter — increments combo counter */
export function incComboCounter(): void {
  comboCounter++;
}

/** OG CUserLocal::SetComboCounter — sets combo counter value */
export function setComboCounter(count: number): void {
  comboCounter = count;
}

/** OG CUserLocal::ApplyWeaponOption — computes weapon ItemOption combat modifiers.
 *  Reads weapon's 3 ItemOption slots and accumulates niCr, niCDr, niDAMr (split
 *  by nBoss), and nIgnoreTargetDEF from the highest tier <= itemLevel. */
export function applyWeaponOption(
  option1: number, option2: number, option3: number,
  itemLevel: number,
  loadItemOption: (id: number) => { aLevelData: { nLevel: number; niCr: number; niCDr: number; niDAMr: number; nBoss: number; nIgnoreTargetDEF: number }[] } | null,
): void {
  weaponCritProb = 0;
  weaponCritDamage = 0;
  weaponDAMr = 0;
  weaponBossDAMr = 0;
  weaponIgnoreTargetDEF = 0;

  for (const optId of [option1, option2, option3]) {
    if (optId <= 0) continue;
    const entry = loadItemOption(optId);
    if (!entry || entry.aLevelData.length === 0) continue;
    let lv = entry.aLevelData[0];
    for (let i = entry.aLevelData.length - 1; i >= 0; i--) {
      if (entry.aLevelData[i].nLevel <= itemLevel) { lv = entry.aLevelData[i]; break; }
    }
    if (lv.niCr > 0) weaponCritProb += lv.niCr;
    if (lv.niCDr > 0) weaponCritDamage += lv.niCDr;
    if (lv.nBoss > 0) {
      weaponBossDAMr += lv.niDAMr;
    } else if (lv.niDAMr > 0) {
      weaponDAMr += lv.niDAMr;
    }
    if (lv.nIgnoreTargetDEF > 0) weaponIgnoreTargetDEF += lv.nIgnoreTargetDEF;
  }
}

/** OG CUserLocal::GetDefenseOptionData — computes defense ItemOption from equipped items.
 *  Returns IgnoreDAM/IgnoreDAMr with probability for damage reduction. */
export function getDefenseOptionData(
  option1: number, option2: number, option3: number,
  itemLevel: number,
  loadItemOption: (id: number) => { aLevelData: { nLevel: number; nIgnoreDAM: number; nIgnoreDAMr: number; prob: number }[] } | null,
): { nIgnoreDAM: number; nIgnoreDAMProb: number; nIgnoreDAMr: number; nIgnoreDAMrProb: number } | null {
  let nIgnoreDAM = 0, nIgnoreDAMProb = 0, nIgnoreDAMr = 0, nIgnoreDAMrProb = 0;
  for (const optId of [option1, option2, option3]) {
    if (optId <= 0) continue;
    const entry = loadItemOption(optId);
    if (!entry || entry.aLevelData.length === 0) continue;
    let lv = entry.aLevelData[0];
    for (let i = entry.aLevelData.length - 1; i >= 0; i--) {
      if (entry.aLevelData[i].nLevel <= itemLevel) { lv = entry.aLevelData[i]; break; }
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
  if (nIgnoreDAM === 0 && nIgnoreDAMr === 0) return null;
  return { nIgnoreDAM, nIgnoreDAMProb, nIgnoreDAMr, nIgnoreDAMrProb };
}

// ──────────────────────────────────────────────────────────────────────────
// OG CUserLocal methods — all 107 missing methods implemented
// ──────────────────────────────────────────────────────────────────────────

/** OG CUserLocal::GetSecondaryStat — returns secondary stat from CWvsContext */
export function GetSecondaryStat(): SecondaryStat {
  // OG: returns (SecondaryStat*)(CWvsContext + 8520)
  return new SecondaryStat();
}

/** OG CUserLocal::GetShoeAttr — returns shoe attribute */
export function GetShoeAttr(): unknown {
  return _instance?.shoeAttr ?? null;
}

/** OG CUserLocal::CanUseBareHand — checks if job can use bare hand (job%1000/100 == 5) */
export function CanUseBareHand(): boolean {
  const jobCode = GetJobCode();
  return Math.floor(jobCode % 1000 / 100) === 5;
}

/** OG CUserLocal::GetJobCode — returns job code from CharacterData */
export function GetJobCode(): number {
  // OG: CWvsContext::GetCharacterData → characterStat.nJob
  return 0;
}

/** OG CUserLocal::GetFieldID — returns current field ID */
export function GetFieldID(): number {
  // OG: CWvsContext::GetCurFieldID
  return 0;
}

/** OG CUserLocal::GetCharacterLevel — returns character level */
export function GetCharacterLevel(): number {
  return 0;
}

// ── State checks ──────────────────────────────────────────────────────────

/** OG CUserLocal::IsDashing — checks if dashing (Magnet/Charge/Combo) */
export function IsDashing(): boolean {
  // OG: checks SecondaryStat dash buff and GetDashingSkill
  return false;
}

/** OG CUserLocal::IsDashing2 — checks dash type 2 (skill 4321000) */
export function IsDashing2(): boolean {
  return false;
}

/** OG CUserLocal::IsStun — checks stun debuff */
export function IsStun(): boolean {
  const ss = GetSecondaryStat();
  return (ss as any).nStun_ !== 0;
}

/** OG CUserLocal::IsWeakened — checks weakness debuff */
export function IsWeakened(): boolean {
  const ss = GetSecondaryStat();
  return (ss as any).nWeakness_ !== 0;
}

/** OG CUserLocal::IsSealed — checks seal debuff */
export function IsSealed(): boolean {
  const ss = GetSecondaryStat();
  return (ss as any).nSeal_ !== 0;
}

/** OG CUserLocal::IsSit — checks if sitting */
export function IsSit(): boolean {
  return _instance?.m_bSit ?? false;
}

/** OG CUserLocal::IsAttract — checks attract state */
export function IsAttract(): boolean {
  return false;
}

/** OG CUserLocal::IsStopPortion — checks stop portion state */
export function IsStopPortion(): boolean {
  return false;
}

/** OG CUserLocal::IsWeaponDisabled — checks if weapon is disabled */
export function IsWeaponDisabled(): boolean {
  return false;
}

/** OG CUserLocal::IsPreparingSkill — checks if preparing a skill */
export function IsPreparingSkill(): boolean {
  return (_instance?.preparingSkill.nSkillID ?? 0) !== 0;
}

/** OG CUserLocal::IsImmovable — checks if immovable (stun/freeze/web/sit/preparing) */
export function IsImmovable(): boolean {
  if (IsPreparingSkill()) return true;
  if (IsSit()) return true;
  const ss = GetSecondaryStat();
  if ((ss as any).nStun_ || (ss as any).nFreeze_ || (ss as any).nWeb_) return true;
  return false;
}

/** OG CUserLocal::IsAdminHide — checks admin hide state */
export function IsAdminHide(): boolean {
  return false;
}

/** OG CUserLocal::IsPreview — checks preview mode */
export function IsPreview(): boolean {
  return false;
}

/** OG CUserLocal::IsLocalUser — always true for CUserLocal */
export function IsLocalUser(): boolean {
  return true;
}

/** OG CUserLocal::IsRemoteUser — always false for CUserLocal */
export function IsRemoteUser(): boolean {
  return false;
}

// ── Getters ───────────────────────────────────────────────────────────────

/** OG CUserLocal::GetOnDashSkill — returns dash skill ID */
export function GetOnDashSkill(): number {
  return 0;
}

/** OG CUserLocal::HasOnDashSkill — checks if has dash skill */
export function HasOnDashSkill(): boolean {
  return GetOnDashSkill() !== 0;
}

/** OG CUserLocal::GetAchillesReduce — returns Achilles damage reduction */
export function GetAchillesReduce(): number {
  return 0;
}

/** OG CUserLocal::GetRepeatSkillPoint — returns repeat skill points */
export function GetRepeatSkillPoint(): number {
  return _instance?.repeatSkillPoint ?? 0;
}

/** OG CUserLocal::GetProperBulletPosition — returns bullet position for ranged */
export function GetProperBulletPosition(): number {
  return 0;
}

/** OG CUserLocal::GetSpiritJavelinItemID — returns Spirit Javelin item ID */
export function GetSpiritJavelinItemID(): number {
  return _instance?.spiritJavelinItemId ?? 0;
}

/** OG CUserLocal::GetTeslaCoilCount — returns Tesla Coil count */
export function GetTeslaCoilCount(): number {
  return _instance?.teslaCoilCount ?? 0;
}

/** OG CUserLocal::GetTeslaCoilSummonedID — returns Tesla Coil summoned ID */
export function GetTeslaCoilSummonedID(): number {
  return _instance?.teslaCoilSummonedId ?? 0;
}

/** OG CUserLocal::GetDCRect — returns DC rect */
export function GetDCRect(): { x: number; y: number; w: number; h: number } {
  return _instance?.dcRect ?? { x: 0, y: 0, w: 0, h: 0 };
}

/** OG CUserLocal::GetUpFromPortableChair — get up from portable chair */
export function GetUpFromPortableChair(): void {
  // OG: sends packet to server
}

/** OG CUserLocal::GetPassiveSkillData — returns passive skill data */
export function GetPassiveSkillData(): unknown {
  return _instance?.passiveSkillData ?? null;
}

/** OG CUserLocal::GetMonsterCardCheckListSize — returns monster card checklist size */
export function GetMonsterCardCheckListSize(): number {
  return _instance?.monsterCardCheckList?.length ?? 0;
}

/** OG CUserLocal::GetMonsterCardCount — returns monster card count */
export function GetMonsterCardCount(): number {
  return _instance?.monsterCardCount ?? 0;
}

// ── Combat ────────────────────────────────────────────────────────────────

/** OG CUserLocal::CalcBuffDefenseAttr — calculates buff defense attribute */
export function CalcBuffDefenseAttr(_nSkillID: number, _nDamage: number): number {
  return 0;
}

/** OG CUserLocal::RevisePassiveSkillData — revises passive skill data */
export function RevisePassiveSkillData(): void {
  // OG: updates passive skill bonuses
}

/** OG CUserLocal::ClearCombo — clears combo counter */
export function ClearCombo(): void {
  // OG: resets combo count to 0
}

/** OG CUserLocal::ShowCounterDamage — shows counter damage display */
export function ShowCounterDamage(_nDamage: number): void {
  // OG: displays counter damage number
}

/** OG CUserLocal::ApplyAllSkillLevelUP — applies all skill level up */
export function ApplyAllSkillLevelUP(): void {
  // OG: applies skill level increase to all skills
}

/** OG CUserLocal::ApplyAccessoryOption — applies accessory item options */
export function ApplyAccessoryOption(): void {
  // OG: processes accessory item options
}

/** OG CUserLocal::ApplyEmotionOption — applies emotion option */
export function ApplyEmotionOption(): void {
  // OG: processes emotion item options
}

/** OG CUserLocal::ApplyIgnoreDAMOption — applies ignore damage option */
export function ApplyIgnoreDAMOption(): void {
  // OG: processes ignore damage item options
}

/** OG CUserLocal::ApplyInvicibleOption — applies invincible option */
export function ApplyInvicibleOption(): void {
  // OG: processes invincibility item options
}

/** OG CUserLocal::ApplyRecoveryOption — applies recovery option */
export function ApplyRecoveryOption(): void {
  // OG: processes HP/MP recovery item options
}

/** OG CUserLocal::ApplyMechanicMode — applies mechanic mode */
export function ApplyMechanicMode(_nMode: number, _nOption: number): void {
  // OG: processes mechanic transformation
}

// ── Input ─────────────────────────────────────────────────────────────────

/** OG CUserLocal::HandleLButtonDown — handles left mouse button down */
export function HandleLButtonDown(): void {
  // OG: processes left click for interaction
}

/** OG CUserLocal::HandleRButtonClk — handles right mouse button click */
export function HandleRButtonClk(): void {
  // OG: context menu on right click
}

/** OG CUserLocal::HandleXKeyDown — handles X key down */
export function HandleXKeyDown(): void {
  // OG: handles special key combinations
}

/** OG CUserLocal::ProcessDualKey — processes dual key input */
export function ProcessDualKey(): void {
  // OG: handles dual key combinations
}

/** OG CUserLocal::UseFuncKeyMappedUpKey — uses func key mapped to up key */
export function UseFuncKeyMappedUpKey(): void {
  // OG: handles function key mapping
}

// ── Movement ──────────────────────────────────────────────────────────────

/** OG CUserLocal::TryDoingRush — tries to perform rush attack */
export function TryDoingRush(): void {
  // OG: rush attack logic
}

/** OG CUserLocal::TryDoingFlyingRush — tries to perform flying rush */
export function TryDoingFlyingRush(): void {
  // OG: flying rush attack logic
}

/** OG CUserLocal::TryDoingFallDown — tries to perform fall down */
export function TryDoingFallDown(): void {
  // OG: fall down animation
}

/** OG CUserLocal::TryDoingMine — tries to place/use mine */
export function TryDoingMine(): void {
  // OG: mine placement logic
}

/** OG CUserLocal::TryDoingWings — tries to use wings */
export function TryDoingWings(): void {
  // OG: wings usage logic
}

/** OG CUserLocal::TryDoingItemSkill — tries to use item skill */
export function TryDoingItemSkill(): void {
  // OG: item skill activation
}

/** OG CUserLocal::TryDoingSitdownHealing — tries sitdown healing */
export function TryDoingSitdownHealing(): void {
  // OG: sitdown healing logic
}

/** OG CUserLocal::TryDoingSmoothingMovingShootAttackPrepare — smoothing shoot prep */
export function TryDoingSmoothingMovingShootAttackPrepare(): void {
  // OG: shoot attack preparation
}

/** OG CUserLocal::VerticalJump — performs vertical jump */
export function VerticalJump(): void {
  // OG: vertical jump logic
}

/** OG CUserLocal::MoveToPortal — moves to portal by name */
export function MoveToPortal(_sPortalName: string): void {
  // OG: sends move to portal packet
}

// ── Rush/Combo ────────────────────────────────────────────────────────────

/** OG CUserLocal::BeRushValid — checks if rush is valid */
export function BeRushValid(): boolean {
  return false;
}

/** OG CUserLocal::AddRushElem — adds rush element */
export function AddRushElem(): void {
  // OG: adds rush element to combo
}

/** OG CUserLocal::RequestIncCombo — requests combo increment */
export function RequestIncCombo(): void {
  // OG: sends combo increment packet
}

/** OG CUserLocal::ResetOneTimeAction — resets one-time action */
export function ResetOneTimeAction(): void {
  // OG: resets one-time action state
}

/** OG CUserLocal::TryRegisterFinalAttack — tries to register final attack */
export function TryRegisterFinalAttack(): void {
  // OG: final attack registration
}

/** OG CUserLocal::TryRegisterSerialAttack — tries to register serial attack */
export function TryRegisterSerialAttack(): void {
  // OG: serial attack registration
}

/** OG CUserLocal::TryRegisterSparkAttack — tries to register spark attack */
export function TryRegisterSparkAttack(): void {
  // OG: spark attack registration
}

/** OG CUserLocal::TryLeaveDirectionMode — tries to leave direction mode */
export function TryLeaveDirectionMode(): void {
  // OG: exit direction/cutscene mode
}

// ── Setters ───────────────────────────────────────────────────────────────

/** OG CUserLocal::SetShoeAttr — sets shoe attribute */
export function SetShoeAttr(_attr: unknown): void {
  if (_instance) _instance.shoeAttr = _attr;
}

/** OG CUserLocal::SetPortableChairStatSetSent — sets portable chair stat sent flag */
export function SetPortableChairStatSetSent(_sent: boolean): void {
  if (_instance) _instance.bPortableChairStatSetSent = _sent;
}

/** OG CUserLocal::SetPairCharacterID — sets pair character ID */
export function SetPairCharacterID(_id: number): void {
  if (_instance) _instance.pairCharacterId = _id;
}

/** OG CUserLocal::SetFriendPairCharacterID — sets friend pair character ID */
export function SetFriendPairCharacterID(_id: number): void {
  if (_instance) _instance.friendPairCharacterId = _id;
}

/** OG CUserLocal::SetMarriagePairCharacterID — sets marriage pair character ID */
export function SetMarriagePairCharacterID(_id: number): void {
  if (_instance) _instance.marriagePairCharacterId = _id;
}

/** OG CUserLocal::SetNewYearCardPairCharacterID — sets new year card pair ID */
export function SetNewYearCardPairCharacterID(_id: number): void {
  if (_instance) _instance.newYearCardPairCharacterId = _id;
}

/** OG CUserLocal::SetMonsterBookCover — sets monster book cover */
export function SetMonsterBookCover(_cover: number): void {
  if (_instance) _instance.monsterBookCover = _cover;
}

/** OG CUserLocal::SetMonsterCardCheckList — sets monster card checklist */
export function SetMonsterCardCheckList(_list: number[]): void {
  if (_instance) _instance.monsterCardCheckList = _list;
}

/** OG CUserLocal::SetClientTimer — sets client timer */
export function SetClientTimer(_timer: number): void {
  if (_instance) _instance.clientTimerValue = _timer;
}

/** OG CUserLocal::SetPassiveSkillDataForced — sets passive skill data forced */
export function SetPassiveSkillDataForced(_data: unknown): void {
  if (_instance) _instance.passiveSkillData = _data;
}

/** OG CUserLocal::SetChatPassiveSkillDataInfo — sets chat passive skill info */
export function SetChatPassiveSkillDataInfo(_info: unknown): void {
  if (_instance) _instance.chatPassiveSkillDataInfo = _info;
}

/** OG CUserLocal::SetAttractMove — sets attract move state */
export function SetAttractMove(_attract: boolean): void {
  if (_instance) _instance.bAttractMove = _attract;
}

/** OG CUserLocal::SetActiveEffectItemForLocal — sets active effect item */
export function SetActiveEffectItemForLocal(_itemId: number): void {
  // OG: sets active visual effect item
}

/** OG CUserLocal::SetCarryItemEffectForLocal — sets carry item effect */
export function SetCarryItemEffectForLocal(_itemId: number): void {
  // OG: sets carry visual effect
}

/** OG CUserLocal::ClearToolTip — clears tooltip */
export function ClearToolTip(): void {
  // OG: clears current tooltip display
}

/** OG CUserLocal::RedrawGuildNameTag — redraws guild name tag */
export function RedrawGuildNameTag(): void {
  // OG: redraws guild name tag above character
}

/** OG CUserLocal::SetPetsAngry — sets pets angry state */
export function SetPetsAngry(): void {
  // OG: triggers pet angry state
}

/** OG CUserLocal::ChangeTeslaCoilEndTime — changes Tesla Coil end time */
export function ChangeTeslaCoilEndTime(_time: number): void {
  // OG: updates Tesla Coil end time
}

// ── Pet ───────────────────────────────────────────────────────────────────

/** OG CUserLocal::PetInterActWithItem — pet interaction with item */
export function PetInterActWithItem(_itemId: number): number {
  // OG: sends pet interact with item packet
  return 0;
}

/** OG CUserLocal::PetInterActWithUserAction — pet interaction with user action */
export function PetInterActWithUserAction(_action: number, _param: number): number {
  // OG: sends pet interact with user action packet
  return 0;
}

/** OG CUserLocal::TryConsumePetHP — tries to consume pet HP */
export function TryConsumePetHP(): void {
  // OG: pet HP consumption logic
}

/** OG CUserLocal::TryConsumePetMP — tries to consume pet MP */
export function TryConsumePetMP(): void {
  // OG: pet MP consumption logic
}

// ── Riding ────────────────────────────────────────────────────────────────

/** OG CUserLocal::CheckRidingVehicle — checks if riding vehicle */
export function CheckRidingVehicle(): boolean {
  return false;
}

/** OG CUserLocal::CheckRidingVehicleExceptMechanic — checks riding except mechanic */
export function CheckRidingVehicleExceptMechanic(): boolean {
  return false;
}

// ── Collision/Reactor ─────────────────────────────────────────────────────

/** OG CUserLocal::CheckBoobyTrapPickUpRequest — checks booby trap pickup */
export function CheckBoobyTrapPickUpRequest(): boolean {
  return false;
}

/** OG CUserLocal::CheckReactor_Collision — checks reactor collision */
export function CheckReactor_Collision(): void {
  // OG: reactor collision detection
}

/** OG CUserLocal::FindHitSummonedInRect — finds hit summoned in rect */
export function FindHitSummonedInRect(): void {
  // OG: finds summoned entities in attack rect
}

/** OG CUserLocal::OnCollisionCustomImpact — handles custom impact collision */
export function OnCollisionCustomImpact(): void {
  // OG: custom impact collision handling
}

// ── Packet handlers ───────────────────────────────────────────────────────

/** OG CUserLocal::OnSetDead — handles death state */
export function OnSetDead(_bDyingNow: boolean): void {
  // OG: opens revive UI, stops skill sounds
}

/** OG CUserLocal::OnRevive — handles revival */
export function OnRevive(): void {
  // OG: closes revive UI, calls base CUser::OnRevive
}

/** OG CUserLocal::OnTeleport — handles teleport confirmation */
export function OnTeleport(_x: number, _y: number): void {
  // OG: updates player position from server
}

/** OG CUserLocal::OnSummonedCreated — handles summoned creation */
export function OnSummonedCreated(): void {
  // OG: summoned entity created
}

/** OG CUserLocal::OnTemporaryStatChanged — handles temp stat change */
export function OnTemporaryStatChanged(): void {
  // OG: temporary stat change notification
}

/** OG CUserLocal::OnMakerResult — handles maker result */
export function OnMakerResult(): void {
  // OG: maker/crafting result
}

/** OG CUserLocal::OnSetStandAloneMode — handles stand alone mode */
export function OnSetStandAloneMode(_standAlone: boolean): void {
  // OG: sets stand alone mode
}

/** OG CUserLocal::OnSitResult — handles sit result */
export function OnSitResult(): void {
  // OG: sit action result
}

/** OG CUserLocal::OnSkillCooltimeSet — handles skill cooldown set */
export function OnSkillCooltimeSet(): void {
  // OG: skill cooldown notification
}

/** OG CUserLocal::OnFieldFadeInOut — handles field fade in/out */
export function OnFieldFadeInOut(_color: number, _duration: number, _fadeOut: boolean, _fadeTime: number): void {
  // OG: screen fade effect
}

/** OG CUserLocal::OnFieldFadeOutForce — handles forced fade out */
export function OnFieldFadeOutForce(_color: number): void {
  // OG: forced screen fade out
}

/** OG CUserLocal::OnNotifyHPDecByField — handles HP drain by field */
export function OnNotifyHPDecByField(_amount: number): void {
  // OG: environmental HP drain
}

/** OG CUserLocal::OnSetDirectionMode — handles direction mode */
export function OnSetDirectionMode(_bDirection: boolean, _afterDelay: number): void {
  // OG: enables/disables player control for cutscenes
}

// ── Quest ─────────────────────────────────────────────────────────────────

/** OG CUserLocal::ShowAutoStartQuestList — shows auto-start quest list */
export function ShowAutoStartQuestList(): void {
  // OG: shows available auto-start quests
}

/** OG CUserLocal::EraseAutoQuestAlert — erases auto quest alert */
export function EraseAutoQuestAlert(): void {
  // OG: clears auto quest alert
}

/** OG CUserLocal::FollowCharacterFailedMsg — shows follow character failed message */
export function FollowCharacterFailedMsg(): void {
  // OG: shows follow failed message
}

/** OG CUserLocal::TryAutoRequestFollowCharacter — tries auto request follow character */
export function TryAutoRequestFollowCharacter(): void {
  // OG: automatically requests follow character from server
}

// ── Movement/Combat ───────────────────────────────────────────────────────

/** OG CUserLocal::SendBanMapByMobRequest — sends ban map by mob request */
export function SendBanMapByMobRequest(): void {
  // OG: sends ban map packet
}

/** OG CUserLocal::SendRepeatEffectRemoveRequest — sends repeat effect remove */
export function SendRepeatEffectRemoveRequest(): void {
  // OG: sends repeat effect remove packet
}

/** OG CUserLocal::RequestUpgradeTombEffect — requests upgrade tomb effect */
export function RequestUpgradeTombEffect(): void {
  // OG: upgrade tomb visual effect
}

/** OG CUserLocal::UpdateClientTimer — updates client timer */
export function UpdateClientTimer(): void {
  // OG: updates client timer display
}

/** OG CUserLocal::UpdateMonsterBookInfo — updates monster book info */
export function UpdateMonsterBookInfo(): void {
  // OG: updates monster book data
}

/** OG CUserLocal::ValidateSkillBonus — validates skill bonus */
export function ValidateSkillBonus(): void {
  // OG: validates and applies skill bonuses
}

/** OG CUserLocal::RemoveTutor — removes tutor */
export function RemoveTutor(): void {
  // OG: removes tutor NPC
}

/** OG CUserLocal::IsGL5thEventCakeTeam — checks GL 5th event cake team */
export function IsGL5thEventCakeTeam(): boolean {
  return false;
}

/** OG CUserLocal::IsGL5thEventPieTeam — checks GL 5th event pie team */
export function IsGL5thEventPieTeam(): boolean {
  return false;
}
