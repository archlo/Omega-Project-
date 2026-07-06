import { InPacket } from '../packet/InPacket.js';
import { OutHeader } from '../packet/OpCodes.js';
import { PacketRouter } from '../session/PacketRouter.js';
import { ClientSession } from '../session/ClientSession.js';
import { AvatarCodec } from './AvatarCodec.js';
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
export class MapleTVHandlers {
  onSetMessage: ((args: MapleTVSetMessageArgs) => void) | null = null;
  onClearMessage: (() => void) | null = null;
  onSendMessageResult: ((args: MapleTVSendMessageResultArgs) => void) | null = null;

  clear(): void {
    this.onSetMessage = null;
    this.onClearMessage = null;
    this.onSendMessageResult = null;
  }

  register(router: PacketRouter): void {
    router.register(OutHeader.MapleTVSetMessage, (p, s) => this._handleSetMessage(p));
    router.register(OutHeader.MapleTVClearMessage, (p, s) => this.onClearMessage?.());
    router.register(OutHeader.MapleTVSendMessageResult, (p, s) => this._handleSendMessageResult(p));
  }

  private _handleSetMessage(p: InPacket): void {
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

  private _handleSendMessageResult(p: InPacket): void {
    const success = p.readByte() !== 0;
    const reasonCode = success ? 0 : p.readByte();
    this.onSendMessageResult?.({ success, reasonCode });
  }
}
