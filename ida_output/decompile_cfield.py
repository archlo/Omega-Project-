import idaapi
import idc

def decompile_and_print(addr):
    cfunc = idaapi.decompile(addr)
    if cfunc is None:
        return "Decompilation failed at %x" % addr
    return str(cfunc)

# Decompile CField::Update (0x546580)
print("=== CField::Update (0x546580) ===")
print(decompile_and_print(0x546580))
