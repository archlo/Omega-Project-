import type { WzPackage } from './WzPackage.js';
import { WzImage } from './WzImage.js';
import { WzProperty } from './WzProperty.js';
import { NxFile, type NxNodeView } from './NxFile.js';
/** NX-backed WzImage: the wrapped node doubles as its own property root. */
export declare class NxImage extends WzImage {
    private readonly _file;
    private readonly _node;
    private _rootCache;
    constructor(file: NxFile, node: NxNodeView, pkg: WzPackage);
    get Root(): WzProperty;
}
//# sourceMappingURL=NxImage.d.ts.map