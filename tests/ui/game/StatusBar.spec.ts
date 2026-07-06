import { describe, expect, it } from 'vitest';
import { WzTextureLoader } from '../../../src/render/WzTextureLoader.js';
import { BuiltInFont } from '../../../src/ui/BuiltInFont.js';
import { StatusBar } from '../../../src/ui/game/StatusBar.js';

describe('StatusBar warning flash', () => {
  it('flashes only when HP decreases below the OG configured threshold', () => {
    const bar = new StatusBar(new WzTextureLoader(), null, new BuiltInFont());
    bar.hpFlash = 10; // OG default: threshold = 5 * setting = 50%.
    bar.hp = 60;
    bar.maxHp = 100;
    bar.update(0);

    bar.hp = 49;
    bar.update(0);
    expect((bar as any)._hpFlashTime).toBe(0.5);

    (bar as any)._hpFlashTime = 0;
    bar.update(0);
    expect((bar as any)._hpFlashTime).toBe(0);

    bar.hpFlash = 0;
    bar.hp = 10;
    bar.update(0);
    expect((bar as any)._hpFlashTime).toBe(0);
  });
});
