import { InPacket } from '../packet/InPacket.js';
import { OutHeader } from '../packet/OpCodes.js';
import { PacketRouter } from '../session/PacketRouter.js';
import { ClientSession } from '../session/ClientSession.js';

export interface BattleRecordDotDamageArgs {
  damage: number;
  count: number;
  attrRate: number | null;
}

export interface BattleRecordServerOnCalcArgs {
  enabled: boolean;
}

export class BattleRecordHandlers {
  onDotDamage: ((args: BattleRecordDotDamageArgs) => void) | null = null;
  onServerOnCalcResult: ((args: BattleRecordServerOnCalcArgs) => void) | null = null;

  clear(): void {
    this.onDotDamage = null;
    this.onServerOnCalcResult = null;
  }

  register(router: PacketRouter): void {
    router.register(OutHeader.BattleRecordDotDamage, (p, _s) => this._handleDotDamage(p));
    router.register(OutHeader.BattleRecordServerOnCalc, (p, _s) => this._handleServerOnCalc(p));
  }

  private _handleDotDamage(p: InPacket): void {
    try {
      const damage = p.readInt();
      const count = p.readInt();
      const bAttrRate = p.readByte();
      const attrRate = bAttrRate ? p.readInt() : null;
      this.onDotDamage?.({ damage, count, attrRate });
    } catch {
      // silently skip malformed packets
    }
  }

  private _handleServerOnCalc(p: InPacket): void {
    try {
      const enabled = p.readByte() !== 0;
      this.onServerOnCalcResult?.({ enabled });
    } catch {
      // silently skip malformed packets
    }
  }
}
