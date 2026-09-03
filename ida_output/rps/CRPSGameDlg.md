# CRPSGameDlg Decompilation Summary

## Class: CRPSGameDlg (316 bytes)
Inherits: CUniqueModeless → CDialog → CWnd → IGObj + IUIMsgHandler + ZRefCounted

## Struct Layout (v95_symbols.txt:17229)
```
+0000 CUniqueModeless
+0094 int m_bRequestSent
+0098 unsigned int m_dwNpcTemplateID
+009C int m_tShowResult
+00A0 int m_nUserSelect          // 0=rock, 1=paper, 2=scissor
+00A4 int m_nNpcSelect           // -1=unknown, 0-2=RPS choice
+00A8 int m_nNpcCurShown         // animation frame (cycles 0-2)
+00AC int m_tLastSwitched        // last animation switch time
+00B0 int m_tSwitchingTerm       // animation interval (ms)
+00B4 int m_tLimit               // 30s selection timer
+00B8 int m_nCntStraightVictories // negative=loss, 0=first, positive=streak
+00BC int m_bReceiveCompensation
+00C0 int m_tShowResultLayer     // result display timer
+00C4 int m_tEndResult           // result end timer
+00C8 unsigned int m_nLastTipOption
+00CC int m_nCurTipLength        // tip text pixel width
+00D0 int m_nTipPos              // tip scroll position
+00D4 ZXString<char> m_sTip
+00D8 ZRef<CCtrlButton> m_pBtMain
+00E0 ZRef<CCtrlButton>[3] m_pBtRPS
+00F8 ZRef<CCtrlButton> m_pBtExit
+0100 ZRef<CAvatar> m_pAvatar
+0108 IWzGr2DLayer m_pLayerNpc
+010C IWzCanvas[2][3] m_pCanvasRPS  // [user/npc][rock/paper/scissor]
+0124 IWzGr2DLayer m_pLayerResult
+0128 IWzCanvas[4] m_pCanvasResult  // [tie/loss/win/final]
+0138 IWzGr2DLayer m_pLayerTip
```

## Button IDs
```
ID_CTRL_BT_ROCK    = 0x7D0 (2000)
ID_CTRL_BT_PAPER   = 0x7D1 (2001)
ID_CTRL_BT_SCISSOR = 0x7D2 (2002)
ID_CTRL_BT_START   = 0xBB8 (3000)
ID_CTRL_BT_CONTINUE = 0xBB9 (3001)
ID_CTRL_BT_RETRY   = 0xBBA (3002)
ID_CTRL_BT_EXIT    = 0xBBB (3003)
```

## Client→Server Protocol (CP_RPSGame = 0xa0 = 160)
All packets: COutPacket(160) + Encode1(subOpCode)
```
SubOp 0: Start game
SubOp 1: Send selection (Encode1(rpsChoice)) — 0=rock, 1=paper, 2=scissor
SubOp 2: Timeout
SubOp 3: Continue (after win streak)
SubOp 4: Exit
SubOp 5: Retry
```

## Server→Client Protocol (LP_RPSGame = 0x173 = 371)
OutHeader.RPSGameDlg, first byte = subAction:
```
SubAction 6:  Game error (StringPool 3724)
SubAction 7:  Game unavailable (StringPool 3723)
SubAction 9:  Start selection — enable RPS buttons, 30s timer, NPC animates
SubAction 10: Game over — final result
SubAction 11: Result — Decode1(npcSelect) + Decode1(cntStraightVictories)
SubAction 12: Continue selection (re-enable after continue)
SubAction 14: Game closed
```

## OG Flow
1. NPC dialog triggers RPSGameDlg constructor(dwNpcTemplateID)
2. Constructor loads WZ from StringPool 0xE71, creates dialog
3. OnCreate creates 3 RPS buttons + exit button, sets up layers
4. SetNpc loads NPC template, creates animated layer at (256,261)
5. SetUserAvatar creates player avatar at (52,261) with action 1
6. Server sends subAction 9 → enable buttons, start 30s timer
7. NPC animation cycles every 120ms (m_tSwitchingTerm)
8. User clicks RPS button → SendSelection(choice) → disable buttons
9. Server sends subAction 11 → ProcessPacket reads npcSelect + streak
10. ShowResult: determines win/loss/tie, inserts result canvas
11. Result displays for 1s (m_tShowResultLayer), then 3s (m_tEndResult)
12. If tie: restart selection. If win: show Continue. If loss: show Retry.

## Decompile Addresses
```
0x6d6ba0 CRPSGameDlg::CRPSGameDlg(ulong)
0x6d7480 CRPSGameDlg::OnCreate(void*)
0x6d5e00 CRPSGameDlg::Draw(tagRECT const*)
0x6d6f40 CRPSGameDlg::OnButtonClicked(uint)
0x6d6ae0 CRPSGameDlg::SendSelection(long)
0x6d72d0 CRPSGameDlg::ProcessPacket(long, CInPacket&)
0x6d9e00 CRPSGameDlg::OnPacket(CInPacket&)
0x6d70e0 CRPSGameDlg::SetMainButton(long)
0x6d5fb0 CRPSGameDlg::SetNpc(void)
0x6d6ff0 CRPSGameDlg::SetUserAvatar(void)
0x6d8e80 CRPSGameDlg::Update(void)
0x6d5350 CRPSGameDlg::ShowResult(void)
0x6d6900 CRPSGameDlg::OnBtContinue(void)
0x6d6a40 CRPSGameDlg::OnBtExit(void)
0x6d69a0 CRPSGameDlg::OnBtRetry(void)
0x6d6860 CRPSGameDlg::OnBtStart(void)
```
