"""
Decompile CUISkill::Draw from IDA MCP server via SSE protocol.
"""
import json
import time
import requests
import sseclient  # pip install sseclient-py
import sys

MCP_HOST = "127.0.0.1"
MCP_PORT = 13337
ADDR = "0x84ed90"
OUT_FILE = r"C:\Users\jorge\OneDrive\Desktop\ts\ida_output\cuiskill_Draw_pure.txt"

# Step 1: Connect to SSE to get session endpoint
print("Step 1: Connecting to SSE...", file=sys.stderr)
sse_url = f"http://{MCP_HOST}:{MCP_PORT}/sse"

# Use streaming to capture the endpoint
resp = requests.get(sse_url, stream=True, timeout=10)
session_endpoint = None

for line in resp.iter_lines(decode_unicode=True):
    print(f"SSE line: {line}", file=sys.stderr)
    if line and line.startswith("data:"):
        session_endpoint = line[len("data:"):].strip()
        print(f"Session endpoint: {session_endpoint}", file=sys.stderr)
        break

if not session_endpoint:
    print("ERROR: No session endpoint found", file=sys.stderr)
    sys.exit(1)

# Step 2: POST the decompile request
post_url = f"http://{MCP_HOST}:{MCP_PORT}{session_endpoint}"
print(f"Step 2: POSTing to {post_url}", file=sys.stderr)

rpc_id = 1
payload = {
    "jsonrpc": "2.0",
    "id": rpc_id,
    "method": "tools/call",
    "params": {
        "name": "decompile",
        "arguments": {"addr": ADDR}
    }
}

# Fire the POST request - response might come via SSE or as POST response
try:
    post_resp = requests.post(post_url, json=payload, timeout=10)
    print(f"POST status: {post_resp.status_code}", file=sys.stderr)
    print(f"POST body: {post_resp.text[:500]}", file=sys.stderr)
except Exception as e:
    print(f"POST error: {e}", file=sys.stderr)

# Step 3: Read the SSE response from the original connection
print("Step 3: Reading SSE response...", file=sys.stderr)
start = time.time()
TIMEOUT = 600

code = None
for line in resp.iter_lines(decode_unicode=True):
    elapsed = time.time() - start
    if elapsed > TIMEOUT:
        print("SSE timeout", file=sys.stderr)
        break
    
    if line and line.startswith("data:"):
        data = line[len("data:"):].strip()
        if data:
            print(f"SSE data ({len(data)} chars): {data[:200]}...", file=sys.stderr)
            try:
                parsed = json.loads(data)
                if "result" in parsed:
                    result = parsed["result"]
                    if isinstance(result, dict) and "content" in result:
                        for item in result["content"]:
                            if item.get("type") == "text":
                                code = item["text"]
                                break
                    elif isinstance(result, str):
                        code = result
                    elif isinstance(result, dict) and "code" in result:
                        code = result["code"]
                    
                    if code:
                        print(f"Got code: {len(code)} chars", file=sys.stderr)
                        break
            except json.JSONDecodeError:
                pass

if code:
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write(code)
    print(f"SUCCESS: Wrote {len(code)} chars to {OUT_FILE}")
else:
    print("FAILED: No code received", file=sys.stderr)
    sys.exit(1)
