#!/usr/bin/env python3
"""Decompile 4 CUser methods via IDA MCP SSE protocol."""
import json
import threading
import time
import requests
import sseclient
import sys
import os

MCP_URL = "http://127.0.0.1:13337/sse"

TARGETS = [
    ("CUser::SetCarryItemEffect", "0x930020", "cuser_SetCarryItemEffect_clean.txt"),
    ("CUser::ShowAffectedSkillAni", "0x92d010", "cuser_ShowAffectedSkillAni_clean.txt"),
    ("CUser::Update", "0x937330", "cuser_Update_clean.txt"),
    ("CUser::UpdateAffectedSkillList", "0x922540", "cuser_UpdateAffectedSkillList_clean.txt"),
]

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

def get_session_url():
    """Get SSE session URL from MCP server."""
    resp = requests.post(MCP_URL, stream=True, timeout=10)
    for line in resp.iter_lines(decode_unicode=True):
        if line and line.startswith("data: "):
            session_path = line[6:]
            if session_path.startswith("/"):
                session_path = session_path[1:]
            return f"http://127.0.0.1:13337/{session_path}"
    raise RuntimeError("No session URL received")


def decompile_one(session_url, name, addr, filename):
    """Decompile a single function via JSON-RPC over SSE."""
    pending = {}
    result_event = threading.Event()
    result_data = [None]

    def listen_sse():
        try:
            resp = requests.get(session_url, stream=True, timeout=300)
            for line in resp.iter_lines(decode_unicode=True):
                if not line:
                    continue
                if line.startswith("data: "):
                    data_str = line[6:]
                    try:
                        msg = json.loads(data_str)
                        if "id" in msg and msg["id"] in pending:
                            pending[msg["id"]].append(msg)
                            result_data[0] = msg
                            result_event.set()
                    except json.JSONDecodeError:
                        pass
        except Exception as e:
            print(f"  SSE listen error for {name}: {e}")

    # Start SSE listener thread
    t = threading.Thread(target=listen_sse, daemon=True)
    t.start()
    time.sleep(1)  # Let SSE connect

    # Send JSON-RPC request
    req_id = hash(name) % 100000
    pending[req_id] = []

    payload = {
        "jsonrpc": "2.0",
        "id": req_id,
        "method": "tools/call",
        "params": {
            "name": "decompile",
            "arguments": {"addr": addr}
        }
    }

    print(f"  Decompiling {name} @ {addr}...")
    resp = requests.post(session_url, json=payload, timeout=10)
    print(f"  POST status: {resp.status_code}")

    # Wait for result
    if result_event.wait(timeout=300):
        msg = result_data[0]
        if msg and "result" in msg:
            result = msg["result"]
            # Extract code from result
            code = ""
            if isinstance(result, dict):
                if "content" in result:
                    for item in result["content"]:
                        if item.get("type") == "text":
                            code = item.get("text", "")
                            break
                elif "code" in result:
                    code = result["code"]
            elif isinstance(result, str):
                code = result

            if code:
                filepath = os.path.join(OUTPUT_DIR, filename)
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(f"// {name} @ {addr}\n")
                    f.write(f"// Decompiled via IDA MCP\n\n")
                    f.write(code)
                print(f"  SUCCESS: {len(code)} chars -> {filename}")
                return True
            else:
                print(f"  WARNING: No code in result: {str(result)[:200]}")
        else:
            print(f"  ERROR: No result in message: {str(msg)[:200]}")
    else:
        print(f"  TIMEOUT waiting for {name}")

    return False


def main():
    print("=" * 60)
    print("CUser Method Decompile Retry")
    print("=" * 60)

    # Get session URL
    print("\nConnecting to IDA MCP server...")
    session_url = get_session_url()
    print(f"Session: {session_url}")

    results = {}
    for name, addr, filename in TARGETS:
        print(f"\n--- {name} ---")
        success = decompile_one(session_url, name, addr, filename)
        results[name] = success
        time.sleep(2)  # Brief pause between decompiles

    print("\n" + "=" * 60)
    print("Results:")
    for name, success in results.items():
        status = "OK" if success else "FAILED"
        print(f"  {name}: {status}")

    return 0 if all(results.values()) else 1


if __name__ == "__main__":
    sys.exit(main())
