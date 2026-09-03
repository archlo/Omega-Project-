"""
make_dump.py — IDAPython script to generate ui_complete_v2-style dump from a named IDB.

Run from IDA Pro:  File → Script file → make_dump.py
Output: dump.txt and dump.json in the same directory as the IDB.

Requires:  IDA Pro 7.x–9.x with Python 3, named IDB (all sub_XXXXXX should be renamed).

Sections emitted:
  1.  All confirmed WZ asset paths (now FULL — raw ASCII+UTF-16 scan, not just IDA strings)
  1b. Packet dispatch map — OnPacket switch tables, opcode -> handler (case VALUES)
  1c. Recv packet structures — ordered CInPacket::Decode* per handler (wire layout)
  1d. Send packet structures — ordered COutPacket::Encode* per builder (outgoing layout)
  2.  UI systems — full per-function breakdown (decode_seq + encode_seq + pseudocode)
  3.  Import table (IAT)
  4.  Struct definitions
  5.  Enum definitions
  6.  Vtable list (+ RTTI class name per vtable)
  7.  Named symbols — every renamed function/data in the IDB (reversed-knowledge map)
  7b. String pool — id -> text (resolved from StringPool::GetString table)
  8.  All strings — every string + the functions that reference it
Per-function records also carry: proto (type sig), decode_seq/encode_seq (+ send_op),
sp_strings (resolved pool text), pseudocode.

What the v2 dump was missing (now captured):
  - Switch CASE VALUES via ida_nalt.get_switch_info + idaapi.calc_switch_cases, so the
    OnPacket dispatch (opcode -> handler addr/name) is recoverable. Old code stored only
    jump-table target addresses, truncated to 8.
  - decode_seq: the ORDERED Decode1/2/4/8/Str/Buffer calls per function = packet field
    layout (e.g. int,short,string = readInt, readShort, readString).
  - pseudocode: Hex-Rays decompile of packet-handler functions (auto-skips if unlicensed).
"""

import idaapi
import idautils
import idc
import ida_bytes
import ida_funcs
import ida_frame
import ida_name
import ida_typeinf
import ida_ua
import ida_xref
import ida_nalt
import json
import os
import re
import sqlite3
from collections import defaultdict

# Hex-Rays is optional (decompiler may be unlicensed). Guard the import.
try:
    import ida_hexrays
    _HEXRAYS_OK = ida_hexrays.init_hexrays_plugin()
except Exception:
    ida_hexrays = None
    _HEXRAYS_OK = False

# ── Output paths ──────────────────────────────────────────────────────────────
IDB_DIR  = os.path.dirname(idc.get_idb_path())
OUT_TXT  = os.path.join(IDB_DIR, "v95_dump.txt")
OUT_JSON = os.path.join(IDB_DIR, "v95_dump.json")
OUT_DB   = os.path.join(IDB_DIR, "v95_dump.db")

# Split output files per category (written in addition to the full dump)
SPLIT_OUTPUT = True
SPLIT_FILES = {
    "packets": (os.path.join(IDB_DIR, "v95_packets.txt"),
                os.path.join(IDB_DIR, "v95_packets.json")),
    "login":   (os.path.join(IDB_DIR, "v95_login.txt"),
                os.path.join(IDB_DIR, "v95_login.json")),
    "map":     (os.path.join(IDB_DIR, "v95_map.txt"),
                os.path.join(IDB_DIR, "v95_map.json")),
    "ui":      (os.path.join(IDB_DIR, "v95_ui.txt"),
                os.path.join(IDB_DIR, "v95_ui.json")),
    "symbols": (os.path.join(IDB_DIR, "v95_symbols.txt"),
                os.path.join(IDB_DIR, "v95_symbols.json")),
}

# Which SYSTEMS belong to which category
SYSTEM_CATEGORIES = {
    "login": {"Login", "CharCreate"},
    "map":   {"PacketCodec", "CWvsContext", "CField_Core", "DamageFont",
              "BuffSystem", "NPCTalk", "ShopSystem", "WorldMap", "MiniMap"},
    "ui":    {"CashShop", "Dialog", "BuddySystem", "MonsterBook", "BossHPBar",
              "ItemTooltip", "Inventory", "EquipWindow", "StatusBar", "ChatWindow",
              "SkillWindow", "QuickSlot", "KeyMap", "PartyWindow",
              "GuildWindow", "QuestWindow", "MainHUD"},
}

# ── Tuning flags ──────────────────────────────────────────────────────────────
FULL_BINARY            = True   # True = dump entire binary; False = SYSTEMS ranges only
DUMP_DISASM            = True   # include full disassembly per function (very large output)
DUMP_DISASM_NAMED_ONLY = False  # disassemble all functions including sub_/loc_
MAX_CALLERS            = 20     # max callers shown per function (0 = unlimited)
SCAN_UNNAMED_VTABLES   = False  # Pass-2 vtable heuristic — slow on full binary (.rdata byte scan)
# Decompile (Hex-Rays) packet-handler functions — the ones that read the wire via
# CInPacket::Decode*. Cheap relative to whole-binary disasm and yields packet structures.
DUMP_PSEUDOCODE        = True   # requires a Hex-Rays license; auto-skips if unavailable
PSEUDOCODE_HANDLERS_ONLY = True # only decompile fns with a decode_seq or that are switch targets
PSEUDOCODE_MAX_LINES   = 400    # safety cap per function
DUMP_ALL_STRINGS       = True   # Section 8: every string + which functions reference it
MAX_STRING_LEN         = 300    # truncate long strings in the table
DUMP_FUNC_PROTO        = True   # per-function type signature (IDA's guess)
# StringPool resolution — turn captured numeric sp_ids into readable UI text.
STRINGPOOL_TABLE       = 0      # base VA of the string-pointer array (0 = auto-detect)
STRINGPOOL_COUNT       = 0      # entry count (0 = scan until a run of misses)

# ── Address delta: map VAs → IDA VAs ─────────────────────────────────────────
# v95: delta defaults to 0 (standard PE base 0x401000). Change if IDB was rebased.
MAP_FILE_BASE    = 0x401000
MAP_TO_IDA_DELTA = 0

# Load Maplestory95.exe.map for symbol resolution
MAP_FILE     = os.path.join(IDB_DIR, "Maplestory95.exe.map")
_MAP_SYMBOLS: dict = {}   # VA → name
_NAME_TO_VA:  dict = {}   # name → VA (inverse, for addr resolution)

def _load_map():
    if not os.path.exists(MAP_FILE):
        print(f"[make_dump] WARNING: map file not found: {MAP_FILE}")
        return
    skip = ("sub_","loc_","locret_","unk_","off_","def_","jpt_",
            "dword_","word_","byte_","qword_","float_","stru_")
    pattern = re.compile(r'^\s*0001:([\dA-Fa-f]{8})\s+(\S+)')
    with open(MAP_FILE, "r", errors="replace") as f:
        for line in f:
            m = pattern.match(line)
            if not m: continue
            name = m.group(2)
            if any(name.startswith(p) for p in skip): continue
            va = MAP_FILE_BASE + int(m.group(1), 16) + MAP_TO_IDA_DELTA
            _MAP_SYMBOLS[va]   = name
            _NAME_TO_VA[name]  = va
    print(f"[make_dump] Loaded {len(_MAP_SYMBOLS)} symbols from Maplestory95.exe.map")

_load_map()

def _resolve_from_map():
    """Populate DECODE_ADDRS / STRING_POOL_ADDRS / SYSTEM_ONPACKET from map symbols.
    Overrides hardcoded v83 fallbacks when map has the named symbols."""
    global DECODE_ADDRS, STRING_POOL_ADDRS, SYSTEM_ONPACKET

    _DECODE_PATTERNS = {
        "CInPacket::Decode1":      "byte(1)",
        "CInPacket::Decode2":      "short(2)",
        "CInPacket::Decode4":      "int(4)",
        "CInPacket::Decode8":      "long(8)",
        "CInPacket::DecodeBuffer": "buffer",
        "CInPacket::DecodeStr":    "string",
        "CInPacket::DecodeZXY":    "zxy",
    }
    _ONPACKET_CLASSES = ("CField", "CLogin", "CStage", "CWvsContext",
                         "CField_Contimove", "CField_WaitingRoom")

    resolved_decode   = {}
    resolved_sp       = set()
    resolved_onpacket = {}

    for name, va in _NAME_TO_VA.items():
        # Decode primitives
        for pattern, label in _DECODE_PATTERNS.items():
            if pattern in name:
                resolved_decode[va] = label
                break
        # StringPool
        if "StringPool" in name and ("GetString" in name or "GetInstance" in name):
            resolved_sp.add(va)
        # OnPacket dispatch roots
        if "OnPacket" in name:
            for cls in _ONPACKET_CLASSES:
                if name.startswith(cls + "::"):
                    resolved_onpacket[va] = cls
                    break

    if resolved_decode:
        DECODE_ADDRS = resolved_decode
        print(f"[make_dump] Map resolved {len(resolved_decode)} CInPacket::Decode* addrs")
    if resolved_sp:
        STRING_POOL_ADDRS = resolved_sp
        print(f"[make_dump] Map resolved {len(resolved_sp)} StringPool addrs")
    if resolved_onpacket:
        SYSTEM_ONPACKET = resolved_onpacket
        print(f"[make_dump] Map resolved {len(resolved_onpacket)} OnPacket addrs")

# ── System boundaries (v83 reference ranges — only used when FULL_BINARY=False) ──
# For v95 these are approximate; FULL_BINARY=True is recommended.
_D = MAP_TO_IDA_DELTA
SYSTEMS = [
    ("PacketCodec",  0x401000+_D, 0x480000+_D),
    ("CWvsContext",  0x480000+_D, 0x520000+_D),
    ("CField_Core",  0x520000+_D, 0x560000+_D),
    ("DamageFont",   0x540000+_D, 0x570000+_D),
    ("BuffSystem",   0x560000+_D, 0x5a0000+_D),
    ("NPCTalk",      0x5a0000+_D, 0x5d0000+_D),
    ("ShopSystem",   0x5d0000+_D, 0x5f0000+_D),
    ("Login",        0x5f0000+_D, 0x644000+_D),
    ("CashShop",     0x644000+_D, 0x690000+_D),
    ("Dialog",       0x680000+_D, 0x730000+_D),
    ("BuddySystem",  0x730000+_D, 0x760000+_D),
    ("MonsterBook",  0x750000+_D, 0x7a0000+_D),
    ("BossHPBar",    0x7a0000+_D, 0x7c0000+_D),
    ("ItemTooltip",  0x7c0000+_D, 0x800000+_D),
    ("Inventory",    0x800000+_D, 0x860000+_D),
    ("EquipWindow",  0x840000+_D, 0x880000+_D),
    ("StatusBar",    0x880000+_D, 0x8a0000+_D),
    ("ChatWindow",   0x8a0000+_D, 0x8b0000+_D),
    ("SkillWindow",  0x8b0000+_D, 0x8d0000+_D),
    ("CharCreate",   0x8d0000+_D, 0x900000+_D),
    ("QuickSlot",    0x900000+_D, 0x910000+_D),
    ("KeyMap",       0x910000+_D, 0x930000+_D),
    ("WorldMap",     0x930000+_D, 0x960000+_D),
    ("MiniMap",      0x960000+_D, 0x990000+_D),
    ("PartyWindow",  0x9a0000+_D, 0x9c0000+_D),
    ("GuildWindow",  0x9c0000+_D, 0x9e0000+_D),
    ("QuestWindow",  0x980000+_D, 0x9a0000+_D),
    ("MainHUD",      0xa30000+_D, 0xa50000+_D),
]

