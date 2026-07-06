export class Account {
  accountId = 0;
  username = '';
  gender: number = 0;
  gradeCode: number = 0;
  subGradeCode: number = 0;
  countryId: number = 0;
  nexonClubId = '';
  purchaseExp: number = 0;
  chatBlockReason: number = 0;
  chatUnblockDate: number | bigint = 0;
  registerDate: number | bigint = 0;
  characterSlotCount = 0;
  skipPinCode = false;
  loginOpt: number = 0;
  buyCharCount = 0;
  clientKey: Uint8Array = new Uint8Array(8);
  selectedWorldId: number = 0;
  selectedChannelId: number = 0;
}
