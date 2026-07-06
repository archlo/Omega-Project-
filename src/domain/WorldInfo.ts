import { ChannelInfo } from './ChannelInfo.js';

/** Event-notice speech bubble shown over a world's icon at world-select. */
export interface WorldBalloon { x: number; y: number; message: string; }

export class WorldInfo {
  worldId: number = 0;
  name = '';
  state: number = 0;
  eventDescription = '';
  eventExpRate: number = 100;
  eventDropRate: number = 100;
  blockCharCreation: number = 0;
  channels: ChannelInfo[] = [];
  balloonCount: number = 0;
  balloons: WorldBalloon[] = [];
}
