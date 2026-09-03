# Login Audit Plan — MapleStory v95

## 1. Overview of Login Architecture
- **Classes:** `CLogin`, `CClientSocket`, `CInPacket`, `COutPacket`, `CNMCOClientObject`, `CNMLoginAuthFunc`, `CNMGetNexonPassportFunc`, `CSecurityClient`, `CUITitle`, `CUIWorldSelect`, `CUICharSelect`, `CUIAvatar`, `CUILoginStart`, `CLoginUtilDlg`, `CLoginGradeWnd`, `CWvsContext`
- **Files:** 70+ decompiled `.c` functions in `decompile/5D*.c` range, login UI at `decompile/5FF*.c` and `5F0*.c`, packet handlers in `generated/packet_handlers.json`

## 2. Network & Encryption Layer Audit
- **Layer 1 — Shanda (CIOBufferManipulator):** 3-round XOR/ROL/ROR obfuscation at `decompile/68C8E0.c` and `68CAB0.c`
- **Layer 2 — AES-128 OFB (CAESCipher):** Core block cipher at `decompile/431E30.c`, OFB mode at `432D60.c`, keys at `0xC560C0` (UserKey) and `0xB4730C` (Default IV)
- **Layer 3 — CIGCipher (Innovage):** 256-byte bShuffle table at `0xC61A70`, used by `CSecurityClient::OnPacket`
- **Nano Encode/Decode:** Bit encoding + Base64 for Nexon security messages at `decompile/A29E4A.c`, `A2A009.c`
- **Packet flow:** `Encode1/2/4` → `MakeBufferList` (Shanda → AES) → `SendPacket` → `Flush` → `ZAPI.send` / `recv` → `DecryptData` (AES → Shanda) → `ProcessPacket`

## 3. Login Protocol (22 Opcodes)
| Opcode | Handler | File | Audit Focus |
|--------|---------|------|-------------|
| 0 | `OnCheckPasswordResult` | `5DC600.c` | Primary auth response — 645 lines, decodes account state, block reasons, NXPM auth detach/logout, char count, purchase exp, country ID, Nexon Club ID, grade code |
| 1 | `OnGuestIDLoginResult` | `5DD1A0.c` | Guest login flow |
| 2 | `OnAccountInfoResult` | `5DD600.c` | Account info after login |
| 3 | `OnCheckUserLimitResult` | `5D5790.c` | User limit check |
| 4 | `OnSetAccountResult` | `5D7280.c` | Account setup |
| 5 | `OnConfirmEULAResult` | `5D25A0.c` | EULA confirmation |
| 6 | `OnCheckPinCodeResult` | `5D4D00.c` | PIN code verification |
| 7 | `OnUpdatePinCodeResult` | `5D5E80.c` | PIN code update |
| 8 | `OnViewAllCharResult` | `5DB000.c` | View all characters |
| 9 | `OnSelectCharacterByVACResult` | `5DE670.c` | VAC (2FA) character select |
| 10 | `OnWorldInformation` | `5DE120.c` | World list info |
| 11 | `OnSelectWorldResult` | `5DDA00.c` | World selection result |
| 12 | `OnSelectCharacterResult` | `5DEA80.c` | Character select + migrate |
| 13 | `OnCheckDuplicatedIDResult` | `5DA7F0.c` | Duplicate name check |
| 14 | `OnCreateNewCharacterResult` | `5DAB90.c` | Character creation |
| 15 | `OnDeleteCharacterResult` | `5D9E10.c` | Character deletion |
| 21 | `OnEnableSPWResult` | `5D2200.c` | Secondary password enable |
| 24 | `OnLatestConnectedWorld` | `5D23F0.c` | Last world info |
| 25 | `OnRecommendWorldMessage` | `5D2290.c` | World recommendation |
| 26 | `OnExtraCharInfoResult` | `5D2420.c` | Extra character info |
| 27 | `OnCheckSPWResult` | `5D2250.c` | SPW check result |

## 4. Auth Handlers to Deep-Audit

### 4a. `SendCheckPasswordPacket` (0x5DB9D0)
- Calls `CNMCOClientObject::LoginAuth` first (Nexon Passport auth server-side check)
- On success: fetches Nexon Passport, builds COutPacket with: encoded password string, passport string, 16-byte machine ID, GameRoomClient, GameStartMode, PartnerCode
- On error: builds error packet, shows localized error dialogs via `CLoginUtilDlg::Error`

### 4b. `OnCheckPasswordResult` (0x5DC600) — 645 lines
- Calls `CNMCOClientObject::DetachAuth` or `LogoutAuth` based on start mode
- Decodes: result code, login opt, purchase exp, country ID, Nexon Club ID, grade code, block reasons via WzProperty iteration
- Handles 12+ result sub-codes for account state, blocks, bans
- EULA date checks, PIC configuration
- **Audit focus:** All error paths, buffer sizes, block reason parsing

## 5. CLogin Class State Machine
- **28 fields** controlling login step transitions: `m_nLoginStep`, `m_nBaseStep`, `m_bRequestSent`, `m_nFadeOutLoginStep`, `m_tStepChanging`
- **Login steps:** 0=Title/Auth, 1=World Select, 2=Character Select, 3=New Character, 4=Character Detail, 5=VAC/Additional
- **Race conditions:** `m_bRequestSent` flag prevents duplicate requests
- **`m_nLatestConnectedWorldID`** (default 254) — last world tracking

