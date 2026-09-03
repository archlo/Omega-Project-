# CUIIncubator — Full Implementation Reference

## Constructor (0x7ca8b0) — 3264 bytes
- Large constructor creating full incubator UI
- Has: `m_pSelectedItem`, `m_nItemID`, `m_nItemTI`, `m_nSlotPosition`, `m_nPOS`
- Creates item slot, incubate button, close button

## OnButtonClicked (0x7ca660)
- **nId=2000**: Incubate
  1. Check `m_pSelectedItem` exists
  2. `CItemInfo::GetGachaponMsg(itemId, 4)` — get confirmation text
  3. `CUtilDlg::YesNo(...)` — show confirmation
  4. If confirmed:
     - `COutPacket(85)` — opcode 85 (ConsumeCashItemUseRequest)
     - `Encode4(update_time)` — timestamp
     - `Encode2(m_nPOS)` — slot position
     - `Encode4(m_nItemID)` — item ID
     - `Encode4(m_nItemTI)` — item tab index
     - `Encode4(m_nSlotPosition)` — inventory slot
  5. Validate: HP > 0, not in cash shop, 500ms cooldown
  6. Send packet

## PutItem (0x7ca3f0) — 376 bytes
- Place item in incubator slot
- Updates display

## Draw (0x7ca390) — 90 bytes
- Renders incubator with item in slot

## Key Fields
- `m_pSelectedItem` — ZRef<GW_ItemSlotBase>
- `m_nItemID` — item template ID
- `m_nItemTI` — item tab index (1=equip, 2=use, etc.)
- `m_nSlotPosition` — inventory slot position
- `m_nPOS` — incubator position
