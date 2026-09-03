import { PacketRouter } from '../session/PacketRouter.js';
export interface SnowBallStateArgs {
    /** Decode1 — overall round state (CField_SnowBall::m_nState): 2/3 means a
     *  side just won, anything else is a plain position update. */
    state: number;
    /** Decode4 x2 — each snowman's current HP. */
    snowManHp: [number, number];
    /** Decode2 (signed) + Decode1, once per side (2 entries) — snowball
     *  position-update pair (`CSnowBall::SetPos`'s x/y-ish args; exact meaning
     *  of the byte beyond "position" not resolved further, not needed for a
     *  status line). */
    snowBallPos: [{
        a: number;
        b: number;
    }, {
        a: number;
        b: number;
    }];
    /** Decode2 x3, only present on the very first state packet
     *  (`bFirst = m_nState == -1` before this packet's own state overwrites
     *  it) — per-hit damage dealt to the snowball and to each snowman. */
    firstPacketDamage: {
        snowBall: number;
        snowMan: [number, number];
    } | null;
}
export interface SnowBallHitArgs {
    side: number;
    x: number;
    y: number;
}
export interface SnowBallMsgArgs {
    /** Decode1 — nonzero selects the "Maple" name variant vs. "Story" in the
     *  real client's templated notice string. */
    team: number;
    /** Decode1 — message id, 1-5; only 1/2/3/4/5 produce any text in the real
     *  switch (default is a silent no-op). */
    msgType: number;
}
export interface CoconutScoreArgs {
    rawPayload: Uint8Array;
}
export interface CoconutHitArgs {
    rawPayload: Uint8Array;
}
export interface CoconutMsgArgs {
    rawPayload: Uint8Array;
}
export interface AriantArenaResultArgs {
    rawPayload: Uint8Array;
}
export interface GuildBossHealerMoveArgs {
    rawPayload: Uint8Array;
}
export interface GuildBossPulleyStateArgs {
    rawPayload: Uint8Array;
}
/** Server-pushed in-field event-minigame opcodes — these fire during normal
 *  field gameplay, not from a dedicated stage/dialog, so they're rendered as
 *  passive HUD status lines (see GameStage's `_statusMessenger.showLoot`
 *  convention) rather than opening any panel.
 *
 *  SnowBall (338-341): CField_SnowBall::OnPacket (decompile/562290.c) is a
 *  real, fully decompiled dispatcher with all 4 sub-handlers present and
 *  read in full — every field below is decode-verified.
 *
 *  Coconut (342-344) and GuildBoss (379-380): NO `CField_Coconut::OnPacket`/
 *  `CField_GuildBoss::OnPacket` (or any `OnCoconut*`/`OnGuildBoss*`
 *  sub-handler) exists anywhere in this decompile export — confirmed by
 *  grepping function_index.txt for every plausible name. The only Coconut
 *  trace at all is a static recyclable-buffer-pool initializer stub for the
 *  `CField_Coconut::HITINFO` struct (decompile/B04F00.c), which carries no
 *  field-layout information. These five opcodes are registered with a raw
 *  passthrough decode (full remaining payload, no fields split out) and
 *  documented as unconfirmed in TODO_AUDIT.md rather than guessed at. */
export declare class EventHandlers {
    onSnowBallState: ((args: SnowBallStateArgs) => void) | null;
    onSnowBallHit: ((args: SnowBallHitArgs) => void) | null;
    onSnowBallMsg: ((args: SnowBallMsgArgs) => void) | null;
    /** SnowBallTouch (341) — CField_SnowBall::OnSnowBallTouch
     *  (decompile/560510.c) reads nothing from the packet at all; it's a pure
     *  client-side impact-animation trigger (`CUserLocal::SetImpact`). */
    onSnowBallTouch: (() => void) | null;
    onCoconutScore: ((args: CoconutScoreArgs) => void) | null;
    onCoconutHit: ((args: CoconutHitArgs) => void) | null;
    onCoconutMsg: ((args: CoconutMsgArgs) => void) | null;
    onAriantArenaResult: ((args: AriantArenaResultArgs) => void) | null;
    onGuildBossHealerMove: ((args: GuildBossHealerMoveArgs) => void) | null;
    onGuildBossPulleyState: ((args: GuildBossPulleyStateArgs) => void) | null;
    private _snowBallStateSeen;
    /** Call on every field change (`FieldHandlers.onSetField`) — `bFirst`
     *  tracking is scoped to "since entering this field," matching the real
     *  `CField_SnowBall` instance's lifetime (one per field load). */
    resetFieldState(): void;
    clear(): void;
    register(router: PacketRouter): void;
    private _handleSnowBallState;
    private _handleSnowBallHit;
    private _handleSnowBallMsg;
}
//# sourceMappingURL=EventHandlers.d.ts.map