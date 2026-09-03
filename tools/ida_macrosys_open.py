import idaapi, idautils, idc, json

out = {}

# SetShow at 0x84c270 - check direct xrefs
target = 0x84c270
xrefs = []
for xref in idautils.CodeRefsTo(target, 0):
    func = idaapi.get_func(xref)
    if func:
        fname = idc.get_func_name(func.start_ea) or ""
        caller_name = idc.demangle_name(fname, idc.get_inf_attr(idc.INF_SHORT_DN)) or fname
        xrefs.append({'caller': caller_name, 'addr': hex(func.start_ea), 'xref': hex(xref)})
out['SetShow_xrefs'] = xrefs

# CUISkillBook OnButtonClicked
for ea in idautils.Functions():
    nm = idc.get_func_name(ea) or ""
    demangled = idc.demangle_name(nm, idc.get_inf_attr(idc.INF_SHORT_DN)) or nm
    if 'CUISkillBook' in demangled and 'OnButtonClicked' in demangled:
        # Get first 200 bytes of disassembly lines
        lines = []
        curr = ea
        for _ in range(60):
            line = idc.GetDisasm(curr)
            lines.append(f"{hex(curr)}: {line}")
            curr = idc.next_head(curr)
            if curr == idc.BADADDR:
                break
        out['skillbook_onbuttonclicked'] = {'addr': hex(ea), 'name': demangled, 'disasm': lines}

# CUIKeyConfig OnButtonClicked
for ea in idautils.Functions():
    nm = idc.get_func_name(ea) or ""
    demangled = idc.demangle_name(nm, idc.get_inf_attr(idc.INF_SHORT_DN)) or nm
    if 'CUIKeyConfig' in demangled and 'OnButtonClicked' in demangled:
        lines = []
        curr = ea
        for _ in range(40):
            line = idc.GetDisasm(curr)
            lines.append(f"{hex(curr)}: {line}")
            curr = idc.next_head(curr)
            if curr == idc.BADADDR:
                break
        out['keyconfig_onbuttonclicked'] = {'addr': hex(ea), 'name': demangled, 'disasm': lines}

with open('tools/_out.json', 'w') as f:
    json.dump(out, f, indent=2)
idc.qexit(0)
