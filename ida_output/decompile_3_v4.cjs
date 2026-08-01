const http = require('http');
const fs = require('fs');
const path = require('path');

const MCP_HOST = '127.0.0.1';
const MCP_PORT = 13337;
const OUT_DIR = __dirname;

const TARGETS = [
  { addr: '0x8a2500', name: 'SetToolTip_Skill' },
  { addr: '0x898700', name: 'SetToolTip_Pet' },
  { addr: '0x8a3460', name: 'SetToolTip_Ring' },
];

// Single SSE connection that stays alive for all requests
class McpClient {
    constructor() {
        this.sessionUrl = null;
        this.buffer = '';
        this.pendingRequests = new Map(); // id -> { resolve, reject, timer }
        this.requestId = 0;
    }
    
    connect() {
        return new Promise((resolve, reject) => {
            const req = http.get(`http://${MCP_HOST}:${MCP_PORT}/sse`, { timeout: 60000 }, (res) => {
                this.stream = res;
                res.on('data', (chunk) => {
                    this.buffer += chunk.toString();
                    this._processBuffer();
                });
                res.on('end', () => console.error('SSE stream ended'));
                res.on('error', (err) => console.error('SSE error:', err.message));
            });
            req.on('timeout', () => { req.destroy(); reject(new Error('SSE timeout')); });
            req.on('error', reject);
            
            // Wait for session URL
            this._sessionResolve = resolve;
        });
    }
    
    _processBuffer() {
        while (true) {
            const idx = this.buffer.indexOf('\n\n');
            if (idx < 0) break;
            const message = this.buffer.substring(0, idx);
            this.buffer = this.buffer.substring(idx + 2);
            
            const dataMatch = message.match(/data:\s*(.+)/);
            if (!dataMatch) continue;
            const text = dataMatch[1].trim();
            
            // Session endpoint check first (not JSON)
            if (text.startsWith('/sse?')) {
                this.sessionUrl = text;
                console.error('Session URL: ' + this.sessionUrl);
                if (this._sessionResolve) {
                    this._sessionResolve();
                    this._sessionResolve = null;
                }
                continue;
            }
            
            try {
                const parsed = JSON.parse(text);
                
                // Tool result
                if (parsed.id && this.pendingRequests.has(parsed.id)) {
                    const pending = this.pendingRequests.get(parsed.id);
                    this.pendingRequests.delete(parsed.id);
                    clearTimeout(pending.timer);
                    pending.resolve(parsed);
                }
            } catch (e) {
                // Not JSON
            }
        }
    }
    
    call(name, args, timeoutMs = 30000) {
        return new Promise((resolve, reject) => {
            const id = ++this.requestId;
            const timer = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`Timeout calling ${name}`));
            }, timeoutMs);
            
            this.pendingRequests.set(id, { resolve, reject, timer });
            
            const postData = JSON.stringify({
                jsonrpc: '2.0', id,
                method: 'tools/call',
                params: { name, arguments: args }
            });
            
            const req = http.request({
                hostname: MCP_HOST, port: MCP_PORT,
                path: this.sessionUrl, method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            }, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    // POST response is just an echo; real result comes via SSE
                    // console.error('  POST echo: ' + body.length + ' chars');
                });
            });
            req.on('error', (err) => {
                this.pendingRequests.delete(id);
                clearTimeout(timer);
                reject(err);
            });
            req.write(postData);
            req.end();
        });
    }
    
    disconnect() {
        if (this.stream) this.stream.destroy();
    }
}

async function main() {
    console.error('Connecting...');
    const client = new McpClient();
    await client.connect();
    console.error('Connected. Session: ' + client.sessionUrl);
    
    for (const target of TARGETS) {
        console.error('\nDecompiling ' + target.name + ' at ' + target.addr + '...');
        try {
            const result = await client.call('decompile', { addr: target.addr }, 30000);
            
            if (result && result.result && result.result.content) {
                const textItem = result.result.content.find(c => c.type === 'text');
                if (textItem) {
                    const parsed = JSON.parse(textItem.text);
                    const outFile = path.join(OUT_DIR, 'cuitooltip_' + target.name.toLowerCase() + '_decompiled.json');
                    fs.writeFileSync(outFile, JSON.stringify(parsed, null, 2), 'utf8');
                    console.error('  OK: ' + (parsed.code ? parsed.code.length : 0) + ' chars');
                    
                    const cleanFile = path.join(OUT_DIR, 'cuitooltip_' + target.name.toLowerCase() + '_decompiled.txt');
                    fs.writeFileSync(cleanFile, parsed.code || '', 'utf8');
                    console.error('  Saved: ' + target.name);
                }
            } else if (result && result.error) {
                console.error('  ERROR: ' + JSON.stringify(result.error));
            } else {
                console.error('  FAILED');
            }
        } catch (e) { console.error('  ERROR: ' + e.message); }
        
        await new Promise(r => setTimeout(r, 300));
    }
    
    client.disconnect();
    console.log('DONE');
    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });