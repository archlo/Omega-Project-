import { InPacket } from '../packet/InPacket.js';
import { OutHeader } from '../packet/OpCodes.js';
import { ClientSession } from './ClientSession.js';

export type PacketHandler = (packet: InPacket, session: ClientSession) => void;

export class PacketRouter {
  private _handlers = new Map<number, PacketHandler>();

  register(header: OutHeader, handler: PacketHandler): void;
  register(opcode: number, handler: PacketHandler): void;
  register(opcode: number | OutHeader, handler: PacketHandler): void {
    this._handlers.set(opcode as number, handler);
  }

  unregister(header: OutHeader): void {
    this._handlers.delete(header as number);
  }

  dispatch(packet: InPacket, session: ClientSession): void {
    const op = packet.readShort();
    const handler = this._handlers.get(op);
    if (!handler) {
      return;
    }
    try { handler(packet, session); }
    catch (ex) { console.error(`Handler for opcode ${op} threw:`, ex); }
  }
}
