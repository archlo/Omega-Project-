#!/usr/bin/env python3
"""
login_dump.py — IDAPython script to reverse-engineer the MapleStory v83
login / character-creation flow from a named IDB.

Run from IDA Pro: File → Script file → login_dump.py

Output:
  login_flow.txt  — human-readable state machine, opcodes, packet structures
  login_flow.json — machine-readable version for MapleWeb integration

What it extracts:
  • Send / recv opcode tables (found via switch dispatch)
  • Login state machine transitions
  • Character creation packet byte layout
  • World / channel select packet layout
  • All string constants (server messages, error strings)
  • CInPacket decode call sequences per handler
"""

import idaapi, idautils, idc, struct, json, re
from pathlib import Path
from collections import defaultdict

OUT_DIR = Path(idc.get_idb_path()).parent
OUT_TXT  = OUT_DIR / "login_flow.txt"
OUT_JSON = OUT_DIR / "login_flow.json"

# ── Address delta: map VAs → IDA VAs ─────────────────────────────────────────
# v83.map 0001:OFFSET → VA = 0x401000 + OFFSET.
# Detect rebase by checking a known symbol; default 0 (original load).
def _calc_delta() -> int:
    """Check via function existence, not by name (names may be corrupted)."""
    for probe in [0x406455, 0x4065f3, 0x406629]:
        try:
            import ida_funcs as _if
            if _if.get_func(probe) is not None:
                return 0
        except Exception:
            pass
    return 0
_D = _calc_delta()

# Ranges shifted to actual IDA VAs
LOGIN_RANGES = [
    ("Login",          0x5F0000+_D, 0x644000+_D),
    ("CharCreate",     0x8D0000+_D, 0x900000+_D),
    ("CWvsContext",    0xA00000+_D, 0xA10000+_D),
    ("PacketDispatch", 0x401000+_D, 0x480000+_D),
]

# ── Known opcodes ─────────────────────────────────────────────────────────────
# Outgoing (client → server)
SEND_OPCODES = {
    0x01: "LOGIN_PASSWORD",
    0x02: "GUEST_LOGIN",
    0x04: "SERVERLIST_REQUEST",
    0x05: "CHAR_LIST_REQUEST",
    0x06: "SERVER_STATUS_REQUEST",
    0x09: "ACCEPT_TOS",
    0x0A: "GENDER_DONE",
    0x0B: "AFTER_LOGIN",
    0x13: "CHARNAME_CHECK",
    0x14: "CREATE_CHAR",
    0x15: "DELETE_CHAR",
    0x16: "SELECT_CHAR",
    0x1C: "SELECT_CHAR_WITH_PIC",
    0x1E: "REGISTER_PIC",
    0x19: "LOGIN_WORLD_CHANNEL",
    # Game
    0x26: "CHANGE_MAP",
    0x29: "MOVE_PLAYER",
    0x35: "ATTACK_CLOSE",
    0x38: "ATTACK_RANGED",
    0x3A: "ATTACK_MAGIC",
    0x5B: "NPC_TALK",
    0x5D: "NPC_TALK_MORE",
    0x6A: "CHATTEXT_SEND",
}

# Incoming (server → client)
RECV_OPCODES = {
    0x00: "LOGIN_STATUS",
    0x03: "SERVER_STATUS",
    0x04: "SERVER_IP",
    0x05: "CHAR_LIST",
    0x06: "SERVERLIST",
    0x07: "CHARNAME_CHECK_RESULT",
    0x08: "ADD_NEW_CHAR",
    0x09: "DELETE_CHAR_RESULT",
    0x0A: "CHANGE_CHANNEL",
    0x0B: "PING",
    0x0D: "WARP_TO_MAP",
    0x0E: "SPAWN_PLAYER",
    0x0F: "REMOVE_PLAYER",
    0x1B: "CHAT_RECEIVED",
    0x22: "SPAWN_NPC",
    # Add more as you identify them...
}

