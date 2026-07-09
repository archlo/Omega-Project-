import { WzSprite } from '../../render/WzSprite.js';
import { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';

// OG: no separate marker class — marker icon drawing is CUIMiniMap::DrawIcon
// (inline method of the main minimap class, alongside MakeIconsForSimpleMiniMap/
// MakeSimpleMiniMap). This file's split into its own class is a TS-side
// organizational choice, not a deviation from OG structure.

// OG: 25 icon types per mode (simple/normal) from CUIMiniMap struct
// Offsets: simple 0xbd0-0xc34, normal 0xc94-0xcf4
type MarkerName =
  | 'User' | 'RemoteUser' | 'Friend'
  | 'Guild' | 'GuildMaster' | 'Match'
  | 'Party' | 'PartyMaster'
  | 'Npc' | 'NpcStart' | 'NpcEnd' | 'NpcLowLevel'
  | 'ShopSelf' | 'ShopRemote'
  | 'Portal'
  | 'Sheep' | 'Wolves' | 'NakedSheep';
type NormalMarkerName = `Normal${Capitalize<MarkerName>}`;

export class MiniMapMarkers {
  // OG: Simple mode icons (m_nMiniMapType=0) from MiniMapSimpleMode/DefaultHelper
  readonly User: WzSprite | null;
  readonly RemoteUser: WzSprite | null;
  readonly Friend: WzSprite | null;
  readonly Guild: WzSprite | null;
  readonly GuildMaster: WzSprite | null;
  readonly Match: WzSprite | null;
  readonly Party: WzSprite | null;
  readonly PartyMaster: WzSprite | null;
  readonly Npc: WzSprite | null;
  readonly NpcStart: WzSprite | null;
  readonly NpcEnd: WzSprite | null;
  readonly NpcLowLevel: WzSprite | null;
  readonly ShopSelf: WzSprite | null;
  readonly ShopRemote: WzSprite | null;
  readonly Portal: WzSprite | null;
  readonly Sheep: WzSprite | null;
  readonly Wolves: WzSprite | null;
  readonly NakedSheep: WzSprite | null;

  // OG: 8 directional arrows
  readonly ArrowUp: WzSprite | null;
  readonly ArrowDown: WzSprite | null;
  readonly ArrowLeft: WzSprite | null;
  readonly ArrowRight: WzSprite | null;
  readonly ArrowUpLeft: WzSprite | null;
  readonly ArrowUpRight: WzSprite | null;
  readonly ArrowDownLeft: WzSprite | null;
  readonly ArrowDownRight: WzSprite | null;

  // OG: Normal mode icons (m_nMiniMapType=1) from MiniMap/DefaultHelper
  readonly NormalUser: WzSprite | null;
  readonly NormalRemoteUser: WzSprite | null;
  readonly NormalFriend: WzSprite | null;
  readonly NormalGuild: WzSprite | null;
  readonly NormalGuildMaster: WzSprite | null;
  readonly NormalMatch: WzSprite | null;
  readonly NormalParty: WzSprite | null;
  readonly NormalPartyMaster: WzSprite | null;
  readonly NormalNpc: WzSprite | null;
  readonly NormalNpcStart: WzSprite | null;
  readonly NormalNpcEnd: WzSprite | null;
  readonly NormalNpcLowLevel: WzSprite | null;
  readonly NormalShopSelf: WzSprite | null;
  readonly NormalShopRemote: WzSprite | null;
  readonly NormalPortal: WzSprite | null;
  readonly NormalSheep: WzSprite | null;
  readonly NormalWolves: WzSprite | null;
  readonly NormalNakedSheep: WzSprite | null;

  constructor(loader: WzTextureLoader, ui: WzPackage | null) {
    const load = (root: WzProperty | null, name: string): WzSprite | null => {
      const c = root?.Get(name);
      return c instanceof WzCanvas ? loader.Load(c) : null;
    };

    // OG: MakeIconsForSimpleMiniMap loads from MiniMapSimpleMode/DefaultHelper
    const simpleRoot = ui?.GetItem('UIWindow2.img/MiniMapSimpleMode/DefaultHelper') as WzProperty | null;
    this.User = load(simpleRoot, 'user');
    this.RemoteUser = load(simpleRoot, 'remoteuser');
    this.Friend = load(simpleRoot, 'friend');
    this.Guild = load(simpleRoot, 'guild');
    this.GuildMaster = load(simpleRoot, 'guildmaster');
    this.Match = load(simpleRoot, 'match');
    this.Party = load(simpleRoot, 'party');
    this.PartyMaster = load(simpleRoot, 'partymaster');
    this.Npc = load(simpleRoot, 'npc');
    this.NpcStart = load(simpleRoot, 'startnpc');
    this.NpcEnd = load(simpleRoot, 'endnpc');
    this.NpcLowLevel = load(simpleRoot, 'npclowlevel');
    this.ShopSelf = load(simpleRoot, 'shopself');
    this.ShopRemote = load(simpleRoot, 'shopremote');
    this.Portal = load(simpleRoot, 'portal');
    this.Sheep = load(simpleRoot, 'sheep');
    this.Wolves = load(simpleRoot, 'wolves');
    this.NakedSheep = load(simpleRoot, 'nakedsheep');

    this.ArrowUp = load(simpleRoot, 'arrowup');
    this.ArrowDown = load(simpleRoot, 'arrowdown');
    this.ArrowLeft = load(simpleRoot, 'arrowleft');
    this.ArrowRight = load(simpleRoot, 'arrowright');
    this.ArrowUpLeft = load(simpleRoot, 'arrowupleft');
    this.ArrowUpRight = load(simpleRoot, 'arrowupright');
    this.ArrowDownLeft = load(simpleRoot, 'arrowdownleft');
    this.ArrowDownRight = load(simpleRoot, 'arrowdownright');

    // OG: Normal mode icons loaded from MiniMap/DefaultHelper
    const normalRoot = ui?.GetItem('UIWindow2.img/MiniMap/DefaultHelper') as WzProperty | null;
    this.NormalUser = load(normalRoot, 'user');
    this.NormalRemoteUser = load(normalRoot, 'remoteuser');
    this.NormalFriend = load(normalRoot, 'friend');
    this.NormalGuild = load(normalRoot, 'guild');
    this.NormalGuildMaster = load(normalRoot, 'guildmaster');
    this.NormalMatch = load(normalRoot, 'match');
    this.NormalParty = load(normalRoot, 'party');
    this.NormalPartyMaster = load(normalRoot, 'partymaster');
    this.NormalNpc = load(normalRoot, 'npc');
    this.NormalNpcStart = load(normalRoot, 'startnpc');
    this.NormalNpcEnd = load(normalRoot, 'endnpc');
    this.NormalNpcLowLevel = load(normalRoot, 'npclowlevel');
    this.NormalShopSelf = load(normalRoot, 'shopself');
    this.NormalShopRemote = load(normalRoot, 'shopremote');
    this.NormalPortal = load(normalRoot, 'portal');
    this.NormalSheep = load(normalRoot, 'sheep');
    this.NormalWolves = load(normalRoot, 'wolves');
    this.NormalNakedSheep = load(normalRoot, 'nakedsheep');
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

  // OG: MakeIconsForSimpleMiniMap — returns the icon set matching m_nMiniMapType.
  // type 0 (simple) → Simple icons, type 1 (normal) → Normal icons.
  getIcon(type: 0 | 1, name: MarkerName): WzSprite | null {
    if (type === 0) return this[name] ?? null;
    const normalKey = `Normal${name}` as NormalMarkerName;
    return this[normalKey] ?? this[name] ?? null;
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
