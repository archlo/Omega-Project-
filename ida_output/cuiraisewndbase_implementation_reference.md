# CUIRaiseWndBase — Full Implementation Reference

## Class Structure
- Base class for Monster Life "Raise" item system
- Inherits CUIWnd

## PutItem (0x8380b0) — 135 bytes
- Place item in raise slot
- Validates item can be raised

## EnableDrop (0x837e30)
- Enable/disable drop for a slot

## GetEnableDropItemIndex (0x838140) — 46 bytes
- Find slot that accepts drops

## _LoadLayer (0x838360) — 1310 bytes
- Load WZ layer for raise UI
- Creates visual display for raise items

## OnMouseMove (0x838010) — 152 bytes
- Tooltip on hover

## HitTest (0x837df0) — 52 bytes
- Hit test for raise slots

## OnMouseEnter (0x837dd0) — 21 bytes
- Mouse enter event

## Key Methods
- `Draw` — renders raise grid
- `OnCreate` — creates raise UI
- `OnButtonClicked` — button handler
