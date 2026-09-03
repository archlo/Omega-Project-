import { PacketRouter } from '../session/PacketRouter.js';
export interface BattleRecordDotDamageArgs {
    damage: number;
    count: number;
    attrRate: number | null;
}
export interface BattleRecordServerOnCalcArgs {
    enabled: boolean;
}
export declare class BattleRecordHandlers {
    onDotDamage: ((args: BattleRecordDotDamageArgs) => void) | null;
    onServerOnCalcResult: ((args: BattleRecordServerOnCalcArgs) => void) | null;
    clear(): void;
    register(router: PacketRouter): void;
    private _handleDotDamage;
    private _handleServerOnCalc;
}
//# sourceMappingURL=BattleRecordHandlers.d.ts.map