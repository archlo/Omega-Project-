"""
MCP client for decompilation via SSE protocol.
Usage: python mcp_client.py <address> [address2 ...]
"""
import sys
import json
import urllib.request
import threading
import time

MCP_BASE = "http://127.0.0.1:13337"

def connect_sse():
    """Connect to SSE endpoint and get session URL."""
    req = urllib.request.Request(f"{MCP_BASE}/sse")
    resp = urllib.request.urlopen(req, timeout=30)
    # Read the first event to get session URL
    line = resp.readline().decode()
    while not line.startswith("data:"):
        line = resp.readline().decode()
    session_path = line.strip().replace("data: ", "")
    session_url = f"{MCP_BASE}{session_path}"
    return resp, session_url

def decompile(session_url, address):
    """Send decompile request and wait for response."""
    body = json.dumps({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "decompile",
            "arguments": {"address": address}
        }
    }).encode()
    
    req = urllib.request.Request(
        session_url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    resp = urllib.request.urlopen(req, timeout=60)
    # Read SSE response
    result = ""
    for line in resp:
        decoded = line.decode()
        if decoded.startswith("data:"):
            data = decoded[5:].strip()
            if data:
                result = data
                break
    return result

def main():
    addresses = sys.argv[1:]
    if not addresses:
        print("Usage: mcp_client.py <address> [address2 ...]")
        sys.exit(1)
    
    # Connect and keep SSE alive
    sse_resp, session_url = connect_sse()
    print(f"Connected. Session: {session_url}", file=sys.stderr)
    
    # Keep SSE alive in background
    def keep_alive():
        try:
            for line in sse_resp:
                pass
        except:
            pass
    t = threading.Thread(target=keep_alive, daemon=True)
    t.start()
    
    # Decompile each address
    for addr in addresses:
        try:
            result = decompile(session_url, addr)
            print(f"=== {addr} ===")
            print(result)
        except Exception as e:
            print(f"=== {addr} === ERROR: {e}", file=sys.stderr)

if __name__ == "__main__":
    main()
