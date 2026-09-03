import { GamePanel } from './GamePanel.js';
import type { SkillInfoService } from '../../character/SkillInfoService.js';
import type { WzTextureLoader } from '../../render/WzTextureLoader.js';
export declare class BuffList extends GamePanel {
    skillService: SkillInfoService | null;
    textureLoader: WzTextureLoader | null;
    private _bg;
    private _titleText;
    private _slots;
    constructor();
    addBuff(skillId: number, name: string, seconds: number): void;
    removeBuff(skillId: number): void;
    clearBuffs(): void;
    update(dt: number): void;
    private _fillSlot;
    private _rebuildBg;
}
//# sourceMappingURL=BuffList.d.ts.map