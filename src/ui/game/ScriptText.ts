import { BuiltInFont } from '../BuiltInFont.js';

// OG analog: CTextAnalyzer::GetPhrase_Sharp (decompile/9836B0.c), called
// from GetPhrase (decompile/985850.c) <- AnalyzeText. This is the real
// `#`+letter-code dispatcher (reads one char after `#`, switches on
// 'L'/'l'/'B'/'h'/'m'/'o'/'p'/'q'/'t' etc.), confirming this file's tokenizer
// design matches the real client's markup grammar. No dedicated hyperlink-
// click method (OnHyperLink/LinkClick) exists in the decompile — link hit-
// testing is presumably done by the owning dialog against a generic CT_INFO
// per-segment array, not a named method this corpus captured. Still unwired
// into NpcTalk.ts (see TODO_AUDIT.md) — built but unused.
export class ScriptSubst {
  PlayerName = '';
  SpeakerName = '';
  NpcName: ((id: number) => string | null) | null = null;
  ItemName: ((id: number) => string | null) | null = null;
  MobName: ((id: number) => string | null) | null = null;
  MapName: ((id: number) => string | null) | null = null;
  SkillName: ((id: number) => string | null) | null = null;
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

export class Link {
  index = 0;
  bounds = { x: 0, y: 0, width: 0, height: 0 };
}

const ClrBlue = 0x0066FFFF;
const ClrRed = 0xFF0000FF;
const ClrGreen = 0x009900FF;
const ClrPurple = 0x990099FF;

interface Atom {
  rune: number;
  color: number;
  bold: boolean;
  linkIndex: number;
  newLine: boolean;
}

export class ScriptText {
  runs: Run[] = [];
  links: Link[] = [];
  contentHeight = 0;
  lineHeight: number;
  totalChars = 0;

  private _font: BuiltInFont;
  private _bold: BuiltInFont | null;
  private _widthCache = new Map<string, number>();

  constructor(raw: string, wrapWidth: number, margin: number,
    font: BuiltInFont, boldFont: BuiltInFont | null,
    defaultColor: number, subst: ScriptSubst) {
    this._font = font;
    this._bold = boldFont;
    this.lineHeight = font.lineHeight;

    const atoms = ScriptText._tokenize(raw, defaultColor, subst);
    this._layoutAtoms(atoms, wrapWidth, margin);
  }

  private _runeWidth(rune: number, bold: boolean): number {
    const key = `${rune}_${bold}`;
    const cached = this._widthCache.get(key);
    if (cached !== undefined) return cached;
    const s = String.fromCodePoint(rune);
    const f = bold ? (this._bold ?? this._font) : this._font;
    const w = Math.floor(f.measure(s).x);
    this._widthCache.set(key, w);
    return w;
  }

  private static _tokenize(raw: string, defaultColor: number, subst: ScriptSubst): Atom[] {
    const atoms: Atom[] = [];
    let color = defaultColor;
    let bold = false;
    let link = -1;

    const emit = (text: string) => {
      for (const ch of text) {
        const rune = ch.codePointAt(0)!;
        if (rune === 0x0d) continue;
        if (rune === 0x0a) { atoms.push({ rune: 0, color, bold, linkIndex: link, newLine: true }); continue; }
        atoms.push({ rune, color, bold, linkIndex: link, newLine: false });
      }
    };

    let i = 0;
    while (i < raw.length) {
      const ch = raw[i];
      if (ch !== '#' || i + 1 >= raw.length) { emit(ch); i++; continue; }

      const code = raw[i + 1];
      switch (code) {
        case 'k': color = defaultColor; i += 2; break;
        case 'b': color = ClrBlue; i += 2; break;
        case 'r': color = ClrRed; i += 2; break;
        case 'g': color = ClrGreen; i += 2; break;
        case 'd': color = ClrPurple; i += 2; break;
        case 'e': bold = true; i += 2; break;
        case 'n': bold = false; i += 2; break;
        case 'l': link = -1; i += 2; break;
        case 'L': {
          let j = i + 2;
          const start = j;
          while (j < raw.length && raw[j] >= '0' && raw[j] <= '9') j++;
          const idx = parseInt(raw.substring(start, j)) || 0;
          if (j < raw.length && raw[j] === '#') j++;
          link = idx;
          i = j;
          break;
        }
        case 'p': {
          const [id, next] = ScriptText._readArg(raw, i + 2);
          const name = id !== null ? subst.NpcName?.(id) ?? null : null;
          emit(name ?? subst.SpeakerName);
          i = next;
          break;
        }
        case 'h': {
          const [, next] = ScriptText._readArg(raw, i + 2);
          emit(subst.PlayerName);
          i = next;
          break;
        }
        case 't': case 'z': {
          const [id, next] = ScriptText._readArg(raw, i + 2);
          emit(subst.ItemName?.(id ?? -1) ?? ScriptText._rawToken(raw, i, next));
          i = next;
          break;
        }
        case 'o': {
          const [id, next] = ScriptText._readArg(raw, i + 2);
          emit(subst.MobName?.(id ?? -1) ?? ScriptText._rawToken(raw, i, next));
          i = next;
          break;
        }
        case 'm': {
          const [id, next] = ScriptText._readArg(raw, i + 2);
          emit(subst.MapName?.(id ?? -1) ?? ScriptText._rawToken(raw, i, next));
          i = next;
          break;
        }
        case 'q': {
          const [id, next] = ScriptText._readArg(raw, i + 2);
          emit(subst.SkillName?.(id ?? -1) ?? ScriptText._rawToken(raw, i, next));
          i = next;
          break;
        }
        case 'i': case 'v': case 's': case 'f': case 'c':
          i = ScriptText._skipArg(raw, i + 2);
          break;
        default:
          emit('#');
          i++;
          break;
      }
    }
    return atoms;
  }

