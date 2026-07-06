import { Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import type { DragTarget } from '../DragController.js';
import type { ItemDragPayload } from './ItemInventory.js';

// OG class: CItemSpeakerDlg (0x5c9ab0+). Confirmed fields from decompile of
// _SendConsumeCashItemUseRequest (0x5c9e70): _nPOS (word, inventory slot),
// _nItemID (dword, item id), _pEditInput (ZRef<CCtrlEdit>, message text),
// _pCheckBoxWhisper (ZRef<CCtrlCheckBox>, whisper flag), _pItem.p (optional
// target-item dragged into the dialog for avatar/target megaphone variants).
// TODO_AUDIT.md Hundred-and-seventeenth pass: no WZ art path recoverable for
// this dialog (OnCreate uses StringPool UOLs, not literal bstr paths) —
// using a placeholder panel + window.prompt for text input (same pattern as
// Memo.ts, GuildBBS.ts, PersonalShop.ts). The sender wire shape is fully
// confirmed (see GameSender.MegaphoneCompose).
export class MegaphoneCompose extends GamePanel implements DragTarget {
  OnSend: ((invPos: number, itemId: number, message: string, isWhisper: boolean) => void) | null = null;

  // Set by Open() (item double-click) or by a future drag-to-open trigger.
  private _invPos = 0;
  private _itemId = 0;

  // Optional target item for avatar/target megaphone variants — accepts a
  // DragTarget drop matching CDraggableItem::PutItem(CItemSpeakerDlg*) which
  // sets _nTargetTI/_nTargetPOS. Not yet used in the send path (hasTargetItem
  // is always 0) because avatar-megaphone-with-target was not independently
  // traced. Stored here so the infrastructure exists when that gap is closed.
  private _targetTI = 0;
  private _targetPOS = 0;

  private readonly _gfx: Graphics;

  constructor() {
    super();
    this.isVisible = false;
    this._root.position.set(260, 160);
    this._gfx = new Graphics();
    this._root.addChild(this._gfx);
  }

  // OG: CItemSpeakerDlg is opened (by whatever opens it — the exact
  // item-use-dispatcher case is not confirmed from this decompile, see
  // GameStage.ts comment at the onUseItem call site) with the megaphone's
  // _nPOS and _nItemID already set. This client approximates that by having
  // the open-trigger pass both directly.
  Open(invPos: number, itemId: number): void {
    this._invPos = invPos;
    this._itemId = itemId;
    this._targetTI = 0;
    this._targetPOS = 0;

    // OG has CCtrlEdit multi-line text box + CCtrlCheckBox for whisper.
    // window.prompt is the established fallback for text entry in this client
    // (Memo.ts, GuildBBS.ts, PersonalShop.ts all use the same pattern).
    const message = typeof window !== 'undefined' ? window.prompt('Megaphone message:') ?? '' : '';
    if (!message.trim()) return;

    const isWhisper = false;
    // TODO: distinguish whisper megaphone items (item ID category for
    // whisper mega is not confirmed from this decompile — not guessed at).

    this.OnSend?.(this._invPos, this._itemId, message.trim(), isWhisper);
  }

  // DragTarget — OG: CDraggableItem::PutItem(CItemSpeakerDlg*) stores the
  // target item's nTI/nSlotPosition. Accepted here but hasTargetItem in the
  // send is still 0 (avatar-with-target path not yet wired).
  tryAcceptDrag(payload: unknown, _x: number, _y: number): boolean {
    if (!this.isVisible || !payload || typeof payload !== 'object' || !('itemId' in payload)) return false;
    const p = payload as ItemDragPayload;
    this._targetTI = p.itemId;
    this._targetPOS = p.slotPos;
    return true;
  }

  update(_dt: number): void {
    if (!this.isVisible) return;
    this._gfx.clear();
    this._gfx.rect(0, 0, 280, 60).fill({ color: 0x0c0c16, alpha: 0.95 });
    this._gfx.rect(0, 0, 280, 1).fill({ color: 0x5a6478 });
    this._gfx.rect(0, 59, 280, 1).fill({ color: 0x5a6478 });
    const t = new Text({ text: 'Megaphone', style: new TextStyle({ fill: '#FFE4B5', fontSize: 11, fontFamily: 'monospace' }) });
    t.position.set(8, 6);
    this._root.addChild(t);
  }

  handleMouseButton(_x: number, _y: number, _down: boolean): boolean {
    return false;
  }

  onKeyPress(_key: string): boolean {
    return false;
  }
}
