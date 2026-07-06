import { WzImage } from '../wz/WzImage.js';
import type { WzPackage } from '../wz/WzPackage.js';

/**
Client-side forbidden-word filter for character names, mirroring the v95 client's
word check (called before the CheckDuplicatedID packet). The list is the
union of `Etc.wz/ForbiddenName.img` and `Etc.wz/Curse.img` — each a flat
list of string children ("0","1",…). Each raw entry is split on ',', trimmed
and lowercased; a name is forbidden if (lowercased) it CONTAINS any entry as
a substring.

The Kinoko server does a narrower exact match against ForbiddenName.img only,
so this client filter is intentionally the stricter, authentic one — it never
lets through a name the server would reject.
*/
export class ForbiddenNameProvider {
  private _words: string[] = [];

  constructor(etcWz: WzPackage | null) {
    try {
      this._load(etcWz, 'ForbiddenName.img');
      this._load(etcWz, 'Curse.img');
    } catch (ex) {
      console.warn('ForbiddenName/Curse load failed', ex);
    }
    console.log(`ForbiddenName: ${this._words.length} words loaded`);
  }

  get HasData(): boolean {
    return this._words.length > 0;
  }

  /** True if the (lowercased) name contains any forbidden word as a substring. */
  IsForbidden(name: string): boolean {
    if (name.length === 0) return false;
    const lower = name.toLowerCase();
    for (const w of this._words) {
      if (lower.includes(w)) return true;
    }
    return false;
  }

  private _load(etc: WzPackage | null, imgName: string): void {
    // A ".img" node resolves to a WzImage; its property children are the string entries.
    const img = etc?.GetItem(imgName);
    if (!(img instanceof WzImage)) return;
    for (const val of Object.values(img.Root.Items)) {
      if (typeof val === 'string') this._addEntry(val);
    }
  }

  private _addEntry(raw: string): void {
    // Some entries are comma-delimited; the client splits on ',', trims, lowercases.
    for (const part of raw.split(',')) {
      const w = part.trim().toLowerCase();
      if (w.length > 0) this._words.push(w);
    }
  }
}
