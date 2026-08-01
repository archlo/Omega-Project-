import json
files = [
    "find_SetCarryItemEffect.json",
    "find_ShowAffectedSkillAni.json",
    "find_UpdateAffectedSkillList.json"
]
for f in files:
    path = "C:/Users/jorge/OneDrive/Desktop/ts/ida_output/" + f
    with open(path) as fh:
        data = json.load(fh)
    for entry in data:
        q = entry.get("query", "?")
        matches = entry.get("matches", [])
        if matches:
            for m in matches:
                addr = m.get("address", "?")
                name = m.get("name", "?")[:100]
                print(f"{q}: addr={addr} name={name}")
        else:
            print(f"{q}: NO MATCHES")
