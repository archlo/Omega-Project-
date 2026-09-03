export class MachineIdProvider {
    static _machineId = null;
    static _fakeMac = null;
    static _fakeMacWithHdd = null;
    static async Init() {
        if (this._machineId)
            return;
        const textEncoder = new TextEncoder();
        const name = await this._getMachineName();
        const user = await this._getUserName();
        const seed = `${name}|${user}`;
        const hashBuf = await crypto.subtle.digest('SHA-256', textEncoder.encode(seed));
        this._machineId = new Uint8Array(hashBuf.slice(0, 16));
        const macHash = await crypto.subtle.digest('SHA-256', textEncoder.encode(`MapleClaude|MAC|${name}`));
        const macArr = new Uint8Array(macHash);
        const parts = [];
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
    static GetMachineId() {
        if (!this._machineId)
            throw new Error('MachineIdProvider not initialized — call Init() first');
        return this._machineId;
    }
    static GetFakeMacAddress() {
        if (!this._fakeMac)
            throw new Error('MachineIdProvider not initialized — call Init() first');
        return this._fakeMac;
    }
    static GetFakeMacAddressWithHddSerial() {
        if (!this._fakeMacWithHdd)
            throw new Error('MachineIdProvider not initialized — call Init() first');
        return this._fakeMacWithHdd;
    }
    static async _getMachineName() {
        if (typeof process !== 'undefined' && process?.versions?.node) {
            try {
                return (await import('os')).hostname();
            }
            catch {
                return 'unknown';
            }
        }
        try {
            return globalThis.location?.hostname ?? 'browser';
        }
        catch {
            return 'browser';
        }
    }
    static async _getUserName() {
        if (typeof process !== 'undefined' && process?.versions?.node) {
            try {
                return (await import('os')).userInfo().username;
            }
            catch {
                return 'unknown';
            }
        }
        return 'user';
    }
}
//# sourceMappingURL=MachineId.js.map