import { PacketCipher } from '../crypto/PacketCipher.js';
import { HandshakeReader, HandshakeInfo } from './HandshakeReader.js';
import { PacketRouter } from './PacketRouter.js';
import { OutPacket } from '../packet/OutPacket.js';
import { InPacket } from '../packet/InPacket.js';
import { OutHeader } from '../packet/OpCodes.js';
import { Account } from '../../domain/Account.js';
import { WorldInfo } from '../../domain/WorldInfo.js';
import { CharacterEntry } from '../../domain/CharacterEntry.js';

const WS_OPEN = 1;

async function createWebSocket(url: string): Promise<WebSocket> {
  if (typeof globalThis.WebSocket !== 'undefined') {
    const ws = new globalThis.WebSocket(url);
    ws.binaryType = 'arraybuffer';
    return ws;
  }
  const { WebSocket: WsWebSocket } = await import('ws');
  const ws = new WsWebSocket(url) as unknown as WebSocket;
  ws.binaryType = 'arraybuffer';
  return ws;
}

export class ClientSession {
  private _ws: WebSocket | null = null;
  private _sendIv: Uint8Array = new Uint8Array(4);
  private _recvIv: Uint8Array = new Uint8Array(4);
  private _handshakeComplete = false;
  private _pendingData: Uint8Array = new Uint8Array(0);
  private _connectResolve: (() => void) | null = null;
  private _connectReject: ((err: Error) => void) | null = null;

  /** When set, connectAsync routes through this WS↔TCP proxy as `${proxyBase}/?host=...&port=...` instead of dialing host:port directly (browser can't open raw TCP sockets for channel migration). */
  proxyBase: string | null = null;

  machineId: Uint8Array = new Uint8Array(16);
  account = new Account();
  worlds: WorldInfo[] = [];
  /** World/channel of the currently-playing character, set once on entering the game. */
  worldId = 0;
  channelId = 0;
  characters: CharacterEntry[] = [];
  handshake: HandshakeInfo | null = null;

  onHandshakeReceived: ((info: HandshakeInfo) => void) | null = null;
  onDisconnected: ((err?: Error) => void) | null = null;

  private _packetQueue: Uint8Array[] = [];
  private _eventQueue: (() => void)[] = [];
  private _router: PacketRouter;
  private _session: this;

  get isConnected(): boolean { return this._ws !== null && this._ws.readyState === WS_OPEN; }
  get PacketRouter(): PacketRouter { return this._router; }

  RegisterHandler(header: OutHeader, callback: (p: InPacket) => void): void {
    this._router.register(header, (p, _) => callback(p));
  }

  UnregisterHandler(header: OutHeader): void {
    this._router.unregister(header);
  }

  constructor(router: PacketRouter) {
    this._router = router;
    this._session = this;
  }

  async connectAsync(host: string, port: number): Promise<void> {
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
        ws.addEventListener('message', (event: MessageEvent) => {
          const buf = new Uint8Array(event.data as ArrayBuffer);
          this._pendingData = this.concatBuffers(this._pendingData, buf);
          this.tryConsume();
        });
        ws.addEventListener('close', () => {
          console.log('WebSocket closed');
          this._ws = null;
          this._eventQueue.push(() => this.onDisconnected?.());
        });
        ws.addEventListener('error', (ev: Event) => {
          const msg = (ev as any).message ?? 'Unknown error';
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

  disconnectAsync(): void {
    this._ws?.close();
    this._ws = null;
    this._handshakeComplete = false;
  }

  drainInbound(): void {
    while (this._eventQueue.length > 0) {
      const evt = this._eventQueue.shift()!;
      try { evt(); } catch (ex) { console.error('Drained event threw:', ex); }
    }
    while (this._packetQueue.length > 0) {
      const body = this._packetQueue.shift()!;
      try { this._router.dispatch(new InPacket(body), this._session); }
      catch (ex) { console.error('Packet dispatch threw:', ex); }
    }
  }

  send(packet: OutPacket): void {
    if (!this._handshakeComplete || !this._ws) {
      console.warn(`Send called before handshake complete (opcode=${packet.header}); dropping`);
      return;
    }
    const body = packet.toArray();
    this.sendRaw(body);
  }

  sendRaw(body: Uint8Array): void {
    if (!this._ws) return;
    const ivSnapshot = new Uint8Array(this._sendIv);
    const headerBytes = new Uint8Array(PacketCipher.HeaderSize);
    PacketCipher.BuildHeader(body.length, ivSnapshot, headerBytes);
    PacketCipher.EncryptBody(body, this._sendIv);
    const frame = new Uint8Array(PacketCipher.HeaderSize + body.length);
    frame.set(headerBytes, 0);
    frame.set(body, PacketCipher.HeaderSize);
    this._ws.send(frame);
  }

  private tryConsume(): void {
    while (this._pendingData.length > 0) {
      if (!this._handshakeComplete) {
        const result = HandshakeReader.TryRead(this._pendingData);
        if (!result) break;
        this._sendIv.set(result.info.sendIv);
        this._recvIv.set(result.info.recvIv);
        this.handshake = result.info;
        this._handshakeComplete = true;
        this._pendingData = this._pendingData.subarray(result.consumed);
        console.log(`Handshake complete: version=${result.info.version} patch=${result.info.patch} locale=${result.info.locale}`);
        this._eventQueue.push(() => this.onHandshakeReceived?.(result.info));
      } else {
        const headerOk = this.tryConsumePacket();
        if (!headerOk) break;
      }
    }
  }

  private tryConsumePacket(): boolean {
    if (this._pendingData.length < PacketCipher.HeaderSize) return false;
    const header = this._pendingData.subarray(0, PacketCipher.HeaderSize);
    const ivSnapshot = new Uint8Array(this._recvIv);
    const { valid, payloadLength } = PacketCipher.ParseHeader(header, ivSnapshot);
    if (!valid) {
      console.error('Bad packet header — closing connection');
      this.disconnectAsync();
      this._pendingData = new Uint8Array(0);
      return true;
    }
    if (this._pendingData.length < PacketCipher.HeaderSize + payloadLength) return false;
    const body = new Uint8Array(this._pendingData.subarray(PacketCipher.HeaderSize, PacketCipher.HeaderSize + payloadLength));
    PacketCipher.DecryptBody(body, this._recvIv);
    this._packetQueue.push(body);
    this._pendingData = this._pendingData.subarray(PacketCipher.HeaderSize + payloadLength);
    return true;
  }

  private concatBuffers(a: Uint8Array, b: Uint8Array): Uint8Array {
    const result = new Uint8Array(a.length + b.length);
    result.set(a, 0);
    result.set(b, a.length);
    return result;
  }
}
