import { describe, expect, it } from 'vitest';
import { ItemInfoService, movementProfile } from '../../src/character/ItemInfoService.js';
import { WzProperty } from '../../src/wz/WzProperty.js';

function prop(values: Record<string, unknown>): WzProperty {
  const result = Object.create(WzProperty.prototype) as WzProperty;
  result.Get = (key: string) => values[key] ?? null;
  return result;
}

function service(
  itemInfo: Record<string, unknown>,
  templateInfo: Record<string, unknown>,
  morphInfo: Record<string, unknown> = {},
): ItemInfoService {
  const characterWz = {
    GetItem: () => prop({ info: prop(itemInfo) }),
  } as any;
  const tamingMobWz = {
    GetItem: () => prop(templateInfo),
  } as any;
  const morphWz = {
    GetItem: () => prop(morphInfo),
  } as any;
  return new ItemInfoService(characterWz, null, tamingMobWz, morphWz);
}

describe('ItemInfoService movement data', () => {
  it('reads shoe dFs and nSwim as normalized movement values', () => {
    const info = service({ dFs: 0.75, nSwim: 80 }, {});
    expect(info.GetMovementProfile(1070001, 0, [], 0)).toEqual({
      speed: 100,
      jump: 100,
      walkAcc: 0.75,
      walkDrag: 0.75,
      swimSpeedMultiplier: 0.8,
      source: 'shoe',
    });
  });

  it('applies vehicle template speed/jump and taming equipment overrides', () => {
    const info = service(
      { tamingMob: 1902000 },
      { nSpeed: 100, nJump: 90, dFs: 0.6, nSwim: 75 },
    );
    const profile = info.GetVehicleMovement(1900001, [1900002]);
    expect(profile).toMatchObject({
      speed: 100,
      jump: 90,
      walkAcc: 0.6,
      walkDrag: 0.6,
      swimSpeedMultiplier: 0.75,
      source: 'vehicle',
    });
  });

  it('gives morph movement precedence over mounts and shoes', () => {
    const info = service(
      { dFs: 0.5, nSwim: 50, tamingMob: 1902000 },
      { nSpeed: 110, nJump: 100, dFs: 0.8, nSwim: 90 },
      { nSpeed: 120, nJump: 110, dFs: 0.7 },
    );
    expect(info.GetMovementProfile(1070001, 1900001, [], 1001000)).toMatchObject({
      speed: 120,
      jump: 110,
      walkAcc: 0.7,
      walkDrag: 0.7,
      source: 'morph',
    });
  });

  it('uses safe defaults for absent shoe friction data', () => {
    expect(movementProfile(100, 100, 0, 0, 'shoe')).toMatchObject({
      walkAcc: 1,
      walkDrag: 1,
      swimSpeedMultiplier: 1,
    });
  });
});
