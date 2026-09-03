import { GamePanel } from './GamePanel.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
export declare class ChannelSelect extends GamePanel {
    onChannelChange: ((ch: number) => void) | null;
    private _channels;
    private _currentChannel;
    private _selectedChannel;
    private _bg;
    private _wzBg;
    private _chanSlots;
    private _btnChange;
    private _btnCancel;
    private _selHighlight;
    private _titleText;
    constructor(opts?: {
        loader?: WzTextureLoader;
        uiWz?: WzPackage | null;
    });
    setChannels(channels: {
        channel: number;
        population: number;
    }[], current: number): void;
    handleMouseButton(x: number, y: number, down: boolean): boolean;
    onKeyPress(key: string): boolean;
    private _rebuild;
    private _selectChannel;
    private _confirm;
    private _makeBtn;
    private _hitBtn;
}
//# sourceMappingURL=ChannelSelect.d.ts.map