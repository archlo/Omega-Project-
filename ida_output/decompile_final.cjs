const http = require('http');
const fs = require('fs');

const MCP_HOST = '127.0.0.1';
const MCP_PORT = 13337;
const ADDR = '0x84ed90';
const OUT_FILE = __dirname + '/cuiskill_Draw_pure.txt';

function postMessage(sessionUrl, payload) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: MCP_HOST,
            port: MCP_PORT,
            path: sessionUrl,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
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

async function main() {
    // Connect to SSE and keep alive
    console.error('Connecting to SSE...');
    const sseRes = await new Promise((resolve, reject) => {
        const req = http.get(`http://${MCP_HOST}:${MCP_PORT}/sse`, { timeout: 15000 }, (res) => {
            resolve(res);
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('SSE timeout')); });
        req.on('error', reject);
    });

    let sessionUrl = null;
    let sseBuffer = '';
    let responseReceived = false;

    // Listen for endpoint on SSE
    sseRes.setEncoding('utf8');
    sseRes.on('data', (chunk) => {
        if (responseReceived) return;
        sseBuffer += chunk;
        
        // Check for endpoint
        if (!sessionUrl) {
            const m = sseBuffer.match(/data:\s*(\/sse\?session=[^\n]+)/);
            if (m) {
                sessionUrl = m[1].trim();
                console.error('Session: ' + sessionUrl);
                sendDecompile(sessionUrl);
            }
        }
    });

    async function sendDecompile(sessionUrl) {
        // Send decompile request
        const payload = JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
                name: 'decompile',
                arguments: { addr: ADDR }
            }
        });
        
        console.error('Sending decompile request...');
        await postMessage(sessionUrl, payload);
        console.error('Request sent, waiting for SSE response...');
    }

    // Parse SSE events and accumulate response
    let accumulatedData = '';
    
    // Re-process the buffer after endpoint is found
    sseRes.on('data', (chunk) => {
        if (responseReceived) return;
        
        // Accumulate and parse SSE events
        const lines = chunk.split('\n');
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data) {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.id === 1 && parsed.result) {
                            // Got our response!
                            responseReceived = true;
                            processResult(parsed);
                            return;
                        }
                    } catch (e) {
                        // Not complete JSON yet, accumulate
                        accumulatedData += data;
                    }
                }
            }
        }
    });

    function processResult(parsed) {
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
            console.error('No code in result');
            process.exit(1);
        }
        
        // The code field might be a JSON string with escaped newlines
        // Check if it contains addr/code pattern
        try {
            const inner = JSON.parse(code);
            if (inner.code) {
                code = inner.code;
            }
        } catch (e) {
            // Not JSON, use as-is
        }
        
        console.error('Code length: ' + code.length);
        
        // Unescape if needed
        if (code.includes('\\n')) {
            code = code.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        
        fs.writeFileSync(OUT_FILE, code, 'utf8');
        console.log('SUCCESS: Wrote ' + code.length + ' chars to ' + OUT_FILE);
        process.exit(0);
    }

    // Overall timeout
    setTimeout(() => {
        if (!responseReceived) {
            console.error('Timeout (600s)');
            process.exit(1);
        }
    }, 600000);
}

main().catch(e => { console.error('Fatal: ' + e.message); process.exit(1); });
