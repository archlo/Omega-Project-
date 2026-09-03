const http = require('http');
const fs = require('fs');
const path = require('path');

const MCP_HOST = '127.0.0.1';
const MCP_PORT = 13337;
const OUT_DIR = __dirname;

const TARGETS = [
  { addr: '0x891c80', name: 'SetToolTip_ItemOption' },
  { addr: '0x89e1f0', name: 'SetToolTip_MacroSysSkill' },
  { addr: '0x89d5f0', name: 'SetToolTip_SlotInc' },
  { addr: '0x89dcf0', name: 'SetToolTip_EquipExt' },
];

function postMessage(sessionUrl, payload) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: MCP_HOST, port: MCP_PORT,
            path: sessionUrl, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve(body));
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

function connectSSE() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:13337/sse', { timeout: 30000 }, (res) => {
            let sseBuffer = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                sseBuffer += chunk;
                const match = sseBuffer.match(/data:\s*(\/sse\?session=[^\n]+)/);
                if (match) { resolve({ stream: res, sessionUrl: match[1].trim() }); }
            });
            res.on('error', reject);
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('SSE timeout')); });
        req.on('error', reject);
    });
}

async function decompile(sessionUrl, addr) {
    const payload = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'decompile', arguments: { addr } } });
    const response = await postMessage(sessionUrl, payload);
    try {
        const parsed = JSON.parse(response);
        if (parsed.result && parsed.result.content) {
            for (const item of parsed.result.content) {
                if (item.type === 'text') return JSON.parse(item.text);
            }
        }
    } catch (e) { console.error('decompile parse error:', e.message); }
    return null;
}

async function main() {
    console.error('Connecting...');
    const { stream, sessionUrl } = await connectSSE();
    console.error('Session: ' + sessionUrl);
    
    for (const target of TARGETS) {
        console.error('\nDecompiling ' + target.name + ' at ' + target.addr + '...');
        try {
            const result = await decompile(sessionUrl, target.addr);
            if (result) {
                const outFile = path.join(OUT_DIR, 'cuitooltip_' + target.name.toLowerCase() + '_new.txt');
                fs.writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf8');
                console.error('  OK: ' + (result.code ? result.code.length : 0) + ' chars');
                // Also write a clean text version
                const cleanFile = path.join(OUT_DIR, 'cuitooltip_' + target.name.toLowerCase() + '_clean.txt');
                fs.writeFileSync(cleanFile, result.code || '', 'utf8');
                console.error('  Clean: ' + cleanFile);
            } else {
                console.error('  FAILED');
            }
        } catch (e) { console.error('  ERROR: ' + e.message); }
        await new Promise(r => setTimeout(r, 500));
    }
    
    stream.destroy();
    console.log('DONE');
    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
