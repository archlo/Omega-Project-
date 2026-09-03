export declare class MachineIdProvider {
    private static _machineId;
    private static _fakeMac;
    private static _fakeMacWithHdd;
    static Init(): Promise<void>;
    static GetMachineId(): Uint8Array;
    static GetFakeMacAddress(): string;
    static GetFakeMacAddressWithHddSerial(): string;
    private static _getMachineName;
    private static _getUserName;
}
//# sourceMappingURL=MachineId.d.ts.map