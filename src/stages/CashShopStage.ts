import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { Stage, MouseButton } from '../app/Stage.js';
import { MapleClaudeGame } from '../MapleClaudeGame.js';
import { WzPackage } from '../wz/WzPackage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzCanvas } from '../wz/WzCanvas.js';
import { WzSprite } from '../render/WzSprite.js';
import { WzTextureLoader } from '../render/WzTextureLoader.js';
import { GameSender } from '../net/senders/GameSender.js';
import { Button } from '../ui/Button.js';
import { ItemIconLoader } from '../character/ItemIconLoader.js';
import type {
  CashShopCashAmount,
  CashShopGachaponResult,
  CashShopOneADayResult,
  CashShopTransferWorldResult,
  CashItemResult,
} from '../net/handlers/CashShopHandlers.js';

const CsW = 1024;
const CsH = 768;

interface CashItem {
  id: number;
  name: string;
  price: number;
  label: string;
  discount: boolean;
  discPrice: number;
}

const TabNames = [
  'New/Best', 'Character', 'Equip', 'Hair/Face',
  'Pet', 'Others', 'Event', 'Package', 'Popular',
];

const TabY0 = 160;
const TabH = 50;
const TabX = 16;
const TabW = 122;

const ItemCols = 7;
const ItemRows = 2;
const MaxItems = ItemCols * ItemRows + 1;
const ItemStepX = 124;
const ItemStepY = 205;
const ItemGridX = 137;
const ItemGridY = 372;

export class CashShopStage extends Stage {
  private _ui: WzPackage | null;
  private _loader: WzTextureLoader | null = null;
  private _icons: ItemIconLoader | null = null;
  private _iconSprites: Sprite[] = [];
  private _bg: WzSprite | null = null;
  private _banner: WzSprite | null = null;
  private _bgList: WzSprite | null = null;
  private _bgChar: WzSprite | null = null;
  private _bgSearch: WzSprite | null = null;
  private _bgStatus: WzSprite | null = null;
  private _tabSprites: (WzSprite | null)[] = new Array(9).fill(null);
  private _slotBase: WzSprite | null = null;
  private _slotNone: WzSprite | null = null;
  private readonly _tabBtns: Button[] = [];
  private readonly _buyBtns: Button[] = [];
  private _btExit: Button | null = null;
  private _btPrev: Button | null = null;
  private _btNext: Button | null = null;
  private _allButtons: Button[] = [];
  private _activeTab = 0;
  private _page = 0;
  private readonly _tabItems: CashItem[][] = Array.from({ length: 9 }, () => []);
  private _root: Container;
  private _g: Graphics;
  private _titleText: Text | null = null;
  private _nxCredit = 0;
  private _nxPrepaid = 0;
  private _maplePoints = 0;
  private _prevW = 800;
  private _prevH = 600;
  private _dynamicChildren: Text[] = [];
  /** Most recent server notice/result text (NoticeFreeCashItem, gachapon/one-a-day/
   *  duplicated-ID/name-change/transfer-world results, etc.) — these opcodes have no
   *  dedicated dialog UI in this client, so each is surfaced as a one-line status
   *  message rather than silently dropped (matches pass 12's ITCHandlers precedent
   *  for "decoded correctly, no dedicated panel built yet"). */
  private _statusMessage = '';

  constructor(ui: WzPackage | null, prevW = 800, prevH = 600) {
    super();
    this._ui = ui;
    this._prevW = prevW;
    this._prevH = prevH;
    this._root = new Container();
    this._g = new Graphics();
    this._root.addChild(this._g);
    this._seedItems();
  }

  onEnter(game: MapleClaudeGame): void {
    super.onEnter(game);
    this._loader = new WzTextureLoader();
    this._icons = new ItemIconLoader(this._loader, game.wz.character, game.wz.item);
    const maxSlots = MaxItems;
    this._iconSprites = Array.from({ length: maxSlots }, () => {
      const s = new Sprite(Texture.EMPTY);
      s.visible = false;
      this._root.addChild(s);
      return s;
    });
    this._loadAssets();
    this._allButtons = [...this._tabBtns, ...this._buyBtns];
    if (this._btExit) this._allButtons.push(this._btExit);
    if (this._btPrev) this._allButtons.push(this._btPrev);
    if (this._btNext) this._allButtons.push(this._btNext);
    this._titleText = new Text({ text: 'MapleStory Cash Shop', style: new TextStyle({ fill: 0xFFD700, fontSize: 16, fontFamily: 'monospace' }) });
    this._titleText.x = 130; this._titleText.y = 10;
    this._root.addChild(this._titleText);
    this.mapRoot.addChild(this._root);
    this._root.x = (CsW - 800) / 2;
    this._root.y = 0;
    this._wireHandlers(game);
  }

