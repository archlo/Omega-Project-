# CUIChannelSelect Full Audit — IDA Decompilation Findings

Generated: 2026-07-11

## Class Structure

**CUIChannelSelect** inherits CUIWnd. Singleton via `TSingleton<CUIChannelSelect>`.

### GetRect (0x602140) — ALIGNMENT ANCHOR
```c
result->left = 66 * (nIdx % 5) + 23;
result->top = 29 * (nIdx / 5) + 93;
result->right = 66 * (nIdx % 5) + 84;
result->bottom = 29 * (nIdx / 5) + 114;
```
- 5 columns, 66px wide, 23px left margin
- 29px row height, 93px top margin
- Slot size: 61×21 per channel entry

### OnButtonClicked (0x6035f0)
- Only button nId=1000 (OK button) triggers `EnterChannel(m_nSelect)`
- Checks `IsRequestValid()` first

### Other Methods
- `OnCreate` (0x606a10, 0x3f2) — setup
- `Draw` (0x6056d0, 0xb34) — renders channel grid
- `ResetInfo` (0x606210, 0x3ad) — resets channel data
- `SetSelected` (0x603200, 0x2d7) — select a channel
- `SelectChannel` (0x6034e0, 0x81) — channel selection logic
- `EnterChannel` (0x603570, 0x34) — enter selected channel
- `GetChannelIDFromPt` (0x6029f0, 0x6d) — hit test
- `OnMouseButton` (0x603620, 0x85) — mouse click
- `OnKey` (0x6036b0, 0x2d0) — keyboard navigation
- `DrawNoticeConnecting` (0x602ba0, 0xd2) — "Connecting..." notice
- `IsRequestValid` (0x602190, 0x2a) — validate request state
