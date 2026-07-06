import { OutPacket } from './OutPacket.js';
import { MovePathAttr } from '../protocol/Enums.js';

export interface MoveElement {
  attr: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fh: number;
  fhFallStart: number;
  xOffset: number;
  yOffset: number;
  stat: number;
  moveAction: number;
  elapse: number;
}

enum MoveCategory { Normal, Jump, Teleport, StatChange, StartFallDown, FlyingBlock, Action }

function category(attr: number): MoveCategory {
  switch (attr) {
    case MovePathAttr.Normal:
    case MovePathAttr.Normal2:
    case MovePathAttr.NormalWithFhFall:
    case MovePathAttr.Normal4:
    case MovePathAttr.Normal5:
    case MovePathAttr.Normal6:
      return MoveCategory.Normal;
    case MovePathAttr.Jump:
    case MovePathAttr.JumpAlert:
    case MovePathAttr.Jump2:
    case MovePathAttr.Jump3:
    case MovePathAttr.Jump4:
    case MovePathAttr.Jump5:
    case MovePathAttr.Jump6:
    case MovePathAttr.Jump7:
    case MovePathAttr.Jump8:
      return MoveCategory.Jump;
    case MovePathAttr.Teleport:
    case MovePathAttr.TeleportAlert:
    case MovePathAttr.Teleport2:
    case MovePathAttr.TeleportAlert2:
    case MovePathAttr.Normal3:
    case MovePathAttr.NormalAlert:
      return MoveCategory.Teleport;
    case MovePathAttr.StatChange:
      return MoveCategory.StatChange;
    case MovePathAttr.StartFallDown:
      return MoveCategory.StartFallDown;
    case MovePathAttr.FlyingBlock:
      return MoveCategory.FlyingBlock;
    default:
      return MoveCategory.Action;
  }
}

export function EncodeMovePath(
  originX: number, originY: number, originVx: number, originVy: number,
  elements: MoveElement[]
): Uint8Array {
  const p = OutPacket.Raw();
  p.writeShort(originX);
  p.writeShort(originY);
  p.writeShort(originVx);
  p.writeShort(originVy);
  p.writeByte(elements.length);
  for (const e of elements) {
    p.writeByte(e.attr);
    switch (category(e.attr)) {
      case MoveCategory.Normal:
        p.writeShort(e.x);
        p.writeShort(e.y);
        p.writeShort(e.vx);
        p.writeShort(e.vy);
        p.writeShort(e.fh);
        if (e.attr === MovePathAttr.NormalWithFhFall) p.writeShort(e.fhFallStart);
        p.writeShort(e.xOffset);
        p.writeShort(e.yOffset);
        break;
      case MoveCategory.Jump:
        p.writeShort(e.vx);
        p.writeShort(e.vy);
        break;
      case MoveCategory.Teleport:
        p.writeShort(e.x);
        p.writeShort(e.y);
        p.writeShort(e.fh);
        break;
      case MoveCategory.StatChange:
        p.writeByte(e.stat);
        continue;
      case MoveCategory.StartFallDown:
        p.writeShort(e.vx);
        p.writeShort(e.vy);
        p.writeShort(e.fhFallStart);
        break;
      case MoveCategory.FlyingBlock:
        p.writeShort(e.x);
        p.writeShort(e.y);
        p.writeShort(e.vx);
        p.writeShort(e.vy);
        break;
      case MoveCategory.Action:
        break;
    }
    p.writeByte(e.moveAction);
    p.writeShort(e.elapse);
  }
  return p.toArray();
}
