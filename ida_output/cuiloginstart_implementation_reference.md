# CUILoginStart — Full Implementation Reference

## Constructor (0x5ef130)
- Plain CWnd, `CWnd::CWnd(this)`
- `m_pLogin` — CLogin pointer
- `m_bRequestSent` — prevent double-click

## OnCreate (0x5f03c0) — 1747 bytes
- Creates login screen controls (ID/PW fields, login button, quit button)
- `CWnd::CreateWnd(this, ...)` — main login window
- Creates soft keyboard button for PIN entry
- Sets up "View All Characters" button

## OnButtonClicked (0x5ee800)
- **nId=1000 (0x3E8)**: Login/WorldSelect
  - `CLogin::ViewRecommendWorld(pLogin, 0)`
  - If `m_nLoginStep == 2`: `CLogin::GotoWorldSelect(pLogin, 0)`
  - If `m_nLoginStep == 5`: Destroy VAC panels, `CLogin::GotoWorldSelect(pLogin, 1)`
  - Else: `CLogin::GotoTitle(pLogin, 1, nullptr)`
- **nId=1001 (0x3E9)**: Quit
  - `CLogin::ViewRecommendWorld(pLogin, 0)`
  - `ZAPI.PostQuitMessage(0)`

## SetViewWorldButton (0x5ef250)
- Shows/hides "View All Characters" button
- Based on server configuration

## SendViewAllCharacterPacket (0x5ee5a0)
- Sends request to server for all character data
- Used when VAC mode is enabled

## EnableLoginStartCtrl (0x5ee6a0)
- Enables/disables login controls
- Called during login state transitions

## Key Methods
- `HitTest` (0x5ee570) — hit test for login controls
- `OnKey` (0x5ee560) — keyboard input (Enter to login)
- `OnActivate` (0x5ef220) — window activation
- `OnSetFocus` (0x5ef230) — focus handling

## Key Fields
- `m_pLogin` — CLogin pointer
- `m_bRequestSent` — prevent double request
