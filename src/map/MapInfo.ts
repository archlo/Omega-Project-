export class MapInfo {
  Bgm = '';
  ReturnMap = 0;
  ForcedReturn = 0;
  FieldLimit = 0;
  MapDesc = '';
  Town = 0;
  VRLeft = 0;
  VRTop = 0;
  VRRight = 0;
  VRBottom = 0;

  HideMinimap = false;
  Swim = false;
  Fly = false;
  Cloud = false;
  MoveLimit = 0;
  NoMapCmd = false;
  ExpeditionOnly = false;
  PartyOnly = false;
  NeedQuest = 0;
  LevelLimit = 0;
  Version = 0;
  OnFirstUserEnter = '';
  OnUserEnter = '';
  // OG: CField::GetFieldProp/FieldFactory's switch on this exact WZ key
  // selects which CField subclass handles the map (10 = CField_MonsterCarnival,
  // 11 = CField_MonsterCarnivalRevive, etc.) — TODO_AUDIT.md Eighty-ninth
  // pass's opcode-346 decode-shape desync bug. 0 (absent) means "no
  // special field type", the default `CField` base behavior.
  FieldType = 0;
  // OG: CField::GetMapSpecificEffectUOL/m_sMapSpecificEffectUOL
  // (decompile 0x8eafc0) — TODO_AUDIT.md Twenty-sixth pass. A bare name
  // (e.g. "Bubbling"), not a slash-delimited UOL path — resolved against
  // Effect.wz/MapEff.img/<name> (confirmed live: MapEff.img has
  // Bubbling/NpcReturn/NpcSummon/Viewrange children), shown once on field
  // entry for maps that set one.
  Effect = '';

  // --- Restore* fields (OG: CField::Restore* family, decompile 0x52E9C0+) ---

  // OG: RestoreForbiddenSkill (0x532FB0) — `noskill` node, list of skill IDs
  ForbiddenSkills: number[] = [];

  // OG: RestoreAllowedItem (0x532AB0) — `alloweditem` node, list of item IDs
  AllowedItems: number[] = [];

  // OG: RestoreHelpMsg (0x52FF40) — `help` node, help message indices
  HelpMsgCount = 0;

  // OG: RestoreClock (0x533AB0) — `clock` node, timer display
  ClockType = 0;  // 0=none, 1=countdown, 2=stopwatch
  ClockDuration = 0;

  // OG: RestoreWeatherMsg (0x53CF80) — `weather` node
  WeatherMsg = '';

  // OG: RestorePhaseBG (0x532DD0) — `phase` node, phase background
  PhaseBG = '';

  // OG: RestoreOption (0x53B070) — `option` node
  FieldOption = 0;

  // OG: RestoreUserInfo (0x53FA30) — `userInfo` node
  UserInfo = '';

  // OG: RestorePeculiarInfo (0x546560) — `peculiarInfo` node
  PeculiarInfo = '';

  // OG: RestoreSwinArea (0x5330E0) — `swimArea` node, swim-capable regions
  SwimAreaRect: { left: number; top: number; right: number; bottom: number } | null = null;

  get HasVR(): boolean {
    return this.VRRight > this.VRLeft && this.VRBottom > this.VRTop;
  }
}
