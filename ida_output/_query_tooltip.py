import urllib.request, json, threading, sys, time

MCP_BASE = 'http://127.0.0.1:13337'

def connect_mcp():
    sse_req = urllib.request.Request(MCP_BASE + '/sse', headers={'Accept': 'text/event-stream'})
    sse_resp = urllib.request.urlopen(sse_req, timeout=15)
    buf = b''
    endpoint = None
    while True:
        chunk = sse_resp.read(1)
        if not chunk:
            break
        buf += chunk
        if buf.endswith(b'\n\n'):
            decoded = buf.decode('utf-8').strip()
            buf = b''
            for line in decoded.split('\n'):
                if line.startswith('data:'):
                    endpoint = line[5:].strip()
                    break
            if endpoint:
                break
    return sse_resp, endpoint

def mcp_call(sse_resp, endpoint, method, params):
    results = []
    done = threading.Event()
    def listener(resp):
        buf = b''
        while not done.is_set():
            try:
                chunk = resp.read(1)
                if not chunk:
                    break
                buf += chunk
                if buf.endswith(b'\n\n'):
                    decoded = buf.decode('utf-8').strip()
                    buf = b''
                    for line in decoded.split('\n'):
                        if line.startswith('data:'):
                            try:
                                obj = json.loads(line[5:].strip())
                                if 'result' in obj or 'error' in obj:
                                    results.append(obj)
                                    done.set()
                                    return
                            except:
                                pass
            except:
                break
    # Create a new SSE connection for reading responses
    sse2_req = urllib.request.Request(MCP_BASE + '/sse', headers={'Accept': 'text/event-stream'})
    sse2_resp = urllib.request.urlopen(sse2_req, timeout=15)
    buf2 = b''
    endpoint2 = None
    while True:
        chunk = sse2_resp.read(1)
        if not chunk:
            break
        buf2 += chunk
        if buf2.endswith(b'\n\n'):
            decoded = buf2.decode('utf-8').strip()
            buf2 = b''
            for line in decoded.split('\n'):
                if line.startswith('data:'):
                    endpoint2 = line[5:].strip()
                    break
            if endpoint2:
                break

    t = threading.Thread(target=listener, args=(sse2_resp,), daemon=True)
    t.start()
    
    url = MCP_BASE + endpoint
    payload = json.dumps({'jsonrpc': '2.0', 'id': '1', 'method': method, 'params': params}).encode()
    req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
    try:
        urllib.request.urlopen(req, timeout=60)
    except Exception as e:
        print(f'  POST error: {e}', file=sys.stderr)
    
    done.wait(timeout=30)
    done.set()
    return results[0] if results else {'error': 'timeout'}

sse_resp, endpoint = connect_mcp()
if not endpoint:
    print('ERROR: No SSE endpoint')
    sys.exit(1)

prefixes = ['CUIToolTip::', 'CUIItemTip::', 'CUIEquipTip::']
for prefix in prefixes:
    print(f'\n=== {prefix} ===')
    result = mcp_call(sse_resp, endpoint, 'tools/call', {'name': 'list_funcs', 'arguments': {'prefix': prefix}})
    if 'result' in result:
        for item in result['result'].get('content', []):
            if item.get('type') == 'text':
                data = json.loads(item['text'])
                funcs = data.get('funcs', data.get('data', data)) if isinstance(data, dict) else data
                if isinstance(funcs, list):
                    for f in funcs:
                        print(f"  {f.get('addr','?'):>12s}  size={f.get('size','?'):>6s}  {f.get('name','?')}")
                    print(f'\n  Total: {len(funcs)} functions')
                else:
                    print(f'  Raw: {str(data)[:1000]}')
    elif 'error' in result:
        print(f"  Error: {result['error']}")
    time.sleep(0.5)
