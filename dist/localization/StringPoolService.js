import { WzImage } from '../wz/WzImage.js';
import { WzProperty } from '../wz/WzProperty.js';
import { WzDirectory } from '../wz/WzDirectory.js';
import { OG_V95_TOOLTIP_STRINGS } from './StringPoolIds.js';
// OG: StringPool — resolves numeric IDs to localized strings from String.wz
// In the v95 client, StringPool::GetString(id) loads from String.wz
// Some WZ toolchains expose String.wz/NoSound.img/{id}; the v95 client
// itself uses embedded encrypted ms_aString/ms_aKey tables.
export class StringPoolService {
    _stringWz;
    _cache = new Map();
    _loaded = false;
    constructor(stringWzProvider) {
        this._stringWz = stringWzProvider;
    }
    // OG: StringPool::GetString — resolves a StringPool ID to a string
    getString(id) {
        if (!this._loaded)
            this._loadAll();
        return this._cache.get(id);
    }
    /** Resolve a decompiler-verified numeric StringPool ID. */
    getById(id) {
        return this.getString(id);
    }
    /** Resolve and format a StringPool template without inventing a fallback. */
    formatById(id, ...args) {
        const template = this.getById(id);
        return template === undefined ? undefined : this.formatString(template, ...args);
    }
    // OG: StringPool::GetStringW — resolves a StringPool ID to a wide string
    // Returns the string or a fallback if not found
    getStringOrFallback(id, fallback) {
        return this.getString(id) ?? fallback;
    }
    // Load all strings from String.wz
    _loadAll() {
        if (this._loaded)
            return;
        this._loaded = true;
        const wz = this._stringWz();
        if (!wz)
            return;
        // Different WZ packers preserve different levels of the String.wz path.
        // The client accepts the image wherever the resource manager exposes it.
        const image = this._findNoSound(wz.Root);
        if (image)
            this._loadFromNoSound(image);
        for (const [id, value] of Object.entries(OG_V95_TOOLTIP_STRINGS)) {
            if (!this._cache.has(Number(id)))
                this._cache.set(Number(id), value);
        }
    }
    _findNoSound(container) {
        if (container instanceof WzImage)
            return null;
        for (const [name, value] of Object.entries(container.Items)) {
            if (name.toLowerCase() === 'nosound.img' && value instanceof WzImage)
                return value;
            if (value instanceof WzDirectory) {
                const nested = this._findNoSound(value);
                if (nested)
                    return nested;
            }
        }
        return null;
    }
    _loadFromNoSound(image) {
        try {
            // Iterate through all properties in NoSound.img
            // Each property key is a numeric StringPool ID
            for (const [key, val] of Object.entries(image.Root.Items)) {
                const id = parseInt(key, 10);
                if (isNaN(id))
                    continue;
                if (typeof val === 'string') {
                    this._cache.set(id, val);
                }
                else if (val instanceof WzProperty) {
                    // Some entries might be properties with sub-values
                    // Try to get a default value
                    const defaultVal = val.Get('');
                    if (typeof defaultVal === 'string') {
                        this._cache.set(id, defaultVal);
                    }
                }
            }
        }
        catch (ex) {
            console.warn('StringPoolService: failed loading NoSound.img', ex);
        }
    }
    // OG: Format string with arguments (like sprintf)
    // Example: formatString("Lv.%d", 50) → "Lv.50"
    formatString(template, ...args) {
        let result = template;
        let argIndex = 0;
        // Match the printf forms used by the v95 tooltip StringPool entries.
        result = result.replace(/%[%dsfu]/g, (token) => {
            if (token === '%%')
                return '%';
            if (argIndex < args.length) {
                const value = args[argIndex++];
                if (token === '%f')
                    return Number(value).toString();
                return String(value);
            }
            return '%?';
        });
        return result;
    }
}
//# sourceMappingURL=StringPoolService.js.map