#!/usr/bin/env python3
"""
map_import.py — Parse v83.map and bulk-rename functions in IDA Pro.

Run from IDA Pro:  File → Script file → map_import.py
                   (prompts for .map file path)

Also usable standalone to query addresses:
  python map_import.py v83.map              — print all named symbols
  python map_import.py v83.map 0x406455     — look up address
  python map_import.py v83.map CLogin       — search by name substring

The .map format used here:
  0001:OFFSET   symbol_name
  where real_address = IMAGE_BASE(0x401000) + OFFSET
"""

import sys, re
from pathlib import Path

# Resolved at runtime inside IDA — see get_image_base() below
IMAGE_BASE   = 0x401000   # fallback for standalone CLI
SEGMENT_BASE = {
    "0001": IMAGE_BASE,
    "0002": IMAGE_BASE + 0x80000,
}

def get_image_base() -> int:
    """
    Return delta-corrected base for v83.map address calculations.
    v83.map  0001:OFFSET → VA = 0x401000 + OFFSET  (no further shift for v83).
    Delta is 0 unless IDA has actually rebased the binary away from 0x401000.

    Detection strategy: check if a FUNCTION EXISTS at the known VA.
    Never look up by name (names may be corrupted by a previous bad run).
    """
    MAP_SECTION_BASE = 0x401000
    try:
        import idaapi, idc
        # Known addresses from diagnostics.txt that MUST have functions
        probes = [0x406455, 0x4065f3, 0x406629, 0x79e805]
        for probe in probes:
            f = idaapi.get_func(probe)
            if f is not None:
                # Function exists at expected address → no shift
                return MAP_SECTION_BASE   # delta = 0
        # No function at any probe — binary may be shifted
        # Try to find by walking functions near the probe
        for probe in probes:
            for delta in range(-0x10000, 0x10000, 0x1000):
                f = idaapi.get_func(probe + delta)
                if f and f.start_ea == probe + delta:
                    if delta != 0:
                        print(f"[map_import] Detected delta: {hex(delta)}")
                    return MAP_SECTION_BASE + delta
        return MAP_SECTION_BASE   # fallback: assume 0 delta
    except Exception:
        return MAP_SECTION_BASE

# Symbols to skip — unnamed placeholders
SKIP_PREFIXES = ("sub_", "loc_", "locret_", "unk_", "off_", "def_",
                 "jpt_", "dword_", "word_", "byte_", "qword_", "float_",
                 "dbl_", "xmm", "stru_", "asc_", "align_")

def skip(name: str) -> bool:
    return any(name.startswith(p) for p in SKIP_PREFIXES)


# ── Parser ────────────────────────────────────────────────────────────────────

def parse_map(path: str, base: int | None = None) -> list[tuple[int, str]]:
    """
    Parse a linker .map file.
    Returns list of (real_address, name) for all named symbols.
    Segments: 0001 = code (.text), 0002+ = data.
    """
    symbols = []
    line_re = re.compile(r'^\s*([\dA-Fa-f]{4}):([\dA-Fa-f]{8})\s+(\S+)')

    effective_base = base if base is not None else IMAGE_BASE
    with open(path, "r", errors="replace") as f:
        for line in f:
            m = line_re.match(line)
            if not m:
                continue
            seg, off, name = m.group(1), m.group(2), m.group(3)
            if seg != "0001":
                continue
            if skip(name):
                continue
            addr = effective_base + int(off, 16)
            symbols.append((addr, name))

    return symbols


# ── IDA rename ────────────────────────────────────────────────────────────────

def cleanup_bad_names(bad_delta: int, symbols: list[tuple[int, str]]):
    """
    Undo names applied at (addr + bad_delta) that belong at addr.
    Call this when a previous run used the wrong delta.
    """
    import idc
    removed = 0
    for addr, name in symbols:
        bad_addr = addr + bad_delta
        cur = idc.get_name(bad_addr)
        # Remove if the name there matches what we (wrongly) applied
        safe = re.sub(r'[^A-Za-z0-9_]', '_', name).strip('_')
        if cur == safe:
            idc.set_name(bad_addr, "", idc.SN_CHECK | idc.SN_NOWARN)
            removed += 1
    if removed:
        print(f"[map_import] Cleaned up {removed} wrongly-placed names from previous run")


