import { CWnd } from './Wnd.js';
export declare class CUIWnd extends CWnd {
    uiType: number;
    backgrndUol: string;
    hasBackground: boolean;
    savePos: boolean;
    isLargeMode: boolean;
    smallScreenX: number;
    smallScreenY: number;
    largeScreenX: number;
    largeScreenY: number;
    option: number;
    abOption: number;
    OnCreate(data: unknown, sUOL?: string, _bMultiBg?: boolean): void;
    OnDestroy(): void;
}
//# sourceMappingURL=UIWnd.d.ts.map