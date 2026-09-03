import { PacketRouter } from '../session/PacketRouter.js';
import { AvatarLook } from '../../domain/AvatarLook.js';
export interface MapleTVSetMessageArgs {
    isSelfMessage: boolean;
    messageType: number;
    senderLook: AvatarLook;
    senderName: string;
    receiverName: string;
    messages: string[];
    totalWaitTime: number;
    receiverLook: AvatarLook | null;
}
export interface MapleTVSendMessageResultArgs {
    success: boolean;
    reasonCode: number;
}
/** CMapleTVMan::OnPacket (decompile/60FE10.c) — three independently-shaped
 *  opcodes, no shared subtype byte (the 405/406/407 split IS the dispatch). */
export declare class MapleTVHandlers {
    onSetMessage: ((args: MapleTVSetMessageArgs) => void) | null;
    onClearMessage: (() => void) | null;
    onSendMessageResult: ((args: MapleTVSendMessageResultArgs) => void) | null;
    clear(): void;
    register(router: PacketRouter): void;
    private _handleSetMessage;
    private _handleSendMessageResult;
}
//# sourceMappingURL=MapleTVHandlers.d.ts.map