def run_in_ida(map_path: str):
    """Called when running inside IDA Pro (supports .idb and .i64)."""
    import idaapi, idc

    real_base = get_image_base()
    is_i64    = idc.get_idb_path().lower().endswith(".i64")
    print(f"[map_import] effective map base = {hex(real_base)}  i64={is_i64}")
    symbols = parse_map(map_path, base=real_base)

    # If previous run used bad delta (-0x1000), clean up first
    bad_delta = -0x1000
    test_addr, test_name = symbols[0] if symbols else (0, "")
    if test_name and idc.get_name(test_addr + bad_delta) == re.sub(r'[^A-Za-z0-9_]', '_', test_name).strip('_'):
        print(f"[map_import] Detected leftover names from previous bad run (delta={hex(bad_delta)}), cleaning up...")
        cleanup_bad_names(bad_delta, symbols)
    print(f"[map_import] {len(symbols)} named symbols parsed from {map_path}")

    renamed = 0
    skipped = 0
    errors  = 0

    for addr, name in symbols:
        # Only rename if IDA hasn't named it yet (still sub_XXXX / no name)
        cur = idc.get_func_name(addr)
        if not cur:
            # Not a function start — check if it's a label
            cur = idc.get_name(addr)

        if cur and not cur.startswith("sub_") and not cur.startswith("loc_"):
            skipped += 1
            continue   # Already has a meaningful name

        # Sanitise: IDA names can't have spaces, @, (), etc.
        safe = re.sub(r'[^A-Za-z0-9_]', '_', name).strip('_')
        if not safe:
            continue

        ok = idc.set_name(addr, safe, idc.SN_CHECK | idc.SN_NOWARN)
        if ok:
            renamed += 1
        else:
            errors += 1
            if errors <= 10:
                print(f"  [warn] Could not rename {hex(addr)} → {safe}")

    print(f"[map_import] Done — renamed:{renamed}  skipped:{skipped}  errors:{errors}")
    idaapi.msg(f"[map_import] {renamed} symbols renamed, {skipped} already named, {errors} errors\n")


# ── Standalone CLI ────────────────────────────────────────────────────────────

def run_cli(argv: list[str]):
    if len(argv) < 2:
        print(__doc__)
        return

    map_path = argv[1]
    if not Path(map_path).exists():
        print(f"File not found: {map_path}")
        return

    symbols = parse_map(map_path)

    if len(argv) == 2:
        # Print all named symbols
        print(f"{'Address':<12}  {'Name'}")
        print("-" * 60)
        for addr, name in sorted(symbols):
            print(f"0x{addr:08X}   {name}")
        print(f"\nTotal: {len(symbols)} named symbols")
        return

    query = argv[2]

    # Address lookup
    if query.startswith("0x") or query.startswith("0X"):
        target = int(query, 16)
        results = [(a, n) for a, n in symbols if a == target]
        if results:
            for a, n in results:
                print(f"0x{a:08X}  {n}")
        else:
            # Find nearest
            below = [(a, n) for a, n in symbols if a <= target]
            if below:
                a, n = max(below, key=lambda x: x[0])
                print(f"No exact match. Nearest below: 0x{a:08X}  {n}  (+{target-a:#x})")
        return

    # Name search
    q = query.lower()
    results = [(a, n) for a, n in symbols if q in n.lower()]
    if results:
        print(f"{'Address':<12}  {'Name'}")
        print("-" * 60)
        for a, n in sorted(results):
            print(f"0x{a:08X}   {n}")
        print(f"\n{len(results)} match(es)")
    else:
        print(f"No symbols matching '{query}'")


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    # Detect if running inside IDA
    try:
        import idaapi, idc

        # ── Strategy 1: map in same folder as IDB ─────────────────────────────
        idb_dir = Path(idc.get_idb_path()).parent
        candidates = list(idb_dir.glob("*.map"))

        # ── Strategy 2: well-known path (edit this if needed) ─────────────────
        HARDCODED = Path(r"C:\Users\jorge\OneDrive\Desktop\v83\v83.map")
        if HARDCODED.exists():
            candidates.insert(0, HARDCODED)

        if not candidates:
            # ── Strategy 3: ask user ───────────────────────────────────────────
            try:
                map_path = idaapi.ask_file(False, "*.map", "Select .map file")
                if map_path:
                    candidates = [Path(map_path)]
            except Exception:
                pass

        if not candidates:
            print("[map_import] No .map file found. Place v83.map next to the IDB or edit HARDCODED path.")
            return

        run_in_ida(str(candidates[0]))

    except ImportError:
        # Standalone CLI
        run_cli(sys.argv)


if __name__ == "__main__":
    main()
