import { WzPackage } from '../wz/WzPackage.js';
import { type StringPoolId } from './StringPoolIds.js';
export declare class StringPoolService {
    private _stringWz;
    private _cache;
    private _loaded;
    constructor(stringWzProvider: () => WzPackage | null);
    getString(id: number): string | undefined;
    /** Resolve a decompiler-verified numeric StringPool ID. */
    getById(id: StringPoolId): string | undefined;
    /** Resolve and format a StringPool template without inventing a fallback. */
    formatById(id: StringPoolId, ...args: (number | string)[]): string | undefined;
    getStringOrFallback(id: number, fallback: string): string;
    private _loadAll;
    private _findNoSound;
    private _loadFromNoSound;
    formatString(template: string, ...args: (number | string)[]): string;
}
//# sourceMappingURL=StringPoolService.d.ts.map