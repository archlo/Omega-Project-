import http from 'http';
import fs from 'fs';

const MCP_HOST = '127.0.0.1';
const MCP_PORT = 13337;
const IDB_PATH = 'C:\\Users\\jorge\\OneDrive\\Desktop\\ts\\ida\\Maplestory95.exe.i64';

function postJSON(sessionUrl, payload) {
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
            let resolved = false;
            res.on('data', (chunk) => {
                if (resolved) return;
                buf += chunk;
                const match = buf.match(/data:\s*(\/sse\?session=[^\n]+)/);
                if (match) { resolved = true; resolve({ stream: res, sessionUrl: match[1].trim() }); }
            });
            res.on('error', reject);
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('SSE timeout')); });
        req.on('error', reject);
    });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function sseMessage(sessionUrl, payload, timeoutMs = 30000) {
    // Send the request and collect SSE events until we get a response
    return new Promise(async (resolve, reject) => {
        // Start listening for SSE messages
        const sseReq = http.get(`http://${MCP_HOST}:${MCP_PORT}/sse`, { timeout: timeoutMs }, (res) => {
            let buf = '';
            let gotSession = false;
            
            res.on('data', (chunk) => {
                buf += chunk;
                // Look for JSON-RPC response in SSE events
                const lines = buf.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.id === payload.id) {
                                res.destroy();
                                resolve(parsed);
                                return;
                            }
                        } catch (e) { /* not JSON */ }
                    }
                }
            });
            res.on('error', reject);
        });
        sseReq.on('timeout', () => { sseReq.destroy(); reject(new Error('SSE message timeout')); });
        sseReq.on('error', reject);
        
        // Send the request to the session endpoint
        await sleep(500); // Give SSE time to establish
        const postPayload = JSON.stringify(payload);
        const postReq = http.request({
            hostname: MCP_HOST, port: MCP_PORT,
            path: sessionUrl, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postPayload) }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.error('POST response:', data.substring(0, 200));
            });
        });
        postReq.on('error', reject);
        postReq.write(postPayload);
        postReq.end();
    });
}

async function main() {
    console.error('Connecting to IDA MCP...');
    const { stream, sessionUrl } = await connectSSE();
    console.error('Session: ' + sessionUrl);
    
    // First, list tools to see what's available
    console.error('\nListing tools...');
    try {
        const listResp = await sseMessage(sessionUrl, { jsonrpc: '2.0', id: 100, method: 'tools/list' }, 10000);
        console.error('Tools:', JSON.stringify(listResp).substring(0, 500));
    } catch (e) {
        console.error('List tools failed:', e.message);
    }
    
    await sleep(1000);
    
    // Open database
    console.error('\nOpening database...');
    try {
        const openResp = await sseMessage(sessionUrl, {
            jsonrpc: '2.0', id: 1, method: 'tools/call',
            params: { name: 'idalib_open', arguments: { input_path: IDB_PATH, session_id: 'v95', run_auto_analysis: false } }
        }, 30000);
        console.error('Open result:', JSON.stringify(openResp).substring(0, 500));
    } catch (e) {
        console.error('Open failed:', e.message);
    }
    
    await sleep(2000);
    
    // Try decompile
    console.error('\nDecompiling SetToolTip_Bundle at 0x898f70...');
    try {
        const result = await sseMessage(sessionUrl, {
            jsonrpc: '2.0', id: 2, method: 'tools/call',
            params: { name: 'decompile', arguments: { addr: '0x898f70' } }
        }, 30000);
        
        if (result.result && result.result.content) {
            for (const item of result.result.content) {
                if (item.type === 'text') {
                    const data = JSON.parse(item.text);
                    if (data.code) {
                        fs.writeFileSync('cuitooltip_settooltip_bundle.txt', JSON.stringify(data, null, 2), 'utf8');
                        console.error('SUCCESS: ' + data.code.length + ' chars');
                        console.log(JSON.stringify(data, null, 2));
                    } else {
                        console.error('No code. Keys:', Object.keys(data));
                    }
                }
            }
        } else {
            console.error('Unexpected:', JSON.stringify(result).substring(0, 500));
        }
    } catch (e) {
        console.error('Decompile failed:', e.message);
    }
    
    stream.destroy();
    process.exit(0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
