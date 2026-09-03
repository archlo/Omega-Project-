export type ProgressCallback = (path: string, received: number, total: number) => void;
export declare function fileExists(path: string): boolean;
/** Reads an exact byte range without downloading the whole file. Async (fetch). */
export declare function readRangeBytesAsync(path: string, start: number, length: number): Promise<ArrayBuffer>;
/** Reads an exact byte range without downloading the whole file. Sync (blocking XHR/fs). */
export declare function readRangeBytesSync(path: string, start: number, length: number): ArrayBuffer;
export declare function readFileBytesAsync(path: string, onProgress?: ProgressCallback): Promise<ArrayBuffer>;
export declare function readFileBytesSync(path: string): ArrayBuffer;
//# sourceMappingURL=FileIO.d.ts.map