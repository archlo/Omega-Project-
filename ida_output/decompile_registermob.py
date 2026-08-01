#!/usr/bin/env python3
"""Re-decompile RegisterMob with force_recompile, and read remaining functions."""
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
        return self.rpc('tools/call', {'name': tool_name, 'arguments': arguments or {}}, req_id, timeout=60)

    def decompile(self, address, req_id=1):
        result = self.call_tool('decompile', {'addr': address}, req_id)
        try:
            content = result['result']['content'][0]['text']
            parsed = json.loads(content)
            return parsed.get('code', content)
        except:
            return json.dumps(result, indent=2)


def main():
    client = MCPClient()
    if not client.start():
        print("Failed to connect", file=sys.stderr)
        sys.exit(1)
    
    print(f"Session: {client.session_id}", flush=True)
    outdir = r'C:\Users\jorge\OneDrive\Desktop\ts\ida_output'
    
    # Step 1: Force recompile RegisterMob
    print("\n=== Force recompiling RegisterMob (0x65d510) ===", flush=True)
    result = client.call_tool('force_recompile', {'addr': '0x65d510'}, req_id=10)
    print(f"Force recompile result: {json.dumps(result)[:500]}", flush=True)
    time.sleep(2)
    
    # Step 2: Re-decompile RegisterMob
    print("\n=== Re-decompiling RegisterMob ===", flush=True)
    code = client.decompile('0x65d510', req_id=11)
    outfile = os.path.join(outdir, 'cmobtemplate_registermob_clean.txt')
    with open(outfile, 'w', encoding='utf-8') as f:
        f.write(f'// CMobTemplate::RegisterMob\n// Address: 0x65d510\n\n{code}')
    print(f"Saved: {outfile} ({len(code)} chars)", flush=True)
    
    # Step 3: Also try to get the ZtlSecurePut functions to understand field mapping
    secure_gets = [
        ('cmobtemplate_get_bboss', '0x439150', '_ZtlSecureGet_bBoss'),
        ('cmobtemplate_get_binvincible', '0x659120', '_ZtlSecureGet_bInvincible'),
        ('cmobtemplate_get_nmoveability', '0x63a500', '_ZtlSecureGet_nMoveAbility'),
        ('cmobtemplate_get_bselfdestruction', '0x63a540', '_ZtlSecureGet_bSelfDestruction'),
        ('cmobtemplate_get_dwtemplateid', '0x63a4e0', '_ZtlSecureGet_dwTemplateID'),
        ('cmobtemplate_get_ncategory', '0x721a00', '_ZtlSecureGet_nCategory'),
        ('cmobtemplate_get_nfixeddamage', '0x63a560', '_ZtlSecureGet_nFixedDamage'),
        ('cmobtemplate_get_nlevel', '0x63a520', '_ZtlSecureGet_nLevel'),
    ]
    
    for i, (filename, addr, desc) in enumerate(secure_gets):
        print(f"\n[{i+1}/{len(secure_gets)}] {desc} ({addr})...", flush=True)
        code = client.decompile(addr, req_id=20+i)
        outfile = os.path.join(outdir, f'{filename}_clean.txt')
        with open(outfile, 'w', encoding='utf-8') as f:
            f.write(f'// {desc}\n// Address: {addr}\n\n{code}')
        print(f"  Saved: {outfile} ({len(code)} chars)", flush=True)
        time.sleep(0.3)
    
    print("\n=== Done ===", flush=True)


if __name__ == '__main__':
    main()