  onExit(): void {
    this._unwireHandlers();
    for (const s of this._iconSprites) s.destroy();
    this._iconSprites = [];
    this._icons = null;
    this._loader?.Dispose();
    this._loader = null;
    super.onExit();
  }

  /** CCashShop::OnPacket (decompile/4997E0.c) dispatches 12 cases across 13 opcode
   *  values (392/393 share one handler) — all 12 are decoded by CashShopHandlers.ts
   *  already; this stage is the one place that was never wired to consume any of
   *  them (CashShopHandlers itself is a long-lived field on MapleClaudeGame, shared
   *  across stage push/pop, so callbacks must be (re)bound here on enter and cleared
   *  on exit rather than once at construction). */
  private _wireHandlers(game: MapleClaudeGame): void {
    const h = game.cashShopHandlers;
    h.onQueryCashResult = (amount: CashShopCashAmount) => {
      this._nxCredit = amount.nexonCash;
      this._maplePoints = amount.maplePoint;
      this._nxPrepaid = amount.prepaidNxCash;
    };
    h.onNoticeFreeCashItem = () => { this._statusMessage = 'You have a free item waiting in your Cash Inventory.'; };
    h.onChargeParamResult = (nexonClubId: string) => { this._statusMessage = `Nexon Club ID: ${nexonClubId}`; };
    h.onGachaponStampResult = (success: boolean, stampCount: number | null) => {
      this._statusMessage = success ? `Gachapon stamp granted (${stampCount ?? 0} total).` : 'Gachapon stamp not granted.';
    };
    h.onCashItemGachaponResult = (args: CashShopGachaponResult) => {
      this._statusMessage = args.isSuccess ? 'Gachapon roll complete!' : 'Gachapon roll failed.';
    };
    h.onOneADay = (args: CashShopOneADayResult) => {
      this._statusMessage = args.count > 0 ? `One-a-day item available (sn ${args.itemSn}).` : 'No one-a-day item available today.';
    };
    h.onCheckDuplicatedIDResult = (name: string, result: number) => {
      this._statusMessage = result === 0 ? `"${name}" is available.` : `"${name}" is not available.`;
    };
    h.onCheckNameChangePossibleResult = (result: number, _birthDate: number) => {
      this._statusMessage = result === 0 ? 'Name change is available.' : 'Name change is not available.';
    };
    h.onCheckTransferWorldPossibleResult = (args: CashShopTransferWorldResult) => {
      this._statusMessage = args.result === 0
        ? `World transfer available (${args.worldNames.length} destination world(s)).`
        : 'World transfer is not available.';
    };
    h.onGiftMateInfoResult = (args) => {
      this._statusMessage = args.success ? `Gift ready to send to ${args.giveTo ?? '?'}.` : 'Could not load gift recipient info.';
    };
    h.onPurchaseExpChanged = (value: number) => { this._statusMessage = `Purchase EXP bonus: ${value}.`; };
    h.onCashItemResult = (args: CashItemResult) => {
      this._statusMessage = this._describeCashItemResult(args);
    };
  }

