#!/usr/bin/env python3
"""Extract pseudocode from ida_dump JSON and write clean files."""
import json
import os
import sys

OUTDIR = os.path.dirname(os.path.abspath(__file__))

TARGETS = [
    ("cuser_SetCarryItemEffect_raw.json", "cuser_SetCarryItemEffect_clean.txt", "CUser::SetCarryItemEffect"),
    ("cuser_ShowAffectedSkillAni_raw.json", "cuser_ShowAffectedSkillAni_clean.txt", "CUser::ShowAffectedSkillAni"),
    ("cuser_Update_raw.json", "cuser_Update_clean.txt", "CUser::Update"),
    ("cuser_UpdateAffectedSkillList_raw.json", "cuser_UpdateAffectedSkillList_clean.txt", "CUser::UpdateAffectedSkillList"),
]

for raw_file, clean_file, func_name in TARGETS:
    raw_path = os.path.join(OUTDIR, raw_file)
    clean_path = os.path.join(OUTDIR, clean_file)
    
    if not os.path.exists(raw_path):
        print(f"SKIP: {raw_file} not found")
        continue
    
    with open(raw_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # Extract pseudocode from first match
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
        print(f"OK: {clean_file} ({len(pseudocode)} chars)")
    else:
        # Try disasm as fallback
        for entry in data:
            for match in entry.get("matches", []):
                if "disasm" in match and match["disasm"]:
                    with open(clean_path, "w", encoding="utf-8") as f:
                        f.write(f"// {func_name} - DISASM ONLY (decompile failed)\n\n")
                        f.write(match["disasm"])
                    print(f"DISASM ONLY: {clean_file}")
                    break
            else:
                continue
            break
        else:
            print(f"FAILED: {clean_file} - no pseudocode or disasm found")
