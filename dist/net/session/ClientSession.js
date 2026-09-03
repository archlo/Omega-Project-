import { PacketCipher } from '../crypto/PacketCipher.js';
import { HandshakeReader } from './HandshakeReader.js';
import { InPacket } from '../packet/InPacket.js';
import { Account } from '../../domain/Account.js';
const WS_OPEN = 1;
async function createWebSocket(url) {
    if (typeof globalThis.WebSocket !== 'undefined') {
        const ws = new globalThis.WebSocket(url);
        ws.binaryType = 'arraybuffer';
        return ws;
    }
    const { WebSocket: WsWebSocket } = await import('ws');
    const ws = new WsWebSocket(url);
    ws.binaryType = 'arraybuffer';
    return ws;
}
export class ClientSession {
    _ws = null;
    _sendIv = new Uint8Array(4);
    _recvIv = new Uint8Array(4);
    _handshakeComplete = false;
    _pendingData = new Uint8Array(0);
    _connectResolve = null;
    _connectReject = null;
    /** When set, connectAsync routes through this WS↔TCP proxy as `${proxyBase}/?host=...&port=...` instead of dialing host:port directly (browser can't open raw TCP sockets for channel migration). */
    proxyBase = null;
    machineId = new Uint8Array(16);
    account = new Account();
    worlds = [];
    /** World/channel of the currently-playing character, set once on entering the game. */
    worldId = 0;
    channelId = 0;
    characters = [];
    handshake = null;
    onHandshakeReceived = null;
    onDisconnected = null;
    _packetQueue = [];
    _eventQueue = [];
    _router;
    _session;
    get isConnected() { return this._ws !== null && this._ws.readyState === WS_OPEN; }
    get PacketRouter() { return this._router; }
    RegisterHandler(header, callback) {
        this._router.register(header, (p, _) => callback(p));
    }
    UnregisterHandler(header) {
        this._router.unregister(header);
    }
    constructor(router) {
        this._router = router;
        this._session = this;
    }
    async connectAsync(host, port) {
        return new Promise((resolve, reject) => {
            this._connectResolve = resolve;
            this._connectReject = reject;
            const url = this.proxyBase
                ? `${this.proxyBase}/?host=${encodeURIComponent(host)}&port=${port}`
                : `ws://${host}:${port}`;
            console.log(`Connecting to ${url}`);
            createWebSocket(url).then(ws => {
                ws.addEventListener('open', () => {
                    console.log('WebSocket connected');
                    this._handshakeComplete = false;
                    this.worlds = [];
                    this.characters = [];
                    if (this._connectResolve) {
                        this._connectResolve();
                        this._connectResolve = null;
                    }
                });
                ws.addEventListener('message', (event) => {
                    const buf = new Uint8Array(event.data);
                    this._pendingData = this.concatBuffers(this._pendingData, buf);
                    this.tryConsume();
                });
                ws.addEventListener('close', () => {
                    console.log('WebSocket closed');
                    this._ws = null;
                    this._eventQueue.push(() => this.onDisconnected?.());
                });
                ws.addEventListener('error', (ev) => {
                    const msg = ev.message ?? 'Unknown error';
                    console.error('WebSocket error:', msg);
                    if (this._connectReject) {
                        this._connectReject(new Error(msg));
                        this._connectReject = null;
                    }
                });
                this._ws = ws;
            }).catch(err => {
                console.error('Failed to create WebSocket:', err);
                reject(err);
            });
        });
    }
    disconnectAsync() {
        this._ws?.close();
        this._ws = null;
        this._handshakeComplete = false;
    }
    drainInbound() {
        while (this._eventQueue.length > 0) {
            const evt = this._eventQueue.shift();
            try {
                evt();
            }
            catch (ex) {
                console.error('Drained event threw:', ex);
            }
        }
        while (this._packetQueue.length > 0) {
            const body = this._packetQueue.shift();
            try {
                this._router.dispatch(new InPacket(body), this._session);
            }
            catch (ex) {
                console.error('Packet dispatch threw:', ex);
            }
        }
    }
    send(packet) {
        if (!this._handshakeComplete || !this._ws) {
            console.warn(`Send called before handshake complete (opcode=${packet.header}); dropping`);
            return;
        }
        const body = packet.toArray();
        this.sendRaw(body);
    }
    sendRaw(body) {
        if (!this._ws)
            return;
        const ivSnapshot = new Uint8Array(this._sendIv);
        const headerBytes = new Uint8Array(PacketCipher.HeaderSize);
        PacketCipher.BuildHeader(body.length, ivSnapshot, headerBytes);
        PacketCipher.EncryptBody(body, this._sendIv);
        const frame = new Uint8Array(PacketCipher.HeaderSize + body.length);
        frame.set(headerBytes, 0);
        frame.set(body, PacketCipher.HeaderSize);
        this._ws.send(frame);
    }
    tryConsume() {
        while (this._pendingData.length > 0) {
            if (!this._handshakeComplete) {
                const result = HandshakeReader.TryRead(this._pendingData);
                if (!result)
                    break;
                this._sendIv.set(result.info.sendIv);
                this._recvIv.set(result.info.recvIv);
                this.handshake = result.info;
                this._handshakeComplete = true;
                this._pendingData = this._pendingData.subarray(result.consumed);
                console.log(`Handshake complete: version=${result.info.version} patch=${result.info.patch} locale=${result.info.locale}`);
                this._eventQueue.push(() => this.onHandshakeReceived?.(result.info));
            }
            else {
                const headerOk = this.tryConsumePacket();
                if (!headerOk)
                    break;
            }
        }
    }
    tryConsumePacket() {
        if (this._pendingData.length < PacketCipher.HeaderSize)
            return false;
        const header = this._pendingData.subarray(0, PacketCipher.HeaderSize);
        const ivSnapshot = new Uint8Array(this._recvIv);
        const { valid, payloadLength } = PacketCipher.ParseHeader(header, ivSnapshot);
        if (!valid) {
            console.error(`BAD HDR bytes=${Array.from(header).map(b => b.toString(16).padStart(2, '0')).join(' ')} iv=${Array.from(ivSnapshot).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
            this.disconnectAsync();
            this._pendingData = new Uint8Array(0);
            return true;
        }
        if (this._pendingData.length < PacketCipher.HeaderSize + payloadLength)
            return false;
        const body = new Uint8Array(this._pendingData.subarray(PacketCipher.HeaderSize, PacketCipher.HeaderSize + payloadLength));
        PacketCipher.DecryptBody(body, this._recvIv);
        const opcode = (body[0] & 0xFF) | ((body[1] & 0xFF) << 8);
        console.log(`[S→C] 0x${opcode.toString(16)} len=${payloadLength}`);
        this._packetQueue.push(body);
        this._pendingData = this._pendingData.subarray(PacketCipher.HeaderSize + payloadLength);
        return true;
    }
    concatBuffers(a, b) {
        const result = new Uint8Array(a.length + b.length);
        result.set(a, 0);
        result.set(b, a.length);
        return result;
    }
}
//# sourceMappingURL=ClientSession.js.map