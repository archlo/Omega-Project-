import json
import re
import sys

f = open('ida_output/cuitooltip_DrawInfo.txt', 'r', encoding='utf-8', errors='replace')
data = f.read()
f.close()

# Find the JSON object
start = data.find('{"jsonrpc')
if start < 0:
    print('No JSON found')
    sys.exit(1)

# Try to find the end of the JSON
brace_count = 0
end = start
for i in range(start, len(data)):
    if data[i] == '{':
        brace_count += 1
    elif data[i] == '}':
        brace_count -= 1
        if brace_count == 0:
            end = i + 1
            break

json_str = data[start:end]
print(f'JSON length: {len(json_str)}', file=sys.stderr)

try:
    obj = json.loads(json_str)
    content = obj['result']['content'][0]['text']
    inner = json.loads(content)
    code = inner.get('code', '')
    # Decode escape sequences
    code = code.replace('\\n', '\n').replace('\\t', '\t')
    # Remove address comments
    code = re.sub(r'/\*0x[0-9a-f]+\*/', '', code)
    print(code)
except Exception as e:
    print(f'Parse error: {e}', file=sys.stderr)
    # Try to print what we can
    print(json_str[:5000])