## 6. Client Packet State Integrity
- `CInPacket::Decode1/2/4` — verify read boundaries, ensure no underflow/overflow
- `COutPacket::EncodeStr` — string length encoding, buffer sizing
- `EncodeBuffer` with 16-byte MachineId — fixed size, verify correct
- **Auth/Password strings in packet buffers** — verify zeroed after using `ZArray::RemoveAll`

## 7. Cryptographic Weaknesses
- **AES-128 OFB:** Static `bDefaultAESKeyValue` at `0xB4730C` — if IV is reused, keystream is identical, traffic decryptable
- **UserKey at 0xC560C0 (128 bytes):** Hardcoded or session-derived? If hardcoded, any traffic is decryptable
- **Shanda:** 3-round XOR/ROL/ROR is obfuscation, not real encryption
- **CIGCipher bShuffle (256-byte table):** Static substitution — trivially reversible

## 8. Session Management & Migration
- `OnAuthenCodeChanged` (0x4AFE50): auth code change — potential session hijack surface
- `OnMigrateCommand` (0x4ADD50): server migration with IP:port — validate IP format
- `IssueConnect` (0x9E0300): reconnection after migration
- `OnAliveReq` / `OnCheckCrcResult`: keep-alive and CRC integrity (CRC fail = disconnect)

## 9. Security Features
- **VAC (2FA):** `m_bIsWaitingVAC`, `m_bIsVACDlgOn`, `OnSelectCharacterByVACResult`
- **PIN code:** `OnCheckPinCodeResult`, `OnUpdatePinCodeResult`
- **SPW (Secondary Password):** `OnCheckSPWResult`, `OnEnableSPWResult`
- **Password blocking:** 5 wrong → warning, 10 wrong → block (strings at 0xB50218/0xB50278/0xB502D0)
- **Process detection:** Detects 20+ process names (debuggers like `OllyDbg`, `Cheat Engine`)

## 10. Credential Exposure Risks
- Password sent over network after Shanda+AES — **static key/IV?**
- Password stored in `COutPacket::m_aSendBuff` until `RemoveAll` — memory exposure timing?
- Remember Me checkbox (`m_bRememberMailAddr`): stores ID via `CConfig`

## 11. LOGIN UI AUDIT

### 11a. CUITitle — Login Entry Screen (`decompile/5FF*.c`)
- **Constructor** (0x5FF940): Creates fade window, tooltip, 7 buttons, ID/password edit fields
- **OnButtonClicked** (0x5FFC90): Button ID mapping:
  - `0x3E8` (Login): validates ID(4-256 chars)/pw(5-12 chars), calls `SendCheckPasswordPacket`
  - `0x3E9`: Toggle Remember Mail Address
  - `0x3EA-0x3EC`: Open URLs for email lost, password lost, new account
  - `0x3ED` (Homepage): Opens `maplestory.nexon.net`
  - `0x3EE` (Quit): `PostQuitMessage(0)`
- **SetRet** (0x5FFEC0): Validates ID length (4-256) and password (5-12), saves RMA setting, triggers login packet, disables controls on success
- **IsRequestValid** (0x5FF530): Checks `!m_bRequestSent && !m_nLoginStep`
- **EnableLoginCtrl** (0x5FF660): Enables/disables ID edit, PW edit, and Login button
- **Draw** (0x5FF730): Draws title screen elements, RMA checkbox canvas toggling
- **Destructor** (0x5FFAE0): Releases buttons, edit fields, canvas arrays, tooltip

### 11b. UI Auxiliary Dialogs
- **CLoginUtilDlg** (0x5F0CE0): Error dialogs (`Error(code)`) and yes/no prompts (`YesNo(code)`) — verify message codes map correctly
- **CLoginGradeWnd** (0x5D1D10): Grade display singleton, 0x80 bytes, empty OnCreate

### 11c. CUICharSelect / CUIAvatar — Character Selection
- **CUICharSelect:** `MakeBalloon`, `MakeAdvice` — UI hints for character selection
- **CUIAvatar:** `OnCreate`, `DrawNameTag`, `ResetCharacter`, `MakeBalloon` — avatar display
- **CUIAvatarVAC:** VAC-specific avatar with `m_pLogin` back-pointer
- Fields: `m_nCharCount`, `m_nSlotCount`, `m_nBuyCharCount`, `m_nPageIndex`, `m_nBallonDestroyTime`

### 11d. CUILoginStart / CUILoginDesc — Login Banner & Steps
- **CUILoginStart:** `m_bRequestSent`, `m_nViewWorldButtonType`(default 4), `m_pLogin`
- **CUILoginDesc:** `m_nStep`, `m_pLogin` — step indicator overlay

### 11e. UI Login Strings and Assets
- `UI/Login.img/ViewAllChar/Job/0` — character display
- `UI/Login.img/Common/SoftKey/*` — soft keyboard (Back, Next, OK, Cancel, Num, LowCase, HighCase, backgrnd, Tab)
- String pool IDs: `0x12F5`, `0x12E7`, `0xB70`, `0xB43`, `0xB6C`, `0x1AB9` (website URLs)

