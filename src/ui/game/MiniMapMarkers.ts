import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';

// OG: no separate marker class — marker icon drawing is CUIMiniMap::DrawIcon
// (inline method of the main minimap class, alongside MakeIconsForSimpleMiniMap/
// MakeSimpleMiniMap). This file's split into its own class is a TS-side
// organizational choice, not a deviation from OG structure.
export class MiniMapMarkers {
  readonly User: WzSprite | null;
  readonly Another: WzSprite | null;
  readonly Friend: WzSprite | null;
  readonly Guild: WzSprite | null;
  readonly GuildMaster: WzSprite | null;
  readonly Party: WzSprite | null;
  readonly PartyMaster: WzSprite | null;

  readonly Npc: WzSprite | null;
  readonly StartNpc: WzSprite | null;
  readonly EndNpc: WzSprite | null;
  readonly Portal: WzSprite | null;
  readonly Merchant: WzSprite | null;

  readonly ArrowUp: WzSprite | null;
  readonly ArrowDown: WzSprite | null;
  readonly ArrowLeft: WzSprite | null;
  readonly ArrowRight: WzSprite | null;
  readonly ArrowUpLeft: WzSprite | null;
  readonly ArrowUpRight: WzSprite | null;
  readonly ArrowDownLeft: WzSprite | null;
  readonly ArrowDownRight: WzSprite | null;

  constructor(loader: WzTextureLoader, ui: WzPackage | null) {
    const root = ui?.GetItem('UIWindow2.img/MiniMapSimpleMode/DefaultHelper') as WzProperty | null;

    const load = (name: string): WzSprite | null => {
      const c = root?.Get(name);
      return c instanceof WzCanvas ? loader.Load(c) : null;
    };

    this.User = load('user');
    this.Another = load('another');
    this.Friend = load('friend');
    this.Guild = load('guild');
    this.GuildMaster = load('guildmaster');
    this.Party = load('party');
    this.PartyMaster = load('partymaster');

    this.Npc = load('npc');
    this.StartNpc = load('startnpc');
    this.EndNpc = load('endnpc');
    this.Portal = load('portal');
    this.Merchant = load('merchant');

    this.ArrowUp = load('arrowup');
    this.ArrowDown = load('arrowdown');
    this.ArrowLeft = load('arrowleft');
    this.ArrowRight = load('arrowright');
    this.ArrowUpLeft = load('arrowupleft');
    this.ArrowUpRight = load('arrowupright');
    this.ArrowDownLeft = load('arrowdownleft');
    this.ArrowDownRight = load('arrowdownright');
  }

  edgeArrow(dx: number, dy: number): WzSprite | null {
    const sx = dx;
    const sy = dy;
    if (sx === 0 && sy === -1) return this.ArrowUp;
    if (sx === 0 && sy === 1) return this.ArrowDown;
    if (sx === -1 && sy === 0) return this.ArrowLeft;
    if (sx === 1 && sy === 0) return this.ArrowRight;
    if (sx === -1 && sy === -1) return this.ArrowUpLeft;
    if (sx === 1 && sy === -1) return this.ArrowUpRight;
    if (sx === -1 && sy === 1) return this.ArrowDownLeft;
    if (sx === 1 && sy === 1) return this.ArrowDownRight;
    return null;
  }

  // OG: CalcAngle-based edge arrow selection. Uses angle between vectors
  // to determine which of the 8 directions best represents the offscreen
  // target's position relative to the minimap center.
  calcAngleEdgeArrow(
    targetX: number, targetY: number,
    centerX: number, centerY: number,
    paneX: number, paneY: number, paneW: number, paneH: number,
  ): WzSprite | null {
    const dx = targetX - centerX;
    const dy = targetY - centerY;
    if (dx === 0 && dy === 0) return null;

    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const deg = angle >= 0 ? angle : angle + 360;

    if (deg >= 337.5 || deg < 22.5) return this.ArrowRight;
    if (deg >= 22.5 && deg < 67.5) return this.ArrowDownRight;
    if (deg >= 67.5 && deg < 112.5) return this.ArrowDown;
    if (deg >= 112.5 && deg < 157.5) return this.ArrowDownLeft;
    if (deg >= 157.5 && deg < 202.5) return this.ArrowLeft;
    if (deg >= 202.5 && deg < 247.5) return this.ArrowUpLeft;
    if (deg >= 247.5 && deg < 292.5) return this.ArrowUp;
    if (deg >= 292.5 && deg < 337.5) return this.ArrowUpRight;
    return null;
  }
}
