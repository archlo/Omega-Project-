import urllib.request
import json
import threading
import time
import sys
import os

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

def get_response(req_id, timeout=15):
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

def decompile(addr, name, filename):
    post({"jsonrpc": "2.0", "id": 100, "method": "tools/call", "params": {"name": "decompile", "arguments": {"addr": addr}}})
    result = get_response(100, timeout=30)
    if result and "result" in result:
        content = result["result"].get("content", [])
        for c in content:
            if c.get("type") == "text":
                text = c["text"]
                outpath = os.path.join("ida_output", filename)
                with open(outpath, "w", encoding="utf-8") as f:
                    f.write(text)
                print(f"SAVED {name} ({addr}) -> {filename} ({len(text)} chars)")
                return text
    print(f"FAILED {name} ({addr}): {result}")
    return None

# Initialize
post({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "mimo", "version": "1.0"}}})
time.sleep(0.5)
post({"jsonrpc": "2.0", "method": "notifications/initialized"})
time.sleep(0.5)

# List tools first
post({"jsonrpc": "2.0", "id": 10, "method": "tools/list", "params": {}})
time.sleep(2)

for r in list(responses):
    try:
        d = json.loads(r)
        if d.get("id") == 10:
            tools = d.get("result", {}).get("tools", [])
            for tool in tools:
                print(f"Tool: {tool['name']}")
                if "inputSchema" in tool:
                    props = tool["inputSchema"].get("properties", {})
                    print(f"  Params: {list(props.keys())}")
    except:
        pass

# Key functions to decompile
functions = [
    ("0x9a4790", "Init", "cwebwnd_init_clean.txt"),
    ("0x9a4550", "Navigate", "cwebwnd_navigate_clean.txt"),
    ("0x9a5250", "OnCreate", "cwebwnd_oncreate_clean.txt"),
    ("0x9a4d20", "CWebWnd_ctor", "cwebwnd_ctor_clean.txt"),
    ("0x9a5460", "Draw", "cwebwnd_draw_clean.txt"),
    ("0x9a6030", "NavigateUrl", "cwebwnd_navigateurl_clean.txt"),
    ("0x9a42c0", "Update", "cwebwnd_update_clean.txt"),
    ("0x9a5ac0", "Run", "cwebwnd_run_clean.txt"),
    ("0x9a5a20", "OnMoveWnd", "cwebwnd_onmovewnd_clean.txt"),
    ("0x9a4ec0", "Destructor", "cwebwnd_destructor_clean.txt"),
    ("0x9a3dc0", "WindowProc", "cwebwnd_windowproc_clean.txt"),
    ("0x9a3dd0", "WindowProcEntry", "cwebwnd_windowprocentry_clean.txt"),
    ("0x9a3cf0", "OnMouseButton", "cwebwnd_onmousebutton_clean.txt"),
    ("0x9a3e40", "QueryInterface", "cwebwnd_queryinterface_clean.txt"),
    ("0x9a4150", "GetExternal", "cwebwnd_getexternal_clean.txt"),
    ("0x9a4170", "GetHostInfo", "cwebwnd_gethostinfo_clean.txt"),
    ("0x9a4420", "Invoke", "cwebwnd_invoke_clean.txt"),
    ("0x9a4370", "OnSetFocus", "cwebwnd_onsetfocus_clean.txt"),
    ("0x9a4030", "GetWindow", "cwebwnd_getwindow_clean.txt"),
    ("0x9a4060", "CanInPlaceActivate", "cwebwnd_caninplaceactivate_clean.txt"),
    ("0x9a4070", "OnInPlaceActivate", "cwebwnd_oninplaceactivate_clean.txt"),
    ("0x9a4080", "OnUIActivate", "cwebwnd_onuiactivate_clean.txt"),
    ("0x9a40d0", "OnUIDeactivate", "cwebwnd_onuideactivate_clean.txt"),
    ("0x9a40e0", "OnInPlaceDeactivate", "cwebwnd_oninplacedeactivate_clean.txt"),
    ("0x9a4090", "GetWindowContext", "cwebwnd_getwindowcontext_clean.txt"),
    ("0x9a41e0", "ShowContextMenu", "cwebwnd_showcontextmenu_clean.txt"),
    ("0x9a4200", "TranslateAcceleratorA", "cwebwnd_translateacceleratora_clean.txt"),
    ("0x9a3d70", "OnEndMoveWnd", "cwebwnd_onendmovewnd_clean.txt"),
]

print(f"\nDecompiling {len(functions)} functions...")
for addr, name, filename in functions:
    decompile(addr, name, filename)
    time.sleep(0.3)

print("\nDone!")
