import { OutPacket } from '../packet/OutPacket.js';
export declare class LoginSender {
    static CheckPassword(username: string, password: string, machineId: Uint8Array): OutPacket;
    static WorldInfoRequest(): OutPacket;
    static WorldRequest(): OutPacket;
    static SelectWorld(worldId: number, channelId: number): OutPacket;
    static SelectCharacter(characterId: number): OutPacket;
    static CheckPinCode(pin: string): OutPacket;
    static CheckPinCodeBootstrap(): OutPacket;
    static UpdatePinCode(pin: string): OutPacket;
    static ConfirmEULA(accepted: boolean): OutPacket;
    static CheckSPWRequest(pic: string, characterId: number): OutPacket;
    static EnableSPWRequest(characterId: number, pic: string): OutPacket;
    static CheckDuplicatedId(name: string): OutPacket;
    static CreateNewCharacter(name: string, race: number, face: number, hair: number, hairColor: number, skin: number, coat: number, pants: number, shoes: number, weapon: number, male: boolean, subJob?: number): OutPacket;
    static CreateNewCharacterInCS(name: string, race: number, charSaleJob: number, abilityAllocations: ReadonlyArray<number>): OutPacket;
    static DeleteCharacter(characterId: number, secondaryPassword: string): OutPacket;
    static AliveAck(): OutPacket;
    static LogoutWorld(): OutPacket;
    static CheckUserLimit(worldId: number): OutPacket;
    static SetGender(gender: number): OutPacket;
    static CancelGender(): OutPacket;
    static ViewAllChar(gameStartMode: number, passport?: string, machineId?: Uint8Array, gameRoomClient?: number): OutPacket;
    static VACFlagSet(enabled: boolean): OutPacket;
    static SSOErrorLog(authCode: number): OutPacket;
    static SelectCharacterByVAC(characterId: number, worldId: number): OutPacket;
    static EnableSPWRequestByVAC(characterId: number, worldId: number, secondaryPassword: string): OutPacket;
    static CheckSPWRequestByVAC(characterId: number, worldId: number, secondaryPassword: string): OutPacket;
}
//# sourceMappingURL=LoginSender.d.ts.map