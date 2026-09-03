import { BackType } from './BackType.js';
import type { WzProperty } from '../wz/WzProperty.js';
export declare class BackInfo {
    Bs: string;
    No: number;
    X: number;
    Y: number;
    Rx: number;
    Ry: number;
    Cx: number;
    Cy: number;
    Type: BackType;
    Front: boolean;
    Animated: boolean;
    Alpha: number;
    Flip: boolean;
    static From(entry: WzProperty): BackInfo;
    private static _readInt;
}
//# sourceMappingURL=BackInfo.d.ts.map