const http = require('http');
const fs = require('fs');

const ADDR = '0x84ed90';
const OUT_FILE = __dirname + '/cuiskill_Draw_pure.txt';
const TIMEOUT_MS = 600000;

function postMessage(sessionUrl, payload) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: '127.0.0.1',
            port: 13337,
            path: sessionUrl,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let body = '';
            res.on('data', (c) => body += c);
            res.on('end', () => resolve(body));
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function main() {
    console.error('Connecting to SSE...');
    
    const sseRes = await new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:13337/sse', { timeout: 15000 }, (res) => {
            resolve(res);
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('SSE timeout')); });
        req.on('error', reject);
    });

    let sessionUrl = null;
    let sseBuffer = '';
    let done = false;

    sseRes.setEncoding('utf8');
    sseRes.on('data', (chunk) => {
        if (done) return;
        sseBuffer += chunk;
        processBuffer();
    });

    sseRes.on('end', () => {
        if (!done) {
            console.error('SSE ended without response');
            process.exit(1);
        }
    });

    function processBuffer() {
        // Process complete SSE events (separated by \n\n)
        while (true) {
            const eventEnd = sseBuffer.indexOf('\n\n');
            if (eventEnd === -1) break;
            
            const eventBlock = sseBuffer.slice(0, eventEnd);
            sseBuffer = sseBuffer.slice(eventEnd + 2);
            
            // Parse the event
            let eventType = '';
            let dataLines = [];
            for (const line of eventBlock.split('\n')) {
                if (line.startsWith('event: ')) {
                    eventType = line.slice(7).trim();
                } else if (line.startsWith('data: ')) {
                    dataLines.push(line.slice(6));
                }
            }
            
            const data = dataLines.join('\n');
            
            if (eventType === 'endpoint' && !sessionUrl) {
                sessionUrl = data.trim();
                console.error('Session: ' + sessionUrl);
                sendRequest();
            } else if (eventType === 'message' && data) {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.id === 1 && parsed.result) {
                        done = true;
                        handleResult(parsed);
                        return;
                    }
                } catch (e) {
                    // Not JSON yet
                }
            }
        }
    }

    async function sendRequest() {
        const payload = JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
                name: 'decompile',
                arguments: { addr: ADDR }
            }
        });
        
        console.error('POSTing decompile request...');
        const resp = await postMessage(sessionUrl, payload);
        console.error('POST response: ' + resp.slice(0, 100));
        console.error('Waiting for SSE response...');
    }

    function handleResult(parsed) {
        let code = '';
        if (parsed.result && parsed.result.content && Array.isArray(parsed.result.content)) {
            for (const item of parsed.result.content) {
                if (item.type === 'text') {
                    code = item.text;
                    break;
                }
            }
        }
        
        if (!code) {
            console.error('No code found. Result: ' + JSON.stringify(parsed).slice(0, 1000));
            process.exit(1);
        }
        
        // The code might be wrapped in JSON with addr field
        try {
            const inner = JSON.parse(code);
            if (inner.code) code = inner.code;
        } catch (e) {}
        
        // Unescape if needed
        if (code.includes('\\n')) {
            code = code.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        
        console.error('Code length: ' + code.length + ' chars');
        
        const output = '// CUISkill::Draw @ 0x84ed90\n// Decompiled from v95 IDB\n\n' + code;
        fs.writeFileSync(OUT_FILE, output, 'utf8');
        console.log('SUCCESS: Wrote ' + output.length + ' chars to ' + OUT_FILE);
        process.exit(0);
    }

    setTimeout(() => {
        if (!done) {
            console.error('Overall timeout');
            process.exit(1);
        }
    }, TIMEOUT_MS);
}

main().catch(e => { console.error('Fatal: ' + e.message); process.exit(1); });
