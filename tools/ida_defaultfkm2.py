import idaapi, idautils, idc, json

# Get the s_aDefaultFKM - it's the source of qmemcpy in DefaultFuncKeyMap
# Let's look at the disasm to find the address of s_aDefaultFKM
fn_addr = 0x568600

lines = []
cur = fn_addr
end = fn_addr + 0x50
while cur < end:
    lines.append(idc.generate_disasm_line(cur, 0))
    cur = idc.next_head(cur, end)

out = {'disasm': lines}

# Also try reading directly: the qmemcpy's source arg
# The call is: qmemcpy(this->m_aFuncKeyMapped, s_aDefaultFKM, 0x1BCu)
# s_aDefaultFKM should be in the data segment - look for it via xrefs
for xref in idautils.DataRefsFrom(fn_addr):
    out['data_xref'] = hex(xref)
    break

# Try to find the data label - the disasm should show "offset s_aDefaultFKM"
with open('tools/_out.json', 'w') as f:
    json.dump(out, f, indent=2)
idc.qexit(0)
