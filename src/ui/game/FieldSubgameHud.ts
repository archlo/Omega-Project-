import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface MonsterCarnivalHudState {
  team?: number;
  personalCp?: number;
  personalCpDiff?: number;
  myTeamCp?: number;
  enemyCp?: number;
  lastMessage?: string;
}

export interface SnowBallHudState {
  state?: number;
  snowManHp?: [number, number];
  snowBallPos?: [{ a: number; b: number }, { a: number; b: number }];
  lastMessage?: string;
}

const TitleStyle = new TextStyle({ fill: '#ffe6a3', fontSize: 11, fontFamily: 'monospace' });
const BodyStyle = new TextStyle({ fill: '#ffffff', fontSize: 10, fontFamily: 'monospace' });

const FieldTypeNames = new Map<number, string>([
  [10, 'Monster Carnival'],
  [11, 'Monster Carnival Revive'],
  [14, 'Mu Lung Dojo'],
  [23, 'Massacre'],
  [34, 'Kill Count'],
]);

export class FieldSubgameHud {
  readonly container = new Container({ visible: false });
  private readonly _bg = new Graphics();
  private readonly _title = new Text({ text: '', style: TitleStyle });
  private readonly _body = new Text({ text: '', style: BodyStyle });
  private _fieldType = 0;
  private _mapId = 0;
  private _mc: MonsterCarnivalHudState = {};
  private _snow: SnowBallHudState = {};
  private _line = '';

  constructor() {
    this.container.position.set(12, 72);
    this._title.position.set(8, 5);
    this._body.position.set(8, 21);
    this.container.addChild(this._bg, this._title, this._body);
  }

  SetField(fieldType: number, mapId: number): void {
    this._fieldType = fieldType;
    this._mapId = mapId;
    this._mc = {};
    this._snow = {};
    this._line = '';
    this._refresh();
  }

  SetMonsterCarnival(state: MonsterCarnivalHudState): void {
    this._mc = { ...this._mc, ...state };
    this._refresh();
  }

  SetSnowBall(state: SnowBallHudState): void {
    this._snow = { ...this._snow, ...state };
    this._refresh();
  }

  SetMessage(message: string): void {
    this._line = message;
    this._refresh();
  }

  private _refresh(): void {
    const name = FieldTypeNames.get(this._fieldType);
    this.container.visible = !!name || !!this._line || this._mc.team !== undefined || this._snow.state !== undefined;
    if (!this.container.visible) return;

    this._title.text = name ?? 'Field Subgame';
    const lines: string[] = [`map ${this._mapId} type ${this._fieldType}`];
    if (this._mc.team !== undefined || this._mc.personalCp !== undefined) {
      lines.push(`team ${this._mc.team ?? '?'}  CP ${this._mc.personalCp ?? 0}${this._mc.personalCpDiff !== undefined ? ` (${this._mc.personalCpDiff >= 0 ? '+' : ''}${this._mc.personalCpDiff})` : ''}`);
      lines.push(`team CP ${this._mc.myTeamCp ?? 0}  enemy ${this._mc.enemyCp ?? 0}`);
    }
    if (this._mc.lastMessage) lines.push(this._mc.lastMessage);
    if (this._snow.snowManHp) lines.push(`snowmen ${this._snow.snowManHp[0]} / ${this._snow.snowManHp[1]}  state ${this._snow.state ?? '?'}`);
    if (this._snow.snowBallPos) lines.push(`balls ${this._snow.snowBallPos[0].a},${this._snow.snowBallPos[0].b} / ${this._snow.snowBallPos[1].a},${this._snow.snowBallPos[1].b}`);
    if (this._snow.lastMessage) lines.push(this._snow.lastMessage);
    if (this._line) lines.push(this._line);
    this._body.text = lines.join('\n');

    const longest = Math.max(this._title.text.length, ...lines.map((line) => line.length));
    const w = Math.max(180, Math.min(360, longest * 7 + 16));
    const h = Math.max(44, lines.length * 13 + 30);
    this._bg.clear();
    this._bg.roundRect(0, 0, w, h, 5).fill({ color: 0x121827, alpha: 0.84 });
    this._bg.roundRect(0, 0, w, h, 5).stroke({ color: 0x7cc8ff, width: 1, alpha: 0.9 });
  }
}
