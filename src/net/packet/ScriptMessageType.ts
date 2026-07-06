export const enum ScriptMessageType {
  Say = 0,
  SayImage = 1,
  AskYesNo = 2,
  AskText = 3,
  AskNumber = 4,
  AskMenu = 5,
  AskQuiz = 6,
  AskSpeedQuiz = 7,
  AskAvatar = 8,
  AskMemberShopAvatar = 9,
  AskPet = 10,
  AskPetAll = 11,
  Script = 12,
  AskAccept = 13,
  AskBoxText = 14,
  AskSlideMenu = 15,
  AskCenter = 16,
}

export const enum ScriptMessageParam {
  None = 0x0,
  NotCancellable = 0x1,
  PlayerAsSpeaker = 0x2,
  SpeakerOnRight = 0x4,
  FlipSpeaker = 0x8,
}
