export enum Stance {
  Stand1,
  Stand2,
  Walk1,
  Walk2,
  Jump,
  Alert,
  Fly,
  Ladder,
  Rope,
  Sit,
  Prone,
  ProneStab,
  Dead,
}

export function StanceToWzKey(s: Stance): string {
  switch (s) {
    case Stance.Stand1: return 'stand1';
    case Stance.Stand2: return 'stand2';
    case Stance.Walk1: return 'walk1';
    case Stance.Walk2: return 'walk2';
    case Stance.Jump: return 'jump';
    case Stance.Alert: return 'alert';
    case Stance.Fly: return 'fly';
    case Stance.Ladder: return 'ladder';
    case Stance.Rope: return 'rope';
    case Stance.Sit: return 'sit';
    case Stance.Prone: return 'prone';
    case Stance.ProneStab: return 'proneStab';
    case Stance.Dead: return 'dead';
    default: return 'stand1';
  }
}

/** Inverse of StanceMoveAction's stance-index table — decodes a MoveElement's
    `moveAction` byte (low nibble = stance index, bit 4 = facing-left) back
    into a Stance + facing. Indices not produced by StanceMoveAction (ladder/
    rope/fly/dead, and any value outside the table) fall back to Stand1,
    matching this client's existing one-directional (encode-only) coverage —
    not a confirmed OG index for those stances. */
export function MoveActionToStance(moveAction: number): { stance: Stance; facingLeft: boolean } {
  const facingLeft = ((moveAction >> 4) & 1) !== 0;
  const stIdx = moveAction & 0x0F;
  const stance = (() => {
    switch (stIdx) {
      case 0: return Stance.Stand1;
      case 1: return Stance.Stand2;
      case 2: return Stance.Walk1;
      case 3: return Stance.Walk2;
      case 5: return Stance.Jump;
      case 8: return Stance.Alert;
      case 12: return Stance.Prone;
      case 15: return Stance.Sit;
      default: return Stance.Stand1;
    }
  })();
  return { stance, facingLeft };
}

export function StanceMoveAction(s: Stance, facingLeft: boolean): number {
  const stIdx = (() => {
    switch (s) {
      case Stance.Stand1: return 0;
      case Stance.Stand2: return 1;
      case Stance.Walk1: return 2;
      case Stance.Walk2: return 3;
      case Stance.Jump: return 5;
      case Stance.Alert: return 8;
      case Stance.Prone: return 12;
      case Stance.Sit: return 15;
      default: return 0;
    }
  })();
  return ((facingLeft ? 1 : 0) << 4) | (stIdx & 0x0F);
}
