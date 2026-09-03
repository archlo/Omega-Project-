import { OutHeader } from '../packet/OpCodes.js';
export class BattleRecordHandlers {
    onDotDamage = null;
    onServerOnCalcResult = null;
    clear() {
        this.onDotDamage = null;
        this.onServerOnCalcResult = null;
    }
    register(router) {
        router.register(OutHeader.BattleRecordDotDamage, (p, _s) => this._handleDotDamage(p));
        router.register(OutHeader.BattleRecordServerOnCalc, (p, _s) => this._handleServerOnCalc(p));
    }
    _handleDotDamage(p) {
        try {
            const damage = p.readInt();
            const count = p.readInt();
            const bAttrRate = p.readByte();
            const attrRate = bAttrRate ? p.readInt() : null;
            this.onDotDamage?.({ damage, count, attrRate });
        }
        catch {
            // silently skip malformed packets
        }
    }
    _handleServerOnCalc(p) {
        try {
            const enabled = p.readByte() !== 0;
            this.onServerOnCalcResult?.({ enabled });
        }
        catch {
            // silently skip malformed packets
        }
    }
}
//# sourceMappingURL=BattleRecordHandlers.js.map