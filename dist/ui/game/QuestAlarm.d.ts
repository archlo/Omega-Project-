import { GamePanel } from './GamePanel.js';
/** A tracked quest entry. */
export interface QuestAlarmEntry {
    questId: number;
    name: string;
    progress: string;
    isComplete: boolean;
}
export declare class QuestAlarm extends GamePanel {
    private _active;
    private _maximized;
    private _created;
    private _quests;
    private _scrollOffset;
    private _bg;
    private _dynamicChildren;
    onToggle: ((maximized: boolean) => void) | null;
    onQuestClick: ((questId: number) => void) | null;
    constructor();
    /** OG: CUIQuestAlarm::Create (0x822730) — create the window. */
    create(): void;
    /** OG: CUIQuestAlarm::ToggleQuestAlarmState (0x822770). */
    toggle(): void;
    /** OG: CUIQuestAlarm::ResetInfo (0x823B90) — update quest progress. */
    resetInfo(questId: number, name: string, progress: string, isComplete: boolean): void;
    /** Remove a quest from the alarm list. */
    removeQuest(questId: number): void;
    /** Set all tracked quests at once. */
    setQuests(quests: QuestAlarmEntry[]): void;
    /** OG: CUIQuestAlarm::IsInQuestAlarmList (0x821730). */
    isInList(questId: number): boolean;
    /** OG: CUIQuestAlarm::GetHeight (0x822650). */
    private _getHeight;
    private _rebuildBg;
    update(_dt: number): void;
    draw(): void;
    handleMouseButton(mx: number, my: number, down: boolean): boolean;
    handleWheel(_dx: number, dy: number): void;
    onKeyPress(key: string): boolean;
    onResize(_w: number, _h: number): void;
}
//# sourceMappingURL=QuestAlarm.d.ts.map