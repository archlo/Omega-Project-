import idaapi, idautils, idc, json

out = {}

def get_func_disasm_name(name_substr, max_lines=100):
    results = []
    for addr, name in idautils.Names():
        if name_substr in name:
            func = idaapi.get_func(addr)
            if func:
                ea = func.start_ea
                count = 0
                while ea < func.end_ea and count < max_lines:
                    results.append(f"0x{ea:x}: {idc.GetDisasm(ea)}")
                    ea = idc.next_head(ea)
                    count += 1
                return results
    return [f"not found: {name_substr}"]

# CField::OnMobSkillDelay — what does the OG do with mob skill delay?
out["on_mob_skill_delay"] = get_func_disasm_name("OnMobSkillDelay", 120)

# MobLook — does it have a skill-cast state?
mob_look_methods = []
for addr, name in idautils.Names():
    if "CMob" in name and ("Skill" in name or "Cast" in name or "Delay" in name):
        mob_look_methods.append(f"0x{addr:x}: {name}")
out["cmob_skill_methods"] = mob_look_methods[:30]

with open("tools/_out.json", "w") as f:
    json.dump(out, f, indent=2)
