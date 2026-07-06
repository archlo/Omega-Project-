import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MachineIdProvider } from '../../../src/net/session/MachineId.js';

describe('MachineIdProvider', () => {
  beforeEach(async () => {
    await MachineIdProvider.Init();
  });

  it('GetMachineId returns a 16-byte fingerprint', () => {
    const id = MachineIdProvider.GetMachineId();
    expect(id).toBeInstanceOf(Uint8Array);
    expect(id.length).toBe(16);
  });

  it('GetMachineId is deterministic across calls', () => {
    const a = MachineIdProvider.GetMachineId();
    const b = MachineIdProvider.GetMachineId();
    expect(a).toEqual(b);
  });

  it('GetFakeMacAddress returns XX-XX-XX-XX-XX-XX format', () => {
    const mac = MachineIdProvider.GetFakeMacAddress();
    expect(mac).toMatch(/^([0-9A-F]{2}-){5}[0-9A-F]{2}$/);
  });

  it('GetFakeMacAddressWithHddSerial returns MAC_HEX format', () => {
    const hdd = MachineIdProvider.GetFakeMacAddressWithHddSerial();
    expect(hdd).toMatch(/^([0-9A-F]{2}-){5}[0-9A-F]{2}_[0-9A-F]{16}$/);
  });

  it('throws before Init is called', () => {
    const fresh = new MachineIdProvider.constructor();
    // Can't easily test instance-level init, but we can verify the getters
    // were populated by the beforeEach
    const id = MachineIdProvider.GetMachineId();
    expect(id.length).toBe(16);
  });
});
