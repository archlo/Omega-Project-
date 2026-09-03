import { GamePanel } from './GamePanel.js';
/**
 * CUIEventAlarm — timed event-alert popup triggered on field entry when
 * the SetField packet carries nNotifierCheck > 0.
 *
 * OG: CStage::OnSetField (decompile/71A0A0.c) builds sNotifierMessage from
 * sNotifierTitle + nNotifierCheck content lines, passes it to
 * CUIEventAlarm::SetEventAlarm, then Layout_GEN + CreateEventAlarm.
 *
 * OG geometry: wndWidth=266, wndHeight=m_ctHeight+44, positioned near quest
 * dialog. Text clip area: left=30, top=22, width=198. Auto-closes via
 * Update() when timeGetTime() > m_tEnd (TS uses 6 s, OG timer unrecovered).
 *
 * TODO_AUDIT.md Hundred-and-sixty-eighth pass.
 */
export declare class EventAlarm extends GamePanel {
    private _bg;
    private _label;
    private _closeAt;
    private static readonly DISPLAY_MS;
    constructor();
    show(title: string, lines: string[]): void;
    update(_dt: number): void;
}
//# sourceMappingURL=EventAlarm.d.ts.map