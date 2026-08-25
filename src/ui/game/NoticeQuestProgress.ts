import { Container, Text } from 'pixi.js';

// OG: CNoticeQuestProgress — the on-screen "quest progress updated" notices
// (top of the field). CWvsContext::CheckQuestCompleteByItem/ByMob call
// OnQuestProgressUpdated_Item @0x66DCE0 / _Mob @0x66F6B0, which fill up to
// 5 m_aNoticeChange entries; an entry is only refreshed when its previous
// change is older than 3000ms (dedup window), and NoticeProgressChange
// renders each entry as "<name>  <cur>/<demand>".
export interface QuestProgressEntry {
  questId: number;
  itemId: number;
  mobId: number;
  name: string;
  cur: number;
  demand: number;
}

interface InternalEntry extends QuestProgressEntry {
  tLastChange: number;
}

const MAX_ENTRIES = 5;
const DEDUP_MS = 3000;
const SHOW_MS = 3000;

export class NoticeQuestProgress {
  readonly container = new Container();
  /** Resolves display names for items/mobs (wired from GameStage). */
  itemNameOf: (id: number) => string | null | undefined = () => null;
  mobNameOf: (id: number) => string | null | undefined = () => null;

  private readonly _entries: InternalEntry[] = [];
  private readonly _texts: Container[] = [];
  private _now = performance.now();

  /** OG OnQuestProgressUpdated_Item — a demand item was gained/changed. */
  UpdateItem(questId: number, itemId: number, cur: number, demand: number): void {
    const name = this.itemNameOf(itemId);
    if (!name || demand <= 0) return;
    this.push({ questId, itemId, mobId: 0, name, cur, demand });
  }

  /** OG OnQuestProgressUpdated_Mob — a demanded mob kill counter changed. */
  UpdateMob(questId: number, mobId: number, name: string, cur: number, demand: number): void {
    if (demand <= 0) return;
    this.push({ questId, itemId: 0, mobId, name, cur, demand });
  }

  private push(e: Omit<InternalEntry, 'tLastChange'>): void {
    const now = performance.now();
    // OG dedup: reuse the slot for the same (quest, item/mob) when its last
    // change is older than 3000ms; otherwise find any slot whose last change
    // is older than 3000ms; if all are fresh, drop silently (OG LABEL_24).
    let slot = this._entries.findIndex((o) =>
      now - o.tLastChange > DEDUP_MS &&
      o.questId === e.questId &&
      (e.itemId !== 0 ? o.itemId === e.itemId : o.mobId === e.mobId));
    if (slot < 0) slot = this._entries.findIndex((o) => now - o.tLastChange > DEDUP_MS || o.tLastChange === 0);
    if (slot < 0) return;
    this._entries[slot] = { ...e, tLastChange: now };
    this.rebuild();
  }

  Update(_dt: number): void {
    const now = performance.now();
    this._now = now;
    if (this._entries.length === 0) return;
    let dirty = false;
    for (let i = this._entries.length - 1; i >= 0; i--) {
      if (now - this._entries[i].tLastChange > SHOW_MS) {
        this._entries.splice(i, 1);
        dirty = true;
      }
    }
    if (dirty) this.rebuild();
  }

  Clear(): void {
    this._entries.length = 0;
    this.rebuild();
  }

  get EntryCount(): number { return this._entries.length; }

  private rebuild(): void {
    for (const t of this._texts) t.destroy({ children: true });
    this._texts.length = 0;
    this._entries.forEach((e, i) => {
      const row = new Container();
      const label = new Text({
        text: `${e.name}  ${e.cur} / ${e.demand}`,
        style: { fill: 0xffe8a0, fontSize: 12, fontFamily: 'Arial', stroke: { color: 0x201400, width: 3 } },
      });
      row.addChild(label);
      row.y = i * 18;
      this.container.addChild(row);
      this._texts.push(row);
      void this._now;
    });
    this.container.visible = this._entries.length > 0;
  }
}
