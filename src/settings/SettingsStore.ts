import { UserSettings } from './UserSettings.js';

const STORAGE_KEY = 'MapleClaude.settings';

export class SettingsStore {
  load(): UserSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return new UserSettings();
      const parsed = JSON.parse(raw) as Partial<UserSettings>;
      const s = new UserSettings();
      if (parsed.funcKeyMap) s.funcKeyMap = parsed.funcKeyMap;
      if (typeof parsed.bgmVolume === 'number') s.bgmVolume = parsed.bgmVolume;
      if (typeof parsed.sfxVolume === 'number') s.sfxVolume = parsed.sfxVolume;
      if (typeof parsed.hpFlash === 'number') s.hpFlash = parsed.hpFlash;
      if (typeof parsed.mpFlash === 'number') s.mpFlash = parsed.mpFlash;
      if (typeof parsed.resW === 'number') s.resW = parsed.resW;
      if (typeof parsed.resH === 'number') s.resH = parsed.resH;
      if (typeof parsed.language === 'string') s.language = parsed.language;
      if (Array.isArray(parsed.blackList)) s.blackList = parsed.blackList.filter((n) => typeof n === 'string');
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
