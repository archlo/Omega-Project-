import { describe, it, expect, beforeAll } from 'vitest';
import { InHeader } from '../../../src/net/packet/OpCodes.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import { LoginSender } from '../../../src/net/senders/LoginSender.js';
import { MachineIdProvider } from '../../../src/net/session/MachineId.js';

describe('LoginSender', () => {
  beforeAll(async () => {
    await MachineIdProvider.Init();
  });

  it('DeleteCharacter opcode is 24', () => {
    expect(InHeader.DeleteCharacter).toBe(24);
  });

  it('DeleteCharacter encodes spw then charId', () => {
    const p = new InPacket(LoginSender.DeleteCharacter(101, 'hunter2').toArray());
    expect(p.readShort()).toBe(InHeader.DeleteCharacter);
    expect(p.readString()).toBe('hunter2');
    expect(p.readInt()).toBe(101);
    expect(p.remaining).toBe(0);
  });

  it('DeleteCharacter empty spw still encodes charId', () => {
    const p = new InPacket(LoginSender.DeleteCharacter(7, '').toArray());
    expect(p.readShort()).toBe(InHeader.DeleteCharacter);
    expect(p.readString()).toBe('');
    expect(p.readInt()).toBe(7);
    expect(p.remaining).toBe(0);
  });

  it('CheckUserLimit encodes worldId as a short', () => {
    const p = new InPacket(LoginSender.CheckUserLimit(3).toArray());
    expect(p.readShort()).toBe(InHeader.CheckUserLimit);
    expect(p.readShort()).toBe(3);
    expect(p.remaining).toBe(0);
  });

  it('WorldRequest encodes only the OG opcode 11 header', () => {
    const p = new InPacket(LoginSender.WorldRequest().toArray());
    expect(p.readShort()).toBe(InHeader.WorldRequest);
    expect(p.remaining).toBe(0);
  });

  it('CheckPinCode encodes submit-mode byte, trailing zero byte, then pin', () => {
    const p = new InPacket(LoginSender.CheckPinCode('1234').toArray());
    expect(p.readShort()).toBe(InHeader.CheckPinCode);
    expect(p.readByte()).toBe(1);
    expect(p.readByte()).toBe(0);
    expect(p.readString()).toBe('1234');
    expect(p.remaining).toBe(0);
  });

  it('CheckPinCodeBootstrap encodes the OG auto-request shape', () => {
    const p = new InPacket(LoginSender.CheckPinCodeBootstrap().toArray());
    expect(p.readShort()).toBe(InHeader.CheckPinCode);
    expect(p.readByte()).toBe(1);
    expect(p.readByte()).toBe(1);
    expect(p.readString()).toBe('');
    expect(p.remaining).toBe(0);
  });

  it('SetGender encodes the constant subtype byte then gender', () => {
    const p = new InPacket(LoginSender.SetGender(1).toArray());
    expect(p.readShort()).toBe(InHeader.SetGender);
    expect(p.readByte()).toBe(1);
    expect(p.readByte()).toBe(1);
    expect(p.remaining).toBe(0);
  });

  it('CancelGender encodes the OG SetGender cancel subtype', () => {
    const p = new InPacket(LoginSender.CancelGender().toArray());
    expect(p.readShort()).toBe(InHeader.SetGender);
    expect(p.readByte()).toBe(0);
    expect(p.remaining).toBe(0);
  });

  it('ConfirmEULA encodes the accepted byte exactly', () => {
    const accepted = new InPacket(LoginSender.ConfirmEULA(true).toArray());
    expect(accepted.readShort()).toBe(InHeader.ConfirmEULA);
    expect(accepted.readByte()).toBe(1);
    expect(accepted.remaining).toBe(0);

    const denied = new InPacket(LoginSender.ConfirmEULA(false).toArray());
    expect(denied.readShort()).toBe(InHeader.ConfirmEULA);
    expect(denied.readByte()).toBe(0);
    expect(denied.remaining).toBe(0);
  });

  it('ViewAllChar with gameStartMode!==1 writes only the mode byte', () => {
    const p = new InPacket(LoginSender.ViewAllChar(0).toArray());
    expect(p.readShort()).toBe(InHeader.ViewAllChar);
    expect(p.readByte()).toBe(0);
    expect(p.remaining).toBe(0);
  });

  it('ViewAllChar with gameStartMode===1 writes passport/machineId/gameRoomClient/mode', () => {
    const machineId = new Uint8Array(16).fill(7);
    const p = new InPacket(LoginSender.ViewAllChar(1, 'passport123', machineId, 555).toArray());
    expect(p.readShort()).toBe(InHeader.ViewAllChar);
    expect(p.readByte()).toBe(1);
    expect(p.readString()).toBe('passport123');
    expect(Array.from(p.readBytes(16))).toEqual(Array.from(machineId));
    expect(p.readInt()).toBe(555);
    expect(p.readByte()).toBe(1);
    expect(p.remaining).toBe(0);
  });

  it('VACFlagSet encodes the OG one-byte enabled flag', () => {
    const enabled = new InPacket(LoginSender.VACFlagSet(true).toArray());
    expect(enabled.readShort()).toBe(InHeader.VACFlagSet);
    expect(enabled.readByte()).toBe(1);
    expect(enabled.remaining).toBe(0);

    const disabled = new InPacket(LoginSender.VACFlagSet(false).toArray());
    expect(disabled.readShort()).toBe(InHeader.VACFlagSet);
    expect(disabled.readByte()).toBe(0);
    expect(disabled.remaining).toBe(0);
  });

  it('SSOErrorLog encodes subtype 1 and the auth code', () => {
    const p = new InPacket(LoginSender.SSOErrorLog(0x12345678).toArray());
    expect(p.readShort()).toBe(InHeader.SSOErrorLog);
    expect(p.readByte()).toBe(1);
    expect(p.readInt()).toBe(0x12345678);
    expect(p.remaining).toBe(0);
  });

  it('SelectCharacterByVAC encodes characterId + worldId + mac addresses', () => {
    const p = new InPacket(LoginSender.SelectCharacterByVAC(42, 1).toArray());
    expect(p.readShort()).toBe(InHeader.SelectCharacterByVAC);
    expect(p.readInt()).toBe(42);
    expect(p.readInt()).toBe(1);
    expect(p.readString()).toBe(MachineIdProvider.GetFakeMacAddress());
    expect(p.readString()).toBe(MachineIdProvider.GetFakeMacAddressWithHddSerial());
    expect(p.remaining).toBe(0);
  });

  it('EnableSPWRequestByVAC encodes flag + characterId + worldId + mac addresses + spw', () => {
    const p = new InPacket(LoginSender.EnableSPWRequestByVAC(42, 1, '1234').toArray());
    expect(p.readShort()).toBe(InHeader.EnableSPWRequestByVAC);
    expect(p.readByte()).toBe(1);
    expect(p.readInt()).toBe(42);
    expect(p.readInt()).toBe(1);
    expect(p.readString()).toBe(MachineIdProvider.GetFakeMacAddress());
    expect(p.readString()).toBe(MachineIdProvider.GetFakeMacAddressWithHddSerial());
    expect(p.readString()).toBe('1234');
    expect(p.remaining).toBe(0);
  });

  it('CheckSPWRequestByVAC encodes spw + characterId + worldId + mac addresses', () => {
    const p = new InPacket(LoginSender.CheckSPWRequestByVAC(42, 1, '1234').toArray());
    expect(p.readShort()).toBe(InHeader.CheckSPWRequestByVAC);
    expect(p.readString()).toBe('1234');
    expect(p.readInt()).toBe(42);
    expect(p.readInt()).toBe(1);
    expect(p.readString()).toBe(MachineIdProvider.GetFakeMacAddress());
    expect(p.readString()).toBe(MachineIdProvider.GetFakeMacAddressWithHddSerial());
    expect(p.remaining).toBe(0);
  });

  it('CreateNewCharacterInCS encodes name + race + (charSaleJob-1) + 9 ability allocations', () => {
    const al = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const p = new InPacket(LoginSender.CreateNewCharacterInCS('Sale1', 0, 5, al).toArray());
    expect(p.readShort()).toBe(InHeader.CreateNewCharacterInCS);
    expect(p.readString()).toBe('Sale1');
    expect(p.readInt()).toBe(0);
    expect(p.readInt()).toBe(4);
    for (const a of al) expect(p.readInt()).toBe(a);
    expect(p.remaining).toBe(0);
  });

  it('CreateNewCharacterInCS rejects a non-9-length ability allocation array', () => {
    expect(() => LoginSender.CreateNewCharacterInCS('Sale1', 0, 5, [1, 2, 3])).toThrow();
  });
});
