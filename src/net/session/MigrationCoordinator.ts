import { ClientSession } from './ClientSession.js';
import { HandshakeInfo } from './HandshakeReader.js';
import { OutPacket } from '../packet/OutPacket.js';
import { InHeader } from '../packet/OpCodes.js';

export class MigrationCoordinator {
  private _session: ClientSession;
  private _pending: MigrationTarget | null = null;
  onPhase2BoundaryReached: (() => void) | null = null;

  get migrationActive(): boolean { return this._pending !== null; }

  constructor(session: ClientSession) {
    this._session = session;
  }

  async beginMigrateAsync(channelHost: Uint8Array, channelPort: number, characterId: number): Promise<void> {
    if (channelHost.length !== 4) throw new Error('channelHost must be 4 bytes');
    const ip = `${channelHost[0]}.${channelHost[1]}.${channelHost[2]}.${channelHost[3]}`;
    this._pending = {
      host: ip,
      port: channelPort,
      characterId,
      clientKey: new Uint8Array(this._session.account.clientKey),
      machineId: new Uint8Array(this._session.machineId),
    };
    this._session.onHandshakeReceived = this.onChannelHandshake.bind(this);
    this._session.onDisconnected = this.onLoginDisconnect.bind(this);
    console.log(`BeginMigrate → ${ip}:${channelPort} charId=${characterId}`);
    await this._session.disconnectAsync();
    if (!this._session.isConnected) this.onLoginDisconnect();
  }

  private onLoginDisconnect(err?: Error): void {
    if (!this._pending) return;
    this._session.onDisconnected = null;
    const target = this._pending;
    setTimeout(async () => {
      try {
        console.log(`Reconnecting to channel ${target.host}:${target.port}`);
        await this._session.connectAsync(target.host, target.port);
      } catch (ex) {
        console.error('Failed to reconnect to channel server:', ex);
        this._pending = null;
      }
    }, 100);
  }

  private onChannelHandshake(info: HandshakeInfo): void {
    if (!this._pending) return;
    this._session.onHandshakeReceived = null;
    const target = this._pending;
    const p = OutPacket.Of(InHeader.MigrateIn);
    p.writeInt(target.characterId);
    p.writeBytes(target.machineId);
    p.writeByte(0); // false
    p.writeByte(0);
    p.writeBytes(target.clientKey);
    this._session.sendRaw(p.toArray());
    console.log('MigrateIn(20) sent — waiting for channel SetField');
    this.onPhase2BoundaryReached?.();
    this._pending = null;
  }
}

interface MigrationTarget {
  host: string;
  port: number;
  characterId: number;
  clientKey: Uint8Array;
  machineId: Uint8Array;
}