  private static _readArg(raw: string, start: number): [number | null, number] {
    let j = start;
    while (j < raw.length && raw[j] !== '#') j++;
    const arg = raw.substring(start, j);
    const id = /^\d+$/.test(arg) ? parseInt(arg) : null;
    if (j < raw.length && raw[j] === '#') j++;
    return [id, j];
  }

  private static _skipArg(raw: string, start: number): number {
    let j = start;
    while (j < raw.length && raw[j] !== '#') j++;
    if (j < raw.length && raw[j] === '#') j++;
    return j;
  }

  private static _rawToken(raw: string, hashIndex: number, next: number): string {
    return raw.substring(hashIndex, Math.min(next, raw.length));
  }

  private _layoutAtoms(atoms: Atom[], wrapWidth: number, margin: number): void {
    const usable = Math.max(1, wrapWidth - 2 * margin);
    const lines: Atom[][] = [];
    let line: Atom[] = [];
    let lineWidth = 0;
    let lastSpace = -1;
    let widthAtLastSpace = 0;

    const newLine = () => {
      lines.push(line);
      line = [];
      lineWidth = 0;
      lastSpace = -1;
      widthAtLastSpace = 0;
    };

    for (const a of atoms) {
      if (a.newLine) { newLine(); continue; }
      const isSpace = a.rune === 0x20;
      if (isSpace && line.length === 0) continue;
      const w = this._runeWidth(a.rune, a.bold);
      if (lineWidth + w > usable && line.length > 0) {
        if (lastSpace >= 0 && lastSpace < line.length - 1) {
          const tail = line.slice(lastSpace + 1);
          line.splice(lastSpace);
          lines.push(line);
          line = tail;
          lineWidth = 0;
          for (const t of line) lineWidth += this._runeWidth(t.rune, t.bold);
          lastSpace = -1;
          widthAtLastSpace = 0;
        } else {
          newLine();
        }
      }
      if (a.rune === 0x20) { lastSpace = line.length; widthAtLastSpace = lineWidth; }
      line.push(a);
      lineWidth += w;
    }
    lines.push(line);

    let charIndex = 0;
    const linkBounds = new Map<number, { x: number; y: number; width: number; height: number }>();

    for (let ly = 0; ly < lines.length; ly++) {
      const y = ly * this.lineHeight;
      let x = margin;
      const ln = lines[ly];
      let runStart = 0;

      while (runStart < ln.length) {
        const a0 = ln[runStart];
        let runEnd = runStart;
        const text: string[] = [];
        const runX = x;
        let runW = 0;

        while (runEnd < ln.length
          && ln[runEnd].color === a0.color
          && ln[runEnd].bold === a0.bold
          && ln[runEnd].linkIndex === a0.linkIndex) {
          const a = ln[runEnd];
          text.push(String.fromCodePoint(a.rune));
          const w = this._runeWidth(a.rune, a.bold);
          runW += w;
          x += w;
          runEnd++;
        }

        this.runs.push({ text: text.join(''), x: runX, y, color: a0.color, bold: a0.bold, linkIndex: a0.linkIndex, charStart: charIndex });
        charIndex += runEnd - runStart;

        if (a0.linkIndex >= 0) {
          const rect = { x: runX, y, width: runW, height: this.lineHeight };
          const prev = linkBounds.get(a0.linkIndex);
          linkBounds.set(a0.linkIndex, prev
            ? { x: Math.min(prev.x, rect.x), y: Math.min(prev.y, rect.y), width: Math.max(prev.x + prev.width, rect.x + rect.width) - Math.min(prev.x, rect.x), height: Math.max(prev.y + prev.height, rect.y + rect.height) - Math.min(prev.y, rect.y) }
            : rect);
        }
        runStart = runEnd;
      }
    }

    this.totalChars = charIndex;
    this.contentHeight = lines.length * this.lineHeight;
    for (const [idx, bounds] of linkBounds) {
      const l = new Link();
      l.index = idx;
      l.bounds = bounds;
      this.links.push(l);
    }
    this.links.sort((a, b) => a.index - b.index);
  }
}
