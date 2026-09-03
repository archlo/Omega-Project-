# CChatBalloon v95 Audit — 1:1 decompile findings

Source: IDB `v95w` (Maplestory95.exe). All facts below were re-verified live from the
decompiler this session, not assumed from the AGENTS.md session summary.

## 1. Balloon type → WZ node table (`MakeBalloon` @0x4A84F0)

`CChatBalloon::MakeBalloon(this, bsText, pLayerOverlay, pVectorOrigin, tTimeOut,
IWzCanvas *nType, int nIdx, int bDead, int nAdjustCoordY, const Ztl_variant_t *nWidth)`.

The WZ node key is built by appending a StringPool fragment to the base string
`StringPool::GetStringW(0x59Au)` = `"ChatBalloon.img"`. The exact literal for each
fragment is encrypted (StringPool table is encrypted at rest), but the shape is
unambiguous and cross-checks 1:1 against the `ChatBalloon.img` child inventory dumped
from `wz_client/UI.nx` (47 top-level children):

| nType (dec) | nType (hex) | Path shape built        | WZ node (verified)                     | Layer routed to        |
|-------------|-------------|-------------------------|----------------------------------------|------------------------|
| 1000        | 0x3E8       | `base + _Int2StrW(nIdx)`| numeric style `ChatBalloon.img/<nIdx>` | `m_pLayerChat`         |
| 1001        | 0x3E9       | `base + StringPool(0x59B)` | named node `ChatBalloon.img/npc`   | `m_pLayerChat`         |
| 1002        | 0x3EA       | `base + StringPool(0x1AC6) + "/" + _Int2StrW(nIdx)` | `ChatBalloon.img/pet/<nIdx>` | `m_pLayerChat` |
| 1003        | 0x3EB       | `base + StringPool(0x59C) + "/" + _Int2StrW(nIdx)` | `ChatBalloon.img/adboard/<nIdx>` (0x59C = "adboard"?) | **`m_pLayerAD`** |
| 1004        | 0x3EC       | `base + StringPool(0x666) + "/" + _Int2StrW(nIdx)` | `ChatBalloon.img/mob/<nIdx>` | `m_pLayerChat` |
| — (bDead=1) | —           | `base + StringPool(0x1AA8)` (bare, no nIdx) | `ChatBalloon.img/dead` | `m_pLayerChat` |

Key decompile facts:

- The switch on `nType` is only entered when `bDead == 0`. When `bDead` is non-zero the
  bare `0x1AA8` fragment is appended (the dead-player balloon).
- `case 1003` (0x3EB) is **not** "dead" — the earlier session note was wrong. It appends
  `0x59C` **and then** `"/" + _Int2StrW(nIdx)` (same slash-index shape as pet/mob), and
  afterwards:
  ```c
  if ( nType == 1003 ) p_m_pLayerAD = &v129->m_pLayerAD;
  else                  p_m_pLayerAD = &v129->m_pLayerChat;
  ```
  so 1003 renders on the separate `m_pLayerAD` layer. The only named `ChatBalloon.img`
  child with a numeric sub-child is `adboard` (child `0`), so `0x59C` = `"adboard"`.
- `default:` falls through with the bare `"ChatBalloon.img"` key (no fragment).
- After `GetObjectA(g_rm, <key>)` resolves the `IWzProperty`, the code reads the per-node
  `delayRate` string `StringPool::GetBSTR(0x5AEu)` (default 3) and `StringPool::GetBSTR
  (0x1AA9u)` (default 120) before building the canvas.
- Insert canvas is gated: `if (!pProp.m_pInterface) return;` — missing node = silent no-op.

### `ChatBalloon.img` child inventory (verified from UI.nx)

- Numeric styles `0..39` — every one has the full nine-piece set + `clr` + `arrow`.
- Named: `npc` (11 pieces, `clr` = -8388608 dark red, arrow origin (1,0)),
  `pet/<0..52>` (41 children; `0` = -8388608, `1..` = -1 / -16777216),
  `mob/<0..2>` (3 children), `dead` (11 pieces, arrow origin (2,0)), `adboard/0`,
  `tutorial` (10 pieces, 2x2 canvas scale, per-piece `z`), `miniroom` (Able/Disable/Lock/
  Progress/Unlock/backgrnd/cNum/mNum/PSSkin/Omok/PersonalShop/MemoryGame).

## 2. Callers → type (verified this session)

| OG function         | Address   | Balloon kind | nType | nIdx source |
|---------------------|-----------|--------------|-------|-------------|
| `CUser::OnChat`     | 0x8E86C0  | player chat  | 1000  | player's own `m_nChatBalloonType` |
| `CNpc::OnChat`      | 0x675520  | NPC chat     | 1001  | — |
| `CPet::ChatCommandInPreview` / `CPet::SetPreviewState` | 0x6A1450 / 0x6A1770 | pet | 1002 | `pet/<nIdx>` |
| — (ad board)        | —         | ad board     | 1003  | index into `adboard/0` |
| `CMob::TrySpeaking` | 0x64B6D0  | mob chat     | 1004  | `mob/<nIdx>` |
| — (dead)            | —         | dead player  | bDead=1 | bare `dead` |
| — (special font)    | —         | tutorial/special | 1005 | `CreateCanvas` special-cases font |

