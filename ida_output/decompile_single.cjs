const http = require('http');
const fs = require('fs');
const path = require('path');

const ADDR = process.argv[2] || '0x893f60';
const OUT = process.argv[3] || path.join(__dirname, 'cuitooltip_DrawToolTip_Equip.txt');

function connectSSE() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:13337/sse', { timeout: 60000 }, (res) => {
            let buf = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                buf += chunk;
                const m = buf.match(/data:\s*(\/sse\?session=[^\n]+)/);
                if (m) resolve({ stream: res, sessionUrl: m[1].trim() });
            });
            res.on('error', reject);
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('SSE timeout')); });
        req.on('error', reject);
    });
}

function postMsg(url, payload) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: '127.0.0.1', port: 13337, path: url, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
        }, (res) => {
            let b = '';
            res.on('data', (c) => b += c);
            res.on('end', () => resolve(b));
        });
        req.on('error', reject);
        req.setTimeout(30000, () => { req.destroy(); reject(new Error('post timeout')); });
        req.write(payload);
        req.end();
    });
}

async function main() {
    const { stream, sessionUrl } = await connectSSE();
    console.error('Connected. Session: ' + sessionUrl);

    // Open DB first
    const openPayload = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'idalib_open', arguments: { session_id: 'v95', run_auto_analysis: false } } });
    console.error('Opening DB...');
    const openResp = await postMsg(sessionUrl, openPayload);
    console.error('Open: ' + openResp.substring(0, 200));
    
    // Small delay
    await new Promise(r => setTimeout(r, 1000));

    // Decompile
    const decompPayload = JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'decompile', arguments: { addr: ADDR } } });
    console.error('Decompiling ' + ADDR + '...');
    const decompResp = await postMsg(sessionUrl, decompPayload);
    
    // Parse and output
    try {
        const parsed = JSON.parse(decompResp);
        if (parsed.result && parsed.result.content) {
            for (const item of parsed.result.content) {
                if (item.type === 'text') {
                    const inner = JSON.parse(item.text);
                    if (inner.code) {
                        fs.writeFileSync(OUT, JSON.stringify(inner, null, 2), 'utf8');
                        console.error('Written ' + inner.code.length + ' chars to ' + OUT);
                    } else {
                        console.error('No code in response: ' + JSON.stringify(inner).substring(0, 300));
                    }
                }
            }
        } else {
            console.error('Unexpected response: ' + decompResp.substring(0, 500));
        }
    } catch (e) {
        console.error('Parse error: ' + e.message);
        console.error('Raw: ' + decompResp.substring(0, 500));
    }

    stream.destroy();
    process.exit(0);
}

main().catch(e => { console.error('Fatal: ' + e.message); process.exit(1); });
