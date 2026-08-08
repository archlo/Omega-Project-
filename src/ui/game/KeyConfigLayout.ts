import { FuncKeyMapped, FuncKeyType } from '../../domain/FuncKeyMapped.js';

// No standalone OG class — the key-binding grid layout is part of
// CUIKeyConfig itself (see KeyConfig.ts's own citation); the binding data
// model is owned by the singleton CFuncKeyMappedMan.
export const CellSize = 32;
export const PaletteCount = 42;

// OG CUIKeyConfig::CalcKeyIconPosInfo @0x7d83D0 builds the bottom key palette
// as a 54-slot grid over 3 rows (18 cols): rows at y = 267 / 301 / 335, each
// cell 34px with x = 34*col + 6 (loop v18 91..144). Panel is 622x374, so those
// three rows are the WHOLE visible strip — nothing below them is on screen.
// The palette is shared: the removed-key stash fills cells from the left, and
// the fixed basics (ResetPaletteItems, 42 entries) fill whatever cells remain.
export const PaletteRows = 3;
export const PaletteCols = 18;
export const MaxPool = 96;
export const RegionSlots = PaletteRows * PaletteCols; // 54
export const ScRShift = 54, ScLShift = 42;
export const ScRCtrl = 89, ScLCtrl = 29;
export const ScRAlt = 90, ScLAlt = 56;

const Cells = new Map<number, { x: number; y: number }>();
const Palette: { x: number; y: number }[] = [];

const LineY = [28, 66, 99, 132, 165, 198];

const Rows: { sc: number; adv: number }[][] = [
  [{ sc: -1, adv: 68 }, { sc: 59, adv: 34 }, { sc: 60, adv: 34 }, { sc: 61, adv: 34 }, { sc: 62, adv: 42 }, { sc: 63, adv: 34 }, { sc: 64, adv: 34 }, { sc: 65, adv: 34 }, { sc: 66, adv: 42 }, { sc: 67, adv: 34 }, { sc: 68, adv: 34 }, { sc: 87, adv: 34 }, { sc: 88, adv: 42 }, { sc: -1, adv: 34 }, { sc: -1, adv: 34 }, { sc: -1, adv: 0 }],
  [{ sc: 41, adv: 34 }, { sc: 2, adv: 34 }, { sc: 3, adv: 34 }, { sc: 4, adv: 34 }, { sc: 5, adv: 34 }, { sc: 6, adv: 34 }, { sc: 7, adv: 34 }, { sc: 8, adv: 34 }, { sc: 9, adv: 34 }, { sc: 10, adv: 34 }, { sc: 11, adv: 34 }, { sc: 12, adv: 34 }, { sc: 13, adv: 34 }, { sc: -1, adv: 58 }, { sc: 82, adv: 34 }, { sc: 71, adv: 34 }, { sc: 73, adv: 0 }],
  [{ sc: -1, adv: 50 }, { sc: 16, adv: 34 }, { sc: 17, adv: 34 }, { sc: 18, adv: 34 }, { sc: 19, adv: 34 }, { sc: 20, adv: 34 }, { sc: 21, adv: 34 }, { sc: 22, adv: 34 }, { sc: 23, adv: 34 }, { sc: 24, adv: 34 }, { sc: 25, adv: 34 }, { sc: 26, adv: 34 }, { sc: 27, adv: 34 }, { sc: 43, adv: 42 }, { sc: 83, adv: 34 }, { sc: 79, adv: 34 }, { sc: 81, adv: 0 }],
  [{ sc: -1, adv: 67 }, { sc: 30, adv: 34 }, { sc: 31, adv: 34 }, { sc: 32, adv: 34 }, { sc: 33, adv: 34 }, { sc: 34, adv: 34 }, { sc: 35, adv: 34 }, { sc: 36, adv: 34 }, { sc: 37, adv: 34 }, { sc: 38, adv: 34 }, { sc: 39, adv: 34 }, { sc: 40, adv: 34 }, { sc: -1, adv: 0 }],
  [{ sc: 42, adv: 84 }, { sc: 44, adv: 34 }, { sc: 45, adv: 34 }, { sc: 46, adv: 34 }, { sc: 47, adv: 34 }, { sc: 48, adv: 34 }, { sc: 49, adv: 34 }, { sc: 50, adv: 34 }, { sc: 51, adv: 34 }, { sc: 52, adv: 34 }, { sc: -1, adv: 34 }, { sc: 54, adv: 0 }],
  [{ sc: 29, adv: 49 }, { sc: -1, adv: 50 }, { sc: 56, adv: 53 }, { sc: 57, adv: 170 }, { sc: 90, adv: 56 }, { sc: -1, adv: 56 }, { sc: 89, adv: 0 }],
];

export function initLayout(): void {
  if (Cells.size > 0) return; // already initialized
  buildKeyboard();
  buildPaletteGrid();
  applyWideKeyNudges();
}

