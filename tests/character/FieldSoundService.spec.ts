import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/wz/WzSound.js', () => ({
  WzSound: class MockWzSound {
    AudioBytes: Uint8Array;
    constructor() { this.AudioBytes = new Uint8Array([1, 2, 3]); }
  },
}));

import { FieldSoundService } from '../../src/character/FieldSoundService.js';
import { WzSound } from '../../src/wz/WzSound.js';

const stubPackage = (entries: Record<string, unknown> = {}) => ({
  GetItem: vi.fn((path: string) => entries[path] ?? null),
});

const stubAudio = () => ({ PlayEffect: vi.fn() });

describe('FieldSoundService', () => {
  it('plays Sound.wz/Game.img/DropItem when PlayDrop is called', () => {
    const sound = new WzSound();
    const pkg = stubPackage({ 'Game.img/DropItem': sound });
    const audio = stubAudio();
    const svc = new FieldSoundService(pkg as any, audio as any);
    svc.PlayDrop();
    expect(audio.PlayEffect).toHaveBeenCalledTimes(1);
    expect(audio.PlayEffect).toHaveBeenCalledWith(sound.AudioBytes);
  });

  it('plays Sound.wz/Game.img/PickUpItem when PlayPickUp is called', () => {
    const sound = new WzSound();
    const pkg = stubPackage({ 'Game.img/PickUpItem': sound });
    const audio = stubAudio();
    const svc = new FieldSoundService(pkg as any, audio as any);
    svc.PlayPickUp();
    expect(audio.PlayEffect).toHaveBeenCalledTimes(1);
    expect(audio.PlayEffect).toHaveBeenCalledWith(sound.AudioBytes);
  });

  it('caches the resolved sound and does not re-resolve on repeat plays', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(10_000);
      const pkg = stubPackage({ 'Game.img/DropItem': new WzSound() });
      const audio = stubAudio();
      const svc = new FieldSoundService(pkg as any, audio as any);
      svc.PlayDrop();
      vi.setSystemTime(10_000 + 301); // past the OG 300ms throttle
      svc.PlayDrop();
      expect(pkg.GetItem).toHaveBeenCalledTimes(1);
      expect(audio.PlayEffect).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('throttles the drop sound to one play per 300ms (OG tLastSfx gate)', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(50_000);
      const pkg = stubPackage({ 'Game.img/DropItem': new WzSound() });
      const audio = stubAudio();
      const svc = new FieldSoundService(pkg as any, audio as any);
      svc.PlayDrop();
      vi.setSystemTime(50_000 + 300); // exactly 300ms — OG requires > 300
      svc.PlayDrop();
      expect(audio.PlayEffect).toHaveBeenCalledTimes(1);
      vi.setSystemTime(50_000 + 301);
      svc.PlayDrop();
      expect(audio.PlayEffect).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('no-ops when the Sound.wz package is unavailable', () => {
    const audio = stubAudio();
    const svc = new FieldSoundService(null, audio as any);
    svc.PlayDrop();
    expect(audio.PlayEffect).not.toHaveBeenCalled();
  });

  it('plays nothing when the WZ node is missing', () => {
    const pkg = stubPackage({});
    const audio = stubAudio();
    const svc = new FieldSoundService(pkg as any, audio as any);
    svc.PlayPickUp();
    expect(audio.PlayEffect).not.toHaveBeenCalled();
  });
});
