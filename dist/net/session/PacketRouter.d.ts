import { InPacket } from '../packet/InPacket.js';
import { OutHeader } from '../packet/OpCodes.js';
import { ClientSession } from './ClientSession.js';
export type PacketHandler = (packet: InPacket, session: ClientSession) => void;
export declare class PacketRouter {
    private _handlers;
    register(header: OutHeader, handler: PacketHandler): void;
    register(opcode: number, handler: PacketHandler): void;
    unregister(header: OutHeader): void;
    dispatch(packet: InPacket, session: ClientSession): void;
}
//# sourceMappingURL=PacketRouter.d.ts.map