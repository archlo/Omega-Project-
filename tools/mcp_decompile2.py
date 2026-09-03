"""
MCP client for IDA decompilation via SSE protocol.
Keeps SSE connection alive in background thread while making POST requests.
"""
import sys
import json
import urllib.request
import threading
import queue
import time

MCP_BASE = "http://127.0.0.1:13337"

def sse_listener(sse_url, result_queue):
    """Keep SSE connection alive and put results in queue."""
    try:
        req = urllib.request.Request(sse_url)
        resp = urllib.request.urlopen(req, timeout=300)
        for line in resp:
            decoded = line.decode().strip()
            if decoded.startswith("data:"):
                data = decoded[5:].strip()
                if data:
                    result_queue.put(data)
    except Exception as e:
        result_queue.put(json.dumps({"error": str(e)}))

def decompile(address, session_id):
    """Decompile one function via MCP."""
    session_url = f"{MCP_BASE}/sse?session={session_id}"
    
    # Start SSE listener in background
    result_queue = queue.Queue()
    sse_thread = threading.Thread(target=sse_listener, args=(session_url, result_queue), daemon=True)
    sse_thread.start()
    time.sleep(0.5)  # Let SSE connect
    
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
    
    req = urllib.request.Request(
        session_url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        resp = urllib.request.urlopen(req, timeout=120)
        resp.read()  # Consume POST response
    except Exception as e:
        return {"error": f"POST failed: {e}"}
    
    # Wait for result
    try:
        result = result_queue.get(timeout=60)
        return json.loads(result) if isinstance(result, str) else result
    except queue.Empty:
        return {"error": "Timeout waiting for result"}

def main():
    if len(sys.argv) < 2:
        print("Usage: mcp_decompile2.py <addr> [addr2 ...]")
        sys.exit(1)
    
    # Get fresh session
    sse_resp = urllib.request.urlopen(f"{MCP_BASE}/sse", timeout=10)
    session_url = None
    for line in sse_resp:
        decoded = line.decode().strip()
        if decoded.startswith("data:"):
            session_url = decoded[5:].strip()
            break
    sse_resp.close()
    
    if not session_url:
        print("Failed to get session", file=sys.stderr)
        sys.exit(1)
    
    # Extract session ID
    session_id = session_url.split("session=")[1]
    print(f"Session: {session_id}", file=sys.stderr)
    
    # Decompile each address
    for addr in sys.argv[1:]:
        result = decompile(addr, session_id)
        print(f"=== {addr} ===")
        # Extract pseudocode from result
        if isinstance(result, dict) and "result" in result:
            content = result.get("result", {}).get("content", [])
            for item in content:
                if item.get("type") == "text":
                    print(item.get("text", ""))
        else:
            print(json.dumps(result, indent=2))
        print()

if __name__ == "__main__":
    main()
