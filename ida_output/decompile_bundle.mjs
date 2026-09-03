import http from 'http';

const MCP_HOST = '127.0.0.1';
const MCP_PORT = 13337;
const TARGET_ADDR = '0x898f70';

function postMessage(sessionUrl, payload) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const req = http.request({
            hostname: MCP_HOST, port: MCP_PORT,
            path: sessionUrl, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function connectSSE() {
    return new Promise((resolve, reject) => {
        const req = http.get(`http://${MCP_HOST}:${MCP_PORT}/sse`, { timeout: 30000 }, (res) => {
            let buf = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                buf += chunk;
                const match = buf.match(/data:\s*(\/sse\?session=[^\n]+)/);
                if (match) resolve({ stream: res, sessionUrl: match[1].trim() });
            });
            res.on('error', reject);
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('SSE timeout')); });
        req.on('error', reject);
    });
}

async function callTool(sessionUrl, name, args) {
    const payload = { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } };
    const response = await postMessage(sessionUrl, payload);
    const parsed = JSON.parse(response);
    if (parsed.result && parsed.result.content) {
        for (const item of parsed.result.content) {
            if (item.type === 'text') return JSON.parse(item.text);
        }
    }
    return parsed;
}

async function main() {
    console.error('Connecting to IDA MCP...');
    const { stream, sessionUrl } = await connectSSE();
    console.error('Session: ' + sessionUrl);

    // First check if db is open
    console.error('Checking database status...');
    try {
        const dbStatus = await callTool(sessionUrl, 'idalib_open', {
            input_path: '', // empty = check if already open
            session_id: 'v95'
        });
        console.error('DB status:', JSON.stringify(dbStatus).substring(0, 200));
    } catch (e) {
        console.error('DB check error:', e.message);
    }

    console.error('\nDecompiling SetToolTip_Bundle at ' + TARGET_ADDR + '...');
    try {
        const result = await callTool(sessionUrl, 'decompile', { addr: TARGET_ADDR });
        if (result && result.code) {
            const fs = await import('fs');
            fs.writeFileSync('cuitooltip_settooltip_bundle.txt', JSON.stringify(result, null, 2), 'utf8');
            console.error('SUCCESS: ' + result.code.length + ' chars written');
            console.log(JSON.stringify(result, null, 2));
        } else {
            console.error('FAILED - no code in result');
            console.error('Result:', JSON.stringify(result).substring(0, 500));
        }
    } catch (e) {
        console.error('ERROR:', e.message);
    }

    stream.destroy();
    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
