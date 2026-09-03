import { ChannelInfo } from './ChannelInfo.js';
/** Event-notice speech bubble shown over a world's icon at world-select. */
export interface WorldBalloon {
    x: number;
    y: number;
    message: string;
}
export declare class WorldInfo {
    worldId: number;
    name: string;
    state: number;
    eventDescription: string;
    eventExpRate: number;
    eventDropRate: number;
    blockCharCreation: number;
    channels: ChannelInfo[];
    balloonCount: number;
    balloons: WorldBalloon[];
}
//# sourceMappingURL=WorldInfo.d.ts.map