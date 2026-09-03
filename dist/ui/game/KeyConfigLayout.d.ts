import { FuncKeyMapped } from '../../domain/FuncKeyMapped.js';
export declare const CellSize = 32;
export declare const PaletteCount = 42;
export declare const ScRShift = 54, ScLShift = 42;
export declare const ScRCtrl = 89, ScLCtrl = 29;
export declare const ScRAlt = 90, ScLAlt = 56;
export declare function initLayout(): void;
export declare function getBindableScancodes(): number[];
export declare function tryGetCell(scancode: number): {
    x: number;
    y: number;
} | undefined;
export declare function keyLabelOffset(scancode: number): {
    dx: number;
    dy: number;
};
export declare function paletteCell(slot: number): {
    x: number;
    y: number;
};
export declare function hitTestKey(x: number, y: number): number;
export declare function hitTestPalette(x: number, y: number): number;
export declare function paletteBinding(slot: number): FuncKeyMapped;
export declare function paletteSlotOf(fk: FuncKeyMapped): number;
//# sourceMappingURL=KeyConfigLayout.d.ts.map