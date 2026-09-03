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
export class InputSystem {
    static _instance = null;
    static get instance() {
        if (!InputSystem._instance)
            InputSystem._instance = new InputSystem();
        return InputSystem._instance;
    }
    // OG: m_bKeyState[256] — current key state
    _keyState = new Set();
    // OG: m_cursorPos — current cursor position
    _cursorX = 0;
    _cursorY = 0;
    // OG: m_dwSpecialKeyFlag — modifier keys
    _specialKeyFlag = 0 /* SpecialKeyFlag.None */;
    // OG: m_bShowCursor — cursor visibility
    _cursorVisible = true;
    // OG: m_nCursorState — cursor state (0=normal, 1=click, etc.)
    _cursorState = 0;
    _initialized = false;
    /** Initialize event listeners (call once from MapleClaudeGame). */
    init() {
        if (this._initialized)
            return;
        this._initialized = true;
        document.addEventListener('keydown', (e) => {
            this._keyState.add(e.key);
            this._updateSpecialKeys(e);
        });
        document.addEventListener('keyup', (e) => {
            this._keyState.delete(e.key);
            this._updateSpecialKeys(e);
        });
        document.addEventListener('mousemove', (e) => {
            this._cursorX = e.clientX;
            this._cursorY = e.clientY;
        });
        document.addEventListener('mousedown', () => {
            this._cursorState = 1;
        });
        document.addEventListener('mouseup', () => {
            this._cursorState = 0;
        });
        // Reset all keys when window loses focus
        window.addEventListener('blur', () => {
            this._keyState.clear();
            this._specialKeyFlag = 0 /* SpecialKeyFlag.None */;
        });
    }
    _updateSpecialKeys(e) {
        this._specialKeyFlag = 0 /* SpecialKeyFlag.None */;
        if (e.shiftKey)
            this._specialKeyFlag |= 1 /* SpecialKeyFlag.Shift */;
        if (e.ctrlKey)
            this._specialKeyFlag |= 2 /* SpecialKeyFlag.Ctrl */;
        if (e.altKey)
            this._specialKeyFlag |= 4 /* SpecialKeyFlag.Alt */;
    }
    // --- OG API ---
    /** OG: CInputSystem::IsKeyPressed (0x56F7A0). */
    isKeyPressed(key) {
        return this._keyState.has(key);
    }
    /** Check if any of the given keys are pressed. */
    isAnyPressed(...keys) {
        for (const k of keys) {
            if (this._keyState.has(k))
                return true;
        }
        return false;
    }
    /** OG: CInputSystem::GetCursorPos (0x56F830). */
    getCursorPos() {
        return { x: this._cursorX, y: this._cursorY };
    }
    /** OG: CInputSystem::GetSpecialKeyFlag (0x56F890). */
    getSpecialKeyFlag() {
        return this._specialKeyFlag;
    }
    /** OG: CInputSystem::ShowCursor (0x56FD60). */
    showCursor(visible) {
        this._cursorVisible = visible;
        document.body.style.cursor = visible ? 'default' : 'none';
    }
    /** OG: CInputSystem::SetCursorPos (0x56FF80). */
    setCursorPos(x, y) {
        this._cursorX = x;
        this._cursorY = y;
    }
    /** OG: CInputSystem::SetCursorState (0x570440). */
    setCursorState(state) {
        this._cursorState = state;
    }
    get cursorState() { return this._cursorState; }
    get cursorVisible() { return this._cursorVisible; }
    /** Clear all key state (e.g., on stage transition). */
    clearAll() {
        this._keyState.clear();
        this._specialKeyFlag = 0 /* SpecialKeyFlag.None */;
    }
}
//# sourceMappingURL=InputSystem.js.map