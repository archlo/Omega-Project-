import { WzImage } from '../wz/WzImage.js';
import { WzProperty } from '../wz/WzProperty.js';
export class QuestReq {
    Npc = 0;
    LvMin = 0;
    LvMax = 0;
    Jobs = [];
    Quests = [];
    Items = [];
    Mobs = [];
    Skills = [];
    SubJobFlags = 0;
    Morph = 0;
    Buff = 0;
    ExceptBuff = 0;
    StartDate = null;
    EndDate = null;
    DayOfWeekMask = 0;
    InfoExQuestId = 0;
    InfoEx = [];
}
export class QuestData {
    Id = 0;
    Name = '';
    Parent = '';
    Area = 0;
    MedalCategory = 0;
    ViewMedalItem = 0;
    Order = 0;
    AutoStart = false;
    AutoComplete = false;
    Summary = '';
    DemandSummary = '';
    RewardSummary = '';
    Blurb = ['', '', ''];
    Start = new QuestReq();
    Complete = new QuestReq();
    // OG CQuestMan extra fields loaded from Check.img sub-nodes
    Exclusive = []; // mutually exclusive quest IDs
    StartScript = ''; // sStartScript — NPC script on quest start
    EndScript = ''; // sEndScript — NPC script on quest complete
    TimeLimit = 0; // tLimit — quest time limit (seconds)
    TimeLimit2 = 0; // tLimit2 — second time limit type
    DailyPlayTime = 0; // tDailyPlayTime — daily play time requirement
    SortKey = 0; // nSortKey — sort order key
    ShowLayerTag = ''; // sShowLayerTag — map layer tag to show
    ShowEffect = ''; // sShowEffect — effect to show
    RepeatInterval = 0; // tRepeatInterval — repeat cooldown (FILETIME)
    OneShot = false; // bOneShot — complete in one action
    AutoAccept = false; // bAutoAccept — auto accept on conditions met
    AutoCancel = false; // bAutoCancel — auto cancel on conditions met
    AutoCompletionAlert = false; // bAutoCompletionAlert — alert on completion
    PartyQuestIconPath = ''; // sPartyQuestIconPath — icon for party quests
}
export class QuestInfoService {
    _questWz;
    _all = null;
    _byNpc = null;
    // OG CQuestMan query indexes (populated during _ensureLoaded)
    _byItem = new Map(); // itemId → questIds (start demand)
    _byItemDemand = new Map(); // itemId → questIds (complete demand)
    _mesoQuests = []; // quests requiring meso
    _levelQuests = []; // quests requiring level
    _exclusiveGroups = new Map(); // questId → exclusive quest IDs
    _autoStartQuests = new Set();
    _autoCompleteQuests = new Set();
    _autoAcceptQuests = new Set();
    _autoCompletionAlertQuests = new Set();
    _timeLimitQuests = new Map(); // questId → time limit
    _timeLimitQuests2 = new Map(); // questId → time limit 2
    _dailyPlayQuests = new Map(); // questId → daily play time
    _questCategories = new Map(); // questId → category
    _questCategoryNames = [];
    _partyQuestIconPaths = new Map();
    _seriesQuests = new Map(); // seriesName → questIds
    _seriesQuestNames = new Map(); // questId → seriesName
    _questSortKeys = new Map();
    _equipAutoQuestStart = new Map(); // itemId → questIds
    _fieldAutoQuestStart = new Map(); // fieldId → questIds
    _normalAutoStartQuests = [];
    _disallowedDelivery = [];
    constructor(questWz) {
        this._questWz = questWz;
    }
    Get(questId) {
        this._ensureLoaded();
        return this._all?.get(questId) ?? null;
    }
    All() {
        this._ensureLoaded();
        return this._all ?? new Map();
    }
    MedalGroups() {
        this._ensureLoaded();
        const groups = new Map();
        for (const q of this._all?.values() ?? []) {
            if (q.MedalCategory === 0 && q.ViewMedalItem === 0)
                continue;
            const group = groups.get(q.MedalCategory) ?? { quests: [], medalItems: {} };
            group.quests.push(q.Id);
            if (q.ViewMedalItem !== 0)
                group.medalItems[q.Id] = q.ViewMedalItem;
            groups.set(q.MedalCategory, group);
        }
        return [...groups.entries()]
            .sort(([a], [b]) => a - b)
            .map(([cat, group]) => ({ name: cat === 0 ? '[Medals]' : `[Medal ${cat}]`, quests: group.quests, medalItems: group.medalItems }));
    }
    ForNpc(npcTemplateId) {
        this._ensureLoaded();
        return this._byNpc?.get(npcTemplateId) ?? [];
    }
    // ─── OG CQuestMan query methods ───────────────────────────────────────────
    GetQuestName(questId) {
        this._ensureLoaded();
        return this._all?.get(questId)?.Name ?? '';
    }
    GetQuestCategory(questId) {
        this._ensureLoaded();
        return this._questCategories.get(questId) ?? 0;
    }
    GetQuestCategoryName(idx) {
        this._ensureLoaded();
        return this._questCategoryNames[idx] ?? '';
    }
    GetQuestArray() {
        this._ensureLoaded();
        return this._all ? [...this._all.keys()] : [];
    }
    GetQuestByNpc(npcTemplateId) {
        this._ensureLoaded();
        return this._byNpc?.get(npcTemplateId)?.map(e => e.questId) ?? [];
    }
    GetQuestByItem(itemId) {
        this._ensureLoaded();
        return this._byItem.get(itemId) ?? [];
    }
    GetQuestByItemDemand(itemId) {
        this._ensureLoaded();
        return this._byItemDemand.get(itemId) ?? [];
    }
    GetQuestByMeso() {
        this._ensureLoaded();
        return this._mesoQuests;
    }
    GetQuestByLevel() {
        this._ensureLoaded();
        return this._levelQuests;
    }
    GetQuestTimeLimit(questId) {
        this._ensureLoaded();
        return this._timeLimitQuests.get(questId) ?? 0;
    }
    GetQuestTimeLimit2(questId) {
        this._ensureLoaded();
        return this._timeLimitQuests2.get(questId) ?? 0;
    }
    GetQuestDailyPlayMinTime(questId) {
        this._ensureLoaded();
        return this._dailyPlayQuests.get(questId) ?? 0;
    }
    GetExpRateByLevel(questId) {
        this._ensureLoaded();
        // QuestExpByLevel is loaded from separate WZ — not implemented yet
        return 0;
    }
    GetPartyQuestIconPath(questId) {
        this._ensureLoaded();
        return this._partyQuestIconPaths.get(questId) ?? '';
    }
    GetSeriesQuest(seriesName) {
        this._ensureLoaded();
        return this._seriesQuests.get(seriesName) ?? [];
    }
    GetSeriesQuestName(questId) {
        this._ensureLoaded();
        return this._seriesQuestNames.get(questId) ?? '';
    }
    // ─── OG CQuestMan boolean checks ──────────────────────────────────────────
    IsAutoStartQuest(questId) {
        this._ensureLoaded();
        return this._autoStartQuests.has(questId);
    }
    IsAutoCompleteQuest(questId) {
        this._ensureLoaded();
        return this._autoCompleteQuests.has(questId);
    }
    IsAutoAutoAcceptQuest(questId) {
        this._ensureLoaded();
        return this._autoAcceptQuests.has(questId);
    }
    IsAutoCompletionAlertQuest(questId) {
        this._ensureLoaded();
        return this._autoCompletionAlertQuests.has(questId);
    }
    IsAutoAlertQuest(questId) {
        return this.IsAutoStartQuest(questId) || this.IsAutoCompletionAlertQuest(questId);
    }
    IsTimeLimitQuest(questId) {
        this._ensureLoaded();
        return this._timeLimitQuests.has(questId);
    }
    IsTimeLimitQuest2(questId) {
        this._ensureLoaded();
        return this._timeLimitQuests2.has(questId);
    }
    IsDailyPlayQuest(questId) {
        this._ensureLoaded();
        return this.IsTimeLimitQuest2(questId) && this._dailyPlayQuests.has(questId);
    }
    IsDisallowedDeliveryQuest(questId) {
        this._ensureLoaded();
        return this._disallowedDelivery.includes(questId);
    }
    IsPartyQuest(questId) {
        // OG: party quests are ID range 1200–1500 (usQuestID - 1200 <= 0xC7)
        return questId >= 1200 && questId <= 1500;
    }
    IsMedalQuest(questId) {
        return this.GetQuestCategory(questId) === 51;
    }
    IsStartScriptLinkedQuest(questId) {
        this._ensureLoaded();
        const q = this._all?.get(questId);
        return !!q?.StartScript;
    }
    IsCompleteScriptLinkedQuest(questId) {
        this._ensureLoaded();
        const q = this._all?.get(questId);
        return !!q?.EndScript;
    }
    IsDeliveryAcceptQuest(questId) {
        this._ensureLoaded();
        if (this.IsStartScriptLinkedQuest(questId))
            return false;
        if (this.IsPartyQuest(questId))
            return false;
        if (this.IsAutoAutoAcceptQuest(questId))
            return false;
        if (this.IsAutoAlertQuest(questId))
            return false;
        if (this.IsTimeLimitQuest(questId))
            return false;
        if (this.IsDisallowedDeliveryQuest(questId))
            return false;
        const q = this._all?.get(questId);
        if (!q)
            return false;
        // OG: checks GetStartDemand → dwNpcTemplateID != 0 && != 1013000
        return q.Start.Npc !== 0 && q.Start.Npc !== 1013000;
    }
    IsDeliveryCompleteQuest(questId) {
        this._ensureLoaded();
        if (this.IsCompleteScriptLinkedQuest(questId))
            return false;
        if (this.IsPartyQuest(questId))
            return false;
        if (this.IsAutoAlertQuest(questId))
            return false;
        if (this.IsTimeLimitQuest(questId))
            return false;
        if (this.IsDisallowedDeliveryQuest(questId))
            return false;
        const q = this._all?.get(questId);
        if (!q)
            return false;
        // OG: complete Npc must exist, not 1013000, and either repeatInterval >= 0x5A0
        // or has item/mob demands
        if (q.Complete.Npc === 0 || q.Complete.Npc === 1013000)
            return false;
        return q.RepeatInterval >= 1440 || q.Complete.Items.length > 0 || q.Complete.Mobs.length > 0;
    }
    IsEquipOnAutoStartQuest(itemId) {
        this._ensureLoaded();
        return this._equipAutoQuestStart.has(itemId);
    }
    IsFieldOnAutoStartQuest(fieldId) {
        this._ensureLoaded();
        return this._fieldAutoQuestStart.has(fieldId);
    }
    // ─── WZ loading ───────────────────────────────────────────────────────────
    _ensureLoaded() {
        if (this._all)
            return;
        const wz = this._questWz();
        if (!wz)
            return;
        const all = new Map();
        const byNpc = new Map();
        try {
            const qiRoot = wz.GetItem('QuestInfo.img');
            const qiImage = qiRoot instanceof WzImage ? qiRoot : null;
            const ckRoot = wz.GetItem('Check.img');
            const ckImage = ckRoot instanceof WzImage ? ckRoot : null;
            if (!qiImage) {
                this._all = all;
                this._byNpc = byNpc;
                return;
            }
            for (const [key, val] of Object.entries(qiImage.Root.Items)) {
                const id = parseInt(key);
                if (isNaN(id) || !(val instanceof WzProperty))
                    continue;
                const q = new QuestData();
                q.Id = id;
                QuestInfoService._parseInfo(q, val);
                const ckNode = ckImage?.Root.Get(key);
                if (ckNode instanceof WzProperty) {
                    const startNode = ckNode.Get('0');
                    if (startNode instanceof WzProperty) {
                        q.Start = QuestInfoService._parseReq(startNode);
                        // Parse extra OG CQuestMan fields from start demand
                        q.StartScript = QuestInfoService._str(startNode.Get('sStartScript'));
                        q.AutoAccept = QuestInfoService._int(startNode.Get('bAutoAccept')) !== 0;
                        q.AutoCancel = QuestInfoService._int(startNode.Get('bAutoCancel')) !== 0;
                        q.TimeLimit = QuestInfoService._int(startNode.Get('tLimit'));
                        q.TimeLimit2 = QuestInfoService._int(startNode.Get('tLimit2'));
                        q.DailyPlayTime = QuestInfoService._int(startNode.Get('tDailyPlayTime'));
                        q.OneShot = QuestInfoService._int(startNode.Get('bOneShot')) !== 0;
                        q.SortKey = QuestInfoService._int(startNode.Get('nSortKey'));
                        q.ShowLayerTag = QuestInfoService._str(startNode.Get('sShowLayerTag'));
                        q.ShowEffect = QuestInfoService._str(startNode.Get('sShowEffect'));
                        q.RepeatInterval = QuestInfoService._int(startNode.Get('tRepeatInterval'));
                        // Parse exclusive quests
                        const excNode = startNode.Get('exclusive');
                        if (excNode instanceof WzProperty) {
                            for (const [, v] of Object.entries(excNode.Items))
                                q.Exclusive.push(QuestInfoService._int(v));
                        }
                        // Parse item demands (for GetQuestByItem index)
                        for (const item of q.Start.Items) {
                            QuestInfoService._indexList(this._byItem, item.id, id);
                        }
                        // Parse meso/level demands
                        // OG: checks start demand for meso cost → mesoQuests, level requirement → levelQuests
                        // We detect these from the quest requirements
                    }
                    const completeNode = ckNode.Get('1');
                    if (completeNode instanceof WzProperty) {
                        q.Complete = QuestInfoService._parseReq(completeNode);
                        q.EndScript = QuestInfoService._str(completeNode.Get('sEndScript'));
                        // Parse item demands for complete (for GetQuestByItemDemand index)
                        for (const item of q.Complete.Items) {
                            QuestInfoService._indexList(this._byItemDemand, item.id, id);
                        }
                    }
                    // Parse auto-start/complete/alert from the quest node itself
                    const autoNode = ckNode.Get('autoStart');
                    if (autoNode instanceof WzProperty) {
                        const autoStartVal = QuestInfoService._int(autoNode);
                        if (autoStartVal !== 0)
                            this._autoStartQuests.add(id);
                    }
                    const autoCompNode = ckNode.Get('autoComplete');
                    if (autoCompNode instanceof WzProperty) {
                        const autoCompVal = QuestInfoService._int(autoCompNode);
                        if (autoCompVal !== 0)
                            this._autoCompleteQuests.add(id);
                    }
                    const alertNode = ckNode.Get('autoCompletionAlert');
                    if (alertNode instanceof WzProperty) {
                        const alertVal = QuestInfoService._int(alertNode);
                        if (alertVal !== 0)
                            this._autoCompletionAlertQuests.add(id);
                    }
                }
                all.set(id, q);
                if (q.Start.Npc !== 0)
                    QuestInfoService._index(byNpc, q.Start.Npc, id, true);
                if (q.Complete.Npc !== 0)
                    QuestInfoService._index(byNpc, q.Complete.Npc, id, false);
                // Build time limit indexes
                if (q.TimeLimit > 0)
                    this._timeLimitQuests.set(id, q.TimeLimit);
                if (q.TimeLimit2 > 0)
                    this._timeLimitQuests2.set(id, q.TimeLimit2);
                if (q.DailyPlayTime > 0)
                    this._dailyPlayQuests.set(id, q.DailyPlayTime);
                if (q.SortKey !== 0)
                    this._questSortKeys.set(id, q.SortKey);
                if (q.PartyQuestIconPath)
                    this._partyQuestIconPaths.set(id, q.PartyQuestIconPath);
                if (q.Exclusive.length > 0)
                    this._exclusiveGroups.set(id, q.Exclusive);
                // Build category index from quest ID ranges (OG logic)
                this._questCategories.set(id, QuestInfoService._questCategoryFromId(id));
            }
            // Build series quest indexes from QuestInfo.img "parent" field
            for (const q of all.values()) {
                if (q.Parent) {
                    let series = this._seriesQuests.get(q.Parent);
                    if (!series) {
                        series = [];
                        this._seriesQuests.set(q.Parent, series);
                    }
                    series.push(q.Id);
                    this._seriesQuestNames.set(q.Id, q.Parent);
                }
            }
            console.log(`QuestInfoService: loaded ${all.size} quests (${this._autoStartQuests.size} auto-start, ${this._autoCompleteQuests.size} auto-complete, ${this._timeLimitQuests.size} time-limited)`);
        }
        catch (ex) {
            console.warn('QuestInfoService: failed loading Quest.wz', ex);
        }
        this._all = all;
        this._byNpc = byNpc;
    }
    /** OG: quest category derived from quest ID range */
    static _questCategoryFromId(id) {
        if (id >= 1000 && id < 1200)
            return 1; // Intro
        if (id >= 1200 && id < 1500)
            return 2; // Party
        if (id >= 2000 && id < 2500)
            return 10; // Adventurer
        if (id >= 2500 && id < 3000)
            return 11; // Cygnus
        if (id >= 3000 && id < 3500)
            return 12; // Aran/Evan
        if (id >= 9000 && id < 9700)
            return 51; // Medal quests (OG: category 51 = medal)
        if (id >= 9900 && id < 10000)
            return 52; // Event
        return 0;
    }
    static _index(map, npc, questId, isStart) {
        let list = map.get(npc);
        if (!list) {
            list = [];
            map.set(npc, list);
        }
        list.push({ questId, isStart });
    }
    static _indexList(map, key, questId) {
        let list = map.get(key);
        if (!list) {
            list = [];
            map.set(key, list);
        }
        list.push(questId);
    }
    static _parseInfo(q, p) {
        q.Name = QuestInfoService._str(p.Get('name'));
        q.Parent = QuestInfoService._str(p.Get('parent'));
        q.Area = QuestInfoService._int(p.Get('area'));
        q.MedalCategory = QuestInfoService._int(p.Get('medalCategory'));
        q.ViewMedalItem = QuestInfoService._int(p.Get('viewMedalItem'));
        q.Order = QuestInfoService._int(p.Get('order'));
        q.AutoStart = QuestInfoService._int(p.Get('autoStart')) !== 0;
        q.AutoComplete = QuestInfoService._int(p.Get('autoComplete')) !== 0;
        q.Summary = QuestInfoService._str(p.Get('summary'));
        q.DemandSummary = QuestInfoService._str(p.Get('demandSummary'));
        q.RewardSummary = QuestInfoService._str(p.Get('rewardSummary'));
        q.Blurb[0] = QuestInfoService._str(p.Get('0'));
        q.Blurb[1] = QuestInfoService._str(p.Get('1'));
        q.Blurb[2] = QuestInfoService._str(p.Get('2'));
        // Party quest icon path
        q.PartyQuestIconPath = QuestInfoService._str(p.Get('partyQuestIconPath'));
    }
    static _parseReq(p) {
        const r = new QuestReq();
        if (!p)
            return r;
        r.Npc = QuestInfoService._int(p.Get('npc'));
        r.LvMin = QuestInfoService._int(p.Get('lvmin'));
        r.LvMax = QuestInfoService._int(p.Get('lvmax'));
        r.SubJobFlags = QuestInfoService._int(p.Get('subJobFlags'));
        r.Morph = QuestInfoService._int(p.Get('morph'));
        r.Buff = QuestInfoService._int(p.Get('buff'));
        r.ExceptBuff = QuestInfoService._int(p.Get('exceptbuff'));
        r.InfoExQuestId = QuestInfoService._int(p.Get('infoNumber'));
        r.StartDate = QuestInfoService._parseQuestDate(QuestInfoService._str(p.Get('start')));
        r.EndDate = QuestInfoService._parseQuestDate(QuestInfoService._str(p.Get('end')));
        const jobsNode = p.Get('job');
        if (jobsNode instanceof WzProperty) {
            for (const [, v] of Object.entries(jobsNode.Items))
                r.Jobs.push(QuestInfoService._int(v));
        }
        const questsNode = p.Get('quest');
        if (questsNode instanceof WzProperty) {
            for (const [, v] of Object.entries(questsNode.Items)) {
                if (v instanceof WzProperty)
                    r.Quests.push({ id: QuestInfoService._int(v.Get('id')), state: QuestInfoService._int(v.Get('state')) });
            }
        }
        const itemsNode = p.Get('item');
        if (itemsNode instanceof WzProperty) {
            for (const [, v] of Object.entries(itemsNode.Items)) {
                if (v instanceof WzProperty)
                    r.Items.push({ id: QuestInfoService._int(v.Get('id')), count: QuestInfoService._int(v.Get('count')) });
            }
        }
        const mobsNode = p.Get('mob');
        if (mobsNode instanceof WzProperty) {
            for (const [, v] of Object.entries(mobsNode.Items)) {
                if (v instanceof WzProperty)
                    r.Mobs.push({ id: QuestInfoService._int(v.Get('id')), count: QuestInfoService._int(v.Get('count')) });
            }
        }
        const skillsNode = p.Get('skill');
        if (skillsNode instanceof WzProperty) {
            for (const [, v] of Object.entries(skillsNode.Items)) {
                if (v instanceof WzProperty)
                    r.Skills.push({ id: QuestInfoService._int(v.Get('id')), level: QuestInfoService._int(v.Get('acquire')) });
            }
        }
        const dowNode = p.Get('dayOfWeek');
        if (dowNode instanceof WzProperty) {
            for (const [, v] of Object.entries(dowNode.Items)) {
                const day = QuestInfoService._int(v);
                if (day >= 0 && day <= 6)
                    r.DayOfWeekMask |= 1 << day;
            }
        }
        const infoexNode = p.Get('infoex');
        if (infoexNode instanceof WzProperty) {
            for (const [key, v] of Object.entries(infoexNode.Items)) {
                r.InfoEx.push({ index: parseInt(key) || 0, value: QuestInfoService._str(v) });
            }
        }
        return r;
    }
    static _parseQuestDate(s) {
        if (!s || s.length < 8)
            return null;
        const padded = s.padEnd(12, '0');
        const year = parseInt(padded.substring(0, 4));
        const month = parseInt(padded.substring(4, 6)) - 1;
        const day = parseInt(padded.substring(6, 8));
        const hour = parseInt(padded.substring(8, 10)) || 0;
        const min = parseInt(padded.substring(10, 12)) || 0;
        if (isNaN(year) || isNaN(month) || isNaN(day))
            return null;
        return new Date(Date.UTC(year, month, day, hour, min));
    }
    static _int(v) {
        if (typeof v === 'number')
            return v;
        if (typeof v === 'bigint')
            return Number(v);
        return 0;
    }
    static _str(v) {
        return typeof v === 'string' ? v : '';
    }
}
//# sourceMappingURL=QuestInfoService.js.map