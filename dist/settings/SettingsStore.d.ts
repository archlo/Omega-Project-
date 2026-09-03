import { UserSettings } from './UserSettings.js';
/**
 * OG: CConfig::LoadGlobal (0x4B51B0) / SaveGlobal (0x4B3BE0) —
 * Persists user settings to localStorage (OG uses Windows Registry).
 */
export declare class SettingsStore {
    load(): UserSettings;
    save(settings: UserSettings): void;
}
//# sourceMappingURL=SettingsStore.d.ts.map