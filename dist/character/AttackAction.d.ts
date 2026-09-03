/**
The body *actions* — the named animation sequences under
`Character/0000200X.img` that a basic attack plays (`swingO1`,
`stabO1`, …), as opposed to the looping movement stances.
In v95 data every action is a real frame sequence (body/arm canvases + a
per-frame `delay`), so it renders exactly like a stance; the only
attack-specific logic is choosing *which* action a swing uses.

The set is keyed off the weapon's `info/attack` type and one action is
picked at random per swing — which is why a melee weapon visibly cycles
through several poses. Mirrors the v95 client's attack-action pick.
*/
export declare class AttackAction {
    private static readonly OneHand;
    private static readonly Spear;
    private static readonly Bow;
    private static readonly Crossbow;
    private static readonly TwoHand;
    private static readonly Wand;
    private static readonly Claw;
    private static readonly Gun;
    private static readonly Knuckle;
    private static readonly BareHand;
    private static readonly CodeToAction;
    private static readonly ActionToCode;
    /** The crouch stab, used whenever the attacker is prone. */
    static readonly ProneStab = "proneStab";
    /**
    A random basic-attack action for the given weapon `attackType`
    (the weapon's `info/attack` int), or `ProneStab` when prone.
    An unknown / zero type falls back to the bare-handed set.
    */
    static Pick(attackType: number, prone: boolean, rng: () => number): string;
    static FromCode(action: number): string | null;
    static CodeFor(action: string): number;
}
//# sourceMappingURL=AttackAction.d.ts.map