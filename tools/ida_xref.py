import idaapi, idautils, idc, json

out = {}

# Find DoActiveMacro address
addr = idc.BADADDR
for ea in idautils.Functions():
    nm = idc.get_func_name(ea) or ""
    demangled = idc.demangle_name(nm, idc.get_inf_attr(idc.INF_SHORT_DN)) or nm
    if 'DoActiveMacro' in demangled and 'CMacroSysMan' in demangled:
        addr = ea
        break

callers = []
if addr != idc.BADADDR:
    for xref in idautils.CodeRefsTo(addr, 0):
        func = idaapi.get_func(xref)
        if func:
            fname = idc.get_func_name(func.start_ea) or ""
            demangled = idc.demangle_name(fname, idc.get_inf_attr(idc.INF_SHORT_DN)) or fname
            callers.append({'caller': demangled, 'caller_addr': hex(func.start_ea), 'xref': hex(xref)})
    out['DoActiveMacro_addr'] = hex(addr)
    out['callers'] = callers
else:
    out['error'] = 'DoActiveMacro not found'

# Also find MACROSYSDATA::Encode
for ea in idautils.Functions():
    nm = idc.get_func_name(ea) or ""
    demangled = idc.demangle_name(nm, idc.get_inf_attr(idc.INF_SHORT_DN)) or nm
    if 'MACROSYSDATA' in demangled and 'Encode' in demangled:
        out['MACROSYSDATA_Encode'] = hex(ea)
        break

with open('tools/_out.json', 'w') as f:
    json.dump(out, f, indent=2)
idc.qexit(0)
