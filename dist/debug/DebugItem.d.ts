export declare class DebugItem {
    readonly category: string;
    readonly name: string;
    readonly get: () => {
        x: number;
        y: number;
    };
    readonly set: (v: {
        x: number;
        y: number;
    }) => void;
    getScreenPos: (() => {
        x: number;
        y: number;
    }) | null;
    setFromScreen: ((v: {
        x: number;
        y: number;
    }) => void) | null;
    draggable: boolean;
    constructor(category: string, name: string, get: () => {
        x: number;
        y: number;
    }, set: (v: {
        x: number;
        y: number;
    }) => void);
    effectiveScreenPos(): {
        x: number;
        y: number;
    };
    applyScreenPos(screen: {
        x: number;
        y: number;
    }): void;
}
//# sourceMappingURL=DebugItem.d.ts.map