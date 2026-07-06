"""
IDAPython batch script: dump disassembly + Hex-Rays decompilation for one or
more functions, looked up by name (substring match) or hex address.

Usage (from Windows, idat.exe is the headless/batch IDA executable):
  idat.exe -A -S"ida_dump.py <out.json> <query1> [query2] ..." Maplestory95.exe.i64
  idat.exe -A -S"ida_dump.py --names <out.json> <query1> [...]" Maplestory95.exe.i64

Each query is either:
  - a hex address, e.g. 0x7d58d0 or 7d58d0
  - a name substring, e.g. MiracleCube (matched against demangled names)

With --names as the first arg, only {query, address, name} pairs are written
(no decompile/disasm) - much faster for scanning a whole class's method list.

Writes a JSON array of {query, address, name, disasm, pseudocode} to out.json.
Falls back to disasm-only if Hex-Rays decompilation fails for a function.
"""
import sys
import json
import idautils
import idaapi
import idc

try:
    import ida_hexrays
    HAS_HEXRAYS = ida_hexrays.init_hexrays_plugin()
except Exception:
    HAS_HEXRAYS = False


def find_by_address(addr):
    f = idaapi.get_func(addr)
    if f is None:
        return None
    return f.start_ea


def find_by_name_substring(sub):
    sub_low = sub.lower()
    hits = []
    for ea in idautils.Functions():
        nm = idc.get_func_name(ea) or ""
        demangled = idc.demangle_name(nm, idc.get_inf_attr(idc.INF_SHORT_DN)) or nm
        if sub_low in nm.lower() or sub_low in demangled.lower():
            hits.append((ea, demangled))
    return hits


def dump_function(ea):
    name = idc.get_func_name(ea) or hex(ea)
    demangled = idc.demangle_name(name, idc.get_inf_attr(idc.INF_SHORT_DN)) or name
    f = idaapi.get_func(ea)
    lines = []
    if f is not None:
        cur = f.start_ea
        while cur != idaapi.BADADDR and cur < f.end_ea:
            lines.append(idc.generate_disasm_line(cur, 0))
            cur = idc.next_head(cur, f.end_ea)
    pseudocode = None
    if HAS_HEXRAYS:
        try:
            cfunc = ida_hexrays.decompile(ea)
            if cfunc is not None:
                pseudocode = str(cfunc)
        except Exception as e:
            pseudocode = f"<<decompile failed: {e}>>"
    return {
        "address": hex(ea),
        "name": demangled,
        "disasm": "\n".join(lines),
        "pseudocode": pseudocode,
    }


def main():
    args = idc.ARGV
    names_only = len(args) >= 2 and args[1] == "--names"
    if names_only:
        args = [args[0]] + args[2:]
    if len(args) < 3:
        print("usage: ida_dump.py [--names] out.json query [query...]")
        idc.qexit(1)
    out_path = args[1]
    queries = args[2:]
    results = []
    for q in queries:
        entry = {"query": q, "matches": []}
        qs = q.strip()
        addr = None
        try:
            addr = int(qs, 16) if qs.lower().startswith("0x") else int(qs, 16)
        except ValueError:
            addr = None
        if addr is not None:
            start = find_by_address(addr)
            if start is not None:
                entry["matches"].append({"address": hex(start), "name": idc.demangle_name(idc.get_func_name(start) or "", idc.get_inf_attr(idc.INF_SHORT_DN)) or idc.get_func_name(start)} if names_only else dump_function(start))
        else:
            for ea, name in find_by_name_substring(qs):
                entry["matches"].append({"address": hex(ea), "name": name} if names_only else dump_function(ea))
        results.append(entry)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"wrote {out_path}")
    idc.qexit(0)


main()
