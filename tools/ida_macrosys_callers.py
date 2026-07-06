import idaapi, idautils, idc, json

out = {}

# Find CUIMacroSys::SetShow callers
callers = []
for ea in idautils.Functions():
    nm = idc.get_func_name(ea) or ""
    demangled = idc.demangle_name(nm, idc.get_inf_attr(idc.INF_SHORT_DN)) or nm
    if 'CUIMacroSys' in demangled and 'SetShow' in demangled:
        for xref in idautils.CodeRefsTo(ea, 0):
            func = idaapi.get_func(xref)
            if func:
                fname = idc.get_func_name(func.start_ea) or ""
                caller_name = idc.demangle_name(fname, idc.get_inf_attr(idc.INF_SHORT_DN)) or fname
                callers.append({'caller': caller_name, 'addr': hex(func.start_ea), 'xref': hex(xref)})
        out['SetShow_callers'] = callers
        break

# Also find CUIMacroSys methods
methods = []
for ea in idautils.Functions():
    nm = idc.get_func_name(ea) or ""
    demangled = idc.demangle_name(nm, idc.get_inf_attr(idc.INF_SHORT_DN)) or nm
    if 'CUIMacroSys' in demangled or 'CUIMacroSysEx' in demangled:
        methods.append({'addr': hex(ea), 'name': demangled})
out['macrosys_methods'] = methods

with open('tools/_out.json', 'w') as f:
    json.dump(out, f, indent=2)
idc.qexit(0)
