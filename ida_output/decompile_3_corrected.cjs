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

function connectSSE() {
    return new Promise((resolve, reject) => {
        const req = http.get(`http://${MCP_HOST}:${MCP_PORT}/sse`, { timeout: 30000 }, (res) => {
            let buffer = '';
            res.on('data', (chunk) => {
                buffer += chunk.toString();
                const match = buffer.match(/data:\s*(\/sse\?session=[^\n]+)/);
                if (match) {
                    resolve({ stream: res, sessionUrl: match[1].trim() });
                }
            });
            res.on('error', reject);
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('SSE timeout')); });
        req.on('error', reject);
    });
}

function decompile(sessionUrl, addr) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            jsonrpc: '2.0', id: 1,
            method: 'tools/call',
            params: { name: 'decompile', arguments: { addr } }
        });
        
        const req = http.request({
            hostname: MCP_HOST, port: MCP_PORT,
            path: sessionUrl, method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve(body));
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

function waitForResult(stream, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        let buffer = '';
        let resolved = false;
        const timer = setTimeout(() => {
            if (!resolved) { resolved = true; reject(new Error('Timeout waiting for SSE result')); }
        }, timeoutMs);
        
        const handler = (chunk) => {
            if (resolved) return;
            buffer += chunk.toString();
            // Look for a complete SSE message with jsonrpc result
            const messages = buffer.split('\n\n');
            for (let i = 0; i < messages.length - 1; i++) {
                const msg = messages[i];
                const dataMatch = msg.match(/data:\s*(.+)/);
                if (dataMatch) {
                    try {
                        const parsed = JSON.parse(dataMatch[1]);
                        if (parsed.result || parsed.error) {
                            resolved = true;
                            clearTimeout(timer);
                            stream.removeListener('data', handler);
                            resolve(parsed);
                            return;
                        }
                    } catch (e) { /* not JSON yet */ }
                }
            }
            // Keep only incomplete data
            const lastIdx = buffer.lastIndexOf('\n\n');
            if (lastIdx >= 0) buffer = buffer.substring(lastIdx + 2);
        };
        
        stream.on('data', handler);
    });
}

async function main() {
    console.error('Connecting...');
    const { stream, sessionUrl } = await connectSSE();
    console.error('Session: ' + sessionUrl);
    
    for (const target of TARGETS) {
        console.error('\nDecompiling ' + target.name + ' at ' + target.addr + '...');
        try {
            // Send the request
            const postResp = await decompile(sessionUrl, target.addr);
            console.error('  POST status: ' + postResp.length + ' chars');
            
            // Wait for SSE result
            const result = await waitForResult(stream, 20000);
            
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
                console.error('  FAILED: unexpected response');
            }
        } catch (e) { console.error('  ERROR: ' + e.message); }
        
        await new Promise(r => setTimeout(r, 500));
    }
    
    stream.destroy();
    console.log('DONE');
    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });