import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MigrationCoordinator } from '../../../src/net/session/MigrationCoordinator.js';

function makeSession(): any {
  const session: any = {
    account: { clientKey: new Uint8Array(8).fill(0xAB) },
    machineId: new Uint8Array(16).fill(0xCD),
    worlds: [{ worldId: 0, name: 'Scania', channels: [{ channelId: 0, userCount: 200 }] }],
    onHandshakeReceived: null,
    onDisconnected: null,
    disconnectAsync: vi.fn(() => { session.isConnected = false; }),
    connectAsync: vi.fn().mockResolvedValue(undefined),
    sendRaw: vi.fn(),
    isConnected: true,
    handshake: null,
  };
  return session;
}

describe('MigrationCoordinator', () => {
  let session: any;
  let coordinator: MigrationCoordinator;

  beforeEach(() => {
    vi.useFakeTimers();
    session = makeSession();
    coordinator = new MigrationCoordinator(session);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('beginMigrateAsync throws for invalid host length', async () => {
    await expect(coordinator.beginMigrateAsync(
      new Uint8Array(3), 8585, 42
    )).rejects.toThrow('channelHost must be 4 bytes');
    expect(session.disconnectAsync).not.toHaveBeenCalled();
  });

  it('beginMigrateAsync hooks handshake and disconnects from login', async () => {
    await coordinator.beginMigrateAsync(
      new Uint8Array([10, 0, 0, 127]), 8585, 42
    );
    expect(session.disconnectAsync).toHaveBeenCalledOnce();
    expect(typeof session.onHandshakeReceived).toBe('function');
    expect(session.onDisconnected).toBeNull();
    expect(coordinator.migrationActive).toBe(true);
  });

  it('onLoginDisconnect reconnects to channel server after timeout', async () => {
    await coordinator.beginMigrateAsync(
      new Uint8Array([10, 0, 0, 127]), 8585, 42
    );
    expect(session.connectAsync).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(session.connectAsync).toHaveBeenCalledOnce();
    expect(session.connectAsync).toHaveBeenCalledWith('10.0.0.127', 8585);
  });

  it('onChannelHandshake sends MigrateIn and fires phase2 boundary', async () => {
    const boundaryFn = vi.fn();
    coordinator.onPhase2BoundaryReached = boundaryFn;

    await coordinator.beginMigrateAsync(
      new Uint8Array([10, 0, 0, 127]), 8585, 42
    );
    await vi.advanceTimersByTimeAsync(100);
    session.onHandshakeReceived({
      version: 95, patch: '1', locale: 8,
      sendIv: new Uint8Array(4), recvIv: new Uint8Array(4),
    });

    expect(session.sendRaw).toHaveBeenCalledOnce();
    const sent = session.sendRaw.mock.calls[0][0] as Uint8Array;
    expect(sent[0]).toBe(0x14); // opcode 20 LE
    expect(sent[1]).toBe(0x00);
    const charId = new DataView(sent.buffer, sent.byteOffset + 2, 4).getInt32(0, true);
    expect(charId).toBe(42);
    expect(boundaryFn).toHaveBeenCalledOnce();
    expect(coordinator.migrationActive).toBe(false);
  });

  it('preserves the login world list across the channel-server migration (ChannelSelect needs it)', async () => {
    const worldsBefore = session.worlds;
    await coordinator.beginMigrateAsync(
      new Uint8Array([10, 0, 0, 127]), 8585, 42
    );
    // Real ClientSession.connectAsync() wipes session.worlds when the channel
    // socket opens — simulate that before the channel handshake arrives.
    session.worlds = [];
    expect(session.worlds.length).toBe(0);
    await vi.advanceTimersByTimeAsync(100);
    session.onHandshakeReceived({
      version: 95, patch: '1', locale: 8,
      sendIv: new Uint8Array(4), recvIv: new Uint8Array(4),
    });
    // World list restored → in-game channel panel can render its cells.
    expect(session.worlds).toBe(worldsBefore);
    expect(session.worlds).toHaveLength(1);
    expect(session.worlds[0].channels[0].channelId).toBe(0);
  });
});
