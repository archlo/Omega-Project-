# CUIChangingLicenseNotice / CUITransferWorldLicenseNotice / CUIAdminShopWishList / CUICakePieEventItemInfo — Implementation Reference

## CUIChangingLicenseNotice
- License change notice dialog
- Shown during certain account operations
- Simple notice with OK button

## CUITransferWorldLicenseNotice
- World transfer license notice
- Shown during world transfer
- Simple notice with OK button

## CUIAdminShopWishList
- Admin shop wish list (GM functionality)
- Shows wish list items
- Used for GM shop management

## CUICakePieEventItemInfo
- Cake/Pie event item information display
- Event-specific UI for item rewards
- Shows event item details
- Has: `m_nItemID`, event timer, item display
- `OnCreate` (0x47a3c0) — 275 bytes, creates event UI
- `Draw` (0x47a4e0) — 1760 bytes, renders event item info
- `Update` (0x4791c0) — 816 bytes, update event timer/display
- `OnButtonClicked` (0x4791a0) — 24 bytes, button handler