# ── Constants ─────────────────────────────────────────────────────────────────
COORD_MIN = 20
COORD_MAX = 800

WZ_PREFIXES = (
    "UI/", "Map/", "Skill/", "Item/", "Npc.", "Etc/",
    "Sound/", "Quest/", "Effect/", "Mob/", "Reactor/",
    "String/", "TamingMob/",
)

STRING_POOL_NAMES = {
    "StringPool::GetInstance", "StringPool::GetString",
    "?GetInstance@StringPool@@", "?GetString@StringPool@@",
    "StringPool__GetInstance", "StringPool__GetString",
}

# v95: addresses resolved from Maplestory95.exe.map via _resolve_from_map().
# These start empty; _resolve_from_map() fills them after the map loads.
# Add manual overrides here if the map is missing specific symbols.
STRING_POOL_ADDRS: set  = set()
DECODE_ADDRS:      dict = {}
SYSTEM_ONPACKET:   dict = {}

# Outgoing-packet writers — symmetric to CInPacket::Decode*. Detected by NAME
# (COutPacket::Encode* are usually demangled in the IDB). If they are NOT named,
# fill ENCODE_ADDRS with the raw addresses (same idea as _RAW_DECODE above).
ENCODE_PRIMS = {
    "COutPacket::Encode1":      "byte(1)",
    "COutPacket::Encode2":      "short(2)",
    "COutPacket::Encode4":      "int(4)",
    "COutPacket::Encode8":      "long(8)",
    "COutPacket::EncodeStr":    "string",
    "COutPacket::EncodeBuffer": "buffer",
    "COutPacket::EncodeAscii":  "ascii",
}
_RAW_ENCODE: dict = {}   # e.g. {0x4012ab: "byte(1)"} — fill if Encode* are unnamed
ENCODE_ADDRS = {a + MAP_TO_IDA_DELTA: v for a, v in _RAW_ENCODE.items()}

PACKET_NAMES = {
    "CInPacket::Decode1",  "CInPacket::Decode2",
    "CInPacket::Decode4",  "CInPacket::Decode8",
    "CInPacket::DecodeStr","CInPacket::DecodeBuffer",
    "CInPacket::DecodeZXY",
}

MATH_NAMES = {
    "_rand", "_abs", "__ftol", "_sqrt", "_pow",
    "_sin", "_cos", "_atan2", "_floor", "_ceil",
    "StringPool::GetInstance",
}

STR_OP_NAMES = {
    "_strlen", "_wcslen", "_strchr", "_wcschr", "__wcsicmp",
    "_strcmp", "__strcmpi", "_sscanf", "__wtoi_0", "__itoa",
    "_wcsncpy", "_memset", "_memcpy", "_atexit",
}

# ── Caller map (built once in main) ──────────────────────────────────────────
_CALLER_MAP: dict = {}   # ea → [caller_name, ...]

def _build_caller_map():
    """Pre-build ea→callers map once over all functions."""
    global _CALLER_MAP
    print("[make_dump] Building caller map…")
    raw = defaultdict(set)
    for ea in idautils.Functions():
        name = idc.get_func_name(ea)
        end  = func_end(ea)
        for head in idautils.Heads(ea, end):
            mnem = idc.print_insn_mnem(head).lower()
            if mnem not in ("call", "jmp"):
                continue
            op_t = idc.get_operand_type(head, 0)
            if op_t in (idc.o_near, idc.o_far):
                target = idc.get_operand_value(head, 0)
                raw[target].add(name)
    for target, callers in raw.items():
        lst = sorted(callers)
        if MAX_CALLERS > 0 and len(lst) > MAX_CALLERS:
            lst = lst[:MAX_CALLERS]
        _CALLER_MAP[target] = lst
    print(f"[make_dump] Caller map: {len(_CALLER_MAP)} callees")


# ─────────────────────────────────────────────────────────────────────────────
# Original helpers
# ─────────────────────────────────────────────────────────────────────────────

def func_end(ea):
    f = ida_funcs.get_func(ea)
    return f.end_ea if f else ea


# Disable-mask for short demangled names. Fixed int — IDA 9.x rejects the
# get_inf_attr(INF_SHORT_DN) return type passed straight into demangle_name.
_DEMANGLE_MASK = idaapi.MNG_SHORT_FORM if hasattr(idaapi, "MNG_SHORT_FORM") else 0x0006


def safe_demangle(name):
    """Demangle name → str or None. Survives IDA 7/8/9 API differences."""
    if not name:
        return None
    try:
        return ida_name.demangle_name(name, _DEMANGLE_MASK, ida_name.DQT_FULL)
    except Exception:
        try:
            return ida_name.demangle_name(name, _DEMANGLE_MASK)
        except Exception:
            return None


def demangled(name, ea=None):
    dm = safe_demangle(name)
    if dm: return dm
    if ea and ea in _MAP_SYMBOLS:
        return _MAP_SYMBOLS[ea]
    return name


def read_string_at(ea):
    s = idc.get_strlit_contents(ea, -1, idc.STRTYPE_C)
    if s:
        try: return s.decode("utf-8", errors="replace")
        except Exception: pass
    s = idc.get_strlit_contents(ea, -1, idc.STRTYPE_C_16)
    if s:
        try: return s.decode("utf-16-le", errors="replace").rstrip("\x00")
        except Exception: pass
    return None


def is_wz_path(s):
    if not s or len(s) < 4: return False
    return any(p in s for p in WZ_PREFIXES)


def get_func_strings(ea):
    end = func_end(ea)
    result = set()
    for head in idautils.Heads(ea, end):
        for ref in idautils.DataRefsFrom(head):
            s = read_string_at(ref)
            if s: result.add(s)
    return result


def get_coord_pairs(ea):
    end   = func_end(ea)
    pairs = []
    prev  = None
    RESET = {"call","ret","retn","jmp","jnz","jz","jbe","jae",
              "jl","jg","jle","jge","je","jne","jb","ja","loop","loope","loopne"}
    for head in idautils.Heads(ea, end):
        mnem = idc.print_insn_mnem(head).lower()
        if mnem in RESET:
            prev = None
            continue
        for op_n in range(2):
            if idc.get_operand_type(head, op_n) == idc.o_imm:
                val = idc.get_operand_value(head, op_n)
                if COORD_MIN <= val <= COORD_MAX:
                    if prev is not None:
                        x, y = prev, val
                        if x != y and abs(x-y) > 4 and not (x < 25 and y < 25):
                            pairs.append((x, y))
                    prev = val
                else:
                    prev = None
    seen, dedup = set(), []
    for p in pairs:
        if p not in seen:
            seen.add(p); dedup.append(p)
    return dedup


def get_called_names(ea):
    end   = func_end(ea)
    names = set()
    for head in idautils.Heads(ea, end):
        if idc.print_insn_mnem(head).lower() not in ("call","jmp","jnz","jz"):
            continue
        op_t = idc.get_operand_type(head, 0)
        if op_t in (idc.o_near, idc.o_far):
            target = idc.get_operand_value(head, 0)
            if target in STRING_POOL_ADDRS:
                names.add("StringPool::GetString"); continue
            if target in DECODE_ADDRS:
                names.add(f"CInPacket::{DECODE_ADDRS[target]}"); continue
            n = idc.get_func_name(target)
            if n and not n.startswith("sub_") and not n.startswith("loc_"):
                names.add(demangled(n))
    return names


def get_string_pool_ids(ea):
    end  = func_end(ea)
    ids  = []
    BRANCH = {"ret","retn","jmp","jnz","jz","jbe","jae",
               "jl","jg","jle","jge","je","jne","jb","ja"}
    WINDOW = 6
    recent = []
    for head in idautils.Heads(ea, end):
        mnem = idc.print_insn_mnem(head).lower()
        if mnem in BRANCH:
            recent.clear(); continue
        for op_n in range(3):
            if idc.get_operand_type(head, op_n) == idc.o_imm:
                val = idc.get_operand_value(head, op_n)
                if 0 < val < 0x8000:
                    recent.append(val)
                    if len(recent) > WINDOW: recent.pop(0)
        if mnem == "call":
            op_t = idc.get_operand_type(head, 0)
            if op_t in (idc.o_near, idc.o_far):
                target = idc.get_operand_value(head, 0)
                tname  = idc.get_func_name(target)
                dm     = demangled(tname) if tname else ""
                is_sp  = (target in STRING_POOL_ADDRS or
                          "StringPool" in dm or "StringPool" in (tname or "") or
                          any(sp in dm or sp in (tname or "") for sp in STRING_POOL_NAMES))
                if is_sp:
                    for cand in reversed(recent):
                        if 0x20 <= cand < 0x8000:
                            ids.append(cand); break
            recent.clear()
    return list(dict.fromkeys(ids))


def get_switches(ea):
    """Recover switch tables WITH their case values (e.g. opcode → handler).

    Uses IDA's switch analysis (get_switch_info + calc_switch_cases) to map each
    case CONSTANT to its jump target. Falls back to bare jump-target capture when
    the value table can't be resolved. This is what makes OnPacket dispatch usable.
    """
    end      = func_end(ea)
    switches = []
    for head in idautils.Heads(ea, end):
        swi = ida_nalt.switch_info_t()
        try:
            ida_nalt.get_switch_info(swi, head)   # fills swi; return type varies by IDA ver
        except Exception:
            pass
        if swi.ncases == 0:
            continue

        entries = []          # [{value, hex, target, handler}]
        try:
            res = idaapi.calc_switch_cases(head, swi)
        except Exception:
            res = None
        if res is not None:
            for i in range(res.cases.size()):
                targ = res.targets[i]
                hname = idc.get_func_name(targ) or ""
                for j in range(res.cases[i].size()):
                    v = res.cases[i][j]
                    entries.append({
                        "value":   v,
                        "hex":     hex(v & 0xFFFFFFFF),
                        "target":  hex(targ),
                        "handler": demangled(hname, targ) if hname else "",
                    })

        targets = sorted({e["target"] for e in entries}) or \
                  [hex(t) for t in idautils.CodeRefsFrom(head, 1)]
        switches.append({
            "addr":       head,
            "case_count": swi.ncases,
            "entries":    entries,     # value → handler (the prize)
            "targets":    targets,     # distinct jump targets
        })
    return switches


