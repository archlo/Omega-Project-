"""
MCP client - simplest possible approach.
Uses subprocess to keep SSE alive while POSTing.
"""
import sys
import json
import subprocess
import time
import tempfile
import os

MCP_BASE = "http://127.0.0.1:13337"

def decompile_one(address):
    """Decompile one function using curl subprocess."""
    # Step 1: Get session
    result = subprocess.run(
        ["curl.exe", "-s", f"{MCP_BASE}/sse"],
        capture_output=True, text=True, timeout=10
    )
    for line in result.stdout.split("\n"):
        if line.startswith("data:"):
            session_path = line[5:].strip()
            break
    else:
        return {"error": "No session"}
    
    session_url = f"{MCP_BASE}{session_path}"
    
    # Step 2: Start curl in background reading SSE
    sse_proc = subprocess.Popen(
        ["curl.exe", "-s", "-N", session_url],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    time.sleep(0.5)
    
    # Step 3: POST decompile request
    body = json.dumps({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "decompile",
            "arguments": {"address": address}
        }
    })
    
    post_result = subprocess.run(
        ["curl.exe", "-s", "-X", "POST", "-H", "Content-Type: application/json",
         "-d", body, session_url],
        capture_output=True, text=True, timeout=30
    )
    
    # Step 4: Read SSE response
    time.sleep(2)
    sse_output = ""
    # Read what's available from SSE
    import select
    if select.select([sse_proc.stdout], [], [], 5)[0]:
        sse_output = sse_proc.stdout.read1(65536).decode()
    
    sse_proc.terminate()
    
    # Parse SSE
    for line in sse_output.split("\n"):
        if line.startswith("data:"):
            data = line[5:].strip()
            if data:
                try:
                    return json.loads(data)
                except:
                    pass
    
    return {"error": "No SSE response", "post": post_result.stdout[:200]}

def main():
    for addr in sys.argv[1:]:
        result = decompile_one(addr)
        print(f"=== {addr} ===")
        if isinstance(result, dict) and "result" in result:
            content = result.get("result", {}).get("content", [])
            for item in content:
                if item.get("type") == "text":
                    print(item.get("text", ""))
        else:
            print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
