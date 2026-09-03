# Remaining CUI Classes Audit — IDA Decompilation Findings

Generated: 2026-07-11

## CUICharSelect (Login Flow)
- Plain CWnd, 101×131 at (255, -1359) — off-screen initially
- 3 buttons: 1000=Select, 1001=NewChar, 1002=Delete
- Routes to: `CLogin::SendSelectCharPacket`, `OnNewCharStep`, `SendDeleteCharPacket`
- Has: `m_pLogin`, `m_pLayerAdvice`, `m_apButton[3]`

## CUIAvatar (Login Flow)
- Plain CWnd, renders character avatars on selection screen
- 3 avatar slots (`m_apAvatar[3]`), nametag layers (`m_apNameTag[3]`), premium decorations
- `m_pLogin` — back-pointer to CLogin
- `OnMouseMove` (0x964 bytes) — hover detection for character selection
- `DrawNameTag` — renders character name + level
- `ResetCharacter` (0xdc7 bytes) — resets avatar appearance
- `SelectCharacter` — selects a character slot
- `Refresh` — refreshes avatar display

## CUIAvatarVAC (View All Characters)
- Plain CWnd, "View All Characters" variant of CUIAvatar
- `MakeWorldIcon` — renders world icon for VAC
- `DrawWorldIcon` — draws world icon
- `MakeCharacter` — creates character display
- `SetSelection` — select character
- `GetSelectedIdx` — hit test for character selection
- `OnChildNotify` — child control notifications

## CUICharDetail (Login Flow)
- Detail panel showing character stats on selection screen
- `Draw` (0x194a bytes) — renders character detail view
- `OnPreFadeIn` — fade-in animation setup

## CUICharDetailVAC (View All Characters)
- Detail panel for VAC mode
- `Draw` (0x1a6e bytes) — renders VAC detail view
- Same structure as CUICharDetail

## CUILoginStart (Login Screen)
- Plain CWnd, main login screen controls
- Button IDs: 1000=Login/WorldSelect, 1001=Quit
- `OnButtonClicked`: Routes based on `m_nLoginStep` (2=world select, 5=VAC mode)
- `SetViewWorldButton` — toggle "View All Characters" button
- `SendViewAllCharacterPacket` — request VAC data
- `EnableLoginStartCtrl` — enable/disable login controls

## CUILoginDesc (Login Description)
- Plain CWnd, login screen description panel
- `OnCreate` (0x13e) — minimal setup
- `Draw`/`Update` — stub functions (5 bytes each)

## CUISoftKeyboard
- On-screen keyboard for PIN entry
- Used during PIN login step

## CUIBlockUser
- Block user dialog (modal)
- Button 1000 = Block (calls SetResult), nId 1001-1002 = Cancel
- `OnCreate` (0xc3e bytes) — creates block/unblock UI
- `SetResult` — processes block result
- `Draw` — renders dialog

## CUICharacterSale
- Character sale/delete confirmation
- Used for character deletion with name input

## CUIEnchantDlg
- Item enchantment dialog
- Inherits CUniqueModeless (modeless dialog)
- Used for potential scrolling

## CUIKarmaDlg
- Karma scissors dialog
- Inherits CUniqueModeless
- Used for karma (trade block) removal

## CUIUnreleaseDlg
- Item unrelease dialog
- Inherits CUniqueModeless
- Used for item un-releasing (reverse of release)

## CUIRaiseWndBase
- Base class for "Raise" item system (Monster Life)
- `PutItem` — place item in raise slot
- `EnableDrop` — enable/disable drop
- `GetEnableDropItemIndex` — find droppable slot
- `_LoadLayer` (0x51e bytes) — load WZ layer for raise UI

## CUINewCharAvatarSelect
- New character avatar selection (part of character creation)
- Select hair/face/color for new character

## CUINewCharJobSelect
- New character job selection (part of character creation)
- Select job class for new character

## CUIChangingLicenseNotice
- License change notice dialog
- Shown during certain account operations

## CUITransferWorldLicenseNotice
- World transfer license notice
- Shown during world transfer

## CUIAdminShopWishList
- Admin shop wish list
- Used for GM shop functionality

## CUICakePieEventItemInfo
- Cake/Pie event item information display
- Event-specific UI for item rewards

## CUIReceiveGift
- Gift receive dialog (modal)
- Used when receiving cash shop gifts

## CUISendGifts
- Gift send list (modal)
- Shows friends/guild members for gift targeting
- `GetMemberIDFromPoint` — hit test for member list
- `SetScrollBar` — scroll through member list
- Has `FRIEND` and `GUILD` nested structs

## CUIIncubator (already audited)
- Pet incubator dialog
- Button 2000 = Incubate, sends opcode 85
