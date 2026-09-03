import { Container } from 'pixi.js';
export declare class KeyDownBar {
    readonly container: Container<import("pixi.js").ContainerChild>;
    private _bar;
    private _gauge;
    private _graduation;
    private _pointer;
    private _visible;
    private _position;
    private _mode;
    private _repeatSkillId;
    private _preparingSkillId;
    constructor();
    /**
     * Show the key-down bar at a given fill fraction (0–1).
     * Automatically selects the correct visual mode based on skill state.
     */
    show(fillFraction: number): void;
    hide(): void;
    get isVisible(): boolean;
    /** Set the current repeat/preparing skill IDs for mode resolution */
    setSkillState(repeatSkillId: number, preparingSkillId: number): void;
    /** Resolve bar mode from current skill state (OG branching logic) */
    private _resolveMode;
    private _redraw;
}
//# sourceMappingURL=KeyDownBar.d.ts.map