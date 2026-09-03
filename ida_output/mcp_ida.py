#!/usr/bin/env python3
"""MCP client for IDA decompilation via ida-pro/idalib SSE endpoint."""

import urllib.request
import json
import sys
import time
import uuid
import threading

MCP_BASE = "http://127.0.0.1:13337"

def get_session_and_endpoint():
    """Connect to SSE and get the session + message endpoint URL."""
    req = urllib.request.Request(f"{MCP_BASE}/sse", headers={"Accept": "text/event-stream"})
    response = urllib.request.urlopen(req, timeout=15)
    buffer = b""
    while True:
        chunk = response.read(1)
        if not chunk:
            break
        buffer += chunk
        if buffer.endswith(b"\n\n"):
            decoded = buffer.decode("utf-8").strip()
            buffer = b""
            for line in decoded.split("\n"):
                if line.startswith("data:"):
                    data = line[5:].strip()
                    if data.startswith("/") or "session" in data:
                        return response, data
            break
    return None, None


def mcp_call_raw(endpoint_url, method, params=None):
    """Send a JSON-RPC request to the MCP endpoint."""
    url = f"{MCP_BASE}{endpoint_url}" if endpoint_url.startswith("/") else endpoint_url
    payload = {
        "jsonrpc": "2.0",
        "id": str(uuid.uuid4()),
        "method": method,
        "params": params or {}
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        resp = urllib.request.urlopen(req, timeout=300)
        return resp.read().decode("utf-8")
    except Exception as e:
        return f"ERROR: {e}"


def mcp_call_and_read_response(endpoint_url, method, params=None):
    """Send request and read the response from SSE stream."""
    # Start SSE listener in background
    results = []
    done = threading.Event()
    
    def sse_listener(response):
        buffer = b""
        while not done.is_set():
            try:
                chunk = response.read(1)
                if not chunk:
                    break
                buffer += chunk
                if buffer.endswith(b"\n\n"):
                    decoded = buffer.decode("utf-8").strip()
                    buffer = b""
                    # Check if this is a message event (contains our response)
                    for line in decoded.split("\n"):
                        if line.startswith("data:"):
                            data = line[5:].strip()
                            try:
                                obj = json.loads(data)
                                if "result" in obj or "error" in obj:
                                    results.append(obj)
                                    done.set()
                                    return
                            except json.JSONDecodeError:
                                pass
            except Exception as e:
                break
    
    # Get SSE connection
    sse_req = urllib.request.Request(f"{MCP_BASE}/sse", headers={"Accept": "text/event-stream"})
    sse_resp = urllib.request.urlopen(sse_req, timeout=15)
    
    # Read endpoint
    buffer = b""
    endpoint = None
    while True:
        chunk = sse_resp.read(1)
        if not chunk:
            break
        buffer += chunk
        if buffer.endswith(b"\n\n"):
            decoded = buffer.decode("utf-8").strip()
            buffer = b""
            for line in decoded.split("\n"):
                if line.startswith("data:"):
                    data = line[5:].strip()
                    if data.startswith("/"):
                        endpoint = data
                        break
            if endpoint:
                break
    
    if not endpoint:
        return {"error": "No endpoint found"}
    
    # Start SSE listener thread
    t = threading.Thread(target=sse_listener, args=(sse_resp,), daemon=True)
    t.start()
    
    # Send the request
    url = f"{MCP_BASE}{endpoint}"
    payload = {
        "jsonrpc": "2.0",
        "id": "1",
        "method": method,
        "params": params or {}
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    
    try:
        resp = urllib.request.urlopen(req, timeout=300)
        print(f"POST response status: {resp.status}")
    except Exception as e:
        print(f"POST error: {e}")
    
    # Wait for SSE response
    done.wait(timeout=300)
    done.set()
    
    if results:
        return results[0]
    return {"error": "No response received"}


def main():
    action = sys.argv[1] if len(sys.argv) > 1 else "list_tools"
    
    if action == "list_tools":
        result = mcp_call_and_read_response(None, "tools/list")
        print(json.dumps(result, indent=2))
    
    elif action == "decompile":
        addr = sys.argv[2] if len(sys.argv) > 2 else "0x97af20"
        result = mcp_call_and_read_response(None, "tools/call", {
            "name": "decompile",
            "arguments": {"address": addr}
        })
        print(json.dumps(result, indent=2))
    
    elif action == "py_eval":
        code = sys.argv[2] if len(sys.argv) > 2 else "print('hello')"
        result = mcp_call_and_read_response(None, "tools/call", {
            "name": "py_eval",
            "arguments": {"code": code}
        })
        print(json.dumps(result, indent=2))
    
    elif action == "get_func_addr":
        name = sys.argv[2] if len(sys.argv) > 2 else ""
        result = mcp_call_and_read_response(None, "tools/call", {
            "name": "get_func_addr",
            "arguments": {"name": name}
        })
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
