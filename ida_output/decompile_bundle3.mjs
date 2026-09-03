import http from 'http';
import fs from 'fs';

const MCP_HOST = '127.0.0.1';
const MCP_PORT = 13337;
const TARGET_ADDR = '0x898f70';
const IDB_PATH = 'C:\\Users\\jorge\\OneDrive\\Desktop\\ts\\ida\\Maplestory95.exe.i64';

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

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function main() {
    console.error('Connecting to IDA MCP...');
    const { stream, sessionUrl } = await connectSSE();
    console.error('Session: ' + sessionUrl);

    // Open the database
    console.error('Opening database...');
    const openPayload = JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'idalib_open', arguments: { input_path: IDB_PATH, session_id: 'v95', run_auto_analysis: false } }
    });
    const openResp = await postMessage(sessionUrl, openPayload);
    console.error('Open response:', openResp.substring(0, 300));

    await sleep(1000);

    // Decompile
    console.error('\nDecompiling SetToolTip_Bundle at ' + TARGET_ADDR + '...');
    const decompilePayload = JSON.stringify({
        jsonrpc: '2.0', id: 2, method: 'tools/call',
        params: { name: 'decompile', arguments: { addr: TARGET_ADDR } }
    });
    const decompileResp = await postMessage(sessionUrl, decompilePayload);
    console.error('Decompile response length:', decompileResp.length);

    try {
        const parsed = JSON.parse(decompileResp);
        if (parsed.result && parsed.result.content) {
            for (const item of parsed.result.content) {
                if (item.type === 'text') {
                    const data = JSON.parse(item.text);
                    if (data.code) {
                        fs.writeFileSync('cuitooltip_settooltip_bundle.txt', JSON.stringify(data, null, 2), 'utf8');
                        console.error('SUCCESS: ' + data.code.length + ' chars written');
                        console.log(JSON.stringify(data, null, 2));
                    } else {
                        console.error('No code field. Keys:', Object.keys(data));
                    }
                }
            }
        } else if (parsed.error) {
            console.error('Error:', JSON.stringify(parsed.error));
        } else {
            console.error('Unexpected response:', decompileResp.substring(0, 500));
        }
    } catch (e) {
        console.error('Parse error:', e.message);
    }

    stream.destroy();
    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
