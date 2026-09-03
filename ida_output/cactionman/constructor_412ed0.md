/**
 * CActionMan::CActionMan (0x412ed0) — Constructor
 *
 * Initializes singleton and all cache maps with table size 31, auto-grow at 100.
 * Sets m_tLastSweepCache = timeGetTime().
 *
 * Cache maps initialized:
 *   m_mCharacterImgEntry (long → CHARACTERIMGENTRY)
 *   m_mFaceLook (FACELOOKCODES → FACELOOKENTRY)
 *   m_msCharacterUOL (long → ZXString<char>)
 *   m_mMorphImgEntry (long → MORPHIMGENTRY)
 *   m_mMorphAction (ulong → MORPHACTIONENTRY)
 *   m_mMobImgEntry (long → MOBIMGENTRY)
 *   m_mMobAction (ulong → MOBACTIONENTRY)
 *   m_mAfterimage (ushort* → MELEEATTACKAFTERIMAGE)
 *   m_mNpcImgEntry (long → NPCIMGENTRY)
 *   m_mNpcAction (int64 → NPCACTIONENTRY)
 *   m_mPetImgEntry (long → PETIMGENTRY)
 *   m_mPetAction (ulong → PETACTIONENTRY)
 *   m_mEmployeeImgEntry (long → EMPLOYEEIMGENTRY)
 *   m_mEmployeeAction (ulong → EMPLOYEEACTIONENTRY)
 *   m_mSummonedAction (ActionKey → SUMMONEDACTIONENTRY)
 *   m_mShadowPartnerAction (ulong → SHADOWPARTNERACTIONENTRY)
 *   m_mDragonAction (long → ZMap<long,DRAGONACTIONENTRY>)
 */
export {};
