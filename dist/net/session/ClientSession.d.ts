import { HandshakeInfo } from './HandshakeReader.js';
import { PacketRouter } from './PacketRouter.js';
import { OutPacket } from '../packet/OutPacket.js';
import { InPacket } from '../packet/InPacket.js';
import { OutHeader } from '../packet/OpCodes.js';
import { Account } from '../../domain/Account.js';
import { WorldInfo } from '../../domain/WorldInfo.js';
import { CharacterEntry } from '../../domain/CharacterEntry.js';
export declare class ClientSession {
    private _ws;
    private _sendIv;
    private _recvIv;
    private _handshakeComplete;
    private _pendingData;
    private _connectResolve;
    private _connectReject;
    /** When set, connectAsync routes through this WS↔TCP proxy as `${proxyBase}/?host=...&port=...` instead of dialing host:port directly (browser can't open raw TCP sockets for channel migration). */
    proxyBase: string | null;
    machineId: Uint8Array;
    account: Account;
    worlds: WorldInfo[];
    /** World/channel of the currently-playing character, set once on entering the game. */
    worldId: number;
    channelId: number;
    characters: CharacterEntry[];
    handshake: HandshakeInfo | null;
    onHandshakeReceived: ((info: HandshakeInfo) => void) | null;
    onDisconnected: ((err?: Error) => void) | null;
    private _packetQueue;
    private _eventQueue;
    private _router;
    private _session;
    get isConnected(): boolean;
    get PacketRouter(): PacketRouter;
    RegisterHandler(header: OutHeader, callback: (p: InPacket) => void): void;
    UnregisterHandler(header: OutHeader): void;
    constructor(router: PacketRouter);
    connectAsync(host: string, port: number): Promise<void>;
    disconnectAsync(): void;
    drainInbound(): void;
    send(packet: OutPacket): void;
    sendRaw(body: Uint8Array): void;
    private tryConsume;
    private tryConsumePacket;
    private concatBuffers;
}
//# sourceMappingURL=ClientSession.d.ts.map