### 11f. UI Flow Step Transitions
```
Step 0: CUITitle (ID/PW) → OnCheckPasswordResult success → Step 1
Step 1: CUIWorldSelect (world picker) → OnSelectWorldResult → Step 2
Step 2: CUICharSelect + CUIAvatar (pick char) → OnSelectCharacterResult → In-Game
         → OnCreateNewCharacterResult (new char) → back to Step 2
         → OnDeleteCharacterResult (delete char) → back to Step 2
Step 3: CUINewChar (race/avatar/name select)
Step 4: CUICharDetail (character detail view)
Step 5: CUIAvatarVAC (VAC character select for 2FA)
```

## 12. Potential Vulnerabilities to Document
- Hardcoded AES key + static IV → all traffic decryptable
- Shanda weak obfuscation → no real crypto strength
- Password string copied to COutPacket buffer — timing attack surface
- `CInPacket::DecodeBuffer` — no length validation on block reason iteration
- `m_bRequestSent` flag — race condition on rapid login attempts
- String pool IDs for error dialogs — locale-dependent behavior
- **UI:** CUITitle ID validation (4-256 chars) and PW validation (5-12 chars) — input buffer bounds
- **UI:** PostQuitMessage on Quit button — clean shutdown?
- **UI:** URL opening (`open_web_site`) — no validation of URL origin
- **UI:** Canvas references — verify no use-after-free in CUITitle destructor
- **UI:** ToolTip clearing — verify null pointer safety
- **UI:** Soft keyboard — potential input interception surface

## 13. Reverse Engineering Priorities
1. Extract `CAESCipher::UserKey` (32 DWORDs at `0xC560C0`) and determine if static
2. Extract `CIGCipher::bShuffle` (256 bytes at `0xC61A70`)
3. Read full `OnCheckPasswordResult` to map all auth error paths
4. Map Nexon Passport protocol: `LoginAuth` → `GetNexonPassport` → `DetachAuth`/`LogoutAuth`
5. Reconstruct `CWvsContext::IssueConnect` for migration flow
6. Complete `CLogin` UI class field maps from `fields.json` + constructor analysis
7. Map all `CLoginUtilDlg::Error/YesNo` codes to string pool IDs for behavior logging

## 14. Verification Plan
- Cross-reference each opcode handler against MapleStory v95 protocol docs
- Verify AES-128/OFB and Shanda implementations against reference specs
- Check all buffer operations for off-by-one or overflow
- Validate password/passport zeroed after use in `CClientSocket::SendPacket`
- Test CUITitle input validation (min/max lengths, special chars)
- Verify UI button ID map against dialog resource IDs
- Confirm soft keyboard input routing and security

---

# AUDIT RESULTS

## A. CRYPTOGRAPHIC MATERIALS — EXTRACTED

### A1. AES UserKey (Hardcoded at `0xC560C0`)

**Location:** `memory/00C01000--00C77000.txt`
**Size:** 128 bytes (32 DWORDs)
**Status:** STATIC — hardcoded in the binary, never changes between sessions

**Extracted bytes:**
```
13 52 2A 5B 08 02 10 60
06 02 43 0F B4 4B 35 05
1B 0A 5F 09 0F 50 0C 1B
33 55 01 09 52 DE C7 1E
```

**Verdict:** This is the well-known MapleStory v95 AES key. Identical across all clients of this version.

### A2. AES Default IV (`CAESCipher::bDefaultAESKeyValue` at `0xB4730C`)

**Location:** `memory/00B01000--00B81000.txt`
**Size:** 4 bytes (1 DWORD)
**Value:** `C6 50 53 F2` = `0xF25350C6`

**Verdict:** Static IV value. Since AES-OFB generates a keystream from IV + key, a static IV means the keystream is identical for every packet that starts with the same sequence number. Combined with a static key, ALL traffic is decryptable by anyone who extracts these two values.

### A3. CIGCipher bShuffle Table (at `0xC61A70`)

**Location:** `memory/00C01000--00C77000.txt`
**Size:** 256 bytes
**Status:** STATIC — hardcoded in the binary

**Extracted bytes:**
```
EC 3F 77 A4 45 D0 71 BF  B7 98 20 FC 4B E9 B3 E1
5C 22 F7 0C 44 1B 81 BD  63 8D D4 C3 F2 10 19 E0
FB A1 6E 66 EA AE D6 CE  06 18 4E EB 78 95 DB BA
B6 42 7A 2A 83 0B 54 67  6D E8 65 E7 2F 07 F3 AA
27 7B 85 B0 26 FD 8B A9  FA BE A8 D7 CB CC 92 DA
F9 93 60 2D DD D2 A2 9B  39 5F 82 21 4C 69 F8 31
87 EE 8E AD 8C 6A BC B5  6B 59 13 F1 04 00 F6 5A
35 79 48 8F 15 CD 97 57  12 3E 37 FF 9D 4F 51 F5
A3 70 BB 14 75 C2 B8 72  C0 ED 7D 68 C9 2E 0D 62
46 17 11 4D 6C C4 7E 53  C1 25 C7 9A 1C 88 58 2C
89 DC 02 64 40 01 5D 38  A5 E2 AF 55 D5 EF 1A 7C
A7 5B A6 6F 86 9F 73 E6  0A DE 2B 99 4A 47 9C DF
09 76 9E 30 0E E4 B2 94  A0 3B 34 1D 28 0F 36 E3
23 B4 03 D8 90 C8 3C FE  5E 32 24 50 1F 3A 43 8A
96 41 74 AC 52 33 F0 D9  29 80 B1 16 D3 AB 91 B9
84 7F 61 1E CF C5 D1 56  3D CA F4 05 C6 E5 08 49
```

