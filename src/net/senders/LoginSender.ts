import { OutPacket } from '../packet/OutPacket.js';
import { InHeader } from '../packet/OpCodes.js';
import { MachineIdProvider } from '../session/MachineId.js';

export class LoginSender {
  static CheckPassword(username: string, password: string, machineId: Uint8Array): OutPacket {
    const p = OutPacket.Of(InHeader.CheckPassword);
    p.writeString(username);
    p.writeString(password);
    p.writeBytes(machineId);
    p.writeInt(0);
    p.writeByte(2);
    p.writeByte(0);
    p.writeByte(0);
    p.writeBytes(new Uint8Array(4));
    return p;
  }

  static WorldInfoRequest(): OutPacket {
    return OutPacket.Of(InHeader.WorldInfoRequest);
  }

  // Post-auth world-list request used by the OG login flow after
  // CheckPasswordResult / PIN handling (decompile/5DC600.c).
  static WorldRequest(): OutPacket {
    return OutPacket.Of(InHeader.WorldRequest);
  }

  static SelectWorld(worldId: number, channelId: number): OutPacket {
    const p = OutPacket.Of(InHeader.SelectWorld);
    p.writeByte(worldId);
    p.writeByte(channelId);
    return p;
  }

  static SelectCharacter(characterId: number): OutPacket {
    const p = OutPacket.Of(InHeader.SelectCharacter);
    p.writeInt(characterId);
    p.writeString(MachineIdProvider.GetFakeMacAddress());
    p.writeString(MachineIdProvider.GetFakeMacAddressWithHddSerial());
    return p;
  }

  static CheckPinCode(pin: string): OutPacket {
    const p = OutPacket.Of(InHeader.CheckPinCode);
    p.writeByte(1);
    p.writeByte(0);
    p.writeString(pin);
    return p;
  }

  // CLogin::OnCheckPasswordResult / OnSetAccountResult / OnSelectWorldResult
  // send opcode 9 as a PIN bootstrap request: 1, 1, "".
  static CheckPinCodeBootstrap(): OutPacket {
    const p = OutPacket.Of(InHeader.CheckPinCode);
    p.writeByte(1);
    p.writeByte(1);
    p.writeString('');
    return p;
  }

  static UpdatePinCode(pin: string): OutPacket {
    const p = OutPacket.Of(InHeader.UpdatePinCode);
    p.writeByte(1);
    p.writeString(pin);
    return p;
  }

  // CLogin::OnAcceptLicense / OnDenyLicense (decompile/5D4540.c, 5D45D0.c).
  static ConfirmEULA(accepted: boolean): OutPacket {
    const p = OutPacket.Of(InHeader.ConfirmEULA);
    p.writeByte(accepted ? 1 : 0);
    return p;
  }

  static CheckSPWRequest(pic: string, characterId: number): OutPacket {
    const p = OutPacket.Of(InHeader.CheckSPWRequest);
    p.writeString(pic);
    p.writeInt(characterId);
    p.writeString(MachineIdProvider.GetFakeMacAddress());
    p.writeString(MachineIdProvider.GetFakeMacAddressWithHddSerial());
    return p;
  }

  static EnableSPWRequest(characterId: number, pic: string): OutPacket {
    const p = OutPacket.Of(InHeader.EnableSPWRequest);
    p.writeByte(1);
    p.writeInt(characterId);
    p.writeString(MachineIdProvider.GetFakeMacAddress());
    p.writeString(MachineIdProvider.GetFakeMacAddressWithHddSerial());
    p.writeString(pic);
    return p;
  }

  static CheckDuplicatedId(name: string): OutPacket {
    const p = OutPacket.Of(InHeader.CheckDuplicatedID);
    p.writeString(name);
    return p;
  }

  // NOTE (found while implementing CreateNewCharacterInCS below): the real
  // OG sender for InHeader=22, CLogin::SendNewCharPacket's non-char-sale
  // branch (decompile/5D7BD0.c), encodes name:str, race:int, subJob:short,
  // then 8x int (CLogin::GetSelectedAL ability-point-allocation selections),
  // then gender:byte — not the face/hair/hairColor/skin/coat/pants/shoes/
  // weapon fields this method currently writes. This method's byte layout
  // looks like it was written against a different client version/format
  // and has not been re-verified against this OG decompile. Flagging for a
  // dedicated re-verification pass; not changed here since that would alter
  // already-shipped behavior without confirmation.
  static CreateNewCharacter(
    name: string,
    race: number,
    face: number,
    hair: number,
    hairColor: number,
    skin: number,
    coat: number,
    pants: number,
    shoes: number,
    weapon: number,
    male: boolean,
    subJob = 0,
  ): OutPacket {
    const p = OutPacket.Of(InHeader.CreateNewCharacter);
    p.writeString(name);
    p.writeInt(race);
    p.writeShort(subJob);
    p.writeInt(face);
    p.writeInt(hair);
    p.writeInt(hairColor);
    p.writeInt(skin);
    p.writeInt(coat);
    p.writeInt(pants);
    p.writeInt(shoes);
    p.writeInt(weapon);
    p.writeByte(male ? 0 : 1);
    return p;
  }

