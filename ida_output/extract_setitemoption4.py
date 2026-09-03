import re, json

with open(r'C:\Users\jorge\.local\share\mimocode\tool-output\tool_f62077cdb001aQ7eXj5Yg3z8di', 'r', encoding='utf-8') as f:
    raw = f.read()

# The format is: "text": "{\\"addr\\":\\"0x891c80\\",\\"code\\":\\"...
# Find the code start
code_marker = '\\"code\\":\\"'
code_start = raw.find(code_marker)
if code_start < 0:
    print("Could not find code field")
    exit(1)

code_start += len(code_marker)

# Find the end - look for \\",\\"  or \\"}
# Since the code is double-escaped, we look for \\"
i = code_start
result = []
while i < len(raw):
    ch = raw[i]
    if ch == '\\' and i+1 < len(raw):
        next_ch = raw[i+1]
        if next_ch == 'n':
            result.append('\n')
        elif next_ch == 't':
            result.append('\t')
        elif next_ch == '"':
            # Check if this ends the code string
            # Look for \\",\\" or \\"}
            rest = raw[i:i+20]
            if '\\"' in rest[2:20] and ('\\",\\"' in rest or '\\"}' in rest):
                break
            result.append('"')
        elif next_ch == '\\':
            result.append('\\')
        else:
            result.append('\\')
            result.append(next_ch)
        i += 2
    else:
        result.append(ch)
        i += 1

code = ''.join(result)
print(f'Extracted code length: {len(code)}')

# Save the clean code
with open(r'C:\Users\jorge\OneDrive\Desktop\ts\ida_output\cutooltip_SetToolTip_ItemOption_clean.txt', 'w', encoding='utf-8') as f:
    f.write(code)

# Extract StringPool IDs
ids = set()
for m in re.finditer(r'StringPool::GetString\([^,]+,\s*(?:&?\w+,\s*)?0x([0-9a-fA-F]+)u?\)', code):
    ids.add(int(m.group(1), 16))
for m in re.finditer(r'StringPool::GetBSTR\([^,]+,\s*&?\w+,\s*0x([0-9a-fA-F]+)u?\)', code):
    ids.add(int(m.group(1), 16))
print('StringPool IDs (hex):', sorted([hex(x) for x in ids]))

# Font types
fonts = list(set(re.findall(r'FONT_\w+', code)))
print('Font types:', fonts)

# Key operations
print('\nKey operations:')
for line in code.split('\n'):
    stripped = line.strip()
    if any(x in stripped for x in ['DrawTextA', 'CalcTextWidth', 'GetfullHeight', 'AddToolTipLine', 'SetFont', 'nProb', 'switch', 'case ']):
        if '/*0x' in stripped:
            print('  ', stripped[:160])

# Print first 3000 chars
print('\n--- First 3000 chars ---')
print(code[:3000])
