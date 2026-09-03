#!/usr/bin/env python3
"""Decompile remaining CUtilDlgEx utility methods."""

import http.client
import json
import sys
import time
import os
import threading

MCP_HOST = "127.0.0.1"
MCP_PORT = 13337
OUTPUT_DIR = r"C:\Users\jorge\OneDrive\Desktop\ts\ida_output"


class MCPClient:
    def __init__(self):
        self.session_id = None
        self.sse_conn = None
        self.response_buffer = []
        self.buffer_lock = threading.Lock()
        self.running = True

    def connect_sse(self):
        self.sse_conn = http.client.HTTPConnection(MCP_HOST, MCP_PORT, timeout=120)
        self.sse_conn.request("GET", "/sse", headers={
            "Accept": "text/event-stream",
            "Cache-Control": "no-cache"
        })
        resp = self.sse_conn.getresponse()
        buf = ""
        while self.running:
            chunk = resp.read(1)
            if not chunk:
                break
            buf += chunk.decode("utf-8", errors="replace")
            while "\n" in buf:
                line, buf = buf.split("\n", 1)
                line = line.strip()
                if line.startswith("data:"):
                    data = line[5:].strip()
                    if "/sse?session=" in data:
                        self.session_id = data.split("session=")[1]
                        continue
                    if self.session_id:
                        with self.buffer_lock:
                            self.response_buffer.append(data)

    def start(self):
        t = threading.Thread(target=self.connect_sse, daemon=True)
        t.start()
        for _ in range(50):
            if self.session_id:
                return True
            time.sleep(0.1)
        return False

    def rpc(self, method, params=None, timeout=120):
        payload = {"jsonrpc": "2.0", "id": "1", "method": method}
        if params is not None:
            payload["params"] = params
        url = f"/sse?session={self.session_id}"
        conn = http.client.HTTPConnection(MCP_HOST, MCP_PORT, timeout=60)
        conn.request("POST", url, body=json.dumps(payload),
                     headers={"Content-Type": "application/json"})
        resp = conn.getresponse()
        resp.read()
        conn.close()
        deadline = time.time() + timeout
        while time.time() < deadline:
            with self.buffer_lock:
                if self.response_buffer:
                    data = self.response_buffer.pop(0)
                    try:
                        obj = json.loads(data)
                        if "result" in obj or "error" in obj:
                            return obj
                    except json.JSONDecodeError:
                        pass
            time.sleep(0.1)
        return {"error": "timeout"}

    def decompile(self, address):
        result = self.rpc("tools/call", {
            "name": "decompile",
            "arguments": {"addr": address, "include_addresses": True}
        }, timeout=120)
        if "error" in result:
            return None, str(result["error"])
        res = result.get("result", {})
        content = res.get("content", [])
        if content:
            for item in content:
                if isinstance(item, dict) and item.get("type") == "text":
                    text = item["text"]
                    try:
                        parsed = json.loads(text)
                        if isinstance(parsed, dict) and "code" in parsed:
                            code = parsed["code"]
                            refs = parsed.get("refs", [])
                            lines = [code]
                            if refs:
                                lines.append("\n// References:")
                                for ref in refs:
                                    s = ref.get("string", "")
                                    lines.append(f"//   {ref.get('name','?')} @ {ref.get('addr','?')}"
                                                + (f'  "{s}"' if s else ""))
                            return "\n".join(lines), None
                    except json.JSONDecodeError:
                        pass
                    return text, None
        return None, "No code in response"


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    client = MCPClient()
    if not client.start():
        print("Failed to connect to MCP", file=sys.stderr)
        sys.exit(1)

    # Remaining important methods
    functions = [
        ("0x97e5d0", "CheckMousePoint"),
        ("0x97b990", "ForcedRet"),
        ("0x97aee0", "GetBasicCTMargin"),
        ("0x97add0", "GetBasicCTWidth"),
        ("0x97ae40", "GetCTHeight_Max"),
        ("0x97ae90", "GetCTHeight_Min"),
        ("0x8706b0", "GetComboBoxStr"),
        ("0x51e680", "GetInputStr_Result"),
        ("0x97ada0", "GetWndHeight"),
        ("0x97ad40", "GetWndWidth"),
        ("0x97b020", "HitTest"),
        ("0x97b060", "Layout_GEN"),
        ("0x97b1a0", "Layout_INPUT"),
        ("0x97b230", "Layout_MLINPUT"),
        ("0x981e10", "MakeAvatar"),
        ("0x982280", "MakeImage"),
        ("0x97c330", "MakePet"),
        ("0x97dd70", "MakeUOLByUIType"),
        ("0x97afb0", "OnChildNotify"),
        ("0x97af40", "OnDestroy"),
        ("0x982f30", "OnMouseButton"),
        ("0x97af90", "OnMouseEnter"),
        ("0x983060", "OnMouseMove"),
        ("0x97c290", "SetAvatar"),
        ("0x97b7c0", "SetKeyFocus"),
        ("0x983150", "SetUtilDlgEx_COMBOBOX"),
        ("0x97b450", "SetUtilDlgEx_IMAGE"),
        ("0x97daa0", "SetUtilDlgEx_INPUT_MLSTR"),
        ("0x983080", "SetUtilDlgEx_INPUT_NO"),
        ("0x97da50", "SetUtilDlgEx_INPUT_STR"),
        ("0x97e830", "SetUtilDlgEx_LIST"),
        ("0x987b60", "SetUtilDlgEx_Pet"),
        ("0x97b420", "SetUtilDlgEx_TEXT"),
        ("0x97b480", "SetUtilDlgEx_YESNO"),
        ("0x97b3c0", "Update"),
        ("0x9852e0", "UpdateImage"),
        ("0x97b670", "ValidateScroll"),
        ("0x9859c0", "CUtilDlgEx_constructor"),
        ("0x986880", "destructor"),
        ("0x986860", "ClearToolTip"),
        ("0x98efc0", "ApplyComboBoxItemList"),
        ("0x6dc0a0", "AddImageList"),
        ("0x97dae0", "SetUtilDlgEx_AVATAR"),
    ]

    if len(sys.argv) > 1:
        functions = [(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "func")]

    for addr, name in functions:
        outpath = os.path.join(OUTPUT_DIR, f"cutildlgex_{name}_clean.txt")
        if os.path.exists(outpath):
            print(f"SKIP {name} (already exists)", flush=True)
            continue
        print(f"--- {name} @ {addr} ---", flush=True)
        code, error = client.decompile(addr)
        with open(outpath, "w", encoding="utf-8") as f:
            f.write(f"// CUtilDlgEx::{name}\n// Address: {addr}\n\n")
            if error:
                f.write(f"// ERROR: {error}\n")
                print(f"  ERROR: {error}")
            else:
                f.write(code)
                print(f"  OK ({len(code)} chars)")
        time.sleep(0.5)

    print("\nDone!")


if __name__ == "__main__":
    main()
