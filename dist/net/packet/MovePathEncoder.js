import { OutPacket } from './OutPacket.js';
var MoveCategory;
(function (MoveCategory) {
    MoveCategory[MoveCategory["Normal"] = 0] = "Normal";
    MoveCategory[MoveCategory["Jump"] = 1] = "Jump";
    MoveCategory[MoveCategory["Teleport"] = 2] = "Teleport";
    MoveCategory[MoveCategory["StatChange"] = 3] = "StatChange";
    MoveCategory[MoveCategory["StartFallDown"] = 4] = "StartFallDown";
    MoveCategory[MoveCategory["FlyingBlock"] = 5] = "FlyingBlock";
    MoveCategory[MoveCategory["Action"] = 6] = "Action";
})(MoveCategory || (MoveCategory = {}));
function category(attr) {
    switch (attr) {
        case 0 /* MovePathAttr.Normal */:
        case 5 /* MovePathAttr.Normal2 */:
        case 12 /* MovePathAttr.NormalWithFhFall */:
        case 14 /* MovePathAttr.Normal4 */:
        case 35 /* MovePathAttr.Normal5 */:
        case 36 /* MovePathAttr.Normal6 */:
            return MoveCategory.Normal;
        case 1 /* MovePathAttr.Jump */:
        case 2 /* MovePathAttr.JumpAlert */:
        case 13 /* MovePathAttr.Jump2 */:
        case 16 /* MovePathAttr.Jump3 */:
        case 18 /* MovePathAttr.Jump4 */:
        case 31 /* MovePathAttr.Jump5 */:
        case 32 /* MovePathAttr.Jump6 */:
        case 33 /* MovePathAttr.Jump7 */:
        case 34 /* MovePathAttr.Jump8 */:
            return MoveCategory.Jump;
        case 3 /* MovePathAttr.Teleport */:
        case 4 /* MovePathAttr.TeleportAlert */:
        case 7 /* MovePathAttr.Teleport2 */:
        case 8 /* MovePathAttr.TeleportAlert2 */:
        case 10 /* MovePathAttr.Normal3 */:
        case 6 /* MovePathAttr.NormalAlert */:
            return MoveCategory.Teleport;
        case 9 /* MovePathAttr.StatChange */:
            return MoveCategory.StatChange;
        case 11 /* MovePathAttr.StartFallDown */:
            return MoveCategory.StartFallDown;
        case 17 /* MovePathAttr.FlyingBlock */:
            return MoveCategory.FlyingBlock;
        default:
            return MoveCategory.Action;
    }
}
export function EncodeMovePath(originX, originY, originVx, originVy, elements) {
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
                if (e.attr === 12 /* MovePathAttr.NormalWithFhFall */)
                    p.writeShort(e.fhFallStart);
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
//# sourceMappingURL=MovePathEncoder.js.map