`MakeMobBalloon` @0x4A9AC0 has its own signature `(this, bsText, pLayerOverlay,
pVectorOrigin, tTimeOut, nChatBalloon, nFadeDelay, nWidth)` — mob balloons take an
explicit fade-delay argument. Player chat (`CUser::OnChat`) uses `MakeBalloon` directly.

## 3. Timeout + fade (`CheckTimeOut` @0x4A2060, `SetFadeDelay` @0x4A1200)

- `SetFadeDelay(nDelay)`: `m_tFadeDalay = nDelay < 0 ? 0 : nDelay`.
- `MakeBalloon` tail: `m_tChatBegin = get_update_time(); m_tTimeOut = tTimeOut;`
  then `AdjustCoordY(this, nAdjustCoordY + <overlay canvas cy>)`.
- `CheckTimeOut` is guarded by `m_pLayerChat.m_pInterface` and `m_bMiniRoomBalloon`.
  It computes `get_update_time() - m_tTimeOut - m_tChatBegin`; while that is negative
  the balloon is alive. In the fade window the alpha is ramped linearly:
  `255 * remaining / m_tFadeDalay` (alpha decreases as time passes).
- `AdjustCoordY` @0x4A1300 stores `m_nHeight = nHeight` and, when the layer is present,
  calls `RelMove(m_pLayerChat, m_nPosX, m_nPosY - nHeight - 5, ...)` — **the balloon
  always sits 5px above its anchor Y.**

## 4. Layout facts (`CreateCanvas` @0x4A59D0)

- Word-break chars are `wcschr(L" \t\r\n", c)` — a token is unbreakable while none of
  those chars are present; the code scans backward for the last break char.
- Minimum line count: `lineCount = (width + cell - 1) / cell` floored at `7`
  (`v161 <= 7` → `7`); for type **1005** the floor is `14`. `width = lineCount * cell`.
- Font is created via `PcCreateObject<IWzFont>(StringPool::GetStringW(0x5AFu))`;
  type 1005 additionally re-creates the font from `StringPool::GetBSTR(0x5B0u)` +
  `StringPool::GetBSTR(0x1A25u)` (special tutorial font).
- Line width measured with `IWzFont::CalcLongestTextForGlobal`; longest-line width at
  ~line 1101.
- Draw: `IWzCanvas::DrawTextA` per wrapped line on the composed canvas, then
  `IWzCanvas::Copy` composited onto the layer.

## 5. GameStage call-site remap (current TS → OG)

| Line | Current call | Current type | Should be |
|------|--------------|--------------|-----------|
| 2211 | whisper echo `Set(charId, msg, 5, 2)` | numeric style 2 | 1000 (player's balloon) |
| 2226 | local chat `Set(localCharId, msg, 5, 0)` | style 0 | 1000 |
| 3132 | remote chat `Set(charId, resolved, 5, 0)` | style 0 | 1000 |
| 3173 | group chat `Set(charId, resolved, 4, balloonType)` | styles 0-3 | 1000 |
| 3187 | whisper from server `Set(sender.CharId, text, 4, 2)` | style 2 | 1000 |
| 7197 | NPC idle chat `Set(npc.ObjId, text, 5, 1)` | style 1 (**wrong assets**) | 1001 → `npc` node |
| 7342 | MiniRoom title `Set(ownerId, text, 600)` | style 0 | separate `MakeMiniRoomBalloon` |

## 6. Duplicate NPC bubble — RESOLVED

`NpcLook._drawSpeechBubble` (NpcLook.ts:409-431) drew its own Graphics box for
server-driven `OnChat` (GameStage 2783/2795), while the WZ `ChatBalloonLayer` also
rendered NPC idle chat (GameStage 7197). OG `CNpc::OnChat` delegates entirely to
`CChatBalloon` (type 1001).

Reconciliation (this session):
- Added `NpcLook.onChatBalloon: ((text: string) => void) | null`; `OnChat` fires it
  after `{NAME}` replacement (GameStage wires it to `_chatBalloon.Set(npc.ObjId,
  text, 5, BalloonType.Npc)`).
- `_drawSpeechBubble` early-returns when `onChatBalloon` is set, so the internal
  box remains only as a standalone fallback for unwired consumers (QuestDetail,
  UtilDlgEx never call `OnChat`).
- Added `NpcLook.BalloonOffset` getter (OG `m_ptBalloonOffset`, NPC 1300000 y=-20)
  and applied it to the WZ-layer NPC anchor in the GameStage `Draw` callback.
- Test: `NpcLook.spec.ts` "delegates OnChat to the WZ balloon layer via
  onChatBalloon" asserts `{NAME}` → template-name replacement.
- ChatBalloon.spec.ts anchor expectation updated to the OG-correct 5px-above math
  (`y: 152, arrowY: 187`); full suite 1375/1375 pass, tsc clean.
