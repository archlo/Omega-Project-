import type { WzPackage } from '../wz/WzPackage.js';
import { WzImage } from '../wz/WzImage.js';
import { WzProperty } from '../wz/WzProperty.js';

export class QuestReq {
  Npc = 0;
  LvMin = 0;
  LvMax = 0;
  Jobs: number[] = [];
  Quests: { id: number; state: number }[] = [];
  Items: { id: number; count: number }[] = [];
  Mobs: { id: number; count: number }[] = [];
  Skills: { id: number; level: number }[] = [];
  SubJobFlags = 0;
  Morph = 0;
  Buff = 0;
  ExceptBuff = 0;
  StartDate: Date | null = null;
  EndDate: Date | null = null;
  DayOfWeekMask = 0;
  InfoExQuestId = 0;
  InfoEx: { index: number; value: string }[] = [];
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
  Blurb: string[] = ['', '', ''];
  Start = new QuestReq();
  Complete = new QuestReq();
}

export class QuestInfoService {
  private readonly _questWz: () => WzPackage | null;
  private _all: Map<number, QuestData> | null = null;
  private _byNpc: Map<number, { questId: number; isStart: boolean }[]> | null = null;

  constructor(questWz: () => WzPackage | null) {
    this._questWz = questWz;
  }

  Get(questId: number): QuestData | null {
    this._ensureLoaded();
    return this._all?.get(questId) ?? null;
  }

  All(): Map<number, QuestData> {
    this._ensureLoaded();
    return this._all ?? new Map();
  }

  MedalGroups(): { name: string; quests: number[]; medalItems: Record<number, number> }[] {
    this._ensureLoaded();
    const groups = new Map<number, { quests: number[]; medalItems: Record<number, number> }>();
    for (const q of this._all?.values() ?? []) {
      if (q.MedalCategory === 0 && q.ViewMedalItem === 0) continue;
      const group = groups.get(q.MedalCategory) ?? { quests: [], medalItems: {} };
      group.quests.push(q.Id);
      if (q.ViewMedalItem !== 0) group.medalItems[q.Id] = q.ViewMedalItem;
      groups.set(q.MedalCategory, group);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a - b)
      .map(([cat, group]) => ({ name: cat === 0 ? '[Medals]' : `[Medal ${cat}]`, quests: group.quests, medalItems: group.medalItems }));
  }

  ForNpc(npcTemplateId: number): { questId: number; isStart: boolean }[] {
    this._ensureLoaded();
    return this._byNpc?.get(npcTemplateId) ?? [];
  }

  private _ensureLoaded(): void {
    if (this._all) return;
    const wz = this._questWz();
    if (!wz) return;

    const all = new Map<number, QuestData>();
    const byNpc = new Map<number, { questId: number; isStart: boolean }[]>();
    try {
      const qiRoot = wz.GetItem('QuestInfo.img');
      const qiImage = qiRoot instanceof WzImage ? qiRoot : null;
      const ckRoot = wz.GetItem('Check.img');
      const ckImage = ckRoot instanceof WzImage ? ckRoot : null;

      if (!qiImage) { this._all = all; this._byNpc = byNpc; return; }

      for (const [key, val] of Object.entries(qiImage.Root.Items)) {
        const id = parseInt(key);
        if (isNaN(id) || !(val instanceof WzProperty)) continue;
        const q = new QuestData();
        q.Id = id;
        QuestInfoService._parseInfo(q, val);
        const ckNode = ckImage?.Root.Get(key);
        if (ckNode instanceof WzProperty) {
          const startNode = ckNode.Get('0');
          if (startNode instanceof WzProperty) q.Start = QuestInfoService._parseReq(startNode);
          const completeNode = ckNode.Get('1');
          if (completeNode instanceof WzProperty) q.Complete = QuestInfoService._parseReq(completeNode);
        }
        all.set(id, q);
        if (q.Start.Npc !== 0) QuestInfoService._index(byNpc, q.Start.Npc, id, true);
        if (q.Complete.Npc !== 0) QuestInfoService._index(byNpc, q.Complete.Npc, id, false);
      }
      console.log(`QuestInfoService: loaded ${all.size} quests`);
    } catch (ex) {
      console.warn('QuestInfoService: failed loading Quest.wz', ex);
    }
    this._all = all;
    this._byNpc = byNpc;
  }

  private static _index(map: Map<number, { questId: number; isStart: boolean }[]>, npc: number, questId: number, isStart: boolean): void {
    let list = map.get(npc);
    if (!list) { list = []; map.set(npc, list); }
    list.push({ questId, isStart });
  }