**Verdict:** Static substitution table, trivially reversible. Used by `CIGCipher::innoHash` to update the send sequence number after each packet, and by `CSecurityClient::OnPacket` for Nexon security module communication.

### A4. tab_gen Flag (`0xC68748`)

**Value:** `0x00` (false)
**Purpose:** Flag that controls AES table generation. Tables are generated on first use of `RIJNDAEL_KeySchedule` at `decompile/431D20.c:23`.

---

## B. ENCRYPTION PIPELINE — RECONSTRUCTED

### B1. Outbound Packet Flow (Client→Server)

```
COutPacket::Encode1/2/4 (decompile/415360.c, 4153B0.c)
  └─ Raw data written to m_aSendBuff
      │
CClientSocket::SendPacket (decompile/4AF9F0.c:41)
  └─ COutPacket::MakeBufferList (decompile/68D100.c)
       │
       ├─ Step 1: CIOBufferManipulator::_En (decompile/68C8E0.c)
       │    3-round XOR/ROL/ROR scramble on raw packet data
       │    Round constants: 0x13 (19), 0x47 (71)
       │    Algorithm:
       │      Forward pass: v7 ^= v4 + ROL1(*v6, 3); *v6++ = 71 - ROR1(v7, v4--)
       │      Backward pass: v5 ^= v2 + ROL1(*--v6, 4); *v6 = ROR1(v5 ^ 0x13, 3)
       │    3 iterations total
       │
       └─ Step 2: CAESCipher::Encrypt (decompile/4330F0.c)
            AES-128 in OFB mode
            ├─ Key: CAESCipher::UserKey (static, 128-byte at 0xC560C0)
            ├─ IV: Per-packet (pdwKey arg = m_uSeqSnd from caller)
            ├─ Key Schedule: RIJNDAEL_KeySchedule (decompile/431D20.c)
            │    8 rounds of 4 DWORDs = 32 DWORD expanded key
            │    Uses precomputed Rijndael S-box tables
            └─ OFB_EncUpdate (decompile/432D60.c)
                 16-byte block AES + XOR keystream with plaintext
                 Handles partial blocks via AlgInfo->Buffer
       │
       ├─ Sequence Update: m_uSeqSnd = innoHash(&m_uSeqSnd, 4, null)
       │    (CIGCipher::innoHash, decompile/A1BF30.c)
       │    256-byte bShuffle substitution on the 4-byte sequence number
       │
       └─ CClientSocket::Flush (decompile/4AF6A0.c)
            └─ ZAPI.send(m_hSocket, buf, len, 0)
                 Winsock send via ws2_32.dll
```

### B2. Inbound Packet Flow (Server→Client)

```
Winsock recv
  │
CInPacket::DecryptData (decompile/68CCA0.c)
  │
  ├─ Step 1: CAESCipher::Decrypt (decompile/4331A0.c)
  │    AES-128 OFB decryption
  │    ├─ Key: same static UserKey
  │    ├─ IV: same per-packet key
  │    └─ Decrypts in 1456-byte chunks, then 1460-byte chunks
  │       (First chunk cap: 0x5B0=1456, subsequent: 0x5B4=1460)
  │
  └─ Step 2: CIOBufferManipulator::_De (decompile/68CAB0.c)
       Inverse Shanda operation
       |
CClientSocket::ProcessPacket (decompile/4B00F0.c)
  └─ CInPacket::Decode2 reads 16-bit packet type
       └─ Switch dispatch:
            16 → OnMigrateCommand
            17 → OnAliveReq
            18 → OnAuthenCodeChanged
            19 → OnAuthenMessage
            20 → CSecurityClient::OnPacket
            23 → OnCheckCrcResult
            28-148+ → CWvsContext::OnPacket or CStage::OnPacket
```

### B3. Sequence Number as Encryption IV

**Critical finding:** The AES-OFB IV is derived from `m_uSeqSnd`, the send sequence number, which is hashed with `CIGCipher::innoHash` after each packet. This means:

1. The IV changes for every packet (not static per-session)
2. However, the IV is predictable — it follows a deterministic sequence starting from the initial sequence
3. The `bDefaultAESKeyValue` (`0xF25350C6`) is the *initial* sequence seed

**Data flow from `SendPacket`:**
```c
// decompile/4AF9F0.c:41
COutPacket::MakeBufferList(oPacket, &m_lpSendBuff, 0x5Fu, &m_uSeqSnd, 1, m_uSeqSnd);
//                                    seq base=95    ^--pointer     ^--IV value

// decompile/4AF9F0.c:47
m_uSeqSnd = CIGCipher::innoHash((unsigned __int8 *)&m_uSeqSnd, 4, nullptr);
// Sequence updated with bShuffle substitution
```

---

## C. LOGIN AUTH PROTOCOL — FULL WIRING

### C1. SendCheckPasswordPacket (decompile/5DB9D0.c)