  // TODO_AUDIT.md Hundred-and-eighty-second pass: CashItemResult was already
  // decoded field-for-field, but the stage displayed only `sub 0xNN`. Map the
  // verified sub-actions to user-readable status without inventing CashShop UI.
  private _describeCashItemResult(args: CashItemResult): string {
    switch (args.subAction) {
      case 0x54: return `Limited item ${args.itemId}: ${args.remainCount} left.`;
      case 0x58: return `Loaded Cash locker: ${args.itemCount} item(s), ${args.trunkCount} storage slot(s).`;
      case 0x5A: return `Loaded ${args.giftCount} gift(s).`;
      case 0x5C: return 'Loaded Cash Shop wishlist.';
      case 0x62: return 'Updated Cash Shop wishlist.';
      case 0x64: return 'Cash item purchase complete.';
      case 0x66: return `Coupon used: ${args.itemCount} item(s), ${args.totalMaplePointGiven} Maple Point(s), ${args.mesoAmount} meso.`;
      case 0x68: return `Gift coupon sent to ${args.receiverName}: ${args.itemCount} item(s).`;
      case 0x6B: return `Gift sent to ${args.receiverName}: item ${args.itemId} x${args.quantity}.`;
      case 0x6D: return `Inventory type ${args.invType} expanded to ${args.newSlotCount} slots.`;
      case 0x6F: return `Storage expanded to ${args.trunkCount} slots.`;
      case 0x71: return `Character slots expanded to ${args.characterSlotCount}.`;
      case 0x73: return `Buy-character count expanded to ${args.buyCharacterCount}.`;
      case 0x75: return `Equip slot extension added ${args.daysAdded} day(s).`;
      case 0x77: return `Moved item from locker to slot ${args.position}.`;
      case 0x79: return 'Moved item back to Cash locker.';
      case 0x7B: return 'Cash item destroyed.';
      case 0x7D: return 'Cash item expired.';
      case 0x96: return `Rebate complete: ${args.maplePointAmount} Maple Point(s).`;
      case 0x98: return `Couple item sent to ${args.receiverName}: item ${args.itemId} x${args.quantity}.`;
      case 0x9A: return `Package purchase complete: ${args.itemCount} item(s).`;
      case 0x9C: return `Package gift sent to ${args.receiverName}: item ${args.itemId}.`;
      case 0x9E: return `Normal purchase complete: ${args.count} item(s).`;
      case 0xA2: return `Friendship item sent to ${args.receiverName}: item ${args.itemId} x${args.quantity}.`;
      case 0xAA: return 'Free Cash item claimed.';
      case 0xAF: return args.available ? `Purchase record ${args.key} is available.` : `Purchase record ${args.key} is unavailable.`;
      case 0xB3: return 'Name-change item purchase complete.';
      case 0xB5: return 'World-transfer item purchase complete.';
      case 0xB7: return `Cash Gachapon opened: ${args.remain} roll(s) remain.`;
      case 0xB9: return `Cash Gachapon copy complete; lost item ${args.randomItemLostItemId} x${args.randomItemLostNumber}.`;
      case 0xBB: return `Changed ${args.maplePointAmount} Maple Point(s).`;
      default:
        const raw = args as { subAction: number; reason?: number };
        if (raw.reason !== undefined) return `Cash item request failed (sub 0x${raw.subAction.toString(16)}, reason ${raw.reason}).`;
        return `Cash item result: sub 0x${raw.subAction.toString(16)}.`;
    }
  }

  private _unwireHandlers(): void {
    if (!this.game) return;
    this.game.cashShopHandlers.clear();
  }

