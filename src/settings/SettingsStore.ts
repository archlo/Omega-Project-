import { UserSettings } from './UserSettings.js';

const STORAGE_KEY = 'MapleClaude.settings';

/**
 * OG: CConfig::LoadGlobal (0x4B51B0) / SaveGlobal (0x4B3BE0) —
 * Persists user settings to localStorage (OG uses Windows Registry).
 */
export class SettingsStore {
  load(): UserSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return new UserSettings();
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const s = new UserSettings();

      // Key mapping
      if (parsed.funcKeyMap && typeof parsed.funcKeyMap === 'object') s.funcKeyMap = parsed.funcKeyMap as Record<string, string>;

      // Audio
      if (typeof parsed.bgmVolume === 'number') s.bgmVolume = parsed.bgmVolume;
      if (typeof parsed.sfxVolume === 'number') s.sfxVolume = parsed.sfxVolume;

      // HP/MP flash
      if (typeof parsed.hpFlash === 'number') s.hpFlash = parsed.hpFlash;
      if (typeof parsed.mpFlash === 'number') s.mpFlash = parsed.mpFlash;

      // Resolution
      if (typeof parsed.resW === 'number') s.resW = parsed.resW;
      if (typeof parsed.resH === 'number') s.resH = parsed.resH;

      // Language
      if (typeof parsed.language === 'string') s.language = parsed.language;

      // Black list
      if (Array.isArray(parsed.blackList)) s.blackList = parsed.blackList.filter((n) => typeof n === 'string');

      // UI window positions
      if (parsed.uiWndPos && typeof parsed.uiWndPos === 'object') s.uiWndPos = parsed.uiWndPos as Record<number, { x: number; y: number; large?: boolean }>;

      // Dialog visibility
      if (parsed.dialogVisible && typeof parsed.dialogVisible === 'object') s.dialogVisible = parsed.dialogVisible as Record<number, boolean>;

      // Show online only
      if (typeof parsed.showOnlineOnly === 'boolean') s.showOnlineOnly = parsed.showOnlineOnly;

      // Show party HP
      if (typeof parsed.showPartyHP === 'boolean') s.showPartyHP = parsed.showPartyHP;

      // Quest alarm
      if (Array.isArray(parsed.questAlarmIds)) s.questAlarmIds = parsed.questAlarmIds.filter((n) => typeof n === 'number');
      if (typeof parsed.questAlarmAutoRegister === 'boolean') s.questAlarmAutoRegister = parsed.questAlarmAutoRegister;
      if (typeof parsed.questAlarmOpened === 'boolean') s.questAlarmOpened = parsed.questAlarmOpened;

      // Quest guide option
      if (typeof parsed.questGuideOption === 'number') s.questGuideOption = parsed.questGuideOption;

      // Inventory expanded
      if (typeof parsed.inventoryExpanded === 'boolean') s.inventoryExpanded = parsed.inventoryExpanded;

      // Friend group folding
      if (parsed.friendGroupFolded && typeof parsed.friendGroupFolded === 'object') s.friendGroupFolded = parsed.friendGroupFolded as Record<string, boolean>;

      // Blocked friends
      if (parsed.blockedFriends && typeof parsed.blockedFriends === 'object') s.blockedFriends = parsed.blockedFriends as Record<number, number>;

      // Session info
      if (typeof parsed.sessionFieldId === 'number') s.sessionFieldId = parsed.sessionFieldId;
      if (typeof parsed.sessionChannelId === 'number') s.sessionChannelId = parsed.sessionChannelId;
      if (typeof parsed.sessionWorldId === 'number') s.sessionWorldId = parsed.sessionWorldId;
      if (typeof parsed.sessionCharacterName === 'string') s.sessionCharacterName = parsed.sessionCharacterName;

      // Last connected character
      if (typeof parsed.lastCharacterId === 'number') s.lastCharacterId = parsed.lastCharacterId;

      // Partner code
      if (typeof parsed.partnerCode === 'number') s.partnerCode = parsed.partnerCode;

      // Play time
      if (typeof parsed.playTimeMs === 'number') s.playTimeMs = parsed.playTimeMs;

      return s;
    } catch {
      return new UserSettings();
    }
  }

  save(settings: UserSettings): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      console.warn('Failed to save settings to localStorage');
    }
  }
}
