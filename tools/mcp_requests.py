"""
MCP client using requests - handles SSE + POST properly.
"""
import json
import requests
import sys
import re
import time

MCP_BASE = "http://127.0.0.1:13337"

def decompile(address):
    """Decompile a function using the IDA MCP server."""
    # Step 1: Connect to SSE to get session
    sse_resp = requests.get(f"{MCP_BASE}/sse", stream=True, timeout=30)
    
    session_url = None
    for line in sse_resp.iter_lines(decode_unicode=True):
        if line and line.startswith("data:"):
            session_url = MCP_BASE + line[5:].strip()
            break
    
    if not session_url:
        return {"error": "No session URL received"}
    
    print(f"Session: {session_url}", file=sys.stderr)
    
    # Step 2: POST decompile request
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "decompile",
            "arguments": {"address": address}
        }
    }
    
    resp = requests.post(session_url, json=payload, timeout=120)
    
    # The response should be SSE events
    result_text = resp.text
    print(f"Response length: {len(result_text)}", file=sys.stderr)
    
    # Parse SSE from response
    for line in result_text.split("\n"):
        if line.startswith("data:"):
            data = line[5:].strip()
            if data:
                try:
                    obj = json.loads(data)
                    if "result" in obj:
                        content = obj["result"].get("content", [])
                        for item in content:
                            if item.get("type") == "text":
                                return item["text"]
                except:
                    pass
    
    return {"error": "No valid response", "raw": result_text[:2000]}

def main():
    if len(sys.argv) < 2:
        print("Usage: mcp_requests.py <address>")
        sys.exit(1)
    
    addr = sys.argv[1]
    result = decompile(addr)
    
    if isinstance(result, str):
        # Try to parse as JSON containing code
        try:
            inner = json.loads(result)
            code = inner.get("code", "")
            code = code.replace("\\n", "\n").replace("\\t", "\t")
            code = re.sub(r'/\*0x[0-9a-f]+\*/', '', code)
            print(code)
        except:
            print(result)
    else:
        print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
