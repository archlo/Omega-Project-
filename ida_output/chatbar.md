# CUIStatusBar ChatBar — Complete Deep IDA Audit (Final)

## Critical Finding: WZ Paths

**Chat layers are under `StatusBar2.img/mainBar/`, NOT `StatusBar2.img/chat/`**

The TS was loading from `StatusBar2.img/chat` which doesn't exist. All chat WZ assets are under `StatusBar2.img/mainBar/`.

### Verified WZ Paths from OnCreate (line 1776-2383)

**Chat layers (from mainBar):**
| Path | Purpose |
|------|---------|
| `UI/StatusBar2.img/mainBar/chatSpace` | Chat space background layer |
| `UI/StatusBar2.img/mainBar/chatSpace2` | Chat space background 2 layer |
| `UI/StatusBar2.img/mainBar/chatEnter` | Chat input background layer |
| `UI/StatusBar2.img/mainBar/chatCover` | Chat send button cover layer |
| `UI/StatusBar2.img/mainBar/chatOpen` | Chat open button |
| `UI/StatusBar2.img/mainBar/chatClose` | Chat close button |

**Filter buttons (from chat):**
| Path | Purpose |
|------|---------|
| `UI/StatusBar2.img/chat/Tap/all` | All filter button |
| `UI/StatusBar2.img/chat/Tap/friend` | Friend filter button |
| `UI/StatusBar2.img/chat/Tap/party` | Party filter button |
| `UI/StatusBar2.img/chat/Tap/guild` | Guild filter button |
| `UI/StatusBar2.img/chat/Tap/association` | Alliance filter button |
| `UI/StatusBar2.img/chat/Tap/expedition` | Expedition filter button |

**Other StatusBar assets:**
| Path | Purpose |
|------|---------|
| `UI/StatusBar2.img/mainBar/backgrnd` | StatusBar background |
| `UI/StatusBar2.img/mainBar/lvBacktrnd` | Level background |
| `UI/StatusBar2.img/mainBar/lvCover` | Level cover |
| `UI/StatusBar2.img/mainBar/notice` | Notice area |
| `UI/StatusBar2.img/mainBar/gaugeBackgrd` | Gauge background |
| `UI/StatusBar2.img/mainBar/gaugeCover` | Gauge cover |
| `UI/StatusBar2.img/mainBar/lvNumber` | Level number font |
| `UI/StatusBar2.img/mainBar/BtChat` | Chat button |
| `UI/StatusBar2.img/mainBar/BtClaim` | Claim button |
| `UI/StatusBar2.img/mainBar/BtCharacter` | Character button |
| `UI/StatusBar2.img/mainBar/BtStat` | Stat button |
| `UI/StatusBar2.img/mainBar/BtQuest` | Quest button |
| `UI/StatusBar2.img/mainBar/BtInven` | Inventory button |
| `UI/StatusBar2.img/mainBar/BtEquip` | Equip button |
| `UI/StatusBar2.img/mainBar/BtSkill` | Skill button |
| `UI/StatusBar2.img/mainBar/BtKeysetting` | Key setting button |
| `UI/StatusBar2.img/mainBar/BtChannel` | Channel button |
| `UI/StatusBar2.img/mainBar/BtCashShop` | Cash shop button |
| `UI/StatusBar2.img/mainBar/BtMenu` | Menu button |
| `UI/StatusBar2.img/mainBar/BtSystem` | System button |
| `UI/StatusBar2.img/mainBar/BtMTS` | MTS button |
| `UI/StatusBar.img/base/chatTarget` | Combo box background |

---

## All 34 CUIStatusBar Chat Functions

### Chat Core (13)
| Address | Function | Purpose | TS |
|---------|----------|---------|-----|
| 0x87b5f0 | OnCreate | Creates chat UI, fonts, WZ layers | ⚠️ |
| 0x870ba0 | MakeCtrlEdit | Creates edit+combo controls | ❌ |
| 0x879c00 | SetChatType | Switch 1=min/2=small/3=expanded | ⚠️ |
| 0x87aec0 | ChatLogAdd | Add message to log | ⚠️ |
| 0x877b40 | ChatLogDraw | Render chat with WZ fonts | ❌ |
| 0x87a540 | ChangeChatWndSize | Drag resize 13px grid | ✅ |
| 0x87fd30 | SetChatTarget | Switch target 0-8 | ⚠️ |
| 0x87a4b0 | StartChat | Activate input | ✅ |
| 0x87a520 | EndChat | Deactivate input | ✅ |
| 0x86dc30 | _ResetChatBarPos | Reposition layers+filters | ❌ |
| 0x879b70 | _RefreshChatLog | Auto-scroll 5s timeout | ⚠️ |
| 0x86de40 | _GetFilteredChatLogCount | Count filtered msgs | ❌ |
| 0x877970 | ResetButtonToolTip | Reset filter tooltips | ❌ |

### Input/Key (2)
| Address | Function | Purpose | TS |
|---------|----------|---------|-----|
| 0x87fde0 | OnKey | Enter/Tab/Escape/Arrow | ⚠️ |
| 0x8803f0 | OnMouseButton | Left/right click | ⚠️ |

### Buttons (1)
| Address | Function | Purpose | TS |
|---------|----------|---------|-----|
| 0x880540 | OnButtonClicked | 20+ button IDs | ⚠️ |

### Message Sending (2)
| Address | Function | Purpose | TS |
|---------|----------|---------|-----|
| 0x87b3e0 | SendCoupleMessage | Married couple msg | ❌ |
| 0x87f7f0 | SendGroupMessage | Guild/party/alliance | ❌ |

