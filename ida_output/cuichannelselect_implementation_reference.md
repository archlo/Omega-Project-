# CUIChannelSelect — Full Implementation Reference

## GetRect (0x602140) — ALIGNMENT ANCHOR
```c
left = 66 * (nIdx % 5) + 23
top = 29 * (nIdx / 5) + 93
right = 66 * (nIdx % 5) + 84
bottom = 29 * (nIdx / 5) + 114
```
- 5 columns × N rows
- Slot width: 61px (84-23=61, but 66 stride)
- Row height: 29px (114-93=21, but 29 stride)
- Left margin: 23px
- Top margin: 93px

## OnButtonClicked (0x6035f0)
- Only nId=1000 (OK button) triggers `EnterChannel(m_nSelect)`
- Checks `IsRequestValid()` first

## Key Methods
- `OnCreate` (0x606a10) — creates channel grid
- `Draw` (0x6056d0) — renders channel entries with status icons
- `ResetInfo` (0x606210) — loads channel data from server
- `SetSelected` (0x603200) — highlight selected channel
- `SelectChannel` (0x6034e0) — channel selection logic
- `EnterChannel` (0x603570) — send enter channel packet
- `GetChannelIDFromPt` (0x6029f0) — hit test for channels
- `OnMouseButton` (0x603620) — click handling
- `OnKey` (0x6036b0) — keyboard navigation
- `DrawNoticeConnecting` (0x602ba0) — "Connecting..." overlay
- `IsRequestValid` (0x602190) — validate state
