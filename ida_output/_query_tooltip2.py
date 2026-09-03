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
    print("ERROR: No endpoint received")
    sys.exit(1)

full_url = f"http://127.0.0.1:13337{endpoint_url[0]}"

def post(msg):
    req = urllib.request.Request(full_url, data=json.dumps(msg).encode(), headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req, timeout=5)
    except:
        pass

def get_response(req_id, timeout=30):
    deadline = time.time() + timeout
    while time.time() < deadline:
        with lock:
            for i, r in enumerate(responses):
                try:
                    d = json.loads(r)
                    if d.get("id") == req_id:
                        responses.pop(i)
                        return d
                except:
                    pass
        time.sleep(0.1)
    return None

# Initialize
post({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "mimo", "version": "1.0"}}})
time.sleep(0.5)
post({"jsonrpc": "2.0", "method": "notifications/initialized"})
time.sleep(0.5)

# Query all three prefixes
prefixes = ["CUIToolTip::", "CUIItemTip::", "CUIEquipTip::"]
for idx, prefix in enumerate(prefixes):
    req_id = 100 + idx
    post({"jsonrpc": "2.0", "id": req_id, "method": "tools/call", "params": {"name": "list_funcs", "arguments": {"prefix": prefix}}})
    result = get_response(req_id, timeout=30)
    print(f"\n=== {prefix} ===")
    if result and "result" in result:
        content = result["result"].get("content", [])
        for c in content:
            if c.get("type") == "text":
                try:
                    data = json.loads(c["text"])
                except:
                    data = c["text"]
                funcs = []
                if isinstance(data, dict):
                    funcs = data.get("funcs", data.get("data", []))
                elif isinstance(data, list):
                    funcs = data
                if isinstance(funcs, list):
                    for f in funcs:
                        addr = f.get("addr", "?")
                        size = f.get("size", "?")
                        name = f.get("name", "?")
                        print(f"  {addr:>12s}  size={size:>6s}  {name}")
                    print(f"\n  Total: {len(funcs)} functions")
                else:
                    print(f"  Response: {str(data)[:2000]}")
    elif result and "error" in result:
        print(f"  Error: {result['error']}")
    else:
        print(f"  No result or timeout")
    time.sleep(1)

print("\nDone!")