### Whisper (3)
| Address | Function | Purpose | TS |
|---------|----------|---------|-----|
| 0x871830 | SetWhisperTarget | Set whisper name | ⚠️ |
| 0x4d97c0 | GetWhisperTarget | Get whisper name | ❌ |
| 0x879a50 | AddWhisperCandidate | Add to autocomplete | ❌ |
| 0x532150 | SetWhisperTargetFromCandidate | Pick from list | ❌ |

### Chat History (3)
| Address | Function | Purpose | TS |
|---------|----------|---------|-----|
| 0x4aa090 | CChatHelper::HistoryAdd | Add to history | ⚠️ |
| 0x4aa230 | CChatHelper::HistoryUp | Navigate up | ⚠️ |
| 0x4aa2c0 | CChatHelper::HistoryDown | Navigate down | ⚠️ |

### Other (3)
| Address | Function | Purpose | TS |
|---------|----------|---------|-----|
| 0x8706e0 | GetEmotionKey | Parse smiley commands | ❌ |
| 0x873140 | ProcessToolTip | Process tooltips | ❌ |
| 0x874290 | TryUseTempExp | Use temp exp | ❌ |

---

## CChatHelper History System

### Struct (size=44)
```
+0008  ZArray<ZXString<char>>   m_asHistory;     // max 8 entries
+000C  ZArray<ZXString<char>>   m_asRecent;      // recent messages
+0010  unsigned int[4]          m_dwChatTimeStamp;
+0020  int                      m_nChatIndex;
+0024  int                      m_nHistoryIndex; // navigation index
+0028  int                      m_bUseHistory;
```

### HistoryAdd Logic
1. Check if last entry matches new message (avoid duplicates)
2. If not duplicate → InsertBefore(-1) (append to end)
3. If current index matches → set m_bUseHistory=1
4. Trim array to max 8 entries
5. Reset m_nHistoryIndex if out of bounds

### HistoryUp Logic
1. If m_bUseHistory → increment index, reset flag
2. Decrement m_nHistoryIndex (min 0)
3. Return history[m_nHistoryIndex]

### HistoryDown Logic
1. If m_bUseHistory → increment index, reset flag
2. Increment m_nHistoryIndex
3. Return history[m_nHistoryIndex]

---

## Chat Key Handling (OnKey)

| Key | VK | Action |
|-----|-----|--------|
| Tab | 9 | Cycle 9 targets (0→6→2→3→4→5→whisper→8→0) |
| Enter | 13 | Send message + EndChat |
| Escape | 27 | Clear input + EndChat |
| Left | 37 | If empty → EndChat |
| Right | 39 | If empty → EndChat |
| Up | 38 | HistoryUp → set edit text |
| Down | 40 | HistoryDown → set edit text |

---

## Button IDs (OnButtonClicked)

### Chat-specific (0x3E8-0x3FB)
| ID | Action |
|----|--------|
| 1000 | Cash Shop |
| 1001 | Maple Trade Space |
| 1002 | Shortcuts |
| 1003 | SetChatType(1) minimal |
| 1004 | SetChatType(3) expanded |
| 1005 | UI_Toggle(5) |
| 1006 | ToggleQuickSlot |
| 1007 | UI_Menu |
| 1008 | SetChatTarget(7) whisper |
| 1009 | SendClaim |
| 1013 | ChannelShift |
| 1014-1019 | Filter toggles (XOR on m_dwChatFilterFlag) |

### StatusBar (0x7D1-0x7D5)
| ID | Action |
|----|--------|
| 2001 | UI_Toggle(0) + blink |
| 2002 | UI_Toggle(2) + blink |
| 2003 | UI_Toggle(3) + blink |
| 2004 | SendCharacterInfoRequest or UI_Close(10) |
| 2005 | UI_Toggle(6) |

---

## Chat Message Flow (OnKey Enter)

1. Get text from edit control
2. EndChat (minimal if was small)
3. Sanitize: replace DBCS + control chars with spaces
4. Trim whitespace
5. If '/' → SendChatMsgSlash (command)
6. Else → CChatHelper::TryChat (process target prefix)
7. Route by target:
   - 0-5 → SendGroupMessage(target, text)
   - 6 → SendCoupleMessage(text)
   - 8 → SendChatMsg(field, text, 0)
8. Check emotion key → SendEmotionChange
9. Parse pet commands

---

## TS Implementation Gaps

### Critical
1. **WZ paths wrong** — Chat layers under `mainBar/`, not `chat/`
2. **Combo box** — OG uses CCtrlComboBox. TS uses Graphics dropdown
3. **Tab key** — OG cycles 9 targets. TS has no Tab
4. **Enter routing** — OG sanitizes+routes. TS fires callback
5. **Chat history** — OG has CChatHelper. TS basic array

### Important
6. **Chat text** — OG uses WZ layer + 27 WZ fonts. TS PixiJS Text
7. **Chat width** — OG 577/502 minus m_nScrWidth. TS 420
8. **Filter buttons** — OG loads from WZ `chat/Tap/*`. TS Graphics
9. **_ResetChatBarPos** — Not implemented
10. **_RefreshChatLog** — Auto-scroll partial
11. **m_pLayerChatLog** — OG separate WZ layer. TS none

### Minor
12. Right-click memo list + temp exp
13. Emotion/smile parsing
14. Pet command routing
15. SendCoupleMessage / SendGroupMessage
16. Whisper autocomplete system
17. Left/Right arrow EndChat
18. Button tooltips
