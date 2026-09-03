#!/usr/bin/env python3
"""Get RegisterMob decompilation in chunks via py_eval."""
import http.client
import json
import threading
import time
import sys
import os

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
    
    # Use py_eval to write RegisterMob decompilation to a temp file, then read it
    # The trick: write to a known path, then use py_eval to read it back in chunks
    
    # Step 1: Decompile and save to temp file on IDA side
    py_save = '''
import idaapi
import idc
import os

ea = 0x65d510
func = idaapi.get_func(ea)
if func:
    cfunc = idaapi.decompile(func)
    if cfunc:
        code = str(cfunc)
        # Write to temp file
        tmp = r"C:\\Users\\jorge\\OneDrive\\Desktop\\ts\\ida_output\\_registermob_full.txt"
        with open(tmp, "w", encoding="utf-8") as f:
            f.write(code)
        result = f"Written {len(code)} chars to {tmp}"
    else:
        result = "decompile returned None"
else:
    result = "no function at " + hex(ea)
'''
    
    print("Step 1: Decompile and save to file...", flush=True)
    result = client.call_tool('py_eval', {'code': py_save}, req_id=1)
    try:
        content = result['result']['content'][0]['text']
        parsed = json.loads(content)
        print(f"  {parsed.get('result', 'unknown')}", flush=True)
    except:
        print(f"  {json.dumps(result)[:500]}", flush=True)
    
    time.sleep(1)
    
    # Step 2: Read the file back via py_eval
    py_read = '''
import os
tmp = r"C:\\Users\\jorge\\OneDrive\\Desktop\\ts\\ida_output\\_registermob_full.txt"
if os.path.exists(tmp):
    with open(tmp, "r", encoding="utf-8") as f:
        content = f.read()
    # Return in chunks - first 800 chars
    result = content[:800]
else:
    result = "file not found"
'''
    
    print("\nStep 2: Read chunk 1...", flush=True)
    result = client.call_tool('py_eval', {'code': py_read}, req_id=2)
    try:
        content = result['result']['content'][0]['text']
        parsed = json.loads(content)
        chunk1 = parsed.get('result', '')
        print(f"  Chunk 1: {len(chunk1)} chars", flush=True)
    except:
        chunk1 = ''
        print(f"  Error: {json.dumps(result)[:500]}", flush=True)
    
    # Step 3: Read remaining chunks
    all_code = chunk1
    for i in range(3, 20):  # Up to 20 chunks
        py_chunk = f'''
import os
tmp = r"C:\\Users\\jorge\\OneDrive\\Desktop\\ts\\ida_output\\_registermob_full.txt"
with open(tmp, "r", encoding="utf-8") as f:
    content = f.read()
start = {(i-2) * 800}
result = content[start:start+800] if start < len(content) else ""
'''
        result = client.call_tool('py_eval', {'code': py_chunk}, req_id=i)
        try:
            content = result['result']['content'][0]['text']
            parsed = json.loads(content)
            chunk = parsed.get('result', '')
            if not chunk:
                break
            all_code += chunk
            print(f"  Chunk {i-1}: {len(chunk)} chars (total: {len(all_code)})", flush=True)
        except:
            break
        time.sleep(0.2)
    
    # Save the full decompilation
    outfile = r'C:\Users\jorge\OneDrive\Desktop\ts\ida_output\cmobtemplate_registermob_clean.txt'
    with open(outfile, 'w', encoding='utf-8') as f:
        f.write(f'// CMobTemplate::RegisterMob\n// Address: 0x65d510\n\n{all_code}')
    print(f"\nSaved full RegisterMob: {outfile} ({len(all_code)} chars)", flush=True)


if __name__ == '__main__':
    main()
