# CUIMiniMap — Full Implementation Reference

## 3 Modes (m_nOption)
- **0**: Expanded normal (210×112 cap)
- **1**: Expanded huge (420×225 cap)
- **2**: Collapsed (title only)

## 2 Minimap Types (m_nMiniMapType)
- **0**: Simple — has 1002(worldmap), 1000(minimize), 1003(2X) buttons
- **1**: Normal — has 1001(maximize), 1000(minimize), 1002(worldmap) buttons

## Button Positions
- `(winWidth - 46, 4)`, `(winWidth - 59, 4)`, `(winWidth - 72, 4)`

## Edge Arrows
- `CalcAngle` uses law of cosines on 3 points
- Returns acute angle for 8-directional selection

## Position Saving
- `CreateUIWndPosSaved` with key 10 → localStorage `'MiniMapWndPos'`

## Foothold Rendering
- `_drawFootholds()` draws foothold segments as white lines
- Uses `MiniMapData.Footholds` array (x1,y1,x2,y2,layer)

## Ladder/Rope Rendering
- `_drawLadderRopes()` draws ladders (red) and ropes (blue) as vertical lines
- Uses `MiniMapData.LadderRopes` array (x,y1,y2,isLadder)

## Data Flow
- `FieldScene._finalizeMiniMapData()` converts `_footholds` + `_ladderRopes` into `MiniMapData` after both load

## UserMiniMapClick
- Opcode 166 in InHeader
- `GameSender.UserMiniMapClick()` — sent when player clicks minimap dot
