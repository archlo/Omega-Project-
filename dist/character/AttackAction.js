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
export class AttackAction {
    static OneHand = ['stabO1', 'stabO2', 'swingO1', 'swingO2', 'swingO3'];
    static Spear = ['stabT1', 'swingP1'];
    static Bow = ['shoot1'];
    static Crossbow = ['shoot2'];
    static TwoHand = ['stabO1', 'stabO2', 'swingT1', 'swingT2', 'swingT3'];
    static Wand = ['swingO1', 'swingO2'];
    static Claw = ['swingO1', 'swingO2'];
    static Gun = ['shot'];
    // TODO_AUDIT.md Hundred-and-forty-ninth pass: knuckles use punch/swing poses, not one-hand sword-only poses.
    static Knuckle = ['swingO1', 'swingO2', 'swingO3'];
    static BareHand = ['swingO1', 'swingO2', 'swingO3'];
    // TODO_AUDIT.md Hundred-and-forty-ninth pass: shared common action-code bridge for local send + remote render.
    static CodeToAction = new Map([
        [5, 'stabO1'], [6, 'swingO1'], [7, 'swingO2'], [8, 'swingO3'],
        [9, 'shoot1'], [10, 'shoot2'], [11, 'shoot3'], [12, 'shot'],
        [13, 'stabO2'], [14, 'swingT1'], [15, 'swingT2'], [16, 'swingT3'],
        [17, 'stabT1'], [18, 'swingP1'], [19, 'swingP2'], [20, 'swingP3'],
        [21, 'swingO1'], [22, 'swingO2'], [23, 'proneStab'],
    ]);
    static ActionToCode = (() => {
        const m = new Map();
        for (const [code, action] of AttackAction.CodeToAction)
            if (!m.has(action))
                m.set(action, code);
        return m;
    })();
    /** The crouch stab, used whenever the attacker is prone. */
    static ProneStab = 'proneStab';
    /**
    A random basic-attack action for the given weapon `attackType`
    (the weapon's `info/attack` int), or `ProneStab` when prone.
    An unknown / zero type falls back to the bare-handed set.
    */
    static Pick(attackType, prone, rng) {
        if (prone)
            return AttackAction.ProneStab;
        const set = (() => {
            switch (attackType) {
                case 1: return AttackAction.OneHand;
                case 2: return AttackAction.Spear;
                case 3: return AttackAction.Bow;
                case 4: return AttackAction.Crossbow;
                case 5: return AttackAction.TwoHand;
                case 6: return AttackAction.Wand;
                case 7: return AttackAction.Claw;
                case 8: return AttackAction.Knuckle;
                case 9: return AttackAction.Gun;
                default: return AttackAction.BareHand;
            }
        })();
        return set[Math.floor(rng() * set.length)];
    }
    static FromCode(action) {
        return AttackAction.CodeToAction.get(action & 0x7FFF) ?? null;
    }
    static CodeFor(action) {
        return AttackAction.ActionToCode.get(action) ?? 6;
    }
}
//# sourceMappingURL=AttackAction.js.map