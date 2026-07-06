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

  get HasVR(): boolean {
    return this.VRRight > this.VRLeft && this.VRBottom > this.VRTop;
  }
}