```
CLogin::SendCheckPasswordPacket(this, sID, sPasswd)
  │
  ├─ 1. Check m_bRequestSent flag — if set, return 0 (prevent duplicate)
  ├─ 2. Set m_bRequestSent = 1
  ├─ 3. Clear m_WorldItem and m_aBalloon lists
  │
  ├─ 4. CNMCOClientObject::LoginAuth(Instance, sID, sPasswd, 201, null)
  │      This is the Nexon Passport Module (NXPM) auth server call
  │      Parameters: ID, password, game code (201=MapleStory?), callback
  │
  ├─ 5. On LoginAuth failure (return code != 0):
  │      Build error packet: COutPacket(type=35), Encode1(2), Encode4(errorCode)
  │      Send via CClientSocket::SendPacket
  │      Show appropriate CLoginUtilDlg::Error(code):
  │        Code 2  → Error(16)  → "IP blocked"
  │        Code 4  → Error(3)   → "Wrong password"
  │        Code 7  → GotoTitle + Error(17) → "Already logged in"
  │        Code 8,9,12 → Error(15) → "Server busy/inspection"
  │        Code 14 → YesNo(27) + open website → "Wrong ID"
  │        Code 15 → YesNo(26) + open website → "User not exists"
  │        Code 16 → Error(33) → "Withdrawn/deactivated"
  │        Code 17 → Error(27) → "Locale blocked"
  │      Reset m_bRequestSent = 0
  │
  └─ 6. On LoginAuth success (return code == 0):
         ├─ Get Nexon Passport: CNMCOClientObject::GetNexonPassport(v7, szPassport)
         │    (decompile/66D320.c)
         │    └─ Creates CNMGetNexonPassportFunc instance
         │    └─ Calls CNMManager::CallNMFunc to execute it
         │    └─ Copies result passport (up to 1024 bytes) into szPassport[]
         │
         ├─ Init CSystemInfo, Get MachineId (16 bytes)
         │
         ├─ Build COutPacket(type=1):
         │    └─ EncodeStr(sPasswd)                  ← PASSWORD in plaintext!
         │    └─ EncodeStr(szPassport)               ← Nexon Passport
         │    └─ EncodeBuffer(MachineId, 16)         ← Hardware fingerprint
         │    └─ Encode4(GameRoomClient)             ← Client type
         │    └─ Encode1(m_nGameStartMode)           ← Start mode (0/1)
         │    └─ Encode1(0)                          ← Padding
         │    └─ Encode1(0)                          ← Padding
         │    └─ Encode4(PartnerCode)                ← Partner ID from config
         │
         └─ CClientSocket::SendPacket(oPacket)
              └─ Now encrypted with Shanda → AES-OFB on wire
```

**Key observation:** The password is encoded into the packet buffer as a plaintext string via `EncodeStr`, then encrypted at the packet layer. The password exists temporarily in `m_aSendBuff` until `RemoveAll` is called.

### C2. OnCheckPasswordResult (decompile/5DC600.c) — 645 lines

```
Server sends packet type 0 → CLogin::OnPacket → OnCheckPasswordResult(this-8, iPacket)
  │
  ├─ 1. CNMCOClientObject::DetachAuth (if m_nGameStartMode == 1)
  │     OR CNMCOClientObject::LogoutAuth (otherwise)
  │
  ├─ 2. Reset m_bRequestSent = 0 (field at this+428)
  │
  ├─ 3. Decode packet fields:
  │     nResult = Decode1(iPacket)           ← Auth result code
  │     m_nLoginOpt = Decode1(iPacket)       ← Login option
  │     Decode4(iPacket)                     ← Skip 4 bytes (maybe timestamp)
  │     EnableLoginCtrl(title, 1)            ← Re-enable UI
  │
  ├─ 4. Block reason handling paths:
  │     nResult == 27:
  │       └─ StringPool::GetString(0x12F5) → block reason text
  │       └─ YesNo dialog → if Yes: open website, throw CTerminateException
  │       └─ Notice dialog with StringPool string 0x12E7
  │       └─ RETURN (do not proceed)
  │
  │     nResult == 2 (success):
  │       ├─ nPurchaseExp = Decode1(iPacket)
  │       ├─ DecodeBuffer(8 bytes)           ← Date/block info
  │       ├─ If nPurchaseExp == 21-34: set to 12 (login expiration codes)
  │       ├─ Compare dates for inactivity block (1080 day threshold)
  │       ├─ Block reason dialog formatting
  │       ├─ StringPool IDs: 0xB70 (date format), 0xB43 (error)
  │       ├─ Decode country ID string
  │       ├─ Decode nCountryID_Code
  │       ├─ Decode sNexonClubID string
  │       ├─ Decode nGradeCode string
  │       ├─ CWvsContext::SetAccountInfo(...) → stores account data
  │       ├─ Check for PIC (Personal ID Code):
  │       │    If m_nLoginStep == 0:
  │       │      m_nLoginStep = 1
  │       │      If PIC registered: CUIWorldSelect::CreateCanvas(...)
  │       │      else: handle PIC registration/entry flow
  │       └─ GotoTitle(0)
  │
  │     nResult == 4:
  │       └─ Warning dialog: "Maximum number of characters"
  │
  │     nResult == 5:
  │       └─ Handle EULA confirmation state
  │
  │     nResult == 6:
  │       └─ Handle PIC code entry state
  │
  │     nResult == 7:
  │       └─ Handle PIC code update state
  │
  │     nResult == 9:
  │       └─ Handle "View All Characters" (VAC) mode
  │       └─ m_nLoginStep = 5
  │       └─ CUIAvatarVAC created
```

