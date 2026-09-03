import http from 'http';
import fs from 'fs';

const MCP_HOST = '127.0.0.1';
const MCP_PORT = 13337;
const TARGET_ADDR = '0x898f70';
const IDB_PATH = 'C:\\Users\\jorge\\OneDrive\\Desktop\\ts\\ida\\Maplestory95.exe.i64';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function postToSession(sessionUrl, payload) {
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

function connectSSEAndListen(onMessage) {
    return new Promise((resolve, reject) => {
        const req = http.get(`http://${MCP_HOST}:${MCP_PORT}/sse`, { timeout: 60000 }, (res) => {
            let buf = '';
            let sessionUrl = null;
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                buf += chunk;
                // Extract session URL
                if (!sessionUrl) {
                    const match = buf.match(/data:\s*(\/sse\?session=[^\n]+)/);
                    if (match) {
                        sessionUrl = match[1].trim();
                        console.error('Session: ' + sessionUrl);
                        resolve({ stream: res, sessionUrl });
                    }
                }
                // Parse SSE events for JSON-RPC responses
                const events = buf.split('\n\n');
                buf = events.pop() || ''; // keep incomplete part
                for (const evt of events) {
                    const dataMatch = evt.match(/data:\s*(.*)/s);
                    if (dataMatch) {
                        try {
                            const data = JSON.parse(dataMatch[1]);
                            onMessage(data);
                        } catch (e) { /* not JSON-RPC */ }
                    }
                }
            });
            res.on('error', reject);
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('SSE timeout')); });
        req.on('error', reject);
    });
}

async function main() {
    console.error('Connecting to IDA MCP SSE...');
    
    const pendingRequests = new Map();
    
    const { stream, sessionUrl } = await connectSSEAndListen((msg) => {
        if (msg.id !== undefined && pendingRequests.has(msg.id)) {
            pendingRequests.get(msg.id).resolve(msg);
        }
    });
    
    // Open database
    console.error('Opening database...');
    const openId = 1;
    const openPromise = new Promise((resolve, reject) => {
        pendingRequests.set(openId, { resolve, reject });
        setTimeout(() => { pendingRequests.delete(openId); reject(new Error('timeout')); }, 30000);
    });
    await postToSession(sessionUrl, {
        jsonrpc: '2.0', id: openId, method: 'tools/call',
        params: { name: 'idalib_open', arguments: { input_path: IDB_PATH, session_id: 'v95', run_auto_analysis: false } }
    });
    
    try {
        const openResp = await openPromise;
        console.error('Open result:', JSON.stringify(openResp).substring(0, 300));
    } catch (e) {
        console.error('Open error:', e.message);
    }
    
    await sleep(2000);
    
    // Decompile SetToolTip_Bundle
    console.error('\nDecompiling SetToolTip_Bundle at ' + TARGET_ADDR + '...');
    const decompileId = 2;
    const decompilePromise = new Promise((resolve, reject) => {
        pendingRequests.set(decompileId, { resolve, reject });
        setTimeout(() => { pendingRequests.delete(decompileId); reject(new Error('timeout')); }, 60000);
    });
    await postToSession(sessionUrl, {
        jsonrpc: '2.0', id: decompileId, method: 'tools/call',
        params: { name: 'decompile', arguments: { addr: TARGET_ADDR } }
    });
    
    try {
        const result = await decompilePromise;
        if (result.result && result.result.content) {
            for (const item of result.result.content) {
                if (item.type === 'text') {
                    const data = JSON.parse(item.text);
                    if (data.code) {
                        fs.writeFileSync('cuitooltip_settooltip_bundle.txt', JSON.stringify(data, null, 2), 'utf8');
                        console.error('SUCCESS: ' + data.code.length + ' chars');
                        console.log(JSON.stringify(data, null, 2));
                    } else {
                        console.error('No code field. Keys:', Object.keys(data));
                    }
                }
            }
        } else if (result.error) {
            console.error('RPC error:', JSON.stringify(result.error));
        } else {
            console.error('Unexpected:', JSON.stringify(result).substring(0, 500));
        }
    } catch (e) {
        console.error('Decompile error:', e.message);
    }
    
    stream.destroy();
    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