def get_decode_seq(ea):
    """Ordered list of CInPacket::Decode* calls in execution order = the packet
    wire layout, e.g. ['int(4)','short(2)','string'] = readInt, readShort, readString.

    Only real wire reads — StringPool::GetString is a UI lookup, not a packet field,
    so it is deliberately excluded (it was pure noise in v3).
    """
    end = func_end(ea)
    seq = []
    for head in idautils.Heads(ea, end):
        if idc.print_insn_mnem(head).lower() != "call":
            continue
        if idc.get_operand_type(head, 0) in (idc.o_near, idc.o_far):
            t = idc.get_operand_value(head, 0)
            if t in DECODE_ADDRS:
                seq.append(DECODE_ADDRS[t])
    return seq


def get_encode_seq(ea):
    """Ordered COutPacket::Encode* calls = the OUTGOING packet wire layout.

    Symmetric to get_decode_seq. The first Encode2 in a builder is usually the
    send opcode; the rest are the field writes.
    """
    end = func_end(ea)
    seq = []
    for head in idautils.Heads(ea, end):
        if idc.print_insn_mnem(head).lower() != "call":
            continue
        if idc.get_operand_type(head, 0) not in (idc.o_near, idc.o_far):
            continue
        t = idc.get_operand_value(head, 0)
        if t in ENCODE_ADDRS:
            seq.append(ENCODE_ADDRS[t]); continue
        n = idc.get_func_name(t)
        dm = demangled(n, t) if n else ""
        for k, v in ENCODE_PRIMS.items():
            if k in dm:
                seq.append(v); break
    return seq


def get_send_opcode(ea):
    """Best-effort send opcode: the immediate loaded just before the first
    COutPacket construction / Encode call (builders do `COutPacket pkt(OPCODE)`)."""
    end = func_end(ea)
    recent = None
    for head in idautils.Heads(ea, end):
        mnem = idc.print_insn_mnem(head).lower()
        for opn in range(2):
            if idc.get_operand_type(head, opn) == idc.o_imm:
                v = idc.get_operand_value(head, opn)
                if 0 <= v <= 0x400:
                    recent = v
        if mnem == "call" and idc.get_operand_type(head, 0) in (idc.o_near, idc.o_far):
            t = idc.get_operand_value(head, 0)
            n = idc.get_func_name(t)
            dm = demangled(n, t) if n else ""
            if "COutPacket" in dm or t in ENCODE_ADDRS:
                return recent
    return None


def get_func_proto(ea):
    """IDA's function type signature, if any."""
    if not DUMP_FUNC_PROTO:
        return ""
    try:
        t = idc.get_type(ea)
        if t:
            return t
        tif = ida_typeinf.tinfo_t()
        if ida_typeinf.get_tinfo(tif, ea):
            return str(tif)
    except Exception:
        pass
    return ""


def collect_all_strings():
    """Every string in the binary + the functions that reference it.

    Format strings ("%d/%d", "[%s] failed"), error/debug text, and feature names
    are strong structural hints. Capped length, with up to 10 referencing fns each."""
    if not DUMP_ALL_STRINGS:
        return []
    out = []
    for s in idautils.Strings():
        try:
            text = str(s)
        except Exception:
            continue
        if len(text) < 3:
            continue
        xf = set()
        for xr in idautils.XrefsTo(s.ea, 0):
            f = ida_funcs.get_func(xr.frm)
            if f:
                n = idc.get_func_name(f.start_ea)
                xf.add(demangled(n, f.start_ea) if n else hex(f.start_ea))
        out.append({
            "ea":    hex(s.ea),
            "text":  text[:MAX_STRING_LEN],
            "len":   len(text),
            "xrefs": sorted(xf)[:10],
        })
    return out


def resolve_string_pool():
    """Map StringPool id → text by reading the pointer table StringPool::GetString
    indexes. Auto-detects the table base from a data ref inside GetString; override
    via STRINGPOOL_TABLE if detection misses. Heavily defensive — returns {} on any
    failure so the dump still completes."""
    pool = {}
    try:
        base = STRINGPOOL_TABLE
        if not base:
            for gs in STRING_POOL_ADDRS:
                f = ida_funcs.get_func(gs)
                if not f:
                    continue
                for head in idautils.Heads(f.start_ea, f.end_ea):
                    for dr in idautils.DataRefsFrom(head):
                        sn = idc.get_segm_name(dr) or ""
                        if sn.lower() in (".data", ".rdata", "data", "rdata"):
                            base = dr; break
                    if base:
                        break
                if base:
                    break
        if not base:
            return {}
        cur, idx, misses = base, 0, 0
        cap = STRINGPOOL_COUNT or 100000
        while idx < cap and misses < 16:
            ptr = idc.get_wide_dword(cur)
            txt = read_string_at(ptr) if ptr else None
            if txt and 0 < len(txt) < 1024:
                pool[idx] = txt[:MAX_STRING_LEN]; misses = 0
            else:
                misses += 1
            cur += 4; idx += 1
    except Exception:
        return pool
    return pool


# Built once in main() and read while serialising per-function records.
_STRING_POOL: dict = {}


def get_pseudocode(ea, is_handler):
    """Hex-Rays pseudocode for packet-handler functions (gated by flags/license)."""
    if not (DUMP_PSEUDOCODE and _HEXRAYS_OK):
        return []
    if PSEUDOCODE_HANDLERS_ONLY and not is_handler:
        return []
    try:
        cf = ida_hexrays.decompile(ea)
        if not cf:
            return []
        text = cf.__str__()
        lines = text.splitlines()
        return lines[:PSEUDOCODE_MAX_LINES]
    except Exception:
        return []


def get_top_constants(ea, n=10):
    end    = func_end(ea)
    counts = defaultdict(int)
    for head in idautils.Heads(ea, end):
        for op_n in range(4):
            if idc.get_operand_type(head, op_n) == idc.o_imm:
                val = idc.get_operand_value(head, op_n)
                if 0 < val < 0x20000: counts[val] += 1
    top = sorted(counts.items(), key=lambda x: -x[1])[:n]
    return [{"val": v, "hex": hex(v), "count": c} for v, c in top]


# ─────────────────────────────────────────────────────────────────────────────
# New helpers
# ─────────────────────────────────────────────────────────────────────────────

def get_func_comments(ea):
    """IDA comments: function-level (normal + repeatable) + per-instruction."""
    result = {}
    f = ida_funcs.get_func(ea)
    if f:
        cmt = ida_funcs.get_func_cmt(f, False)
        if cmt: result["func"] = cmt
        cmt_r = ida_funcs.get_func_cmt(f, True)
        if cmt_r: result["func_repeatable"] = cmt_r
    end    = func_end(ea)
    inline = {}
    for head in idautils.Heads(ea, end):
        c = idc.get_cmt(head, 0) or idc.get_cmt(head, 1)
        if c: inline[hex(head)] = c
    if inline: result["inline"] = inline
    return result


def get_func_callers(ea):
    """Return pre-built caller list for this function address."""
    return _CALLER_MAP.get(ea, [])


def get_stack_frame(ea):
    """Stack frame: local variables + arguments. Uses idc wrappers (IDA 7–9 compatible)."""
    try:
        frame_id = idc.get_frame_id(ea)
        if frame_id == idc.BADADDR:
            return []
        members = []
        offset = idc.get_first_member(frame_id)
        while offset != idc.BADADDR:
            try:
                name = idc.get_member_name(frame_id, offset) or ""
                size = idc.get_member_size(frame_id, offset) or 0
                if name.strip() and name.strip() not in ("r", "s"):
                    type_str = f"unk_{size}"
                    try:
                        tif = ida_typeinf.tinfo_t()
                        if idc.get_member_tinfo(frame_id, offset, tif):
                            type_str = str(tif)
                    except Exception:
                        pass
                    members.append({
                        "name":   name,
                        "offset": offset,
                        "size":   size,
                        "type":   type_str,
                    })
            except Exception:
                pass
            offset = idc.get_next_member_offset(frame_id, offset)
        return members
    except Exception:
        return []


def get_func_disasm(ea):
    """Full disassembly text for a function as list of 'addr: text' strings."""
    if not DUMP_DISASM: return []
    if DUMP_DISASM_NAMED_ONLY:
        n = idc.get_func_name(ea)
        if n and (n.startswith("sub_") or n.startswith("loc_")): return []
    end   = func_end(ea)
    lines = []
    for head in idautils.Heads(ea, end):
        line = idc.generate_disasm_line(head, 0)
        if line: lines.append(f"{hex(head)}: {line}")
    return lines


_AUTO_NAME_PREFIXES = (
    "sub_", "loc_", "locret_", "unk_", "off_", "def_", "jpt_", "dword_",
    "word_", "byte_", "qword_", "float_", "stru_", "asc_", "a", "nullsub_",
    "j_", "unknown_libname",
)

def collect_named_symbols():
    """Every meaningfully-renamed symbol in the IDB (functions + data).

    This is the human-reversed knowledge baked into the database — class methods,
    packet handlers, globals. The richest single signal once an analyst has worked
    the IDB. Skips IDA's auto-generated names (sub_/loc_/dword_/…)."""
    out = []
    for ea, raw in idautils.Names():
        if any(raw.startswith(p) for p in _AUTO_NAME_PREFIXES):
            # 'a...' covers IDA ascii auto-labels but also real names; keep if it
            # demangles to something with a namespace/scope.
            dm0 = safe_demangle(raw)
            if not (dm0 and ("::" in dm0 or "@" not in raw)):
                continue
        dm = safe_demangle(raw) or raw
        out.append({
            "ea":   hex(ea),
            "name": dm,
            "raw":  raw,
            "kind": "func" if ida_funcs.get_func(ea) else "data",
        })
    return out


def collect_imports():
    """Return IAT as list of {module, name, ea, ordinal}."""
    imports = []
    n = idaapi.get_import_module_qty()
    for i in range(n):
        mod = idaapi.get_import_module_name(i) or f"module_{i}"
        def _cb(ea, name, ord_val, _mod=mod):
            imports.append({
                "module":  _mod,
                "name":    name or f"ord_{ord_val}",
                "ea":      hex(ea),
                "ordinal": ord_val,
            })
            return True
        idaapi.enum_import_names(i, _cb)
    return imports


