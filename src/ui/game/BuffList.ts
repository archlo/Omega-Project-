import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import type { SkillInfoService } from '../../character/SkillInfoService.js';
import type { WzTextureLoader } from '../../render/WzTextureLoader.js';

const PANEL_W = 120;
const PANEL_H = 240;
const TITLE_H = 18;
const SLOT_H = 26;
const MAX_SLOTS = 8;

interface BuffSlot {
  icon: Sprite;
  label: Text;
  duration: Text;
  skillId: number;
  remaining: number;
}

// OG class: CTemporaryStatView (decompile/9D3710.c, 9D3780.c) — holds a
// ZList<ZRef<TEMPORARY_STAT>> with Show/Hide/AdjustPosition/Update/
// UpdatePassively/ResetTemporary/ShowToolTip(CUIToolTip&), and per-item
// TEMPORARY_STAT::SetLeft/UpdateShadowIndex. The AdjustPosition/SetLeft/
// shadow-index methods suggest dynamically-positioned icons (consistent
// with classic MapleStory's row of buff icons above the character's head),
// not a fixed docked side-panel list as currently implemented here — exact
// positioning isn't recoverable from this decompile export (no method body
// with real coordinates found), so this is a structural hint, not a
// pixel-confirmed rebuild target.
export class BuffList extends GamePanel {
  skillService: SkillInfoService | null = null;
  textureLoader: WzTextureLoader | null = null;

  private _bg: Graphics;
  private _titleText: Text;
  private _slots: BuffSlot[] = [];

  constructor() {
    super();
    this._root.visible = false;
    this._root.x = 800 - PANEL_W - 4;
    this._root.y = 80;

    this._bg = new Graphics();
    this._rebuildBg();
    this._root.addChild(this._bg);

    this._titleText = new Text({ text: 'Buffs', style: new TextStyle({ fill: '#DCC896', fontSize: 10, fontFamily: 'monospace' }) });
    this._titleText.x = 40; this._titleText.y = 3;
    this._root.addChild(this._titleText);

    for (let i = 0; i < MAX_SLOTS; i++) {
      const yy = TITLE_H + 4 + i * SLOT_H;
      const g = new Graphics();
      g.rect(4, yy, 22, 22).fill({  color: '#1A1C28' });
      g.rect(4, yy, 22, 22).stroke({  color: '#2D324B', width: 1 });
      this._root.addChild(g);

      const icon = new Sprite();
      icon.width = 22; icon.height = 22;
      icon.x = 4; icon.y = yy;
      this._root.addChild(icon);

      const label = new Text({ text: '', style: new TextStyle({ fill: '#CCC', fontSize: 9, fontFamily: 'monospace' }) });
      label.x = 30; label.y = yy + 0;
      this._root.addChild(label);

      const dur = new Text({ text: '', style: new TextStyle({ fill: '#AAA', fontSize: 8, fontFamily: 'monospace' }) });
      dur.x = 30; dur.y = yy + 12;
      this._root.addChild(dur);

      this._slots.push({ icon, label, duration: dur, skillId: 0, remaining: 0 });
    }
  }

  addBuff(skillId: number, name: string, seconds: number): void {
    const existing = this._slots.find(s => s.skillId === skillId);
    if (existing) {
      existing.remaining = seconds;
      existing.label.text = name;
      return;
    }

    const empty = this._slots.find(s => s.skillId === 0);
    if (!empty) {
      // No free slot — evict whichever buff is closest to expiring. Slots
      // are fixed, stable display objects; only `_fillSlot` may touch their
      // skillId/remaining/text, never the slots array itself.
      const soonest = this._slots.reduce((a, b) => a.remaining <= b.remaining ? a : b);
      this._fillSlot(soonest, skillId, name, seconds);
    } else {
      this._fillSlot(empty, skillId, name, seconds);
    }
    this._root.visible = this._slots.some(s => s.skillId !== 0);
  }

  removeBuff(skillId: number): void {
    const slot = this._slots.find(s => s.skillId === skillId);
    if (slot) {
      slot.skillId = 0;
      slot.icon.texture = Texture.EMPTY;
      slot.label.text = '';
      slot.duration.text = '';
      slot.remaining = 0;
    }
    this._root.visible = this._slots.some(s => s.skillId !== 0);
  }

  clearBuffs(): void {
    for (const s of this._slots) {
      s.skillId = 0;
      s.icon.texture = Texture.EMPTY;
      s.label.text = '';
      s.duration.text = '';
      s.remaining = 0;
    }
    this._root.visible = false;
  }

  update(dt: number): void {
    for (const s of this._slots) {
      if (s.skillId === 0) continue;
      s.remaining -= dt;
      if (s.remaining <= 0) {
        this.removeBuff(s.skillId);
      } else {
        s.duration.text = `${Math.ceil(s.remaining)}s`;
      }
    }
    this._root.visible = this._slots.some(s => s.skillId !== 0);
  }

  private _fillSlot(slot: BuffSlot, skillId: number, name: string, seconds: number): void {
    slot.skillId = skillId;
    slot.remaining = seconds;
    slot.label.text = name;

    const info = this.skillService?.Get(skillId);
    if (info?.Icon) {
      const ws = this.textureLoader?.Load(info.Icon);
      if (ws) slot.icon.texture = ws.Texture;
    }
  }

  private _rebuildBg(): void {
    this._bg.clear();
    this._bg.rect(0, 0, PANEL_W, PANEL_H).fill({  color: '#0C0E18', alpha: 200 / 255 });
    this._bg.rect(0, 0, PANEL_W, PANEL_H).stroke({  color: '#3C4164', width: 1 });
    this._bg.rect(0, 0, PANEL_W, TITLE_H).fill({  color: '#0F1224' });
  }
}
