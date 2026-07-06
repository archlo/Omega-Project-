import { InPacket } from './InPacket.js';
import { MovePathAttr } from '../protocol/Enums.js';
import type { MoveElement } from './MovePathEncoder.js';

export interface DecodedMovePath {
  originX: number;
  originY: number;
  originVx: number;
  originVy: number;
  elements: MoveElement[];
}

// Mirrors CMovePath::Decode (live IDA decompile, Maplestory95.exe.i64
// 0x667920) for the bPassive=0 case — i.e. CUserRemote::OnMove's path
// (0x948a80), which is what every other player's UserMove broadcast
// (OutHeader.UserMove=210) actually carries. The bPassive=1 tail (keypad
// state + move-bounds rect) only applies to the local player's own
// server-side echo/validation, not remote broadcasts, and isn't decoded
// here. Per-attr field groupings independently confirmed byte-for-byte
// against MovePathEncoder.ts's existing `category()` table — they match
// exactly, including which attrs carry over x/y/vx/vy from the previous
// element instead of reading new values (StatChange, and the "Action"
// attrs 20-30 used for non-moving actions like attack/skill while standing).
//
// One conditional NOT implemented: OG also reads two extra shorts
// (usRandCnt/usActualRandCnt) per element when `CClientOptMan::GetOpt(2)`
// is set. That option defaults to unset (CClientOptMan::GetOpt returns 0
// for any key never explicitly set via DecodeOpt) and is a RandCnt-style
// anti-cheat field that doesn't exist in v95-era GMS — assumed off.
export function DecodeMovePath(p: InPacket): DecodedMovePath {
  const originX = p.readShort();
  const originY = p.readShort();
  const originVx = p.readShort();
  const originVy = p.readShort();
  const count = p.readByte();

  const elements: MoveElement[] = [];
  let x = originX, y = originY, vx = originVx, vy = originVy;

  for (let i = 0; i < count; i++) {
    const attr = p.readByte();
    const e: MoveElement = { attr, x, y, vx, vy, fh: 0, fhFallStart: 0, xOffset: 0, yOffset: 0, stat: 0, moveAction: 0, elapse: 0 };

    switch (attr) {
      case MovePathAttr.Normal:
      case MovePathAttr.Normal2:
      case MovePathAttr.NormalWithFhFall:
      case MovePathAttr.Normal4:
      case MovePathAttr.Normal5:
      case MovePathAttr.Normal6:
        e.x = p.readShort();
        e.y = p.readShort();
        e.vx = p.readShort();
        e.vy = p.readShort();
        e.fh = p.readShort();
        if (attr === MovePathAttr.NormalWithFhFall) e.fhFallStart = p.readShort();
        e.xOffset = p.readShort();
        e.yOffset = p.readShort();
        break;
      case MovePathAttr.Jump:
      case MovePathAttr.JumpAlert:
      case MovePathAttr.Jump2:
      case MovePathAttr.Jump3:
      case MovePathAttr.Jump4:
      case MovePathAttr.Jump5:
      case MovePathAttr.Jump6:
      case MovePathAttr.Jump7:
      case MovePathAttr.Jump8:
        e.fh = 0;
        e.vx = p.readShort();
        e.vy = p.readShort();
        break;
      case MovePathAttr.Teleport:
      case MovePathAttr.TeleportAlert:
      case MovePathAttr.Teleport2:
      case MovePathAttr.TeleportAlert2:
      case MovePathAttr.Normal3:
      case MovePathAttr.NormalAlert:
        e.x = p.readShort();
        e.y = p.readShort();
        e.fh = p.readShort();
        e.vx = 0;
        e.vy = 0;
        break;
      case MovePathAttr.StatChange:
        e.stat = p.readByte();
        e.vy = 0;
        e.vx = 0;
        e.fh = 0;
        e.moveAction = 0;
        e.elapse = 0;
        elements.push(e);
        x = e.x; y = e.y; vx = e.vx; vy = e.vy;
        continue; // no common moveAction/elapse tail for this attr (OG `goto LABEL_10`)
      case MovePathAttr.StartFallDown:
        e.fh = 0;
        e.vx = p.readShort();
        e.vy = p.readShort();
        e.fhFallStart = p.readShort();
        break;
      case MovePathAttr.FlyingBlock:
        e.x = p.readShort();
        e.y = p.readShort();
        e.vx = p.readShort();
        e.vy = p.readShort();
        break;
      default:
        // "Action" attrs (attack/skill/emote while not physically moving) —
        // x/y/vx/vy all carried over from the previous element, nothing read.
        break;
    }

    e.moveAction = p.readByte();
    e.elapse = p.readShort();
    elements.push(e);
    x = e.x; y = e.y; vx = e.vx; vy = e.vy;
  }

  return { originX, originY, originVx, originVy, elements };
}
