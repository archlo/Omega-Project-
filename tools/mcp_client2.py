"""
MCP IDA decompiler - proper SSE protocol implementation.
"""
import sys
import json
import urllib.request
import threading
import time
import queue

MCP_BASE = "http://127.0.0.1:13337"

class MCPClient:
    def __init__(self):
        self.session_id = None
        self.sse_queue = queue.Queue()
        self.sse_thread = None
        self.connected = False
    
    def connect(self):
        """Connect to MCP SSE and get session."""
        # Start SSE listener
        self.sse_thread = threading.Thread(target=self._sse_listener, daemon=True)
        self.sse_thread.start()
        
        # Wait for session
        try:
            self.session_id = self.sse_queue.get(timeout=10)
            self.connected = True
            return True
        except queue.Empty:
            return False
    
    def _sse_listener(self):
        """Background thread listening to SSE stream."""
        try:
            req = urllib.request.Request(f"{MCP_BASE}/sse")
            resp = urllib.request.urlopen(req, timeout=300)
            
            for line in resp:
                decoded = line.decode().strip()
                if decoded.startswith("data:"):
                    data = decoded[5:].strip()
                    if data and not self.connected:
                        # First data is session URL
                        self.sse_queue.put(data)
                    elif data:
                        # Subsequent data is results
                        self.sse_queue.put(data)
        except Exception as e:
            self.sse_queue.put(json.dumps({"error": str(e)}))
    
    def call(self, method, params):
        """Send JSON-RPC request."""
        if not self.connected:
            return {"error": "Not connected"}
        
        body = json.dumps({
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params
        }).encode()
        
        req = urllib.request.Request(
            f"{MCP_BASE}{self.session_id}",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        
        try:
            resp = urllib.request.urlopen(req, timeout=120)
            resp.read()
        except Exception as e:
            return {"error": f"POST failed: {e}"}
        
        # Wait for SSE response
        try:
            result = self.sse_queue.get(timeout=60)
            return json.loads(result) if isinstance(result, str) else result
        except queue.Empty:
            return {"error": "Timeout"}
    
    def decompile(self, address):
        """Decompile a function."""
        return self.call("tools/call", {
            "name": "decompile",
            "arguments": {"addr": address}
        })
    
    def close(self):
        """Close connection."""
        self.connected = False

def main():
    client = MCPClient()
    if not client.connect():
        print("Failed to connect to MCP", file=sys.stderr)
        sys.exit(1)
    
    print(f"Connected. Session: {client.session_id}", file=sys.stderr)
    
    for addr in sys.argv[1:]:
        result = client.decompile(addr)
        print(f"=== {addr} ===")
        if isinstance(result, dict) and "result" in result:
            content = result.get("result", {}).get("content", [])
            for item in content:
                if item.get("type") == "text":
                    print(item.get("text", ""))
        else:
            print(json.dumps(result, indent=2))
        print()
    
    client.close()

if __name__ == "__main__":
    main()
