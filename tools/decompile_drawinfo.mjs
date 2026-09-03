import http from 'http';
import fs from 'fs';

function connectSSE() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:13337/sse', { timeout: 30000 }, (res) => {
            let buf = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                buf += chunk;
                const m = buf.match(/data:\s*(\/sse\?session=[^\n]+)/);
                if (m) resolve({ stream: res, url: m[1].trim() });
            });
            res.on('error', reject);
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
}

function postMessage(url, payload) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: '127.0.0.1', port: 13337,
            path: url, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
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
    const { stream, url } = await connectSSE();
    console.error('Session: ' + url);
    
    const payload = JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'tools/call',
        params: { name: 'decompile', arguments: { address: '0x89e8b0' } }
    });
    
    const response = await postMessage(url, payload);
    const parsed = JSON.parse(response);
    if (parsed.result && parsed.result.content) {
        for (const item of parsed.result.content) {
            if (item.type === 'text') {
                const inner = JSON.parse(item.text);
                let code = inner.code || '';
                code = code.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
                code = code.replace(/\/\*0x[0-9a-f]+\*\//g, '');
                console.log(code);
            }
        }
    }
    stream.destroy();
    process.exit(0);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
