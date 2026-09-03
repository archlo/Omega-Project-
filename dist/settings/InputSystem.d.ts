/**
 * OG: CInputSystem — input state manager.
 * Decompiled from v95 IDB (IsKeyPressed 0x56F7A0, GetCursorPos 0x56F830,
 * GetSpecialKeyFlag 0x56F890, ShowCursor 0x56FD60, SetCursorPos 0x56FF80).
 *
 * OG wraps DirectInput for keyboard/mouse/joystick.
 * TS equivalent: wraps browser keydown/keyup/mousemove events.
 *
 * Singleton — accessed via InputSystem.instance.
 */
/** Modifier key flags (OG: GetSpecialKeyFlag return value). */
export declare const enum SpecialKeyFlag {
    None = 0,
    Shift = 1,
    Ctrl = 2,
    Alt = 4
}
export declare class InputSystem {
    private static _instance;
    static get instance(): InputSystem;
    private _keyState;
    private _cursorX;
    private _cursorY;
    private _specialKeyFlag;
    private _cursorVisible;
    private _cursorState;
    private _initialized;
    /** Initialize event listeners (call once from MapleClaudeGame). */
    init(): void;
    private _updateSpecialKeys;
    /** OG: CInputSystem::IsKeyPressed (0x56F7A0). */
    isKeyPressed(key: string): boolean;
    /** Check if any of the given keys are pressed. */
    isAnyPressed(...keys: string[]): boolean;
    /** OG: CInputSystem::GetCursorPos (0x56F830). */
    getCursorPos(): {
        x: number;
        y: number;
    };
    /** OG: CInputSystem::GetSpecialKeyFlag (0x56F890). */
    getSpecialKeyFlag(): SpecialKeyFlag;
    /** OG: CInputSystem::ShowCursor (0x56FD60). */
    showCursor(visible: boolean): void;
    /** OG: CInputSystem::SetCursorPos (0x56FF80). */
    setCursorPos(x: number, y: number): void;
    /** OG: CInputSystem::SetCursorState (0x570440). */
    setCursorState(state: number): void;
    get cursorState(): number;
    get cursorVisible(): boolean;
    /** Clear all key state (e.g., on stage transition). */
    clearAll(): void;
}
//# sourceMappingURL=InputSystem.d.ts.map