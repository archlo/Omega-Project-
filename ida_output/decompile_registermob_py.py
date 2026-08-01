#!/usr/bin/env python3
"""Use py_eval to decompile RegisterMob via idaapi."""
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
    
    # Use py_eval to decompile RegisterMob via idaapi
    py_code = '''
import idaapi
import idc

ea = 0x65d510
func = idaapi.get_func(ea)
if func:
    cfunc = idaapi.decompile(func)
    if cfunc:
        result = str(cfunc)
    else:
        result = "decompile returned None"
else:
    result = "no function at " + hex(ea)
'''
    
    print("=== py_eval RegisterMob ===", flush=True)
    result = client.call_tool('py_eval', {'code': py_code}, req_id=100)
    
    # Extract the result
    try:
        content = result['result']['content'][0]['text']
        parsed = json.loads(content)
        output = parsed.get('result', content)
        print(f"Result length: {len(str(output))}", flush=True)
        print(str(output)[:5000], flush=True)
        
        # Save full output
        outfile = r'C:\Users\jorge\OneDrive\Desktop\ts\ida_output\cmobtemplate_registermob_clean.txt'
        with open(outfile, 'w', encoding='utf-8') as f:
            f.write(f'// CMobTemplate::RegisterMob (via py_eval)\n// Address: 0x65d510\n\n{output}')
        print(f"\nSaved to {outfile}", flush=True)
    except Exception as e:
        print(f"Error: {e}", flush=True)
        print(json.dumps(result, indent=2)[:3000], flush=True)


if __name__ == '__main__':
    main()
