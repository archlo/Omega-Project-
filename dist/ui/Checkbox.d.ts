import { Container } from 'pixi.js';
import { WzSprite } from '../render/WzSprite.js';
export declare class Checkbox {
    position: {
        x: number;
        y: number;
    };
    isChecked: boolean;
    hitSize: number;
    container: Container;
    uncheckedSprite: WzSprite | null;
    checkedSprite: WzSprite | null;
    private _uncheckedPixi;
    private _checkedPixi;
    constructor(uncheckedSprite?: WzSprite | null, checkedSprite?: WzSprite | null);
    get bounds(): {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    setPosition(x: number, y: number): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    refresh(): void;
}
//# sourceMappingURL=Checkbox.d.ts.map