import { InPacket } from './InPacket.js';
import type { MoveElement } from './MovePathEncoder.js';
export interface DecodedMovePath {
    originX: number;
    originY: number;
    originVx: number;
    originVy: number;
    elements: MoveElement[];
}
export declare function DecodeMovePath(p: InPacket): DecodedMovePath;
//# sourceMappingURL=MovePathDecoder.d.ts.map