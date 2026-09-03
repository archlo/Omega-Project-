/**
 * CActionMan::GetWeaponAfterImage (0x428080) — Weapon Afterimage Loader
 *
 * Signature: (sUOL) → MELEEATTACKAFTERIMAGE*
 *
 * Loads weapon afterimage data from Effect.wz:
 *   1. Look up in m_mAfterimage cache by sUOL
 *   2. If cached: return cached entry
 *   3. Load from Effect.wz → afterimage.img → sUOL
 *   4. Read per-action range rectangles (arcRange[action])
 *   5. Read canvas frames for visual trail effect
 *   6. Cache in m_mAfterimage and m_lAfterimage (LRU list)
 *
 * MELEEATTACKAFTERIMAGE layout (20 bytes):
 *   +0000  vtable (ZRefCounted)
 *   +0004  _m_nRef
 *   +0008  _m_pPrev
 *   +000C  ZXString<unsigned short> sUOL
 *   +0010  ZArray<SECRECT> arcRange (per-action range rects)
 *   +0014  ZArray<IWzCanvas*> aCanvas (visual frames)
 */
export {};
