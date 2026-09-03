import { Container } from 'pixi.js';
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
    snowBallPos?: [{
        a: number;
        b: number;
    }, {
        a: number;
        b: number;
    }];
    lastMessage?: string;
}
export declare class FieldSubgameHud {
    readonly container: Container<import("pixi.js").ContainerChild>;
    private readonly _bg;
    private readonly _title;
    private readonly _body;
    private _fieldType;
    private _mapId;
    private _mc;
    private _snow;
    private _line;
    constructor();
    SetField(fieldType: number, mapId: number): void;
    SetMonsterCarnival(state: MonsterCarnivalHudState): void;
    SetSnowBall(state: SnowBallHudState): void;
    SetMessage(message: string): void;
    private _refresh;
}
//# sourceMappingURL=FieldSubgameHud.d.ts.map