import idaapi, idautils, idc, json

# Get s_aDefaultFKM by scanning for the offset in DefaultFuncKeyMap
fn_addr = 0x568600
out = {'entries': []}

# Find the data xref from the function
for cur_ea in range(fn_addr, fn_addr + 0x20):
    for xref in idautils.DataRefsFrom(cur_ea):
        name = idc.get_name(xref) or ''
        out['potential_src'] = {'addr': hex(xref), 'name': name}
        # Try reading FUNCKEY_MAPPED entries: {nType:4, nID:4} * 89 slots? 
        # 0x1BC / 4 = 111 dwords = ~55 FUNCKEY_MAPPED entries of {type,id}
        # Actually FUNCKEY_MAPPED has more fields. Let me check:
        # 0x1BC bytes = 444 bytes. If each is 8 bytes: 55.5 entries. 
        # If m_aFuncKeyMapped is [89] and each is 5 bytes: 445 bytes ≈ 0x1BC
        # Let's try {nType:1, nID:4} = 5 bytes each, 89 entries = 445
        entries = []
        for i in range(89):
            offset = xref + i * 5
            nType = idc.get_wide_byte(offset)
            nID = idc.get_wide_dword(offset + 1)
            entries.append({'idx': i, 'nType': nType, 'nID': nID})
        out['entries'] = entries
        break
    if out['entries']:
        break

with open('tools/_out.json', 'w') as f:
    json.dump(out, f, indent=2)
idc.qexit(0)
