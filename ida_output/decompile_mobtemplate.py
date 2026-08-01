#!/usr/bin/env python3
"""Decompile CMobTemplate functions one at a time via MCP."""
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

    def decompile(self, address, req_id=1):
        result = self.rpc('tools/call', {'name': 'decompile', 'arguments': {'addr': address}}, req_id, timeout=60)
        try:
            content = result['result']['content'][0]['text']
            parsed = json.loads(content)
            return parsed.get('code', content)
        except:
            return json.dumps(result, indent=2)


# Functions to decompile
FUNCTIONS = [
    ('cmobtemplate_constructor', '0x65a340', 'CMobTemplate::CMobTemplate (constructor/Init)'),
    ('cmobtemplate_load', '0x6611c0', 'CMobTemplate::Load'),
    ('cmobtemplate_getmobtemplate', '0x6611f0', 'CMobTemplate::GetMobTemplate'),
    ('cmobtemplate_registermob', '0x65d510', 'CMobTemplate::RegisterMob'),
    ('cmobtemplate_getnmaxhp', '0x52a5b0', '_ZtlSecureGet_nMaxHP (GetHP)'),
    ('cmobtemplate_unload', '0x659b50', 'CMobTemplate::Unload'),
    ('cmobtemplate_islevelvisible', '0x659140', 'CMobTemplate::IsLevelVisible'),
    ('cmobtemplate_isvulnerableto', '0x659260', 'CMobTemplate::IsVulnerableTo'),
    ('cmobtemplate_loadattackinfo', '0x65b890', 'CMobTemplate::LoadAttackInfo'),
    ('cmobtemplate_getattackinfo', '0x52d550', 'CMobTemplate::GetAttackInfo'),
    ('cmobtemplate_loadskillinfo', '0x65ad60', 'CMobTemplate::LoadSkillInfo'),
    ('cmobtemplate_getskillinfo', '0x63c310', 'CMobTemplate::GetSkillInfo'),
    ('cmobtemplate_calccrc', '0x660730', 'CMobTemplate::CalcCrc'),
    ('cmobtemplate_loadspeakcondition', '0x65a930', 'CMobTemplate::LoadSpeakCondition'),
    ('cmobtemplate_loadspeakinformation', '0x65b4b0', 'CMobTemplate::LoadSpeakInformation'),
]


def main():
    client = MCPClient()
    if not client.start():
        print("Failed to connect", file=sys.stderr)
        sys.exit(1)
    
    print(f"Session: {client.session_id}", flush=True)
    outdir = r'C:\Users\jorge\OneDrive\Desktop\ts\ida_output'
    os.makedirs(outdir, exist_ok=True)
    
    for i, (filename, addr, desc) in enumerate(FUNCTIONS):
        print(f"\n[{i+1}/{len(FUNCTIONS)}] Decompiling {desc} ({addr})...", flush=True)
        code = client.decompile(addr, req_id=i+10)
        
        outfile = os.path.join(outdir, f'{filename}_clean.txt')
        with open(outfile, 'w', encoding='utf-8') as f:
            f.write(f'// {desc}\n// Address: {addr}\n\n{code}')
        
        # Print first 200 chars
        preview = code[:200].replace('\n', ' | ')
        print(f"  Saved: {outfile} ({len(code)} chars)", flush=True)
        print(f"  Preview: {preview}...", flush=True)
        
        # Brief pause between requests
        time.sleep(0.5)
    
    print(f"\n=== Done. {len(FUNCTIONS)} functions decompiled. ===", flush=True)


if __name__ == '__main__':
    main()
