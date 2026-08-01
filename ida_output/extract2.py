import json
import os

OUTDIR = "C:/Users/jorge/OneDrive/Desktop/ts/ida_output"

TARGETS = [
    ("cuser_SetCarryItemEffect_raw2.json", "cuser_SetCarryItemEffect_clean.txt", "CUser::SetCarryItemEffect"),
    ("cuser_ShowAffectedSkillAni_raw2.json", "cuser_ShowAffectedSkillAni_clean.txt", "CUser::ShowAffectedSkillAni"),
    ("cuser_UpdateAffectedSkillList_raw2.json", "cuser_UpdateAffectedSkillList_clean.txt", "CUser::UpdateAffectedSkillList"),
]

for raw_file, clean_file, func_name in TARGETS:
    raw_path = os.path.join(OUTDIR, raw_file)
    clean_path = os.path.join(OUTDIR, clean_file)
    
    with open(raw_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    pseudocode = None
    addr = None
    name = None
    
    for entry in data:
        for match in entry.get("matches", []):
            if "pseudocode" in match and match["pseudocode"]:
                pseudocode = match["pseudocode"]
                addr = match.get("address", "")
                name = match.get("name", func_name)
                break
        if pseudocode:
            break
    
    if pseudocode:
        with open(clean_path, "w", encoding="utf-8") as f:
            f.write(f"// {name} @ {addr}\n")
            f.write(f"// Decompiled via IDA headless\n\n")
            f.write(pseudocode)
        print(f"OK: {clean_file} ({len(pseudocode)} chars) - {name} @ {addr}")
    else:
        print(f"FAILED: {clean_file} - no pseudocode")
