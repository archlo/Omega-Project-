import type { WzImage } from './WzImage.js';
import type { WzBuffer } from './WzBuffer.js';
import type { WzCrypto } from './WzCrypto.js';
export declare class WzReader {
    static ReadCompressedInt(buffer: WzBuffer): number;
    static ReadString(buffer: WzBuffer, crypto: WzCrypto): string;
    static ReadStringBlock(parent: WzImage, buffer: WzBuffer, crypto: WzCrypto): string;
}
//# sourceMappingURL=WzReader.d.ts.map