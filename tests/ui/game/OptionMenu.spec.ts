import { describe, it, expect } from 'vitest';
import { Texture, Sprite } from 'pixi.js';
import { OptionMenu } from '../../../src/ui/game/OptionMenu.js';

(globalThis as any).window ??= { innerWidth: 800, innerHeight: 600 };

// OG CUISysOpt (v95). Controls created in OnCreate @0x978010 at window-relative
// coords; window 283x419 centered (CreateDlg @0x4FEC40: -w/2, -h/2, Origin_CC).
// Behavior: SetRet @0x969980 — OK(1)=apply+save+close, Cancel(2)=revert+close.
// Mutual-exclusive checkbox pairs per OnChildNotify @0x969820 (param1=200).
// The screenshot-format combo is disabled in this client.
describe('OptionMenu (CUISysOpt)', () => {
  it('centers the 283x419 window on screen', () => {
    const panel = new OptionMenu();
    expect(panel.container.x).toBe((800 - 283) >> 1);
    expect(panel.container.y).toBe((600 - 419) >> 1);
  });

  it('keeps resolution checkboxes mutual-exclusive', () => {
    const panel = new OptionMenu();
    panel.isVisible = true;
    const x0 = panel.container.x;
    const y0 = panel.container.y;
    // click "1024x768" (165, 60)
    panel.handleMouseButton(x0 + 170, y0 + 65, true);
    expect(panel.config.largeScreen).toBe(true);
    // click "800x600" (65, 60) → back to small
    panel.handleMouseButton(x0 + 70, y0 + 65, true);
    expect(panel.config.largeScreen).toBe(false);
  });

  it('keeps windowed/full-screen mutual-exclusive', () => {
    const panel = new OptionMenu();
    panel.isVisible = true;
    const x0 = panel.container.x;
    const y0 = panel.container.y;
    panel.handleMouseButton(x0 + 70, y0 + 340, true); // Full Screen (65, 336)
    expect(panel.config.windowed).toBe(false);
    panel.handleMouseButton(x0 + 70, y0 + 328, true); // Windowed (65, 324)
    expect(panel.config.windowed).toBe(true);
  });

  it('keeps mini-map normal/simple mutual-exclusive', () => {
    const panel = new OptionMenu();
    panel.isVisible = true;
    const x0 = panel.container.x;
    const y0 = panel.container.y;
    panel.handleMouseButton(x0 + 150, y0 + 365, true); // Simple (147, 361)
    expect(panel.config.minimapNormal).toBe(false);
    panel.handleMouseButton(x0 + 70, y0 + 365, true); // Normal (65, 361)
    expect(panel.config.minimapNormal).toBe(true);
  });

  it('Cancel reverts to the config snapshot taken when opened', () => {
    const panel = new OptionMenu();
    panel.config.bgmVol = 10;
    panel.isVisible = true; // snapshot { bgmVol: 10 }
    const changed: number[] = [];
    panel.onSettingsChanged = () => changed.push(1);
    // change BGM volume to 19
    const x0 = panel.container.x;
    const y0 = panel.container.y;
    panel.handleMouseButton(x0 + 95 + 95, y0 + 95, true); // bgm slider (95, 91)
    expect(panel.config.bgmVol).toBe(19);
    expect(changed.length).toBe(1);
    // Cancel → revert to snapshot (bgmVol 10)
    panel.onKeyPress('Escape');
    expect(panel.config.bgmVol).toBe(10);
    expect(panel.isVisible).toBe(false);
  });

  it('OK keeps the changed config and closes', () => {
    const panel = new OptionMenu();
    panel.config.bgmVol = 10;
    panel.isVisible = true;
    const changed: number[] = [];
    panel.onSettingsChanged = () => changed.push(1);
    const x0 = panel.container.x;
    const y0 = panel.container.y;
    panel.handleMouseButton(x0 + 95 + 95, y0 + 95, true);
    expect(panel.config.bgmVol).toBe(19);
    panel.onKeyPress('Enter');
    expect(panel.config.bgmVol).toBe(19);
    expect(changed.length).toBe(2);
    expect(panel.isVisible).toBe(false);
  });

  it('volume percent maps OG 0..19 range to 0..100', () => {
    const panel = new OptionMenu();
    expect(panel.BgmVolume).toBe(panel.config.bgmMute ? 0 : Math.round(panel.config.bgmVol / 19 * 100));
    panel.config.bgmVol = 19;
    panel.config.bgmMute = false;
    expect(panel.BgmVolume).toBe(100);
    panel.config.bgmMute = true;
    expect(panel.BgmVolume).toBe(0);
  });

  it('does not render the screenshot-format combo', () => {
    const panel = new OptionMenu();
    expect((panel as any).config.screenshot).toBeUndefined();
    expect((panel as any).SS_LABELS).toBeUndefined();
    // MobInfo combo still present at its OG position (66, 298)
    panel.isVisible = true;
    const x0 = panel.container.x;
    const y0 = panel.container.y;
    panel.handleMouseButton(x0 + 70, y0 + 302, true);
    expect(panel['_openCombo']).toBe('mobInfo');
  });

  it('uses the 50px title drag region (HitTest ry<50 → drag)', () => {
    const panel = new OptionMenu();
    // beginDrag uses getLocalBounds(); give the root the real 283x419 size.
    const bg = new Sprite(Texture.WHITE);
    bg.width = 283; bg.height = 419;
    panel.container.addChild(bg);
    panel.isVisible = true;
    // inside title bar (y offset 40) → beginDrag consumes it
    expect(panel.beginDrag(40, 40, true)).toBe(true);
    // below the 50px title → not a drag
    expect(panel.beginDrag(40, 60, true)).toBe(false);
  });
});