  private static _parseInfo(q: QuestData, p: WzProperty): void {
    q.Name          = QuestInfoService._str(p.Get('name'));
    q.Parent        = QuestInfoService._str(p.Get('parent'));
    q.Area          = QuestInfoService._int(p.Get('area'));
    q.MedalCategory = QuestInfoService._int(p.Get('medalCategory'));
    q.ViewMedalItem = QuestInfoService._int(p.Get('viewMedalItem'));
    q.Order         = QuestInfoService._int(p.Get('order'));
    q.AutoStart     = QuestInfoService._int(p.Get('autoStart')) !== 0;
    q.AutoComplete  = QuestInfoService._int(p.Get('autoComplete')) !== 0;
    q.Summary       = QuestInfoService._str(p.Get('summary'));
    q.DemandSummary = QuestInfoService._str(p.Get('demandSummary'));
    q.RewardSummary = QuestInfoService._str(p.Get('rewardSummary'));
    q.Blurb[0]      = QuestInfoService._str(p.Get('0'));
    q.Blurb[1]      = QuestInfoService._str(p.Get('1'));
    q.Blurb[2]      = QuestInfoService._str(p.Get('2'));
  }

  private static _parseReq(p: WzProperty | null): QuestReq {
    const r = new QuestReq();
    if (!p) return r;
    r.Npc   = QuestInfoService._int(p.Get('npc'));
    r.LvMin = QuestInfoService._int(p.Get('lvmin'));
    r.LvMax = QuestInfoService._int(p.Get('lvmax'));
    r.SubJobFlags = QuestInfoService._int(p.Get('subJobFlags'));
    r.Morph       = QuestInfoService._int(p.Get('morph'));
    r.Buff        = QuestInfoService._int(p.Get('buff'));
    r.ExceptBuff  = QuestInfoService._int(p.Get('exceptbuff'));
    r.InfoExQuestId = QuestInfoService._int(p.Get('infoNumber'));
    r.StartDate = QuestInfoService._parseQuestDate(QuestInfoService._str(p.Get('start')));
    r.EndDate   = QuestInfoService._parseQuestDate(QuestInfoService._str(p.Get('end')));

    const jobsNode = p.Get('job');
    if (jobsNode instanceof WzProperty) {
      for (const [, v] of Object.entries(jobsNode.Items)) r.Jobs.push(QuestInfoService._int(v));
    }

    const questsNode = p.Get('quest');
    if (questsNode instanceof WzProperty) {
      for (const [, v] of Object.entries(questsNode.Items)) {
        if (v instanceof WzProperty) r.Quests.push({ id: QuestInfoService._int(v.Get('id')), state: QuestInfoService._int(v.Get('state')) });
      }
    }

    const itemsNode = p.Get('item');
    if (itemsNode instanceof WzProperty) {
      for (const [, v] of Object.entries(itemsNode.Items)) {
        if (v instanceof WzProperty) r.Items.push({ id: QuestInfoService._int(v.Get('id')), count: QuestInfoService._int(v.Get('count')) });
      }
    }

    const mobsNode = p.Get('mob');
    if (mobsNode instanceof WzProperty) {
      for (const [, v] of Object.entries(mobsNode.Items)) {
        if (v instanceof WzProperty) r.Mobs.push({ id: QuestInfoService._int(v.Get('id')), count: QuestInfoService._int(v.Get('count')) });
      }
    }

    const skillsNode = p.Get('skill');
    if (skillsNode instanceof WzProperty) {
      for (const [, v] of Object.entries(skillsNode.Items)) {
        if (v instanceof WzProperty) r.Skills.push({ id: QuestInfoService._int(v.Get('id')), level: QuestInfoService._int(v.Get('acquire')) });
      }
    }

    const dowNode = p.Get('dayOfWeek');
    if (dowNode instanceof WzProperty) {
      for (const [, v] of Object.entries(dowNode.Items)) {
        const day = QuestInfoService._int(v);
        if (day >= 0 && day <= 6) r.DayOfWeekMask |= 1 << day;
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

  private static _parseQuestDate(s: string): Date | null {
    if (!s || s.length < 8) return null;
    const padded = s.padEnd(12, '0');
    const year = parseInt(padded.substring(0, 4));
    const month = parseInt(padded.substring(4, 6)) - 1;
    const day = parseInt(padded.substring(6, 8));
    const hour = parseInt(padded.substring(8, 10)) || 0;
    const min = parseInt(padded.substring(10, 12)) || 0;
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    return new Date(Date.UTC(year, month, day, hour, min));
  }

  private static _int(v: unknown): number {
    if (typeof v === 'number') return v;
    if (typeof v === 'bigint') return Number(v);
    return 0;
  }

  private static _str(v: unknown): string {
    return typeof v === 'string' ? v : '';
  }
}
