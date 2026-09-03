"""MCP SSE client - list available tools."""
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
    sock.settimeout(30)
    while True:
        try:
            data = sock.recv(8192)
            if not data:
                break
            buf += data
            while b'\n\n' in buf:
                event, buf = buf.split(b'\n\n', 1)
                text = event.decode('utf-8', errors='replace')
                for line in text.split('\n'):
                    if line.startswith('data: '):
                        d = line[6:].strip()
                        if '/sse?session=' in d:
                            endpoint_url[0] = d
                        elif d:
                            try:
                                j = json.loads(d)
                                if 'id' in j:
                                    responses[j['id']] = j
                            except:
                                pass
        except socket.timeout:
            break

t = threading.Thread(target=read_sse, daemon=True)
t.start()
time.sleep(3)

print(f"Endpoint: {endpoint_url[0]}")

if endpoint_url[0]:
    # First: initialize
    init_req = json.dumps({
        'jsonrpc': '2.0',
        'id': 1,
        'method': 'initialize',
        'params': {
            'protocolVersion': '2024-11-05',
            'capabilities': {},
            'clientInfo': {'name': 'test', 'version': '1.0'}
        }
    })
    msg = f'POST {endpoint_url[0]} HTTP/1.1\r\nHost: {BASE}:{PORT}\r\nContent-Type: application/json\r\nContent-Length: {len(init_req)}\r\n\r\n{init_req}'
    sock.sendall(msg.encode())
    time.sleep(3)

    # Second: list tools
    tools_req = json.dumps({
        'jsonrpc': '2.0',
        'id': 2,
        'method': 'tools/list',
        'params': {}
    })
    msg2 = f'POST {endpoint_url[0]} HTTP/1.1\r\nHost: {BASE}:{PORT}\r\nContent-Type: application/json\r\nContent-Length: {len(tools_req)}\r\n\r\n{tools_req}'
    sock.sendall(msg2.encode())
    time.sleep(5)

    print(f"Responses: {len(responses)}")
    for rid, resp in sorted(responses.items()):
        print(f"\n--- id={rid} ---")
        print(json.dumps(resp, indent=2)[:3000])
else:
    print("ERROR: No endpoint received")
