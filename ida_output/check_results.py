import json
files = [
    "cuser_SetCarryItemEffect_raw.json",
    "cuser_ShowAffectedSkillAni_raw.json",
    "cuser_Update_raw.json",
    "cuser_UpdateAffectedSkillList_raw.json"
]
for f in files:
    path = "C:/Users/jorge/OneDrive/Desktop/ts/ida_output/" + f
    with open(path) as fh:
        data = json.load(fh)
    for entry in data:
        q = entry.get("query", "?")
        matches = entry.get("matches", [])
        if matches:
            m = matches[0]
            addr = m.get("address", "?")
            name = m.get("name", "?")[:100]
            print(f"{f}: query={q} addr={addr} name={name}")
        else:
            print(f"{f}: query={q} NO MATCHES")
