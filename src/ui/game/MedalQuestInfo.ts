import { GamePanel } from './GamePanel.js';
import { QuestLog } from './QuestLog.js';

// TODO_AUDIT.md ida_new_gaps.md Section 5: CUIMedalQuestInfo. OG has a
// separate medal-achievement quest window; this reuses the existing quest-log
// renderer for WZ quests marked by medalCategory/viewMedalItem.
export class MedalQuestInfo extends GamePanel {
  private readonly _log = new QuestLog();
  private _nameOf: (id: number) => string = (id) => `[${id}]`;
  private _medalItems = new Map<number, number>();

  get selectedId(): number { return this._log.selectedId; }

  set nameOf(fn: (id: number) => string) { this._nameOf = fn; this._syncNameResolver(); }
  set onSelectQuest(fn: ((id: number) => void) | null) { this._log.onSelectQuest = fn; }

  constructor() {
    super();
    this._root.addChild(this._log.container);
  }

  Open(groups: { name: string; quests: number[]; medalItems?: Record<number, number> }[]): void {
    this._medalItems = new Map();
    for (const group of groups) {
      for (const [questId, itemId] of Object.entries(group.medalItems ?? {})) {
        this._medalItems.set(Number(questId), itemId);
      }
    }
    this._syncNameResolver();
    this._log.setQuests(groups);
    this._log.isVisible = true;
    this.isVisible = true;
    // OG: CUIWnd close button
    this.createCloseButton(null, null, 1, 280);
  }

  private _syncNameResolver(): void {
    this._log.nameOf = (id) => {
      const name = this._nameOf(id);
      const itemId = this._medalItems.get(id);
      return itemId === undefined ? name : `${name} [${itemId}]`;
    };
  }

  update(dt: number): void {
    if (!this.isVisible) return;
    this._log.update(dt);
    if (!this._log.isVisible) this.isVisible = false;
  }

  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const handled = this._log.handleMouseButton(x, y, down);
    if (!this._log.isVisible) this.isVisible = false;
    return handled;
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    const handled = this._log.onKeyPress(key);
    if (!this._log.isVisible) this.isVisible = false;
    return handled;
  }
}
