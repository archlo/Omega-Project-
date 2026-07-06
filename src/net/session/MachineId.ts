export class MachineIdProvider {
  private static _machineId: Uint8Array | null = null;
  private static _fakeMac: string | null = null;
  private static _fakeMacWithHdd: string | null = null;

  static async Init(): Promise<void> {
    if (this._machineId) return;
    const textEncoder = new TextEncoder();
    const name = await this._getMachineName();
    const user = await this._getUserName();

    const seed = `${name}|${user}`;
    const hashBuf = await crypto.subtle.digest('SHA-256', textEncoder.encode(seed));
    this._machineId = new Uint8Array(hashBuf.slice(0, 16));

    const macHash = await crypto.subtle.digest('SHA-256', textEncoder.encode(`MapleClaude|MAC|${name}`));
    const macArr = new Uint8Array(macHash);
    const parts: string[] = [];
    for (let i = 0; i < 6; i++) {
      parts.push(macArr[i].toString(16).padStart(2, '0').toUpperCase());
    }
    this._fakeMac = parts.join('-');

    const hddHash = await crypto.subtle.digest('SHA-256', textEncoder.encode(`MapleClaude|MACHDD|${name}`));
    const hddArr = new Uint8Array(hddHash);
    const hex = Array.from(hddArr.subarray(0, 8))
      .map(b => b.toString(16).padStart(2, '0').toUpperCase())
      .join('');
    this._fakeMacWithHdd = `${this._fakeMac}_${hex}`;
  }

  static GetMachineId(): Uint8Array {
    if (!this._machineId) throw new Error('MachineIdProvider not initialized — call Init() first');
    return this._machineId;
  }

  static GetFakeMacAddress(): string {
    if (!this._fakeMac) throw new Error('MachineIdProvider not initialized — call Init() first');
    return this._fakeMac;
  }

  static GetFakeMacAddressWithHddSerial(): string {
    if (!this._fakeMacWithHdd) throw new Error('MachineIdProvider not initialized — call Init() first');
    return this._fakeMacWithHdd;
  }

  private static async _getMachineName(): Promise<string> {
    if (typeof process !== 'undefined' && process?.versions?.node) {
      try { return (await import('os')).hostname(); } catch { return 'unknown'; }
    }
    try { return globalThis.location?.hostname ?? 'browser'; } catch { return 'browser'; }
  }

  private static async _getUserName(): Promise<string> {
    if (typeof process !== 'undefined' && process?.versions?.node) {
      try { return (await import('os')).userInfo().username; } catch { return 'unknown'; }
    }
    return 'user';
  }
}