  update(_dt: number): void {
    for (const t of this._dynamicChildren) t.destroy();
    this._dynamicChildren = [];

    this._g.clear();
    this._g.rect(0, 0, CsW, CsH).fill({ color: 0x0E1226 });

    if (this._bg) this._drawSprite(this._bg, 0, 0);

    if (this._banner) this._drawSprite(this._banner, 138, 40);

    if (this._bgStatus) this._drawSprite(this._bgStatus, CsW / 2, 20);
    else this._g.rect(0, 0, CsW, 38).fill({ color: 0x10141F });

    const balanceText = new Text({
      text: `NX Credit: ${this._nxCredit}   NX Prepaid: ${this._nxPrepaid}   Maple Points: ${this._maplePoints}`,
      style: new TextStyle({ fill: 0xFFFFFF, fontSize: 12, fontFamily: 'monospace' }),
    });
    balanceText.x = CsW / 2 - 160; balanceText.y = 14;
    this._root.addChild(balanceText);
    this._dynamicChildren.push(balanceText);

    if (this._statusMessage) {
      const statusText = new Text({
        text: this._statusMessage,
        style: new TextStyle({ fill: 0x9FE0A0, fontSize: 12, fontFamily: 'monospace' }),
      });
      statusText.x = 138; statusText.y = CsH - 56;
      this._root.addChild(statusText);
      this._dynamicChildren.push(statusText);
    }

    this._g.rect(0, 40, 130, CsH - 90).fill({ color: 0x10142A });
    for (let i = 0; i < 9; i++) {
      const ty = TabY0 + i * 56;
      const isActive = i === this._activeTab;
      this._g.rect(TabX, ty, TabW, TabH).fill({ color: isActive ? 0x28324F : 0x16192C });
      this._g.rect(TabX, ty, TabW, TabH).stroke({ color: isActive ? 0x6482C8 : 0x2D3250, width: 1 });
      const lbl = new Text({ text: TabNames[i], style: new TextStyle({ fill: isActive ? 0xFFFFFF : 0xA0A5BE, fontSize: 12, fontFamily: 'monospace' }) });
      lbl.x = TabX + 8; lbl.y = ty + 16;
      this._root.addChild(lbl);
      this._dynamicChildren.push(lbl);
    }

    const tab = this._tabItems[this._activeTab];
    const offset = this._page * MaxItems;
    const totalPages = Math.max(1, Math.ceil(tab.length / MaxItems));
    for (let r = 0; r < ItemRows; r++) {
      for (let c = 0; c < ItemCols; c++) {
        const idx = r * ItemCols + c;
        if (idx >= MaxItems) continue;
        const absIdx = offset + idx;
        const ox = ItemGridX + c * ItemStepX;
        const oy = ItemGridY + r * ItemStepY;
        if (absIdx < tab.length) {
          this._g.rect(ox, oy, 120, 200).fill({ color: 0x14182A });
          this._g.rect(ox, oy, 120, 200).stroke({ color: 0x373C5F, width: 1 });
          const item = tab[absIdx];
          const icon = this._icons?.LoadIcon(item.id);
          const sp = this._iconSprites[idx];
          if (icon) {
            sp.texture = icon.Texture;
            sp.anchor.set(icon.Width > 0 ? icon.OriginX / icon.Width : 0, icon.Height > 0 ? icon.OriginY / icon.Height : 0);
            sp.position.set(ox + 60, oy + 50);
            sp.visible = true;
          } else {
            sp.visible = false;
          }
          const nameText = new Text({ text: item.name.slice(0, 11), style: new TextStyle({ fill: 0xFFFFFF, fontSize: 11, fontFamily: 'monospace' }) });
          nameText.x = ox + 8; nameText.y = oy + 110;
          this._root.addChild(nameText);
          this._dynamicChildren.push(nameText);
          const priceText = new Text({ text: `${item.price} NX`, style: new TextStyle({ fill: 0xDCC868, fontSize: 11, fontFamily: 'monospace' }) });
          priceText.x = ox + 8; priceText.y = oy + 130;
          this._root.addChild(priceText);
          this._dynamicChildren.push(priceText);
        } else {
          this._g.rect(ox, oy, 120, 200).fill({ color: 0x0E112A, alpha: 0.6 });
          this._iconSprites[idx].visible = false;
        }
      }
    }
    const pageText = new Text({ text: `Page ${this._page + 1} / ${totalPages}`, style: new TextStyle({ fill: 0xA0A5BE, fontSize: 12, fontFamily: 'monospace' }) });
    pageText.x = CsW / 2 - 40; pageText.y = CsH - 30;
    this._root.addChild(pageText);
    this._dynamicChildren.push(pageText);

    this._g.rect(CsW / 2 - 130, CsH - 34, 30, 22).fill({ color: this._page > 0 ? 0x28324F : 0x16192C });
    const prevText = new Text({ text: '<', style: new TextStyle({ fill: 0xFFFFFF, fontSize: 12, fontFamily: 'monospace' }) });
    prevText.x = CsW / 2 - 119; prevText.y = CsH - 30;
    this._root.addChild(prevText);
    this._dynamicChildren.push(prevText);

    this._g.rect(CsW / 2 + 100, CsH - 34, 30, 22).fill({ color: this._page < totalPages - 1 ? 0x28324F : 0x16192C });
    const nextText = new Text({ text: '>', style: new TextStyle({ fill: 0xFFFFFF, fontSize: 12, fontFamily: 'monospace' }) });
    nextText.x = CsW / 2 + 111; nextText.y = CsH - 30;
    this._root.addChild(nextText);
    this._dynamicChildren.push(nextText);
  }

  draw(): void {}

  onResize(windowW: number, windowH: number): void {
    this._root.x = Math.floor((windowW - CsW) / 2);
    this._root.y = 0;
  }

  onKeyPress(key: string): void {
    if (key === 'Escape') this._exit();
  }

  onMouseButton(x: number, y: number, down: boolean, _button: MouseButton): void {
    if (!down) return;
    const lx = x - this._root.x;
    const ly = y;
    if (lx >= CsW - 38 && ly < 22) {
      this._exit();
      return;
    }
    for (let i = 0; i < 9; i++) {
      const ty = TabY0 + i * 56;
      if (lx >= TabX && lx < TabX + TabW && ly >= ty && ly < ty + TabH) {
        this._activeTab = i;
        this._page = 0;
        return;
      }
    }
    const totalPages = Math.max(1, Math.ceil(this._tabItems[this._activeTab].length / MaxItems));
    if (lx >= CsW / 2 - 130 && lx < CsW / 2 - 100 && ly >= CsH - 34 && ly < CsH - 12) {
      if (this._page > 0) this._page--;
      return;
    }
    if (lx >= CsW / 2 + 100 && lx < CsW / 2 + 130 && ly >= CsH - 34 && ly < CsH - 12) {
      if (this._page < totalPages - 1) this._page++;
      return;
    }
  }

