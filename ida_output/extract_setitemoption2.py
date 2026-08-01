import re

with open(r'C:\Users\jorge\.local\share\mimocode\tool-output\tool_f62077cdb001aQ7eXj5Yg3z8di', 'r', encoding='utf-8') as f:
    raw = f.read()

# The code is embedded as escaped JSON string. Find it.
# Look for the code field start
code_start = raw.find('"code":"void __thiscall CUIToolTip::SetToolTip_ItemOption')
if code_start < 0:
    print("Could not find code field")
    exit(1)

# Extract from code_start, find the code value
# The code starts after "code":"
code_start = raw.find('void __thiscall CUIToolTip::SetToolTip_ItemOption')
if code_start < 0:
    print("Could not find function signature")
    exit(1)

# Find the end - look for "," or "}
# We need to handle escaped quotes
code = raw[code_start:]
# The code ends at the next unescaped quote
i = 0
result = []
while i < len(code):
    ch = code[i]
    if ch == '\\' and i+1 < len(code):
        next_ch = code[i+1]
        if next_ch == 'n':
            result.append('\n')
        elif next_ch == 't':
            result.append('\t')
        elif next_ch == '"':
            result.append('"')
        elif next_ch == '\\':
            result.append('\\')
        else:
            result.append(ch)
            result.append(next_ch)
        i += 2
    elif ch == '"':
        break
    else:
        result.append(ch)
        i += 1

code = ''.join(result)
print(f'Extracted code length: {len(code)}')

# Save the clean code
with open(r'C:\Users\jorge\OneDrive\Desktop\ts\ida_output\cutooltip_SetToolTip_ItemOption_clean.txt', 'w') as f:
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

# Print function signature and first 2000 chars of body
body_start = code.find('{\n')
if body_start >= 0:
    print('\n--- Function body (first 3000 chars) ---')
    print(code[:body_start+3000])
