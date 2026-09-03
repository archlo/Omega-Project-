import { Container } from 'pixi.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { BuiltInFont } from '../BuiltInFont.js';
import { StringPoolService } from '../../localization/StringPoolService.js';
export interface ChatBalloonLayout {
    x: number;
    y: number;
    width: number;
    height: number;
    arrowX: number;
    arrowY: number;
}
/** CChatBalloon::CreateCanvas/AdjustCoordY equivalent for the nine pieces. */
export declare function computeChatBalloonLayout(innerWidth: number, lineCount: number, lineHeight: number, border: {
    left: number;
    right: number;
    top: number;
    bottom: number;
}, arrowWidth: number, arrowHeight: number, tip: {
    x: number;
    y: number;
}): ChatBalloonLayout;
export declare class ChatBalloonLayer {
    private _font;
    private _assets;
    private _root;
    private _active;
    constructor(loader: WzTextureLoader, ui: WzPackage | null, font: BuiltInFont | null, strings?: StringPoolService | null);
    get root(): Container;
    Set(charId: number, text: string, ttl?: number, type?: number, fadeDelay?: number): void;
    Clear(charId: number): void;
    get activeCount(): number;
    getBalloonAlpha(charId: number): number | undefined;
    getBalloonLayout(charId: number): {
        width: number;
        height: number;
    } | undefined;
    Update(dt: number): void;
    Draw(headScreenPos: (charId: number) => {
        x: number;
        y: number;
    } | null): void;
    private _wrap;
    private _drawBubble;
}
//# sourceMappingURL=ChatBalloon.d.ts.map