const http = require('http');
const fs = require('fs');
const path = require('path');

const ADDR = process.argv[2] || '0x893f60';
const OUT = process.argv[3] || path.join(__dirname, 'cuitooltip_DrawToolTip_Equip.txt');

async function main() {
    let sessionUrl = null;
    let sseRes = null;
    let sseBuffer = '';
    
    // Connect to SSE and keep alive
    const ssePromise = new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:13337/sse', { timeout: 60000 }, (res) => {
            sseRes = res;
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                sseBuffer += chunk;
                console.error('SSE chunk: ' + chunk.substring(0, 200));
                const m = sseBuffer.match(/data:\s*(\/sse\?session=[^\n]+)/);
                if (m && !sessionUrl) {
                    sessionUrl = m[1].trim();
                    console.error('Got session: ' + sessionUrl);
                    resolve();
                }
            });
            res.on('error', (e) => { console.error('SSE error: ' + e.message); reject(e); });
            res.on('end', () => { console.error('SSE stream ended'); });
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('SSE timeout')); });
        req.on('error', reject);
    });

    await ssePromise;
    
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
            req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')); });
            req.write(payload);
            req.end();
        });
    }

    // Open DB
    console.error('Opening DB...');
    const openPayload = JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'idalib_open',arguments:{session_id:'v95',run_auto_analysis:false}}});
    const openResp = await postMsg(sessionUrl, openPayload);
    console.error('Open POST returned: ' + openResp.substring(0, 200));
    
    // Wait for SSE response
    const waitForSSE = (timeout) => new Promise((resolve) => {
        const start = Date.now();
        const check = () => {
            // Check if buffer has new content
            const lines = sseBuffer.split('\n\n');
            for (const line of lines) {
                if (line.includes('"id":1') || line.includes('"result"') || line.includes('"error"')) {
                    resolve(line);
                    return;
                }
            }
            if (Date.now() - start > timeout) { resolve(null); return; }
            setTimeout(check, 200);
        };
        check();
    });
    
    console.error('Waiting for DB open response...');
    const sseResp1 = await waitForSSE(10000);
    console.error('SSE response for open: ' + (sseResp1 || 'timeout').substring(0, 500));
    
    // Now decompile
    console.error('Decompiling ' + ADDR + '...');
    const decompPayload = JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'decompile',arguments:{addr:ADDR}}});
    const decompResp = await postMsg(sessionUrl, decompPayload);
    console.error('Decompile POST returned: ' + decompResp.substring(0, 200));
    
    // Wait for SSE response
    console.error('Waiting for decompile response...');
    const sseResp2 = await waitForSSE(15000);
    console.error('SSE response for decompile: ' + (sseResp2 || 'timeout').substring(0, 500));
    
    if (sseRes) sseRes.destroy();
    process.exit(0);
}

main().catch(e => { console.error('Fatal: ' + e.message); process.exit(1); });
