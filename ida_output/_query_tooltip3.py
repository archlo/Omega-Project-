import json, sys

path = "C:/Users/jorge/OneDrive/Desktop/ts/ida_output/all_cui_funcs.json"
with open(path, 'r', encoding='utf-8') as f:
    raw = json.load(f)

all_funcs = []
for chunk in raw:
    if isinstance(chunk, dict) and 'data' in chunk:
        all_funcs.extend(chunk['data'])
    elif isinstance(chunk, dict) and 'name' in chunk:
        all_funcs.append(chunk)

# Search patterns
patterns = {
    'CUIToolTip': lambda n: 'CUIToolTip' in n,
    'CUIItemTip': lambda n: 'CUIItemTip' in n or 'ItemTip' in n,
    'CUIEquipTip': lambda n: 'CUIEquipTip' in n or 'EquipTip' in n,
    'ToolTip': lambda n: ('ToolTip' in n or 'Tooltip' in n or 'tooltip' in n) and 'CUIToolTip' not in n,
}

for label, matcher in patterns.items():
    matches = [f for f in all_funcs if matcher(f.get('name', ''))]
    print(f"\n=== {label} ({len(matches)} matches) ===")
    for f in matches:
        addr = f.get('addr', '?')
        size = f.get('size', '?')
        name = f.get('name', '?')
        # Demangle if possible
        print(f"  {addr:>12s}  size={size:>6s}  {name}")