def collect_structs():
    """
    All named structs from IDA type system with members.
    IDA 9.x: iterates local type library ordinals via ida_typeinf.
    IDA 7/8 fallback: idautils.Structs() + idc member iteration.
    """
    result = []

    # ── IDA 9.x path: ordinal-based type library ──────────────────────────────
    try:
        til = ida_typeinf.get_idati()
        n   = ida_typeinf.get_ordinal_count(til)
        for i in range(1, n + 1):
            tif = ida_typeinf.tinfo_t()
            if not tif.get_numbered_type(til, i):
                continue
            if not tif.is_struct():
                continue
            name = tif.get_type_name() or f"struct_{i}"
            size = tif.get_size()
            udt  = ida_typeinf.udt_type_data_t()
            if not tif.get_udt_details(udt):
                continue
            members = []
            for j in range(len(udt)):
                udm = udt[j]
                members.append({
                    "name":   udm.name,
                    "offset": udm.offset // 8,  # bits → bytes
                    "size":   udm.size   // 8,
                    "type":   str(udm.type),
                })
            result.append({"name": name, "size": size, "members": members})
        if result:
            return result
    except Exception:
        pass

    # ── IDA 7/8 fallback: idautils.Structs() + idc ───────────────────────────
    try:
        for idx, sid, name in idautils.Structs():
            members = []
            offset  = idc.get_first_member(sid)
            while offset != idc.BADADDR:
                try:
                    mname = idc.get_member_name(sid, offset) or f"field_{offset:X}"
                    size  = idc.get_member_size(sid, offset) or 0
                    members.append({"name": mname, "offset": offset,
                                    "size": size, "type": f"byte[{size}]"})
                except Exception:
                    pass
                offset = idc.get_next_member_offset(sid, offset)
            result.append({
                "name":    name,
                "size":    idc.get_struc_size(sid),
                "members": members,
            })
    except Exception:
        pass

    return result


def collect_enums():
    """
    All named enums from IDA type system with members.
    IDA 9.x: enum-type ordinals via ida_typeinf.
    IDA 7/8 fallback: idc.get_enum_qty() + enum member iteration.
    """
    result = []

    # ── IDA 9.x path: ordinal-based type library ──────────────────────────────
    try:
        til = ida_typeinf.get_idati()
        n   = ida_typeinf.get_ordinal_count(til)
        for i in range(1, n + 1):
            tif = ida_typeinf.tinfo_t()
            if not tif.get_numbered_type(til, i):
                continue
            if not tif.is_enum():
                continue
            name = tif.get_type_name() or f"enum_{i}"
            edata = ida_typeinf.enum_type_data_t()
            if not tif.get_enum_details(edata):
                continue
            members = []
            for j in range(len(edata)):
                em = edata[j]
                members.append({"name": em.name, "value": em.value, "hex": hex(em.value)})
            result.append({
                "name":         name,
                "member_count": len(members),
                "members":      members,
            })
        if result:
            return result
    except Exception:
        pass

    # ── IDA 7/8 fallback ─────────────────────────────────────────────────────
    try:
        qty = idc.get_enum_qty()
        for i in range(qty):
            eid = idc.getn_enum(i)
            if eid == idc.BADADDR: continue
            name    = idc.get_enum_name(eid) or f"enum_{i}"
            members = []
            val = idc.get_first_enum_member(eid, -1)
            while val != idc.BADADDR:
                cid = idc.get_enum_member(eid, val, 0, -1)
                if cid != idc.BADADDR:
                    mname = idc.get_enum_member_name(cid)
                    members.append({"name": mname, "value": val, "hex": hex(val)})
                val = idc.get_next_enum_member(eid, val, -1)
            result.append({
                "name":         name,
                "member_count": len(members),
                "members":      members,
            })
    except Exception:
        pass

    return result


def _rtti_typename(vt_ea):
    """MSVC 32-bit RTTI: [vtable-4] -> CompleteObjectLocator -> +12 TypeDescriptor;
    its name is at +8 (mangled '.?AVCFoo@@'). Best-effort, returns '' on failure."""
    try:
        col = idc.get_wide_dword(vt_ea - 4)
        if not col or not idaapi.getseg(col):
            return ""
        td = idc.get_wide_dword(col + 12)
        if not td or not idaapi.getseg(td):
            return ""
        raw = idc.get_strlit_contents(td + 8, -1, idc.STRTYPE_C)
        if not raw:
            return ""
        name = raw.decode("ascii", "replace").strip("\x00")
        dm = safe_demangle(name) or name           # '.?AVCFoo@@' -> 'CFoo'
        return dm
    except Exception:
        return ""


def _read_vtable_entries(ea):
    """Read consecutive code-pointer entries from ea; stop at first non-function."""
    entries = []
    cur = ea
    while True:
        val = idc.get_wide_dword(cur)
        if not ida_funcs.get_func(val): break
        entries.append({"ea": hex(val), "name": idc.get_func_name(val)})
        cur += 4
    return entries


def collect_vtables():
    """
    Detect vtables.
    Pass 1: IDA/RTTI-named items containing 'vftable' / MSVC mangled pattern.
    Pass 2: heuristic scan of .rdata for runs of 3+ code ptrs with inbound offset xref.
    """
    vtables = []
    seen    = set()

    # Pass 1 — named vtables  (idautils.Names() yields (ea, name))
    for ea, name in idautils.Names():
        dm = safe_demangle(name) or name
        if "vftable" not in dm.lower() and "`vftable'" not in dm and "6B@" not in name:
            continue
        if ea in seen: continue
        seen.add(ea)
        entries = _read_vtable_entries(ea)
        if entries:
            vtables.append({
                "ea": hex(ea), "name": dm, "raw_name": name,
                "rtti": _rtti_typename(ea),
                "entry_count": len(entries), "entries": entries,
            })

    # Pass 2 — heuristic scan (slow on full binary; gated by flag)
    if not SCAN_UNNAMED_VTABLES:
        print(f"[make_dump] Pass-2 vtable scan disabled "
              f"(SCAN_UNNAMED_VTABLES=False) — {len(vtables)} named vtables")
        return vtables

    for seg_ea in idautils.Segments():
        if idc.get_segm_name(seg_ea) not in (".rdata", "RDATA", ".rodata"): continue
        seg = idaapi.getseg(seg_ea)
        ea  = seg_ea
        while ea < seg.end_ea - 8:
            if ea % 4 != 0 or ea in seen:
                ea += 4; continue
            has_code_ref = False
            for xr in idautils.XrefsTo(ea, 0):
                if xr.type != ida_xref.dr_O: continue
                s = idaapi.getseg(xr.frm)
                if s and s.type == idaapi.SEG_CODE:
                    has_code_ref = True; break
            if not has_code_ref:
                ea += 4; continue
            entries = _read_vtable_entries(ea)
            if len(entries) >= 3:
                seen.add(ea)
                vtables.append({
                    "ea":          hex(ea),
                    "name":        idc.get_name(ea) or f"vtable_{hex(ea)}",
                    "raw_name":    idc.get_name(ea) or "",
                    "entry_count": len(entries),
                    "entries":     entries,
                })
                ea += len(entries) * 4
            else:
                ea += 4

    return vtables


# ─────────────────────────────────────────────────────────────────────────────
# System analysis
# ─────────────────────────────────────────────────────────────────────────────

