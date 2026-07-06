import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GamePanel } from './GamePanel.js';
import { PartyMember } from '../../net/handlers/PacketArgs.js';

// OG class: CUIPartyHP (decompile/8d1ce0.c..8d3407.c) — the always-on-screen
// party-member HP-bar widget. Ninety-eighth pass finding, confirmed real gap.
// IDA: CUIPartyHP::Create reads member name/job from CWvsContext::GetPartyMemberData
// and renders bars; hp/maxHp come from PARTYDATA bytes 322..369 (two 6×int arrays
// at CWvsContext+0x374A/0x3762). OG uses WZ-loaded canvases for the bar art;
// this port renders plain colored rectangles (same approach as Clock.ts etc.
// where the WZ asset paths are StringPool-resolved and not recoverable).
// This is the Hundred-and-twenty-eighth pass implementation.

const ROW_H = 16;
const BAR_W = 90;
const BAR_H = 8;
const PAD = 4;
const TEXT_W = 60;
const STYLE = new TextStyle({ fontSize: 10, fill: '#ffffff', fontFamily: 'Arial' });

export class PartyHPBar extends GamePanel {
  private _rows: Container[] = [];
  private _bg: Graphics;

  constructor() {
    super();
    // ponytail: OG reads position from CConfig::GetUIWndPos; hardcoded upper-left below status bar.
    this._root.x = 4;
    this._root.y = 80;
    this._bg = new Graphics();
    this._root.addChild(this._bg);
  }

  setMembers(members: PartyMember[]): void {
    for (const r of this._rows) this._root.removeChild(r);
    this._rows = [];

    if (members.length === 0) { this.isVisible = false; return; }

    this._bg.clear();
    const totalH = members.length * ROW_H + PAD * 2;
    const totalW = TEXT_W + BAR_W + PAD * 3;
    this._bg.fill({ color: 0x000000, alpha: 0.55 });
    this._bg.rect(0, 0, totalW, totalH);
    this._bg.fill();

    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      const row = new Container();
      row.y = PAD + i * ROW_H;
      row.x = PAD;

      const label = new Text({ text: m.name.slice(0, 8), style: STYLE });
      label.x = 0;
      label.y = (ROW_H - 10) / 2;
      row.addChild(label);

      const barBg = new Graphics();
      barBg.fill({ color: 0x333333 });
      barBg.rect(TEXT_W, 0, BAR_W, BAR_H);
      barBg.fill();
      row.addChild(barBg);

      const ratio = m.maxHp > 0 ? Math.max(0, Math.min(1, m.hp / m.maxHp)) : 0;
      const fillW = Math.round(ratio * BAR_W);
      if (fillW > 0) {
        const fill = new Graphics();
        // ponytail: green=healthy, yellow=mid, red=low — matches OG bar art intent
        const color = ratio > 0.5 ? 0x00cc44 : ratio > 0.25 ? 0xddcc00 : 0xcc2200;
        fill.fill({ color });
        fill.rect(TEXT_W, 0, fillW, BAR_H);
        fill.fill();
        row.addChild(fill);
      }

      this._rows.push(row);
      this._root.addChild(row);
    }

    this.isVisible = true;
  }
}
