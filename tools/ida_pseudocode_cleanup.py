# -*- coding: utf-8 -*-
"""Generic Hex-Rays pseudocode cleanup for an entire IDB.

This script only changes IDA analysis metadata: local variable names, function
comments, and instruction comments. It never patches the input binary.

Run from IDA's Script file command. By default it processes the current
function. Set PROCESS_ALL = True to process every decompilable function.
"""

import re

import idaapi
import ida_funcs
import ida_hexrays
import ida_kernwin
import ida_name
import idc
import idautils


PROCESS_ALL = False
RENAME_LOCALS = True
ADD_CALL_COMMENTS = True
ADD_FUNCTION_SUMMARY = True


def log(message):
    print("[hex-cleanup] " + message)


def current_function():
    func = ida_funcs.get_func(ida_kernwin.get_screen_ea())
    if func is None:
        log("The cursor is not inside a function")
    return func


def function_name(func):
    return ida_name.get_name(func.start_ea) or "sub_%X" % func.start_ea


def decompile(func):
    try:
        return ida_hexrays.decompile(func.start_ea)
    except Exception as exc:
        log("Cannot decompile %s: %s" % (function_name(func), exc))
        return None


def local_by_name(cfunc, name):
    for local in cfunc.lvars:
        if local.name == name:
            return local
    return None


def rename_local(cfunc, old_name, new_name):
    local = local_by_name(cfunc, old_name)
    if local is None or not re.match(r"^v\d+$", old_name):
        return False
    try:
        local.name = new_name
        return True
    except Exception:
        return False


def rename_obvious_locals(cfunc):
    """Rename high-confidence compiler temporaries without guessing fields."""
    text = str(cfunc)
    renamed = 0

    # Common Hex-Rays induction-variable forms:
    #   v17 = stride * (DWORD)v13 + base;
    #   v18 = ...;
    # The names describe the role, not an unverified class member.
    for match in re.finditer(
        r"\b(v\d+)\s*=\s*(\d+)\s*\*\s*\(?DWORD\)?\s*(v\d+)\s*\+\s*(\d+)",
        text,
    ):
        offset_var, stride, index_var, base = match.groups()
        if rename_local(cfunc, index_var, "index"):
            renamed += 1
        if rename_local(cfunc, offset_var, "elementOffset"):
            renamed += 1
        log("Detected indexed access: stride=%s bytes=%s base=%s" %
            (int(stride) * 4, base, index_var))

    # Rename obvious loop counters only when Hex-Rays has a single candidate.
    counters = re.findall(r"\b(v\d+)\s*\+\+|\+\+\s*(v\d+)", text)
    counter_names = {left or right for left, right in counters}
    if len(counter_names) == 1:
        counter = next(iter(counter_names))
        if rename_local(cfunc, counter, "index"):
            renamed += 1

    # Generic roles that are safe when the variable is used as a loop bound.
    for variable in re.findall(r"\b(v\d+)\s*<\s*(?:this->)?m_n[A-Za-z0-9_]+", text):
        if rename_local(cfunc, variable, "count"):
            renamed += 1

    return renamed


def call_comment(name):
    lowered = name.lower()
    rules = (
        ("draw", "Rendering call"),
        ("render", "Rendering call"),
        ("load", "Resource/data loading call"),
        ("decode", "Packet/data decoding call"),
        ("encode", "Packet/data encoding call"),
        ("send", "Outgoing request/packet call"),
        ("play", "Audio/effect playback call"),
        ("getcanvas", "Canvas acquisition call"),
        ("calctextwidth", "Text measurement call"),
    )
    for token, comment in rules:
        if token in lowered:
            return comment
    return None


def annotate_calls(func):
    count = 0
    for ea in idautils.FuncItems(func.start_ea):
        if idc.print_insn_mnem(ea).lower() != "call":
            continue
        target = idc.get_operand_value(ea, 0)
        name = ida_name.get_name(target)
        if not name:
            continue
        comment = call_comment(name)
        if not comment:
            continue
        existing = idc.get_cmt(ea, False) or ""
        if comment not in existing:
            idc.set_cmt(ea, (existing + " | " if existing else "") + comment, False)
            count += 1
    return count


def summarize(cfunc):
    text = str(cfunc)
    patterns = {
        "loops": len(re.findall(r"\bfor\s*\(|\bwhile\s*\(", text)),
        "switches": len(re.findall(r"\bswitch\s*\(", text)),
        "calls": len(re.findall(r"\b[A-Za-z_][A-Za-z0-9_:<>]*\s*\(", text)),
        "array_accesses": len(re.findall(r"\[[^\]]+\]", text)),
    }
    strides = sorted(set(re.findall(r"\b(\d+)\s*\*\s*\(?DWORD\)?\s*v\d+", text)))
    summary = "Hex-Rays cleanup: loops=%d, switches=%d, calls=%d, array-accesses=%d" % (
        patterns["loops"], patterns["switches"], patterns["calls"], patterns["array_accesses"]
    )
    if strides:
        summary += "; detected index multipliers: " + ", ".join(strides)
    return summary


def process(func):
    cfunc = decompile(func)
    if cfunc is None:
        return
    renamed = rename_obvious_locals(cfunc) if RENAME_LOCALS else 0
    annotated = annotate_calls(func) if ADD_CALL_COMMENTS else 0
    if ADD_FUNCTION_SUMMARY:
        old = idc.get_func_cmt(func.start_ea, False) or ""
        marker = "[hex-cleanup]"
        line = marker + " " + summarize(cfunc)
        if marker not in old:
            idc.set_func_cmt(func.start_ea, (old + "\n" if old else "") + line, False)
    try:
        ida_hexrays.mark_cfunc_dirty(func.start_ea, True)
    except Exception:
        pass
    log("%s: renamed=%d, comments=%d" % (function_name(func), renamed, annotated))


def main():
    if not ida_hexrays.init_hexrays_plugin():
        log("Hex-Rays is not available")
        return
    if PROCESS_ALL:
        for ea in idautils.Functions():
            func = ida_funcs.get_func(ea)
            if func:
                process(func)
    else:
        func = current_function()
        if func:
            process(func)
    ida_kernwin.refresh_idaview_anyway()
    log("Done")


if __name__ == "__main__":
    main()
