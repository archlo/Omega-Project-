import { WzCanvas } from '../../wz/WzCanvas.js';
export class MiniMapMarkers {
    // OG: Simple mode icons (m_nMiniMapType=0) from MiniMapSimpleMode/DefaultHelper
    User;
    RemoteUser;
    Friend;
    Guild;
    GuildMaster;
    Match;
    Party;
    PartyMaster;
    Npc;
    NpcStart;
    NpcEnd;
    NpcLowLevel;
    ShopSelf;
    ShopRemote;
    Portal;
    Sheep;
    Wolves;
    NakedSheep;
    // OG: 8 directional arrows
    ArrowUp;
    ArrowDown;
    ArrowLeft;
    ArrowRight;
    ArrowUpLeft;
    ArrowUpRight;
    ArrowDownLeft;
    ArrowDownRight;
    // OG: Normal mode icons (m_nMiniMapType=1) from MiniMap/DefaultHelper
    NormalUser;
    NormalRemoteUser;
    NormalFriend;
    NormalGuild;
    NormalGuildMaster;
    NormalMatch;
    NormalParty;
    NormalPartyMaster;
    NormalNpc;
    NormalNpcStart;
    NormalNpcEnd;
    NormalNpcLowLevel;
    NormalShopSelf;
    NormalShopRemote;
    NormalPortal;
    NormalSheep;
    NormalWolves;
    NormalNakedSheep;
    constructor(loader, ui) {
        const load = (root, name) => {
            const c = root?.Get(name);
            return c instanceof WzCanvas ? loader.Load(c) : null;
        };
        // OG: MakeIconsForSimpleMiniMap loads from MiniMapSimpleMode/DefaultHelper
        const simpleRoot = ui?.GetItem('UIWindow2.img/MiniMapSimpleMode/DefaultHelper');
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
        const normalRoot = ui?.GetItem('UIWindow2.img/MiniMap/DefaultHelper');
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
    edgeArrow(dx, dy) {
        const sx = dx;
        const sy = dy;
        if (sx === 0 && sy === -1)
            return this.ArrowUp;
        if (sx === 0 && sy === 1)
            return this.ArrowDown;
        if (sx === -1 && sy === 0)
            return this.ArrowLeft;
        if (sx === 1 && sy === 0)
            return this.ArrowRight;
        if (sx === -1 && sy === -1)
            return this.ArrowUpLeft;
        if (sx === 1 && sy === -1)
            return this.ArrowUpRight;
        if (sx === -1 && sy === 1)
            return this.ArrowDownLeft;
        if (sx === 1 && sy === 1)
            return this.ArrowDownRight;
        return null;
    }
    // OG: MakeIconsForSimpleMiniMap — returns the icon set matching m_nMiniMapType.
    // type 0 (simple) → Simple icons, type 1 (normal) → Normal icons.
    getIcon(type, name) {
        if (type === 0)
            return this[name] ?? null;
        const normalKey = `Normal${name}`;
        return this[normalKey] ?? this[name] ?? null;
    }
    // OG: CalcAngle-based edge arrow selection. Uses angle between vectors
    // to determine which of the 8 directions best represents the offscreen
    // target's position relative to the minimap center.
    calcAngleEdgeArrow(targetX, targetY, centerX, centerY, paneX, paneY, paneW, paneH) {
        const dx = targetX - centerX;
        const dy = targetY - centerY;
        if (dx === 0 && dy === 0)
            return null;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const deg = angle >= 0 ? angle : angle + 360;
        if (deg >= 337.5 || deg < 22.5)
            return this.ArrowRight;
        if (deg >= 22.5 && deg < 67.5)
            return this.ArrowDownRight;
        if (deg >= 67.5 && deg < 112.5)
            return this.ArrowDown;
        if (deg >= 112.5 && deg < 157.5)
            return this.ArrowDownLeft;
        if (deg >= 157.5 && deg < 202.5)
            return this.ArrowLeft;
        if (deg >= 202.5 && deg < 247.5)
            return this.ArrowUpLeft;
        if (deg >= 247.5 && deg < 292.5)
            return this.ArrowUp;
        if (deg >= 292.5 && deg < 337.5)
            return this.ArrowUpRight;
        return null;
    }
}
//# sourceMappingURL=MiniMapMarkers.js.map