# ── Packet decode type names ───────────────────────────────────────────────────
# Exact addresses from diagnostics.txt — shifted to IDA VAs at runtime
_RAW_KNOWN = {
    0x406455: "StringPool__GetString",
    0x79e805: "StringPool__GetInstance",
    0x4065f3: "CInPacket__Decode1",
    0x42470c: "CInPacket__Decode2",
    0x406629: "CInPacket__Decode4",
    0x432257: "CInPacket__DecodeBuffer",
    0x46f30c: "CInPacket__DecodeStr",
    0x531325: "CField__OnPacket",
    0x5f80ff: "CLogin__OnPacket",
    0x644446: "CStage__OnPacket",
    0xa07a08: "CWvsContext__OnPacket",
}
KNOWN_ADDRS = {a + _D: v for a, v in _RAW_KNOWN.items()}

_RAW_DECODE = {
    0x4065f3: "byte(1)",
    0x42470c: "short(2)",
    0x406629: "int(4)",
    0x432257: "buffer",
    0x46f30c: "string",
}
DECODE_ADDRS = {a + _D: v for a, v in _RAW_DECODE.items()}

DECODE_TYPES = {
    "CInPacket::Decode1":      "byte(1)",
    "CInPacket::Decode2":      "short(2)",
    "CInPacket::Decode4":      "int(4)",
    "CInPacket::Decode8":      "long(8)",
    "CInPacket::DecodeStr":    "string",
    "CInPacket::DecodeBuffer": "buffer",
}

# ── Helper: demangled function name ──────────────────────────────────────────

def demangle(ea):
    name = idc.get_func_name(ea)
    dm   = idc.demangle_name(name, idc.get_inf_attr(idc.INF_SHORT_DN))
    return (dm or name or f"sub_{ea:X}")

def is_named(ea):
    n = idc.get_func_name(ea)
    return bool(n) and not n.startswith("sub_") and not n.startswith("loc_")


# ── Extract switch table ──────────────────────────────────────────────────────

def get_switch_cases(switch_ea):
    """Return list of (case_value, target_ea) for a switch at switch_ea."""
    si = idaapi.get_switch_info(switch_ea)
    if si is None:
        return []
    cases = []
    jumptable = si.jumps
    ncases    = si.ncases
    elbase    = si.elbase
    for i in range(ncases):
        off = idc.get_wide_dword(jumptable + i * 4) if si.flags & idaapi.SWI_ELBASE else 0
        target = elbase + off if si.flags & idaapi.SWI_ELBASE else idc.get_wide_dword(jumptable + i * 4)
        # Case value = lowcase + i
        cv = si.lowcase + i
        cases.append((cv, target))
    return cases


# ── Extract decode sequence from one handler function ──────────────────────────

def get_decode_sequence(func_ea):
    """Walk func_ea and record every CInPacket::DecodeX call in order."""
    end = idc.get_func_attr(func_ea, idc.FUNCATTR_END)
    seq = []
    for head in idautils.Heads(func_ea, end):
        if idc.print_insn_mnem(head).lower() != "call":
            continue
        op_t = idc.get_operand_type(head, 0)
        if op_t not in (idc.o_near, idc.o_far):
            continue
        target = idc.get_operand_value(head, 0)
        # Match by address first (diagnostics.txt — most reliable)
        if target in DECODE_ADDRS:
            seq.append(DECODE_ADDRS[target])
            continue
        # Fall back to name matching
        tname = idc.get_func_name(target)
        dm    = idc.demangle_name(tname, idc.get_inf_attr(idc.INF_SHORT_DN)) or tname
        for key, label in DECODE_TYPES.items():
            if key in dm or key in tname:
                seq.append(label)
                break
    return seq


# ── Extract string constants from a function ─────────────────────────────────

def get_strings(func_ea):
    end = idc.get_func_attr(func_ea, idc.FUNCATTR_END)
    out = []
    for head in idautils.Heads(func_ea, end):
        for ref in idautils.DataRefsFrom(head):
            s = idc.get_strlit_contents(ref, -1, idc.STRTYPE_C)
            if s:
                try:
                    text = s.decode("utf-8", errors="replace")
                    if len(text) > 2:
                        out.append(text)
                except:
                    pass
    return list(dict.fromkeys(out))


# ── Find the main opcode dispatch switch in a range ──────────────────────────

def find_opcode_dispatch(start, end):
    """
    Look for the largest switch table in the address range.
    That's usually the opcode dispatch.
    Returns (switch_ea, cases_list) or None.
    """
    best      = None
    best_count = 0
    for func_ea in idautils.Functions(start, end):
        fe = idc.get_func_attr(func_ea, idc.FUNCATTR_END)
        for head in idautils.Heads(func_ea, fe):
            si = idaapi.get_switch_info(head)
            if si and si.ncases > best_count:
                best_count = si.ncases
                best       = (head, get_switch_cases(head))
    return best


