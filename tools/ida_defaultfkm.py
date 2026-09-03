import idaapi, idautils, idc, json

# Get the s_aDefaultFKM data (the default key map static)
target = None
for name, addr in idautils.Names():
    if not isinstance(name, str):
        continue
    if 's_aDefaultFKM' in name or 'DefaultFKM' in name:
        target = addr
        break

# Alternatively look at the address from the CFuncKeyMappedMan::DefaultFuncKeyMap function
# The structure is FUNCKEY_MAPPED: {nType:int, nID:int} for each of 89 keys
out = {'s_aDefaultFKM': None}

if target is not None:
    out['s_aDefaultFKM'] = hex(target)
    # Read 89 * 8 bytes = 712 bytes (or 89 * 2 dwords)
    entries = []
    for i in range(89):
        nType = idc.get_wide_dword(target + i * 8)
        nID = idc.get_wide_dword(target + i * 8 + 4)
        entries.append({'idx': i, 'nType': nType, 'nID': nID})
    out['entries'] = entries
else:
    # Try to get from the function address
    # Find s_aDefaultFKM by looking at the disasm of DefaultFuncKeyMap
    fn = idc.get_name_ea_simple("?DefaultFuncKeyMap@CFuncKeyMappedMan@@QAEXXZ")
    if fn != idc.BADADDR:
        # Read first DWORD at start of function area
        out['fn_addr'] = hex(fn)

with open('tools/_out.json', 'w') as f:
    json.dump(out, f, indent=2)
idc.qexit(0)
