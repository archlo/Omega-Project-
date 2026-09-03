import { WorldInfo } from '../../domain/WorldInfo.js';
import { ChannelInfo } from '../../domain/ChannelInfo.js';
import { CharacterEntry, CharacterRank } from '../../domain/CharacterEntry.js';
import { OutPacket } from '../packet/OutPacket.js';
import { OutHeader, InHeader } from '../packet/OpCodes.js';
import { AvatarCodec } from './AvatarCodec.js';
export class LoginHandlers {
    onCheckPasswordResult = null;
    onWorldListComplete = null;
    onLatestConnectedWorld = null;
    onSelectWorldResult = null;
    onCheckDuplicatedIdResult = null;
    onCreateCharacterResult = null;
    onDeleteCharacterResult = null;
    onSelectCharacterResult = null;
    onCheckPinCodeResult = null;
    onUpdatePinCodeResult = null;
    onCheckSpwResult = null;
    onCheckSpwFailed = null;
    onEnableSpwResult = null;
    onRecommendWorldMessage = null;
    onExtraCharInfoResult = null;
    onGuestIdLoginResult = null;
    onAccountInfoResult = null;
    onSetAccountResult = null;
    onConfirmEulaResult = null;
    onAuthenMessage = null;
    onCheckCrcResult = null;
    onViewAllCharResult = null;
    _session;
    constructor(session) {
        this._session = session;
    }
    register(router) {
        router.register(OutHeader.CheckPasswordResult, (p, s) => this.handleCheckPasswordResult(p));
        router.register(OutHeader.WorldInformation, (p, s) => this.handleWorldInformation(p));
        router.register(OutHeader.LatestConnectedWorld, (p, s) => this.handleLatestConnectedWorld(p));
        router.register(OutHeader.CheckUserLimitResult, (p, s) => this.handleCheckUserLimitResult(p));
        router.register(OutHeader.SelectWorldResult, (p, s) => this.handleSelectWorldResult(p));
        router.register(OutHeader.CheckDuplicatedIDResult, (p, s) => this.handleCheckDuplicatedIdResult(p));
        router.register(OutHeader.CreateNewCharacterResult, (p, s) => this.handleCreateNewCharacterResult(p));
        router.register(OutHeader.DeleteCharacterResult, (p, s) => this.handleDeleteCharacterResult(p));
        router.register(OutHeader.SelectCharacterResult, (p, s) => this.handleSelectCharacterResult(p, false));
        router.register(OutHeader.SelectCharacterByVACResult, (p, s) => this.handleSelectCharacterResult(p, true));
        router.register(OutHeader.CheckSPWResult, (p, s) => this.handleCheckSpwResult(p));
        router.register(OutHeader.CheckPinCodeResult, (p) => this.handleCheckPinCodeResult(p));
        router.register(OutHeader.UpdatePinCodeResult, (p) => this.handleUpdatePinCodeResult(p));
        router.register(OutHeader.AliveReq, (p, s) => this.handleAliveReq(s));
        router.register(OutHeader.AuthenMessage, (p) => this.handleAuthenMessage(p));
        // TODO_AUDIT.md Hundred-and-fifty-sixth pass: opcode 22 confirmed dead — OG CLogin::OnPacket switch never dispatches it (default-case target). Registered as no-op to close audit gap.
        router.register(OutHeader.DeleteCharacterOTPRequest, (_p) => { });
        router.register(OutHeader.CheckCrcResult, (p) => this.handleCheckCrcResult(p));
        router.register(OutHeader.EnableSPWResult, (p) => this.handleEnableSpwResult(p));
        router.register(OutHeader.RecommendWorldMessage, (p) => this.handleRecommendWorldMessage(p));
        router.register(OutHeader.CheckExtraCharInfoResult, (p) => this.handleExtraCharInfoResult(p));
        router.register(OutHeader.GuestIDLoginResult, (p) => this.handleGuestIdLoginResult(p));
        router.register(OutHeader.AccountInfoResult, (p) => this.handleAccountInfoResult(p));
        router.register(OutHeader.SetAccountResult, (p) => this.handleSetAccountResult(p));
        router.register(OutHeader.ConfirmEULAResult, (p) => this.handleConfirmEulaResult(p));
        router.register(OutHeader.ViewAllCharResult, (p) => this.handleViewAllCharResult(p));
    }
    handleCheckPasswordResult(p) {
        const result = p.readByte();
        if (result !== 0) {
            console.warn(`CheckPasswordResult failure code=${result}`);
            this.onCheckPasswordResult?.({ success: false, resultCode: result });
            return;
        }
        const blockReason = p.readByte();
        p.readInt();
        const acc = this._session.account;
        if (blockReason === 2 || blockReason === 3) {
            console.log(`CheckPasswordResult: EULA required (blockReason=${blockReason})`);
            this.onCheckPasswordResult?.({ success: true, resultCode: 0, blockReason, eulaRequired: true });
            return;
        }
        if (blockReason !== 0 && blockReason !== 1) {
            console.warn(`CheckPasswordResult: unknown blockReason=${blockReason}`);
            this.onCheckPasswordResult?.({ success: false, resultCode: blockReason });
            return;
        }
        acc.accountId = p.readInt();
        acc.gender = p.readByte();
        acc.gradeCode = p.readByte();
        acc.subGradeCode = p.readShort();
        acc.countryId = p.readByte();
        acc.nexonClubId = p.readString();
        acc.purchaseExp = p.readByte();
        acc.chatBlockReason = p.readByte();
        acc.chatUnblockDate = Number(p.readLong());
        acc.registerDate = Number(p.readLong());
        acc.characterSlotCount = p.readInt();
        if (acc.gender === 10) {
            acc.loginOpt = 0;
            console.log(`CheckPasswordResult OK accountId=${acc.accountId} gender=10 (force PIN/PIC)`);
            this.onCheckPasswordResult?.({ success: true, resultCode: 0, blockReason, skipPinCode: false });
            return;
        }
        acc.skipPinCode = p.readByte() !== 0;
        acc.loginOpt = p.readByte();
        acc.clientKey = p.readBytes(8);
        console.log(`CheckPasswordResult OK accountId=${acc.accountId} slots=${acc.characterSlotCount} skipPin=${acc.skipPinCode}`);
        this.onCheckPasswordResult?.({ success: true, resultCode: 0, blockReason, skipPinCode: acc.skipPinCode });
    }
    handleWorldInformation(p) {
        const worldId = p.readSByte();
        if (worldId < 0) {
            console.log(`WorldInformation terminator received — ${this._session.worlds.length} worlds`);
            this.onWorldListComplete?.(this._session.worlds);
            return;
        }
        const w = new WorldInfo();
        w.worldId = worldId;
        w.name = p.readString();
        w.state = p.readByte();
        w.eventDescription = p.readString();
        w.eventExpRate = p.readShort();
        w.eventDropRate = p.readShort();
        w.blockCharCreation = p.readByte();
        const channelCount = p.readByte();
        for (let i = 0; i < channelCount; i++) {
            const ch = new ChannelInfo();
            ch.name = p.readString();
            ch.userCount = p.readInt();
            ch.worldId = p.readByte();
            ch.channelId = p.readByte();
            ch.adult = p.readByte() !== 0;
            w.channels.push(ch);
        }
        // TODO_AUDIT.md Fifty-fourth pass: this loop was entirely missing —
        // CLogin::OnWorldInformation (0x5da7f0) reads `{x, y, message}` per
        // balloon after the count, not just the count. Leaving them unread
        // desyncs every subsequent world entry and the list terminator.
        w.balloonCount = p.readShort();
        for (let i = 0; i < w.balloonCount; i++) {
            w.balloons.push({ x: p.readShort(), y: p.readShort(), message: p.readString() });
        }
        this._session.worlds.push(w);
    }
    handleLatestConnectedWorld(p) {
        const worldId = p.readInt() & 0xFF;
        this.onLatestConnectedWorld?.(worldId);
    }
    handleCheckUserLimitResult(p) {
        const over = p.readByte();
        const populate = p.readByte();
        console.log(`CheckUserLimitResult over=${over} populate=${populate}`);
    }
    handleSelectWorldResult(p) {
        const result = p.readByte();
        if (result !== 0) {
            console.warn(`SelectWorldResult failure code=${result}`);
            this.onSelectWorldResult?.({ success: false, resultCode: result, characters: [] });
            return;
        }
        const characters = [];
        const count = p.readInt();
        console.log(`SelectWorldResult OK ${count} chars`);
        for (let i = 0; i < count; i++) {
            const stat = AvatarCodec.DecodeCharacterStat(p);
            const look = AvatarCodec.DecodeAvatarLook(p);
            const onFamily = p.readByte() !== 0;
            const hasRank = p.readByte() !== 0;
            let rank;
            if (hasRank) {
                rank = new CharacterRank();
                rank.worldRank = p.readInt();
                rank.worldRankMove = p.readInt();
                rank.jobRank = p.readInt();
                rank.jobRankMove = p.readInt();
            }
            const entry = new CharacterEntry();
            entry.stat = stat;
            entry.look = look;
            entry.onFamily = onFamily;
            entry.rank = rank;
            characters.push(entry);
        }
        const loginOpt = p.readByte();
        const slotCount = p.readInt();
        const buyCharCount = p.readInt();
        this._session.account.loginOpt = loginOpt;
        this._session.account.characterSlotCount = slotCount;
        this._session.account.buyCharCount = buyCharCount;
        console.log(`SelectWorldResult: loginOpt=${loginOpt} slotCount=${slotCount} buyCharCount=${buyCharCount}`);
        this._session.characters = characters;
        console.log(`SelectWorldResult OK ${characters.length} chars`);
        this.onSelectWorldResult?.({ success: true, resultCode: 0, characters });
    }
    handleCheckDuplicatedIdResult(p) {
        const name = p.readString();
        const code = p.readByte();
        this.onCheckDuplicatedIdResult?.({ name, resultCode: code });
    }
    handleCreateNewCharacterResult(p) {
        const code = p.readByte();
        let entry;
        if (code === 0) {
            const stat = AvatarCodec.DecodeCharacterStat(p);
            const look = AvatarCodec.DecodeAvatarLook(p);
            entry = new CharacterEntry();
            entry.stat = stat;
            entry.look = look;
            this._session.characters.unshift(entry);
        }
        this.onCreateCharacterResult?.({ success: code === 0, resultCode: code, entry });
    }
    handleDeleteCharacterResult(p) {
        const charId = p.readInt();
        const code = p.readByte();
        if (code === 0) {
            this._session.characters = this._session.characters.filter(c => c.stat.characterId !== charId);
        }
        this.onDeleteCharacterResult?.({ success: code === 0, resultCode: code, characterId: charId });
    }
    handleCheckSpwResult(p) {
        const code = p.readByte();
        if (code !== 0) {
            console.log(`CheckSPWResult — PIC rejected (code=${code})`);
            this.onCheckSpwFailed?.();
            return;
        }
        p.readByte();
        const host = p.readBytes(4);
        const port = p.readUShort();
        const characterId = p.readInt();
        const authenCode = p.readByte();
        const ulPremiumArg = p.readInt();
        console.log(`CheckSPWResult OK charId=${characterId} host=${Array.from(host).join('.')} port=${port}`);
        this.onCheckSpwResult?.({
            success: true, resultCode: 0,
            channelHost: host, channelPort: port,
            characterId, authenCode, premiumArgument: ulPremiumArg,
        });
    }
    handleSelectCharacterResult(p, byVac) {
        // OG: CLogin::OnSelectCharacterResult (decompile/5dea80.c) — byte
        // resultCode, byte subCode. The success path (host/port/charId/
        // authenCode/premiumArg + IssueConnect) isn't gated on resultCode===0
        // alone — it also runs for resultCode===23, and for resultCode===12
        // when subCode is 0xB or 0xD (both fall through to the same success
        // label as 0/23). Everything else is a real failure (various
        // CLoginUtilDlg::Error popups keyed by resultCode/subCode).
        const code = p.readByte();
        const subCode = p.readByte();
        const isSuccess = code === 0 || code === 23 || (code === 12 && (subCode === 0xB || subCode === 0xD));
        if (!isSuccess) {
            console.warn(`SelectCharacterResult failure code=${code}`);
            this.onSelectCharacterResult?.({ success: false, resultCode: code });
            return;
        }
        const host = p.readBytes(4);
        const port = p.readUShort();
        const characterId = p.readInt();
        const authenCode = p.readByte();
        const ulPremiumArg = p.readInt();
        console.log(`SelectCharacterResult OK byVac=${byVac} charId=${characterId} host=${Array.from(host).join('.')} port=${port}`);
        this.onSelectCharacterResult?.({
            success: true, resultCode: 0,
            channelHost: host, channelPort: port,
            characterId, authenCode, premiumArgument: ulPremiumArg,
        });
    }
    handleCheckPinCodeResult(p) {
        const mode = p.readByte();
        console.log(`CheckPinCodeResult mode=${mode}`);
        this.onCheckPinCodeResult?.({
            mode,
            accepted: mode === 0,
            requiresNewPin: mode === 1,
            requiresPinEntry: mode === 2 || mode === 4,
            returnToLogin: mode === 7,
        });
    }
    handleUpdatePinCodeResult(p) {
        const result = p.readByte();
        if (result !== 0) {
            console.warn(`UpdatePinCodeResult failure code=${result}`);
            this.onUpdatePinCodeResult?.({ success: false, errorCode: result });
            return;
        }
        console.log('UpdatePinCodeResult OK');
        this.onUpdatePinCodeResult?.({ success: true });
    }
    handleAliveReq(s) {
        const ack = OutPacket.Of(InHeader.AliveAck);
        s.send(ack);
        console.log('AliveAck sent');
    }
    // CClientSocket::OnAuthenMessage (decompile/4ADEB0.c) reads Decode4 then
    // Decode1. The display gate lives in CWvsContext/UI state, outside this
    // decode layer.
    handleAuthenMessage(p) {
        const premiumArgument = p.readUInt();
        const messageType = p.readByte();
        this.onAuthenMessage?.({ premiumArgument, messageType });
    }
    // CClientSocket::OnCheckCrcResult (decompile/4ADF10.c) reads one byte and
    // terminates the OG client if false; expose the raw decision to the runtime.
    handleCheckCrcResult(p) {
        this.onCheckCrcResult?.({ ok: p.readByte() !== 0 });
    }
    // CLogin::OnEnableSPWResult (decompile/5D2290.c) — always reads exactly
    // 2 bytes regardless of the second byte's value (the `code` switch has no
    // case that reads further).
    handleEnableSpwResult(p) {
        try {
            const flag = p.readByte() !== 0;
            const code = p.readByte();
            this.onEnableSpwResult?.({ flag, code });
        }
        catch { /* malformed */ }
    }
    // CLogin::OnRecommendWorldMessage (decompile/5D7280.c). OG only decodes
    // this when m_nLoginStep===1; the server only sends it in that state, so
    // the wire format is decoded unconditionally here.
    handleRecommendWorldMessage(p) {
        try {
            const count = p.readByte();
            const entries = [];
            for (let i = 0; i < count; i++) {
                const worldId = p.readInt();
                const message = p.readString();
                entries.push({ worldId, message });
            }
            this.onRecommendWorldMessage?.(entries);
        }
        catch { /* malformed */ }
    }
    // CLogin::OnExtraCharInfoResult (decompile/5D25A0.c).
    handleExtraCharInfoResult(p) {
        try {
            const characterId = p.readInt();
            const flag = p.readByte();
            this.onExtraCharInfoResult?.({ characterId, flag });
        }
        catch { /* malformed */ }
    }
    // CLogin::OnGuestIDLoginResult (decompile/5DD1A0.c).
    handleGuestIdLoginResult(p) {
        try {
            const resultType = p.readByte();
            const regStatId = p.readByte();
            let accountInfo;
            if ((resultType === 0 || resultType === 12 || resultType === 23) && (regStatId === 0 || regStatId === 1)) {
                const accountId = p.readInt();
                const gender = p.readByte();
                const gradeCode = p.readByte();
                const countryId = p.readByte();
                p.readByte(); // consumed, unused
                const nexonClubId = p.readString();
                const purchaseExp = p.readByte();
                const chatBlockReason = p.readByte();
                const chatUnblockDate = p.readLong();
                const registerDate = p.readLong();
                const numOfCharacters = p.readInt();
                const guestIdRegistrationUrl = p.readString();
                accountInfo = {
                    accountId, gender, gradeCode, countryId, nexonClubId, purchaseExp,
                    chatBlockReason, chatUnblockDate, registerDate, numOfCharacters, guestIdRegistrationUrl,
                };
            }
            this.onGuestIdLoginResult?.({ resultType, regStatId, accountInfo });
        }
        catch { /* malformed */ }
    }
    // CLogin::OnAccountInfoResult (decompile/5DD600.c).
    handleAccountInfoResult(p) {
        try {
            const resultType = p.readByte();
            let hasAccountInfo = false;
            if (resultType === 0 || resultType === 12 || resultType === 23) {
                hasAccountInfo = true;
                const acc = this._session.account;
                acc.accountId = p.readInt();
                acc.gender = p.readByte();
                acc.gradeCode = p.readByte();
                acc.subGradeCode = p.readShort();
                acc.countryId = p.readByte();
                acc.nexonClubId = p.readString();
                acc.purchaseExp = p.readByte();
                acc.chatBlockReason = p.readByte();
                acc.chatUnblockDate = Number(p.readLong());
                acc.registerDate = Number(p.readLong());
                acc.characterSlotCount = p.readInt();
                acc.clientKey = p.readBytes(8);
            }
            this.onAccountInfoResult?.({ resultType, hasAccountInfo });
        }
        catch { /* malformed */ }
    }
    // CLogin::OnSetAccountResult (decompile/5D5E80.c).
    handleSetAccountResult(p) {
        try {
            const value = p.readByte();
            const success = p.readByte() !== 0;
            if (success) {
                const bootstrap = OutPacket.Of(InHeader.CheckPinCode);
                bootstrap.writeByte(1);
                bootstrap.writeByte(1);
                bootstrap.writeString('');
                this._session.send(bootstrap);
            }
            this.onSetAccountResult?.({ value, success });
        }
        catch { /* malformed */ }
    }
    // CLogin::OnConfirmEULAResult (decompile/5D4D00.c).
    handleConfirmEulaResult(p) {
        try {
            const accepted = p.readByte() !== 0;
            this.onConfirmEulaResult?.({ accepted });
        }
        catch { /* malformed */ }
    }
    // CLogin::OnViewAllCharResult (decompile/5DE120.c). OG gates the entire
    // switch on a local `m_bIsWaitingVAC` flag — decoded unconditionally here
    // since the server only sends this when that flow is active.
    handleViewAllCharResult(p) {
        try {
            const subType = p.readByte();
            switch (subType) {
                case 0: {
                    const worldId = p.readByte();
                    const count = p.readByte();
                    const characters = [];
                    for (let i = 0; i < count; i++) {
                        const stat = AvatarCodec.DecodeCharacterStat(p);
                        const look = AvatarCodec.DecodeAvatarLook(p);
                        const hasRank = p.readByte() !== 0;
                        let rank;
                        if (hasRank) {
                            rank = new CharacterRank();
                            rank.worldRank = p.readInt();
                            rank.worldRankMove = p.readInt();
                            rank.jobRank = p.readInt();
                            rank.jobRankMove = p.readInt();
                        }
                        const entry = new CharacterEntry();
                        entry.stat = stat;
                        entry.look = look;
                        entry.rank = rank;
                        characters.push(entry);
                    }
                    const loginOpt = p.readByte();
                    this.onViewAllCharResult?.({ subType, worldId, characters, loginOpt });
                    break;
                }
                case 1: {
                    const countRelatedSvrs = p.readInt();
                    const countCharacters = p.readInt();
                    this.onViewAllCharResult?.({ subType, countRelatedSvrs, countCharacters });
                    break;
                }
                case 3:
                case 6:
                case 7: {
                    const hasMessage = p.readByte() !== 0;
                    const message = hasMessage ? p.readString() : undefined;
                    this.onViewAllCharResult?.({ subType, message });
                    break;
                }
                default:
                    // 2, 4, 5, and any other value read no further bytes.
                    this.onViewAllCharResult?.({ subType });
                    break;
            }
        }
        catch { /* malformed */ }
    }
}
//# sourceMappingURL=LoginHandlers.js.map