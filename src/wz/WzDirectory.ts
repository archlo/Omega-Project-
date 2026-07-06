import type { WzPackage } from './WzPackage.js';
import type { WzBuffer } from './WzBuffer.js';
import { WzImage } from './WzImage.js';
import { WzReader } from './WzReader.js';
import { WzReaderException } from './WzReaderException.js';
import { WzConstants } from './WzConstants.js';

export class WzDirectory {
  private _parent: WzPackage;
  private _offset: number;
  private _items: Record<string, WzDirectory | WzImage> | null = null;

  constructor(parent: WzPackage, offset: number) {
    this._parent = parent;
    this._offset = offset;
  }

  get Items(): Record<string, WzDirectory | WzImage> {
    if (this._items === null) {
      this._items = this._readDirectory();
    }
    return this._items;
  }

  GetItem(path: string): unknown {
    const slash = path.indexOf('/');
    const head = slash < 0 ? path : path.substring(0, slash);
    const child = this.Items[head];
    if (!child) return null;
    if (slash < 0) return child;
    const tail = path.substring(slash + 1);
    if (child instanceof WzDirectory) {
      return child.GetItem(tail);
    }
    if (child instanceof WzImage) {
      return child.GetItem(tail);
    }
    return null;
  }

  private _readDirectory(): Record<string, WzDirectory | WzImage> {
    const result: Record<string, WzDirectory | WzImage> = {};
    const buf = this._parent.GetBuffer(this._offset);
    const crypto = this._parent.Crypto;
    const size = WzReader.ReadCompressedInt(buf);

    for (let i = 0; i < size; i++) {
      let itemName: string;
      let itemType = buf.ReadByte();

      switch (itemType) {
        case 1:
          buf.ReadInt();
          buf.ReadShort();
          this._readDescrambledOffset(buf);
          continue;

        case 2: {
          const stringOffset = buf.ReadInt();
          const saved = buf.Position;
          buf.Position = this._parent.Start + stringOffset;
          itemType = buf.ReadByte();
          itemName = WzReader.ReadString(buf, crypto);
          buf.Position = saved;
          break;
        }

        case 3:
        case 4:
          itemName = WzReader.ReadString(buf, crypto);
          break;

        default:
          throw new WzReaderException(`Unknown directory item type: ${itemType}`);
      }

      WzReader.ReadCompressedInt(buf);
      WzReader.ReadCompressedInt(buf);
      const itemOffset = this._readDescrambledOffset(buf);

      if (itemType === 3) {
        result[itemName] = new WzDirectory(this._parent, itemOffset);
      } else if (itemType === 4) {
        result[itemName] = new WzImage(this._parent, itemOffset);
      }
    }

    return result;
  }

  private _readDescrambledOffset(buf: WzBuffer): number {
    const start = this._parent.Start >>> 0;
    const hash = this._parent.VersionHash >>> 0;
    const uPos = buf.Position >>> 0;

    let result = ~(uPos - start) >>> 0;
    result = ((result * hash) >>> 0) >>> 0;
    result = (result - WzConstants.WzOffsetConstant) >>> 0;
    const rotateBy = result & 0x1F;
    result = ((result << rotateBy) | (result >>> (32 - rotateBy))) >>> 0;
      result ^= (buf.ReadInt() >>> 0);
    result = (result + (start * 2)) >>> 0;
    return result;
  }
}