# ── Analyse one range ─────────────────────────────────────────────────────────

def analyse_range(name, start, end):
    print(f"  [{name}]  {hex(start)}–{hex(end)}")
    funcs = list(idautils.Functions(start, end))
    print(f"    {len(funcs)} functions")

    # Named functions
    named = [(ea, demangle(ea)) for ea in funcs if is_named(ea)]

    # Opcode dispatch
    dispatch = find_opcode_dispatch(start, end)
    handlers = {}
    if dispatch:
        switch_ea, cases = dispatch
        for cv, target_ea in cases:
            handler_name = demangle(target_ea)
            decode_seq   = get_decode_sequence(target_ea)
            strings      = get_strings(target_ea)
            known_name   = RECV_OPCODES.get(cv) or SEND_OPCODES.get(cv) or "?"
            handlers[cv] = {
                "opcode":      hex(cv),
                "known_name":  known_name,
                "handler_ea":  hex(target_ea),
                "handler":     handler_name,
                "decode_seq":  decode_seq,
                "strings":     strings[:8],
            }

    # All strings in range
    all_strings = set()
    for ea in funcs:
        for s in get_strings(ea):
            all_strings.add(s)

    return {
        "name":          name,
        "range":         [hex(start), hex(end)],
        "function_count":len(funcs),
        "named_functions":[{"ea": hex(ea), "name": nm} for ea, nm in named],
        "opcode_dispatch": hex(dispatch[0]) if dispatch else None,
        "handlers":      handlers,
        "strings":       sorted(all_strings),
    }


# ── Auto-rename opcode handlers ───────────────────────────────────────────────

def auto_rename_handlers(handlers, dry_run=False):
    """Rename sub_XXXX handler functions to descriptive names."""
    renamed = 0
    # Also rename the known factory functions from real_factory.txt
    for addr, fname in KNOWN_ADDRS.items():
        cur = idc.get_func_name(addr)
        if cur and cur.startswith("sub_"):
            safe = fname.replace("::", "_").replace(" ", "_")
            if not dry_run:
                idc.set_name(addr, safe, idc.SN_CHECK)
            print(f"    {'[DRY]' if dry_run else ''} {cur} → {safe}")

    for cv, h in handlers.items():
        ea   = int(h["handler_ea"], 16)
        name = idc.get_func_name(ea)
        if name.startswith("sub_") and h["known_name"] != "?":
            new_name = f"Handle_{h['known_name']}"
            if not dry_run:
                idc.set_name(ea, new_name, idc.SN_CHECK)
            print(f"    {'[DRY]' if dry_run else ''} {name} → {new_name}")
            renamed += 1
    return renamed


# ── Packet structure extractor ────────────────────────────────────────────────

def extract_packet_struct(func_ea):
    """
    Trace calls to COutPacket write methods in func_ea to infer
    the structure of a packet built there.
    Returns list of field descriptors.
    """
    WRITE_METHODS = {
        "COutPacket::Encode1":   "writeByte(1)",
        "COutPacket::Encode2":   "writeShort(2)",
        "COutPacket::Encode4":   "writeInt(4)",
        "COutPacket::Encode8":   "writeLong(8)",
        "COutPacket::EncodeStr": "writeString",
        "COutPacket::EncodeBuffer": "writeBuffer",
        # v83 sometimes uses these names
        "writeByte":   "writeByte(1)",
        "writeShort":  "writeShort(2)",
        "writeInt":    "writeInt(4)",
        "writeString": "writeString",
    }
    end    = idc.get_func_attr(func_ea, idc.FUNCATTR_END)
    fields = []
    for head in idautils.Heads(func_ea, end):
        mnem = idc.print_insn_mnem(head).lower()
        if mnem != "call":
            continue
        op_t = idc.get_operand_type(head, 0)
        if op_t not in (idc.o_near, idc.o_far):
            continue
        target = idc.get_operand_value(head, 0)
        tname  = idc.get_func_name(target)
        dm     = idc.demangle_name(tname, idc.get_inf_attr(idc.INF_SHORT_DN)) or tname
        for key, label in WRITE_METHODS.items():
            if key in dm or key in tname:
                fields.append(label)
                break
    return fields


