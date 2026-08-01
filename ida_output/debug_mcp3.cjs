const http = require('http');

function postMessage(sessionUrl, payload) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: '127.0.0.1', port: 13337,
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

async function main() {
    console.error('Connecting...');
    const { stream, sessionUrl } = await connectSSE();
    console.error('Session: ' + sessionUrl);
    
    // Try list_funcs to see what tools are available
    console.error('\nTrying list_funcs...');
    const listPayload = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
    const listResponse = await postMessage(sessionUrl, listPayload);
    console.error('Tools list response:');
    console.error(listResponse.substring(0, 2000));
    
    stream.destroy();
    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
