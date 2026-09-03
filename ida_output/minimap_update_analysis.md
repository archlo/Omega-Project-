# CUIMiniMap::Update — OG Flow Analysis

## Update Function Structure (from IDA decompilation)

### Phase 1: Layer Positioning
```
1. Set m_pLayerBack position based on m_nPane_X, m_nPane_Y
```

### Phase 2: CalculateScr
```
2. Call CalculateScr() to compute m_nScrOrig_X/Y from m_nLocal_X/Y
```

### Phase 3: Mode Check
```
3. Check m_nOption:
   - If m_nOption == 2 → draw collapsed strip, return
   - Otherwise → continue to expanded mode
```

### Phase 4: SetSize (already called in ToggleMap)
```
4. SetSize sets:
   - m_nPane_W, m_nPane_H based on canvas size and caps
   - m_nMag based on m_nMiniMapType and m_nOption
```

### Phase 5: Draw Map Canvas
```
5. If m_nMiniMapType == 0 (simple mode):
   - Use m_pSimple_Canvas (normal) or m_pSimple_Canvas_Huge (huge)
   - Draw at pane position
6. If m_nMiniMapType == 1 (normal mode):
   - Use m_pMini_Canvas
   - Draw at pane position with scroll offset from CalculateScr
```

### Phase 6: Draw Footholds
```
7. MakeConvexLayer — draw foothold lines
```

### Phase 7: Draw Ladder/Ropes
```
8. LoadLadderRope — draw ladders (red) and ropes (blue)
```

### Phase 8: Draw Icons
```
9. DrawIcons in order:
   a. NPCs (m_aPtNpc) — with quest icons
   b. Remote users (from CUserPool)
   c. Party members
   d. Stalkees (m_mStalkee)
   e. Shop employees
   f. Player (last, on top)
```

### Phase 9: Draw Edge Arrows
```
10. For offscreen entities, draw edge arrows
```

### Phase 10: Draw Title
```
11. Draw street name + map name using IWzFont
```

### Phase 11: Button State
```
12. Update button enable/disable based on m_nOption and m_nMiniMapType
```

---

## Key Differences from Our Implementation

### 1. Map Canvas Drawing
- **OG**: Uses CalculateScr to scroll the canvas viewport
- **Ours**: Draws canvas centered or scrolled — FIXED

### 2. Simple Mode Canvas
- **OG**: Uses m_pSimple_Canvas (normal) or m_pSimple_Canvas_Huge (huge)
- **Ours**: Now loads from WZ and uses when m_nMiniMapType=0 — FIXED

### 3. Icon Drawing Order
- **OG**: NPCs → Remote Users → Party → Stalkees → Shops → Player
- **Ours**: Portals → Merchants → NPCs → Others → Party → Stalkees → Player — DIFFERENT

### 4. Edge Arrows
- **OG**: Uses CalcAngle for edge arrows
- **Ours**: Uses atan2 — MAY DIFFER

### 5. Title Rendering
- **OG**: Uses IWzFont (m_pFont, m_pFontMapName)
- **Ours**: Uses PixiJS Text — DIFFERENT

### 6. Button State Management
- **OG**: Updates button enable/disable in Update
- **Ours**: Updates in _layoutButtons — SHOULD BE SAME