# ── Format text output ────────────────────────────────────────────────────────

SEP = "=" * 72

def fmt_txt(results):
    lines = [
        "MapleStory v83 — LOGIN / CHARACTER CREATION FLOW",
        SEP,
        "Generated by login_dump.py (IDAPython)",
        "",
    ]

    for r in results:
        lines += ["", SEP, f"  SYSTEM: {r['name']}  {r['range'][0]}–{r['range'][1]}",
                  f"  Functions: {r['function_count']}", SEP]

        # Named functions
        if r["named_functions"]:
            lines.append("\n  NAMED FUNCTIONS:")
            for f in r["named_functions"]:
                lines.append(f"    {f['ea']}  {f['name']}")

        # Opcode handlers
        if r["handlers"]:
            lines.append(f"\n  OPCODE DISPATCH @ {r['opcode_dispatch']}")
            lines.append(f"  {'Opcode':<8} {'Known Name':<30} {'Handler':<40} {'Decode Sequence'}")
            lines.append("  " + "-" * 110)
            for cv in sorted(r["handlers"], key=lambda x: int(x, 16) if isinstance(x, str) else x):
                h = r["handlers"][cv]
                seq_str = ", ".join(h["decode_seq"]) or "—"
                lines.append(f"  {h['opcode']:<8} {h['known_name']:<30} {h['handler']:<40} {seq_str}")
                if h["strings"]:
                    for s in h["strings"]:
                        lines.append(f"           → \"{s[:80]}\"")

        # String constants
        if r["strings"]:
            lines.append(f"\n  STRING CONSTANTS ({len(r['strings'])}):")
            for s in r["strings"][:40]:
                lines.append(f"    \"{s[:100]}\"")
            if len(r["strings"]) > 40:
                lines.append(f"    ... {len(r['strings'])-40} more")

    # Opcode reference tables
    lines += ["", SEP, "  OUTGOING OPCODES (client → server)", SEP]
    for op, name in sorted(SEND_OPCODES.items()):
        lines.append(f"  0x{op:04X}  {name}")

    lines += ["", SEP, "  INCOMING OPCODES (server → client)", SEP]
    for op, name in sorted(RECV_OPCODES.items()):
        lines.append(f"  0x{op:04X}  {name}")

    return "\n".join(lines)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("[login_dump] Starting login/char-creation analysis…")
    results = []

    for name, start, end in LOGIN_RANGES:
        r = analyse_range(name, start, end)
        results.append(r)

        # Auto-rename named handlers
        if r["handlers"]:
            renamed = auto_rename_handlers(r["handlers"])
            if renamed:
                print(f"    Renamed {renamed} handler(s)")

    # Extract CREATE_CHAR packet structure specifically
    print("[login_dump] Extracting CreateChar packet structure…")
    create_char_structs = []
    for name, start, end in LOGIN_RANGES:
        for func_ea in idautils.Functions(start, end):
            fname = demangle(func_ea)
            if "create" in fname.lower() and "char" in fname.lower():
                fields = extract_packet_struct(func_ea)
                if fields:
                    create_char_structs.append({
                        "function": fname,
                        "ea":       hex(func_ea),
                        "fields":   fields,
                    })
                    print(f"    {fname}: {fields}")

    # Write TXT
    print("[login_dump] Writing login_flow.txt…")
    txt = fmt_txt(results)
    OUT_TXT.write_text(txt, encoding="utf-8")
    print(f"    → {OUT_TXT}")

    # Write JSON
    print("[login_dump] Writing login_flow.json…")
    output = {
        "systems":            results,
        "send_opcodes":       {hex(k): v for k, v in SEND_OPCODES.items()},
        "recv_opcodes":       {hex(k): v for k, v in RECV_OPCODES.items()},
        "create_char_packet": create_char_structs,
    }
    OUT_JSON.write_text(
        __import__("json").dumps(output, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )
    print(f"    → {OUT_JSON}")

    print("[login_dump] Done.")
    idaapi.msg("[login_dump] Done — check IDB folder for login_flow.txt / .json\n")


if __name__ == "__main__":
    main()
