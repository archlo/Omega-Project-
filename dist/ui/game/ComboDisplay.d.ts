import { Container } from 'pixi.js';
export declare class ComboDisplay {
    readonly container: Container<import("pixi.js").ContainerChild>;
    private _bg;
    private _digitContainer;
    private _skillCmdContainer;
    private _digits;
    private _comboLevel;
    private _comboCount;
    private _visible;
    private _fadeTimer;
    private _fading;
    private _bounceActive;
    private _bounceStartTime;
    private _skillCmdAttackLayer;
    private _skillCmdBuffLayer;
    constructor();
    /**
     * Set the combo count. Triggers digit rebuild, level change,
     * and skill unlock notification at 30/100/200.
     */
    setCombo(count: number): void;
    hide(): void;
    /** Call every frame with delta time in seconds */
    update(dt: number): void;
    get isVisible(): boolean;
    /**
     * OG: rebuild digit display.
     * Each digit is rendered individually. Digits at/right of the rightmost
     * non-zero use BigAmp (larger); others use Normal (smaller).
     * Alternating x offsets per OG: 169 (odd) and 165 (even).
     */
    private _rebuildDigits;
    /**
     * OG: show skill unlock notification at 30/100/200 combo.
     * Loads two layers: attack command and buff command.
     * Buff layer shifts down by 35px (SKILL_CMD_Y_OFFSET) if attack layer is present.
     */
    private _showSkillUnlock;
    private _clearSkillUnlock;
}
//# sourceMappingURL=ComboDisplay.d.ts.map