function buildKeyboard(): void {
  for (let row = 0; row < Rows.length; row++) {
    let x = 11;
    const y = LineY[row];
    for (const entry of Rows[row]) {
      if (entry.sc >= 0) Cells.set(entry.sc, { x, y });
      x += entry.adv;
    }
  }
}

function buildPaletteGrid(): void {
  for (let i = 0; i < RegionSlots; i++) {
    const col = i % PaletteCols;
    const rowY = 267 + 34 * Math.floor(i / PaletteCols);
    Palette[i] = { x: 34 * col + 6, y: rowY };
  }
}

function applyWideKeyNudges(): void {
  nudge(42, 24); nudge(54, 16);
  nudge(29, 8); nudge(89, 8);
  nudge(56, 9); nudge(90, 9);
  nudge(57, 60);
}

function nudge(sc: number, dx: number): void {
  const p = Cells.get(sc);
  if (p !== undefined) Cells.set(sc, { x: p.x + dx, y: p.y });
}

export function getBindableScancodes(): number[] {
  return Array.from(Cells.keys());
}

export function tryGetCell(scancode: number): { x: number; y: number } | undefined {
  return Cells.get(scancode);
}

// OG CUIKeyConfig::DrawKeys @0x7da030: label canvases are stamped onto the
// key-cap at a fixed nudge from the cell origin — +4/+4 normally, LShift
// +2/+4, Space +0/+4. Right modifiers reuse the left modifier's label.
export function keyLabelOffset(scancode: number): { dx: number; dy: number } {
  if (scancode === ScLShift || scancode === ScRShift) return { dx: 2, dy: 4 };
  if (scancode === 57) return { dx: 0, dy: 4 };
  return { dx: 4, dy: 4 };
}

export function paletteCell(slot: number): { x: number; y: number } {
  return Palette[slot] ?? { x: 6, y: 267 };
}

// OG: removed-key stash + fixed basics share the single 54-cell strip. Cell
// index < poolSize holds a removed binding; indices >= poolSize that are within
// PaletteCount hold the fixed basic (menu/action/motion). poolSlot returns the
// physical corner of that shared cell.
export function poolSlot(index: number): { x: number; y: number } {
  return Palette[index] ?? { x: 6, y: 267 };
}

export function regionCell(cell: number): { x: number; y: number } {
  return Palette[cell] ?? { x: 6, y: 267 };
}

export function hitTestKey(x: number, y: number): number {
  for (const [sc, p] of Cells) {
    if (x >= p.x && x < p.x + CellSize && y >= p.y && y < p.y + CellSize) {
      if (sc === ScRShift) return ScLShift;
      if (sc === ScRCtrl) return ScLCtrl;
      if (sc === ScRAlt) return ScLAlt;
      return sc;
    }
  }
  return -1;
}

export function hitTestPalette(x: number, y: number): number {
  for (let i = 0; i < PaletteCount; i++) {
    const p = Palette[i];
    if (x >= p.x && x < p.x + CellSize && y >= p.y && y < p.y + CellSize) return i;
  }
  return -1;
}

// Maps a point to a physical cell of the 54-slot bottom strip (0..53), or -1.
export function hitTestRegion(x: number, y: number): number {
  for (let i = 0; i < RegionSlots; i++) {
    const p = Palette[i];
    if (x >= p.x && x < p.x + CellSize && y >= p.y && y < p.y + CellSize) return i;
  }
  return -1;
}

// The binding shown at a bottom-strip cell, respecting the shared layout:
// cells [0, poolLen) are removed-key stash, cells [poolLen, PaletteCount+poolLen)
// are the fixed basics.
export function bindingAtCell(cell: number, poolSize: number): FuncKeyMapped | null {
  if (cell < 0) return null;
  if (cell < poolSize) return null; // stash cell — resolved by the caller
  const slot = cell - poolSize;
  if (slot >= PaletteCount) return null;
  return paletteBinding(slot);
}

export function paletteBinding(slot: number): FuncKeyMapped {
  if (slot < 30) return { type: FuncKeyType.Menu, id: slot };
  if (slot < 35) return { type: FuncKeyType.BasicAction, id: 50 + (slot - 30) };
  return { type: FuncKeyType.BasicMotion, id: 100 + (slot - 35) };
}

export function paletteSlotOf(fk: FuncKeyMapped): number {
  if (fk.type === FuncKeyType.Menu && fk.id >= 0 && fk.id < 30) return fk.id;
  if (fk.type === FuncKeyType.BasicAction && fk.id >= 50 && fk.id <= 54) return 30 + (fk.id - 50);
  if ((fk.type === FuncKeyType.BasicMotion || fk.type === FuncKeyType.Emotion) && fk.id >= 100 && fk.id <= 106) return 35 + (fk.id - 100);
  return -1;
}
