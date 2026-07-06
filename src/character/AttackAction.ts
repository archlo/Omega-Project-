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
  private static readonly OneHand  = ['stabO1', 'stabO2', 'swingO1', 'swingO2', 'swingO3'];
  private static readonly Spear    = ['stabT1', 'swingP1'];
  private static readonly Bow      = ['shoot1'];
  private static readonly Crossbow = ['shoot2'];
  private static readonly TwoHand  = ['stabO1', 'stabO2', 'swingT1', 'swingT2', 'swingT3'];
  private static readonly Wand     = ['swingO1', 'swingO2'];
  private static readonly Claw     = ['swingO1', 'swingO2'];
  private static readonly Gun      = ['shot'];
  // TODO_AUDIT.md Hundred-and-forty-ninth pass: knuckles use punch/swing poses, not one-hand sword-only poses.
  private static readonly Knuckle  = ['swingO1', 'swingO2', 'swingO3'];
  private static readonly BareHand = ['swingO1', 'swingO2', 'swingO3'];

  // TODO_AUDIT.md Hundred-and-forty-ninth pass: shared common action-code bridge for local send + remote render.
  private static readonly CodeToAction = new Map<number, string>([
    [5, 'stabO1'], [6, 'swingO1'], [7, 'swingO2'], [8, 'swingO3'],
    [9, 'shoot1'], [10, 'shoot2'], [11, 'shoot3'], [12, 'shot'],
    [13, 'stabO2'], [14, 'swingT1'], [15, 'swingT2'], [16, 'swingT3'],
    [17, 'stabT1'], [18, 'swingP1'], [19, 'swingP2'], [20, 'swingP3'],
    [21, 'swingO1'], [22, 'swingO2'], [23, 'proneStab'],
  ]);
  private static readonly ActionToCode = (() => {
    const m = new Map<string, number>();
    for (const [code, action] of AttackAction.CodeToAction) if (!m.has(action)) m.set(action, code);
    return m;
  })();

  /** The crouch stab, used whenever the attacker is prone. */
  static readonly ProneStab = 'proneStab';

  /**
  A random basic-attack action for the given weapon `attackType`
  (the weapon's `info/attack` int), or `ProneStab` when prone.
  An unknown / zero type falls back to the bare-handed set.
  */
  static Pick(attackType: number, prone: boolean, rng: () => number): string {
    if (prone) return AttackAction.ProneStab;
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

  static FromCode(action: number): string | null {
    return AttackAction.CodeToAction.get(action & 0x7FFF) ?? null;
  }

  static CodeFor(action: string): number {
    return AttackAction.ActionToCode.get(action) ?? 6;
  }
}
