"""MCP SSE client - full handshake + decompile."""
import socket, json, time, threading, sys

BASE = '127.0.0.1'
PORT = 13337

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect((BASE, PORT))
sock.sendall(
    b'GET /sse HTTP/1.1\r\n'
    b'Host: 127.0.0.1:13337\r\n'
    b'Accept: text/event-stream\r\n'
    b'Connection: keep-alive\r\n\r\n'
)

endpoint_url = [None]
responses = {}

def read_sse():
    buf = b''
    sock.settimeout(60)
    while True:
        try:
            data = sock.recv(16384)
            if not data:
                break
            buf += data
            while b'\n\n' in buf:
                event, buf = buf.split(b'\n\n', 1)
                text = event.decode('utf-8', errors='replace')
                ev_type = ''
                for line in text.split('\n'):
                    if line.startswith('event: '):
                        ev_type = line[7:].strip()
                    elif line.startswith('data: '):
                        d = line[6:].strip()
                        if '/sse?session=' in d:
                            endpoint_url[0] = d
                            print(f"ENDPOINT: {d}", flush=True)
                        elif d:
                            try:
                                j = json.loads(d)
                                rid = j.get('id')
                                if rid is not None:
                                    responses[rid] = j
                                    print(f"RESPONSE id={rid}", flush=True)
                            except:
                                pass
        except socket.timeout:
            break

t = threading.Thread(target=read_sse, daemon=True)
t.start()
time.sleep(3)

def post_msg(obj):
    body = json.dumps(obj)
    msg = f'POST {endpoint_url[0]} HTTP/1.1\r\nHost: {BASE}:{PORT}\r\nContent-Type: application/json\r\nContent-Length: {len(body)}\r\n\r\n{body}'
    sock.sendall(msg.encode())

if not endpoint_url[0]:
    print("ERROR: No endpoint")
    sys.exit(1)

# Step 1: initialize
post_msg({
    'jsonrpc': '2.0',
    'id': 1,
    'method': 'initialize',
    'params': {
        'protocolVersion': '2024-11-05',
        'capabilities': {},
        'clientInfo': {'name': 'mcp-client', 'version': '1.0'}
    }
})
time.sleep(3)

# Step 2: initialized notification (no id)
post_msg({
    'jsonrpc': '2.0',
    'method': 'notifications/initialized'
})
time.sleep(1)

# Step 3: list tools
post_msg({
    'jsonrpc': '2.0',
    'id': 2,
    'method': 'tools/list',
    'params': {}
})
time.sleep(5)

print(f"\nTotal responses: {len(responses)}")
for rid in sorted(responses.keys()):
    r = responses[rid]
    result = r.get('result', r.get('error', 'no result'))
    print(f"\n=== id={rid} ===")
    print(json.dumps(result, indent=2)[:5000])

# Step 4: decompile test
post_msg({
    'jsonrpc': '2.0',
    'id': 3,
    'method': 'tools/call',
    'params': {
        'name': 'decompile',
        'arguments': {'address': '0x6b68c0'}
    }
})
time.sleep(8)

print(f"\nTotal responses after decompile: {len(responses)}")
if 3 in responses:
    r = responses[3]
    content = r.get('result', {}).get('content', [])
    for c in content:
        if c.get('type') == 'text':
            print(c['text'][:3000])
