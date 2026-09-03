import idaapi, idautils, idc, json

out = {}

# All TextAnalyzer functions
results = []
for name, addr in idautils.Names():
    if 'TextAnalyzer' in name or 'Phrase' in name:
        results.append({'name': name, 'addr': hex(addr)})
out['text_analyzer_names'] = results

with open('tools/_out.json', 'w') as f:
    json.dump(out, f, indent=2)
