const http = require('http');
const fs = require('fs');
const path = require('path');

const ADDR = process.argv[2] || '0x893f60';
const OUT = process.argv[3] || path.join(__dirname, 'cuitooltip_DrawToolTip_Equip.json');

async function main() {
    let sessionUrl = null;
    let sseBuffer = '';
    const responses = {};
    
    const ssePromise = new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:13337/sse', { timeout: 60000 }, (res) => {
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                sseBuffer += chunk;
                // Parse complete SSE events
                let idx;
                while ((idx = sseBuffer.indexOf('\n\n')) !== -1) {
                    const evt = sseBuffer.substring(0, idx);
                    sseBuffer = sseBuffer.substring(idx + 2);
                    
                    const dataMatch = evt.match(/data:\s*(.+)/s);
                    if (dataMatch) {
                        try {
                            const data = JSON.parse(dataMatch[1]);
                            if (data.id !== undefined) {
                                responses[data.id] = data;
                                console.error('Got response id=' + data.id);
                            }
                        } catch(e) {}
                    }
                    
                    const endpointMatch = evt.match(/data:\s*(\/sse\?session=[^\n]+)/);
                    if (endpointMatch && !sessionUrl) {
                        sessionUrl = endpointMatch[1].trim();
                        console.error('Session: ' + sessionUrl);
                        resolve();
                    }
                }
            });
            res.on('error', reject);
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
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
            req.write(payload);
            req.end();
        });
    }

    function waitForResponse(id, timeout) {
        return new Promise((resolve) => {
            const start = Date.now();
            const check = () => {
                if (responses[id]) { resolve(responses[id]); return; }
                if (Date.now() - start > timeout) { resolve(null); return; }
                setTimeout(check, 100);
            };
            check();
        });
    }

    // Decompile
    console.error('Decompiling ' + ADDR + '...');
    const payload = JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'decompile',arguments:{addr:ADDR}}});
    await postMsg(sessionUrl, payload);
    
    const resp = await waitForResponse(1, 20000);
    if (resp && resp.result && resp.result.content) {
        for (const item of resp.result.content) {
            if (item.type === 'text') {
                fs.writeFileSync(OUT, item.text, 'utf8');
                console.error('Written to ' + OUT + ' (' + item.text.length + ' chars)');
            }
        }
    } else {
        console.error('No response received');
    }
    
    process.exit(0);
}

main().catch(e => { console.error('Fatal: ' + e.message); process.exit(1); });
