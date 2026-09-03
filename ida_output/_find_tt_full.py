import urllib.request, json, threading, time, sys

endpoint_url = [None]
responses = []
lock = threading.Lock()

def sse_listener():
    req = urllib.request.Request('http://127.0.0.1:13337/sse')
    req.add_header('Accept', 'text/event-stream')
    resp = urllib.request.urlopen(req, timeout=120)
    for line in resp:
        line = line.decode('utf-8').strip()
        if line.startswith('data:'):
            data = line[5:].strip()
            if endpoint_url[0] is None:
                endpoint_url[0] = data
            else:
                with lock:
                    responses.append(data)

t = threading.Thread(target=sse_listener, daemon=True)
t.start()
for i in range(50):
    if endpoint_url[0]: break
    time.sleep(0.1)
if not endpoint_url[0]:
    print("ERROR: No endpoint"); sys.exit(1)

full_url = f"http://127.0.0.1:13337{endpoint_url[0]}"
def post(msg):
    req = urllib.request.Request(full_url, data=json.dumps(msg).encode(), headers={"Content-Type": "application/json"})
    try: urllib.request.urlopen(req, timeout=5)
    except: pass

def get_response(req_id, timeout=60):
    deadline = time.time() + timeout
    while time.time() < deadline:
        with lock:
            for i, r in enumerate(responses):
                try:
                    d = json.loads(r)
                    if d.get("id") == req_id:
                        responses.pop(i)
                        return d
                except: pass
        time.sleep(0.1)
    return None

post({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "mimo", "version": "1.0"}}})
time.sleep(0.5)
post({"jsonrpc": "2.0", "method": "notifications/initialized"})
time.sleep(0.5)

# Use py_eval to find all CUIToolTip functions + CUIItemTip + CUIEquipTip
code = """
import idautils, idc, ida_funcs
results = []
for ea in idautils.Functions():
    name = idc.get_func_name(ea)
    if name and ('CUIToolTip' in name or 'CUIItemTip' in name or 'CUIEquipTip' in name):
        f = ida_funcs.get_func(ea)
        size = f.size() if f else 0
        results.append({'addr': hex(ea), 'size': hex(size), 'name': name})
results.sort(key=lambda x: int(x['addr'], 16))
import json
print(json.dumps(results))
"""

post({"jsonrpc": "2.0", "id": 100, "method": "tools/call", "params": {"name": "py_eval", "arguments": {"code": code}}})
result = get_response(100, timeout=60)
if result and "result" in result:
    content = result["result"].get("content", [])
    for c in content:
        if c.get("type") == "text":
            text = c["text"]
            # The text is a JSON with result/stdout/stdout keys
            try:
                parsed = json.loads(text)
                stdout = parsed.get("stdout", "")
                funcs = json.loads(stdout)
                with open("C:/Users/jorge/OneDrive/Desktop/ts/ida_output/_tooltip_funcs.json", "w") as f:
                    json.dump(funcs, f, indent=2)
                print(f"Saved {len(funcs)} functions to _tooltip_funcs.json")
            except Exception as e:
                # Maybe it's just the raw JSON
                try:
                    funcs = json.loads(text)
                    with open("C:/Users/jorge/OneDrive/Desktop/ts/ida_output/_tooltip_funcs.json", "w") as f:
                        json.dump(funcs, f, indent=2)
                    print(f"Saved {len(funcs)} functions to _tooltip_funcs.json")
                except:
                    with open("C:/Users/jorge/OneDrive/Desktop/ts/ida_output/_tooltip_funcs.json", "w") as f:
                        f.write(text)
                    print(f"Saved raw text ({len(text)} chars)")
else:
    print(f"Error or no response: {result}")
