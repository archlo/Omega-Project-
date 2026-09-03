import type { WzPackage } from '../wz/WzPackage.js';
export declare class QuestReq {
    Npc: number;
    LvMin: number;
    LvMax: number;
    Jobs: number[];
    Quests: {
        id: number;
        state: number;
    }[];
    Items: {
        id: number;
        count: number;
    }[];
    Mobs: {
        id: number;
        count: number;
    }[];
    Skills: {
        id: number;
        level: number;
    }[];
    SubJobFlags: number;
    Morph: number;
    Buff: number;
    ExceptBuff: number;
    StartDate: Date | null;
    EndDate: Date | null;
    DayOfWeekMask: number;
    InfoExQuestId: number;
    InfoEx: {
        index: number;
        value: string;
    }[];
}
export declare class QuestData {
    Id: number;
    Name: string;
    Parent: string;
    Area: number;
    MedalCategory: number;
    ViewMedalItem: number;
    Order: number;
    AutoStart: boolean;
    AutoComplete: boolean;
    Summary: string;
    DemandSummary: string;
    RewardSummary: string;
    Blurb: string[];
    Start: QuestReq;
    Complete: QuestReq;
    Exclusive: number[];
    StartScript: string;
    EndScript: string;
    TimeLimit: number;
    TimeLimit2: number;
    DailyPlayTime: number;
    SortKey: number;
    ShowLayerTag: string;
    ShowEffect: string;
    RepeatInterval: number;
    OneShot: boolean;
    AutoAccept: boolean;
    AutoCancel: boolean;
    AutoCompletionAlert: boolean;
    PartyQuestIconPath: string;
}
export declare class QuestInfoService {
    private readonly _questWz;
    private _all;
    private _byNpc;
    private _byItem;
    private _byItemDemand;
    private _mesoQuests;
    private _levelQuests;
    private _exclusiveGroups;
    private _autoStartQuests;
    private _autoCompleteQuests;
    private _autoAcceptQuests;
    private _autoCompletionAlertQuests;
    private _timeLimitQuests;
    private _timeLimitQuests2;
    private _dailyPlayQuests;
    private _questCategories;
    private _questCategoryNames;
    private _partyQuestIconPaths;
    private _seriesQuests;
    private _seriesQuestNames;
    private _questSortKeys;
    private _equipAutoQuestStart;
    private _fieldAutoQuestStart;
    private _normalAutoStartQuests;
    private _disallowedDelivery;
    constructor(questWz: () => WzPackage | null);
    Get(questId: number): QuestData | null;
    All(): Map<number, QuestData>;
    MedalGroups(): {
        name: string;
        quests: number[];
        medalItems: Record<number, number>;
    }[];
    ForNpc(npcTemplateId: number): {
        questId: number;
        isStart: boolean;
    }[];
    GetQuestName(questId: number): string;
    GetQuestCategory(questId: number): number;
    GetQuestCategoryName(idx: number): string;
    GetQuestArray(): number[];
    GetQuestByNpc(npcTemplateId: number): number[];
    GetQuestByItem(itemId: number): number[];
    GetQuestByItemDemand(itemId: number): number[];
    GetQuestByMeso(): number[];
    GetQuestByLevel(): number[];
    GetQuestTimeLimit(questId: number): number;
    GetQuestTimeLimit2(questId: number): number;
    GetQuestDailyPlayMinTime(questId: number): number;
    GetExpRateByLevel(questId: number): number;
    GetPartyQuestIconPath(questId: number): string;
    GetSeriesQuest(seriesName: string): number[];
    GetSeriesQuestName(questId: number): string;
    IsAutoStartQuest(questId: number): boolean;
    IsAutoCompleteQuest(questId: number): boolean;
    IsAutoAutoAcceptQuest(questId: number): boolean;
    IsAutoCompletionAlertQuest(questId: number): boolean;
    IsAutoAlertQuest(questId: number): boolean;
    IsTimeLimitQuest(questId: number): boolean;
    IsTimeLimitQuest2(questId: number): boolean;
    IsDailyPlayQuest(questId: number): boolean;
    IsDisallowedDeliveryQuest(questId: number): boolean;
    IsPartyQuest(questId: number): boolean;
    IsMedalQuest(questId: number): boolean;
    IsStartScriptLinkedQuest(questId: number): boolean;
    IsCompleteScriptLinkedQuest(questId: number): boolean;
    IsDeliveryAcceptQuest(questId: number): boolean;
    IsDeliveryCompleteQuest(questId: number): boolean;
    IsEquipOnAutoStartQuest(itemId: number): boolean;
    IsFieldOnAutoStartQuest(fieldId: number): boolean;
    private _ensureLoaded;
    /** OG: quest category derived from quest ID range */
    private static _questCategoryFromId;
    private static _index;
    private static _indexList;
    private static _parseInfo;
    private static _parseReq;
    private static _parseQuestDate;
    private static _int;
    private static _str;
}
//# sourceMappingURL=QuestInfoService.d.ts.map