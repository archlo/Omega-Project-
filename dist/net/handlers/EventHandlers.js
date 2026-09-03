import { OutHeader } from '../packet/OpCodes.js';
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
export class EventHandlers {
    onSnowBallState = null;
    onSnowBallHit = null;
    onSnowBallMsg = null;
    /** SnowBallTouch (341) — CField_SnowBall::OnSnowBallTouch
     *  (decompile/560510.c) reads nothing from the packet at all; it's a pure
     *  client-side impact-animation trigger (`CUserLocal::SetImpact`). */
    onSnowBallTouch = null;
    onCoconutScore = null;
    onCoconutHit = null;
    onCoconutMsg = null;
    onAriantArenaResult = null;
    onGuildBossHealerMove = null;
    onGuildBossPulleyState = null;
    // CField_SnowBall::m_nState starts at -1 (never reachable from the wire,
    // which only ever sends bytes 0-3+) and is only ever read by this same
    // function — mirroring that as "have we seen a SnowBallState packet yet
    // this field-instance" reproduces `bFirst` exactly without needing the
    // rest of CField_SnowBall's state.
    _snowBallStateSeen = false;
    /** Call on every field change (`FieldHandlers.onSetField`) — `bFirst`
     *  tracking is scoped to "since entering this field," matching the real
     *  `CField_SnowBall` instance's lifetime (one per field load). */
    resetFieldState() {
        this._snowBallStateSeen = false;
    }
    clear() {
        this._snowBallStateSeen = false;
        this.onSnowBallState = null;
        this.onSnowBallHit = null;
        this.onSnowBallMsg = null;
        this.onSnowBallTouch = null;
        this.onCoconutScore = null;
        this.onCoconutHit = null;
        this.onCoconutMsg = null;
        this.onAriantArenaResult = null;
        this.onGuildBossHealerMove = null;
        this.onGuildBossPulleyState = null;
    }
    register(router) {
        router.register(OutHeader.SnowBallState, (p, _s) => this._handleSnowBallState(p));
        router.register(OutHeader.SnowBallHit, (p, _s) => this._handleSnowBallHit(p));
        router.register(OutHeader.SnowBallMsg, (p, _s) => this._handleSnowBallMsg(p));
        router.register(OutHeader.SnowBallTouch, (_p, _s) => this.onSnowBallTouch?.());
        router.register(OutHeader.CoconutScore, (p, _s) => this.onCoconutScore?.({ rawPayload: p.readBytes(p.remaining) }));
        router.register(OutHeader.CoconutHit, (p, _s) => this.onCoconutHit?.({ rawPayload: p.readBytes(p.remaining) }));
        router.register(OutHeader.CoconutMsg, (p, _s) => this.onCoconutMsg?.({ rawPayload: p.readBytes(p.remaining) }));
        router.register(OutHeader.AriantArenaResult, (p, _s) => this.onAriantArenaResult?.({ rawPayload: p.readBytes(p.remaining) }));
        router.register(OutHeader.GuildBossHealerMove, (p, _s) => this.onGuildBossHealerMove?.({ rawPayload: p.readBytes(p.remaining) }));
        router.register(OutHeader.GuildBossPulleyState, (p, _s) => this.onGuildBossPulleyState?.({ rawPayload: p.readBytes(p.remaining) }));
    }
    // CField_SnowBall::OnSnowBallState (decompile/560AB0.c). `bFirst` is
    // `this->m_nState == -1` evaluated BEFORE this packet's state byte
    // overwrites it — i.e. "is this the first SnowBallState packet seen since
    // entering this field" — tracked here as `_snowBallStateSeen`.
    _handleSnowBallState(p) {
        const bFirst = !this._snowBallStateSeen;
        this._snowBallStateSeen = true;
        const state = p.readByte();
        const snowManHp = [p.readInt(), p.readInt()];
        const snowBallPos = [
            { a: p.readShort(), b: p.readByte() },
            { a: p.readShort(), b: p.readByte() },
        ];
        const firstPacketDamage = bFirst
            ? { snowBall: p.readShort(), snowMan: [p.readShort(), p.readShort()] }
            : null;
        this.onSnowBallState?.({ state, snowManHp, snowBallPos, firstPacketDamage });
    }
    // CField_SnowBall::OnSnowBallHit (decompile/5619D0.c).
    _handleSnowBallHit(p) {
        const side = p.readByte();
        const x = p.readShort();
        const y = p.readShort();
        this.onSnowBallHit?.({ side, x, y });
    }
    // CField_SnowBall::OnSnowBallMsg (decompile/562040.c).
    _handleSnowBallMsg(p) {
        const team = p.readByte();
        const msgType = p.readByte();
        this.onSnowBallMsg?.({ team, msgType });
    }
}
//# sourceMappingURL=EventHandlers.js.map