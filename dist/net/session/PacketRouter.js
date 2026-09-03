export class PacketRouter {
    _handlers = new Map();
    register(opcode, handler) {
        this._handlers.set(opcode, handler);
    }
    unregister(header) {
        this._handlers.delete(header);
    }
    dispatch(packet, session) {
        const op = packet.readShort();
        const handler = this._handlers.get(op);
        if (!handler) {
            // Log unregistered opcodes to diagnose missing handlers
            if (op >= 284 && op <= 309)
                console.warn(`[PacketRouter] UNREGISTERED mob opcode ${op}`);
            else if (op >= 322 && op <= 324)
                console.warn(`[PacketRouter] UNREGISTERED drop opcode ${op}`);
            return;
        }
        try {
            handler(packet, session);
        }
        catch (ex) {
            console.error(`Handler for opcode ${op} threw:`, ex);
        }
    }
}
//# sourceMappingURL=PacketRouter.js.map