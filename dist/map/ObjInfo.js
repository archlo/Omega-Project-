export class ObjInfo {
    Os = '';
    L0 = '';
    L1 = '';
    L2 = '';
    X = 0;
    Y = 0;
    Z = 0;
    Flip = false;
    static From(entry) {
        const o = {
            Os: entry.Get('oS') ?? '',
            L0: entry.Get('l0') ?? '',
            L1: entry.Get('l1') ?? '',
            L2: entry.Get('l2') ?? '',
            X: ObjInfo._readInt(entry, 'x'),
            Y: ObjInfo._readInt(entry, 'y'),
            Z: ObjInfo._readInt(entry, 'z'),
            Flip: ObjInfo._readInt(entry, 'f') !== 0,
        };
        return o;
    }
    static _readInt(p, key) {
        const v = p.Get(key);
        if (typeof v === 'number')
            return v;
        if (typeof v === 'bigint')
            return Number(v);
        return 0;
    }
}
//# sourceMappingURL=ObjInfo.js.map