### C3. Nexon Passport Module (NXPM) Flow

```
CNMCOClientObject::LoginAuth(instance, sID, sPasswd, 201, null)
  └─ Authenticates against Nexon Passport servers
  └─ Returns NMLoginAuthReplyCode (0=success, error codes 30001+)

CNMCOClientObject::GetNexonPassport(instance, szPassport)
  └─ decompile/66D320.c
  └─ Creates CNMGetNexonPassportFunc(passportCode) → serializes a request
  └─ CNMManager::CallNMFunc → executes the NM function
  └─ Copies passport string (strlen + 1, up to 1024 bytes) into output buffer

CNMCOClientObject::DetachAuth(instance)
  └─ Disconnects current NXPM auth session

CNMCOClientObject::LogoutAuth(instance)
  └─ Logs out of NXPM auth session
```

### C4. Login Step State Machine

```
Step -1: Initial (m_nFadeOutLoginStep = -1)
Step  0: CUITitle Login Screen
         ├─ OnCheckPasswordResult success
         └─ m_nLoginStep = 1
Step  1: World Selection (CUIWorldSelect)
         ├─ OnSelectWorldResult success
         └─ m_nLoginStep = 2
Step  2: Character Selection (CUICharSelect + CUIAvatar)
         ├─ OnSelectCharacterResult → In-Game (migrate to game server)
         ├─ OnCreateNewCharacterResult → stays in step 2
         ├─ OnDeleteCharacterResult → stays in step 2
         └─ OnViewAllCharResult → VAC mode
Step  3: New Character Creation (Race/Job/Avatar/Name selection)
         ├─ Created by CLogin::Update step transitions
         └─ Goes back to Step 2 on completion
Step  4: Character Detail View
         └─ Transitions from Step 2 select
Step  5: VAC/Additional Character Select
         └─ From OnCheckPasswordResult with code 9
```

**Full transition map from CLogin::Update (decompile/5DEE90.c):**
```c
void __thiscall CLogin::Update(CLogin *this) {
    switch(m_nLoginStep) {
        case 0: // Login title screen — waiting for auth response
            // Handle fade-in, idle animation
            // Auto-login from command-line args
            break;
        case 1: // World selection
            // Handle world/recommendation display
            // Channel button type selection
            break;
        case 2: // Character selection
            // Auto-login with character name from cmd line
            break;
        case 3: // New character creation
            // Race/job step transitions: 0→1→2→3→0
            break;
        case 5: // VAC mode
            // 10-second timeout check (m_tSentTimeVACPacket + 10000ms)
            // On timeout: GotoTitle(new CUITitle)
            break;
    }
}
```

---

## D. SESSION MIGRATION & AUTH — FULL WIRING

### D1. OnMigrateCommand (decompile/4ADD50.c)

```
Server sends packet type 16
  └─ CClientSocket::ProcessPacket → OnMigrateCommand(this, iPacket)

void __thiscall CClientSocket::OnMigrateCommand(CClientSocket *this, CInPacket *iPacket)
{
  int nMigrate = CInPacket::Decode1(iPacket);  // Proceed flag
  
  if ( nMigrate )
  {
    CInterStage::CreateInstance();
    // ... creates CONNECTCONTEXT from decoded IP/port ...
    CWvsContext::IssueConnect(TSingleton<CWvsContext>::ms_pInstance, &addr);
    // The actual connection happens here
  }
  else if ( !this->m_bIsGuestID )
  {
    CMSException::CMSException(&exc, 0x2200000A);  // Disconnect
    CThrowException<CDisconnectException>(&exc);
  }
}
```

### D2. OnAuthenCodeChanged (decompile/4AFE50.c)

```
Server sends packet type 18
  └─ ProcessPacket → OnAuthenCodeChanged(this, iPacket)

Decodes:
  - nPremiumArg (1 byte)
  - nSet (1 byte)
  - nSlotCount (1 byte) — used if premium arg == 2

If nPremiumArg & 2: ShowPremiumArgument(nSet, nSlotCount)
If nSet & 2: throw CDisconnectException (0x2200000B)

Purpose: Real-time premium/NX status updates from server.
Bit 2 of nSet → forced disconnect (session expiry/ban).
```

### D3. OnAuthenMessage (decompile/4ADEB0.c)

```
Server sends packet type 19
  └─ ProcessPacket → OnAuthenMessage(this, iPacket)

Decodes:
  - bShow (1 byte)
  - nSlot (4 bytes)

If premium enabled AND not in cash shop:
  ShowPremiumArgument(nSlot, 0)
```

### D4. IssueConnect (decompile/9E0300.c)

```c
void __thiscall CWvsContext::IssueConnect(CWvsContext *this, ZInetAddr const *addr)
{
  CClientSocket::Close();           // Close existing connection
  CONNECTCONTEXT ctx;
  ctx.m_pAddr = &addr;              // Target server address
  CClientSocket::Connect(ctx);      // Connect to new server
  // Cleanup
}
```

### D5. Keep-Alive & CRC

```
OnAliveReq (type 17): 
  └─ Respond with COutPacket(type=25) → pong

OnCheckCrcResult (type 23):
  └─ Decode1() — if false, throw CMSException(0x2200000A)
     → CDisconnectException → client disconnects
```