  // CLogin::SendNewCharPacket (decompile/5D7BD0.c), m_bCharSale branch
  // (InHeader=23, the "character sale" job pre-selection screen).
  static CreateNewCharacterInCS(name: string, race: number, charSaleJob: number, abilityAllocations: ReadonlyArray<number>): OutPacket {
    if (abilityAllocations.length !== 9) throw new Error('CreateNewCharacterInCS requires exactly 9 ability allocations');
    const p = OutPacket.Of(InHeader.CreateNewCharacterInCS);
    p.writeString(name);
    p.writeInt(race);
    p.writeInt(charSaleJob - 1);
    for (const al of abilityAllocations) p.writeInt(al);
    return p;
  }

  static DeleteCharacter(characterId: number, secondaryPassword: string): OutPacket {
    const p = OutPacket.Of(InHeader.DeleteCharacter);
    p.writeString(secondaryPassword);
    p.writeInt(characterId);
    return p;
  }

  static AliveAck(): OutPacket {
    return OutPacket.Of(InHeader.AliveAck);
  }

  static LogoutWorld(): OutPacket {
    return OutPacket.Of(InHeader.LogoutWorld);
  }

  // CLogin::SendCheckUserLimitPacket (decompile/5D43D0.c). `worldId` is the
  // resolved world's nWorldID (OG looks this up from a local world-list
  // index; callers here pass the id directly).
  static CheckUserLimit(worldId: number): OutPacket {
    const p = OutPacket.Of(InHeader.CheckUserLimit);
    p.writeShort(worldId);
    return p;
  }

  // CLogin::SendSetGenderPacket (decompile/5D4650.c).
  static SetGender(gender: number): OutPacket {
    const p = OutPacket.Of(InHeader.SetGender);
    p.writeByte(1);
    p.writeByte(gender);
    return p;
  }

  // CLogin::SendCancelGenderPacket (decompile/5D46E0.c).
  static CancelGender(): OutPacket {
    const p = OutPacket.Of(InHeader.SetGender);
    p.writeByte(0);
    return p;
  }

  // CLogin::SendViewAllCharPacket (decompile/5DFB40.c). Only the
  // InHeader=13 wire format is encoded here — the OG function's NEXON
  // passport/machine-auth flow (CNMCOClientObject) that decides
  // `gameStartMode` and supplies `passport`/`machineId`/`gameRoomClient`
  // has no equivalent in this client and is not replicated. `gameStartMode`
  // selects whether the passport/machine-id/room-client fields are present.
  static ViewAllChar(gameStartMode: number, passport?: string, machineId?: Uint8Array, gameRoomClient?: number): OutPacket {
    const p = OutPacket.Of(InHeader.ViewAllChar);
    p.writeByte(gameStartMode);
    if (gameStartMode === 1) {
      p.writeString(passport ?? '');
      p.writeBytes(machineId ?? new Uint8Array(16));
      p.writeInt(gameRoomClient ?? 0);
      p.writeByte(gameStartMode);
    }
    return p;
  }

  // CLogin::MakeVACDlg / ResetVAC (decompile/5D44A0.c, 5D7DC0.c).
  static VACFlagSet(enabled: boolean): OutPacket {
    const p = OutPacket.Of(InHeader.VACFlagSet);
    p.writeByte(enabled ? 1 : 0);
    return p;
  }

  // CLogin::SendViewAllCharPacket error path (decompile/5DFB40.c).
  static SSOErrorLog(authCode: number): OutPacket {
    const p = OutPacket.Of(InHeader.SSOErrorLog);
    p.writeByte(1);
    p.writeInt(authCode);
    return p;
  }

  // CLogin::SendSelectCharPacketByVAC (decompile/5D7550.c), case m_bLoginOpt
  // in {2,3} branch (InHeader=14, the plain SelectCharacterByVAC path).
  static SelectCharacterByVAC(characterId: number, worldId: number): OutPacket {
    const p = OutPacket.Of(InHeader.SelectCharacterByVAC);
    p.writeInt(characterId);
    p.writeInt(worldId);
    p.writeString(MachineIdProvider.GetFakeMacAddress());
    p.writeString(MachineIdProvider.GetFakeMacAddressWithHddSerial());
    return p;
  }

  // CLogin::SendSelectCharPacketByVAC (decompile/5D7550.c), case
  // m_bLoginOpt===0 branch (InHeader=30).
  static EnableSPWRequestByVAC(characterId: number, worldId: number, secondaryPassword: string): OutPacket {
    const p = OutPacket.Of(InHeader.EnableSPWRequestByVAC);
    p.writeByte(1);
    p.writeInt(characterId);
    p.writeInt(worldId);
    p.writeString(MachineIdProvider.GetFakeMacAddress());
    p.writeString(MachineIdProvider.GetFakeMacAddressWithHddSerial());
    p.writeString(secondaryPassword);
    return p;
  }

  // CLogin::SendSelectCharPacketByVAC (decompile/5D7550.c), case
  // m_bLoginOpt===1 branch (InHeader=31).
  static CheckSPWRequestByVAC(characterId: number, worldId: number, secondaryPassword: string): OutPacket {
    const p = OutPacket.Of(InHeader.CheckSPWRequestByVAC);
    p.writeString(secondaryPassword);
    p.writeInt(characterId);
    p.writeInt(worldId);
    p.writeString(MachineIdProvider.GetFakeMacAddress());
    p.writeString(MachineIdProvider.GetFakeMacAddressWithHddSerial());
    return p;
  }
}
