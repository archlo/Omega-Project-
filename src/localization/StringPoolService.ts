import { WzPackage } from '../wz/WzPackage.js';
import { WzImage } from '../wz/WzImage.js';
import { WzProperty } from '../wz/WzProperty.js';

// OG: StringPool — resolves numeric IDs to localized strings from String.wz
// In the v95 client, StringPool::GetString(id) loads from String.wz
// The WZ structure is: String.wz/String.wz/img/NoSound.img/{id}
// where {id} is the StringPool ID (decimal)

export class StringPoolService {
  private _stringWz: (() => WzPackage | null);
  private _cache: Map<number, string> = new Map();
  private _loaded = false;

  constructor(stringWzProvider: () => WzPackage | null) {
    this._stringWz = stringWzProvider;
  }

  // OG: StringPool::GetString — resolves a StringPool ID to a string
  getString(id: number): string | undefined {
    if (!this._loaded) this._loadAll();
    return this._cache.get(id);
  }

  // OG: StringPool::GetStringW — resolves a StringPool ID to a wide string
  // Returns the string or a fallback if not found
  getStringOrFallback(id: number, fallback: string): string {
    return this.getString(id) ?? fallback;
  }

  // Load all strings from String.wz
  private _loadAll(): void {
    if (this._loaded) return;
    this._loaded = true;

    const wz = this._stringWz();
    if (!wz) return;

    // OG: StringPool loads from NoSound.img which contains all UI strings
    // The structure is: NoSound.img/{id} where {id} is the StringPool ID
    this._loadFromNoSound(wz);
  }

  private _loadFromNoSound(wz: WzPackage): void {
    try {
      const image = wz.GetItem('NoSound.img');
      if (!(image instanceof WzImage)) {
        console.warn('StringPoolService: NoSound.img not found');
        return;
      }

      // Iterate through all properties in NoSound.img
      // Each property key is a numeric StringPool ID
      for (const [key, val] of Object.entries(image.Root.Items)) {
        const id = parseInt(key, 10);
        if (isNaN(id)) continue;

        if (typeof val === 'string') {
          this._cache.set(id, val);
        } else if (val instanceof WzProperty) {
          // Some entries might be properties with sub-values
          // Try to get a default value
          const defaultVal = val.Get('');
          if (typeof defaultVal === 'string') {
            this._cache.set(id, defaultVal);
          }
        }
      }
    } catch (ex) {
      console.warn('StringPoolService: failed loading NoSound.img', ex);
    }
  }

  // OG: Format string with arguments (like sprintf)
  // Example: formatString("Lv.%d", 50) → "Lv.50"
  formatString(template: string, ...args: (number | string)[]): string {
    let result = template;
    let argIndex = 0;

    // Replace %d, %s, %f placeholders
    result = result.replace(/%[dsf]/g, () => {
      if (argIndex < args.length) {
        return String(args[argIndex++]);
      }
      return '%?';
    });

    return result;
  }
}
