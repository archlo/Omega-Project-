import { Container } from 'pixi.js';
/** Dojang stage/round tracking. */
export interface DojangStage {
    /** Current floor number (1-based, server-driven). */
    floor: number;
    /** Current round within the floor (1-based, mob waves). */
    round: number;
    /** Total mobs remaining on this floor. */
    mobsRemaining: number;
    /** Whether a boss mob is present on this floor. */
    hasBoss: boolean;
    /** Boss mob template ID (0 if no boss). */
    bossTemplateId: number;
}
export declare class DojangHud {
    readonly container: Container<import("pixi.js").ContainerChild>;
    private _bossBarBg;
    private _bossBarFill;
    private _bossName;
    private _hpText;
    private _bossBarVisible;
    private _floorText;
    private _roundText;
    private _statsContainer;
    private _hpStatText;
    private _mpStatText;
    private _stage;
    onFloorClear: ((floor: number) => void) | null;
    constructor();
    /** Get current stage state. */
    get stage(): DojangStage;
    /** Set the current floor number (from server clock/field change). */
    setFloor(floor: number): void;
    /** Advance to next round within the current floor. */
    advanceRound(): void;
    /** Set mob count remaining on current floor/round. */
    setMobCount(count: number): void;
    /**
     * OG: CField_Dojang::Update (0x54EF10) — boss HP bar overlay.
     * Called when a boss mob enters the field in a dojang map.
     * OG uses CMobPool::FindBossMob() and updates m_pLayerMonsterGage.
     */
    onBossEnter(templateId: number, name: string, hpPct: number): void;
    /**
     * OG: CField_Dojang::Update — boss HP update.
     * OG: m_nMonsterHPPercentage = boss->m_nHPpercentage;
     * OG: m_pLayerMonsterGage.put_width(305 * m_nMonsterHPPercentage / 100)
     */
    onBossHpUpdate(hpPct: number): void;
    /** Boss mob died or left the field. */
    onBossLeave(): void;
    /**
     * OG: CField_Dojang::Update — player stats overlay.
     * OG renders HP/MP/digits on screen via DrawDigit.
     */
    updatePlayerStats(hp: number, maxHp: number, mp: number, maxMp: number): void;
    /** Hide the dojang HUD. */
    hide(): void;
    /** OG: CField_Dojang::CanUseSpecialArts (0x54EA40). */
    static canUseSpecialArts(fieldType: number): boolean;
    private _bossNameStr;
    private _updateBossBar;
    private _clearBossBar;
    private _refreshDisplay;
}
//# sourceMappingURL=DojangHud.d.ts.map