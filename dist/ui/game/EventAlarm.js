import * as PIXI from 'pixi.js';
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
export class EventAlarm extends GamePanel {
    _bg;
    _label;
    _closeAt = 0;
    static DISPLAY_MS = 6000;
    constructor() {
        super();
        this._bg = new PIXI.Graphics();
        this._label = new PIXI.Text('', {
            fontFamily: 'Arial',
            fontSize: 12,
            fill: 0xffeeaa,
            wordWrap: true,
            wordWrapWidth: 198,
            align: 'left',
        });
        this._label.x = 30;
        this._label.y = 22;
        this._root.addChild(this._bg);
        this._root.addChild(this._label);
    }
    show(title, lines) {
        const parts = [];
        if (title)
            parts.push(title);
        for (const l of lines)
            if (l)
                parts.push(l);
        this._label.text = parts.join('\n');
        const h = Math.max(40, this._label.height + 4);
        this._bg.clear();
        this._bg.beginFill(0x000000, 0.65);
        this._bg.lineStyle(1, 0xccaa55, 1);
        this._bg.drawRoundedRect(0, 0, 266, h + 44, 4);
        this._bg.endFill();
        this._closeAt = performance.now() + EventAlarm.DISPLAY_MS;
        this.isVisible = true;
    }
    update(_dt) {
        if (this.isVisible && performance.now() >= this._closeAt) {
            this.isVisible = false;
        }
    }
}
//# sourceMappingURL=EventAlarm.js.map