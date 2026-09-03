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

## Code space (v95 authoritative)

`CodeToAction` is the v95 `s_aCharacterActionData[]` table (built by the
client's `_dynamic_initializer_for__s_aCharacterActionData__`, read back
by `get_action_name_from_code` @0x4BA910): the array index IS the action
code, and entry `.bsName` is the pose. Every entry below was verified by
decrypting the exe's StringPool IDs 0x407..0x42A / 0x1ADA.. etc., so a
code round-trips with the pose a real client plays:

- 5..8    `swingO1` `swingO2` `swingO3` `swingOF`
- 9..12   `swingT1` `swingT2` `swingT3` `swingTF`
- 13..15  `swingP1` `swingP2` `swingPF`
- 16..18  `stabO1` `stabO2` `stabOF`
- 19..21  `stabT1` `stabT2` `stabTF`
- 22..24  `swingD1` `swingD2` `stabD1`
- 31/32/36 `shoot1` `shoot2` `shootF` (bow/crossbow shoot poses)
- 41      `proneStab`
- 116     `shot` (gun)

Code → pose is unambiguous; pose → code is not (e.g. `swingO1` lives at
indexes 5, 33 and 37). `CodeFor` returns the FIRST (canonical, basic-melee)
index that carries the name, which is the value the melee/shoot pose
tables actually emit for that pose.
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

  // v95 s_aCharacterActionData — index == action code (see class doc).
  private static readonly CodeToAction = new Map<number, string>([
    [5, 'swingO1'], [6, 'swingO2'], [7, 'swingO3'], [8, 'swingOF'],
    [9, 'swingT1'], [10, 'swingT2'], [11, 'swingT3'], [12, 'swingTF'],
    [13, 'swingP1'], [14, 'swingP2'], [15, 'swingPF'],
    [16, 'stabO1'], [17, 'stabO2'], [18, 'stabOF'],
    [19, 'stabT1'], [20, 'stabT2'], [21, 'stabTF'],
    [22, 'swingD1'], [23, 'swingD2'], [24, 'stabD1'],
    [31, 'shoot1'], [32, 'shoot2'], [36, 'shootF'],
    [41, 'proneStab'],
    [116, 'shot'],
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
