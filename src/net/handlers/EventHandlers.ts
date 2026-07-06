import { InPacket } from '../packet/InPacket.js';
import { OutHeader } from '../packet/OpCodes.js';
import { PacketRouter } from '../session/PacketRouter.js';
import { ClientSession } from '../session/ClientSession.js';

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
  snowBallPos: [{ a: number; b: number }, { a: number; b: number }];
  /** Decode2 x3, only present on the very first state packet
   *  (`bFirst = m_nState == -1` before this packet's own state overwrites
   *  it) — per-hit damage dealt to the snowball and to each snowman. */
  firstPacketDamage: { snowBall: number; snowMan: [number, number] } | null;
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
export class EventHandlers {
  onSnowBallState: ((args: SnowBallStateArgs) => void) | null = null;
  onSnowBallHit: ((args: SnowBallHitArgs) => void) | null = null;
  onSnowBallMsg: ((args: SnowBallMsgArgs) => void) | null = null;
  /** SnowBallTouch (341) — CField_SnowBall::OnSnowBallTouch
   *  (decompile/560510.c) reads nothing from the packet at all; it's a pure
   *  client-side impact-animation trigger (`CUserLocal::SetImpact`). */
  onSnowBallTouch: (() => void) | null = null;

  onCoconutScore: ((args: CoconutScoreArgs) => void) | null = null;
  onCoconutHit: ((args: CoconutHitArgs) => void) | null = null;
  onCoconutMsg: ((args: CoconutMsgArgs) => void) | null = null;
  onAriantArenaResult: ((args: AriantArenaResultArgs) => void) | null = null;
  onGuildBossHealerMove: ((args: GuildBossHealerMoveArgs) => void) | null = null;
  onGuildBossPulleyState: ((args: GuildBossPulleyStateArgs) => void) | null = null;

  // CField_SnowBall::m_nState starts at -1 (never reachable from the wire,
  // which only ever sends bytes 0-3+) and is only ever read by this same
  // function — mirroring that as "have we seen a SnowBallState packet yet
  // this field-instance" reproduces `bFirst` exactly without needing the
  // rest of CField_SnowBall's state.
  private _snowBallStateSeen = false;

  /** Call on every field change (`FieldHandlers.onSetField`) — `bFirst`
   *  tracking is scoped to "since entering this field," matching the real
   *  `CField_SnowBall` instance's lifetime (one per field load). */
  resetFieldState(): void {
    this._snowBallStateSeen = false;
  }

  clear(): void {
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

  register(router: PacketRouter): void {
    router.register(OutHeader.SnowBallState, (p: InPacket, _s: ClientSession) => this._handleSnowBallState(p));
    router.register(OutHeader.SnowBallHit, (p: InPacket, _s: ClientSession) => this._handleSnowBallHit(p));
    router.register(OutHeader.SnowBallMsg, (p: InPacket, _s: ClientSession) => this._handleSnowBallMsg(p));
    router.register(OutHeader.SnowBallTouch, (_p: InPacket, _s: ClientSession) => this.onSnowBallTouch?.());

    router.register(OutHeader.CoconutScore, (p: InPacket, _s: ClientSession) => this.onCoconutScore?.({ rawPayload: p.readBytes(p.remaining) }));
    router.register(OutHeader.CoconutHit, (p: InPacket, _s: ClientSession) => this.onCoconutHit?.({ rawPayload: p.readBytes(p.remaining) }));
    router.register(OutHeader.CoconutMsg, (p: InPacket, _s: ClientSession) => this.onCoconutMsg?.({ rawPayload: p.readBytes(p.remaining) }));
    router.register(OutHeader.AriantArenaResult, (p: InPacket, _s: ClientSession) => this.onAriantArenaResult?.({ rawPayload: p.readBytes(p.remaining) }));

    router.register(OutHeader.GuildBossHealerMove, (p: InPacket, _s: ClientSession) => this.onGuildBossHealerMove?.({ rawPayload: p.readBytes(p.remaining) }));
    router.register(OutHeader.GuildBossPulleyState, (p: InPacket, _s: ClientSession) => this.onGuildBossPulleyState?.({ rawPayload: p.readBytes(p.remaining) }));
  }

  // CField_SnowBall::OnSnowBallState (decompile/560AB0.c). `bFirst` is
  // `this->m_nState == -1` evaluated BEFORE this packet's state byte
  // overwrites it — i.e. "is this the first SnowBallState packet seen since
  // entering this field" — tracked here as `_snowBallStateSeen`.
  private _handleSnowBallState(p: InPacket): void {
    const bFirst = !this._snowBallStateSeen;
    this._snowBallStateSeen = true;

    const state = p.readByte();
    const snowManHp: [number, number] = [p.readInt(), p.readInt()];
    const snowBallPos: [{ a: number; b: number }, { a: number; b: number }] = [
      { a: p.readShort(), b: p.readByte() },
      { a: p.readShort(), b: p.readByte() },
    ];
    const firstPacketDamage = bFirst
      ? { snowBall: p.readShort(), snowMan: [p.readShort(), p.readShort()] as [number, number] }
      : null;
    this.onSnowBallState?.({ state, snowManHp, snowBallPos, firstPacketDamage });
  }

  // CField_SnowBall::OnSnowBallHit (decompile/5619D0.c).
  private _handleSnowBallHit(p: InPacket): void {
    const side = p.readByte();
    const x = p.readShort();
    const y = p.readShort();
    this.onSnowBallHit?.({ side, x, y });
  }

  // CField_SnowBall::OnSnowBallMsg (decompile/562040.c).
  private _handleSnowBallMsg(p: InPacket): void {
    const team = p.readByte();
    const msgType = p.readByte();
    this.onSnowBallMsg?.({ team, msgType });
  }
}
