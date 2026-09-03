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
export function DecodeMovePath(p) {
    const originX = p.readShort();
    const originY = p.readShort();
    const originVx = p.readShort();
    const originVy = p.readShort();
    const count = p.readByte();
    const elements = [];
    let x = originX, y = originY, vx = originVx, vy = originVy;
    for (let i = 0; i < count; i++) {
        const attr = p.readByte();
        const e = { attr, x, y, vx, vy, fh: 0, fhFallStart: 0, xOffset: 0, yOffset: 0, stat: 0, moveAction: 0, elapse: 0 };
        switch (attr) {
            case 0 /* MovePathAttr.Normal */:
            case 5 /* MovePathAttr.Normal2 */:
            case 12 /* MovePathAttr.NormalWithFhFall */:
            case 14 /* MovePathAttr.Normal4 */:
            case 35 /* MovePathAttr.Normal5 */:
            case 36 /* MovePathAttr.Normal6 */:
                e.x = p.readShort();
                e.y = p.readShort();
                e.vx = p.readShort();
                e.vy = p.readShort();
                e.fh = p.readShort();
                if (attr === 12 /* MovePathAttr.NormalWithFhFall */)
                    e.fhFallStart = p.readShort();
                e.xOffset = p.readShort();
                e.yOffset = p.readShort();
                break;
            case 1 /* MovePathAttr.Jump */:
            case 2 /* MovePathAttr.JumpAlert */:
            case 13 /* MovePathAttr.Jump2 */:
            case 16 /* MovePathAttr.Jump3 */:
            case 18 /* MovePathAttr.Jump4 */:
            case 31 /* MovePathAttr.Jump5 */:
            case 32 /* MovePathAttr.Jump6 */:
            case 33 /* MovePathAttr.Jump7 */:
            case 34 /* MovePathAttr.Jump8 */:
                e.fh = 0;
                e.vx = p.readShort();
                e.vy = p.readShort();
                break;
            case 3 /* MovePathAttr.Teleport */:
            case 4 /* MovePathAttr.TeleportAlert */:
            case 7 /* MovePathAttr.Teleport2 */:
            case 8 /* MovePathAttr.TeleportAlert2 */:
            case 10 /* MovePathAttr.Normal3 */:
            case 6 /* MovePathAttr.NormalAlert */:
                e.x = p.readShort();
                e.y = p.readShort();
                e.fh = p.readShort();
                e.vx = 0;
                e.vy = 0;
                break;
            case 9 /* MovePathAttr.StatChange */:
                e.stat = p.readByte();
                e.vy = 0;
                e.vx = 0;
                e.fh = 0;
                e.moveAction = 0;
                e.elapse = 0;
                elements.push(e);
                x = e.x;
                y = e.y;
                vx = e.vx;
                vy = e.vy;
                continue; // no common moveAction/elapse tail for this attr (OG `goto LABEL_10`)
            case 11 /* MovePathAttr.StartFallDown */:
                e.fh = 0;
                e.vx = p.readShort();
                e.vy = p.readShort();
                e.fhFallStart = p.readShort();
                break;
            case 17 /* MovePathAttr.FlyingBlock */:
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
        x = e.x;
        y = e.y;
        vx = e.vx;
        vy = e.vy;
    }
    return { originX, originY, originVx, originVy, elements };
}
//# sourceMappingURL=MovePathDecoder.js.map