#!/usr/bin/env python3
"""
patfind_import.py — Find unrecognized functions in IDA by scanning for
x86 function prologues, then create them.  No external .txt file needed.

Run:  File → Script file → patfind_import.py

Scans all executable segments for common MSVC x86 prologues:
  55 8B EC        push ebp; mov ebp, esp          (stdcall/cdecl)
  56 8B F1        push esi; mov esi, ecx           (thiscall)
  57 8B F9        push edi; mov edi, ecx           (thiscall)
  53 8B D9        push ebx; mov ebx, ecx           (thiscall)
  56 8B F1 E8     push esi; mov esi, ecx; call     (thiscall inline)
  53 8B DC        push ebx; mov ebx, esp           (stdcall variant)

For each address that:
  - matches a prologue pattern
  - does NOT already have a function defined
creates a new function and reports the count.
"""

import idaapi, idautils, idc, ida_bytes, ida_funcs, ida_segment
from pathlib import Path

OUT_DIR = Path(idc.get_idb_path()).parent

# ── Prologue signatures to scan for ──────────────────────────────────────────
# Each entry: (bytes_pattern, mask, name)
# mask: 0xFF = exact match, 0x00 = wildcard
PROLOGUES = [
    # Standard: push ebp / mov ebp, esp
    (b"\x55\x8B\xEC",          b"\xFF\xFF\xFF", "push_ebp"),
    # Thiscall: push esi / mov esi, ecx
    (b"\x56\x8B\xF1",          b"\xFF\xFF\xFF", "thiscall_esi"),
    # Thiscall: push edi / mov edi, ecx
    (b"\x57\x8B\xF9",          b"\xFF\xFF\xFF", "thiscall_edi"),
    # Thiscall: push ebx / mov ebx, ecx
    (b"\x53\x8B\xD9",          b"\xFF\xFF\xFF", "thiscall_ebx"),
    # push esi; mov esi, ecx; push edi; mov edi, ecx+4
    (b"\x56\x57\x8B\xF1",      b"\xFF\xFF\xFF\xFF", "thiscall_esi_edi"),
    # push esi; mov esi, ecx; call immediate
    (b"\x56\x8B\xF1\xE8",      b"\xFF\xFF\xFF\xFF", "thiscall_call"),
]

# Minimum gap between discovered functions (bytes)
MIN_FUNC_GAP = 4


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_exec_segments():
    """Yield (start, end) for all executable segments."""
    for seg_ea in idautils.Segments():
        seg = ida_segment.getseg(seg_ea)
        if seg and (seg.perm & ida_segment.SEGPERM_EXEC):
            yield seg.start_ea, seg.end_ea


def scan_segment(start: int, end: int) -> list[tuple[int, str]]:
    """Scan [start, end) for prologue patterns. Return list of (ea, name)."""
    results = []
    ea = start
    while ea < end - 4:
        for pattern, mask, pname in PROLOGUES:
            plen = len(pattern)
            if ea + plen > end:
                continue
            chunk = ida_bytes.get_bytes(ea, plen)
            if chunk is None:
                continue
            match = all(
                (b & m) == (p & m)
                for b, p, m in zip(chunk, pattern, mask)
            )
            if match:
                results.append((ea, pname))
                ea += MIN_FUNC_GAP - 1   # skip ahead a bit
                break
        ea += 1
    return results


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    idb_path = idc.get_idb_path()
    print(f"[patfind_import] Scanning executable segments for unrecognized functions...")
    print(f"[patfind_import] IDB: {idb_path}")

    # Collect all prologue hits
    all_hits: list[tuple[int, str]] = []
    for seg_start, seg_end in get_exec_segments():
        hits = scan_segment(seg_start, seg_end)
        if hits:
            print(f"  Segment {hex(seg_start)}-{hex(seg_end)}: {len(hits)} hits")
        all_hits.extend(hits)

    print(f"[patfind_import] Total prologue hits: {len(all_hits)}")

    created  = 0
    existed  = 0
    failed   = 0
    by_type  = {}

    for ea, pname in all_hits:
        by_type[pname] = by_type.get(pname, 0) + 1

        # Skip if function already starts here
        f = ida_funcs.get_func(ea)
        if f and f.start_ea == ea:
            existed += 1
            continue

        # Make sure it's code (or can be made code)
        if not ida_bytes.is_code(ida_bytes.get_full_flags(ea)):
            idc.create_insn(ea)

        # Create function
        ok = ida_funcs.add_func(ea)
        if ok:
            created += 1
        else:
            failed += 1

    # Write summary
    lines = [
        f"patfind_import — IDA direct scan",
        f"Total hits : {len(all_hits)}",
        f"Created    : {created}",
        f"Existed    : {existed}",
        f"Failed     : {failed}",
        "",
        "By prologue type:",
    ]
    for t, c in sorted(by_type.items(), key=lambda x: -x[1]):
        lines.append(f"  {c:6}  {t}")

    summary = "\n".join(lines)
    print("[patfind_import]\n" + summary)

    out = OUT_DIR / "patfind_summary.txt"
    out.write_text(summary)
    print(f"[patfind_import] Summary → {out}")

    idaapi.refresh_idaview_anyway()
    idaapi.msg(
        f"[patfind_import] Created {created} functions, {existed} existed, {failed} failed\n"
        f"  Run map_import.py next to apply names.\n"
    )


if __name__ == "__main__":
    main()