  private _exit(): void {
    if (this.game.session.isConnected) this.game.session.send(GameSender.ReturnFromCashShop());
    this.stageDirector.pop();
  }

  private _loadAssets(): void {
    if (this._ui === null || this._loader === null) return;
    const cs = this._ui.GetItem('CashShop.img') as WzProperty | undefined
      ?? this._ui.GetItem('UIWindow2.img/CashShop.img') as WzProperty | undefined
      ?? this._ui.GetItem('UI.img/CashShop.img') as WzProperty | undefined;
    if (cs === undefined) return;
    this._bg = this._loadCanvas(cs, 'Base/backgrnd');
    this._banner = this._loadCanvas(cs, 'CSPromotionBanner/0') ?? this._loadCanvas(cs, 'CS3thEvent/0');
    this._bgStatus = this._loadCanvas(cs, 'CSStatus/backgrnd');
    this._bgList = this._loadCanvas(cs, 'CSList/backgrnd');
    this._bgChar = this._loadCanvas(cs, 'CSChar/backgrnd');
    this._bgSearch = this._loadCanvas(cs, 'CSItemSearch/backgrnd');
    this._slotBase = this._loadCanvas(cs, 'CSList/item/base');
    this._slotNone = this._loadCanvas(cs, 'CSList/item/none');
    for (let i = 0; i < 9; i++) {
      this._tabSprites[i] = this._loadCanvas(cs, `CSTab/${i}/normal/0`);
    }
  }

  private _loadCanvas(root: WzProperty | null | undefined, path: string): WzSprite | null {
    if (root === null || root === undefined || this._loader === null) return null;
    const node = root.GetItem(path);
    return node instanceof WzCanvas ? this._loader.Load(node) : null;
  }

  private _drawSprite(sprite: WzSprite, x: number, y: number): void {
    const s = sprite.ToPixi();
    s.position.set(x, y);
    this._root.addChild(s);
  }

  private _seedItems(): void {
    const t0 = this._tabItems[0];
    t0.push({ id: 5000054, name: 'White Bunny', price: 3300, label: 'NEW', discount: false, discPrice: 0 });
    t0.push({ id: 5000055, name: 'Black Cat', price: 3300, label: 'HOT', discount: false, discPrice: 0 });
    t0.push({ id: 5010046, name: 'Maple Mount', price: 4300, label: 'NEW', discount: false, discPrice: 0 });
    t0.push({ id: 5200000, name: 'Safety Charm', price: 1200, label: '', discount: false, discPrice: 0 });
    t0.push({ id: 5200001, name: 'Pet Food', price: 500, label: '', discount: false, discPrice: 0 });
    t0.push({ id: 5062000, name: 'Slot Coupon', price: 3300, label: 'SALE', discount: true, discPrice: 2500 });
    t0.push({ id: 5040000, name: 'Name Change', price: 9900, label: '', discount: false, discPrice: 0 });
    t0.push({ id: 5040001, name: 'World Transfer', price: 9900, label: 'LIMITED', discount: false, discPrice: 0 });

    const t1 = this._tabItems[1];
    t1.push({ id: 1002357, name: 'Pink Bunny Hat', price: 1200, label: '', discount: false, discPrice: 0 });
    t1.push({ id: 1040090, name: 'Maple Suit', price: 3500, label: '', discount: false, discPrice: 0 });
    t1.push({ id: 1041090, name: 'Maple Dress', price: 3500, label: '', discount: false, discPrice: 0 });
    t1.push({ id: 1062080, name: 'Maple Pants', price: 2200, label: 'SALE', discount: false, discPrice: 0 });
    t1.push({ id: 1072095, name: 'Maple Shoes', price: 1800, label: '', discount: false, discPrice: 0 });
    t1.push({ id: 1102085, name: 'Angel Wings', price: 3300, label: 'HOT', discount: false, discPrice: 0 });
    t1.push({ id: 1012133, name: 'Maple Specs', price: 1100, label: '', discount: false, discPrice: 0 });
  }
}
