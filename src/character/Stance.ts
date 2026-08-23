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

/** Inverse of StanceMoveAction — decodes a MoveElement's `moveAction` byte
    into a Stance + facing. v95 wire layout (CUser::OnResolveMoveAction
    @0x8E5800 returns `(2 * nMoveAction) | dir`; CAvatar::MoveAction2RawAction
    @0x45FA30 reads dir = nMA & 1, idx = nMA >> 1):
    bit 0 = facing-left, bits 1+ = move index:
    1 walk · 2/4 stand variants · 3 fall · 5 jump · 6 swim/fly-idle ·
    7 ladder · 8 rope · 9 fly · 10 chair/sit · 12 prone · 19 dash · 20 booster. */
export function MoveActionToStance(moveAction: number): { stance: Stance; facingLeft: boolean } {
  const facingLeft = (moveAction & 1) !== 0;
  const idx = moveAction >>> 1;
  const stance = (() => {
    switch (idx) {
      case 1:
      case 19:
      case 20:
        return Stance.Walk1;
      case 2:
      case 4:
        return Stance.Stand1;
      case 3:
        return Stance.Walk2; // airborne/fall branch
      case 5:
        return Stance.Jump;
      case 6:
      case 9:
        return Stance.Fly;
      case 7:
        return Stance.Ladder;
      case 8:
        return Stance.Rope;
      case 10:
        return Stance.Sit;
      case 12:
        return Stance.Prone;
      default:
        return Stance.Stand1;
    }
  })();
  return { stance, facingLeft };
}

export function StanceMoveAction(s: Stance, facingLeft: boolean): number {
  const idx = (() => {
    switch (s) {
      case Stance.Stand1:
      case Stance.Stand2:
        return 2;
      case Stance.Walk1:
      case Stance.Walk2:
        return 1;
      case Stance.Jump:
        return 5;
      case Stance.Ladder:
        return 7;
      case Stance.Rope:
        return 8;
      case Stance.Fly:
        return 9;
      case Stance.Prone:
        return 12;
      case Stance.Sit:
        return 10;
      default:
        return 2;
    }
  })();
  return (facingLeft ? 1 : 0) | (idx << 1);
}
