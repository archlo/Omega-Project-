import { WzReader } from './WzReader.js';
import { WzProperty } from './WzProperty.js';
import { WzVector } from './WzVector.js';
import { WzUol } from './WzUol.js';
import { WzSound } from './WzSound.js';
import { WzNodeType, WzNodeTypeFromUol } from './WzNodeType.js';
import { WzReaderException } from './WzReaderException.js';
import { inflateTolerant } from './InflateTolerant.js';
export class WzCanvas {
    _parent;
    _offset;
    _headerRead = false;
    _property = null;
    _decodedBgra = null;
    _width = 0;
    _height = 0;
    _format = 0;
    _formatScale = 0;
    _dataStartOffset = 0;
    _dataLength = 0;
    get Width() { this._ensureDecodedHeader(); return this._width; }
    get Height() { this._ensureDecodedHeader(); return this._height; }
    get Format() { this._ensureDecodedHeader(); return this._format; }
    get FormatScale() { this._ensureDecodedHeader(); return this._formatScale; }
    get Property() {
        this._ensureDecodedHeader();
        return this._property;
    }
    constructor(parent, offset) {
        this._parent = parent;
        this._offset = offset;
    }
    DecodeBgra() {
        this._ensureDecodedHeader();
        if (this._decodedBgra !== null) {
            return this._decodedBgra;
        }
        const buf = this._parent.GetBuffer(this._dataStartOffset);
        const compressed = buf.ReadBytes(this._dataLength);
        const raw = inflateTolerant(compressed);
        this._decodedBgra = WzCanvas._convertToBgra(raw, this._width, this._height, this._format, this._formatScale);
        return this._decodedBgra;
    }
    _ensureDecodedHeader() {
        if (this._headerRead) {
            return;
        }
        const buf = this._parent.GetBuffer(this._offset);
        const crypto = this._parent.Crypto;
        WzReader.ReadStringBlock(this._parent, buf, crypto);
        buf.Position++;
        const hasProperty = buf.ReadByte() === 1;
        const items = {};
        if (hasProperty) {
            buf.Position += 2;
            WzCanvas._readChildren(this._parent, buf, crypto, items);
        }
        this._property = new WzProperty(this._parent, this._offset, items);
        this._width = WzReader.ReadCompressedInt(buf);
        this._height = WzReader.ReadCompressedInt(buf);
        this._format = WzReader.ReadCompressedInt(buf);
        this._formatScale = buf.ReadByte();
        buf.Position += 4;
        this._dataLength = buf.ReadInt() - 1;
        buf.Position++;
        this._dataStartOffset = buf.Position;
        this._headerRead = true;
    }
    static _readChildren(parent, buf, crypto, items) {
        const size = WzReader.ReadCompressedInt(buf);
        for (let i = 0; i < size; i++) {
            const itemName = WzReader.ReadStringBlock(parent, buf, crypto);
            const itemType = buf.ReadByte();
            items[itemName] = WzCanvas._readChildValue(parent, buf, crypto, itemType);
        }
    }
    static _readChildValue(parent, buf, crypto, itemType) {
        switch (itemType) {
            case 0: return null;
            case 2:
            case 18: return buf.ReadShort();
            case 3:
            case 19: return WzReader.ReadCompressedInt(buf);
            case 20: {
                const first = buf.ReadSByte();
                return first === -128 ? buf.ReadLong() : BigInt(first);
            }
            case 4: {
                const floatType = buf.ReadByte();
                switch (floatType) {
                    case 0x00: return 0;
                    case 0x80: return buf.ReadFloat();
                    default: throw new WzReaderException(`Unknown float type: 0x${floatType.toString(16)}`);
                }
            }
            case 5: return buf.ReadDouble();
            case 8: return WzReader.ReadStringBlock(parent, buf, crypto);
            case 9: {
                const subSize = buf.ReadInt();
                const subOffset = buf.Position;
                const value = WzCanvas._readExtendedProperty(parent, buf, crypto, subOffset);
                buf.Position = subOffset + subSize;
                return value;
            }
            default: throw new WzReaderException(`Unknown property item type: ${itemType}`);
        }
    }
    static _readExtendedProperty(parent, buf, crypto, offset) {
        const uol = WzReader.ReadStringBlock(parent, buf, crypto);
        switch (WzNodeTypeFromUol(uol)) {
            case WzNodeType.Property:
                return new WzProperty(parent, offset);
            case WzNodeType.Canvas:
                return new WzCanvas(parent, offset);
            case WzNodeType.Vector: {
                const x = WzReader.ReadCompressedInt(buf);
                const y = WzReader.ReadCompressedInt(buf);
                return new WzVector(x, y);
            }
            case WzNodeType.Uol:
                buf.Position++;
                const target = WzReader.ReadStringBlock(parent, buf, crypto);
                return new WzUol(parent, target);
            case WzNodeType.Sound:
                return new WzSound(parent, offset);
            case WzNodeType.Convex:
            case WzNodeType.PolyShape:
                return new WzProperty(parent, offset, {});
            default:
                throw new WzReaderException(`Unhandled extended-property UOL: ${uol}`);
        }
    }
    static _convertToBgra(raw, width, height, format, formatScale) {
        const scale = formatScale === 0 ? 1 : 1 << formatScale;
        const sw = Math.max(1, Math.floor(width / scale));
        const sh = Math.max(1, Math.floor(height / scale));
        const dst = new Uint8Array(width * height * 4);
        switch (format) {
            case 1:
                WzCanvas._expandFromScaled(width, height, sw, sh, scale, dst, (sx, sy, dstOff) => {
                    const src = (sy * sw + sx) * 2;
                    if (src + 1 >= raw.length)
                        return;
                    const low = raw[src];
                    const high = raw[src + 1];
                    dst[dstOff + 0] = (high & 0x0F) * 0x11; // R
                    dst[dstOff + 1] = ((low >> 4) & 0x0F) * 0x11; // G
                    dst[dstOff + 2] = (low & 0x0F) * 0x11; // B
                    dst[dstOff + 3] = ((high >> 4) & 0x0F) * 0x11; // A
                });
                return dst;
            case 2:
                WzCanvas._expandFromScaled(width, height, sw, sh, scale, dst, (sx, sy, dstOff) => {
                    const src = (sy * sw + sx) * 4;
                    if (src + 3 >= raw.length)
                        return;
                    dst[dstOff + 0] = raw[src + 2]; // R
                    dst[dstOff + 1] = raw[src + 1]; // G
                    dst[dstOff + 2] = raw[src + 0]; // B
                    dst[dstOff + 3] = raw[src + 3]; // A
                });
                return dst;
            case 513:
                WzCanvas._expandFromScaled(width, height, sw, sh, scale, dst, (sx, sy, dstOff) => {
                    const src = (sy * sw + sx) * 2;
                    if (src + 1 >= raw.length)
                        return;
                    const lo = raw[src];
                    const hi = raw[src + 1];
                    const pixel = lo | (hi << 8);
                    dst[dstOff + 0] = ((pixel >> 11) & 0x1F) * 255 / 31; // R
                    dst[dstOff + 1] = ((pixel >> 5) & 0x3F) * 255 / 63; // G
                    dst[dstOff + 2] = (pixel & 0x1F) * 255 / 31; // B
                    dst[dstOff + 3] = 0xFF; // A
                });
                return dst;
            default:
                throw new Error(`WzCanvas format ${format} (scale ${formatScale}) is not implemented yet`);
        }
    }
    static _expandFromScaled(width, height, sw, sh, scale, dst, writePixel) {
        for (let y = 0; y < height; y++) {
            const sy = Math.min(Math.floor(y / scale), sh - 1);
            for (let x = 0; x < width; x++) {
                const sx = Math.min(Math.floor(x / scale), sw - 1);
                const dstOff = (y * width + x) * 4;
                writePixel(sx, sy, dstOff);
            }
        }
    }
}
//# sourceMappingURL=WzCanvas.js.map