/**
 * CActionMan — decompiled functions reference.
 *
 * All 28 functions identified from v95_symbols.txt:
 *
 * CONSTRUCTOR/INIT:
 *   0x412ed0  CActionMan::CActionMan(void)          — singleton init, all cache maps
 *   0x41beb0  CActionMan::Init(void)                — (not decompiled, likely loads base data)
 *
 * CHARACTER:
 *   0x417fd0  CActionMan::GetCharacterImgEntry(long) — loads/caches character equip data
 *   0x427d00  CActionMan::LoadCharacterAction(...)   — processes avatar equipment for action
 *   0x426ce0  CActionMan::load_character_action(...) — internal: loads item actions per slot
 *   0x4172f0  CActionMan::MergeCharacterSprite(...)  — merges body+face into CHARACTERACTIONFRAMEENTRY
 *   0x41cab0  CActionMan::LoadFaceLook(...)          — loads face look canvases
 *
 * MOB:
 *   0x419f20  CActionMan::GetMobImgEntry(ulong)      — loads/caches mob template data
 *   0x41f530  CActionMan::LoadMobAction(ulong,...)   — loads mob action frames
 *
 * NPC:
 *   0x41a840  CActionMan::GetNpcImgEntry(ulong)      — loads/caches NPC template data
 *   0x420ae0  CActionMan::LoadNpcAction(...)         — loads NPC action frames
 *
 * PET:
 *   0x41b0d0  CActionMan::GetPetImgEntry(ulong)      — loads/caches pet template data
 *   0x4213f0  CActionMan::LoadPetAction(...)         — loads pet action frames
 *
 * EMPLOYEE:
 *   0x41b490  CActionMan::GetEmployeeImgEntry(ulong) — loads/caches employee template data
 *   0x422940  CActionMan::LoadEmployeeAction(...)    — loads employee action frames
 *
 * MORPH:
 *   0x418b30  CActionMan::GetMorphImgEntry(ulong)    — loads/caches morph template data
 *   0x4193c0  CActionMan::LoadMorphAction(ulong,...) — loads morph action frames
 *
 * SUMMONED:
 *   0x41b830  CActionMan::GetSummonedProp(long,long) — loads summoned skill property
 *   0x423100  CActionMan::LoadSummonedAction(...)    — loads summoned action frames
 *
 * SHADOW PARTNER:
 *   0x41ba60  CActionMan::GetShadowPartnerProp(long) — loads shadow partner skill property
 *   0x423cf0  CActionMan::LoadShadowPartnerAction(...)- loads shadow partner action frames
 *
 * DRAGON:
 *   0x4247c0  CActionMan::LoadDragonAction(...)      — loads dragon action frames
 *
 * TAMING MOB:
 *   0x427a10  CActionMan::LoadTamingMobAction(...)   — loads taming mob action frames
 *
 * WEAPON/AFTERIMAGE:
 *   0x428080  CActionMan::GetWeaponAfterImage(...)   — loads weapon afterimage data from Effect.wz
 *   0x428d00  CActionMan::GetMeleeAttackRange(...)   — gets attack range rect from afterimage
 *   0x428a20  CActionMan::CreateAfterimageLayer(...) — creates afterimage visual layer
 *
 * CACHE:
 *   0x415f60  CActionMan::SweepCache(void)           — evicts stale cache entries (60s interval)
 *
 * STRUCT LAYOUT (from v95_symbols.txt):
 *   +0000  vtable
 *   +0004  ZList<CHARACTERIMGENTRY>  m_lCharacterImgEntry
 *   +0018  ZMap<long,CHARACTERIMGENTRY>  m_mCharacterImgEntry
 *   +0030  ZList<FACELOOKENTRY>  m_lFaceLook
 *   +0044  ZMap<FACELOOKCODES,FACELOOKENTRY>  m_mFaceLook
 *   +005C  ZMap<long,ZXString<char>>  m_msCharacterUOL
 *   +0074  ZList<MORPHIMGENTRY>  m_lMorphImgEntry
 *   +0088  ZMap<long,MORPHIMGENTRY>  m_mMorphImgEntry
 *   +00A0  ZList<MORPHACTIONENTRY>  m_lMorphAction
 *   +00B4  ZMap<ulong,MORPHACTIONENTRY>  m_mMorphAction
 *   +00CC  ZList<MOBIMGENTRY>  m_lMobImgEntry
 *   +00E0  ZMap<long,MOBIMGENTRY>  m_mMobImgEntry
 *   +00F8  ZList<MOBACTIONENTRY>  m_lMobAction
 *   +010C  ZMap<ulong,MOBACTIONENTRY>  m_mMobAction
 *   +0124  ZMap<ushort*,MELEEATTACKAFTERIMAGE>  m_mAfterimage
 *   +013C  ZList<NPCIMGENTRY>  m_lNpcImgEntry
 *   +0150  ZMap<long,NPCIMGENTRY>  m_mNpcImgEntry
 *   +0168  ZList<NPCACTIONENTRY>  m_lNpcAction
 *   +017C  ZMap<int64,NPCACTIONENTRY>  m_mNpcAction
 *   +0194  ZList<PETIMGENTRY>  m_lPetImgEntry
 *   +01A8  ZMap<long,PETIMGENTRY>  m_mPetImgEntry
 *   +01C0  ZList<PETACTIONENTRY>  m_lPetAction
 *   +01D4  ZMap<ulong,PETACTIONENTRY>  m_mPetAction
 *   +01EC  ZList<EMPLOYEEIMGENTRY>  m_lEmployeeImgEntry
 *   +0200  ZMap<long,EMPLOYEEIMGENTRY>  m_mEmployeeImgEntry
 *   +0218  ZList<EMPLOYEEACTIONENTRY>  m_lEmployeeAction
 *   +022C  ZMap<ulong,EMPLOYEEACTIONENTRY>  m_mEmployeeAction
 *   +0244  ZList<SUMMONEDACTIONENTRY>  m_lSummonedAction
 *   +0258  ZMap<ActionKey,SUMMONEDACTIONENTRY>  m_mSummonedAction
 *   +0270  ZList<SHADOWPARTNERACTIONENTRY>  m_lShadowPartnerAction
 *   +0284  ZMap<ulong,SHADOWPARTNERACTIONENTRY>  m_mShadowPartnerAction
 *   +029C  ZMap<long,ZMap<long,DRAGONACTIONENTRY>>  m_mDragonAction
 *   +02B4  __int32 m_tLastSweepCache
 *
 * CHARACTERACTIONFRAMEENTRY (size=44):
 *   +0000  vtable (ZRefCounted)
 *   +0004  _m_nRef
 *   +0008  _m_pPrev
 *   +000C  IWzCanvas* pCanvasUnderFace
 *   +0010  IWzCanvas* pCanvasOverFace
 *   +0014  tagPOINT ptNavel
 *   +001C  tagPOINT ptBrow
 *   +0024  tagPOINT ptMuzzle
 *   +002C  tagPOINT ptTemp
 *
 * CHARACTERIMGENTRY (size=68):
 *   +0000  vtable (ZRefCounted)
 *   +0004  _m_nRef
 *   +0008  _m_pPrev
 *   +000C  IWzProperty* pImg
 *   +0010  BSTR sISlot
 *   +0014  BSTR sVSlot
 *   +0018  BSTR sWeaponAfterimage
 *   +001C  BSTR sSfx
 *   +0020  IWzProperty* pWeeklyImg
 *   +0024  BOOL bWeekly
 *   +0028  int nWeapon
 *   +002C  int nWalk
 *   +0030  int nStand
 *   +0034  int nAttack
 *   +0038  int nAttackSpeed
 *   +003C  __POSITION* posMap
 *   +0040  DWORD tLastAccessed
 */
export {};
