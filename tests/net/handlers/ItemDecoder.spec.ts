import { describe, it, expect } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { FieldHandlers } from '../../../src/net/handlers/FieldHandlers.js';
import { OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';
import { ItemDecoder } from '../../../src/net/packet/ItemDecoder.js';
import { InvItemType, InventoryType } from '../../../src/domain/InventoryItem.js';

function dispatchPayload(router: PacketRouter, _opcode: number, payload: Uint8Array): void {
  router.dispatch(new InPacket(payload), null as any);
}

// Writes item body after the type prefix used by ItemDecoder.Decode.
function writeBundleBody(p: OutPacket, itemId: number, qty: number, title = ''): void {
  p.writeInt(itemId); p.writeByte(0); p.writeLong(0n);
  p.writeShort(qty); p.writeString(title); p.writeShort(0);
}

// Writes equip body after the type prefix used by ItemDecoder.Decode.
function writeEquipBody(p: OutPacket, itemId: number, str: number, durability: number): void {
  p.writeInt(itemId); p.writeByte(0); p.writeLong(0n);
  p.writeByte(7); p.writeByte(0); p.writeShort(str);
  for (let i = 0; i < 14; i++) p.writeShort(0);
  p.writeString(''); p.writeShort(0); p.writeByte(0); p.writeByte(0);
  p.writeInt(0); p.writeInt(durability); p.writeInt(0); p.writeByte(0); p.writeByte(0);
  for (let i = 0; i < 5; i++) p.writeShort(0);
  p.writeLong(123456n); p.writeLong(0n); p.writeInt(0);
}

describe('ItemDecoder', () => {
  it('decodes bundle quantity', () => {
    const p = OutPacket.Of(OutHeader.InventoryOperation);
    p.writeByte(InvItemType.Bundle);
    writeBundleBody(p, 2000000, 200, 'Red Potion');
    const r = new InPacket(p.toArray());
    r.readShort();
    const item = ItemDecoder.Decode(r);
    expect(item.type).toBe(InvItemType.Bundle);
    expect(item.itemId).toBe(2000000);
    expect(item.quantity).toBe(200);
    expect(item.title).toBe('Red Potion');
    expect(item.equip).toBeNull();
    expect(r.remaining).toBe(0);
  });

  it('decodes equip stats exactly', () => {
    const p = OutPacket.Of(OutHeader.InventoryOperation);
    p.writeByte(InvItemType.Equip);
    writeEquipBody(p, 1302000, 5, -1);
    const r = new InPacket(p.toArray());
    r.readShort();
    const item = ItemDecoder.Decode(r);
    expect(item.type).toBe(InvItemType.Equip);
    expect(item.itemId).toBe(1302000);
    expect(item.equip).not.toBeNull();
    expect(item.equip!.ruc).toBe(7);
    expect(item.equip!.incStr).toBe(5);
    expect(item.equip!.durability).toBe(-1);
    expect(item.itemSn).toBe(123456n);
    expect(r.remaining).toBe(0);
  });

  it('InventoryOperation new item fires event', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any[] | null = null;
    fh.onInventoryOperation = (ops: any[]) => captured = ops;

    const p = OutPacket.Of(OutHeader.InventoryOperation);
    p.writeByte(0); p.writeByte(1); p.writeByte(0);
    p.writeByte(InventoryType.Consume); p.writeShort(3);
    p.writeByte(InvItemType.Bundle);
    writeBundleBody(p, 2000000, 50);
    p.writeByte(0);
    dispatchPayload(router, OutHeader.InventoryOperation, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured!).toHaveLength(1);
    expect(captured![0].opType).toBe(0);
    expect(captured![0].invType).toBe(InventoryType.Consume);
    expect(captured![0].pos).toBe(3);
    expect(captured![0].item.itemId).toBe(2000000);
  });

  it('InventoryOperation move decodes new pos', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any[] | null = null;
    fh.onInventoryOperation = (ops: any[]) => captured = ops;

    const p = OutPacket.Of(OutHeader.InventoryOperation);
    p.writeByte(0); p.writeByte(1); p.writeByte(2);
    p.writeByte(InventoryType.Equip); p.writeShort(1); p.writeShort(5);
    p.writeByte(0);
    dispatchPayload(router, OutHeader.InventoryOperation, p.toArray());

    expect(captured).not.toBeNull();
    expect(captured![0].opType).toBe(2);
    expect(captured![0].pos).toBe(1);
    expect(captured![0].newPos).toBe(5);
  });

  it('decodes pet item per GW_ItemSlotPet::RawDecode (TODO_AUDIT.md Sixtieth pass)', () => {
    const p = OutPacket.Of(OutHeader.InventoryOperation);
    p.writeByte(InvItemType.Pet);
    p.writeInt(5000000); p.writeByte(0); p.writeLong(0n); // common prefix
    p.writeStringFixed('Fluffy', 13);
    p.writeByte(10);       // level (discarded)
    p.writeShort(50);      // tameness (discarded)
    p.writeByte(80);       // repleteness (discarded)
    p.writeLong(0n);       // dateDead FILETIME (discarded)
    p.writeShort(0);       // petAttribute (discarded)
    p.writeShort(7);       // real petSkill bitmask
    p.writeInt(0);         // remainLife (discarded)
    p.writeShort(3);       // attribute
    const r = new InPacket(p.toArray());
    r.readShort();
    const item = ItemDecoder.Decode(r);
    expect(item.petName).toBe('Fluffy');
    expect(item.petSkill).toBe(7);
    expect(item.attribute).toBe(3);
    expect(r.remaining).toBe(0);
  });

  it('InventoryType has canonical values', () => {
    expect(InventoryType.Equipped).toBe(0);
    expect(InventoryType.Equip).toBe(1);
    expect(InventoryType.Consume).toBe(2);
    expect(InventoryType.Install).toBe(3);
    expect(InventoryType.Etc).toBe(4);
    expect(InventoryType.Cash).toBe(5);
  });
});
