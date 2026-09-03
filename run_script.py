import idaapi, idautils, idc, json, os

out = {}

def get_func_disasm_at(ea, max_lines=80):
    results = []
    func = idaapi.get_func(ea)
    if not func:
        return [f"no func at 0x{ea:x}"]
    cur = func.start_ea
    count = 0
    while cur < func.end_ea and count < max_lines:
        results.append(f"0x{cur:x}: {idc.GetDisasm(cur)}")
        cur = idc.next_head(cur)
        count += 1
    return results

# OnGradeChange - what packet does it send?
out["OnGradeChange"] = get_func_disasm_at(0x8ba5b0, 80)

# OnChangeMaster
out["OnChangeMaster"] = get_func_disasm_at(0x8ba670, 80)

# OnWithdraw
out["OnWithdraw"] = get_func_disasm_at(0x8bbcc0, 80)

# OnKick
out["OnKick"] = get_func_disasm_at(0x8bf710, 80)

# OnInvite
out["OnInvite"] = get_func_disasm_at(0x8cc9c0, 60)

# OnSetNotice
out["OnSetNotice"] = get_func_disasm_at(0x8cccf0, 60)

out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_out.json")
with open(out_path, "w") as f:
    json.dump(out, f, indent=2)
