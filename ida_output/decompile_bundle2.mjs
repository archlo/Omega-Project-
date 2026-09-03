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

async function main() {
    console.error('Connecting to IDA MCP...');
    const { stream, sessionUrl } = await connectSSE();
    console.error('Session: ' + sessionUrl);

    // List available tools first
    console.error('\nListing tools...');
    const listPayload = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    const listResp = await postMessage(sessionUrl, listPayload);
    console.error('Tools response:', listResp.substring(0, 1000));

    // Try decompile
    console.error('\nDecompiling SetToolTip_Bundle at ' + TARGET_ADDR + '...');
    const decompilePayload = JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'decompile', arguments: { addr: TARGET_ADDR } } });
    const decompileResp = await postMessage(sessionUrl, decompilePayload);
    console.error('Decompile response length:', decompileResp.length);
    console.error('Decompile response preview:', decompileResp.substring(0, 500));
    
    // Try to parse and save
    try {
        const parsed = JSON.parse(decompileResp);
        if (parsed.result && parsed.result.content) {
            for (const item of parsed.result.content) {
                if (item.type === 'text') {
                    const data = JSON.parse(item.text);
                    if (data.code) {
                        const fs = await import('fs');
                        fs.writeFileSync('cuitooltip_settooltip_bundle.txt', JSON.stringify(data, null, 2), 'utf8');
                        console.error('SUCCESS: ' + data.code.length + ' chars written');
                        console.log(JSON.stringify(data, null, 2));
                    } else {
                        console.error('No code field in result');
                    }
                }
            }
        } else {
            console.error('No result.content');
        }
    } catch (e) {
        console.error('Parse error:', e.message);
    }

    stream.destroy();
    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
