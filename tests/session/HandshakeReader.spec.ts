import { describe, it, expect } from 'vitest';
import { HandshakeReader } from '../../src/net/session/HandshakeReader.js';
import { OutPacket } from '../../src/net/packet/OutPacket.js';

describe('HandshakeReader', () => {
  it('reads connect packet from Kinoko', () => {
    const body = OutPacket.Raw();
    body.writeShort(95);
    body.writeString('1');
    body.writeBytes(new Uint8Array([0x46, 0x72, 0x00, 0x52]));
    body.writeBytes(new Uint8Array([0xC8, 0x05, 0x05, 0x53]));
    body.writeByte(8);
    const bodyBytes = body.toArray();

    const wire = OutPacket.Raw();
    wire.writeShort(bodyBytes.length);
    wire.writeBytes(bodyBytes);
    const bytes = wire.toArray();

    const result = HandshakeReader.TryRead(bytes);
    expect(result).not.toBeNull();
    expect(result!.info.version).toBe(95);
    expect(result!.info.patch).toBe('1');
    expect(result!.info.sendIv).toEqual(new Uint8Array([0x46, 0x72, 0x00, 0x52]));
    expect(result!.info.recvIv).toEqual(new Uint8Array([0xC8, 0x05, 0x05, 0x53]));
    expect(result!.info.locale).toBe(8);
  });

  it('not enough bytes returns null', () => {
    const result = HandshakeReader.TryRead(new Uint8Array([0x05]));
    expect(result).toBeNull();
  });

  it('wrong version throws', () => {
    const body = OutPacket.Raw();
    body.writeShort(83);
    body.writeString('1');
    body.writeBytes(new Uint8Array(4));
    body.writeBytes(new Uint8Array(4));
    body.writeByte(8);
    const bodyBytes = body.toArray();

    const wire = OutPacket.Raw();
    wire.writeShort(bodyBytes.length);
    wire.writeBytes(bodyBytes);
    const bytes = wire.toArray();

    expect(() => HandshakeReader.TryRead(bytes)).toThrow();
  });
});
