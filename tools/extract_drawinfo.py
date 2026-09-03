import json
import sys

data = open('ida_output/cuitooltip_DrawInfo.txt', 'r').read()
start = data.find('{"jsonrpc')
end = data.rfind('}') + 1
obj = json.loads(data[start:end])
code = obj['result']['content'][0]['text']
inner = json.loads(code)
print(inner['code'])