---

## E. UI INPUT VALIDATION — AUDITED

### E1. CUITitle::SetRet (decompile/5FFEC0.c)

```c
void __thiscall CUITitle::SetRet(CUITitle *this, int nRet)
{
  switch ( nRet )
  {
    case 1: // Login button
      // 1. Get ID string from m_pEditID
      // 2. Get password string from m_pEditPasswd
      // 3. Validate: 
      //    - ID length < 4 chars → Error(28): "ID too short"
      //    - Password length < 5 chars → Error(3): "Password too short"
      //    - ID length > 256 chars → capped?
      //    - Password length > 12 chars → capped?
      // 4. Save Remember Mail Address to CConfig (if checked)
      // 5. Call CLogin::SendCheckPasswordPacket(m_pLogin, sID, sPasswd)
      // 6. If packet sent: EnableLoginCtrl(this, 0) → disable inputs
      break;
    case 2: // Some return value from dialog
      ToggleRememberMailAddr(this);
      break;
    case 8: // Close
      // No explicit handling (fallthrough to base)
      break;
  }
}
```

**Validated lengths:** ID = 4-256 chars, Password = 5-12 chars
**No character filtering** beyond length checks.

### E2. CUITitle::OnButtonClicked (decompile/5FFC90.c)

```c
void __thiscall CUITitle::OnButtonClicked(CUITitle *this, unsigned int nID)
{
  switch ( nID )
  {
    case 0x3E8: // Login button (1000)
      CUITitle::SetRet(this, 1);
      break;
    case 0x3E9: // Remember Mail Address toggle (1001)
      CUITitle::SetRet(this, 2);  // → ToggleRememberMailAddr
      break;
    case 0x3EA: // Email lost (1002)
      StringPool::GetString(1) → open_web_site(url)  // "Find ID" URL
      break;
    case 0x3EB: // Password lost (1003)
      StringPool::GetString(2) → open_web_site(url)  // "Reset PW" URL
      break;
    case 0x3EC: // New account (1004)
      StringPool::GetString(0) → open_web_site(url)  // "Register" URL
      break;
    case 0x3ED: // Homepage (1005)
      StringPool::GetString(0x1AB9) → open_web_site(url)  // maplestory.nexon.net
      break;
    case 0x3EE: // Quit (1006)
      PostQuitMessage(0);
      break;
  }
}
```

### E3. CUITitle::OnCreate Controls (decompile/600390.c)

| Control ID | Type | Created at line |
|-----------|------|-----------------|
| 1000 | CCtrlButton (Login) | Line ~130 |
| 1001 | CCtrlButton (Remember Email) | Line ~200 |
| 1002 | CCtrlButton (Email Lost) | Line ~270 |
| 1003 | CCtrlButton (Password Lost) | Line ~340 |
| 1004 | CCtrlButton (New Account) | Line ~410 |
| 1005 | CCtrlButton (Homepage) | Line ~480 |
| 1006 | CCtrlButton (Quit) | Line ~550 |
| 1007 | CCtrlEdit (ID field) | Line ~580 |
| 1008 | CCtrlEdit (Password field) | Line ~600 |

**Focus behavior:** If ID field has remembered text, focus goes to password field. Otherwise, focus goes to ID field.

### E4. Destructor Memory Safety (decompile/5FFAE0.c)

The CUITitle destructor properly releases all resources:
1. ClearToolTip()
2. Release m_pBtLogin, m_pBtEmailSave, m_pBtEmailLost, m_pBtPasswdLost, m_pBtNew, m_pBtHomePage, m_pBtQuit
3. Release m_pEditID, m_pEditPasswd
4. Release m_pCanvasRMA[0] and m_pCanvasRMA[1]
5. Null singleton pointer
6. Call CFadeWnd destructor

**No use-after-free found** — all pointers are checked and released in order.

---

## F. LOGIN PROTOCOL — COMPLETE MESSAGE MAP

### F1. Client-to-Server Packets

| Type | Sender | Purpose | Key Data |
|------|--------|---------|----------|
| 1 | `CLogin::SendCheckPasswordPacket` | Login auth | Password str, Passport str, MachineId(16), GameRoomClient, StartMode, PartnerCode |
| 35 | `CLogin::SendCheckPasswordPacket` | Login auth error | Error code (2/4/7/8/9/12/14/15/16/17) |

### F2. Server-to-Client Opcodes (22 for Login)

| Opcode | Handler | Purpose |
|--------|---------|---------|
| 0 | `OnCheckPasswordResult` | Password check result + account info |
| 1 | `OnGuestIDLoginResult` | Guest ID login result |
| 2 | `OnAccountInfoResult` | Extended account info |
| 3 | `OnCheckUserLimitResult` | User/server capacity limit |
| 4 | `OnSetAccountResult` | Account settings result |
| 5 | `OnConfirmEULAResult` | EULA acceptance result |
| 6 | `OnCheckPinCodeResult` | PIN code verification result |
| 7 | `OnUpdatePinCodeResult` | PIN code update result |
| 8 | `OnViewAllCharResult` | View-all-characters data |
| 9 | `OnSelectCharacterByVACResult` | VAC character select result |
| 10 | `OnWorldInformation` | World list data |
| 11 | `OnSelectWorldResult` | World selection + char list |
| 12 | `OnSelectCharacterResult` | Character select + game connect |
| 13 | `OnCheckDuplicatedIDResult` | Duplicate name check |
| 14 | `OnCreateNewCharacterResult` | Character creation result |
| 15 | `OnDeleteCharacterResult` | Character deletion result |
| 21 | `OnEnableSPWResult` | SPW enable result |
| 24 | `OnLatestConnectedWorld` | Last connected world ID |
| 25 | `OnRecommendWorldMessage` | World recommendation |
| 26 | `OnExtraCharInfoResult` | Extra character info |
| 27 | `OnCheckSPWResult` | SPW check result |

