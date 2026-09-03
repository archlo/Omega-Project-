# CUIAvatar — Full Implementation Reference

## Constructor (0x5e21f0)
- Plain CWnd, `CWnd::CWnd(this)`
- `m_pLogin` — back-pointer to CLogin
- `m_apAvatar[3]` — ZRef<CAvatar> array (3 character slots)
- `m_apNameTag[3]` — IWzGr2DLayer nametag layers
- `m_apPremiumDecoration[3]` — premium decoration layers
- `m_apCanvasNameTag` — canvas layers for name rendering

## OnCreate (0x5ebe10) — 4357 bytes
- Loads character data from `CLogin` for up to 3 character slots
- Creates avatar layers: `IWzGr2D::CreateLayer(...)`
- Loads nametag fonts from StringPool
- Positions character models in selection grid
- Creates prev/next page buttons for >3 characters
- Sets up hover detection rectangles

## OnMouseButton (0x5ed130) — Character Selection
- **WM_LBUTTONDOWN (513)**:
  1. Check if click is in `rtPrev` rect → page backward
  2. Check if click is in `rtNext` rect → page forward
  3. `GetSelectedIdx(rx, ry)` → character index
  4. `SelectCharacter(idx)` → select character
- **WM_LBUTTONDBLCLK (515)**:
  1. `GetSelectedIdx` → character index
  2. If index valid and in current page → double-click selection (enter game)

## GetSelectedIdx (0x5e1120) — Hit Test
- Iterates character slots, checks if point is within character render rect
- Returns 0-based character index or -1

## SelectCharacter (0x5ea280)
- Sets `m_nSelectedIdx`
- Updates nametag highlight
- Triggers `CUICharDetail` refresh

## DrawNameTag (0x5e2940)
- Renders character name, level, job below avatar
- Uses StringPool for job name text

## ResetCharacter (0x5e6c60)
- Rebuilds avatar appearance from `AvatarData`
- Updates nametag and decoration layers

## Key Fields
- `m_pLogin` — CLogin pointer
- `m_nSelectedIdx` — currently selected character
- `m_nPageIndex` — page offset for >3 characters
- `m_nCharCount` — number of characters
- `m_nSlotCount` — total slots available
