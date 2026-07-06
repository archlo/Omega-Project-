import json, idautils, idc, idaapi
def main():
    args = idc.ARGV
    out_path = args[1]
    addr = int(args[2], 16)
    callers = []
    for xref in idautils.CodeRefsTo(addr, 0):
        f = idaapi.get_func(xref)
        name = idc.get_func_name(f.start_ea) if f else hex(xref)
        demangled = idc.demangle_name(name, idc.get_inf_attr(idc.INF_SHORT_DN)) or name
        callers.append({"caller": demangled, "addr": hex(f.start_ea if f else xref), "call_site": hex(xref)})
    with open(out_path, "w") as fh:
        json.dump(callers, fh, indent=2)
    print("wrote", out_path)
    idc.qexit(0)
main()
