import json, re

with open(r'C:\Users\jorge\.local\share\mimocode\tool-output\tool_f62077cdb001aQ7eXj5Yg3z8di', 'r', encoding='utf-8') as f:
    raw = f.read()

# Find the JSON result inside the SSE data line
for line in raw.split('\n'):
    if line.startswith('{"jsonrpc"'):
        data = json.loads(line)
        inner_text = data['result']['content'][0]['text']
        parsed = json.loads(inner_text)
        code = parsed.get('code', '')
        
        # Save clean JSON
        with open(r'C:\Users\jorge\OneDrive\Desktop\ts\ida_output\cutooltip_SetToolTip_ItemOption_clean.json', 'w') as out:
            json.dump(parsed, out, indent=2)
        
        print(f'Code length: {len(code)}')
        
        # Extract StringPool IDs
        ids = set()
        for m in re.finditer(r'StringPool::GetString\([^,]+,\s*(?:[^,]+,\s*)?0x([0-9a-fA-F]+)u?\)', code):
            ids.add(int(m.group(1), 16))
        for m in re.finditer(r'StringPool::GetBSTR\([^,]+,\s*[^,]+,\s*0x([0-9a-fA-F]+)u?\)', code):
            ids.add(int(m.group(1), 16))
        for m in re.finditer(r'v\d+\._m_pStr\s*=\s*\(char\s*\*\)\s*(\d+)', code):
            ids.add(int(m.group(1)))
        for m in re.finditer(r'v\d+\.m_Data\s*=\s*\(_bstr_t::Data_t\s*\*\)\s*(\d+)', code):
            ids.add(int(m.group(1)))
        print('StringPool IDs (hex):', sorted([hex(x) for x in ids]))
        
        # Font types
        fonts = list(set(re.findall(r'FONT_\w+', code)))
        print('Font types:', fonts)
        
        # Key operations
        print('\nKey operations:')
        for line_code in code.split('\n'):
            if any(x in line_code for x in ['DrawTextA', 'CalcTextWidth', 'GetfullHeight', 'ItemOptionLevelData', 'nProb', 'AddToolTipLine', 'SetFont']):
                print('  ', line_code.strip()[:150])
        
        # Print first 3000 chars of actual code body
        body_start = code.find('v4 = this->')
        if body_start < 0:
            body_start = code.find('{\\n  int v4')
        if body_start >= 0:
            print('\n--- Function body (first 5000 chars) ---')
            print(code[body_start:body_start+5000])
        break
