import { OutHeader } from '../packet/OpCodes.js';
import { AvatarCodec } from './AvatarCodec.js';
/** CMapleTVMan::OnPacket (decompile/60FE10.c) — three independently-shaped
 *  opcodes, no shared subtype byte (the 405/406/407 split IS the dispatch). */
export class MapleTVHandlers {
    onSetMessage = null;
    onClearMessage = null;
    onSendMessageResult = null;
    clear() {
        this.onSetMessage = null;
        this.onClearMessage = null;
        this.onSendMessageResult = null;
    }
    register(router) {
        router.register(OutHeader.MapleTVSetMessage, (p, s) => this._handleSetMessage(p));
        router.register(OutHeader.MapleTVClearMessage, (p, s) => this.onClearMessage?.());
        router.register(OutHeader.MapleTVSendMessageResult, (p, s) => this._handleSendMessageResult(p));
    }
    _handleSetMessage(p) {
        const flag = p.readByte();
        const messageType = p.readByte();
        const senderLook = AvatarCodec.DecodeAvatarLook(p);
        const senderName = p.readString();
        const receiverName = p.readString();
        const messages = [p.readString(), p.readString(), p.readString(), p.readString(), p.readString()];
        const totalWaitTime = p.readInt();
        const receiverLook = (flag & 2) !== 0 ? AvatarCodec.DecodeAvatarLook(p) : null;
        this.onSetMessage?.({
            isSelfMessage: receiverLook === null,
            messageType, senderLook, senderName, receiverName, messages, totalWaitTime, receiverLook,
        });
    }
    _handleSendMessageResult(p) {
        const success = p.readByte() !== 0;
        const reasonCode = success ? 0 : p.readByte();
        this.onSendMessageResult?.({ success, reasonCode });
    }
}
//# sourceMappingURL=MapleTVHandlers.js.map