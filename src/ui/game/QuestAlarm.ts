import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';

/**
 * OG: CUIQuestAlarm — quest progress alarm overlay.
 * Decompiled from v95 IDB (Create 0x822730, ToggleQuestAlarmState 0x822770,
 * ResetInfo 0x823B90, GetHeight 0x822650, OnMouseButton 0x824200).
 *
 * Shows a compact list of tracked quests with progress indicators.
 * Toggleable between maximized (shows quest list) and minimized (icon only).
 * Persists open/closed state to config (OG: CConfig::SetQuestAlarmOpened).
 */

// OG: CUIQuestAlarm::Create — width=180, height=GetHeight()+30
const PANEL_W = 180;
const TITLE_H = 22;
const ROW_H = 18;
const MAX_ROWS = 8;

const _titleStyle = new TextStyle({ fill: '#FFE4B5', fontSize: 10, fontFamily: 'monospace' });
const _questStyle = new TextStyle({ fill: '#DCC896', fontSize: 9, fontFamily: 'monospace' });
const _progressStyle = new TextStyle({ fill: '#96FF96', fontSize: 9, fontFamily: 'monospace' });

/** A tracked quest entry. */
export interface QuestAlarmEntry {
  questId: number;
  name: string;
  progress: string;  // e.g. "3/10 monsters" or "Complete"
  isComplete: boolean;
}

export class QuestAlarm extends GamePanel {
  // OG: m_bActive, m_bMaximized, m_bCreated
  private _active = true;
  private _maximized = true;
  private _created = false;

  // OG: m_aQuestID — tracked quest IDs
  private _quests: QuestAlarmEntry[] = [];
  private _scrollOffset = 0;

  // UI
  private _bg: Graphics;
  private _dynamicChildren: Container[] = [];

  // Callbacks
  onToggle: ((maximized: boolean) => void) | null = null;
  onQuestClick: ((questId: number) => void) | null = null;

  constructor() {
    super();
    this._root.visible = false;

    this._bg = new Graphics();
    this._root.addChild(this._bg);
    this._rebuildBg();
  }

  /** OG: CUIQuestAlarm::Create (0x822730) — create the window. */
  create(): void {
    if (this._created) return;
    const height = this._getHeight();
    // OG: CreateUIWndPosSaved(this, 180, Height+30, 10)
    this._root.x = 10;
    this._root.y = 100;
    this._active = true;
    this._created = true;
    this.isVisible = true;
  }

  /** OG: CUIQuestAlarm::ToggleQuestAlarmState (0x822770). */
  toggle(): void {
    if (!this._active && this._quests.length === 0) return;
    this._maximized = !this._maximized;
    this.onToggle?.(this._maximized);
    if (this._maximized) {
      this.isVisible = true;
      this._rebuildBg();
    } else {
      this.isVisible = false;
    }
  }

  /** OG: CUIQuestAlarm::ResetInfo (0x823B90) — update quest progress. */
  resetInfo(questId: number, name: string, progress: string, isComplete: boolean): void {
    const existing = this._quests.find(q => q.questId === questId);
    if (existing) {
      existing.name = name;
      existing.progress = progress;
      existing.isComplete = isComplete;
    } else {
      this._quests.push({ questId, name, progress, isComplete });
    }
    if (this._created && this._maximized) {
      this.isVisible = true;
      this._rebuildBg();
    }
  }

  /** Remove a quest from the alarm list. */
  removeQuest(questId: number): void {
    this._quests = this._quests.filter(q => q.questId !== questId);
    if (this._quests.length === 0 && this._maximized) {
      this.isVisible = false;
    }
  }

  /** Set all tracked quests at once. */
  setQuests(quests: QuestAlarmEntry[]): void {
    this._quests = [...quests];
    if (this._created && this._maximized && this._quests.length > 0) {
      this.isVisible = true;
      this._rebuildBg();
    }
  }

  /** OG: CUIQuestAlarm::IsInQuestAlarmList (0x821730). */
  isInList(questId: number): boolean {
    return this._quests.some(q => q.questId === questId);
  }

  /** OG: CUIQuestAlarm::GetHeight (0x822650). */
  private _getHeight(): number {
    const rows = Math.min(this._quests.length, MAX_ROWS);
    return TITLE_H + rows * ROW_H + 4;
  }

  private _rebuildBg(): void {
    this._bg.clear();
    const h = this._getHeight();
    // Background
    this._bg.rect(0, 0, PANEL_W, h).fill({ color: '#0C0E18', alpha: 230 / 255 });
    this._bg.rect(0, 0, PANEL_W, h).stroke({ color: '#3C4164', width: 1 });
    // Title bar
    this._bg.rect(0, 0, PANEL_W, TITLE_H).fill({ color: '#0F1224' });
  }

  update(_dt: number): void {
    if (!this.isVisible || !this._maximized) return;
    this.draw();
  }

  draw(): void {
    if (!this.isVisible) return;
    for (const c of this._dynamicChildren) c.destroy();
    this._dynamicChildren = [];
    this._rebuildBg();

    // Title
    const title = new Text({ text: 'Quest Alarm', style: _titleStyle });
    title.x = 4;
    title.y = 4;
    this._root.addChild(title);
    this._dynamicChildren.push(title);

    // Quest list
    const visibleCount = Math.min(MAX_ROWS, this._quests.length - this._scrollOffset);
    for (let i = 0; i < visibleCount; i++) {
      const idx = this._scrollOffset + i;
      const quest = this._quests[idx];
      const y = TITLE_H + i * ROW_H;

      // Quest name
      const nameText = new Text({ text: quest.name, style: _questStyle });
      nameText.x = 4;
      nameText.y = y + 1;
      this._root.addChild(nameText);
      this._dynamicChildren.push(nameText);

      // Progress
      const progressText = new Text({
        text: quest.isComplete ? 'Complete' : quest.progress,
        style: quest.isComplete ? _progressStyle : _questStyle,
      });
      progressText.x = PANEL_W - 60;
      progressText.y = y + 1;
      this._root.addChild(progressText);
      this._dynamicChildren.push(progressText);
    }
  }

  handleMouseButton(mx: number, my: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    const lx = mx - this._root.x;
    const ly = my - this._root.y;

    if (!down) return false;

    // Click on quest row
    if (lx >= 0 && lx < PANEL_W && ly >= TITLE_H && ly < TITLE_H + Math.min(MAX_ROWS, this._quests.length) * ROW_H) {
      const rowIdx = Math.floor((ly - TITLE_H) / ROW_H) + this._scrollOffset;
      if (rowIdx >= 0 && rowIdx < this._quests.length) {
        this.onQuestClick?.(this._quests[rowIdx].questId);
        return true;
      }
    }

    return lx >= 0 && lx < PANEL_W && ly >= 0 && ly < this._getHeight();
  }

  handleWheel(_dx: number, dy: number): void {
    if (!this.isVisible) return;
    const max = Math.max(0, this._quests.length - MAX_ROWS);
    this._scrollOffset = Math.max(0, Math.min(max, this._scrollOffset + (dy > 0 ? 1 : -1)));
  }

  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') { this.toggle(); return true; }
    return true;
  }

  onResize(_w: number, _h: number): void {
    // OG: position saved, no auto-resize
  }
}
