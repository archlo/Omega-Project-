import { Sprite, Texture } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import type { WzTextureLoader } from '../../render/WzTextureLoader.js';
import { WzPackage } from '../../wz/WzPackage.js';
import { WzProperty } from '../../wz/WzProperty.js';
import { WzCanvas } from '../../wz/WzCanvas.js';

// OG: CWndSkillGuide — static image popup (inherits CWnd)
// WZ path: UI/UIWindow.img/AranSkillGuide/{nGrade} (grades 1-4)
// Window size: 800×600 (from CWnd::CreateWnd in constructor)
// Closes on double-click or Escape key
// No buttons, no scrollbar, no interactive elements

export class SkillGuide extends GamePanel {
  private _image: Sprite | null = null;
  private _grade = 0;
  private _loader: WzTextureLoader | null = null;
  private _ui: WzPackage | null = null;

  constructor(loader?: WzTextureLoader, ui?: WzPackage | null) {
    super();
    this._loader = loader ?? null;
    this._ui = ui ?? null;

    // OG: CWndSkillGuide::CWndSkillGuide — loads UI/UIWindow.img/AranSkillGuide/{nGrade}
    if (loader && ui) {
      const guideProp = ui.GetItem('UI/UIWindow.img/AranSkillGuide');
      const prop = guideProp instanceof WzProperty ? guideProp : null;
      // Load grade 1 by default (will be replaced in open())
      const gradeNode = prop?.Get('1');
      if (gradeNode instanceof WzCanvas) {
        const ws = loader.Load(gradeNode);
        if (ws) {
          this._image = new Sprite(ws.Texture);
          this._root.addChild(this._image);
        }
      }
    }
  }

  // OG: OpenSkillGuide — grade 1-4 from button IDs 3001-3004
  // Also called by CUserLocal::OnOpenSkillGuide (opcode 262)
  open(grade: number, _loader?: WzTextureLoader, _ui?: WzPackage | null): void {
    this._grade = grade;
    this.isVisible = true;
    const loader = _loader ?? this._loader;
    const ui = _ui ?? this._ui;

    // Load the grade-specific WZ image
    if (loader && ui) {
      const guideProp = ui.GetItem('UI/UIWindow.img/AranSkillGuide');
      const prop = guideProp instanceof WzProperty ? guideProp : null;
      const gradeNode = prop?.Get(String(grade));
      if (gradeNode instanceof WzCanvas) {
        const ws = loader.Load(gradeNode);
        if (ws) {
          if (this._image) {
            this._image.texture = ws.Texture;
          } else {
            this._image = new Sprite(ws.Texture);
            this._root.addChild(this._image);
          }
        }
      }
    }
  }

  // OG: CWndSkillGuide::OnMouseButton — close on double-click
  handleMouseButton(x: number, y: number, down: boolean): boolean {
    if (!this.isVisible) return false;
    if (!down) return true;
    // OG: Close on any click (double-click in OG, but single-click is fine for now)
    this.isVisible = false;
    return true;
  }

  // OG: CWndSkillGuide::OnKey — close on Escape
  onKeyPress(key: string): boolean {
    if (!this.isVisible) return false;
    if (key === 'Escape') {
      this.isVisible = false;
      return true;
    }
    return true;
  }
}
