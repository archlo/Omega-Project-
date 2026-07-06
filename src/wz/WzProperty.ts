import type { WzImage } from './WzImage.js';
import type { WzBuffer } from './WzBuffer.js';
import type { WzCrypto } from './WzCrypto.js';
import { WzReader } from './WzReader.js';
import { WzCanvas } from './WzCanvas.js';
import { WzVector } from './WzVector.js';
import { WzUol } from './WzUol.js';
import { WzSound } from './WzSound.js';
import { WzNodeType, WzNodeTypeFromUol } from './WzNodeType.js';
import { WzReaderException } from './WzReaderException.js';

export class WzProperty {
  private _parent: WzImage;
  private _offset: number;
  private _items: Record<string, unknown> | null;
  private _endPosition = 0;

  constructor(parent: WzImage, offset: number, items?: Record<string, unknown>) {
    this._parent = parent;
    this._offset = offset;
    this._items = items ?? null;
    if (items) {
      this._endPosition = offset;
    }
  }

  get Items(): Record<string, unknown> {
    if (this._items === null) {
      this._items = this._readItems();
    }
    return this._items;
  }

  get EndPosition(): number {
    const _ = this.Items;
    return this._endPosition;
  }

  Get(key: string): unknown {
    return this.Items[key] ?? null;
  }

  GetItem(path: string): unknown {
    const slash = path.indexOf('/');
    const head = slash < 0 ? path : path.substring(0, slash);
    const child = this.Items[head] ?? null;
    if (child === null) {
      return null;
    }
    if (slash < 0) {
      return child;
    }
    const tail = path.substring(slash + 1);
    if (child instanceof WzProperty) {
      return child.GetItem(tail);
    }
    if (child instanceof WzCanvas) {
      return child.Property.GetItem(tail);
    }
    if (child instanceof WzUol) {
      const resolved = child.Resolve();
      if (resolved instanceof WzProperty) {
        return (<WzProperty>resolved).GetItem(tail);
      }
      if (resolved instanceof WzCanvas) {
        return (<WzCanvas>resolved).Property.GetItem(tail);
      }
      return null;
    }
    return null;
  }

  private _readItems(): Record<string, unknown> {
    const buf = this._parent.GetBuffer(this._offset);
    const crypto = this._parent.Crypto;

    WzReader.ReadStringBlock(this._parent, buf, crypto);
    buf.Position += 2;

    const result: Record<string, unknown> = {};
    const size = WzReader.ReadCompressedInt(buf);

    for (let i = 0; i < size; i++) {
      const itemName = WzReader.ReadStringBlock(this._parent, buf, crypto);
      const itemType = buf.ReadByte();

      switch (itemType) {
        case 0:
          result[itemName] = null;
          break;

        case 2:
        case 18:
          result[itemName] = buf.ReadShort();
          break;

        case 3:
        case 19:
          result[itemName] = WzReader.ReadCompressedInt(buf);
          break;

        case 20: {
          const first = buf.ReadSByte();
          result[itemName] = first === -128 ? buf.ReadLong() : BigInt(first);
          break;
        }

        case 4: {
          const floatType = buf.ReadByte();
          switch (floatType) {
            case 0x00: result[itemName] = 0; break;
            case 0x80: result[itemName] = buf.ReadFloat(); break;
            default: throw new WzReaderException(`Unknown float type: 0x${floatType.toString(16)}`);
          }
          break;
        }

        case 5:
          result[itemName] = buf.ReadDouble();
          break;

        case 8:
          result[itemName] = WzReader.ReadStringBlock(this._parent, buf, crypto);
          break;

        case 9: {
          const subSize = buf.ReadInt();
          const subOffset = buf.Position;
          result[itemName] = WzProperty._readExtendedProperty(this._parent, buf, crypto, subOffset);
          buf.Position = subOffset + subSize;
          break;
        }

        default:
          throw new WzReaderException(`Unknown property item type: ${itemType}`);
      }
    }

    this._endPosition = buf.Position;
    return result;
  }

  private static _readExtendedProperty(parent: WzImage, buf: WzBuffer, crypto: WzCrypto, offset: number): unknown {
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
}
