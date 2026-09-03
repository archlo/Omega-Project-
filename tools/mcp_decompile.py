"""
MCP client for decompilation via SSE protocol.
Keeps SSE connection alive while making requests.
"""
import sys
import json
import urllib.request
import threading
import time
import io

MCP_BASE = "http://127.0.0.1:13337"

def mcp_decompile(address):
    """Connect, decompile one address, return result."""
    # Start SSE connection
    req = urllib.request.Request(f"{MCP_BASE}/sse")
    resp = urllib.request.urlopen(req, timeout=30)
    
    # Read session URL
    session_url = None
    for line in resp:
        decoded = line.decode().strip()
        if decoded.startswith("data:"):
            session_url = decoded[6:].strip()
            break
    
    if not session_url:
        resp.close()
        return {"error": "No session URL"}
    
    full_url = f"{MCP_BASE}{session_url}"
    
    # Send decompile request
    body = json.dumps({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "decompile",
            "arguments": {"address": address}
        }
    }).encode()
    
    req2 = urllib.request.Request(
        full_url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    # Read response
    result_lines = []
    resp2 = urllib.request.urlopen(req2, timeout=120)
    
    # Keep reading SSE events until we get the result
    got_result = False
    buffer = ""
    for line in resp2:
        decoded = line.decode()
        buffer += decoded
        if decoded.startswith("data:") and not got_result:
            data = decoded[5:].strip()
            if data:
                try:
                    result = json.loads(data)
                    resp.close()
                    resp2.close()
                    return result
                except json.JSONDecodeError:
                    pass
    
    resp.close()
    resp2.close()
    return {"error": "No result received"}

def main():
    addresses = sys.argv[1:]
    if not addresses:
        print("Usage: mcp_decompile.py <addr1> [addr2 ...]")
        sys.exit(1)
    
    for addr in addresses:
        result = mcp_decompile(addr)
        print(f"=== {addr} ===")
        print(json.dumps(result, indent=2))
        print()

if __name__ == "__main__":
    main()
