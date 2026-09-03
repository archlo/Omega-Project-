import { ClientSession } from './ClientSession.js';
export declare class MigrationCoordinator {
    private _session;
    private _pending;
    onPhase2BoundaryReached: (() => void) | null;
    get migrationActive(): boolean;
    constructor(session: ClientSession);
    beginMigrateAsync(channelHost: Uint8Array, channelPort: number, characterId: number): Promise<void>;
    private onLoginDisconnect;
    private onChannelHandshake;
}
//# sourceMappingURL=MigrationCoordinator.d.ts.map