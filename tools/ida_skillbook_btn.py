import idaapi, idautils, idc, json
out = {}

# CUISkillBook::OnButtonClicked
for ea in idautils.Functions():
    nm = idc.get_func_name(ea) or ""
    demangled = idc.demangle_name(nm, idc.get_inf_attr(idc.INF_SHORT_DN)) or nm
    if 'CUISkillBook' in demangled and 'OnButtonClicked' in demangled:
        lines = []
        curr = ea
        for _ in range(120):
            line = idc.GetDisasm(curr)
            lines.append(f"{hex(curr)}: {line}")
            curr = idc.next_head(curr)
            if curr == idc.BADADDR: break
        out['skillbook_btn'] = {'addr': hex(ea), 'disasm': lines}
        break

with open('tools/_out.json', 'w') as f:
    json.dump(out, f, indent=2)
idc.qexit(0)
