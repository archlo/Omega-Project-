import { CWnd, WndMan } from './Wnd.js';

export class CUIWnd extends CWnd {
  uiType = 0;
  backgrndUol = '';
  hasBackground = true;
  savePos = false;
  isLargeMode = false;
  smallScreenX = 0;
  smallScreenY = 0;
  largeScreenX = 0;
  largeScreenY = 0;
  option = 0;
  abOption = 0;

  OnCreate(data: unknown, sUOL?: string, _bMultiBg?: boolean): void {
    if (this.hasBackground && sUOL) {
      this.backgrndUol = sUOL;
    }
    WndMan.InsertWindow(this);
  }

  OnDestroy(): void {
    if (this.savePos) {
      this.smallScreenX = this.container.position.x;
      this.smallScreenY = this.container.position.y;
    }
    this.isLargeMode = false;
  }
}
