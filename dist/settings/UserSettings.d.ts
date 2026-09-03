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
export declare class UserSettings {
    funcKeyMap: Record<string, string>;
    bgmVolume: number;
    sfxVolume: number;
    hpFlash: number;
    mpFlash: number;
    resW: number;
    resH: number;
    language: string;
    blackList: string[];
    uiWndPos: Record<number, {
        x: number;
        y: number;
        large?: boolean;
    }>;
    dialogVisible: Record<number, boolean>;
    showOnlineOnly: boolean;
    showPartyHP: boolean;
    questAlarmIds: number[];
    questAlarmAutoRegister: boolean;
    questAlarmOpened: boolean;
    questGuideOption: number;
    inventoryExpanded: boolean;
    friendGroupFolded: Record<string, boolean>;
    blockedFriends: Record<number, number>;
    sessionFieldId: number;
    sessionChannelId: number;
    sessionWorldId: number;
    sessionCharacterName: string;
    lastCharacterId: number;
    partnerCode: number;
    playTimeMs: number;
}
//# sourceMappingURL=UserSettings.d.ts.map