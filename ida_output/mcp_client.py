#!/usr/bin/env python3
"""MCP client that keeps SSE alive while making POST requests."""
import http.client
import json
import threading
import time
import sys
import io

class MCPClient:
    def __init__(self, host='127.0.0.1', port=13337):
        self.host = host
        self.port = port
        self.session_id = None
        self.sse_conn = None
        self.response_buffer = []
        self.buffer_lock = threading.Lock()
        self.response_ready = threading.Event()
        self.running = True

    def connect_sse(self):
        """Open SSE connection and extract session ID."""
        self.sse_conn = http.client.HTTPConnection(self.host, self.port, timeout=60)
        self.sse_conn.request('GET', '/sse', headers={
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache'
        })
        resp = self.sse_conn.getresponse()
        
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
                        print(f'Session: {self.session_id}', flush=True)
                        # Continue reading SSE events for responses
                        continue
                # It's a response event
                if line.startswith('data:') and self.session_id:
                    data = line[5:].strip()
                    with self.buffer_lock:
                        self.response_buffer.append(data)
                        self.response_ready.set()

    def start(self):
        """Start SSE listener in background thread."""
        t = threading.Thread(target=self.connect_sse, daemon=True)
        t.start()
        # Wait for session
        for _ in range(50):
            if self.session_id:
                return True
            time.sleep(0.1)
        return False

    def post(self, method, params=None, req_id=1):
        """Send JSON-RPC request and wait for response."""
        if not self.session_id:
            raise Exception("No session")
        
        payload = {'jsonrpc': '2.0', 'id': req_id, 'method': method}
        if params is not None:
            payload['params'] = params
        
        body = json.dumps(payload)
        url = f'/sse?session={self.session_id}'
        
        conn = http.client.HTTPConnection(self.host, self.port, timeout=30)
        conn.request('POST', url, body=body, headers={'Content-Type': 'application/json'})
        resp = conn.getresponse()
        post_status = resp.status
        post_body = resp.read().decode('utf-8')
        conn.close()
        
        # Wait for SSE response
        self.response_ready.clear()
        deadline = time.time() + 15
        while time.time() < deadline:
            with self.buffer_lock:
                if self.response_buffer:
                    data = self.response_buffer.pop(0)
                    try:
                        return json.loads(data)
                    except:
                        return {'raw': data}
            time.sleep(0.1)
        
        return {'error': 'timeout', 'post_status': post_status, 'post_body': post_body}


def main():
    client = MCPClient()
    if not client.start():
        print("Failed to connect", file=sys.stderr)
        sys.exit(1)
    
    print(f"Connected. Session: {client.session_id}", flush=True)
    
    # List tools
    result = client.post('tools/list')
    print(json.dumps(result, indent=2)[:5000], flush=True)


if __name__ == '__main__':
    main()
