import type { WzProperty } from '../wz/WzProperty.js';
export declare class ObjInfo {
    Os: string;
    L0: string;
    L1: string;
    L2: string;
    X: number;
    Y: number;
    Z: number;
    Flip: boolean;
    static From(entry: WzProperty): ObjInfo;
    private static _readInt;
}
//# sourceMappingURL=ObjInfo.d.ts.map