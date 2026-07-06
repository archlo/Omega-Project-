import idaapi, idautils, idc, json
out = {}
results = []
for ea in idautils.Functions():
    nm = idc.get_func_name(ea) or ""
    demangled = idc.demangle_name(nm, idc.get_inf_attr(idc.INF_SHORT_DN)) or nm
    if 'CUISkillBook' in demangled:
        results.append({'addr': hex(ea), 'name': demangled})
out['skillbook_methods'] = results
with open('tools/_out.json', 'w') as f:
    json.dump(out, f, indent=2)
idc.qexit(0)
