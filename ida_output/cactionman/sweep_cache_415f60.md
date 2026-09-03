/**
 * CActionMan::SweepCache (0x415f60) — Cache Eviction
 *
 * Signature: (void)
 *
 * Logic:
 *   1. Check if 60000ms (60s) have passed since last sweep
 *   2. If yes: update m_tLastSweepCache, call sub_C9E6D4 (internal sweep)
 *
 * The internal sweep iterates all LRU lists and evicts entries
 * whose tLastAccessed is older than the threshold (5 minutes).
 * Each entity type has its own list:
 *   m_lCharacterImgEntry, m_lMorphImgEntry, m_lMobImgEntry,
 *   m_lNpcImgEntry, m_lPetImgEntry, m_lEmployeeImgEntry
 *
 * Afterimage cache (m_mAfterimage) is NOT swept — it persists for the session.
 */
export {};
