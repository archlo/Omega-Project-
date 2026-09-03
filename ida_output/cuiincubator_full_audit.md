# CUIIncubator Full Audit — IDA Decompilation Findings

Generated: 2026-07-11

## Class Structure

**CUIIncubator** inherits CUIWnd.

### OnButtonClicked (0x7ca660)
- **nId=2000**: Incubate selected item
  - Shows confirmation via `CItemInfo::GetGachaponMsg` + `CUtilDlg::YesNo`
  - Sends opcode 85 (ConsumeCashItemUseRequest) with: `update_time, m_nPOS, m_nItemID, m_nItemTI, m_nSlotPosition`
  - Validates: HP > 0, not in cash shop, 500ms cooldown

### Key Methods
- Constructor (0x7ca8b0, 0xcc0) — large, creates full incubator UI
- `OnCreate` (0x7cb7a0, 0x31f) — button setup
- `PutItem` (0x7ca3f0, 0x178) — place item in incubator slot
- `Draw` (0x7ca390, 0x5a) — render
- `OnMouseMove` (0x7ca570, 0xe5) — tooltip
