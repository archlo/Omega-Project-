import idaapi, idautils, idc, json
out = {}
# Search for any "Skill" related UI classes
results = []
for ea in idautils.Functions():
    nm = idc.get_func_name(ea) or ""
    demangled = idc.demangle_name(nm, idc.get_inf_attr(idc.INF_SHORT_DN)) or nm
    if ('CUI' in demangled or 'cui' in demangled.lower()) and ('kill' in demangled or 'macro' in demangled.lower()):
        results.append({'addr': hex(ea), 'name': demangled})
out['skill_ui_methods'] = results
with open('tools/_out.json', 'w') as f:
    json.dump(out, f, indent=2)
idc.qexit(0)
