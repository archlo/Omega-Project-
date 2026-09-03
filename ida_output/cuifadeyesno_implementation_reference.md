# CUIFadeYesNo — Full Implementation Reference

## Type-Based Routing (OnButtonClicked)
Button 2000 = Yes/Accept, Button 2001 = No/Decline

| m_nType | Action | Opcode | Packet Format |
|---------|--------|--------|---------------|
| 0 | Messenger invite | — | `CUIMessenger::TryNew(m_dwSN)` |
| 1 | Friend registration | — | `CField::SendAcceptFriendMsg(m_dwFriendID)` |
| 2 | Trade invite | — | `CMiniRoomBaseDlg::SendInviteResult(m_dwSN, 0)` |
| 3 | Cash trade invite | — | `CMiniRoomBaseDlg::SendCashInviteResult(m_dwSN, 0)` |
| 4 | Memo list | — | `TryShowMemoListDlg(446, 92)` |
| 5 | Party invite | 146 | `Encode1(0x1B), Encode4(inviterID)` |
| 6 | Guild invite | 167 | `Encode1(4), Encode4(inviterID), EncodeStr(guildName)` |
| 7 | Quest clear | — | `ShowQuestInfoDetail(1, questID)` |
| 8 | Alliance invite | 149 | `Encode1(6), Encode4(inviterID), Encode4(allianceID)` |
| 10 | Parcel delivery | 70 | `Encode1(0), Encode4(0xFFFFFFFF), Encode4(2)` |
| 11 | Quest detail view | — | `ShowQuestInfoDetail(0, questID)` |
| 12 | Family invite | — | `CUtilDlg::YesNo` confirm → `SendFamilyInviteResult` |
| 13 | Expedition apply | 148 | `Encode1(0x56), Encode4(0xD), Encode4(applierID)` |
| 14 | Expedition invite | — | `ExpeditionIntermediary::SendResponseInvitePacket(inviter, 1)` |
| 15 | Expedition apply (alt) | 148 | Same as type 13 |
| 16 | Follow request | — | `SendFollowRequestApply(1)` / `SendFollowRequestApply(0)` |
| 17 | New Year card | 183 | `Encode1(1), Encode4(m_dwSN)` |

## Create Methods
- `CreateMSMInvite(name, id, sn)` → type 0
- `CreateFriendReg(name, id, friendID)` → type 1
- `CreateTradeInvite(name, id, sn, bCash)` → type 2/3
- `CreateNewMemo()` → type 4
- `CreatePartyInvite(name, id, inviterID, bGameOpt)` → type 5
- `CreateGuildInvite(name, id, inviterID, guildID)` → type 6
- `CreateQuestClear(questID)` → type 7
- `CreateAllianceInvite(name, allianceID)` → type 8
- `CreateUserAlarm(name, id)` → type 11
- `CreateParcelAlarm(name, bQuickDelivery)` → type 10
- `CreateNewYearCardArrived(name, sn)` → type 17
- `CreateFamilyInvite(name, id, inviterID)` → type 12
- `CreateFollowRequest(name, id, inviterID)` → type 16
- `CreatePartyQuestAlarm(questID)` → type 11
- `CreateExpedtionApply/Invite(name, id, ...)` → type 13/14/15

## Key Fields
- `m_nType` — dialog type (0-17)
- `m_dwSN`, `m_dwInviterID`, `m_dwFriendID`, `m_dwApplierID` — IDs
- `m_usQuestID` — quest ID
- `m_sInviter` — inviter name
- `m_bGameOpt_Party`, `m_bGameOpt_Guild`, `m_bQuickDelivery` — settings
- `m_bOnceClicked` — prevent double-click

## Close Behavior
- Type 4 (Memo): Only closes if `CWvsContext+4045` is 0
- All others: `CFadeWnd::Close(1)`
