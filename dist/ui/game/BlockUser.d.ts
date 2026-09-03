import { GamePanel } from './GamePanel.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
export declare class BlockUser extends GamePanel {
    private _bg;
    private _wzBg;
    private _loader;
    private _buttons;
    private _btBlock;
    private _btCancel;
    private _inputText;
    private _inputValue;
    private _inputFocused;
    private _result;
    private _characterName;
    onBlock: ((name: string) => void) | null;
    onClose: (() => void) | null;
    constructor(opts?: {
        loader?: WzTextureLoader;
        uiWz?: WzPackage | null;
        font?: BuiltInFont | null;
    });
    private _rebuildBg;
    private _doBlock;
    private _doCancel;
    get result(): number;
    get characterName(): string;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    update(_dt: number): void;
}
//# sourceMappingURL=BlockUser.d.ts.map