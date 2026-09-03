import idaapi, idautils, idc, json

out = {}

# Find CTextAnalyzer::GetPhraseType - we need its address
# and then find SeparateLineText
targets = [
    "CTextAnalyzer::GetPhraseType",
    "CTextAnalyzer::SeparateLineText",
    "CTextAnalyzer::GetPhrase_Sharp",
    "CTextAnalyzer::GetParameterNo",
]

addrs = {}
for name in targets:
    addr = idc.get_name_ea_simple(name)
    if addr != idc.BADADDR:
        addrs[name] = hex(addr)

out['addrs'] = addrs

# Also look up by partial name match
results = []
for name, addr in idautils.Names():
    if 'TextAnalyzer' in name:
        results.append({'name': name, 'addr': hex(addr)})
out['all_text_analyzer'] = results

with open('tools/_out.json', 'w') as f:
    json.dump(out, f, indent=2)
