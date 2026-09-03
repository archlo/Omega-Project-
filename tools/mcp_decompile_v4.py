"""
MCP client v4 - robust SSE handling with proper response parsing.
"""
import sys
import json
import urllib.request
import threading
import time
import re

MCP_BASE = "http://127.0.0.1:13337"

def connect_sse():
    """Connect to SSE endpoint and get session URL."""
    req = urllib.request.Request(f"{MCP_BASE}/sse")
    resp = urllib.request.urlopen(req, timeout=30)
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
    resp = urllib.request.urlopen(req, timeout=120)
    # Read the full response
    response_data = resp.read().decode()
    return response_data

def main():
    addresses = sys.argv[1:]
    if not addresses:
        print("Usage: mcp_decompile_v4.py <address>")
        sys.exit(1)
    
    sse_resp, session_url = connect_sse()
    print(f"Connected to {session_url}", file=sys.stderr)
    
    # Keep SSE alive
    def keep_alive():
        try:
            for line in sse_resp:
                pass
        except:
            pass
    t = threading.Thread(target=keep_alive, daemon=True)
    t.start()
    
    for addr in addresses:
        try:
            raw = decompile(session_url, addr)
            # Parse SSE lines
            for line in raw.split("\n"):
                if line.startswith("data:"):
                    data = line[5:].strip()
                    if data:
                        obj = json.loads(data)
                        if "result" in obj:
                            content = obj["result"].get("content", [])
                            for item in content:
                                if item.get("type") == "text":
                                    text = item["text"]
                                    # The text is JSON containing code
                                    try:
                                        inner = json.loads(text)
                                        code = inner.get("code", "")
                                        # Decode the escaped newlines
                                        code = code.replace("\\n", "\n").replace("\\t", "\t")
                                        # Remove address comments
                                        code = re.sub(r'/\*0x[0-9a-f]+\*/', '', code)
                                        print(code)
                                    except:
                                        print(text)
        except Exception as e:
            print(f"ERROR: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    main()
