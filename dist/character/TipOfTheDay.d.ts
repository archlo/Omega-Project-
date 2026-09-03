import { WzPackage } from '../wz/WzPackage.js';
export declare class TipOfTheDay {
    private _entries;
    private _groups;
    private _lastShownAt;
    private _activeInterval;
    Load(etcWz: WzPackage | null): void;
    /** Returns a tip line if one is due for the given level and job, else null. */
    GetTip(level: number, job: number, nowMs: number): string | null;
}
//# sourceMappingURL=TipOfTheDay.d.ts.map