def analyze_system(sys_name, start, end):
    print(f"  [{sys_name}]  {hex(start)}–{hex(end)}")

    funcs = [ea for ea in idautils.Functions(start, end) if start <= ea < end]
    if not funcs: return None

    sys_coords  = []
    sys_wz      = set()
    sys_sp_ids  = set()
    sys_packets = set()
    sys_math    = set()
    sys_strops  = set()
    sys_top_c   = defaultdict(int)
    func_records = {}

    for ea in funcs:
        fname    = idc.get_func_name(ea)
        fsize    = func_end(ea) - ea
        coords   = get_coord_pairs(ea)
        strings  = get_func_strings(ea)
        wz_paths = {s for s in strings if is_wz_path(s)}
        sp_ids   = get_string_pool_ids(ea)
        calls    = get_called_names(ea)
        switches = get_switches(ea)
        decode_seq = get_decode_seq(ea)
        encode_seq = get_encode_seq(ea)
        top_c    = get_top_constants(ea)
        comments = get_func_comments(ea)
        callers  = get_func_callers(ea)
        frame    = get_stack_frame(ea)
        disasm   = get_func_disasm(ea)

        # A real packet handler reads/writes >=2 fields (single calls are usually
        # helpers); always include the OnPacket roots.
        is_handler = len(decode_seq) >= 2 or len(encode_seq) >= 2 or (ea in SYSTEM_ONPACKET)
        pseudocode = get_pseudocode(ea, is_handler)
        send_op    = get_send_opcode(ea) if encode_seq else None
        proto      = get_func_proto(ea)
        sp_strings = [_STRING_POOL[i] for i in sp_ids if i in _STRING_POOL]

        sys_coords.extend(coords)
        sys_wz.update(wz_paths)
        sys_sp_ids.update(sp_ids)

        for c in calls:
            if c.startswith("CInPacket::") or any(p in c for p in PACKET_NAMES): sys_packets.add(c)
            if any(p in c for p in MATH_NAMES):   sys_math.add(c)
            if any(p in c for p in STR_OP_NAMES):  sys_strops.add(c)

        for item in top_c:
            sys_top_c[item["val"]] += item["count"]

        func_records[ea] = {
            "name":        fname,
            "size":        fsize,
            "proto":       proto,
            "coords":      coords,
            "wz":          sorted(wz_paths),
            "sp_ids":      [hex(i) for i in sp_ids],
            "sp_strings":  sp_strings,
            "named_calls": sorted(calls),
            "decode_seq":  decode_seq,
            "encode_seq":  encode_seq,
            "send_op":     (hex(send_op) if send_op is not None else None),
            "switches":    [
                {"addr": hex(s["addr"]), "case_count": s["case_count"],
                 "entries": s["entries"], "targets": s["targets"]}
                for s in switches
            ],
            "comments":    comments,
            "callers":     callers,
            "frame":       frame,
            "disasm":      disasm,
            "pseudocode":  pseudocode,
            "top_constants": top_c,
        }

    coords_by_y = defaultdict(list)
    seen_coord  = set()
    for x, y in sys_coords:
        if (x, y) not in seen_coord:
            seen_coord.add((x, y)); coords_by_y[y].append(x)

    top_sys = sorted(sys_top_c.items(), key=lambda kv: -kv[1])[:10]

    return {
        "name":           sys_name,
        "range":          [hex(start), hex(end)],
        "function_count": len(funcs),
        "positions":      coords_by_y,
        "wz_paths":       sorted(sys_wz),
        "string_pool_ids": sorted([hex(i) for i in sys_sp_ids]),
        "packet_calls":   sorted(sys_packets),
        "math_calls":     sorted(sys_math),
        "str_ops":        sorted(sys_strops),
        "top_constants":  [{"val": v, "hex": hex(v), "count": c} for v, c in top_sys],
        "functions":      func_records,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Global WZ path scan
# ─────────────────────────────────────────────────────────────────────────────

_WZ_RUN_ASCII = re.compile(rb'[\x20-\x7e]{4,}')
_WZ_RUN_UTF16 = re.compile(rb'(?:[\x20-\x7e]\x00){4,}')

def collect_all_wz_paths():
    """All WZ asset paths — not just the ones IDA pre-marked as strings.

    idautils.Strings() alone misses most paths (anything IDA didn't auto-tag, and
    nearly all UTF-16 literals). So also raw-scan the data segments for printable
    ASCII and UTF-16LE runs that look like WZ paths. This is the difference between
    ~51 paths and the full set.
    """
    result = {}

    # 1. IDA-identified strings (fast, gives clean EAs).
    for s in idautils.Strings():
        text = str(s)
        if is_wz_path(text):
            result[s.ea] = text

    # 2. Raw byte scan of data segments (catches unmarked + UTF-16 paths).
    seen_text = set(result.values())
    for seg_ea in idautils.Segments():
        seg = idaapi.getseg(seg_ea)
        if not seg:
            continue
        sname = idc.get_segm_name(seg_ea) or ""
        if sname.lower() not in (".rdata", ".data", ".rodata", "rdata", "data", ".text"):
            continue
        blob = ida_bytes.get_bytes(seg.start_ea, seg.end_ea - seg.start_ea) or b""
        for rx, enc in ((_WZ_RUN_ASCII, "ascii"), (_WZ_RUN_UTF16, "utf-16-le")):
            for m in rx.finditer(blob):
                try:
                    text = m.group().decode(enc, "replace").rstrip("\x00")
                except Exception:
                    continue
                if is_wz_path(text) and text not in seen_text:
                    seen_text.add(text)
                    result[seg.start_ea + m.start()] = text
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Text formatter
# ─────────────────────────────────────────────────────────────────────────────

SEP  = "=" * 70
SEP2 = "-" * 70

def fmt_txt(all_wz, systems, imports, structs, enums, vtables, symbols,
           all_strings, string_pool):
    lines = []
    total_fns = sum(s["function_count"] for s in systems if s)
    lines += [
        "MapleStory v95 — IDB DUMP (make_dump.py)", SEP,
        f"UI systems:      {len([s for s in systems if s])}",
        f"WZ path strings: {len(all_wz)}",
        f"Functions:       {total_fns}",
        f"Imports:         {len(imports)}",
        f"Structs:         {len(structs)}",
        f"Enums:           {len(enums)}",
        f"Vtables:         {len(vtables)}",
        f"Named symbols:   {len(symbols)}",
        f"Strings:         {len(all_strings)}",
        f"StringPool:      {len(string_pool)}",
        "",
    ]

    # ── Section 1: WZ paths ──────────────────────────────────────────────────
    lines += [SEP, "SECTION 1: ALL CONFIRMED WZ ASSET PATHS", SEP]
    for ea, path in sorted(all_wz.items()):
        lines.append(f"  {hex(ea):<16} {path}")
    lines.append("")

    # ── Section 1b: Packet dispatch (OnPacket switch → handler) ───────────────
    lines += [SEP, "SECTION 1b: PACKET DISPATCH MAP (opcode -> handler)", SEP]
    for sys in systems:
        if not sys: continue
        for ea, fn in sorted(sys["functions"].items()):
            onpkt = ea in SYSTEM_ONPACKET
            big   = any(sw["entries"] and sw["case_count"] >= 8 for sw in fn["switches"])
            if not (onpkt and fn["switches"]) and not big:
                continue
            tag = SYSTEM_ONPACKET.get(ea, fn["name"])
            for sw in fn["switches"]:
                if not sw["entries"]: continue
                lines.append(f"\n  {tag}::switch @ {sw['addr']}  ({sw['case_count']} cases)")
                for e in sw["entries"]:
                    lines.append(f"    {e['hex']:>8} -> {e['target']}  {e['handler']}")
    lines.append("")

    # ── Section 1c: Recv packet structures (ordered Decode* per handler) ──────
    lines += [SEP, "SECTION 1c: RECV PACKET STRUCTURES (decode field order)", SEP]
    for sys in systems:
        if not sys: continue
        for ea, fn in sorted(sys["functions"].items()):
            if not fn["decode_seq"]: continue
            lines.append(f"  [{hex(ea)}] {fn['name']:<32} {' '.join(fn['decode_seq'])}")
    lines.append("")

    # ── Section 1d: Send packet structures (ordered Encode* per builder) ──────
    lines += [SEP, "SECTION 1d: SEND PACKET STRUCTURES (encode field order)", SEP]
    for sys in systems:
        if not sys: continue
        for ea, fn in sorted(sys["functions"].items()):
            if not fn["encode_seq"]: continue
            lines.append(f"  [{hex(ea)}] {fn['name']:<32} {' '.join(fn['encode_seq'])}")
    lines.append("")

    # ── Section 2: UI systems ────────────────────────────────────────────────
    lines += [SEP, "SECTION 2: UI SYSTEMS — FULL BREAKDOWN", SEP]
    for sys in systems:
        if not sys: continue
        lines += [
            "", SEP,
            f"  SYSTEM: {sys['name']}",
            f"  Range:  {sys['range'][0]} — {sys['range'][1]}",
            f"  Stats:  {sys['function_count']} fns "
            f"| {len(sys['positions'])} positions "
            f"| {len(sys['string_pool_ids'])} string IDs "
            f"| {len(sys['wz_paths'])} WZ paths",
            SEP,
        ]

        if sys["positions"]:
            lines.append("\n  COORDINATES:")
            for y in sorted(sys["positions"].keys()):
                xs = sorted(sys["positions"][y])
                lines.append(f"    y={y:3}:  x = [{', '.join(f'{x:3}' for x in xs)}]")

        if sys["wz_paths"]:
            lines.append("\n  WZ ASSET PATHS:")
            for p in sys["wz_paths"]: lines.append(f"    {p}")

        if sys["string_pool_ids"]:
            lines.append("\n  STRING POOL IDs:")
            ids = sys["string_pool_ids"]
            for i in range(0, len(ids), 8):
                lines.append("    " + ", ".join(ids[i:i+8]))

        if sys["packet_calls"]:
            lines.append("\n  PACKET DECODE SEQUENCE:")
            for p in sys["packet_calls"]: lines.append(f"    {p}")

        if sys["math_calls"]:
            lines.append("\n  MATH/PHYSICS FUNCTIONS:")
            for m in sys["math_calls"]: lines.append(f"    {m}")

        if sys["str_ops"]:
            lines.append("\n  STRING OPERATIONS:")
            for s in sys["str_ops"]: lines.append(f"    {s}")

        if sys["top_constants"]:
            lines.append("\n  TOP CONSTANTS (likely UI IDs / sizes):")
            for c in sys["top_constants"]:
                lines.append(f"    {c['hex']} ({c['val']:5}):  {c['count']}x")

        lines.append("\n  FUNCTIONS:")
        for ea, fn in sorted(sys["functions"].items()):
            has_data = (fn["coords"] or fn["wz"] or fn["sp_ids"] or fn["switches"]
                        or fn["comments"] or fn["callers"] or fn["frame"] or fn["disasm"]
                        or fn["decode_seq"] or fn["encode_seq"] or fn["pseudocode"])
            if not has_data: continue
            lines.append(f"\n    [{hex(ea)}] {fn['name']}  (size={fn['size']})")
            if fn["proto"]:
                lines.append(f"      proto: {fn['proto']}")

            # comments
            if fn["comments"]:
                if "func" in fn["comments"]:
                    lines.append(f"      // {fn['comments']['func']}")
                if "func_repeatable" in fn["comments"]:
                    lines.append(f"      // (rep) {fn['comments']['func_repeatable']}")
                for addr, c in fn["comments"].get("inline", {}).items():
                    lines.append(f"      // @{addr}: {c}")

            # callers
            if fn["callers"]:
                lines.append(f"      callers ({len(fn['callers'])}): "
                             + ", ".join(fn["callers"][:5])
                             + (" …" if len(fn["callers"]) > 5 else ""))

            # frame
            if fn["frame"]:
                lines.append("      frame:")
                for mb in fn["frame"]:
                    lines.append(f"        [{mb['offset']:+5}] {mb['type']:<20} {mb['name']}")

            # coords / wz / sp_ids
            for x, y in fn["coords"]: lines.append(f"      pos:  ({x:3}, {y:3})")
            for path in fn["wz"]:     lines.append(f"      wz:   {path}")
            if fn["sp_ids"]:          lines.append(f"      ids:  {', '.join(fn['sp_ids'])}")

            # switches — case value → handler (the dispatch table)
            for sw in fn["switches"]:
                lines.append(f"      switch @ {sw['addr']}  ({sw['case_count']} cases)")
                if sw["entries"]:
                    for e in sw["entries"]:
                        lines.append(f"        case {e['hex']:>8} -> {e['target']}  {e['handler']}")
                else:
                    for t in sw["targets"]:
                        lines.append(f"        -> {t}")

            # ordered packet field reads/writes (= wire layout)
            if fn["decode_seq"]:
                lines.append(f"      decode: {' '.join(fn['decode_seq'])}")
            if fn["encode_seq"]:
                op = f"  (op={fn['send_op']})" if fn["send_op"] else ""
                lines.append(f"      encode: {' '.join(fn['encode_seq'])}{op}")
            if fn["sp_strings"]:
                lines.append(f"      strings: {' | '.join(fn['sp_strings'])}")

            # packet calls
            pkt = [c for c in fn["named_calls"] if any(p in c for p in PACKET_NAMES)]
            if pkt: lines.append(f"      pkt:  {', '.join(pkt)}")

            # disassembly
            if fn["disasm"]:
                lines.append("      disasm:")
                for dl in fn["disasm"]: lines.append(f"        {dl}")

            # Hex-Rays pseudocode (packet handlers)
            if fn["pseudocode"]:
                lines.append("      pseudocode:")
                for pl in fn["pseudocode"]: lines.append(f"        {pl}")

    # ── Section 3: Imports ───────────────────────────────────────────────────
    lines += ["", "", SEP, "SECTION 3: IMPORT TABLE (IAT)", SEP]
    cur_mod = None
    for imp in sorted(imports, key=lambda x: (x["module"], x["name"])):
        if imp["module"] != cur_mod:
            cur_mod = imp["module"]
            lines.append(f"\n  [{cur_mod}]")
        ord_str = f"ord={imp['ordinal']}" if imp["ordinal"] else ""
        lines.append(f"    {imp['ea']:<16} {imp['name']:<40} {ord_str}")

    # ── Section 4: Structs ───────────────────────────────────────────────────
    lines += ["", "", SEP, "SECTION 4: STRUCT DEFINITIONS", SEP]
    for st in sorted(structs, key=lambda x: x["name"]):
        lines.append(f"\n  struct {st['name']}  // size={st['size']}")
        for mb in st["members"]:
            lines.append(f"    +{mb['offset']:04X}  {mb['type']:<24} {mb['name']};")

    # ── Section 5: Enums ─────────────────────────────────────────────────────
    lines += ["", "", SEP, "SECTION 5: ENUM DEFINITIONS", SEP]
    for en in sorted(enums, key=lambda x: x["name"]):
        lines.append(f"\n  enum {en['name']}  // {en['member_count']} members")
        for mb in en["members"]:
            lines.append(f"    {mb['name']:<40} = {mb['hex']}")

    # ── Section 6: Vtables ───────────────────────────────────────────────────
    lines += ["", "", SEP, "SECTION 6: VTABLES", SEP]
    for vt in sorted(vtables, key=lambda x: x["ea"]):
        rtti = f"  rtti={vt['rtti']}" if vt.get("rtti") else ""
        lines.append(f"\n  {vt['ea']}  {vt['name']}{rtti}  ({vt['entry_count']} entries)")
        for i, e in enumerate(vt["entries"]):
            lines.append(f"    [{i:3}] {e['ea']}  {e['name']}")

    # ── Section 7: Named symbols (reversed-knowledge map) ─────────────────────
    lines += ["", "", SEP, "SECTION 7: NAMED SYMBOLS", SEP]
    for sym in sorted(symbols, key=lambda s: s["name"]):
        lines.append(f"  {sym['ea']:<16} [{sym['kind']:<4}] {sym['name']}")

    # ── Section 7b: StringPool (id -> text) ───────────────────────────────────
    lines += ["", "", SEP, "SECTION 7b: STRING POOL (id -> text)", SEP]
    for sid in sorted(string_pool.keys()):
        lines.append(f"  {sid:>6}: {string_pool[sid]}")

    # ── Section 8: All strings + referencing functions ───────────────────────
    lines += ["", "", SEP, "SECTION 8: ALL STRINGS", SEP]
    for st in all_strings:
        ref = ("  <- " + ", ".join(st["xrefs"])) if st["xrefs"] else ""
        lines.append(f"  {st['ea']:<16} {st['text']!r}{ref}")

    # ── Summary table ────────────────────────────────────────────────────────
    lines += ["", "", SEP, "SUMMARY TABLE", SEP]
    header = f"{'System':<24} {'Fns':>6} {'Pos':>6} {'IDs':>6} {'WZ':>4} {'Pkt':>4} {'Sw':>4}"
    lines += [header, SEP2]
    for sys in systems:
        if not sys: continue
        sw_count = sum(len(fn["switches"]) for fn in sys["functions"].values())
        lines.append(
            f"{sys['name']:<24}"
            f" {sys['function_count']:>6}"
            f" {len(sys['positions']):>6}"
            f" {len(sys['string_pool_ids']):>6}"
            f" {len(sys['wz_paths']):>4}"
            f" {len(sys['packet_calls']):>4}"
            f" {sw_count:>4}"
        )

    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# JSON formatter
# ─────────────────────────────────────────────────────────────────────────────

def fmt_json(all_wz, systems, imports, structs, enums, vtables, symbols,
             all_strings, string_pool):
    out = {
        "wz_paths":    {hex(ea): path for ea, path in sorted(all_wz.items())},
        "imports":     imports,
        "structs":     structs,
        "enums":       enums,
        "vtables":     vtables,
        "symbols":     symbols,
        "strings":     all_strings,
        "string_pool": {str(k): v for k, v in string_pool.items()},
        "ui_systems":  {},
    }
    for sys in systems:
        if not sys: continue
        fns_out = {}
        for ea, fn in sys["functions"].items():
            fns_out[hex(ea)] = {
                "name":            fn["name"],
                "size":            fn["size"],
                "proto":           fn["proto"],
                "positions":       fn["coords"],
                "wz":              fn["wz"],
                "string_pool_ids": fn["sp_ids"],
                "string_pool_text": fn["sp_strings"],
                "named_calls":     fn["named_calls"],
                "decode_seq":      fn["decode_seq"],
                "encode_seq":      fn["encode_seq"],
                "send_op":         fn["send_op"],
                "switches":        fn["switches"],
                "comments":        fn["comments"],
                "callers":         fn["callers"],
                "frame":           fn["frame"],
                "disasm":          fn["disasm"],
                "pseudocode":      fn["pseudocode"],
            }
        out["ui_systems"][sys["name"]] = {
            "range":           sys["range"],
            "function_count":  sys["function_count"],
            "positions":       {str(y): xs for y, xs in sys["positions"].items()},
            "wz_paths":        sys["wz_paths"],
            "string_pool_ids": sys["string_pool_ids"],
            "packet_calls":    sys["packet_calls"],
            "math_calls":      sys["math_calls"],
            "str_ops":         sys["str_ops"],
            "top_constants":   sys["top_constants"],
            "functions":       fns_out,
        }
    return json.dumps(out, indent=2, ensure_ascii=False)


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def collect_data_xrefs(symbols):
    """For every named data symbol, record which functions reference it.
    Returns list of {data_ea, data_name, func_addr, func_name, xref_type}."""
    out = []
    for sym in symbols:
        if sym["kind"] != "data":
            continue
        try:
            ea = int(sym["ea"], 16)
        except Exception:
            continue
        for xr in idautils.XrefsTo(ea, 0):
            f = ida_funcs.get_func(xr.frm)
            if not f:
                continue
            fn = idc.get_func_name(f.start_ea) or hex(f.start_ea)
            out.append({
                "data_ea":   sym["ea"],
                "data_name": sym["name"],
                "func_addr": hex(f.start_ea),
                "func_name": demangled(fn, f.start_ea),
                "xref_type": xr.type,
            })
    return out


def collect_class_hierarchy():
    """MSVC 32-bit RTTI: walk CompleteObjectLocator → ClassHierarchyDescriptor
    → BaseClassArray to extract parent class names per class.
    Returns list of {class_name, parent_name, depth}."""
    out = []
    seen = set()
    for ea, name in idautils.Names():
        dm = safe_demangle(name) or name
        if "vftable" not in dm.lower() and "`vftable'" not in dm:
            continue
        try:
            col = idc.get_wide_dword(ea - 4)
            if not col or not idaapi.getseg(col):
                continue
            chd = idc.get_wide_dword(col + 0x10)
            if not chd or not idaapi.getseg(chd):
                continue
            num_bases = idc.get_wide_dword(chd + 0x08)
            arr_ptr   = idc.get_wide_dword(chd + 0x0C)
            if not arr_ptr or not idaapi.getseg(arr_ptr):
                continue
            class_name = _rtti_typename(ea) or dm
            for i in range(min(num_bases, 64)):
                bcd = idc.get_wide_dword(arr_ptr + i * 4)
                if not bcd or not idaapi.getseg(bcd):
                    continue
                td = idc.get_wide_dword(bcd)
                if not td or not idaapi.getseg(td):
                    continue
                raw = idc.get_strlit_contents(td + 8, -1, idc.STRTYPE_C)
                if not raw:
                    continue
                parent_mangled = raw.decode("ascii", "replace").strip("\x00")
                parent_name    = safe_demangle(parent_mangled) or parent_mangled
                depth          = idc.get_wide_dword(bcd + 0x0C)  # where_in_hierarchy
                key = (class_name, parent_name)
                if key not in seen:
                    seen.add(key)
                    out.append({"class_name": class_name,
                                "parent_name": parent_name,
                                "depth": depth})
        except Exception:
            continue
    return out


def collect_crypto_constants():
    """Scan for cryptographic material near packet-codec functions:
      - 256-byte shuffle tables (MAPLE_CRYPT)
      - 16/32-byte key arrays (AES)
      - Version/IV shorts
    Returns list of {name, ea, size, hex_bytes, note}."""
    out      = []
    seen_ea  = set()
    CRYPT_KW = ("crypt", "encrypt", "decrypt", "cipher", "codec",
                "CCryptoStream", "TPacket", "COutPacket", "CInPacket",
                "MapleCrypt", "AES", "PKCS")

    # Collect EAs of likely crypto functions
    crypt_fns = set()
    for ea, raw in idautils.Names():
        dm = safe_demangle(raw) or raw
        if any(kw.lower() in dm.lower() for kw in CRYPT_KW):
            crypt_fns.add(ea)

    # Walk data refs from those functions; capture byte arrays of interesting sizes
    INTERESTING = {16, 32, 256}
    for fn_ea in crypt_fns:
        f = ida_funcs.get_func(fn_ea)
        if not f:
            continue
        for head in idautils.Heads(f.start_ea, f.end_ea):
            for dr in idautils.DataRefsFrom(head):
                if dr in seen_ea:
                    continue
                seg = idaapi.getseg(dr)
                if not seg:
                    continue
                item_sz = idc.get_item_size(dr)
                if item_sz not in INTERESTING:
                    # also try reading as a run — IDA may not have sized the item
                    for trial in INTERESTING:
                        blob = ida_bytes.get_bytes(dr, trial)
                        if blob and len(set(blob)) > 8:  # not all-zero / all-same
                            item_sz = trial
                            break
                    else:
                        continue
                blob = ida_bytes.get_bytes(dr, item_sz)
                if not blob:
                    continue
                seen_ea.add(dr)
                label = idc.get_name(dr) or hex(dr)
                fn_name = idc.get_func_name(fn_ea) or hex(fn_ea)
                note = f"ref'd by {demangled(fn_name, fn_ea)}"
                if item_sz == 256:
                    note = "possible MAPLE_CRYPT shuffle table — " + note
                elif item_sz in (16, 32):
                    note = f"possible AES-{item_sz*8} key — " + note
                out.append({
                    "name":      label,
                    "ea":        hex(dr),
                    "size":      item_sz,
                    "hex_bytes": blob.hex(),
                    "note":      note,
                })

    # Also grab the game version short — usually a `mov reg, <short>` before
    # the first COutPacket write in the handshake sender
    for ea, raw in idautils.Names():
        dm = safe_demangle(raw) or raw
        if "handshake" not in dm.lower() and "SendHello" not in dm:
            continue
        f = ida_funcs.get_func(ea)
        if not f:
            continue
        for head in idautils.Heads(f.start_ea, f.end_ea):
            if idc.get_operand_type(head, 1) == idc.o_imm:
                v = idc.get_operand_value(head, 1)
                if 80 <= v <= 120:   # v83–v120 range
                    out.append({
                        "name":      "game_version",
                        "ea":        hex(head),
                        "size":      2,
                        "hex_bytes": v.to_bytes(2, "little").hex(),
                        "note":      f"version short {v} in {dm}",
                    })
                    break

    return out


def collect_pe_info():
    """PE header metadata: image base, entry point, sections, linker timestamp."""
    info = []
    try:
        base = idaapi.get_imagebase()
        info.append(("image_base", hex(base)))
        ep = idc.get_inf_attr(idc.INF_START_IP)
        info.append(("entry_point", hex(ep)))
        min_ea = idc.get_inf_attr(idc.INF_MIN_EA)
        max_ea = idc.get_inf_attr(idc.INF_MAX_EA)
        info.append(("min_ea", hex(min_ea)))
        info.append(("max_ea", hex(max_ea)))
        info.append(("proc_name", idc.get_inf_attr(idc.INF_PROCNAME)
                     if hasattr(idc, "INF_PROCNAME") else "x86"))
        # sections
        for seg_ea in idautils.Segments():
            sname = idc.get_segm_name(seg_ea) or "?"
            seg   = idaapi.getseg(seg_ea)
            if seg:
                info.append((f"section_{sname}",
                              f"{hex(seg.start_ea)}–{hex(seg.end_ea)} "
                              f"size={seg.end_ea - seg.start_ea}"))
        # PE timestamp from DOS/NT header at base
        try:
            ts = idc.get_wide_dword(base + 0x3C)  # e_lfanew
            ts = idc.get_wide_dword(base + ts + 8) # TimeDateStamp
            info.append(("pe_timestamp", hex(ts)))
        except Exception:
            pass
    except Exception as e:
        info.append(("error", str(e)))
    return info


def collect_named_data_details(symbols):
    """Extend data symbols with IDA-known size and type string."""
    out = []
    for sym in symbols:
        if sym["kind"] != "data":
            continue
        try:
            ea   = int(sym["ea"], 16)
            size = idc.get_item_size(ea)
            t    = idc.get_type(ea) or ""
            out.append({"ea": sym["ea"], "name": sym["name"], "size": size, "type": t})
        except Exception:
            out.append({"ea": sym["ea"], "name": sym["name"], "size": 0, "type": ""})
    return out


def write_sqlite_db(all_wz, systems, imports, structs, enums, vtables,
                    symbols, all_strings, string_pool,
                    data_xrefs, class_hierarchy, crypto_constants,
                    pe_info, named_data_details):
    """Write everything into a single SQLite DB for easy querying.

    Tables:
      symbols          — every named function/data (addr, name, raw, kind)
      functions        — per-function record with decode/encode layout
      func_wz          — function ↔ wz path cross-ref
      func_strings     — function ↔ string literal cross-ref
      func_callers     — callee → caller edges
      func_decode_seq  — ordered CInPacket::Decode* fields per function
      func_encode_seq  — ordered COutPacket::Encode* fields per function
      packet_dispatch  — switch case values → handler (opcode dispatch)
      wz_paths         — all WZ asset paths with their VA
      strings          — all binary string literals + referencing functions
      string_pool      — StringPool id → text
      imports          — IAT: module, name, ea, ordinal
      structs          — struct names + sizes
      struct_members   — struct member detail
      enums            — enum names + member counts
      enum_members     — enum member detail
      vtables          — vtable list with RTTI class name
      vtable_entries   — vtable slot → function name
    """
    if os.path.exists(OUT_DB):
        os.remove(OUT_DB)
    con = sqlite3.connect(OUT_DB)
    cur = con.cursor()

    cur.executescript("""
        CREATE TABLE symbols (
            addr TEXT, name TEXT, raw TEXT, kind TEXT);
        CREATE INDEX idx_symbols_name ON symbols(name);
        CREATE INDEX idx_symbols_addr ON symbols(addr);

        CREATE TABLE functions (
            addr TEXT PRIMARY KEY, name TEXT, size INTEGER, proto TEXT,
            system TEXT, send_op TEXT,
            decode_layout TEXT,  -- space-joined field list e.g. "int(4) short(2) string"
            encode_layout TEXT,
            is_handler INTEGER DEFAULT 0);
        CREATE INDEX idx_func_name ON functions(name);

        CREATE TABLE func_wz (
            func_addr TEXT, path TEXT);
        CREATE INDEX idx_fwz_path ON func_wz(path);
        CREATE INDEX idx_fwz_addr ON func_wz(func_addr);

        CREATE TABLE func_strings (
            func_addr TEXT, string TEXT);
        CREATE INDEX idx_fstr_addr ON func_strings(func_addr);

        CREATE TABLE func_callers (
            callee TEXT, caller TEXT);
        CREATE INDEX idx_caller_callee ON func_callers(callee);

        CREATE TABLE func_decode_seq (
            func_addr TEXT, idx INTEGER, field TEXT);

        CREATE TABLE func_encode_seq (
            func_addr TEXT, idx INTEGER, field TEXT);

        CREATE TABLE func_disasm (
            func_addr TEXT, idx INTEGER, line TEXT);
        CREATE INDEX idx_disasm_addr ON func_disasm(func_addr);

        CREATE TABLE func_pseudocode (
            func_addr TEXT, idx INTEGER, line TEXT);
        CREATE INDEX idx_pseudo_addr ON func_pseudocode(func_addr);

        CREATE TABLE func_comments (
            func_addr TEXT, kind TEXT, insn_addr TEXT, text TEXT);
        CREATE INDEX idx_cmt_addr ON func_comments(func_addr);

        CREATE TABLE func_frame (
            func_addr TEXT, offset INTEGER, size INTEGER, type TEXT, name TEXT);
        CREATE INDEX idx_frame_addr ON func_frame(func_addr);

        CREATE TABLE func_switches (
            func_addr TEXT, switch_addr TEXT, case_count INTEGER);

        CREATE TABLE switch_entries (
            switch_addr TEXT, value TEXT, hex TEXT, target TEXT, handler TEXT);
        CREATE INDEX idx_sw_addr ON switch_entries(switch_addr);

        CREATE TABLE func_sp_ids (
            func_addr TEXT, sp_id TEXT);
        CREATE INDEX idx_spid_addr ON func_sp_ids(func_addr);

        CREATE TABLE packet_dispatch (
            system TEXT, switch_addr TEXT,
            opcode TEXT, opcode_hex TEXT,
            target_addr TEXT, handler TEXT);
        CREATE INDEX idx_pkt_opcode ON packet_dispatch(opcode);
        CREATE INDEX idx_pkt_handler ON packet_dispatch(handler);

        CREATE TABLE wz_paths (
            ea TEXT, path TEXT);
        CREATE INDEX idx_wz_path ON wz_paths(path);

        CREATE TABLE strings (
            ea TEXT, text TEXT, len INTEGER);
        CREATE INDEX idx_str_text ON strings(text);

        CREATE TABLE string_xrefs (
            string_ea TEXT, func_name TEXT);

        CREATE TABLE string_pool (
            id INTEGER PRIMARY KEY, text TEXT);

        CREATE TABLE imports (
            module TEXT, name TEXT, ea TEXT, ordinal INTEGER);

        CREATE TABLE structs (
            name TEXT PRIMARY KEY, size INTEGER);

        CREATE TABLE struct_members (
            struct_name TEXT, offset INTEGER, size INTEGER,
            type TEXT, name TEXT);
        CREATE INDEX idx_smem_struct ON struct_members(struct_name);

        CREATE TABLE enums (
            name TEXT PRIMARY KEY, member_count INTEGER);

        CREATE TABLE enum_members (
            enum_name TEXT, name TEXT, value TEXT, hex TEXT);
        CREATE INDEX idx_emem_enum ON enum_members(enum_name);

        CREATE TABLE vtables (
            ea TEXT PRIMARY KEY, name TEXT, rtti TEXT, entry_count INTEGER);

        CREATE TABLE vtable_entries (
            vtable_ea TEXT, idx INTEGER, entry_ea TEXT, name TEXT);
        CREATE INDEX idx_vt_ea ON vtable_entries(vtable_ea);

        CREATE TABLE func_named_calls (
            func_addr TEXT, callee_name TEXT);
        CREATE INDEX idx_nc_addr ON func_named_calls(func_addr);
        CREATE INDEX idx_nc_callee ON func_named_calls(callee_name);

        CREATE TABLE func_top_constants (
            func_addr TEXT, val TEXT, hex TEXT, count INTEGER);
        CREATE INDEX idx_tc_addr ON func_top_constants(func_addr);

        CREATE TABLE data_xrefs (
            data_ea TEXT, data_name TEXT,
            func_addr TEXT, func_name TEXT, xref_type INTEGER);
        CREATE INDEX idx_dxref_data ON data_xrefs(data_ea);
        CREATE INDEX idx_dxref_func ON data_xrefs(func_addr);

        CREATE TABLE class_hierarchy (
            class_name TEXT, parent_name TEXT, depth INTEGER);
        CREATE INDEX idx_ch_class ON class_hierarchy(class_name);
        CREATE INDEX idx_ch_parent ON class_hierarchy(parent_name);

        CREATE TABLE crypto_constants (
            name TEXT, ea TEXT, size INTEGER, hex_bytes TEXT, note TEXT);

        CREATE TABLE pe_info (
            key TEXT, value TEXT);

        CREATE TABLE data_symbols (
            ea TEXT PRIMARY KEY, name TEXT, size INTEGER, type TEXT);
        CREATE INDEX idx_ds_name ON data_symbols(name);
    """)

    # ── symbols ────────────────────────────────────────────────────────────────
    cur.executemany("INSERT INTO symbols VALUES (?,?,?,?)",
        [(s["ea"], s["name"], s["raw"], s["kind"]) for s in symbols])

    # ── functions (from all analyzed systems) ─────────────────────────────────
    seen_fn = set()
    for sys in systems:
        if not sys: continue
        sname = sys.get("name", "")
        for ea_key, fn in sys["functions"].items():
            ea_str = hex(ea_key) if isinstance(ea_key, int) else ea_key
            if ea_str in seen_fn: continue
            seen_fn.add(ea_str)
            is_h = 1 if (fn["decode_seq"] or fn["encode_seq"]) else 0
            cur.execute("INSERT INTO functions VALUES (?,?,?,?,?,?,?,?,?)",
                (ea_str, fn["name"], fn["size"], fn["proto"], sname,
                 fn.get("send_op"),
                 " ".join(fn["decode_seq"]) if fn["decode_seq"] else None,
                 " ".join(fn["encode_seq"]) if fn["encode_seq"] else None,
                 is_h))
            for path in fn["wz"]:
                cur.execute("INSERT INTO func_wz VALUES (?,?)", (ea_str, path))
            for s in fn.get("sp_strings", []):
                cur.execute("INSERT INTO func_strings VALUES (?,?)", (ea_str, s))
            for caller in fn.get("callers", []):
                cur.execute("INSERT INTO func_callers VALUES (?,?)", (ea_str, caller))
            for i, field in enumerate(fn["decode_seq"]):
                cur.execute("INSERT INTO func_decode_seq VALUES (?,?,?)", (ea_str, i, field))
            for i, field in enumerate(fn["encode_seq"]):
                cur.execute("INSERT INTO func_encode_seq VALUES (?,?,?)", (ea_str, i, field))
            # disassembly
            for i, line in enumerate(fn.get("disasm", [])):
                cur.execute("INSERT INTO func_disasm VALUES (?,?,?)", (ea_str, i, line))
            # pseudocode (Hex-Rays)
            for i, line in enumerate(fn.get("pseudocode", [])):
                cur.execute("INSERT INTO func_pseudocode VALUES (?,?,?)", (ea_str, i, line))
            # IDA comments
            cmts = fn.get("comments", {})
            if cmts.get("func"):
                cur.execute("INSERT INTO func_comments VALUES (?,?,?,?)",
                    (ea_str, "func", None, cmts["func"]))
            if cmts.get("func_repeatable"):
                cur.execute("INSERT INTO func_comments VALUES (?,?,?,?)",
                    (ea_str, "rep", None, cmts["func_repeatable"]))
            for insn_addr, txt in cmts.get("inline", {}).items():
                cur.execute("INSERT INTO func_comments VALUES (?,?,?,?)",
                    (ea_str, "inline", insn_addr, txt))
            # stack frame
            for mb in fn.get("frame", []):
                cur.execute("INSERT INTO func_frame VALUES (?,?,?,?,?)",
                    (ea_str, mb["offset"], mb["size"], mb["type"], mb["name"]))
            # string pool IDs
            for sp_id in fn.get("sp_ids", []):
                cur.execute("INSERT INTO func_sp_ids VALUES (?,?)", (ea_str, sp_id))
            # named calls (full call graph)
            for callee in fn.get("named_calls", []):
                cur.execute("INSERT INTO func_named_calls VALUES (?,?)", (ea_str, callee))
            # top constants
            for c in fn.get("top_constants", []):
                cur.execute("INSERT INTO func_top_constants VALUES (?,?,?,?)",
                    (ea_str, str(c["val"]), c["hex"], c["count"]))
            # switches (raw + dispatch)
            for sw in fn.get("switches", []):
                cur.execute("INSERT INTO func_switches VALUES (?,?,?)",
                    (ea_str, sw["addr"], sw["case_count"]))
                for e in sw.get("entries", []):
                    cur.execute("INSERT INTO switch_entries VALUES (?,?,?,?,?)",
                        (sw["addr"], str(e["value"]), e["hex"], e["target"], e["handler"]))
                    cur.execute("INSERT INTO packet_dispatch VALUES (?,?,?,?,?,?)",
                        (sname, sw["addr"], str(e["value"]), e["hex"],
                         e["target"], e["handler"]))

    # ── wz_paths ──────────────────────────────────────────────────────────────
    cur.executemany("INSERT INTO wz_paths VALUES (?,?)",
        [(hex(ea) if isinstance(ea, int) else ea, path)
         for ea, path in all_wz.items()])

    # ── strings ───────────────────────────────────────────────────────────────
    for st in all_strings:
        cur.execute("INSERT INTO strings VALUES (?,?,?)",
            (st["ea"], st["text"], st["len"]))
        for fn_name in st.get("xrefs", []):
            cur.execute("INSERT INTO string_xrefs VALUES (?,?)", (st["ea"], fn_name))

    # ── string_pool ───────────────────────────────────────────────────────────
    cur.executemany("INSERT INTO string_pool VALUES (?,?)",
        [(k, v) for k, v in string_pool.items()])

    # ── imports ───────────────────────────────────────────────────────────────
    cur.executemany("INSERT INTO imports VALUES (?,?,?,?)",
        [(i["module"], i["name"], i["ea"], i["ordinal"]) for i in imports])

    # ── structs + members ─────────────────────────────────────────────────────
    for st in structs:
        cur.execute("INSERT INTO structs VALUES (?,?)", (st["name"], st["size"]))
        for mb in st["members"]:
            cur.execute("INSERT INTO struct_members VALUES (?,?,?,?,?)",
                (st["name"], mb["offset"], mb["size"], mb["type"], mb["name"]))

    # ── enums + members ───────────────────────────────────────────────────────
    for en in enums:
        cur.execute("INSERT INTO enums VALUES (?,?)", (en["name"], en["member_count"]))
        for mb in en["members"]:
            cur.execute("INSERT INTO enum_members VALUES (?,?,?,?)",
                (en["name"], mb["name"], str(mb["value"]), mb["hex"]))

    # ── vtables + entries ─────────────────────────────────────────────────────
    for vt in vtables:
        cur.execute("INSERT INTO vtables VALUES (?,?,?,?)",
            (vt["ea"], vt["name"], vt.get("rtti", ""), vt["entry_count"]))
        for i, e in enumerate(vt["entries"]):
            cur.execute("INSERT INTO vtable_entries VALUES (?,?,?,?)",
                (vt["ea"], i, e["ea"], e["name"]))

    # ── data_xrefs ────────────────────────────────────────────────────────────
    cur.executemany("INSERT INTO data_xrefs VALUES (?,?,?,?,?)",
        [(x["data_ea"], x["data_name"], x["func_addr"], x["func_name"], x["xref_type"])
         for x in data_xrefs])

    # ── class_hierarchy ───────────────────────────────────────────────────────
    cur.executemany("INSERT INTO class_hierarchy VALUES (?,?,?)",
        [(c["class_name"], c["parent_name"], c["depth"]) for c in class_hierarchy])

    # ── crypto_constants ──────────────────────────────────────────────────────
    cur.executemany("INSERT INTO crypto_constants VALUES (?,?,?,?,?)",
        [(c["name"], c["ea"], c["size"], c["hex_bytes"], c["note"])
         for c in crypto_constants])

    # ── pe_info ───────────────────────────────────────────────────────────────
    cur.executemany("INSERT INTO pe_info VALUES (?,?)", pe_info)

    # ── data_symbols (extended) ───────────────────────────────────────────────
    cur.executemany("INSERT OR IGNORE INTO data_symbols VALUES (?,?,?,?)",
        [(d["ea"], d["name"], d["size"], d["type"]) for d in named_data_details])

    con.commit()
    con.close()
    print(f"[make_dump] → {OUT_DB}")


def _filter_systems(systems, category_name):
    """Return systems list filtered to only those belonging to the given category."""
    cat_names = SYSTEM_CATEGORIES.get(category_name, set())
    return [s for s in systems if s and s["name"] in cat_names]


def _write_split(category, systems_subset, all_wz, imports, structs, enums,
                 vtables, symbols, all_strings, string_pool):
    """Write txt+json for one category slice."""
    txt_path, json_path = SPLIT_FILES[category]
    print(f"[make_dump] Writing {category} split…")
    # packets category: global tables only (no systems breakdown)
    if category == "packets":
        sys_for_txt = systems_subset  # carries packet sections
    else:
        sys_for_txt = systems_subset
    # symbols category: empty systems, full global tables
    if category == "symbols":
        sys_for_txt = []

    txt = fmt_txt(all_wz, sys_for_txt, imports, structs, enums, vtables,
                  symbols if category == "symbols" else [],
                  all_strings if category == "symbols" else [],
                  string_pool if category == "symbols" else {})
    js  = fmt_json(all_wz if category in ("symbols", "packets") else {},
                   sys_for_txt, imports if category == "symbols" else [],
                   structs if category == "symbols" else [],
                   enums   if category == "symbols" else [],
                   vtables if category == "symbols" else [],
                   symbols if category == "symbols" else [],
                   all_strings if category == "symbols" else [],
                   string_pool if category == "symbols" else {})
    with open(txt_path,  "w", encoding="utf-8") as f: f.write(txt)
    with open(json_path, "w", encoding="utf-8") as f: f.write(js)
    print(f"[make_dump]   → {txt_path}")
    print(f"[make_dump]   → {json_path}")


def main():
    print("[make_dump] Starting v95 analysis…")

    # Resolve decode/onpacket/stringpool addresses from the v95 map file
    _resolve_from_map()

    # Caller map (built once — avoids O(n²) xref scans per function)
    _build_caller_map()

    # StringPool id → text (resolved before analysis so func records can use it)
    global _STRING_POOL
    print("[make_dump] Resolving StringPool…")
    _STRING_POOL = resolve_string_pool()
    print(f"[make_dump] StringPool entries: {len(_STRING_POOL)}")

    # Global WZ paths
    print("[make_dump] Scanning WZ asset paths…")
    all_wz = collect_all_wz_paths()
    print(f"[make_dump] Found {len(all_wz)} WZ paths")

    # UI systems / full binary
    results = []
    if FULL_BINARY:
        min_ea = idc.get_inf_attr(idc.INF_MIN_EA)
        max_ea = idc.get_inf_attr(idc.INF_MAX_EA)
        print(f"[make_dump] FULL BINARY mode: {hex(min_ea)}–{hex(max_ea)}")
        results.append(analyze_system("ALL", min_ea, max_ea))
    else:
        for sys_name, start, end in SYSTEMS:
            results.append(analyze_system(sys_name, start, end))

    # Global tables
    print("[make_dump] Collecting imports…")
    imports = collect_imports()
    print(f"[make_dump] {len(imports)} imports")

    print("[make_dump] Collecting structs…")
    structs = collect_structs()
    print(f"[make_dump] {len(structs)} structs")

    print("[make_dump] Collecting enums…")
    enums = collect_enums()
    print(f"[make_dump] {len(enums)} enums")

    print("[make_dump] Collecting vtables…")
    vtables = collect_vtables()
    print(f"[make_dump] {len(vtables)} vtables")

    print("[make_dump] Collecting named symbols…")
    symbols = collect_named_symbols()
    print(f"[make_dump] {len(symbols)} named symbols")

    print("[make_dump] Collecting all strings…")
    all_strings = collect_all_strings()
    print(f"[make_dump] {len(all_strings)} strings")

    # Write TXT
    print("[make_dump] Writing TXT…")
    txt = fmt_txt(all_wz, results, imports, structs, enums, vtables, symbols,
                  all_strings, _STRING_POOL)
    with open(OUT_TXT, "w", encoding="utf-8") as f:
        f.write(txt)
    print(f"[make_dump] → {OUT_TXT}")

    # Write JSON
    print("[make_dump] Writing JSON…")
    js = fmt_json(all_wz, results, imports, structs, enums, vtables, symbols,
                  all_strings, _STRING_POOL)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        f.write(js)
    print(f"[make_dump] → {OUT_JSON}")

    # Extra collectors for full reconstruction
    print("[make_dump] Collecting data xrefs…")
    data_xrefs = collect_data_xrefs(symbols)
    print(f"[make_dump] {len(data_xrefs)} data xrefs")

    print("[make_dump] Collecting class hierarchy (RTTI)…")
    class_hier = collect_class_hierarchy()
    print(f"[make_dump] {len(class_hier)} class relationships")

    print("[make_dump] Collecting crypto constants…")
    crypto = collect_crypto_constants()
    print(f"[make_dump] {len(crypto)} crypto constants")

    print("[make_dump] Collecting PE info…")
    pe = collect_pe_info()

    print("[make_dump] Collecting named data details…")
    data_details = collect_named_data_details(symbols)
    print(f"[make_dump] {len(data_details)} data symbols")

    # Write SQLite DB
    print("[make_dump] Writing SQLite DB…")
    write_sqlite_db(all_wz, results, imports, structs, enums, vtables,
                    symbols, all_strings, _STRING_POOL,
                    data_xrefs, class_hier, crypto, pe, data_details)

    # Split output files
    if SPLIT_OUTPUT:
        _write_split("symbols", [], all_wz, imports, structs, enums,
                     vtables, symbols, all_strings, _STRING_POOL)
        for cat in ("login", "map", "ui"):
            subset = _filter_systems(results, cat)
            _write_split(cat, subset, {}, [], [], [], [], [], [], {})
        # packets: all systems (packet sections only — reader uses sections 1/1b/1c/1d)
        _write_split("packets", [s for s in results if s], {}, [], [], [], [], [], [], {})

    print("[make_dump] Done.")
    idaapi.msg("[make_dump] Done — v95 dumps written to IDB directory\n")


if __name__ == "__main__":
    main()
