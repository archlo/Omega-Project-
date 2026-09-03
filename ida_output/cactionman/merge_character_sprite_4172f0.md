/**
 * CActionMan::MergeCharacterSprite (0x4172f0) — Merge Body+Face Canvases
 *
 * Signature: (AHECODES, &aFrame, &apFE)
 *
 * Merges CActionFrame array into CHARACTERACTIONFRAMEENTRY array:
 *   1. Get frame count from aFrame[-1].rcBody.bottom (hidden header)
 *   2. Check dword_C68E74[6 * b.nAction] for mirror flag
 *   3. If mirror: destination count = 2*srcCount - 2 (generates flipped variants)
 *   4. Allocate apFE with destination count
 *   5. For each source frame:
 *      - Allocate CHARACTERACTIONFRAMEENTRY (44 bytes)
 *      - Call CActionFrame::Draw() to render:
 *        → pCanvasUnderFace (body layer)
 *        → pCanvasOverFace (face layer)
 *        → ptNavel, ptBrow, ptMuzzle anchor points
 *   6. If mirror: copy frames in reverse order for second half
 *
 * CHARACTERACTIONFRAMEENTRY layout (44 bytes):
 *   +0000  vtable (ZRefCounted)
 *   +0004  _m_nRef
 *   +0008  _m_pPrev
 *   +000C  IWzCanvas* pCanvasUnderFace
 *   +0010  IWzCanvas* pCanvasOverFace
 *   +0014  tagPOINT ptNavel
 *   +001C  tagPOINT ptBrow
 *   +0024  tagPOINT ptMuzzle
 *   +002C  tagPOINT ptTemp
 */
export {};
