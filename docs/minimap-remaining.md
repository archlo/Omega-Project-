# MiniMap — Remaining Work

Audit date: this session (MiniMap edge-arrow pass shipped). Everything below is
verified against the OG `CUIMiniMap::Update @0x8053A0` decompile, the live WZ
(`UI.nx` / `UIWindow2.img/MiniMap*`), and grep of `GameStage.ts` for data feeds.

## Implemented / Done
- 3 modes (normal / huge / collapsed), 2 mini-map types (simple / normal), mode arithmetic 1:1.
- Simple-window frame + buttons (`BtMin/BtMax/BtMap`, `Bt2X` ZoomIn↔ZoomOut swap), OG anchors.
- `_mag` fed from `MiniMapData.Mag_Normal/Mag_2X`.
- Pane sizing caps (210×112 / 420×225), scroll clamp, player-dot click (UserMiniMapClick opcode 166).
- Icon draw order rewritten to OG order: ShopRemote → RemoteUser → Portals → Stalkees →
  Party/PartyMaster → NPCs (NpcStart if quest) → **remote-name edge arrows** → Self icon.
- `_drawIconAt` bottom-center (1x Copy / 2x CopyEx simple+huge).
- Footholds (white), ladders (red) / ropes (blue), portals, merchants, NPCs, title/street/id, Tab cycle.
- Always at top-left (4,4) — localStorage position restore removed per user decision.
- **Stalkee feed wired**: `GameStage.onStalkResult` → `insertStalkee/removeStalkee`
  (OG `CField::OnStalkResult @539910.c`), replacing the chat-log placeholder. Friend icons,
  names, and the 8 edge arrows now fire from real server stalk data.

## Missing / Needs Work

### 1. Server-side array-form StalkResult broadcast  (MEDIUM)
The v95 client feeds `m_mStalkee` **only** from `CField::OnStalkResult @0x539910` (count →
array of entries). That packet arrives only if the server broadcasts it. Today:
- `UserHandler.handleStalkBegin` reads a `targetId` from opcode 166, but the v95 client sends
  166 **with no payload** (minimap dot-click, `CUIMiniMap::OnMouseButton @0x7F8410`), so the
  read is garbage.
- Its reply format (fieldId/x/y/level/name) mismatches the client's count→array decoder.
- Kinoko doesn't implement stalk either.

Until a proper count→array `STALK_RESULT` (172) broadcast exists, no Friend icons /
off-pane edge arrows will appear — and per the authenticity rule that's the correct state:
**no client-side fallback**. Players already in the field render as RemoteUser markers via
CUserPool, exactly as OG does; stalkees are strictly server-fed.

### 2. `setRemoteNames()` is wiped every frame  (LOW)
`resetRemoteNames()` runs at the top of the stalkee loop every frame, so any externally-set
bucket is cleared immediately. This matches OG (`Update @0x8053A0` resets `m_strRemote*` each
frame and rebuilds from stalkees); the public setter is vestigial. Either drop it or have the
loop preserve externally-set buckets.

### 3. Battlefield icons  (DOCUMENTED-DEFERRED)
`Sheep` / `Wolves` / `NakedSheep` marker sprites exist (aliases of RemoteUser/ShopSelf/Party for
simple mode; dedicated `sheep/wolves/nakedsheep` for normal mode) but there is **no data pipeline**
for field type 19 (Monster Carnival). Deferred until battlefield ships.

### 4. Match (spouse/partner) icon  (DOCUMENTED-DEFERRED)
`Match` marker sprite loaded; no marriage/couple position data source wired. Deferred.

### 5. ShopSelf (own entrusted shop)  (DOCUMENTED-DEFERRED)
`lEntrustedShop` → ShopSelf deferred list has no data source. Merchants only feed `ShopRemote`.

### 6. Guild / GuildMaster icons  (DOCUMENTED-DEFERRED)
Sprites loaded; guild-member names/positions not wired to the minimap.

### 7. Normal-mode arrow WZ source unresolved  (ACCEPTED FALLBACK)
`MiniMap/DefaultHelper` in this UI.nx has no arrow nodes (`arrowup` etc. only exist under
`MiniMapSimpleMode/DefaultHelper`). Normal-mode edge arrows fall back to the simple-mode sprites.
Matches the marker-class approach. Optional future: locate normal-arrow canvases in a fuller UI.nx.

## Notes
- Full suite: **173 files / 1510 tests pass**, `tsc --noEmit` clean (baseline after this session).
- Authenticity rule: stalkees are **server-fed only** (`CField::OnStalkResult`). No client-side
  friend→stalkee fallback was kept — players in-field already render as RemoteUser markers.
- No test references `_remoteName*`, `_stalkees`, or `_drawRemoteNames` — the arrow pass and
  classification (`_remoteDirectionFor`) are testable if a spec is added.