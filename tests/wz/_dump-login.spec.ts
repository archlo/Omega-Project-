import { describe, it } from 'vitest';
import { WzPackage } from '../../src/wz/WzPackage.js';
import { WzCanvas } from '../../src/wz/WzCanvas.js';

describe('dump Login.img/Title canvas formats', () => {
  it('checks format/width/height', () => {
    const dir = process.env.MAPLECLAUDE_WZ_DIR;
    if (!dir) {
      console.log('MAPLECLAUDE_WZ_DIR not set — skipping');
      return;
    }
    const ui = WzPackage.OpenBase(dir, 'UI');

    for (const path of ['Login.img/Title/signboard', 'Login.img/Title/ID', 'Login.img/Title/PW', 'Login.img/Title/BtLogin/normal/0']) {
      const v = ui.GetItem(path);
      if (v instanceof WzCanvas) {
        try {
          console.log(`${path}: width=${v.Width} height=${v.Height} format=${v.Format} formatScale=${v.FormatScale}`);
          const bgra = v.DecodeBgra();
          console.log(`${path}: decoded ${bgra.length} bytes`);
        } catch (e) {
          console.log(`${path}: ERROR`, e);
        }
      } else {
        console.log(`${path}: not a WzCanvas =>`, (v as object)?.constructor?.name);
      }
    }
  });
});
