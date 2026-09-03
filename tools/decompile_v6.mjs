import http from 'http';

function connectSSE() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:13337/sse', { timeout: 30000 }, (res) => {
            let buf = '';
            res.setEncoding('utf8');
            let resolved = false;
            res.on('data', (chunk) => {
                buf += chunk;
                if (!resolved) {
                    const m = buf.match(/data:\s*(\/sse\?session=[^\n]+)/);
                    if (m) {
                        resolved = true;
                        resolve({ stream: res, url: m[1].trim() });
                    }
                }
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

function waitForSSE(stream, timeoutMs = 60000) {
    return new Promise((resolve, reject) => {
        let buf = '';
        const timer = setTimeout(() => {
            stream.destroy();
            reject(new Error('SSE wait timeout'));
        }, timeoutMs);
        
        stream.on('data', (chunk) => {
            buf += chunk;
            const lines = buf.split('\n');
            for (const line of lines) {
                if (line.startsWith('data:')) {
                    const data = line.substring(5).trim();
                    if (data) {
                        try {
                            const obj = JSON.parse(data);
                            if (obj.result && obj.result.content) {
                                clearTimeout(timer);
                                resolve(obj);
                                return;
                            }
                        } catch (e) {}
                    }
                }
            }
        });
        
        stream.on('end', () => { clearTimeout(timer); reject(new Error('SSE ended')); });
        stream.on('error', (e) => { clearTimeout(timer); reject(e); });
    });
}

async function main() {
    const { stream, url } = await connectSSE();
    console.error('Session: ' + url);
    
    // Try with 'addr' parameter
    const payload = JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'tools/call',
        params: { name: 'decompile', arguments: { addr: '0x89e8b0' } }
    });
    
    console.error('Sending decompile request with addr...');
    const resultPromise = waitForSSE(stream);
    await postMessage(url, payload);
    
    const result = await resultPromise;
    
    if (result.result && result.result.content) {
        for (const item of result.result.content) {
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
