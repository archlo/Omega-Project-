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
export const enum SpecialKeyFlag {
  None = 0,
  Shift = 1,
  Ctrl = 2,
  Alt = 4,
}

export class InputSystem {
  private static _instance: InputSystem | null = null;
  static get instance(): InputSystem {
    if (!InputSystem._instance) InputSystem._instance = new InputSystem();
    return InputSystem._instance;
  }

  // OG: m_bKeyState[256] — current key state
  private _keyState = new Set<string>();

  // OG: m_cursorPos — current cursor position
  private _cursorX = 0;
  private _cursorY = 0;

  // OG: m_dwSpecialKeyFlag — modifier keys
  private _specialKeyFlag: SpecialKeyFlag = SpecialKeyFlag.None;

  // OG: m_bShowCursor — cursor visibility
  private _cursorVisible = true;

  // OG: m_nCursorState — cursor state (0=normal, 1=click, etc.)
  private _cursorState = 0;

  private _initialized = false;

  /** Initialize event listeners (call once from MapleClaudeGame). */
  init(): void {
    if (this._initialized) return;
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
      this._specialKeyFlag = SpecialKeyFlag.None;
    });
  }

  private _updateSpecialKeys(e: KeyboardEvent): void {
    this._specialKeyFlag = SpecialKeyFlag.None;
    if (e.shiftKey) this._specialKeyFlag |= SpecialKeyFlag.Shift;
    if (e.ctrlKey) this._specialKeyFlag |= SpecialKeyFlag.Ctrl;
    if (e.altKey) this._specialKeyFlag |= SpecialKeyFlag.Alt;
  }

  // --- OG API ---

  /** OG: CInputSystem::IsKeyPressed (0x56F7A0). */
  isKeyPressed(key: string): boolean {
    return this._keyState.has(key);
  }

  /** Check if any of the given keys are pressed. */
  isAnyPressed(...keys: string[]): boolean {
    for (const k of keys) {
      if (this._keyState.has(k)) return true;
    }
    return false;
  }

  /** OG: CInputSystem::GetCursorPos (0x56F830). */
  getCursorPos(): { x: number; y: number } {
    return { x: this._cursorX, y: this._cursorY };
  }

  /** OG: CInputSystem::GetSpecialKeyFlag (0x56F890). */
  getSpecialKeyFlag(): SpecialKeyFlag {
    return this._specialKeyFlag;
  }

  /** OG: CInputSystem::ShowCursor (0x56FD60). */
  showCursor(visible: boolean): void {
    this._cursorVisible = visible;
    document.body.style.cursor = visible ? 'default' : 'none';
  }

  /** OG: CInputSystem::SetCursorPos (0x56FF80). */
  setCursorPos(x: number, y: number): void {
    this._cursorX = x;
    this._cursorY = y;
  }

  /** OG: CInputSystem::SetCursorState (0x570440). */
  setCursorState(state: number): void {
    this._cursorState = state;
  }

  get cursorState(): number { return this._cursorState; }
  get cursorVisible(): boolean { return this._cursorVisible; }

  /** Clear all key state (e.g., on stage transition). */
  clearAll(): void {
    this._keyState.clear();
    this._specialKeyFlag = SpecialKeyFlag.None;
  }
}