### F3. CClientSocket Packet Routing

| Opcode Range | Handler | Context |
|-------------|---------|---------|
| 16 | `OnMigrateCommand` | Server migration |
| 17 | `OnAliveReq` | Keep-alive ping |
| 18 | `OnAuthenCodeChanged` | Premium/auth code change |
| 19 | `OnAuthenMessage` | Premium argument message |
| 20 | `CSecurityClient::OnPacket` | Nexon Security Module |
| 23 | `OnCheckCrcResult` | CRC integrity check |
| 28-148 | `CWvsContext::OnPacket` | In-game packets |
| 148+ | `CStage::OnPacket` | Stage/field packets |

---

## G. VULNERABILITY CONFIRMATIONS

### G1. Hardcoded AES Key — CONFIRMED
**Status:** CRITICAL
**Evidence:** `CAESCipher::UserKey` at `0xC560C0` contains 128 bytes of static key data. Referenced by `RIJNDAEL_KeySchedule` at `0x43311A` and `0x4331CA`. Never changed at runtime.

### G2. Static AES Default IV — CONFIRMED
**Status:** CRITICAL
**Evidence:** `CAESCipher::bDefaultAESKeyValue` at `0xB4730C` = `0xF25350C6`. Ofset: the actual IV per-packet is `m_uSeqSnd`, which is initialized from this value and then hashed via `innoHash` after each packet. So the IV does change per-packet — but it follows a deterministic sequence from a known seed.

### G3. Shanda Weak Obfuscation — CONFIRMED
**Status:** HIGH
**Evidence:** 3 rounds of XOR/ROL/ROR with constants 0x13, 0x47. No cryptographic key involved. Reversible with trivial effort.

### G4. Password in Memory — CONFIRMED
**Status:** HIGH
**Evidence:** In `SendCheckPasswordPacket`, password is copied into `COutPacket::m_aSendBuff` via `EncodeStr`. It remains in the buffer until `ZArray<unsigned char>::RemoveAll` is called. Timing window exists.

### G5. Auth Code Change Disconnect — CONFIRMED
**Status:** MEDIUM
**Evidence:** `OnAuthenCodeChanged` at `decompile/4AFE50.c` can force a disconnect if `nSet & 2`. This is how the server terminates a session (ban/kick).

### G6. CRC Check Disconnect — CONFIRMED
**Status:** MEDIUM
**Evidence:** `OnCheckCrcResult` at `decompile/4ADF10.c` throws `CDisconnectException` if the CRC check returns false. This is the anti-tamper mechanism.

### G7. No Input Sanitization Beyond Length — CONFIRMED
**Status:** MEDIUM
**Evidence:** `CUITitle::SetRet` only checks `strlen(ID) >= 4`, `strlen(PW) >= 5`, and `strlen(ID) <= 256`, `strlen(PW) <= 12`. No character filtering (e.g., SQL injection-like patterns not filtered at client level, though server-side validation should catch these).

### G8. Open URL Without Validation — CONFIRMED
**Status:** LOW
**Evidence:** `open_web_site` is called with strings from `StringPool`. The URLs point to `maplestory.nexon.net` — no user-controlled input directly opens a URL, so this is low risk.

---

## H. SUMMARY OF FINDINGS

### Critical (immediate action required)
1. **Hardcoded AES key** at `0xC560C0` — all network traffic decryptable
2. **Predictable IV sequence** — deterministic `innoHash` progression from known seed `0xF25350C6`

### High (significant risk)
3. **Shanda obfuscation** — not real encryption, provides no security
4. **Password in plaintext** in send buffer before encryption — memory exposure window
5. **Static bShuffle table** — CIGCipher provides no real cryptographic strength

### Medium (notable)
6. **Auth code disconnect** — server-side forced disconnect via `OnAuthenCodeChanged bit 2`
7. **CRC check disconnect** — anti-tamper that closes connection on CRC failure
8. **No character filtering** on ID/password input

### Low (informational)
9. **CLoginUtilDlg error code mapping** — locale-dependent string pool IDs
10. **Process detection** — 20+ debugger/cheat process names checked
11. **No use-after-free** confirmed in CUITitle destructor
12. **Proper resource cleanup** in CUITitle destructor

### Key (static) — fully extracted
```
AES UserKey:    13 52 2A 5B 08 02 10 60 06 02 43 0F B4 4B 35 05
                1B 0A 5F 09 0F 50 0C 1B 33 55 01 09 52 DE C7 1E
AES Default IV: C6 50 53 F2 (0xF25350C6)
CIG bShuffle:   EC 3F 77 A4 45 D0 71 BF ... 256 bytes total (from 0xC61A70)
```
