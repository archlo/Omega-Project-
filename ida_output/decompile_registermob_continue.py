#!/usr/bin/env python3
"""Get remaining RegisterMob chunks."""
import http.client
import json
import threading
import time
import sys

class MCPClient:
    def __init__(self, host='127.0.0.1', port=13337):
        self.host = host
        self.port = port
        self.session_id = None
        self.response_buffer = []
        self.buffer_lock = threading.Lock()
        self.running = True

    def connect_sse(self):
        conn = http.client.HTTPConnection(self.host, self.port, timeout=120)
        conn.request('GET', '/sse', headers={'Accept': 'text/event-stream', 'Cache-Control': 'no-cache'})
        resp = conn.getresponse()
        buffer = ''
        while self.running:
            chunk = resp.read(1)
            if not chunk:
                break
            buffer += chunk.decode('utf-8', errors='replace')
            while '\n' in buffer:
                line, buffer = buffer.split('\n', 1)
                line = line.strip()
                if line.startswith('data:'):
                    data = line[5:].strip()
                    if '/sse?session=' in data:
                        self.session_id = data.split('session=')[1]
                        continue
                    if self.session_id:
                        with self.buffer_lock:
                            self.response_buffer.append(data)

    def start(self):
        t = threading.Thread(target=self.connect_sse, daemon=True)
        t.start()
        for _ in range(50):
            if self.session_id:
                return True
            time.sleep(0.1)
        return False

    def rpc(self, method, params=None, req_id=1, timeout=60):
        payload = {'jsonrpc': '2.0', 'id': req_id, 'method': method}
        if params is not None:
            payload['params'] = params
        url = f'/sse?session={self.session_id}'
        conn = http.client.HTTPConnection(self.host, self.port, timeout=120)
        conn.request('POST', url, body=json.dumps(payload), headers={'Content-Type': 'application/json'})
        resp = conn.getresponse()
        resp.read()
        conn.close()
        
        deadline = time.time() + timeout
        while time.time() < deadline:
            with self.buffer_lock:
                if self.response_buffer:
                    data = self.response_buffer.pop(0)
                    try:
                        parsed = json.loads(data)
                        if 'id' in parsed and parsed['id'] == req_id:
                            return parsed
                    except:
                        pass
            time.sleep(0.1)
        return {'error': 'timeout'}

    def call_tool(self, tool_name, arguments=None, req_id=1):
        return self.rpc('tools/call', {'name': tool_name, 'arguments': arguments or {}}, req_id, timeout=120)


def main():
    client = MCPClient()
    if not client.start():
        print("Failed to connect", file=sys.stderr)
        sys.exit(1)
    
    print(f"Session: {client.session_id}", flush=True)
    
    # Read the existing partial file
    existing = ''
    try:
        with open(r'C:\Users\jorge\OneDrive\Desktop\ts\ida_output\cmobtemplate_registermob_clean.txt', 'r', encoding='utf-8') as f:
            existing = f.read()
        # Remove header
        if existing.startswith('// CMobTemplate::RegisterMob'):
            existing = existing.split('\n\n', 2)[-1] if '\n\n' in existing else ''
    except:
        pass
    
    print(f"Existing: {len(existing)} chars", flush=True)
    
    # Get remaining chunks starting from where we left off
    start_offset = len(existing)
    chunk_size = 800
    all_code = existing
    
    for i in range(100):  # Up to 100 more chunks
        py_chunk = f'''
import os
tmp = r"C:\\Users\\jorge\\OneDrive\\Desktop\\ts\\ida_output\\_registermob_full.txt"
with open(tmp, "r", encoding="utf-8") as f:
    content = f.read()
start = {start_offset + i * chunk_size}
result = content[start:start+{chunk_size}] if start < len(content) else ""
'''
        result = client.call_tool('py_eval', {'code': py_chunk}, req_id=100+i)
        try:
            content = result['result']['content'][0]['text']
            parsed = json.loads(content)
            chunk = parsed.get('result', '')
            if not chunk:
                break
            all_code += chunk
        except:
            break
        time.sleep(0.1)
    
    # Save the full decompilation
    outfile = r'C:\Users\jorge\OneDrive\Desktop\ts\ida_output\cmobtemplate_registermob_clean.txt'
    with open(outfile, 'w', encoding='utf-8') as f:
        f.write(f'// CMobTemplate::RegisterMob\n// Address: 0x65d510\n\n{all_code}')
    print(f"Saved: {outfile} ({len(all_code)} chars)", flush=True)


if __name__ == '__main__':
    main()
