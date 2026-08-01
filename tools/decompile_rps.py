import requests
import json
import threading
import time
import sys

MCP_BASE = "http://127.0.0.1:13337"

def main():
    # Step 1: Connect to SSE and get session
    resp = requests.get(f"{MCP_BASE}/sse", stream=True, timeout=30)
    
    # Read first line to get session URL
    session_url = None
    for line in resp.iter_lines(decode_unicode=True):
        if line.startswith("data: /sse?session="):
            session_id = line.split("session=")[1]
            session_url = f"{MCP_BASE}/sse?session={session_id}"
            break
    
    if not session_url:
        print("Failed to get session URL", file=sys.stderr)
        sys.exit(1)
    
    print(f"Session: {session_url}")
    
    # Step 2: Send decompile request and read response
    def decompile(address, rid):
        body = {
            "jsonrpc": "2.0",
            "id": rid,
            "method": "tools/call",
            "params": {
                "name": "decompile",
                "arguments": {"address": address}
            }
        }
        r = requests.post(session_url, json=body, timeout=120)
        return r.status_code, r.text
    
    # Listen for responses in background
    def listen_responses():
        for line in resp.iter_lines(decode_unicode=True):
            if line.startswith("data: "):
                data_str = line[6:]
                try:
                    data = json.loads(data_str)
                    if "result" in data:
                        rid = data.get("id", "?")
                        content = data["result"].get("content", [])
                        for c in content:
                            if c.get("type") == "text":
                                print(f"=== Response {rid} ===")
                                print(c["text"][:80000])
                                print(f"=== END {rid} ===")
                                sys.stdout.flush()
                    elif "error" in data:
                        print(f"Error {data.get('id')}: {data['error']}", file=sys.stderr)
                        sys.stdout.flush()
                except json.JSONDecodeError:
                    pass
    
    t = threading.Thread(target=listen_responses, daemon=True)
    t.start()
    
    # Give SSE connection time to establish
    time.sleep(1)
    
    # Send all requests
    addresses = [
        ("0x6d7480", 1),   # OnCreate
        ("0x6d6f40", 2),   # OnButtonClicked
        ("0x6d6ae0", 3),   # SendSelection
        ("0x6d72d0", 4),   # ProcessPacket
        ("0x6d5e00", 5),   # Draw
        ("0x6d5350", 6),   # ShowResult
        ("0x6d9e00", 7),   # OnPacket
        ("0x6d70e0", 8),   # SetMainButton
        ("0x6d6ba0", 9),   # Constructor
        ("0x6d5fb0", 10),  # SetNpc
        ("0x6d6ff0", 11),  # SetUserAvatar
        ("0x6d8e80", 12),  # Update
        ("0x6d6900", 13),  # OnBtContinue
        ("0x6d6a40", 14),  # OnBtExit
        ("0x6d69a0", 15),  # OnBtRetry
        ("0x6d6860", 16),  # OnBtStart
    ]
    
    for addr, rid in addresses:
        try:
            status, text = decompile(addr, rid)
            print(f"Request {rid} ({addr}): status={status}", file=sys.stderr)
            sys.stderr.flush()
        except Exception as e:
            print(f"Request {rid} ({addr}): FAILED {e}", file=sys.stderr)
    
    # Wait for all responses
    print("Waiting for responses...", file=sys.stderr)
    time.sleep(180)

if __name__ == "__main__":
    main()
