export declare enum Stance {
    Stand1 = 0,
    Stand2 = 1,
    Walk1 = 2,
    Walk2 = 3,
    Jump = 4,
    Alert = 5,
    Fly = 6,
    Ladder = 7,
    Rope = 8,
    Sit = 9,
    Prone = 10,
    ProneStab = 11,
    Dead = 12
}
export declare function StanceToWzKey(s: Stance): string;
/** Inverse of StanceMoveAction's stance-index table — decodes a MoveElement's
    `moveAction` byte (low nibble = stance index, bit 4 = facing-left) back
    into a Stance + facing. Indices not produced by StanceMoveAction (ladder/
    rope/fly/dead, and any value outside the table) fall back to Stand1,
    matching this client's existing one-directional (encode-only) coverage —
    not a confirmed OG index for those stances. */
export declare function MoveActionToStance(moveAction: number): {
    stance: Stance;
    facingLeft: boolean;
};
export declare function StanceMoveAction(s: Stance, facingLeft: boolean): number;
//# sourceMappingURL=Stance.d.ts.map