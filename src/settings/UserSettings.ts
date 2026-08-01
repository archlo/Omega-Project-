/**
 * OG: CConfig — persistent user configuration.
 * Decompiled from v95 IDB (constructor 0x4B6740, LoadGlobal 0x4B51B0,
 * LoadCharacter 0x4B6C00, SaveGlobal 0x4B3BE0, SaveCharacter 0x4B5B00).
 *
 * OG stores options in Windows Registry under HKCU\...\MapleStory.
 * TS equivalent: localStorage with JSON serialization.
 *
 * All fields below correspond to OG CConfig members or Get/Set methods.
 */

export class UserSettings {
  // --- Key mapping (OG: LoadFuncKeyMapped 0x4B2010) ---
  funcKeyMap: Record<string, string> = {};

  // --- Audio (OG: CONFIG_SYSOPT fields) ---
  bgmVolume = 80;
  sfxVolume = 100;

  // --- HP/MP flash thresholds (OG: nSysOpt_HPFlash/nSysOpt_MPFlash, default 10) ---
  // Threshold = setting * 5% (Pass 170).
  hpFlash = 10;
  mpFlash = 10;

  // --- Resolution (OG: CONFIG_GAMEOPT) ---
  resW = 1024;
  resH = 768;

  // --- Language ---
  language = 'en';

  // --- Black list (OG: CConfig::AddBlackList/DeleteBlackList/LoadBlackList 0x4B6540) ---
  // Purely local config, not a server round trip (Pass 82).
  blackList: string[] = [];

  // --- UI window positions (OG: GetUIWndPos/SetUIWndPos 0x4B20A0/0x4B20D0) ---
  // Key = window ID (number), Value = {x, y, largeMode?}
  uiWndPos: Record<number, { x: number; y: number; large?: boolean }> = {};

  // --- Dialog visibility (OG: GetDialogVisible/SetDialogVisible 0x4B2140/0x4B2160) ---
  dialogVisible: Record<number, boolean> = {};

  // --- Show online only (OG: GetShowOnlineOnly/SetShowOnlineOnly 0x4B2040/0x4B2050) ---
  showOnlineOnly = false;

  // --- Show party HP (OG: GetShowPartyHP/SetShowPartyHP 0x4B3110/0x4B31A0) ---
  showPartyHP = true;

  // --- Quest alarm (OG: LoadQuestAlarm/SaveQuestAlarm 0x4B48F0/0x4B4A30) ---
  // List of quest IDs tracked in the alarm overlay.
  questAlarmIds: number[] = [];
  questAlarmAutoRegister = false;  // OG: GetQuestAlarmAutoRegister (0x4B3530)
  questAlarmOpened = false;        // OG: GetQueatAlarmOpened (0x4B3650) — note OG typo

  // --- Quest guide option (OG: GetQuestGuideOption/SetQuestGuideOption 0x4B3890/0x4B39D0) ---
  questGuideOption = 0;

  // --- Inventory expanded (OG: GetInventoryExpanded/SetInventoryExpanded 0x4B3770/0x4B3800) ---
  inventoryExpanded = false;

  // --- Friend group folding (OG: IsFriendGroupFolded/SetFriendGroupFolded 0x4B3010/0x4B6B80) ---
  friendGroupFolded: Record<string, boolean> = {};

  // --- Blocked friends (OG: LoadBlockFriend/SaveBlockFriend 0x4B43C0/0x4B45E0) ---
  // Map of characterId → block option flags.
  blockedFriends: Record<number, number> = {};

  // --- Session info (OG: SaveSessionInfo 0x4B3350, LoadCharacter 0x4B6C00) ---
  // Persisted per-character: last field, channel, world.
  sessionFieldId = 0;
  sessionChannelId = 0;
  sessionWorldId = 0;
  sessionCharacterName = '';

  // --- Last connected character (OG: LoadLastConnectedCharacterID 0x4B4180) ---
  lastCharacterId = 0;

  // --- Partner code (OG: GetPartnerCode 0x5D5160) ---
  partnerCode = 0;

  // --- Play time tracking (OG: GetPlayTime 0x95B130) ---
  playTimeMs = 0;
}
