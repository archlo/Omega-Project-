import { BuiltInFont } from '../BuiltInFont.js';
export declare class ScriptSubst {
    PlayerName: string;
    SpeakerName: string;
    NpcName: ((id: number) => string | null) | null;
    ItemName: ((id: number) => string | null) | null;
    MobName: ((id: number) => string | null) | null;
    MapName: ((id: number) => string | null) | null;
    SkillName: ((id: number) => string | null) | null;
}
export interface Run {
    text: string;
    x: number;
    y: number;
    color: number;
    bold: boolean;
    linkIndex: number;
    charStart: number;
}
export declare class Link {
    index: number;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
export declare class ScriptText {
    runs: Run[];
    links: Link[];
    contentHeight: number;
    lineHeight: number;
    totalChars: number;
    private _font;
    private _bold;
    private _widthCache;
    constructor(raw: string, wrapWidth: number, margin: number, font: BuiltInFont, boldFont: BuiltInFont | null, defaultColor: number, subst: ScriptSubst);
    private _runeWidth;
    private static _tokenize;
    private static _readArg;
    private static _skipArg;
    private static _rawToken;
    private _layoutAtoms;
}
//# sourceMappingURL=ScriptText.d.ts.map