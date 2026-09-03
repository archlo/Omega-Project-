# CUIAvatarVAC / CUICharDetail / CUICharDetailVAC — Implementation Reference

## CUIAvatarVAC (View All Characters)
- Plain CWnd, "View All Characters" variant of CUIAvatar
- Constructor: `(CLogin*, void*)` — same as CUIAvatar
- `MakeWorldIcon` (0x5e1b60) — 1199 bytes, creates world icon for VAC
- `DrawWorldIcon` (0x5e17b0) — 711 bytes, draws world icon
- `MakeCharacter` (0x5ed490) — 1574 bytes, creates character display
- `SetSelection` (0x5ed2a0) — 194 bytes, select character
- `GetSelectedIdx` (0x5e1640) — 353 bytes, hit test for character selection
- `OnChildNotify` (0x5ed370) — 190 bytes, child control notifications
- `OnMouseButton` (0x5ed430) — 96 bytes, click handling
- `ResetAvatarPosition` (0x5ebdc0) — 65 bytes, reposition avatars
- `MakeSelectedCharacterNameTag` (0x5e7a30) — 1126 bytes, create nametag
- `ResetCharacter` (0x5e7ea0) — 1712 bytes, rebuild avatar
- `DrawNameTag` (0x5e2ec0) — 2069 bytes, render character name
- `DrawSelectedNameTag` (0x5e36e0) — 1321 bytes, render selected name
- `OnCreate` (0x5edac0) — 2668 bytes, creates VAC UI
- `Update` (0x5e2590) — 79 bytes, update loop

## CUICharDetail
- Character stat detail on selection screen
- Constructor: `(CLogin*, nCharId)` — 330 bytes
- `Draw` (0x5e8860) — 6474 bytes, renders character stats (HP, MP, STR, DEX, INT, LUK, level, job, map)
- `OnPreFadeIn` (0x5e55a0) — 790 bytes, fade-in animation setup
- `Delete` (0x5e02b0) — 36 bytes, cleanup

## CUICharDetailVAC
- Detail panel for VAC mode
- Constructor: `(CLogin*, nCharId)` — same as CUICharDetail
- `Draw` (0x5ea350) — 6766 bytes, renders VAC detail view
- `OnPreFadeIn` (0x5e0160) — 5 bytes, no-op (inherited)
- `Delete` (0x5e02e0) — 36 bytes, cleanup
