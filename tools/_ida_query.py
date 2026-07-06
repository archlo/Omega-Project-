import ida_funcs
import ida_hexrays
import idautils
import idaapi
import idc

addrs = [0x8223b0, 0x82a780]

for ea in addrs:
    f = ida_funcs.get_func(ea)
    name = idc.get_func_name(ea)
    print(f"\n=== {hex(ea)} {name} ===")
    if f is None:
        print("no function here")
        continue
    try:
        cf = ida_hexrays.decompile(f)
        print(str(cf))
    except Exception as e:
        print("decompile failed:", e)

idc.qexit(0)
