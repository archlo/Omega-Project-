import { describe, it, expect } from 'vitest';
import { PacketRouter } from '../../../src/net/session/PacketRouter.js';
import { FieldHandlers } from '../../../src/net/handlers/FieldHandlers.js';
import { OutHeader } from '../../../src/net/packet/OpCodes.js';
import { OutPacket } from '../../../src/net/packet/OutPacket.js';
import { InPacket } from '../../../src/net/packet/InPacket.js';

function dispatchPayload(router: PacketRouter, payload: Uint8Array): void {
  router.dispatch(new InPacket(payload), null as any);
}

// OG: CField::OnFieldEffect (decompile/53B790.c) — 8-case switch.
describe('FieldEffect', () => {
  it('subType 0 decodes summonId/x/y', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onFieldEffect = (a) => captured = a;

    const p = OutPacket.Of(OutHeader.FieldEffect);
    p.writeByte(0); p.writeByte(5); p.writeInt(100); p.writeInt(200);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ subType: 0, summonId: 5, x: 100, y: 200 });
  });

  it('subType 1 decodes trembleIntensity/trembleDurationMs', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onFieldEffect = (a) => captured = a;

    const p = OutPacket.Of(OutHeader.FieldEffect);
    p.writeByte(1); p.writeByte(10); p.writeInt(3000);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ subType: 1, trembleIntensity: 10, trembleDurationMs: 3000 });
  });

  it('subType 2 decodes objectState', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onFieldEffect = (a) => captured = a;

    const p = OutPacket.Of(OutHeader.FieldEffect);
    p.writeByte(2); p.writeString('open');
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ subType: 2, objectState: 'open' });
  });

  it('subType 3 decodes screenEffectUol', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onFieldEffect = (a) => captured = a;

    const p = OutPacket.Of(OutHeader.FieldEffect);
    p.writeByte(3); p.writeString('OnTheFly');
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ subType: 3, screenEffectUol: 'OnTheFly' });
  });

  it('subType 5 decodes mobTemplateId/hp/maxHp/hpColor', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onFieldEffect = (a) => captured = a;

    const p = OutPacket.Of(OutHeader.FieldEffect);
    p.writeByte(5); p.writeInt(8800000); p.writeInt(50000); p.writeInt(100000); p.writeByte(2); p.writeByte(0);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ subType: 5, mobTemplateId: 8800000, hp: 50000, maxHp: 100000, hpColor: 2 });
  });

  it('subType 6 decodes bgmUol', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onFieldEffect = (a) => captured = a;

    const p = OutPacket.Of(OutHeader.FieldEffect);
    p.writeByte(6); p.writeString('Bgm00/Boss');
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ subType: 6, bgmUol: 'Bgm00/Boss' });
  });

  it('subType 7 decodes rewardJobIdx/PartIdx/LevIdx', () => {
    const router = new PacketRouter();
    const fh = new FieldHandlers();
    fh.register(router);
    let captured: any = null;
    fh.onFieldEffect = (a) => captured = a;

    const p = OutPacket.Of(OutHeader.FieldEffect);
    p.writeByte(7); p.writeInt(100); p.writeInt(200); p.writeInt(3);
    dispatchPayload(router, p.toArray());

    expect(captured).toEqual({ subType: 7, rewardJobIdx: 100, rewardPartIdx: 200, rewardLevIdx: 3 });
  });
});
